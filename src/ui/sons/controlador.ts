/**
 * Controlador dos sons de UMA corrida (PR 3b): a cada quadro do replay, decide o que toca, com a
 * agenda do PR 3a, e manda para uma `SaidaDeAudio`. Não conhece o Web Audio (isso é `audio.ts`) nem
 * o React (isso é `useSomDaCorrida`): é testável em node com uma saída falsa.
 *
 * Obrigações que o PR 3a deixou (contrato da agenda), todas aqui:
 * - a primeira chamada parte de `SIM_ANTES_DA_LARGADA` (a largada em 0 soa);
 * - `velRef` é calculado UMA vez, sobre o replay inteiro (`velocidadeDeReferencia`);
 * - o foco fica inativo no box, parado ou abandonado (passagens);
 * - as referências de distância e de passagem são os prioritários em pista;
 * - o spray toca como camada da passagem na chuva;
 * - o problema técnico toca o arquivo de `somDaCategoria` e é encerrado com fade em `duracaoRealMs`;
 * - o "Acelerar" não passa pelo salto de relógio: chama `encerrar()` antes da troca de fase.
 *   Na saída natural, só a torcida termina seu fade. Um salto do tempo SIMULADO maior que o do relógio
 *   também não soa (o quadro curto de uma busca não é "o que aconteceu agora").
 *
 * Números daqui que não vêm da agenda: ganhos do ambiente e fade da pistola vêm do preview aprovado
 * (`scripts/sons/montar-preview.ts`); `ANTECEDENCIA_S` é o plano do 3b. Limite do tom e fade da torcida
 * são o ajuste de ouvido do 3b. Os fades de evento e de encerramento são REGRA declarada aqui.
 */

import type { Pista, ResultadoCorrida } from '../../engine/types';
import { replayDaCorrida } from '../fim-da-corrida';
import type { Ponto, VelocidadeReplay } from '../fluxo-corrida';
import {
  admitir,
  DELTA_SALTO_MS,
  detectarPassagens,
  distanciaAoMaisProximo,
  duracaoRealMs,
  ehPrioritario,
  eventosDaCorrida,
  eventosNoIntervalo,
  focoDoSom,
  ganhoDoEvento,
  mixerVazio,
  passagensVazias,
  prioritarios,
  SIM_ANTES_DA_LARGADA,
  somDaCategoria,
  somDoMotor,
  sonsDaPassagem,
  velocidadeEntre,
  type CategoriaSom,
  type Decisao,
  type EstadoMixer,
  type EstadoPassagens,
  type EventoSom,
} from './agenda';
import { CATALOGO_SONS, type SomDoCatalogo } from './catalogo';

/** Agenda à frente do quadro, no relógio do áudio (plano do 3b). */
export const ANTECEDENCIA_S = 0.15;
/** Nada é agendado para antes disto: o `start` no passado soaria atrasado e cortado. */
const MINIMO_S = 0.005;
/** Ambiente do preview aprovado. */
export const GANHO_PELOTAO = 0.22;
export const GANHO_CHUVA = 0.3;
const ENTRADA_AMBIENTE_S = 0.1;
/** Constantes de tempo do motor e da marcha lenta, as do preview. */
const SUAVIZAR_MOTOR_S = 0.08;
/** Limite do alvo de playbackRate por segundo REAL, antes da suavização do Web Audio. */
const TAXA_MOTOR_POR_S = 0.5;
const DELTA_MOTOR_MAX_MS = 100;
const TAXA_MOTOR_INICIAL = 0.6;
/** Fim da pistola (preview), da torcida (ajuste de ouvido) e dos eventos de duração fixa. */
export const FADE_PISTOLA_S = 0.015;
export const FADE_TORCIDA_S = 2.5;
export const FADE_EVENTO_S = 0.06;
/** Voz roubada no teto e tudo no `encerrar`. */
const FADE_ROUBO_S = 0.01;
export const FADE_ENCERRAR_S = 0.03;
/** Passo da amostragem de `velocidadeDeReferencia`, em ms simulados. */
export const PASSO_VEL_REF_MS = 250;

const FIM_COM_FADE: Partial<Record<CategoriaSom, number>> = {
  pistola: FADE_PISTOLA_S,
  torcida: FADE_TORCIDA_S,
  derrapagem: FADE_EVENTO_S,
  problema: FADE_EVENTO_S,
  abandono: FADE_EVENTO_S,
};

export interface TocarSom {
  som: SomDoCatalogo;
  /** No relógio do áudio. */
  inicioS: number;
  ganho: number;
  /** Repete o `laco` do catálogo. */
  laco?: boolean;
  taxa?: number;
  /** A partir de `emS` o ganho cai a 0 em `fadeS`, e o som para. */
  fim?: { emS: number; fadeS: number };
}

/** O que `tocar` devolve quando não tocou (arquivo ainda decodificando, ou que falhou). */
export const SEM_SOM = -1;

/**
 * O que o controlador pede ao áudio. `tocar` devolve um identificador para `ajustar` e `parar`, ou
 * `SEM_SOM`. `ativa`: o relógio do áudio anda (contexto rodando); suspenso, `agoraS` fica parado.
 */
export interface SaidaDeAudio {
  agoraS(): number;
  ativa(): boolean;
  tocar(p: TocarSom): number;
  ajustar(h: number, alvo: { ganho?: number; taxa?: number }, constanteS: number): void;
  parar(h: number, fadeS: number): void;
}

/** Um carro no quadro, das posições que a `TelaCorrida` já calcula. */
export interface CarroDoSom {
  id: string;
  ponto: Ponto;
  /** `false` no box (`fracaoNaPista === null`). */
  naPista: boolean;
  /** `replay.parado`: parado no incidente (ou abandonado). */
  parado: boolean;
  abandonou: boolean;
}

/** O que não muda durante a corrida. */
export interface CorridaDoSom {
  eventos: readonly EventoSom[];
  chuva: boolean;
  humanos: readonly string[];
  /** Convenção de `TelaCorrida`: `undefined` no Single, `null` para o espectador online. */
  jogadorLocalId: string | null | undefined;
  velRef: number;
}

export interface QuadroDoSom {
  tSim: number;
  deltaRealMs: number;
  velocidade: VelocidadeReplay;
  /** ms simulados por ms real (`escalaReplay`). */
  escala: number;
  carros: readonly CarroDoSom[];
}

export interface EstatisticasDoSom {
  tocadas: number;
  absorvidas: number;
  recusadas: number;
  roubadas: number;
  /** Por categoria, só as tocadas. */
  porCategoria: Partial<Record<CategoriaSom, number>>;
}

const CACHE_VEL_REF = new WeakMap<ResultadoCorrida, Map<string, number>>();

/**
 * A maior velocidade do carro na corrida inteira (u por segundo simulado), amostrada a cada
 * `PASSO_VEL_REF_MS`. Uma vez por corrida e carro: o máximo corrente faria o tom do motor cair
 * quando o carro ganhasse velocidade pela primeira vez.
 */
export function velocidadeDeReferencia(
  resultado: ResultadoCorrida,
  pista: Pick<Pista, 'id' | 'voltas' | 'tempoBaseMs'>,
  jogadorId: string,
): number {
  const porCarro = CACHE_VEL_REF.get(resultado) ?? new Map<string, number>();
  CACHE_VEL_REF.set(resultado, porCarro);
  const salvo = porCarro.get(jogadorId);
  if (salvo !== undefined) return salvo;
  const replay = replayDaCorrida(resultado, pista);
  const historico = resultado.historicoVoltas[jogadorId] ?? [];
  const status =
    resultado.classificacao.find((c) => c.jogadorId === jogadorId)?.status ?? 'terminou';
  let maior = 0;
  let anterior = replay.posicao(jogadorId, historico, status, 0, false);
  // Sem filtrar o box: ele anda no limite de 50% (PR 2c) e não muda o máximo. Medido no PR 3b (mutação
  // equivalente): 1100 carros em 50 corridas, nenhum diferente.
  for (let t = PASSO_VEL_REF_MS; t <= replay.fim; t += PASSO_VEL_REF_MS) {
    const p = replay.posicao(jogadorId, historico, status, t, false);
    maior = Math.max(maior, velocidadeEntre(anterior.ponto, p.ponto, PASSO_VEL_REF_MS));
    anterior = p;
  }
  porCarro.set(jogadorId, maior);
  return maior;
}

export function corridaDoSom(
  resultado: ResultadoCorrida,
  pista: Pick<Pista, 'id' | 'voltas' | 'tempoBaseMs'>,
  humanos: readonly string[],
  jogadorLocalId: string | null | undefined,
): CorridaDoSom {
  const replay = replayDaCorrida(resultado, pista);
  const foco = focoDoSom(humanos, jogadorLocalId);
  return {
    eventos: eventosDaCorrida(
      replay,
      resultado.classificacao.map((c) => c.jogadorId),
    ),
    chuva: resultado.chuva,
    humanos,
    jogadorLocalId,
    velRef: foco === null ? 0 : velocidadeDeReferencia(resultado, pista, foco),
  };
}

/** Cada laço é `null` até tocar de fato: o arquivo pode ainda estar decodificando (revisão do 3b). */
interface Loops {
  pelotao: number | null;
  chuva: number | null;
  motor: number | null;
  lenta: number | null;
}

export class ControladorDeSom {
  private readonly foco: string | null;
  private readonly prioritarios: ReadonlySet<string>;
  private loops: Loops = { pelotao: null, chuva: null, motor: null, lenta: null };
  private encerrado = false;
  private deSim = SIM_ANTES_DA_LARGADA;
  private anterior: { tSim: number; focoPonto: Ponto | null } | null = null;
  private velFoco = 0;
  private taxaMotor = TAXA_MOTOR_INICIAL;
  private inicioCicloMotor: number | null = null;
  /** Separada das vozes do mixer: seu fade pode continuar depois do fim do replay. */
  private torcida: { h: number; fimSim: number } | null = null;
  private mixer: EstadoMixer = mixerVazio();
  private passagens: EstadoPassagens = passagensVazias();
  /** Voz do mixer → identificador da saída. */
  private readonly vozes = new Map<number, number>();
  private readonly stats: EstatisticasDoSom = {
    tocadas: 0,
    absorvidas: 0,
    recusadas: 0,
    roubadas: 0,
    porCategoria: {},
  };

  constructor(
    private readonly saida: SaidaDeAudio,
    private readonly corrida: CorridaDoSom,
  ) {
    this.foco = focoDoSom(corrida.humanos, corrida.jogadorLocalId);
    this.prioritarios = prioritarios(corrida.humanos, corrida.jogadorLocalId);
  }

  estatisticas(): EstatisticasDoSom {
    return { ...this.stats, porCategoria: { ...this.stats.porCategoria } };
  }

  quadro(q: QuadroDoSom): void {
    if (this.encerrado) return;
    const agora = this.saida.agoraS();
    this.garantirLoops(agora);
    // Contexto suspenso (sem toque ainda, aba oculta, interrupção do iOS): o relógio do áudio não anda,
    // e agendar nele empilharia tudo para estourar junto na retomada (revisão do 3b). Os quadros
    // suspensos contam como salto mas seguem atualizando janela, passagens e quadro anterior: a
    // retomada não precisa de regra própria (mutação do 3b: ela era redundante).
    const ativa = this.saida.ativa();

    const anterior = this.anterior;
    // Salto do relógio real (aba voltando) ou do tempo simulado (busca), ou a primeira chamada já no
    // meio da corrida: o que foi atravessado não soa.
    const saltou =
      !ativa ||
      (anterior === null
        ? q.tSim > 0
        : q.deltaRealMs > DELTA_SALTO_MS ||
          Math.abs(q.tSim - anterior.tSim - q.deltaRealMs * q.escala) > DELTA_SALTO_MS * q.escala);

    const porId = new Map(q.carros.map((c) => [c.id, c]));
    const referencias = [...this.prioritarios].flatMap((id) => {
      const c = porId.get(id);
      return c !== undefined && c.naPista && !c.abandonou ? [c.ponto] : [];
    });

    const ate = q.tSim + ANTECEDENCIA_S * 1000 * q.escala;
    for (const e of eventosNoIntervalo(
      this.corrida.eventos,
      this.deSim,
      ate,
      saltou ? Infinity : q.deltaRealMs,
    )) {
      this.tocarEvento(e, q, agora, porId, referencias);
    }
    // Nunca recua: trocar para uma velocidade mais lenta encurta a janela, e recuar tocaria de novo o
    // que já foi agendado (revisão do 3b).
    this.deSim = Math.max(this.deSim, ate);

    this.passagensDoQuadro(q, agora, saltou, porId, referencias);
    this.motor(q, saltou, porId);

    const focoPonto = this.foco === null ? null : (porId.get(this.foco)?.ponto ?? null);
    this.anterior = { tSim: q.tSim, focoPonto };
  }

  /** Manual: cala tudo. Natural: após o último carro, deixa só a torcida concluir o fade agendado. */
  encerrar(preservarTorcidaNoFim = false): void {
    if (this.encerrado) return;
    this.encerrado = true;
    const { pelotao, chuva, motor, lenta } = this.loops;
    const preservar =
      preservarTorcidaNoFim && this.torcida !== null &&
      this.anterior !== null && this.anterior.tSim >= this.torcida.fimSim;
    for (const h of new Set([pelotao, chuva, motor, lenta, ...this.vozes.values(), this.torcida?.h ?? null]))
      if (h !== null && !(preservar && h === this.torcida?.h)) this.saida.parar(h, FADE_ENCERRAR_S);
    this.vozes.clear();
  }

  /** Começa os laços que faltam; o que ainda não tem arquivo tenta de novo no próximo quadro. */
  private garantirLoops(agora: number): void {
    const laco = (som: SomDoCatalogo, alvo: number | null, taxa?: number): number | null => {
      const h = this.saida.tocar({ som, inicioS: agora + MINIMO_S, ganho: 0, laco: true, taxa });
      if (h === SEM_SOM) return null;
      if (alvo !== null) this.saida.ajustar(h, { ganho: alvo }, ENTRADA_AMBIENTE_S);
      return h;
    };
    const l = this.loops;
    l.pelotao ??= laco(CATALOGO_SONS.pelotao, GANHO_PELOTAO);
    if (this.corrida.chuva) l.chuva ??= laco(CATALOGO_SONS.chuva, GANHO_CHUVA);
    // O motor e a marcha lenta entram mudos: o quadro do motor decide qual dos dois soa.
    if (this.foco !== null) {
      l.motor ??= laco(CATALOGO_SONS.motor, null, TAXA_MOTOR_INICIAL);
      l.lenta ??= laco(CATALOGO_SONS.lenta, null);
    }
  }

  private tocarEvento(
    e: EventoSom,
    q: QuadroDoSom,
    agora: number,
    porId: ReadonlyMap<string, CarroDoSom>,
    referencias: readonly Ponto[],
  ): void {
    const som = somDaCategoria(e.cat, q.velocidade);
    const durMs = duracaoRealMs(e, q.escala, q.velocidade);
    const fade = FIM_COM_FADE[e.cat];
    // A torcida não repete: reservar o fade dentro do arquivo evita o corte pelo EOF.
    const ateFadeS = e.cat === 'torcida'
      ? Math.min(durMs / 1000, Math.max(0, som.durS - FADE_TORCIDA_S))
      : durMs / 1000;
    const noEvento = agora + Math.max(MINIMO_S, (e.t - q.tSim) / q.escala / 1000);
    // O pico do arquivo cai no instante do evento.
    const inicioS = Math.max(agora + MINIMO_S, noEvento - (som.picoEmS ?? 0));
    const prioritario = ehPrioritario(e, this.prioritarios);
    const { estado, decisao } = admitir(this.mixer, {
      cat: e.cat,
      prioritario,
      agoraMs: inicioS * 1000,
      durMs: e.cat === 'torcida' ? (ateFadeS + FADE_TORCIDA_S) * 1000 : durMs,
    });
    this.mixer = estado;
    this.contar(e.cat, decisao);
    if (decisao.tipo !== 'tocar') return;
    if (decisao.roubada !== undefined) {
      const h = this.vozes.get(decisao.roubada);
      if (h !== undefined) this.saida.parar(h, FADE_ROUBO_S);
    }
    // Só as vozes que o mixer ainda tem: as expiradas e a roubada saem do mapa.
    const vivas = new Set(estado.vozes.map((v) => v.id));
    for (const id of this.vozes.keys()) if (!vivas.has(id)) this.vozes.delete(id);

    const carro = e.carro === null ? undefined : porId.get(e.carro);
    const distancia = carro === undefined ? null : distanciaAoMaisProximo(carro.ponto, referencias);
    const h = this.saida.tocar({
      som,
      inicioS,
      ganho: ganhoDoEvento(e, this.prioritarios, distancia),
      laco: e.cat === 'pistola',
      fim: fade === undefined ? undefined : { emS: inicioS + ateFadeS, fadeS: fade },
    });
    this.vozes.set(decisao.id, h);
    if (e.cat === 'torcida' && h !== SEM_SOM) this.torcida = { h, fimSim: e.fim ?? e.t };
  }

  private passagensDoQuadro(
    q: QuadroDoSom,
    agora: number,
    saltou: boolean,
    porId: ReadonlyMap<string, CarroDoSom>,
    referencias: readonly Ponto[],
  ): void {
    const humanos = [...this.prioritarios].flatMap((id) => {
      const c = porId.get(id);
      return c === undefined
        ? []
        : [{ id, ponto: c.ponto, ativo: c.naPista && !c.parado && !c.abandonou }];
    });
    const carros = q.carros.map((c) => ({
      id: c.id,
      ponto: c.ponto,
      ativo: c.naPista && !c.abandonou,
    }));
    const { estado, novas } = detectarPassagens(
      saltou ? passagensVazias() : this.passagens,
      q.tSim,
      q.escala,
      humanos,
      carros,
    );
    this.passagens = estado;
    if (saltou) return;
    for (const p of novas) {
      for (const cat of sonsDaPassagem(this.corrida.chuva)) {
        this.tocarEvento({ cat, carro: p.carro, t: p.tMinimo }, q, agora, porId, referencias);
      }
    }
  }

  private motor(q: QuadroDoSom, saltou: boolean, porId: ReadonlyMap<string, CarroDoSom>): void {
    if (this.foco === null || this.loops.motor === null || this.loops.lenta === null) return;
    const carro = porId.get(this.foco);
    if (carro === undefined) return;
    const anterior = this.anterior;
    if (!saltou && anterior?.focoPonto != null && q.tSim > anterior.tSim) {
      this.velFoco = velocidadeEntre(anterior.focoPonto, carro.ponto, q.tSim - anterior.tSim);
    }
    const { taxa, ganhoMotor, ganhoLenta } = somDoMotor(
      this.velFoco,
      this.corrida.velRef,
      carro.abandonou,
    );
    const passo = TAXA_MOTOR_POR_S * Math.max(0, Math.min(q.deltaRealMs, DELTA_MOTOR_MAX_MS)) / 1000;
    this.taxaMotor += Math.max(-passo, Math.min(passo, taxa - this.taxaMotor));
    // Três segundos de ronco, três de descanso, medidos no relógio do áudio.
    // O último meio segundo sai gradualmente; a retomada usa a suavização do ganho.
    const agoraMotor = this.saida.agoraS();
    this.inicioCicloMotor ??= agoraMotor;
    const faseMotor = (agoraMotor - this.inicioCicloMotor) % 6;
    const envelopeMotor = faseMotor < 2.5 ? 1 : faseMotor < 3 ? (3 - faseMotor) / 0.5 : 0;
    this.saida.ajustar(this.loops.motor, { ganho: ganhoMotor * envelopeMotor, taxa: this.taxaMotor }, SUAVIZAR_MOTOR_S);
    this.saida.ajustar(this.loops.lenta, { ganho: ganhoLenta }, SUAVIZAR_MOTOR_S);
  }

  private contar(cat: CategoriaSom, d: Decisao): void {
    if (d.tipo === 'absorvida') this.stats.absorvidas++;
    else if (d.tipo === 'recusada') this.stats.recusadas++;
    else {
      this.stats.tocadas++;
      this.stats.porCategoria[cat] = (this.stats.porCategoria[cat] ?? 0) + 1;
      if (d.roubada !== undefined) this.stats.roubadas++;
    }
  }
}
