/**
 * A cerca de lint de `src/net/**` e `party/**`, testada (PR 3.2).
 *
 * Este arquivo existe por causa de um defeito real, achado na revisão: a
 * primeira versão do PR 3.2 separou `Date.now` num bloco próprio de
 * `src/net/**` e, com isso, **apagou em silêncio** a proibição de
 * `Math.random`/`performance.now` que existia desde o 3.1a — porque no flat
 * config do ESLint um bloco posterior que redefine a mesma regra SUBSTITUI as
 * opções por inteiro, não faz merge.
 *
 * A verificação manual da época não pegou: ela testou `src/data/`, `src/ui/`,
 * React e `Date.now`. Os três primeiros vivem em `no-restricted-imports` (outra
 * regra, não sobrescrita) e o quarto era justamente a regra nova. A proibição
 * que sumiu não estava na lista conferida.
 *
 * Moral, e por isso o teste é permanente: **cerca que ninguém testa não é
 * cerca.** Aqui a configuração é exercitada de verdade, com o ESLint rodando
 * sobre código que viola cada regra de propósito.
 */

import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

/** Roda o eslint sobre um trecho, como se estivesse no caminho informado. */
async function regrasDisparadas(caminho: string, codigo: string): Promise<string[]> {
  const eslint = new ESLint({ cwd: process.cwd() });
  const [resultado] = await eslint.lintText(codigo, { filePath: caminho });
  return resultado.messages.map((m) => `${m.ruleId}:${m.message.slice(0, 40)}`);
}

const VIOLACOES = `
export const a = Math.random();
export const b = Date.now();
export const c = performance.now();
export const d = ['b', 'a'].sort((x, y) => x.localeCompare(y));
`;

const IMPORTS = `
import pecas from '../data/pecas.json';
import { algo } from '../ui/qualquer';
import React from 'react';
export const x = [pecas, algo, React];
`;

const contem = (msgs: string[], trecho: string): boolean =>
  msgs.some((m) => m.includes(trecho));

describe('cerca de lint — o núcleo (src/net/)', () => {
  it('proíbe Math.random, Date.now E performance.now (as três, não uma)', async () => {
    const msgs = await regrasDisparadas('src/net/zz-cerca.ts', VIOLACOES);
    expect(contem(msgs, 'Math.random'), `Math.random passou: ${msgs.join(' | ')}`).toBe(true);
    expect(contem(msgs, 'Date.now'), `Date.now passou: ${msgs.join(' | ')}`).toBe(true);
    expect(contem(msgs, 'performance.now'), `performance.now passou: ${msgs.join(' | ')}`).toBe(
      true,
    );
  });

  it('proíbe localeCompare (collation do host quebra determinismo workerd/Node)', async () => {
    const msgs = await regrasDisparadas('src/net/zz-cerca.ts', VIOLACOES);
    expect(contem(msgs, 'localeCompare')).toBe(true);
  });

  it('proíbe importar dataset, UI e React', async () => {
    const msgs = await regrasDisparadas('src/net/zz-cerca.ts', IMPORTS);
    expect(contem(msgs, 'data/pecas.json'), `dataset passou: ${msgs.join(' | ')}`).toBe(true);
    expect(contem(msgs, 'ui/qualquer'), `ui passou: ${msgs.join(' | ')}`).toBe(true);
    expect(contem(msgs, 'react'), `react passou: ${msgs.join(' | ')}`).toBe(true);
  });
});

describe('cerca de lint — a casca (party/)', () => {
  it('PERMITE Date.now — é o lugar legítimo do relógio', async () => {
    const msgs = await regrasDisparadas('party/zz-cerca.ts', VIOLACOES);
    expect(contem(msgs, 'Date.now'), `Date.now foi proibido na casca: ${msgs.join(' | ')}`).toBe(
      false,
    );
  });

  it('mesmo assim proíbe Math.random e performance.now', async () => {
    const msgs = await regrasDisparadas('party/zz-cerca.ts', VIOLACOES);
    expect(contem(msgs, 'Math.random'), `Math.random passou na casca: ${msgs.join(' | ')}`).toBe(
      true,
    );
    expect(contem(msgs, 'performance.now')).toBe(true);
  });

  it('proíbe importar dataset, UI e React', async () => {
    const msgs = await regrasDisparadas('party/zz-cerca.ts', IMPORTS);
    expect(contem(msgs, 'data/pecas.json')).toBe(true);
    expect(contem(msgs, 'ui/qualquer')).toBe(true);
    expect(contem(msgs, 'react')).toBe(true);
  });
});

describe('anti-vacuidade', () => {
  it('código limpo não dispara nenhuma dessas regras', async () => {
    // Se este teste falhar, os de cima podem estar passando por acidente de
    // configuração (ex.: o eslint reprovando tudo por um erro de parse).
    const msgs = await regrasDisparadas('src/net/zz-cerca.ts', 'export const ok = 1 + 1;\n');
    expect(msgs.filter((m) => m.startsWith('no-restricted'))).toEqual([]);
  });
});
