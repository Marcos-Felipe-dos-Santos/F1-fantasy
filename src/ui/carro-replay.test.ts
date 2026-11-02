import { describe, expect, it } from 'vitest';
import {
  ASA_COMPLETA,
  ASA_PROPORCIONAL,
  COMPRIMENTO_CARRO,
  ENVERGADURA_ASA_DIANTEIRA,
  ENVERGADURA_ASA_TRASEIRA,
  ESCALA_CARRO,
  LARGURA_CARRO,
  PISTA_PX_LARGA,
  PISTA_PX_ESTREITA,
  asasDoCarro,
  contornoDoBot,
  niveisDeSpray,
} from './carro-replay';
import { LARGURA_ASFALTO, RAIO_CARRO_BOT, RAIO_CARRO_HUMANO, VIEWBOX_LARGURA } from './pista-camadas';

const pxPorUnidade = (larguraPx: number, escala: number) => (larguraPx / VIEWBOX_LARGURA) * escala;

describe('tamanho do carro (decisão do Marcos: bot 30 u e jogador 43 u no celular)', () => {
  it('a pista real desenha em 322 px numa tela de 360: margem de 16 e borda de 3', () => {
    expect(PISTA_PX_ESTREITA).toBe(360 - 2 * 16 - 2 * 3);
  });

  it('comprimento e largura por tela', () => {
    expect(Math.round(COMPRIMENTO_CARRO * ESCALA_CARRO.estreita.bot)).toBe(30);
    expect(Math.round(COMPRIMENTO_CARRO * ESCALA_CARRO.estreita.humano)).toBe(43);
    expect(Math.round(COMPRIMENTO_CARRO * ESCALA_CARRO.larga.bot)).toBe(25);
    expect(Math.round(COMPRIMENTO_CARRO * ESCALA_CARRO.larga.humano)).toBe(35);
  });

  it('cabe no asfalto de lado, em todas as telas', () => {
    for (const { bot, humano } of Object.values(ESCALA_CARRO)) {
      expect(LARGURA_CARRO * bot).toBeLessThanOrEqual(LARGURA_ASFALTO);
      expect(LARGURA_CARRO * humano).toBeLessThanOrEqual(LARGURA_ASFALTO);
    }
  });

  it('nunca menor que o marcador redondo que ele substitui', () => {
    for (const { bot, humano } of Object.values(ESCALA_CARRO)) {
      expect(LARGURA_CARRO * bot).toBeGreaterThanOrEqual(2 * RAIO_CARRO_BOT);
      expect(LARGURA_CARRO * humano).toBeGreaterThanOrEqual(2 * RAIO_CARRO_HUMANO);
    }
  });
});

describe('asas: C completo e C proporcional', () => {
  it('no celular a asa do bot fica entre 1,3 e 1,5 px (escolha do Marcos no aparelho)', () => {
    const px = ASA_PROPORCIONAL * pxPorUnidade(PISTA_PX_ESTREITA, ESCALA_CARRO.estreita.bot);
    expect(px).toBeGreaterThanOrEqual(1.3);
    expect(px).toBeLessThanOrEqual(1.5);
  });

  it('a tela larga usa o C completo, a estreita o proporcional', () => {
    expect(asasDoCarro(false).espessura).toBe(ASA_COMPLETA);
    expect(asasDoCarro(true).espessura).toBe(ASA_PROPORCIONAL);
    expect(ASA_COMPLETA).toBe(3);
  });

  it('a asa engrossa só para dentro: nem envergadura nem comprimento do carro mudam', () => {
    for (const estreita of [false, true]) {
      const { dianteira, traseira } = asasDoCarro(estreita);
      expect(dianteira.x + dianteira.width).toBe(COMPRIMENTO_CARRO / 2);
      expect(traseira.x).toBe(-COMPRIMENTO_CARRO / 2);
      expect(dianteira.height).toBe(ENVERGADURA_ASA_DIANTEIRA);
      expect(traseira.height).toBe(ENVERGADURA_ASA_TRASEIRA);
    }
  });
});

describe('contorno dos bots', () => {
  it.each([
    [true, PISTA_PX_ESTREITA, ESCALA_CARRO.estreita.bot],
    [false, PISTA_PX_LARGA, ESCALA_CARRO.larga.bot],
  ])('estreita=%s: 0,65 px visíveis, metade do traço fica sob o corpo', (estreita, largura, escala) => {
    expect((contornoDoBot(estreita) / 2) * pxPorUnidade(largura, escala)).toBeCloseTo(0.65, 5);
  });
});

describe('spray por proximidade (decisão do Marcos)', () => {
  const PERIMETRO = 1000;
  const f = (u: number) => u / PERIMETRO;

  it('quanto mais perto do carro da frente, mais forte', () => {
    // Do último para o líder: 10 u, 45 u e 200 u até o carro da frente.
    expect(niveisDeSpray([f(0), f(10), f(55), f(255)], PERIMETRO)).toEqual([3, 2, 1, 1]);
  });

  it('os cortes são 30 u e 60 u', () => {
    expect(niveisDeSpray([f(0), f(29.9)], PERIMETRO)[0]).toBe(3);
    expect(niveisDeSpray([f(0), f(30)], PERIMETRO)[0]).toBe(2);
    expect(niveisDeSpray([f(0), f(59.9)], PERIMETRO)[0]).toBe(2);
    expect(niveisDeSpray([f(0), f(60)], PERIMETRO)[0]).toBe(1);
  });

  it('a pista é um anel: o carro antes da largada vê quem já passou dela', () => {
    expect(niveisDeSpray([f(995), f(5), f(500)], PERIMETRO)).toEqual([3, 1, 1]);
  });

  it('carro fora da pista não solta nem conta como carro da frente', () => {
    expect(niveisDeSpray([f(0), null, f(200)], PERIMETRO)).toEqual([1, 0, 1]);
  });

  it('carro sozinho na pista: nível mais fraco', () => {
    expect(niveisDeSpray([null, f(100), null], PERIMETRO)).toEqual([0, 1, 0]);
  });

  it('empate exato: desempata pela ordem de entrada, sem gerar diferença negativa', () => {
    const niveis = niveisDeSpray([f(100), f(100), f(100)], PERIMETRO);
    expect(niveis.filter((n) => n === 3).length).toBe(2);
  });

  it('determinístico: mesma entrada, mesma saída', () => {
    const fracoes = [0.1, 0.11, 0.5, null, 0.9];
    expect(niveisDeSpray(fracoes, PERIMETRO)).toEqual(niveisDeSpray(fracoes, PERIMETRO));
  });
});
