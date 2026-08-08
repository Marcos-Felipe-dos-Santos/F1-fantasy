/**
 * Calendário do campeonato (PR 8.3): as 5 ou 10 etapas com a silhueta de cada
 * pista, o que já correu (com vencedor), e a próxima destacada.
 *
 * Não decide nada: recebe `EtapaDoCalendario[]` de `calendarioAnotado`, que é
 * quem sabe o que pode ser revelado. **A regra que essa separação protege:**
 * todas as etapas já estão simuladas em memória desde `iniciarCampeonato`, e
 * mostrar o vencedor de uma corrida que o jogador ainda vai assistir seria
 * estragar a corrida. O cursor é o que separa "simulado" de "revelado".
 */

import type { EtapaDoCalendario } from './fluxo-campeonato';
import type { DraftState } from '../engine/types';
import { dataset } from './dataset-app';
import { nomeJogador } from './loadout-view';
import { SilhuetaPista } from './SilhuetaPista';

interface PainelCalendarioProps {
  state: DraftState;
  etapas: EtapaDoCalendario[];
}

function nomeDaPista(pistaId: string): string {
  return dataset.pistasById.get(pistaId)?.nome ?? pistaId;
}

function nomeDoJogadorId(state: DraftState, jogadorId: string): string {
  const jogador = state.jogadores.find((j) => j.id === jogadorId);
  return jogador ? nomeJogador(jogador) : jogadorId;
}

export function PainelCalendario({ state, etapas }: PainelCalendarioProps) {
  return (
    <section className="painel-calendario">
      <h3>Calendário</h3>
      <ol className="painel-calendario__lista">
        {etapas.map((etapa) => {
          const variante = etapa.disputada ? 'disputada' : etapa.proxima ? 'proxima' : 'futura';
          return (
            <li
              key={`${etapa.numero}-${etapa.pistaId}`}
              className={`painel-calendario__etapa painel-calendario__etapa--${variante}`}
              aria-current={etapa.proxima ? 'step' : undefined}
            >
              <SilhuetaPista
                pistaId={etapa.pistaId}
                nome={nomeDaPista(etapa.pistaId)}
                variante={variante}
              />
              <span className="painel-calendario__numero">{etapa.numero}</span>
              <span className="painel-calendario__nome">{nomeDaPista(etapa.pistaId)}</span>
              <span className="painel-calendario__status">
                {etapa.vencedorId !== null ? (
                  <>🏁 {nomeDoJogadorId(state, etapa.vencedorId)}</>
                ) : etapa.proxima ? (
                  'próxima'
                ) : (
                  '—'
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
