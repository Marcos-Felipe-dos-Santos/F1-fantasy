/**
 * Corrida (PR 1.4, GDD §10).
 *
 * Simula a corrida volta a volta a partir do grid da quali (PR 1.3): tempo
 * de volta por piloto (RIT), carro (AERO/MEC/MOTOR ponderados pela pista) e
 * estrategista (CALL, peso menor), mais variância semeada. Cada carro
 * acumula desgaste de pneu por volta (degrada o tempo e força uma parada
 * obrigatória cuja janela é deslocada pelo CALL do estrategista — quanto
 * pior o CALL, maior o desvio da volta ideal; desgaste alto pode forçar
 * paradas extras). Pontuação FIA pela posição final + bônus de volta mais
 * rápida do grid inteiro.
 *
 * Cada carro é simulado de forma **independente** — sem interação
 * carro-a-carro (ultrapassagem/defesa real, tráfego) neste PR. O RNG de
 * cada jogador é derivado por jogadorId (`corrida:${jogadorId}`), então o
 * resultado não depende da ordem/presença dos demais jogadores no array de
 * entrada.
 *
 * Fora de escopo deste PR (fica pro PR 1.5): incidentes, DNF, quebra
 * mecânica/risco de peça, clima/chuva, safety car — nesta corrida ninguém
 * abandona.
 */

import type { Dataset } from './dataset';
import { resolverCarro } from './carro';
import { createRng, deriveSeed } from './rng';
import type { Loadout, Pista, ResultadoCorrida, ResultadoQuali, Ultrapassagem } from './types';

/** Constantes de balanceamento da corrida — expostas pro futuro balance-harness (PR 1.6). */
export const CORRIDA_CONFIG = {
  pesoPiloto: 0.5,
  pesoCarro: 0.4,
  pesoCall: 0.1,
  /** Fração do tempoBaseMs que separa score 99 de score 0, por volta. */
  spread: 0.05,
  /** Amplitude da variância por volta, fração do tempoBaseMs (±). */
  variancia: 0.006,
  /** Custo por posição de grid embutido na volta 1 (ms) — pista difícil de ultrapassar prende mais. */
  gridOffsetMs: { facil: 150, media: 300, dificil: 500 } as Record<Ultrapassagem, number>,
  /** Penalidade máxima de largada na volta 1 por LARG baixo (ms). */
  largadaMaxMs: 600,
  /** Custo de degradação por "ponto" de desgaste acumulado do pneu (ms/volta). */
  degradacaoMsPorPonto: 120,
  /** Desgaste acumulado que força parada extra (pontos). */
  limiarPneuGasto: 6,
  /** Fração máxima da corrida que um CALL ruim desloca a janela do pit obrigatório (± voltas). */
  desvioJanelaPit: 0.3,
  pitBaseMs: 20000,
  /** Pit lento (PIT_TEMPO 0) custa pitBaseMs+pitRangeMs; PIT_TEMPO 99 custa ~pitBaseMs. */
  pitRangeMs: 4000,
  /** PIT_ERRO 0 ⇒ 20% de chance de erro por parada; PIT_ERRO 99 ⇒ ~0. */
  probErroPitMax: 0.2,
  /** Custo extra máximo de um erro de pit. */
  erroPitMaxMs: 5000,
  pontosFia: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  pontoVoltaMaisRapida: 1,
} as const;

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

/** Estado final de um carro depois do loop de voltas — insumo pra classificação/volta mais rápida. */
interface ResultadoCarro {
  jogadorId: string;
  tempoTotal: number;
  paradas: number;
  melhorVolta: number;
}

/**
 * Simula um carro sozinho pela corrida inteira: score de ritmo, degradação
 * de pneu, janela de pit obrigatório (deslocada pelo CALL) e paradas extras
 * por desgaste. RNG isolado por jogador — sub-stream próprio.
 */
function simularCarro(
  dataset: Dataset,
  loadout: Loadout,
  pista: Pista,
  posGrid0: number,
  seed: number,
): ResultadoCarro {
  const carro = resolverCarro(dataset, loadout);
  const rng = createRng(deriveSeed(seed, `corrida:${loadout.jogadorId}`));

  const notaCarro =
    carro.chassi.aero * pista.pesos.aero +
    carro.chassi.mec * pista.pesos.mec +
    carro.motor.motor * pista.pesos.motor;
  const score =
    CORRIDA_CONFIG.pesoPiloto * carro.piloto.rit +
    CORRIDA_CONFIG.pesoCarro * notaCarro +
    CORRIDA_CONFIG.pesoCall * carro.estrategista.call;
  const tempoVoltaBase = pista.tempoBaseMs * (1 + ((99 - score) / 99) * CORRIDA_CONFIG.spread);

  // Pista desgastante degrada mais; PNEU alto atenua.
  const taxaDesgaste = (pista.desgaste / 99) * (1.5 - carro.piloto.pneu / 99);

  const voltaIdeal = Math.round(pista.voltas / 2);
  const desvioMax = Math.round(
    ((99 - carro.estrategista.call) / 99) * pista.voltas * CORRIDA_CONFIG.desvioJanelaPit,
  );
  // rng.int consumido sempre (mesmo com desvioMax=0), pra manter o stream estável
  // independente do CALL do estrategista.
  const voltaAlvo = clamp(voltaIdeal + rng.int(-desvioMax, desvioMax), 2, pista.voltas - 1);

  let desgasteAcum = 0;
  let paradas = 0;
  let tempoTotal = 0;
  let melhorVolta = Infinity;

  for (let v = 1; v <= pista.voltas; v++) {
    let tempoVolta =
      tempoVoltaBase +
      desgasteAcum * CORRIDA_CONFIG.degradacaoMsPorPonto +
      (rng.next() * 2 - 1) * CORRIDA_CONFIG.variancia * pista.tempoBaseMs;

    if (v === 1) {
      tempoVolta +=
        posGrid0 * CORRIDA_CONFIG.gridOffsetMs[pista.ultrapassagem] +
        ((99 - carro.piloto.larg) / 99) * CORRIDA_CONFIG.largadaMaxMs * rng.next();
    }

    desgasteAcum += taxaDesgaste;

    const precisaParar =
      v < pista.voltas &&
      ((v === voltaAlvo && paradas === 0) || desgasteAcum >= CORRIDA_CONFIG.limiarPneuGasto);
    if (precisaParar) {
      let custoPit =
        CORRIDA_CONFIG.pitBaseMs + ((99 - carro.pit.pitTempo) / 99) * CORRIDA_CONFIG.pitRangeMs;
      // Ordem fixa e sempre a mesma: rola a chance de erro primeiro; só rola a
      // magnitude do erro (2o rng.next()) se o erro de fato ocorrer. Determinístico
      // porque a decisão de pit em si (v, paradas, desgasteAcum) já é toda derivada
      // do RNG consumido até aqui — não há ramo condicional fora do RNG.
      const rolagemErro = rng.next();
      const chanceErro = ((99 - carro.pit.pitErro) / 99) * CORRIDA_CONFIG.probErroPitMax;
      if (rolagemErro < chanceErro) {
        custoPit += rng.next() * CORRIDA_CONFIG.erroPitMaxMs;
      }
      tempoVolta += custoPit;
      paradas++;
      desgasteAcum = 0;
    }

    tempoTotal += tempoVolta;
    if (tempoVolta < melhorVolta) melhorVolta = tempoVolta;
  }

  return { jogadorId: loadout.jogadorId, tempoTotal, paradas, melhorVolta };
}

/**
 * Simula a corrida inteira a partir do grid da quali: cada carro roda de
 * forma independente (ver doc do módulo), depois ordena por tempo total,
 * atribui pontuação FIA e credita o bônus de volta mais rápida.
 */
export function simularCorrida(
  dataset: Dataset,
  loadouts: Loadout[],
  pista: Pista,
  grid: ResultadoQuali,
  seed: number,
): ResultadoCorrida {
  if (loadouts.length < 1) {
    throw new Error('simularCorrida: precisa de ao menos 1 loadout');
  }

  const idsLoadouts = new Set<string>();
  for (const loadout of loadouts) {
    if (idsLoadouts.has(loadout.jogadorId)) {
      throw new Error(`simularCorrida: jogadorId duplicado "${loadout.jogadorId}"`);
    }
    idsLoadouts.add(loadout.jogadorId);
  }

  const idsGrid = new Set(grid.grid.map((p) => p.jogadorId));
  const mesmoConjunto =
    idsGrid.size === idsLoadouts.size && [...idsLoadouts].every((id) => idsGrid.has(id));
  if (!mesmoConjunto) {
    throw new Error(
      'simularCorrida: o grid da quali precisa conter exatamente os mesmos jogadorIds dos loadouts',
    );
  }

  const posicaoGrid = new Map(grid.grid.map((p, idx) => [p.jogadorId, idx]));

  const porJogador = loadouts.map((loadout) =>
    simularCarro(dataset, loadout, pista, posicaoGrid.get(loadout.jogadorId)!, seed),
  );

  porJogador.sort((a, b) => {
    if (a.tempoTotal !== b.tempoTotal) return a.tempoTotal - b.tempoTotal;
    return a.jogadorId < b.jogadorId ? -1 : a.jogadorId > b.jogadorId ? 1 : 0;
  });

  const classificacao = porJogador.map((resultado, idx) => ({
    jogadorId: resultado.jogadorId,
    posicao: idx + 1,
    pontos: CORRIDA_CONFIG.pontosFia[idx] ?? 0,
    tempoTotal: resultado.tempoTotal,
    paradas: resultado.paradas,
  }));

  const posicaoFinal = new Map(classificacao.map((c) => [c.jogadorId, c.posicao]));

  // Volta mais rápida do grid inteiro: menor tempoVolta entre todos; empate ⇒ melhor posição final.
  let autor = porJogador[0];
  for (const resultado of porJogador) {
    const melhorQueAutor = resultado.melhorVolta < autor.melhorVolta;
    const empatePorPosicao =
      resultado.melhorVolta === autor.melhorVolta &&
      posicaoFinal.get(resultado.jogadorId)! < posicaoFinal.get(autor.jogadorId)!;
    if (melhorQueAutor || empatePorPosicao) {
      autor = resultado;
    }
  }

  const itemAutor = classificacao.find((c) => c.jogadorId === autor.jogadorId)!;
  itemAutor.pontos += CORRIDA_CONFIG.pontoVoltaMaisRapida;

  return {
    seed,
    classificacao,
    voltaMaisRapida: { jogadorId: autor.jogadorId, tempo: autor.melhorVolta },
  };
}
