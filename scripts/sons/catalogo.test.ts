/**
 * Cerca dos sons integrados (PR 3a): o catálogo gerado (`src/ui/sons/catalogo.ts`) e os `.ogg` de
 * `public/sons/` são a mesma coisa. Arquivo trocado à mão, sobrando ou faltando, falha aqui.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATALOGO_SONS, type SomDoCatalogo } from '../../src/ui/sons/catalogo';
import { ESCOLHIDOS } from './escolhas';

const PUBLICO = 'public';
const VELOCIDADES = ['lenta', 'media', 'rapida'] as const;

const todos: SomDoCatalogo[] = Object.values(CATALOGO_SONS).flatMap((v) => ('arquivo' in v ? [v as SomDoCatalogo] : Object.values(v as Record<string, SomDoCatalogo>)));

describe('catálogo dos sons', () => {
  it('cada som do catálogo existe em public/ com o MD5 registrado', () => {
    for (const s of todos) {
      const caminho = join(PUBLICO, s.arquivo);
      expect(existsSync(caminho), s.arquivo).toBe(true);
      expect(createHash('md5').update(readFileSync(caminho)).digest('hex'), s.arquivo).toBe(s.md5);
    }
  });

  it('nenhum arquivo em public/sons/ fora do catálogo', () => {
    const noCatalogo = new Set(todos.map((s) => s.arquivo));
    for (const f of readdirSync(join(PUBLICO, 'sons'))) expect(noCatalogo.has(`sons/${f}`), f).toBe(true);
  });

  it('passagem, spray e largada têm um arquivo por velocidade', () => {
    for (const cat of ['passagem', 'spray', 'largada'] as const) {
      expect(Object.keys(CATALOGO_SONS[cat]).sort()).toEqual([...VELOCIDADES].sort());
    }
  });

  it('cada arquivo veio da variação escolhida (trocar a escolha sem reintegrar falha aqui)', () => {
    for (const [cat, valor] of Object.entries(CATALOGO_SONS)) {
      const lista: SomDoCatalogo[] = 'arquivo' in valor ? [valor as SomDoCatalogo] : Object.values(valor as Record<string, SomDoCatalogo>);
      for (const s of lista) expect(s.origem, s.arquivo).toBe(ESCOLHIDOS[cat as keyof typeof ESCOLHIDOS]);
    }
    expect(Object.keys(CATALOGO_SONS).sort()).toEqual(Object.keys(ESCOLHIDOS).sort());
  });

  it('os sons de laço têm laço, com a guarda de 50 ms depois dele; os outros não têm', () => {
    const comLaco = ['motor', 'lenta', 'pelotao', 'chuva', 'pistola'];
    for (const s of todos) {
      const cat = s.arquivo.replace('sons/', '').replace(/(-lenta|-media|-rapida)?\.ogg$/, '');
      if (!comLaco.includes(cat)) {
        expect(s.laco, s.arquivo).toBeUndefined();
        continue;
      }
      expect(s.laco, s.arquivo).toBeDefined();
      expect(s.laco!.inicioS).toBeGreaterThanOrEqual(0);
      expect(s.laco!.fimS).toBeGreaterThan(s.laco!.inicioS);
      expect(s.durS - s.laco!.fimS, s.arquivo).toBeCloseTo(0.05, 2);
    }
  });

  it('o pico cai dentro do arquivo', () => {
    for (const s of todos) if (s.picoEmS !== undefined) expect(s.picoEmS, s.arquivo).toBeLessThanOrEqual(s.durS);
  });

  it('toda gravação de origem está no THIRD_PARTY_NOTICES.md', () => {
    const avisos = readFileSync('THIRD_PARTY_NOTICES.md', 'utf8');
    for (const id of new Set(todos.flatMap((s) => s.freesound))) expect(avisos, String(id)).toContain(`freesound.org/s/${id}/`);
  });
});
