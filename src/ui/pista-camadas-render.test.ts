/**
 * Elo testado entre `CAMADAS_PISTA` (dado puro) e o que a TELA de fato
 * desenha (PR 7.3, revisão — Aviso 3). Sem este teste, apagar uma camada do
 * JSX de `CamadasDaPista` ou trocar a ordem de pintura deixa a suíte inteira
 * verde: "aplicar na tela" era exatamente a pendência que o PR 7.2 deixou
 * aberta.
 *
 * `.ts` (não `.tsx`) de propósito, mesmo padrão de `card-peca-cego.test.ts`:
 * `renderToStaticMarkup` (Node puro, sem jsdom) com `createElement` em vez de
 * JSX, pra não precisar alterar o include glob do vite/vitest config.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CAMADAS_PISTA, pathDaVolta, pathDoTrecho, varDeCor, zebrasDaPista } from './pista-camadas';
import { CamadasDaPista } from './TelaCorrida';

const PISTA_ID = 'pista-monza';

/**
 * Um `<path>` extraído do markup. Inclui TODAS as propriedades visuais que o
 * dado carrega, não só `stroke`/`stroke-width` (achado D da re-revisão): com
 * a versão anterior, apagar `strokeDashoffset` do JSX fazia as duas zebras
 * coincidirem — a alternância amarelo/rosa sumia, sobrava só a faixa B — e a
 * suíte inteira seguia verde. Mesma coisa pro `className` (é ele que aplica
 * `stroke-linecap: butt` nas zebras) e pro `d`.
 */
interface PathRenderizado {
  d: string;
  stroke: string;
  strokeWidth: string;
  strokeDasharray: string | undefined;
  strokeDashoffset: string | undefined;
  className: string;
}

/** Extrai, NA ORDEM em que aparecem no markup, os `<path>` e seus atributos visuais. */
function extrairPaths(html: string): PathRenderizado[] {
  const paths: PathRenderizado[] = [];
  const regexPath = /<path\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = regexPath.exec(html)) !== null) {
    const atributos = m[1];
    const obrigatorio = (nome: string): string => {
      const valor = atributos.match(new RegExp(`\\s${nome}="([^"]*)"`))?.[1];
      expect(valor, `<path> sem atributo ${nome}: ${atributos}`).toBeDefined();
      return valor!;
    };
    paths.push({
      d: obrigatorio('d'),
      stroke: obrigatorio('stroke'),
      strokeWidth: obrigatorio('stroke-width'),
      strokeDasharray: atributos.match(/\sstroke-dasharray="([^"]*)"/)?.[1],
      strokeDashoffset: atributos.match(/\sstroke-dashoffset="([^"]*)"/)?.[1],
      className: obrigatorio('class'),
    });
  }
  return paths;
}

describe('CamadasDaPista renderiza CAMADAS_PISTA fielmente (Aviso 3 da revisão do PR 7.3)', () => {
  const html = renderToStaticMarkup(createElement('svg', null, createElement(CamadasDaPista, { pistaId: PISTA_ID })));
  const paths = extrairPaths(html);

  const camadasDeVolta = CAMADAS_PISTA.filter((c) => c.alvo === 'volta').length;
  const camadasDeCurva = CAMADAS_PISTA.filter((c) => c.alvo === 'curvas').length;
  const trechos = zebrasDaPista(PISTA_ID);

  it(`sai exatamente ${camadasDeVolta} paths de volta + ${trechos.length} trechos × ${camadasDeCurva} camadas de curva`, () => {
    const esperado = camadasDeVolta + trechos.length * camadasDeCurva;
    expect(paths.length).toBe(esperado);
  });

  it('todas as propriedades visuais aparecem NA ORDEM DE PINTURA de CAMADAS_PISTA (mata mutação de ordem, de camada apagada, de tracejado e de className)', () => {
    const esperado: PathRenderizado[] = [];
    for (const camada of CAMADAS_PISTA) {
      const comum = {
        stroke: varDeCor(camada.cor),
        strokeWidth: String(camada.largura),
        strokeDasharray: camada.tracejado,
        strokeDashoffset:
          camada.deslocamentoTracejado === undefined ? undefined : String(camada.deslocamentoTracejado),
      };
      if (camada.alvo === 'volta') {
        esperado.push({ ...comum, d: pathDaVolta(PISTA_ID), className: 'tracado-svg__camada' });
      } else {
        for (const trecho of trechos) {
          esperado.push({
            ...comum,
            d: pathDoTrecho([trecho.antes, trecho.vertice, trecho.depois]),
            className: 'tracado-svg__camada tracado-svg__camada--curva',
          });
        }
      }
    }
    expect(paths).toEqual(esperado);
  });

  /**
   * Guarda direcionada ao modo de falha do achado D: as duas camadas de zebra
   * só alternam porque a faixa B entra com meio período de deslocamento. Se
   * os dois `stroke-dashoffset` empatarem, os dois tracejados coincidem e o
   * desenho perde a alternância sem que nada mais mude.
   */
  it('as duas camadas de zebra têm stroke-dashoffset DIFERENTE (é o que produz a alternância amarelo/rosa)', () => {
    const zebras = paths.filter((p) => p.className.includes('--curva'));
    const deslocamentos = new Set(zebras.map((p) => p.strokeDashoffset ?? 'ausente'));
    expect(zebras.length).toBeGreaterThan(0);
    expect(deslocamentos.size).toBe(2);
  });
});
