/**
 * Camadas da pista como dado puro (PR 7.3): a pilha de `stroke`s que substitui
 * a `<polyline>` única de 10px do PR 2.8. Mesmo espírito de `tracados.ts`/
 * `fluxo-corrida.ts` — testável sem DOM, sem React.
 *
 * Fecha as 2 pendências deliberadas do PR 7.2 (ver PROGRESS): (1) o traçado só
 * lê contra qualquer fundo através da camada de LIMITE, não do preenchimento
 * de asfalto (matematicamente impossível, ver `tokens.test.ts`); (2) o CSS de
 * produção troca de `--raridade-comum` pra `--carro-bot` no mesmo diff que
 * introduz a guarda anti-raridade (`pista-camadas.test.ts`).
 */

import type { Ponto } from './fluxo-corrida';
import { indiceDoVertice, trechoPorArco, tracadoSuavizado } from './suavizacao';
import { tracadoDaPista } from './tracados';

/**
 * Cores que a pista pode usar. A união EXCLUI qualquer `raridade*` de
 * propósito: raridade é conceito de draft, cor de pista/carro é conceito de
 * corrida (ver `carroBot` em `tokens.ts`). O tipo impede o acoplamento em
 * tempo de compilação; `pista-camadas.test.ts` repete a guarda em runtime,
 * porque o tipo some no JS compilado.
 */
export type CorDePista =
  | 'fundo'
  | 'fundoAfundado'
  | 'fundoElevado'
  | 'pistaTerreno'
  | 'pistaServico'
  | 'pistaMuro'
  | 'pistaZebraA'
  | 'pistaZebraB'
  | 'pistaLimite'
  | 'pistaAsfalto';

export const LARGURA_ASFALTO = 34;

export interface CamadaPista {
  readonly id: string;
  readonly cor: CorDePista;
  readonly largura: number;
  /** 'volta' = traçado fechado inteiro; 'curvas' = só os trechos de zebra. */
  readonly alvo: 'volta' | 'curvas';
  /**
   * 'superficie' = chão pintado, entra na corrente de separação tonal que
   * `pista-camadas.test.ts` trava; 'marcacao' = acento desenhado POR CIMA das
   * superfícies (limite de pista, zebras), propositalmente mais claro que o
   * asfalto e por isso fora da corrente.
   *
   * O campo existe porque a corrente que importa é a da PILHA REAL
   * (chão → terreno → escape → muro → asfalto), não a de
   * `HIERARQUIA_SUPERFICIES`, que é guarda de PALETA. Antes disso a primeira
   * adjacência real (chão → terreno) não era travada por teste nenhum:
   * escurecer o terreno até empatar com o chão deixava a suíte verde.
   */
  readonly papel: 'superficie' | 'marcacao';
  readonly tracejado?: string;
  readonly deslocamentoTracejado?: number;
}

/**
 * ORDEM DE PINTURA (de fora pra dentro). Larguras derivadas de
 * `LARGURA_ASFALTO` com margens ABSOLUTAS (não proporcionais): uma margem
 * proporcional afinaria o limite pra 1,5u e reprovaria na regra dos 360px
 * (`pista-camadas.test.ts`, "regra dos 360px").
 *
 * Fiel à maquete aprovada A OLHO no portão 7.1 (`MockPista.tsx`, const
 * `ESCAPE = '#0E0C20'`): o anel de escape usa `fundoAfundado`, não
 * `pistaServico`. Isso NÃO quebra a hierarquia tonal monotônica — a tabela de
 * luminância permanente (`PLANO_CLAUDE_CODE.md`) registra "escape" (0,005,
 * `fundoAfundado`) e "escape-de-curva/paddock" (0,017, `pistaServico`) como
 * DOIS PAPÉIS DISTINTOS. Usar a superfície de 0,017 no papel de 0,005
 * inverteria a leitura contra o terreno: a maquete tem um anel MAIS ESCURO
 * que o terreno ao redor (um sulco), não um degrau que sobe. `pistaServico`
 * continua reservado pro seu próprio papel (plataforma de paddock/pit, PR
 * 7.7), fora da pilha de camadas do traçado.
 *
 * OMISSÃO DELIBERADA (registrada, não é dívida silenciosa): a maquete do 7.1
 * tem uma linha central tracejada, mas ela SAI do escopo do 7.3. 1,6 unidade
 * de largura dá 0,46px a 360px — reprova a regra dos 360px — e mesmo
 * proporcionalizada pra 3% de `LARGURA_ASFALTO` (34) daria só 0,3px. Mesmo
 * motivo que eliminou os acessos de serviço finos do paddock na revisão 3 do
 * PR 7.1.
 */
export const CAMADAS_PISTA: readonly CamadaPista[] = [
  { id: 'terreno', cor: 'pistaTerreno', largura: 120, alvo: 'volta', papel: 'superficie' },
  { id: 'escape', cor: 'fundoAfundado', largura: 86, alvo: 'volta', papel: 'superficie' },
  { id: 'muro', cor: 'pistaMuro', largura: 72, alvo: 'volta', papel: 'superficie' },
  { id: 'zebra-a', cor: 'pistaZebraA', largura: 58, alvo: 'curvas', papel: 'marcacao', tracejado: '12 12' },
  {
    id: 'zebra-b',
    cor: 'pistaZebraB',
    largura: 58,
    alvo: 'curvas',
    papel: 'marcacao',
    tracejado: '12 12',
    deslocamentoTracejado: 12,
  },
  { id: 'limite', cor: 'pistaLimite', largura: 42, alvo: 'volta', papel: 'marcacao' },
  { id: 'asfalto', cor: 'pistaAsfalto', largura: LARGURA_ASFALTO, alvo: 'volta', papel: 'superficie' },
];


/**
 * Superfície REAL sob o traçado no replay: o `<rect>` de chão do SVG
 * (`.tracado-svg__chao`) e o `background` do painel (`.tracado-svg`). É contra
 * ela que a guarda de contraste do limite de pista mede
 * (`pista-camadas.test.ts`).
 *
 * ⚠️ DECISÃO DE OLHO DO DEV (PR 7.3.1), não de teste. Este valor já foi
 * `fundoElevado` (a cor de card do painel, PR 7.3) e voltou pra `fundo`. Com
 * `fundoElevado` (0,0178) o terreno (0,0113) fica MAIS ESCURO que o chão e a
 * moldura lê como um "poço"; com `fundo` (0,0083) o terreno volta a ser um
 * degrau CLARO sobre o chão e faz relevo — a composição da maquete aprovada no
 * portão 7.1. O dev escolheu o relevo e **aceitou o custo**: o painel do
 * traçado deixa de ler como card (fica na cor do corpo da página, delimitado
 * só pela borda).
 *
 * **Nenhum teste reprova nenhuma das duas opções** — as duas passam em todas
 * as guardas de contraste e de separação. A restrição que torna as duas
 * mutuamente exclusivas é de PALETA: não existe token entre `fundoElevado`
 * (0,0178) e `pistaMuro` (0,0292) pra servir de terreno claro mantendo o
 * painel elevado. Se um dia surgir, dá pra ter as duas coisas.
 */
export const SUPERFICIE_BASE_REPLAY: CorDePista = 'fundo';

/**
 * A corrente tonal da PILHA REAL, de fora pra dentro: a superfície de base do
 * replay seguida das camadas de `papel: 'superficie'`, na ordem de pintura.
 * É esta corrente — não `HIERARQUIA_SUPERFICIES` — que descreve o que o olho
 * de fato vê no traçado, e é ela que `pista-camadas.test.ts` trava com
 * `SEPARACAO_MINIMA_LUMINANCIA`. `HIERARQUIA_SUPERFICIES` continua valendo,
 * mas como guarda de PALETA (a ordem dos tokens entre si), não da pilha.
 */
export const CORRENTE_TONAL_DA_PILHA: readonly CorDePista[] = [
  SUPERFICIE_BASE_REPLAY,
  ...CAMADAS_PISTA.filter((c) => c.papel === 'superficie').map((c) => c.cor),
];

/** Hierarquia tonal (critério permanente da Fase 7): asfalto é a superfície mais clara. */
export const HIERARQUIA_SUPERFICIES = [
  'fundoAfundado',
  'fundo',
  'pistaTerreno',
  'pistaServico',
  'pistaMuro',
  'pistaAsfalto',
] as const;

/**
 * Separação mínima EXIGIDA entre superfícies consecutivas, em razão de
 * LUMINÂNCIA (não é WCAG — não soma o 0,05 da fórmula de contraste). Mínimo
 * real medido: 1,357 (fundo→terreno). Ver `pista-camadas.test.ts`.
 */
export const SEPARACAO_MINIMA_LUMINANCIA = 1.25;

/** Toda superfície contra a qual o limite de pista pode acabar encostando. */
export const SUPERFICIES_DO_REPLAY = [
  'fundo',
  'fundoElevado',
  'fundoAfundado',
  'pistaTerreno',
  'pistaServico',
  'pistaMuro',
  'pistaAsfalto',
] as const;

/**
 * viewBox do replay. Fecha a pendência 1 herdada do 7.3, onde
 * `MARGEM_VIEWBOX = 70` era "a única constante do módulo sem número que a
 * sustente" — agora cada lado é MEDIDO.
 *
 * O que precisa caber é a CURVA SUAVIZADA (é ela que se desenha), mais meia
 * camada mais larga (`terreno`, 120 ⇒ 60) pra cada lado, porque o `stroke` se
 * espalha simetricamente em torno do eixo. Medido nas 10 pistas com a curva
 * amostrada em alta resolução (N=64, mais fina que a de produção, então o
 * envelope é conservador):
 *
 *   envelope da curva das 10 pistas      x[69,0 · 920,0]  y[49,8 · 555,1]
 *   + meia camada de terreno (60)        x[ 9,0 · 980,0]  y[-10,2 · 615,1]
 *   viewBox escolhido                    x[-10 · 990]     y[-30 · 630]
 *   folga resultante (pior lado)         19,0 / 10,0      19,8 / 14,9
 *
 * A suavização custa quase nada de envelope: o overshoot da Catmull-Rom sai só
 * 1,0 à esquerda e 5,1 embaixo do bounding box da polilinha de controle (pior
 * caso das 10: Mônaco, 15,1 — mas num lado onde já havia folga).
 *
 * O 7.3 usava `-70 -70 1140 740` pra o mesmo conteúdo: 17% de moldura vazia
 * que encolhia tudo na tela e obrigou a inflar os raios dos carros. Voltando a
 * `VIEWBOX_LARGURA = 1000` — exatamente o valor de antes do 7.3 — a escala na
 * tela volta a ser a da `main` e os raios voltam aos originais (ver
 * `RAIO_CARRO_BOT`/`RAIO_CARRO_HUMANO`).
 */
export const VIEWBOX_X = -10;
export const VIEWBOX_Y = -30;
export const VIEWBOX_LARGURA = 1000;
export const VIEWBOX_ALTURA = 660;
export const VIEWBOX_PISTA = `${VIEWBOX_X} ${VIEWBOX_Y} ${VIEWBOX_LARGURA} ${VIEWBOX_ALTURA}`;
/** Meia largura da camada mais larga: o quanto o `stroke` transborda do eixo do traçado pra cada lado. */
export const MEIA_CAMADA_MAIS_LARGA = 60;
/**
 * Largura útil do `<svg>` quando a viewport está na mínima do projeto
 * (360px). Conta: 360 − 32 (padding lateral de `.app-shell`, `--espaco-lg` =
 * 16px de cada lado — `#root` só tem `height: 100%`) − 6 (borda de 3px de cada
 * lado de `.tracado-svg`) = 322, arredondado pra baixo pra 320 por margem de
 * segurança.
 */
export const LARGURA_SVG_MINIMA_PX = 320;

/**
 * Virada mínima (em graus) pra um vértice virar candidato a zebra — medida
 * ACUMULADA em `JANELA_CURVATURA_ZEBRA`, não no vértice sozinho.
 *
 * O valor 28 é o mesmo desde o 7.1 e continua produzindo os MESMOS trechos nas
 * 10 pistas de hoje (medido: índices e alcances idênticos, nas 10) — o que muda
 * é o comportamento quando a silhueta é densificada. Ver `trechosDeZebra`.
 *
 * ⚠️ Por que a saída de hoje não se mexe, dito sem eufemismo: nas silhuetas de
 * 16 pontos TODO segmento é maior que meia janela (44 u), então nenhum vizinho
 * cai dentro dela e a virada acumulada é IDÊNTICA ao ângulo do vértice — a
 * janela é **inerte** na geometria de produção atual. Isso é o que torna a
 * preservação do desenho estrutural em vez de sorte; e é também o motivo de o
 * mecanismo novo só ser exercitado por sintéticos e por curvas densificadas
 * (`pista-camadas.test.ts`), não por pista nenhuma do jogo hoje.
 */
export const ANGULO_MINIMO_ZEBRA = 28;
export const ALCANCE_ZEBRA = 44;
export const COBERTURA_MAXIMA_ZEBRA = 0.4;

/**
 * Comprimento de arco (unidades do viewBox) da janela em que a virada é
 * acumulada: `2 × ALCANCE_ZEBRA`, ou seja, exatamente o arco que um trecho de
 * zebra de alcance máximo ocupa. É a escala natural do problema — a pergunta
 * que o critério faz passa a ser "há virada suficiente no PEDAÇO DE PISTA que
 * esta zebra cobriria?", em vez de "há virada suficiente NESTE VÉRTICE?".
 *
 * Por que 88 e não mais: medido em Monza, 44, 66 e 88 dão os mesmos 11 trechos
 * / 38,4% (a seleção do 7.1, intacta); a 110 a janela já alcança a chicane
 * vizinha e admite o vértice 1 (21,8°), mudando a seleção. O motivo de parar em
 * 88 é esse — **preservar o desenho aprovado**, e não uma violação da regra 3:
 * o vértice 1 é a PONTA da reta de largada e um trecho ali se estende só ±44 u,
 * longe do meio da reta (250 u adiante). O teto de cima é o desenho, não a
 * regra.
 */
export const JANELA_CURVATURA_ZEBRA = 2 * ALCANCE_ZEBRA;

/**
 * Raio (unidades do viewBox) do marcador de carro-bot na tela.
 *
 * DEVOLVIDO ao valor original no 7.4 (era 7 no 7.3). O 7.3 inflou 6 ⇒ 7 pra
 * compensar o viewBox de 1140 de largura, que encolhia o marcador 12,3% na
 * tela. Com o viewBox reapertado pra `VIEWBOX_LARGURA` = 1000 — o mesmo valor
 * de antes do 7.3 — a escala volta a ser idêntica à da `main` e a compensação
 * deixa de ter motivo: o inflado agora DEIXARIA o marcador maior que o
 * original, engordando o conteúdo sem decisão de arte que sustente.
 *
 * A regra permanente que isto serve continua a mesma (a pista é moldura, o
 * carro é conteúdo, o conteúdo não pode degradar pela moldura) — o teste em
 * `pista-camadas.test.ts` segue comparando o diâmetro a 360px contra a `main`.
 */
export const RAIO_CARRO_BOT = 6;
/** Mesmo raciocínio de `RAIO_CARRO_BOT`: devolvido de 12 (7.3) pro original 10. */
export const RAIO_CARRO_HUMANO = 10;

/** Distância euclidiana entre dois pontos. */
function distancia(a: Ponto, b: Ponto): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/**
 * Módulo do ângulo de virada (0-180°) em `vertice`: o ângulo entre a direção
 * de chegada (`anterior -> vertice`) e a direção de saída (`vertice ->
 * proximo`). 0° = reta (sem virada); 180° = reversão completa (hairpin).
 */
export function anguloDeVirada(anterior: Ponto, vertice: Ponto, proximo: Ponto): number {
  const chegada = { x: vertice.x - anterior.x, y: vertice.y - anterior.y };
  const saida = { x: proximo.x - vertice.x, y: proximo.y - vertice.y };
  const magChegada = Math.hypot(chegada.x, chegada.y);
  const magSaida = Math.hypot(saida.x, saida.y);
  if (magChegada === 0 || magSaida === 0) return 0;

  const cosseno = (chegada.x * saida.x + chegada.y * saida.y) / (magChegada * magSaida);
  const cossenoClampado = Math.min(1, Math.max(-1, cosseno));
  return (Math.acos(cossenoClampado) * 180) / Math.PI;
}

/**
 * Virada ACUMULADA (soma dos ângulos de virada, em graus) dos vértices que
 * caem numa janela de `janela` unidades de ARCO centrada em `indice` — o
 * próprio vértice incluído.
 *
 * É esta soma que é ~invariante à densidade: repartir uma curva de 90° em 4
 * vértices dá 22,5° em cada um (o ângulo POR VÉRTICE se dilui e some sob
 * qualquer limiar fixo), mas a SOMA ao longo do trecho continua ~90°, porque
 * telescopa na virada total. É a versão discreta de "integral da curvatura ao
 * longo do arco".
 *
 * Usa o módulo do ângulo, não a virada com sinal: numa chicane esquerda-direita
 * a virada com sinal se CANCELA e a chicane — que é curva, e é onde a zebra
 * mais importa — ficaria sem zebra.
 *
 * Caso degenerado documentado: se `janela` cobre a volta inteira, cada vértice
 * é somado no máximo uma vez (os dois lados juntos andam no máximo `n - 1`
 * passos), e o resultado tende à virada total da silhueta.
 */
export function viradaAcumuladaNaJanela(
  pontos: readonly Ponto[],
  indice: number,
  janela: number = JANELA_CURVATURA_ZEBRA,
): number {
  const n = pontos.length;
  if (n < 3) return 0;
  const meia = janela / 2;
  const anguloEm = (i: number) =>
    anguloDeVirada(pontos[(i - 1 + n) % n], pontos[i], pontos[(i + 1) % n]);

  let soma = anguloEm(indice);

  let arco = 0;
  let passosTras = 0;
  for (let passo = 1; passo < n; passo++) {
    const j = (indice - passo + n) % n;
    arco += distancia(pontos[j], pontos[(j + 1) % n]);
    if (arco > meia) break;
    soma += anguloEm(j);
    passosTras++;
  }

  arco = 0;
  for (let passo = 0; passo < n - 1 - passosTras; passo++) {
    const j = (indice + passo) % n;
    arco += distancia(pontos[j], pontos[(j + 1) % n]);
    if (arco > meia) break;
    soma += anguloEm((j + 1) % n);
  }

  return soma;
}

/** Um sub-intervalo linear [inicio, fim) dentro de [0, perímetro) — resultado de "desenrolar" um trecho circular. */
interface IntervaloArco {
  inicio: number;
  fim: number;
}

/**
 * "Desenrola" um intervalo circular (que pode começar antes de 0 ou terminar
 * depois de `total`, por causa do wrap no vértice 0) em 1 ou 2 sub-intervalos
 * dentro de `[0, total)`.
 */
function desenrolarIntervalo(inicio: number, fim: number, total: number): IntervaloArco[] {
  const comprimento = fim - inicio;
  const inicioNormalizado = ((inicio % total) + total) % total;
  const fimNormalizado = inicioNormalizado + comprimento;
  if (fimNormalizado <= total) {
    return [{ inicio: inicioNormalizado, fim: fimNormalizado }];
  }
  return [
    { inicio: inicioNormalizado, fim: total },
    { inicio: 0, fim: fimNormalizado - total },
  ];
}

/** Comprimento da união de intervalos lineares (mesmo espaço `[0, total)`, sem wrap — o wrap já foi resolvido por `desenrolarIntervalo`). */
function comprimentoUniao(intervalos: IntervaloArco[]): number {
  if (intervalos.length === 0) return 0;
  const ordenados = [...intervalos].sort((a, b) => a.inicio - b.inicio);
  let soma = 0;
  let inicioAtual = ordenados[0].inicio;
  let fimAtual = ordenados[0].fim;
  for (let i = 1; i < ordenados.length; i++) {
    const { inicio, fim } = ordenados[i];
    if (inicio <= fimAtual) {
      fimAtual = Math.max(fimAtual, fim);
    } else {
      soma += fimAtual - inicioAtual;
      inicioAtual = inicio;
      fimAtual = fim;
    }
  }
  soma += fimAtual - inicioAtual;
  return soma;
}

/**
 * Um trecho de zebra: os 3 pontos (`antes`/`vertice`/`depois`) mais o `indice`
 * do vértice ORIGINAL no traçado de origem. O `indice` existe pra os testes
 * (e o 7.4) não precisarem reencontrar o vértice por comparação de
 * coordenada (`findIndex` por `x`/`y`) — fragilidade que quebraria se dois
 * vértices, num traçado curvo futuro, caíssem na mesma coordenada.
 */
export interface TrechoZebra {
  readonly indice: number;
  readonly antes: Ponto;
  readonly vertice: Ponto;
  readonly depois: Ponto;
  /**
   * Quanto o trecho se estende pra trás/pra frente do vértice, em unidades de
   * COMPRIMENTO (não de número de pontos). `antes`/`depois` são esses mesmos
   * alcances já aplicados sobre a polilinha de CONTROLE (retas); os números
   * crus existem porque o desenho real acontece sobre a CURVA SUAVIZADA, onde
   * o mesmo alcance percorre um caminho curvo — ver `pathsDeZebraDaPista`.
   */
  readonly alcanceTras: number;
  readonly alcanceFrente: number;
}

/**
 * Candidato a zebra num vértice, com a posição de arco (recuada/avançada) já
 * calculada — usado internamente pelo algoritmo de varredura.
 */
interface CandidatoZebra {
  indice: number;
  /** Virada ACUMULADA na janela de arco (ver `viradaAcumuladaNaJanela`), não o ângulo do vértice sozinho. */
  virada: number;
  trecho: TrechoZebra;
  intervalo: IntervaloArco[];
}

/**
 * Sobrescritas dos quatro parâmetros do critério de zebra. **Existem pra
 * MEDIÇÃO e PREVIEW, não pra configuração**: nenhum caminho de produção passa
 * este argumento, e todos os campos caem nas constantes do módulo quando
 * omitidos — `trechosDeZebra(pontos)` é, byte a byte, o que era antes de o
 * parâmetro existir (`pista-camadas.test.ts` fixa isso comparando as duas
 * chamadas, além dos goldens das 10 pistas).
 *
 * O motivo de a parametrização morar na produção, e não numa cópia do
 * algoritmo dentro do script de preview: um preview que reimplementa o
 * critério para de refletir a tela no dia em que os dois divergem, e aí não
 * serve pra decidir nada — que é a premissa declarada no cabeçalho de
 * `scripts/preview-tracados.preview.test.ts`. Varrer 88/40% num preview exige
 * variar os valores; a alternativa honesta é esta.
 */
export interface OpcoesZebra {
  readonly anguloMinimo?: number;
  readonly alcance?: number;
  readonly coberturaMaxima?: number;
  readonly janela?: number;
}

/**
 * Trechos de zebra de uma polilinha FECHADA (`pontos`): o algoritmo (ver
 * PLANO PR 7.3 §2/§3.9):
 * 1. calcula a VIRADA ACUMULADA em cada vértice — a soma dos ângulos de virada
 *    dentro de `JANELA_CURVATURA_ZEBRA` de arco em torno dele (o vértice 0 usa
 *    o último ponto como anterior — polilinha fechada);
 * 2. mantém só as `>= ANGULO_MINIMO_ZEBRA`;
 * 3. ordena por virada DECRESCENTE, desempate por índice CRESCENTE
 *    (determinismo);
 * 4. varre nessa ordem acumulando trechos; um trecho é o par de pontos
 *    recuado/avançado do vértice por `min(ALCANCE_ZEBRA, metade do segmento
 *    vizinho)` — o `min` impede a zebra de invadir a reta seguinte;
 * 5. PULA (não HALT) o primeiro candidato que faria a cobertura de arco
 *    (união, com wrap) passar de `COBERTURA_MAXIMA_ZEBRA`, e continua
 *    tentando os candidatos menores da fila — um `break` pararia a varredura
 *    inteira no primeiro trecho grande que não coubesse, mesmo que
 *    candidatos menores mais adiante no ranking ainda coubessem. O teto de
 *    fato MORDE em 6 das 10 pistas (Mônaco, Silverstone, Interlagos,
 *    Nürburgring, Imola, Red Bull Ring); em Monza, Spa, Suzuka e Montreal
 *    TODOS os candidatos ≥28° cabem dentro do teto sem cortar nenhum — em
 *    particular, Monza dá 38,4% de cobertura com os 11 candidatos inteiros,
 *    sem o teto ser vinculante ali (o `break`/`continue` dão o mesmo
 *    resultado nas 10 pistas hoje: confirmado contra os goldens de
 *    `pista-camadas.test.ts`);
 * 6. devolve os trechos reordenados por índice crescente.
 *
 * POR QUE A JANELA (PR da zebra invariante à densidade): o critério anterior
 * era o ângulo de UM vértice, proxy de curvatura que só funciona na densidade
 * de hoje (~16 pontos/volta). Medido sobre a curva suavizada das 10 pistas, a
 * 120 pontos ele entrega **0,0-11,6% de cobertura** (Suzuka literalmente 0) contra
 * 26-39% na densidade atual: a mesma curva repartida em mais vértices dilui o
 * ângulo de cada um até sumir sob o corte. Como o redesenho das silhuetas vai
 * a 42-115 pontos, o critério quebraria POR CONSTRUÇÃO — e o dev não
 * conseguiria separar "a silhueta ficou ruim" de "as zebras sumiram" no portão
 * visual. Com a janela, as mesmas 10 pistas a 120 pontos ficam em 16,6-40,0%
 * (o pior caso é Suzuka; ver o piso do teste de invariância).
 *
 * O ALCANCE continua `min(ALCANCE_ZEBRA, segmento/2)` — o plano previa trocar
 * também esse grampo por um em arco, e a MEDIÇÃO desaconselhou: com a janela
 * no lugar, todo vértice de uma curva densificada vira candidato, e trechos
 * vizinhos de meio-segmento cada PARTICIONAM o arco da curva (se tocam, nunca
 * se sobrepõem) — a união já cobre a curva inteira. Trocar o grampo mudaria a
 * saída nas 10 pistas de HOJE, quebrando a única coisa que este PR precisa
 * preservar: o desenho aprovado a olho no 7.1. Fica registrado como opção
 * disponível, não como dívida.
 *
 * Consequência aceita: o NÚMERO de trechos cresce com a densidade (Monza: 11 a
 * 16 pontos, ~48 a 120), porque cada vértice da curva vira um trecho próprio.
 * A cobertura — que é o que se VÊ — é que fica estável. Fundir trechos
 * contíguos num só path reduziria a contagem, mas reiniciaria o tracejado
 * `12 12` em outro lugar e mudaria o visual de hoje; fora de escopo aqui.
 */
export function trechosDeZebra(pontos: readonly Ponto[], opcoes: OpcoesZebra = {}): TrechoZebra[] {
  const anguloMinimo = opcoes.anguloMinimo ?? ANGULO_MINIMO_ZEBRA;
  const alcanceMaximo = opcoes.alcance ?? ALCANCE_ZEBRA;
  const coberturaMaxima = opcoes.coberturaMaxima ?? COBERTURA_MAXIMA_ZEBRA;
  const janela = opcoes.janela ?? JANELA_CURVATURA_ZEBRA;

  const n = pontos.length;
  if (n < 3) return [];

  const comprimentosSegmento: number[] = [];
  for (let i = 0; i < n; i++) {
    comprimentosSegmento.push(distancia(pontos[i], pontos[(i + 1) % n]));
  }

  const arcoNoInicio: number[] = [];
  let acumulado = 0;
  for (let i = 0; i < n; i++) {
    arcoNoInicio.push(acumulado);
    acumulado += comprimentosSegmento[i];
  }
  const perimetro = acumulado;

  const candidatos: CandidatoZebra[] = [];
  for (let i = 0; i < n; i++) {
    const anteriorIdx = (i - 1 + n) % n;
    const proximoIdx = (i + 1) % n;
    const virada = viradaAcumuladaNaJanela(pontos, i, janela);
    if (virada < anguloMinimo) continue;

    const comprimentoAnterior = comprimentosSegmento[anteriorIdx];
    const comprimentoProximo = comprimentosSegmento[i];
    const alcanceTras = Math.min(alcanceMaximo, comprimentoAnterior / 2);
    const alcanceFrente = Math.min(alcanceMaximo, comprimentoProximo / 2);

    const tAntes = comprimentoAnterior === 0 ? 0 : alcanceTras / comprimentoAnterior;
    const antes: Ponto = {
      x: pontos[i].x + (pontos[anteriorIdx].x - pontos[i].x) * tAntes,
      y: pontos[i].y + (pontos[anteriorIdx].y - pontos[i].y) * tAntes,
    };
    const tDepois = comprimentoProximo === 0 ? 0 : alcanceFrente / comprimentoProximo;
    const depois: Ponto = {
      x: pontos[i].x + (pontos[proximoIdx].x - pontos[i].x) * tDepois,
      y: pontos[i].y + (pontos[proximoIdx].y - pontos[i].y) * tDepois,
    };

    const arcoVertice = arcoNoInicio[i];
    const intervalo = desenrolarIntervalo(arcoVertice - alcanceTras, arcoVertice + alcanceFrente, perimetro);

    candidatos.push({
      indice: i,
      virada,
      trecho: {
        indice: i,
        antes,
        vertice: pontos[i],
        depois,
        alcanceTras,
        alcanceFrente,
      },
      intervalo,
    });
  }

  candidatos.sort((a, b) => (b.virada !== a.virada ? b.virada - a.virada : a.indice - b.indice));

  const aceitos: CandidatoZebra[] = [];
  const intervalosAceitos: IntervaloArco[] = [];
  for (const candidato of candidatos) {
    const cobertura = comprimentoUniao([...intervalosAceitos, ...candidato.intervalo]) / perimetro;
    if (cobertura > coberturaMaxima) continue;
    aceitos.push(candidato);
    intervalosAceitos.push(...candidato.intervalo);
  }

  aceitos.sort((a, b) => a.indice - b.indice);
  return aceitos.map((c) => c.trecho);
}

/**
 * Chaveado por `pistaId`, NÃO pelo traçado em si: assume que `tracadoDaPista`
 * é estável pra um mesmo `pistaId` dentro do processo. O 7.4 (Bézier) vai
 * gerar traçados a partir da geometria reta — se `tracadoDaPista` passar a
 * devolver formas diferentes pro mesmo id (versionamento de traçado, cache
 * externo etc.), este `Map` de módulo precisa de invalidação explícita, ou
 * vai devolver a zebra da versão antiga.
 */
const CACHE_ZEBRAS = new Map<string, TrechoZebra[]>();

/**
 * `trechosDeZebra(tracadoDaPista(pistaId))`, MEMOIZADO num `Map` de módulo.
 * OBRIGATÓRIO: `TelaCorrida` re-renderiza a cada frame do `rAF` e o cálculo é
 * O(n²) — sem memo isso degrada o replay (mesma classe de problema que o PR
 * 7.5 resolve pra LUT). Memo é puro (mesma entrada ⇒ mesma saída, sem I/O).
 */
export function zebrasDaPista(pistaId: string): TrechoZebra[] {
  const cache = CACHE_ZEBRAS.get(pistaId);
  if (cache) return cache;
  const resultado = trechosDeZebra(tracadoDaPista(pistaId));
  CACHE_ZEBRAS.set(pistaId, resultado);
  return resultado;
}

/** Mesma ressalva de invalidação de `CACHE_ZEBRAS`: chaveado por `pistaId`, não pelo traçado. */
const CACHE_PATH_VOLTA = new Map<string, string>();

/**
 * `M x y L ... Z` da volta inteira de `pistaId`, MEMOIZADO (mesmo motivo de
 * `zebrasDaPista`).
 *
 * PR 7.4: passa a percorrer a CURVA SUAVIZADA, não a polilinha de controle —
 * é esta função que fazia as pistas lerem como polígonos. Continua sendo uma
 * sequência de `L` (segmentos retos), não comandos `C` de Bézier: a curva já
 * vem densificada de `tracadoSuavizado`, e uma polilinha fina é o que
 * `pontoNoTracado` também consome, o que mantém DESENHO e MOVIMENTO na mesma
 * geometria. Emitir `C` aqui faria o carro andar numa curva e o asfalto ser
 * desenhado em outra.
 *
 * As coordenadas saem com `NUMERO_CASAS_PATH` casas decimais: a curva gera
 * irracionais, e `${p.x}` cru despejaria ~17 dígitos por eixo — um `d` de
 * dezenas de milhares de caracteres por camada, 7 camadas, sem ganho visual
 * nenhum (0,001u = 0,0007px no maior tamanho de painel).
 */
export function pathDaVolta(pistaId: string): string {
  const cache = CACHE_PATH_VOLTA.get(pistaId);
  if (cache !== undefined) return cache;
  const path = `${pathDoTrecho(tracadoSuavizado(pistaId))} Z`;
  CACHE_PATH_VOLTA.set(pistaId, path);
  return path;
}

/** Casas decimais das coordenadas nos `d` de path. Ver `pathDaVolta`. */
const NUMERO_CASAS_PATH = 3;

/** `-0` e `1.500` viram `0` e `1.5`: `toFixed` sozinho infla o `d` com zeros à direita sem significado. */
function coordenada(valor: number): string {
  return String(Number(valor.toFixed(NUMERO_CASAS_PATH)));
}

/** Polilinha ABERTA (sem `Z`) de um trecho de zebra. */
export function pathDoTrecho(trecho: readonly Ponto[]): string {
  const [primeiro, ...resto] = trecho;
  const partes = resto.map((p) => `L ${coordenada(p.x)} ${coordenada(p.y)}`).join(' ');
  return `M ${coordenada(primeiro.x)} ${coordenada(primeiro.y)} ${partes}`;
}

const CACHE_PATHS_ZEBRA = new Map<string, readonly { indice: number; d: string }[]>();

/**
 * Paths prontos das zebras de `pistaId`, MEMOIZADOS. Existe pra que o render
 * não realoque nada por frame: a versão anterior chamava
 * `pathDoTrecho([trecho.antes, trecho.vertice, trecho.depois])` dentro do JSX,
 * o que criava um array temporário por trecho por frame (22 em Monza) num
 * módulo que declara a memoização como obrigatória. `indice` vem junto porque
 * é a `key` estável do React.
 *
 * PR 7.4: o trecho deixa de ser os 3 pontos sobre as RETAS de controle e passa
 * a ser recortado da CURVA SUAVIZADA por comprimento de arco. Sem isso a zebra
 * (58 de largura) ficaria assentada na corda enquanto o asfalto (34) segue a
 * curva — nas curvas fechadas a zebra escaparia por baixo do asfalto, que é
 * justamente onde ela precisa aparecer.
 *
 * O vértice é localizado por `indiceDoVertice`, mapeamento ARITMÉTICO exato do
 * índice de controle pro índice na curva — não por busca de coordenada, que
 * pegaria o vértice errado em Suzuka (controle 4 e 12 são ambos `(500,300)`).
 */
export function pathsDeZebraDaPista(pistaId: string): readonly { indice: number; d: string }[] {
  const cache = CACHE_PATHS_ZEBRA.get(pistaId);
  if (cache !== undefined) return cache;
  const curva = tracadoSuavizado(pistaId);
  const paths = zebrasDaPista(pistaId).map((trecho) => ({
    indice: trecho.indice,
    d: pathDoTrecho(
      trechoPorArco(curva, indiceDoVertice(trecho.indice), trecho.alcanceTras, trecho.alcanceFrente),
    ),
  }));
  CACHE_PATHS_ZEBRA.set(pistaId, paths);
  return paths;
}

/** camelCase -> kebab-case, embrulhado em `var(--...)` (`'pistaAsfalto'` ⇒ `'var(--pista-asfalto)'`). */
export function varDeCor(cor: CorDePista): string {
  const kebab = cor.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `var(--${kebab})`;
}
