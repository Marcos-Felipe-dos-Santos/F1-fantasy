/**
 * Testes de guarda do balance-harness (PR 4.5) — rodam no `npm test` normal
 * (padrão `.test.ts`, diferente de `.balance.test.ts` que fica fora e só
 * roda via `npm run balance`). Não medem calibração; travam SUPOSIÇÕES do
 * harness que, se quebradas silenciosamente, invalidariam a medição sem
 * nenhum teste avisar.
 */

import { describe, expect, it } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { loadoutForte, selecionarPilotosParadas } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

describe('selecionarPilotosParadas', () => {
  it('seleciona exatamente os 6 pilotos reais pinados (min/max de PNEU por bucket)', () => {
    // Pinado deliberadamente contra o dataset real de hoje. Se o dataset for
    // regenerado (novos fatos agregados, novo shrink etc.) e os extremos de
    // PNEU por bucket mudarem, este teste FALHA — e re-pinar exige decisão
    // CONSCIENTE do dev (é guarda de "o que o harness mede", auditável),
    // nunca um ajuste automático pra fazer passar.
    expect(selecionarPilotosParadas(dataset)).toEqual([
      { jogadorId: 'pneuBaixo-min', pilotoId: 'williams-2022-piloto-latifi', equipe: 'Williams', ano: 2022 },
      { jogadorId: 'pneuBaixo-max', pilotoId: 'alfa-1984-piloto-patrese', equipe: 'Alfa Romeo', ano: 1984 },
      { jogadorId: 'pneuMedio-min', pilotoId: 'alpine-2024-piloto-gasly', equipe: 'Alpine F1 Team', ano: 2024 },
      { jogadorId: 'pneuMedio-max', pilotoId: 'alfa-1951-piloto-farina', equipe: 'Alfa Romeo', ano: 1951 },
      { jogadorId: 'pneuAlto-min', pilotoId: 'benetton-1990-piloto-piquet', equipe: 'Benetton', ano: 1990 },
      { jogadorId: 'pneuAlto-max', pilotoId: 'renault-2006-piloto-alonso', equipe: 'Renault', ano: 2006 },
    ]);
  });

  it('lança se o dataset não cobrir os 3 buckets de PNEU (falha alta, nunca silenciosa)', () => {
    // Dataset sintético mínimo: 2 equipe/anos, todos os 4 pilotos com PNEU
    // <= 80 (buckets pneuBaixo/pneuMedio) — nenhum piloto de pneuAlto (>80).
    function pilotoComPneu(id: string, pneu: number) {
      return {
        id,
        nome: 'Piloto Sintetico',
        notas: { rit: 70, quali: 70, cons: 70, ult: 70, def: 70, chu: 70, pneu, larg: 70, sf: 70 },
      };
    }
    function equipeAnoSintetica(equipe: string, ano: number, pneuA: number, pneuB: number) {
      return {
        equipe,
        ano,
        pilotos: [pilotoComPneu(`${equipe}-${ano}-a`, pneuA), pilotoComPneu(`${equipe}-${ano}-b`, pneuB)],
        chassi: { id: `chassi-${equipe}-${ano}`, notas: { aero: 70, mec: 70, ppeso: 70, conf: 70, freio: 70 } },
        motor: { id: `motor-${equipe}-${ano}`, notas: { motor: 70, confMotor: 70 } },
        estrategista: {
          id: `estrategista-${equipe}-${ano}`,
          nome: 'Estrategista Sintetico',
          notas: { call: 70, sangf: 70 },
        },
        pit: { id: `pit-${equipe}-${ano}`, notas: { pitTempo: 70, pitErro: 70 } },
      };
    }
    const equipeAnosSemPneuAlto = [
      equipeAnoSintetica('Sintetica A', 2000, 30, 59),
      equipeAnoSintetica('Sintetica B', 2001, 61, 80),
    ];
    const datasetIncompleto = criarDataset(equipeAnosSemPneuAlto, [], []);

    expect(() => selecionarPilotosParadas(datasetIncompleto)).toThrow(
      /bucket "pneuAlto" vazio/,
    );
  });
});

describe('loadoutForte', () => {
  it('resolve pilotoId para o titular nº1 de Red Bull 2023 (Verstappen) — blinda a suposição pilotos[0]', () => {
    const loadout = loadoutForte(dataset, 'jogador-teste');
    expect(loadout.pilotoId).toBe('red-bull-2023-piloto-max_verstappen');
  });
});
