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
import { tracadoDaPista } from './tracados';
import {
  ALCANCE_ZEBRA,
  ANGULO_MINIMO_ZEBRA,
  CAMADAS_PISTA,
  COBERTURA_MAXIMA_ZEBRA,
  CORRENTE_TONAL_DA_PILHA,
  HIERARQUIA_SUPERFICIES,
  LARGURA_ASFALTO,
  LARGURA_SVG_MINIMA_PX,
  MARGEM_VIEWBOX,
  RAIO_CARRO_BOT,
  RAIO_CARRO_HUMANO,
  SEPARACAO_MINIMA_LUMINANCIA,
  SUPERFICIE_BASE_REPLAY,
  SUPERFICIES_DO_REPLAY,
  VIEWBOX_ALTURA,
  VIEWBOX_LARGURA,
  VIEWBOX_PISTA,
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

  it('cada par ADJACENTE da pilha real bate a separação mínima (chão→terreno→escape→muro→asfalto)', () => {
    for (let i = 1; i < CORRENTE_TONAL_DA_PILHA.length; i++) {
      const anterior = CORRENTE_TONAL_DA_PILHA[i - 1];
      const atual = CORRENTE_TONAL_DA_PILHA[i];
      const razao = razaoSeparacao(cores[atual as NomeCor], cores[anterior as NomeCor]);
      expect(
        razao,
        `${anterior}->${atual}: razão ${razao.toFixed(3)} abaixo do mínimo ${SEPARACAO_MINIMA_LUMINANCIA}`,
      ).toBeGreaterThanOrEqual(SEPARACAO_MINIMA_LUMINANCIA);
    }
  });

  it('mutação do achado B: terreno escurecido até quase empatar com o chão reprova', () => {
    // `#191632` (L 0,0101) é um `pistaTerreno` levemente escurecido — quase
    // indistinguível a olho do real `#1B1738` (L 0,0113) — e dá razão 1,213
    // contra o chão `fundo`, abaixo do mínimo 1,25. É a mutação que apaga o
    // RELEVO que o dev escolheu no 7.3.1 sem mudar mais nada. A guarda de
    // PALETA não pega: a ordem da hierarquia continua intacta.
    const TERRENO_MUTANTE = '#191632';
    const razao = razaoSeparacao(TERRENO_MUTANTE, cores[SUPERFICIE_BASE_REPLAY as NomeCor]);
    expect(razao).toBeLessThan(SEPARACAO_MINIMA_LUMINANCIA);
    expect(razao).toBeCloseTo(1.213, 2);
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
    const razaoRelevo = razaoSeparacao(cores.pistaTerreno, cores[SUPERFICIE_BASE_REPLAY as NomeCor]);
    expect(razaoRelevo).toBeGreaterThan(1); // terreno MAIS CLARO que o chão = degrau que sobe
    expect(luminanciaRelativa(cores.pistaTerreno)).toBeGreaterThan(
      luminanciaRelativa(cores[SUPERFICIE_BASE_REPLAY as NomeCor]),
    );
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

  it('mínimo real é a camada "limite", ~1,12px', () => {
    const indiceLimite = CAMADAS_PISTA.findIndex((c) => c.id === 'limite');
    const proxima = proximaLarguraMenor(indiceLimite);
    const faixaPx = ((CAMADAS_PISTA[indiceLimite].largura - proxima) / 2) * escala;
    expect(faixaPx).toBeCloseTo(1.12, 1);
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

describe('viewBox contém todas as 10 pistas (3.7)', () => {
  const metadeCamadaMaisLarga = Math.max(...CAMADAS_PISTA.map((c) => c.largura)) / 2;
  const minXViewbox = -MARGEM_VIEWBOX;
  const minYViewbox = -MARGEM_VIEWBOX;
  const maxXViewbox = -MARGEM_VIEWBOX + VIEWBOX_LARGURA;
  const maxYViewbox = -MARGEM_VIEWBOX + VIEWBOX_ALTURA;

  it('VIEWBOX_PISTA está no formato esperado', () => {
    expect(VIEWBOX_PISTA).toBe('-70 -70 1140 740');
  });

  it.each(dataset.pistas.map((p) => [p.id] as const))('pista %s cabe no viewBox com folga (camada+traçado)', (pistaId) => {
    const tracado = tracadoDaPista(pistaId);
    const xs = tracado.map((p) => p.x);
    const ys = tracado.map((p) => p.y);
    const minX = Math.min(...xs) - metadeCamadaMaisLarga;
    const maxX = Math.max(...xs) + metadeCamadaMaisLarga;
    const minY = Math.min(...ys) - metadeCamadaMaisLarga;
    const maxY = Math.max(...ys) + metadeCamadaMaisLarga;

    expect(minX).toBeGreaterThanOrEqual(minXViewbox);
    expect(maxX).toBeLessThanOrEqual(maxXViewbox);
    expect(minY).toBeGreaterThanOrEqual(minYViewbox);
    expect(maxY).toBeLessThanOrEqual(maxYViewbox);
  });

  it('pior folga real é 60 (Suzuka)', () => {
    let piorFolga = Infinity;
    for (const pista of dataset.pistas) {
      const tracado = tracadoDaPista(pista.id);
      const xs = tracado.map((p) => p.x);
      const ys = tracado.map((p) => p.y);
      const minX = Math.min(...xs) - metadeCamadaMaisLarga;
      const maxX = Math.max(...xs) + metadeCamadaMaisLarga;
      const minY = Math.min(...ys) - metadeCamadaMaisLarga;
      const maxY = Math.max(...ys) + metadeCamadaMaisLarga;
      const folga = Math.min(minX - minXViewbox, maxXViewbox - maxX, minY - minYViewbox, maxYViewbox - maxY);
      piorFolga = Math.min(piorFolga, folga);
    }
    expect(piorFolga).toBeCloseTo(60, 5);
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
  function minNaoAdj(tracado: Ponto[]): number {
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
  const GOLDEN_COBERTURA: Record<string, { candidatos: number; escolhidos: number; coberturaPct: number }> = {
    'pista-monaco': { candidatos: 15, escolhidos: 8, coberturaPct: 39.4 },
    'pista-spa': { candidatos: 9, escolhidos: 9, coberturaPct: 36.8 },
    'pista-monza': { candidatos: 11, escolhidos: 11, coberturaPct: 38.4 },
    'pista-silverstone': { candidatos: 11, escolhidos: 9, coberturaPct: 37.6 },
    'pista-suzuka': { candidatos: 8, escolhidos: 8, coberturaPct: 26.0 },
    'pista-interlagos': { candidatos: 12, escolhidos: 10, coberturaPct: 39.1 },
    'pista-nurburgring': { candidatos: 22, escolhidos: 10, coberturaPct: 38.4 },
    'pista-imola': { candidatos: 12, escolhidos: 9, coberturaPct: 38.1 },
    'pista-red-bull-ring': { candidatos: 9, escolhidos: 7, coberturaPct: 38.1 },
    'pista-montreal': { candidatos: 7, escolhidos: 7, coberturaPct: 27.6 },
  };

  function candidatos28(tracado: Ponto[]): number {
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
  function perimetro(tracado: Ponto[]): number {
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
  function coberturaAprox(tracado: Ponto[], trechos: readonly TrechoZebra[]): number {
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

  it.each(dataset.pistas.map((p) => [p.id] as const))('todos os vértices escolhidos em %s têm ângulo >= 28°', (pistaId) => {
    const tracado = tracadoDaPista(pistaId);
    const trechos = trechosDeZebra(tracado);
    const n = tracado.length;
    // `indice` (Cosmetic 12) aponta direto pro vértice ORIGINAL no traçado —
    // não precisa mais de `findIndex` por coordenada (fragilidade que
    // quebraria se dois vértices caíssem na mesma coordenada, num traçado
    // curvo futuro).
    for (const { indice, vertice } of trechos) {
      expect(tracado[indice]).toEqual(vertice);
      const ang = anguloDeVirada(tracado[(indice - 1 + n) % n], tracado[indice], tracado[(indice + 1) % n]);
      expect(ang).toBeGreaterThanOrEqual(ANGULO_MINIMO_ZEBRA);
    }
  });

  it.each(Object.entries(GOLDEN_COBERTURA))('golden de %s: candidatos/escolhidos/cobertura batem com a tabela do plano', (pistaId, esperado) => {
    const tracado = tracadoDaPista(pistaId);
    const trechos = trechosDeZebra(tracado);
    expect(candidatos28(tracado), `${pistaId} candidatos`).toBe(esperado.candidatos);
    expect(trechos.length, `${pistaId} escolhidos`).toBe(esperado.escolhidos);
    expect(coberturaAprox(tracado, trechos), `${pistaId} cobertura`).toBeCloseTo(esperado.coberturaPct, 0);
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
