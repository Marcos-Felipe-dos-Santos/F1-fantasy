/**
 * Mutações do PR 2e: aplica cada uma, roda os testes do replay e restaura o arquivo.
 * Sobrevivente = o teste não afirma o que diz. Comando: node scripts/mutar-pr2e.mjs
 * Grava `docs/pr2e-mutacoes.json`. Aborta se o trecho original não existir mais.
 * `--fatia 0-10` roda um pedaço e acumula no JSON (a fatia 0 recomeça do zero): uma
 * rodada morta no meio deixaria `src/` mutado, então cabe rodar em pedaços curtos.
 */

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const FIM = 'src/ui/fim-da-corrida.ts';
const BASE = 'src/ui/fluxo-corrida.ts';
const DIF = 'src/ui/diferenca-lider.ts';
const HOOK = 'src/ui/useCorrida.ts';
const TELA = 'src/ui/TelaCorrida.tsx';
const CSS = 'src/ui/estilos.css';

const MUTACOES = [
  ['bandeirada-no-tempo-oficial', FIM, 'const bandeirada = Math.min(...terminaram.map((c) => somaDe(c.jogadorId)));', 'const bandeirada = terminaram[0]?.tempoTotal ?? Infinity;'],
  ['fim-na-bandeirada', FIM, ': Math.max(...[...chegadas.values()].map((c) => c.instante)),', ': bandeirada,'],
  ['fim-sem-ninguem', FIM, '? (resultado.classificacao[0]?.tempoTotal ?? 0)', '? 0'],
  ['retardatario-faz-todas', FIM, 'while (instante < bandeirada) {', 'while (voltas < historico.length) {'],
  ['dnf-recebe-bandeirada', FIM, "resultado.classificacao.filter((c) => c.status === 'terminou')", 'resultado.classificacao.filter(() => true)'],
  ['box-sem-regra', FIM, 'if (parada === undefined) return {', 'if (parada === undefined || true) return {'],
  ['box-sem-esperar-a-parada', FIM, 'inicioLenta: parada.fim,', 'inicioLenta: instante,'],
  ['box-fracao-zero', FIM, "linha.posicao(jogadorId, historico, 'terminou', parada.fim, false).fracaoNaPista ?? 0,", '0,'],
  ['punicao-de-qualquer-evento', FIM, "if (e.tipo === 'investigacao') {", 'if (e.custoMs > 0) {'],
  ['progresso-nao-congela', FIM, '? chegada.voltas / pista.voltas\n', '? linha.progresso(jogadorId, historico, tempoSimMs)\n'],
  ['chegou-so-na-lenta', FIM, 'return chegada !== undefined && tempoSimMs >= chegada.instante;', 'return chegada !== undefined && tempoSimMs >= chegada.inicioLenta;'],
  ['razao-lenta', FIM, 'export const RAZAO_VOLTA_LENTA = 0.6;', 'export const RAZAO_VOLTA_LENTA = 0.7;'],
  ['sem-rampa', FIM, 'if (decorrido >= rampa) return DISTANCIA_RAMPA + lenta * (decorrido - rampa);', 'return lenta * decorrido;'],
  ['reduzido-anda', FIM, 'const andou = reduzido ? 0 : distanciaNaVoltaLenta(decorrido, velocidade);', 'const andou = distanciaNaVoltaLenta(decorrido, velocidade);'],
  ['perfil-por-carro', FIM, 'distanciaNaVoltaLenta(decorrido, velocidade);', 'distanciaNaVoltaLenta(decorrido, velocidade * (1 + (jogadorId.charCodeAt(jogadorId.length - 1) % 3) / 10));'],
  ['lenta-desde-a-bandeirada', FIM, 'const decorrido = tempoSimMs - chegada.inicioLenta;', 'const decorrido = tempoSimMs - bandeirada;'],
  ['relogio-passa-do-fim', FIM, '{ tempoMs: fimMs, acabou: true }', '{ tempoMs: proximo, acabou: true }'],
  ['hook-fim-antigo', HOOK, 'const tempoFimMs = replayDaCorrida(resultado, pista).fim;', 'const tempoFimMs = tempoVencedorMs;'],
  ['hook-escala-nova', HOOK, 'useRef(escalaReplay(tempoVencedorMs, pista.voltas, MS_REPLAY_POR_VOLTA[velocidade]))', 'useRef(escalaReplay(tempoFimMs, pista.voltas, MS_REPLAY_POR_VOLTA[velocidade]))'],
  ['painel-sem-chegou', BASE, 'pit?.chegou?.(item.jogadorId, tempoSimMs) ?? (congelado', '(congelado'],
  ['painel-dnf-nao-afunda', BASE, "if (alguemChegou && (a.status === 'dnf') !== (b.status === 'dnf')) return a.status === 'dnf' ? 1 : -1;\n", ''],
  ['painel-dnf-afunda-sempre', BASE, "if (alguemChegou && (a.status === 'dnf')", "if ((a.status === 'dnf')"],
  ['painel-sem-ordem-oficial', BASE, 'parou(item) ? paradosNaOrdemOficial[proximoParado++] : item', 'item'],
  ['dif-retardatario-em-tempo', DIF, "if (atras >= 1) return { tipo: 'voltas', voltas: atras };", "if (atras >= 1 && item.status !== 'terminou') return { tipo: 'voltas', voltas: atras };"],
  ['tela-sem-selo', TELA, '{punicaoMs > 0 && (', '{false && ('],
  ['selo-antes-da-chegada', TELA, "item.status === 'terminou' ? replay.punicaoMs(item.jogadorId) : 0", 'replay.punicaoMs(item.jogadorId)'],
  ['botao-sempre-acelerar', TELA, "{depoisDaBandeirada ? 'Ir para o resultado →' : 'Acelerar ⏩'}", "{'Acelerar ⏩'}"],
  ['titulo-sem-bandeirada', TELA, '{depoisDaBandeirada ? (', '{false ? ('],
  ['spray-na-volta-lenta', TELA, 'parou: replay.chegou(item.jogadorId, tempoSimMs) || tempoSimMs', 'parou: tempoSimMs'],
  ['tela-painel-sem-replay', TELA, 'classificacaoAoVivo(resultado, gridLargada, tempoSimMs, pista.voltas, replay)', 'classificacaoAoVivo(resultado, gridLargada, tempoSimMs, pista.voltas)'],
  ['tela-diferenca-sem-replay', TELA, 'diferencasParaLider(resultado, classificacaoAtual, tempoSimMs, pista.voltas, replay)', 'diferencasParaLider(resultado, classificacaoAtual, tempoSimMs, pista.voltas)'],
  ['selo-na-cor-de-preenchimento', CSS, 'color: var(--cor-erro);\n  border: 1px solid currentColor;', 'color: var(--erro);\n  border: 1px solid currentColor;'],
];

// A suíte inteira leva 13 s. Laço infinito é síncrono: o `testTimeout` do vitest não o interrompe.
const LIMITE_MS = 90_000;

/**
 * Async de propósito: o `timeout` do `spawnSync` só mataria o shell, e o worker preso
 * no laço ficaria órfão. `taskkill /T` leva a árvore inteira.
 */
const rodar = () =>
  new Promise((resolver, rejeitar) => {
    const filho = spawn(
      'npx',
      ['vitest', 'run', 'src/ui/fim-da-corrida.test.ts', 'src/ui/tela-corrida-render.test.ts', 'src/ui/fluxo-corrida.test.ts', 'src/ui/diferenca-lider.test.ts', 'src/ui/pit-replay.test.ts', '--bail=1'],
      { shell: true, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let saida = '';
    filho.stdout.on('data', (d) => (saida += d));
    filho.stderr.on('data', (d) => (saida += d));
    let estourou = false;
    const limite = setTimeout(() => {
      estourou = true;
      spawnSync('taskkill', ['/PID', String(filho.pid), '/T', '/F'], { stdio: 'ignore' });
    }, LIMITE_MS);
    filho.on('error', rejeitar);
    filho.on('close', (status) => {
      clearTimeout(limite);
      resolver({ status, estourou, saida: saida.replace(/\x1b\[[0-9;]*m/g, '') });
    });
  });

// Controle: sem isto, "31/31 detectadas" não se distingue de "o comando não roda".
const controle = await rodar();
if (controle.status !== 0 || controle.estourou) throw new Error('controle sem mutação não passou: nada a medir');

const JSON_SAIDA = 'docs/pr2e-mutacoes.json';
const indiceFatia = process.argv.indexOf('--fatia');
const [de_, ate_] = indiceFatia === -1 ? [0, MUTACOES.length] : process.argv[indiceFatia + 1].split('-').map(Number);
const resultado = de_ === 0 ? [] : JSON.parse(readFileSync(JSON_SAIDA, 'utf8'));
for (const [nome, arquivo, de, para] of MUTACOES.slice(de_, ate_)) {
  const cru = readFileSync(arquivo, 'utf8');
  const crlf = cru.includes('\r\n');
  const original = crlf ? cru.replace(/\r\n/g, '\n') : cru;
  if (!original.includes(de)) throw new Error(`trecho não encontrado: ${nome}`);
  const mutado = original.replace(de, () => para);
  writeFileSync(arquivo, crlf ? mutado.replace(/\n/g, '\r\n') : mutado);
  try {
    const r = await rodar();
    const falha = r.saida.match(/^ FAIL +(.*)$/m)?.[1] ?? null;
    // Só conta como detectada a falha de um teste nomeado, nunca o comando quebrado.
    const detectada = r.status !== 0 && falha !== null;
    if (!r.estourou && r.status !== 0 && falha === null) throw new Error(`vitest caiu sem falha nomeada: ${nome}`);
    // Travar não é passar, mas também não é um teste apontando o defeito: conta à parte.
    resultado.push({ nome, detectada, travou: r.estourou, falha });
    const rotulo = r.estourou ? 'TRAVOU    ' : detectada ? 'DETECTADA ' : 'SOBREVIVEU';
    console.log(`${rotulo} ${nome}${falha ? ` | ${falha.slice(0, 110)}` : ''}`);
  } finally {
    writeFileSync(arquivo, cru);
  }
}
writeFileSync(JSON_SAIDA, `${JSON.stringify(resultado, null, 2)}\n`);
console.log(`${resultado.filter((m) => m.detectada).length}/${resultado.length} detectadas, ${resultado.filter((m) => m.travou).length} travaram, de ${MUTACOES.length}`);
