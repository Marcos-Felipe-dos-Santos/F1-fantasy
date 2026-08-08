/**
 * Design tokens do F1 Fantasy — fonte da verdade da paleta, tipos de escala e
 * alvos de contraste. Este módulo é dados puros (sem DOM, sem regra de jogo):
 * `tokens.css` espelha os mesmos valores como custom properties CSS
 * (`tokens.test.ts` garante a sincronia entre os dois, bloco a bloco).
 *
 * ---------------------------------------------------------------------------
 * PR 7.8 — PALETA GRAFITE/F1, DOIS MODOS
 * ---------------------------------------------------------------------------
 * A paleta azul-noite (`#16132E` e derivados) saiu inteira. A nova é grafite
 * neutro com três acentos que têm SIGNIFICADO no contexto de F1, não valor
 * decorativo:
 *
 * - **vermelho `#FF1801`** — a cor da marca F1. Ação primária, destaque,
 *   posição do jogador, zebra. Substituiu o magenta (que não existe mais).
 * - **dourado `#FFB800`** — pódio, campeão, volta rápida.
 * - **verde `#00D26A`** — largada/semáforo, status ok.
 *
 * ## `cores` é a paleta DARK; `coresLight` é override PARCIAL
 *
 * `cores` continua sendo o objeto que todo o resto do código importa — o modo
 * escuro é o padrão e a fonte da verdade. `coresLight` lista SÓ os tokens que
 * mudam no claro; `paleta('light')` devolve a fusão. Quem não aparece em
 * `coresLight` é, por definição, idêntico nos dois modos.
 *
 * ## Por que existem tokens `*Texto`
 *
 * O dev pediu que os três acentos fossem IDÊNTICOS nos dois modos. Isso é
 * aritmeticamente impossível quando o acento vira TEXTO: `#FFB800` tem
 * luminância 0,555 e `#00D26A`, 0,471 — contra o branco quente `#F5F0EB`
 * (0,877) eles dão **1,53:1 e 1,78:1**, contra um mínimo de 4,5. Não é um par
 * ajustável, é o teto da cor.
 *
 * A saída aprovada pelo dev: o hex da marca fica idêntico nos dois modos onde
 * é PREENCHIMENTO (fundo de botão, badge, carro, zebra — com texto escuro por
 * cima, que passa nos dois modos), e um token irmão `*Texto` — mode-scoped —
 * entra só onde a cor vira tinta: texto, ícone, linha de 1px. No dark a tinta
 * quase sempre É a cor da marca; no claro ela escurece mantendo a matiz.
 *
 * ## `borda` continua DECORATIVA (não entra em `PARES_CONTRASTE`)
 *
 * A separação card/base é fraca NOS DOIS MODOS por construção — 1,213 no dark
 * (`#2A2A2A` sobre `#1A1A1A`) e 1,132 no claro (`#FFFFFF` sobre `#F5F0EB`).
 * O light mode não piorou nada aqui, então a decisão original vale igual: a
 * borda é apoio visual, não portadora de informação, e exigir 3:1 dela
 * transformaria todo card num wireframe. `bordaInterativa` (inputs, foco) é
 * outra história e continua na lista com 3:1.
 */

/**
 * Paleta DARK — o padrão do app e a fonte da verdade dos nomes de token.
 * Os tokens `pista*` são MODE-INVARIANTES de propósito: ver `coresLight`.
 */
export const cores = {
  fundo: '#1A1A1A', // grafite/carvão neutro (base do app)
  fundoElevado: '#2A2A2A', // cards, painéis
  fundoAfundado: '#121212', // inputs, wells
  texto: '#F5F0EB', // branco quente
  textoSuave: '#9A9A9A',
  /**
   * Tinta escura sobre os acentos (botão primário, badges). NÃO é mais igual a
   * `fundo`, e a diferença é o que faz o texto no botão vermelho passar: o
   * `#FF1801` tem contraste máximo de 5,383 contra preto puro, então sobra
   * pouquíssima margem. Sobre `#1A1A1A` daria 4,461 (reprova); sobre `#0F0F0F`
   * dá **4,914**. Mode-invariante, porque os preenchimentos que ela cobre
   * também são.
   */
  textoEscuro: '#0F0F0F',

  // ---- Acento 1: vermelho F1 (marca, ação primária, jogador) ----
  primaria: '#FF1801',
  /**
   * O vermelho como TINTA. No dark precisa clarear: `#FF1801` sobre `#1A1A1A`
   * dá 4,461 — reprova 4,5 por 0,9%. O par de PREENCHIMENTO
   * (`primaria/fundo`) foi reclassificado pra 3:1 por decisão do dev (o
   * vermelho é botão/destaque/carro, não corpo de texto), mas a tinta tem que
   * bater 4,5 por definição, então ela clareia até `#FF5443`.
   */
  primariaTexto: '#FF5443',

  // ---- Acento 2: dourado/âmbar (pódio, campeão, volta rápida) ----
  acento: '#FFB800',
  acentoTexto: '#FFB800', // no dark a tinta é a própria cor da marca (8,276 no pior fundo)

  // ---- Acento 3: verde semáforo (largada, status ok) ----
  sucesso: '#00D26A',
  sucessoTexto: '#00D26A', // idem (7,127 no pior fundo)

  erro: '#FF7B85', // salmão — deliberadamente NÃO é o vermelho da marca (ver nota abaixo)
  erroTexto: '#FF7B85',

  borda: '#3A3A3A', // decorativa — fora dos pares de contraste (ver doc do módulo)
  bordaInterativa: '#8A8A8A', // inputs/selects/foco — precisa de 3:1

  raridadeComum: '#3DDC64',
  raridadeRaro: '#3FA9FF',
  raridadeEpico: '#B45BFF',
  raridadeLendario: '#FFC93C',
  /** `raridadeLendario` também é COR DE TEXTO (`.linha-volta-rapida`), daí a tinta separada. */
  raridadeLendarioTexto: '#FFC93C',
  raridadeProibido: '#FF4757',

  // ---- Pista — TODOS mode-invariantes (ver `coresLight`) ----
  /**
   * Chão do replay: o `<rect>` que cobre o viewBox e o `background` do painel.
   *
   * Token PRÓPRIO desde o 7.8, e a razão é estrutural, não estética: até aqui
   * este papel era `fundo`, e `fundo` agora muda com o modo. Com o claro, o
   * chão do replay viraria `#F5F0EB` e a pilha inteira se inverteria — o
   * terreno ficaria MAIS ESCURO que o chão e o relevo aprovado no 7.3.1 viraria
   * um poço. O valor é exatamente o `fundo` do dark, então **no modo escuro
   * nada mudou de aparência**; o que mudou é que o replay parou de depender de
   * um token que troca de valor.
   */
  pistaChao: '#1A1A1A',
  /**
   * Anel de escape. Mesma história do `pistaChao`: o papel era do
   * `fundoAfundado` (maquete do 7.1, à época `#0E0C20`), e `fundoAfundado`
   * agora clareia no light mode. O valor é o `fundoAfundado` do dark.
   *
   * Continua sendo MAIS ESCURO que o terreno de propósito — é um sulco, não um
   * degrau que sobe (ver `CAMADAS_PISTA` em `pista-camadas.ts`).
   */
  pistaEscape: '#121212',
  /**
   * Superfície da pista, e a cor MAIS CLARA de toda a hierarquia de pista —
   * é isso que faz o traçado ler como pista em vez de se misturar ao entorno.
   *
   * O valor DESCEU no 7.8 (`#3E3A5C`, luminância 0,0482, virou `#363636`,
   * 0,0369) e não foi escolha de gosto: o teto do asfalto é imposto pelo carro
   * do jogador, que precisa de 3:1 contra ele. Com o magenta antigo
   * (luminância 0,295) o teto era 0,0650; com o vermelho `#FF1801` (0,219) o
   * teto caiu pra **0,0397**. O asfalto roxo antigo não caberia mais.
   */
  pistaAsfalto: '#363636',
  /** Aro que delimita a pista contra o entorno. */
  pistaMuro: '#2E2E2E',
  /** Faixa larga de terreno do autódromo, ao redor do traçado. */
  pistaTerreno: '#202020',
  /** Plataforma de paddock/pit — papel próprio, fora da pilha do traçado. */
  pistaServico: '#262626',
  /** Limite de pista: a linha clara e contínua que carrega a leitura do traçado
   *  (o asfalto não consegue 3:1 contra fundo nenhum — prova em `tokens.test.ts`). */
  pistaLimite: '#9A9A9A',
  /** Zebra faixa A — vermelho, e faixa B — branco. O zebra real de F1 é
   *  vermelho e branco; com o vermelho virando a primária isso saiu de graça.
   *  Antes eram amarelo + salmão (`primaria` + `erro` da paleta velha). */
  pistaZebraA: '#FF1801',
  pistaZebraB: '#F5F0EB',
  /**
   * Corpo do chassi dos 21 bots. Token PRÓPRIO — NÃO reusar `raridadeComum`:
   * raridade é conceito de peça/draft, cor de carro é conceito de corrida.
   * Reusar raridade como cor de carro não vaza nada hoje (todo bot é pintado
   * igual), mas é bomba-relógio semântica pro Modo Cego (PR 2.3) — se o carro
   * "denunciar" a raridade por reuso de token, o Modo Cego vaza informação sem
   * ninguém perceber o acoplamento. `tokens.test.ts` trava
   * `carroBot !== raridadeComum`.
   */
  carroBot: '#B0B0B0',
} as const;

export type NomeCor = keyof typeof cores;

/** Os dois modos de tema. `dark` é o padrão do app. */
export type ModoTema = 'dark' | 'light';

/**
 * Override PARCIAL da paleta clara. Só aparece aqui o que muda — todo token
 * ausente é idêntico nos dois modos, e isso é a garantia que sustenta duas
 * coisas de uma vez:
 *
 * 1. **Os acentos da marca são os MESMOS nos dois modos** (`primaria`,
 *    `acento`, `sucesso` não estão nesta lista). O que muda é só a tinta
 *    (`*Texto`), onde a aritmética não deixa alternativa.
 * 2. **Nenhum token `pista*` está aqui.** O painel do replay é uma ilha escura
 *    nos dois modos, e é o que mantém intacta a regra 1 da Fase 7 (asfalto é a
 *    superfície mais clara) — que seria impossível sobre uma base clara: o
 *    asfalto tem teto de luminância 0,0397, e o `fundo` claro está em 0,877.
 */
export const coresLight: Partial<Record<NomeCor, string>> = {
  fundo: '#F5F0EB', // branco quente (base do app)
  fundoElevado: '#FFFFFF', // cards
  fundoAfundado: '#E8E3DE', // inputs, wells
  texto: '#2A2A2A',
  textoSuave: '#666666', // #6A6A6A reprovaria contra `fundoAfundado` (4,243); #666666 dá 4,504

  // Tintas: mesma matiz, escurecidas até bater 4,5 contra o PIOR fundo claro
  // (que é `fundoAfundado`, não a base — medir só contra a base deixa passar
  // texto ilegível dentro de input).
  primariaTexto: '#CB1301',
  acentoTexto: '#845F00',
  sucessoTexto: '#00763C',
  erroTexto: '#9F4D53',
  raridadeLendarioTexto: '#7D621D',

  // Raridades são `border-color` de 1px (alvo 3:1). As cores vivas do dark
  // ficam entre 1,32 e 3,15 sobre card branco — escurecem mantendo a matiz e a
  // distinção entre as cinco.
  raridadeComum: '#299544',
  raridadeRaro: '#3287CC',
  raridadeEpico: '#AD57F5',
  raridadeLendario: '#9F7E26',
  raridadeProibido: '#EC4250',

  borda: '#D5CEC6',
  bordaInterativa: '#6A6A6A',
};

/** Paleta completa de um modo (o claro é `cores` + os overrides de `coresLight`). */
export function paleta(modo: ModoTema): Record<NomeCor, string> {
  return modo === 'dark' ? { ...cores } : { ...cores, ...coresLight };
}

/**
 * Escopo em que um par de contraste precisa valer.
 * - `'ambos'`: os dois modos.
 * - `'pista'`: só o dark. NÃO é dispensa — é que os tokens envolvidos são
 *   mode-invariantes (o painel do replay é escuro nos dois modos), então medir
 *   no claro seria medir exatamente os mesmos hex de novo.
 * - `'light'`: só o claro.
 */
export type EscopoPar = 'ambos' | 'pista' | 'light';

/** Um par de contraste declarado a validar (texto normal: mínimo 4.5; elemento de UI: mínimo 3). */
export interface ParContraste {
  nome: string;
  fg: NomeCor;
  bg: NomeCor;
  minimo: 4.5 | 3;
  escopo: EscopoPar;
}

/**
 * Pares de contraste exigidos pelo design (WCAG 2.x): texto normal >= 4.5:1,
 * elementos de UI/estado >= 3:1. `tokens.test.ts` calcula a razão real de cada
 * par EM CADA MODO aplicável e garante que nenhum fique abaixo do mínimo.
 *
 * Regra de leitura: tokens `*Texto` medem contra os três fundos (base, card e
 * afundado), porque tinta aparece nos três. Preenchimento mede com
 * `textoEscuro` por cima.
 */
export const PARES_CONTRASTE: ParContraste[] = [
  // ---- Texto sobre as três superfícies ----
  { nome: 'texto/fundo', fg: 'texto', bg: 'fundo', minimo: 4.5, escopo: 'ambos' },
  { nome: 'texto/fundoElevado', fg: 'texto', bg: 'fundoElevado', minimo: 4.5, escopo: 'ambos' },
  { nome: 'texto/fundoAfundado', fg: 'texto', bg: 'fundoAfundado', minimo: 4.5, escopo: 'ambos' },
  { nome: 'textoSuave/fundo', fg: 'textoSuave', bg: 'fundo', minimo: 4.5, escopo: 'ambos' },
  { nome: 'textoSuave/fundoElevado', fg: 'textoSuave', bg: 'fundoElevado', minimo: 4.5, escopo: 'ambos' },
  { nome: 'textoSuave/fundoAfundado', fg: 'textoSuave', bg: 'fundoAfundado', minimo: 4.5, escopo: 'ambos' },

  // ---- Acentos como TINTA (o par que o `*Texto` existe pra proteger) ----
  { nome: 'primariaTexto/fundo', fg: 'primariaTexto', bg: 'fundo', minimo: 4.5, escopo: 'ambos' },
  { nome: 'primariaTexto/fundoElevado', fg: 'primariaTexto', bg: 'fundoElevado', minimo: 4.5, escopo: 'ambos' },
  { nome: 'acentoTexto/fundo', fg: 'acentoTexto', bg: 'fundo', minimo: 4.5, escopo: 'ambos' },
  { nome: 'acentoTexto/fundoElevado', fg: 'acentoTexto', bg: 'fundoElevado', minimo: 4.5, escopo: 'ambos' },
  { nome: 'sucessoTexto/fundo', fg: 'sucessoTexto', bg: 'fundo', minimo: 4.5, escopo: 'ambos' },
  { nome: 'sucessoTexto/fundoElevado', fg: 'sucessoTexto', bg: 'fundoElevado', minimo: 4.5, escopo: 'ambos' },
  { nome: 'erroTexto/fundo', fg: 'erroTexto', bg: 'fundo', minimo: 4.5, escopo: 'ambos' },
  { nome: 'erroTexto/fundoAfundado', fg: 'erroTexto', bg: 'fundoAfundado', minimo: 4.5, escopo: 'ambos' }, // texto do painel .erro
  { nome: 'raridadeLendarioTexto/fundo', fg: 'raridadeLendarioTexto', bg: 'fundo', minimo: 4.5, escopo: 'ambos' },
  { nome: 'raridadeLendarioTexto/fundoElevado', fg: 'raridadeLendarioTexto', bg: 'fundoElevado', minimo: 4.5, escopo: 'ambos' },

  // ---- Tinta escura sobre os PREENCHIMENTOS de acento ----
  { nome: 'textoEscuro/primaria', fg: 'textoEscuro', bg: 'primaria', minimo: 4.5, escopo: 'ambos' }, // texto do botão primário
  { nome: 'textoEscuro/acento', fg: 'textoEscuro', bg: 'acento', minimo: 4.5, escopo: 'ambos' },
  { nome: 'textoEscuro/sucesso', fg: 'textoEscuro', bg: 'sucesso', minimo: 4.5, escopo: 'ambos' },
  { nome: 'textoEscuro/erro', fg: 'textoEscuro', bg: 'erro', minimo: 4.5, escopo: 'ambos' }, // texto do badge DNF
  { nome: 'textoEscuro/raridadeLendario', fg: 'textoEscuro', bg: 'raridadeLendario', minimo: 4.5, escopo: 'ambos' }, // texto do badge PIT

  /**
   * O vermelho como PREENCHIMENTO exige 3:1, não 4,5 — decisão explícita do
   * dev no 7.8. Pelo próprio brief, o vermelho é botão, destaque e posição do
   * jogador: elementos de UI, não corpo de texto, e é 3:1 que a WCAG pede
   * pra isso. Medido: 4,461 no dark e 3,445 no claro.
   *
   * Não "arredondar" isso pra 4,5 depois: `#FF1801` tem teto de 5,383 (contra
   * preto puro), então 4,5 sobre a base exigiria abandonar o hex da marca F1,
   * que é justamente o ponto da paleta. Pra vermelho em texto existe
   * `primariaTexto`.
   */
  { nome: 'primaria/fundo', fg: 'primaria', bg: 'fundo', minimo: 3, escopo: 'ambos' },
  { nome: 'primaria/fundoElevado', fg: 'primaria', bg: 'fundoElevado', minimo: 3, escopo: 'ambos' },

  // ---- Bordas interativas e raridades (elementos de UI, 3:1) ----
  { nome: 'bordaInterativa/fundo', fg: 'bordaInterativa', bg: 'fundo', minimo: 3, escopo: 'ambos' },
  { nome: 'bordaInterativa/fundoElevado', fg: 'bordaInterativa', bg: 'fundoElevado', minimo: 3, escopo: 'ambos' },
  { nome: 'bordaInterativa/fundoAfundado', fg: 'bordaInterativa', bg: 'fundoAfundado', minimo: 3, escopo: 'ambos' },
  { nome: 'raridadeComum/fundoElevado', fg: 'raridadeComum', bg: 'fundoElevado', minimo: 3, escopo: 'ambos' },
  { nome: 'raridadeRaro/fundoElevado', fg: 'raridadeRaro', bg: 'fundoElevado', minimo: 3, escopo: 'ambos' },
  { nome: 'raridadeEpico/fundoElevado', fg: 'raridadeEpico', bg: 'fundoElevado', minimo: 3, escopo: 'ambos' },
  { nome: 'raridadeLendario/fundoElevado', fg: 'raridadeLendario', bg: 'fundoElevado', minimo: 3, escopo: 'ambos' },
  { nome: 'raridadeProibido/fundoElevado', fg: 'raridadeProibido', bg: 'fundoElevado', minimo: 3, escopo: 'ambos' },

  // ---- Pista (escopo `pista`: tokens mode-invariantes) ----
  { nome: 'carroBot/pistaAsfalto', fg: 'carroBot', bg: 'pistaAsfalto', minimo: 3, escopo: 'pista' }, // achar qualquer carro
  { nome: 'primaria/pistaAsfalto', fg: 'primaria', bg: 'pistaAsfalto', minimo: 3, escopo: 'pista' }, // achar o SEU carro
  // O plano original também previa `pistaAsfalto`/`fundoAfundado` >= 3, mas
  // isso é MATEMATICAMENTE IMPOSSÍVEL de coexistir com `primaria`/`pistaAsfalto`
  // >= 3 (prova executável em `tokens.test.ts`). A fronteira pista/entorno é
  // carregada pelo MURO DESENHADO, não pelo contraste de preenchimento.
  // Não adicionar esse par de volta.
  { nome: 'textoEscuro/carroBot', fg: 'textoEscuro', bg: 'carroBot', minimo: 4.5, escopo: 'pista' }, // número no chassi
  { nome: 'pistaLimite/pistaAsfalto', fg: 'pistaLimite', bg: 'pistaAsfalto', minimo: 3, escopo: 'pista' },
  // `pistaChao` é a superfície REAL sob o traçado no replay (o <rect>
  // `.tracado-svg__chao` e o `background` de `.tracado-svg`);
  // `pista-camadas.test.ts` trava esse casamento contra o CSS.
  { nome: 'pistaLimite/pistaChao', fg: 'pistaLimite', bg: 'pistaChao', minimo: 3, escopo: 'pista' },
  { nome: 'pistaZebraA/pistaAsfalto', fg: 'pistaZebraA', bg: 'pistaAsfalto', minimo: 3, escopo: 'pista' },
  { nome: 'pistaZebraB/pistaAsfalto', fg: 'pistaZebraB', bg: 'pistaAsfalto', minimo: 3, escopo: 'pista' },
];

/** Escala de espaçamento (px), consistente em toda a UI. */
export const espacamento = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Raios de borda (px). `pill` é usado em badges/tags totalmente arredondados. */
export const raio = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Alvo mínimo de toque (px) pra qualquer elemento interativo (WCAG 2.5.5 / mobile). */
export const alvoToque = 44;

/**
 * Breakpoints (px), documentados aqui como fonte da verdade — media queries
 * em CSS não podem usar custom properties, então este valor não é
 * espelhado em `tokens.css`; ele existe só pra manter os números
 * consistentes entre o CSS escrito à mão e qualquer lógica JS futura.
 */
export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
} as const;
