/**
 * Testes de `seedAleatoriaTexto` (PR 2.4): função pura que converte um
 * inteiro uint32 (sorteado pela TelaInicio via `crypto.getRandomValues`, fora
 * daqui) na string decimal que `seedDeTexto` devolve como `Number` — o
 * contrato de round-trip que sustenta "seed automática por partida".
 */

import { describe, expect, it, vi } from 'vitest';
import { seedAleatoriaTexto, seedDeTexto, seedEfetivaTexto } from './fluxo-draft';

describe('seedAleatoriaTexto', () => {
  it('round-trip com seedDeTexto pra 0, 1 e valores intermediários', () => {
    for (const uint32 of [0, 1, 42, 123456789, 2 ** 31, 2 ** 31 - 1]) {
      const texto = seedAleatoriaTexto(uint32);
      expect(seedDeTexto(texto)).toBe(uint32);
    }
  });

  it('round-trip no limite superior de uint32 (2^32 - 1)', () => {
    const limite = 2 ** 32 - 1;
    const texto = seedAleatoriaTexto(limite);
    expect(seedDeTexto(texto)).toBe(limite);
  });

  it('normaliza valores fora do range de uint32 com `>>> 0`', () => {
    // -1 >>> 0 === 2^32 - 1; 2^32 >>> 0 === 0 (overflow zera).
    expect(seedAleatoriaTexto(-1)).toBe(String(2 ** 32 - 1));
    expect(seedAleatoriaTexto(2 ** 32)).toBe('0');
  });

  it('devolve string só de dígitos (compatível com o ramo `Number` de `seedDeTexto`)', () => {
    expect(seedAleatoriaTexto(123456789)).toBe('123456789');
    expect(/^\d+$/.test(seedAleatoriaTexto(2 ** 32 - 1))).toBe(true);
  });

  it('uint32 diferentes geram seeds (textos) diferentes', () => {
    expect(seedAleatoriaTexto(1)).not.toBe(seedAleatoriaTexto(2));
    expect(seedAleatoriaTexto(42)).not.toBe(seedAleatoriaTexto(43));
  });
});

describe('seedEfetivaTexto', () => {
  it('usa o texto digitado quando a seção está aberta e o campo tem conteúdo — sem consumir o sorteio', () => {
    const sorteio = vi.fn(() => 999);
    expect(seedEfetivaTexto(true, 'senna1988', sorteio)).toBe('senna1988');
    expect(seedEfetivaTexto(true, '42', sorteio)).toBe('42');
    expect(sorteio).not.toHaveBeenCalled();
  });

  it('sorteia seed nova quando a seção está fechada, mesmo com texto digitado', () => {
    expect(seedEfetivaTexto(false, 'senna1988', () => 123456789)).toBe('123456789');
  });

  it('sorteia seed nova quando o campo está vazio ou só com espaços', () => {
    expect(seedEfetivaTexto(true, '', () => 7)).toBe('7');
    expect(seedEfetivaTexto(true, '   ', () => 7)).toBe('7');
  });

  it('normaliza o sorteio pra uint32 (mesmo contrato de seedAleatoriaTexto)', () => {
    expect(seedEfetivaTexto(false, '', () => -1)).toBe(String(2 ** 32 - 1));
  });
});
