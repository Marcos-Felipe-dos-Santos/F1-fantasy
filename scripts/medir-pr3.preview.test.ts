/**
 * Medição prévia do PR 3 (efeitos sonoros). Não muda `src/`: lê a engine e a linha do tempo do
 * replay de produção (`replayDaCorrida`) e converte cada instante simulado em ms REAIS nas três
 * velocidades, com a mesma escala de `useCorrida.ts` (`escalaReplay` sobre o tempo do vencedor).
 *
 * Mesmos grids e seeds de `medir-pr2d.preview.test.ts` e `medir-pr2f.preview.test.ts`
 * (100 grids, 10 pistas, 1000 corridas). Todos os carros do harness são bots: `j01` faz o papel
 * de "carro do jogador" só para medir se a prioridade dele sobrevive ao limite de vozes.
 *
 * EVENTOS (um som curto cada, duração em ms REAIS, como o `DURACAO_EFEITO_MS` do PR 2d):
 * - largada: t=0, um só para o grid inteiro;
 * - pitEntrada: `parada.entrada` (contada, mas a proposta não dá som a ela);
 * - pitPistola: `parada.chegada` (carro para na vaga: pistola pneumática);
 * - pitSaida: `parada.partida` (solta o carro);
 * - incidente: `incidentes().inicio` (derrapagem);
 * - abandono: `abandono().instante`;
 * - bandeirada: `replay.bandeirada` (o vencedor);
 * - cruzamento: `chegada().instante` dos demais.
 * Contínuos (não são eventos): ronco do pelotão, ronco do jogador e chuva (`r.chuva`).
 *
 * BRUTO: toda ocorrência vira uma voz com a sua duração.
 * PROPOSTA: (1) agrupamento: na mesma categoria, evento a menos de `JANELA_AGRUPAR_MS` reais do
 * último que TOCOU é absorvido por ele; (2) teto de `TETO_VOZES` vozes de evento, com o
 * jogador e a bandeirada passando à frente (roubam a voz mais velha de menor prioridade);
 * (3) salto de relógio (Acelerar, aba em segundo plano, delta > `DELTA_SALTO_MS`): os eventos
 * atravessados são descartados.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/medir-pr3.preview.test.ts --reporter=verbose --silent=false
 */

import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import { simularCorrida } from '../src/engine/corrida';
import { criarDataset } from '../src/engine/dataset';
import { simularQuali } from '../src/engine/quali';
import type { Loadout } from '../src/engine/types';
import { replayDaCorrida } from '../src/ui/fim-da-corrida';
import { escalaReplay, MS_REPLAY_POR_VOLTA, type VelocidadeReplay } from '../src/ui/fluxo-corrida';
import { draftarCampeonato } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const N_GRIDS = 100;
const SAIDA = process.env.MEDIR_PR3_SAIDA ?? 'preview/pr3-medicao.json';
const JOGADOR = 'j01';

type Categoria =
  | 'largada'
  | 'pitEntrada'
  | 'pitPistola'
  | 'pitSaida'
  | 'incidente'
  | 'abandono'
  | 'bandeirada'
  | 'cruzamento';
const CATEGORIAS: Categoria[] = ['largada', 'pitEntrada', 'pitPistola', 'pitSaida', 'incidente', 'abandono', 'bandeirada', 'cruzamento'];

/** Duração proposta de cada som, em ms reais. 0 = sem som. */
const DURACAO_MS: Record<Categoria, number> = {
  largada: 2500,
  pitEntrada: 0,
  pitPistola: 600,
  pitSaida: 300,
  incidente: 700,
  abandono: 900,
  bandeirada: 2000,
  cruzamento: 250,
};
/** Prioridade no teto de vozes: maior rouba a voz da menor. */
const PRIORIDADE: Record<Categoria, number> = {
  largada: 5,
  bandeirada: 5,
  abandono: 4,
  incidente: 3,
  pitPistola: 2,
  pitSaida: 2,
  cruzamento: 1,
  pitEntrada: 0,
};
const JANELA_AGRUPAR_MS = 250;
const TETO_VOZES = 6;
const VELOCIDADES: VelocidadeReplay[] = ['lenta', 'media', 'rapida'];

interface Evento {
  t: number;
  cat: Categoria;
  jogador: boolean;
}

function resumo(xs: number[]) {
  if (xs.length === 0) return { n: 0, min: 0, media: 0, p50: 0, p95: 0, p99: 0, max: 0 };
  const o = [...xs].sort((a, b) => a - b);
  const q = (p: number) => o[Math.min(o.length - 1, Math.floor(p * o.length))];
  return {
    n: o.length,
    min: +o[0].toFixed(3),
    media: +(o.reduce((s, x) => s + x, 0) / o.length).toFixed(3),
    p50: +q(0.5).toFixed(3),
    p95: +q(0.95).toFixed(3),
    p99: +q(0.99).toFixed(3),
    max: +o[o.length - 1].toFixed(3),
  };
}

/** Máximo de eventos numa janela deslizante de `larguraMs` (eventos ordenados por t). */
function picoNaJanela(ev: readonly Evento[], larguraMs: number): { n: number; inicio: number; mix: Partial<Record<Categoria, number>> } {
  let melhor = { n: 0, inicio: 0, i: 0, j: 0 };
  let i = 0;
  for (let j = 0; j < ev.length; j++) {
    while (ev[j].t - ev[i].t >= larguraMs) i++;
    if (j - i + 1 > melhor.n) melhor = { n: j - i + 1, inicio: ev[i].t, i, j };
  }
  const mix: Partial<Record<Categoria, number>> = {};
  for (let k = melhor.i; k <= melhor.j && melhor.n > 0; k++) mix[ev[k].cat] = (mix[ev[k].cat] ?? 0) + 1;
  return { n: melhor.n, inicio: melhor.inicio, mix };
}

/** Máximo de vozes tocando ao mesmo tempo, dadas as durações. */
function vozesSimultaneas(vozes: readonly { t: number; dur: number }[]): number {
  const marcos: [number, number][] = [];
  for (const v of vozes) {
    if (v.dur <= 0) continue;
    marcos.push([v.t, 1], [v.t + v.dur, -1]);
  }
  marcos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let atual = 0;
  let max = 0;
  for (const [, d] of marcos) {
    atual += d;
    if (atual > max) max = atual;
  }
  return max;
}

interface Mixagem {
  tocadas: number;
  absorvidas: Record<Categoria, number>;
  roubadas: Record<Categoria, number>;
  recusadas: Record<Categoria, number>;
  vozesMax: number;
  jogadorPerdidas: number;
}

/** Simula a proposta: agrupamento por categoria + teto de vozes com prioridade. */
function mixar(ev: readonly Evento[]): Mixagem {
  const zero = () => Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<Categoria, number>;
  const m: Mixagem = { tocadas: 0, absorvidas: zero(), roubadas: zero(), recusadas: zero(), vozesMax: 0, jogadorPerdidas: 0 };
  const ultimaTocada: Partial<Record<Categoria, number>> = {};
  let ativas: { fim: number; cat: Categoria; jogador: boolean; t: number }[] = [];
  for (const e of ev) {
    const dur = DURACAO_MS[e.cat];
    if (dur <= 0) continue;
    ativas = ativas.filter((a) => a.fim > e.t);
    const ultima = ultimaTocada[e.cat];
    if (!e.jogador && ultima !== undefined && e.t - ultima < JANELA_AGRUPAR_MS) {
      m.absorvidas[e.cat]++;
      continue;
    }
    if (ativas.length >= TETO_VOZES) {
      const pri = (a: { cat: Categoria; jogador: boolean }) => PRIORIDADE[a.cat] + (a.jogador ? 10 : 0);
      const minha = pri(e);
      let alvo = -1;
      for (let k = 0; k < ativas.length; k++) {
        if (pri(ativas[k]) >= minha) continue;
        if (alvo < 0 || pri(ativas[k]) < pri(ativas[alvo]) || (pri(ativas[k]) === pri(ativas[alvo]) && ativas[k].t < ativas[alvo].t)) alvo = k;
      }
      if (alvo < 0) {
        m.recusadas[e.cat]++;
        if (e.jogador) m.jogadorPerdidas++;
        continue;
      }
      const [roubada] = ativas.splice(alvo, 1);
      m.roubadas[roubada.cat]++;
      if (roubada.jogador) m.jogadorPerdidas++;
    }
    ativas.push({ fim: e.t + dur, cat: e.cat, jogador: e.jogador, t: e.t });
    ultimaTocada[e.cat] = e.t;
    m.tocadas++;
    if (ativas.length > m.vozesMax) m.vozesMax = ativas.length;
  }
  return m;
}

describe('medição prévia do PR 3', () => {
  it('eventos sonoros por segundo de replay em 1000 corridas', () => {
    const pistas = dataset.pistas;
    const loadouts: Loadout[][] = [];
    for (let g = 0; g < N_GRIDS; g++) loadouts.push(draftarCampeonato(dataset, 7000 + g).loadouts);

    let corridas = 0;
    let chuvosas = 0;
    let carros = 0;
    const porCorrida: Record<Categoria, number[]> = Object.fromEntries(CATEGORIAS.map((c) => [c, []])) as never;
    const porVel = Object.fromEntries(
      VELOCIDADES.map((v) => [
        v,
        {
          duracaoRealS: [] as number[],
          taxaMediaPorS: [] as number[],
          pico1s: [] as number[],
          pico1sPior: { n: 0, pista: '', seed: 0, inicioS: 0, mix: {} as Partial<Record<Categoria, number>> },
          pico250ms: [] as number[],
          porQuadro16ms: [] as number[],
          vozesBruto: [] as number[],
          vozesProposta: [] as number[],
          jogadorPerdidas: 0,
          tocadas: 0,
          totalComSom: 0,
          absorvidas: Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<Categoria, number>,
          roubadas: Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<Categoria, number>,
          recusadas: Object.fromEntries(CATEGORIAS.map((c) => [c, 0])) as Record<Categoria, number>,
          pitParadoRealS: [] as number[],
          cauda1oAoUltimoS: [] as number[],
        },
      ]),
    ) as Record<VelocidadeReplay, never>;

    for (const pista of pistas) {
      for (let k = 0; k < N_GRIDS; k++) {
        const seed = (7000 + k) * 1009 + pistas.indexOf(pista);
        const grid = simularQuali(dataset, loadouts[k], pista, seed);
        const r = simularCorrida(dataset, loadouts[k], pista, grid, seed);
        const replay = replayDaCorrida(r, pista);
        corridas++;
        if (r.chuva) chuvosas++;

        const sim: Evento[] = [{ t: 0, cat: 'largada', jogador: false }];
        const ids = Object.keys(r.historicoVoltas);
        carros = Math.max(carros, ids.length);
        const paradoSim: number[] = [];
        for (const id of ids) {
          const jogador = id === JOGADOR;
          for (const p of replay.paradas(id)) {
            sim.push({ t: p.entrada, cat: 'pitEntrada', jogador }, { t: p.chegada, cat: 'pitPistola', jogador }, { t: p.partida, cat: 'pitSaida', jogador });
            paradoSim.push(p.partida - p.chegada);
          }
          for (const inc of replay.incidentes(id)) sim.push({ t: inc.inicio, cat: 'incidente', jogador });
          const ab = replay.abandono(id);
          if (ab) sim.push({ t: ab.instante, cat: 'abandono', jogador });
          const ch = replay.chegada(id);
          if (ch && Number.isFinite(ch.instante)) sim.push({ t: ch.instante, cat: 'cruzamento', jogador });
        }
        // A primeira passagem pela linha vira a bandeirada; as demais seguem como cruzamento.
        const cruz = sim.filter((e) => e.cat === 'cruzamento').sort((a, b) => a.t - b.t);
        if (cruz.length > 0) cruz[0].cat = 'bandeirada';
        const ordenado = sim.sort((a, b) => a.t - b.t);
        for (const c of CATEGORIAS) porCorrida[c].push(ordenado.filter((e) => e.cat === c).length);

        for (const v of VELOCIDADES) {
          const escala = escalaReplay(r.classificacao[0].tempoTotal, pista.voltas, MS_REPLAY_POR_VOLTA[v]);
          const real = ordenado.map((e) => ({ ...e, t: e.t / escala }));
          const comSom = real.filter((e) => DURACAO_MS[e.cat] > 0);
          const acc = porVel[v] as unknown as {
            duracaoRealS: number[];
            taxaMediaPorS: number[];
            pico1s: number[];
            pico1sPior: { n: number; pista: string; seed: number; inicioS: number; mix: Partial<Record<Categoria, number>> };
            pico250ms: number[];
            porQuadro16ms: number[];
            vozesBruto: number[];
            vozesProposta: number[];
            jogadorPerdidas: number;
            tocadas: number;
            totalComSom: number;
            absorvidas: Record<Categoria, number>;
            roubadas: Record<Categoria, number>;
            recusadas: Record<Categoria, number>;
            pitParadoRealS: number[];
            cauda1oAoUltimoS: number[];
          };
          const durS = replay.fim / escala / 1000;
          acc.duracaoRealS.push(durS);
          acc.taxaMediaPorS.push(comSom.length / durS);
          const p1 = picoNaJanela(comSom, 1000);
          acc.pico1s.push(p1.n);
          if (p1.n > acc.pico1sPior.n) acc.pico1sPior = { n: p1.n, pista: pista.id, seed, inicioS: +(p1.inicio / 1000).toFixed(2), mix: p1.mix };
          acc.pico250ms.push(picoNaJanela(comSom, 250).n);
          acc.porQuadro16ms.push(picoNaJanela(comSom, 1000 / 60).n);
          acc.vozesBruto.push(vozesSimultaneas(comSom.map((e) => ({ t: e.t, dur: DURACAO_MS[e.cat] }))));
          const mx = mixar(comSom);
          acc.vozesProposta.push(mx.vozesMax);
          acc.jogadorPerdidas += mx.jogadorPerdidas;
          acc.tocadas += mx.tocadas;
          acc.totalComSom += comSom.length;
          for (const c of CATEGORIAS) {
            acc.absorvidas[c] += mx.absorvidas[c];
            acc.roubadas[c] += mx.roubadas[c];
            acc.recusadas[c] += mx.recusadas[c];
          }
          for (const s of paradoSim) acc.pitParadoRealS.push(s / escala / 1000);
          if (Number.isFinite(replay.bandeirada)) acc.cauda1oAoUltimoS.push((replay.fim - replay.bandeirada) / escala / 1000);
        }
      }
    }

    const relatorio = {
      geradoEm: 'origin/main c4d7920 (PR 2f mesclado), antes do PR 3',
      corridas,
      carrosPorCorrida: carros,
      fracaoChuvosa: +(chuvosas / corridas).toFixed(3),
      proposta: { DURACAO_MS, PRIORIDADE, JANELA_AGRUPAR_MS, TETO_VOZES },
      eventosPorCorrida: Object.fromEntries(CATEGORIAS.map((c) => [c, resumo(porCorrida[c])])),
      porVelocidade: Object.fromEntries(
        VELOCIDADES.map((v) => {
          const a = porVel[v] as unknown as Record<string, unknown> & {
            duracaoRealS: number[];
            taxaMediaPorS: number[];
            pico1s: number[];
            pico250ms: number[];
            porQuadro16ms: number[];
            vozesBruto: number[];
            vozesProposta: number[];
            pitParadoRealS: number[];
            cauda1oAoUltimoS: number[];
            tocadas: number;
            totalComSom: number;
          };
          return [
            v,
            {
              duracaoRealS: resumo(a.duracaoRealS),
              taxaMediaEventosPorS: resumo(a.taxaMediaPorS),
              picoEm1s: resumo(a.pico1s),
              picoEm1sPior: a.pico1sPior,
              picoEm250ms: resumo(a.pico250ms),
              eventosNumQuadroDe16ms: resumo(a.porQuadro16ms),
              vozesSimultaneasBruto: resumo(a.vozesBruto),
              vozesSimultaneasProposta: resumo(a.vozesProposta),
              eventosComSom: a.totalComSom,
              tocadasNaProposta: a.tocadas,
              absorvidasPorCategoria: a.absorvidas,
              roubadasPorCategoria: a.roubadas,
              recusadasPorCategoria: a.recusadas,
              eventosDoJogadorPerdidos: a.jogadorPerdidas,
              pitParadoRealS: resumo(a.pitParadoRealS),
              bandeiradaAoUltimoRealS: resumo(a.cauda1oAoUltimoS),
            },
          ];
        }),
      ),
    };
    writeFileSync(SAIDA, JSON.stringify(relatorio, null, 1));
    console.log(JSON.stringify(relatorio, null, 1));
  }, 590000);
});
