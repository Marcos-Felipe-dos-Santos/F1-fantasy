/**
 * RNG semeado determinístico da engine.
 *
 * Módulo folha: zero imports. Toda aleatoriedade da engine deve passar por
 * aqui — proibido `Math.random()` (ver CLAUDE.md e regra de lint em
 * eslint.config.js). Mesma seed + mesmos loadouts ⇒ mesmo resultado, sempre.
 */

/** Contrato do gerador de números aleatórios semeado. */
export interface Rng {
  /** Próximo valor pseudoaleatório, uniforme em [0, 1). */
  next(): number;
  /** Inteiro pseudoaleatório uniforme, inclusivo em ambos os extremos [min, max]. */
  int(min: number, max: number): number;
  /** Escolhe um elemento de `arr` (não pode ser vazio). */
  pick<T>(arr: readonly T[]): T;
  /** Retorna uma cópia embaralhada de `arr` (Fisher-Yates). Não muta o array de entrada. */
  shuffle<T>(arr: readonly T[]): T[];
}

/**
 * Cria um gerador mulberry32 a partir de uma seed numérica de 32 bits.
 * Estado mutável fica isolado no closure — sem estado global.
 */
export function createRng(seed: number): Rng {
  // Estado interno do gerador (mutável apenas dentro deste closure).
  let a = seed >>> 0;

  function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(min: number, max: number): number {
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick<T>(arr: readonly T[]): T {
    return arr[int(0, arr.length - 1)];
  }

  function shuffle<T>(arr: readonly T[]): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  return { next, int, pick, shuffle };
}

/**
 * Hash xmur3: converte uma string em um gerador de hashes de 32 bits.
 * `seedFromString` usa o primeiro valor produzido por esse gerador.
 */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    h = Math.imul(h ^ (h >>> 13), 3266489917);
    h = (h ^= h >>> 16) >>> 0;
    return h;
  };
}

/** Deriva uma seed numérica determinística a partir de uma string (ex.: nome do jogador, código da corrida). */
export function seedFromString(s: string): number {
  return xmur3(s)();
}

/**
 * Deriva a seed de um sub-stream a partir de uma seed base e um rótulo
 * (ex.: 'draft', 'quali', 'corrida'). Permite consumir múltiplos streams
 * independentes sem que um afete a sequência do outro.
 */
export function deriveSeed(seed: number, label: string): number {
  return xmur3(`${seed}:${label}`)();
}
