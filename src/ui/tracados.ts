/**
 * Silhuetas de traçado por pista (PR 2.8, GDD §9/§14.2): antes deste PR, as
 * 10 pistas do dataset compartilhavam a mesma polilinha (`TRACADO_GENERICO`,
 * ex-Monza) — escolher outra pista não mudava o desenho. Cada entrada aqui é
 * uma silhueta ESTILIZADA E ORIGINAL desenhada à mão nas coordenadas do
 * viewBox `0 0 1000 600`, sem decalcar o mapa oficial da F1/FIA nem qualquer
 * ilustração existente: evoca uma característica famosa do circuito real
 * (a geometria/fato é livre), mas não é o traçado real e precisão não
 * importa — mesmo espírito do `TRACADO_GENERICO` (Monza).
 *
 * Todas as polilinhas são FECHADAS implicitamente: o último ponto liga de
 * volta ao primeiro (ver `pontoNoTracado`), sem repetir o primeiro ponto no
 * fim do array.
 */

import type { TracadoImutavel } from './fluxo-corrida';
import { TRACADO_GENERICO } from './fluxo-corrida';

/** Mônaco: circuito de rua apertado e anguloso — a hairpin (Loews/Fairmont) bem fechada e a seção "piscina" em zigue-zague, poucas retas. */
const TRACADO_MONACO: TracadoImutavel = [
  { x: 150, y: 520 },
  { x: 450, y: 520 },
  { x: 500, y: 480 },
  { x: 480, y: 380 },
  { x: 520, y: 300 },
  { x: 470, y: 220 },
  { x: 500, y: 150 },
  { x: 430, y: 90 },
  { x: 380, y: 95 },
  { x: 340, y: 160 },
  { x: 360, y: 280 },
  { x: 300, y: 340 },
  { x: 380, y: 360 },
  { x: 320, y: 420 },
  { x: 250, y: 480 },
  { x: 150, y: 500 },
];

/** Spa-Francorchamps: longa e fluida, zigue-zague curto e agudo subindo logo após a largada (Eau Rouge/Raidillon), reta longa (Kemmel) e curvas amplas rápidas. */
const TRACADO_SPA: TracadoImutavel = [
  { x: 100, y: 500 },
  { x: 200, y: 520 },
  { x: 320, y: 480 },
  { x: 300, y: 420 },
  { x: 360, y: 380 },
  { x: 340, y: 320 },
  { x: 450, y: 250 },
  { x: 700, y: 200 },
  { x: 900, y: 220 },
  { x: 870, y: 320 },
  { x: 800, y: 380 },
  { x: 750, y: 460 },
  { x: 600, y: 500 },
  { x: 400, y: 545 },
  { x: 200, y: 540 },
];

/** Silverstone: fluida e rápida, formato largo com um complexo de curvas encadeadas (tipo Maggotts/Becketts). */
const TRACADO_SILVERSTONE: TracadoImutavel = [
  { x: 120, y: 500 },
  { x: 350, y: 520 },
  { x: 550, y: 500 },
  { x: 650, y: 460 },
  { x: 700, y: 380 },
  { x: 630, y: 340 },
  { x: 680, y: 280 },
  { x: 620, y: 230 },
  { x: 670, y: 170 },
  { x: 600, y: 120 },
  { x: 450, y: 100 },
  { x: 250, y: 120 },
  { x: 150, y: 200 },
  { x: 200, y: 320 },
  { x: 130, y: 400 },
  { x: 100, y: 460 },
];

/**
 * Suzuka: layout em "8" — a polilinha CRUZA a si mesma visualmente por
 * construção (discretização de uma lemniscate de Gerono centrada em
 * (500, 300); os pontos de índice 4 e 12 caem exatamente no centro). Isso
 * evoca o cruzamento famoso de Suzuka (a "ponte" passando por cima da pista),
 * mas é só um efeito visual: `pontoNoTracado` percorre a polilinha por
 * comprimento de arco na ordem sequencial dos pontos, então a auto-interseção
 * não afeta o movimento dos carros — eles simplesmente passam "por cima" no
 * desenho, como a ponte real.
 */
const TRACADO_SUZUKA: TracadoImutavel = [
  { x: 900, y: 300 },
  { x: 870, y: 477 },
  { x: 783, y: 550 },
  { x: 653, y: 477 },
  { x: 500, y: 300 },
  { x: 347, y: 123 },
  { x: 217, y: 50 },
  { x: 130, y: 123 },
  { x: 100, y: 300 },
  { x: 130, y: 477 },
  { x: 217, y: 550 },
  { x: 347, y: 477 },
  { x: 500, y: 300 },
  { x: 653, y: 123 },
  { x: 783, y: 50 },
  { x: 870, y: 123 },
];

/** Interlagos: anti-horário compacto, curva ampla de largada descendo (tipo "S do Senna"), miolo torcido e uma reta oposta longa. */
const TRACADO_INTERLAGOS: TracadoImutavel = [
  { x: 150, y: 200 },
  { x: 400, y: 160 },
  { x: 470, y: 220 },
  { x: 420, y: 280 },
  { x: 500, y: 340 },
  { x: 460, y: 420 },
  { x: 550, y: 460 },
  { x: 500, y: 520 },
  { x: 600, y: 540 },
  { x: 650, y: 480 },
  { x: 750, y: 500 },
  { x: 900, y: 460 },
  { x: 880, y: 300 },
  { x: 750, y: 220 },
  { x: 600, y: 140 },
  { x: 300, y: 130 },
];

/** Nürburgring (Nordschleife estilizada): contorno longo e irregular, muitas curvas pequenas serrilhadas, formato alongado "de floresta". */
const TRACADO_NURBURGRING: TracadoImutavel = [
  { x: 80, y: 300 },
  { x: 150, y: 150 },
  { x: 220, y: 190 },
  { x: 300, y: 140 },
  { x: 380, y: 175 },
  { x: 460, y: 130 },
  { x: 540, y: 165 },
  { x: 620, y: 120 },
  { x: 700, y: 155 },
  { x: 780, y: 110 },
  { x: 860, y: 160 },
  { x: 920, y: 300 },
  { x: 860, y: 440 },
  { x: 780, y: 490 },
  { x: 700, y: 445 },
  { x: 620, y: 480 },
  { x: 540, y: 435 },
  { x: 460, y: 470 },
  { x: 380, y: 425 },
  { x: 300, y: 460 },
  { x: 220, y: 410 },
  { x: 150, y: 450 },
];

/** Imola: anti-horário, chicanes e curvas médias encadeadas (Tamburello/Variante Alta estilizadas), formato médio. */
const TRACADO_IMOLA: TracadoImutavel = [
  { x: 150, y: 500 },
  { x: 450, y: 510 },
  { x: 600, y: 480 },
  { x: 580, y: 430 },
  { x: 630, y: 400 },
  { x: 700, y: 350 },
  { x: 680, y: 280 },
  { x: 620, y: 250 },
  { x: 660, y: 200 },
  { x: 600, y: 150 },
  { x: 450, y: 120 },
  { x: 300, y: 140 },
  { x: 200, y: 220 },
  { x: 250, y: 320 },
  { x: 180, y: 400 },
  { x: 120, y: 460 },
];

/** Red Bull Ring: curto e triangular, poucas retas em subida com 3-4 freadas fortes. */
const TRACADO_RED_BULL_RING: TracadoImutavel = [
  { x: 200, y: 500 },
  { x: 500, y: 520 },
  { x: 560, y: 440 },
  { x: 650, y: 460 },
  { x: 720, y: 380 },
  { x: 680, y: 300 },
  { x: 750, y: 200 },
  { x: 600, y: 140 },
  { x: 400, y: 160 },
  { x: 300, y: 250 },
  { x: 220, y: 350 },
  { x: 180, y: 430 },
];

/** Montreal (Gilles Villeneuve): formato alongado/estreito tipo ilha, retas paralelas e a última chicane apertada antes da linha (Muro dos Campeões) bem marcada. */
const TRACADO_MONTREAL: TracadoImutavel = [
  { x: 150, y: 540 },
  { x: 150, y: 460 },
  { x: 140, y: 300 },
  { x: 160, y: 150 },
  { x: 300, y: 100 },
  { x: 450, y: 120 },
  { x: 600, y: 100 },
  { x: 750, y: 150 },
  { x: 800, y: 300 },
  { x: 790, y: 460 },
  { x: 750, y: 520 },
  { x: 700, y: 480 },
  { x: 650, y: 540 },
  { x: 400, y: 545 },
];

/** Traçado por pista (id do dataset ⇒ polilinha); Monza reaproveita `TRACADO_GENERICO` (já é a Monza estilizada). */
export const TRACADOS_POR_PISTA: Readonly<Record<string, TracadoImutavel>> = {
  'pista-monaco': TRACADO_MONACO,
  'pista-spa': TRACADO_SPA,
  'pista-monza': TRACADO_GENERICO,
  'pista-silverstone': TRACADO_SILVERSTONE,
  'pista-suzuka': TRACADO_SUZUKA,
  'pista-interlagos': TRACADO_INTERLAGOS,
  'pista-nurburgring': TRACADO_NURBURGRING,
  'pista-imola': TRACADO_IMOLA,
  'pista-red-bull-ring': TRACADO_RED_BULL_RING,
  'pista-montreal': TRACADO_MONTREAL,
};

/** Traçado da pista `pistaId`, ou `TRACADO_GENERICO` como fallback pra um id sem silhueta própria (ex.: pista futura ainda não desenhada). */
export function tracadoDaPista(pistaId: string): TracadoImutavel {
  return TRACADOS_POR_PISTA[pistaId] ?? TRACADO_GENERICO;
}
