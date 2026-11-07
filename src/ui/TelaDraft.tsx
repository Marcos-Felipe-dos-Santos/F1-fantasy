/**
 * Tela das rodadas 1-5 do draft (sorteios de equipe/ano, §3). Toda a
 * revelação vem de `revelarRodada` (leitura pura, sem mutar estado); o clique
 * num card dispara `onEscolher`, que o hook traduz em
 * `aplicarEscolha` + `resolverBots`.
 */

import { encontrarEquipeAno } from '../engine/draft-utils';
import { revelarRodada } from '../engine/draft';
import { candidatosDoReroll, controleRerolls } from '../engine/rerolls';
import type {
  DraftState,
  EscolhaDraft,
  ResultadoReroll,
  SlotComponente,
  TipoReroll,
} from '../engine/types';
import './estilos-reroll.css';
import { CardComponente, LoadoutParcial, comoNotas } from './componentes';
import { dataset } from './dataset-app';
import { slotsPreenchidos } from './loadout-view';
import type { Visibilidade } from './visibilidade';

interface TelaDraftProps {
  state: DraftState;
  /** Jogador que está fazendo a escolha nesta tela — quem tem o aparelho agora (roteamento em `App.tsx`/`fluxo-local.ts`, PR 2.1b). */
  jogadorId: string;
  /** Nome pra "Vez de {nome}" (modo Local, 2+ humanos); `undefined` omite o subtítulo (Single). */
  vezDe?: string;
  /** Visibilidade da partida (§5): passada pra `CardComponente`, que decide se mostra notas. */
  visibilidade: Visibilidade;
  erro: string | null;
  onEscolher: (escolha: EscolhaDraft) => void;
  onReroll?: (alvo: TipoReroll) => void;
  pendente?: boolean;
  resultadoReroll?: ResultadoReroll;
}

export function TelaDraft({
  state,
  jogadorId,
  vezDe,
  visibilidade,
  erro,
  onEscolher,
  onReroll,
  pendente = false,
  resultadoReroll,
}: TelaDraftProps) {
  const revelacao = revelarRodada(state, jogadorId);
  const progresso = state.progresso[jogadorId];

  if (revelacao.fase === 'sorteios-aguardando') {
    return (
      <div className="tela-draft">
        <p>Aguardando bots...</p>
      </div>
    );
  }

  if (revelacao.fase !== 'sorteios') {
    // Fora do escopo desta tela — App só a renderiza durante a fase sorteios.
    return null;
  }

  const equipeAno = encontrarEquipeAno(dataset, revelacao.equipeAno);
  const disponiveis = new Set<SlotComponente>(revelacao.slotsDisponiveis);
  const controle = onReroll ? controleRerolls(state, jogadorId) : null;

  return (
    <div className="tela-draft">
      <header className="tela-draft__cabecalho">
        {vezDe && <p className="tela-draft__vez">Vez de {vezDe}</p>}
        <h2>
          Rodada {revelacao.rodada} de 5{revelacao.rodada === 5 ? ' — última vaga' : ''}
        </h2>
        <p className="tela-draft__equipe-ano">
          {equipeAno.equipe} {equipeAno.ano}
        </p>
      </header>

      {erro && <p className="erro">{erro}</p>}

      {onReroll && controle && (
        <section className="rerolls" aria-label="Trocas do draft" aria-busy={pendente}>
          <p aria-live="polite">
            Trocas comuns: {3 - controle.comunsUsados} de 3 · Especial:{' '}
            {controle.especialUsado ? 0 : 1} de 1
          </p>
          <div className="rerolls__acoes">
            {(
              [
                ['marca', 'Trocar marca'],
                ['ano', 'Trocar ano'],
                ['ambos', 'Trocar marca + ano'],
              ] as const
            ).map(([alvo, rotulo]) => (
              <button
                key={alvo}
                type="button"
                className="botao-velocidade"
                disabled={
                  pendente ||
                  (alvo === 'ambos' ? controle.especialUsado : controle.comunsUsados >= 3) ||
                  candidatosDoReroll(state, dataset, jogadorId, alvo).length === 0
                }
                onClick={() => onReroll(alvo)}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <small>
            Marca e ano compartilham 3 trocas no draft inteiro. A troca de marca + ano tem 1 uso separado.
          </small>
          {pendente && <p role="status">Aguardando confirmação...</p>}
          {!pendente && resultadoReroll && resultadoReroll !== 'aplicado' && (
            <p role="status">
              {resultadoReroll === 'pool-vazio'
                ? 'Nenhuma alternativa disponível. Nenhum crédito foi usado.'
                : resultadoReroll === 'cota-esgotada'
                  ? 'Saldo de trocas esgotado.'
                  : 'Troca recusada. Confira o estado atual e tente novamente.'}
            </p>
          )}
        </section>
      )}

      <fieldset className="rerolls__escolhas" disabled={pendente}>
        <div className="grid-cards">
          <CardComponente
            rotulo="Piloto"
            nome={equipeAno.pilotos[0].nome}
            notas={comoNotas(equipeAno.pilotos[0].notas)}
            visibilidade={visibilidade}
            disponivel={disponiveis.has('piloto')}
            onClick={() => onEscolher({ tipo: 'piloto', pilotoId: equipeAno.pilotos[0].id })}
          />
          <CardComponente
            rotulo="Piloto"
            nome={equipeAno.pilotos[1].nome}
            notas={comoNotas(equipeAno.pilotos[1].notas)}
            visibilidade={visibilidade}
            disponivel={disponiveis.has('piloto')}
            onClick={() => onEscolher({ tipo: 'piloto', pilotoId: equipeAno.pilotos[1].id })}
          />
          <CardComponente
            rotulo="Chassi"
            notas={comoNotas(equipeAno.chassi.notas)}
            visibilidade={visibilidade}
            disponivel={disponiveis.has('chassi')}
            onClick={() => onEscolher({ tipo: 'componente', slot: 'chassi' })}
          />
          <CardComponente
            rotulo="Motor"
            notas={comoNotas(equipeAno.motor.notas)}
            visibilidade={visibilidade}
            disponivel={disponiveis.has('motor')}
            onClick={() => onEscolher({ tipo: 'componente', slot: 'motor' })}
          />
          <CardComponente
            rotulo="Estrategista"
            nome={equipeAno.estrategista.nome}
            notas={comoNotas(equipeAno.estrategista.notas)}
            visibilidade={visibilidade}
            disponivel={disponiveis.has('estrategista')}
            onClick={() => onEscolher({ tipo: 'componente', slot: 'estrategista' })}
          />
          <CardComponente
            rotulo="Pit"
            notas={comoNotas(equipeAno.pit.notas)}
            visibilidade={visibilidade}
            disponivel={disponiveis.has('pit')}
            onClick={() => onEscolher({ tipo: 'componente', slot: 'pit' })}
          />
        </div>
      </fieldset>

      <LoadoutParcial slots={slotsPreenchidos(dataset, progresso)} />
    </div>
  );
}
