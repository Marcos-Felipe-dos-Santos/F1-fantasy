import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from './fluxo-draft';
import {
  acumularVoltas,
  escalaReplay,
  fracaoVisual,
  pontoNoTracado,
  prepararCorrida,
  progressoNoReplay,
  voltaAtual,
  type Ponto,
} from './fluxo-corrida';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Joga as 5 rodadas de sorteio do humano (primeiro slot disponível) e a peça (primeira revelada) — mesmo padrão de useDraft.test.ts, até o draft concluir. */
function jogarDraftAteConcluir(seedTexto: string): DraftState {
  let atual = iniciarDraftSingle(dataset, seedTexto, 'facil');
  for (let i = 0; i < 5; i++) {
    const revelacao = revelarRodada(atual, ID_HUMANO);
    if (revelacao.fase !== 'sorteios') break;
    const slot = revelacao.slotsDisponiveis[0];
    const escolha: EscolhaDraft =
      slot === 'piloto'
        ? {
            tipo: 'piloto',
            pilotoId: (() => {
              const equipeAno = dataset.equipeAnos.find(
                (ea) => ea.equipe === revelacao.equipeAno.equipe && ea.ano === revelacao.equipeAno.ano,
              );
              if (!equipeAno) throw new Error('equipe/ano sorteada não encontrada no dataset de teste');
              return equipeAno.pilotos[0].id;
            })(),
          }
        : { tipo: 'componente', slot };
    atual = aplicarEscolhaHumano(dataset, atual, escolha);
  }
  const revelacao = revelarRodada(atual, ID_HUMANO);
  if (revelacao.fase !== 'peca' || !revelacao.pecasReveladas) {
    throw new Error('esperado fase peca com peças reveladas');
  }
  return aplicarEscolhaHumano(dataset, atual, { tipo: 'peca', pecaId: revelacao.pecasReveladas[0] });
}

describe('prepararCorrida', () => {
  it('é determinística: mesma seed ⇒ mesmo grid e mesma classificação', () => {
    const draft1 = jogarDraftAteConcluir('corrida-demo');
    const draft2 = jogarDraftAteConcluir('corrida-demo');
    const preparo1 = prepararCorrida(dataset, draft1);
    const preparo2 = prepararCorrida(dataset, draft2);

    expect(preparo2.grid).toEqual(preparo1.grid);
    expect(preparo2.resultado.classificacao).toEqual(preparo1.resultado.classificacao);
  });

  it('cobre os 22 jogadores no grid e na classificação', () => {
    const draft = jogarDraftAteConcluir('corrida-demo-22');
    const { grid, resultado } = prepararCorrida(dataset, draft);

    expect(grid.grid).toHaveLength(22);
    expect(resultado.classificacao).toHaveLength(22);
    expect(Object.keys(resultado.historicoVoltas)).toHaveLength(22);
  });

  it('lança erro se o draft não estiver concluído', () => {
    const inicial = iniciarDraftSingle(dataset, 'corrida-incompleto', 'facil');
    expect(() => prepararCorrida(dataset, inicial)).toThrow(/concluído/);
  });
});

describe('progressoNoReplay', () => {
  const historicoCompleto = [1000, 1100, 950, 1200, 1050]; // 5 voltas, carro que terminou (voltasTotais=5)
  const totalCompleto = historicoCompleto.reduce((a, b) => a + b, 0);

  it('é 0 no início (tempoSimMs=0)', () => {
    expect(progressoNoReplay(historicoCompleto, 0, 5)).toBe(0);
  });

  it('é monotônico não-decrescente conforme tempoSimMs avança', () => {
    let anterior = -Infinity;
    for (let t = 0; t <= totalCompleto + 500; t += 37) {
      const progresso = progressoNoReplay(historicoCompleto, t, 5);
      expect(progresso).toBeGreaterThanOrEqual(anterior);
      anterior = progresso;
    }
  });

  it('é exatamente 1 quando tempoSimMs >= tempo total do carro que terminou', () => {
    expect(progressoNoReplay(historicoCompleto, totalCompleto, 5)).toBe(1);
    expect(progressoNoReplay(historicoCompleto, totalCompleto + 10_000, 5)).toBe(1);
  });

  it('DNF: congela em voltasCompletadas/voltasTotais mesmo com tempoSimMs bem à frente', () => {
    const historicoDnf = [1000, 1100, 950]; // abandonou na volta 3 de uma corrida de 5
    const totalDnf = historicoDnf.reduce((a, b) => a + b, 0);
    const esperado = 3 / 5;

    expect(progressoNoReplay(historicoDnf, totalDnf, 5)).toBeCloseTo(esperado, 10);
    expect(progressoNoReplay(historicoDnf, totalDnf + 50_000, 5)).toBeCloseTo(esperado, 10);
  });
});

describe('fracaoVisual (correção da revisão: N voltas visuais, não 1 volta na corrida inteira)', () => {
  const historicoCompleto = [1000, 1000, 1000, 1000, 1000]; // 5 voltas iguais, carro que terminou (voltasTotais=5)
  const totalCompleto = historicoCompleto.reduce((a, b) => a + b, 0);

  it('composição: enquanto o carro roda, é (progressoNoReplay × voltasTotais) módulo 1', () => {
    for (const t of [0, 250, 500, 750, 1000, 1500, 2500, 3999]) {
      const progresso = progressoNoReplay(historicoCompleto, t, 5);
      const esperado = (progresso * 5) % 1;
      expect(fracaoVisual(historicoCompleto, t, 'terminou', 5)).toBeCloseTo(esperado, 10);
    }
  });

  it('carro em corrida dá múltiplas passagens pelo mesmo ponto do traçado (fração cíclica por volta)', () => {
    // Meio da volta 1 (t=500) e meio da volta 3 (t=2500) caem no mesmo ponto do traçado.
    const meioVolta1 = fracaoVisual(historicoCompleto, 500, 'terminou', 5);
    const meioVolta3 = fracaoVisual(historicoCompleto, 2500, 'terminou', 5);
    expect(meioVolta1).toBeCloseTo(0.5, 10);
    expect(meioVolta3).toBeCloseTo(0.5, 10);
  });

  it('monotonicidade dentro de uma única volta (sem contar o wrap-around no fim dela)', () => {
    let anterior = -Infinity;
    for (let t = 2000; t < 3000; t += 50) {
      // dentro da volta 3 inteira (2000-3000), sem cruzar limite de volta
      const fracao = fracaoVisual(historicoCompleto, t, 'terminou', 5);
      expect(fracao).toBeGreaterThanOrEqual(anterior);
      anterior = fracao;
    }
  });

  it('terminou: 0 assim que o replay passa do tempo total do carro (congela na linha de chegada)', () => {
    expect(fracaoVisual(historicoCompleto, totalCompleto, 'terminou', 5)).toBe(0);
    expect(fracaoVisual(historicoCompleto, totalCompleto + 10_000, 'terminou', 5)).toBe(0);
  });

  it('DNF: 0.5 fixo assim que o replay passa do tempo total do carro (congela no meio do traçado, não na largada)', () => {
    const historicoDnf = [1000, 1100, 950]; // abandonou na volta 3 de uma corrida de 5 — voltasCompletadas/voltasTotais = 0.6 (não seria 0 via % 1 ingênuo)
    const totalDnf = historicoDnf.reduce((a, b) => a + b, 0);

    expect(fracaoVisual(historicoDnf, totalDnf, 'dnf', 5)).toBe(0.5);
    expect(fracaoVisual(historicoDnf, totalDnf + 50_000, 'dnf', 5)).toBe(0.5);
  });

  it('DNF ainda rodando (antes do incidente) segue a fração cíclica normal, não o 0.5 fixo do freeze', () => {
    const historicoDnf = [1000, 1100, 950];
    // t=300 na volta 1 (duração 1000) ⇒ fração cíclica 0.3, bem diferente do 0.5 fixo pós-abandono.
    expect(fracaoVisual(historicoDnf, 300, 'dnf', 5)).toBeCloseTo(0.3, 10);
  });
});

describe('voltaAtual', () => {
  const historico = [1000, 1000, 1000, 1000, 1000];

  it('começa na volta 1 e avança 1 volta por vez conforme tempoSimMs passa dos marcos acumulados', () => {
    expect(voltaAtual(historico, 0, 5)).toBe(1);
    expect(voltaAtual(historico, 999, 5)).toBe(1);
    expect(voltaAtual(historico, 1000, 5)).toBe(2);
    expect(voltaAtual(historico, 2500, 5)).toBe(3);
  });

  it('clampa em voltasTotais quando o carro termina', () => {
    expect(voltaAtual(historico, 5000, 5)).toBe(5);
    expect(voltaAtual(historico, 999_999, 5)).toBe(5);
  });
});

describe('acumularVoltas', () => {
  it('soma cumulativa, na ordem', () => {
    expect(acumularVoltas([100, 200, 50])).toEqual([100, 300, 350]);
    expect(acumularVoltas([])).toEqual([]);
  });
});

describe('escalaReplay', () => {
  it('a duração real do replay do líder, escalada, bate com ~voltas * 2200ms', () => {
    const tempoLiderMs = 900_000; // 15min de corrida simulada
    const voltas = 14;
    const fator = escalaReplay(tempoLiderMs, voltas);
    const duracaoRealMs = tempoLiderMs / fator;
    expect(duracaoRealMs).toBeCloseTo(voltas * 2200, 6);
  });
});

describe('pontoNoTracado', () => {
  // Quadrado unitário fechado (perímetro 4): (0,0)→(1,0)→(1,1)→(0,1)→(0,0).
  const quadrado: Ponto[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ];

  it('fracao 0 = primeiro ponto', () => {
    expect(pontoNoTracado(quadrado, 0)).toEqual({ x: 0, y: 0 });
  });

  it('fracao 1 volta ao primeiro ponto (fecha o loop)', () => {
    expect(pontoNoTracado(quadrado, 1)).toEqual({ x: 0, y: 0 });
  });

  it('fracoes 0.25/0.5/0.75 caem exatamente nos cantos do quadrado', () => {
    expect(pontoNoTracado(quadrado, 0.25)).toEqual({ x: 1, y: 0 });
    expect(pontoNoTracado(quadrado, 0.5)).toEqual({ x: 1, y: 1 });
    expect(pontoNoTracado(quadrado, 0.75)).toEqual({ x: 0, y: 1 });
  });

  it('ponto intermediário cai sobre o segmento (meio do primeiro lado)', () => {
    expect(pontoNoTracado(quadrado, 0.125)).toEqual({ x: 0.5, y: 0 });
  });

  it('fracao módulo 1: fracoes fora de [0,1) se comportam como sua parte fracionária', () => {
    expect(pontoNoTracado(quadrado, 1.25)).toEqual(pontoNoTracado(quadrado, 0.25));
    expect(pontoNoTracado(quadrado, -0.25)).toEqual(pontoNoTracado(quadrado, 0.75));
  });
});
