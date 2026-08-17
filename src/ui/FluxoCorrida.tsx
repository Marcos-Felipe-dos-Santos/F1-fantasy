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
  /** Repassado a `TelaResultadoCorrida` — no online, `onReiniciar` sai da sala. */
  rotuloReiniciar?: string;
  onReiniciar: () => void;
}

export function FluxoCorrida({
  state,
  fonte,
  extraResultado,
  autoLargar,
  onChegouAoResultado,
  rotuloReiniciar,
  onReiniciar,
}: FluxoCorridaProps) {
  const { fase, pista, grid, resultado, tempoSimMs, largar, acelerar, velocidade, setVelocidade } = useCorrida(
    state,
    fonte,
    autoLargar,
  );

  /**
   * 🔴 Mora num EFEITO, e não no corpo do render — render tem que ser puro, e
   * chamar daqui um callback que envia pela rede é efeito colateral em
   * renderização, que o React pode repetir ou descartar à vontade.
   *
   * ⚠️ **O StrictMode NÃO é o que segura o envio duplo, e creditá-lo a ele
   * seria errado** (achado da revisão): o StrictMode invoca o efeito duas vezes
   * na montagem também. Quem faz o envio sair uma vez só é a combinação de duas
   * coisas: a montagem sempre acontece em `fase === 'grid'` (`useCorrida` nasce
   * nela), e a guarda `fase === 'resultado'` abaixo. Quem "simplificar" a
   * guarda achando que o efeito já protege, reabre o problema.
   *
   * Dispara na TRANSIÇÃO para `'resultado'`: `fase` só chega lá uma vez por
   * corrida (não há botão de rever/relargar), e `onChegouAoResultado` é um
   * `useCallback` estável do lado do chamador, então o efeito não re-dispara.
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
        rotuloReiniciar={rotuloReiniciar}
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
