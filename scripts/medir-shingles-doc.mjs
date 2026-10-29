// Mede quanto de um trecho de um .md já está espelhado em outro, por shingles
// de K palavras (não por grep de marcador). Uso:
//   node scripts/medir-shingles-doc.mjs <origem.md> <linhaIni> <linhaFim> <destino.md> [K=8]
// Relata a cobertura por bloco (cada "Medição ..." abre um bloco) e no total.
import fs from 'node:fs';

const [, , origem, ini, fim, destino, kArg = '8'] = process.argv;
const K = Number(kArg);
const normalizar = (s) =>
  s
    .toLowerCase()
    .replace(/[`*_>~|\\]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const linhas = fs.readFileSync(origem, 'utf8').split(/\r?\n/);
const palavrasDestino = normalizar(fs.readFileSync(destino, 'utf8'));
const shinglesDestino = new Set();
for (let i = 0; i + K <= palavrasDestino.length; i++) {
  shinglesDestino.add(palavrasDestino.slice(i, i + K).join(' '));
}

const abreBloco = (l) => /^\*\(Medição|^\*\*Medição|^## /.test(l);
const blocos = [];
let inicio = Number(ini);
let atual = [];
for (let n = Number(ini); n <= Number(fim); n++) {
  const l = linhas[n - 1] ?? '';
  if (abreBloco(l) && atual.length) {
    blocos.push([inicio, atual]);
    atual = [];
    inicio = n;
  }
  atual.push(l);
}
if (atual.length) blocos.push([inicio, atual]);

let total = 0;
let achados = 0;
for (const [ini0, bl] of blocos) {
  const w = normalizar(bl.join(' '));
  let t = 0;
  let h = 0;
  for (let i = 0; i + K <= w.length; i++) {
    t++;
    if (shinglesDestino.has(w.slice(i, i + K).join(' '))) h++;
  }
  total += t;
  achados += h;
  const pct = t ? ((100 * h) / t).toFixed(1) : '-';
  console.log(`L${ini0}-${ini0 + bl.length - 1}: ${pct}% (${h}/${t})`);
}
console.log(`TOTAL ${((100 * achados) / total).toFixed(1)}% (${achados}/${total}), K=${K}`);
