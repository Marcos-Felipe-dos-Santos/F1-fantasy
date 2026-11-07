import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('nome público', () => {
  it('exibe Paddock Draft no título da página', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toBe('Paddock Draft');
  });

  it('exibe Paddock Draft no cabeçalho da tela inicial', () => {
    const tela = readFileSync('src/ui/TelaInicio.tsx', 'utf8');
    expect(tela.match(/<h1>([^<]*)<\/h1>/)?.[1]).toBe('Paddock Draft');
  });
});
