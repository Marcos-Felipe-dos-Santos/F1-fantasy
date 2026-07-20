/**
 * Roteador de telas do modo Single (PR 1.7a/1.7b): sem estado ⇒ TelaInicio;
 * fase 'sorteios' ⇒ TelaDraft; 'peca' ⇒ TelaPeca; 'concluido' ⇒ TelaResumo ou,
 * depois de "Ir pra corrida", `FluxoCorrida` (grid/replay/resultado). Toda
 * transição de estado é delegada aos hooks `useDraft`/`useCorrida`.
 */

import { useCallback, useState } from 'react';
import './estilos.css';
import type { EscolhaDraft } from '../engine/types';
import { FluxoCorrida } from './FluxoCorrida';
import { ID_HUMANO } from './fluxo-draft';
import { TelaDraft } from './TelaDraft';
import { TelaInicio } from './TelaInicio';
import { TelaPeca } from './TelaPeca';
import { TelaResumo } from './TelaResumo';
import { useDraft } from './useDraft';

function App() {
  const { state, erro, comecar, escolher, reiniciar } = useDraft();
  const [naCorrida, setNaCorrida] = useState(false);

  const reiniciarTudo = useCallback(() => {
    setNaCorrida(false);
    reiniciar();
  }, [reiniciar]);

  // Modo Single por enquanto: o único humano é sempre ID_HUMANO. Roteamento
  // de turnos entre N humanos é o PR 2.1b.
  const escolherHumano = useCallback(
    (escolha: EscolhaDraft) => escolher(ID_HUMANO, escolha),
    [escolher],
  );

  return (
    <div className="app-shell">
      {!state && <TelaInicio onComecar={comecar} />}
      {state?.fase === 'sorteios' && (
        <TelaDraft state={state} jogadorId={ID_HUMANO} erro={erro} onEscolher={escolherHumano} />
      )}
      {state?.fase === 'peca' && (
        <TelaPeca state={state} jogadorId={ID_HUMANO} erro={erro} onEscolher={escolherHumano} />
      )}
      {state?.fase === 'concluido' && !naCorrida && (
        <TelaResumo
          state={state}
          onReiniciar={reiniciarTudo}
          onIrParaCorrida={() => setNaCorrida(true)}
        />
      )}
      {state?.fase === 'concluido' && naCorrida && (
        <FluxoCorrida state={state} onReiniciar={reiniciarTudo} />
      )}
    </div>
  );
}

export default App;
