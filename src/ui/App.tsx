/**
 * Roteador de telas do modo Single (PR 1.7a): sem estado ⇒ TelaInicio; fase
 * 'sorteios' ⇒ TelaDraft; 'peca' ⇒ TelaPeca; 'concluido' ⇒ TelaResumo. Toda
 * transição de estado é delegada ao hook `useDraft`.
 */

import './estilos.css';
import { TelaDraft } from './TelaDraft';
import { TelaInicio } from './TelaInicio';
import { TelaPeca } from './TelaPeca';
import { TelaResumo } from './TelaResumo';
import { useDraft } from './useDraft';

function App() {
  const { state, erro, comecar, escolher, reiniciar } = useDraft();

  return (
    <div className="app-shell">
      {!state && <TelaInicio onComecar={comecar} />}
      {state?.fase === 'sorteios' && <TelaDraft state={state} erro={erro} onEscolher={escolher} />}
      {state?.fase === 'peca' && <TelaPeca state={state} erro={erro} onEscolher={escolher} />}
      {state?.fase === 'concluido' && <TelaResumo state={state} onReiniciar={reiniciar} />}
    </div>
  );
}

export default App;
