import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import { pontoNoTracado, TRACADO_GENERICO, type Ponto } from './fluxo-corrida';
import { TRACADOS_POR_PISTA, tracadoDaPista } from './tracados';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Perímetro de uma polilinha fechada (soma dos segmentos + o de fechamento último→primeiro). */
function perimetro(tracado: Ponto[]): number {
  let soma = 0;
  for (let i = 0; i < tracado.length; i++) {
    const a = tracado[i];
    const b = tracado[(i + 1) % tracado.length];
    soma += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return soma;
}

/** Bounding box (min/max x/y) de uma polilinha. */
function boundingBox(tracado: Ponto[]) {
  const xs = tracado.map((p) => p.x);
  const ys = tracado.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/**
 * Cruzamentos MID-SEGMENTO de uma polilinha fechada consigo mesma: pares de
 * segmentos não-adjacentes que se intersectam estritamente no interior de
 * ambos. Cruzamento em vértice compartilhado (o X do "8" de Suzuka passa
 * exatamente pelo ponto duplicado do centro) NÃO conta — essa é a forma
 * intencional de auto-interseção que o desenho permite. Guarda de regressão
 * pedida na revisão do PR 2.8: as duas primeiras versões de Spa e Interlagos
 * tinham cruzamentos acidentais perto da largada.
 */
function cruzamentosMidSegmento(tracado: Ponto[]): string[] {
  const n = tracado.length;
  const cruzamentos: string[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if ((j + 1) % n === i || (i + 1) % n === j) continue; // adjacentes compartilham vértice
      const a = tracado[i];
      const b = tracado[(i + 1) % n];
      const c = tracado[j];
      const d = tracado[(j + 1) % n];
      const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
      if (den === 0) continue; // paralelos/colineares
      const s = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
      const r = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
      const eps = 1e-9;
      if (s > eps && s < 1 - eps && r > eps && r < 1 - eps) {
        cruzamentos.push(`${i}x${j}`);
      }
    }
  }
  return cruzamentos;
}

describe('tracadoDaPista', () => {
  it('todas as 10 pistas do dataset têm traçado próprio em TRACADOS_POR_PISTA', () => {
    for (const pista of dataset.pistas) {
      expect(TRACADOS_POR_PISTA[pista.id], `pista ${pista.id} sem traçado próprio`).toBeDefined();
    }
    expect(dataset.pistas.length).toBe(10);
  });

  it('id desconhecido cai no fallback TRACADO_GENERICO', () => {
    expect(tracadoDaPista('pista-inexistente')).toBe(TRACADO_GENERICO);
  });

  it('Monza reaproveita TRACADO_GENERICO diretamente (mesma referência)', () => {
    expect(TRACADOS_POR_PISTA['pista-monza']).toBe(TRACADO_GENERICO);
    expect(tracadoDaPista('pista-monza')).toBe(TRACADO_GENERICO);
  });

  it('nenhuma pista (exceto Monza) compartilha o mesmo array de pontos que outra', () => {
    const entradas = Object.entries(TRACADOS_POR_PISTA);
    for (let i = 0; i < entradas.length; i++) {
      for (let j = i + 1; j < entradas.length; j++) {
        const [idA, tracadoA] = entradas[i];
        const [idB, tracadoB] = entradas[j];
        if (idA === 'pista-monza' || idB === 'pista-monza') continue;
        expect(
          JSON.stringify(tracadoA),
          `${idA} e ${idB} têm o mesmo traçado`,
        ).not.toBe(JSON.stringify(tracadoB));
      }
    }
  });

  describe.each(dataset.pistas.map((pista) => [pista.id, pista.nome] as const))(
    'silhueta de %s (%s)',
    (pistaId) => {
      const tracado = tracadoDaPista(pistaId);

      it('tem pelo menos 10 pontos', () => {
        expect(tracado.length).toBeGreaterThanOrEqual(10);
      });

      it('todos os pontos estão dentro do viewBox 0 0 1000 600', () => {
        for (const ponto of tracado) {
          expect(ponto.x).toBeGreaterThan(0);
          expect(ponto.x).toBeLessThan(1000);
          expect(ponto.y).toBeGreaterThan(0);
          expect(ponto.y).toBeLessThan(600);
        }
      });

      it('nenhum segmento degenerado (pontos consecutivos distintos, incluindo o fechamento)', () => {
        for (let i = 0; i < tracado.length; i++) {
          const a = tracado[i];
          const b = tracado[(i + 1) % tracado.length];
          expect(a.x !== b.x || a.y !== b.y, `segmento ${i}->${(i + 1) % tracado.length} degenerado`).toBe(
            true,
          );
        }
      });

      it('perímetro (soma dos segmentos + fechamento) é maior que zero', () => {
        expect(perimetro(tracado)).toBeGreaterThan(0);
      });

      it('sem auto-interseção mid-segmento (o X de Suzuka é em vértice, não conta)', () => {
        expect(cruzamentosMidSegmento(tracado)).toEqual([]);
      });

      it('pontoNoTracado devolve pontos dentro do bounding box do traçado', () => {
        const bbox = boundingBox(tracado);
        for (const fracao of [0, 0.25, 0.5, 0.75, 0.999]) {
          const ponto = pontoNoTracado(tracado, fracao);
          expect(ponto.x).toBeGreaterThanOrEqual(bbox.minX);
          expect(ponto.x).toBeLessThanOrEqual(bbox.maxX);
          expect(ponto.y).toBeGreaterThanOrEqual(bbox.minY);
          expect(ponto.y).toBeLessThanOrEqual(bbox.maxY);
        }
      });
    },
  );
});
