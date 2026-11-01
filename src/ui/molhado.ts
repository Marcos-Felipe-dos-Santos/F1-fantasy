/**
 * Reflexos do asfalto molhado (PR 2a): dois traços finos e interrompidos, paralelos
 * ao eixo, um de cada lado. Decisão do Marcos, com o asfalto em #313131: são
 * MARCAÇÃO, como a zebra e o limite, não superfície, e por isso ficam fora da tabela
 * de luminância mesmo sendo mais claros que o asfalto. Estáticos: valem também com
 * movimento reduzido.
 */

import { tracadoSuavizado } from './suavizacao';

/** Do eixo ao reflexo: o asfalto tem 17 u de cada lado. */
export const DESLOCAMENTO_REFLEXO = 9;
export const LARGURA_REFLEXO = 2;

/** Padrões diferentes: dois tracejados iguais leriam como faixa de pista. */
const TRACEJADOS = ['70 190 30 260', '40 230 90 310'] as const;

export interface Reflexo {
  d: string;
  tracejado: string;
}

const CACHE = new Map<string, readonly Reflexo[]>();

function paralela(pontos: readonly { x: number; y: number }[], deslocamento: number): string {
  const n = pontos.length;
  const trecho = pontos.map((p, i) => {
    const a = pontos[(i + n - 1) % n];
    const b = pontos[(i + 1) % n];
    const comprimento = Math.hypot(b.x - a.x, b.y - a.y);
    const x = p.x - ((b.y - a.y) / comprimento) * deslocamento;
    const y = p.y + ((b.x - a.x) / comprimento) * deslocamento;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${trecho.join(' ')} Z`;
}

/** Memoizado: `TelaCorrida` renderiza a cada frame. */
export function reflexosDaPista(pistaId: string): readonly Reflexo[] {
  const cache = CACHE.get(pistaId);
  if (cache !== undefined) return cache;
  const curva = tracadoSuavizado(pistaId);
  const reflexos = [DESLOCAMENTO_REFLEXO, -DESLOCAMENTO_REFLEXO].map((deslocamento, i) => ({
    d: paralela(curva, deslocamento),
    tracejado: TRACEJADOS[i],
  }));
  CACHE.set(pistaId, reflexos);
  return reflexos;
}
