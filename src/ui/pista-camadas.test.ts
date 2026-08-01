/**
 * Guardas de `pista-camadas.ts` (PR 7.3). Reimplementa localmente
 * `luminanciaRelativa`/`razaoContraste` no mesmo estilo de `tokens.test.ts`
 * (fórmula WCAG à mão; o projeto já faz isso e o revisor recomputa).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import { cores, type NomeCor } from './tokens';
import type { Ponto } from './fluxo-corrida';
import { suavizarPolilinhaFechada } from './suavizacao';
import { tracadoDaPista } from './tracados';
import {
  ALCANCE_ZEBRA,
  ANGULO_MINIMO_ZEBRA,
  viradaAcumuladaNaJanela,
  CAMADAS_PISTA,
  COBERTURA_MAXIMA_ZEBRA,
  CORRENTE_TONAL_DA_PILHA,
  HIERARQUIA_SUPERFICIES,
  LARGURA_ASFALTO,
  LARGURA_SVG_MINIMA_PX,
  MEIA_CAMADA_MAIS_LARGA,
  RAIO_CARRO_BOT,
  RAIO_CARRO_HUMANO,
  SEPARACAO_MINIMA_LUMINANCIA,
  SUPERFICIE_BASE_REPLAY,
  SUPERFICIES_DO_REPLAY,
  VIEWBOX_ALTURA,
  VIEWBOX_LARGURA,
  VIEWBOX_PISTA,
  VIEWBOX_X,
  VIEWBOX_Y,
  JANELA_CURVATURA_ZEBRA,
  anguloDeVirada,
  pathDaVolta,
  pathDoTrecho,
  trechosDeZebra,
  varDeCor,
  zebrasDaPista,
  type CorDePista,
  type TrechoZebra,
} from './pista-camadas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
const cssBruto = readFileSync(join(__dirname, 'estilos.css'), 'utf8');

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

/**
 * Razão de SEPARAÇÃO entre duas cores hex: NÃO é WCAG (não soma 0,05) — é a
 * razão pura de luminância `max(La, Lb) / min(La, Lb)`, o critério de
 * hierarquia tonal que `SEPARACAO_MINIMA_LUMINANCIA` exige entre superfícies
 * consecutivas (ver doc em `pista-camadas.ts`).
 */
function razaoSeparacao(hexA: string, hexB: string): number {
  const lA = luminanciaRelativa(hexA);
  const lB = luminanciaRelativa(hexB);
  const claro = Math.max(lA, lB);
  const escuro = Math.min(lA, lB);
  return claro / escuro;
}

/** camelCase -> kebab-case (mesmo padrão de `tokens.test.ts`/`varDeCor`). */
function paraKebabCase(nome: string): string {
  return nome.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

describe('separação mínima de luminância da hierarquia (3.1 — fecha a pendência 1, metade A)', () => {
  it('cada par consecutivo de HIERARQUIA_SUPERFICIES bate a separação mínima', () => {
    for (let i = 1; i < HIERARQUIA_SUPERFICIES.length; i++) {
      const anterior = HIERARQUIA_SUPERFICIES[i - 1];
      const atual = HIERARQUIA_SUPERFICIES[i];
      const razao = razaoSeparacao(cores[atual], cores[anterior]);
      expect(
        razao,
        `${anterior}->${atual}: razão ${razao.toFixed(3)} abaixo do mínimo ${SEPARACAO_MINIMA_LUMINANCIA}`,
      ).toBeGreaterThanOrEqual(SEPARACAO_MINIMA_LUMINANCIA);
    }
  });

  /**
   * Teste ANTI-TAUTOLÓGICO obrigatório, com o MUTANTE nomeado: `#322D58` no
   * lugar de `pistaAsfalto` é exatamente o mutante que a revisão do PR 7.2
   * provou passar em 608 testes preservando a ORDEM inteira de luminância
   * (fundoAfundado < fundo < ... < pistaAsfalto continua verdadeira com
   * `#322D58`) — é por isso que a guarda de ORDEM sozinha não basta: ela não
   * pega separação insuficiente entre vizinhos. Contra `pistaMuro`, a razão
   * de `#322D58` é 1,118 — abaixo do mínimo 1,25 — e esta guarda TEM que
   * reprovar isso.
   */
  it('mutante nomeado: #322D58 no lugar de pistaAsfalto reprova contra pistaMuro (razão 1,118 < 1,25)', () => {
    const MUTANTE_ASFALTO = '#322D58';
    const razao = razaoSeparacao(MUTANTE_ASFALTO, cores.pistaMuro);
    expect(razao).toBeLessThan(SEPARACAO_MINIMA_LUMINANCIA);
    expect(razao).toBeCloseTo(1.118, 2);
  });
});

/**
 * A corrente de `HIERARQUIA_SUPERFICIES` (acima) é guarda de PALETA: trava a
 * ordem dos tokens entre si. Ela NÃO descreve a pilha que o olho vê, e por
 * isso deixava a primeira adjacência real sem guarda nenhuma: escurecer
 * `pistaTerreno` até empatar com o chão do replay deixava a suíte inteira
 * verde (achado B da re-revisão do PR 7.3). Este bloco trava a pilha REAL,
 * derivada do dado (`papel: 'superficie'`), não de uma lista escrita à mão.
 *
 * O degrau chão→terreno é justamente o que o dev escolheu preservar no PR
 * 7.3.1 (é ele que dá o RELEVO da maquete do 7.1), então é o que mais precisa
 * de guarda.
 */
describe('separação mínima na CORRENTE TONAL DA PILHA REAL (achado B da re-revisão)', () => {
  it('a corrente é derivada do dado e começa na superfície de base do replay', () => {
    expect(CORRENTE_TONAL_DA_PILHA[0]).toBe(SUPERFICIE_BASE_REPLAY);
    expect(CORRENTE_TONAL_DA_PILHA).toEqual([
      SUPERFICIE_BASE_REPLAY,
      ...CAMADAS_PISTA.filter((c) => c.papel === 'superficie').map((c) => c.cor),
    ]);
  });

  /** Razão de separação de cada par consecutivo de uma corrente de tokens. */
  function separacoesDaCorrente(corrente: readonly string[]): number[] {
    const razoes: number[] = [];
    for (let i = 1; i < corrente.length; i++) {
      razoes.push(razaoSeparacao(cores[corrente[i] as NomeCor], cores[corrente[i - 1] as NomeCor]));
    }
    return razoes;
  }

  it('cada par ADJACENTE da pilha real bate a separação mínima (chão→terreno→escape→muro→asfalto)', () => {
    const razoes = separacoesDaCorrente(CORRENTE_TONAL_DA_PILHA);
    razoes.forEach((razao, i) => {
      expect(
        razao,
        `${CORRENTE_TONAL_DA_PILHA[i]}->${CORRENTE_TONAL_DA_PILHA[i + 1]}: razão ${razao.toFixed(3)} abaixo do mínimo ${SEPARACAO_MINIMA_LUMINANCIA}`,
      ).toBeGreaterThanOrEqual(SEPARACAO_MINIMA_LUMINANCIA);
    });
  });

  /**
   * Mutação que SÓ a corrente da pilha pega — é ela que justifica este bloco
   * existir além da guarda de paleta.
   *
   * Com o chão em `fundo` (PR 7.3.1), das 4 adjacências da pilha duas
   * (`fundo→terreno` e `muro→asfalto`) também são adjacentes em
   * `HIERARQUIA_SUPERFICIES`, logo já estão cobertas lá. As DUAS que só a
   * pilha cobre são `terreno→escape` e `escape→muro`, porque na hierarquia o
   * `fundoAfundado` do escape fica na outra ponta da lista.
   *
   * O mutante aqui é o realista pra essas: alguém dá à camada de escape a
   * mesma cor do terreno — o anel escuro simplesmente SOME do desenho. Isso
   * não toca token nenhum, então a ordem E as separações da hierarquia
   * continuam perfeitas e a guarda de paleta passa limpa.
   */
  it('mutação que só a pilha pega: escape com a mesma cor do terreno (o anel some) reprova', () => {
    const correnteMutante = CORRENTE_TONAL_DA_PILHA.map((cor, i) =>
      // índice 2 = a camada de escape (chão, terreno, escape, muro, asfalto)
      i === 2 ? 'pistaTerreno' : cor,
    );
    const razoes = separacoesDaCorrente(correnteMutante);
    expect(Math.min(...razoes)).toBeLessThan(SEPARACAO_MINIMA_LUMINANCIA);
    expect(razoes[1]).toBeCloseTo(1, 5); // terreno->terreno: nenhuma separação

    // e a guarda de PALETA continuaria verde com essa mutação, porque nenhum
    // token mudou de valor — é exatamente esse o buraco que este bloco fecha.
    const razoesDaPaleta = separacoesDaCorrente(HIERARQUIA_SUPERFICIES);
    expect(Math.min(...razoesDaPaleta)).toBeGreaterThanOrEqual(SEPARACAO_MINIMA_LUMINANCIA);
  });
});

describe('limite de pista achável contra a superfície REAL (3.2 — fecha a pendência 1, metade B)', () => {
  /**
   * Esta é a guarda que responde ao risco que o PR 7.2 deixou aberto: o
   * elemento que DELIMITA a pista (`pistaLimite`) é achável contra QUALQUER
   * fundo real do replay, sem depender de ordem nenhuma — mesmo que uma
   * reversão futura troque o background de `.tracado-svg` de volta pro que
   * era antes (`fundoElevado`), o limite continua legível.
   */
  for (const superficie of SUPERFICIES_DO_REPLAY) {
    it(`pistaLimite/${superficie} >= 3:1`, () => {
      const razao = razaoContraste(cores.pistaLimite, cores[superficie as NomeCor]);
      expect(razao).toBeGreaterThanOrEqual(3);
    });
  }
});

/**
 * CSS sem comentários `/* ... *\/` (Aviso 9 da revisão do PR 7.3): o parser
 * ingênuo `blocosCss`/os regexes ancorados abaixo casariam o SELETOR ERRADO
 * se um comentário mencionasse `.tracado-svg` antes da regra de verdade, e
 * uma chave dentro de um comentário quebraria o parser de blocos por
 * contagem de `{`/`}`. Removido uma vez, reusado pelos dois testes (3.3 e
 * 3.4) que leem `estilos.css`.
 */
const cssSemComentarios = cssBruto.replace(/\/\*[\s\S]*?\*\//g, '');

describe('casamento com a realidade (3.3 — o dado não pode divergir do CSS)', () => {
  it('.tracado-svg__chao traz fill: var(--<kebab de SUPERFICIE_BASE_REPLAY>) — sem isso a guarda 3.2 mediria contra uma superfície fictícia', () => {
    // O <rect> de chão cobre 100% do viewBox — é ele, não o `background` do
    // painel, que pinta a superfície REAL sob o traçado (Aviso 2 da revisão).
    const kebab = paraKebabCase(SUPERFICIE_BASE_REPLAY);
    const regex = /^\.tracado-svg__chao\s*\{([^}]*)\}/m;
    const match = cssSemComentarios.match(regex);
    expect(match, '.tracado-svg__chao não encontrado em estilos.css').not.toBeNull();
    expect(match?.[1]).toContain(`fill: var(--${kebab})`);
  });

  it('.tracado-svg (o painel) usa o MESMO tom do chão — se os dois divergirem, aparece uma borda de cor errada em qualquer letterboxing futuro', () => {
    const kebab = paraKebabCase(SUPERFICIE_BASE_REPLAY);
    const regexPainel = /^\.tracado-svg\s*\{([^}]*)\}/m; // ancorado (Cosmetic 11): sem isso, casaria a primeira ocorrência de ".tracado-svg{" no arquivo, seletor certo ou não
    const matchPainel = cssSemComentarios.match(regexPainel);
    expect(matchPainel, '.tracado-svg não encontrado em estilos.css').not.toBeNull();
    expect(matchPainel?.[1]).toContain(`background: var(--${kebab})`);
  });

  /**
   * Trava a DECISÃO DE OLHO do dev no PR 7.3.1: o chão do replay é `fundo`,
   * não `fundoElevado`. É `fundo` que deixa o terreno (mais claro) ler como
   * degrau que sobe — o relevo da maquete do 7.1. Voltar o chão pra
   * `fundoElevado` devolve o painel ao visual de card, mas apaga o relevo, e
   * o dev escolheu o relevo aceitando esse custo. Nenhuma guarda de contraste
   * reprovaria a volta (as duas passam), então sem este teste a decisão se
   * desfaz sozinha na próxima refatoração.
   */
  it('o chão do replay é `fundo` — decisão de olho do dev no 7.3.1 (relevo do terreno), que nenhuma guarda de contraste protege', () => {
    expect(SUPERFICIE_BASE_REPLAY).toBe('fundo');

    // O SINAL do degrau é o que carrega a decisão: terreno MAIS CLARO que o
    // chão = degrau que sobe = relevo. (`razaoSeparacao` não serve pra isso —
    // ela é `max/min`, logo >= 1 por construção, pra qualquer par.)
    expect(luminanciaRelativa(cores.pistaTerreno)).toBeGreaterThan(
      luminanciaRelativa(cores[SUPERFICIE_BASE_REPLAY as NomeCor]),
    );

    // E a MAGNITUDE do degrau: 1,357: é a adjacência mais apertada de toda a
    // pilha (com `fundoElevado` era 1,578), então qualquer ajuste futuro em
    // `fundo` ou `pistaTerreno` estoura aqui antes de qualquer outro lugar.
    const razaoRelevo = razaoSeparacao(cores.pistaTerreno, cores[SUPERFICIE_BASE_REPLAY as NomeCor]);
    expect(razaoRelevo).toBeGreaterThanOrEqual(SEPARACAO_MINIMA_LUMINANCIA);
    expect(razaoRelevo).toBeCloseTo(1.357, 2);
  });
});

describe('guarda de CSS anti-raridade (3.4 — fecha a pendência 2)', () => {
  /** Extrai blocos `seletor { corpo }` — funciona com as media queries do arquivo porque não há aninhamento de regra (comentários já removidos por `cssSemComentarios`). */
  function blocosCss(css: string): { seletor: string; corpo: string }[] {
    const blocos: { seletor: string; corpo: string }[] = [];
    const regex = /([^{}]*)\{([^{}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(css)) !== null) {
      blocos.push({ seletor: m[1].trim(), corpo: m[2] });
    }
    return blocos;
  }

  const blocos = blocosCss(cssSemComentarios);
  const blocosTracadoSvg = blocos.filter((b) => b.seletor.includes('.tracado-svg'));

  it('anti-tautologia: encontrou pelo menos 4 regras .tracado-svg* (senão um rename de classe faria a guarda passar vazia)', () => {
    expect(blocosTracadoSvg.length).toBeGreaterThanOrEqual(4);
  });

  it('nenhuma regra .tracado-svg* referencia var(--raridade-', () => {
    for (const bloco of blocosTracadoSvg) {
      expect(
        bloco.corpo,
        `regra "${bloco.seletor}" referencia var(--raridade-*): ${bloco.corpo}`,
      ).not.toMatch(/var\(--raridade-/);
    }
  });

  it('guarda gêmea no nível do dado: nenhuma CamadaPista.cor começa com "raridade" (o tipo já impede em compile-time, mas some em runtime)', () => {
    for (const camada of CAMADAS_PISTA) {
      expect((camada.cor as string).startsWith('raridade')).toBe(false);
    }
  });
});

describe('regra dos 360px (3.5 — critério permanente)', () => {
  /**
   * Faixa visível de uma camada = (largura da camada − largura da PRÓXIMA
   * camada mais ESTREITA na ordem de pintura, ignorando duplicatas de mesma
   * largura) / 2, convertida pela escala de 360px.
   *
   * Por que "próxima mais estreita, em QUALQUER alvo" (não "próxima do mesmo
   * alvo 'volta'"): a faixa visível de uma camada é limitada pela PRÓXIMA
   * camada mais estreita que efetivamente cobre aquela região, seja ela
   * `'volta'` ou `'curvas'` — é uma questão de o que fisicamente aparece por
   * cima, não de categoria de dado. Exemplo concreto: o `muro` (72) teria
   * faixa visível de (72-42)/2 = 15 unidades (4,22px) se só contasse a
   * próxima camada de `alvo: 'volta'` (o `limite`, 42) — mas numa curva a
   * `zebra` (58, `alvo: 'curvas'`) também cobre por cima do muro, então a
   * faixa REAL que sobra visível ali é só (72-58)/2 = 7 unidades (1,96px).
   * A fórmula abaixo reproduz os 6 valores medidos (terreno 4,77 / escape
   * 1,96 / muro 1,96 / zebra 2,25 / limite 1,12 / asfalto 4,77).
   *
   * `<` estrito (Cosmetic 14): duas camadas de mesma largura (nenhuma hoje,
   * mas seria o caso de uma futura camada duplicada) não "escondem" uma à
   * outra — a função pula pra próxima estritamente menor, porque uma largura
   * IGUAL não reduz a faixa visível da camada de fora.
   */
  function proximaLarguraMenor(indice: number): number {
    const atual = CAMADAS_PISTA[indice].largura;
    for (let i = indice + 1; i < CAMADAS_PISTA.length; i++) {
      if (CAMADAS_PISTA[i].largura < atual) return CAMADAS_PISTA[i].largura;
    }
    return 0;
  }

  const escala = LARGURA_SVG_MINIMA_PX / VIEWBOX_LARGURA;

  it.each(CAMADAS_PISTA.map((c, i) => [c.id, i] as const))('camada "%s" tem faixa visível >= 1px a 360px', (id, indice) => {
    const camada = CAMADAS_PISTA[indice];
    const proxima = proximaLarguraMenor(indice);
    const faixaPx = ((camada.largura - proxima) / 2) * escala;
    expect(faixaPx, `camada "${id}": ${faixaPx.toFixed(2)}px`).toBeGreaterThanOrEqual(1);
  });

  /**
   * PR 7.4: era ~1,12px enquanto o viewBox tinha 1140 de largura. Ao reapertar
   * pra 1000, a mesma camada passa a ocupar 1,28px — a regra dos 360px ficou
   * MAIS folgada, não mais apertada, porque a moldura vazia que o 7.3 reservava
   * saiu e tudo cresceu 14% na tela.
   */
  it('mínimo real é a camada "limite", ~1,28px', () => {
    const indiceLimite = CAMADAS_PISTA.findIndex((c) => c.id === 'limite');
    const proxima = proximaLarguraMenor(indiceLimite);
    const faixaPx = ((CAMADAS_PISTA[indiceLimite].largura - proxima) / 2) * escala;
    expect(faixaPx).toBeCloseTo(1.28, 2);
  });
});

describe('consistência da pilha (3.6)', () => {
  it('larguras não-crescentes na ordem de pintura', () => {
    for (let i = 1; i < CAMADAS_PISTA.length; i++) {
      expect(CAMADAS_PISTA[i].largura).toBeLessThanOrEqual(CAMADAS_PISTA[i - 1].largura);
    }
  });

  it('estritamente decrescentes entre camadas de alvo "volta" (senão uma camada some inteira sob a seguinte)', () => {
    const deVolta = CAMADAS_PISTA.filter((c) => c.alvo === 'volta');
    for (let i = 1; i < deVolta.length; i++) {
      expect(deVolta[i].largura).toBeLessThan(deVolta[i - 1].largura);
    }
  });

  it('"asfalto" é a última camada e a mais estreita', () => {
    const ultima = CAMADAS_PISTA[CAMADAS_PISTA.length - 1];
    expect(ultima.id).toBe('asfalto');
    expect(ultima.largura).toBe(LARGURA_ASFALTO);
    for (const camada of CAMADAS_PISTA) {
      expect(camada.largura).toBeGreaterThanOrEqual(ultima.largura);
    }
  });

  it('pistaAsfalto é a superfície mais clara de HIERARQUIA_SUPERFICIES', () => {
    expect(HIERARQUIA_SUPERFICIES.at(-1)).toBe('pistaAsfalto');
  });
});

describe('cor de cada camada casada com a hierarquia (Aviso 4 da revisão do PR 7.3)', () => {
  /** Golden explícito id -> cor: mutar QUALQUER cor de CAMADAS_PISTA quebra este teste. */
  const GOLDEN_COR: Record<string, CorDePista> = {
    terreno: 'pistaTerreno',
    escape: 'fundoAfundado',
    muro: 'pistaMuro',
    'zebra-a': 'pistaZebraA',
    'zebra-b': 'pistaZebraB',
    limite: 'pistaLimite',
    asfalto: 'pistaAsfalto',
  };

  it('golden explícito do mapa id -> cor das 7 camadas', () => {
    const mapa: Record<string, CorDePista> = {};
    for (const camada of CAMADAS_PISTA) mapa[camada.id] = camada.cor;
    expect(mapa).toEqual(GOLDEN_COR);
  });

  /**
   * Backstop semântico pro golden acima: a cor de "asfalto" tem que ser
   * estritamente a de maior luminância entre as camadas que representam
   * SUPERFÍCIE DE TERRENO (cor pertence a `HIERARQUIA_SUPERFICIES`:
   * terreno/escape/muro/asfalto aqui). Escopo deliberado — NÃO "entre todas
   * as 7 camadas": zebra (`pistaZebraA` ≈ 0,64 de luminância) e limite
   * (`pistaLimite` ≈ 0,374) são ACENTOS/MARCAÇÕES, não superfície de terreno,
   * e são mais claras que o asfalto por natureza (é isso que as faz
   * legíveis) — comparar contra elas tornaria a asserção falsa mesmo sem
   * mutação nenhuma. Mata a mutação de trocar `CAMADAS_PISTA[1].cor`
   * (escape) pra `'pistaAsfalto'`: força um empate de luminância contra a
   * própria camada "asfalto", e o `>` estrito reprova o empate.
   */
  it('a cor da camada "asfalto" é estritamente a de maior luminância entre as camadas de superfície de terreno', () => {
    const luminanciaAsfalto = luminanciaRelativa(cores.pistaAsfalto);
    for (const camada of CAMADAS_PISTA) {
      if (camada.id === 'asfalto') continue;
      if (!(HIERARQUIA_SUPERFICIES as readonly string[]).includes(camada.cor)) continue;
      const luminanciaCamada = luminanciaRelativa(cores[camada.cor as NomeCor]);
      expect(
        luminanciaAsfalto,
        `camada "${camada.id}" (${camada.cor}, luminância ${luminanciaCamada.toFixed(4)}) não pode ter luminância >= a de asfalto`,
      ).toBeGreaterThan(luminanciaCamada);
    }
  });
});

describe('viewBox contém todas as 10 pistas (3.7 — reapertado no 7.4)', () => {
  const metadeCamadaMaisLarga = Math.max(...CAMADAS_PISTA.map((c) => c.largura)) / 2;
  const minXViewbox = VIEWBOX_X;
  const minYViewbox = VIEWBOX_Y;
  const maxXViewbox = VIEWBOX_X + VIEWBOX_LARGURA;
  const maxYViewbox = VIEWBOX_Y + VIEWBOX_ALTURA;

  /**
   * O que precisa caber é a CURVA SUAVIZADA — é ela que se desenha desde o
   * 7.4, e ela faz overshoot pra fora do bounding box da polilinha de
   * controle. Amostrada aqui em N=64, mais fino que a produção (N=12):
   * amostrar mais só pode achar extremo MAIOR, então a guarda é conservadora.
   */
  const AMOSTRAS_DA_GUARDA = 64;

  function envelope(pistaId: string) {
    const curva = suavizarPolilinhaFechada(tracadoDaPista(pistaId), AMOSTRAS_DA_GUARDA);
    const xs = curva.map((p) => p.x);
    const ys = curva.map((p) => p.y);
    return {
      minX: Math.min(...xs) - metadeCamadaMaisLarga,
      maxX: Math.max(...xs) + metadeCamadaMaisLarga,
      minY: Math.min(...ys) - metadeCamadaMaisLarga,
      maxY: Math.max(...ys) + metadeCamadaMaisLarga,
    };
  }

  it('VIEWBOX_PISTA está no formato esperado', () => {
    expect(VIEWBOX_PISTA).toBe('-10 -30 1000 660');
  });

  it('MEIA_CAMADA_MAIS_LARGA acompanha de fato a camada mais larga de CAMADAS_PISTA', () => {
    expect(MEIA_CAMADA_MAIS_LARGA).toBe(metadeCamadaMaisLarga);
  });

  it.each(dataset.pistas.map((p) => [p.id] as const))(
    'pista %s cabe no viewBox com folga (camada + curva suavizada)',
    (pistaId) => {
      const e = envelope(pistaId);
      expect(e.minX).toBeGreaterThanOrEqual(minXViewbox);
      expect(e.maxX).toBeLessThanOrEqual(maxXViewbox);
      expect(e.minY).toBeGreaterThanOrEqual(minYViewbox);
      expect(e.maxY).toBeLessThanOrEqual(maxYViewbox);
    },
  );

  /**
   * A folga que sobra depois de apertar. Fica DOCUMENTADA em número (era a
   * queixa da pendência 1 do 7.3: `MARGEM_VIEWBOX = 70` sem medição por trás).
   * Pior lado é a direita, 10,0 — Nürburgring, cujo x máximo é 920.
   */
  it('pior folga real é 10 (borda direita, Nürburgring)', () => {
    let piorFolga = Infinity;
    for (const pista of dataset.pistas) {
      const e = envelope(pista.id);
      piorFolga = Math.min(
        piorFolga,
        e.minX - minXViewbox,
        maxXViewbox - e.maxX,
        e.minY - minYViewbox,
        maxYViewbox - e.maxY,
      );
    }
    expect(piorFolga).toBeCloseTo(10, 1);
  });

  /**
   * O aperto é o ponto do exercício: o 7.3 gastava 1140×740 pro mesmo
   * conteúdo. Se alguém voltar a inflar o viewBox "por segurança", os carros
   * encolhem na tela de novo e a pendência 1 renasce.
   */
  it('o viewBox não desperdiça mais que 15% de área além do envelope real das 10 pistas', () => {
    const todos = dataset.pistas.map((p) => envelope(p.id));
    const largura = Math.max(...todos.map((e) => e.maxX)) - Math.min(...todos.map((e) => e.minX));
    const altura = Math.max(...todos.map((e) => e.maxY)) - Math.min(...todos.map((e) => e.minY));
    const desperdicio = (VIEWBOX_LARGURA * VIEWBOX_ALTURA) / (largura * altura) - 1;
    expect(desperdicio).toBeLessThan(0.15);
  });
});

describe('fusão de asfalto (3.8 — documenta e trava o que foi medido)', () => {
  function distPontoSegmento(p: Ponto, a: Ponto, b: Ponto): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const comp2 = dx * dx + dy * dy;
    if (comp2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / comp2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function segmentosSeIntersectam(a: Ponto, b: Ponto, c: Ponto, d: Ponto): boolean {
    const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
    if (den === 0) return false;
    const s = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
    const r = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
    return s >= 0 && s <= 1 && r >= 0 && r <= 1;
  }

  function distSegmentoSegmento(a: Ponto, b: Ponto, c: Ponto, d: Ponto): number {
    if (segmentosSeIntersectam(a, b, c, d)) return 0;
    return Math.min(
      distPontoSegmento(a, c, d),
      distPontoSegmento(b, c, d),
      distPontoSegmento(c, a, b),
      distPontoSegmento(d, a, b),
    );
  }

  function mesmoPonto(p: Ponto, q: Ponto): boolean {
    return p.x === q.x && p.y === q.y;
  }

  /** Menor distância entre trechos NÃO adjacentes, ignorando pares que COMPARTILHAM VÉRTICE (por coordenada, não só índice — preserva o "8" de Suzuka, igual a `tracados.test.ts`). */
  function minNaoAdj(tracado: readonly Ponto[]): number {
    const n = tracado.length;
    let min = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if ((j + 1) % n === i || (i + 1) % n === j) continue;
        const a = tracado[i];
        const b = tracado[(i + 1) % n];
        const c = tracado[j];
        const d = tracado[(j + 1) % n];
        if (mesmoPonto(a, c) || mesmoPonto(a, d) || mesmoPonto(b, c) || mesmoPonto(b, d)) continue;
        const dist = distSegmentoSegmento(a, b, c, d);
        if (dist < min) min = dist;
      }
    }
    return min;
  }

  const MIN_NAO_ADJ_MEDIDO: Record<string, number> = {
    'pista-spa': 18.6,
    'pista-monaco': 20.0,
    'pista-interlagos': 26.7,
    'pista-monza': 43.6,
    'pista-silverstone': 44.7,
    'pista-imola': 50.0,
    'pista-montreal': 63.8,
    'pista-red-bull-ring': 72.8,
    'pista-nurburgring': 80.3,
    'pista-suzuka': 113.6,
  };

  /**
   * Limiar apertado (Aviso 5 da revisão do PR 7.3): `<= 20` não era derivado
   * de nada e era MAIOR que `LARGURA_ASFALTO / 2` (17) — permitiria o EIXO de
   * um trecho cair dentro do asfalto de outro trecho. O critério certo:
   * nenhum trecho pode ter o EIXO (o próprio traçado, largura 0) dentro do
   * asfalto de outro trecho, e o asfalto se estende `LARGURA_ASFALTO / 2`
   * pra cada lado do eixo — daí o limiar derivado, não mágico. Máximo real
   * medido é Spa 15,4 ⇒ passa com ~10% de folga sobre o limiar de 17.
   */
  const LIMIAR_SOBREPOSICAO_ASFALTO = LARGURA_ASFALTO / 2;

  it.each(dataset.pistas.map((p) => [p.id] as const))(
    `sobreposição máxima de asfalto em %s é <= ${LIMIAR_SOBREPOSICAO_ASFALTO} (= LARGURA_ASFALTO / 2)`,
    (pistaId) => {
      const tracado = tracadoDaPista(pistaId);
      const dist = minNaoAdj(tracado);
      const sobreposicao = Math.max(0, LARGURA_ASFALTO - dist);
      expect(sobreposicao).toBeLessThanOrEqual(LIMIAR_SOBREPOSICAO_ASFALTO);
    },
  );

  it('minNaoAdj medido bate com a tabela do plano pra todas as 10 pistas', () => {
    for (const [pistaId, esperado] of Object.entries(MIN_NAO_ADJ_MEDIDO)) {
      const tracado = tracadoDaPista(pistaId);
      expect(minNaoAdj(tracado), pistaId).toBeCloseTo(esperado, 1);
    }
  });

  it('Monza fica em ZERO de sobreposição com largura 34 (a maquete aprovada já fundia 8,4) — a guarda existe pra o 7.4 (Bézier) não piorar isso em silêncio', () => {
    const tracado = tracadoDaPista('pista-monza');
    const sobreposicao = Math.max(0, LARGURA_ASFALTO - minNaoAdj(tracado));
    expect(sobreposicao).toBe(0);
  });

  /**
   * REPORT-ONLY (Aviso 5): documenta a fusão da camada de LIMITE (largura
   * 42), sem travar limiar nenhum sobre ela — é consequência da fusão do
   * asfalto (onde o asfalto já se fundiu, não há fronteira nítida a
   * desenhar ali, então a camada de limite também se funde). Números
   * escritos pro 7.4 (Bézier) comparar antes/depois da suavização.
   */
  it('report-only: fusão da camada de LIMITE (largura 42) — Spa 23,4 · Mônaco 22,0 · Interlagos 15,3 · as outras 7 zero', () => {
    const larguraLimite = CAMADAS_PISTA.find((c) => c.id === 'limite')?.largura;
    expect(larguraLimite).toBe(42);
    const PISTAS_COM_FUSAO_DE_LIMITE: Record<string, number> = {
      'pista-spa': 23.4,
      'pista-monaco': 22.0,
      'pista-interlagos': 15.3,
    };
    for (const [pistaId, esperado] of Object.entries(PISTAS_COM_FUSAO_DE_LIMITE)) {
      const sobreposicao = Math.max(0, (larguraLimite as number) - minNaoAdj(tracadoDaPista(pistaId)));
      expect(sobreposicao, pistaId).toBeCloseTo(esperado, 1);
    }
    for (const pistaId of Object.keys(MIN_NAO_ADJ_MEDIDO)) {
      if (pistaId in PISTAS_COM_FUSAO_DE_LIMITE) continue;
      const sobreposicao = Math.max(0, (larguraLimite as number) - minNaoAdj(tracadoDaPista(pistaId)));
      expect(sobreposicao, pistaId).toBe(0);
    }
  });
});

describe('anguloDeVirada', () => {
  it('reta (sem virada) dá ~0°', () => {
    expect(anguloDeVirada({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 })).toBeCloseTo(0, 5);
  });

  it('curva de 90° dá 90°', () => {
    expect(anguloDeVirada({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 })).toBeCloseTo(90, 5);
  });

  it('hairpin (reversão completa) dá 180°', () => {
    expect(anguloDeVirada({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 })).toBeCloseTo(180, 5);
  });
});

describe('zebra (3.9)', () => {
  /**
   * `indices` entrou no golden junto com a métrica de janela: contagem +
   * cobertura NÃO identificam a seleção. O teto de 40% é vinculante em 6 das 10
   * pistas (Mônaco 15→8, Silverstone 11→9, Interlagos 12→10, Nürburgring 22→10,
   * Imola 12→9, Red Bull Ring 9→7), e onde ele morde a ORDEM da varredura gulosa
   * decide QUEM entra — a chave de ordenação mudou de `angulo` pra `virada`, então
   * o mesmo conjunto de candidatos poderia produzir outra seleção com a mesma
   * contagem e cobertura parecida. Preservar a seleção é a única coisa que este
   * PR promete, e sem os índices nada a verificava.
   */
  const GOLDEN_COBERTURA: Record<
    string,
    { candidatos: number; escolhidos: number; coberturaPct: number; indices: number[] }
  > = {
    'pista-monaco': { candidatos: 15, escolhidos: 8, coberturaPct: 39.4, indices: [0, 2, 4, 5, 6, 11, 12, 15] },
    'pista-spa': { candidatos: 9, escolhidos: 9, coberturaPct: 36.8, indices: [0, 1, 2, 3, 4, 5, 8, 9, 11] },
    'pista-monza': { candidatos: 11, escolhidos: 11, coberturaPct: 38.4, indices: [0, 2, 3, 5, 6, 7, 8, 9, 11, 14, 15] },
    'pista-silverstone': { candidatos: 11, escolhidos: 9, coberturaPct: 37.6, indices: [0, 4, 5, 6, 7, 8, 12, 13, 15] },
    'pista-suzuka': { candidatos: 8, escolhidos: 8, coberturaPct: 26.0, indices: [1, 2, 6, 7, 9, 10, 14, 15] },
    'pista-interlagos': { candidatos: 12, escolhidos: 10, coberturaPct: 39.1, indices: [0, 2, 3, 4, 5, 6, 7, 8, 9, 11] },
    'pista-nurburgring': { candidatos: 22, escolhidos: 10, coberturaPct: 38.4, indices: [1, 2, 3, 4, 5, 9, 13, 19, 20, 21] },
    'pista-imola': { candidatos: 12, escolhidos: 9, coberturaPct: 38.1, indices: [0, 2, 3, 5, 7, 8, 12, 13, 15] },
    'pista-red-bull-ring': { candidatos: 9, escolhidos: 7, coberturaPct: 38.1, indices: [0, 1, 2, 3, 4, 5, 6] },
    'pista-montreal': { candidatos: 7, escolhidos: 7, coberturaPct: 27.6, indices: [0, 3, 7, 9, 10, 11, 12] },
  };

  function candidatos28(tracado: readonly Ponto[]): number {
    const n = tracado.length;
    let total = 0;
    for (let i = 0; i < n; i++) {
      const ant = tracado[(i - 1 + n) % n];
      const v = tracado[i];
      const prox = tracado[(i + 1) % n];
      if (anguloDeVirada(ant, v, prox) >= ANGULO_MINIMO_ZEBRA) total++;
    }
    return total;
  }

  /** Perímetro de uma polilinha fechada. */
  function perimetro(tracado: readonly Ponto[]): number {
    let soma = 0;
    for (let i = 0; i < tracado.length; i++) {
      const a = tracado[i];
      const b = tracado[(i + 1) % tracado.length];
      soma += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return soma;
  }

  /**
   * Cobertura aproximada (soma dos comprimentos dos trechos escolhidos /
   * perímetro). Válida — PROVA ESTRUTURAL (Cosmetic 13, não mais empírica):
   * o intervalo de arco do vértice `i` está contido em
   * `[arco_i − seg_{i-1}/2, arco_i + seg_i/2]` (o algoritmo usa
   * `min(ALCANCE_ZEBRA, segmento/2)`, sempre `<=` metade do segmento
   * adjacente). Esses domínios — metade de cada segmento pra cada lado —
   * PARTICIONAM o perímetro inteiro sem sobra e sem overlap, pra QUALQUER
   * polilinha fechada: dois trechos vizinhos no máximo se TOCAM na fronteira
   * (a metade do segmento compartilhado), nunca se sobrepõem. Logo a soma
   * dos comprimentos nunca superestima a união, em qualquer uma das 10
   * pistas ou em traçados futuros.
   */
  function coberturaAprox(tracado: readonly Ponto[], trechos: readonly TrechoZebra[]): number {
    let soma = 0;
    for (const { antes, vertice, depois } of trechos) {
      soma += Math.hypot(vertice.x - antes.x, vertice.y - antes.y) + Math.hypot(depois.x - vertice.x, depois.y - vertice.y);
    }
    return (soma / perimetro(tracado)) * 100;
  }

  it.each(dataset.pistas.map((p) => [p.id] as const))(
    'nenhuma pista passa de COBERTURA_MAXIMA_ZEBRA (%s)',
    (pistaId) => {
      const tracado = tracadoDaPista(pistaId);
      const trechos = trechosDeZebra(tracado);
      const cobertura = coberturaAprox(tracado, trechos);
      expect(cobertura / 100).toBeLessThanOrEqual(COBERTURA_MAXIMA_ZEBRA + 1e-9);
    },
  );

  it.each(dataset.pistas.map((p) => [p.id] as const))('todos os vértices escolhidos em %s têm VIRADA ACUMULADA >= 28° na janela', (pistaId) => {
    const tracado = tracadoDaPista(pistaId);
    const trechos = trechosDeZebra(tracado);
    // `indice` (Cosmetic 12) aponta direto pro vértice ORIGINAL no traçado —
    // não precisa mais de `findIndex` por coordenada (fragilidade que
    // quebraria se dois vértices caíssem na mesma coordenada, num traçado
    // curvo futuro).
    for (const { indice, vertice } of trechos) {
      expect(tracado[indice]).toEqual(vertice);
      expect(viradaAcumuladaNaJanela(tracado, indice)).toBeGreaterThanOrEqual(ANGULO_MINIMO_ZEBRA);
    }
  });

  it('nas 10 pistas de HOJE a virada acumulada seleciona os MESMOS vértices que o ângulo por vértice (o desenho aprovado no 7.1 não se mexe)', () => {
    for (const { id } of dataset.pistas) {
      const tracado = tracadoDaPista(id);
      const n = tracado.length;
      const porVertice: number[] = [];
      for (let i = 0; i < n; i++) {
        const ang = anguloDeVirada(tracado[(i - 1 + n) % n], tracado[i], tracado[(i + 1) % n]);
        if (ang >= ANGULO_MINIMO_ZEBRA) porVertice.push(i);
      }
      const porJanela: number[] = [];
      for (let i = 0; i < n; i++) {
        if (viradaAcumuladaNaJanela(tracado, i) >= ANGULO_MINIMO_ZEBRA) porJanela.push(i);
      }
      expect(porJanela, `${id}: candidatos`).toEqual(porVertice);
    }
  });

  it.each(Object.entries(GOLDEN_COBERTURA))('golden de %s: candidatos/escolhidos/cobertura batem com a tabela do plano', (pistaId, esperado) => {
    const tracado = tracadoDaPista(pistaId);
    const trechos = trechosDeZebra(tracado);
    expect(candidatos28(tracado), `${pistaId} candidatos`).toBe(esperado.candidatos);
    expect(trechos.length, `${pistaId} escolhidos`).toBe(esperado.escolhidos);
    expect(coberturaAprox(tracado, trechos), `${pistaId} cobertura`).toBeCloseTo(esperado.coberturaPct, 0);
    expect(trechos.map((t) => t.indice), `${pistaId} SELEÇÃO`).toEqual(esperado.indices);
  });

  // O teto de 40% NÃO é vinculante em Monza: ela dá 38,4% sem teto nenhum. O
  // teto foi ESCOLHIDO acima de 38,4% justamente pra não mexer no que o dev
  // aprovou — que é diferente de "preservá-lo", como uma versão anterior
  // deste título dizia.
  it('golden do mock aprovado: Monza tem exatamente 11 trechos e cobertura 38,4% (o que o dev aprovou na revisão 3 do PR 7.1 — e o teto de 40% ficou acima disso pra não mexer nela)', () => {
    const tracado = tracadoDaPista('pista-monza');
    const trechos = trechosDeZebra(tracado);
    expect(trechos.length).toBe(11);
    expect(coberturaAprox(tracado, trechos)).toBeCloseTo(38.4, 0);
  });

  it('anti-regressão nomeada: Nürburgring tem 22 vértices TODOS >=28° (85% do perímetro sem teto) mas fica em 10 trechos com o teto de 40% — é a "faixa contínua" que o dev reprovou, cortada pelo teto', () => {
    const tracado = tracadoDaPista('pista-nurburgring');
    expect(candidatos28(tracado)).toBe(tracado.length); // TODOS os vértices passam de 28°
    const trechos = trechosDeZebra(tracado);
    expect(trechos.length).toBe(10);
    expect(trechos.length).toBeLessThan(tracado.length);
  });

  it.each(dataset.pistas.map((p) => [p.id] as const))(
    'nenhum trecho de %s se estende além de ALCANCE_ZEBRA a partir do vértice (o min() do algoritmo)',
    (pistaId) => {
      const tracado = tracadoDaPista(pistaId);
      const trechos = trechosDeZebra(tracado);
      for (const { antes, vertice, depois } of trechos) {
        expect(Math.hypot(vertice.x - antes.x, vertice.y - antes.y)).toBeLessThanOrEqual(ALCANCE_ZEBRA + 1e-9);
        expect(Math.hypot(depois.x - vertice.x, depois.y - vertice.y)).toBeLessThanOrEqual(ALCANCE_ZEBRA + 1e-9);
      }
    },
  );

  it('determinismo: duas chamadas de trechosDeZebra devolvem o mesmo resultado', () => {
    const tracado = tracadoDaPista('pista-monza');
    expect(trechosDeZebra(tracado)).toEqual(trechosDeZebra(tracado));
  });

  it('zebrasDaPista é memoizado: devolve a MESMA REFERÊNCIA em chamadas repetidas (o replay depende disso)', () => {
    expect(zebrasDaPista('pista-monza')).toBe(zebrasDaPista('pista-monza'));
  });

  /**
   * INVARIÂNCIA À DENSIDADE (PR da zebra invariante). O critério "ângulo >= 28°
   * POR VÉRTICE" é proxy de curvatura que só funciona na densidade de hoje
   * (~16 pontos/volta): a mesma curva repartida em mais vértices dilui o
   * ângulo de cada um (90° em 4 vértices = 22,5° cada, abaixo do corte) e a
   * zebra SOME. O redesenho das silhuetas vai a 42-115 pontos, então o
   * critério quebraria por construção — e o dev não conseguiria separar "a
   * silhueta está errada" de "as zebras sumiram" no portão visual.
   *
   * A densidade é variada sobre a CURVA SUAVIZADA, não sobre a polilinha de
   * quinas: reamostrar quinas CORTA CANTOS (muda a forma, não só a densidade),
   * o que mediria outra coisa. A curva do 7.4 é a mesma silhueta já
   * densificada — e é a geometria que o redesenho terá.
   */
  function reamostrarPorArco(pontos: readonly Ponto[], alvo: number): Ponto[] {
    const n = pontos.length;
    const seg: number[] = [];
    const arco: number[] = [];
    let acc = 0;
    for (let i = 0; i < n; i++) {
      arco.push(acc);
      seg.push(Math.hypot(pontos[(i + 1) % n].x - pontos[i].x, pontos[(i + 1) % n].y - pontos[i].y));
      acc += seg[i];
    }
    const saida: Ponto[] = [];
    for (let k = 0; k < alvo; k++) {
      const alvoArco = (acc * k) / alvo;
      let i = 0;
      while (i < n - 1 && arco[i + 1] <= alvoArco) i++;
      const t = seg[i] === 0 ? 0 : (alvoArco - arco[i]) / seg[i];
      saida.push({
        x: pontos[i].x + (pontos[(i + 1) % n].x - pontos[i].x) * t,
        y: pontos[i].y + (pontos[(i + 1) % n].y - pontos[i].y) * t,
      });
    }
    return saida;
  }

  /**
   * Piso de cobertura em densidade alta. Com o critério antigo as 10 pistas
   * ficam em 0,0-11,6% a 120 pontos; com a janela, em 16,6-40,0%.
   *
   * A FRONTEIRA REAL É SUZUKA (16,6%) — as outras nove ficam em 25-40%. O piso
   * é 12 e não 15 de propósito: 15 deixaria 1,6 ponto de folga em cima da pior
   * pista, e qualquer mexida em `AMOSTRAS_POR_SEGMENTO`, no alpha da centrípeta
   * ou no reamostrador derrubaria Suzuka primeiro — um vermelho que não
   * significaria regressão da zebra. O que este piso precisa provar é que a
   * zebra NÃO SOME (o antigo entrega 0% em Suzuka), não calibrar cobertura.
   */
  const PISO_COBERTURA_DENSA = 12;

  it('viradaAcumuladaNaJanela: a soma numa curva repartida sobrevive à densidade que dilui o ângulo por vértice', () => {
    // Quina de 90° isolada, com as duas retas longas o bastante pra janela não
    // alcançar as outras quinas.
    const quina: Ponto[] = [
      { x: 0, y: 0 },
      { x: 400, y: 0 },
      { x: 400, y: 400 },
      { x: 0, y: 400 },
    ];
    expect(viradaAcumuladaNaJanela(quina, 1)).toBeCloseTo(90, 6);

    // MESMA virada de 90°, agora repartida num arco de raio 20 com 5 vértices
    // (11,25° nas pontas, 22,5° nos internos): ~31 u de arco, cabe na janela.
    // Cada vértice sozinho fica ABAIXO do corte de 28°...
    const RAIO = 20;
    const arco: Ponto[] = [];
    for (let k = 0; k <= 4; k++) {
      const t = -Math.PI / 2 + (k * Math.PI) / 8;
      arco.push({ x: 400 - RAIO + RAIO * Math.cos(t), y: RAIO + RAIO * Math.sin(t) });
    }
    const repartida: Ponto[] = [{ x: 0, y: 0 }, ...arco, { x: 400, y: 400 }, { x: 0, y: 400 }];
    for (const i of [1, 2, 3, 4, 5]) {
      const ang = anguloDeVirada(
        repartida[(i - 1 + repartida.length) % repartida.length],
        repartida[i],
        repartida[(i + 1) % repartida.length],
      );
      expect(ang, `vértice ${i} sozinho`).toBeLessThan(ANGULO_MINIMO_ZEBRA);
    }
    // ...mas a virada ACUMULADA em cada um deles recupera os ~90° da curva.
    for (const i of [1, 2, 3, 4, 5]) {
      expect(viradaAcumuladaNaJanela(repartida, i), `vértice ${i} na janela`).toBeCloseTo(90, 0);
    }
  });

  it('viradaAcumuladaNaJanela: janela maior que a volta inteira não conta vértice duas vezes (soma = virada total)', () => {
    const quadrado: Ponto[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(viradaAcumuladaNaJanela(quadrado, 0, 10_000)).toBeCloseTo(360, 6);
  });

  it.each(dataset.pistas.map((p) => [p.id] as const))(
    'a zebra de %s NÃO some quando a mesma forma é densificada (120 pontos)',
    (pistaId) => {
      const densa = reamostrarPorArco(suavizarPolilinhaFechada(tracadoDaPista(pistaId)), 120);
      const trechos = trechosDeZebra(densa);
      expect(coberturaAprox(densa, trechos)).toBeGreaterThanOrEqual(PISO_COBERTURA_DENSA);
    },
  );

  /**
   * `OpcoesZebra` existe pra o preview varrer 88/40% usando o algoritmo DE
   * PRODUÇÃO em vez de uma cópia. O risco que isso cria é um só: alguém mexer
   * no default e mudar a saída de produção sem perceber. Os goldens das 10
   * pistas já pegariam a mudança pela SAÍDA; este teste pega pela CAUSA —
   * passar os quatro parâmetros explicitamente nos valores das constantes tem
   * de ser indistinguível de não passar nada.
   */
  it.each(dataset.pistas.map((p) => [p.id] as const))(
    'OpcoesZebra: em %s, passar os defaults explicitamente é idêntico a omitir o argumento',
    (pistaId) => {
      const tracado = tracadoDaPista(pistaId);
      expect(
        trechosDeZebra(tracado, {
          anguloMinimo: ANGULO_MINIMO_ZEBRA,
          alcance: ALCANCE_ZEBRA,
          coberturaMaxima: COBERTURA_MAXIMA_ZEBRA,
          janela: JANELA_CURVATURA_ZEBRA,
        }),
      ).toEqual(trechosDeZebra(tracado));
    },
  );

  /**
   * O par que dá sentido ao de cima: se os parâmetros fossem ignorados (um
   * `opcoes` esquecido em algum dos quatro usos), o teste de identidade acima
   * passaria igual. Aqui cada parâmetro precisa MORDER quando sai do default.
   */
  it('OpcoesZebra: cada parâmetro afeta a saída quando sai do default', () => {
    // Nürburgring e NÃO Monza: a 120 pontos o teto de 40% não é vinculante em
    // Monza (48 trechos com teto e sem teto), então soltar o teto lá não muda
    // nada e o parâmetro pareceria inerte. No Nürburgring morde — é a pista que
    // dá 85% de cobertura sem teto.
    const densa = reamostrarPorArco(suavizarPolilinhaFechada(tracadoDaPista('pista-nurburgring')), 120);
    const base = trechosDeZebra(densa);
    // Ângulo alto demais e janela curta demais derrubam candidatos; teto folgado
    // admite os que o de 40% recusa; alcance menor encurta cada trecho.
    expect(trechosDeZebra(densa, { anguloMinimo: 179 }).length).toBeLessThan(base.length);
    expect(trechosDeZebra(densa, { janela: 1 }).length).toBeLessThan(base.length);
    expect(trechosDeZebra(densa, { coberturaMaxima: 1 }).length).toBeGreaterThan(base.length);
    expect(trechosDeZebra(densa, { alcance: 1 })[0].alcanceFrente).toBeLessThan(base[0].alcanceFrente);
  });

  /**
   * A regra inviolável 3 da Fase 7 ("zebra só em CURVA, nunca em reta") só era
   * verificada na densidade de 16 pontos. O PR existe justamente pra sustentar
   * densidades maiores, e piso de cobertura sozinho não protege contra o modo de
   * falha oposto: cobrir DEMAIS e vazar pra reta. Aqui a regra passa a ser
   * checada no regime novo — grade de proteção pro redesenho, não só piso.
   */
  it('regra 3 continua valendo em densidade alta: nenhum trecho de Monza cobre o meio das retas longas (48 → 80 → 120)', () => {
    const curva = suavizarPolilinhaFechada(tracadoDaPista('pista-monza'));
    const meioLargada = { x: 400, y: 500 };
    const meioRettilineo = { x: 485, y: 105 };
    for (const densidade of [48, 80, 120]) {
      const pontos = reamostrarPorArco(curva, densidade);
      for (const { antes, depois } of trechosDeZebra(pontos)) {
        for (const meio of [meioLargada, meioRettilineo]) {
          const dentro =
            Math.min(antes.x, depois.x) - 1 <= meio.x &&
            meio.x <= Math.max(antes.x, depois.x) + 1 &&
            Math.min(antes.y, depois.y) - 1 <= meio.y &&
            meio.y <= Math.max(antes.y, depois.y) + 1;
          expect(dentro, `densidade ${densidade}, meio (${meio.x},${meio.y})`).toBe(false);
        }
      }
    }
  });

  it('Monza: a cobertura não colapsa ao longo da escala de densidade do redesenho (48 → 80 → 120)', () => {
    const curva = suavizarPolilinhaFechada(tracadoDaPista('pista-monza'));
    for (const densidade of [48, 80, 120]) {
      const pontos = reamostrarPorArco(curva, densidade);
      expect(
        coberturaAprox(pontos, trechosDeZebra(pontos)),
        `Monza a ${densidade} pontos`,
      ).toBeGreaterThanOrEqual(20);
    }
  });

  it('zebra não invade reta: em Monza nenhum trecho cobre o meio das duas retas longas (largada e Rettilineo)', () => {
    const tracado = tracadoDaPista('pista-monza');
    const trechos = trechosDeZebra(tracado);
    // meio da reta de largada (150,500)-(650,500): (400,500); meio do Rettilineo (650,110)-(320,100): (485,105)
    const meioLargada = { x: 400, y: 500 };
    const meioRettilineo = { x: 485, y: 105 };
    for (const { antes, depois } of trechos) {
      for (const meio of [meioLargada, meioRettilineo]) {
        const dentroDoSegmento =
          Math.min(antes.x, depois.x) - 1 <= meio.x &&
          meio.x <= Math.max(antes.x, depois.x) + 1 &&
          Math.min(antes.y, depois.y) - 1 <= meio.y &&
          meio.y <= Math.max(antes.y, depois.y) + 1;
        expect(dentroDoSegmento).toBe(false);
      }
    }
  });
});

describe('pathDaVolta / pathDoTrecho / varDeCor', () => {
  it('pathDaVolta produz "M x y L ... Z"', () => {
    const path = pathDaVolta('pista-monza');
    expect(path.startsWith('M ')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('pathDaVolta é memoizado (mesma referência)', () => {
    expect(pathDaVolta('pista-monza')).toBe(pathDaVolta('pista-monza'));
  });

  it('pathDoTrecho produz polilinha ABERTA (sem Z)', () => {
    const path = pathDoTrecho([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    expect(path.endsWith('Z')).toBe(false);
    expect(path).toBe('M 0 0 L 10 0 L 10 10');
  });

  it('varDeCor converte camelCase pra kebab-case dentro de var(--...)', () => {
    expect(varDeCor('pistaAsfalto')).toBe('var(--pista-asfalto)');
    expect(varDeCor('pistaLimite')).toBe('var(--pista-limite)');
    expect(varDeCor('fundo')).toBe('var(--fundo)');
  });
});

describe('raio do carro-bot compensado pelo crescimento do viewBox (Aviso 6 da revisão do PR 7.3)', () => {
  /**
   * O viewBox foi de 1000 pra `VIEWBOX_LARGURA` (1140) de largura no 7.3 —
   * um fator de 1,14 — o que encolheria o marcador do carro 12,3% NA TELA se
   * o raio não fosse compensado. Regra permanente: a pista é moldura, o
   * carro é conteúdo; o conteúdo não pode degradar pela moldura.
   */
  /**
   * Os DOIS marcadores entram: a primeira versão desta correção compensou só
   * o bot e arredondou o humano pra baixo (11), o que deixava o marcador do
   * JOGADOR encolhendo (6,18px contra 6,40px da `main`) — a degradação exata
   * que a compensação existe pra impedir, passando despercebida porque o
   * teste só olhava o bot.
   */
  const RAIOS_NA_MAIN: [rotulo: string, raioMain: number, raioAgora: number][] = [
    ['bot', 6, RAIO_CARRO_BOT],
    ['humano', 10, RAIO_CARRO_HUMANO],
  ];

  it.each(RAIOS_NA_MAIN)(
    'diâmetro do marcador do %s a 360px é >= o que era na main',
    (rotulo, raioMain, raioAgora) => {
      const diametroNaMainPx = raioMain * 2 * (LARGURA_SVG_MINIMA_PX / 1000);
      const escala = LARGURA_SVG_MINIMA_PX / VIEWBOX_LARGURA;
      const diametroPx = raioAgora * 2 * escala;
      expect(
        diametroPx,
        `${rotulo}: ${diametroPx.toFixed(2)}px agora contra ${diametroNaMainPx.toFixed(2)}px na main`,
      ).toBeGreaterThanOrEqual(diametroNaMainPx);
    },
  );
});

describe('CorDePista exclui raridade em runtime', () => {
  it('nenhum valor de CorDePista usado em CAMADAS_PISTA é uma string começando com "raridade"', () => {
    const cores_: CorDePista[] = CAMADAS_PISTA.map((c) => c.cor);
    for (const cor of cores_) {
      expect((cor as string).startsWith('raridade')).toBe(false);
    }
  });
});
