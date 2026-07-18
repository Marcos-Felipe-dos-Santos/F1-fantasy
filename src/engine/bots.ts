/**
 * Bots do draft (PR 1.2, §12 do GDD).
 *
 * Determinísticos por seed: o perfil de cada bot é sorteado uma única vez
 * por jogador (`atribuirPerfis`); cada decisão (`escolherBot`) deriva seu
 * próprio sub-stream de RNG a partir de `seed + botId + rodada` — nada de
 * estado de RNG persistido no `DraftState`.
 */

import type { Dataset } from './dataset';
import { createRng, deriveSeed } from './rng';
import type { Dificuldade, DraftState, EscolhaDraft, Jogador, PerfilBot, SlotComponente } from './types';
import { encontrarEquipeAno, idComponenteDoSlot, slotsRestantes } from './draft-utils';

/** Proporção de bots "pra ganhar" por dificuldade (§12). */
const PROPORCAO_PRA_GANHAR: Record<Dificuldade, number> = {
  facil: 0.2,
  dificil: 0.6,
};

/**
 * Sorteia `perfilBot` pros jogadores do tipo bot que ainda não têm um
 * definido. Determinístico por seed; jogadores humanos e bots com perfil já
 * atribuído passam intocados.
 */
export function atribuirPerfis(
  jogadores: Jogador[],
  seed: number,
  dificuldade: Dificuldade,
): Jogador[] {
  const proporcao = PROPORCAO_PRA_GANHAR[dificuldade];
  const rng = createRng(deriveSeed(seed, 'bots'));
  return jogadores.map((jogador) => {
    if (jogador.tipo !== 'bot' || jogador.perfilBot !== undefined) return jogador;
    const perfil: PerfilBot = rng.next() < proporcao ? 'praGanhar' : 'passeio';
    return { ...jogador, perfilBot: perfil };
  });
}

/**
 * Média aritmética simples das notas de um componente. Convenção do dataset:
 * toda nota é qualidade (99 = melhor). Recebe `Record<string, number>` — os
 * chamadores fazem o cast a partir dos objetos de notas concretos da engine
 * (`NotasPiloto`, `NotasChassi`, `NotasMotor` ou os literais de
 * estrategista/pit), já que interfaces nomeadas sem índice explícito não são
 * atribuíveis diretamente a `Record<string, number>` em TS.
 */
function media(notas: Record<string, number>): number {
  const valores = Object.values(notas);
  return valores.reduce((soma, v) => soma + v, 0) / valores.length;
}

interface Candidato {
  id: string;
  valor: number;
}

/** Maior valor vence; empate desempata por id em ordem lexicográfica (menor vence) — determinismo. */
function melhorCandidato<T extends Candidato>(candidatos: T[]): T {
  return candidatos.reduce((atual, proximo) => {
    if (proximo.valor > atual.valor) return proximo;
    if (proximo.valor < atual.valor) return atual;
    return proximo.id < atual.id ? proximo : atual;
  });
}

function notasDoSlot(
  equipeAno: ReturnType<typeof encontrarEquipeAno>,
  slot: Exclude<SlotComponente, 'piloto'>,
): Record<string, number> {
  switch (slot) {
    case 'chassi':
      return equipeAno.chassi.notas as unknown as Record<string, number>;
    case 'motor':
      return equipeAno.motor.notas as unknown as Record<string, number>;
    case 'estrategista':
      return equipeAno.estrategista.notas as unknown as Record<string, number>;
    case 'pit':
      return equipeAno.pit.notas as unknown as Record<string, number>;
    default:
      throw new Error(`notasDoSlot: slot inválido "${String(slot)}"`);
  }
}

/**
 * Decisão determinística de um bot, dado o estado corrente do draft.
 * `passeio`: escolha uniforme entre as opções legais. `praGanhar`: maximiza
 * o valor médio das notas do componente (peça: `bonus - 0.5 * risco`).
 */
export function escolherBot(state: DraftState, dataset: Dataset, botId: string): EscolhaDraft {
  const jogador = state.jogadores.find((j) => j.id === botId);
  if (!jogador || jogador.tipo !== 'bot' || jogador.perfilBot === undefined) {
    throw new Error(`escolherBot: "${botId}" não é um bot válido com perfil definido`);
  }

  if (state.fase === 'sorteios') {
    const progresso = state.progresso[botId];
    if (!progresso) {
      throw new Error(`escolherBot: jogador "${botId}" sem progresso no draft`);
    }
    const ref = state.sorteios[botId][progresso.rodada - 1];
    const equipeAno = encontrarEquipeAno(dataset, ref);
    const restantes = slotsRestantes(progresso);
    const rng = createRng(deriveSeed(state.seed, `draft:bot:${botId}:r${progresso.rodada}`));

    if (jogador.perfilBot === 'passeio') {
      const slot = rng.pick(restantes);
      if (slot === 'piloto') {
        const pilotoId = rng.pick(equipeAno.pilotos.map((p) => p.id));
        return { tipo: 'piloto', pilotoId };
      }
      return { tipo: 'componente', slot };
    }

    // praGanhar: um candidato por slot restante (piloto usa o melhor dos 2 titulares).
    const candidatos = restantes.map((slot) => {
      if (slot === 'piloto') {
        const titulares: Candidato[] = equipeAno.pilotos.map((p) => ({
          id: p.id,
          valor: media(p.notas as unknown as Record<string, number>),
        }));
        const melhorTitular = melhorCandidato(titulares);
        return { slot, id: melhorTitular.id, valor: melhorTitular.valor };
      }
      return {
        slot,
        id: idComponenteDoSlot(equipeAno, slot),
        valor: media(notasDoSlot(equipeAno, slot)),
      };
    });

    const escolhido = melhorCandidato(candidatos);
    if (escolhido.slot === 'piloto') {
      return { tipo: 'piloto', pilotoId: escolhido.id };
    }
    return { tipo: 'componente', slot: escolhido.slot };
  }

  // Fase peça (rodada 6): decide entre as 5 peças reveladas na vez do bot.
  const reveladas = state.pecasReveladas;
  if (!reveladas || reveladas.length === 0) {
    throw new Error(`escolherBot: sem peças reveladas pra "${botId}" na fase peça`);
  }
  const rng = createRng(deriveSeed(state.seed, `draft:bot:${botId}:r6`));

  if (jogador.perfilBot === 'passeio') {
    return { tipo: 'peca', pecaId: rng.pick(reveladas) };
  }

  const candidatos: Candidato[] = reveladas.map((pecaId) => {
    const peca = dataset.pecasById.get(pecaId);
    if (!peca) {
      throw new Error(`escolherBot: peça revelada "${pecaId}" não existe no dataset`);
    }
    return { id: pecaId, valor: peca.bonus - 0.5 * peca.risco };
  });
  const escolhido = melhorCandidato(candidatos);
  return { tipo: 'peca', pecaId: escolhido.id };
}
