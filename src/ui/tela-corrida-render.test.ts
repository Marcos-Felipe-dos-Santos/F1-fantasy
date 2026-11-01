/**
 * Elo testado entre os dados do replay e o que a TELA desenha (PR 2a). Mesmo
 * padrão de `pista-camadas-render.test.ts`: `renderToStaticMarkup`, sem jsdom,
 * com `createElement` em vez de JSX.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { atribuirPerfis } from '../engine/bots';
import { criarDraft, resolverBots } from '../engine/draft';
import type { DraftState, Jogador } from '../engine/types';
import { dataset } from './dataset-app';
import { prepararCorrida } from './fluxo-corrida';
import { linhaDoTempoDoPit } from './pit-replay';
import { TelaCorrida } from './TelaCorrida';

const tela_ = vi.hoisted(() => ({ estreita: false, reduzido: false }));
vi.mock('./useTelaEstreita', () => ({ useTelaEstreita: () => tela_.estreita }));
vi.mock('./useMovimentoReduzido', () => ({ useMovimentoReduzido: () => tela_.reduzido }));

beforeEach(() => {
  tela_.estreita = false;
  tela_.reduzido = false;
});

function estadoComHumano(): DraftState {
  const base: Jogador[] = Array.from({ length: 22 }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const estado = resolverBots(criarDraft(dataset, atribuirPerfis(base, 42, 'dificil'), 42), dataset);
  return {
    ...estado,
    jogadores: estado.jogadores.map((j, i) => (i === 0 ? { ...j, tipo: 'humano' as const, nome: 'Você' } : j)),
  };
}

const estado = estadoComHumano();

function corridaCom(chuva: boolean, pistaId = 'pista-spa') {
  for (let seed = 1; seed < 200; seed++) {
    const corrida = prepararCorrida(dataset, estado, pistaId, seed);
    if (corrida.resultado.chuva === chuva) return corrida;
  }
  throw new Error('sem seed com esse clima');
}

function tela(corrida: ReturnType<typeof corridaCom>, tempoSimMs: number, extra: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    createElement(TelaCorrida, {
      state: estado,
      pista: corrida.pista,
      grid: corrida.grid,
      resultado: corrida.resultado,
      fase: 'replay',
      tempoSimMs,
      onLargar: () => undefined,
      onAcelerar: () => undefined,
      velocidade: 'media',
      onVelocidade: () => undefined,
      ...extra,
    }),
  );
}

describe('painel: diferença para o líder', () => {
  it('toda linha traz a coluna, com o líder identificado', () => {
    const corrida = corridaCom(false);
    const html = tela(corrida, corrida.resultado.classificacao[0].tempoTotal / 2);
    const celulas = [...html.matchAll(/classificacao-ao-vivo__diferenca">([^<]*)</g)].map((m) => m[1]);
    expect(celulas.length).toBe(22);
    expect(celulas[0]).toBe('Líder');
    expect(celulas.slice(1).filter((c) => /^\+\d+,\ds$|^\+\d+ V$/.test(c)).length).toBeGreaterThan(15);
  });
});

describe('carros', () => {
  const carrosEm = (html: string) => [...html.matchAll(/<g class="tracado-svg__carro[^"]*"[^>]*>/g)].map((m) => m[0]);
  const corrida = corridaCom(false);
  const meio = corrida.resultado.classificacao[0].tempoTotal / 2;

  it('22 carros, cada um com transform de posição e rumo, e nada de bolinha', () => {
    const html = tela(corrida, meio);
    const carros = carrosEm(html);
    expect(carros.length).toBe(22);
    for (const c of carros) expect(c).toMatch(/transform="translate\([-\d.]+ [-\d.]+\) rotate\([-\d.]+\) scale\([\d.]+\)"/);
    expect(html).not.toMatch(/<circle[^>]*tracado-svg__carro/);
    expect(html.match(/<use href="#carro-c"/g)?.length).toBe(22);
    expect(html.match(/<title>/g)?.length).toBe(22);
  });

  it('o rumo desenhado é o da linha do tempo do pit', () => {
    const { pista, resultado } = corrida;
    const linha = linhaDoTempoDoPit(resultado, pista);
    const humano = 'j01';
    const item = resultado.classificacao.find((c) => c.jogadorId === humano)!;
    const { rumo } = linha.posicao(humano, resultado.historicoVoltas[humano], item.status, meio, false);
    const carro = carrosEm(tela(corrida, meio)).find((c) => c.includes('--humano'))!;
    expect(carro).toContain(`rotate(${rumo.toFixed(1)})`);
  });

  it('tela larga: C completo e escala de desktop; estreita: C proporcional e escala de celular', () => {
    const asaDe = (html: string) => /<g id="carro-c">.*?class="carro-c__asa" x="[-\d.]+" y="[-\d.]+" width="([\d.]+)"/.exec(html)?.[1];
    const larga = tela(corrida, meio);
    expect(asaDe(larga)).toBe('3');
    expect(carrosEm(larga).find((c) => c.includes('--humano'))).toContain('scale(1.2)');
    expect(carrosEm(larga).find((c) => !c.includes('--humano'))).toContain('scale(0.86)');
    tela_.estreita = true;
    const estreita = tela(corrida, meio);
    expect(asaDe(estreita)).toBe('4.1');
    expect(carrosEm(estreita).find((c) => c.includes('--humano'))).toContain('scale(1.48)');
    expect(carrosEm(estreita).find((c) => !c.includes('--humano'))).toContain('scale(1.05)');
  });

  it('o humano é desenhado por último, para o pelotão não o cobrir', () => {
    const carros = carrosEm(tela(corrida, meio));
    expect(carros.at(-1)).toContain('--humano');
  });

  it('halo: no Single, o humano; no online, só quem está jogando', () => {
    const halos = (html: string) => html.match(/tracado-svg__halo/g)?.length ?? 0;
    expect(halos(tela(corrida, meio))).toBe(1);
    expect(halos(tela(corrida, meio, { jogadorLocalId: 'j05' }))).toBe(1);
    expect(halos(tela(corrida, meio, { jogadorLocalId: null }))).toBe(0);
    const html = tela(corrida, meio, { jogadorLocalId: 'j05' });
    const comHalo = /<g class="tracado-svg__carro[^"]*"[^>]*><circle class="tracado-svg__halo"[^>]*>.*?<title>([^<]*)/.exec(html)?.[1];
    expect(comHalo).not.toContain('Você');
  });

  it('Suzuka: carro sob a ponte vem antes do tabuleiro, os outros depois', () => {
    const suzuka = corridaCom(false, 'pista-suzuka');
    const linha = linhaDoTempoDoPit(suzuka.resultado, suzuka.pista);
    const fim = suzuka.resultado.classificacao[0].tempoTotal;
    const id = suzuka.resultado.classificacao[1].jogadorId;
    const h = suzuka.resultado.historicoVoltas[id];
    let t = 0;
    while (t < fim && !linha.posicao(id, h, 'terminou', t, false).sob) t += 50;
    expect(t).toBeLessThan(fim);
    const html = tela(suzuka, t);
    const tabuleiro = html.indexOf('<mask');
    const primeiro = html.indexOf('<g class="tracado-svg__carro');
    expect(tabuleiro).toBeGreaterThan(0);
    expect(primeiro).toBeLessThan(tabuleiro);
    expect(html.lastIndexOf('<g class="tracado-svg__carro')).toBeGreaterThan(tabuleiro);
  });
});
