/**
 * Tratamento dos sons do PR 3, reproduzível a partir dos originais CC0 do Freesound
 * (`referencias/sons/originais/`, fora do git; origem e licença em `THIRD_PARTY_NOTICES.md`).
 *
 * Cada som final é uma linha da tabela `SONS`: de que original sai, como o trecho é escolhido
 * (critério MEDIDO, não ouvido: ninguém aqui ouve), que filtros leva, e o que difere entre as
 * variações. A saída é `.ogg` mono em `preview/sons/`, mais `manifesto.json` com o MD5 de cada
 * original, a versão do ffmpeg, os parâmetros e cada número medido (voz, fase, emenda, ganho).
 *
 * TEMPO REAL DE CADA EVENTO, medido na cena real (`cena.preview.test.ts`, Mônaco seed 7112441)
 * e em 1000 corridas (`preview/pr3-medicao.json`), salvo onde diz "regra":
 * - incidente: `DURACAO_EFEITO_MS` = 700 ms reais em qualquer velocidade (decisão do Marcos, PR 2d);
 * - abandono: 900 ms (proposta de `medir-pr3`);
 * - pistola: do `chegada` ao `partida` da vaga, p50 de 1052 / 526 / 257 ms (lenta / média /
 *   rápida), mínimo de 118 ms. Duração variável: o arquivo é ataque + laço, e quem corta é o
 *   preview (para no `partida` com fade de 15 ms);
 * - torcida: da bandeirada ao fim do replay, até 10,4 / 5,2 / 2,6 s. O arquivo tem 10,5 s e o
 *   preview o encerra com fade no fim do replay;
 * - passagem: o episódio abaixo de 45 u (com histerese de 1,5×) dura p50 de 400 / 200 / 98 ms;
 *   o p90 (13,5 s na lenta) é carro andando junto, não passagem. O som tem max(300, 2 × p50)
 *   ms, com o pico de volume a 45% dele, alinhado à menor distância;
 * - largada: REGRA declarada, não medida: clamp(0,4 × ms por volta, 1,2 s, 3,5 s) = 3,5 / 1,8 /
 *   1,2 s.
 * Volume: cada som vai a -18 dBFS de RMS ativo com teto de pico de -1 dBFS; depois, dentro de cada
 * categoria, todas as variações descem ao RMS da mais baixa, para a comparação no ouvido não
 * premiar a mais alta.
 *
 * Comando: node scripts/sons/tratar-sons.ts [pasta dos originais] [pasta de saída]
 */

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  canais,
  cliqueNaEmenda,
  codificarOgg,
  db,
  decodificar,
  deDb,
  envelopeDb,
  fades,
  fft,
  lacoSemEmenda,
  normalizar,
  pico,
  rms,
  versaoFfmpeg,
} from './audio.ts';
import { indiceDeVoz, LIMIAR_INDICE, TAXA_VOZ, vozNoTrecho, type JanelaVoz } from './voz.ts';

const ORIGINAIS = process.argv[2] ?? 'referencias/sons/originais';
const SAIDA = process.argv[3] ?? 'preview/sons';
const TAXA = 44100;
const QUALIDADE_OGG = 4;
const ALVO_RMS_DB = -18;
const TETO_PICO_DB = -1;
/** Orçamento: ~10 MB de HTML, e base64 cresce 4/3. */
const ORCAMENTO_OGG_BYTES = 7_000_000;
const VELOCIDADES = ['lenta', 'media', 'rapida'] as const;
type Velocidade = (typeof VELOCIDADES)[number];
const PASSAGEM_MS: Record<Velocidade, number> = { lenta: 800, media: 400, rapida: 300 };
const LARGADA_MS: Record<Velocidade, number> = { lenta: 3500, media: 1800, rapida: 1200 };
const PICO_PASSAGEM = 0.45;

/** Duplicados registrados e NÃO usados (mesmo MD5 do 444877, decisão do Marcos). */
const DUPLICADOS = ['largada 1.wav', 'largada 2.wav'];

const F = {
  pratica: '150337__ears68__f1practice3melbgp2012dr066.wav',
  relargada: '150338__ears68__f-1-race-cars-restart-1stlap-turn11-dr081.wav',
  nordschleife: '350677__dominik_w__car-race-nordschleife-vln-several-cars-passing-by-tyre-squeal-02.wav',
  longBeach: '235261__josh-herman__long-beach-indy-car-2014-04-13.aiff',
  goodwood: '444877__richwise__goodwood-trackday-starts-2.wav',
  ar: 'Ar escapando ou fumaça.wav',
  torcida1: 'Bandeirada e torcida 1.wav',
  torcida2: 'Bandeirada e torcida 2.wav',
  torcida0: 'Bandeirada e torcida.wav',
  chuva1: 'Chuva 1.wav',
  chuva2: 'Chuva 2.mp3',
  dnf1: 'Falha mecânica (DNF) 1.wav',
  dnf2: 'Falha mecânica (DNF) 2.ogg',
  dnf3: 'Falha mecânica (DNF) 3.wav',
  lenta2: 'Marcha lenta 2.wav',
  lenta1: 'Marcha lenta.wav',
  pistola2: 'Pistola do pit 2.wav',
  pistola1: 'Pistola do pit.wav',
  pneu: 'Pneu derrapando.wav',
  saida: 'Saída de pista ou rodada.flac',
  passagens1: 'Seu carro e passagens 1.wav',
  passagens2: 'Seu carro e passagens 2.wav',
  passagens3: 'Seu carro e passagens 3.aiff',
  passagens4: 'Seu carro e passagens 4.aiff',
  passagens5: 'Seu carro e passagens 5.m4a',
  passagens6: 'Seu carro e passagens 6.wav',
  spray: 'Spray na chuva.wav',
} as const;

/** Número do Freesound e MD5 de cada original: conferidos pela duração, na página e no arquivo (ver NOTICES). */
const FREESOUND: Record<string, { id: number; md5: string }> = {
  [F.pratica]: { id: 150337, md5: 'a512e089b0fe7847ffcd50a5b1bcda2b' },
  [F.relargada]: { id: 150338, md5: '65ff58d044db293a4403312b92f11129' },
  [F.nordschleife]: { id: 350677, md5: 'ec795b28eb5debc64a5f62a7c575ff7d' },
  [F.longBeach]: { id: 235261, md5: 'c7cff45d481551d4f9fea1be51a9d5f3' },
  [F.goodwood]: { id: 444877, md5: '9135b72badbbc00236be38d8bc1157f2' },
  [F.ar]: { id: 164623, md5: 'a958bb9d1fe9b8cc5e4b4000d5250169' },
  [F.torcida1]: { id: 130568, md5: '3ab47d152fd12e1a2a3d10bddd6d6afb' },
  [F.torcida2]: { id: 160493, md5: '9d093ccd5c8b45d1e3f4509b3052bdcb' },
  [F.torcida0]: { id: 333404, md5: 'ed6d678043f879de00e55c6185c2d1d6' },
  [F.chuva1]: { id: 200272, md5: 'fd9b227e429f6a2f475259f53708622c' },
  [F.chuva2]: { id: 507902, md5: '6f3398b051227e7fd7199d511e7ce90c' },
  [F.dnf1]: { id: 852408, md5: 'fb694898de9f63fa28d6c91c6dd5d8c9' },
  [F.dnf2]: { id: 105351, md5: '2a1a65daba34fbf3231e185441fcb061' },
  [F.dnf3]: { id: 437995, md5: '6d7bd7878f9f8fdd084b6460d7929063' },
  [F.lenta2]: { id: 585215, md5: 'f939eb491768a11dd133602fc1e36465' },
  [F.lenta1]: { id: 213976, md5: 'c632aad4bc582837b89a03c6a6cdaeb8' },
  [F.pistola2]: { id: 386326, md5: 'f4fc6cad0d6959fe2c186340788bccff' },
  [F.pistola1]: { id: 349398, md5: '4193cbe81f09711163ae6559d26bd179' },
  [F.pneu]: { id: 71739, md5: 'b969cb35a935d38126d6052077d0c43e' },
  [F.saida]: { id: 209965, md5: '880e3e51424931c4d0370192721c1d4a' },
  [F.passagens1]: { id: 641155, md5: '98e24e17ee7d799bc8997008b49a19fe' },
  [F.passagens2]: { id: 339703, md5: 'c53a3b3e9970f1380d3e1dc7435c1b95' },
  [F.passagens3]: { id: 14833, md5: '2f58414bca681a0782532f530c7a6d89' },
  [F.passagens4]: { id: 18896, md5: '931c43153e91ef0c9fffe9eba83a324f' },
  [F.passagens5]: { id: 478546, md5: '433aa7fdb0a1048d9c02b7b15b53c607' },
  [F.passagens6]: { id: 444879, md5: '690912647cfc8590887c727978c2cc9c' },
  [F.spray]: { id: 462862, md5: '1d22482bf95d6d886424d4475a1b1e27' },
};

// ---------------------------------------------------------------- critérios de escolha do trecho

/** Trecho de `dur` s mais ESTÁVEL (nível e brilho) dentro de [de, ate], penalizando voz. */
interface Estavel {
  tipo: 'estavel';
  de: number;
  ate: number;
  /** Só aceita janelas com nível médio a menos disto do mais forte da região (dB). */
  margemDb: number;
}
/** Trecho em torno do maior pico (envelope de 100 ms) em [de, ate], com `antes` s antes dele. */
interface Pico {
  tipo: 'pico';
  de: number;
  ate: number;
  antes: number;
  /** Passa-banda só para ACHAR o pico (ex.: o chiado do pneu), não aplicado ao som. */
  bandaBusca?: [number, number];
}
/** Trecho começando `antes` s antes da maior SUBIDA de nível (a arrancada) em [de, ate]. */
interface Subida {
  tipo: 'subida';
  de: number;
  ate: number;
  antes: number;
}
/** Trecho terminando `depois` s depois da maior QUEDA de nível (o motor morre) em [de, ate]. */
interface Queda {
  tipo: 'queda';
  de: number;
  ate: number;
  depois: number;
}
type Criterio = Estavel | Pico | Subida | Queda;

interface Camada {
  arquivo: string;
  criterio: Criterio;
  /** Cadeia `-af` do ffmpeg aplicada ao trecho. */
  filtro?: string;
  /** Ganho relativo da camada numa mistura (dB, antes da normalização final). */
  ganhoDb?: number;
  /** Camada mais curta que o som (s): entra no início, com fade de saída de 0,3 s. */
  durCamada?: number;
}

interface Som {
  id: string;
  categoria: string;
  rotulo: string;
  /** O que esta variação tem de diferente das outras da categoria. */
  diferenca: string;
  camadas: Camada[];
  /** Duração final em s. Laço: tamanho do laço. Por velocidade: um arquivo para cada. */
  dur: number | Record<Velocidade, number>;
  forma: 'laco' | 'unico' | 'ataqueLaco';
  /** `unico`: fade de entrada / saída (s). */
  fadeIn?: number;
  fadeOut?: number;
  /** `ataqueLaco`: duração do ataque antes do laço (s). */
  ataque?: number;
  /** Pico de volume, como fração da duração: o preview alinha este instante ao evento. */
  picoEm?: number;
}

const s = (ms: Record<Velocidade, number>): Record<Velocidade, number> =>
  Object.fromEntries(VELOCIDADES.map((v) => [v, ms[v] / 1000])) as Record<Velocidade, number>;

const EQ_MOTOR = 'highpass=f=40,lowpass=f=12000';
/** Pelotão fica ao fundo: sem agudo, e uma depressão suave na faixa de inteligibilidade da fala. */
const EQ_PELOTAO = 'highpass=f=50,lowpass=f=7000,equalizer=f=1800:t=q:w=0.8:g=-4';

const SONS: Som[] = [
  // Motor do jogador: laço estável; o preview varia `playbackRate` com a velocidade do carro.
  { id: 'motor-v1', categoria: 'motor', rotulo: 'V8 (Audi)', diferenca: 'V8 de rua, grave e cheio', camadas: [{ arquivo: F.passagens2, criterio: { tipo: 'estavel', de: 0, ate: 13.6, margemDb: 4 }, filtro: EQ_MOTOR }], dur: 2, forma: 'laco' },
  { id: 'motor-v2', categoria: 'motor', rotulo: 'F1 (478546)', diferenca: 'F1 agudo, gravação de pista', camadas: [{ arquivo: F.passagens5, criterio: { tipo: 'estavel', de: 0, ate: 28.7, margemDb: 4 }, filtro: EQ_MOTOR }], dur: 2, forma: 'laco' },
  { id: 'motor-v3', categoria: 'motor', rotulo: 'F1 treino (150337)', diferenca: 'F1 de 2012 em Melbourne, mais áspero', camadas: [{ arquivo: F.pratica, criterio: { tipo: 'estavel', de: 0, ate: 101.5, margemDb: 4 }, filtro: EQ_MOTOR }], dur: 2, forma: 'laco' },

  // Marcha lenta: parado na vaga.
  { id: 'lenta-v1', categoria: 'lenta', rotulo: 'V8 marcha lenta', diferenca: 'V8 irregular (213976)', camadas: [{ arquivo: F.lenta1, criterio: { tipo: 'estavel', de: 4, ate: 120, margemDb: 6 }, filtro: EQ_MOTOR }], dur: 3, forma: 'laco' },
  { id: 'lenta-v2', categoria: 'lenta', rotulo: 'Maserati lenta', diferenca: 'mais lisa (585215, antes do modo sport)', camadas: [{ arquivo: F.lenta2, criterio: { tipo: 'estavel', de: 0, ate: 9, margemDb: 4 }, filtro: EQ_MOTOR }], dur: 3, forma: 'laco' },
  // Pedido do Marcos (2026-11-06): marcha lenta DERIVADA do motor escolhido (v3), mais grave e
  // abafada, para lembrar um V6 híbrido. ⚠️ A fonte é um V8 de F1 de 2012 (Melbourne): a
  // semelhança com o V6 híbrido é só aproximada, por tom e filtro, não por gravação. Tom: 0,72×
  // (`asetrate`, que também alonga o trecho; o laço é cortado depois, na duração final).
  { id: 'lenta-v3', categoria: 'lenta', rotulo: 'Derivada do motor v3', diferenca: 'o 150337 (V8 de 2012) a 0,72× do tom e agudos cortados acima de 1,8 kHz: aproximação de V6 híbrido', camadas: [{ arquivo: F.pratica, criterio: { tipo: 'estavel', de: 0, ate: 101.5, margemDb: 4 }, filtro: 'highpass=f=35,asetrate=44100*0.72,aresample=44100,lowpass=f=1800,lowpass=f=1800' }], dur: 3, forma: 'laco' },

  // Pelotão: cama de fundo em laço.
  { id: 'pelotao-v1', categoria: 'pelotao', rotulo: 'Relargada F1', diferenca: 'pelotão de F1 numa curva (150338)', camadas: [{ arquivo: F.relargada, criterio: { tipo: 'estavel', de: 0, ate: 155, margemDb: 12 }, filtro: EQ_PELOTAO }], dur: 8, forma: 'laco' },
  { id: 'pelotao-v2', categoria: 'pelotao', rotulo: 'Indy Long Beach', diferenca: 'Indy em rua, mais eco (235261)', camadas: [{ arquivo: F.longBeach, criterio: { tipo: 'estavel', de: 0, ate: 71, margemDb: 12 }, filtro: EQ_PELOTAO }], dur: 8, forma: 'laco' },
  { id: 'pelotao-v3', categoria: 'pelotao', rotulo: 'Nordschleife', diferenca: 'vários carros ao longe (350677)', camadas: [{ arquivo: F.nordschleife, criterio: { tipo: 'estavel', de: 0, ate: 108, margemDb: 12 }, filtro: EQ_PELOTAO }], dur: 8, forma: 'laco' },

  // Chuva: laço.
  { id: 'chuva-v1', categoria: 'chuva', rotulo: 'Chuva rural', diferenca: 'chuva forte no campo (200272)', camadas: [{ arquivo: F.chuva1, criterio: { tipo: 'estavel', de: 0, ate: 43, margemDb: 3 }, filtro: 'highpass=f=120' }], dur: 6, forma: 'laco' },
  { id: 'chuva-v2', categoria: 'chuva', rotulo: 'Chuva pesada', diferenca: 'mais densa e chiada (507902)', camadas: [{ arquivo: F.chuva2, criterio: { tipo: 'estavel', de: 0, ate: 54, margemDb: 3 }, filtro: 'highpass=f=120' }], dur: 6, forma: 'laco' },
  { id: 'chuva-v3', categoria: 'chuva', rotulo: 'Mistura', diferenca: 'as duas juntas, mais cheia', camadas: [
    { arquivo: F.chuva1, criterio: { tipo: 'estavel', de: 0, ate: 43, margemDb: 3 }, filtro: 'highpass=f=120' },
    { arquivo: F.chuva2, criterio: { tipo: 'estavel', de: 0, ate: 54, margemDb: 3 }, filtro: 'highpass=f=120', ganhoDb: -3 },
  ], dur: 6, forma: 'laco' },

  // Passagem: um arquivo por velocidade, pico alinhado à menor distância.
  { id: 'passagem-v1', categoria: 'passagem', rotulo: 'Goodwood flyby', diferenca: 'passagem de carro de corrida (444879)', camadas: [{ arquivo: F.passagens6, criterio: { tipo: 'pico', de: 0, ate: 25, antes: 0.6 }, filtro: 'highpass=f=60' }], dur: s(PASSAGEM_MS), forma: 'unico', fadeIn: 0.03, fadeOut: 0.12, picoEm: PICO_PASSAGEM },
  { id: 'passagem-v2', categoria: 'passagem', rotulo: 'Esportivo', diferenca: 'carro esportivo, mais grave (18896)', camadas: [{ arquivo: F.passagens4, criterio: { tipo: 'pico', de: 0, ate: 34, antes: 0.6 }, filtro: 'highpass=f=60' }], dur: s(PASSAGEM_MS), forma: 'unico', fadeIn: 0.03, fadeOut: 0.12, picoEm: PICO_PASSAGEM },
  { id: 'passagem-v3', categoria: 'passagem', rotulo: 'Reta oposta', diferenca: 'passagem na reta, mais aberta (14833)', camadas: [{ arquivo: F.passagens3, criterio: { tipo: 'pico', de: 0, ate: 25.4, antes: 0.6 }, filtro: 'highpass=f=60' }], dur: s(PASSAGEM_MS), forma: 'unico', fadeIn: 0.03, fadeOut: 0.12, picoEm: PICO_PASSAGEM },

  // Spray: passagem na chuva (só na corrida chuvosa).
  { id: 'spray-v1', categoria: 'spray', rotulo: 'Pista molhada', diferenca: 'o original (462862)', camadas: [{ arquivo: F.spray, criterio: { tipo: 'pico', de: 0, ate: 5.7, antes: 0.6 } }], dur: s(PASSAGEM_MS), forma: 'unico', fadeIn: 0.03, fadeOut: 0.12, picoEm: PICO_PASSAGEM },
  { id: 'spray-v2', categoria: 'spray', rotulo: 'Só o chiado', diferenca: 'sem o motor (passa-alta 900 Hz)', camadas: [{ arquivo: F.spray, criterio: { tipo: 'pico', de: 0, ate: 5.7, antes: 0.6 }, filtro: 'highpass=f=900,highpass=f=900' }], dur: s(PASSAGEM_MS), forma: 'unico', fadeIn: 0.03, fadeOut: 0.12, picoEm: PICO_PASSAGEM },

  // Largada: arrancadas diferentes do mesmo original (o único da categoria, decisão do Marcos).
  { id: 'largada-v1', categoria: 'largada', rotulo: 'Arrancada 1', diferenca: 'primeira arrancada do 444877 (0–14 s)', camadas: [{ arquivo: F.goodwood, criterio: { tipo: 'subida', de: 0, ate: 14, antes: 0.2 }, filtro: EQ_MOTOR }], dur: s(LARGADA_MS), forma: 'unico', fadeIn: 0.02, fadeOut: 0.4 },
  { id: 'largada-v2', categoria: 'largada', rotulo: 'Arrancada 2', diferenca: 'arrancada do meio (14–36 s)', camadas: [{ arquivo: F.goodwood, criterio: { tipo: 'subida', de: 14, ate: 36, antes: 0.2 }, filtro: EQ_MOTOR }], dur: s(LARGADA_MS), forma: 'unico', fadeIn: 0.02, fadeOut: 0.4 },
  { id: 'largada-v3', categoria: 'largada', rotulo: 'Arrancada 3', diferenca: 'arrancada do fim (36–62 s)', camadas: [{ arquivo: F.goodwood, criterio: { tipo: 'subida', de: 36, ate: 62, antes: 0.2 }, filtro: EQ_MOTOR }], dur: s(LARGADA_MS), forma: 'unico', fadeIn: 0.02, fadeOut: 0.4 },

  // Pistola: ataque + laço; o preview corta na partida.
  { id: 'pistola-v1', categoria: 'pistola', rotulo: 'Pneumática (349398)', diferenca: 'chave de impacto contínua', camadas: [{ arquivo: F.pistola1, criterio: { tipo: 'subida', de: 0, ate: 7, antes: 0.01 }, filtro: 'highpass=f=150' }], dur: 0.45, ataque: 0.12, forma: 'ataqueLaco' },
  { id: 'pistola-v2', categoria: 'pistola', rotulo: 'Ingersoll Rand (386326)', diferenca: 'contra metal, mais metálica', camadas: [{ arquivo: F.pistola2, criterio: { tipo: 'subida', de: 0, ate: 12, antes: 0.01 }, filtro: 'highpass=f=150' }], dur: 0.45, ataque: 0.12, forma: 'ataqueLaco' },
  { id: 'pistola-v3', categoria: 'pistola', rotulo: 'Pneumática brilhante', diferenca: 'a v1 com agudo realçado (+5 dB em 3 kHz)', camadas: [{ arquivo: F.pistola1, criterio: { tipo: 'subida', de: 0, ate: 7, antes: 0.01 }, filtro: 'highpass=f=300,equalizer=f=3000:t=q:w=1:g=5' }], dur: 0.45, ataque: 0.12, forma: 'ataqueLaco' },

  // Derrapagem no incidente: 700 ms.
  { id: 'derrapagem-v1', categoria: 'derrapagem', rotulo: 'Chiado de pneu', diferenca: 'pneu cantando (71739)', camadas: [{ arquivo: F.pneu, criterio: { tipo: 'pico', de: 0, ate: 16.5, antes: 0.1, bandaBusca: [1500, 5000] }, filtro: 'highpass=f=300' }], dur: 0.7, forma: 'unico', fadeIn: 0.01, fadeOut: 0.2, picoEm: 0.14 },
  { id: 'derrapagem-v2', categoria: 'derrapagem', rotulo: 'Saída de pista', diferenca: 'carro saindo da pista, com cascalho (209965)', camadas: [{ arquivo: F.saida, criterio: { tipo: 'pico', de: 0, ate: 22.8, antes: 0.1 }, filtro: 'highpass=f=80' }], dur: 0.7, forma: 'unico', fadeIn: 0.01, fadeOut: 0.2, picoEm: 0.14 },
  { id: 'derrapagem-v3', categoria: 'derrapagem', rotulo: 'Pneu de corrida', diferenca: 'chiado dentro de passagem de corrida (350677)', camadas: [{ arquivo: F.nordschleife, criterio: { tipo: 'pico', de: 0, ate: 108, antes: 0.1, bandaBusca: [1500, 5000] }, filtro: 'highpass=f=400' }], dur: 0.7, forma: 'unico', fadeIn: 0.01, fadeOut: 0.2, picoEm: 0.14 },

  // Abandono: 900 ms.
  { id: 'abandono-v1', categoria: 'abandono', rotulo: 'Estouro', diferenca: 'estouro de escapamento (105351)', camadas: [{ arquivo: F.dnf2, criterio: { tipo: 'pico', de: 0, ate: 2, antes: 0.05 }, filtro: 'highpass=f=40' }], dur: 0.9, forma: 'unico', fadeIn: 0.005, fadeOut: 0.3, picoEm: 0.06 },
  { id: 'abandono-v2', categoria: 'abandono', rotulo: 'Motor morrendo', diferenca: 'motor apaga (852408) + ar escapando', camadas: [
    { arquivo: F.dnf1, criterio: { tipo: 'queda', de: 2, ate: 44.9, depois: 0.3 }, filtro: 'highpass=f=40' },
    { arquivo: F.ar, criterio: { tipo: 'estavel', de: 0, ate: 50, margemDb: 3 }, filtro: 'highpass=f=500', ganhoDb: -8 },
  ], dur: 0.9, forma: 'unico', fadeIn: 0.01, fadeOut: 0.3 },
  { id: 'abandono-v3', categoria: 'abandono', rotulo: 'Chocalho', diferenca: 'motor engasgando, metálico (437995)', camadas: [{ arquivo: F.dnf3, criterio: { tipo: 'pico', de: 0.5, ate: 11.6, antes: 0.1 }, filtro: 'highpass=f=60' }], dur: 0.9, forma: 'unico', fadeIn: 0.01, fadeOut: 0.3, picoEm: 0.11 },

  // Torcida na bandeirada: 10,5 s, o preview encerra no fim do replay.
  { id: 'torcida-v1', categoria: 'torcida', rotulo: 'Multidão rugindo', diferenca: 'rugido grave de multidão (130568)', camadas: [{ arquivo: F.torcida1, criterio: { tipo: 'estavel', de: 0, ate: 19.2, margemDb: 4 }, filtro: 'highpass=f=80' }], dur: 10.5, forma: 'unico', fadeIn: 0.15, fadeOut: 1.5 },
  { id: 'torcida-v2', categoria: 'torcida', rotulo: 'Aplausos', diferenca: 'aplauso de plateia grande (160493)', camadas: [{ arquivo: F.torcida2, criterio: { tipo: 'estavel', de: 0, ate: 82, margemDb: 4 }, filtro: 'highpass=f=100' }], dur: 10.5, forma: 'unico', fadeIn: 0.15, fadeOut: 1.5 },
  { id: 'torcida-v3', categoria: 'torcida', rotulo: 'Grito + rugido', diferenca: 'grito curto (333404) por cima da v1', camadas: [
    { arquivo: F.torcida1, criterio: { tipo: 'estavel', de: 0, ate: 19.2, margemDb: 4 }, filtro: 'highpass=f=80', ganhoDb: -3 },
    { arquivo: F.torcida0, criterio: { tipo: 'pico', de: 0, ate: 4.1, antes: 0.2 }, filtro: 'highpass=f=150', durCamada: 3.5 },
  ], dur: 10.5, forma: 'unico', fadeIn: 0.05, fadeOut: 1.5 },
];

// ---------------------------------------------------------------- medida dos originais

interface Analise {
  mono: Float32Array;
  voz: JanelaVoz[];
  canal: 'mistura' | 'esquerdo' | 'direito';
  monoSobreLrDb: number;
}
const CACHE = new Map<string, Analise>();

/** Mono do original. Se a soma L+R perde mais de 3 dB (fase), usa o canal mais forte. */
function analisar(arquivo: string): Analise {
  const c = CACHE.get(arquivo);
  if (c) return c;
  const caminho = join(ORIGINAIS, arquivo);
  const [l, r] = canais(decodificar(caminho, TAXA, 2));
  const m = new Float32Array(l.length);
  for (let i = 0; i < m.length; i++) m[i] = (l[i] + r[i]) / 2;
  const rl = rms(l);
  const rr = rms(r);
  const razao = db(rms(m) / ((rl + rr) / 2 || 1e-12));
  const canal = razao < -3 ? (rl >= rr ? 'esquerdo' : 'direito') : 'mistura';
  const mono = canal === 'esquerdo' ? l : canal === 'direito' ? r : m;
  const a: Analise = { mono, voz: indiceDeVoz(decodificar(caminho, TAXA_VOZ, 1)), canal, monoSobreLrDb: +razao.toFixed(2) };
  CACHE.set(arquivo, a);
  return a;
}

/** Centroide espectral (Hz) de quadros de 2048 amostras. */
function centroides(x: Float32Array, de: number, ate: number, passo: number): number[] {
  const n = 2048;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const out: number[] = [];
  for (let i = de; i + n <= ate; i += passo) {
    for (let k = 0; k < n; k++) {
      re[k] = x[i + k];
      im[k] = 0;
    }
    fft(re, im);
    let num = 0;
    let den = 0;
    for (let k = 1; k < n / 2; k++) {
      const p = Math.hypot(re[k], im[k]);
      num += p * ((k * TAXA) / n);
      den += p;
    }
    out.push(den > 0 ? num / den : 0);
  }
  return out;
}

const desvio = (xs: number[]): number => {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
};

/** Onde começa o trecho (s), e por quê (os números entram no manifesto). */
function escolher(arquivo: string, c: Criterio, dur: number): { de: number; medida: Record<string, number> } {
  const a = analisar(arquivo);
  const total = a.mono.length / TAXA;
  const ate = Math.min(c.ate, total);
  if (c.tipo === 'estavel') {
    const env = envelopeDb(a.mono, TAXA, 0.05);
    const passo = 0.1;
    const cand: { de: number; nivel: number; custo: number; voz: number }[] = [];
    for (let de = c.de; de + dur <= ate; de += passo) {
      const i0 = Math.round(de / 0.05);
      const i1 = Math.round((de + dur) / 0.05);
      const fatia = env.slice(i0, i1).filter(Number.isFinite);
      if (fatia.length === 0) continue;
      const nivel = db(Math.sqrt(fatia.reduce((s2, e) => s2 + deDb(e) ** 2, 0) / fatia.length));
      const cent = centroides(a.mono, Math.round(de * TAXA), Math.round((de + dur) * TAXA), 4410);
      const voz = vozNoTrecho(a.voz, de, de + dur);
      // Nível em dB e brilho em oitavas: as duas oscilações custam o mesmo por unidade.
      const custo = desvio(fatia) + 6 * desvio(cent.map((x) => Math.log2(x + 1))) + 20 * Math.max(0, voz - LIMIAR_INDICE);
      cand.push({ de, nivel, custo, voz });
    }
    if (cand.length === 0) throw new Error(`${arquivo}: região curta para ${dur}s`);
    const topo = Math.max(...cand.map((x) => x.nivel));
    const fortes = cand.filter((x) => x.nivel >= topo - c.margemDb);
    const limpos = fortes.filter((x) => x.voz <= LIMIAR_INDICE);
    const ok = (limpos.length > 0 ? limpos : fortes).sort((x, y) => x.custo - y.custo)[0];
    return { de: +ok.de.toFixed(2), medida: { custo: +ok.custo.toFixed(3), nivelDb: +ok.nivel.toFixed(1), topoRegiaoDb: +topo.toFixed(1) } };
  }
  const busca = c.tipo === 'pico' && c.bandaBusca ? decodificar(join(ORIGINAIS, arquivo), TAXA, 1, {}, `highpass=f=${c.bandaBusca[0]},lowpass=f=${c.bandaBusca[1]}`) : a.mono;
  const env = envelopeDb(busca, TAXA, 0.1);
  const i0 = Math.ceil(c.de / 0.1);
  const i1 = Math.min(env.length, Math.floor(ate / 0.1));
  if (c.tipo === 'pico') {
    // Máximos locais que cabem no original; entre os que ficam a até 6 dB do mais forte, o
    // mais forte SEM voz acusada; se todos acusam, o de menor índice de voz.
    const cand: { i: number; voz: number }[] = [];
    for (let i = i0; i < i1 - 1; i++) {
      // Pico encostado no começo do original (o estouro do 105351) corta em 0.
      const de = Math.max(0, i * 0.1 - c.antes);
      if (de + dur > total) continue;
      if ((i === i0 || env[i] >= env[i - 1]) && env[i] >= env[i + 1]) cand.push({ i, voz: vozNoTrecho(a.voz, de, de + dur) });
    }
    if (cand.length === 0) throw new Error(`${arquivo}: nenhum pico cabe em ${dur}s`);
    const topo = Math.max(...cand.map((x) => env[x.i]));
    const fortes = cand.filter((x) => env[x.i] >= topo - 6);
    const limpos = fortes.filter((x) => x.voz <= LIMIAR_INDICE);
    const ok = limpos.length > 0 ? limpos.sort((x, y) => env[y.i] - env[x.i])[0] : fortes.sort((x, y) => x.voz - y.voz)[0];
    return { de: +Math.max(0, ok.i * 0.1 - c.antes).toFixed(2), medida: { picoS: +(ok.i * 0.1).toFixed(2), picoDb: +env[ok.i].toFixed(1), picoAbaixoDoTopoDb: +(topo - env[ok.i]).toFixed(1) } };
  }
  // Subida / queda: maior diferença de nível entre 300 ms seguidos e os 300 ms anteriores.
  let melhor = i0 + 3;
  let melhorDelta = -Infinity;
  for (let i = i0 + 3; i < i1 - 3; i++) {
    const antes = (env[i - 3] + env[i - 2] + env[i - 1]) / 3;
    const depois = (env[i] + env[i + 1] + env[i + 2]) / 3;
    const delta = c.tipo === 'subida' ? depois - antes : antes - depois;
    const de = c.tipo === 'subida' ? i * 0.1 - c.antes : i * 0.1 + c.depois - dur;
    if (de < 0 || de + dur > total) continue;
    // Cada 0,1 de índice de voz acima do limiar custa 3 dB de subida.
    const pena = 30 * Math.max(0, vozNoTrecho(a.voz, de, de + dur) - LIMIAR_INDICE);
    if (delta - pena > melhorDelta) {
      melhorDelta = delta - pena;
      melhor = i;
    }
  }
  const de = c.tipo === 'subida' ? melhor * 0.1 - c.antes : melhor * 0.1 + c.depois - dur;
  return { de: +Math.max(0, de).toFixed(2), medida: { marcoS: +(melhor * 0.1).toFixed(2), deltaMenosPenaVozDb: +melhorDelta.toFixed(1) } };
}

/** Trecho mono do original, com o filtro da camada (o filtro roda sobre 1 s de folga de cada lado). */
function trecho(camada: Camada, de: number, dur: number): Float32Array {
  const a = analisar(camada.arquivo);
  if (!camada.filtro) return a.mono.slice(Math.round(de * TAXA), Math.round((de + dur) * TAXA));
  const folga = Math.min(1, de);
  const filtrado = decodificar(
    join(ORIGINAIS, camada.arquivo),
    TAXA,
    1,
    { de: de - folga, dur: dur + folga + 1 },
    `${a.canal === 'esquerdo' ? 'pan=mono|c0=c0,' : a.canal === 'direito' ? 'pan=mono|c0=c1,' : ''}${camada.filtro}`,
  );
  const ini = Math.round(folga * TAXA);
  return filtrado.slice(ini, ini + Math.round(dur * TAXA));
}

// ---------------------------------------------------------------- geração

interface Arquivo {
  arquivo: string;
  velocidade?: Velocidade;
  durS: number;
  bytes: number;
  ganhoDb: number;
  /** Parte do ganho que veio do nivelamento da categoria (dB, ≤ 0). */
  nivelamentoDb: number;
  limitadoPorPico: boolean;
  picoDbfs: number;
  rmsAtivoDbfs: number;
  /** Laço: clique na emenda, medido no .ogg DECODIFICADO (1 ≈ indistinguível do corpo). */
  emenda?: number;
  amostrasEsperadas: number;
  amostrasDecodificadas: number;
  /** Deslocamento do .ogg decodificado contra o que foi codificado (correlação, ±2048). */
  atrasoDoDecodeAmostras: number;
  laco?: { inicioS: number; fimS: number };
  picoEmS?: number;
}

/** Guarda depois do laço: cópia do começo do laço. Se o decodificador do aparelho aparar o fim
 * do arquivo (o Chrome apara 1–3 ms dos `.ogg`, medido), apara a guarda, não a emenda. */
const GUARDA_S = 0.05;

interface Preparado {
  som: Som;
  dur: number;
  sufixo: string;
  y: Float32Array;
  laco?: { inicioS: number; fimS: number };
  ganhoDb: number;
  limitadoPorPico: boolean;
  rmsAtivoDb: number;
  camadas: unknown[];
}

/** Fase 1: trecho, camadas, laço, fade e normalização. O nivelamento por categoria vem depois. */
function preparar(som: Som, dur: number, sufixo: string): Preparado {
  const cruz = som.forma === 'laco' ? Math.round(Math.min(0.25 * dur, 0.5) * TAXA) : som.forma === 'ataqueLaco' ? Math.round(0.08 * TAXA) : 0;
  const durLaco = som.forma === 'ataqueLaco' ? dur : 0;
  const ataque = som.ataque ?? 0;
  const precisa = som.forma === 'laco' ? dur + cruz / TAXA : som.forma === 'ataqueLaco' ? ataque + durLaco + cruz / TAXA : dur;
  const camadasInfo: unknown[] = [];
  let mix: Float32Array | null = null;
  for (const camada of som.camadas) {
    // O pico declarado em fração da duração manda no `antes`: assim ele cai no mesmo ponto
    // relativo nas três velocidades.
    const criterio = som.picoEm !== undefined && camada.criterio.tipo === 'pico' ? { ...camada.criterio, antes: som.picoEm * precisa } : camada.criterio;
    const durCamada = Math.min(precisa, camada.durCamada ?? precisa);
    const esc = escolher(camada.arquivo, criterio, durCamada);
    const x = durCamada < precisa ? fades(trecho(camada, esc.de, durCamada), 0, Math.round(0.3 * TAXA)) : trecho(camada, esc.de, durCamada);
    const a = analisar(camada.arquivo);
    const voz = vozNoTrecho(a.voz, esc.de, esc.de + durCamada);
    camadasInfo.push({
      original: camada.arquivo,
      freesound: FREESOUND[camada.arquivo].id,
      criterio,
      filtro: camada.filtro ?? null,
      ganhoDb: camada.ganhoDb ?? 0,
      deS: esc.de,
      durS: +durCamada.toFixed(3),
      ...esc.medida,
      vozMaxNoTrecho: +voz.toFixed(3),
      vozAcimaDoLimiar: voz > LIMIAR_INDICE,
      canal: a.canal,
      monoSobreLrDb: a.monoSobreLrDb,
    });
    // Camadas somadas com o mesmo RMS antes do ganho relativo.
    const g = deDb(camada.ganhoDb ?? 0) / (rms(x) || 1);
    if (!mix) mix = new Float32Array(Math.round(precisa * TAXA));
    for (let i = 0; i < mix.length && i < x.length; i++) mix[i] += x[i] * g;
  }
  let y = mix!;
  let laco: Preparado['laco'];
  const comGuarda = (z: Float32Array, inicio: number): Float32Array => {
    const nG = Math.round(GUARDA_S * TAXA);
    const out = new Float32Array(z.length + nG);
    out.set(z);
    out.set(z.subarray(inicio, inicio + nG), z.length);
    return out;
  };
  if (som.forma === 'laco') {
    const l = lacoSemEmenda(y, cruz);
    laco = { inicioS: 0, fimS: +(l.length / TAXA).toFixed(6) };
    y = comGuarda(l, 0);
  } else if (som.forma === 'ataqueLaco') {
    // Ataque como veio; o resto vira laço sem emenda, colado depois do ataque.
    const nAtaque = Math.round(ataque * TAXA);
    const corpo = lacoSemEmenda(y.slice(nAtaque), cruz);
    const junto = new Float32Array(nAtaque + corpo.length);
    junto.set(y.subarray(0, nAtaque));
    junto.set(corpo, nAtaque);
    // A junção ataque→laço: o laço começa onde o original continuava, salvo a mistura dos
    // primeiros `cruz` ms com a cauda. Fade de 2 ms no início evita estalo do primeiro ponto.
    laco = { inicioS: +(nAtaque / TAXA).toFixed(6), fimS: +(junto.length / TAXA).toFixed(6) };
    y = comGuarda(fades(junto, Math.round(0.002 * TAXA), 0), nAtaque);
  } else {
    y = fades(y, Math.round((som.fadeIn ?? 0) * TAXA), Math.round((som.fadeOut ?? 0) * TAXA));
  }
  const n = normalizar(y, TAXA, ALVO_RMS_DB, TETO_PICO_DB);
  return { som, dur, sufixo, y: n.y, laco, ganhoDb: n.ganhoDb, limitadoPorPico: n.limitadoPorPico, rmsAtivoDb: n.rmsAtivoDb, camadas: camadasInfo };
}

/** Fase 2: ganho de nivelamento, codificação e conferência no `.ogg` decodificado. */
function finalizar(p: Preparado, nivelamentoDb: number): Arquivo & { camadas: unknown[] } {
  const g = deDb(nivelamentoDb);
  const y = Float32Array.from(p.y, (v) => v * g);
  const nome = `${p.som.id}${p.sufixo}.ogg`;
  const caminho = join(SAIDA, nome);
  codificarOgg(y, TAXA, caminho, QUALIDADE_OGG);
  const volta = decodificar(caminho, TAXA, 1);
  const atraso = atrasoDoDecode(y, volta);
  const emenda = p.laco
    ? +cliqueNaEmenda(volta.slice(Math.round(p.laco.inicioS * TAXA), Math.round(p.laco.fimS * TAXA)), TAXA).toFixed(2)
    : undefined;
  return {
    arquivo: nome,
    durS: +(y.length / TAXA).toFixed(4),
    bytes: statSync(caminho).size,
    ganhoDb: +(p.ganhoDb + nivelamentoDb).toFixed(2),
    nivelamentoDb: +nivelamentoDb.toFixed(2),
    limitadoPorPico: p.limitadoPorPico,
    picoDbfs: +db(pico(y)).toFixed(2),
    rmsAtivoDbfs: +(p.rmsAtivoDb + nivelamentoDb).toFixed(2),
    emenda,
    amostrasEsperadas: y.length,
    amostrasDecodificadas: volta.length,
    atrasoDoDecodeAmostras: atraso,
    laco: p.laco,
    picoEmS: p.som.picoEm !== undefined ? +(p.som.picoEm * p.dur).toFixed(4) : undefined,
    camadas: p.camadas,
  };
}

function atrasoDoDecode(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length, TAXA);
  let melhor = 0;
  let lag = 0;
  for (let l = -2048; l <= 2048; l += 1) {
    let s2 = 0;
    for (let i = 4096; i < n - 4096; i += 4) s2 += a[i] * (b[i + l] ?? 0);
    if (s2 > melhor) {
      melhor = s2;
      lag = l;
    }
  }
  return lag;
}

function md5(caminho: string): string {
  return createHash('md5').update(readFileSync(caminho)).digest('hex');
}

mkdirSync(SAIDA, { recursive: true });
// Os originais são conferidos pelo MD5 antes de tudo: o resultado só é reproduzível a partir
// DESTES arquivos.
const divergentes = Object.entries(FREESOUND).filter(([a, f]) => md5(join(ORIGINAIS, a)) !== f.md5);
if (divergentes.length > 0) throw new Error(`original diferente do registrado: ${divergentes.map(([a]) => a).join(', ')}`);
const usados = new Set(SONS.flatMap((x) => x.camadas.map((c) => c.arquivo)));
const manifesto = {
  geradoPor: 'scripts/sons/tratar-sons.ts',
  ffmpeg: versaoFfmpeg(),
  parametros: { TAXA, QUALIDADE_OGG, ALVO_RMS_DB, TETO_PICO_DB, PASSAGEM_MS, LARGADA_MS, PICO_PASSAGEM, GUARDA_S, LIMIAR_INDICE_VOZ: LIMIAR_INDICE },
  originais: Object.entries(FREESOUND).map(([arquivo, f]) => ({ arquivo, freesound: f.id, md5: f.md5, usado: usados.has(arquivo) })),
  duplicadosNaoUsados: DUPLICADOS.map((arquivo) => ({ arquivo, md5: md5(join(ORIGINAIS, arquivo)), igualA: F.goodwood })),
  naoUsados: Object.keys(FREESOUND).filter((a) => !usados.has(a)),
  sons: [] as unknown[],
  totalBytes: 0,
};

// Nivelamento: dentro de uma categoria, todas as variações descem ao RMS ativo da mais baixa
// (quem bateu no teto de pico ficou abaixo do alvo). Sem isso a mais alta ganha a escolha no
// ouvido por ser mais alta, não por ser melhor.
const preparados = SONS.map((som) =>
  typeof som.dur === 'number' ? [preparar(som, som.dur, '')] : VELOCIDADES.map((v) => preparar(som, (som.dur as Record<Velocidade, number>)[v], `-${v}`)),
);
const pisoPorCategoria = new Map<string, number>();
for (const lista of preparados) for (const p of lista) pisoPorCategoria.set(p.som.categoria, Math.min(pisoPorCategoria.get(p.som.categoria) ?? Infinity, p.rmsAtivoDb));

for (const lista of preparados) {
  const som = lista[0].som;
  const arquivos = lista.map((p) => ({ ...finalizar(p, pisoPorCategoria.get(som.categoria)! - p.rmsAtivoDb), velocidade: p.sufixo ? p.sufixo.slice(1) : undefined }));
  manifesto.sons.push({ id: som.id, categoria: som.categoria, rotulo: som.rotulo, diferenca: som.diferenca, forma: som.forma, arquivos });
  for (const a of arquivos) {
    manifesto.totalBytes += a.bytes;
    const c = a.camadas as { original: string; deS: number; vozMaxNoTrecho: number; canal: string }[];
    console.log(
      `${a.arquivo.padEnd(28)} ${a.durS.toFixed(2).padStart(6)}s ${String(a.bytes).padStart(7)}B rms ${a.rmsAtivoDbfs.toFixed(1).padStart(5)} pico ${a.picoDbfs.toFixed(1).padStart(5)}${a.limitadoPorPico ? '(teto)' : '      '}` +
        `${a.emenda !== undefined ? ` emenda ${a.emenda.toFixed(2)}` : ''}` +
        ` amostras ${a.amostrasDecodificadas - a.amostrasEsperadas >= 0 ? '+' : ''}${a.amostrasDecodificadas - a.amostrasEsperadas} atraso ${a.atrasoDoDecodeAmostras}` +
        ` | ${c.map((k) => `${FREESOUND[k.original].id}@${k.deS}s voz ${k.vozMaxNoTrecho.toFixed(2)} ${k.canal}`).join(' + ')}`,
    );
  }
}
writeFileSync(join(SAIDA, 'manifesto.json'), JSON.stringify(manifesto, null, 1));
console.log(`\ntotal ${manifesto.totalBytes} bytes; não usados: ${manifesto.naoUsados.join(', ') || 'nenhum'}`);
if (manifesto.totalBytes > ORCAMENTO_OGG_BYTES) throw new Error(`passou do orçamento: ${manifesto.totalBytes} > ${ORCAMENTO_OGG_BYTES}`);
