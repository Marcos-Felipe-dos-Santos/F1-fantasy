/**
 * Cena REAL de corrida para o preview de escuta do PR 3: a engine e a linha do tempo de
 * produção (`replayDaCorrida`), as mesmas seeds de `medir-pr3.preview.test.ts`. Não muda `src/`.
 *
 * Escolhe a primeira corrida (na ordem pista × grid de `medir-pr3`) em que o carro do jogador
 * (`j01`, papel emprestado como em `medir-pr3`) termina, para no box, tem um incidente, há chuva
 * e alguém abandona: assim a cena toca todas as categorias de som. Exporta, em tempo SIMULADO:
 * - o traçado, para desenhar;
 * - a posição de todos os carros a cada `PASSO_REAL_LENTA_MS` reais da velocidade lenta;
 * - a velocidade do jogador (u/s simulado), derivada das posições;
 * - os eventos (largada, paradas, incidentes, abandonos, bandeirada, fim);
 * - as passagens: aproximações de outro carro ao jogador abaixo de `PERTO_U`, com o instante da
 *   menor distância e a duração do episódio, mais a contagem para outros limiares.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/sons/cena.preview.test.ts --reporter=verbose --silent=false
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import equipeAnosReal from '../../src/data/equipe-anos.json';
import pecasReal from '../../src/data/pecas.json';
import pistasReal from '../../src/data/pistas.json';
import { simularCorrida } from '../../src/engine/corrida';
import { criarDataset } from '../../src/engine/dataset';
import { simularQuali } from '../../src/engine/quali';
import type { Loadout } from '../../src/engine/types';
import { replayDaCorrida } from '../../src/ui/fim-da-corrida';
import { escalaReplay, MS_REPLAY_POR_VOLTA, type VelocidadeReplay } from '../../src/ui/fluxo-corrida';
import { posicaoNaPista } from '../../src/ui/pit-replay';
import { draftarCampeonato } from '../balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const N_GRIDS = 100;
const JOGADOR = 'j01';
const SAIDA = process.env.CENA_SONS_SAIDA ?? 'preview/sons/cena.json';
const PASSO_REAL_LENTA_MS = 40;
/** Limiar de "passa perto", em unidades do viewBox do traçado (o carro tem ~29 u na tela larga). */
const PERTO_U = 45;
const LIMIARES_U = [30, 45, 60, 90];
/** Histerese: o episódio só acaba quando a distância passa deste múltiplo do limiar. Sem ela, um
 * carro andando junto do jogador a ~45 u disparava a passagem a cada 0,1 s (visto no preview). */
const HISTERESE = 1.5;
const VELOCIDADES: VelocidadeReplay[] = ['lenta', 'media', 'rapida'];

interface Passagem {
  carro: string;
  /** Instante simulado da menor distância. */
  t: number;
  /** Duração simulada do episódio abaixo do limiar. */
  dur: number;
  dist: number;
}

function passagens(dist: Float64Array[], ids: string[], tempos: number[], limiar: number, ativo: (i: number) => boolean): Passagem[] {
  const out: Passagem[] = [];
  ids.forEach((id, c) => {
    if (id === JOGADOR) return;
    let ini = -1;
    let menor = Infinity;
    let tMenor = 0;
    for (let i = 0; i < tempos.length; i++) {
      const perto = ativo(i) && dist[c][i] < (ini >= 0 ? limiar * HISTERESE : limiar);
      if (perto) {
        if (ini < 0) {
          ini = i;
          menor = Infinity;
        }
        if (dist[c][i] < menor) {
          menor = dist[c][i];
          tMenor = tempos[i];
        }
      } else if (ini >= 0) {
        // Episódio que começa no quadro 0 é o grid parado na largada, não uma passagem: o som
        // dali é o da largada.
        if (ini > 0) out.push({ carro: id, t: tMenor, dur: tempos[i] - tempos[ini], dist: +menor.toFixed(1) });
        ini = -1;
      }
    }
  });
  return out.sort((a, b) => a.t - b.t);
}

describe('cena real para o preview de sons do PR 3', () => {
  it('exporta uma corrida com todas as categorias de som', () => {
    const pistas = dataset.pistas;
    const loadouts: Loadout[][] = [];
    for (let g = 0; g < N_GRIDS; g++) loadouts.push(draftarCampeonato(dataset, 7000 + g).loadouts);

    for (const pista of pistas) {
      for (let k = 0; k < N_GRIDS; k++) {
        const seed = (7000 + k) * 1009 + pistas.indexOf(pista);
        const grid = simularQuali(dataset, loadouts[k], pista, seed);
        const r = simularCorrida(dataset, loadouts[k], pista, grid, seed);
        if (!r.chuva) continue;
        const replay = replayDaCorrida(r, pista);
        const eu = r.classificacao.find((c) => c.jogadorId === JOGADOR);
        if (eu?.status !== 'terminou') continue;
        if (replay.paradas(JOGADOR).length === 0 || replay.incidentes(JOGADOR).length === 0) continue;
        const ids = r.classificacao.map((c) => c.jogadorId);
        if (!ids.some((id) => replay.abandono(id) !== undefined)) continue;

        // Achou: exporta.
        const status = new Map(r.classificacao.map((c) => [c.jogadorId, c.status]));
        const escalas = Object.fromEntries(
          VELOCIDADES.map((v) => [v, escalaReplay(r.classificacao[0].tempoTotal, pista.voltas, MS_REPLAY_POR_VOLTA[v])]),
        ) as Record<VelocidadeReplay, number>;
        const passo = PASSO_REAL_LENTA_MS * escalas.lenta;
        const tempos: number[] = [];
        for (let t = 0; t <= replay.fim + passo; t += passo) tempos.push(Math.min(t, replay.fim));

        const xs: number[][] = ids.map(() => []);
        const ys: number[][] = ids.map(() => []);
        const naPista: boolean[][] = ids.map(() => []);
        ids.forEach((id, c) => {
          const hist = r.historicoVoltas[id];
          for (const t of tempos) {
            const p = replay.posicao(id, hist, status.get(id)!, t, false);
            xs[c].push(+p.ponto.x.toFixed(1));
            ys[c].push(+p.ponto.y.toFixed(1));
            naPista[c].push(p.fracaoNaPista !== null);
          }
        });
        const iEu = ids.indexOf(JOGADOR);
        const dist = ids.map((_, c) => Float64Array.from(tempos, (_, i) => Math.hypot(xs[c][i] - xs[iEu][i], ys[c][i] - ys[iEu][i])));
        // Velocidade do jogador, em u por segundo SIMULADO (diferença central).
        const vel = tempos.map((_, i) => {
          const a = Math.max(0, i - 1);
          const b = Math.min(tempos.length - 1, i + 1);
          const dt = (tempos[b] - tempos[a]) / 1000;
          return dt > 0 ? +(Math.hypot(xs[iEu][b] - xs[iEu][a], ys[iEu][b] - ys[iEu][a]) / dt).toFixed(2) : 0;
        });
        // Passagem só conta com os dois carros na pista e o jogador andando.
        const ativoCom = (c: number) => (i: number) => naPista[iEu][i] && naPista[c][i] && vel[i] > 0;
        const passagensCom = (lim: number) =>
          ids.flatMap((id, c) => passagens(dist, ids, tempos, lim, ativoCom(c)).filter((p) => p.carro === id));
        const escolhidas = passagensCom(PERTO_U).sort((a, b) => a.t - b.t);

        const tracado = Array.from({ length: 400 }, (_, i) => {
          const p = posicaoNaPista(pista.id, i / 400).ponto;
          return [+p.x.toFixed(1), +p.y.toFixed(1)];
        });
        const eventos = {
          largada: 0,
          bandeirada: replay.bandeirada,
          fim: replay.fim,
          paradas: ids.flatMap((id) => replay.paradas(id).map((p) => ({ carro: id, entrada: p.entrada, chegada: p.chegada, partida: p.partida, retorno: p.retorno }))),
          incidentes: ids.flatMap((id) => replay.incidentes(id).map((x) => ({ carro: id, inicio: x.inicio, fim: x.fim }))),
          abandonos: ids.flatMap((id) => {
            const a = replay.abandono(id);
            return a ? [{ carro: id, t: a.instante }] : [];
          }),
          chegadas: ids.flatMap((id) => {
            const ch = replay.chegada(id);
            return ch && Number.isFinite(ch.instante) ? [{ carro: id, t: ch.instante }] : [];
          }),
        };
        const real = (ms: number, v: VelocidadeReplay) => +(ms / escalas[v]).toFixed(1);
        const medidas = Object.fromEntries(
          VELOCIDADES.map((v) => {
            const durs = escolhidas.map((p) => real(p.dur, v)).sort((a, b) => a - b);
            const q = (p: number) => durs[Math.min(durs.length - 1, Math.floor(p * durs.length))];
            return [
              v,
              {
                duracaoRealS: +(replay.fim / escalas[v] / 1000).toFixed(2),
                passagemRealMs: { n: durs.length, p10: q(0.1), p50: q(0.5), p90: q(0.9) },
                pitParadoRealMs: eventos.paradas.filter((p) => p.carro === JOGADOR).map((p) => real(p.partida - p.chegada, v)),
                bandeiradaAoFimRealMs: real(replay.fim - replay.bandeirada, v),
              },
            ];
          }),
        );
        const cena = {
          geradoPor: 'scripts/sons/cena.preview.test.ts',
          pista: pista.id,
          seed,
          grid: k,
          voltas: pista.voltas,
          chuva: r.chuva,
          jogador: JOGADOR,
          posicaoFinal: eu.posicao,
          escalas,
          msReplayPorVolta: MS_REPLAY_POR_VOLTA,
          perto: { limiarU: PERTO_U, contagemPorLimiar: Object.fromEntries(LIMIARES_U.map((l) => [l, passagensCom(l).length])) },
          medidas,
          ids,
          tempos: tempos.map((t) => +t.toFixed(1)),
          xs,
          ys,
          velJogador: vel,
          tracado,
          eventos,
          passagens: escolhidas,
        };
        mkdirSync('preview/sons', { recursive: true });
        writeFileSync(SAIDA, JSON.stringify(cena));
        console.log(JSON.stringify({ pista: cena.pista, seed, grid: k, posicaoFinal: eu.posicao, amostras: tempos.length, perto: cena.perto, medidas, eventosJogador: {
          paradas: eventos.paradas.filter((p) => p.carro === JOGADOR),
          incidentes: eventos.incidentes.filter((p) => p.carro === JOGADOR),
          abandonos: eventos.abandonos,
          velP50: [...vel].sort((a, b) => a - b)[vel.length >> 1],
          velMax: Math.max(...vel),
        } }, null, 1));
        return;
      }
    }
    throw new Error('nenhuma corrida com todas as categorias');
  }, 590000);
});
