import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { pesoDoSorteio, sortearPonderado } from './sorteio-ponderado';

describe('sorteio ponderado do draft', () => {
  it('soma bônus sem excluir épocas antigas', () => {
    expect(pesoDoSorteio({ equipe: 'Teste', ano: 1960 }, false)).toBe(1);
    expect(pesoDoSorteio({ equipe: 'Teste', ano: 1985 }, false)).toBe(1.5);
    expect(pesoDoSorteio({ equipe: 'Teste', ano: 1988 }, false)).toBe(2);
    expect(pesoDoSorteio({ equipe: 'Teste', ano: 1988 }, true)).toBe(2.5);
    expect(pesoDoSorteio({ equipe: 'Teste', ano: 1960 }, true)).toBe(1.5);
  });
  it('faz extração cumulativa sem reposição e sem mutar candidatos', () => {
    const itens = ['a', 'b', 'c'];
    const numeros = [0.5, 0.99];
    const rng = { ...createRng(1), next: () => numeros.shift()! };
    expect(sortearPonderado(itens, 2, x => x === 'a' ? 2 : 1, rng)).toEqual(['b', 'c']);
    expect(itens).toEqual(['a', 'b', 'c']);
  });
  it('reproduz a mesma seed e não repete candidatos', () => {
    const itens = ['a', 'b', 'c', 'd', 'e', 'f'];
    const a = sortearPonderado(itens, 5, () => 1, createRng(42));
    expect(sortearPonderado(itens, 5, () => 1, createRng(42))).toEqual(a);
    expect(new Set(a).size).toBe(5);
  });
  it('preserva a probabilidade positiva dos candidatos leves', () => {
    let fortes = 0;
    for (let seed = 0; seed < 10000; seed++) {
      if (sortearPonderado(['leve', 'forte'], 1, x => x === 'forte' ? 2.5 : 1, createRng(seed))[0] === 'forte') fortes++;
    }
    expect(fortes / 10000).toBeGreaterThan(0.69);
    expect(fortes / 10000).toBeLessThan(0.74);
  });
  it('recusa contagem impossível e pesos inválidos', () => {
    expect(() => sortearPonderado(['a'], 2, () => 1, createRng(0))).toThrow();
    for (const peso of [0, -1, NaN, Infinity]) {
      expect(() => sortearPonderado(['a'], 1, () => peso, createRng(0))).toThrow();
    }
  });
});
