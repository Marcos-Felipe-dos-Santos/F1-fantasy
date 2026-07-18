/**
 * Fixture de teste compartilhada entre draft.test.ts e bots.test.ts (PR 1.2).
 *
 * Não é consumida por código de produção — vive em `engine/` só porque os
 * testes que a usam também vivem aqui. Monta um `DraftState` artesanal, sem
 * passar por `criarDraft` (que exige 22 jogadores), pra focar em cenários
 * pontuais de validação/decisão.
 */

import type { Dataset } from './dataset';
import type { DraftState, Jogador, ProgressoJogador } from './types';

export function stateManual(
  dataset: Dataset,
  overrides: Partial<DraftState> & { jogadores: Jogador[] },
): DraftState {
  const jogadorIds = overrides.jogadores.map((j) => j.id);
  const progressoPadrao: Record<string, ProgressoJogador> = {};
  const sorteiosPadrao: Record<string, DraftState['sorteios'][string]> = {};
  for (const id of jogadorIds) {
    progressoPadrao[id] = { rodada: 1, slots: {} };
    sorteiosPadrao[id] = Array(5).fill({ equipe: 'Red Bull', ano: 2023 });
  }
  return {
    seed: overrides.seed ?? 1,
    fase: overrides.fase ?? 'sorteios',
    jogadores: overrides.jogadores,
    sorteios: overrides.sorteios ?? sorteiosPadrao,
    progresso: overrides.progresso ?? progressoPadrao,
    ordemPeca: overrides.ordemPeca ?? jogadorIds,
    indicePeca: overrides.indicePeca ?? 0,
    pecasReveladas: overrides.pecasReveladas ?? null,
    copiasRestantes:
      overrides.copiasRestantes ?? Object.fromEntries(dataset.pecas.map((p) => [p.id, 2])),
    loadouts: overrides.loadouts ?? {},
  };
}
