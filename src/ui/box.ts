/**
 * PIT LANE do replay (PR 2b), como elemento DECLARADO por pista
 * (`BOXES_POR_PISTA` em `tracados.ts`).
 *
 * O modelo: a pit lane é o próprio traçado SUAVIZADO deslocado pra um lado,
 * entre duas frações da volta. No meio ela corre paralela à pista a
 * `afastamento` fixo; nas pontas, uma rampa de `rampa` u de arco leva o
 * deslocamento de 0 a `afastamento` (e de volta) com suavização cúbica. Por
 * construção ela não se afasta da reta que acompanha; o que a cerca
 * (`scripts/folga-pistas.test.ts`) vigia é ela não encostar em NENHUM OUTRO
 * trecho.
 *
 * Desenho: borda `pistaLimite` (`LARGURA_BORDA_BOX`) + superfície
 * `pistaServico` (`LARGURA_BOX`), encaixadas na pilha logo depois do muro. O
 * `pistaServico` é o papel que a tabela de luminância já reserva pra pit e
 * paddock (0,0194, abaixo do asfalto 0,0369): nenhuma superfície nova. Regra
 * dos 360px: borda (26 − 18) / 2 = 4 u = 1,28 px; superfície 18 u = 5,8 px.
 *
 * Só apresentação: o tempo de pit e as voltas de parada vêm do resultado da
 * engine, e nada aqui o lê ou o altera.
 */

import type { Ponto } from './fluxo-corrida';
import { pathDoTrecho } from './pista-camadas';
import { tracadoSuavizado } from './suavizacao';
import { BOXES_POR_PISTA, type BoxDeclarado } from './tracados';

export const LARGURA_BOX = 18;
export const LARGURA_BORDA_BOX = 26;

/** Amostra da pit lane; `paralelo` = já no afastamento cheio (fora das rampas). */
export interface AmostraDoBox {
  readonly p: Ponto;
  readonly paralelo: boolean;
}

export interface CaminhoDoBox {
  readonly amostras: readonly AmostraDoBox[];
  /** Extensão em arco da pista onde o box corre (`fim > inicio`, mesmo cruzando a largada). */
  readonly janela: { readonly inicio: number; readonly fim: number };
  /** Largura total desenhada (a borda), que é o que a cerca mede. */
  readonly largura: number;
}

interface Arco {
  readonly s: readonly number[];
  readonly perimetro: number;
}

function arcoDe(curva: readonly Ponto[]): Arco {
  const s = [0];
  for (let i = 1; i < curva.length; i++)
    s.push(s[i - 1] + Math.hypot(curva[i].x - curva[i - 1].x, curva[i].y - curva[i - 1].y));
  const ultimo = curva[curva.length - 1];
  return {
    s,
    perimetro: s[s.length - 1] + Math.hypot(curva[0].x - ultimo.x, curva[0].y - ultimo.y),
  };
}

/** Ponto e tangente unitária da curva no arco `alvo` (com volta). */
function noArco(curva: readonly Ponto[], arco: Arco, alvo: number): { p: Ponto; t: Ponto } {
  const n = curva.length;
  const s = ((alvo % arco.perimetro) + arco.perimetro) % arco.perimetro;
  let i = 0;
  while (i < n - 1 && arco.s[i + 1] <= s) i++;
  const a = curva[i];
  const b = curva[(i + 1) % n];
  const fim = i + 1 < n ? arco.s[i + 1] : arco.perimetro;
  const k = fim > arco.s[i] ? (s - arco.s[i]) / (fim - arco.s[i]) : 0;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const c = Math.hypot(dx, dy) || 1;
  return { p: { x: a.x + k * dx, y: a.y + k * dy }, t: { x: dx / c, y: dy / c } };
}

/** Pit lane de `box` sobre `curva`, amostrada a cada `passo` u de arco. Puro. */
export function caminhoDoBox(curva: readonly Ponto[], box: BoxDeclarado, passo = 4): CaminhoDoBox {
  const arco = arcoDe(curva);
  const inicio = box.entrada * arco.perimetro;
  let fim = box.saida * arco.perimetro;
  if (fim <= inicio) fim += arco.perimetro;
  const suave = (x: number) => x * x * (3 - 2 * x);
  const amostras: AmostraDoBox[] = [];
  for (let s = inicio; s <= fim + 1e-9; s += passo) {
    const { p, t } = noArco(curva, arco, s);
    const perfil = suave(Math.max(0, Math.min(1, (s - inicio) / box.rampa, (fim - s) / box.rampa)));
    const o = box.lado * box.afastamento * perfil;
    amostras.push({ p: { x: p.x - t.y * o, y: p.y + t.x * o }, paralelo: perfil === 1 });
  }
  return { amostras, janela: { inicio, fim }, largura: LARGURA_BORDA_BOX };
}

const CACHE_PATH_BOX = new Map<string, string | null>();

/**
 * `d` da pit lane de `pistaId`, ou `null` se a pista não declara box.
 * MEMOIZADO pelo mesmo motivo de `pathDaVolta`: `TelaCorrida` re-renderiza a
 * cada frame do `rAF`.
 */
export function pathDoBox(pistaId: string): string | null {
  const cache = CACHE_PATH_BOX.get(pistaId);
  if (cache !== undefined) return cache;
  const box = BOXES_POR_PISTA[pistaId];
  const d =
    box === undefined
      ? null
      : pathDoTrecho(caminhoDoBox(tracadoSuavizado(pistaId), box).amostras.map(({ p }) => p));
  CACHE_PATH_BOX.set(pistaId, d);
  return d;
}
