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
 * Desenho (`desenhoDoBox`): superfície `pistaServico` (`LARGURA_BOX`) com a
 * borda `pistaLimite` SÓ do lado de fora, pit wall `pistaEscape` do lado da
 * pista e garagens tracejadas por fora, tudo logo depois do muro na pilha; e
 * as duas rampas pintadas de novo em `pistaServico` logo depois do limite da
 * pista, o que interrompe o limite e deixa a passagem aberta. O
 * `pistaServico` é o papel que a tabela de luminância já reserva pra pit e
 * paddock (0,0194, abaixo do asfalto 0,0369): nenhuma superfície nova. Regra
 * dos 360px (320px de SVG, 0,32 px/u): borda 4 u = 1,28 px; superfície
 * 18 u = 5,8 px.
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
  /** Largura total desenhada (borda + garagens), que é o que a cerca mede. */
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
  // A cerca mede largura simétrica; as garagens só existem do lado de fora, mas contam dos dois.
  return { amostras, janela: { inicio, fim }, largura: LARGURA_BORDA_BOX + 2 * LARGURA_GARAGEM };
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

/**
 * Pit wall: a curva deslocada do eixo, do lado do box, só no trecho paralelo,
 * encostada na superfície do box (centro em afastamento − 9 − 4,5; derivado,
 * pra acompanhar o box em qualquer afastamento) e com
 * a faixa de muro da pista entre ela e o limite (eixo ±21). Em `pistaEscape`:
 * a superfície mais escura da tabela, contra o `pistaMuro` e o `pistaServico`
 * em volta (0,0060 × 0,0273 / 0,0194). Regra dos 360px: 9 u = 2,9 px.
 */
export const LARGURA_PIT_WALL = 9;

/** Espessura da borda clara, que só existe do lado de FORA do box: (26 − 18) / 2 = 4 u = 1,3 px. */
export const ESPESSURA_BORDA_BOX = (LARGURA_BORDA_BOX - LARGURA_BOX) / 2;

/**
 * Garagens: traço tracejado logo FORA da borda externa do box, no trecho
 * paralelo, em `pistaLimite`. Cada marca tem `LARGURA_GARAGEM` u de
 * profundidade e o período do tracejado dá a separação entre garagens.
 * Regra dos 360px: 8 u = 2,6 px de profundidade, 6 u = 1,9 px de largura.
 */
export const LARGURA_GARAGEM = 8;
export const TRACEJADO_GARAGEM = '6 10';

/** Os `d` de tudo que o box desenha. Ver `desenhoDoBox`. */
export interface DesenhoDoBox {
  /** A pit lane inteira, como `pathDoBox`: superfície `pistaServico`. */
  readonly faixa: string;
  /**
   * Borda clara só do lado de fora. Sem a de dentro, o box não fecha um
   * contorno com o limite da pista: era isso que o fazia ler como ilha.
   */
  readonly bordaExterna: string;
  /**
   * As duas rampas, pintadas de novo em `pistaServico` DEPOIS do limite da
   * pista: é o que abre a passagem (interrompe o limite onde o box encosta e
   * funde a superfície do box com o asfalto, que vem por cima).
   */
  readonly rampas: readonly string[];
  readonly pitWall: string;
  readonly garagens: string;
}

/** Curva deslocada de `desvio` u (no `lado` do box) entre os arcos `de` e `ate`. */
function deslocada(curva: readonly Ponto[], arco: Arco, lado: number, desvio: number, de: number, ate: number, passo: number) {
  const pontos: Ponto[] = [];
  for (let s = de; s <= ate + 1e-9; s += passo) {
    const { p, t } = noArco(curva, arco, s);
    pontos.push({ x: p.x - t.y * lado * desvio, y: p.y + t.x * lado * desvio });
  }
  return pontos;
}

/** Polilinha aberta deslocada de `desvio` pela PRÓPRIA normal (nas rampas a normal da pista não serve). */
function aoLado(linha: readonly Ponto[], lado: number, desvio: number): Ponto[] {
  return linha.map((p, i) => {
    const a = linha[Math.max(0, i - 1)];
    const b = linha[Math.min(linha.length - 1, i + 1)];
    const c = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: p.x - ((b.y - a.y) / c) * lado * desvio, y: p.y + ((b.x - a.x) / c) * lado * desvio };
  });
}

/** Desenho do box sobre `curva`. Puro. */
export function desenhoDoBoxNaCurva(curva: readonly Ponto[], box: BoxDeclarado, passo = 4): DesenhoDoBox {
  const caminho = caminhoDoBox(curva, box, passo);
  const pontos = caminho.amostras.map(({ p }) => p);
  const primeiraParalela = caminho.amostras.findIndex((a) => a.paralelo);
  const ultimaParalela = caminho.amostras.length - 1 - [...caminho.amostras].reverse().findIndex((a) => a.paralelo);
  const arco = arcoDe(curva);
  const de = caminho.janela.inicio + box.rampa;
  const ate = caminho.janela.fim - box.rampa;
  return {
    faixa: pathDoTrecho(pontos),
    bordaExterna: pathDoTrecho(aoLado(pontos, box.lado, (LARGURA_BOX + ESPESSURA_BORDA_BOX) / 2)),
    rampas: [pontos.slice(0, primeiraParalela + 1), pontos.slice(ultimaParalela)].map(pathDoTrecho),
    pitWall: pathDoTrecho(
      deslocada(curva, arco, box.lado, box.afastamento - LARGURA_BOX / 2 - LARGURA_PIT_WALL / 2, de, ate, passo),
    ),
    garagens: pathDoTrecho(
      deslocada(curva, arco, box.lado, box.afastamento + LARGURA_BORDA_BOX / 2 + LARGURA_GARAGEM / 2, de, ate, passo),
    ),
  };
}

const CACHE_DESENHO_BOX = new Map<string, DesenhoDoBox | null>();

/** `desenhoDoBoxNaCurva` da pista, ou `null` sem box. Memoizado como `pathDoBox`. */
export function desenhoDoBox(pistaId: string): DesenhoDoBox | null {
  const cache = CACHE_DESENHO_BOX.get(pistaId);
  if (cache !== undefined) return cache;
  const box = BOXES_POR_PISTA[pistaId];
  const desenho = box === undefined ? null : desenhoDoBoxNaCurva(tracadoSuavizado(pistaId), box);
  CACHE_DESENHO_BOX.set(pistaId, desenho);
  return desenho;
}
