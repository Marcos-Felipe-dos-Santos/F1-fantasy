/** Regressões do PR 1: restaura cada arquivo em finally; não toca engine/dados.
 * Rodar sem outras edições/testes simultâneos: node scripts/mutar-resultados.mjs
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const testes = ['src/ui/resultado-corrida.test.ts', 'src/ui/fluxo-corrida.test.ts'];
const mutantes = [
  { id: 'DNF', arquivo: 'src/ui/fluxo-corrida.ts',
    de: "const limite = historico.length - (item.status === 'dnf' ? 1 : 0);",
    para: 'const limite = historico.length;' },
  { id: 'VR-empate', arquivo: 'src/ui/TelaResultadoCorrida.tsx',
    de: 'item.jogadorId === resultado.voltaMaisRapida.jogadorId',
    para: 'melhor !== null' },
  { id: 'Podio-invertido', arquivo: 'src/ui/Podio.tsx',
    de: 'podio.map((linha, indice)', para: '[...podio].reverse().map((linha, indice)' },
];
const evidencias = [];
for (const m of mutantes) {
  const caminho = join(raiz, m.arquivo);
  const original = readFileSync(caminho, 'utf8');
  assert.equal(original.split(m.de).length, 2, `Alvo único não encontrado: ${m.id}`);
  try {
    writeFileSync(caminho, original.replace(m.de, m.para));
    let falha;
    try {
      execFileSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...testes],
        { cwd: raiz, encoding: 'utf8', stdio: 'pipe' });
    } catch (erro) { falha = erro; }
    assert.ok(falha, `Mutante sobreviveu: ${m.id}`);
    const saida = String(falha.stdout) + String(falha.stderr);
    assert.equal(falha.status, 1, `Falha inesperada de processo em ${m.id}`);
    assert.match(saida, /AssertionError/, `Não foi uma asserção comportamental: ${m.id}`);
    evidencias.push({ id: m.id, arquivo: m.arquivo, resultado: 'detectado',
      resumo: saida.split('\n').filter((l) => /^\s*(FAIL |Tests\s)/.test(l)).map((l) => l.trim()) });
  } finally {
    writeFileSync(caminho, original);
  }
  assert.equal(readFileSync(caminho, 'utf8'), original, `Restauração falhou: ${m.id}`);
}
writeFileSync(join(raiz, 'docs/pr1-mutacoes.json'), JSON.stringify(evidencias, null, 2) + '\n');
console.log(JSON.stringify(evidencias, null, 2));
