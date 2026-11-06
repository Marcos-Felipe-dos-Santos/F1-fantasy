/**
 * Mutações do PR 3a (agenda dos sons): aplica cada uma, roda os testes dos sons e restaura o arquivo.
 * Sobrevivente = o teste não afirma o que diz. Comando: node scripts/mutar-pr3a.mjs
 * Grava `docs/pr3a-mutacoes.json`. Aborta se o trecho original não existir mais.
 * `--fatia 0-10` roda um pedaço e acumula no JSON (a fatia 0 recomeça do zero).
 * Derivado de `mutar-pr2f.mjs`, com o mesmo timeout por mutante e a mesma nova tentativa.
 */

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const AG = 'src/ui/sons/agenda.ts';
const INT = 'scripts/sons/integrar-sons.ts';
const ESC = 'scripts/sons/escolhas.ts';

const MUTACOES = [
  // eventosDaCorrida
  ['largada-fora-do-zero', AG, "const ev: EventoSom[] = [{ cat: 'largada', carro: null, t: 0 }];", "const ev: EventoSom[] = [{ cat: 'largada', carro: null, t: 1 }];"],
  ['pistola-da-entrada', AG, "ev.push({ cat: 'pistola', carro: id, t: p.chegada, fim: p.partida })", "ev.push({ cat: 'pistola', carro: id, t: p.entrada, fim: p.partida })"],
  ['pistola-ate-o-retorno', AG, "ev.push({ cat: 'pistola', carro: id, t: p.chegada, fim: p.partida })", "ev.push({ cat: 'pistola', carro: id, t: p.chegada, fim: p.retorno })"],
  ['derrapagem-no-fim', AG, "ev.push({ cat: 'derrapagem', carro: id, t: x.inicio })", "ev.push({ cat: 'derrapagem', carro: id, t: x.fim })"],
  ['sem-abandono', AG, "if (a) ev.push({ cat: 'abandono', carro: id, t: a.instante });", ''],
  ['torcida-sem-guarda', AG, 'if (Number.isFinite(replay.bandeirada)) ev.push(', 'if (true) ev.push('],
  ['sem-desempate', AG, "a.t - b.t || ORDEM_CAT.indexOf(a.cat) - ORDEM_CAT.indexOf(b.cat) || porCodeUnit(a.carro ?? '', b.carro ?? '')", 'a.t - b.t'],
  ['desempate-por-collation', AG, 'const porCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);', 'const porCodeUnit = (a: string, b: string) => a.localeCompare(b);'],
  ['chuva-sem-spray', AG, "return chuva ? ['passagem', 'spray'] : ['passagem'];", "return ['passagem'];"],
  // foco e prioridade
  ['espectador-com-foco', AG, 'if (jogadorLocalId !== undefined) return jogadorLocalId;', 'if (jogadorLocalId) return jogadorLocalId;'],
  ['dois-humanos-com-foco', AG, 'return humanos.length === 1 ? humanos[0] : null;', 'return humanos[0] ?? null;'],
  ['online-todos-prioritarios', AG, 'if (jogadorLocalId !== undefined) return new Set([jogadorLocalId]);', ''],
  ['espectador-prioritario', AG, 'if (jogadorLocalId === null) return new Set();', ''],
  ['corrida-nao-prioritaria', AG, 'return evento.carro === null || prioritariosDoAparelho.has(evento.carro);', 'return evento.carro !== null && prioritariosDoAparelho.has(evento.carro);'],
  // ganho
  ['ganho-humano-atenuado', AG, 'if (ehPrioritario(evento, prioritariosDoAparelho)) return cat;', ''],
  ['humano-sem-ajuste', AG, 'if (ehPrioritario(evento, prioritariosDoAparelho)) return cat;', 'if (ehPrioritario(evento, prioritariosDoAparelho)) return 1;'],
  ['sem-fator-outros', AG, "const fator = evento.cat === 'passagem' || evento.cat === 'spray' ? 1 : FATOR_OUTROS_NAO_PASSAGEM;", 'const fator = 1;'],
  ['sem-foco-sem-ajuste', AG, 'return GANHO_SEM_FOCO * cat;', 'return GANHO_SEM_FOCO;'],
  ['ganho-sem-teto', AG, 'Math.max(GANHO_MIN, Math.min(GANHO_MAX_OUTROS, 1 - distancia / ALCANCE_U))', 'Math.max(GANHO_MIN, 1 - distancia / ALCANCE_U)'],
  ['ganho-sem-piso', AG, 'Math.max(GANHO_MIN, Math.min(GANHO_MAX_OUTROS, 1 - distancia / ALCANCE_U))', 'Math.min(GANHO_MAX_OUTROS, 1 - distancia / ALCANCE_U)'],
  // janela e salto
  ['salto-nunca', AG, 'if (deltaRealMs > DELTA_SALTO_MS) return [];', ''],
  ['salto-inclusivo', AG, 'if (deltaRealMs > DELTA_SALTO_MS) return [];', 'if (deltaRealMs >= DELTA_SALTO_MS) return [];'],
  ['janela-fechada-no-inicio', AG, 'e.t > deSim && e.t <= ateSim', 'e.t >= deSim && e.t <= ateSim'],
  ['janela-aberta-no-fim', AG, 'e.t > deSim && e.t <= ateSim', 'e.t > deSim && e.t < ateSim'],
  ['semente-no-zero', AG, 'export const SIM_ANTES_DA_LARGADA = -1;', 'export const SIM_ANTES_DA_LARGADA = 0;'],
  // duração
  ['derrapagem-por-escala', AG, '  derrapagem: DURACAO_EFEITO_MS,\n', ''],
  ['spray-por-escala', AG, "if (evento.cat === 'passagem' || evento.cat === 'spray' || evento.cat === 'largada') {", "if (evento.cat === 'passagem' || evento.cat === 'largada') {"],
  ['pistola-sem-escala', AG, 'const intervalo = Math.round(((evento.fim ?? evento.t) - evento.t) / escala);', 'const intervalo = Math.round((evento.fim ?? evento.t) - evento.t);'],
  ['torcida-sem-limite', AG, "return evento.cat === 'torcida' ? Math.min(intervalo, Math.round(CATALOGO_SONS.torcida.durS * 1000)) : intervalo;", 'return intervalo;'],
  // mixer
  ['duracao-nula-ocupa', AG, "if (durMs <= 0) return { estado: { ...estado, vozes }, decisao: { tipo: 'recusada' } };", ''],
  ['agrupa-prioritario', AG, 'if (!prioritario && ultima !== undefined && agoraMs - ultima < JANELA_AGRUPAR_MS)', 'if (ultima !== undefined && agoraMs - ultima < JANELA_AGRUPAR_MS)'],
  ['agrupa-inclusivo', AG, 'agoraMs - ultima < JANELA_AGRUPAR_MS', 'agoraMs - ultima <= JANELA_AGRUPAR_MS'],
  ['vozes-nao-expiram', AG, 'let vozes = estado.vozes.filter((v) => v.fim > agoraMs);', 'let vozes = [...estado.vozes];'],
  ['teto-maior', AG, 'if (vozes.length >= TETO_VOZES) {', 'if (vozes.length > TETO_VOZES) {'],
  ['rouba-igual', AG, 'if (prioridadeDe(v) >= minha) continue;', 'if (prioridadeDe(v) > minha) continue;'],
  ['rouba-a-mais-forte', AG, 'prioridadeDe(v) < prioridadeDe(alvo) ||', 'prioridadeDe(v) > prioridadeDe(alvo) ||'],
  ['rouba-a-mais-nova', AG, 'v.inicio < alvo.inicio', 'v.inicio > alvo.inicio'],
  ['sem-bonus', AG, '(v.prioritario ? BONUS_PRIORITARIO : 0)', '0'],
  ['absorvida-conta-como-ultima', AG, "return { estado: { ...estado, vozes }, decisao: { tipo: 'absorvida' } };", "return { estado: { ...estado, vozes, ultimaPorCategoria: { ...estado.ultimaPorCategoria, [cat]: agoraMs } }, decisao: { tipo: 'absorvida' } };"],
  ['nao-roubada-fica', AG, 'vozes = vozes.filter((v) => v.id !== roubada);', ''],
  // passagens
  ['foco-inativo-conta', AG, 'if (foco === null || !foco.ativo) return { estado: passagensVazias(), novas: [] };', 'if (foco === null) return { estado: passagensVazias(), novas: [] };'],
  ['sem-foco-mantem-estado', AG, 'if (foco === null || !foco.ativo) return { estado: passagensVazias(), novas: [] };', 'if (foco === null || !foco.ativo) return { estado, novas: [] };'],
  ['sem-histerese', AG, 'if (estava ? d < PERTO_U * HISTERESE : d < PERTO_U) perto.add(o.id);', 'if (d < PERTO_U) perto.add(o.id);'],
  ['redispara-dentro', AG, 'if (estava || d >= PERTO_U) continue;', 'if (d >= PERTO_U) continue;'],
  ['inativo-conta', AG, 'if (!o.ativo) continue;', ''],
  ['sem-previsao', AG, 'if (ate > 0 && ate <= HORIZONTE_REAL_MS * escala) tMinimo = tSim + ate;', ''],
  ['sem-horizonte', AG, 'if (ate > 0 && ate <= HORIZONTE_REAL_MS * escala)', 'if (ate > 0)'],
  ['previsao-para-tras', AG, 'if (ate > 0 && ate', 'if (ate !== 0 && ate'],
  ['anterior-velho-vale', AG, ' && tSim - a.t <= ANTERIOR_MAX_REAL_MS * escala', ''],
  // motor
  ['parado-com-motor', AG, 'if (velocidade < PARADO_U_S) return { taxa, ganhoMotor: 0, ganhoLenta: GANHO_LENTA };', ''],
  ['abandono-com-motor', AG, 'if (abandonou) return { taxa, ganhoMotor: 0, ganhoLenta: 0 };', ''],
  ['velref-zero-agudo', AG, 'const r = velRef > 0 ? Math.min(1, velocidade / velRef) : 0;', 'const r = velRef > 0 ? Math.min(1, velocidade / velRef) : 1;'],
  ['taxa-sem-teto', AG, 'Math.min(1, velocidade / velRef)', 'velocidade / velRef'],
  ['velocidade-em-ms', AG, 'Math.hypot(b.x - a.x, b.y - a.y) / (dtSimMs / 1000)', 'Math.hypot(b.x - a.x, b.y - a.y) / dtSimMs'],
  // escolha e integrador
  ['escolha-sem-reintegrar', ESC, "motor: 'motor-v3',", "motor: 'motor-v2',"],
  ['integrador-nao-limpa', INT, 'for (const f of readdirSync(PUBLICO)) rmSync(join(PUBLICO, f), { recursive: true });', ''],
];

const TESTES = ['src/ui/sons/agenda.test.ts', 'scripts/sons/catalogo.test.ts'];
const LIMITE_MS = 120_000;
/** O integrador só é exercido pela cerca do catálogo se rodar: o mutante dele roda o integrador antes. */
const RODA_INTEGRADOR = new Set(['integrador-nao-limpa']);

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

const JSON_SAIDA = 'docs/pr3a-mutacoes.json';
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
  // Um arquivo sobrando em public/sons/ é o que o integrador mutante deixaria passar.
  const sobra = 'public/sons/sobra-de-escolha-antiga.ogg';
  try {
    if (RODA_INTEGRADOR.has(nome)) {
      writeFileSync(sobra, 'x');
      const r = spawnSync('node', [arquivo], { stdio: 'ignore' });
      if (r.status !== 0) throw new Error(`integrador mutante caiu: ${nome}`);
    }
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
    if (RODA_INTEGRADOR.has(nome)) {
      // Restaura public/sons/ e o catálogo com o integrador original.
      spawnSync('node', [arquivo], { stdio: 'ignore' });
      spawnSync('npx', ['prettier', '--write', 'src/ui/sons/catalogo.ts'], { shell: true, stdio: 'ignore' });
    }
  }
  writeFileSync(JSON_SAIDA, `${JSON.stringify(resultado, null, 2)}\n`);
}
console.log(`${resultado.filter((m) => m.detectada).length}/${resultado.length} detectadas, ${resultado.filter((m) => m.travou).length} travaram, de ${MUTACOES.length}`);
