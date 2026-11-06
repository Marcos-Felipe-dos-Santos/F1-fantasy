/**
 * Utilitários de áudio do tratamento dos sons do PR 3: o ffmpeg decodifica e codifica, e o resto
 * (medida, laço sem emenda, fade, normalização) é feito aqui, em amostras float, para que cada
 * número do manifesto saia de código lido, não de um filtro opaco.
 *
 * O ffmpeg é chamado SEMPRE com vetor de argumentos (`spawnSync`, sem shell): os nomes dos
 * originais têm espaço e acento ("Falha mecânica (DNF) 1.wav").
 */

import { spawnSync } from 'node:child_process';

const MAX_BUFFER = 1024 * 1024 * 1024;

function ffmpeg(args: string[], entrada?: Uint8Array): Uint8Array {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-v', 'error', ...args], { input: entrada, maxBuffer: MAX_BUFFER });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`ffmpeg ${args.join(' ')}\n${new TextDecoder().decode(r.stderr)}`);
  return r.stdout;
}

export function versaoFfmpeg(): string {
  const r = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg não encontrado no PATH');
  return r.stdout.split('\n')[0].trim();
}

export function paraFloat(b: Uint8Array): Float32Array {
  const copia = new ArrayBuffer(b.length);
  new Uint8Array(copia).set(b);
  return new Float32Array(copia);
}

export interface Trecho {
  /** Início, em s, no original. */
  de?: number;
  /** Duração, em s. */
  dur?: number;
}

/** Decodifica para float intercalado. `filtro` é uma cadeia `-af` do ffmpeg (passa-alta, EQ...). */
export function decodificar(arquivo: string, taxa: number, canais: 1 | 2, trecho: Trecho = {}, filtro?: string): Float32Array {
  const args: string[] = [];
  if (trecho.de !== undefined) args.push('-ss', trecho.de.toFixed(4));
  if (trecho.dur !== undefined) args.push('-t', trecho.dur.toFixed(4));
  args.push('-i', arquivo);
  if (filtro) args.push('-af', filtro);
  args.push('-ac', String(canais), '-ar', String(taxa), '-f', 'f32le', '-');
  return paraFloat(ffmpeg(args));
}

/** Separa um estéreo intercalado. */
export function canais(x: Float32Array): [Float32Array, Float32Array] {
  const n = x.length / 2;
  const l = new Float32Array(n);
  const r = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    l[i] = x[2 * i];
    r[i] = x[2 * i + 1];
  }
  return [l, r];
}

/** Codifica mono float em Ogg Vorbis. */
export function codificarOgg(x: Float32Array, taxa: number, saida: string, qualidade: number): void {
  ffmpeg(
    // Serial fixo e bitexact: sem isso o muxer Ogg sorteia o número de série do fluxo e o mesmo
    // áudio sai com bytes diferentes a cada rodada (medido: os hashes mudavam).
    ['-y', '-f', 'f32le', '-ar', String(taxa), '-ac', '1', '-i', '-', '-c:a', 'libvorbis', '-q:a', String(qualidade), '-fflags', '+bitexact', '-flags:a', '+bitexact', '-serial_offset', '1', saida],
    new Uint8Array(x.buffer, x.byteOffset, x.byteLength),
  );
}

export function rms(x: Float32Array, de = 0, ate = x.length): number {
  let s = 0;
  for (let i = de; i < ate; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, ate - de));
}

export function pico(x: Float32Array): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) p = Math.max(p, Math.abs(x[i]));
  return p;
}

export const db = (v: number): number => (v > 0 ? 20 * Math.log10(v) : -Infinity);
export const deDb = (d: number): number => Math.pow(10, d / 20);

/** Envelope RMS em janelas de `janelaS` (dB). */
export function envelopeDb(x: Float32Array, taxa: number, janelaS: number): number[] {
  const n = Math.max(1, Math.round(janelaS * taxa));
  const out: number[] = [];
  for (let i = 0; i + n <= x.length; i += n) out.push(db(rms(x, i, i + n)));
  return out;
}

/**
 * Laço sem emenda: o trecho tem `n + cruz` amostras; a cauda (depois de `n`) é misturada em
 * potência constante sobre a cabeça, e o resultado tem `n` amostras. Tocado em laço, a
 * amostra `n-1` emenda na `0` exatamente onde o original continuava.
 */
export function lacoSemEmenda(x: Float32Array, cruz: number): Float32Array {
  const n = x.length - cruz;
  if (n <= cruz) throw new Error('trecho curto demais para o cruzamento');
  const y = x.slice(0, n);
  for (let i = 0; i < cruz; i++) {
    const t = (i + 0.5) / cruz;
    y[i] = x[i] * Math.sin((t * Math.PI) / 2) + x[n + i] * Math.cos((t * Math.PI) / 2);
  }
  return y;
}

/** Fade de entrada e saída (meio cosseno), em amostras. */
export function fades(x: Float32Array, entrada: number, saida: number): Float32Array {
  const y = x.slice();
  for (let i = 0; i < entrada && i < y.length; i++) y[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / entrada);
  for (let i = 0; i < saida && i < y.length; i++) y[y.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / saida);
  return y;
}

/**
 * Normalização por RMS das janelas ativas (acima de `pisoDb` abaixo do pico do envelope), com
 * teto de pico. Volta o ganho aplicado e se o teto mandou.
 */
export function normalizar(x: Float32Array, taxa: number, alvoRmsDb: number, tetoPicoDb: number): { y: Float32Array; ganhoDb: number; limitadoPorPico: boolean; rmsAtivoDb: number } {
  const env = envelopeDb(x, taxa, 0.05);
  const topo = Math.max(...env);
  const ativas = env.filter((e) => e > topo - 20);
  const rmsAtivo = Math.sqrt(ativas.reduce((s, e) => s + deDb(e) ** 2, 0) / Math.max(1, ativas.length));
  let ganho = alvoRmsDb - db(rmsAtivo);
  const p = db(pico(x));
  let limitado = false;
  if (p + ganho > tetoPicoDb) {
    ganho = tetoPicoDb - p;
    limitado = true;
  }
  const g = deDb(ganho);
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * g;
  return { y, ganhoDb: ganho, limitadoPorPico: limitado, rmsAtivoDb: db(rmsAtivo) + ganho };
}

/**
 * Medida do clique na emenda do laço: o sinal é tocado duas vezes em sequência e passado por
 * um passa-alta de 1ª ordem (diferença); compara o maior salto em ±2 ms da emenda com o
 * percentil 99,9 do mesmo sinal no resto. Razão perto de 1 = emenda indistinguível do corpo.
 */
export function cliqueNaEmenda(x: Float32Array, taxa: number): number {
  const d = (i: number) => Math.abs(x[(i + 1) % x.length] - x[i % x.length]);
  const viz = Math.round(0.002 * taxa);
  let naEmenda = 0;
  for (let i = x.length - viz; i < x.length + viz; i++) naEmenda = Math.max(naEmenda, d(i));
  const corpo: number[] = [];
  for (let i = viz; i < x.length - viz - 1; i++) corpo.push(d(i));
  corpo.sort((a, b) => a - b);
  const p999 = corpo[Math.floor(corpo.length * 0.999)] || 1e-9;
  return naEmenda / p999;
}

// ---------------------------------------------------------------- FFT (radix 2, in-place)

export function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}
