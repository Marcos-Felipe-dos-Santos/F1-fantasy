/**
 * Medição prévia do PR 2c (pit stop animado). Não muda `src/`: só lê a engine
 * e a geometria do box, e imprime/grava as tabelas pedidas pelo Marcos.
 *
 * Custo EXATO de cada parada: `ResultadoCorrida` não o expõe (só `voltasDePit`
 * e a volta somada). A mesma corrida é rodada de novo com as três constantes de
 * pit zeradas: elas só somam tempo, não mudam o stream do RNG nem a decisão de
 * parar. A diferença na volta do pit é o custo exato. O script ABORTA se
 * qualquer outra volta não bater bit a bit, que é o que sustenta o método.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/medir-pr2c.preview.test.ts --reporter=verbose --silent=false
 */

import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { CORRIDA_CONFIG, simularCorrida } from '../src/engine/corrida';
import { criarDataset } from '../src/engine/dataset';
import { simularQuali } from '../src/engine/quali';
import { deriveSeed } from '../src/engine/rng';
import type { Loadout, Pista, ResultadoCorrida } from '../src/engine/types';
import { caminhoDoBox } from '../src/ui/box';
import { lutDoTracado, MS_REPLAY_POR_VOLTA, type VelocidadeReplay } from '../src/ui/fluxo-corrida';
import { RAIO_CARRO_BOT } from '../src/ui/pista-camadas';
import { tracadoSuavizado } from '../src/ui/suavizacao';
import { BOXES_POR_PISTA } from '../src/ui/tracados';
import { draftarCampeonato } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const N_GRIDS = 100;
const GRIDS_RANK = 5;
const LIMITES = [0.25, 0.33, 0.4, 0.5, 0.6, 0.75];
const VAGAS = 22;
const DISTANCIA_RAMPA = 60;
const VELOCIDADE_RANK = (process.env.MEDIR_PR2C_VELOCIDADE ?? 'media') as VelocidadeReplay;
const SAIDA = process.env.MEDIR_PR2C_SAIDA ?? 'docs/pr2c-medicao.json';

const cfg = CORRIDA_CONFIG as unknown as Record<string, number>;

function comPitZerado<T>(f: () => T): T {
  const antes = [cfg.pitBaseMs, cfg.pitRangeMs, cfg.erroPitMaxMs];
  cfg.pitBaseMs = cfg.pitRangeMs = cfg.erroPitMaxMs = 0;
  try {
    return f();
  } finally {
    [cfg.pitBaseMs, cfg.pitRangeMs, cfg.erroPitMaxMs] = antes;
  }
}

interface Geo {
  id: string;
  perimetro: number;
  lane: number;
  entrada: number;
  paralelo: number;
  saida: number;
  fE: number;
  fS: number;
  arcoPista: number;
  cruzaLargada: boolean;
  modelo: string;
  garagens: boolean;
}

function geometria(pista: Pista): Geo {
  const curva = tracadoSuavizado(pista.id);
  const box = BOXES_POR_PISTA[pista.id];
  const cam = caminhoDoBox(curva, box);
  const perimetro = lutDoTracado(curva).comprimentoTotal;
  let lane = 0;
  let paralelo = 0;
  let entrada = 0;
  let saida = 0;
  let viuParalelo = false;
  for (let i = 1; i < cam.amostras.length; i++) {
    const a = cam.amostras[i - 1];
    const b = cam.amostras[i];
    const d = Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y);
    lane += d;
    if (a.paralelo && b.paralelo) {
      paralelo += d;
      viuParalelo = true;
    } else if (viuParalelo) saida += d;
    else entrada += d;
  }
  const fE = (((cam.janela.inicio / perimetro) % 1) + 1) % 1;
  const arcoPista = cam.janela.fim - cam.janela.inicio;
  const fimBruto = fE + arcoPista / perimetro;
  return {
    id: pista.id,
    perimetro,
    lane,
    entrada,
    paralelo,
    saida,
    fE,
    fS: fimBruto % 1,
    arcoPista,
    cruzaLargada: fimBruto >= 1,
    modelo: box.livre === undefined ? 'rampas' : 'livre',
    garagens: box.garagens !== false,
  };
}

interface Parada {
  id: string;
  v: number;
  custo: number;
  tLimpo: number;
  tProxima: number;
  tSeg: number;
  janela: number;
  t0: number;
  estProx: number;
  estVizinhas: number;
  estSemIncidente: number;
  escala: Record<string, number>;
  chuva: boolean;
}

function paradasDe(r: ResultadoCorrida, r0: ResultadoCorrida, pista: Pista, g: Geo): Parada[] {
  const saida: Parada[] = [];
  const escala = Object.fromEntries(
    Object.entries(MS_REPLAY_POR_VOLTA).map(([k, ms]) => [
      k,
      r.classificacao[0].tempoTotal / (pista.voltas * ms),
    ]),
  );
  for (const item of r.classificacao) {
    const id = item.jogadorId;
    const hist = r.historicoVoltas[id];
    const hist0 = r0.historicoVoltas[id];
    const pits = r.voltasDePit[id];
    if (JSON.stringify(pits) !== JSON.stringify(r0.voltasDePit[id])) throw new Error('voltasDePit divergiu');
    if (hist.length !== hist0.length) throw new Error('histórico divergiu');
    hist.forEach((t, i) => {
      if (!pits.includes(i + 1) && t !== hist0[i]) throw new Error('volta sem pit divergiu');
    });
    let acum = 0;
    hist.forEach((t, i) => {
      const v = i + 1;
      if (pits.includes(v)) {
        const custo = t - hist0[i];
        const tLimpo = t - custo;
        const tProxima = hist[i + 1];
        const tSeg = g.cruzaLargada ? (1 - g.fE) * tLimpo + g.fS * tProxima : (g.fS - g.fE) * tLimpo;
        const refs = [v >= 3 ? hist[i - 1] : undefined, tProxima].filter((x): x is number => x !== undefined);
        const incidente = (volta: number) =>
          r.eventos
            .filter(
              (e) =>
                e.jogadorId === id && e.volta === volta && (e.tipo === 'erro-piloto' || e.tipo === 'problema-tecnico'),
            )
            .reduce((soma, e) => soma + e.custoMs, 0);
        const refsLimpas = [v >= 3 ? hist[i - 1] - incidente(v - 1) : undefined, tProxima - incidente(v + 1)].filter(
          (x): x is number => x !== undefined,
        );
        saida.push({
          id,
          v,
          custo,
          tLimpo,
          tProxima,
          tSeg,
          janela: custo + tSeg,
          t0: acum + g.fE * tLimpo,
          estProx: t - tProxima,
          estVizinhas: t - refs.reduce((s, x) => s + x, 0) / refs.length,
          estSemIncidente: t - incidente(v) - refsLimpas.reduce((s, x) => s + x, 0) / refsLimpas.length,
          escala,
          chuva: r.chuva,
        });
      }
      acum += t;
    });
  }
  return saida;
}

function resumo(xs: number[]) {
  const o = [...xs].sort((a, b) => a - b);
  const q = (p: number) => o[Math.min(o.length - 1, Math.floor(p * o.length))];
  return {
    n: o.length,
    min: o[0],
    p5: q(0.05),
    media: o.reduce((s, x) => s + x, 0) / o.length,
    p95: q(0.95),
    max: o[o.length - 1],
  };
}

/** Progresso antigo (uniforme dentro da volta), o que `progressoNoReplay` faz hoje. */
function progressoAntigo(hist: number[], t: number, n: number): number {
  let acum = 0;
  for (let k = 0; k < hist.length; k++) {
    if (t < acum + hist[k]) return (k + (t - acum) / hist[k]) / n;
    acum += hist[k];
  }
  return hist.length / n;
}

/** Progresso novo: igual ao antigo fora da janela; dentro, entrada → vaga → parado → saída. */
function progressoNovo(
  hist: number[],
  paradas: Parada[],
  t: number,
  n: number,
  g: Geo,
  tLane: number,
  vaga: number,
): number {
  for (const p of paradas) {
    const a = hist.slice(0, p.v - 1).reduce((s, x) => s + x, 0);
    const fimJanela = p.t0 + p.janela;
    if (t >= a && t < p.t0) return (p.v - 1 + (t - a) / p.tLimpo) / n;
    if (t >= p.t0 && t < fimJanela) {
      const de = p.v - 1 + g.fE;
      const ate = p.v - 1 + g.fE + g.arcoPista / g.perimetro;
      const noMeio = de + (ate - de) * vaga;
      const ida = tLane * vaga;
      const parado = p.janela - tLane;
      const dt = t - p.t0;
      if (dt < ida) return (de + (noMeio - de) * (dt / ida)) / n;
      if (dt < ida + parado) return noMeio / n;
      return (noMeio + (ate - noMeio) * ((dt - ida - parado) / (tLane - ida))) / n;
    }
  }
  return progressoAntigo(hist, t, n);
}

function ordem(prog: Map<string, number>, base: string[]): string[] {
  return [...base].sort((a, b) => (prog.get(b) ?? 0) - (prog.get(a) ?? 0));
}

describe('medição do PR 2c', () => {
  it('imprime as tabelas', () => {
    const pistas = dataset.pistas;
    const relatorio: Record<string, unknown> = { N_GRIDS, config: { base: cfg.pitBaseMs, range: cfg.pitRangeMs, erro: cfg.erroPitMaxMs } };
    const loadouts: Loadout[][] = [];
    for (let g = 0; g < N_GRIDS; g++) loadouts.push(draftarCampeonato(dataset, 7000 + g).loadouts);

    for (const pista of pistas) {
      const g = geometria(pista);
      const todas: Parada[] = [];
      const corridas: { r: ResultadoCorrida; paradas: Parada[] }[] = [];
      let dnfDepois = 0;
      let carros = 0;
      let consecutivas = 0;
      for (let k = 0; k < N_GRIDS; k++) {
        const seed = deriveSeed(7000 + k, `pr2c:${pista.id}`);
        const grid = simularQuali(dataset, loadouts[k], pista, seed);
        const r = simularCorrida(dataset, loadouts[k], pista, grid, seed);
        const r0 = comPitZerado(() => simularCorrida(dataset, loadouts[k], pista, grid, seed));
        const ps = paradasDe(r, r0, pista, g);
        todas.push(...ps);
        corridas.push({ r, paradas: ps });
        carros += r.classificacao.length;
        for (const it of r.classificacao) {
          const vs = r.voltasDePit[it.jogadorId];
          if (it.status === 'dnf' && vs.includes(it.voltasCompletadas - 1)) dnfDepois++;
          for (let i = 1; i < vs.length; i++) if (vs[i] - vs[i - 1] === 1) consecutivas++;
        }
      }

      const vNormal = g.perimetro / pista.tempoBaseMs; // u/ms
      const porLimite = LIMITES.map((razao) => {
        const tLane = g.lane / (razao * vNormal);
        const parado = todas.map((p) => p.janela - tLane);
        const literal = todas.map((p) => p.custo - tLane);
        const paradoReal = (nome: string) => todas.map((p) => (p.janela - tLane) / p.escala[nome]);
        return {
          razao,
          limiteUporS: razao * vNormal * 1000,
          tLaneS: tLane / 1000,
          parado: resumo(parado.map((x) => x / 1000)),
          negativos: parado.filter((x) => x < 0).length / parado.length,
          literal: resumo(literal.map((x) => x / 1000)),
          literalNegativos: literal.filter((x) => x < 0).length / literal.length,
          relogioMedia: resumo(paradoReal('media')),
          relogioRapida: resumo(paradoReal('rapida')),
          relogioLenta: resumo(paradoReal('lenta')),
          laneRelogioMediaMs: tLane / todas[0].escala.media,
          laneRelogioRapidaMs: tLane / todas[0].escala.rapida,
        };
      });

      // Pico de carros simultâneos na janela, numa corrida (limite não altera a janela).
      let pico = 0;
      for (const { paradas } of corridas) {
        const evs = paradas.flatMap((p) => [
          [p.t0, 1],
          [p.t0 + p.janela, -1],
        ]);
        evs.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        let c = 0;
        for (const [, d] of evs) {
          c += d;
          pico = Math.max(pico, c);
        }
      }

      // Limite proposto: o mais lento, em degraus de 5%, com parado líquido >= piso
      // (já descontadas frenagem e aceleração de DISTANCIA_RAMPA u, na pista, nas pontas).
      const rampa = (r: number) => (2 * DISTANCIA_RAMPA * (1 - r)) / (vNormal * (1 + r));
      const janelaMin = Math.min(...todas.map((p) => p.janela));
      // Piso teórico: pit perfeito (20 s) e a volta mais rápida possível do motor.
      const voltaMin = pista.tempoBaseMs * (1 - cfg.variancia);
      const janelaTeorica = cfg.pitBaseMs + (g.arcoPista / g.perimetro) * voltaMin;
      const propor = (piso: number, tLaneDe: (r: number) => number) => {
        for (let r = 0.25; r <= 1.001; r += 0.05)
          if (janelaMin - tLaneDe(r) - rampa(r) >= piso) return Math.round(r * 100) / 100;
        return null;
      };
      const tLaneTudo = (r: number) => g.lane / (r * vNormal);
      // Alternativa: limite só no paralelo; entrada e saída em rampa linear limite <-> corrida.
      const tLaneParalelo = (r: number) =>
        g.paralelo / (r * vNormal) + (g.entrada + g.saida) / (((1 + r) / 2) * vNormal);
      const proposta = {
        piso4: propor(4000, tLaneTudo),
        piso6: propor(6000, tLaneTudo),
        piso8: propor(8000, tLaneTudo),
        paraleloPiso6: propor(6000, tLaneParalelo),
        paraleloPiso8: propor(8000, tLaneParalelo),
      };
      const razaoProposta = proposta.piso6 ?? 1;
      const tLaneProposta = tLaneTudo(razaoProposta);
      const descontoProposta = rampa(razaoProposta);
      const paradoProposta = todas.map((p) => p.janela - tLaneProposta - descontoProposta);
      const margemTeorica = janelaTeorica - tLaneProposta - descontoProposta;

      // Quantos ficam PARADOS ao mesmo tempo, e com as 22 vagas fixas quantos pares se tocam.
      let picoParados = 0;
      let framesComToque = 0;
      let framesComParado = 0;
      for (const { r, paradas } of corridas) {
        const ids = r.classificacao.map((c) => c.jogadorId).sort();
        const vagaIdx = new Map(ids.map((id, i) => [id, i]));
        const intervalos = paradas.map((p) => {
          const d = ((vagaIdx.get(p.id) ?? 0) + 0.5) / VAGAS;
          const distancia = g.entrada + g.paralelo * d;
          const ini = p.t0 + (distancia / g.lane) * tLaneProposta;
          return { ini, fim: ini + (p.janela - tLaneProposta), pos: g.paralelo * d };
        });
        const marcos = intervalos.map((i) => i.ini).sort((a, b) => a - b);
        for (const t of marcos) {
          const ativos = intervalos.filter((i) => i.ini <= t && t < i.fim);
          picoParados = Math.max(picoParados, ativos.length);
          framesComParado++;
          if (ativos.some((a, x) => ativos.some((b, y) => x < y && Math.abs(a.pos - b.pos) < 2 * RAIO_CARRO_BOT)))
            framesComToque++;
        }
      }

      // Classificação: antigo × novo, a 60 fps de relógio (MEDIR_PR2C_VELOCIDADE, padrão média).
      const razaoRank = razaoProposta;
      const tLaneRank = g.lane / (razaoRank * vNormal);
      let maiorDivergencia = 0;
      let saltoAntigo = 0;
      let saltoNovo = 0;
      const divergencias: number[] = [];
      for (const { r, paradas } of corridas.slice(0, GRIDS_RANK)) {
        const fim = r.classificacao[0].tempoTotal;
        const passo = (fim / (pista.voltas * MS_REPLAY_POR_VOLTA[VELOCIDADE_RANK])) * (1000 / 60);
        const ids = r.classificacao.map((c) => c.jogadorId);
        const porId = new Map(ids.map((id) => [id, paradas.filter((p) => p.id === id)]));
        const vagaDe = new Map(ids.map((id, i) => [id, 0.3 + (0.4 * i) / (VAGAS - 1)]));
        let oA: string[] | null = null;
        let oN: string[] | null = null;
        // Começa depois do 1º passo: em t = 0 todo mundo empata em progresso 0, e a
        // ordem desse frame é só o desempate, não uma medida de salto.
        for (let t = passo; t < fim; t += passo) {
          const pa = new Map(ids.map((id) => [id, progressoAntigo(r.historicoVoltas[id], t, pista.voltas)]));
          const pn = new Map(
            ids.map((id) => [
              id,
              progressoNovo(r.historicoVoltas[id], porId.get(id) ?? [], t, pista.voltas, g, tLaneRank, vagaDe.get(id) ?? 0.5),
            ]),
          );
          const a = ordem(pa, ids);
          const n = ordem(pn, ids);
          let divFrame = 0;
          for (const id of ids) {
            const ra = a.indexOf(id);
            const rn = n.indexOf(id);
            divFrame = Math.max(divFrame, Math.abs(ra - rn));
            if (oA !== null) saltoAntigo = Math.max(saltoAntigo, Math.abs(ra - oA.indexOf(id)));
            if (oN !== null) saltoNovo = Math.max(saltoNovo, Math.abs(rn - oN.indexOf(id)));
          }
          maiorDivergencia = Math.max(maiorDivergencia, divFrame);
          divergencias.push(divFrame);
          oA = a;
          oN = n;
        }
      }

      const custos = todas.map((p) => p.custo / 1000);
      const linha = {
        pista: pista.id,
        voltas: pista.voltas,
        tempoBaseS: pista.tempoBaseMs / 1000,
        geo: g,
        vagaEspacoU: g.paralelo / VAGAS,
        vagaDiametroBotU: 2 * RAIO_CARRO_BOT,
        paradasPorCarro: todas.length / carros,
        custoMotorS: resumo(custos),
        tSegS: resumo(todas.map((p) => p.tSeg / 1000)),
        janelaS: resumo(todas.map((p) => p.janela / 1000)),
        erroEstProxS: resumo(todas.map((p) => Math.abs(p.estProx - p.custo) / 1000)),
        erroEstVizS: resumo(todas.map((p) => Math.abs(p.estVizinhas - p.custo) / 1000)),
        erroEstSemIncS: resumo(todas.map((p) => Math.abs(p.estSemIncidente - p.custo) / 1000)),
        proposta,
        razaoProposta,
        limiteUporS: razaoProposta * vNormal * 1000,
        tLanePropostaS: tLaneProposta / 1000,
        rampaS: descontoProposta / 1000,
        paradoPropostaS: resumo(paradoProposta.map((x) => x / 1000)),
        margemTeoricaS: margemTeorica / 1000,
        relogioPropostaMs: Object.fromEntries(
          ['lenta', 'media', 'rapida'].map((nome) => [
            nome,
            resumo(todas.map((p) => (p.janela - tLaneProposta - descontoProposta) / p.escala[nome])),
          ]),
        ),
        picoParados,
        toqueFracao: framesComParado === 0 ? 0 : framesComToque / framesComParado,
        volta1: todas.filter((p) => p.v === 1).length,
        penultima: todas.filter((p) => p.v === pista.voltas - 1).length,
        consecutivas,
        dnfNaVoltaSeguinte: dnfDepois,
        picoSimultaneo: pico,
        porLimite,
        rank: {
          razaoRank,
          maiorDivergencia,
          divergenciaMediaFrame: resumo(divergencias).media,
          saltoAntigo,
          saltoNovo,
        },
      };
      relatorio[pista.id] = linha;

      console.log(
        `\n== ${pista.id} ${pista.voltas}v ${pista.tempoBaseMs / 1000}s | P ${g.perimetro.toFixed(0)}u lane ${g.lane.toFixed(0)}u (e${g.entrada.toFixed(0)} p${g.paralelo.toFixed(0)} s${g.saida.toFixed(0)}) ${g.modelo}${g.garagens ? '' : ' sem-garagem'} | fE ${g.fE.toFixed(3)} fS ${g.fS.toFixed(3)} cruza=${g.cruzaLargada} arcoPista ${g.arcoPista.toFixed(0)}u | vaga ${linha.vagaEspacoU.toFixed(1)}u`,
      );
      console.log(
        `custo motor s: min ${linha.custoMotorS.min.toFixed(2)} med ${linha.custoMotorS.media.toFixed(2)} p95 ${linha.custoMotorS.p95.toFixed(2)} max ${linha.custoMotorS.max.toFixed(2)} n=${linha.custoMotorS.n} | tSeg med ${linha.tSegS.media.toFixed(1)} | janela min ${linha.janelaS.min.toFixed(1)} max ${linha.janelaS.max.toFixed(1)}`,
      );
      console.log(
        `estimador |erro| s: prox p95 ${linha.erroEstProxS.p95.toFixed(2)} max ${linha.erroEstProxS.max.toFixed(2)}; viz p95 ${linha.erroEstVizS.p95.toFixed(2)} max ${linha.erroEstVizS.max.toFixed(2)} | v1 ${linha.volta1} penult ${linha.penultima} consec ${consecutivas} dnf+1 ${dnfDepois} pico ${pico} | paradas/carro ${linha.paradasPorCarro.toFixed(2)}`,
      );
      for (const l of porLimite) {
        console.log(
          `  lim ${(l.razao * 100).toFixed(0)}% (${l.limiteUporS.toFixed(1)} u/s): lane ${l.tLaneS.toFixed(1)}s (rel ${l.laneRelogioMediaMs.toFixed(0)}/${l.laneRelogioRapidaMs.toFixed(0)}ms) | parado s min ${l.parado.min.toFixed(1)} med ${l.parado.media.toFixed(1)} max ${l.parado.max.toFixed(1)} neg ${(l.negativos * 100).toFixed(1)}% | rel media ${l.relogioMedia.min.toFixed(0)}-${l.relogioMedia.max.toFixed(0)}ms rapida ${l.relogioRapida.min.toFixed(0)}-${l.relogioRapida.max.toFixed(0)}ms | LITERAL min ${l.literal.min.toFixed(1)} max ${l.literal.max.toFixed(1)} neg ${(l.literalNegativos * 100).toFixed(1)}%`,
        );
      }
      console.log(
        `  estimador sem incidentes: p95 ${linha.erroEstSemIncS.p95.toFixed(2)} max ${linha.erroEstSemIncS.max.toFixed(2)}`,
      );
      console.log(
        `  PROPOSTA pisos 4/6/8 tudo: ${proposta.piso4}/${proposta.piso6}/${proposta.piso8}; paralelo piso 6/8: ${proposta.paraleloPiso6}/${proposta.paraleloPiso8} | usando ${razaoProposta} = ${linha.limiteUporS.toFixed(1)} u/s, lane ${linha.tLanePropostaS.toFixed(1)}s, rampas ${linha.rampaS.toFixed(1)}s, parado min ${linha.paradoPropostaS.min.toFixed(1)} med ${linha.paradoPropostaS.media.toFixed(1)} max ${linha.paradoPropostaS.max.toFixed(1)}, margem teórica ${linha.margemTeoricaS.toFixed(1)}s`,
      );
      console.log(
        `  relógio ms min-max: lenta ${linha.relogioPropostaMs.lenta.min.toFixed(0)}-${linha.relogioPropostaMs.lenta.max.toFixed(0)} media ${linha.relogioPropostaMs.media.min.toFixed(0)}-${linha.relogioPropostaMs.media.max.toFixed(0)} rapida ${linha.relogioPropostaMs.rapida.min.toFixed(0)}-${linha.relogioPropostaMs.rapida.max.toFixed(0)} | pico parados ${picoParados}, com toque ${(linha.toqueFracao * 100).toFixed(0)}% das chegadas`,
      );
      console.log(
        `  rank: divergência máx ${maiorDivergencia} pos, média por frame ${linha.rank.divergenciaMediaFrame.toFixed(2)}; salto por frame antigo ${saltoAntigo} novo ${saltoNovo}`,
      );
    }
    writeFileSync(SAIDA, JSON.stringify(relatorio, null, 1));
  }, 600000);
});
