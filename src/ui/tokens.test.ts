/**
 * Testes dos design tokens:
 * 1. Contraste WCAG — cada par de `PARES_CONTRASTE` bate o mínimo exigido EM
 *    CADA MODO em que se aplica (dark e light).
 * 2. Ordem de luminância da pista (critério permanente da Fase 7).
 * 3. Sincronia `tokens.ts` <-> `tokens.css`, BLOCO A BLOCO.
 *
 * ## Por que o parsing do CSS é por bloco (PR 7.8)
 *
 * A versão anterior varria o arquivo inteiro com um regex e jogava tudo num
 * `Map`. Com um tema só isso funcionava; com dois, a última declaração de
 * `--fundo` no arquivo (a do bloco claro) sobrescreveria a do `:root` e o
 * teste passaria a comparar o valor CLARO contra `cores` — reprovando o
 * arquivo certo, ou pior, aprovando um arquivo errado se alguém "consertasse"
 * mexendo em `cores`. Agora cada bloco é lido isoladamente e comparado com a
 * paleta do SEU modo.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  alvoToque,
  cores,
  coresLight,
  espacamento,
  type ModoTema,
  type NomeCor,
  paleta,
  PARES_CONTRASTE,
  raio,
} from './tokens';

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

// ---------------------------------------------------------------------------
// 1. CONTRASTE, NOS DOIS MODOS
// ---------------------------------------------------------------------------

const MODOS: ModoTema[] = ['dark', 'light'];

for (const modo of MODOS) {
  const pal = paleta(modo);
  // `escopo: 'pista'` roda só no dark porque os tokens envolvidos são
  // mode-invariantes — medir no claro seria remedir os mesmos hex.
  const paresDoModo = PARES_CONTRASTE.filter(
    (p) => p.escopo === 'ambos' || (modo === 'dark' && p.escopo === 'pista') || (modo === 'light' && p.escopo === 'light'),
  );

  describe(`PARES_CONTRASTE — modo ${modo} (${paresDoModo.length} pares)`, () => {
    it('o filtro de escopo não esvaziou a lista (anti-tautologia)', () => {
      expect(paresDoModo.length).toBeGreaterThanOrEqual(30);
    });

    for (const par of paresDoModo) {
      it(`[${modo}] ${par.nome} >= ${par.minimo}:1`, () => {
        const razao = razaoContraste(pal[par.fg], pal[par.bg]);
        expect(
          razao,
          `[${modo}] ${par.nome}: ${pal[par.fg]} sobre ${pal[par.bg]} = ${razao.toFixed(3)} (mínimo ${par.minimo})`,
        ).toBeGreaterThanOrEqual(par.minimo);
      });
    }
  });
}

describe('coerência da paleta clara', () => {
  it('todo token de `coresLight` existe em `cores` (override sem inventar nome)', () => {
    for (const nome of Object.keys(coresLight)) {
      expect(cores, `coresLight declara '${nome}', que não existe em cores`).toHaveProperty(nome);
    }
  });

  it('todo override REALMENTE muda o valor (override igual é ruído que mente sobre o que é mode-scoped)', () => {
    for (const [nome, valor] of Object.entries(coresLight)) {
      expect(valor, `coresLight.${nome} repete o valor do dark`).not.toBe(cores[nome as NomeCor]);
    }
  });

  /**
   * O pedido do dev era "os três acentos ficam IGUAIS nos dois modos". Onde a
   * aritmética permitiu, foi cumprido ao pé da letra: os PREENCHIMENTOS de
   * marca não são mode-scoped. Só as tintas (`*Texto`) mudam.
   */
  it('os três acentos da marca são idênticos nos dois modos', () => {
    for (const acento of ['primaria', 'acento', 'sucesso'] as const) {
      expect(coresLight[acento], `${acento} não pode ser mode-scoped`).toBeUndefined();
      expect(paleta('light')[acento]).toBe(paleta('dark')[acento]);
    }
  });

  /**
   * Guarda estrutural: se um token `pista*` virar mode-scoped, a pilha do
   * replay se parte no claro (o chão viraria branco e o relevo inverteria) e
   * a regra 1 da Fase 7 fica impossível de sustentar. Ver `tokens.ts`.
   */
  it('nenhum token de pista é mode-scoped', () => {
    for (const nome of Object.keys(coresLight)) {
      expect(nome.startsWith('pista'), `${nome} é token de pista e não pode mudar com o tema`).toBe(false);
    }
    expect(coresLight.carroBot, 'carroBot é cor de corrida e não pode mudar com o tema').toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. HIERARQUIA DE LUMINÂNCIA DA PISTA
// ---------------------------------------------------------------------------

/**
 * Ordem de luminância da hierarquia de pista — NÃO é WCAG, é hierarquia de
 * leitura: o asfalto tem que ser a superfície mais clara pra a pista "ler"
 * contra o entorno. Critério permanente da Fase 7.
 *
 * A tabela foi RECALCULADA no 7.8 pra paleta grafite. O que forçou a
 * recalcular não foi estética: o teto de luminância do asfalto é imposto pelo
 * carro do jogador (3:1 contra o asfalto), e o vermelho `#FF1801` (luminância
 * 0,219) é mais escuro que o magenta que ele substituiu (0,295) — o teto caiu
 * de 0,0650 pra 0,0397, e o asfalto roxo antigo (0,0482) deixou de caber.
 */
describe('ordem de luminância da hierarquia de pista (Fase 7, recalculada no 7.8)', () => {
  const ORDEM = [
    'pistaEscape',
    'pistaChao',
    'pistaTerreno',
    'pistaServico',
    'pistaMuro',
    'pistaAsfalto',
  ] as const;

  it('pistaEscape < pistaChao < pistaTerreno < pistaServico < pistaMuro < pistaAsfalto', () => {
    const luminancias = ORDEM.map((nome) => luminanciaRelativa(cores[nome]));
    for (let i = 1; i < luminancias.length; i++) {
      expect(
        luminancias[i],
        `${ORDEM[i]} (${luminancias[i].toFixed(4)}) deveria ser mais claro que ${ORDEM[i - 1]} (${luminancias[i - 1].toFixed(4)})`,
      ).toBeGreaterThan(luminancias[i - 1]);
    }
  });

  it('o asfalto é a superfície mais clara de toda a hierarquia', () => {
    const asfalto = luminanciaRelativa(cores.pistaAsfalto);
    for (const nome of ORDEM) {
      if (nome === 'pistaAsfalto') continue;
      expect(asfalto).toBeGreaterThan(luminanciaRelativa(cores[nome]));
    }
  });

  /**
   * O teto não é um número escolhido — é derivado do par
   * `primaria/pistaAsfalto >= 3`. Este teste existe pra que, se alguém clarear
   * o asfalto "só um pouquinho" pra melhorar a leitura, a falha aponte a causa
   * real (o carro do jogador some) em vez de um par genérico.
   */
  it('o asfalto respeita o teto imposto pelo carro do jogador', () => {
    const teto = (luminanciaRelativa(cores.primaria) + 0.05) / 3 - 0.05;
    expect(teto).toBeCloseTo(0.0397, 3);
    expect(
      luminanciaRelativa(cores.pistaAsfalto),
      `asfalto ${cores.pistaAsfalto} (${luminanciaRelativa(cores.pistaAsfalto).toFixed(4)}) estoura o teto ${teto.toFixed(4)}`,
    ).toBeLessThanOrEqual(teto);
  });

  /**
   * A paleta velha não caberia — trava a razão pela qual a tabela mudou, pra
   * que ninguém "restaure" o asfalto antigo achando que foi troca de gosto.
   */
  it('o asfalto da paleta azul-noite (#3E3A5C) NÃO caberia sob o teto novo', () => {
    const teto = (luminanciaRelativa(cores.primaria) + 0.05) / 3 - 0.05;
    expect(luminanciaRelativa('#3E3A5C')).toBeGreaterThan(teto);
  });
});

describe('carroBot é token próprio', () => {
  it('carroBot não reusa o hex de raridadeComum', () => {
    expect(cores.carroBot).not.toBe(cores.raridadeComum);
  });

  it('carroBot não reusa o hex de raridadeComum em NENHUM modo', () => {
    for (const modo of MODOS) {
      const pal = paleta(modo);
      expect(pal.carroBot, `[${modo}] carroBot colidiu com raridadeComum`).not.toBe(pal.raridadeComum);
    }
  });
});

/**
 * PROVA EXECUTÁVEL da impossibilidade documentada em `tokens.ts`: comentário
 * não roda em CI. Os dois alvos que o plano original previa são mutuamente
 * exclusivos, então este teste existe pra que qualquer tentativa de
 * "consertar" adicionando o par de volta falhe com a explicação.
 *
 * No 7.8 a prova passou a medir `primaria` (o vermelho) no lugar do magenta —
 * o magenta não existe mais, e como o vermelho é MAIS ESCURO a impossibilidade
 * só ficou mais forte.
 */
describe('impossibilidade do par pistaAsfalto/fundo', () => {
  it('exigir primaria/pistaAsfalto >= 3 impede pistaAsfalto/qualquer-fundo >= 3', () => {
    const lPrimaria = luminanciaRelativa(cores.primaria);
    // Pra `primaria/asfalto >= 3`, o asfalto tem teto de luminância:
    const tetoAsfalto = (lPrimaria + 0.05) / 3 - 0.05;
    // Pra `asfalto/chão >= 3` com esse teto, o chão precisaria de:
    const tetoChao = (tetoAsfalto + 0.05) / 3 - 0.05;
    expect(tetoChao).toBeLessThan(0); // luminância mínima real é 0 ⇒ impossível
    expect(luminanciaRelativa(cores.pistaAsfalto)).toBeLessThanOrEqual(tetoAsfalto);
  });

  it('pistaAsfalto sozinho sobre o chão do replay fica abaixo de 3 — exige a camada de muro', () => {
    expect(razaoContraste(cores.pistaAsfalto, cores.pistaChao)).toBeLessThan(3);
  });
});

// ---------------------------------------------------------------------------
// 2b. CASAMENTO ENTRE O PAR DECLARADO E O CSS REAL
// ---------------------------------------------------------------------------

/**
 * `PARES_CONTRASTE` declara `textoEscuro/primaria = 4,914`. Isso é uma
 * afirmação sobre dois VALORES — não prova que o CSS realmente põe
 * `--texto-escuro` em cima de `--primaria`. Sem esta guarda, trocar o texto do
 * botão primário pra `--texto` deixaria a suíte inteira verde.
 *
 * E o risco cresceu exatamente com a paleta nova. A `primaria` antiga era o
 * amarelo `#FFCC00` (luminância 0,555): texto branco em cima dá 1,53:1, um
 * horror que se vê de longe. A `primaria` nova é `#FF1801` (0,219), e branco
 * em cima dá **3,445:1** — reprova AA, e parece perfeitamente aceitável a
 * olho. É a classe de erro que passa por revisão e por portão visual.
 *
 * Mesmo formato da guarda `.tracado-svg__chao` em `pista-camadas.test.ts`:
 * ler o bloco do seletor e exigir o `var(--...)` esperado.
 */
describe('preenchimento de acento vem sempre com a tinta escura por cima', () => {
  const estilos = readFileSync(join(__dirname, 'estilos.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  /** Blocos `seletor { corpo }` — o arquivo não tem regra aninhada. */
  const blocos: Array<{ seletor: string; corpo: string }> = [];
  const regexBloco = /([^{}]*)\{([^{}]*)\}/g;
  let b: RegExpExecArray | null;
  while ((b = regexBloco.exec(estilos)) !== null) {
    blocos.push({ seletor: b[1].trim(), corpo: b[2] });
  }

  /**
   * Preenchimentos que carregam texto. Cada um tem um par
   * `textoEscuro/<token>` em `PARES_CONTRASTE` — é esse par que a guarda
   * conecta ao CSS. `borda`/`bordaInterativa` ficam de fora: são contorno, não
   * superfície de texto.
   */
  const PREENCHIMENTOS: NomeCor[] = ['primaria', 'acento', 'sucesso', 'erro', 'raridadeLendario'];

  const kebabPreenchimentos = new Map(PREENCHIMENTOS.map((n) => [paraKebabCase(n), n]));

  const usos = blocos.flatMap(({ seletor, corpo }) => {
    const m = corpo.match(/background:\s*var\(--([a-z0-9-]+)\)/);
    if (!m || !kebabPreenchimentos.has(m[1])) return [];
    return [{ seletor, corpo, token: kebabPreenchimentos.get(m[1]) as NomeCor }];
  });

  it('a guarda encontrou usos de verdade (anti-tautologia: um rename de classe não pode fazê-la passar vazia)', () => {
    expect(usos.length, 'nenhuma regra pinta acento como background — a guarda estaria vazia').toBeGreaterThanOrEqual(4);
  });

  for (const { seletor, corpo, token } of usos) {
    it(`${seletor} usa background: var(--${paraKebabCase(token)}) e por isso precisa de color: var(--texto-escuro)`, () => {
      expect(
        corpo,
        `${seletor} pinta o fundo com --${paraKebabCase(token)} mas não declara a tinta escura. ` +
          `Com --texto (${cores.texto}) sobre ${cores[token]} o contraste seria ` +
          `${((Math.max(luminanciaRelativa(cores.texto), luminanciaRelativa(cores[token])) + 0.05) / (Math.min(luminanciaRelativa(cores.texto), luminanciaRelativa(cores[token])) + 0.05)).toFixed(3)}:1.`,
      ).toMatch(/color:\s*var\(--texto-escuro\)/);
    });
  }

  it('todo preenchimento usado no CSS tem par declarado em PARES_CONTRASTE', () => {
    for (const { token } of usos) {
      const par = PARES_CONTRASTE.find((p) => p.fg === 'textoEscuro' && p.bg === token);
      expect(par, `falta o par textoEscuro/${token} em PARES_CONTRASTE`).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 3. SINCRONIA tokens.ts <-> tokens.css (bloco a bloco)
// ---------------------------------------------------------------------------

/** camelCase -> kebab-case (fundoElevado -> fundo-elevado). */
function paraKebabCase(nome: string): string {
  return nome.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Extrai as declarações `--nome: valor;` de UM bloco, localizado pelo seletor.
 * Lê do `{` que abre o seletor até o `}` que o fecha — os blocos de tema não
 * têm aninhamento interno, então contar até o primeiro `}` basta.
 */
function declaracoesDoBloco(css: string, seletor: string): Map<string, string> {
  const idx = css.indexOf(seletor);
  if (idx === -1) throw new Error(`bloco '${seletor}' não encontrado em tokens.css`);
  const abre = css.indexOf('{', idx + seletor.length);
  const fecha = css.indexOf('}', abre);
  if (abre === -1 || fecha === -1) throw new Error(`bloco '${seletor}' malformado em tokens.css`);

  const corpo = css.slice(abre + 1, fecha);
  const mapa = new Map<string, string>();
  const regex = /--([a-z0-9-]+):\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(corpo)) !== null) mapa.set(m[1], m[2].trim());
  return mapa;
}

describe('sincronia tokens.ts <-> tokens.css', () => {
  // Comentários fora: o texto explicativo do arquivo cita nomes de token e
  // hex, e sem removê-los o `indexOf` do seletor casaria dentro de comentário.
  const cssBruto = readFileSync(join(__dirname, 'tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  const BLOCOS: Array<{ rotulo: string; seletor: string; modo: ModoTema; completo: boolean }> = [
    { rotulo: 'dark (:root)', seletor: ':root', modo: 'dark', completo: true },
    { rotulo: 'light pelo sistema', seletor: ':root:not([data-tema])', modo: 'light', completo: false },
    { rotulo: 'light manual', seletor: ":root[data-tema='light']", modo: 'light', completo: false },
  ];

  for (const bloco of BLOCOS) {
    describe(bloco.rotulo, () => {
      const declaracoes = declaracoesDoBloco(cssBruto, bloco.seletor);
      const pal = paleta(bloco.modo);

      // O `:root` declara TODOS os tokens; os blocos claros só os overrides.
      const esperados: NomeCor[] = bloco.completo
        ? (Object.keys(cores) as NomeCor[])
        : (Object.keys(coresLight) as NomeCor[]);

      for (const nome of esperados) {
        const chave = paraKebabCase(nome);
        it(`--${chave} = ${pal[nome]}`, () => {
          const valorCss = declaracoes.get(chave);
          expect(
            valorCss,
            `--${chave} não encontrado no bloco '${bloco.seletor}' (lidas: ${[...declaracoes.keys()].join(', ')})`,
          ).toBeDefined();
          expect(valorCss?.toUpperCase()).toBe(pal[nome].toUpperCase());
        });
      }

      if (!bloco.completo) {
        it('não declara NADA além dos overrides de `coresLight` (um token a mais aqui é um valor que some do dark sem aviso)', () => {
          const permitidos = new Set([
            ...(Object.keys(coresLight) as NomeCor[]).map(paraKebabCase),
          ]);
          const intrusos = [...declaracoes.keys()].filter((k) => !permitidos.has(k));
          expect(intrusos, `tokens declarados só no tema claro: ${intrusos.join(', ')}`).toEqual([]);
        });
      }

      it('declara color-scheme (senão os controles nativos ficam no tema errado)', () => {
        const idx = cssBruto.indexOf(bloco.seletor);
        const abre = cssBruto.indexOf('{', idx + bloco.seletor.length);
        const corpo = cssBruto.slice(abre + 1, cssBruto.indexOf('}', abre));
        expect(corpo).toContain(`color-scheme: ${bloco.modo}`);
      });
    });
  }

  /**
   * A cascata só funciona com o `:not([data-tema])` no bloco do `@media`: sem
   * ele, quem tem o SO no claro e escolhe "escuro" no toggle continua no
   * claro, porque o `@media` vem depois na cascata com a mesma
   * especificidade. É um bug que passa despercebido em quem testa só num SO.
   */
  it('o bloco do @media é escopado com :not([data-tema]) — sem isso o toggle manual não vence o sistema', () => {
    const media = cssBruto.slice(cssBruto.indexOf('@media (prefers-color-scheme: light)'));
    expect(media).toContain(':root:not([data-tema])');
  });

  it('o @media do sistema vem ANTES do bloco manual (ordem da cascata)', () => {
    expect(cssBruto.indexOf('@media (prefers-color-scheme: light)')).toBeLessThan(
      cssBruto.indexOf(":root[data-tema='light']"),
    );
  });

  it('os dois blocos claros declaram exatamente os mesmos valores', () => {
    const porSistema = declaracoesDoBloco(cssBruto, ':root:not([data-tema])');
    const manual = declaracoesDoBloco(cssBruto, ":root[data-tema='light']");
    expect([...manual.entries()].sort()).toEqual([...porSistema.entries()].sort());
  });

  // Tokens não-cor (px): mesma garantia de sincronia — divergência silenciosa
  // de espaçamento/raio/alvo de toque quebraria o layout sem aviso.
  describe('tokens de px', () => {
    const declaracoes = declaracoesDoBloco(cssBruto, ':root');
    const tokensPx: Array<[chaveKebab: string, valorEsperado: string]> = [
      ...Object.entries(espacamento).map(([k, v]): [string, string] => [`espaco-${k}`, `${v}px`]),
      ...Object.entries(raio).map(([k, v]): [string, string] => [`raio-${k}`, `${v}px`]),
      ['alvo-toque', `${alvoToque}px`],
    ];

    for (const [chave, esperado] of tokensPx) {
      it(`--${chave} = ${esperado}`, () => {
        expect(declaracoes.get(chave)).toBe(esperado);
      });
    }
  });
});
