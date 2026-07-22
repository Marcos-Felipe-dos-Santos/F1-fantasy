/**
 * Invariantes sobre o dataset VIVO de `src/data/` (PR 4.4).
 *
 * Ao contrário de `dataset.test.ts` (que mede o dataset SEMENTE congelado em
 * `src/fixtures/dataset-semente/`, com contagens e ids fixos), este arquivo
 * testa propriedades que precisam valer pra **qualquer** dataset entregue —
 * hoje o semente (22 equipe/anos), depois do PR 4.5 o derivado (771). Por
 * isso NÃO fixa contagem nem ids específicos: só as invariantes estruturais
 * que o loader (`criarDataset`, `src/engine/dataset.ts`) já garante.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';

/** Toda nota do dataset (piloto, chassi, motor, estrategista, pit) 0-99. */
function todasAsNotas(dataset: ReturnType<typeof criarDataset>): number[] {
  const notas: number[] = [];
  for (const p of dataset.pilotos) notas.push(...Object.values(p.notas));
  for (const c of dataset.chassis) notas.push(...Object.values(c.notas));
  for (const m of dataset.motores) notas.push(...Object.values(m.notas));
  for (const e of dataset.estrategistas) notas.push(...Object.values(e.notas));
  for (const pit of dataset.pits) notas.push(...Object.values(pit.notas));
  return notas;
}

describe('dataset vivo (src/data/) — invariantes estruturais (PR 4.4)', () => {
  it('criarDataset aceita o dataset vivo sem lançar', () => {
    expect(() => criarDataset(equipeAnosReal, pecasReal, pistasReal)).not.toThrow();
  });

  it('todo equipe/ano tem exatamente 2 pilotos titulares', () => {
    const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
    expect(dataset.equipeAnos.length).toBeGreaterThan(0);
    for (const ea of dataset.equipeAnos) {
      expect(ea.pilotos).toHaveLength(2);
    }
  });

  it('ids são únicos em todo o dataset (pilotos, chassis, motores, estrategistas, pits, peças, pistas)', () => {
    const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
    const todosOsIds = [
      ...dataset.pilotos.map((p) => p.id),
      ...dataset.chassis.map((c) => c.id),
      ...dataset.motores.map((m) => m.id),
      ...dataset.estrategistas.map((e) => e.id),
      ...dataset.pits.map((p) => p.id),
      ...dataset.pecas.map((p) => p.id),
      ...dataset.pistas.map((p) => p.id),
    ];
    expect(new Set(todosOsIds).size).toBe(todosOsIds.length);
  });

  it('toda nota do dataset está dentro da escala 0-99', () => {
    const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
    const notas = todasAsNotas(dataset);
    expect(notas.length).toBeGreaterThan(0);
    for (const nota of notas) {
      expect(nota).toBeGreaterThanOrEqual(0);
      expect(nota).toBeLessThanOrEqual(99);
    }
  });
});
