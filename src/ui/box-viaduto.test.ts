import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  LARGURA_BOX,
  LARGURA_GARAGEM,
  LARGURA_PIT_WALL,
  caminhoDoBox,
  desenhoDoBox,
  desenhoDoBoxNaCurva,
  pathDoBox,
} from './box';
import { LARGURA_ASFALTO, CAMADAS_PISTA } from './pista-camadas';
import { indiceDoVertice, tracadoSuavizado } from './suavizacao';
import { ViadutosDaPista } from './TelaCorrida';
import { BOXES_POR_PISTA, VIADUTOS_POR_PISTA, tracadoDaPista } from './tracados';
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
    // PR 2b: as 10 pistas declaram box; "sem box" é um id fora do dataset.
    expect(pathDoBox('pista-inexistente')).toBeNull();
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
    expect(desenhoDoBox('pista-monza')).toBe(desenhoDoBox('pista-monza'));
    expect(desenhoDoBox('pista-inexistente')).toBeNull();
  });
});

/** Pontos de um `d` de `pathDoTrecho` (`M x y L x y ...`). */
function pontosDoPath(d: string): { x: number; y: number }[] {
  const n = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  const pontos = [];
  for (let i = 0; i + 1 < n.length; i += 2) pontos.push({ x: n[i], y: n[i + 1] });
  return pontos;
}

/**
 * Distância de `p` à reta do box: só os segmentos da curva dentro da janela do
 * box (por arco). A curva inteira não serve: em Monza a outra reta passa a
 * ~40 u das garagens.
 */
function distanciaACurva(p: { x: number; y: number }, curva: readonly { x: number; y: number }[]): number {
  const { janela } = caminhoDoBox(curva, BOXES_POR_PISTA['pista-monza']);
  const arco = [0];
  for (let i = 1; i < curva.length; i++) arco.push(arco[i - 1] + Math.hypot(curva[i].x - curva[i - 1].x, curva[i].y - curva[i - 1].y));
  const perimetro = arco[arco.length - 1] + Math.hypot(curva[0].x - curva[curva.length - 1].x, curva[0].y - curva[curva.length - 1].y);
  let menor = Infinity;
  for (let i = 0; i < curva.length; i++) {
    if (![arco[i], arco[i] + perimetro].some((s) => s >= janela.inicio && s <= janela.fim)) continue;
    const a = curva[i];
    const b = curva[(i + 1) % curva.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    menor = Math.min(menor, Math.hypot(p.x - a.x - k * dx, p.y - a.y - k * dy));
  }
  return menor;
}

/** Ajuste de estilo do box (PR 2b, antes do lote 1): aberto nas rampas, pit wall e garagens. */
describe('desenho do box aberto (PR 2b)', () => {
  const box = BOXES_POR_PISTA['pista-monza'];
  const curva = tracadoSuavizado('pista-monza');
  const desenho = desenhoDoBoxNaCurva(curva, box);
  const limite = CAMADAS_PISTA.find((c) => c.id === 'limite')!.largura;

  it('as duas rampas vão da pista ao afastamento cheio, e por isso cruzam o limite da pista', () => {
    expect(desenho.rampas).toHaveLength(2);
    for (const d of desenho.rampas) {
      const distancias = pontosDoPath(d).map((p) => distanciaACurva(p, curva));
      expect(Math.min(...distancias)).toBeLessThan(3);
      expect(Math.max(...distancias)).toBeGreaterThan(box.afastamento - 1);
    }
  });

  it('a borda clara só existe do lado de FORA: no paralelo fica a afastamento + 11, nunca entre o box e a pista', () => {
    // A borda tem uma amostra por amostra da pit lane; `paralelo` diz quais estão fora das rampas.
    const { amostras } = caminhoDoBox(curva, box);
    const distancias = pontosDoPath(desenho.bordaExterna).map((p) => distanciaACurva(p, curva));
    expect(distancias).toHaveLength(amostras.length);
    // Nas rampas também: a borda nunca fica mais perto da pista que o eixo da pit lane.
    amostras.forEach((a, i) => expect(distancias[i]).toBeGreaterThan(distanciaACurva(a.p, curva)));
    const paralelas = distancias.filter((_, i) => amostras[i].paralelo);
    expect(paralelas.length).toBeGreaterThan(10);
    expect(Math.max(...paralelas)).toBeLessThan(box.afastamento + 11 + 1);
    expect(Math.min(...paralelas)).toBeGreaterThan(box.afastamento + 11 - 1);
  });

  it('o pit wall fica entre o limite da pista e a superfície do box, sem cobrir nenhum dos dois', () => {
    const pontos = pontosDoPath(desenho.pitWall);
    expect(pontos.length).toBeGreaterThan(10);
    for (const p of pontos) {
      const dist = distanciaACurva(p, curva);
      expect(dist - LARGURA_PIT_WALL / 2).toBeGreaterThanOrEqual(limite / 2);
      expect(dist + LARGURA_PIT_WALL / 2).toBeLessThanOrEqual(box.afastamento - LARGURA_BOX / 2 + 0.5);
      // Encostado na superfície do box: a borda de fora do muro coincide com a de dentro do box.
      expect(dist + LARGURA_PIT_WALL / 2).toBeCloseTo(box.afastamento - LARGURA_BOX / 2, 0);
    }
  });

  it('as garagens ficam do lado de FORA da borda externa', () => {
    expect(desenho.garagens).not.toBeNull();
    for (const p of pontosDoPath(desenho.garagens ?? '')) {
      expect(distanciaACurva(p, curva) - LARGURA_GARAGEM / 2).toBeGreaterThan(box.afastamento + 13 - 0.5);
    }
  });

  it('sanidade da pilha usada acima: limite mais largo que o asfalto', () => {
    expect(limite).toBeGreaterThan(LARGURA_ASFALTO);
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
      estaSobViaduto('pista-suzuka', fracaoDoIndice('pista-suzuka', indiceDoVertice(22))),
    ).toBe(true);
    expect(
      estaSobViaduto('pista-suzuka', fracaoDoIndice('pista-suzuka', indiceDoVertice(47))),
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

  it('o centro declarado é o vértice compartilhado, nos dois índices declarados', () => {
    for (const [id, viadutos] of Object.entries(VIADUTOS_POR_PISTA)) {
      const t = tracadoDaPista(id);
      for (const v of viadutos) {
        expect(t[v.controleBaixo], `${id} #${v.controleBaixo}`).toEqual(v.centro);
        expect(t[v.controleCima], `${id} #${v.controleCima}`).toEqual(v.centro);
      }
    }
  });
});

/** Ponto dentro do polígono de controle (par-ímpar). */
function dentroDoPoligono(p: { x: number; y: number }, poligono: readonly { x: number; y: number }[]): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const a = poligono[i];
    const b = poligono[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
  }
  return dentro;
}

describe('box: modelo livre e lado (PR 2b)', () => {
  /**
   * O `lado` declarado tem que pôr o box do lado de DENTRO da pista em todas
   * as que o declaram: a cerca de folga não pega um `lado` invertido (do lado
   * de fora costuma sobrar mais espaço). Exceção só com decisão do Marcos.
   *
   * EXCEÇÕES (lista FECHADA, decisão do Marcos em 2026-10-29): pistas cuja pit
   * lane REAL fica por fora (OpenStreetMap), onde o box segue o lado real. Nelas
   * o teste vira o contrário: o box tem que estar FORA.
   */
  const BOX_REAL_POR_FORA: readonly string[] = ['pista-imola', 'pista-montreal'];
  it.each(Object.keys(BOXES_POR_PISTA).map((id) => [id] as const))('%s: o meio do trecho paralelo fica do lado REAL (dentro, salvo exceção)', (id) => {
    const { amostras } = caminhoDoBox(tracadoSuavizado(id), BOXES_POR_PISTA[id]);
    const paralelas = amostras.filter((a) => a.paralelo);
    expect(dentroDoPoligono(paralelas[Math.floor(paralelas.length / 2)].p, tracadoDaPista(id))).toBe(
      !BOX_REAL_POR_FORA.includes(id),
    );
  });

  it.each(
    Object.entries(BOXES_POR_PISTA)
      .filter(([, b]) => b.livre !== undefined)
      .map(([id]) => [id] as const),
  )('%s: o caminho livre é contínuo, nasce e morre sobre a pista, e só as pontas são isentas', (id) => {
    const curva = tracadoSuavizado(id);
    const { amostras } = caminhoDoBox(curva, BOXES_POR_PISTA[id]);
    for (let i = 1; i < amostras.length; i++) {
      const a = amostras[i - 1].p;
      const b = amostras[i].p;
      expect(Math.hypot(b.x - a.x, b.y - a.y), `${id}: salto na amostra ${i}`).toBeLessThan(10);
    }
    // Distância ao SEGMENTO da curva: a junção cai no meio de um, longe dos vértices.
    const aoSegmento = (p: { x: number; y: number }) =>
      Math.min(
        ...curva.map((a, i) => {
          const b = curva[(i + 1) % curva.length];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
          return Math.hypot(p.x - a.x - k * dx, p.y - a.y - k * dy);
        }),
      );
    expect(aoSegmento(amostras[0].p)).toBeLessThan(1e-6);
    expect(aoSegmento(amostras[amostras.length - 1].p)).toBeLessThan(1e-6);
    expect(amostras[0].isencao).not.toBeNull();
    expect(amostras[amostras.length - 1].isencao).not.toBeNull();
    expect(amostras.filter((a) => a.paralelo).every((a) => a.isencao === null)).toBe(true);
  });
});
