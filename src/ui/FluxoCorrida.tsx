/**
 * Orquestra as telas da corrida do modo Single (PR 1.7b): casca fina sobre
 * `useCorrida` que roteia entre `TelaCorrida` (fases 'grid'/'replay') e
 * `TelaResultadoCorrida` (fase 'resultado').
 */

import type { DraftState } from '../engine/types';
import { TelaCorrida } from './TelaCorrida';
import { TelaResultadoCorrida } from './TelaResultadoCorrida';
import { useCorrida } from './useCorrida';

interface FluxoCorridaProps {
  state: DraftState;
  onReiniciar: () => void;
}

export function FluxoCorrida({ state, onReiniciar }: FluxoCorridaProps) {
  const { fase, pista, grid, resultado, tempoSimMs, largar, acelerar } = useCorrida(state);

  if (fase === 'resultado') {
    return <TelaResultadoCorrida state={state} resultado={resultado} onReiniciar={onReiniciar} />;
  }

  return (
    <TelaCorrida
      state={state}
      pista={pista}
      grid={grid}
      resultado={resultado}
      fase={fase}
      tempoSimMs={tempoSimMs}
      onLargar={largar}
      onAcelerar={acelerar}
    />
  );
}
