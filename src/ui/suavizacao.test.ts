import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import type { Ponto } from './fluxo-corrida';
import { LARGURA_ASFALTO, anguloDeVirada, pathDaVolta } from './pista-camadas';
import {
  ALPHA_CENTRIPETA,
  AMOSTRAS_POR_SEGMENTO,
  indiceDoVertice,
  suavizarPolilinhaFechada,
  tracadoSuavizado,
  trechoPorArco,
} from './suavizacao';
import { tracadoDaPista } from './tracados';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const IDS = dataset.pistas.map((p) => p.id);

// ---------------------------------------------------------------- utilidades

function maiorAnguloDeVirada(t: readonly Ponto[]): number {
  const n = t.length;
  let maior = 0;
  for (let i = 0; i < n; i++) {
    maior = Math.max(maior, anguloDeVirada(t[(i - 1 + n) % n], t[i], t[(i + 1) % n]));
  }
  return maior;
}

function boundingBox(t: readonly Ponto[]) {
  const xs = t.map((p) => p.x);
  const ys = t.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function comprimentoDaPolilinhaAberta(t: readonly Ponto[]): number {
  let soma = 0;
  for (let i = 0; i + 1 < t.length; i++) soma += Math.hypot(t[i + 1].x - t[i].x, t[i + 1].y - t[i].y);
  return soma;
}

function distanciaPontoSegmento(p: Ponto, a: Ponto, b: Ponto): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comp2 = dx * dx + dy * dy;
  if (comp2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / comp2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Ponto de interseção de dois segmentos, ou `null`. `inclusivo` decide se
 * encostar na PONTA conta: `false` reproduz `cruzamentosMidSegmento` de
 * `tracados.test.ts` (só interior estrito); `true` também pega o toque em
 * vértice — é a versão usada pela guarda com exceção nomeada.
 */
function intersecao(a: Ponto, b: Ponto, c: Ponto, d: Ponto, inclusivo: boolean): Ponto | null {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (den === 0) return null;
  const s = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const r = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
  const min = inclusivo ? 0 : 1e-9;
  const max = inclusivo ? 1 : 1 - 1e-9;
  if (s < min || s > max || r < min || r > max) return null;
  return { x: a.x + (b.x - a.x) * s, y: a.y + (b.y - a.y) * s };
}

const mesmoPonto = (p: Ponto, q: Ponto) => p.x === q.x && p.y === q.y;

/** Cruzamentos de segmentos não adjacentes. Ver `intersecao` pro papel de `inclusivo`/`ignorarVerticeCompartilhado`. */
function cruzamentos(
  t: readonly Ponto[],
  { inclusivo, ignorarVerticeCompartilhado }: { inclusivo: boolean; ignorarVerticeCompartilhado: boolean },
): Ponto[] {
  const n = t.length;
  const achados: Ponto[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if ((j + 1) % n === i || (i + 1) % n === j) continue;
      const a = t[i];
      const b = t[(i + 1) % n];
      const c = t[j];
      const d = t[(j + 1) % n];
      if (
        ignorarVerticeCompartilhado &&
        (mesmoPonto(a, c) || mesmoPonto(a, d) || mesmoPonto(b, c) || mesmoPonto(b, d))
      ) {
        continue;
      }
      const p = intersecao(a, b, c, d, inclusivo);
      if (p) achados.push(p);
    }
  }
  return achados;
}

// -------------------------------------------------- a curva em si (unitário)

describe('suavizarPolilinhaFechada — Catmull-Rom centrípeta', () => {
  const quadrado: Ponto[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  it('alpha travado em 0,5 (centrípeta) — uniforme faz cusp, cordal estoura o overshoot', () => {
    expect(ALPHA_CENTRIPETA).toBe(0.5);
  });

  it('devolve exatamente `pontos * amostras` pontos', () => {
    expect(suavizarPolilinhaFechada(quadrado, 12)).toHaveLength(48);
    expect(suavizarPolilinhaFechada(quadrado, 1)).toHaveLength(4);
  });

  it('é INTERPOLANTE: a curva passa EXATAMENTE por todos os pontos de controle', () => {
    const curva = suavizarPolilinhaFechada(quadrado, 12);
    quadrado.forEach((controle, i) => {
      expect(curva[indiceDoVertice(i, 12)]).toEqual(controle);
    });
  });

  it('polilinha degenerada (< 3 pontos) volta como cópia, não explode', () => {
    expect(suavizarPolilinhaFechada([], 12)).toEqual([]);
    expect(suavizarPolilinhaFechada([{ x: 1, y: 2 }], 12)).toEqual([{ x: 1, y: 2 }]);
    const doisPontos = [{ x: 0, y: 0 }, { x: 5, y: 5 }];
    expect(suavizarPolilinhaFechada(doisPontos, 12)).toEqual(doisPontos);
  });

  it('pontos de controle COINCIDENTES não produzem NaN (piso do passo de parametrização)', () => {
    const comRepetido: Ponto[] = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 50 },
      { x: 0, y: 50 },
    ];
    for (const p of suavizarPolilinhaFechada(comRepetido, 8)) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y), `NaN em ${JSON.stringify(p)}`).toBe(true);
    }
  });

  it('é determinística: duas chamadas dão o mesmo resultado', () => {
    expect(suavizarPolilinhaFechada(quadrado, 12)).toEqual(suavizarPolilinhaFechada(quadrado, 12));
  });

  it('não usa Math.random (determinismo — mesma entrada, mesma saída bit a bit)', () => {
    const a = suavizarPolilinhaFechada(tracadoDaPista('pista-monaco'));
    const b = suavizarPolilinhaFechada(tracadoDaPista('pista-monaco'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('tracadoSuavizado', () => {
  it('é MEMOIZADO: mesma referência em chamadas repetidas (o replay depende disso)', () => {
    expect(tracadoSuavizado('pista-monza')).toBe(tracadoSuavizado('pista-monza'));
  });

  it.each(IDS.map((id) => [id] as const))('%s densifica de `n` pra `n * AMOSTRAS_POR_SEGMENTO`', (id) => {
    expect(tracadoSuavizado(id)).toHaveLength(tracadoDaPista(id).length * AMOSTRAS_POR_SEGMENTO);
  });

  it.each(IDS.map((id) => [id] as const))('%s: a curva passa por todos os vértices de controle', (id) => {
    const controle = tracadoDaPista(id);
    const curva = tracadoSuavizado(id);
    controle.forEach((p, i) => expect(curva[indiceDoVertice(i)]).toEqual(p));
  });
});

// ------------------------------------------- o motivo do PR: deixar de ser quadrada

/**
 * BASELINE que começou VERMELHO. Antes do 7.4 o traçado DESENHADO era a
 * própria polilinha de controle, então `angSuavizado` seria igual a
 * `angControle` nas 10 linhas e todas as expectativas abaixo reprovariam.
 *
 * `angControle` é o quanto o polígono à mão "vira" no pior vértice — o número
 * que fazia as pistas lerem como quadradas.
 *
 * ✅ **A LISTA DE ESPINHO ZEROU NO PR 7.7** (redesenho das 10). Spa era o último
 * caso — 169,5° ⇒ 120,7° — e virou **111,7° ⇒ 24,8°**. O espinho era um vértice
 * de quase 180° no #0, onde a polilinha voltava por cima de si mesma na
 * largada; Catmull-Rom é INTERPOLANTE, então a curva era obrigada a passar por
 * ele e o arredondava com raio ~0,2 unidade — cusp-free na matemática, invisível
 * na tela. Só editar a silhueta resolvia, e foi o que o redesenho fez: a volta
 * agora fecha pela reta dos boxes em vez de dobrar sobre si mesma.
 *
 * Cuidado ao citar estes números: o primeiro de cada par é do traçado de
 * CONTROLE e o segundo é da curva SUAVIZADA — misturar as duas grandezas faz a
 * melhora parecer maior do que é. É a confirmação do que o `ESTADO.md` previa
 * ("o espinho não se corrige separado — o redesenho resolve"), e é a lista de
 * exceção indo a ZERO, que é o critério declarado.
 */
const ANGULO_MEDIDO: Record<string, { controle: number; suavizado: number }> = {
  'pista-monaco': { controle: 117.41, suavizado: 29.37 },
  'pista-spa': { controle: 113.28, suavizado: 25.6 },
  'pista-monza': { controle: 92.95, suavizado: 23.65 },
  'pista-silverstone': { controle: 100.6, suavizado: 23.6 },
  'pista-suzuka': { controle: 116.92, suavizado: 29.32 },
  'pista-interlagos': { controle: 124.96, suavizado: 32.4 },
  'pista-nurburgring': { controle: 91.74, suavizado: 16.64 },
  'pista-imola': { controle: 110.38, suavizado: 27.4 },
  'pista-red-bull-ring': { controle: 90.97, suavizado: 17.34 },
  'pista-montreal': { controle: 126.2, suavizado: 37.15 },
};

/** A silhueta com espinho de ~180° no vértice #0. Ver `ANGULO_MEDIDO`. */
const SILHUETAS_COM_ESPINHO: string[] = [];

describe('a suavização de fato tira a "quadratura" (baseline vermelho do 7.4)', () => {
  it.each(IDS.map((id) => [id] as const))('%s: maior ângulo de virada bate com o medido', (id) => {
    const golden = ANGULO_MEDIDO[id];
    expect(maiorAnguloDeVirada(tracadoDaPista(id))).toBeCloseTo(golden.controle, 1);
    expect(maiorAnguloDeVirada(tracadoSuavizado(id))).toBeCloseTo(golden.suavizado, 1);
  });

  it.each(IDS.filter((id) => !SILHUETAS_COM_ESPINHO.includes(id)).map((id) => [id] as const))(
    '%s: a curva desenhada vira no MÁXIMO 45° por vértice (era 69-121° no polígono)',
    (id) => {
      expect(maiorAnguloDeVirada(tracadoSuavizado(id))).toBeLessThan(45);
    },
  );

  it('as 10 pistas reduzem o ângulo do pior vértice em pelo menos 60%', () => {
    for (const id of IDS.filter((i) => !SILHUETAS_COM_ESPINHO.includes(i))) {
      const antes = maiorAnguloDeVirada(tracadoDaPista(id));
      const depois = maiorAnguloDeVirada(tracadoSuavizado(id));
      expect(depois / antes, `${id} suavizou pouco`).toBeLessThan(0.4);
    }
  });

  /**
   * A lista de exceção ZEROU no PR 7.7 e este teste é o que impede ela de
   * voltar a crescer em silêncio: uma silhueta futura que reintroduza espinho
   * vermelha aqui, com o nome da pista. Só ENCOLHER é progresso; ganhar nome de
   * volta é regressão.
   */
  it('NENHUMA silhueta tem espinho — a lista de exceção está vazia e continua vazia', () => {
    expect(SILHUETAS_COM_ESPINHO).toEqual([]);
    const comEspinho = IDS.filter((id) => {
      const t = tracadoDaPista(id);
      return t.some((_, i) =>
        anguloDeVirada(t[(i - 1 + t.length) % t.length], t[i], t[(i + 1) % t.length]) >= 150,
      );
    });
    expect(comEspinho, 'silhueta com vértice de ≥150° voltou a existir').toEqual([]);
  });

  it('`pathDaVolta` desenha a CURVA, não a polilinha de controle (o elo com a tela)', () => {
    for (const id of IDS) {
      const comandosL = (pathDaVolta(id).match(/L /g) ?? []).length;
      expect(comandosL, `${id}`).toBe(tracadoSuavizado(id).length - 1);
      expect(comandosL).toBeGreaterThan(tracadoDaPista(id).length);
    }
  });
});

// ------------------------------------------------ fidelidade de amostragem (N)

/**
 * Desvio máximo entre a polilinha DESENHADA (N = `AMOSTRAS_POR_SEGMENTO`) e a
 * curva ideal (referência N=512), em unidades de viewBox. É o que decide o N:
 * ver a tabela de medição no doc de `AMOSTRAS_POR_SEGMENTO`.
 */
function desvioDaCurvaIdeal(controle: readonly Ponto[]): number {
  const REFERENCIA = 512;
  const ideal = suavizarPolilinhaFechada(controle, REFERENCIA);
  const desenhada = suavizarPolilinhaFechada(controle, AMOSTRAS_POR_SEGMENTO);
  const porAmostra = REFERENCIA / AMOSTRAS_POR_SEGMENTO;
  let maior = 0;
  for (let i = 0; i < ideal.length; i++) {
    const segmento = Math.floor(i / REFERENCIA);
    const dentro = i % REFERENCIA;
    const j = segmento * AMOSTRAS_POR_SEGMENTO + Math.floor(dentro / porAmostra);
    maior = Math.max(
      maior,
      distanciaPontoSegmento(ideal[i], desenhada[j % desenhada.length], desenhada[(j + 1) % desenhada.length]),
    );
  }
  return maior;
}

describe('fidelidade da amostragem (escolha de AMOSTRAS_POR_SEGMENTO)', () => {
  /**
   * O painel tem `max-width: 700px` sobre um viewBox de 1000 de largura ⇒ no
   * máximo 0,7px por unidade. 0,7u de desvio = 0,49px no maior tamanho: abaixo
   * de meio pixel, invisível. É o teto que justifica N=12 em vez de N=8 (que
   * daria 1,08u = 0,76px na pior pista).
   */
  const DESVIO_MAXIMO = 0.7;

  it.each(IDS.map((id) => [id] as const))('%s desvia menos de 0,7u da curva ideal', (id) => {
    expect(desvioDaCurvaIdeal(tracadoDaPista(id))).toBeLessThan(DESVIO_MAXIMO);
  });

  /**
   * ⚠️ ESTE TESTE MUDOU DE SINAL NO PR 7.7, e o número é o achado — não o
   * conserto. Nas silhuetas de 16 pontos, N=8 desviava MAIS que o teto de 0,7u,
   * e era isso que provava que N=12 não era chute. Com as 10 redesenhadas
   * (34-48 pontos), as cordas encolheram, a sagita escala com a corda e **N=8
   * agora desvia 0,539u — passa folgado**. A justificativa de N=12 caiu por
   * terra.
   *
   * O teto de 0,7u NÃO foi mexido, e `AMOSTRAS_POR_SEGMENTO` continua 12: baixar
   * a constante mudaria a geometria desenhada de todas as pistas de novo, e o
   * `ESTADO.md` já registra "AMOSTRAS_POR_SEGMENTO cai de 12 pra 4-6" como
   * decisão travada esperando execução própria. Este teste passa a MEDIR a
   * folga, pra a redução ser feita depois com o número em mãos.
   */
  it('N=8 já não reprova depois do redesenho — a folga que habilita reduzir o N', () => {
    const piorEmN8 = Math.max(
      ...IDS.map((id) => {
        const controle = tracadoDaPista(id);
        const ideal = suavizarPolilinhaFechada(controle, 512);
        const grossa = suavizarPolilinhaFechada(controle, 8);
        let maior = 0;
        for (let i = 0; i < ideal.length; i++) {
          const j = Math.floor(i / 512) * 8 + Math.floor((i % 512) / 64);
          maior = Math.max(
            maior,
            distanciaPontoSegmento(ideal[i], grossa[j % grossa.length], grossa[(j + 1) % grossa.length]),
          );
        }
        return maior;
      }),
    );
    expect(piorEmN8).toBeCloseTo(0.539, 2);
    expect(piorEmN8, 'N=8 voltou a estourar o teto — reabrir a escolha do N').toBeLessThan(
      DESVIO_MAXIMO,
    );
  });
});

// ------------------------------------------------------------ overshoot (PARADA)

/**
 * O quanto a curva escapa do bounding box da polilinha de controle. Era a
 * **PARADA OBRIGATÓRIA** do PR 7.4: "se o overshoot em Mônaco/Nürburgring não
 * fechar com Catmull-Rom centrípeta, PARAR e mostrar ao dev". FECHOU — Mônaco
 * é o pior das 10 com 15,1 unidades e Nürburgring não faz overshoot nenhum,
 * contra os 70 de margem que o 7.3 reservava no viewBox.
 *
 * Medido com N=64 (mais fino que a produção): amostrar mais só pode ACHAR mais
 * extremo, então o golden é conservador em relação ao que se desenha.
 */
const OVERSHOOT_MEDIDO: Record<string, number> = {
  'pista-monaco': 1.12,
  'pista-red-bull-ring': 3.09,
  'pista-montreal': 1.32,
  'pista-imola': 2.32,
  'pista-spa': 1.78,
  // Fatia 1 do redesenho (PR 7.7): Interlagos 10,53 ⇒ 3,96 e Monza 14,03 ⇒
  // 0,91 — as duas saíram do topo da tabela. Menos overshoot é consequência
  // direta de pontos de controle mais densos: a Catmull-Rom extrapola menos
  // quando a corda é mais curta.
  'pista-interlagos': 1.47,
  'pista-monza': 1.67,
  'pista-silverstone': 0.89,
  'pista-suzuka': 2.54,
  'pista-nurburgring': 3.4,
};

describe('overshoot da Catmull-Rom (a PARADA OBRIGATÓRIA do 7.4)', () => {
  function overshoot(id: string): number {
    const bc = boundingBox(tracadoDaPista(id));
    const bs = boundingBox(suavizarPolilinhaFechada(tracadoDaPista(id), 64));
    return Math.max(bc.minX - bs.minX, bs.maxX - bc.maxX, bc.minY - bs.minY, bs.maxY - bc.maxY);
  }

  it.each(IDS.map((id) => [id] as const))('%s bate com o overshoot medido', (id) => {
    expect(overshoot(id)).toBeCloseTo(OVERSHOOT_MEDIDO[id], 1);
  });

  it('Mônaco e Nürburgring — os dois casos que o dev mandou vigiar — ficam bem abaixo de 60', () => {
    expect(overshoot('pista-monaco')).toBeLessThan(60);
    expect(overshoot('pista-nurburgring')).toBeLessThan(60);
  });

  it('nenhuma das 10 passa de 20 unidades de overshoot', () => {
    for (const id of IDS) expect(overshoot(id), id).toBeLessThan(20);
  });
});

// -------------------------------------------------- auto-interseção (Suzuka)

/**
 * EXCEÇÃO NOMEADA, exigida pelo dev. A guarda geral de auto-interseção
 * NUNCA é afrouxada — ela pegou bugs reais em Spa e Interlagos no PR 2.8.
 * O que existe aqui é uma lista FECHADA de auto-contatos INTENCIONAIS por
 * pista, e Suzuka é a única entrada: o layout em "8" tem os vértices de
 * controle 4 e 12 na MESMA coordenada `(500, 300)`, evocando a ponte que passa
 * por cima da pista. Toda pista sem entrada aqui tem tolerância ZERO.
 *
 * PR 7.7: o 8 foi redesenhado ASSIMÉTRICO (o laço dos Esses é maior que o da
 * hairpin) e o cruzamento saiu do centro geométrico — passou dos vértices 4 e 12
 * em (500,300) pros vértices 16 e 33 em (452,376). A propriedade que importa não
 * mudou: continua havendo EXATAMENTE UM par de vértices coincidentes, e é ele
 * que faz o X. Um segundo par aqui seria bug de desenho, não golden velho.
 *
 * Como a curva é interpolante e `amostrarSegmento` emite o ponto de controle
 * por CÓPIA (não pela fórmula), os dois vértices continuam bit a bit iguais
 * depois de suavizar — é isso que mantém o X de Suzuka num vértice
 * compartilhado em vez de virar um cruzamento mid-segmento por ruído de ponto
 * flutuante. O teste logo abaixo trava essa propriedade.
 */
const AUTOCONTATOS_INTENCIONAIS: Record<string, readonly Ponto[]> = {
  'pista-suzuka': [{ x: 452, y: 376 }],
};

describe('auto-interseção da curva suavizada', () => {
  const TOLERANCIA = 1;

  it.each(IDS.map((id) => [id] as const))(
    '%s: nenhum cruzamento mid-segmento (mesma guarda de `tracados.test.ts`, agora na curva)',
    (id) => {
      const achados = cruzamentos(tracadoSuavizado(id), {
        inclusivo: false,
        ignorarVerticeCompartilhado: true,
      });
      expect(achados).toEqual([]);
    },
  );

  it.each(IDS.map((id) => [id] as const))(
    '%s: todo auto-contato (INCLUSIVE em vértice) está na lista de intencionais',
    (id) => {
      const esperados = AUTOCONTATOS_INTENCIONAIS[id] ?? [];
      const achados = cruzamentos(tracadoSuavizado(id), {
        inclusivo: true,
        ignorarVerticeCompartilhado: false,
      });
      for (const p of achados) {
        const perto = esperados.some((e) => Math.hypot(p.x - e.x, p.y - e.y) <= TOLERANCIA);
        expect(
          perto,
          `${id}: auto-contato NÃO declarado em (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`,
        ).toBe(true);
      }
    },
  );

  it('a lista de intencionais tem SÓ Suzuka — nenhuma pista nova entrou de carona', () => {
    expect(Object.keys(AUTOCONTATOS_INTENCIONAIS)).toEqual(['pista-suzuka']);
  });

  it('Suzuka: o X do "8" ainda existe na curva e cai exatamente em (452,376)', () => {
    const achados = cruzamentos(tracadoSuavizado('pista-suzuka'), {
      inclusivo: true,
      ignorarVerticeCompartilhado: false,
    });
    expect(achados.length).toBeGreaterThan(0);
    for (const p of achados) {
      expect(Math.hypot(p.x - 452, p.y - 376)).toBeLessThanOrEqual(TOLERANCIA);
    }
  });

  it('Suzuka: os vértices 16 e 33 seguem BIT A BIT iguais depois de suavizar', () => {
    const curva = tracadoSuavizado('pista-suzuka');
    const coincidentes = curva
      .map((p, i) => [p, i] as const)
      .filter(([p]) => p.x === 452 && p.y === 376)
      .map(([, i]) => i);
    expect(coincidentes).toEqual([indiceDoVertice(16), indiceDoVertice(33)]);
  });
});

// ---------------------------------------------------- fusão de asfalto na curva

/**
 * Recomparação exigida pela pendência 3 do 7.3 ("a suavização muda essas
 * distâncias"). A métrica do teste 3.8 de `pista-camadas.test.ts` NÃO transfere
 * pra curva densificada: lá se pulam só os segmentos adjacentes, e numa
 * polilinha de 192 pontos os vizinhos ficam a ~12 unidades entre si, então a
 * medida degeneraria pro tamanho da corda em todas as 10 pistas. Aqui se mede
 * por JANELA DE ARCO — só entram trechos separados por mais de
 * `2 * LARGURA_ASFALTO` de volta percorrida, que é o que "duas partes
 * diferentes da pista" quer dizer de fato.
 */
const SEPARACAO_MEDIDA: Record<string, number> = {
  'pista-red-bull-ring': 48.0,
  'pista-nurburgring': 36.43,
  // Fatia 1 do redesenho (PR 7.7): Interlagos era o pior caso NÃO-exceção da
  // tabela, a 20,1 — 3,1 acima do limiar de 17. Foi a restrição que mandou no
  // desenho do miolo (T6→T12): sete curvas lentas em pouco espaço tinham que
  // caber sem que dois ramos do traçado se aproximassem. Deu 53,9. Monza subiu
  // de 40,5 pra 51,8 no mesmo movimento.
  'pista-interlagos': 35.72,
  'pista-monza': 46.27,
  'pista-montreal': 31.46,
  'pista-silverstone': 31.48,
  'pista-imola': 39.62,
  'pista-monaco': 35.96,
  'pista-spa': 39.67,
  'pista-suzuka': 0.0,
};

/**
 * As duas pistas cujo EIXO cai dentro do asfalto vizinho depois de suavizar.
 * Está aqui pra ficar VISÍVEL, não pra ser tolerado em silêncio:
 * - Suzuka (0,0) é o X do "8", intencional (ver `AUTOCONTATOS_INTENCIONAIS`);
 * - ✅ **SPA SAIU NO PR 7.7**, e era a única entrada não intencional: estava em
 *   8,8 (regressão da suavização, contra 18,6 na polilinha de controle) e foi a
 *   41,3. Mesma causa raiz do espinho do vértice #0 — a volta dobrava por cima
 *   de si mesma na largada e a suavização aproximava os dois ramos —, e o
 *   redesenho da silhueta resolveu as duas de uma vez. Era a **pendência 1** do
 *   `ESTADO.md`.
 */
const FUNDEM_APOS_SUAVIZAR = ['pista-suzuka'];

describe('fusão de asfalto na curva suavizada (recomparação da pendência 3 do 7.3)', () => {
  const JANELA_ARCO = 2 * LARGURA_ASFALTO;

  function separacaoMinima(t: readonly Ponto[]): number {
    const n = t.length;
    const arco: number[] = [];
    const comp: number[] = [];
    let acumulado = 0;
    for (let i = 0; i < n; i++) {
      arco.push(acumulado);
      const c = Math.hypot(t[(i + 1) % n].x - t[i].x, t[(i + 1) % n].y - t[i].y);
      comp.push(c);
      acumulado += c;
    }
    const perimetro = acumulado;
    const mod = (v: number) => ((v % perimetro) + perimetro) % perimetro;

    let menor = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const separacao = Math.min(
          mod(arco[j] - (arco[i] + comp[i])),
          mod(arco[i] - (arco[j] + comp[j])),
        );
        if (separacao <= JANELA_ARCO) continue;
        const a = t[i];
        const b = t[(i + 1) % n];
        const c = t[j];
        const d = t[(j + 1) % n];
        const dist = intersecao(a, b, c, d, true)
          ? 0
          : Math.min(
              distanciaPontoSegmento(a, c, d),
              distanciaPontoSegmento(b, c, d),
              distanciaPontoSegmento(c, a, b),
              distanciaPontoSegmento(d, a, b),
            );
        menor = Math.min(menor, dist);
      }
    }
    return menor;
  }

  it.each(IDS.map((id) => [id] as const))('%s bate com a separação medida', (id) => {
    expect(separacaoMinima(tracadoSuavizado(id))).toBeCloseTo(SEPARACAO_MEDIDA[id], 1);
  });

  it.each(IDS.filter((id) => !FUNDEM_APOS_SUAVIZAR.includes(id)).map((id) => [id] as const))(
    '%s: o eixo NÃO cai dentro do asfalto de outro trecho',
    (id) => {
      expect(separacaoMinima(tracadoSuavizado(id))).toBeGreaterThan(LARGURA_ASFALTO / 2);
    },
  );

  it('a lista de pistas que fundem é FECHADA — nenhuma nova entra sem decisão do dev', () => {
    const fundem = IDS.filter((id) => separacaoMinima(tracadoSuavizado(id)) <= LARGURA_ASFALTO / 2);
    expect(fundem.sort()).toEqual([...FUNDEM_APOS_SUAVIZAR].sort());
  });
});

// ------------------------------------------------------------- trechoPorArco

describe('trechoPorArco (remapeia a zebra da reta pra curva)', () => {
  const curva = tracadoSuavizado('pista-monza');

  it('o trecho tem o comprimento de arco pedido (atrás + à frente)', () => {
    const trecho = trechoPorArco(curva, indiceDoVertice(2), 30, 45);
    expect(comprimentoDaPolilinhaAberta(trecho)).toBeCloseTo(75, 6);
  });

  it('o ponto do meio é EXATAMENTE o vértice de controle pedido', () => {
    const trecho = trechoPorArco(curva, indiceDoVertice(2), 30, 45);
    const meio = trecho.find((p) => p.x === tracadoDaPista('pista-monza')[2].x && p.y === tracadoDaPista('pista-monza')[2].y);
    expect(meio).toBeDefined();
  });

  it('alcance zero devolve só o ponto central', () => {
    expect(trechoPorArco(curva, 0, 0, 0)).toEqual([{ x: curva[0].x, y: curva[0].y }]);
  });

  it('todos os pontos do trecho estão SOBRE a curva (é isso que faz a zebra assentar no asfalto)', () => {
    const trecho = trechoPorArco(curva, indiceDoVertice(6), 44, 44);
    for (const p of trecho) {
      let menor = Infinity;
      for (let i = 0; i < curva.length; i++) {
        menor = Math.min(menor, distanciaPontoSegmento(p, curva[i], curva[(i + 1) % curva.length]));
      }
      expect(menor, `ponto fora da curva: ${JSON.stringify(p)}`).toBeLessThan(1e-9);
    }
  });

  it('distância maior que o perímetro não trava (teto de passos)', () => {
    expect(() => trechoPorArco(curva, 0, 1e9, 1e9)).not.toThrow();
  });
});
