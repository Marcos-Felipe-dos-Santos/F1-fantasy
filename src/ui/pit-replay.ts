/**
 * Pit stop animado do replay (PR 2c). Só apresentação: lê `ResultadoCorrida` e
 * a geometria do box, e nada aqui altera resultado, hash ou tempo de corrida.
 *
 * O MOTOR soma o custo do pit na volta `v`, e o replay antigo espalhava esse
 * custo por essa volta inteira. Aqui o custo vira uma JANELA, que atravessa a
 * largada (o box cruza a linha nas 10 pistas, `pit-replay.test.ts` trava):
 *
 *   inicio → freia na pista → entra no box → vaga (parado) → sai → acelera → fim
 *
 * `fim` cai exatamente em `acum[v] + (fração) × T[v+1]`, o mesmo ponto do
 * replay antigo: depois da janela o progresso é igual ao de antes, bit a bit, e
 * o carro nunca adianta nem teleporta.
 *
 * FÓRMULA (decisão do Marcos, 2026-11-01): o custo do motor é tempo A MAIS sobre
 * uma volta limpa, não o tempo total no box. Por isso
 * `parado = custo + trecho de pista substituído − tempo no box (e rampas)`, e a
 * variação de custo entre os carros fica toda no tempo parado.
 *
 * CUSTO ESTIMADO: `ResultadoCorrida` não expõe o custo, e expô-lo mexeria em
 * `src/engine/`. A estimativa (`custoPitEstimado`) erra menos de 1 s, medido em
 * `docs/pr2c-medicao.json`. O erro só desloca tempo entre o ritmo antes da
 * entrada e o tempo parado: `fim` não depende dela.
 *
 * Todo o movimento é um caminho só, de comprimento `D`: `d` u de pista, o box, e
 * `d` u de pista. Três zonas por cima dele, freada, limite e aceleração. Com
 * `soParalelo` (Imola e Montreal) o limite vale só no trecho das garagens, e
 * freada e aceleração se estendem pelas pontas do box.
 */

import type { Pista, ResultadoCorrida } from '../engine/types';
import { caminhoDoBox } from './box';
import {
  acumularVoltas,
  fracaoVisual,
  instanteNasVoltas,
  lutDoTracado,
  pontoNoTracado,
  progressoNoReplay,
  type PitDoReplay,
  type Ponto,
} from './fluxo-corrida';
import { tracadoSuavizado } from './suavizacao';
import { BOXES_POR_PISTA } from './tracados';
import { estaSobViaduto } from './viaduto';

/** Fração da velocidade de corrida da pista (opção A, decisão do Marcos). */
export const RAZAO_LIMITE_BOX = 0.5;
export const ESPACO_VAGA = 13;
/** Trava: o carro anda mais rápido no box antes de o parado cair abaixo disto. */
export const PISO_PARADO_MS = 4000;
/** Arco de pista onde o carro freia antes do box e acelera depois dele. */
export const DISTANCIA_RAMPA = 60;
/** Dá menos de 1 ms na janela mais longa do pit. */
const PASSOS_BISSECAO = 18;
/** Meia janela do rumo: suaviza a polilinha sem atrasar o carro numa curva (PR 2a). */
const MEIA_JANELA_RUMO = 8;

/**
 * As duas exceções da opção A: nessas pistas o box é mais longo que o arco que
 * ele substitui, e 50% no caminho inteiro deixaria o parado perto de zero.
 */
const EXCECOES_LIMITE: Record<string, { razao: number; soParalelo: boolean }> = {
  'pista-imola': { razao: 0.55, soParalelo: true },
  'pista-montreal': { razao: 0.5, soParalelo: true },
};

export function limiteDoBox(pistaId: string): { razao: number; soParalelo: boolean } {
  return EXCECOES_LIMITE[pistaId] ?? { razao: RAZAO_LIMITE_BOX, soParalelo: false };
}

export interface ParadaNoReplay {
  volta: number;
  /** Índice da vaga, a partir da entrada do box. */
  vaga: number;
  /** Tempos simulados da janela, em ordem. */
  inicio: number;
  entrada: number;
  chegada: number;
  partida: number;
  retorno: number;
  fim: number;
  /** Fração da volta `volta` onde a janela começa (PR 2d). */
  fracaoInicio: number;
  /** Fração da volta seguinte onde a janela termina (PR 2d). */
  fracaoFim: number;
  /** Nenhuma vaga livre na chegada: a única forma de dividir vaga (PR 2f). */
  boxCheio: boolean;
}

/**
 * Tempo a mais na vaga do pit `volta` (a punição do PR 2f). A linha do tempo daqui não muda:
 * quem atrasa o carro é `punicao-replay.ts`. Aqui só as vagas sabem dela: a do pit da
 * punição fica presa, e os pits seguintes do carro chegam atrasados `ms` na tela.
 */
export interface EsperaNaVaga {
  volta: number;
  ms: number;
}

export interface PosicaoNoReplay {
  ponto: Ponto;
  /** Passa por baixo de um viaduto (só na pista: o box nunca passa). */
  sob: boolean;
  /** Direção do movimento, em graus no sistema do viewBox (PR 2a). */
  rumo: number;
  /** Posição na volta, ou `null` no box: o spray só existe na pista (PR 2a). */
  fracaoNaPista: number | null;
}

export interface LinhaDoTempoPit extends PitDoReplay {
  paradas(jogadorId: string): readonly ParadaNoReplay[];
  posicao(
    jogadorId: string,
    historico: number[],
    status: 'terminou' | 'dnf',
    tempoSimMs: number,
    reduzido: boolean,
  ): PosicaoNoReplay;
  /** Instante em que o carro completou `voltas` (fracionárias): o inverso de `progresso`. */
  instanteDoProgresso(jogadorId: string, historico: number[], voltas: number): number;
  vagaEmX(indice: number): Ponto;
  totalDeVagas: number;
}

/** Caminho do pit de uma pista. Distâncias em u; frações em voltas, a partir da largada. */
interface Caminho {
  curva: readonly Ponto[];
  box: readonly Ponto[];
  /** Comprimento acumulado de `box`. */
  s: readonly number[];
  perimetro: number;
  comprimentoBox: number;
  fracaoEntrada: number;
  /** Maior que 1: o box termina depois da largada. */
  fracaoSaida: number;
  zonaFreio: number;
  zonaAcel: number;
  total: number;
  xVagas: readonly number[];
  pontosVagas: readonly Ponto[];
  razao: number;
}

function pontoNoBox(c: Caminho, distancia: number): Ponto {
  let i = 1;
  while (i < c.s.length - 1 && c.s[i] < distancia) i++;
  const a = c.box[i - 1];
  const b = c.box[i];
  const trecho = c.s[i] - c.s[i - 1];
  const k = trecho > 0 ? (distancia - c.s[i - 1]) / trecho : 0;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

function angulo(a: Ponto, b: Ponto): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Carro na pista, em `fracao` de volta: na curva suavizada que `pathDaVolta` desenha. */
export function posicaoNaPista(pistaId: string, fracao: number): PosicaoNoReplay {
  const curva = tracadoSuavizado(pistaId);
  const janela = MEIA_JANELA_RUMO / lutDoTracado(curva).comprimentoTotal;
  return {
    ponto: pontoNoTracado(curva, fracao),
    sob: estaSobViaduto(pistaId, fracao),
    rumo: angulo(pontoNoTracado(curva, fracao - janela), pontoNoTracado(curva, fracao + janela)),
    fracaoNaPista: ((fracao % 1) + 1) % 1,
  };
}

const CACHE_CAMINHO = new Map<string, Caminho | null>();

/** Memoizado pelo mesmo motivo de `desenhoDoBox`: `TelaCorrida` renderiza a cada frame. */
function caminhoDaPista(pistaId: string): Caminho | null {
  const cache = CACHE_CAMINHO.get(pistaId);
  if (cache !== undefined) return cache;
  const declarado = BOXES_POR_PISTA[pistaId];
  if (declarado === undefined) {
    CACHE_CAMINHO.set(pistaId, null);
    return null;
  }
  const curva = tracadoSuavizado(pistaId);
  const { amostras, janela } = caminhoDoBox(curva, declarado);
  const perimetro = lutDoTracado(curva).comprimentoTotal;
  const box = amostras.map((a) => a.p);
  const s = [0];
  let antes = 0;
  let paralelo = 0;
  for (let i = 1; i < box.length; i++) {
    const d = Math.hypot(box[i].x - box[i - 1].x, box[i].y - box[i - 1].y);
    s.push(s[i - 1] + d);
    if (amostras[i - 1].paralelo && amostras[i].paralelo) paralelo += d;
    else if (paralelo === 0) antes += d;
  }
  const comprimentoBox = s[s.length - 1];
  const depois = comprimentoBox - antes - paralelo;
  const { razao, soParalelo } = limiteDoBox(pistaId);
  const vagas = Math.floor(paralelo / ESPACO_VAGA);
  const margem = (paralelo - vagas * ESPACO_VAGA) / 2;
  const noBoxVagas = Array.from(
    { length: vagas },
    (_, k) => antes + margem + (k + 0.5) * ESPACO_VAGA,
  );
  const fracaoEntrada = (((janela.inicio / perimetro) % 1) + 1) % 1;
  const caminho: Caminho = {
    curva,
    box,
    s,
    perimetro,
    comprimentoBox,
    fracaoEntrada,
    fracaoSaida: fracaoEntrada + (janela.fim - janela.inicio) / perimetro,
    zonaFreio: DISTANCIA_RAMPA + (soParalelo ? antes : 0),
    zonaAcel: DISTANCIA_RAMPA + (soParalelo ? depois : 0),
    total: 2 * DISTANCIA_RAMPA + comprimentoBox,
    xVagas: noBoxVagas.map((x) => DISTANCIA_RAMPA + x),
    pontosVagas: [],
    razao,
  };
  caminho.pontosVagas = noBoxVagas.map((x) => pontoNoBox(caminho, x));
  CACHE_CAMINHO.set(pistaId, caminho);
  return caminho;
}

/**
 * Custo do pit da volta `volta`: a volta menos a média das vizinhas, sem os
 * incidentes que o resultado registra. A volta 2 não usa a anterior: a volta 1
 * carrega o atraso de grid.
 */
export function custoPitEstimado(
  resultado: ResultadoCorrida,
  jogadorId: string,
  volta: number,
): number {
  const historico = resultado.historicoVoltas[jogadorId];
  const incidente = (v: number) =>
    resultado.eventos.reduce(
      (soma, e) =>
        e.jogadorId === jogadorId && e.volta === v && (e.tipo === 'erro-piloto' || e.tipo === 'problema-tecnico')
          ? soma + e.custoMs
          : soma,
      0,
    );
  const vizinhas = [historico[volta] - incidente(volta + 1)];
  if (volta >= 3) vizinhas.push(historico[volta - 2] - incidente(volta - 1));
  const media = vizinhas.reduce((s, x) => s + x, 0) / vizinhas.length;
  return Math.max(0, historico[volta - 1] - incidente(volta) - media);
}

/** Perfil de velocidade (u/ms) sobre o caminho; o tempo aqui é o NOMINAL, antes da trava. */
interface Perfil {
  vIni: number;
  vLim: number;
  vFim: number;
  tFreio: number;
  tLimite: number;
  tAcel: number;
}

/** Tempo para cobrir `distancia` numa rampa de `v0` a `v1` que dura `duracao`. */
function tempoNaRampa(v0: number, v1: number, duracao: number, distancia: number): number {
  const a = (v1 - v0) / duracao;
  if (Math.abs(a) < 1e-15) return distancia / v0;
  return (Math.sqrt(v0 * v0 + 2 * a * distancia) - v0) / a;
}

function tempoEmX(c: Caminho, p: Perfil, x: number): number {
  if (x <= c.zonaFreio) return tempoNaRampa(p.vIni, p.vLim, p.tFreio, x);
  const inicioAcel = c.total - c.zonaAcel;
  if (x <= inicioAcel) return p.tFreio + (x - c.zonaFreio) / p.vLim;
  return p.tFreio + p.tLimite + tempoNaRampa(p.vLim, p.vFim, p.tAcel, x - inicioAcel);
}

function xNoTempo(c: Caminho, p: Perfil, tempo: number): number {
  if (tempo <= p.tFreio) return p.vIni * tempo + ((p.vLim - p.vIni) / p.tFreio) * tempo * tempo * 0.5;
  if (tempo <= p.tFreio + p.tLimite) return c.zonaFreio + (tempo - p.tFreio) * p.vLim;
  const u = Math.min(tempo - p.tFreio - p.tLimite, p.tAcel);
  return c.total - c.zonaAcel + p.vLim * u + ((p.vFim - p.vLim) / p.tAcel) * u * u * 0.5;
}

interface ParadaInterna extends ParadaNoReplay {
  jogadorId: string;
  /** Início da volta `volta`: a partir daqui o carro já anda no ritmo limpo. */
  inicioVolta: number;
  tLimpo: number;
  perfil: Perfil;
  /** Tempo real por tempo nominal do perfil: 1 sem a trava, menor com ela. */
  escala: number;
  parado: number;
  xVaga: number;
}

/** Tudo da parada, menos a vaga, que depende das outras paradas. */
function montarParada(
  c: Caminho,
  pista: Pick<Pista, 'tempoBaseMs'>,
  resultado: ResultadoCorrida,
  jogadorId: string,
  volta: number,
): ParadaInterna {
  const historico = resultado.historicoVoltas[jogadorId];
  const acumulado = acumularVoltas(historico);
  const inicioVolta = volta >= 2 ? acumulado[volta - 2] : 0;
  const tLimpo = historico[volta - 1] - custoPitEstimado(resultado, jogadorId, volta);
  const tProxima = historico[volta];
  const vIni = c.perimetro / tLimpo;
  const vFim = c.perimetro / tProxima;
  const vLim = (c.razao * c.perimetro) / pista.tempoBaseMs;
  const perfil: Perfil = {
    vIni,
    vLim,
    vFim,
    tFreio: (2 * c.zonaFreio) / (vIni + vLim),
    tLimite: (c.total - c.zonaFreio - c.zonaAcel) / vLim,
    tAcel: (2 * c.zonaAcel) / (vLim + vFim),
  };
  const nominal = perfil.tFreio + perfil.tLimite + perfil.tAcel;
  const rampa = DISTANCIA_RAMPA / c.perimetro;
  const inicio = inicioVolta + (c.fracaoEntrada - rampa) * tLimpo;
  const fim = acumulado[volta - 1] + (c.fracaoSaida - 1 + rampa) * tProxima;
  const janela = fim - inicio;
  const parado = Math.max(janela - nominal, Math.min(PISO_PARADO_MS, janela / 2));
  const escala = (janela - parado) / nominal;
  return {
    jogadorId,
    volta,
    vaga: 0,
    inicio,
    entrada: inicio + escala * tempoEmX(c, perfil, DISTANCIA_RAMPA),
    chegada: 0,
    partida: 0,
    retorno: inicio + parado + escala * tempoEmX(c, perfil, DISTANCIA_RAMPA + c.comprimentoBox),
    fim,
    fracaoInicio: c.fracaoEntrada - rampa,
    fracaoFim: c.fracaoSaida - 1 + rampa,
    boxCheio: false,
    inicioVolta,
    tLimpo,
    perfil,
    escala,
    parado,
    xVaga: 0,
  };
}

/**
 * Primeira vaga livre na chegada, por ordem de início; box cheio: a que libera antes.
 * Com a punição (PR 2f), na linha do tempo da TELA: `prende` segura a vaga depois da
 * partida, e `atraso` desloca os pits seguintes do punido (revisão do PR 2f).
 */
function alocarVagas(
  c: Caminho,
  paradas: ParadaInterna[],
  esperaDe: (p: ParadaInterna) => { atraso: number; prende: number },
): void {
  const livreEm = c.xVagas.map(() => -Infinity);
  const inicioNaTela = (p: ParadaInterna) => p.inicio + esperaDe(p).atraso;
  const ordem = [...paradas].sort(
    (a, b) => inicioNaTela(a) - inicioNaTela(b) || (a.jogadorId < b.jogadorId ? -1 : 1),
  );
  for (const p of ordem) {
    const { atraso, prende } = esperaDe(p);
    const chegadaEm = (k: number) => p.inicio + p.escala * tempoEmX(c, p.perfil, c.xVagas[k]);
    let vaga = livreEm.findIndex((livre, k) => livre <= chegadaEm(k) + atraso);
    p.boxCheio = vaga === -1;
    if (vaga === -1) vaga = livreEm.indexOf(Math.min(...livreEm));
    p.vaga = vaga;
    p.xVaga = c.xVagas[vaga];
    p.chegada = chegadaEm(vaga);
    p.partida = p.chegada + p.parado;
    livreEm[vaga] = p.partida + atraso + prende;
  }
}

function xDaParada(c: Caminho, p: ParadaInterna, tempoSimMs: number): number {
  if (tempoSimMs < p.chegada) return xNoTempo(c, p.perfil, (tempoSimMs - p.inicio) / p.escala);
  if (tempoSimMs < p.partida) return p.xVaga;
  const tVaga = (p.chegada - p.inicio) / p.escala;
  return xNoTempo(c, p.perfil, tVaga + (tempoSimMs - p.partida) / p.escala);
}

/** Fração da volta `p.volta` na pista para `x` fora do box. */
function fracaoNaPista(c: Caminho, x: number): number {
  return x < DISTANCIA_RAMPA
    ? c.fracaoEntrada - (DISTANCIA_RAMPA - x) / c.perimetro
    : c.fracaoSaida + (x - DISTANCIA_RAMPA - c.comprimentoBox) / c.perimetro;
}

/** Progresso equivalente de `x`: no box, avança na proporção do arco que ele substitui. */
function voltasDoCaminho(c: Caminho, p: ParadaInterna, x: number): number {
  const noBox = (x - DISTANCIA_RAMPA) / c.comprimentoBox;
  const fracao =
    noBox >= 0 && noBox <= 1
      ? c.fracaoEntrada + (c.fracaoSaida - c.fracaoEntrada) * noBox
      : fracaoNaPista(c, x);
  return p.volta - 1 + fracao;
}

function pontoNoCaminho(c: Caminho, x: number): Ponto {
  const noBox = x - DISTANCIA_RAMPA;
  return noBox < 0 || noBox > c.comprimentoBox
    ? pontoNoTracado(c.curva, fracaoNaPista(c, x))
    : pontoNoBox(c, noBox);
}

/** A janela atravessa a emenda da pista com o box: cortada nela, o rumo saltava até 44°. */
function rumoNoCaminho(c: Caminho, x: number): number {
  return angulo(pontoNoCaminho(c, x - MEIA_JANELA_RUMO), pontoNoCaminho(c, x + MEIA_JANELA_RUMO));
}

const CACHE_LINHA = new WeakMap<ResultadoCorrida, { pistaId: string; linha: LinhaDoTempoPit }>();

/**
 * Linha do tempo do pit da corrida, MEMOIZADA pela identidade de `resultado`:
 * as vagas dependem de todas as paradas e o replay pede isto a cada frame.
 * Com `esperas` não memoiza: quem passa (`replayDaCorrida`) já memoiza o resultado.
 */
export function linhaDoTempoDoPit(
  resultado: ResultadoCorrida,
  pista: Pick<Pista, 'id' | 'voltas' | 'tempoBaseMs'>,
  esperas?: ReadonlyMap<string, EsperaNaVaga>,
): LinhaDoTempoPit {
  const cache = esperas === undefined ? CACHE_LINHA.get(resultado) : undefined;
  if (cache !== undefined && cache.pistaId === pista.id) return cache.linha;

  const c = caminhoDaPista(pista.id);
  const porCarro = new Map<string, ParadaInterna[]>();
  if (c !== null) {
    const todas: ParadaInterna[] = [];
    for (const [jogadorId, voltas] of Object.entries(resultado.voltasDePit)) {
      const paradas = voltas
        .filter((v) => resultado.historicoVoltas[jogadorId][v] !== undefined)
        .map((v) => montarParada(c, pista, resultado, jogadorId, v));
      porCarro.set(jogadorId, paradas);
      todas.push(...paradas);
    }
    alocarVagas(c, todas, (p) => {
      const espera = esperas?.get(p.jogadorId);
      if (espera === undefined || p.volta < espera.volta) return { atraso: 0, prende: 0 };
      return p.volta === espera.volta ? { atraso: 0, prende: espera.ms } : { atraso: espera.ms, prende: 0 };
    });
  }

  const ativa = (jogadorId: string, tempoSimMs: number) =>
    porCarro.get(jogadorId)?.find((p) => tempoSimMs >= p.inicioVolta && tempoSimMs < p.fim);

  const linha: LinhaDoTempoPit = {
    totalDeVagas: c?.xVagas.length ?? 0,
    vagaEmX: (indice) => c?.pontosVagas[indice] ?? { x: 0, y: 0 },
    paradas: (jogadorId) => porCarro.get(jogadorId) ?? [],

    noBox(jogadorId, tempoSimMs) {
      const p = ativa(jogadorId, tempoSimMs);
      return p !== undefined && tempoSimMs >= p.entrada && tempoSimMs < p.retorno;
    },

    progresso(jogadorId, historico, tempoSimMs) {
      const p = ativa(jogadorId, tempoSimMs);
      if (p === undefined || c === null) return progressoNoReplay(historico, tempoSimMs, pista.voltas);
      if (tempoSimMs < p.inicio) return (p.volta - 1 + (tempoSimMs - p.inicioVolta) / p.tLimpo) / pista.voltas;
      return voltasDoCaminho(c, p, xDaParada(c, p, tempoSimMs)) / pista.voltas;
    },

    instanteDoProgresso(jogadorId, historico, voltas) {
      const janela = c === null
        ? undefined
        : porCarro.get(jogadorId)?.find((p) => voltas >= p.volta - 1 && voltas < voltasDoCaminho(c, p, c.total));
      if (janela === undefined) return instanteNasVoltas(historico, voltas);
      // Dentro da janela o progresso não tem inversa fechada: o pedaço parado é plano.
      let antes = janela.inicioVolta;
      let depois = janela.fim;
      for (let i = 0; i < PASSOS_BISSECAO; i++) {
        const meio = (antes + depois) / 2;
        if (linha.progresso(jogadorId, historico, meio) * pista.voltas < voltas) antes = meio;
        else depois = meio;
      }
      return depois;
    },

    posicao(jogadorId, historico, status, tempoSimMs, reduzido) {
      const p = ativa(jogadorId, tempoSimMs);
      let fracao: number;
      let rumoDoPit: number | null = null;
      if (p === undefined || c === null) {
        fracao = fracaoVisual(historico, tempoSimMs, status, pista.voltas);
      } else if (tempoSimMs < p.inicio) {
        fracao = (tempoSimMs - p.inicioVolta) / p.tLimpo;
      } else {
        const x = xDaParada(c, p, tempoSimMs);
        if (x >= DISTANCIA_RAMPA && x <= DISTANCIA_RAMPA + c.comprimentoBox) {
          const naVaga = reduzido || x === p.xVaga;
          return {
            ponto: naVaga ? c.pontosVagas[p.vaga] : pontoNoBox(c, x - DISTANCIA_RAMPA),
            sob: false,
            rumo: rumoNoCaminho(c, naVaga ? p.xVaga : x),
            fracaoNaPista: null,
          };
        }
        fracao = fracaoNaPista(c, x);
        rumoDoPit = rumoNoCaminho(c, x);
      }
      const naPista = posicaoNaPista(pista.id, fracao);
      return rumoDoPit === null ? naPista : { ...naPista, rumo: rumoDoPit };
    },
  };
  if (esperas === undefined) CACHE_LINHA.set(resultado, { pistaId: pista.id, linha });
  return linha;
}
