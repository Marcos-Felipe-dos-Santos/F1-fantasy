/**
 * Controle positivo do indicador de voz (`voz.ts`): fala sintética (filtro `flite` do ffmpeg)
 * misturada a trechos de motor em relações sinal-ruído decrescentes. Se o índice não sobe com a
 * fala por cima do motor, o indicador é cego e não serve para escolher trecho.
 *
 * Grava os números em `preview/sons/calibracao-voz.json`.
 *
 * Comando: node scripts/sons/calibrar-voz.ts [pasta dos originais]
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodificar, deDb, paraFloat, rms } from './audio.ts';
import { indiceDeVoz, LIMIAR_INDICE, TAXA_VOZ } from './voz.ts';

const ORIGINAIS = process.argv[2] ?? 'referencias/sons/originais';
const TEXTO =
  'And here comes the leader into the final corner. What a race this has been today, the crowd is on its feet. ' +
  'Box box, this lap, confirm. Copy that, we are checking the tyres now. The gap behind is two seconds, push now.';

function fala(): Float32Array {
  const r = spawnSync(
    'ffmpeg',
    ['-hide_banner', '-v', 'error', '-f', 'lavfi', '-i', `flite=text='${TEXTO}':voice=slt`, '-ac', '1', '-ar', String(TAXA_VOZ), '-f', 'f32le', '-'],
    { maxBuffer: 1 << 28 },
  );
  if (r.status !== 0) throw new Error(new TextDecoder().decode(r.stderr));
  return paraFloat(r.stdout);
}

function resumo(xs: number[]): string {
  const o = [...xs].sort((a, b) => a - b);
  const q = (p: number) => o[Math.min(o.length - 1, Math.floor(p * o.length))].toFixed(3);
  const acima = xs.filter((x) => x > LIMIAR_INDICE).length;
  return `p50 ${q(0.5)}  p90 ${q(0.9)}  max ${q(1)}  acima de ${LIMIAR_INDICE}: ${acima}/${xs.length}`;
}

const registro: Record<string, Record<string, string>> = {};
const voz = fala();
console.log(`fala sintética: ${(voz.length / TAXA_VOZ).toFixed(1)} s`);
registro['só a fala'] = { fala: resumo(indiceDeVoz(voz).map((j) => j.indice)) };
console.log(`  só a fala                 ${registro['só a fala'].fala}`);

const bases: [string, number][] = [
  ['Marcha lenta.wav', 30],
  ['150337__ears68__f1practice3melbgp2012dr066.wav', 10],
  ['Seu carro e passagens 1.wav', 40],
  ['Chuva 1.wav', 10],
];
for (const [arquivo, de] of bases) {
  const motor = decodificar(join(ORIGINAIS, arquivo), TAXA_VOZ, 1, { de, dur: voz.length / TAXA_VOZ });
  const n = Math.min(motor.length, voz.length);
  const linha: Record<string, string> = { 'só o fundo': resumo(indiceDeVoz(motor.subarray(0, n)).map((j) => j.indice)) };
  registro[`${arquivo} @${de}s`] = linha;
  console.log(`\n${arquivo} @${de}s`);
  console.log(`  só o fundo                ${linha['só o fundo']}`);
  for (const snr of [0, -6, -12, -18]) {
    // Fala `snr` dB em RMS relativo ao fundo.
    const g = (rms(motor, 0, n) / rms(voz, 0, n)) * deDb(snr);
    const mix = new Float32Array(n);
    for (let i = 0; i < n; i++) mix[i] = motor[i] + voz[i] * g;
    linha[`fala a ${snr} dB`] = resumo(indiceDeVoz(mix).map((j) => j.indice));
    console.log(`  fala a ${String(snr).padStart(3)} dB do fundo   ${linha[`fala a ${snr} dB`]}`);
  }
}
mkdirSync('preview/sons', { recursive: true });
writeFileSync('preview/sons/calibracao-voz.json', JSON.stringify({ geradoPor: 'scripts/sons/calibrar-voz.ts', limiar: LIMIAR_INDICE, registro }, null, 1));
