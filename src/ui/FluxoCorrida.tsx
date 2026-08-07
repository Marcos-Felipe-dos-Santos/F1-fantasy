/**
 * Orquestra as telas da corrida do modo Single (PR 1.7b): casca fina sobre
 * `useCorrida` que roteia entre `TelaCorrida` (fases 'grid'/'replay') e
 * `TelaResultadoCorrida` (fase 'resultado').
 */

import type { ReactNode } from 'react';
import type { DraftState } from '../engine/types';
import { TelaCorrida } from './TelaCorrida';
import { TelaResultadoCorrida } from './TelaResultadoCorrida';
import { useCorrida } from './useCorrida';

interface FluxoCorridaProps {
  state: DraftState;
  /** Pista escolhida na TelaInicio (PR 2.5) — repassada direto pra `useCorrida`/`prepararCorrida`. */
  pistaId: string;
  /**
   * Seed da corrida (PR 8.4-mínimo). Omitida na corrida avulsa (usa a do
   * draft); no campeonato é `seedDaEtapa(seed, pistaId)`, que é o que faz o
   * replay bater bit a bit com a etapa pré-simulada e pontuada.
   */
  seed?: number;
  /** Conteúdo extra na tela de resultado — o `PainelCampeonato`, no modo Campeonato. */
  extraResultado?: ReactNode;
  onReiniciar: () => void;
}

export function FluxoCorrida({
  state,
  pistaId,
  seed,
  extraResultado,
  onReiniciar,
}: FluxoCorridaProps) {
  const { fase, pista, grid, resultado, tempoSimMs, largar, acelerar, velocidade, setVelocidade } = useCorrida(
    state,
    pistaId,
    seed,
  );

  if (fase === 'resultado') {
    return (
      <TelaResultadoCorrida
        state={state}
        resultado={resultado}
        onReiniciar={onReiniciar}
        extra={extraResultado}
      />
    );
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
      velocidade={velocidade}
      onVelocidade={setVelocidade}
    />
  );
}
