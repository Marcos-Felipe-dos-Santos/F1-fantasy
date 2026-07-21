/**
 * Roteador de telas (PR 1.7a: Single; PR 2.1b: hotseat do modo Local):
 * sem estado ⇒ TelaInicio; fase 'sorteios'/'peca' ⇒ TelaHandoff (se o
 * aparelho precisa trocar de mão) ou TelaDraft/TelaPeca (se quem está
 * confirmado com o aparelho já é o alvo); 'concluido' ⇒ TelaResumo ou, depois
 * de "Ir pra corrida", `FluxoCorrida`. Toda transição de estado do draft é
 * delegada ao hook `useDraft`; o roteamento de turno hotseat é derivado (sem
 * efeito) por `decisaoLocal` (`fluxo-local.ts`) a partir de `confirmadoId` —
 * o único estado extra que esta tela guarda, e que a engine nunca vê.
 */

import { useCallback, useMemo, useState } from 'react';
import './estilos.css';
import type { Dificuldade, EscolhaDraft } from '../engine/types';
import { FluxoCorrida } from './FluxoCorrida';
import type { HumanoConfig } from './fluxo-draft';
import { decisaoLocal } from './fluxo-local';
import { nomeJogador } from './loadout-view';
import { TelaDraft } from './TelaDraft';
import { TelaHandoff } from './TelaHandoff';
import { TelaInicio } from './TelaInicio';
import { TelaPeca } from './TelaPeca';
import { TelaResumo } from './TelaResumo';
import { useDraft } from './useDraft';
import type { Visibilidade } from './visibilidade';

function App() {
  const { state, humanos, erro, comecar, escolher, reiniciar } = useDraft();
  const [naCorrida, setNaCorrida] = useState(false);
  const [confirmadoId, setConfirmadoId] = useState<string | null>(null);
  // Visibilidade é opção da partida (§5), não conceito da engine — guardada
  // aqui, ao lado de `naCorrida`/`confirmadoId`. Default 'craque' só serve
  // pra tipar o estado inicial: antes de `comecarPartida` não há TelaInicio
  // nenhuma renderizada que dependa desse valor.
  const [visibilidade, setVisibilidade] = useState<Visibilidade>('craque');

  const reiniciarTudo = useCallback(() => {
    setNaCorrida(false);
    setConfirmadoId(null);
    reiniciar();
  }, [reiniciar]);

  const comecarPartida = useCallback(
    (
      seedTexto: string,
      dificuldade: Dificuldade,
      humanosConfig: HumanoConfig[],
      visibilidadeEscolhida: Visibilidade,
    ) => {
      comecar(seedTexto, dificuldade, humanosConfig);
      setVisibilidade(visibilidadeEscolhida);
      // Single (1 humano): pula a TelaHandoff — comportamento do modo Single
      // preservado (nunca troca de mão). Local (2-4 humanos): começa sem
      // ninguém confirmado, então o primeiro render já pede handoff pro
      // humano-1.
      setConfirmadoId(humanosConfig.length === 1 ? humanosConfig[0].id : null);
    },
    [comecar],
  );

  const idsHumanos = useMemo(() => humanos.map((h) => h.id), [humanos]);

  const decisao =
    state && state.fase !== 'concluido' ? decisaoLocal(state, idsHumanos, confirmadoId) : null;

  const nomeDoAlvo =
    decisao?.tipo === 'handoff'
      ? nomeJogador(
          state?.jogadores.find((j) => j.id === decisao.alvo) ?? { id: decisao.alvo, tipo: 'humano' },
        )
      : null;

  // Subtítulo "Vez de {nome}" nas telas de jogada: só faz sentido com 2+
  // humanos (modo Local) — no Single ele é sempre o mesmo e só polui a tela,
  // então é omitido (decisão de UI deste PR).
  const vezDe =
    state && decisao?.tipo === 'jogar' && idsHumanos.length > 1
      ? nomeJogador(state.jogadores.find((j) => j.id === decisao.jogadorId)!)
      : undefined;

  return (
    <div className="app-shell">
      {!state && <TelaInicio onComecar={comecarPartida} />}

      {state && decisao?.tipo === 'handoff' && nomeDoAlvo !== null && (
        <TelaHandoff
          nome={nomeDoAlvo}
          fase={state.fase === 'peca' ? 'peca' : 'sorteios'}
          onConfirmar={() => setConfirmadoId(decisao.alvo)}
        />
      )}

      {state?.fase === 'sorteios' && decisao?.tipo === 'jogar' && (
        <TelaDraft
          state={state}
          jogadorId={decisao.jogadorId}
          vezDe={vezDe}
          visibilidade={visibilidade}
          erro={erro}
          onEscolher={(escolha: EscolhaDraft) => escolher(decisao.jogadorId, escolha)}
        />
      )}
      {state?.fase === 'peca' && decisao?.tipo === 'jogar' && (
        <TelaPeca
          state={state}
          jogadorId={decisao.jogadorId}
          vezDe={vezDe}
          visibilidade={visibilidade}
          erro={erro}
          onEscolher={(escolha: EscolhaDraft) => escolher(decisao.jogadorId, escolha)}
        />
      )}
      {state?.fase === 'concluido' && !naCorrida && (
        <TelaResumo
          state={state}
          visibilidade={visibilidade}
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
