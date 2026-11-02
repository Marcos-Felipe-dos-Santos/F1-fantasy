/**
 * Desenho do carro do replay (PR 2a), como dado puro. O carro aponta para +x, com
 * a origem no centro. Formas e cores próprias, sem livery nem logo.
 *
 * Decisão do Marcos, tomada olhando no celular de verdade: C completo no desktop;
 * no celular, a mesma proporção com as asas um pouco mais grossas (1,3-1,5 px no
 * bot a 360). A regra de 2 px foi descartada para o carro: ela supõe 1 pixel físico
 * por px, e os aparelhos têm 2 a 3. A asa engrossa só para dentro, então nem
 * envergadura nem comprimento mudam.
 */

import { VIEWBOX_LARGURA } from './pista-camadas';

/** Abaixo disto a `.tela-corrida` é a do celular; o mesmo corte do `@media` de `estilos.css`. */
export const LARGURA_TELA_ESTREITA = 700;

/** Tela de 360: 16 px de margem do `.app-shell` e 3 px de borda do `.tracado-svg` de cada lado. */
export const PISTA_PX_ESTREITA = 322;
/** `max-width` do `.tracado-svg`. */
export const PISTA_PX_LARGA = 700;

export const COMPRIMENTO_CARRO = 29;
export const ENVERGADURA_ASA_DIANTEIRA = 14;
export const ENVERGADURA_ASA_TRASEIRA = 12;
/** De fora a fora das rodas traseiras. */
export const LARGURA_CARRO = 18.8;

export const ASA_COMPLETA = 3;
export const ASA_PROPORCIONAL = 4.1;

/** Bot de 30 u e jogador de 43 u no celular; 25 u e 35 u no desktop. */
export const ESCALA_CARRO = {
  estreita: { bot: 1.05, humano: 1.48 },
  larga: { bot: 0.86, humano: 1.2 },
} as const;

/** Raio do halo do jogador, no sistema do carro: acompanha a escala dele. */
export const RAIO_HALO = 21;
/** Traço branco do humano: ele já se separa do asfalto, o contorno escuro é só dos bots. */
export const CONTORNO_HUMANO = 2.2;
const CONTORNO_BOT_VISIVEL_PX = 0.65;

/** Traço do bot, no sistema do carro. O corpo cobre a metade de dentro (`paint-order`). */
export function contornoDoBot(estreita: boolean): number {
  const larguraPx = estreita ? PISTA_PX_ESTREITA : PISTA_PX_LARGA;
  const escala = estreita ? ESCALA_CARRO.estreita.bot : ESCALA_CARRO.larga.bot;
  return (2 * CONTORNO_BOT_VISIVEL_PX * VIEWBOX_LARGURA) / (larguraPx * escala);
}

export interface Retangulo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function asasDoCarro(estreita: boolean): {
  espessura: number;
  dianteira: Retangulo;
  traseira: Retangulo;
} {
  const espessura = estreita ? ASA_PROPORCIONAL : ASA_COMPLETA;
  const frente = COMPRIMENTO_CARRO / 2;
  return {
    espessura,
    dianteira: {
      x: frente - espessura,
      y: -ENVERGADURA_ASA_DIANTEIRA / 2,
      width: espessura,
      height: ENVERGADURA_ASA_DIANTEIRA,
    },
    traseira: {
      x: -frente,
      y: -ENVERGADURA_ASA_TRASEIRA / 2,
      width: espessura,
      height: ENVERGADURA_ASA_TRASEIRA,
    },
  };
}

export const RODAS_DO_CARRO: readonly Retangulo[] = [
  { x: 4, y: -9, width: 6, height: 3.6 },
  { x: 4, y: 5.4, width: 6, height: 3.6 },
  { x: -11, y: -9.4, width: 6.6, height: 4 },
  { x: -11, y: 5.4, width: 6.6, height: 4 },
];

export const CORPO_DO_CARRO = 'M13 -1.6 L3 -3 L-1 -5.4 L-9 -5 L-13 -2.2 L-13 2.2 L-9 5 L-1 5.4 L3 3 L13 1.6 Z';

/**
 * Cortes do spray em u até o carro da frente, das distâncias medidas em 400
 * corridas: 35% dos pares andam a menos de 30 u e 62% a menos de 60 u.
 */
export const CORTE_SPRAY_FORTE = 30;
export const CORTE_SPRAY_MEDIO = 60;

/** Comprimento, meia largura e opacidade por nível: é um desenho só em cada `<use>`. */
export const SPRAY_POR_NIVEL = {
  1: { comprimento: 20, meiaLargura: 8, opacidade: 0.3 },
  2: { comprimento: 32, meiaLargura: 10, opacidade: 0.45 },
  3: { comprimento: 46, meiaLargura: 12, opacidade: 0.6 },
} as const;

export type NivelSpray = 0 | keyof typeof SPRAY_POR_NIVEL;

/**
 * Spray de cada carro pela distância até o carro à frente dele NA PISTA, por isso
 * em anel: a volta em que cada um está não importa. Decisão do Marcos para "mais
 * forte para quem vem atrás": quanto mais perto, mais spray. `null` é carro fora da
 * pista (box, chegada, abandono), que não solta spray nem conta como carro da frente.
 * Em nível, não em valor contínuo: o atributo só muda quando cruza um corte.
 */
export function niveisDeSpray(fracoes: readonly (number | null)[], perimetro: number): NivelSpray[] {
  const naPista = fracoes.flatMap((fracao, indice) => (fracao === null ? [] : [{ fracao, indice }]));
  naPista.sort((a, b) => a.fracao - b.fracao || a.indice - b.indice);
  const niveis = fracoes.map((): NivelSpray => 0);
  naPista.forEach(({ fracao, indice }, i) => {
    const frente = naPista[i + 1] ?? naPista[0];
    const voltaCompleta = i === naPista.length - 1 ? 1 : 0;
    const distancia = (frente.fracao + voltaCompleta - fracao) * perimetro;
    niveis[indice] = distancia < CORTE_SPRAY_FORTE ? 3 : distancia < CORTE_SPRAY_MEDIO ? 2 : 1;
  });
  return niveis;
}
