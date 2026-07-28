/**
 * Design tokens do F1 Fantasy (PR 5.1a) — fonte da verdade da paleta, tipos
 * de escala e alvos de contraste. Este módulo é dados puros (sem DOM, sem
 * regra de jogo): `tokens.css` espelha os mesmos valores como custom
 * properties CSS (`tokens.test.ts` garante a sincronia entre os dois).
 *
 * Paleta validada pelo dev contra a fórmula WCAG 2.x (ver `tokens.test.ts`).
 * `borda` é DECORATIVA — a delimitação visual dos cards/painéis vem do
 * contraste entre `fundo`/`fundoElevado`/`fundoAfundado`, não da borda; por
 * isso `borda` fica de fora de `PARES_CONTRASTE` (não precisa bater 3:1).
 * `bordaInterativa` (usada em inputs/selects/foco) precisa de 3:1 — está na
 * lista.
 */

export const cores = {
  fundo: '#16132E', // azul-noite profundo (base do app)
  fundoElevado: '#241F45', // cards, painéis
  fundoAfundado: '#0E0C20', // inputs, wells
  texto: '#F4F2FF',
  textoSuave: '#B9B3DC',
  textoEscuro: '#16132E', // texto sobre botão primário
  primaria: '#FFCC00', // amarelo arcade (botão primário)
  acento: '#29D9F5', // ciano (destaques, links)
  magenta: '#FF4FA3', // destaque do jogador humano
  sucesso: '#3DDC64',
  erro: '#FF7B85',
  borda: '#3A3468', // decorativa — fora dos pares de contraste (ver doc acima)
  bordaInterativa: '#756CC7', // inputs/selects/foco — precisa de 3:1
  raridadeComum: '#3DDC64',
  raridadeRaro: '#3FA9FF',
  raridadeEpico: '#B45BFF',
  raridadeLendario: '#FFC93C',
  raridadeProibido: '#FF4757',

  // ---- Pista (PR 7.2, valores validados na maquete `MockPista.tsx`, PR 7.1) ----
  /**
   * Superfície da pista. Precisa continuar sendo a cor MAIS CLARA de toda a
   * hierarquia de pista (ver teste de ordem de luminância em `tokens.test.ts`)
   * — é isso que faz o traçado ler como pista em vez de se misturar com o
   * entorno. Foi medindo essa ordem que se descobriu, no PR 7.1, que o muro
   * antigo (`borda` #3A3468, luminância 0.0435) competia com o próprio
   * asfalto (0.0482): por isso o muro da pista tem token dedicado
   * (`pistaMuro`), mais escuro que `borda`, em vez de reusar `borda`.
   */
  pistaAsfalto: '#3E3A5C',
  /** Aro que delimita a pista contra o entorno (mais escuro que `borda` — ver `pistaAsfalto`). */
  pistaMuro: '#2F2A55',
  /** Faixa larga de terreno do autódromo, ao redor do traçado. */
  pistaTerreno: '#1B1738',
  /** Áreas de escape em curva e plataforma de paddock/pit. */
  pistaServico: '#221E42',
  /** Limite de pista: a linha clara e contínua que delimita o asfalto em toda a
   *  volta. É ELA que carrega a leitura do traçado — o asfalto não consegue
   *  3:1 contra fundo nenhum (prova de impossibilidade em `tokens.test.ts`).
   *  Valor = branco `texto` a 60% sobre `pistaMuro`, promovido a hex OPACO
   *  pra que a guarda de contraste seja exata em vez de depender de
   *  compositing. DESVIO DELIBERADO da maquete do PR 7.1, que usa 50%
   *  (`#928EAA`): a 50%, o contraste contra o asfalto fica em 3,396 — só 13%
   *  acima do mínimo 3, sem folga nenhuma — enquanto a 60% fica em 4,319. */
  pistaLimite: '#A5A2BB',
  /** Zebra (faixa A). Mesmo hex de `primaria` DE PROPÓSITO — a zebra amarela é
   *  a cor de acento do sistema. O token separado existe pra que mudar o
   *  botão primário não repinte a pista. */
  pistaZebraA: '#FFCC00',
  /** Zebra (faixa B). Mesmo hex de `erro`, mesma justificativa de `pistaZebraA`. */
  pistaZebraB: '#FF7B85',
  /**
   * Corpo do chassi dos 21 bots. Token PRÓPRIO — NÃO reusar `raridadeComum`
   * (`#3DDC64`, que é o que o CSS de produção pinta hoje em
   * `.tracado-svg__carro`): raridade é conceito de peça/draft,
   * cor de carro é conceito de corrida. Reusar raridade como cor de carro não
   * vaza nada hoje (todo bot é pintado igual), mas é bomba-relógio semântica
   * pro Modo Cego (PR 2.3), que pretende ocultar a raridade das peças do
   * adversário — se o carro "denunciar" a raridade por reuso de token, o Modo
   * Cego vaza informação sem ninguém perceber o acoplamento. `tokens.test.ts`
   * trava `carroBot !== raridadeComum`.
   */
  carroBot: '#B9B3DC',
} as const;

export type NomeCor = keyof typeof cores;

/** Um par de contraste declarado a validar (texto normal: mínimo 4.5; elemento de UI: mínimo 3). */
export interface ParContraste {
  nome: string;
  fg: NomeCor;
  bg: NomeCor;
  minimo: 4.5 | 3;
}

/**
 * Pares de contraste exigidos pelo design (WCAG 2.x): texto normal >= 4.5:1,
 * elementos de UI/estado (bordas interativas, botões, indicadores de
 * raridade) >= 3:1. `tokens.test.ts` calcula a razão real de cada par e
 * garante que nenhum fique abaixo do mínimo declarado aqui.
 */
export const PARES_CONTRASTE: ParContraste[] = [
  { nome: 'texto/fundo', fg: 'texto', bg: 'fundo', minimo: 4.5 },
  { nome: 'texto/fundoElevado', fg: 'texto', bg: 'fundoElevado', minimo: 4.5 },
  { nome: 'texto/fundoAfundado', fg: 'texto', bg: 'fundoAfundado', minimo: 4.5 }, // texto de input/select
  { nome: 'erro/fundoAfundado', fg: 'erro', bg: 'fundoAfundado', minimo: 4.5 }, // texto do painel .erro
  { nome: 'textoSuave/fundo', fg: 'textoSuave', bg: 'fundo', minimo: 4.5 },
  { nome: 'textoSuave/fundoElevado', fg: 'textoSuave', bg: 'fundoElevado', minimo: 4.5 },
  { nome: 'textoEscuro/primaria', fg: 'textoEscuro', bg: 'primaria', minimo: 4.5 },
  { nome: 'textoEscuro/erro', fg: 'textoEscuro', bg: 'erro', minimo: 4.5 }, // texto do badge DNF
  { nome: 'textoEscuro/raridadeLendario', fg: 'textoEscuro', bg: 'raridadeLendario', minimo: 4.5 }, // texto do badge PIT
  { nome: 'acento/fundo', fg: 'acento', bg: 'fundo', minimo: 4.5 },
  { nome: 'magenta/fundo', fg: 'magenta', bg: 'fundo', minimo: 4.5 },
  { nome: 'sucesso/fundo', fg: 'sucesso', bg: 'fundo', minimo: 4.5 },
  { nome: 'erro/fundo', fg: 'erro', bg: 'fundo', minimo: 4.5 },
  { nome: 'primaria/fundo', fg: 'primaria', bg: 'fundo', minimo: 3 },
  { nome: 'bordaInterativa/fundo', fg: 'bordaInterativa', bg: 'fundo', minimo: 3 },
  { nome: 'bordaInterativa/fundoElevado', fg: 'bordaInterativa', bg: 'fundoElevado', minimo: 3 },
  { nome: 'bordaInterativa/fundoAfundado', fg: 'bordaInterativa', bg: 'fundoAfundado', minimo: 3 }, // borda de input/select
  { nome: 'raridadeComum/fundoElevado', fg: 'raridadeComum', bg: 'fundoElevado', minimo: 3 },
  { nome: 'raridadeRaro/fundoElevado', fg: 'raridadeRaro', bg: 'fundoElevado', minimo: 3 },
  { nome: 'raridadeEpico/fundoElevado', fg: 'raridadeEpico', bg: 'fundoElevado', minimo: 3 },
  { nome: 'raridadeLendario/fundoElevado', fg: 'raridadeLendario', bg: 'fundoElevado', minimo: 3 },
  { nome: 'raridadeProibido/fundoElevado', fg: 'raridadeProibido', bg: 'fundoElevado', minimo: 3 },

  // ---- Pista (PR 7.2) — carro sobre asfalto precisa ser achável ----
  { nome: 'carroBot/pistaAsfalto', fg: 'carroBot', bg: 'pistaAsfalto', minimo: 3 }, // achar qualquer carro sobre a pista
  { nome: 'magenta/pistaAsfalto', fg: 'magenta', bg: 'pistaAsfalto', minimo: 3 }, // achar o SEU carro sobre a pista
  // O plano original também previa `pistaAsfalto`/`fundoAfundado` >= 3, mas
  // isso é MATEMATICAMENTE IMPOSSÍVEL de coexistir com `magenta`/`pistaAsfalto`
  // >= 3. Prova: luminância do magenta é fixa em ~0.295; pra magenta/asfalto
  // >= 3, o asfalto precisa de luminância <= 0.065; pra o asfalto nessas
  // condições ainda ficar 3:1 ACIMA do fundo/escape, o fundo precisaria de
  // luminância (0.065+0.05)/3 - 0.05 = -0.012, que não existe (luminância
  // mínima é 0). Decisão: mantém-se `magenta`/`pistaAsfalto` >= 3, e a
  // fronteira pista/entorno passa a ser carregada pelo MURO DESENHADO (camada
  // própria, `pistaMuro`), não pelo contraste de preenchimento entre asfalto
  // e fundo. Não adicionar esse par de volta.
  // Número no chassi: o código (MockPista.tsx) pinta o dígito com `textoEscuro`
  // (#16132E), não com `texto` (#F4F2FF) — por isso os pares abaixo usam
  // `textoEscuro`.
  // RESSALVA (revisão do 7.2): o dígito é desenhado por cima do disco do
  // COCKPIT (r=5 em (-1,0)), então o fundo predominante do número é o
  // capacete, não o corpo do chassi. Os dois casos passam com folga
  // (textoEscuro/acento = 10.57, textoEscuro/primaria = 11.90), por isso não
  // travamos ainda — mas quando o PR 7.9 trouxer o marcador pra produção, os
  // pares de capacete entram aqui.
  { nome: 'textoEscuro/carroBot', fg: 'textoEscuro', bg: 'carroBot', minimo: 4.5 }, // número no chassi do bot
  { nome: 'textoEscuro/magenta', fg: 'textoEscuro', bg: 'magenta', minimo: 4.5 }, // número no chassi do humano

  // ---- Pista (PR 7.3) — o LIMITE de pista precisa ser achável contra o asfalto E contra o fundo do replay ----
  { nome: 'pistaLimite/pistaAsfalto', fg: 'pistaLimite', bg: 'pistaAsfalto', minimo: 3 },
  // `fundo` é a superfície REAL sob o traçado no replay (o <rect> de chão do
  // SVG, `.tracado-svg__chao`, e o `background` de `.tracado-svg`);
  // `pista-camadas.test.ts` trava esse casamento contra o CSS.
  { nome: 'pistaLimite/fundo', fg: 'pistaLimite', bg: 'fundo', minimo: 3 },
  // `fundoElevado` fica na lista mesmo não sendo mais o chão do replay (PR
  // 7.3.1): é o tom de card do resto da UI, e manter o par trava a
  // legibilidade do limite se um dia o painel voltar a ser elevado.
  { nome: 'pistaLimite/fundoElevado', fg: 'pistaLimite', bg: 'fundoElevado', minimo: 3 },
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
