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
 * (`.tracado-svg__chao`) e o `background` do painel (`.tracado-svg`, que lê
 * o mesmo tom via a bridge var `--cor-superficie: var(--fundo-elevado)`). É
 * contra ela que a guarda de contraste do limite de pista mede
 * (`pista-camadas.test.ts`).
 */
export const SUPERFICIE_BASE_REPLAY: CorDePista = 'fundoElevado';

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

export const MARGEM_VIEWBOX = 70;
export const VIEWBOX_LARGURA = 1140;
export const VIEWBOX_ALTURA = 740;
export const VIEWBOX_PISTA = '-70 -70 1140 740';
/**
 * Largura útil do `<svg>` quando a viewport está na mínima do projeto
 * (360px). Conta: 360 − 32 (padding lateral de `.app-shell`, `--espaco-lg` =
 * 16px de cada lado — `#root` só tem `height: 100%`) − 6 (borda de 3px de cada
 * lado de `.tracado-svg`) = 322, arredondado pra baixo pra 320 por margem de
 * segurança.
 */
export const LARGURA_SVG_MINIMA_PX = 320;

export const ANGULO_MINIMO_ZEBRA = 28;
export const ALCANCE_ZEBRA = 44;
export const COBERTURA_MAXIMA_ZEBRA = 0.4;

/**
 * Raio (unidades do viewBox) do marcador de carro-bot na tela. O viewBox
 * cresceu de 1000 (PR 7.2) pra `VIEWBOX_LARGURA` = 1140 no 7.3 (fator
 * `VIEWBOX_LARGURA / 1000` = 1,14), o que encolheria o marcador 12,3% NA TELA
 * se o raio não fosse compensado. `6 * 1,14 = 6,84`, arredondado pra 7 —
 * mantém o diâmetro visível a 360px `>=` o que era na `main` (regra
 * permanente: a pista é moldura, o carro é conteúdo, o conteúdo não pode
 * degradar pela moldura). Ver `pista-camadas.test.ts`.
 */
export const RAIO_CARRO_BOT = 7;
/**
 * Mesmo raciocínio de `RAIO_CARRO_BOT`: `10 * 1,14 = 11,4`, arredondado pra
 * CIMA (12), não pra baixo. Arredondar pra baixo daria 6,18px a 360px contra
 * os 6,40px da `main` — ou seja, o marcador do jogador humano AINDA
 * encolheria, justamente o que esta compensação existe pra impedir. O teste
 * cobre os dois marcadores por isso.
 */
export const RAIO_CARRO_HUMANO = 12;

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
}

/**
 * Candidato a zebra num vértice, com a posição de arco (recuada/avançada) já
 * calculada — usado internamente pelo algoritmo de varredura.
 */
interface CandidatoZebra {
  indice: number;
  angulo: number;
  trecho: TrechoZebra;
  intervalo: IntervaloArco[];
}

/**
 * Trechos de zebra de uma polilinha FECHADA (`pontos`): o algoritmo (ver
 * PLANO PR 7.3 §2/§3.9):
 * 1. calcula o ângulo de virada em cada vértice (o vértice 0 usa o último
 *    ponto como anterior — polilinha fechada);
 * 2. mantém só os `>= ANGULO_MINIMO_ZEBRA`;
 * 3. ordena por ângulo DECRESCENTE, desempate por índice CRESCENTE
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
 */
export function trechosDeZebra(pontos: readonly Ponto[]): TrechoZebra[] {
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
    const angulo = anguloDeVirada(pontos[anteriorIdx], pontos[i], pontos[proximoIdx]);
    if (angulo < ANGULO_MINIMO_ZEBRA) continue;

    const comprimentoAnterior = comprimentosSegmento[anteriorIdx];
    const comprimentoProximo = comprimentosSegmento[i];
    const alcanceTras = Math.min(ALCANCE_ZEBRA, comprimentoAnterior / 2);
    const alcanceFrente = Math.min(ALCANCE_ZEBRA, comprimentoProximo / 2);

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
      angulo,
      trecho: { indice: i, antes, vertice: pontos[i], depois },
      intervalo,
    });
  }

  candidatos.sort((a, b) => (b.angulo !== a.angulo ? b.angulo - a.angulo : a.indice - b.indice));

  const aceitos: CandidatoZebra[] = [];
  const intervalosAceitos: IntervaloArco[] = [];
  for (const candidato of candidatos) {
    const cobertura = comprimentoUniao([...intervalosAceitos, ...candidato.intervalo]) / perimetro;
    if (cobertura > COBERTURA_MAXIMA_ZEBRA) continue;
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

/** `M x y L ... Z` da volta inteira de `pistaId`, MEMOIZADO (mesmo motivo de `zebrasDaPista`). Substitui o `tracadoPath` local de `TelaCorrida.tsx`. */
export function pathDaVolta(pistaId: string): string {
  const cache = CACHE_PATH_VOLTA.get(pistaId);
  if (cache !== undefined) return cache;
  const [primeiro, ...resto] = tracadoDaPista(pistaId);
  const partes = resto.map((p) => `L ${p.x} ${p.y}`).join(' ');
  const path = `M ${primeiro.x} ${primeiro.y} ${partes} Z`;
  CACHE_PATH_VOLTA.set(pistaId, path);
  return path;
}

/** Polilinha ABERTA (sem `Z`) de um trecho de zebra. */
export function pathDoTrecho(trecho: readonly Ponto[]): string {
  const [primeiro, ...resto] = trecho;
  const partes = resto.map((p) => `L ${p.x} ${p.y}`).join(' ');
  return `M ${primeiro.x} ${primeiro.y} ${partes}`;
}

const CACHE_PATHS_ZEBRA = new Map<string, readonly { indice: number; d: string }[]>();

/**
 * Paths prontos das zebras de `pistaId`, MEMOIZADOS. Existe pra que o render
 * não realoque nada por frame: a versão anterior chamava
 * `pathDoTrecho([trecho.antes, trecho.vertice, trecho.depois])` dentro do JSX,
 * o que criava um array temporário por trecho por frame (22 em Monza) num
 * módulo que declara a memoização como obrigatória. `indice` vem junto porque
 * é a `key` estável do React.
 */
export function pathsDeZebraDaPista(pistaId: string): readonly { indice: number; d: string }[] {
  const cache = CACHE_PATHS_ZEBRA.get(pistaId);
  if (cache !== undefined) return cache;
  const paths = zebrasDaPista(pistaId).map((trecho) => ({
    indice: trecho.indice,
    d: pathDoTrecho([trecho.antes, trecho.vertice, trecho.depois]),
  }));
  CACHE_PATHS_ZEBRA.set(pistaId, paths);
  return paths;
}

/** camelCase -> kebab-case, embrulhado em `var(--...)` (`'pistaAsfalto'` ⇒ `'var(--pista-asfalto)'`). */
export function varDeCor(cor: CorDePista): string {
  const kebab = cor.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `var(--${kebab})`;
}
