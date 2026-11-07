/**
 * Medição do PR 3b: o `ControladorDeSom` de produção rodando quadro a quadro (16,7 ms reais) sobre
 * corridas do dataset real, com uma saída de áudio falsa que só conta. Responde a duas pendências:
 * - o TETO DE 6 VOZES, medido no 3a sobre outra população (`medir-pr3`: com saída do pit e
 *   cruzamentos, sem passagem nem spray), reconferido com a população que o 3b de fato toca;
 * - o CUSTO do som por quadro em node (o do navegador sai do FPS, `scripts/medir-fps-pr3b.mjs`),
 *   e o custo único de `velRef` por corrida.
 *
 * Um humano (`j01`), como no Single com um jogador: é o caso com motor e passagens.
 * As posições são as da tela, sem movimento reduzido (`replay.posicao`, como `TelaCorrida`).
 *
 * Comando: npx vitest run --config vitest.preview.config.ts scripts/medir-pr3b.preview.test.ts --reporter=verbose --silent=false
 */

import { writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { atribuirPerfis } from '../src/engine/bots';
import { criarDraft, resolverBots } from '../src/engine/draft';
import type { Jogador } from '../src/engine/types';
import { dataset } from '../src/ui/dataset-app';
import { replayDaCorrida } from '../src/ui/fim-da-corrida';
import { escalaReplay, MS_REPLAY_POR_VOLTA, prepararCorrida, type VelocidadeReplay } from '../src/ui/fluxo-corrida';
import { TETO_VOZES, type CategoriaSom } from '../src/ui/sons/agenda';
import { ControladorDeSom, corridaDoSom, type SaidaDeAudio } from '../src/ui/sons/controlador';

const PISTAS = dataset.pistas.map((p) => p.id);
const SEEDS_MEDIA = 10;
const SEEDS_OUTRAS = 3;
const QUADRO_MS = 1000 / 60;

function estado(seed: number) {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({ id: `j${String(i + 1).padStart(2, '0')}`, tipo: 'bot' as const }));
  const e = resolverBots(criarDraft(dataset, atribuirPerfis(base, seed, 'dificil'), seed), dataset);
  return { ...e, jogadores: e.jogadores.map((j, i) => (i === 0 ? { ...j, tipo: 'humano' as const } : j)) };
}

const pct = (xs: number[], p: number) => Float64Array.from(xs).sort()[Math.min(xs.length - 1, Math.floor(xs.length * p))];

describe('PR 3b: teto de vozes e custo por quadro do som', () => {
  it('mede', () => {
    const linhas: Record<string, unknown>[] = [];
    const custos: number[] = [];
    const custosVelRef: number[] = [];
    const total = { tocadas: 0, absorvidas: 0, recusadas: 0, roubadas: 0 };
    const porCategoria: Partial<Record<CategoriaSom, number>> = {};
    let maxSimultaneas = 0;
    let quadrosNoTeto = 0;
    let quadros = 0;
    for (const velocidade of ['media', 'rapida', 'lenta'] as VelocidadeReplay[]) {
      const nSeeds = velocidade === 'media' ? SEEDS_MEDIA : SEEDS_OUTRAS;
      for (const pistaId of PISTAS) {
        for (let seed = 1; seed <= nSeeds; seed++) {
          const st = estado(seed);
          const { resultado, pista } = prepararCorrida(dataset, st, pistaId, seed);
          const replay = replayDaCorrida(resultado, pista);
          const t0 = performance.now();
          const corrida = corridaDoSom(resultado, pista, ['j01'], undefined);
          custosVelRef.push(performance.now() - t0);
          // Saída falsa: o relógio anda com os quadros; conta as vozes de evento soando.
          let agora = 0;
          const vozes: { de: number; ate: number }[] = [];
          let proximo = 1;
          const saida: SaidaDeAudio = {
            agoraS: () => agora,
            ativa: () => true,
            tocar(p) {
              if (!p.laco || p.fim) vozes.push({ de: p.inicioS, ate: p.fim ? p.fim.emS + p.fim.fadeS : p.inicioS + p.som.durS });
              return proximo++;
            },
            ajustar() {},
            parar() {},
          };
          const c = new ControladorDeSom(saida, corrida);
          const escala = escalaReplay(resultado.classificacao[0].tempoTotal, pista.voltas, MS_REPLAY_POR_VOLTA[velocidade]);
          const ids = resultado.classificacao.map((x) => x.jogadorId);
          let maxCorrida = 0;
          for (let real = 0; real * escala <= replay.fim; real += QUADRO_MS) {
            const t = real * escala;
            const carros = ids.map((id, i) => {
              const pos = replay.posicao(id, resultado.historicoVoltas[id], resultado.classificacao[i].status, t, false);
              return { id, ponto: pos.ponto, naPista: pos.fracaoNaPista !== null, parado: replay.parado(id, t), abandonou: replay.abandonou(id, t) };
            });
            const a = performance.now();
            c.quadro({ tSim: t, deltaRealMs: real === 0 ? 0 : QUADRO_MS, velocidade, escala, carros });
            custos.push(performance.now() - a);
            const soando = vozes.filter((v) => v.de <= agora && v.ate > agora).length;
            maxCorrida = Math.max(maxCorrida, soando);
            if (soando >= TETO_VOZES) quadrosNoTeto++;
            quadros++;
            agora += QUADRO_MS / 1000;
          }
          c.encerrar();
          const e = c.estatisticas();
          total.tocadas += e.tocadas;
          total.absorvidas += e.absorvidas;
          total.recusadas += e.recusadas;
          total.roubadas += e.roubadas;
          for (const [k, v] of Object.entries(e.porCategoria)) porCategoria[k as CategoriaSom] = (porCategoria[k as CategoriaSom] ?? 0) + v;
          maxSimultaneas = Math.max(maxSimultaneas, maxCorrida);
          linhas.push({ velocidade, pistaId, seed, chuva: resultado.chuva, ...e, maxSimultaneas: maxCorrida, porCategoria: undefined });
        }
      }
    }
    const saida = {
      metodo:
        'ControladorDeSom de produção, quadro a quadro (16,7 ms reais), 1 humano (j01), posições de replay.posicao sem movimento reduzido; saída falsa que só conta. Média: 10 seeds × 10 pistas; rápida e lenta: 3 × 10.',
      corridas: linhas.length,
      tetoVozes: TETO_VOZES,
      total,
      porCategoria,
      maxSimultaneas,
      fracaoDeQuadrosNoTeto: quadrosNoTeto / quadros,
      custoQuadroMs: { p50: pct(custos, 0.5), p95: pct(custos, 0.95), p99: pct(custos, 0.99), max: custos.reduce((a, b) => Math.max(a, b), 0) },
      custoVelRefMs: { p50: pct(custosVelRef, 0.5), max: custosVelRef.reduce((a, b) => Math.max(a, b), 0) },
      linhas,
    };
    writeFileSync('docs/pr3b-medicao.json', `${JSON.stringify(saida, null, 1)}\n`);
    console.log(JSON.stringify({ ...saida, linhas: undefined }, null, 1));
  }, 1_800_000);
});
