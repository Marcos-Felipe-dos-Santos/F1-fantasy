/**
 * Mutações do PR 2f: aplica cada uma, roda os testes do replay e restaura o arquivo.
 * Sobrevivente = o teste não afirma o que diz. Comando: node scripts/mutar-pr2f.mjs
 * Grava `docs/pr2f-mutacoes.json`. Aborta se o trecho original não existir mais.
 * `--fatia 0-10` roda um pedaço e acumula no JSON (a fatia 0 recomeça do zero).
 * Derivado de `mutar-pr2d.mjs`, com o mesmo timeout por mutante e a mesma nova tentativa.
 */

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const PUN = 'src/ui/punicao-replay.ts';
const FIM = 'src/ui/fim-da-corrida.ts';
const PIT = 'src/ui/pit-replay.ts';
const NAR = 'src/ui/narracao.ts';
const TELA = 'src/ui/TelaCorrida.tsx';

const ESPERA = 'return tempoSimMs < punicao.inicio + punicao.ms ? (naVaga.get(jogadorId) ?? punicao.inicio) : tempoSimMs - punicao.ms;';

const MUTACOES = [
  ['espera-anda-para-tras', PUN, ESPERA, 'return tempoSimMs - punicao.ms;'],
  ['sem-atraso-depois', PUN, ESPERA, 'return tempoSimMs < punicao.inicio + punicao.ms ? (naVaga.get(jogadorId) ?? punicao.inicio) : tempoSimMs;'],
  ['espera-na-partida', PUN, '(naVaga.get(jogadorId) ?? punicao.inicio)', 'punicao.inicio'],
  ['sem-espera', PUN, 'if (punicao === undefined || tempoSimMs < punicao.inicio) return tempoSimMs;', 'return tempoSimMs;'],
  ['inverso-sem-deslocar', PUN, 'return punicao !== undefined && instante >= punicao.inicio ? instante + punicao.ms : instante;', 'return instante;'],
  ['inverso-desloca-tudo', PUN, 'return punicao !== undefined && instante >= punicao.inicio ? instante + punicao.ms : instante;', 'return punicao !== undefined ? instante + punicao.ms : instante;'],
  ['paradas-sem-deslocar', PUN, 'paradas: (jogadorId) => paradas.get(jogadorId) ?? base.paradas(jogadorId),', 'paradas: (jogadorId) => base.paradas(jogadorId),'],
  ['incidentes-sem-deslocar', PUN, 'incidentes: (jogadorId) => incidentes.get(jogadorId) ?? base.incidentes(jogadorId),', 'incidentes: (jogadorId) => base.incidentes(jogadorId),'],
  ['desloca-estrito', PUN, 'const desloca = (t: number) => (t >= p.partida ? t + ms : t);', 'const desloca = (t: number) => (t > p.partida ? t + ms : t);'],
  ['nobox-sem-relogio', PUN, 'noBox: (jogadorId, tempoSimMs) => base.noBox(jogadorId, relogio(jogadorId, tempoSimMs)),', 'noBox: (jogadorId, tempoSimMs) => base.noBox(jogadorId, tempoSimMs),'],
  ['posicao-sem-relogio', PUN, 'base.posicao(jogadorId, historico, status, relogio(jogadorId, tempoSimMs), reduzido),', 'base.posicao(jogadorId, historico, status, tempoSimMs, reduzido),'],
  ['infracao-da-largada', PUN, 'const de = doCarro[indice - 1]?.fim ?? 0;', 'const de = 0;'],
  ['infracao-ate-o-fim-do-pit', PUN, '* (p.inicio - de);', '* (p.fim - de);'],
  ['infracao-sem-margem', PUN, 'const MARGEM_INFRACAO = 0.1;', 'const MARGEM_INFRACAO = 0;'],
  ['volta-da-infracao-a-menos', PUN, 'Math.floor(progresso * pista.voltas) + 1', 'Math.floor(progresso * pista.voltas)'],
  ['pit-sem-filtro-da-chegada', FIM, '.filter((p) => chegada !== undefined && p.inicio < chegada.instante)', '.filter(() => chegada !== undefined)'],
  ['nunca-cumpre', FIM, 'if (pit !== undefined && !cumprir.has(e.jogadorId))', 'if (false)'],
  ['selo-tambem-no-cumprido', FIM, 'else selos.set(e.jogadorId', 'selos.set(e.jogadorId'],
  ['bandeirada-sem-espera', FIM, 'somaDe(c.jogadorId) + (esperas.get(c.jogadorId)?.ms ?? 0)', 'somaDe(c.jogadorId)'],
  ['vagas-sem-espera', FIM, 'linhaDoTempoDoPit(resultado, pista, esperas)', 'linhaDoTempoDoPit(resultado, pista)'],
  ['chegadas-de-antes', FIM, 'const chegadas = chegadasEm(linha, bandeirada);', 'const chegadas = chegadasAntes;'],
  ['vaga-livre-na-partida', PIT, 'livreEm[vaga] = p.partida + esperaDe(p);', 'livreEm[vaga] = p.partida;'],
  ['box-cheio-nunca', PIT, 'p.boxCheio = vaga === -1;', 'p.boxCheio = false;'],
  ['box-cheio-sempre', PIT, 'p.boxCheio = vaga === -1;', 'p.boxCheio = true;'],
  ['espera-em-todo-pit', PIT, 'return espera !== undefined && espera.volta === p.volta ? espera.ms : 0;', 'return espera !== undefined ? espera.ms : 0;'],
  ['cumprida-na-infracao', NAR, 'instante: punicao.parada.partida,', 'instante: punicao.infracao,'],
  ['infracao-no-cumprimento', NAR, 'instante: punicao.infracao,', 'instante: punicao.parada.partida,'],
  ['volta-do-evento', NAR, 'volta: punicao.voltaDaInfracao,', 'volta: evento.volta,'],
  ['volta-do-cumprimento', NAR, 'volta: punicao.parada.volta,', 'volta: evento.volta,'],
  ['chave-repetida', NAR, 'chave: `${chave}-cumprida`,', 'chave,'],
  ['cumprida-gasta-pool', NAR, 'frase: FRASE_PUNICAO_CUMPRIDA,', 'frase: fraseNova(evento, resultado, usadas),'],
  ['texto-da-infracao', NAR, "if (momento === 'infracao') return `: +${segundos(tempoPerdidoMs)} s, a cumprir no box`;", ''],
  ['texto-do-cumprimento', NAR, "if (momento === 'cumprida') return ` e ficou +${segundos(tempoPerdidoMs)} s a mais parado`;", ''],
  ['texto-do-selo', NAR, "if (evento.tipo === 'investigacao') return ` e levou +${segundos(tempoPerdidoMs)} s`;", ''],
  ['cumprida-vai-aos-boxes', NAR, 'posicoesPerdidas: null, foiParaOsBoxes: false };', 'posicoesPerdidas: null, foiParaOsBoxes: true };'],
  ['ticker-volta-do-evento', TELA, 'V{narrada.volta}', 'V{evento.volta}'],
  ['ticker-chave-do-evento', TELA, '<li key={narrada.chave}>', '<li key={`${evento.jogadorId}-${evento.tipo}-${evento.volta}`}>'],
];

const TESTES = [
  'src/ui/punicao-replay.test.ts',
  'src/ui/fim-da-corrida.test.ts',
  'src/ui/narracao.test.ts',
  'src/ui/tela-corrida-render.test.ts',
  'src/ui/pit-replay.test.ts',
  'src/ui/diferenca-lider.test.ts',
  'src/ui/incidentes-replay.test.ts',
  'src/ui/fluxo-corrida.test.ts',
];
const LIMITE_MS = 120_000;

const rodar = () =>
  new Promise((resolver, rejeitar) => {
    const filho = spawn('npx', ['vitest', 'run', ...TESTES, '--bail=1'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
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

const controle = await rodar();
if (controle.status !== 0 || controle.estourou) throw new Error('controle sem mutação não passou: nada a medir');

const JSON_SAIDA = 'docs/pr2f-mutacoes.json';
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
    let r = await rodar();
    // Com `--bail=1` a linha FAIL às vezes não chega à saída: tenta de novo uma vez antes de abortar.
    if (!r.estourou && r.status !== 0 && !/^ FAIL /m.test(r.saida)) r = await rodar();
    const falha = r.saida.match(/^ FAIL +(.*)$/m)?.[1] ?? null;
    const detectada = r.status !== 0 && falha !== null;
    if (!r.estourou && r.status !== 0 && falha === null) throw new Error(`vitest caiu sem falha nomeada: ${nome}`);
    resultado.push({ nome, detectada, travou: r.estourou, falha });
    const rotulo = r.estourou ? 'TRAVOU    ' : detectada ? 'DETECTADA ' : 'SOBREVIVEU';
    console.log(`${rotulo} ${nome}${falha ? ` | ${falha.slice(0, 110)}` : ''}`);
  } finally {
    writeFileSync(arquivo, cru);
  }
  writeFileSync(JSON_SAIDA, `${JSON.stringify(resultado, null, 2)}\n`);
}
console.log(`${resultado.filter((m) => m.detectada).length}/${resultado.length} detectadas, ${resultado.filter((m) => m.travou).length} travaram, de ${MUTACOES.length}`);
