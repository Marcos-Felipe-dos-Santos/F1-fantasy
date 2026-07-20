/**
 * Hook da corrida do modo Single (PR 1.7b): casca fina de `useState`/`useRef`
 * sobre `prepararCorrida` (engine) e a matemática pura de replay de
 * `fluxo-corrida.ts`. Nenhuma regra de jogo mora aqui — só orquestra o
 * relógio do replay (via `requestAnimationFrame`, permitido na UI — a
 * proibição de `performance.now`/`Date.now` é só na engine, ver CLAUDE.md).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DraftState, Pista, ResultadoCorrida, ResultadoQuali } from '../engine/types';
import { dataset } from './dataset-app';
import { escalaReplay, prepararCorrida } from './fluxo-corrida';

export type FaseCorrida = 'grid' | 'replay' | 'resultado';

/** Tempo de relógio (ms) que o replay espera parado no resultado final antes de trocar de fase sozinho. */
const PAUSA_FINAL_MS = 1000;

export interface UseCorridaResultado {
  fase: FaseCorrida;
  pista: Pista;
  grid: ResultadoQuali;
  resultado: ResultadoCorrida;
  /** Tempo simulado (ms) decorrido de corrida no instante atual do replay. */
  tempoSimMs: number;
  /** Fase 'grid' → 'replay': larga a corrida e começa a animar o replay. */
  largar: () => void;
  /** Pula direto pro resultado final, de qualquer fase (GDD: assistir ou pular). */
  acelerar: () => void;
}

export function useCorrida(state: DraftState): UseCorridaResultado {
  const [{ pista, grid, resultado }] = useState(() => prepararCorrida(dataset, state));
  const [fase, setFase] = useState<FaseCorrida>('grid');
  const [tempoSimMs, setTempoSimMs] = useState(0);

  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  // Espelha `tempoSimMs` fora do ciclo de render: o passo do rAF lê/escreve
  // aqui (não no updater de `setState`) pra manter os efeitos colaterais
  // (agendar o próximo rAF/timeout) fora de qualquer função que o React
  // possa invocar mais de uma vez (StrictMode invoca updaters de `setState`
  // 2x em dev pra flagar impureza — um updater que agenda rAF/timeout dobra
  // os callbacks agendados a cada frame e trava a aba em segundos).
  const tempoSimRef = useRef(0);

  const tempoVencedorMs = useMemo(() => resultado.classificacao[0].tempoTotal, [resultado]);
  const fatorEscala = useMemo(
    () => escalaReplay(tempoVencedorMs, pista.voltas),
    [tempoVencedorMs, pista.voltas],
  );

  const pararAnimacao = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Limpa qualquer animação/timeout pendente ao desmontar.
  useEffect(() => pararAnimacao, [pararAnimacao]);

  const largar = useCallback(() => {
    pararAnimacao();
    tempoSimRef.current = 0;
    setTempoSimMs(0);
    setFase('replay');

    let ultimoTimestamp: number | null = null;

    const passo = (timestamp: number) => {
      if (ultimoTimestamp === null) ultimoTimestamp = timestamp;
      const deltaRealMs = timestamp - ultimoTimestamp;
      ultimoTimestamp = timestamp;

      const proximo = tempoSimRef.current + deltaRealMs * fatorEscala;

      if (proximo >= tempoVencedorMs) {
        tempoSimRef.current = tempoVencedorMs;
        setTempoSimMs(tempoVencedorMs);
        rafRef.current = null;
        timeoutRef.current = window.setTimeout(() => setFase('resultado'), PAUSA_FINAL_MS);
        return;
      }

      tempoSimRef.current = proximo;
      setTempoSimMs(proximo);
      rafRef.current = requestAnimationFrame(passo);
    };

    rafRef.current = requestAnimationFrame(passo);
  }, [fatorEscala, tempoVencedorMs, pararAnimacao]);

  const acelerar = useCallback(() => {
    pararAnimacao();
    tempoSimRef.current = tempoVencedorMs;
    setTempoSimMs(tempoVencedorMs);
    setFase('resultado');
  }, [pararAnimacao, tempoVencedorMs]);

  return { fase, pista, grid, resultado, tempoSimMs, largar, acelerar };
}
