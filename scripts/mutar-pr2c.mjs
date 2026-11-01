/**
 * Mutações do PR 2c: aplica cada uma, roda os testes do pit e restaura o arquivo.
 * Sobrevivente = o teste não afirma o que diz. Comando: node scripts/mutar-pr2c.mjs
 * Grava `docs/pr2c-mutacoes.json`. Aborta se o trecho original não existir mais.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const PIT = 'src/ui/pit-replay.ts';
const FLUXO = 'src/ui/fluxo-corrida.ts';

const MUTACOES = [
  ['formula-sem-trecho', PIT, 'const fim = acumulado[volta - 1] + (c.fracaoSaida - 1 + rampa) * tProxima;', 'const fim = acumulado[volta - 1] + (c.fracaoSaida - 1 + rampa) * tProxima - (c.fracaoSaida - c.fracaoEntrada) * tLimpo;'],
  ['limite-sem-excecao', PIT, "'pista-montreal': { razao: 0.5, soParalelo: true },", "'pista-montreal': { razao: 0.5, soParalelo: false },"],
  ['imola-razao', PIT, "'pista-imola': { razao: 0.55, soParalelo: true },", "'pista-imola': { razao: 0.5, soParalelo: true },"],
  ['sem-trava', PIT, 'Math.max(janela - nominal, Math.min(PISO_PARADO_MS, janela / 2))', 'Math.max(janela - nominal, 1)'],
  ['vaga-fixa', PIT, 'let vaga = livreEm.findIndex((livre, k) => livre <= chegadaEm(k));', 'let vaga = 0;'],
  ['vaga-nunca-libera', PIT, 'livreEm[vaga] = p.partida;', 'livreEm[vaga] = Infinity;'],
  ['box-cheio-primeira', PIT, 'vaga = livreEm.indexOf(Math.min(...livreEm));', 'vaga = 0;'],
  ['espaco-vaga', PIT, 'export const ESPACO_VAGA = 13;', 'export const ESPACO_VAGA = 12;'],
  ['estimador-com-incidente', PIT, 'const vizinhas = [historico[volta] - incidente(volta + 1)];', 'const vizinhas = [historico[volta]];'],
  ['estimador-volta1', PIT, 'if (volta >= 3) vizinhas.push', 'if (volta >= 1) vizinhas.push'],
  ['reduzido-ignorado', PIT, 'ponto: reduzido || x === p.xVaga ?', 'ponto: x === p.xVaga ?'],
  ['sem-aceleracao', PIT, 'tAcel: (2 * c.zonaAcel) / (vLim + vFim),', 'tAcel: c.zonaAcel / vLim,'],
  ['retorno-sem-parado', PIT, 'retorno: inicio + parado + escala', 'retorno: inicio + escala'],
  ['progresso-parado-anda', PIT, 'if (tempoSimMs < p.partida) return p.xVaga;', 'if (tempoSimMs < p.partida) return p.xVaga + (tempoSimMs - p.chegada) / 1e4;'],
  ['ritmo-antigo-na-volta', PIT, 'const tLimpo = historico[volta - 1] - custoPitEstimado(resultado, jogadorId, volta);', 'const tLimpo = historico[volta - 1];'],
  ['badge-volta-inteira', PIT, 'return p !== undefined && tempoSimMs >= p.entrada && tempoSimMs < p.retorno;', 'return p !== undefined;'],
  ['classificacao-progresso-antigo', FLUXO, 'pit?.progresso(item.jogadorId, historico, tempoSimMs) ??\n', 'undefined ??\n'],
  ['classificacao-sem-badge', FLUXO, "status === 'correndo' && pit?.noBox(item.jogadorId, tempoSimMs)", "status === 'correndo' && false"],
];

const rodar = () =>
  spawnSync('npx', ['vitest', 'run', 'src/ui/pit-replay.test.ts', 'src/ui/fluxo-corrida.test.ts', '--bail=1'], {
    encoding: 'utf8',
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

// Controle: sem isto, "18/18 detectadas" não se distingue de "o comando não roda".
if (rodar().status !== 0) throw new Error('controle sem mutação não passou: nada a medir');

const resultado = [];
for (const [nome, arquivo, de, para] of MUTACOES) {
  const original = readFileSync(arquivo, 'utf8');
  if (!original.includes(de)) throw new Error(`trecho não encontrado: ${nome}`);
  writeFileSync(arquivo, original.replace(de, para));
  try {
    const r = rodar();
    const limpa = `${r.stdout}${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    const falha = limpa.match(/^ FAIL +(.*)$/m)?.[1] ?? null;
    // Só conta como detectada a falha de um teste nomeado, nunca o comando quebrado.
    const detectada = r.status !== 0 && falha !== null;
    resultado.push({ nome, detectada, falha });
    console.log(`${detectada ? 'DETECTADA ' : 'SOBREVIVEU'} ${nome}${falha ? ` | ${falha.slice(0, 110)}` : ''}`);
  } finally {
    writeFileSync(arquivo, original);
  }
}
writeFileSync('docs/pr2c-mutacoes.json', `${JSON.stringify(resultado, null, 2)}\n`);
console.log(`${resultado.filter((m) => m.detectada).length}/${resultado.length} detectadas`);
