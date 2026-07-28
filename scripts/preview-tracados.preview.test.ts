/**
 * Gerador do PREVIEW VISUAL das 10 silhuetas (PR 7.4) — escreve
 * `preview/tracados.html` pro dev olhar antes de aprovar o merge, cumprindo a
 * exigência do PLANO ("Gerar preview em `preview/` com as 10 silhuetas antes
 * do merge").
 *
 * Roda por config separada (`vitest.preview.config.ts`, `npm run preview`),
 * mesmo arranjo do balance-harness: é ferramenta de dev que ESCREVE artefato,
 * não verificação de lógica, então fica fora do `npm test`.
 *
 * Usa a geometria e os tokens DE PRODUÇÃO (`pathDaVolta`,
 * `pathsDeZebraDaPista`, `CAMADAS_PISTA`, `cores`) — se o preview e a tela
 * divergirem, o preview não serve pra decidir nada.
 *
 * `preview/` é gitignored (mesmo tratamento de `referencias/`): artefato
 * regenerável, não entra no histórico.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { criarDataset } from '../src/engine/dataset';
import equipeAnosReal from '../src/data/equipe-anos.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';
import type { Ponto } from '../src/ui/fluxo-corrida';
import {
  CAMADAS_PISTA,
  VIEWBOX_PISTA,
  anguloDeVirada,
  pathDaVolta,
  pathDoTrecho,
  pathsDeZebraDaPista,
} from '../src/ui/pista-camadas';
import { AMOSTRAS_POR_SEGMENTO, tracadoSuavizado } from '../src/ui/suavizacao';
import { cores } from '../src/ui/tokens';
import { tracadoDaPista } from '../src/ui/tracados';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** `'pistaAsfalto'` ⇒ o hex real do token, pra o preview não depender do CSS da app. */
function hex(cor: string): string {
  return (cores as Record<string, string>)[cor] ?? '#f0f';
}

function maiorAngulo(t: readonly Ponto[]): number {
  let maior = 0;
  for (let i = 0; i < t.length; i++) {
    maior = Math.max(maior, anguloDeVirada(t[(i - 1 + t.length) % t.length], t[i], t[(i + 1) % t.length]));
  }
  return maior;
}

/** A pilha de camadas de uma pista, como os `<path>` que `CamadasDaPista` renderiza. */
function camadasSvg(pistaId: string): string {
  const zebras = pathsDeZebraDaPista(pistaId);
  return CAMADAS_PISTA.map((camada) => {
    const comum =
      `stroke="${hex(camada.cor)}" stroke-width="${camada.largura}" fill="none"` +
      ` stroke-linejoin="round"` +
      (camada.tracejado ? ` stroke-dasharray="${camada.tracejado}"` : '') +
      (camada.deslocamentoTracejado !== undefined
        ? ` stroke-dashoffset="${camada.deslocamentoTracejado}"`
        : '');
    if (camada.alvo === 'volta') {
      return `<path d="${pathDaVolta(pistaId)}" ${comum} stroke-linecap="round" />`;
    }
    return zebras
      .map((z) => `<path d="${z.d}" ${comum} stroke-linecap="butt" />`)
      .join('\n      ');
  }).join('\n      ');
}

/** Polilinha de CONTROLE em fio fino por cima — é o "antes" contra o qual se compara. */
function controleSvg(pistaId: string): string {
  const controle = tracadoDaPista(pistaId);
  const vertices = controle
    .map((p) => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#ff2d95" />`)
    .join('');
  return (
    `<g class="controle">` +
    `<path d="${pathDoTrecho(controle)} Z" stroke="#ff2d95" stroke-width="2" fill="none" ` +
    `stroke-dasharray="10 6" opacity="0.9" />${vertices}</g>`
  );
}

function cartao(pistaId: string, nome: string): string {
  const controle = tracadoDaPista(pistaId);
  const curva = tracadoSuavizado(pistaId);
  const angC = maiorAngulo(controle);
  const angS = maiorAngulo(curva);
  const espinho = angC >= 150;
  return `
  <figure class="pista${espinho ? ' pista--espinho' : ''}">
    <svg viewBox="${VIEWBOX_PISTA}" xmlns="http://www.w3.org/2000/svg">
      <rect x="-10" y="-30" width="1000" height="660" fill="${hex('fundo')}" />
      ${camadasSvg(pistaId)}
      ${controleSvg(pistaId)}
    </svg>
    <figcaption>
      <strong>${nome}</strong>
      <span class="mono">${controle.length} → ${curva.length} pts</span>
      <span class="mono">pior vértice: ${angC.toFixed(0)}° → <b>${angS.toFixed(0)}°</b></span>
      ${espinho ? '<span class="alerta">ESPINHO de ~180° no vértice #0 — continua anguloso</span>' : ''}
    </figcaption>
  </figure>`;
}

describe('preview das silhuetas (PR 7.4)', () => {
  it('escreve preview/tracados.html com as 10 pistas', () => {
    const cartoes = dataset.pistas.map((p) => cartao(p.id, p.nome)).join('\n');
    const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PR 7.4 — suavização Bézier das 10 silhuetas</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; padding: 24px; background: ${hex('fundo')}; color: ${hex('texto')};
         font-family: system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  p.sub { margin: 0 0 20px; opacity: .75; font-size: 14px; line-height: 1.5; max-width: 90ch; }
  .legenda { display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px; margin-bottom: 20px;
             padding: 12px; border: 1px solid ${hex('borda')}; border-radius: 8px; }
  .grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 20px; }
  figure { margin: 0; border: 3px solid ${hex('borda')}; border-radius: 10px; overflow: hidden;
           background: ${hex('fundo')}; }
  .pista--espinho { border-color: #ff6a3d; }
  svg { display: block; width: 100%; height: auto; }
  figcaption { padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; font-size: 13px;
               border-top: 1px solid ${hex('borda')}; }
  .mono { font-family: ui-monospace, monospace; opacity: .8; font-size: 12px; }
  .alerta { color: #ff6a3d; font-weight: 700; font-size: 12px; margin-top: 3px; }
  .toggle { margin-bottom: 16px; font-size: 14px; }
  body.sem-controle .controle { display: none; }
</style>
</head>
<body>
<h1>PR 7.4 — suavização Bézier (Catmull-Rom centrípeta, α = ${0.5})</h1>
<p class="sub">
  Camadas, cores e viewBox são os DE PRODUÇÃO. Densificação:
  ${AMOSTRAS_POR_SEGMENTO} amostras por segmento de controle.
  <br />O fio <b style="color:#ff2d95">rosa tracejado + bolinhas</b> é a polilinha de controle
  (o "antes", o polígono que fazia as pistas parecerem quadradas). O asfalto é a curva do "depois".
</p>
<div class="legenda">
  <label class="toggle">
    <input type="checkbox" onchange="document.body.classList.toggle('sem-controle', this.checked)" />
    esconder a polilinha de controle
  </label>
</div>
<div class="grade">
${cartoes}
</div>
</body>
</html>`;

    const destino = join(__dirname, '..', 'preview');
    mkdirSync(destino, { recursive: true });
    const arquivo = join(destino, 'tracados.html');
    writeFileSync(arquivo, html, 'utf8');
    console.log(`\npreview escrito em: ${arquivo}\n`);

    expect(dataset.pistas).toHaveLength(10);
    expect(html).toContain('viewBox');
  });
});
