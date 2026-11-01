/**
 * Medição de FOLGA entre trechos não adjacentes do traçado (PR 2b, redesenho
 * das pistas). Responde: onde dois trechos diferentes da pista ficam tão perto
 * que as faixas desenhadas se fundem e as zebras se misturam?
 *
 * Mede a geometria de PRODUÇÃO, não uma cópia: a curva é a de
 * `suavizarPolilinhaFechada` (a mesma que `pathDaVolta` desenha e que
 * `pontoNoTracado` usa pra pôr os carros) e as zebras são as de
 * `trechosDeZebra` recortadas na curva por `trechoPorArco`, como em
 * `pathsDeZebraDaPista`. Recebe a polilinha de CONTROLE como argumento pra
 * poder medir também uma proposta de traçado antes de ela entrar em
 * `tracados.ts`.
 *
 * LARGURA RENDERIZADA, por ponto da curva: a pilha de `CAMADAS_PISTA` é
 * pintada por camada sobre a volta inteira, então entre dois trechos vizinhos
 * o que separa um do outro é a camada mais externa de MARCAÇÃO que cada um
 * desenha: a zebra (58) onde há zebra, o limite (42, asfalto + borda) no
 * resto. Terreno, escape e muro são entorno, e é o muro que aparece no vão.
 *
 *   folga = distância entre eixos − (marcação_a / 2 + marcação_b / 2)
 *
 * Folga negativa = as marcações se sobrepõem. Folga entre 0 e
 * `VAO_MINIMO_U` = o vão existe mas some a 360px (regra dos 360px: faixa
 * visível >= 1px, mesmo critério de `pista-camadas.test.ts`).
 *
 * O QUE É "NÃO ADJACENTE", medido em ARCO (regra do dev: guarda geométrica
 * mede em arco, nunca em índice). Num grampo de raio r os dois ramos ficam a
 * 2r um do outro e a πr de arco: distância d com arco <= π·d/2 é a própria
 * curva dobrando, e a zebra interna de um grampo se tocar é legítimo. Por
 * isso o par só conta se o arco entre eles passa de π/2 × a soma das meias
 * marcações (`fatorArcoAdjacente`). Mais longe que isso no arco e perto no
 * espaço, são dois trechos diferentes colados.
 *
 * Passar dessa janela ainda não basta pra serem trechos DIFERENTES: o lado
 * interno de um grampo com pernas ou de uma chicane em degrau fica fora dela
 * e é a mesma curva. A classificação `escopo` separa os dois por arco contra
 * 2π × a soma das meias marcações (uma volta inteira de um círculo daquele
 * tamanho, que curva isolada nenhuma percorre). Medido nas 10 pistas de
 * 2026-10-29, nenhuma zona cai perto do corte: a maior zona "mesma curva" tem
 * arco 213 e a menor "trechos distintos" tem 994.
 *
 * CRUZAMENTO REAL = os eixos se intersectam (distância 0). Só Suzuka tem, e
 * é o viaduto. O resto é PROXIMIDADE.
 */

import type { Ponto, TracadoImutavel } from '../src/ui/fluxo-corrida';
import {
  CAMADAS_PISTA,
  LARGURA_SVG_MINIMA_PX,
  VIEWBOX_LARGURA,
  trechosDeZebra,
} from '../src/ui/pista-camadas';
import {
  AMOSTRAS_POR_SEGMENTO,
  indiceDoVertice,
  suavizarPolilinhaFechada,
} from '../src/ui/suavizacao';

function larguraDaCamada(id: string): number {
  const camada = CAMADAS_PISTA.find((c) => c.id === id);
  if (camada === undefined) throw new Error(`folga-pistas: camada "${id}" sumiu de CAMADAS_PISTA`);
  return camada.largura;
}

export const LARGURA_ZEBRA = larguraDaCamada('zebra-a');
export const LARGURA_LIMITE = larguraDaCamada('limite');
/** px por unidade do viewBox na largura mínima do projeto (360px de viewport ⇒ 320px de SVG). */
export const ESCALA_360 = LARGURA_SVG_MINIMA_PX / VIEWBOX_LARGURA;
/** Vão que ainda aparece a 360px: 1px, o mesmo piso da regra dos 360px. */
export const VAO_MINIMO_U = 1 / ESCALA_360;
/** π/2: arco de um grampo semicircular sobre a distância entre seus ramos. */
const FATOR_ARCO_ADJACENTE = Math.PI / 2;
/** 2π: acima disso (× a soma das meias marcações) os dois pontos são trechos distintos da volta. */
const FATOR_ARCO_DISTINTO = 2 * Math.PI;

export interface ParMaisApertado {
  /** Distância entre os eixos dos dois trechos, em unidades do viewBox. */
  readonly distancia: number;
  /** Soma das meias marcações dos dois trechos (o que a distância precisa vencer). */
  readonly exigido: number;
  readonly folga: number;
  readonly folgaPx360: number;
  readonly tipo: 'cruzamento' | 'proximidade';
  /** `distintos` = dois trechos diferentes da volta; `mesma-curva` = lado interno de grampo/chicane. */
  readonly escopo: 'distintos' | 'mesma-curva';
  /** Ponto médio de cada trecho, pra localizar no desenho. */
  readonly a: Ponto;
  readonly b: Ponto;
  /** Vértice de CONTROLE de onde cada trecho sai (índice em `tracados.ts`). */
  readonly controleA: number;
  readonly controleB: number;
  readonly zebraA: boolean;
  readonly zebraB: boolean;
  /** Arco entre os dois, pelo lado mais curto da volta. */
  readonly arcoEntre: number;
}

export interface MedicaoFolga {
  readonly pior: ParMaisApertado;
  /** Menor folga entre trechos DISTINTOS (fora os ignorados); `undefined` se a pista não tem par distinto. */
  readonly piorDistintos: ParMaisApertado | undefined;
  /** Menor folga do lado interno de uma mesma curva. */
  readonly piorMesmaCurva: ParMaisApertado | undefined;
  /** Um par por zona (par de vértices de controle) com folga abaixo de `VAO_MINIMO_U`, do pior pro melhor. */
  readonly zonas: readonly ParMaisApertado[];
}

function distanciaPontoSegmento(p: Ponto, a: Ponto, b: Ponto): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const comp2 = dx * dx + dy * dy;
  if (comp2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / comp2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function seIntersectam(a: Ponto, b: Ponto, c: Ponto, d: Ponto): boolean {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (den === 0) return false;
  const s = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const r = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
  return s >= 0 && s <= 1 && r >= 0 && r <= 1;
}

function distanciaSegmentos(a: Ponto, b: Ponto, c: Ponto, d: Ponto): number {
  if (seIntersectam(a, b, c, d)) return 0;
  return Math.min(
    distanciaPontoSegmento(a, c, d),
    distanciaPontoSegmento(b, c, d),
    distanciaPontoSegmento(c, a, b),
    distanciaPontoSegmento(d, a, b),
  );
}

/** Máscara "este ponto da curva está dentro de uma zebra", com o mesmo recorte de `pathsDeZebraDaPista`. */
function mascaraDeZebra(controle: TracadoImutavel, curva: readonly Ponto[]): boolean[] {
  const n = curva.length;
  const arco: number[] = [0];
  for (let i = 1; i < n; i++)
    arco.push(arco[i - 1] + Math.hypot(curva[i].x - curva[i - 1].x, curva[i].y - curva[i - 1].y));
  const perimetro =
    arco[n - 1] + Math.hypot(curva[0].x - curva[n - 1].x, curva[0].y - curva[n - 1].y);
  const mascara = new Array<boolean>(n).fill(false);
  for (const trecho of trechosDeZebra(controle)) {
    // Mesma extensão em arco que `trechoPorArco` recorta em `pathsDeZebraDaPista`.
    const centro = indiceDoVertice(trecho.indice);
    for (let i = 0; i < n; i++) {
      const delta = (((arco[i] - arco[centro]) % perimetro) + perimetro) % perimetro;
      if (delta <= trecho.alcanceFrente || perimetro - delta <= trecho.alcanceTras)
        mascara[i] = true;
    }
  }
  return mascara;
}

/**
 * Mede a folga de um traçado de CONTROLE (como os de `tracados.ts`).
 * `ignorar(a, b)` tira da medição o par cujos pontos médios são `a` e `b` —
 * existe pra o vão de uma PONTE, onde os dois trechos se sobrepõem de
 * propósito (ver `dentroDoViaduto`).
 */
export function medirFolga(
  controle: TracadoImutavel,
  ignorar: (a: Ponto, b: Ponto) => boolean = () => false,
): MedicaoFolga {
  const curva = suavizarPolilinhaFechada(controle);
  const n = curva.length;
  const zebra = mascaraDeZebra(controle, curva);
  const arco: number[] = [];
  const comp: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < n; i++) {
    arco.push(acumulado);
    const c = Math.hypot(curva[(i + 1) % n].x - curva[i].x, curva[(i + 1) % n].y - curva[i].y);
    comp.push(c);
    acumulado += c;
  }
  const perimetro = acumulado;
  const mod = (v: number) => ((v % perimetro) + perimetro) % perimetro;
  const meia = (i: number) => (zebra[i] || zebra[(i + 1) % n] ? LARGURA_ZEBRA : LARGURA_LIMITE) / 2;

  const porZona = new Map<string, ParMaisApertado>();
  let pior: ParMaisApertado | undefined;
  const piorPorEscopo: Partial<Record<ParMaisApertado['escopo'], ParMaisApertado>> = {};
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const arcoEntre = Math.min(
        mod(arco[j] - (arco[i] + comp[i])),
        mod(arco[i] - (arco[j] + comp[j])),
      );
      const exigido = meia(i) + meia(j);
      if (arcoEntre <= FATOR_ARCO_ADJACENTE * exigido) continue;
      const a0 = curva[i];
      const a1 = curva[(i + 1) % n];
      const b0 = curva[j];
      const b1 = curva[(j + 1) % n];
      const distancia = distanciaSegmentos(a0, a1, b0, b1);
      const folga = distancia - exigido;
      const escopo = arcoEntre > FATOR_ARCO_DISTINTO * exigido ? 'distintos' : 'mesma-curva';
      const controleA = Math.floor(i / AMOSTRAS_POR_SEGMENTO);
      const controleB = Math.floor(j / AMOSTRAS_POR_SEGMENTO);
      const meioA = { x: (a0.x + a1.x) / 2, y: (a0.y + a1.y) / 2 };
      const meioB = { x: (b0.x + b1.x) / 2, y: (b0.y + b1.y) / 2 };
      if (ignorar(meioA, meioB)) continue;
      const atualDoEscopo = piorPorEscopo[escopo];
      if (atualDoEscopo !== undefined && folga >= atualDoEscopo.folga && folga >= VAO_MINIMO_U)
        continue;
      const par: ParMaisApertado = {
        distancia,
        exigido,
        folga,
        folgaPx360: folga * ESCALA_360,
        tipo: distancia === 0 ? 'cruzamento' : 'proximidade',
        escopo,
        a: meioA,
        b: meioB,
        controleA,
        controleB,
        zebraA: meia(i) * 2 === LARGURA_ZEBRA,
        zebraB: meia(j) * 2 === LARGURA_ZEBRA,
        arcoEntre,
      };
      if (pior === undefined || folga < pior.folga) pior = par;
      if (atualDoEscopo === undefined || folga < atualDoEscopo.folga) piorPorEscopo[escopo] = par;
      if (folga < VAO_MINIMO_U) {
        const chave = `${par.controleA}-${par.controleB}`;
        const atual = porZona.get(chave);
        if (atual === undefined || folga < atual.folga) porZona.set(chave, par);
      }
    }
  }
  if (pior === undefined) throw new Error('folga-pistas: traçado sem nenhum par não adjacente');
  return {
    pior,
    piorDistintos: piorPorEscopo.distintos,
    piorMesmaCurva: piorPorEscopo['mesma-curva'],
    zonas: [...porZona.values()].sort((x, y) => x.folga - y.folga),
  };
}

/** Largura do escape: a camada que a PONTE usa como borda de recorte sobre o trecho de baixo. */
export const LARGURA_ESCAPE = CAMADAS_PISTA.find((c) => c.id === 'escape')?.largura ?? Number.NaN;

/**
 * Isenção LITERAL de um viaduto: o par só sai da medição se os DOIS pontos
 * caem no círculo de raio `raio` em volta do ponto de cruzamento `centro`. Um
 * segundo cruzamento em outro lugar da mesma pista continua reprovando.
 * O raio padrão é a largura do escape: meio escape do trecho de baixo, mais o
 * meio escape da própria ponte — vale pra cruzamento perto de 90°.
 */
export function dentroDoViaduto(
  centro: Ponto,
  raio: number = LARGURA_ESCAPE,
): (a: Ponto, b: Ponto) => boolean {
  return (a, b) =>
    Math.hypot(a.x - centro.x, a.y - centro.y) <= raio &&
    Math.hypot(b.x - centro.x, b.y - centro.y) <= raio;
}

export interface MedicaoBox {
  /** Menor folga da pit lane contra a pista (onde vale), em u; `exigido` já descontado. */
  readonly folga: number;
  readonly folgaPx360: number;
  readonly onde: Ponto;
  readonly contra: Ponto;
  /** `paralelo` = trecho no afastamento cheio (vale contra a pista inteira); `rampa` = só contra a pista fora da janela. */
  readonly trecho: 'paralelo' | 'rampa';
}

/**
 * Folga da PIT LANE declarada contra a pista. A pit lane chega da produção já
 * amostrada (`amostras`), cada ponto marcado como `paralelo` (afastamento
 * cheio) ou rampa. Regras:
 * - no trecho PARALELO ela não encosta em nada, nem na própria reta: a
 *   distância a qualquer ponto da pista vence `larguraBox/2 + marcação/2 + vão`;
 * - na RAMPA ela nasce da pista, então a janela de arco `[inicio, fim]` da
 *   pista, alargada em `rampa` pra cada lado (logo antes da entrada e logo
 *   depois da saída a pit lane ainda está colada na pista), é isenta, e o
 *   resto da volta não.
 * - MODELO LIVRE (amostras com `largura`/`isencao`): cada amostra é medida com a
 *   própria largura, e só a ponta de cada caminho livre perto da junção é
 *   isenta, e só contra o arco da pista em volta da junção (`isencao`).
 */
export function medirFolgaDoBox(
  controle: TracadoImutavel,
  amostras: readonly {
    readonly p: Ponto;
    readonly paralelo: boolean;
    readonly largura?: number;
    readonly isencao?: { readonly inicio: number; readonly fim: number } | null;
  }[],
  janela: { readonly inicio: number; readonly fim: number },
  larguraBox: number,
  rampa: number,
): MedicaoBox {
  const curva = suavizarPolilinhaFechada(controle);
  const n = curva.length;
  const zebra = mascaraDeZebra(controle, curva);
  const arco: number[] = [0];
  for (let i = 1; i < n; i++)
    arco.push(arco[i - 1] + Math.hypot(curva[i].x - curva[i - 1].x, curva[i].y - curva[i - 1].y));
  const perimetro =
    arco[n - 1] + Math.hypot(curva[0].x - curva[n - 1].x, curva[0].y - curva[n - 1].y);
  const ini = janela.inicio - rampa;
  const fim = janela.fim + rampa;
  const dentro = (i: number, de: number, ate: number) =>
    [arco[i] - perimetro, arco[i], arco[i] + perimetro].some((s) => s >= de && s <= ate);
  let melhor: MedicaoBox | undefined;
  for (const { p, paralelo, largura, isencao } of amostras) {
    // Modelo livre: a amostra traz a própria isenção (`null` = nenhuma); sem
    // ela, vale a regra das rampas (paralelo nada, rampa a janela alargada).
    const isenta =
      isencao !== undefined
        ? isencao === null
          ? () => false
          : (i: number) => dentro(i, isencao.inicio, isencao.fim)
        : paralelo
          ? () => false
          : (i: number) => dentro(i, ini, fim);
    for (let i = 0; i < n; i++) {
      if (isenta(i) || isenta((i + 1) % n)) continue;
      const a = curva[i];
      const b = curva[(i + 1) % n];
      const meiaPista = (zebra[i] || zebra[(i + 1) % n] ? LARGURA_ZEBRA : LARGURA_LIMITE) / 2;
      const folga = distanciaPontoSegmento(p, a, b) - ((largura ?? larguraBox) / 2 + meiaPista);
      if (melhor === undefined || folga < melhor.folga) {
        melhor = {
          folga,
          folgaPx360: folga * ESCALA_360,
          onde: p,
          contra: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          trecho: paralelo ? 'paralelo' : 'rampa',
        };
      }
    }
  }
  if (melhor === undefined) throw new Error('folga-pistas: box sem amostras');
  return melhor;
}
