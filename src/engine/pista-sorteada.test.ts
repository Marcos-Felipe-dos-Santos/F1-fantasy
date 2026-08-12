/**
 * PR 1/4 da corrida online — "seed e pista". Baseline vermelho escrito ANTES
 * de `pista-sorteada.ts` existir.
 *
 * Usa a fixture congelada `src/fixtures/dataset-semente/` (padrão do PR 4.4),
 * não o dataset vivo — os testes não podem depender de quantas pistas o
 * dataset real tem hoje.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import { calendarioSorteado } from './campeonato';
import { pistaSorteada } from './pista-sorteada';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

describe('pistaSorteada', () => {
  it('é determinística: mesma seed produz a mesma pista, em execuções independentes', () => {
    for (const seed of [1, 2, 3, 42, 999999]) {
      const a = pistaSorteada(dataset, seed);
      const b = pistaSorteada(dataset, seed);
      expect(a).toBe(b);
    }
  });

  it('o id devolvido existe no dataset', () => {
    for (const seed of [1, 2, 3, 42, 999999]) {
      const id = pistaSorteada(dataset, seed);
      expect(dataset.pistasById.get(id), `pista "${id}" não existe no dataset`).toBeDefined();
    }
  });

  it('🔒 anti-vacuidade: sobre ~50 seeds, sorteia mais de uma pista distinta', () => {
    const distintas = new Set(
      Array.from({ length: 50 }, (_, i) => pistaSorteada(dataset, i + 1)),
    );
    expect(distintas.size, 'sempre a mesma pista — pistaSorteada pode estar fixa em pistas[0]').toBeGreaterThan(1);
  });

  it('🔒 discriminante: o rótulo é próprio — difere de calendarioSorteado(...)[0] em ao menos uma seed', () => {
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const algumaDiferente = seeds.some(
      (seed) => pistaSorteada(dataset, seed) !== calendarioSorteado(dataset, seed)[0],
    );
    expect(
      algumaDiferente,
      'pistaSorteada nunca difere de calendarioSorteado(...)[0] — parece reusar o rótulo "calendario"',
    ).toBe(true);
  });

  it('🔴 dataset sem pista nenhuma lança erro nomeado, em vez de devolver undefined tipado como string', () => {
    const datasetVazio = { ...dataset, pistas: [] };
    expect(() => pistaSorteada(datasetVazio, 1)).toThrow(/pistaSorteada/);
  });
});
