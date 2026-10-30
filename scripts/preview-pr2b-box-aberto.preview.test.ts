/**
 * Preview ANTES × DEPOIS do PR 2b, por pista: renderiza cada pista com os
 * componentes de PRODUÇÃO (`CamadasDaPista` + `ViadutosDaPista`), não com uma
 * cópia da pilha, e monta `preview/pr2b-<pista>-{escuro,claro}.html` em
 * largura de celular (360px de tela ⇒ `LARGURA_SVG_MINIMA_PX` de SVG) e de
 * desktop, com zoom no box (e, em Suzuka, na ponte).
 *
 * O "ANTES" sai do git, não de cópia feita à mão: `git show <ref>:src/ui/tracados.ts`
 * (ref = `PREVIEW_ANTES_REF`, padrão `994f1de`, o último commit antes do
 * redesenho destas pistas: com `HEAD`, depois do commit do lote, o "antes"
 * seria a própria pista nova) é gravado em `preview/` e entra no
 * lugar de `src/ui/tracados.ts` por `vi.doMock`, num grafo de módulos
 * RECARREGADO DO ZERO (`vi.resetModules`). Sem o reset, os caches por pista
 * (`pathDaVolta`, `tracadoSuavizado`, `desenhoDoBox`...) devolveriam o
 * "depois" nos dois lados e o preview mentiria em silêncio — por isso as
 * asserções de anti-vacuidade no fim.
 *
 * Os tokens `pista*` são invariantes de tema (`coresLight` não tem nenhum): o
 * painel é escuro nos dois; o tema muda a página em volta.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LARGURA_SVG_MINIMA_PX, VIEWBOX_ALTURA, VIEWBOX_LARGURA, VIEWBOX_PISTA, VIEWBOX_X, VIEWBOX_Y } from '../src/ui/pista-camadas';
import { cores, coresLight } from '../src/ui/tokens';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(__dirname, '..');
const DIR = join(RAIZ, 'preview');
const REF_ANTES = process.env.PREVIEW_ANTES_REF ?? '994f1de';
const PISTAS = ['pista-interlagos', 'pista-monaco', 'pista-suzuka'] as const;
/**
 * Pistas que este lote NÃO mexe: antes e depois têm que sair idênticos. Spa é
 * a prova de que o `tracados.ts` do git foi lido (o traçado dela mora lá);
 * Monza mora em `fluxo-corrida.ts`, fora do mock, e só exercita o box.
 */
const CONTROLES = ['pista-spa', 'pista-monza'] as const;

function kebab(nome: string): string {
  return nome.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

interface Render {
  /** Corpo SVG (sem o `<svg>`) da pista inteira, com `var(--x)` já resolvido pro hex. */
  readonly corpo: string;
  /** Zooms (viewBox) no box e na ponte, quando a pista tem. */
  readonly zooms: readonly { readonly titulo: string; readonly viewBox: string }[];
  /** Linha da cerca do box, ou aviso de que não há box. */
  readonly cerca: string;
}

function viewBoxEm(pontos: readonly { x: number; y: number }[], margem: number): string {
  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  const x0 = Math.min(...xs) - margem;
  const y0 = Math.min(...ys) - margem;
  return `${x0.toFixed(0)} ${y0.toFixed(0)} ${(Math.max(...xs) + margem - x0).toFixed(0)} ${(Math.max(...ys) + margem - y0).toFixed(0)}`;
}

/** Renderiza `pistaIds` com o grafo de módulos ATUAL (o que estiver mockado, se houver). */
async function renderizar(pistaIds: readonly string[]): Promise<Record<string, Render>> {
  const { CamadasDaPista, ViadutosDaPista } = await import('../src/ui/TelaCorrida');
  const { BOXES_POR_PISTA, VIADUTOS_POR_PISTA, tracadoDaPista } = await import('../src/ui/tracados');
  const { caminhoDoBox } = await import('../src/ui/box');
  const { tracadoSuavizado } = await import('../src/ui/suavizacao');
  const { medirFolgaDoBox } = await import('./folga-pistas');
  const saida: Record<string, Render> = {};
  for (const pistaId of pistaIds) {
    const corpo = renderToStaticMarkup(
      createElement(Fragment, null, createElement(CamadasDaPista, { pistaId }), createElement(ViadutosDaPista, { pistaId })),
    ).replace(/var\(--([a-z0-9-]+)\)/g, (_, nome: string) => {
      const achado = Object.entries(cores).find(([k]) => kebab(k) === nome);
      return achado ? achado[1] : '#f0f';
    });
    const zooms: { titulo: string; viewBox: string }[] = [];
    let cerca = 'sem box declarado';
    const box = BOXES_POR_PISTA[pistaId];
    if (box !== undefined) {
      const { amostras, janela, largura } = caminhoDoBox(tracadoSuavizado(pistaId), box);
      const m = medirFolgaDoBox(tracadoDaPista(pistaId), amostras, janela, largura, box.rampa);
      cerca = `cerca do box: largura medida ${largura} u, folga mínima ${m.folga.toFixed(1)} u = ${m.folgaPx360.toFixed(1)} px a 360px (${m.trecho})`;
      zooms.push({ titulo: 'box', viewBox: viewBoxEm(amostras.map(({ p }) => p), 50) });
    }
    for (const v of VIADUTOS_POR_PISTA[pistaId] ?? []) {
      zooms.push({ titulo: 'ponte', viewBox: viewBoxEm([v.centro], 110) });
    }
    saida[pistaId] = { corpo, zooms, cerca };
  }
  return saida;
}

/** `tracados.ts` de `REF_ANTES`, gravado em `preview/` com os imports relativos apontando pra `src/ui/`. */
function tracadosDoGit(): string {
  const fonte = new TextDecoder().decode(
    execFileSync('git', ['-C', RAIZ, 'show', `${REF_ANTES}:src/ui/tracados.ts`], { stdio: 'pipe' }),
  );
  const ui = join(RAIZ, 'src', 'ui').replace(/\\/g, '/');
  const reescrita = fonte.replace(/from '\.\/([^']+)'/g, (_, m: string) => `from '${ui}/${m}'`);
  const arquivo = join(DIR, `_antes-tracados.ts`);
  writeFileSync(arquivo, reescrita, 'utf8');
  return arquivo;
}

let contadorDeIds = 0;
/** SVG autônomo. Cada cópia ganha ids próprios: a máscara da ponte repetida no mesmo HTML apontaria pra primeira. */
function svg(corpo: string, viewBox: string): string {
  const prefixo = `c${contadorDeIds++}-`;
  const estilo =
    '.tracado-svg__camada{fill:none;stroke-linejoin:round;stroke-linecap:round}' +
    '.tracado-svg__camada--curva,.tracado-svg__camada--box{stroke-linecap:butt}';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><style>${estilo}</style>` +
    `<rect x="${VIEWBOX_X}" y="${VIEWBOX_Y}" width="${VIEWBOX_LARGURA}" height="${VIEWBOX_ALTURA}" fill="${cores.pistaChao}"/>` +
    `${corpo.replace(/id="/g, `id="${prefixo}`).replace(/url\(#/g, `url(#${prefixo}`)}</svg>`
  );
}

function html(tema: 'escuro' | 'claro', pistaId: string, antes: Render, depois: Render): string {
  const c = (nome: string) =>
    (tema === 'claro' ? (coresLight as Record<string, string>)[nome] : undefined) ?? (cores as Record<string, string>)[nome];
  // Os zooms são os do DEPOIS (a janela do box novo), aplicados aos dois lados.
  const coluna = (titulo: string, r: Render) => `<figure><figcaption>${titulo}</figcaption>
<p class="legenda">${r.cerca}</p>
<p class="legenda">celular (${LARGURA_SVG_MINIMA_PX}px úteis de SVG a 360px de tela, o piso da regra dos 360px):</p><div class="cel">${svg(r.corpo, VIEWBOX_PISTA)}</div>
<p class="legenda">desktop (700px, o max-width de produção):</p><div class="desk">${svg(r.corpo, VIEWBOX_PISTA)}</div>
${depois.zooms.map((z) => `<p class="legenda">detalhe: ${z.titulo} (zoom, desktop)</p><div class="desk">${svg(r.corpo, z.viewBox)}</div><p class="legenda">detalhe: ${z.titulo} (zoom, celular)</p><div class="cel">${svg(r.corpo, z.viewBox)}</div>`).join('\n')}</figure>`;
  return `<!doctype html>
<html lang="pt-BR" data-tema="${tema === 'claro' ? 'light' : 'dark'}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>PR 2b ${pistaId} — ${tema}</title>
<style>
:root { color-scheme: ${tema === 'claro' ? 'light' : 'dark'}; }
body { margin: 0; padding: 16px; background: ${c('fundo')}; color: ${c('texto')}; font: 14px/1.4 system-ui, sans-serif; }
h1 { font-size: 20px; } .legenda { color: ${c('textoSuave')}; margin: 10px 0 4px; }
.par { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 16px; }
figure { margin: 0; background: ${c('fundoElevado')}; border: 1px solid ${c('borda')}; border-radius: 8px; padding: 8px; }
figcaption { font-weight: 600; }
.cel svg { width: ${LARGURA_SVG_MINIMA_PX}px; display: block; border: 3px solid ${c('borda')}; border-radius: 8px; }
.desk svg { width: 100%; max-width: 700px; display: block; border: 3px solid ${c('borda')}; border-radius: 8px; }
</style></head>
<body>
<h1>${pistaId} — antes × depois · tema ${tema}</h1>
<p class="legenda">Os tokens de pista são os mesmos nos dois temas (o painel é escuro sempre); o tema muda a página.</p>
<div class="par">${coluna(`ANTES (${REF_ANTES})`, antes)}${coluna('DEPOIS (árvore de trabalho)', depois)}</div>
</body></html>`;
}

describe('preview antes × depois (PR 2b)', () => {
  it('escreve o HTML comparativo de cada pista do lote, com o "antes" do git', async () => {
    mkdirSync(DIR, { recursive: true });
    const ids = [...PISTAS, ...CONTROLES];
    const depois = await renderizar(ids);

    const arquivoAntes = tracadosDoGit();
    vi.resetModules();
    vi.doMock('../src/ui/tracados', () => import(/* @vite-ignore */ arquivoAntes));
    const antes = await renderizar(ids);
    vi.doUnmock('../src/ui/tracados');
    vi.resetModules();

    // Os HTMLs saem ANTES das asserções: se uma falhar, o artefato pra diagnosticar já existe.
    for (const pistaId of PISTAS) {
      for (const tema of ['escuro', 'claro'] as const) {
        const arquivo = join(DIR, `pr2b-${pistaId.replace('pista-', '')}-${tema}.html`);
        writeFileSync(arquivo, html(tema, pistaId, antes[pistaId], depois[pistaId]), 'utf8');
        console.log(`preview: ${arquivo}`);
      }
      console.log(`${pistaId}: ${depois[pistaId].cerca}`);
    }
    // Anti-vacuidade: as pistas fora do lote saem iguais; as do lote, diferentes.
    for (const pistaId of CONTROLES) expect(antes[pistaId].corpo, pistaId).toBe(depois[pistaId].corpo);
    for (const pistaId of PISTAS) {
      expect(antes[pistaId].corpo, `${pistaId}: antes == depois (o mock não pegou?)`).not.toBe(depois[pistaId].corpo);
    }
  });
});
