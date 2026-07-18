/**
 * Draft do jogo (PR 1.2, §3 do GDD): 5 sorteios de equipe/ano + 1 escolha de
 * peça icônica na rodada 6. Reducer puro e imutável — `aplicarEscolha` nunca
 * muta o `DraftState` recebido, sempre devolve um novo.
 */

import type { Dataset } from './dataset';
import { createRng, deriveSeed } from './rng';
import type {
  DraftState,
  EquipeAnoRef,
  EscolhaDraft,
  Jogador,
  Loadout,
  ProgressoJogador,
  SlotComponente,
} from './types';
import {
  encontrarEquipeAno,
  idComponenteDoSlot,
  SLOT_PARA_CAMPO,
  slotsRestantes,
} from './draft-utils';
import { escolherBot } from './bots';

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

/**
 * Cria o estado inicial do draft: valida os jogadores, pré-computa os 5
 * sorteios de equipe/ano de cada um (sem reposição por jogador — jogadores
 * diferentes podem repetir entre si) e a ordem embaralhada da rodada 6.
 */
export function criarDraft(dataset: Dataset, jogadores: Jogador[], seed: number): DraftState {
  assert(jogadores.length === 22, `criarDraft: esperado 22 jogadores, recebeu ${jogadores.length}`);

  const idsVistos = new Set<string>();
  for (const jogador of jogadores) {
    assert(!idsVistos.has(jogador.id), `criarDraft: id de jogador duplicado "${jogador.id}"`);
    idsVistos.add(jogador.id);
    if (jogador.tipo === 'bot') {
      assert(
        jogador.perfilBot !== undefined,
        `criarDraft: bot "${jogador.id}" sem perfilBot definido (chame atribuirPerfis antes)`,
      );
    }
  }

  assert(
    dataset.equipeAnos.length >= 5,
    `criarDraft: dataset precisa de ao menos 5 equipe/anos, tem ${dataset.equipeAnos.length}`,
  );
  assert(
    dataset.pecas.length >= 5,
    `criarDraft: dataset precisa de ao menos 5 peças, tem ${dataset.pecas.length}`,
  );

  const equipeAnoRefs: EquipeAnoRef[] = dataset.equipeAnos.map((ea) => ({
    equipe: ea.equipe,
    ano: ea.ano,
  }));

  const sorteios: Record<string, EquipeAnoRef[]> = {};
  const progresso: Record<string, ProgressoJogador> = {};
  for (const jogador of jogadores) {
    const rng = createRng(deriveSeed(seed, `draft:sorteios:${jogador.id}`));
    sorteios[jogador.id] = rng.shuffle(equipeAnoRefs).slice(0, 5);
    progresso[jogador.id] = { rodada: 1, slots: {} };
  }

  const rngOrdem = createRng(deriveSeed(seed, 'draft:ordem-peca'));
  const ordemPeca = rngOrdem.shuffle(jogadores.map((j) => j.id));

  const copiasRestantes: Record<string, number> = {};
  for (const peca of dataset.pecas) {
    copiasRestantes[peca.id] = 2;
  }

  return {
    seed,
    fase: 'sorteios',
    jogadores: jogadores.slice(),
    sorteios,
    progresso,
    ordemPeca,
    indicePeca: 0,
    pecasReveladas: null,
    copiasRestantes,
    loadouts: {},
  };
}

/** Peças ainda disponíveis (cópias > 0), embaralhadas pro sub-stream do jogador da vez, primeiras 5 (ou todas, se menos). */
function revelarPecasParaJogador(
  dataset: Dataset,
  seed: number,
  jogadorId: string,
  copiasRestantes: Record<string, number>,
): string[] {
  const disponiveis = dataset.pecas
    .filter((p) => (copiasRestantes[p.id] ?? 0) > 0)
    .map((p) => p.id);
  const rng = createRng(deriveSeed(seed, `draft:pecas:${jogadorId}`));
  return rng.shuffle(disponiveis).slice(0, 5);
}

function aplicarEscolhaSorteio(
  state: DraftState,
  dataset: Dataset,
  jogadorId: string,
  escolha: EscolhaDraft,
): DraftState {
  const progresso = state.progresso[jogadorId];
  assert(progresso !== undefined, `aplicarEscolha: jogador "${jogadorId}" sem progresso no draft`);
  assert(
    progresso.rodada <= 5,
    `aplicarEscolha: jogador "${jogadorId}" já completou os 5 sorteios de equipe/ano`,
  );
  assert(
    escolha.tipo !== 'peca',
    'aplicarEscolha: escolha de peça só é permitida na fase peça (rodada 6)',
  );

  const ref = state.sorteios[jogadorId][progresso.rodada - 1];
  const equipeAno = encontrarEquipeAno(dataset, ref);
  const restantes = slotsRestantes(progresso);

  let slot: SlotComponente;
  let idEscolhido: string;

  if (escolha.tipo === 'piloto') {
    slot = 'piloto';
    assert(
      restantes.includes('piloto'),
      `aplicarEscolha: slot "piloto" já preenchido nesta rodada do jogador "${jogadorId}"`,
    );
    const idsValidos = equipeAno.pilotos.map((p) => p.id);
    assert(
      idsValidos.includes(escolha.pilotoId),
      `aplicarEscolha: piloto "${escolha.pilotoId}" não pertence à equipe/ano sorteada (${equipeAno.equipe} ${equipeAno.ano})`,
    );
    idEscolhido = escolha.pilotoId;
  } else {
    slot = escolha.slot;
    assert(
      restantes.includes(slot),
      `aplicarEscolha: slot "${slot}" já preenchido nesta rodada do jogador "${jogadorId}"`,
    );
    idEscolhido = idComponenteDoSlot(equipeAno, slot);
  }

  const campo = SLOT_PARA_CAMPO[slot];
  const novoProgresso: ProgressoJogador = {
    rodada: progresso.rodada + 1,
    slots: { ...progresso.slots, [campo]: idEscolhido },
  };
  const novosProgressos = { ...state.progresso, [jogadorId]: novoProgresso };

  const todosCompletaram = state.jogadores.every((j) => novosProgressos[j.id].rodada > 5);
  if (!todosCompletaram) {
    return { ...state, progresso: novosProgressos };
  }

  // Todos concluíram os 5 sorteios: transição pra fase peça (rodada 6).
  const primeiroJogadorId = state.ordemPeca[0];
  const pecasReveladas = revelarPecasParaJogador(
    dataset,
    state.seed,
    primeiroJogadorId,
    state.copiasRestantes,
  );

  return {
    ...state,
    fase: 'peca',
    progresso: novosProgressos,
    indicePeca: 0,
    pecasReveladas,
  };
}

function aplicarEscolhaPeca(
  state: DraftState,
  dataset: Dataset,
  jogadorId: string,
  escolha: EscolhaDraft,
): DraftState {
  assert(
    state.ordemPeca[state.indicePeca] === jogadorId,
    `aplicarEscolha: não é a vez do jogador "${jogadorId}" na fase peça`,
  );
  assert(
    escolha.tipo === 'peca',
    'aplicarEscolha: só é permitido escolher peça na fase peça (rodada 6)',
  );
  assert(state.pecasReveladas !== null, 'aplicarEscolha: peças ainda não reveladas pra este jogador');
  assert(
    state.pecasReveladas.includes(escolha.pecaId),
    `aplicarEscolha: peça "${escolha.pecaId}" não está entre as 5 reveladas pra este jogador`,
  );
  assert(
    (state.copiasRestantes[escolha.pecaId] ?? 0) > 0,
    `aplicarEscolha: peça "${escolha.pecaId}" sem cópias restantes`,
  );

  const copiasRestantes = {
    ...state.copiasRestantes,
    [escolha.pecaId]: state.copiasRestantes[escolha.pecaId] - 1,
  };

  const progresso = state.progresso[jogadorId];
  const slots = progresso.slots;
  assert(
    slots.pilotoId !== undefined &&
      slots.chassiId !== undefined &&
      slots.motorId !== undefined &&
      slots.estrategistaId !== undefined &&
      slots.pitId !== undefined,
    `aplicarEscolha: jogador "${jogadorId}" não completou os 5 componentes antes da rodada 6`,
  );

  const loadout: Loadout = {
    jogadorId,
    pilotoId: slots.pilotoId,
    chassiId: slots.chassiId,
    motorId: slots.motorId,
    estrategistaId: slots.estrategistaId,
    pitId: slots.pitId,
    pecaId: escolha.pecaId,
  };

  const loadouts = { ...state.loadouts, [jogadorId]: loadout };
  const indicePeca = state.indicePeca + 1;

  if (indicePeca >= state.ordemPeca.length) {
    return {
      ...state,
      fase: 'concluido',
      copiasRestantes,
      loadouts,
      indicePeca,
      pecasReveladas: null,
    };
  }

  const proximoJogadorId = state.ordemPeca[indicePeca];
  const pecasReveladas = revelarPecasParaJogador(dataset, state.seed, proximoJogadorId, copiasRestantes);

  return { ...state, copiasRestantes, loadouts, indicePeca, pecasReveladas };
}

/**
 * Aplica a jogada de um jogador ao draft, retornando um novo `DraftState`
 * imutável (o `state` de entrada nunca é modificado).
 */
export function aplicarEscolha(
  state: DraftState,
  dataset: Dataset,
  jogadorId: string,
  escolha: EscolhaDraft,
): DraftState {
  assert(
    state.jogadores.some((j) => j.id === jogadorId),
    `aplicarEscolha: jogador "${jogadorId}" não existe neste draft`,
  );
  assert(state.fase !== 'concluido', 'aplicarEscolha: draft já concluído');

  if (state.fase === 'sorteios') {
    return aplicarEscolhaSorteio(state, dataset, jogadorId, escolha);
  }
  return aplicarEscolhaPeca(state, dataset, jogadorId, escolha);
}

/** Leitura pura do que está revelado pro jogador informado, sem alterar o estado (uso pela UI). */
export type Revelacao =
  | { fase: 'sorteios'; rodada: number; equipeAno: EquipeAnoRef; slotsDisponiveis: SlotComponente[] }
  | { fase: 'sorteios-aguardando' }
  | { fase: 'peca'; suaVez: boolean; pecasReveladas: string[] | null }
  | { fase: 'concluido' };

export function revelarRodada(state: DraftState, jogadorId: string): Revelacao {
  if (state.fase === 'concluido') return { fase: 'concluido' };

  if (state.fase === 'sorteios') {
    const progresso = state.progresso[jogadorId];
    if (!progresso || progresso.rodada > 5) return { fase: 'sorteios-aguardando' };
    const equipeAno = state.sorteios[jogadorId][progresso.rodada - 1];
    return {
      fase: 'sorteios',
      rodada: progresso.rodada,
      equipeAno,
      slotsDisponiveis: slotsRestantes(progresso),
    };
  }

  const suaVez = state.ordemPeca[state.indicePeca] === jogadorId;
  return { fase: 'peca', suaVez, pecasReveladas: suaVez ? state.pecasReveladas : null };
}

/**
 * Aplica as escolhas de todos os bots pendentes: na fase sorteios, todas as
 * rodadas pendentes de todos os bots (ordem entre bots não importa — cada um
 * deriva seu próprio sub-stream de RNG); na fase peça, os bots da fila até
 * chegar num humano ou o draft terminar.
 */
export function resolverBots(state: DraftState, dataset: Dataset): DraftState {
  let atual = state;

  while (atual.fase !== 'concluido') {
    if (atual.fase === 'sorteios') {
      const jogadorBot = atual.jogadores.find(
        (j) => j.tipo === 'bot' && atual.progresso[j.id].rodada <= 5,
      );
      if (!jogadorBot) return atual;
      const escolha = escolherBot(atual, dataset, jogadorBot.id);
      atual = aplicarEscolha(atual, dataset, jogadorBot.id, escolha);
      continue;
    }

    // fase 'peca'
    const jogadorId = atual.ordemPeca[atual.indicePeca];
    const jogador = atual.jogadores.find((j) => j.id === jogadorId);
    assert(jogador !== undefined, `resolverBots: jogador "${jogadorId}" não existe`);
    if (jogador.tipo !== 'bot') return atual;
    const escolha = escolherBot(atual, dataset, jogadorId);
    atual = aplicarEscolha(atual, dataset, jogadorId, escolha);
  }

  return atual;
}
