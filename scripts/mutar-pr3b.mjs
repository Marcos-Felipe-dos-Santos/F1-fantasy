/**
 * Mutações do PR 3b (o som toca no jogo): aplica cada uma, roda os testes dos sons e restaura o arquivo.
 * Sobrevivente = o teste não afirma o que diz. Comando: node scripts/mutar-pr3b.mjs
 * Grava `docs/pr3b-mutacoes.json`. Aborta se o trecho original não existir mais.
 * `--fatia 0-10` roda um pedaço e acumula no JSON (a fatia 0 recomeça do zero).
 * Derivado de `mutar-pr3a.mjs`, com o mesmo timeout por mutante e a mesma nova tentativa.
 */

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CT = 'src/ui/sons/controlador.ts';
const AU = 'src/ui/sons/audio.ts';
const PR = 'src/ui/sons/preferencia-som.ts';
const HK = 'src/ui/sons/useSomDaCorrida.ts';
const TC = 'src/ui/TelaCorrida.tsx';
const CS = 'src/ui/sons/ControleSom.tsx';

const MUTACOES = [
  // relógio, antecedência e saltos (obrigações do 3a)
  ['parte-de-zero', CT, 'private deSim = SIM_ANTES_DA_LARGADA;', 'private deSim = 0;'],
  ['sem-antecedencia', CT, 'const ate = q.tSim + ANTECEDENCIA_S * 1000 * q.escala;', 'const ate = q.tSim;'],
  ['antecedencia-sem-escala', CT, 'const ate = q.tSim + ANTECEDENCIA_S * 1000 * q.escala;', 'const ate = q.tSim + ANTECEDENCIA_S * 1000;'],
  ['salto-real-ignorado', CT, ': q.deltaRealMs > DELTA_SALTO_MS ||', ': false ||'],
  ['salto-simulado-ignorado', CT, '          Math.abs(q.tSim - anterior.tSim - q.deltaRealMs * q.escala) > DELTA_SALTO_MS * q.escala;', '          false;'],
  ['primeira-no-meio-soa', CT, '? q.tSim > 0', '? false'],
  ['salto-nao-repassado', CT, 'saltou ? Infinity : q.deltaRealMs,', 'q.deltaRealMs,'],
  ['nao-avanca-janela', CT, '    this.deSim = ate;\n', ''],
  ['encerrado-segue-tocando', CT, '    if (this.encerrado) return;\n    const agora', '    const agora'],
  ['encerrar-sem-vozes', CT, 'for (const h of [...loops, ...this.vozes.values()])', 'for (const h of [...loops])'],
  ['encerrar-sem-loops', CT, 'for (const h of [...loops, ...this.vozes.values()])', 'for (const h of [...this.vozes.values()])'],
  // categorias
  ['pico-ignorado', CT, 'noEvento - (som.picoEmS ?? 0)', 'noEvento'],
  ['sem-fade-no-fim', CT, 'fim: fade === undefined ? undefined : { emS: inicioS + durMs / 1000, fadeS: fade },', 'fim: undefined,'],
  ['fim-sem-duracao', CT, '{ emS: inicioS + durMs / 1000, fadeS: fade }', '{ emS: inicioS, fadeS: fade }'],
  ['problema-sem-fade', CT, '  problema: FADE_EVENTO_S,\n', ''],
  ['pistola-sem-laco', CT, "laco: e.cat === 'pistola',", 'laco: false,'],
  ['torcida-fade-curto', CT, '  torcida: FADE_TORCIDA_S,', '  torcida: FADE_EVENTO_S,'],
  ['roubo-nao-para', CT, '      if (h !== undefined) this.saida.parar(h, FADE_ROUBO_S);', ''],
  ['sem-distancia', CT, 'const distancia = carro === undefined ? null : distanciaAoMaisProximo(carro.ponto, referencias);', 'const distancia = null;'],
  ['referencias-todos', CT, 'const referencias = [...this.prioritarios].flatMap((id) => {', 'const referencias = [...porId.keys()].flatMap((id) => {'],
  ['referencia-no-box', CT, 'return c !== undefined && c.naPista && !c.abandonou ? [c.ponto] : [];', 'return c !== undefined ? [c.ponto] : [];'],
  ['sem-prioridade', CT, 'const prioritario = ehPrioritario(e, this.prioritarios);', 'const prioritario = false;'],
  ['velocidade-fixa', CT, 'const som = somDaCategoria(e.cat, q.velocidade);', "const som = somDaCategoria(e.cat, 'media');"],
  // ambiente e motor
  ['sem-chuva', CT, 'chuva: this.corrida.chuva ? laco(CATALOGO_SONS.chuva, GANHO_CHUVA) : null,', 'chuva: null,'],
  ['chuva-sempre', CT, 'chuva: this.corrida.chuva ? laco(CATALOGO_SONS.chuva, GANHO_CHUVA) : null,', 'chuva: laco(CATALOGO_SONS.chuva, GANHO_CHUVA),'],
  ['pelotao-mudo', CT, 'pelotao: laco(CATALOGO_SONS.pelotao, GANHO_PELOTAO),', 'pelotao: laco(CATALOGO_SONS.pelotao, null),'],
  ['motor-sem-foco', CT, 'motor: this.foco === null ? null : laco(CATALOGO_SONS.motor, null),', 'motor: laco(CATALOGO_SONS.motor, null),'],
  ['vel-entre-quadros-errada', CT, 'velocidadeEntre(anterior.focoPonto, carro.ponto, q.tSim - anterior.tSim)', 'velocidadeEntre(anterior.focoPonto, carro.ponto, q.deltaRealMs)'],
  ['motor-ignora-abandono', CT, '      carro.abandonou,\n    );', '      false,\n    );'],
  ['lenta-nao-ajusta', CT, '    this.saida.ajustar(this.loops.lenta, { ganho: ganhoLenta }, SUAVIZAR_MOTOR_S);\n', ''],
  ['velref-corrente', CT, 'this.corrida.velRef,', 'Math.max(1, this.velFoco),'],
  // passagens
  ['foco-no-box-ativo', CT, 'ativo: c.naPista && !c.parado && !c.abandonou', 'ativo: !c.parado && !c.abandonou'],
  ['foco-parado-ativo', CT, 'ativo: c.naPista && !c.parado && !c.abandonou', 'ativo: c.naPista && !c.abandonou'],
  ['passagem-sem-spray', CT, 'for (const cat of sonsDaPassagem(this.corrida.chuva)) {', "for (const cat of ['passagem'] as const) {"],
  ['passagem-no-salto', CT, '    if (saltou) return;\n    for (const p of novas)', '    for (const p of novas)'],
  ['passagem-humanos-todos', CT, 'const humanos = [...this.prioritarios].flatMap((id) => {', 'const humanos = this.corrida.humanos.flatMap((id) => {'],
  // velRef
  ['velref-sem-cache', CT, '  if (salvo !== undefined) return salvo;\n', ''],
  ['velref-so-largada', CT, 't <= replay.fim;', 't <= Math.min(replay.fim, 1000);'],
  // audio.ts
  ['sem-compressor-limiar', AU, 'compressor.threshold.value = LIMIAR_COMPRESSOR_DB;', ''],
  ['sem-compressor-razao', AU, 'compressor.ratio.value = RAZAO_COMPRESSOR;', ''],
  ['mestre-fora-do-compressor', AU, 'mestre.connect(compressor);', 'mestre.connect(ctx.destination);'],
  ['sem-laco', AU, 'if (p.laco && p.som.laco) {', 'if (false) {'],
  ['sem-taxa', AU, 'if (p.taxa !== undefined) src.playbackRate.value = p.taxa;', ''],
  ['sem-rampa-final', AU, 'g.gain.linearRampToValueAtTime(0, p.fim.emS + p.fim.fadeS);', ''],
  ['agendado-nao-desliga', AU, 'if (f.inicioS > agora) {', 'if (false) {'],
  ['parar-sem-stop', AU, 'f.src.stop(agora + fadeS * CONSTANTES_ATE_PARAR);', ''],
  ['carrega-duas-vezes', AU, 'carregando ??= Promise.all(', 'carregando = Promise.all('],
  ['falha-derruba', AU, "falhas.push({ arquivo, erro: e instanceof Error ? e.message : String(e) });", 'throw e;'],
  ['gesto-nao-retoma', AU, 'void ctx.resume().then(() => {', 'void Promise.resolve().then(() => {'],
  ['visivel-sempre-retoma', AU, '} else if (desbloqueado) {', '} else {'],
  ['oculta-nao-suspende', AU, "if (ctx.state === 'running') void ctx.suspend();", ''],
  ['url-sem-barra', AU, 'await amb.buscar(`/${arquivo}`)', 'await amb.buscar(arquivo)'],
  ['tocadas-sem-contar', AU, 'tocadas: proximo - 1,', 'tocadas: 0,'],
  ['volume-ignorado', AU, 'mestre.gain.setTargetAtTime(ganho, ctx.currentTime, SUAVIZAR_VOLUME_S);', ''],
  // preferência
  ['volume-padrao-cheio', PR, 'export const VOLUME_PADRAO = 0.8;', 'export const VOLUME_PADRAO = 1;'],
  ['volume-sem-teto', PR, 'v >= 0 && v <= 1 ? v : VOLUME_PADRAO', 'v >= 0 ? v : VOLUME_PADRAO'],
  ['volume-aceita-qualquer', PR, 'DECIMAL.test(bruto) ? Number(bruto) : NaN', 'Number(bruto)'],
  ['mudo-padrao', PR, "const mudo = armazenamento?.getItem(CHAVE_MUDO) === '1';", "const mudo = armazenamento?.getItem(CHAVE_MUDO) !== '0';"],
  ['mudo-nao-zera', PR, 'return pref.mudo ? 0 : pref.volume;', 'return pref.volume;'],
  // ligação
  ['hook-nao-encerra', HK, '      c.encerrar();\n', ''],
  ['carros-sempre-na-pista', TC, 'naPista: p.fracaoNaPista !== null,', 'naPista: true,'],
  ['controle-some-sem-audio', CS, "const rotulo = !disponivel\n", "if (!disponivel) return null;\n  const rotulo = !disponivel\n"],
];

const TESTES = [
  'src/ui/sons/controlador.test.ts',
  'src/ui/sons/controlador-cache.test.ts',
  'src/ui/sons/audio.test.ts',
  'src/ui/sons/preferencia-som.test.ts',
  'src/ui/sons/som-na-tela.test.ts',
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

// Todos os trechos existem antes de mexer em qualquer arquivo.
for (const [nome, arquivo, de] of MUTACOES) {
  if (!readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n').includes(de)) throw new Error(`trecho não encontrado: ${nome}`);
}
const controle = await rodar();
if (controle.status !== 0 || controle.estourou) throw new Error('controle sem mutação não passou: nada a medir');

const JSON_SAIDA = 'docs/pr3b-mutacoes.json';
const indiceFatia = process.argv.indexOf('--fatia');
const [de_, ate_] = indiceFatia === -1 ? [0, MUTACOES.length] : process.argv[indiceFatia + 1].split('-').map(Number);
const resultado = de_ === 0 ? [] : JSON.parse(readFileSync(JSON_SAIDA, 'utf8'));
for (const [nome, arquivo, de, para] of MUTACOES.slice(de_, ate_)) {
  const cru = readFileSync(arquivo, 'utf8');
  const crlf = cru.includes('\r\n');
  const original = crlf ? cru.replace(/\r\n/g, '\n') : cru;
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
