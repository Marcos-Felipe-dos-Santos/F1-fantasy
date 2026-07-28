/**
 * Testes dos design tokens (PR 5.1a):
 * 1. Contraste WCAG — cada par declarado em `PARES_CONTRASTE` bate o mínimo
 *    exigido (fórmula de luminância relativa + razão de contraste, WCAG 2.x).
 * 2. Sincronia `tokens.ts` <-> `tokens.css` — toda cor de `tokens.ts` aparece
 *    em `tokens.css` com o valor idêntico (fonte da verdade não diverge).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { alvoToque, cores, espacamento, PARES_CONTRASTE, raio } from './tokens';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Converte '#RRGGBB' em [r, g, b] (0-255). */
function hexParaRgb(hex: string): [number, number, number] {
  const limpo = hex.replace('#', '');
  const r = Number.parseInt(limpo.slice(0, 2), 16);
  const g = Number.parseInt(limpo.slice(2, 4), 16);
  const b = Number.parseInt(limpo.slice(4, 6), 16);
  return [r, g, b];
}

/** Linearização de um canal sRGB (0-255) pra luminância relativa (WCAG 2.x). */
function linearizarCanal(canal: number): number {
  const c = canal / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa de uma cor hex (WCAG 2.x, pesos 0.2126/0.7152/0.0722). */
function luminanciaRelativa(hex: string): number {
  const [r, g, b] = hexParaRgb(hex);
  return 0.2126 * linearizarCanal(r) + 0.7152 * linearizarCanal(g) + 0.0722 * linearizarCanal(b);
}

/** Razão de contraste WCAG entre duas cores hex: (L1 + 0.05) / (L2 + 0.05), L1 >= L2. */
function razaoContraste(hexA: string, hexB: string): number {
  const lA = luminanciaRelativa(hexA);
  const lB = luminanciaRelativa(hexB);
  const claro = Math.max(lA, lB);
  const escuro = Math.min(lA, lB);
  return (claro + 0.05) / (escuro + 0.05);
}

describe('fórmula de contraste WCAG', () => {
  it('preto sobre branco dá razão 21 (caso conhecido)', () => {
    expect(razaoContraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });
});

describe('PARES_CONTRASTE — todos os pares batem o mínimo exigido', () => {
  for (const par of PARES_CONTRASTE) {
    it(`${par.nome} >= ${par.minimo}:1`, () => {
      const razao = razaoContraste(cores[par.fg], cores[par.bg]);
      expect(razao).toBeGreaterThanOrEqual(par.minimo);
    });
  }
});

/**
 * Ordem de luminância da hierarquia de pista (PR 7.2) — NÃO é WCAG, é
 * hierarquia de leitura: o asfalto tem que ser a superfície mais clara pra a
 * pista "ler" contra o entorno. Foi medindo essa ordem, no PR 7.1, que se
 * descobriu que o muro antigo (`borda` #3A3468, luminância 0.0435) competia
 * com o próprio asfalto (0.0482) — daí `pistaMuro` ser um token dedicado,
 * mais escuro, em vez de reusar `borda`. Critério permanente da Fase 7
 * (PLANO_CLAUDE_CODE.md): "o asfalto tem que continuar sendo a superfície
 * mais clara".
 */
describe('ordem de luminância da hierarquia de pista (PR 7.2)', () => {
  it('fundoAfundado < fundo < pistaTerreno < pistaServico < pistaMuro < pistaAsfalto', () => {
    const ordem = [
      'fundoAfundado',
      'fundo',
      'pistaTerreno',
      'pistaServico',
      'pistaMuro',
      'pistaAsfalto',
    ] as const;
    const luminancias = ordem.map((nome) => luminanciaRelativa(cores[nome]));
    for (let i = 1; i < luminancias.length; i++) {
      expect(
        luminancias[i],
        `${ordem[i]} (${luminancias[i].toFixed(4)}) deveria ser mais claro que ${ordem[i - 1]} (${luminancias[i - 1].toFixed(4)})`,
      ).toBeGreaterThan(luminancias[i - 1]);
    }
  });
});

/**
 * Guarda contra reintroduzir a bomba-relógio semântica do Modo Cego (PR 2.3):
 * `carroBot` é conceito de CORRIDA (cor de chassi), `raridadeComum` é conceito
 * de DRAFT (raridade de peça). Hoje os dois valem o mesmo hex não vazaria nada
 * (antes desta correção o CSS usava `raridadeComum` direto como cor de carro),
 * mas se algum dia o Modo Cego precisar ocultar a raridade da peça do
 * adversário, reusar o mesmo token pra pintar o carro vazaria a raridade sem
 * ninguém perceber o acoplamento. Trava aqui, na origem.
 */
describe('carroBot é token próprio (PR 7.2)', () => {
  it('carroBot não reusa raridadeComum (bomba-relógio semântica do Modo Cego, ver comentário em tokens.ts)', () => {
    expect(cores.carroBot).not.toBe(cores.raridadeComum);
  });
});

/** camelCase -> kebab-case (fundoElevado -> fundo-elevado). */
function paraKebabCase(nome: string): string {
  return nome.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

describe('sincronia tokens.ts <-> tokens.css', () => {
  const cssBruto = readFileSync(join(__dirname, 'tokens.css'), 'utf8');

  // Extrai pares `--nome-kebab: valor;` do :root.
  const declaracoes = new Map<string, string>();
  const regexDeclaracao = /--([a-z0-9-]+):\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = regexDeclaracao.exec(cssBruto)) !== null) {
    declaracoes.set(m[1], m[2].trim());
  }

  for (const [nomeCamel, valorEsperado] of Object.entries(cores)) {
    const chaveKebab = paraKebabCase(nomeCamel);

    it(`--${chaveKebab} existe em tokens.css com o mesmo valor de tokens.ts (${valorEsperado})`, () => {
      const valorCss = declaracoes.get(chaveKebab);
      expect(
        valorCss,
        `--${chaveKebab} não encontrado em tokens.css (declarações lidas: ${[...declaracoes.keys()].join(', ')})`,
      ).toBeDefined();
      expect(valorCss?.toUpperCase()).toBe(valorEsperado.toUpperCase());
    });
  }

  // Tokens não-cor (px): mesma garantia de sincronia — divergência silenciosa
  // de espaçamento/raio/alvo de toque quebraria 5.1b/c sem aviso.
  const tokensPx: Array<[chaveKebab: string, valorEsperado: string]> = [
    ...Object.entries(espacamento).map(([k, v]): [string, string] => [`espaco-${k}`, `${v}px`]),
    ...Object.entries(raio).map(([k, v]): [string, string] => [`raio-${k}`, `${v}px`]),
    ['alvo-toque', `${alvoToque}px`],
  ];

  for (const [chaveKebab, valorEsperado] of tokensPx) {
    it(`--${chaveKebab} existe em tokens.css com o mesmo valor de tokens.ts (${valorEsperado})`, () => {
      const valorCss = declaracoes.get(chaveKebab);
      expect(
        valorCss,
        `--${chaveKebab} não encontrado em tokens.css (declarações lidas: ${[...declaracoes.keys()].join(', ')})`,
      ).toBeDefined();
      expect(valorCss).toBe(valorEsperado);
    });
  }
});
