/** Mutação restrita ao ajuste de ouvido. Exige implementação commitada, timeout por mutante.
 * node scripts/mutar-ajuste-pr3b.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CT = 'src/ui/sons/controlador.ts';
const AG = 'src/ui/sons/agenda.ts';
const HK = 'src/ui/sons/useSomDaCorrida.ts';
const TC = 'src/ui/TelaCorrida.tsx';
const mutacoes = [
  ['motor-sem-pausa', CT, 'ganho: ganhoMotor * envelopeMotor', 'ganho: ganhoMotor'],
  ['motor-ciclo-curto', CT, '% 6;', '% 3;'],
  ['motor-sem-fade-saida', CT, '(3 - faseMotor) / 0.5', '1'],
  ['motor-alto', AG, 'GANHO_MOTOR = 0.15;', 'GANHO_MOTOR = 0.55;'],
  ['motor-mudo', AG, 'GANHO_MOTOR = 0.15;', 'GANHO_MOTOR = 0;'],
  ['tom-rapido', CT, 'TAXA_MOTOR_POR_S = 0.5;', 'TAXA_MOTOR_POR_S = 5;'],
  ['tom-congelado', CT, 'TAXA_MOTOR_POR_S = 0.5;', 'TAXA_MOTOR_POR_S = 0;'],
  ['pausa-sem-limite', CT, 'DELTA_MOTOR_MAX_MS = 100;', 'DELTA_MOTOR_MAX_MS = 5000;'],
  ['inicio-tom-alto', CT, 'TAXA_MOTOR_INICIAL = 0.6;', 'TAXA_MOTOR_INICIAL = 1;'],
  ['sem-taxa-inicial-fonte', CT, 'laco(CATALOGO_SONS.motor, null, TAXA_MOTOR_INICIAL)', 'laco(CATALOGO_SONS.motor, null)'],
  ['torcida-fade-curto', CT, 'FADE_TORCIDA_S = 2.5;', 'FADE_TORCIDA_S = 0.6;'],
  ['torcida-sem-reserva', CT, 'som.durS - FADE_TORCIDA_S', 'som.durS'],
  ['sem-handle-torcida', CT, "if (e.cat === 'torcida' && h !== SEM_SOM)", 'if (false)'],
  ['cleanup-corta-torcida', HK, 'c.encerrar(true);', 'c.encerrar();'],
  ['manual-preserva-torcida', HK, 'return () => controlador.current?.encerrar();', 'return () => controlador.current?.encerrar(true);'],
  ['botao-nao-cala', TC, 'encerrarSom();', '/* mutante: não cala */'],
];
const arquivos = [...new Set(mutacoes.map((m) => m[1]))];
const git = spawnSync('git', ['diff', 'HEAD', '--exit-code', '--', ...arquivos], { encoding: 'utf8' });
if (git.error) throw git.error;
if (git.status !== 0) throw new Error('commite a implementação antes de mutar');
for (const [nome, arquivo, de] of mutacoes) {
  const texto = readFileSync(arquivo, 'utf8');
  if (texto.split(de).length !== 2) throw new Error(`trecho ausente ou ambíguo: ${nome}`);
}
const timeoutMs = 120000;
const rodar = () => new Promise((ok, erro) => {
  const p = spawn(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', 'src/ui/sons/agenda.test.ts', 'src/ui/sons/controlador.test.ts', 'src/ui/sons/som-na-tela.test.ts'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let texto = ''; let timeout = false;
  p.stdout.on('data', (b) => texto += b);
  p.stderr.on('data', (b) => texto += b);
  const timer = setTimeout(() => {
    timeout = true;
    if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F']);
    else p.kill('SIGKILL');
  }, timeoutMs);
  p.on('error', (e) => { clearTimeout(timer); erro(e); });
  p.on('close', (status) => { clearTimeout(timer); ok({ status, timeout, texto: texto.replace(/\x1b\[[0-9;]*m/g, '') }); });
});
const controle = await rodar();
if (controle.status !== 0 || controle.timeout) throw new Error(`controle falhou: ${controle.texto}`);
const resultados = [];
for (const [nome, arquivo, de, para] of mutacoes) {
  const original = readFileSync(arquivo, 'utf8');
  try {
    writeFileSync(arquivo, original.replace(de, para));
    const r = await rodar();
    const falha = r.texto.match(/FAIL\s+([^\n]+)/)?.[1] ?? null;
    if (!r.timeout && r.status !== 0 && falha === null) throw new Error(`falha de infraestrutura em ${nome}: ${r.texto}`);
    resultados.push({ nome, detectada: r.status !== 0 && falha !== null && !r.timeout, timeout: r.timeout, falha });
    console.log(JSON.stringify(resultados.at(-1)));
  } finally { writeFileSync(arquivo, original); }
  writeFileSync('docs/pr3b-ajuste-mutacoes.json', `${JSON.stringify({ timeoutMs, resultados }, null, 2)}\n`);
}
if (resultados.some((r) => !r.detectada)) process.exitCode = 1;
