/**
 * Guarda dos namespaces de seed (risco aprovado da Fase 3).
 *
 * Dois testes com propósitos diferentes:
 * 1. **Duplicata no registro** — o registro não pode ter dois donos pro mesmo
 *    prefixo, senão ele deixa de servir pra decidir quem pode usar o quê.
 * 2. **Varredura do código-fonte** — todo `deriveSeed(x, 'rotulo')` do projeto
 *    usa um prefixo registrado. É este que pega o caso real: alguém acrescenta
 *    um rótulo novo e ninguém lembra do registro.
 *
 * A varredura é textual e por isso conservadora: ela só considera rótulos que
 * começam com texto literal (`'camp:...'`, `` `draft:sorteios:${id}` ``). Um
 * rótulo montado inteiramente em runtime escaparia — e é justamente por isso
 * que a convenção do projeto é começar todo rótulo por um literal.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { NAMESPACES_SEED, PREFIXO_ONLINE, namespaceDoRotulo } from './namespaces-seed';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PASTAS = ['src', 'scripts'];

/**
 * Pastas sem código-fonte. `cache/` importa por um motivo não óbvio:
 * `scripts/fetch-f1-data.test.ts` cria e apaga arquivos temporários lá, e a
 * suíte roda em paralelo — a varredura chegou a tropeçar num arquivo que sumia
 * entre o `readdirSync` e o `statSync` (ENOENT). Daí também o `try` abaixo.
 */
const PASTAS_IGNORADAS = new Set(['data', 'fixtures', 'cache', 'node_modules', 'dist']);

function ehDiretorio(caminho: string): boolean {
  try {
    return statSync(caminho).isDirectory();
  } catch {
    return false; // sumiu entre a listagem e a checagem: não é código nosso.
  }
}

function arquivosTs(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (ehDiretorio(caminho)) {
      return PASTAS_IGNORADAS.has(nome) ? [] : arquivosTs(caminho);
    }
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

/** `deriveSeed(<algo>, '<literal>...` — captura só o começo literal do rótulo. */
const CHAMADA = /deriveSeed\(\s*[^,]+,\s*(['"`])([^'"`$]*)/g;

function rotulosDoProjeto(): { arquivo: string; rotulo: string }[] {
  const achados: { arquivo: string; rotulo: string }[] = [];
  for (const pasta of PASTAS) {
    for (const arquivo of arquivosTs(join(RAIZ, pasta))) {
      // Este arquivo cita `deriveSeed(...)` nos comentários e nas asserções; a
      // varredura acharia os exemplos e reprovaria a si mesma.
      if (arquivo.endsWith('namespaces-seed.test.ts')) continue;
      const fonte = readFileSync(arquivo, 'utf8');
      for (const m of fonte.matchAll(CHAMADA)) {
        if (m[2].length > 0) achados.push({ arquivo, rotulo: m[2] });
      }
    }
  }
  return achados;
}

describe('registro de namespaces de seed', () => {
  it('não tem prefixo duplicado', () => {
    const prefixos = NAMESPACES_SEED.map((n) => n.prefixo);
    expect(new Set(prefixos).size, `duplicata em ${prefixos.join(', ')}`).toBe(prefixos.length);
  });

  it('todo prefixo é não vazio e sem `:`', () => {
    for (const { prefixo } of NAMESPACES_SEED) {
      expect(prefixo.length).toBeGreaterThan(0);
      expect(prefixo).not.toContain(':');
    }
  });

  it('o prefixo do online está reservado', () => {
    expect(NAMESPACES_SEED.map((n) => n.prefixo)).toContain(PREFIXO_ONLINE);
  });

  it('namespaceDoRotulo corta no primeiro `:`', () => {
    expect(namespaceDoRotulo('draft:sorteios:humano-01')).toBe('draft');
    expect(namespaceDoRotulo('bots')).toBe('bots');
    expect(namespaceDoRotulo('online:draft')).toBe(PREFIXO_ONLINE);
  });
});

describe('varredura do código-fonte', () => {
  it('acha os rótulos de verdade (a varredura não pode passar por estar vazia)', () => {
    const rotulos = rotulosDoProjeto().map((r) => r.rotulo);
    expect(rotulos.length).toBeGreaterThan(10);
    expect(rotulos.some((r) => r.startsWith('draft:'))).toBe(true);
    expect(rotulos.some((r) => r.startsWith('corrida:'))).toBe(true);
  });

  it('todo deriveSeed do projeto usa um namespace REGISTRADO', () => {
    const registrados = new Set(NAMESPACES_SEED.map((n) => n.prefixo));
    const forasteiros = rotulosDoProjeto()
      .filter(({ rotulo }) => !registrados.has(namespaceDoRotulo(rotulo)))
      .map(({ arquivo, rotulo }) => `${arquivo}: "${rotulo}"`);
    expect(
      forasteiros,
      `rótulo com namespace não registrado — acrescente em src/engine/namespaces-seed.ts:\n${forasteiros.join('\n')}`,
    ).toEqual([]);
  });

  // A guarda "todo rótulo do online usa o prefixo `online:`" NÃO mora aqui: o
  // rótulo de `src/net/` vem de uma CONSTANTE (`ROTULO_SEED_DRAFT`), não de um
  // literal, e a varredura textual não a enxergaria. Ela é asserida de verdade
  // em `src/net/sala.test.ts`, contra o valor da constante — e `src/engine/`
  // não pode importar de `src/net/` (fronteira travada no eslint).
});
