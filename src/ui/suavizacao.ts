/**
 * Suavização Bézier do traçado (PR 7.4): Catmull-Rom CENTRÍPETA (alpha 0,5)
 * sobre as silhuetas de `tracados.ts`. Mesmo espírito de `pista-camadas.ts` —
 * geometria pura, testável sem DOM, sem React.
 *
 * PROBLEMA QUE RESOLVE: até o 7.3 o traçado desenhado era a própria polilinha
 * de controle, e as pistas liam como polígonos ("quadradas"). Este módulo
 * separa DUAS representações que antes eram a mesma coisa:
 *
 * - `tracadoDaPista(id)` — a polilinha de CONTROLE, intocada. É a INTENÇÃO DE
 *   DESENHO (16 pontos à mão) e continua sendo a fonte da detecção de zebra
 *   (ver abaixo).
 * - `tracadoSuavizado(id)` — a curva densificada de fato DESENHADA e por onde
 *   os carros andam.
 *
 * POR QUE A DETECÇÃO DE ZEBRA NÃO MIGRA PRA CURVA — E O QUE MUDOU. Até o PR da
 * zebra invariante à densidade, era IMPOSSIBILIDADE TÉCNICA: `trechosDeZebra`
 * exigia virada `>= ANGULO_MINIMO_ZEBRA` (28°) POR VÉRTICE, e na curva
 * densificada nenhum vértice chega perto disso — a virada se dilui entre as
 * `AMOSTRAS_POR_SEGMENTO` amostras. Rodar a detecção na curva devolvia zebra
 * quase nenhuma (medido depois: 0,0-11,6% de cobertura a 120 pontos).
 *
 * Desde que o critério passou a ser VIRADA ACUMULADA numa janela de arco, isso
 * deixou de ser verdade: rodar a detecção na curva devolve zebra sim (medido,
 * 120 pontos: 16,6-40,0% nas 10 pistas). **A detecção continua no controle por
 * DECISÃO DE ESCOPO** — o desenho aprovado a olho no portão 7.1 é o das
 * silhuetas de 16 pontos, e migrar a detecção mudaria o que o dev já aprovou.
 * Só a GEOMETRIA do trecho é remapeada pra curva, por `trechoPorArco`.
 *
 * POR QUE CENTRÍPETA (alpha 0,5) E NÃO UNIFORME (0) OU CORDAL (1): medido nas
 * 10 pistas, maior overshoot fora do bounding box da polilinha de controle —
 *
 *   pista           uniforme   CENTRÍPETA   cordal
 *   Mônaco             26,4        15,1      55,6
 *   Monza               3,2        14,0      50,0
 *   Red Bull Ring      11,4        14,4      41,8
 *   Imola               7,7         6,6      26,8
 *
 * A cordal estoura (55,6 em Mônaco, o hairpin). A uniforme ganha da centrípeta
 * em Monza mas é a variante que produz loops/cusps em ângulo agudo — o risco
 * que o PLANO mandou evitar. A centrípeta é a única que fica <= 15,1 nas 10.
 */

import type { Ponto } from './fluxo-corrida';
import { tracadoDaPista } from './tracados';

/**
 * Expoente da parametrização (Yuksel et al.): 0 = uniforme, 0,5 = CENTRÍPETA,
 * 1 = cordal. A centrípeta é a única das três com garantia de não produzir
 * cusp nem auto-interseção DENTRO de um segmento — exatamente o que quebraria
 * no hairpin de Mônaco e nas chicanes de Monza.
 */
export const ALPHA_CENTRIPETA = 0.5;

/**
 * Amostras por segmento de controle. Escolhido por MEDIÇÃO do desvio máximo
 * (sagita) entre a polilinha desenhada e a curva ideal (referência N=512), em
 * unidades de viewBox — a pior das 10 pistas:
 *
 *   N=4   3,37u    N=8   1,08u    N=16  0,38u
 *   N=6   1,77u    N=12  0,55u    N=24  0,21u
 *
 * O painel do traçado tem `max-width: 700px` (`estilos.css`) sobre um viewBox
 * de `VIEWBOX_LARGURA` (1000), ou seja no MÁXIMO 0,7px por unidade. N=12 dá
 * 0,55u = 0,39px de desvio no maior tamanho de renderização — abaixo de meio
 * pixel, invisível. N=8 daria 0,76px, que já aparece como faceta numa curva
 * ampla. Custo: 144-264 pontos por volta (era 12-22).
 */
export const AMOSTRAS_POR_SEGMENTO = 12;

/**
 * Piso do passo de parametrização. Sem ele, dois pontos de controle
 * COINCIDENTES dariam `t(i+1) - t(i) = 0` e as divisões de Barry-Goldman
 * virariam `NaN`, contaminando a volta inteira em silêncio. As 10 pistas de
 * hoje não têm segmento degenerado (`tracados.test.ts` trava isso), mas
 * `suavizarPolilinhaFechada` é pública e recebe polilinha arbitrária nos
 * testes — o piso degrada localmente pra quase-uniforme em vez de explodir.
 */
const PISO_PASSO = 1e-9;

/** Combinação afim de dois pontos: `pa * pesoA + pb * pesoB`. */
function combinar(pa: Ponto, pb: Ponto, pesoA: number, pesoB: number): Ponto {
  return { x: pa.x * pesoA + pb.x * pesoB, y: pa.y * pesoA + pb.y * pesoB };
}

/**
 * Amostras do trecho de curva ENTRE `p1` e `p2` (os outros dois pontos são os
 * vizinhos que dão a tangente), pelo algoritmo piramidal de Barry-Goldman.
 * Devolve `amostras` pontos: o de índice 0 é `p1` e o último para ANTES de
 * `p2` — quem fecha `p2` é a chamada do segmento seguinte, então concatenar os
 * segmentos não duplica ponto.
 *
 * ⚠️ O ponto de índice 0 é `p1` POR CÓPIA DIRETA, não pela fórmula. Em `t =
 * t1` a álgebra devolve `p1` exatamente, mas em ponto flutuante o último passo
 * é `peso1 * p1 + peso2 * p1` com `peso1 + peso2 ≈ 1` — pode errar 1 ULP. Isso
 * importa em Suzuka: os vértices de controle 4 e 12 são AMBOS `(500, 300)` (o
 * "8"), e a guarda de auto-interseção de `suavizacao.test.ts` só ignora
 * cruzamento em VÉRTICE COMPARTILHADO — comparação exata de coordenada. Um
 * desvio de 1 ULP transformaria o X intencional de Suzuka num cruzamento
 * mid-segmento e reprovaria a guarda por ruído de ponto flutuante.
 */
function amostrarSegmento(
  p0: Ponto,
  p1: Ponto,
  p2: Ponto,
  p3: Ponto,
  alpha: number,
  amostras: number,
): Ponto[] {
  const proximoT = (t: number, a: Ponto, b: Ponto): number =>
    t + Math.max(Math.hypot(b.x - a.x, b.y - a.y) ** alpha, PISO_PASSO);

  const t0 = 0;
  const t1 = proximoT(t0, p0, p1);
  const t2 = proximoT(t1, p1, p2);
  const t3 = proximoT(t2, p2, p3);

  const saida: Ponto[] = [{ x: p1.x, y: p1.y }];
  for (let k = 1; k < amostras; k++) {
    const t = t1 + ((t2 - t1) * k) / amostras;
    const a1 = combinar(p0, p1, (t1 - t) / (t1 - t0), (t - t0) / (t1 - t0));
    const a2 = combinar(p1, p2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
    const a3 = combinar(p2, p3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2));
    const b1 = combinar(a1, a2, (t2 - t) / (t2 - t0), (t - t0) / (t2 - t0));
    const b2 = combinar(a2, a3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));
    saida.push(combinar(b1, b2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1)));
  }
  return saida;
}

/**
 * Curva Catmull-Rom fechada sobre `pontos`, densificada em `amostras` pontos
 * por segmento de controle. A curva PASSA POR todos os pontos de controle
 * (Catmull-Rom é interpolante, não aproximante) — é o que mantém a silhueta
 * reconhecível e o que garante que o vértice de controle `i` apareça na saída
 * no índice `i * amostras` (ver `indiceDoVertice`).
 *
 * Polilinha de menos de 3 pontos não tem o que suavizar: devolve cópia.
 */
export function suavizarPolilinhaFechada(
  pontos: readonly Ponto[],
  amostras: number = AMOSTRAS_POR_SEGMENTO,
  alpha: number = ALPHA_CENTRIPETA,
): Ponto[] {
  const n = pontos.length;
  if (n < 3 || amostras < 1) return pontos.map((p) => ({ x: p.x, y: p.y }));

  const saida: Ponto[] = [];
  for (let i = 0; i < n; i++) {
    saida.push(
      ...amostrarSegmento(
        pontos[(i - 1 + n) % n],
        pontos[i],
        pontos[(i + 1) % n],
        pontos[(i + 2) % n],
        alpha,
        amostras,
      ),
    );
  }
  return saida;
}

/**
 * Índice, na curva densificada, do vértice de CONTROLE `indiceControle`.
 * Mapeamento exato (não é busca por coordenada): cada segmento de controle
 * contribui com exatamente `amostras` pontos, começando pelo próprio vértice.
 *
 * É o que permite reaproveitar `TrechoZebra.indice` — o campo que o PR 7.3
 * criou justamente pra o 7.4 não precisar reencontrar o vértice comparando
 * `x`/`y`, o que quebraria em Suzuka (dois vértices na mesma coordenada).
 */
export function indiceDoVertice(
  indiceControle: number,
  amostras: number = AMOSTRAS_POR_SEGMENTO,
): number {
  return indiceControle * amostras;
}

/**
 * Caminha `distancia` unidades de COMPRIMENTO DE ARCO ao longo de `curva` a
 * partir do índice `inicio`, no sentido `+1`/`-1`, e devolve os pontos
 * atravessados (sem repetir o de partida). O último ponto é INTERPOLADO no
 * ponto exato onde a distância acaba, então o trecho tem o comprimento pedido
 * mesmo que ele caia no meio de uma corda.
 *
 * O teto de `curva.length` passos impede laço infinito se `distancia` for
 * maior que o perímetro.
 */
function caminharPorArco(
  curva: readonly Ponto[],
  inicio: number,
  distancia: number,
  sentido: 1 | -1,
): Ponto[] {
  const n = curva.length;
  const saida: Ponto[] = [];
  let restante = distancia;
  let atual = inicio;

  for (let passo = 0; passo < n && restante > 0; passo++) {
    const seguinte = (((atual + sentido) % n) + n) % n;
    const a = curva[atual];
    const b = curva[seguinte];
    const comprimento = Math.hypot(b.x - a.x, b.y - a.y);

    if (comprimento >= restante && comprimento > 0) {
      const t = restante / comprimento;
      saida.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      return saida;
    }

    saida.push({ x: b.x, y: b.y });
    restante -= comprimento;
    atual = seguinte;
  }
  return saida;
}

/**
 * Sub-polilinha de `curva` que vai de `atras` unidades ANTES do índice
 * `centro` até `aFrente` unidades DEPOIS, medidas em comprimento de arco SOBRE
 * A CURVA. É como um trecho de zebra sai da polilinha de controle e passa a
 * assentar exatamente sobre o asfalto desenhado.
 *
 * Medir por ARCO (e não por número de amostras) mantém o comprimento da zebra
 * independente de `AMOSTRAS_POR_SEGMENTO`: mudar a densificação muda a
 * resolução do desenho, não o tamanho das zebras.
 */
export function trechoPorArco(
  curva: readonly Ponto[],
  centro: number,
  atras: number,
  aFrente: number,
): Ponto[] {
  const meio = curva[centro];
  return [
    ...caminharPorArco(curva, centro, atras, -1).reverse(),
    { x: meio.x, y: meio.y },
    ...caminharPorArco(curva, centro, aFrente, 1),
  ];
}

/**
 * Mesma ressalva de invalidação dos caches de `pista-camadas.ts`: chaveado por
 * `pistaId`, não pelo traçado. Assume `tracadoDaPista` estável pro mesmo id
 * dentro do processo.
 */
const CACHE_SUAVIZADO = new Map<string, readonly Ponto[]>();

/**
 * Curva suavizada de `pistaId`, MEMOIZADA. O memo é obrigatório, não
 * otimização: `TelaCorrida` recalcula a posição dos 22 carros a cada frame do
 * `rAF`, e densificar 22 vezes por frame alocaria ~5,8 mil pontos por frame só
 * pra jogar fora. Puro (mesma entrada ⇒ mesma saída, sem I/O).
 *
 * ⚠️ **DEVOLVER A MESMA REFERÊNCIA pro mesmo `pistaId` virou CONTRATO, não
 * detalhe.** O PR 7.5 memoizou a LUT de comprimento de arco em
 * `lutDoTracado` (`fluxo-corrida.ts`) chaveada pela **identidade do array**
 * que esta função devolve. Trocar este `Map` por algo que reconstrua a curva
 * (ou devolver uma cópia "defensiva") não deixaria nada vermelho de imediato,
 * mas **desligaria silenciosamente aquele cache** e traria de volta a pressão
 * de GC no replay. Se um dia precisar mudar isto, mude os dois juntos.
 *
 * (Até o PR 7.5 este bloco dizia que `pontoNoTracado` remontava a lista de
 * segmentos a cada chamada. Deixou de ser verdade — não reintroduza a afirmação.)
 */
export function tracadoSuavizado(pistaId: string): readonly Ponto[] {
  const cache = CACHE_SUAVIZADO.get(pistaId);
  if (cache !== undefined) return cache;
  const curva = suavizarPolilinhaFechada(tracadoDaPista(pistaId));
  CACHE_SUAVIZADO.set(pistaId, curva);
  return curva;
}
