/**
 * Fluxo de turnos hotseat do modo Local (PR 2.1b, GDD §2/§3): decide quem
 * deve estar com o aparelho na mão, sem tocar a engine nem reimplementar
 * regra de jogo — só lê `DraftState` (fase, progresso, ordemPeca) já
 * produzido por `criarDraft`/`aplicarEscolha`/`resolverBots`.
 *
 * Desenho dos turnos (decisão D1 do arquiteto):
 * - Rodadas 1-5 (fase 'sorteios') em BLOCO por humano: humano-1 joga as 5
 *   rodadas dele, depois humano-2, etc., na ORDEM DE CADASTRO (`idsHumanos`).
 *   Isso é só convenção de UI — pra engine os sorteios de cada humano são
 *   independentes entre si (`sorteios[jogadorId]` é um sub-stream de RNG
 *   próprio), então a ordem de jogo entre humanos não muda nada do
 *   resultado. `resolverBots` já resolve TODOS os bots pendentes antes de
 *   devolver o controle à UI, então enquanto `fase === 'sorteios'` só sobra
 *   decidir entre humanos.
 * - Rodada 6 (fase 'peca') segue estritamente `ordemPeca`, que é a ordem
 *   embaralhada e determinística da engine (mistura humanos e bots). O
 *   handoff acontece sempre que a vez cai num humano diferente de quem
 *   segura o aparelho no momento — não há bloco aqui, é turno a turno.
 *
 * Anti-vazamento (decisão D2): `decisaoLocal` e `alvoHumano` NUNCA leem
 * `pecasReveladas` nem qualquer outro campo de revelação de sorteio/peça —
 * só `fase`, `progresso` e `ordemPeca`/`indicePeca`. Isso é garantido por
 * ASSINATURA: a única entrada é o `DraftState` inteiro, mas o corpo das
 * funções só toca esses três campos, então nenhuma decisão de handoff pode
 * vazar o que está revelado pro próximo jogador antes de ele confirmar que
 * está com o aparelho.
 *
 * Handoff é estado mínimo na UI (decisão D2): a engine não sabe quem segura
 * o aparelho — só a UI (`App.tsx`) guarda `confirmadoId`.
 */

import type { DraftState } from '../engine/types';

/**
 * Quem deve estar com o aparelho agora, ou `null` se ninguém precisa (fase
 * concluída, ou — só por segurança defensiva — nenhum humano pendente).
 *
 * - fase 'sorteios': primeiro id em `idsHumanos` (ordem de cadastro) cujo
 *   `progresso.rodada` ainda seja <= 5.
 * - fase 'peca': `ordemPeca[indicePeca]` se for humano (por construção de
 *   `resolverBots`, sempre é — bots da fila já foram resolvidos antes de
 *   devolver o controle à UI); `null` caso contrário.
 * - fase 'concluido': `null`.
 */
export function alvoHumano(state: DraftState, idsHumanos: string[]): string | null {
  if (state.fase === 'concluido') return null;

  if (state.fase === 'sorteios') {
    for (const id of idsHumanos) {
      const progresso = state.progresso[id];
      if (progresso !== undefined && progresso.rodada <= 5) return id;
    }
    return null;
  }

  // fase 'peca'
  const vez = state.ordemPeca[state.indicePeca];
  return idsHumanos.includes(vez) ? vez : null;
}

/** Decisão de turno local: o que a UI deve mostrar dado quem está confirmado com o aparelho. */
export type DecisaoLocal =
  | { tipo: 'handoff'; alvo: string }
  | { tipo: 'jogar'; jogadorId: string }
  | { tipo: 'concluido' };

/**
 * Deriva a decisão de turno hotseat: 'concluido' se não há alvo; 'jogar' se
 * quem está confirmado com o aparelho (`confirmadoId`) já é o alvo; senão
 * 'handoff' pedindo pra passar o aparelho pro alvo (inclui o caso inicial
 * `confirmadoId === null`).
 */
export function decisaoLocal(
  state: DraftState,
  idsHumanos: string[],
  confirmadoId: string | null,
): DecisaoLocal {
  const alvo = alvoHumano(state, idsHumanos);
  if (alvo === null) return { tipo: 'concluido' };
  if (alvo === confirmadoId) return { tipo: 'jogar', jogadorId: alvo };
  return { tipo: 'handoff', alvo };
}
