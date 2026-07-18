/**
 * Classificação (quali) — PR 1.3, GDD §10.
 *
 * Volta única: cada jogador cravar um tempo a partir de piloto (QUALI), carro
 * (AERO/MEC/MOTOR ponderados pelos pesos da pista) e estrategista (CALL, peso
 * menor), mais variância semeada. Sem pontuação — só define o grid de
 * largada consumido pela corrida (PR 1.4). O tempo de cada jogador é
 * independente da presença/ordem dos demais no array de entrada: o RNG usado
 * é derivado por `jogadorId`, não pela posição.
 */

import type { Dataset } from './dataset';
import { resolverCarro } from './carro';
import { createRng, deriveSeed } from './rng';
import type { Loadout, Pista, ResultadoQuali } from './types';

/** Constantes de balanceamento da quali — expostas pro futuro balance-harness (PR 1.6). */
export const QUALI_CONFIG = {
  pesoPiloto: 0.5,
  pesoCarro: 0.4,
  pesoCall: 0.1,
  /** Fração do tempoBaseMs que separa score 99 de score 0. */
  spread: 0.05,
  /** Amplitude da variância, fração do tempoBaseMs (±). */
  variancia: 0.004,
} as const;

/**
 * Simula a classificação: 1 volta por jogador, grid ordenado do menor pro
 * maior tempo. Determinístico por seed; cada jogador consome seu próprio
 * sub-stream de RNG (`quali:${jogadorId}`), então adicionar/remover/reordenar
 * outros jogadores no array não muda o tempo de ninguém.
 */
export function simularQuali(
  dataset: Dataset,
  loadouts: Loadout[],
  pista: Pista,
  seed: number,
): ResultadoQuali {
  if (loadouts.length < 1) {
    throw new Error('simularQuali: precisa de ao menos 1 loadout');
  }

  const idsVistos = new Set<string>();
  const grid = loadouts.map((loadout) => {
    if (idsVistos.has(loadout.jogadorId)) {
      throw new Error(`simularQuali: jogadorId duplicado "${loadout.jogadorId}"`);
    }
    idsVistos.add(loadout.jogadorId);

    const carro = resolverCarro(dataset, loadout);
    const notaCarro =
      carro.chassi.aero * pista.pesos.aero +
      carro.chassi.mec * pista.pesos.mec +
      carro.motor.motor * pista.pesos.motor;
    const score =
      QUALI_CONFIG.pesoPiloto * carro.piloto.quali +
      QUALI_CONFIG.pesoCarro * notaCarro +
      QUALI_CONFIG.pesoCall * carro.estrategista.call;

    const rng = createRng(deriveSeed(seed, `quali:${loadout.jogadorId}`));
    const tempo =
      pista.tempoBaseMs * (1 + ((99 - score) / 99) * QUALI_CONFIG.spread) +
      (rng.next() * 2 - 1) * QUALI_CONFIG.variancia * pista.tempoBaseMs;

    return { jogadorId: loadout.jogadorId, tempo };
  });

  grid.sort((a, b) => {
    if (a.tempo !== b.tempo) return a.tempo - b.tempo;
    return a.jogadorId < b.jogadorId ? -1 : a.jogadorId > b.jogadorId ? 1 : 0;
  });

  return { grid };
}
