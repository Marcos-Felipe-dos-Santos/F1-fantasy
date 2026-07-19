/**
 * Hook do draft modo Single (PR 1.7a): casca fina de `useState` sobre as
 * transições puras de `fluxo-draft.ts`. Nenhuma regra de jogo mora aqui —
 * só orquestra estado de React em torno das chamadas à engine.
 */

import { useCallback, useState } from 'react';
import type { Dificuldade, DraftState, EscolhaDraft } from '../engine/types';
import { dataset } from './dataset-app';
import { aplicarEscolhaHumano, iniciarDraftSingle } from './fluxo-draft';

export interface UseDraftResultado {
  state: DraftState | null;
  erro: string | null;
  comecar: (seedTexto: string, dificuldade: Dificuldade) => void;
  escolher: (escolha: EscolhaDraft) => void;
  reiniciar: () => void;
}

export function useDraft(): UseDraftResultado {
  const [state, setState] = useState<DraftState | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const comecar = useCallback((seedTexto: string, dificuldade: Dificuldade) => {
    setErro(null);
    setState(iniciarDraftSingle(dataset, seedTexto, dificuldade));
  }, []);

  const escolher = useCallback(
    (escolha: EscolhaDraft) => {
      if (!state) return;
      try {
        setState(aplicarEscolhaHumano(dataset, state, escolha));
        setErro(null);
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    },
    [state],
  );

  const reiniciar = useCallback(() => {
    setState(null);
    setErro(null);
  }, []);

  return { state, erro, comecar, escolher, reiniciar };
}
