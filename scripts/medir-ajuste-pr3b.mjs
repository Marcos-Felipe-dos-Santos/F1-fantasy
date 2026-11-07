/** Diagnóstico reproduzível: Ogg decodificado a 48 kHz mono; níveis antes do compressor.
 * node scripts/medir-ajuste-pr3b.mjs
 * Não mede percepção, true peak nem a thread de áudio. O teto é conservador, não um mix renderizado.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const db = (v) => 20 * Math.log10(v);
const arred = (v) => Number(v.toFixed(4));
const fonte = readFileSync('src/ui/sons/agenda.ts', 'utf8');
const ganhoDepois = Number(fonte.match(/export const GANHO_MOTOR = ([\d.]+);/)[1]);
const niveis = {};
let motor;
for (const arquivo of readdirSync('public/sons').filter((f) => f.endsWith('.ogg')).sort()) {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', `public/sons/${arquivo}`, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 10000000 });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(String(r.stderr));
  const x = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  let soma = 0; let pico = 0;
  for (const v of x) { soma += v * v; pico = Math.max(pico, Math.abs(v)); }
  niveis[arquivo] = { pico: arred(pico), picoDbfs: arred(db(pico)), rmsDbfs: arred(db(Math.sqrt(soma / x.length))) };
  if (arquivo === 'motor.ogg') motor = x;
}
const envelope = [];
for (let i = 0; i < 20; i++) {
  let soma = 0;
  for (let j = i * 4800; j < (i + 1) * 4800; j++) soma += motor[j] ** 2;
  envelope.push(arred(db(Math.sqrt(soma / 4800))));
}
let maiorSalto = 0;
for (let i = 1; i < 96000; i++) maiorSalto = Math.max(maiorSalto, Math.abs(motor[i] - motor[i - 1]));
const cenarios = [0.55, ganhoDepois].map((ganhoMotor) => {
  // Mesmo somando motor e lenta cheios (pior que a alternância real), não há clipping destes laços.
  const tetoMotores = niveis['motor.ogg'].pico * ganhoMotor + niveis['lenta.ogg'].pico * 0.5 + niveis['pelotao.ogg'].pico * 0.22;
  return {
    ganhoMotor,
    motorRmsPosGanhoDbfs: arred(niveis['motor.ogg'].rmsDbfs + db(ganhoMotor)),
    motorPicoPosGanhoDbfs: arred(niveis['motor.ogg'].picoDbfs + db(ganhoMotor)),
    diferencaRmsMotorPelotaoDb: arred(niveis['motor.ogg'].rmsDbfs + db(ganhoMotor) - niveis['pelotao.ogg'].rmsDbfs - db(0.22)),
    tetoConservadorMotores: arred(tetoMotores),
    tetoConservadorMotoresDbfs: arred(db(tetoMotores)),
    tetoComChuvaDbfs: arred(db(tetoMotores + niveis['chuva.ogg'].pico * 0.3)),
  };
});
const relatorio = {
  metodo: 'ffmpeg f32le mono 48000 Hz; RMS e pico de amostra de todo arquivo; antes do mestre e compressor; ganho anterior 0.55 do HEAD anterior ao ajuste, atual lido de agenda.ts',
  carros: 22,
  vozesDeMotor: '1 foco + 1 marcha lenta alternados, 1 pelotão; não 22 fontes individuais',
  mestrePadrao: 0.8,
  niveis,
  motor: { lacoS: 2, saltoEmenda: arred(Math.abs(motor[95999] - motor[0])), maiorSaltoInterno: arred(maiorSalto), envelope100msDbfs: envelope, variacaoEnvelopeDb: arred(Math.max(...envelope) - Math.min(...envelope)) },
  cenarios,
  limites: 'Não é render do mix de eventos nem medição de saída pós-compressor; não conclui ausência de clipping global. O limite dos laços soma picos absolutos e inclui motor+lenta cheios simultaneamente, hipótese mais conservadora que a alternância real. Audibilidade depende do veredito do Marcos.',
};
writeFileSync('docs/pr3b-ajuste-audio.json', `${JSON.stringify(relatorio, null, 2)}\n`);
console.log(JSON.stringify({ cenarios, motor: relatorio.motor }, null, 2));
