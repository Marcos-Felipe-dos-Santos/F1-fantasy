/**
 * Hook do draft (PR 1.7a; generalizado pra N humanos no PR 2.1a): casca fina
 * de `useState` sobre as transições puras de `fluxo-draft.ts`. Nenhuma regra
 * de jogo mora aqui — só orquestra estado de React em torno das chamadas à
 * engine. `comecar` sem `humanos` continua o comportamento do modo Single (1
 * humano, id `ID_HUMANO`); `escolher` agora recebe o id do jogador — no
 * Single a UI continua passando `ID_HUMANO` (o roteamento de turnos entre
 * humanos é o PR 2.1b).
 */

import { useCallback, useState } from 'react';
import type { Dificuldade, DraftState, EscolhaDraft } from '../engine/types';
import { dataset } from './dataset-app';
import { aplicarEscolhaDoJogador, ID_HUMANO, iniciarDraft, type HumanoConfig } from './fluxo-draft';

export interface UseDraftResultado {
  state: DraftState | null;
  erro: string | null;
  comecar: (seedTexto: string, dificuldade: Dificuldade, humanos?: HumanoConfig[]) => void;
  escolher: (jogadorId: string, escolha: EscolhaDraft) => void;
  reiniciar: () => void;
}

/** Default do modo Single: 1 humano com o id fixo `ID_HUMANO`, sem nome (fallback "Você" na UI). */
const HUMANOS_SINGLE: HumanoConfig[] = [{ id: ID_HUMANO }];

export function useDraft(): UseDraftResultado {
  const [state, setState] = useState<DraftState | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const comecar = useCallback(
    (seedTexto: string, dificuldade: Dificuldade, humanos: HumanoConfig[] = HUMANOS_SINGLE) => {
      setErro(null);
      setState(iniciarDraft(dataset, seedTexto, dificuldade, humanos));
    },
    [],
  );

  const escolher = useCallback(
    (jogadorId: string, escolha: EscolhaDraft) => {
      if (!state) return;
      try {
        setState(aplicarEscolhaDoJogador(dataset, state, jogadorId, escolha));
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
