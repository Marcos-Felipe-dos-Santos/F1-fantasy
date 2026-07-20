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
 * Incidentes (PR 1.5a, GDD §8): erro de piloto (CONS), quebra de chassi
 * (CONF) e quebra de motor (CONF_MOTOR) são DNF; risco técnico da peça pode
 * gerar um problema técnico (perda de tempo numa volta) e/ou uma
 * investigação pós-corrida (penalidade em ms) — o risco nunca elimina o
 * jogador do campeonato, só piora uma corrida (§8). Todo incidente vira um
 * `EventoCorrida` pra narração.
 *
 * Ordem fixa de consumo do RNG por carro (contrato determinístico —
 * qualquer mudança de ordem quebra a seed de ouro):
 * 1. `rng.int` da janela de pit (desvio pelo CALL do estrategista).
 * 2. Rolagem única de "problema técnico" da peça (chance por `risco`); se
 *    disparar, mais 2 `rng` (volta do problema + magnitude do custo).
 * 3. Rolagem única de "investigação" da peça (chance por `risco`); se
 *    disparar, mais 1 `rng` (magnitude da penalidade).
 * 4. Por volta, nesta ordem: variância da volta — sempre 1 `rng`; na volta 1,
 *    +1 `rng` da penalidade de largada (LARG); (a) erro de piloto — sempre
 *    1 `rng`, +1 se disparar; (b) quebra de chassi — sempre 1 `rng`;
 *    (c) quebra de motor — sempre 1 `rng`. (a)/(b)/(c) consomem RNG toda
 *    volta, mesmo que a volta termine em DNF, pra manter o stream estável.
 *    (d) problema técnico não consome RNG no loop — só compara `v` com a
 *    volta sorteada no passo 2.
 * 5. Se a volta termina em pit: 1 `rng` da rolagem de erro de pit, +1 da
 *    magnitude se o erro disparar.
 *
 * Clima/chuva (PR 1.5b, GDD §9/§10): antes de simular qualquer carro, rola
 * 1 `next()` **global** num sub-stream próprio (`corrida:clima`, seed
 * derivada de `deriveSeed(seed, 'corrida:clima')`), separado dos streams
 * por carro (`corrida:${jogadorId}`) — essa rolagem NÃO desloca nem consome
 * nada dos streams por carro. `chove = rng.next() < pista.chanceChuva`.
 *
 * Quando chove, a ORDEM de consumo dos streams por carro é a mesma da
 * corrida seca: a chuva não introduz nenhuma rolagem nova, só muda
 * THRESHOLDS/custos de cálculos existentes (regra de ouro deste PR).
 * Consequência exata: o stream molhado fica idêntico ao seco **até o
 * primeiro erro de piloto que dispare só na chuva** — o custo desse erro
 * consome 1 `next()` extra (passo 4a) e desloca as rolagens seguintes
 * daquele carro em relação ao cenário seco. Dentro de um mesmo cenário, o
 * resultado segue 100% determinístico por seed. Efeitos da chuva:
 * - Toda volta: `tempoVolta` ganha `chuvaLentidao * pista.tempoBaseMs +
 *   ((99 - piloto.chu) / 99) * chuvaPenalidadeMaxMs` (CHU 99 ⇒ só a
 *   lentidão base; CHU 0 ⇒ lentidão base + penalidade máxima).
 * - (a) erro de piloto: a chance por volta vira
 *   `min(1, ((99 - cons) / 99) * probErroMax * chuvaMultErro)` — a rolagem
 *   em si (passo 4a) já existia e é sempre consumida; só o threshold muda.
 * - Degradação de pneu, janela/limiar de pit, quebras (chassi/motor) e risco
 *   de peça **não mudam** com chuva (decisão de design: pneu de chuva não é
 *   modelado neste PR — o desgaste segue o perfil normal da pista).
 *
 * A quali (`quali.ts`) não é afetada por clima — chuva só entra na corrida
 * por enquanto. Safety car ainda não existe no jogo.
 */

import type { Dataset } from './dataset';
import { resolverCarro } from './carro';
import { createRng, deriveSeed } from './rng';
import type {
  EventoCorrida,
  Loadout,
  Pista,
  ResultadoCorrida,
  ResultadoQuali,
  Ultrapassagem,
} from './types';

/**
 * Constantes de balanceamento da corrida — expostas pro balance-harness (PR 1.6).
 *
 * `variancia`, `gridOffsetMs` e `limiarPneuGasto` foram calibrados pelo
 * `scripts/balance.ts` em 2026-07-18 contra as 3 metas do dev
 * (`PROGRESS.md`, seção "Metas de calibração"): sinal de grid (pole vence
 * ~70-80% das vezes em pista de ultrapassagem média, com carros idênticos)
 * e paradas extras em desgaste alto (~40-60% dos carros fazem 2+ paradas,
 * variando pelo PNEU). Ver `npm run balance` pro relatório de medição.
 */
export const CORRIDA_CONFIG = {
  pesoPiloto: 0.5,
  pesoCarro: 0.4,
  pesoCall: 0.1,
  /** Fração do tempoBaseMs que separa score 99 de score 0, por volta. */
  spread: 0.05,
  /** Amplitude da variância por volta, fração do tempoBaseMs (±). Calibrado 2026-07-18. */
  variancia: 0.004,
  /** Custo por posição de grid embutido na volta 1 (ms) — pista difícil de ultrapassar prende mais. Calibrado 2026-07-18. */
  gridOffsetMs: { facil: 500, media: 800, dificil: 1200 } as Record<Ultrapassagem, number>,
  /** Penalidade máxima de largada na volta 1 por LARG baixo (ms). */
  largadaMaxMs: 600,
  /** Custo de degradação por "ponto" de desgaste acumulado do pneu (ms/volta). */
  degradacaoMsPorPonto: 120,
  /** Desgaste acumulado que força parada extra (pontos). Calibrado 2026-07-18. */
  limiarPneuGasto: 3.5,
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
  /** Chance de erro do piloto por volta com CONS 0 (CONS 99 ⇒ ~0). */
  probErroMax: 0.04,
  erroCustoMinMs: 1500,
  erroCustoMaxMs: 4000,
  /** Chance de quebra de chassi por volta com CONF 0. */
  probQuebraChassiMax: 0.004,
  /** Chance de quebra de motor por volta com CONF_MOTOR 0. */
  probQuebraMotorMax: 0.005,
  /** Prob de problema técnico por ponto de risco da peça (rolagem única por corrida, §8). Peça proibida tem risco 7 ⇒ ~5.6%. */
  riscoProblemaPorPonto: 0.008,
  problemaCustoMinMs: 3000,
  problemaCustoMaxMs: 8000,
  /** Prob de investigação por ponto de risco (rolagem única por corrida, §8). */
  riscoInvestigacaoPorPonto: 0.005,
  investigacaoPenalidadeMinMs: 5000,
  investigacaoPenalidadeMaxMs: 10000,
  /** Lentidão global de pista molhada — fração do tempoBaseMs somada a toda volta com chuva. */
  chuvaLentidao: 0.06,
  /** Penalidade extra por volta na chuva pra CHU 0 (CHU 99 ⇒ ~0), em ms. */
  chuvaPenalidadeMaxMs: 500,
  /** Multiplicador da probabilidade de erro do piloto (CONS) na chuva. */
  chuvaMultErro: 2.0,
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
  status: 'terminou' | 'dnf';
  voltasCompletadas: number;
  eventos: EventoCorrida[];
  /** Tempo de cada volta completada, na ordem — ver doc de `ResultadoCorrida.historicoVoltas`. */
  voltas: number[];
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
  chove: boolean,
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

  // Rolagens únicas de risco da peça (§8) — sempre 1 rng.next() por rolagem,
  // mais 1-2 extras condicionais se disparar. Peça de risco 0 nunca dispara
  // (threshold 0), mas ainda consome os 2 next() de "sempre rola", mantendo
  // o stream estável independente da peça sorteada.
  const rolagemProblema = rng.next();
  const chanceProblema = carro.peca.risco * CORRIDA_CONFIG.riscoProblemaPorPonto;
  const temProblema = rolagemProblema < chanceProblema;
  let voltaProblema = 0;
  let custoProblema = 0;
  if (temProblema) {
    voltaProblema = rng.int(2, pista.voltas - 1);
    custoProblema =
      CORRIDA_CONFIG.problemaCustoMinMs +
      rng.next() * (CORRIDA_CONFIG.problemaCustoMaxMs - CORRIDA_CONFIG.problemaCustoMinMs);
  }

  const rolagemInvestigacao = rng.next();
  const chanceInvestigacao = carro.peca.risco * CORRIDA_CONFIG.riscoInvestigacaoPorPonto;
  const temInvestigacao = rolagemInvestigacao < chanceInvestigacao;
  let penalidadeInvestigacao = 0;
  if (temInvestigacao) {
    penalidadeInvestigacao =
      CORRIDA_CONFIG.investigacaoPenalidadeMinMs +
      rng.next() *
        (CORRIDA_CONFIG.investigacaoPenalidadeMaxMs - CORRIDA_CONFIG.investigacaoPenalidadeMinMs);
  }

  let desgasteAcum = 0;
  let paradas = 0;
  let tempoTotal = 0;
  let melhorVolta = Infinity;
  let status: 'terminou' | 'dnf' = 'terminou';
  let voltasCompletadas = pista.voltas;
  const eventos: EventoCorrida[] = [];
  const voltas: number[] = [];

  for (let v = 1; v <= pista.voltas; v++) {
    let tempoVolta =
      tempoVoltaBase +
      desgasteAcum * CORRIDA_CONFIG.degradacaoMsPorPonto +
      (rng.next() * 2 - 1) * CORRIDA_CONFIG.variancia * pista.tempoBaseMs;

    // Clima (PR 1.5b): lentidão global de pista molhada + penalidade por CHU
    // baixo. Não consome RNG — só soma tempo, sempre que `chove` é true.
    if (chove) {
      tempoVolta +=
        CORRIDA_CONFIG.chuvaLentidao * pista.tempoBaseMs +
        ((99 - carro.piloto.chu) / 99) * CORRIDA_CONFIG.chuvaPenalidadeMaxMs;
    }

    if (v === 1) {
      tempoVolta +=
        posGrid0 * CORRIDA_CONFIG.gridOffsetMs[pista.ultrapassagem] +
        ((99 - carro.piloto.larg) / 99) * CORRIDA_CONFIG.largadaMaxMs * rng.next();
    }

    // (a) erro de piloto: sempre 1 rng.next() (chance), +1 se disparar (custo).
    // Na chuva só o threshold muda (chuvaMultErro) — a rolagem em si é a mesma.
    const rolagemErro = rng.next();
    const chanceErroBase = ((99 - carro.piloto.cons) / 99) * CORRIDA_CONFIG.probErroMax;
    const chanceErro = chove
      ? Math.min(1, chanceErroBase * CORRIDA_CONFIG.chuvaMultErro)
      : chanceErroBase;
    if (rolagemErro < chanceErro) {
      const custoErro =
        CORRIDA_CONFIG.erroCustoMinMs +
        rng.next() * (CORRIDA_CONFIG.erroCustoMaxMs - CORRIDA_CONFIG.erroCustoMinMs);
      tempoVolta += custoErro;
      eventos.push({ volta: v, jogadorId: loadout.jogadorId, tipo: 'erro-piloto', custoMs: custoErro });
    }

    // (b) quebra de chassi e (c) quebra de motor: sempre 1 rng.next() cada,
    // toda volta, mesmo que a volta termine em DNF — mantém o stream estável.
    const rolagemChassi = rng.next();
    const chanceChassi = ((99 - carro.chassi.conf) / 99) * CORRIDA_CONFIG.probQuebraChassiMax;
    const quebrouChassi = rolagemChassi < chanceChassi;

    const rolagemMotor = rng.next();
    const chanceMotor = ((99 - carro.motor.confMotor) / 99) * CORRIDA_CONFIG.probQuebraMotorMax;
    const quebrouMotor = rolagemMotor < chanceMotor;

    if (quebrouChassi) {
      tempoTotal += tempoVolta;
      voltas.push(tempoVolta);
      eventos.push({ volta: v, jogadorId: loadout.jogadorId, tipo: 'quebra-chassi', custoMs: 0 });
      status = 'dnf';
      voltasCompletadas = v;
      break;
    }
    if (quebrouMotor) {
      tempoTotal += tempoVolta;
      voltas.push(tempoVolta);
      eventos.push({ volta: v, jogadorId: loadout.jogadorId, tipo: 'quebra-motor', custoMs: 0 });
      status = 'dnf';
      voltasCompletadas = v;
      break;
    }

    // (d) problema técnico: não consome rng aqui — a volta e o custo já
    // foram sorteados antes do loop (rolagem única de risco da peça, §8).
    if (temProblema && v === voltaProblema) {
      tempoVolta += custoProblema;
      eventos.push({
        volta: v,
        jogadorId: loadout.jogadorId,
        tipo: 'problema-tecnico',
        custoMs: custoProblema,
      });
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
      const rolagemErroPit = rng.next();
      const chanceErroPit = ((99 - carro.pit.pitErro) / 99) * CORRIDA_CONFIG.probErroPitMax;
      if (rolagemErroPit < chanceErroPit) {
        custoPit += rng.next() * CORRIDA_CONFIG.erroPitMaxMs;
      }
      tempoVolta += custoPit;
      paradas++;
      desgasteAcum = 0;
    }

    tempoTotal += tempoVolta;
    voltas.push(tempoVolta);
    if (tempoVolta < melhorVolta) melhorVolta = tempoVolta;
  }

  // Investigação (§8) só pune quem terminou — decisão de design: um carro já
  // abandonado não recebe uma penalidade de tempo que nunca vai "cravar"
  // posição nenhuma (o DNF já é o pior desfecho possível pra corrida dele).
  if (temInvestigacao && status === 'terminou') {
    tempoTotal += penalidadeInvestigacao;
    eventos.push({
      volta: pista.voltas,
      jogadorId: loadout.jogadorId,
      tipo: 'investigacao',
      custoMs: penalidadeInvestigacao,
    });
  }

  return {
    jogadorId: loadout.jogadorId,
    tempoTotal,
    paradas,
    melhorVolta,
    status,
    voltasCompletadas,
    eventos,
    voltas,
  };
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

  // Rolagem global de clima (PR 1.5b, §9/§10): 1 next() num sub-stream
  // próprio, separado dos streams por carro — ver contrato de RNG no topo.
  const chove = createRng(deriveSeed(seed, 'corrida:clima')).next() < pista.chanceChuva;

  const porJogador = loadouts.map((loadout) =>
    simularCarro(dataset, loadout, pista, posicaoGrid.get(loadout.jogadorId)!, seed, chove),
  );

  // Quem terminou vem primeiro (ordenado por tempoTotal, empate ⇒ jogadorId);
  // DNF depois, ordenado por voltasCompletadas decrescente (quem foi mais
  // longe termina "na frente" dos outros abandonos), empate por tempoTotal
  // crescente, empate por jogadorId (§8/§10).
  porJogador.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'terminou' ? -1 : 1;
    }
    if (a.status === 'dnf' && a.voltasCompletadas !== b.voltasCompletadas) {
      return b.voltasCompletadas - a.voltasCompletadas;
    }
    if (a.tempoTotal !== b.tempoTotal) return a.tempoTotal - b.tempoTotal;
    return a.jogadorId < b.jogadorId ? -1 : a.jogadorId > b.jogadorId ? 1 : 0;
  });

  // Pontos FIA só pra quem terminou — DNF nunca pontua, mesmo caindo no top 10 (§8/§10).
  const classificacao = porJogador.map((resultado, idx) => ({
    jogadorId: resultado.jogadorId,
    posicao: idx + 1,
    pontos: resultado.status === 'terminou' ? (CORRIDA_CONFIG.pontosFia[idx] ?? 0) : 0,
    tempoTotal: resultado.tempoTotal,
    paradas: resultado.paradas,
    status: resultado.status,
    voltasCompletadas: resultado.voltasCompletadas,
  }));

  const posicaoFinal = new Map(classificacao.map((c) => [c.jogadorId, c.posicao]));

  // Volta mais rápida: elegíveis só quem terminou (decisão de design — sem
  // ponto de consolação pra DNF, §8). Se TODOS derem DNF (improvável, mas
  // possível), usa o menor tempoVolta entre todos e NÃO soma o ponto de
  // bônus a ninguém.
  const terminaram = porJogador.filter((r) => r.status === 'terminou');
  const candidatos = terminaram.length > 0 ? terminaram : porJogador;
  let autor = candidatos[0];
  for (const resultado of candidatos) {
    const melhorQueAutor = resultado.melhorVolta < autor.melhorVolta;
    const empatePorPosicao =
      resultado.melhorVolta === autor.melhorVolta &&
      posicaoFinal.get(resultado.jogadorId)! < posicaoFinal.get(autor.jogadorId)!;
    if (melhorQueAutor || empatePorPosicao) {
      autor = resultado;
    }
  }

  if (terminaram.length > 0) {
    const itemAutor = classificacao.find((c) => c.jogadorId === autor.jogadorId)!;
    itemAutor.pontos += CORRIDA_CONFIG.pontoVoltaMaisRapida;
  }

  // Eventos de todos os carros, concatenados e ordenados por volta crescente
  // (empate ⇒ jogadorId crescente) — insumo pra narração.
  const eventos = porJogador
    .flatMap((resultado) => resultado.eventos)
    .sort((a, b) => {
      if (a.volta !== b.volta) return a.volta - b.volta;
      if (a.jogadorId !== b.jogadorId) return a.jogadorId < b.jogadorId ? -1 : 1;
      // Desempate terciário por tipo: um mesmo carro pode ter 2 eventos na
      // mesma volta (ex.: erro-piloto + quebra); `tipo` é único por
      // (jogadorId, volta), então isso fecha uma ordem total — sem depender
      // da estabilidade do sort do runtime.
      return a.tipo < b.tipo ? -1 : a.tipo > b.tipo ? 1 : 0;
    });

  const historicoVoltas: Record<string, number[]> = {};
  for (const resultado of porJogador) {
    historicoVoltas[resultado.jogadorId] = resultado.voltas;
  }

  return {
    seed,
    classificacao,
    voltaMaisRapida: { jogadorId: autor.jogadorId, tempo: autor.melhorVolta },
    eventos,
    chuva: chove,
    historicoVoltas,
  };
}
