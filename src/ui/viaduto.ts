/**
 * VIADUTO do replay (PR 2b): onde o traçado cruza a si mesmo de verdade
 * (Suzuka), a passagem de CIMA é repintada por cima de tudo como um tabuleiro
 * SEMITRANSPARENTE — dá pra ver a pista e os carros de baixo através dele, e
 * as duas bordas de limite de cima (o guarda-corpo) ficam opacas, que é o que
 * diz qual passa por cima. Nível escolhido pelo Marcos em 2026-10-29: tabuleiro
 * 75% opaco.
 *
 * O tabuleiro e a sombra são RECORTADOS por uma máscara que é a faixa de
 * escape da passagem de BAIXO: só se repinta onde as duas faixas se cruzam, e
 * fora dela a cor repintada é a mesma que já estava — o tabuleiro não tem
 * ponta visível. Só camadas que já estão na pilha (escape, muro, asfalto,
 * limite): nenhuma superfície nova na tabela de luminância.
 *
 * Declarado em `VIADUTOS_POR_PISTA` (`tracados.ts`); a cerca de folga
 * (`scripts/folga-pistas.test.ts`) só isenta o círculo em volta do `centro`.
 */

import type { Ponto } from './fluxo-corrida';
import { CAMADAS_PISTA, pathDoTrecho } from './pista-camadas';
import { indiceDoVertice, tracadoSuavizado, trechoPorArco } from './suavizacao';
import { VIADUTOS_POR_PISTA } from './tracados';

export const OPACIDADE_TABULEIRO = 0.75;
export const OPACIDADE_SOMBRA = 0.525;
/** Sombra do tabuleiro sobre a pista de baixo: luz vindo de cima à esquerda. */
export const DESLOCAMENTO_SOMBRA = { dx: 8, dy: 10 } as const;
/** Arco de cada passagem desenhado em volta do cruzamento; a máscara decide o que aparece. */
export const ALCANCE_VIADUTO = 160;

function largura(id: string): number {
  const camada = CAMADAS_PISTA.find((c) => c.id === id);
  if (camada === undefined) throw new Error(`viaduto: camada "${id}" sumiu de CAMADAS_PISTA`);
  return camada.largura;
}

export const LARGURA_ESCAPE = largura('escape');

export interface PathsDoViaduto {
  /** Faixa de escape da passagem de baixo: a máscara. */
  readonly mascara: string;
  readonly sombra: string;
  /** Linha central do tabuleiro (passagem de cima). */
  readonly tabuleiro: string;
  /** As duas bordas de limite de cima, como linhas finas. */
  readonly guardaCorpo: readonly [string, string];
  /** Espessura de cada linha do guarda-corpo: a faixa de limite, (42 − 34) / 2. */
  readonly espessuraGuardaCorpo: number;
}

function deslocar(linha: readonly Ponto[], desvio: number): Ponto[] {
  return linha.map((p, i) => {
    const a = linha[Math.max(0, i - 1)];
    const b = linha[Math.min(linha.length - 1, i + 1)];
    const c = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x - ((b.y - a.y) / c) * desvio, y: p.y + ((b.x - a.x) / c) * desvio };
  });
}

const CACHE = new Map<string, readonly PathsDoViaduto[]>();

/** Paths de cada viaduto de `pistaId` (vazio se não houver). MEMOIZADO: o replay re-renderiza por frame. */
export function pathsDosViadutos(pistaId: string): readonly PathsDoViaduto[] {
  const cache = CACHE.get(pistaId);
  if (cache !== undefined) return cache;
  const curva = tracadoSuavizado(pistaId);
  const desvio = (largura('asfalto') + largura('limite')) / 4;
  const paths = (VIADUTOS_POR_PISTA[pistaId] ?? []).map((v): PathsDoViaduto => {
    const cima = trechoPorArco(
      curva,
      indiceDoVertice(v.controleCima),
      ALCANCE_VIADUTO,
      ALCANCE_VIADUTO,
    );
    const baixo = trechoPorArco(
      curva,
      indiceDoVertice(v.controleBaixo),
      ALCANCE_VIADUTO,
      ALCANCE_VIADUTO,
    );
    return {
      mascara: pathDoTrecho(baixo),
      sombra: pathDoTrecho(
        cima.map((p) => ({ x: p.x + DESLOCAMENTO_SOMBRA.dx, y: p.y + DESLOCAMENTO_SOMBRA.dy })),
      ),
      tabuleiro: pathDoTrecho(cima),
      guardaCorpo: [pathDoTrecho(deslocar(cima, desvio)), pathDoTrecho(deslocar(cima, -desvio))],
      espessuraGuardaCorpo: (largura('limite') - largura('asfalto')) / 2,
    };
  });
  CACHE.set(pistaId, paths);
  return paths;
}

const CACHE_FRACOES = new Map<string, readonly (readonly [number, number])[]>();

/**
 * Intervalos de FRAÇÃO DA VOLTA (a mesma de `pontoNoTracado`) em que um carro
 * está na passagem de BAIXO, sob o tabuleiro: `LARGURA_ESCAPE` de arco pra
 * cada lado do vértice de baixo. O replay desenha esses carros ANTES do
 * viaduto, pra eles aparecerem através do tabuleiro, e não por cima dele.
 */
export function fracoesSobViaduto(pistaId: string): readonly (readonly [number, number])[] {
  const cache = CACHE_FRACOES.get(pistaId);
  if (cache !== undefined) return cache;
  const curva = tracadoSuavizado(pistaId);
  let perimetro = 0;
  const arco: number[] = [];
  for (let i = 0; i < curva.length; i++) {
    arco.push(perimetro);
    const q = curva[(i + 1) % curva.length];
    perimetro += Math.hypot(q.x - curva[i].x, q.y - curva[i].y);
  }
  const fracoes = (VIADUTOS_POR_PISTA[pistaId] ?? []).map((v) => {
    const s = arco[indiceDoVertice(v.controleBaixo)];
    return [(s - LARGURA_ESCAPE) / perimetro, (s + LARGURA_ESCAPE) / perimetro] as const;
  });
  CACHE_FRACOES.set(pistaId, fracoes);
  return fracoes;
}

/** O carro na fração `fracao` (0..1) está sob algum viaduto de `pistaId`? */
export function estaSobViaduto(pistaId: string, fracao: number): boolean {
  const f = ((fracao % 1) + 1) % 1;
  return fracoesSobViaduto(pistaId).some(([a, b]) =>
    [f, f + 1, f - 1].some((x) => x >= a && x <= b),
  );
}
