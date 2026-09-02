import { describe, expect, it } from 'vitest';
import {
  ESPERAS_MS,
  FATOR_JITTER,
  esperaDaTentativa,
  comJitter,
} from './jitter-reconexao';

/**
 * S15 — o jitter da reconexão (PR H4).
 *
 * 🔒 A decisão é PURA e recebe o sorteio POR PARÂMETRO — mesmo desenho do
 * `avaliarTeto` (H1), do `excedeuTetoDeConexoes` (H2) e do
 * `avaliarTetoSincronizar` (H3). É isso que torna o jitter testável em
 * `npm test`, sem sortear nada: sem essa fronteira, um teste de aleatoriedade
 * ou é vacuoso (aceita qualquer saída) ou é instável.
 */
describe('jitter da reconexão (S15)', () => {
  it('a escada de esperas não mudou — o jitter é acréscimo, não substituição', () => {
    expect([...ESPERAS_MS]).toEqual([500, 1000, 2000, 4000, 8000]);
  });

  it('sorteio 0 devolve a espera BASE, exata — o jitter tem piso, não média', () => {
    for (const base of ESPERAS_MS) {
      expect(comJitter(base, 0)).toBe(base);
    }
  });

  it('🔴 O JITTER NUNCA ANTECIPA — toda saída é >= a espera base', () => {
    // A propriedade que importa sob thundering herd: 22 clientes que caem
    // juntos devem se ESPALHAR no tempo, e espalhar para trás é pior que não
    // espalhar — antecipa a rajada para o instante em que o servidor está mais
    // fraco. Um jitter simétrico (`base * (0,85 + sorteio * 0,3)`) passaria em
    // "as saídas diferem" e falharia aqui.
    for (const base of ESPERAS_MS) {
      for (const sorteio of [0, 0.01, 0.25, 0.5, 0.75, 0.999999]) {
        expect(comJitter(base, sorteio)).toBeGreaterThanOrEqual(base);
      }
    }
  });

  it('o teto é base × (1 + FATOR_JITTER) e não é ultrapassado', () => {
    for (const base of ESPERAS_MS) {
      for (const sorteio of [0, 0.5, 0.999999]) {
        expect(comJitter(base, sorteio)).toBeLessThanOrEqual(base * (1 + FATOR_JITTER));
      }
    }
  });

  it('o fator é 30% — e a faixa alcançada é REAL, não nominal', () => {
    expect(FATOR_JITTER).toBe(0.3);
    // Anti-vacuidade do teto: não basta "não ultrapassa", tem que CHEGAR perto.
    // Um `comJitter` que ignorasse o sorteio e devolvesse `base` passaria em
    // todas as asserções acima e cairia aqui.
    expect(comJitter(1000, 0.999999)).toBeGreaterThan(1290);
  });

  it('é MONOTÔNICO no sorteio — sorteio maior, espera maior ou igual', () => {
    let anterior = comJitter(2000, 0);
    for (const sorteio of [0.1, 0.2, 0.4, 0.6, 0.8, 0.99]) {
      const atual = comJitter(2000, sorteio);
      expect(atual).toBeGreaterThanOrEqual(anterior);
      anterior = atual;
    }
  });

  it('é DETERMINÍSTICO dado o sorteio — mesma entrada, mesma saída', () => {
    expect(comJitter(4000, 0.42)).toBe(comJitter(4000, 0.42));
  });

  it('devolve INTEIRO — `setTimeout` não ganha nada com fração de ms', () => {
    for (const sorteio of [0.1, 0.333333, 0.7, 0.99]) {
      expect(Number.isInteger(comJitter(8000, sorteio))).toBe(true);
    }
  });

  describe('esperaDaTentativa — a escada COM o jitter, que é o que a casca chama', () => {
    it('cresce ao longo das tentativas e SATURA no último degrau', () => {
      // Com sorteio fixo em 0 o jitter sai de cena e sobra a escada pura.
      expect(esperaDaTentativa(0, 0)).toBe(500);
      expect(esperaDaTentativa(1, 0)).toBe(1000);
      expect(esperaDaTentativa(4, 0)).toBe(8000);
      expect(esperaDaTentativa(5, 0)).toBe(8000);
      expect(esperaDaTentativa(99, 0)).toBe(8000);
    });

    it('🔴 SATURAR NÃO É PARAR DE ESPALHAR — no teto o jitter continua agindo', () => {
      // É no teto que o thundering herd importa: todo mundo que caiu junto está
      // saturado em 8 s. Um jitter aplicado antes do clamp da escada colapsaria
      // aqui — todos voltariam a bater no mesmo instante.
      expect(esperaDaTentativa(9, 0.999999)).toBeGreaterThan(8000);
      expect(esperaDaTentativa(9, 0.999999)).toBeLessThanOrEqual(10400);
    });

    it('tentativa negativa não escapa do primeiro degrau', () => {
      expect(esperaDaTentativa(-1, 0)).toBe(500);
    });
  });
});
