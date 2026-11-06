/**
 * Indicador HEURÍSTICO de fala no fundo de uma gravação. Ninguém aqui ouve o áudio, então o
 * script mede o que a fala tem e um motor não tem, e devolve um índice por janela de 1 s. O
 * índice só aponta onde ouvir: quem decide se há voz é o ouvido do Marcos.
 *
 * O que separa os dois, medido no controle positivo (`calibrar-voz.ts`): motor também é
 * periódico na faixa da voz (85–350 Hz), mas CONTÍNUO, por segundos; a fala é periódica em
 * RAJADAS de sílaba (60–400 ms) separadas por consoantes e pausas. Duas tentativas reprovadas no
 * controle, registradas para não voltarem: exigir 40% da energia em 300–3400 Hz (a fala
 * sintética tem a fundamental dominante e ficou com 2–30%) e janelar com Hann antes da
 * autocorrelação (achata o pico em ~25% e derrubou a fala abaixo do limiar).
 *
 * Por quadro de 32 ms (16 kHz, passo de 16 ms): autocorrelação normalizada, sem janela, com
 * pico > `LIMIAR_VOZEADO` num período de 85 a 350 Hz, e energia a menos de 30 dB do quadro mais
 * forte da janela. Por janela de 1 s: índice = fração dos quadros que estão em rajadas vozeadas
 * de 4 a 25 quadros (64–400 ms), exigidas ao menos duas rajadas.
 *
 * ⚠️ Limites medidos no controle (2026-11-06, `preview/sons/calibracao-voz.json`): a fala sintética
 * sozinha passa do limiar em 13 de 25 janelas; misturada 6 dB abaixo do fundo, só é vista sobre a
 * marcha lenta (5/25), e some sobre passagem (641155) e chuva (200272); a 12 dB abaixo, some nos
 * três. Sobre o 150337 o fundo SOZINHO já acusa 8 de 25 janelas, então ali o índice não separa
 * fala de motor. E acusa em quase toda a gravação de um motor morrendo (852408: 75 de 86
 * janelas): explosões espaçadas têm a forma de sílaba. Ali o índice provavelmente é falso
 * positivo, mas isso é hipótese, não medida. Serve para apontar onde ouvir, não para provar.
 */

export const TAXA_VOZ = 16000;
const QUADRO = 512;
const PASSO = 256;
const LIMIAR_VOZEADO = 0.5;
const RAJADA_MIN = 4;
const RAJADA_MAX = 25;
export const LIMIAR_INDICE = 0.2;

interface Quadro {
  energia: number;
  periodicidade: number;
}

function quadros(x: Float32Array): Quadro[] {
  const out: Quadro[] = [];
  const lagMin = Math.floor(TAXA_VOZ / 350);
  const lagMax = Math.ceil(TAXA_VOZ / 85);
  for (let ini = 0; ini + QUADRO <= x.length; ini += PASSO) {
    let r0 = 0;
    for (let i = 0; i < QUADRO; i++) r0 += x[ini + i] * x[ini + i];
    let melhor = 0;
    if (r0 > 1e-10) {
      // Em passos de 2 amostras: a 16 kHz o pico de 85–350 Hz tem largura bem maior que isso.
      for (let l = lagMin; l <= lagMax; l += 2) {
        let s = 0;
        for (let i = 0; i < QUADRO - l; i++) s += x[ini + i] * x[ini + i + l];
        if (s > melhor) melhor = s;
      }
      melhor /= r0;
    }
    out.push({ energia: r0, periodicidade: melhor });
  }
  return out;
}

export interface JanelaVoz {
  t: number;
  indice: number;
  rajadas: number;
  fracContinua: number;
}

/** Índice por janela de 1 s, passo de 0,5 s. `x` é mono a `TAXA_VOZ`. */
export function indiceDeVoz(x: Float32Array): JanelaVoz[] {
  const q = quadros(x);
  const qps = TAXA_VOZ / PASSO;
  const jan = 64;
  const out: JanelaVoz[] = [];
  for (let ini = 0; ini + jan <= q.length; ini += 32) {
    const trecho = q.slice(ini, ini + jan);
    const topo = Math.max(...trecho.map((f) => f.energia));
    const v = trecho.map((f) => f.periodicidade > LIMIAR_VOZEADO && f.energia > topo * 1e-3);
    let emRajada = 0;
    let rajadas = 0;
    let continua = 0;
    for (let i = 0; i < jan; ) {
      if (!v[i]) {
        i++;
        continue;
      }
      let j = i;
      while (j < jan && v[j]) j++;
      const len = j - i;
      // Rajada que encosta na borda da janela pode ser pedaço de algo contínuo: não conta.
      const inteira = i > 0 && j < jan;
      if (inteira && len >= RAJADA_MIN && len <= RAJADA_MAX) {
        emRajada += len;
        rajadas++;
      } else if (len > RAJADA_MAX) continua += len;
      i = j;
    }
    out.push({ t: ini / qps, indice: rajadas >= 2 ? emRajada / jan : 0, rajadas, fracContinua: continua / jan });
  }
  return out;
}

/** Maior índice entre `de` e `ate` (s). */
export function vozNoTrecho(janelas: readonly JanelaVoz[], de: number, ate: number): number {
  let m = 0;
  for (const j of janelas) if (j.t + 1 > de && j.t < ate) m = Math.max(m, j.indice);
  return m;
}
