/**
 * Orquestra as telas da corrida do modo Single (PR 1.7b): casca fina sobre
 * `useCorrida` que roteia entre `TelaCorrida` (fases 'grid'/'replay') e
 * `TelaResultadoCorrida` (fase 'resultado').
 */

import { useEffect, type ReactNode } from 'react';
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
  /**
   * 🏁 O replay chegou ao resultado (PR 4/4 de "corrida online").
   *
   * Existe para a BARREIRA DO FIM: no online, é este o momento em que o
   * jogador atesta "terminei" e a sala pode decidir que a partida acabou (ver
   * `atestarFimDaCorrida` em `useSalaOnline`). `undefined` no offline — a
   * corrida avulsa e a etapa de campeonato não têm sala nenhuma pra avisar, e
   * a tela fica exatamente como era.
   *
   * 🔑 **Não é portão de UI.** Não chamar não segura ninguém: a barreira é
   * ciclo de vida, resolvida por timeout no servidor para quem nunca atesta.
   */
  onChegouAoResultado?: () => void;
  onReiniciar: () => void;
}

export function FluxoCorrida({
  state,
  fonte,
  extraResultado,
  autoLargar,
  onChegouAoResultado,
  onReiniciar,
}: FluxoCorridaProps) {
  const { fase, pista, grid, resultado, tempoSimMs, largar, acelerar, velocidade, setVelocidade } = useCorrida(
    state,
    fonte,
    autoLargar,
  );

  /**
   * 🔴 Mora num EFEITO, e não no corpo do render — mesmo motivo já registrado
   * nos atestados de `useSalaOnline`: render tem que ser puro, e chamar um
   * callback que envia pela rede durante a renderização dispara duas vezes sob
   * StrictMode. Idempotente no servidor (atestado repetido não gera escrita no
   * Durable Object), mas amplificação de escrita de graça é justamente o que a
   * revisão do 3.4 cobrou.
   *
   * Dispara na TRANSIÇÃO para `'resultado'`: `fase` só chega lá uma vez por
   * corrida, e `onChegouAoResultado` é um `useCallback` estável do lado do
   * chamador.
   */
  useEffect(() => {
    if (fase === 'resultado') onChegouAoResultado?.();
  }, [fase, onChegouAoResultado]);

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
