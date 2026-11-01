/**
 * Preview ANTES × DEPOIS do PR 2b, as 10 pistas numa página só: instrumento de
 * aprovação do PR. Renderiza com os componentes de PRODUÇÃO (`CamadasDaPista` +
 * `ViadutosDaPista`), não com uma cópia da pilha, e monta
 * `preview/pr2b-10-pistas-{escuro,claro}.html`: celular (`LARGURA_SVG_MINIMA_PX`
 * de SVG) e desktop, zoom no box (em Suzuka, na ponte; em Interlagos, na zebra)
 * e, abaixo de cada pista, o desvio do real e o degrau da escada do box.
 *
 * O "ANTES" é o traçado NO AR e sai do git, não de cópia feita à mão:
 * `git show <ref>:src/ui/{tracados,fluxo-corrida}.ts` (ref = `PREVIEW_ANTES_REF`,
 * padrão `origin/main`; o `fluxo-corrida.ts` é por causa da Monza) é gravado em
 * `preview/` e entra no lugar dos dois por `vi.doMock`, num grafo de módulos
 * RECARREGADO DO ZERO (`vi.resetModules`). Sem o reset, os caches por pista
 * (`pathDaVolta`, `tracadoSuavizado`, `desenhoDoBox`...) devolveriam o
 * "depois" nos dois lados e o preview mentiria em silêncio — por isso as
 * asserções de anti-vacuidade no fim. O "DEPOIS" é o `HEAD`, e o teste recusa
 * `src/` sujo, porque aí o rótulo seria falso.
 *
 * O desvio do real roda `referencias/pistas-2b/gerar_referencias.py` em cópias
 * temporárias (uma por ref), nunca na pasta original: ele sobrescreve
 * `desvios.txt` e as imagens. `referencias/` é gitignored: sem ela, não há
 * preview.
 *
 * Os tokens `pista*` são invariantes de tema (`coresLight` não tem nenhum): o
 * painel é escuro nos dois; o tema muda a página em volta.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
const REF_ANTES = process.env.PREVIEW_ANTES_REF ?? 'origin/main';
const PISTAS = ['pista-interlagos', 'pista-monaco', 'pista-suzuka', 'pista-silverstone', 'pista-imola', 'pista-spa', 'pista-nurburgring', 'pista-montreal', 'pista-red-bull-ring', 'pista-monza'] as const;
/**
 * Degrau da escada do box por pista (decisão do Marcos, `ESTADO.md` §"Onde
 * parei"). O que está no `BoxDeclarado` (garagens, afastamento, largura) é
 * conferido contra ele no fim do teste; o degrau 5 e o lado não têm campo.
 */
const DEGRAU_DO_BOX: Readonly<Record<(typeof PISTAS)[number], string>> = {
  'pista-interlagos': '1 (modelo livre), lado real',
  'pista-monaco': '1 e 5 (perna da Piscina afastada 8-10 u), lado real',
  'pista-suzuka': '2 (sem garagens), 3 (afastamento 35), 4 (box 12 u) e 5 (crista dos Esses baixada 6 u), lado real',
  'pista-silverstone': '1, lado real',
  'pista-imola': '1, lado real (por fora)',
  'pista-spa': '2 (sem garagens), 3 (afastamento 36), 4 (box 12 u) e 5 (reta da largada afastada 10 u da Eau Rouge), lado real',
  'pista-nurburgring': '2 (sem garagens), 3 (afastamento 36) e 4 (box 12 u), lado real',
  'pista-montreal': '1, lado real (por fora)',
  'pista-red-bull-ring': '1, lado real',
  'pista-monza': 'fora da escada: modelo de rampas, aprovado no lote 0',
};
/**
 * Zoom de ZEBRA numa pista densa, antes × depois (pedido do Marcos pro
 * veredito da "zebra mais contínua"): o miolo de Interlagos, onde o lote 1
 * deixou 19 vértices seguidos com zebra (teto de 40% atingido). Janela pelos
 * vértices de controle do DEPOIS, aplicada aos dois lados.
 */
const ZOOM_ZEBRA: Readonly<Record<string, { titulo: string; de: number; ate: number }>> = {
  'pista-interlagos': { titulo: 'zebra no miolo (pista densa)', de: 19, ate: 37 },
};

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
  /** O que a pista declara, pra conferir `DEGRAU_DO_BOX`. */
  readonly box: { readonly garagens?: boolean; readonly larguraBox?: number; readonly afastamento: number } | undefined;
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
    let cerca = 'sem box no traçado';
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
    const zebra = ZOOM_ZEBRA[pistaId];
    if (zebra !== undefined) {
      zooms.push({ titulo: zebra.titulo, viewBox: viewBoxEm(tracadoDaPista(pistaId).slice(zebra.de, zebra.ate + 1), 40) });
    }
    saida[pistaId] = { corpo, zooms, cerca, box };
  }
  return saida;
}

function fonteNoGit(ref: string, arquivo: string): Uint8Array {
  return execFileSync('git', ['-C', RAIZ, 'show', `${ref}:${arquivo}`], { stdio: 'pipe' });
}

/** `src/ui/<nome>.ts` de `REF_ANTES`, gravado em `preview/` com os imports relativos resolvidos a partir de `src/ui/`. */
function moduloDoGit(nome: string): string {
  const reescrita = new TextDecoder()
    .decode(fonteNoGit(REF_ANTES, `src/ui/${nome}.ts`))
    .replace(/from '(\.\.?\/[^']+)'/g, (_, m: string) => `from '${join(RAIZ, 'src', 'ui', m).replace(/\\/g, '/')}'`);
  const arquivo = join(DIR, `_antes-${nome}.ts`);
  writeFileSync(arquivo, reescrita, 'utf8');
  return arquivo;
}

/** Desvio do real por pista ("3.4%"), rodando `gerar_referencias.py` numa cópia com os traçados de `ref`. */
function desviosDoReal(ref: string): Record<string, string> {
  const copia = mkdtempSync(join(tmpdir(), 'pr2b-desvios-'));
  try {
    const origem = join(RAIZ, 'referencias', 'pistas-2b');
    const destino = join(copia, 'referencias', 'pistas-2b');
    mkdirSync(join(copia, 'src', 'ui'), { recursive: true });
    for (const pasta of ['geojson', 'osm']) cpSync(join(origem, pasta), join(destino, pasta), { recursive: true });
    cpSync(join(origem, 'gerar_referencias.py'), join(destino, 'gerar_referencias.py'));
    for (const nome of ['tracados.ts', 'fluxo-corrida.ts']) {
      writeFileSync(join(copia, 'src', 'ui', nome), fonteNoGit(ref, `src/ui/${nome}`));
    }
    execFileSync('python', ['-I', join(destino, 'gerar_referencias.py')], { stdio: 'pipe' });
    const texto = readFileSync(join(destino, 'desvios.txt'), 'utf8');
    return Object.fromEntries(
      [...texto.matchAll(/^(\S+)\s+distancia media ao real\s+([\d.]+)%/gm)].map((m) => [`pista-${m[1]}`, `${m[2]}%`]),
    );
  } finally {
    rmSync(copia, { recursive: true, force: true });
  }
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

interface Dados {
  readonly antes: Record<string, Render>;
  readonly depois: Record<string, Render>;
  readonly desvioAntes: Record<string, string>;
  readonly desvioDepois: Record<string, string>;
  readonly refDepois: string;
}

function secao(pistaId: (typeof PISTAS)[number], d: Dados): string {
  const depois = d.depois[pistaId];
  // Os zooms são os do DEPOIS (a janela do box novo), aplicados aos dois lados.
  const coluna = (titulo: string, r: Render) => `<figure><figcaption>${titulo}</figcaption>
<p class="legenda">${r.cerca}</p>
<p class="legenda">celular (${LARGURA_SVG_MINIMA_PX}px de SVG, o piso da regra dos 360px):</p><div class="cel">${svg(r.corpo, VIEWBOX_PISTA)}</div>
<p class="legenda">desktop (700px, o max-width de produção):</p><div class="desk">${svg(r.corpo, VIEWBOX_PISTA)}</div>
${depois.zooms.map((z) => `<p class="legenda">detalhe: ${z.titulo} (zoom, desktop)</p><div class="desk">${svg(r.corpo, z.viewBox)}</div><p class="legenda">detalhe: ${z.titulo} (zoom, celular)</p><div class="cel">${svg(r.corpo, z.viewBox)}</div>`).join('\n')}</figure>`;
  return `<section><h2>${pistaId.replace('pista-', '')}</h2>
<div class="par">${coluna(`ANTES (no ar, ${REF_ANTES})`, d.antes[pistaId])}${coluna(`DEPOIS (HEAD, ${d.refDepois})`, depois)}</div>
<p class="dados"><b>Desvio do real:</b> ${d.desvioAntes[pistaId]} → ${d.desvioDepois[pistaId]} do tamanho da pista · <b>Degrau do box:</b> ${DEGRAU_DO_BOX[pistaId]}</p></section>`;
}

function pagina(tema: 'escuro' | 'claro', d: Dados): string {
  const c = (nome: string) =>
    (tema === 'claro' ? (coresLight as Record<string, string>)[nome] : undefined) ?? (cores as Record<string, string>)[nome];
  return `<!doctype html>
<html lang="pt-BR" data-tema="${tema === 'claro' ? 'light' : 'dark'}">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>PR 2b 10 pistas — ${tema}</title>
<style>
:root { color-scheme: ${tema === 'claro' ? 'light' : 'dark'}; }
body { margin: 0; padding: 16px; background: ${c('fundo')}; color: ${c('texto')}; font: 14px/1.4 system-ui, sans-serif; }
h1 { font-size: 20px; } h2 { font-size: 18px; margin: 28px 0 8px; } .legenda { color: ${c('textoSuave')}; margin: 10px 0 4px; }
.dados { margin: 10px 0 0; padding: 8px; border: 1px solid ${c('borda')}; border-radius: 8px; background: ${c('fundoElevado')}; }
.par { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 16px; }
figure { margin: 0; background: ${c('fundoElevado')}; border: 1px solid ${c('borda')}; border-radius: 8px; padding: 8px; }
figcaption { font-weight: 600; }
.cel svg { width: ${LARGURA_SVG_MINIMA_PX}px; display: block; border: 3px solid ${c('borda')}; border-radius: 8px; }
.desk svg { width: 100%; max-width: 700px; display: block; border: 3px solid ${c('borda')}; border-radius: 8px; }
</style></head>
<body>
<h1>PR 2b — as 10 pistas, antes × depois · tema ${tema}</h1>
<p class="legenda">Os tokens de pista são os mesmos nos dois temas (o painel é escuro sempre); o tema muda a página. Desvio do real: distância média dos vértices do traçado à linha central real, medida por gerar_referencias.py.</p>
${PISTAS.map((id) => secao(id, d)).join('\n')}
</body></html>`;
}

describe('preview antes × depois (PR 2b)', () => {
  it('escreve a página das 10 pistas, com o "antes" do git', { timeout: 180_000 }, async () => {
    mkdirSync(DIR, { recursive: true });
    // `git diff --quiet` sai com erro se `src/` difere do HEAD: o "depois" não seria o HEAD.
    execFileSync('git', ['-C', RAIZ, 'diff', '--quiet', 'HEAD', '--', 'src'], { stdio: 'pipe' });
    const refDepois = new TextDecoder().decode(execFileSync('git', ['-C', RAIZ, 'rev-parse', '--short', 'HEAD'], { stdio: 'pipe' })).trim();
    const depois = await renderizar(PISTAS);

    const antesTracados = moduloDoGit('tracados');
    const antesFluxo = moduloDoGit('fluxo-corrida');
    vi.resetModules();
    vi.doMock('../src/ui/fluxo-corrida', () => import(/* @vite-ignore */ antesFluxo));
    // No ar não existe box nem ponte: `box.ts` e `viaduto.ts` são do HEAD e leem estas duas tabelas.
    vi.doMock('../src/ui/tracados', async () => ({
      ...(await import(/* @vite-ignore */ antesTracados)),
      BOXES_POR_PISTA: {},
      VIADUTOS_POR_PISTA: {},
    }));
    const antes = await renderizar(PISTAS);
    vi.doUnmock('../src/ui/tracados');
    vi.doUnmock('../src/ui/fluxo-corrida');
    vi.resetModules();

    const dados: Dados = { antes, depois, refDepois, desvioAntes: desviosDoReal(REF_ANTES), desvioDepois: desviosDoReal('HEAD') };

    // Os HTMLs saem ANTES das asserções: se uma falhar, o artefato pra diagnosticar já existe.
    for (const tema of ['escuro', 'claro'] as const) {
      const arquivo = join(DIR, `pr2b-10-pistas-${tema}.html`);
      writeFileSync(arquivo, pagina(tema, dados), 'utf8');
      console.log(`preview: ${arquivo}`);
    }
    for (const pistaId of PISTAS) {
      console.log(`${pistaId}: desvio ${dados.desvioAntes[pistaId]} -> ${dados.desvioDepois[pistaId]}; ${depois[pistaId].cerca}`);
    }
    // Anti-vacuidade: as 10 mudaram, e o "antes" é mesmo o traçado sem box.
    for (const pistaId of PISTAS) {
      expect(antes[pistaId].corpo, `${pistaId}: antes == depois (o mock não pegou?)`).not.toBe(depois[pistaId].corpo);
      expect(antes[pistaId].corpo, pistaId).not.toContain('tracado-svg__camada--box');
      expect(depois[pistaId].corpo, pistaId).toContain('tracado-svg__camada--box');
      expect(dados.desvioAntes[pistaId], pistaId).toBeDefined();
      expect(dados.desvioDepois[pistaId], pistaId).toBeDefined();
    }
    // O degrau escrito à mão bate com o que a pista declara.
    for (const pistaId of PISTAS) {
      const box = depois[pistaId].box;
      const degrau = DEGRAU_DO_BOX[pistaId];
      expect(degrau.includes('sem garagens'), pistaId).toBe(box?.garagens === false);
      expect(degrau.includes(`box ${box?.larguraBox} u`), pistaId).toBe(box?.larguraBox !== undefined);
      expect(degrau.includes(`afastamento ${box?.afastamento}`), pistaId).toBe(box?.afastamento !== 48);
    }
  });
});
