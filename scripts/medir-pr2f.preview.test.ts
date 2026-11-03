/**
 * Medição prévia do PR 2f (punição cumprida no box). Não muda `src/`: lê a engine e a
 * linha do tempo do pit de produção, e PROTOTIPA aqui a ocupação a mais da vaga.
 *
 * Mesmos grids e seeds de `medir-pr2d.preview.test.ts` (100 grids, 10 pistas).
 *
 * PIT DA PUNIÇÃO (decisão do Marcos, 2026-11-03): o último pit visível, contado pela
 * chegada ANTES da punição (`replay.chegada` de hoje), como no protótipo do PR 2d.
 *
 * VAGAS: a ocupação de cada parada é [chegada, partida). COLISÃO: duas paradas na mesma
 * vaga com ocupações sobrepostas. Em `alocarVagas` (PR 2c) só a vaga do box cheio colide:
 * fora dele a vaga escolhida está livre na chegada, e a ordem por início encadeia as
 * ocupações. Aqui se conta só a de hoje.
 * ~~O protótipo realocava as vagas com a da punição ocupada X s a mais, chegando a toda
 * vaga no instante da chegada de hoje.~~ DESCARTADO na primeira rodada: sem punição ele
 * não reproduzia as vagas de hoje em 897 de 1000 corridas, porque a chegada de produção
 * depende do x de cada vaga. A contagem com a punição é a do `verificar-pr2f`, sobre o
 * produto, que expõe as vagas reais.
 *
 * JANELA DA INFRAÇÃO: entre o fim do pit anterior (ou a largada) e o início do pit da
 * punição, para a punição ser cumprida no pit seguinte à infração, como na F1.
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/medir-pr2f.preview.test.ts --reporter=verbose --silent=false
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
import { escalaReplay, MS_REPLAY_POR_VOLTA } from '../src/ui/fluxo-corrida';
import type { ParadaNoReplay } from '../src/ui/pit-replay';
import { draftarCampeonato } from './balance';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const N_GRIDS = 100;
const SAIDA = process.env.MEDIR_PR2F_SAIDA ?? 'preview/pr2f-medicao.json';

function resumo(xs: number[]) {
  if (xs.length === 0) return { n: 0, min: 0, media: 0, p50: 0, p95: 0, max: 0 };
  const o = [...xs].sort((a, b) => a - b);
  const q = (p: number) => o[Math.min(o.length - 1, Math.floor(p * o.length))];
  return { n: o.length, min: o[0], media: o.reduce((s, x) => s + x, 0) / o.length, p50: q(0.5), p95: q(0.95), max: o[o.length - 1] };
}

interface Ocupacao {
  id: string;
  volta: number;
  inicio: number;
  chegada: number;
  fim: number;
  vaga: number;
}

/** Pares na mesma vaga com ocupações sobrepostas. */
function colisoes(ocupacoes: readonly Ocupacao[]): number {
  let total = 0;
  for (const q of ocupacoes) {
    for (const p of ocupacoes) {
      if (p === q || p.vaga !== q.vaga || p.chegada > q.chegada || (p.chegada === q.chegada && p.id >= q.id)) continue;
      if (q.chegada < p.fim) total++;
    }
  }
  return total;
}

describe('medição prévia do PR 2f', () => {
  it('vagas e janela da infração em 1000 corridas', () => {
    const pistas = dataset.pistas;
    const loadouts: Loadout[][] = [];
    for (let g = 0; g < N_GRIDS; g++) loadouts.push(draftarCampeonato(dataset, 7000 + g).loadouts);

    const m = {
      corridas: 0,
      punidos: 0,
      cumpridasNoPit: 0,
      selo: 0,
      pitDaPunicaoE1o: 0,
      pitDaPunicaoE2o: 0,
      colisoesHoje: 0,
      corridasComColisao: 0,
    };
    const janelaSimS: number[] = [];
    const janelaRapidaRealS: number[] = [];
    const vagasPorPista: Record<string, number> = {};

    for (const pista of pistas) {
      for (let k = 0; k < N_GRIDS; k++) {
        const seed = (7000 + k) * 1009 + pistas.indexOf(pista);
        const grid = simularQuali(dataset, loadouts[k], pista, seed);
        const r = simularCorrida(dataset, loadouts[k], pista, grid, seed);
        const replay = replayDaCorrida(r, pista);
        vagasPorPista[pista.id] = replay.totalDeVagas;
        m.corridas++;

        for (const e of r.eventos) {
          if (e.tipo !== 'investigacao') continue;
          m.punidos++;
          const chegada = replay.chegada(e.jogadorId);
          const paradas = replay.paradas(e.jogadorId).filter((q) => chegada === undefined || q.inicio < chegada.instante);
          const ultima: ParadaNoReplay | undefined = paradas.at(-1);
          if (ultima === undefined) {
            m.selo++;
            continue;
          }
          m.cumpridasNoPit++;
          if (paradas.length === 1) m.pitDaPunicaoE1o++;
          else m.pitDaPunicaoE2o++;
          const janela = ultima.inicio - (paradas.at(-2)?.fim ?? 0);
          janelaSimS.push(janela / 1000);
          const escala = escalaReplay(r.classificacao[0].tempoTotal, pista.voltas, MS_REPLAY_POR_VOLTA.rapida);
          janelaRapidaRealS.push(janela / escala / 1000);
        }

        const ocupacoes: Ocupacao[] = Object.keys(r.historicoVoltas).flatMap((id) =>
          replay.paradas(id).map((p) => ({ id, volta: p.volta, inicio: p.inicio, chegada: p.chegada, fim: p.partida, vaga: p.vaga })),
        );
        const hoje = colisoes(ocupacoes);
        m.colisoesHoje += hoje;
        if (hoje > 0) m.corridasComColisao++;
      }
    }

    const relatorio = {
      geradoEm: 'main e1cfba8 (PR 2d mesclado), antes do PR 2f',
      ...m,
      janelaDaInfracaoSimS: resumo(janelaSimS),
      janelaDaInfracaoRealRapidaS: resumo(janelaRapidaRealS),
      vagasPorPista,
    };
    writeFileSync(SAIDA, JSON.stringify(relatorio, null, 1));
    console.log(JSON.stringify(relatorio, null, 1));
  }, 590000);
});
