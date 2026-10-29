import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { caminhoDoBox, pathDoBox } from './box';
import { indiceDoVertice, tracadoSuavizado } from './suavizacao';
import { ViadutosDaPista } from './TelaCorrida';
import { BOXES_POR_PISTA } from './tracados';
import {
  OPACIDADE_TABULEIRO,
  estaSobViaduto,
  fracoesSobViaduto,
  pathsDosViadutos,
} from './viaduto';

/** Fração da volta (por arco, como `pontoNoTracado`) do índice `i` da curva suavizada. */
function fracaoDoIndice(pistaId: string, i: number): number {
  const c = tracadoSuavizado(pistaId);
  let total = 0;
  let ate = 0;
  for (let k = 0; k < c.length; k++) {
    if (k === i) ate = total;
    const q = c[(k + 1) % c.length];
    total += Math.hypot(q.x - c[k].x, q.y - c[k].y);
  }
  return ate / total;
}

describe('box (PR 2b)', () => {
  const box = BOXES_POR_PISTA['pista-monza'];

  it('Monza declara box; pista sem box não desenha nada', () => {
    expect(box).toBeDefined();
    expect(pathDoBox('pista-monaco')).toBeNull();
  });

  it('no trecho paralelo a pit lane fica EXATAMENTE no afastamento declarado da curva', () => {
    const curva = tracadoSuavizado('pista-monza');
    const { amostras } = caminhoDoBox(curva, box);
    const paralelas = amostras.filter((a) => a.paralelo);
    expect(paralelas.length).toBeGreaterThan(10);
    for (const { p } of paralelas) {
      const menor = Math.min(...curva.map((q) => Math.hypot(q.x - p.x, q.y - p.y)));
      expect(menor).toBeGreaterThan(box.afastamento - 1);
      expect(menor).toBeLessThan(box.afastamento + 1);
    }
  });

  it('as rampas nascem e morrem SOBRE a pista (deslocamento zero nas pontas)', () => {
    const curva = tracadoSuavizado('pista-monza');
    const { amostras } = caminhoDoBox(curva, box);
    for (const { p } of [amostras[0], amostras[amostras.length - 1]]) {
      expect(Math.min(...curva.map((q) => Math.hypot(q.x - p.x, q.y - p.y)))).toBeLessThan(3);
    }
  });

  it('o box de Monza fica do lado de DENTRO da reta principal (acima dela na tela)', () => {
    const meio = caminhoDoBox(tracadoSuavizado('pista-monza'), box).amostras.find(
      (a) => a.paralelo,
    );
    expect(meio?.p.y).toBeLessThan(500);
  });

  it('pathDoBox é memoizado (mesma referência de string)', () => {
    expect(pathDoBox('pista-monza')).toBe(pathDoBox('pista-monza'));
  });
});

describe('viaduto (PR 2b)', () => {
  it('Suzuka tem um viaduto, Monza nenhum; memoizado', () => {
    expect(pathsDosViadutos('pista-suzuka')).toHaveLength(1);
    expect(pathsDosViadutos('pista-monza')).toHaveLength(0);
    expect(pathsDosViadutos('pista-suzuka')).toBe(pathsDosViadutos('pista-suzuka'));
  });

  it('carro no vértice de BAIXO está sob o viaduto; no de CIMA, não (vai por cima do tabuleiro)', () => {
    expect(
      estaSobViaduto('pista-suzuka', fracaoDoIndice('pista-suzuka', indiceDoVertice(16))),
    ).toBe(true);
    expect(
      estaSobViaduto('pista-suzuka', fracaoDoIndice('pista-suzuka', indiceDoVertice(33))),
    ).toBe(false);
    expect(estaSobViaduto('pista-monza', 0.5)).toBe(false);
    expect(fracoesSobViaduto('pista-suzuka')).toHaveLength(1);
  });

  it('renderiza máscara, tabuleiro a 75% e guarda-corpo opaco (fora do grupo translúcido)', () => {
    const html = renderToStaticMarkup(
      createElement('svg', null, createElement(ViadutosDaPista, { pistaId: 'pista-suzuka' })),
    );
    expect(html).toContain('<mask id="viaduto-pista-suzuka-0"');
    expect(html).toContain('mask="url(#viaduto-pista-suzuka-0)"');
    expect(html).toContain(`opacity="${OPACIDADE_TABULEIRO}"`);
    const [g1, g2] = pathsDosViadutos('pista-suzuka')[0].guardaCorpo;
    const posTranslucido = html.indexOf(`opacity="${OPACIDADE_TABULEIRO}"`);
    const fimTranslucido = html.indexOf('</g>', posTranslucido);
    for (const d of [g1, g2]) expect(html.indexOf(`d="${d}"`)).toBeGreaterThan(fimTranslucido);
    expect(
      renderToStaticMarkup(
        createElement('svg', null, createElement(ViadutosDaPista, { pistaId: 'pista-monza' })),
      ),
    ).toBe('<svg></svg>');
  });
});
