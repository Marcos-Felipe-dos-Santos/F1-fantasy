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
import { QUALI_CONFIG, simularQuali } from '../src/engine/quali';
import { CORRIDA_CONFIG } from '../src/engine/corrida';
import { resolverCarro } from '../src/engine/carro';
import { createRng, deriveSeed } from '../src/engine/rng';
import type { Loadout } from '../src/engine/types';
import {
  loadoutForte,
  rankMedio,
  scoreCarroPista,
  scoreCorridaPista,
  selecionarPilotosParadas,
  spearman,
} from './balance';

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

/**
 * Unidades da correlação de Spearman (PR 6.3) — dados sintéticos de valor
 * CONHECIDO, calculados à mão (fórmula: ranqueia cada array ascendente com
 * rank médio pra empates, depois correlaciona os ranks via Pearson).
 */
describe('spearman', () => {
  it('ρ = +1 pra ordem idêntica (sem empates)', () => {
    // a=[1,2,3,4,5] já são ranks 1..5; b=[10,20,30,40,50] ranqueia pra
    // [1,2,3,4,5] idêntico a `a` — Pearson de arrays idênticos = 1.
    const a = [1, 2, 3, 4, 5];
    const b = [10, 20, 30, 40, 50];
    expect(spearman(a, b)).toBeCloseTo(1, 10);
  });

  it('ρ = -1 pra ordem inversa (sem empates)', () => {
    // b ranqueia pra [5,4,3,2,1] — exatamente o inverso de `a` — Pearson = -1.
    const a = [1, 2, 3, 4, 5];
    const b = [50, 40, 30, 20, 10];
    expect(spearman(a, b)).toBeCloseTo(-1, 10);
  });

  it('ρ = 0 pra um caso construído (sem empates)', () => {
    // a=[1,2,3,4,5] (ranks 1..5, média 3, desvios [-2,-1,0,1,2]).
    // b=[4,1,3,5,2] (já é permutação de 1..5, ranks = ele mesmo, média 3,
    // desvios [1,-2,0,2,-1]).
    // Produto interno dos desvios: (-2*1)+(-1*-2)+(0*0)+(1*2)+(2*-1)
    //   = -2 + 2 + 0 + 2 - 2 = 0 => covariância 0 => Pearson dos ranks = 0.
    const a = [1, 2, 3, 4, 5];
    const b = [4, 1, 3, 5, 2];
    expect(spearman(a, b)).toBeCloseTo(0, 10);
  });

  it('trata empates com rank médio (mid-rank)', () => {
    // a=[10,20,20,40]: ranks asc mid-rank = [1, 2.5, 2.5, 4]
    //   (10: less=0,equal=1 => rank=1; 20 (x2): less=1,equal=2 => rank=1+1.5=2.5; 40: less=3,equal=1 => rank=4).
    // b=[5,5,8,9]: ranks asc mid-rank = [1.5, 1.5, 3, 4]
    //   (5 (x2): less=0,equal=2 => rank=0+1.5=1.5; 8: less=2,equal=1 => rank=3; 9: less=3,equal=1 => rank=4).
    // médias: rankA=(1+2.5+2.5+4)/4=2.5; rankB=(1.5+1.5+3+4)/4=2.5.
    // desvios: da=[-1.5,0,0,1.5]; db=[-1,-1,0.5,1.5].
    // cov=(-1.5*-1)+(0*-1)+(0*0.5)+(1.5*1.5) = 1.5+0+0+2.25 = 3.75.
    // varA=2.25+0+0+2.25=4.5; varB=1+1+0.25+2.25=4.5.
    // ρ = 3.75 / sqrt(4.5*4.5) = 3.75/4.5 = 5/6 ≈ 0.8333...
    const a = [10, 20, 20, 40];
    const b = [5, 5, 8, 9];
    expect(spearman(a, b)).toBeCloseTo(5 / 6, 10);
  });
});

/**
 * Guard-rail contra drift entre `scoreCarroPista` (réplica no harness) e a
 * fórmula REAL de `src/engine/quali.ts` (PR 6.3). Reconstrói o tempo de
 * quali esperado a partir do score determinístico (mesma fórmula de
 * `quali.ts:62-64`) e checa que o tempo REAL produzido por `simularQuali`
 * cai dentro de `± QUALI_CONFIG.variancia * pista.tempoBaseMs` (a banda da
 * variância aleatória). Se alguém mudar a fórmula de `quali.ts` sem
 * atualizar `scoreCarroPista`, este teste quebra.
 */
describe('scoreCarroPista sincronizado com a fórmula real de quali.ts (guard-rail)', () => {
  function loadoutDe(equipe: string, ano: number, jogadorId: string): Loadout {
    const ea = dataset.equipeAnos.find((e) => e.equipe === equipe && e.ano === ano);
    if (!ea) throw new Error(`loadoutDe: equipe/ano "${equipe}" ${ano} não encontrado no dataset`);
    return {
      jogadorId,
      pilotoId: ea.pilotos[0].id,
      chassiId: ea.chassi.id,
      motorId: ea.motor.id,
      estrategistaId: ea.estrategista.id,
      pitId: ea.pit.id,
      pecaId: 'peca-composto-macio',
    };
  }

  /**
   * Guard-rail de sincronia entre `scoreCarroPista` (réplica no harness) e a
   * fórmula real de `src/engine/quali.ts`.
   *
   * Reconstrói o tempo EXATO, incluindo o termo do RNG, em vez de tolerar uma
   * banda de variância. A versão original deste teste usava
   * `|tempoReal - tempoEsperado| <= variancia * tempoBaseMs` e a revisão do PR
   * 6.3 provou por MUTAÇÃO que a banda era larga demais pra servir de guarda:
   * apagar o termo `pesoCall * call` inteiro da fórmula, trocar `pesoPiloto`
   * com `pesoCarro`, trocar os pesos `aero`/`mec` da pista ou ignorar os pesos
   * de pista — TUDO passava. Só uma troca grosseira (`rit` no lugar de
   * `quali`) era detectada. Com a reconstrução exata, qualquer divergência de
   * fórmula quebra o teste.
   */
  it('reconstrói EXATAMENTE o tempo de quali da engine (trava a réplica da fórmula contra drift)', () => {
    const loadouts = [
      loadoutForte(dataset, 'forte'),
      loadoutDe('Williams', 2022, 'williams-2022'),
      loadoutDe('Alfa Romeo', 1951, 'alfa-1951'),
      // Peça que MEXE em atributo de quali: a `peca-composto-macio` usada nos
      // demais não toca nenhum atributo da fórmula, então o caminho
      // `resolverCarro` -> bônus de peça (que a medição real exercita) ficava
      // sem cobertura — segundo achado da mutação na revisão do PR 6.3.
      { ...loadoutDe('Williams', 2022, 'williams-peca'), pecaId: 'peca-efeito-solo-lotus-79' },
    ];
    const pistas = [
      dataset.pistasById.get('pista-monza')!,
      dataset.pistasById.get('pista-monaco')!,
    ];
    const seed = 42;

    for (const pista of pistas) {
      for (const loadout of loadouts) {
        const score = scoreCarroPista(dataset, loadout, pista);
        // Mesma expressão de `quali.ts:62-64`, termo a termo.
        const rng = createRng(deriveSeed(seed, `quali:${loadout.jogadorId}`));
        const tempoEsperado =
          pista.tempoBaseMs * (1 + ((99 - score) / 99) * QUALI_CONFIG.spread) +
          (rng.next() * 2 - 1) * QUALI_CONFIG.variancia * pista.tempoBaseMs;

        const tempoReal = simularQuali(dataset, [loadout], pista, seed).grid[0].tempo;
        expect(tempoReal).toBeCloseTo(tempoEsperado, 9);
      }
    }
  });

  /**
   * Mesmo guard-rail pro `scoreCorridaPista` (réplica de
   * `src/engine/corrida.ts:189-196`), que difere por usar `piloto.rit` no
   * lugar de `piloto.quali`. Aqui não dá pra reconstruir o tempo final da
   * corrida (degradação, pit, incidentes entram depois), então a trava é
   * sobre a diferença ENTRE os dois scores, que isola exatamente o termo do
   * piloto: score_corrida - score_quali == pesoPiloto * (rit - quali) quando
   * os pesos de carro/call coincidem entre as duas configs.
   */
  /**
   * O ramo 'desc' do `rankMedio` sustenta P(campeão no top-3 de força) e
   * P(pódio com alguém fora do top-5) — as duas probabilidades do portão de
   * decisão — e não tinha teste direto nenhum (aviso 2 da revisão do PR 6.3).
   * Empates de força EXISTEM na população real (3 dos 200 campeonatos).
   */
  it('rankMedio desc: rank 1 = maior valor, com rank médio em empates', () => {
    // [10,20,20,40] desc: 40 é o 1º; os dois 20 ocupam 2º e 3º ⇒ 2.5 cada;
    // 10 é o 4º.
    expect(rankMedio([10, 20, 20, 40], 'desc')).toEqual([4, 2.5, 2.5, 1]);
    // Empate TRIPLO no meio: os três 5 ocupam 2º, 3º e 4º ⇒ (2+3+4)/3 = 3.
    expect(rankMedio([9, 5, 5, 5, 1], 'desc')).toEqual([1, 3, 3, 3, 5]);
    // Empate no FIM do array (caso de borda do laço).
    expect(rankMedio([7, 7, 2, 1], 'desc')).toEqual([1.5, 1.5, 3, 4]);
    // asc e desc são espelhos exatos um do outro.
    expect(rankMedio([10, 20, 20, 40], 'asc')).toEqual([1, 2.5, 2.5, 4]);
  });

  it('scoreCorridaPista difere de scoreCarroPista exatamente pelo termo do piloto', () => {
    const pista = dataset.pistasById.get('pista-monza')!;
    const loadout = loadoutDe('Williams', 2022, 'williams-2022');
    const carro = resolverCarro(dataset, loadout);

    expect(CORRIDA_CONFIG.pesoCarro).toBe(QUALI_CONFIG.pesoCarro);
    expect(CORRIDA_CONFIG.pesoCall).toBe(QUALI_CONFIG.pesoCall);

    const delta =
      scoreCorridaPista(dataset, loadout, pista) - scoreCarroPista(dataset, loadout, pista);
    expect(delta).toBeCloseTo(
      CORRIDA_CONFIG.pesoPiloto * carro.piloto.rit - QUALI_CONFIG.pesoPiloto * carro.piloto.quali,
      9,
    );
  });
});
