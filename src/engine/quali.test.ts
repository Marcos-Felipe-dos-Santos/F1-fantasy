import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import type { Loadout } from './types';
import { QUALI_CONFIG, simularQuali } from './quali';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const pistaMonaco = dataset.pistasById.get('pista-monaco')!;
const pistaMonza = dataset.pistasById.get('pista-monza')!;

/**
 * ⚠️ **PR 7 (2026-08-31) — os NOMES destes helpers ficam com a grafia real, e os
 * ids que eles carregam são FICTÍCIOS.** `loadoutFerrari` monta `sarterra-…`,
 * `loadoutMinardi` monta `ronzani-…`. **Não é inconsistência esquecida:** é o
 * mesmo precedente e o mesmo motivo do `DATA_*`/`FIXTURE_*` em
 * `src/fixtures/referencias-dataset.ts` — identificador de código não é dado
 * servido, o portão dos nomes reais **não mede `.ts`**, e renomeá-los torraria a
 * rastreabilidade da trilha sem tirar um byte do bundle.
 * 🔑 O mapa, para quem for ler os ids: Red Bull → Kaldrix · Ferrari → Sarterra ·
 * Mercedes → Halbrandt · McLaren → Ridgeway · Williams → Pemberley ·
 * Aston Martin → Ardsley Vane · Renault → Charmont · Sauber → Baldern ·
 * Minardi → Ronzani · Benetton → Salviati.
 */
function loadoutRedBull(overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId: 'j1',
    pilotoId: 'kaldrix-2023-piloto-sander_doornbosch',
    chassiId: 'kaldrix-2023-chassi',
    motorId: 'kaldrix-2023-motor',
    estrategistaId: 'kaldrix-2023-estrategista',
    pitId: 'kaldrix-2023-pit',
    pecaId: 'peca-composto-macio',
    ...overrides,
  };
}

function loadoutFerrari(overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId: 'j2',
    pilotoId: 'sarterra-2023-piloto-valbonne',
    chassiId: 'sarterra-2023-chassi',
    motorId: 'sarterra-2023-motor',
    estrategistaId: 'sarterra-2023-estrategista',
    pitId: 'sarterra-2023-pit',
    pecaId: 'peca-composto-macio',
    ...overrides,
  };
}

function loadoutMinardi(jogadorId: string, overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId,
    pilotoId: 'ronzani-2004-piloto-beregszaszi',
    chassiId: 'ronzani-2004-chassi',
    motorId: 'ronzani-2004-motor',
    estrategistaId: 'ronzani-2004-estrategista',
    pitId: 'ronzani-2004-pit',
    pecaId: 'peca-composto-macio',
    ...overrides,
  };
}

describe('simularQuali', () => {
  it('é determinístico: mesma seed + mesmos loadouts ⇒ mesmo resultado', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari()];
    const resultado1 = simularQuali(dataset, loadouts, pistaMonaco, 42);
    const resultado2 = simularQuali(dataset, loadouts, pistaMonaco, 42);
    expect(resultado2).toEqual(resultado1);
  });

  it('seeds diferentes produzem tempos diferentes', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari()];
    const resultado1 = simularQuali(dataset, loadouts, pistaMonaco, 1);
    const resultado2 = simularQuali(dataset, loadouts, pistaMonaco, 2);
    expect(resultado2).not.toEqual(resultado1);
  });

  it('grid ordenado por tempo crescente e cada jogadorId aparece exatamente 1 vez', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3')];
    const resultado = simularQuali(dataset, loadouts, pistaMonaco, 7);
    expect(resultado.grid).toHaveLength(3);
    const ids = resultado.grid.map((p) => p.jogadorId);
    expect(new Set(ids).size).toBe(3);
    for (let i = 1; i < resultado.grid.length; i++) {
      expect(resultado.grid[i].tempo).toBeGreaterThanOrEqual(resultado.grid[i - 1].tempo);
    }
  });

  it('independe da ordem dos loadouts no array de entrada', () => {
    const loadouts = [loadoutRedBull(), loadoutFerrari(), loadoutMinardi('j3')];
    const invertido = [...loadouts].reverse();
    const resultadoNormal = simularQuali(dataset, loadouts, pistaMonaco, 99);
    const resultadoInvertido = simularQuali(dataset, invertido, pistaMonaco, 99);

    const tempoPorId = (grid: { jogadorId: string; tempo: number }[]) =>
      Object.fromEntries(grid.map((p) => [p.jogadorId, p.tempo]));

    expect(tempoPorId(resultadoInvertido.grid)).toEqual(tempoPorId(resultadoNormal.grid));
  });

  it('loadout forte vence o fraco na maioria das seeds', () => {
    const forte = loadoutRedBull({ jogadorId: 'forte' });
    const fraco = loadoutMinardi('fraco');
    let vitoriasForte = 0;
    const totalSeeds = 100;
    for (let seed = 0; seed < totalSeeds; seed++) {
      const resultado = simularQuali(dataset, [forte, fraco], pistaMonaco, seed);
      const tempoForte = resultado.grid.find((p) => p.jogadorId === 'forte')!.tempo;
      const tempoFraco = resultado.grid.find((p) => p.jogadorId === 'fraco')!.tempo;
      if (tempoForte < tempoFraco) vitoriasForte++;
    }
    expect(vitoriasForte).toBeGreaterThanOrEqual(85);
  });

  it('peça que afeta a fórmula (aero) rende tempo estritamente menor que peça que não afeta (freio)', () => {
    const comAero = loadoutRedBull({ pecaId: 'peca-duplo-difusor' });
    const semEfeito = loadoutRedBull({ pecaId: 'peca-seis-rodas' }); // alvo: freio, fora da fórmula de quali.
    const resultadoComAero = simularQuali(dataset, [comAero], pistaMonaco, 55);
    const resultadoSemEfeito = simularQuali(dataset, [semEfeito], pistaMonaco, 55);
    expect(resultadoComAero.grid[0].tempo).toBeLessThan(resultadoSemEfeito.grid[0].tempo);
  });

  it('jogadorId duplicado lança erro', () => {
    const loadouts = [loadoutRedBull({ jogadorId: 'dup' }), loadoutFerrari({ jogadorId: 'dup' })];
    expect(() => simularQuali(dataset, loadouts, pistaMonaco, 1)).toThrow(/dup/);
  });

  it('lança erro se a lista de loadouts estiver vazia', () => {
    expect(() => simularQuali(dataset, [], pistaMonaco, 1)).toThrow();
  });

  describe('seed de ouro (regressão)', () => {
    it('congela grid e tempos para seed 42, pista Monza, 4 loadouts fixos', () => {
      const loadouts: Loadout[] = [
        loadoutRedBull(),
        loadoutFerrari(),
        loadoutMinardi('j3'),
        {
          jogadorId: 'j4',
          pilotoId: 'halbrandt-2023-piloto-calderwood',
          chassiId: 'halbrandt-2023-chassi',
          motorId: 'halbrandt-2023-motor',
          estrategistaId: 'halbrandt-2023-estrategista',
          pitId: 'halbrandt-2023-pit',
          pecaId: 'peca-das',
        },
      ];
      const resultado = simularQuali(dataset, loadouts, pistaMonza, 42);
      // Valores congelados a partir da 1a execução da implementação (PR 1.3).
      expect(resultado).toEqual({
        grid: [
          { jogadorId: 'j4', tempo: 82285.20811992366 },
          { jogadorId: 'j1', tempo: 82332.85253969993 },
          { jogadorId: 'j2', tempo: 82428.16839009796 },
          { jogadorId: 'j3', tempo: 84184.92042426407 },
        ],
      });
    });
  });
});

describe('QUALI_CONFIG', () => {
  it('pesos da fórmula somam 1.0 — protege a escala 0-99 do score', () => {
    const soma = QUALI_CONFIG.pesoPiloto + QUALI_CONFIG.pesoCarro + QUALI_CONFIG.pesoCall;
    expect(soma).toBeCloseTo(1, 9);
  });
});
