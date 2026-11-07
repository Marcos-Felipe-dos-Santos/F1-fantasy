/** Preview visual autocontido do App real: CSP retirada só deste arquivo local, pois script/CSS ficam embutidos. Não publica nada; modo online exige servidor e não faz parte deste preview. */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [build = 'dist', saida = 'preview/paddock-fundo.html'] = process.argv.slice(2);
const LIMITE_BYTES = 15 * 1024 * 1024;

let html = readFileSync(join(build, 'index.html'), 'utf8');
html = html.replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
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
