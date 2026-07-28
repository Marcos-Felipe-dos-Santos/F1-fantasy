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
 * de DRAFT (raridade de peça). Reusar raridade pra pintar carro não vaza nada
 * hoje (todo bot é pintado igual), mas se um dia a cor do carro passar a
 * depender do loadout, o Modo Cego vazaria raridade sem ninguém perceber o
 * acoplamento.
 *
 * A guarda vive em DOIS níveis de propósito (aviso 4 da revisão do 7.2): travar
 * só o valor do token não impede alguém de escrever `fill: var(--raridade-comum)`
 * de novo no CSS — e é exatamente isso que o CSS de produção faz hoje, até o
 * PR 7.3 aplicar os tokens. É a REFERÊNCIA no CSS que é o risco, não o hex.
 */
describe('carroBot é token próprio (PR 7.2)', () => {
  it('carroBot não reusa o hex de raridadeComum', () => {
    expect(cores.carroBot).not.toBe(cores.raridadeComum);
  });

  // A guarda no nível do CSS — "nenhuma regra `.tracado-svg__*` pode
  // referenciar `var(--raridade-*)`" — foi fechada no PR 7.3, no mesmo diff
  // que troca `.tracado-svg__carro` pra `var(--carro-bot)`. Ver
  // `pista-camadas.test.ts` ("guarda de CSS anti-raridade").
});

/**
 * PROVA EXECUTÁVEL da impossibilidade documentada em `tokens.ts` (sugestão 7 da
 * revisão do 7.2): comentário não roda em CI. Os dois alvos que o plano original
 * previa são mutuamente exclusivos, então este teste existe pra que qualquer
 * tentativa de "consertar" adicionando o par de volta falhe com a explicação.
 */
describe('impossibilidade do par pistaAsfalto/fundo (PR 7.2)', () => {
  it('exigir magenta/pistaAsfalto >= 3 impede pistaAsfalto/qualquer-fundo >= 3', () => {
    const lMagenta = luminanciaRelativa(cores.magenta);
    // Pra `magenta/asfalto >= 3`, o asfalto tem teto de luminância:
    const tetoAsfalto = (lMagenta + 0.05) / 3 - 0.05;
    // Pra `asfalto/fundo >= 3` com esse teto, o fundo precisaria de:
    const tetoFundo = (tetoAsfalto + 0.05) / 3 - 0.05;
    expect(tetoFundo).toBeLessThan(0); // luminância mínima real é 0 ⇒ impossível
    expect(luminanciaRelativa(cores.pistaAsfalto)).toBeLessThanOrEqual(tetoAsfalto);
  });

  /**
   * Corolário que o PR 7.3 precisa respeitar: como o asfalto NÃO consegue 3:1
   * contra o fundo, desenhar a pista como um stroke ÚNICO deixa o traçado
   * ilegível — foi exatamente a regressão que a revisão do 7.2 barrou (pista
   * contra o painel do replay caía de 7,77:1 pra 1,45:1). A legibilidade do
   * traçado vem da CAMADA DE MURO, não do preenchimento.
   */
  it('pistaAsfalto sozinho sobre o painel do replay fica abaixo de 3 — exige a camada de muro', () => {
    expect(razaoContraste(cores.pistaAsfalto, cores.fundoElevado)).toBeLessThan(3);
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
