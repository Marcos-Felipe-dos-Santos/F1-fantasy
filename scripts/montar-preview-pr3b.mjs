/**
 * Monta o preview do PR 3b num ARQUIVO ÚNICO, para abrir por link no celular: o build de
 * `scripts/preview-pr3b.config.ts` com o JS, o CSS, a fonte e os 17 `.ogg` embutidos.
 *
 * A única troca em relação ao jogo é o carregador: um `fetch` de `/sons/*.ogg` é respondido com o
 * arquivo embutido (o mesmo byte a byte de `public/sons/`; o MD5 de cada um sai no console). Todo o
 * resto, `audio.ts` incluído, é o código de produção. ⚠️ Sem CSP: script embutido viola a
 * `script-src 'self'`. A CSP real é conferida no build de produção, não aqui.
 *
 *   PREVIEW_PR3B_SAIDA=.wrangler/pr3b-preview npx vite build --config scripts/preview-pr3b.config.ts
 *   node scripts/montar-preview-pr3b.mjs [.wrangler/pr3b-preview] [preview/pr3b-som.html]
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [build = '.wrangler/pr3b-preview', saida = 'preview/pr3b-som.html'] = process.argv.slice(2);
const LIMITE_BYTES = 15 * 1024 * 1024;

let html = readFileSync(join(build, 'scripts/preview-pr3b.html'), 'utf8');
const scripts = [...html.matchAll(/<script type="module" crossorigin src="\/([^"]+)"><\/script>/g)];
const estilos = [...html.matchAll(/<link rel="stylesheet" crossorigin href="\/([^"]+)">/g)];
if (scripts.length !== 1 || estilos.length !== 1) throw new Error(`esperava 1 JS e 1 CSS, achei ${scripts.length} e ${estilos.length}`);

let css = readFileSync(join(build, estilos[0][1]), 'utf8');
css = css.replace(/url\((['"]?)\/(fonts\/[^'")]+)\1\)/g, (_, _q, arq) => {
  const b = readFileSync(join('public', arq)).toString('base64');
  return `url(data:font/woff2;base64,${b})`;
});
if (/url\((['"]?)\//.test(css)) throw new Error('sobrou url() absoluta no CSS');
const js = readFileSync(join(build, scripts[0][1]), 'utf8').replace(/<\/script/gi, '<\\/script');

const sons = {};
for (const f of readdirSync('public/sons').sort()) {
  const bytes = readFileSync(join('public/sons', f));
  sons[`sons/${f}`] = bytes.toString('base64');
  console.log(`${f}  ${bytes.length} B  md5 ${createHash('md5').update(bytes).digest('hex')}`);
}

const carregador = `(() => {
  const S = JSON.parse(document.getElementById('sons-embutidos').textContent);
  const original = window.fetch.bind(window);
  window.fetch = (url, opcoes) => {
    const chave = String(url).replace(/^\\//, '');
    if (!(chave in S)) return original(url, opcoes);
    const b = atob(S[chave]);
    const a = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return Promise.resolve(new Response(a, { status: 200, headers: { 'Content-Type': 'audio/ogg' } }));
  };
})();`;

html = html
  .replace(estilos[0][0], () => `<style>${css}</style>`)
  .replace(
    scripts[0][0],
    () =>
      `<script type="application/json" id="sons-embutidos">${JSON.stringify(sons)}</script>\n<script>${carregador}</script>\n<script type="module">${js}</script>`,
  );
writeFileSync(saida, html);
const bytes = statSync(saida).size;
console.log(`${saida}: ${bytes} bytes, ${Object.keys(sons).length} sons`);
if (bytes > LIMITE_BYTES) throw new Error(`preview passou de ${LIMITE_BYTES} bytes`);
