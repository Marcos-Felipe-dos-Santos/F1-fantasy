/**
 * A ÚNICA parte do jogo que fala com o Web Audio (PR 3b). Ela:
 * - cria o contexto uma vez por página (singleton) e o retoma no primeiro toque: o navegador exige
 *   um gesto antes de qualquer som, e o iOS cria o contexto suspenso;
 * - busca `/sons/*.ogg` por `fetch`, que a regra `connect-src 'self'` da CSP já permite (sem
 *   diretiva nova), e decodifica tudo antes da largada;
 * - suspende o contexto com a aba oculta e o retoma na volta, se já tocava;
 * - não faz nada se o aparelho não tiver Web Audio (`motorDeAudio()` devolve `null`).
 *
 * A cadeia do mestre é a do preview que o Marcos aprovou (`scripts/sons/montar-preview.ts`):
 * mestre (o volume do jogador) → compressor (limiar −10 dB, razão 4) → saída.
 */

import type { SaidaDeAudio, TocarSom } from './controlador';
import { CATALOGO_SONS, type SomDoCatalogo } from './catalogo';

export interface StatusDoAudio {
  decodificados: number;
  total: number;
  falhas: readonly { arquivo: string; erro: string }[];
  taxaHz: number;
  contexto: AudioContextState;
}

export interface MotorDeAudio {
  saida: SaidaDeAudio;
  /** Busca e decodifica os arquivos do catálogo. Idempotente: a segunda chamada devolve a mesma promessa. */
  carregar(): Promise<StatusDoAudio>;
  /** Ganho do mestre (`ganhoMestre` da preferência): 0 é mudo. */
  definirVolume(ganho: number): void;
  status(): StatusDoAudio;
}

type DocumentoDoAudio = Pick<Document, 'addEventListener' | 'removeEventListener' | 'hidden'>;

/** O que `audio.ts` usa do navegador, injetável para o teste (o projeto não tem jsdom). */
export interface AmbienteDeAudio {
  Contexto: (new () => AudioContext) | undefined;
  documento: DocumentoDoAudio | null;
  buscar: (url: string) => Promise<ArrayBuffer>;
}

const GESTOS = ['pointerdown', 'touchend', 'keydown'] as const;
const LIMIAR_COMPRESSOR_DB = -10;
const RAZAO_COMPRESSOR = 4;
const SUAVIZAR_VOLUME_S = 0.02;
/** `setTargetAtTime` chega a ~2% do caminho em 4 constantes de tempo: daí o `stop`. */
const CONSTANTES_ATE_PARAR = 4;
/** Folga do `stop` depois do fim do fade. */
const FOLGA_STOP_S = 0.01;

/** Os arquivos do catálogo, cada um uma vez, na ordem em que aparecem. */
export function arquivosDoCatalogo(): string[] {
  const todos = Object.values(CATALOGO_SONS).flatMap((s) =>
    'arquivo' in s
      ? [(s as SomDoCatalogo).arquivo]
      : Object.values(s as Record<string, SomDoCatalogo>).map((v) => v.arquivo),
  );
  return [...new Set(todos)];
}

interface Fonte {
  src: AudioBufferSourceNode;
  g: GainNode;
  inicioS: number;
}

export function criarMotorDeAudio(amb: AmbienteDeAudio): MotorDeAudio | null {
  if (amb.Contexto === undefined) return null;
  const ctx = new amb.Contexto();
  const mestre = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = LIMIAR_COMPRESSOR_DB;
  compressor.ratio.value = RAZAO_COMPRESSOR;
  mestre.connect(compressor);
  compressor.connect(ctx.destination);

  const arquivos = arquivosDoCatalogo();
  const buffers = new Map<string, AudioBuffer>();
  const falhas: { arquivo: string; erro: string }[] = [];
  const fontes = new Map<number, Fonte>();
  let proximo = 1;
  let carregando: Promise<StatusDoAudio> | null = null;
  let desbloqueado = ctx.state === 'running';

  const status = (): StatusDoAudio => ({
    decodificados: buffers.size,
    total: arquivos.length,
    falhas: [...falhas],
    taxaHz: ctx.sampleRate,
    contexto: ctx.state,
  });

  const doc = amb.documento;
  const aoGesto = () => {
    if (doc?.hidden) return;
    void ctx.resume().then(() => {
      if (desbloqueado) return;
      desbloqueado = true;
      for (const g of GESTOS) doc?.removeEventListener(g, aoGesto, true);
    });
  };
  if (!desbloqueado) for (const g of GESTOS) doc?.addEventListener(g, aoGesto, true);
  doc?.addEventListener('visibilitychange', () => {
    if (doc.hidden) {
      if (ctx.state === 'running') void ctx.suspend();
    } else if (desbloqueado) {
      void ctx.resume();
    }
  });

  const saida: SaidaDeAudio = {
    agoraS: () => ctx.currentTime,
    tocar(p: TocarSom): number {
      const buffer = buffers.get(p.som.arquivo);
      // Sem o arquivo (ainda decodificando, ou falhou): não soa, e o jogo segue.
      if (buffer === undefined) return -1;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      if (p.laco && p.som.laco) {
        src.loop = true;
        src.loopStart = p.som.laco.inicioS;
        src.loopEnd = p.som.laco.fimS;
      }
      if (p.taxa !== undefined) src.playbackRate.value = p.taxa;
      const g = ctx.createGain();
      g.gain.value = p.ganho;
      src.connect(g);
      g.connect(mestre);
      src.start(p.inicioS);
      if (p.fim) {
        g.gain.setValueAtTime(p.ganho, p.fim.emS);
        g.gain.linearRampToValueAtTime(0, p.fim.emS + p.fim.fadeS);
        src.stop(p.fim.emS + p.fim.fadeS + FOLGA_STOP_S);
      }
      const h = proximo++;
      fontes.set(h, { src, g, inicioS: p.inicioS });
      src.onended = () => {
        g.disconnect();
        fontes.delete(h);
      };
      return h;
    },
    ajustar(h, alvo, constanteS) {
      const f = fontes.get(h);
      if (f === undefined) return;
      if (alvo.ganho !== undefined)
        f.g.gain.setTargetAtTime(alvo.ganho, ctx.currentTime, constanteS);
      if (alvo.taxa !== undefined)
        f.src.playbackRate.setTargetAtTime(alvo.taxa, ctx.currentTime, constanteS);
    },
    parar(h, fadeS) {
      const f = fontes.get(h);
      if (f === undefined) return;
      fontes.delete(h);
      const agora = ctx.currentTime;
      if (f.inicioS > agora) {
        // Agendado e ainda não começou: desligado já, para não soar na tela seguinte.
        f.src.disconnect();
        f.g.disconnect();
        return;
      }
      f.g.gain.cancelScheduledValues(agora);
      f.g.gain.setTargetAtTime(0, agora, fadeS);
      f.src.stop(agora + fadeS * CONSTANTES_ATE_PARAR);
    },
  };

  return {
    saida,
    carregar() {
      carregando ??= Promise.all(
        arquivos.map(async (arquivo) => {
          try {
            buffers.set(arquivo, await ctx.decodeAudioData(await amb.buscar(`/${arquivo}`)));
          } catch (e) {
            falhas.push({ arquivo, erro: e instanceof Error ? e.message : String(e) });
          }
        }),
      ).then(status);
      return carregando;
    },
    definirVolume(ganho) {
      mestre.gain.setTargetAtTime(ganho, ctx.currentTime, SUAVIZAR_VOLUME_S);
    },
    status,
  };
}

function ambienteDoNavegador(): AmbienteDeAudio | null {
  // `window` sem `document` existe nos testes de render (stub de node): sem os dois, sem áudio.
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  // Safari antigo só tem o prefixado.
  const prefixado = (window as Window & { webkitAudioContext?: new () => AudioContext })
    .webkitAudioContext;
  return {
    Contexto: typeof AudioContext === 'undefined' ? prefixado : AudioContext,
    documento: document,
    buscar: async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    },
  };
}

let unico: MotorDeAudio | null | undefined;

/** O motor da página, criado na primeira chamada; `null` sem Web Audio (ou fora do navegador). */
export function motorDeAudio(): MotorDeAudio | null {
  if (unico === undefined) {
    const amb = ambienteDoNavegador();
    try {
      unico = amb === null ? null : criarMotorDeAudio(amb);
    } catch {
      // Contexto recusado pelo navegador (limite de contextos, política): o jogo segue sem som.
      unico = null;
    }
  }
  return unico;
}
