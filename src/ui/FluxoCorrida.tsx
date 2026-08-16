/**
 * Orquestra as telas da corrida do modo Single (PR 1.7b): casca fina sobre
 * `useCorrida` que roteia entre `TelaCorrida` (fases 'grid'/'replay') e
 * `TelaResultadoCorrida` (fase 'resultado').
 */

import type { ReactNode } from 'react';
import type { DraftState } from '../engine/types';
import { TelaCorrida } from './TelaCorrida';
import { TelaResultadoCorrida } from './TelaResultadoCorrida';
import { useCorrida, type FonteDaCorrida } from './useCorrida';

interface FluxoCorridaProps {
  state: DraftState;
  /**
   * De onde vem a corrida (PR 2/4 de "corrida online"). Modo `'preparar'`
   * (offline: avulsa e etapa de campeonato) — `pistaId` explícito e `seed`
   * opcional, repassados direto pra `useCorrida`/`prepararCorrida`, mesma
   * semântica de sempre. Modo `'pronta'` (online) — a corrida já computada
   * por `corridaDaSala` em `useSalaOnline`; ver `FonteDaCorrida`.
   */
  fonte: FonteDaCorrida;
  /** Conteúdo extra na tela de resultado — o `PainelCampeonato`, no modo Campeonato. */
  extraResultado?: ReactNode;
  /** Larga sozinho ao montar (PR C, modo automático) — ver `useCorrida`. */
  autoLargar?: boolean;
  onReiniciar: () => void;
}

export function FluxoCorrida({
  state,
  fonte,
  extraResultado,
  autoLargar,
  onReiniciar,
}: FluxoCorridaProps) {
  const { fase, pista, grid, resultado, tempoSimMs, largar, acelerar, velocidade, setVelocidade } = useCorrida(
    state,
    fonte,
    autoLargar,
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
