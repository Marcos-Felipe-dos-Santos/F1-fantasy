/**
 * Gerador da GRADE DAS 10 SILHUETAS pro README (`docs/img/silhuetas.svg`).
 *
 * Diferença importante em relação aos outros `*.preview.test.ts`: os demais
 * escrevem em `preview/`, que é gitignored — artefato descartável pro dev
 * olhar antes de aprovar. Este escreve em `docs/img/`, que é VERSIONADO,
 * porque o resultado é ilustração do README e precisa existir no repositório
 * pra o GitHub renderizar. Por isso o arquivo gerado é commitado; regerar e
 * commitar de novo é o fluxo esperado quando um traçado mudar.
 *
 * Reusa `pathDaVolta` e `VIEWBOX_PISTA` — a MESMA geometria que a tela de
 * corrida e a `SilhuetaPista` do calendário desenham. Um desenho paralelo aqui
 * jogaria fora exatamente o que o teste cego 10/10 do PR 7.7 mediu.
 *
 * Cores: atributos de apresentação inline, sem `<style>` nem CSS externo — o
 * GitHub sanitiza SVG servido do repositório e nada garante que uma folha de
 * estilo interna sobreviva. O vermelho do traçado e o cinza do rótulo foram
 * escolhidos pra ler tanto no tema claro quanto no escuro do GitHub, já que um
 * SVG de README não recebe `prefers-color-scheme` do host.
 *
 * Roda por `npm run preview` (config `vitest.preview.config.ts`), fora do
 * `npm test`.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import pistasReal from '../src/data/pistas.json';
import { VIEWBOX_PISTA, pathDaVolta } from '../src/ui/pista-camadas';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 5 colunas × 2 linhas — 10 pistas. */
const COLUNAS = 5;
const CELULA_LARGURA = 300;
const CELULA_TRACADO_ALTURA = 198;
const CELULA_ROTULO_ALTURA = 34;
const CELULA_ALTURA = CELULA_TRACADO_ALTURA + CELULA_ROTULO_ALTURA;
const MARGEM = 16;

/** Vermelho de corrida — contrasta com o branco e com o cinza-escuro do GitHub. */
const COR_TRACADO = '#e10600';
/** Cinza médio: legível nos dois temas, onde preto sumiria no escuro e branco no claro. */
const COR_ROTULO = '#8b949e';

/** Escapa o que tem significado em XML. Nomes de pista têm acento, mas nenhum `&`/`<` hoje. */
function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface PistaDoGrid {
  id: string;
  nome: string;
}

/** Uma célula: o traçado num `<svg>` aninhado (que faz o escalonamento) + o rótulo. */
function celulaSvg(pista: PistaDoGrid, indice: number): string {
  const coluna = indice % COLUNAS;
  const linha = Math.floor(indice / COLUNAS);
  const x = MARGEM + coluna * CELULA_LARGURA;
  const y = MARGEM + linha * CELULA_ALTURA;
  const nome = escaparXml(pista.nome);

  return `  <g>
    <svg x="${x}" y="${y}" width="${CELULA_LARGURA}" height="${CELULA_TRACADO_ALTURA}"
         viewBox="${VIEWBOX_PISTA}" preserveAspectRatio="xMidYMid meet">
      <path d="${pathDaVolta(pista.id)}" fill="none" stroke="${COR_TRACADO}"
            stroke-width="16" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <text x="${x + CELULA_LARGURA / 2}" y="${y + CELULA_TRACADO_ALTURA + 20}"
          text-anchor="middle" fill="${COR_ROTULO}"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
          font-size="17">${nome}</text>
  </g>`;
}

function gradeSvg(pistas: readonly PistaDoGrid[]): string {
  const linhas = Math.ceil(pistas.length / COLUNAS);
  const largura = COLUNAS * CELULA_LARGURA + MARGEM * 2;
  const altura = linhas * CELULA_ALTURA + MARGEM * 2;
  const celulas = pistas.map((pista, i) => celulaSvg(pista, i)).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}"
     width="${largura}" height="${altura}" role="img"
     aria-label="Traçados das ${pistas.length} pistas do F1 Fantasy">
  <title>As ${pistas.length} pistas do F1 Fantasy</title>
${celulas}
</svg>
`;
}

describe('grade de silhuetas do README', () => {
  it('escreve docs/img/silhuetas.svg com as 10 pistas', () => {
    const pistas = pistasReal as PistaDoGrid[];
    expect(pistas.length).toBe(10);

    const svg = gradeSvg(pistas);

    // Toda pista do dataset tem que ter virado traçado E rótulo — uma silhueta
    // faltando passaria despercebida num SVG grande.
    for (const pista of pistas) {
      expect(svg).toContain(escaparXml(pista.nome));
    }
    expect(svg.match(/<path /g)?.length).toBe(10);

    const destino = join(__dirname, '..', 'docs', 'img', 'silhuetas.svg');
    mkdirSync(dirname(destino), { recursive: true });
    writeFileSync(destino, svg, 'utf8');
    console.log(`grade de silhuetas escrita em ${destino}`);
  });
});
