/**
 * Hook do draft (PR 1.7a; generalizado pra N humanos no PR 2.1a; guarda a
 * lista de humanos da partida no PR 2.1b pro roteamento de turnos hotseat do
 * modo Local): casca fina de `useState` sobre as transições puras de
 * `fluxo-draft.ts`. Nenhuma regra de jogo mora aqui — só orquestra estado de
 * React em torno das chamadas à engine. `comecar` sem `humanos` continua o
 * comportamento do modo Single (1 humano, id `ID_HUMANO`); `escolher` recebe
 * o id do jogador — quem decide QUANDO chamar `escolher` com qual
 * `jogadorId` é o roteamento de turnos em `App.tsx` (`fluxo-local.ts`).
 */

import { useCallback, useState } from 'react';
import type { Dificuldade, DraftState, EscolhaDraft } from '../engine/types';
import { dataset } from './dataset-app';
import { aplicarEscolhaDoJogador, ID_HUMANO, iniciarDraft, type HumanoConfig } from './fluxo-draft';

export interface UseDraftResultado {
  state: DraftState | null;
  /** Humanos da partida corrente (Single: 1 item; Local: 2-4), na ordem de cadastro. `[]` antes de `comecar`. */
  humanos: HumanoConfig[];
  erro: string | null;
  comecar: (seedTexto: string, dificuldade: Dificuldade, humanos?: HumanoConfig[]) => void;
  escolher: (jogadorId: string, escolha: EscolhaDraft) => void;
  /**
   * Adota um `DraftState` JÁ CONCLUÍDO vindo de um save (PR 8.4-mínimo,
   * "Continuar campeonato"). É o único caminho que injeta estado de fora, e
   * por isso é o único que precisa recuperar a lista de humanos — ela não
   * está no save como tal, mas é derivável de `draft.jogadores`.
   */
  retomar: (draft: DraftState) => void;
  reiniciar: () => void;
}

/**
 * Reconstrói os `HumanoConfig` a partir do `DraftState` salvo. O save guarda
 * `jogadores` (com `tipo` e `nome`), não a config original da TelaInicio, mas
 * a config é um subconjunto: id + nome dos que são humanos, na ordem em que
 * estão no draft — que é a ordem de cadastro, preservada por `iniciarDraft`.
 */
export function humanosDoDraft(draft: DraftState): HumanoConfig[] {
  return draft.jogadores
    .filter((jogador) => jogador.tipo === 'humano')
    .map((jogador) => ({ id: jogador.id, nome: jogador.nome }));
}

/** Default do modo Single: 1 humano com o id fixo `ID_HUMANO`, sem nome (fallback "Você" na UI). */
const HUMANOS_SINGLE: HumanoConfig[] = [{ id: ID_HUMANO }];

export function useDraft(): UseDraftResultado {
  const [state, setState] = useState<DraftState | null>(null);
  const [humanos, setHumanos] = useState<HumanoConfig[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const comecar = useCallback(
    (seedTexto: string, dificuldade: Dificuldade, humanosConfig: HumanoConfig[] = HUMANOS_SINGLE) => {
      setErro(null);
      setHumanos(humanosConfig);
      setState(iniciarDraft(dataset, seedTexto, dificuldade, humanosConfig));
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

  const retomar = useCallback((draft: DraftState) => {
    setErro(null);
    setHumanos(humanosDoDraft(draft));
    setState(draft);
  }, []);

  const reiniciar = useCallback(() => {
    setState(null);
    setHumanos([]);
    setErro(null);
  }, []);

  return { state, humanos, erro, comecar, escolher, retomar, reiniciar };
}
