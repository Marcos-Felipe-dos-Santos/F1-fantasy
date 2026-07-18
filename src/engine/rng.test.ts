import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed, seedFromString } from './rng';

describe('createRng — reprodutibilidade', () => {
  it('mesma seed produz os mesmos 1000 valores de next()', () => {
    const rngA = createRng(123456);
    const rngB = createRng(123456);
    const a = Array.from({ length: 1000 }, () => rngA.next());
    const b = Array.from({ length: 1000 }, () => rngB.next());
    expect(a).toEqual(b);
  });
});

describe('createRng — divergência', () => {
  it('seeds diferentes divergem em algum dos 100 primeiros valores', () => {
    const rng1 = createRng(1);
    const rng2 = createRng(2);
    const a = Array.from({ length: 100 }, () => rng1.next());
    const b = Array.from({ length: 100 }, () => rng2.next());
    expect(a).not.toEqual(b);
  });
});

describe('createRng — valores de ouro (seed 42)', () => {
  // VALORES DE OURO — NUNCA atualizar sem decisão explícita do dev: mudar o
  // RNG quebra replays, seeds compartilhadas e o futuro Desafio do Dia.
  it('os 5 primeiros next() da seed 42 batem com os valores registrados', () => {
    const rng = createRng(42);
    const values = Array.from({ length: 5 }, () => rng.next());
    expect(values).toEqual([
      0.6011037519201636, 0.44829055899754167, 0.8524657934904099, 0.6697340414393693,
      0.17481389874592423,
    ]);
  });
});

describe('createRng — faixas', () => {
  it('next() sempre em [0, 1) em 10.000 draws', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(1,6) em 10.000 draws produz apenas 1..6 e todos os 6 valores aparecem', () => {
    const rng = createRng(99);
    const seen = new Set<number>();
    for (let i = 0; i < 10000; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]));
  });
});

describe('createRng — pick/shuffle', () => {
  it('pick é determinístico por seed', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'] as const;
    const rngA = createRng(55);
    const rngB = createRng(55);
    const picksA = Array.from({ length: 20 }, () => rngA.pick(arr));
    const picksB = Array.from({ length: 20 }, () => rngB.pick(arr));
    expect(picksA).toEqual(picksB);
  });

  it('shuffle é determinístico por seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const rngA = createRng(321);
    const rngB = createRng(321);
    expect(rngA.shuffle(arr)).toEqual(rngB.shuffle(arr));
  });

  it('shuffle retorna permutação com exatamente os mesmos elementos', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const rng = createRng(11);
    const shuffled = rng.shuffle(arr);
    expect(shuffled.slice().sort((x, y) => x - y)).toEqual(arr.slice().sort((x, y) => x - y));
    expect(shuffled).toHaveLength(arr.length);
  });

  it('shuffle não muta o array original', () => {
    const arr = [1, 2, 3, 4, 5];
    const before = arr.slice();
    const rng = createRng(2024);
    rng.shuffle(arr);
    expect(arr).toEqual(before);
  });
});

describe('deriveSeed — sub-streams', () => {
  it('labels diferentes produzem seeds derivadas diferentes', () => {
    const s = 42;
    expect(deriveSeed(s, 'draft')).not.toBe(deriveSeed(s, 'quali'));
  });

  it('mesma seed + mesmo label produz sempre o mesmo derivado', () => {
    expect(deriveSeed(42, 'corrida')).toBe(deriveSeed(42, 'corrida'));
  });

  it('consumir draws de um sub-stream não afeta a sequência de outro', () => {
    const baseSeed = 777;

    // Sub-streams "isolados", nunca tocados um pelo outro — referência.
    const draftOnlyRng = createRng(deriveSeed(baseSeed, 'draft'));
    const draftOnlyExpected = Array.from({ length: 10 }, () => draftOnlyRng.next());

    const qualiOnlyRng = createRng(deriveSeed(baseSeed, 'quali'));
    const qualiOnlyExpected = Array.from({ length: 10 }, () => qualiOnlyRng.next());

    // Cria os dois streams reais e consome bastante do 'draft' antes de tocar no 'quali'.
    const draftRng = createRng(deriveSeed(baseSeed, 'draft'));
    const qualiRng = createRng(deriveSeed(baseSeed, 'quali'));
    const draftResult = Array.from({ length: 10 }, () => draftRng.next());
    for (let i = 0; i < 500; i++) draftRng.next(); // consumo extra do stream 'draft'
    const qualiResult = Array.from({ length: 10 }, () => qualiRng.next());

    expect(draftResult).toEqual(draftOnlyExpected);
    expect(qualiResult).toEqual(qualiOnlyExpected);
  });
});

describe('seedFromString', () => {
  it('é determinístico: mesma string produz sempre a mesma seed', () => {
    expect(seedFromString('draft')).toBe(seedFromString('draft'));
  });

  it('strings diferentes produzem seeds diferentes entre si', () => {
    const samples = ['a', 'b', 'draft', 'quali', '42'];
    const seeds = samples.map(seedFromString);
    const unique = new Set(seeds);
    expect(unique.size).toBe(samples.length);
  });
});
