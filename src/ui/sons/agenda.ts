/**
 * Agenda dos sons da corrida (PR 3a): o QUE soa e QUANDO, em funções puras sobre o replay que já
 * existe. Não toca áudio (isso é o PR 3b) e não muda nada do replay: só lê.
 *
 * De onde vem cada número (revisão do PR 3a: nem todos são medição):
 * - MEDIDOS: mixer (agrupar 250 ms, teto 6, prioridades) em `scripts/medir-pr3.preview.test.ts`,
 *   sobre a população de eventos daquela medição (largada 2,5 s, pistola 600 ms, saída do pit,
 *   cruzamentos). A população daqui é outra (sem saída do pit nem cruzamento; com passagem e
 *   spray; pistola do tamanho da parada), então o teto de 6 vale como proposta a reconferir no 3b;
 *   `PERTO_U`/`HISTERESE` na cena real (`scripts/sons/cena.preview.test.ts`).
 * - DECISÃO DO MARCOS: 700 ms da derrapagem (PR 2d); foco e prioridade (2026-11-06): 1 humano no
 *   aparelho, o motor dele; 2+ humanos, nenhum motor, prioridade nos eventos de cada humano; online,
 *   o local; espectador, nenhum. E, também em 2026-11-06: a distância de referência é a do humano
 *   MAIS PRÓXIMO (passagem perto de qualquer humano; eventos dos outros atenuados por ela); sem
 *   humano em pista, volume médio fixo e nenhuma passagem; problema técnico toca o chocalho do
 *   abandono, mais curto e mais baixo, e a derrapagem fica só para o erro de pilotagem.
 * - OUVIDOS, não medidos: os ganhos e o mapeamento do motor são os do preview que o Marcos aprovou
 *   no celular (`scripts/sons/montar-preview.ts`), copiados para cá para o 3b soar igual.
 * - REGRA declarada aqui: `DELTA_SALTO_MS`, `HORIZONTE_REAL_MS`, `ANTERIOR_MAX_REAL_MS`,
 *   `GANHO_SEM_FOCO`, e os números do "mais curto e mais baixo" do problema técnico
 *   (`DURACAO_PROBLEMA_MS`, `GANHO_CATEGORIA.problema`), a confirmar no ouvido no 3b.
 */

import type { Ponto, VelocidadeReplay } from '../fluxo-corrida';
import type { ReplayDaCorrida } from '../fim-da-corrida';
import { DURACAO_EFEITO_MS } from '../incidentes-replay';
import { CATALOGO_SONS, type SomDoCatalogo } from './catalogo';

/**
 * `derrapagem` é o incidente de `erro-piloto`; `problema` o de `problema-tecnico` (decisão do Marcos,
 * 2026-11-06; o efeito visual do PR 2d segue sem separá-los). `spray` é a camada da passagem na chuva.
 */
export type CategoriaSom =
  | 'largada'
  | 'pistola'
  | 'derrapagem'
  | 'problema'
  | 'abandono'
  | 'torcida'
  | 'passagem'
  | 'spray';

/** Um som de evento. Tempos em ms SIMULADOS; `fim` só nos que duram o intervalo do evento. */
export interface EventoSom {
  cat: CategoriaSom;
  /** `null` na largada e na torcida, que são da corrida, não de um carro. */
  carro: string | null;
  t: number;
  fim?: number;
}

/** Prioridade no teto de vozes (a de `medir-pr3`; passagem e spray herdam a do cruzamento). */
export const PRIORIDADE: Record<CategoriaSom, number> = {
  largada: 5,
  torcida: 5,
  abandono: 4,
  derrapagem: 3,
  problema: 3,
  pistola: 2,
  passagem: 1,
  spray: 1,
};
/** Somado à prioridade do evento de um humano prioritário: passa à frente de qualquer categoria. */
export const BONUS_PRIORITARIO = 10;
export const JANELA_AGRUPAR_MS = 250;
export const TETO_VOZES = 6;
/**
 * Delta REAL de um quadro acima disto é salto de relógio (aba voltando do segundo plano): o que foi
 * atravessado não soa atrasado. O "Acelerar" NÃO passa por aqui: ele encerra o replay
 * (`useCorrida.acelerar`), e o 3b tem de calar os sons nessa troca de fase.
 */
export const DELTA_SALTO_MS = 250;
/**
 * Primeiro `deSim` de uma corrida. O intervalo é meio-aberto, (deSim, ateSim], e a largada está em
 * 0: partir de 0 a perderia (achado da revisão do PR 3a).
 */
export const SIM_ANTES_DA_LARGADA = -1;

/** "Passa perto", em u do viewBox; o episódio só acaba além de `PERTO_U × HISTERESE`. */
export const PERTO_U = 45;
export const HISTERESE = 1.5;
/** A menor distância prevista mais longe que isto (ms reais) não é passagem: carro andando junto. */
export const HORIZONTE_REAL_MS = 500;
/** Quadro anterior mais velho que isto (ms reais) não serve para estimar velocidade. */
export const ANTERIOR_MAX_REAL_MS = 100;

/** Atenuação dos eventos dos outros carros pela distância ao humano mais próximo. */
export const ALCANCE_U = 500;
export const GANHO_MIN = 0.12;
export const GANHO_MAX_OUTROS = 0.7;
/** Fator dos outros carros que não é passagem (preview: `× 0,8`). */
export const FATOR_OUTROS_NAO_PASSAGEM = 0.8;
/** Sem humano em pista (espectador online, humanos fora), os outros soam a este ganho médio fixo. */
export const GANHO_SEM_FOCO = 0.35;
/** Ajuste por categoria, o do preview aprovado. */
export const GANHO_CATEGORIA: Record<CategoriaSom, number> = {
  largada: 1,
  torcida: 0.9,
  abandono: 1,
  derrapagem: 1,
  /** "Mais baixo" que o abandono, cujo arquivo usa. */
  problema: 0.6,
  pistola: 0.9,
  passagem: 0.75,
  spray: 0.5,
};

/** Motor: abaixo disto (u/s simulado) o carro está parado e a marcha lenta assume. */
export const PARADO_U_S = 1;
export const GANHO_MOTOR = 0.15;
export const GANHO_LENTA = 0.5;
const TAXA_MIN = 0.6;
const TAXA_FAIXA = 0.5;

/** "Mais curto" que os 900 ms do abandono, cujo arquivo usa (o 3b o encerra com fade). */
export const DURACAO_PROBLEMA_MS = 500;

const DURACAO_FIXA_MS: Partial<Record<CategoriaSom, number>> = {
  derrapagem: DURACAO_EFEITO_MS,
  problema: DURACAO_PROBLEMA_MS,
  abandono: 900,
};

const ORDEM_CAT: CategoriaSom[] = ['largada', 'pistola', 'derrapagem', 'problema', 'abandono', 'passagem', 'spray', 'torcida'];

type LinhaDosSons = Pick<ReplayDaCorrida, 'paradas' | 'incidentes' | 'abandono' | 'bandeirada' | 'fim'>;

/** Comparador por code unit: `localeCompare` consulta a collation do host (cerca do `eslint.config.js`). */
const porCodeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** Os eventos sonoros da corrida, em ordem de tempo (empate: categoria, depois carro). */
export function eventosDaCorrida(replay: LinhaDosSons, ids: readonly string[]): EventoSom[] {
  const ev: EventoSom[] = [{ cat: 'largada', carro: null, t: 0 }];
  for (const id of ids) {
    for (const p of replay.paradas(id)) ev.push({ cat: 'pistola', carro: id, t: p.chegada, fim: p.partida });
    for (const x of replay.incidentes(id)) {
      ev.push({ cat: x.evento.tipo === 'problema-tecnico' ? 'problema' : 'derrapagem', carro: id, t: x.inicio });
    }
    const a = replay.abandono(id);
    if (a) ev.push({ cat: 'abandono', carro: id, t: a.instante });
  }
  if (Number.isFinite(replay.bandeirada)) ev.push({ cat: 'torcida', carro: null, t: replay.bandeirada, fim: replay.fim });
  return ev.sort(
    (a, b) => a.t - b.t || ORDEM_CAT.indexOf(a.cat) - ORDEM_CAT.indexOf(b.cat) || porCodeUnit(a.carro ?? '', b.carro ?? ''),
  );
}

/** O arquivo de cada categoria; o problema técnico usa o chocalho do abandono (`abandono-v3`). */
export function somDaCategoria(cat: CategoriaSom, velocidade: VelocidadeReplay): SomDoCatalogo {
  if (cat === 'passagem' || cat === 'spray' || cat === 'largada') return CATALOGO_SONS[cat][velocidade];
  return CATALOGO_SONS[cat === 'problema' ? 'abandono' : cat];
}

/** Os sons de uma passagem: na chuva, o spray vai junto, como camada (e conta como voz). */
export function sonsDaPassagem(chuva: boolean): CategoriaSom[] {
  return chuva ? ['passagem', 'spray'] : ['passagem'];
}

/**
 * O carro cujo motor soa em destaque. `jogadorLocalId` segue a convenção de `TelaCorrida`:
 * `undefined` no Single (todo humano joga neste aparelho), `null` no online para o espectador.
 */
export function focoDoSom(humanos: readonly string[], jogadorLocalId: string | null | undefined): string | null {
  // Online: o local, ou `null` para o espectador (mutação do PR 3a: um `if` só para o null era redundante).
  if (jogadorLocalId !== undefined) return jogadorLocalId;
  return humanos.length === 1 ? humanos[0] : null;
}

/**
 * De quem os eventos soam cheios e com prioridade: quem joga neste aparelho. São também as
 * REFERÊNCIAS de distância: o 3b passa as posições dos que estão em pista a `distanciaAoMaisProximo`
 * e a `detectarPassagens`.
 */
export function prioritarios(humanos: readonly string[], jogadorLocalId: string | null | undefined): ReadonlySet<string> {
  if (jogadorLocalId === null) return new Set();
  if (jogadorLocalId !== undefined) return new Set([jogadorLocalId]);
  return new Set(humanos);
}

/** Prioritário no mixer: largada e torcida (da corrida) e os eventos de quem joga no aparelho. */
export function ehPrioritario(evento: EventoSom, prioritariosDoAparelho: ReadonlySet<string>): boolean {
  return evento.carro === null || prioritariosDoAparelho.has(evento.carro);
}

/** Distância (u) do ponto ao humano mais próximo; `null` sem humano em pista. */
export function distanciaAoMaisProximo(ponto: Ponto, humanosEmPista: readonly Ponto[]): number | null {
  let menor: number | null = null;
  for (const h of humanosEmPista) {
    const d = Math.hypot(h.x - ponto.x, h.y - ponto.y);
    if (menor === null || d < menor) menor = d;
  }
  return menor;
}

/**
 * Ganho do evento, já com o ajuste da categoria. `distancia`: do carro do evento ao humano mais
 * próximo em pista, em u (`distanciaAoMaisProximo`; `null` sem humano em pista).
 */
export function ganhoDoEvento(evento: EventoSom, prioritariosDoAparelho: ReadonlySet<string>, distancia: number | null): number {
  const cat = GANHO_CATEGORIA[evento.cat];
  if (ehPrioritario(evento, prioritariosDoAparelho)) return cat;
  const fator = evento.cat === 'passagem' || evento.cat === 'spray' ? 1 : FATOR_OUTROS_NAO_PASSAGEM;
  if (distancia === null) return GANHO_SEM_FOCO * cat;
  return Math.max(GANHO_MIN, Math.min(GANHO_MAX_OUTROS, 1 - distancia / ALCANCE_U)) * fator * cat;
}

/**
 * Eventos com `t` em (deSim, ateSim]. A primeira chamada de uma corrida parte de
 * `SIM_ANTES_DA_LARGADA`. Num salto de relógio, nenhum: o que foi atravessado não soa atrasado.
 */
export function eventosNoIntervalo(eventos: readonly EventoSom[], deSim: number, ateSim: number, deltaRealMs: number): EventoSom[] {
  if (deltaRealMs > DELTA_SALTO_MS) return [];
  return eventos.filter((e) => e.t > deSim && e.t <= ateSim);
}

/** Quanto o som dura em ms reais, na velocidade do replay. A torcida não passa do arquivo. */
export function duracaoRealMs(evento: EventoSom, escala: number, velocidade: VelocidadeReplay): number {
  const fixa = DURACAO_FIXA_MS[evento.cat];
  if (fixa !== undefined) return fixa;
  if (evento.cat === 'passagem' || evento.cat === 'spray' || evento.cat === 'largada') {
    return Math.round(CATALOGO_SONS[evento.cat][velocidade].durS * 1000);
  }
  const intervalo = Math.round(((evento.fim ?? evento.t) - evento.t) / escala);
  return evento.cat === 'torcida' ? Math.min(intervalo, Math.round(CATALOGO_SONS.torcida.durS * 1000)) : intervalo;
}

// ---------------------------------------------------------------- mixer

export interface VozAtiva {
  id: number;
  cat: CategoriaSom;
  prioritario: boolean;
  inicio: number;
  fim: number;
}

export interface EstadoMixer {
  vozes: readonly VozAtiva[];
  ultimaPorCategoria: Readonly<Partial<Record<CategoriaSom, number>>>;
  proximoId: number;
}

export type Decisao = { tipo: 'tocar'; id: number; roubada?: number } | { tipo: 'absorvida' } | { tipo: 'recusada' };

export function mixerVazio(): EstadoMixer {
  return { vozes: [], ultimaPorCategoria: {}, proximoId: 1 };
}

const prioridadeDe = (v: { cat: CategoriaSom; prioritario: boolean }) => PRIORIDADE[v.cat] + (v.prioritario ? BONUS_PRIORITARIO : 0);

/**
 * O mixer de `medir-pr3`, em tempo REAL: (0) som de duração nula não ocupa voz (`mixar` também os
 * pulava); (1) na mesma categoria, evento não prioritário a menos de `JANELA_AGRUPAR_MS` do último
 * que tocou é absorvido; (2) com `TETO_VOZES` tocando, o novo rouba a voz de menor prioridade (a mais
 * velha no empate) se for mais prioritário que ela, ou é recusado.
 */
export function admitir(
  estado: EstadoMixer,
  pedido: { cat: CategoriaSom; prioritario: boolean; agoraMs: number; durMs: number },
): { estado: EstadoMixer; decisao: Decisao } {
  const { cat, prioritario, agoraMs, durMs } = pedido;
  let vozes = estado.vozes.filter((v) => v.fim > agoraMs);
  if (durMs <= 0) return { estado: { ...estado, vozes }, decisao: { tipo: 'recusada' } };
  const ultima = estado.ultimaPorCategoria[cat];
  if (!prioritario && ultima !== undefined && agoraMs - ultima < JANELA_AGRUPAR_MS) {
    return { estado: { ...estado, vozes }, decisao: { tipo: 'absorvida' } };
  }
  let roubada: number | undefined;
  if (vozes.length >= TETO_VOZES) {
    const minha = prioridadeDe(pedido);
    let alvo: VozAtiva | undefined;
    for (const v of vozes) {
      if (prioridadeDe(v) >= minha) continue;
      if (alvo === undefined || prioridadeDe(v) < prioridadeDe(alvo) || (prioridadeDe(v) === prioridadeDe(alvo) && v.inicio < alvo.inicio)) alvo = v;
    }
    if (alvo === undefined) return { estado: { ...estado, vozes }, decisao: { tipo: 'recusada' } };
    roubada = alvo.id;
    vozes = vozes.filter((v) => v.id !== roubada);
  }
  const id = estado.proximoId;
  return {
    estado: {
      vozes: [...vozes, { id, cat, prioritario, inicio: agoraMs, fim: agoraMs + durMs }],
      ultimaPorCategoria: { ...estado.ultimaPorCategoria, [cat]: agoraMs },
      proximoId: id + 1,
    },
    decisao: roubada === undefined ? { tipo: 'tocar', id } : { tipo: 'tocar', id, roubada },
  };
}

// ---------------------------------------------------------------- passagens

/** Ponto de um carro no quadro; `ativo` = na pista (e, para um humano, andando). */
export interface CarroNoQuadro {
  id: string;
  ponto: Ponto;
  ativo: boolean;
}

export interface EstadoPassagens {
  /** Pares `humano>carro` dentro do episódio (abaixo de `PERTO_U`, sem sair além da histerese). */
  perto: ReadonlySet<string>;
  /** Posição relativa do carro ao humano no quadro anterior, por par ativo. */
  anterior: ReadonlyMap<string, { dx: number; dy: number; t: number }>;
}

export function passagensVazias(): EstadoPassagens {
  return { perto: new Set(), anterior: new Map() };
}

/**
 * Passagens a cada quadro, perto de QUALQUER humano (decisão do Marcos, 2026-11-06): cada par
 * humano × carro é um episódio próprio, como o par jogador × carro da cena real. Só contam com o
 * humano ATIVO (na pista e andando) e o carro ativo (na pista); humano inativo (box, parado,
 * abandonado) encerra só os episódios dele, e sem humano ativo nada soa. Dois humanos que se cruzam
 * são uma passagem só. Dispara uma vez quando o carro entra a menos de `PERTO_U` e prevê o instante
 * da menor distância pela velocidade relativa do quadro anterior (o pico do som deve cair nele). Sem
 * quadro anterior recente, afastando-se, ou com o mínimo além de `HORIZONTE_REAL_MS`, o mínimo é
 * agora. O agrupamento de 250 ms do mixer vale para as passagens (não são prioritárias).
 * `escala`: ms simulados por ms real (`escalaReplay`).
 */
export function detectarPassagens(
  estado: EstadoPassagens,
  tSim: number,
  escala: number,
  humanos: readonly CarroNoQuadro[],
  carros: readonly CarroNoQuadro[],
): { estado: EstadoPassagens; novas: { carro: string; humano: string; tMinimo: number }[] } {
  const perto = new Set<string>();
  const anterior = new Map<string, { dx: number; dy: number; t: number }>();
  const novas: { carro: string; humano: string; tMinimo: number }[] = [];
  const ehHumano = new Set(humanos.map((h) => h.id));
  for (const h of humanos) {
    if (!h.ativo) continue;
    for (const o of carros) {
      if (!o.ativo) continue;
      // Par de humanos: só uma vez, pelo de id menor (code unit). A mesma regra tira o humano de si
      // mesmo (mutação do PR 3a: um `o.id === h.id` aqui era redundante).
      if (ehHumano.has(o.id) && !(h.id < o.id)) continue;
      const par = `${h.id}>${o.id}`;
      const dx = o.ponto.x - h.ponto.x;
      const dy = o.ponto.y - h.ponto.y;
      const d = Math.hypot(dx, dy);
      anterior.set(par, { dx, dy, t: tSim });
      const estava = estado.perto.has(par);
      if (estava ? d < PERTO_U * HISTERESE : d < PERTO_U) perto.add(par);
      if (estava || d >= PERTO_U) continue;
      let tMinimo = tSim;
      const a = estado.anterior.get(par);
      if (a !== undefined && tSim > a.t && tSim - a.t <= ANTERIOR_MAX_REAL_MS * escala) {
        const vx = (dx - a.dx) / (tSim - a.t);
        const vy = (dy - a.dy) / (tSim - a.t);
        const v2 = vx * vx + vy * vy;
        const ate = v2 > 0 ? -(dx * vx + dy * vy) / v2 : 0;
        if (ate > 0 && ate <= HORIZONTE_REAL_MS * escala) tMinimo = tSim + ate;
      }
      novas.push({ carro: o.id, humano: h.id, tMinimo });
    }
  }
  return { estado: { perto, anterior }, novas };
}

// ---------------------------------------------------------------- motor

/** Velocidade entre duas posições, em u por segundo simulado. */
export function velocidadeEntre(a: Ponto, b: Ponto, dtSimMs: number): number {
  return dtSimMs > 0 ? Math.hypot(b.x - a.x, b.y - a.y) / (dtSimMs / 1000) : 0;
}

/**
 * Motor do carro em destaque: o tom (`playbackRate`) vai de 0,6 a 1,1 com a velocidade sobre
 * `velRef`, que o 3b calcula UMA vez, sobre o replay inteiro (a maior velocidade do foco na pista),
 * e não como máximo corrente. Parado, o motor some e a marcha lenta assume; depois do abandono do
 * foco, os dois calam.
 */
export function somDoMotor(
  velocidade: number,
  velRef: number,
  abandonou = false,
): { taxa: number; ganhoMotor: number; ganhoLenta: number } {
  const r = velRef > 0 ? Math.min(1, velocidade / velRef) : 0;
  const taxa = TAXA_MIN + TAXA_FAIXA * r;
  if (abandonou) return { taxa, ganhoMotor: 0, ganhoLenta: 0 };
  if (velocidade < PARADO_U_S) return { taxa, ganhoMotor: 0, ganhoLenta: GANHO_LENTA };
  return { taxa, ganhoMotor: GANHO_MOTOR, ganhoLenta: 0 };
}
