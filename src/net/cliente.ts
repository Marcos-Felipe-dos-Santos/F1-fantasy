/**
 * O CLIENTE da sala, sem I/O (PR 3.2).
 *
 * O servidor coordena turno; **a partida roda aqui**. O cliente recebe o
 * snapshot público (roster + `seedDraft` + log de turnos) e **reconstrói o
 * `DraftState`** com a engine e o dataset — que só ele tem.
 *
 * 🔴 ESTE ARQUIVO É ONDE O RISCO ATIVO DO PROJETO MORA. A rede pula a casa de
 * quem abandona, então cada cliente escolhe **no lugar do ausente**, sozinho. Se
 * dois clientes escolherem peças diferentes pelo mesmo ausente, cada um debita
 * uma cópia diferente do pool compartilhado e **os jogos divergem em silêncio**.
 * Por isso a substituição usa `escolherBot` — semeado, função pura da engine,
 * idêntico nos 22 — e **nunca** nada que dependa de estado local. Ver o bloco
 * "RISCO ATIVO" no `ESTADO.md`.
 *
 * 📥 Sobre `seq`: o snapshot mais velho é DESCARTADO. Como o broadcast é
 * snapshot e não delta, descartar é seguro — nada se perde, o próximo traz tudo.
 *
 * ⚙️ O draft é mantido **incrementalmente**: o log é append-only, então cada
 * snapshot novo só acrescenta eventos no fim, e o cliente aplica só o que ainda
 * não viu. Reconstruir do zero a cada broadcast seria O(n²) e é o que a UI
 * também não vai querer fazer.
 */

import type { Dataset } from '../engine/dataset';
import { aplicarEscolha, criarDraft, resolverBots, revelarRodada } from '../engine/draft';
import { encontrarEquipeAno, RODADAS_SORTEIO } from '../engine/draft-utils';
import { escolherBot } from '../engine/bots';
import type { DraftState, EscolhaDraft } from '../engine/types';
import type { MensagemServidor } from './protocolo';
import type { EstadoSalaPublico } from './tipos';

export interface EstadoCliente {
  /** Quem eu sou nesta sala; `null` até o `voce-e` chegar. */
  euSou: string | null;
  /**
   * Token de reentrada, recebido no `entrar`. É segredo: identifica o jogador
   * para o servidor. Em navegador precisa sobreviver a um F5 — quem persiste é
   * a UI (3.3), aqui ele só é guardado.
   */
  token: string | null;
  /** Último snapshot aceito, ou `null` antes do primeiro. */
  sala: EstadoSalaPublico | null;
  /** `seq` do último snapshot aceito — o filtro contra broadcast atrasado. */
  seqVisto: number;
  /** O draft reconstruído localmente. `null` enquanto a sala não iniciou. */
  draft: DraftState | null;
  /** Quantos eventos do log já foram aplicados em `draft`. */
  eventosAplicados: number;
  /** Quem já abandonou, do ponto de vista deste cliente. */
  ausentes: string[];
  /** Erros recebidos, na ordem. Diagnóstico, não regra de jogo. */
  erros: string[];
  /** Snapshots descartados por virem atrasados ou repetidos. */
  descartados: number;
  /** A sala foi encerrada pelo servidor (janela de graça vencida ou esvaziou). */
  encerrada: boolean;
}

export function criarCliente(): EstadoCliente {
  return {
    euSou: null,
    token: null,
    sala: null,
    seqVisto: -1,
    draft: null,
    eventosAplicados: 0,
    ausentes: [],
    erros: [],
    descartados: 0,
    encerrada: false,
  };
}

/**
 * Aplica uma mensagem do servidor. Puro. Não mexe no draft — quem avança o
 * draft é `sincronizarDraft`, que precisa do dataset.
 */
export function aplicarMensagem(estado: EstadoCliente, mensagem: MensagemServidor): EstadoCliente {
  switch (mensagem.tipo) {
    case 'voce-e':
      // O token só vem no `entrar`; num `reentrar` a mensagem não o repete, e o
      // que já está guardado não pode ser apagado.
      return {
        ...estado,
        euSou: mensagem.jogadorId,
        token: mensagem.token ?? estado.token,
      };
    case 'erro':
      return { ...estado, erros: [...estado.erros, mensagem.erro] };
    case 'sala-encerrada':
      // O estado do servidor foi descartado. Marcar aqui é o que permite a UI
      // dizer "esta sala foi encerrada" em vez de ficar em "reconectando…".
      return { ...estado, encerrada: true };
    case 'estado':
      if (mensagem.estado.seq <= estado.seqVisto) {
        return { ...estado, descartados: estado.descartados + 1 };
      }
      return { ...estado, sala: mensagem.estado, seqVisto: mensagem.estado.seq };
  }
}

/**
 * A escolha que substitui um jogador ausente.
 *
 * 🔒 **Tem que ser idêntica nos 22 clientes.** `escolherBot` é pura e semeada
 * pela seed do draft — mesmo estado, mesmo jogador, mesma escolha, em qualquer
 * máquina. Qualquer coisa fora disso (aleatório, relógio, preferência de UI,
 * "a peça favorita dele") fura o pool de peças sem alarme.
 *
 * `escolherBot` exige `perfilBot` e o ausente é humano, então a substituição
 * usa o perfil FIXO `praGanhar` — igual pra todos e decidido aqui, não sorteado:
 * sortear exigiria um sub-stream novo e daria mais uma coisa pra divergir.
 */
export function escolhaDoAusente(
  state: DraftState,
  dataset: Dataset,
  jogadorId: string,
): EscolhaDraft {
  const comoBot: DraftState = {
    ...state,
    jogadores: state.jogadores.map((j) =>
      j.id === jogadorId ? { ...j, tipo: 'bot' as const, perfilBot: 'praGanhar' as const } : j,
    ),
  };
  return escolherBot(comoBot, dataset, jogadorId);
}

/**
 * Como este cliente escolhe no lugar de um ausente. Injetável **só** para que o
 * harness possa sabotar um cliente e provar que a divergência é detectável —
 * produção sempre usa `escolhaDoAusente`.
 */
export type EscolherPeloAusente = (
  state: DraftState,
  dataset: Dataset,
  jogadorId: string,
) => EscolhaDraft;

/** O contrato do ausente, executado. Ver `escolhaDoAusente` pro porquê da escolha. */
function resolverAusentes(
  state: DraftState,
  ausentes: string[],
  dataset: Dataset,
  escolher: EscolherPeloAusente,
): DraftState {
  if (ausentes.length === 0) return state;
  let atual = state;
  let guarda = 0;
  while (atual.fase !== 'concluido') {
    if ((guarda += 1) > 500) throw new Error('resolverAusentes: laço travado');
    let alvo: string | undefined;
    if (atual.fase === 'sorteios') {
      alvo = ausentes.find((id) => atual.progresso[id].rodada <= RODADAS_SORTEIO);
    } else {
      const vez = atual.ordemPeca[atual.indicePeca];
      alvo = ausentes.includes(vez) ? vez : undefined;
    }
    if (alvo === undefined) return atual;
    atual = resolverBots(
      aplicarEscolha(atual, dataset, alvo, escolher(atual, dataset, alvo)),
      dataset,
    );
  }
  return atual;
}

/**
 * Avança o draft local até o fim do log que este cliente conhece. Idempotente:
 * chamar duas vezes sem snapshot novo não faz nada.
 */
export function sincronizarDraft(
  estado: EstadoCliente,
  dataset: Dataset,
  escolherPeloAusente: EscolherPeloAusente = escolhaDoAusente,
): EstadoCliente {
  const sala = estado.sala;
  if (sala === null || sala.roster === null || sala.draft === null) return estado;

  let draft = estado.draft;
  let aplicados = estado.eventosAplicados;
  let ausentes = estado.ausentes;

  if (draft === null) {
    draft = resolverBots(criarDraft(dataset, sala.roster, sala.seedDraft), dataset);
    aplicados = 0;
    ausentes = [];
  }

  for (const evento of sala.draft.log.slice(aplicados)) {
    if (evento.tipo === 'ausencia') {
      ausentes = [...ausentes, evento.jogadorId];
    } else {
      draft = aplicarEscolhaDoLog(draft, dataset, evento.jogadorId, evento.escolha, escolherPeloAusente);
    }
    // O contrato: resolver o ausente NO MESMO evento em que a ausência aparece.
    draft = resolverAusentes(draft, ausentes, dataset, escolherPeloAusente);
    aplicados += 1;
  }

  return { ...estado, draft, eventosAplicados: aplicados, ausentes };
}

/**
 * Aplica um evento de escolha do log — **sem nunca lançar**.
 *
 * 🔴 ISTO É UMA DEFESA CONTRA DoS PERMANENTE, não robustez decorativa. O
 * servidor NÃO PODE validar o conteúdo da escolha: ele não tem dataset. Então
 * um cliente, na própria vez legítima e passando por todas as guardas do
 * servidor (remetente certo, turno certo, tamanho certo), consegue gravar no
 * log append-only uma escolha que a engine rejeita — `{tipo:'piloto',
 * pilotoId:'NAO-EXISTE'}`, por exemplo.
 *
 * O log **nunca encolhe** e o Durable Object **nunca esquece**. Se este ponto
 * lançasse, a partir daquele evento NENHUM dos 22 conseguiria reconstruir a
 * sala — nunca mais, sem caminho de recuperação. Uma mensagem, sala morta.
 *
 * E não depende de malícia: um cliente com build de dataset diferente
 * escolhendo um id que os outros não têm produz exatamente o mesmo efeito. O
 * hash de dataset só chega no 3.4.
 *
 * A saída é o substituto DETERMINÍSTICO — o mesmo do ausente. Todos os 22
 * aplicam a mesma regra sobre o mesmo estado, então todos caem no mesmo lugar e
 * a partida continua. Registrado como decisão: **uma escolha inválida é tratada
 * como se o jogador não tivesse escolhido**, não como fim de jogo.
 */
function aplicarEscolhaDoLog(
  draft: DraftState,
  dataset: Dataset,
  jogadorId: string,
  escolha: unknown,
  escolherPeloAusente: EscolherPeloAusente,
): DraftState {
  try {
    return resolverBots(aplicarEscolha(draft, dataset, jogadorId, escolha as EscolhaDraft), dataset);
  } catch {
    return resolverBots(
      aplicarEscolha(draft, dataset, jogadorId, escolherPeloAusente(draft, dataset, jogadorId)),
      dataset,
    );
  }
}

/**
 * Uma escolha válida para o jogador da vez. Não é estratégia — é o que o
 * harness usa no lugar de um humano, e o que a UI vai substituir por cliques.
 */
export function escolhaPadrao(
  state: DraftState,
  dataset: Dataset,
  jogadorId: string,
): EscolhaDraft | null {
  const revelacao = revelarRodada(state, jogadorId);
  if (revelacao.fase === 'sorteios') {
    const naoPiloto = revelacao.slotsDisponiveis.find((s) => s !== 'piloto');
    if (naoPiloto !== undefined) return { tipo: 'componente', slot: naoPiloto };
    const equipeAno = encontrarEquipeAno(dataset, revelacao.equipeAno);
    return { tipo: 'piloto', pilotoId: equipeAno.pilotos[0].id };
  }
  if (revelacao.fase === 'peca') {
    const reveladas = revelacao.pecasReveladas;
    if (!reveladas || reveladas.length === 0) return null;
    return { tipo: 'peca', pecaId: reveladas[0] };
  }
  return null;
}
