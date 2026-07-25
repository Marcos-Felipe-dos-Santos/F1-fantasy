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
