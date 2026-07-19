/**
 * Tela de resumo do draft concluído (§3): o carro final do humano — 5
 * componentes (com equipe/ano de origem e notas efetivas via
 * `resolverCarro`) + a peça escolhida — e o grid dos 22 jogadores.
 */

import { resolverCarro } from '../engine/carro';
import type { DraftState } from '../engine/types';
import { CardComponente, CardPeca, comoNotas } from './componentes';
import { dataset } from './dataset-app';
import { ID_HUMANO } from './fluxo-draft';

interface TelaResumoProps {
  state: DraftState;
  onReiniciar: () => void;
}

export function TelaResumo({ state, onReiniciar }: TelaResumoProps) {
  const loadoutHumano = state.loadouts[ID_HUMANO];

  return (
    <div className="tela-resumo">
      <h2>Draft concluído</h2>

      {loadoutHumano && <ResumoCarroHumano loadout={loadoutHumano} />}

      <h3>Grid — 22 jogadores</h3>
      <TabelaGrid state={state} />

      <button type="button" className="botao-primario" onClick={onReiniciar}>
        Novo draft
      </button>
    </div>
  );
}

function ResumoCarroHumano({ loadout }: { loadout: DraftState['loadouts'][string] }) {
  const carro = resolverCarro(dataset, loadout);
  const piloto = dataset.pilotosById.get(loadout.pilotoId);
  const chassi = dataset.chassisById.get(loadout.chassiId);
  const motor = dataset.motoresById.get(loadout.motorId);
  const estrategista = dataset.estrategistasById.get(loadout.estrategistaId);
  const pit = dataset.pitsById.get(loadout.pitId);

  return (
    <section className="resumo-carro">
      <h3>Seu carro</h3>
      <div className="grid-cards">
        {piloto && (
          <CardComponente
            rotulo="Piloto"
            nome={`${piloto.nome} (${piloto.equipe} ${piloto.ano})`}
            notas={comoNotas(carro.piloto)}
            notasBase={comoNotas(piloto.notas)}
          />
        )}
        {chassi && (
          <CardComponente
            rotulo="Chassi"
            nome={`${chassi.equipe} ${chassi.ano}`}
            notas={comoNotas(carro.chassi)}
            notasBase={comoNotas(chassi.notas)}
          />
        )}
        {motor && (
          <CardComponente
            rotulo="Motor"
            nome={`${motor.equipe} ${motor.ano}`}
            notas={comoNotas(carro.motor)}
            notasBase={comoNotas(motor.notas)}
          />
        )}
        {estrategista && (
          <CardComponente
            rotulo="Estrategista"
            nome={`${estrategista.nome} (${estrategista.equipe} ${estrategista.ano})`}
            notas={comoNotas(carro.estrategista)}
          />
        )}
        {pit && (
          <CardComponente rotulo="Pit" nome={`${pit.equipe} ${pit.ano}`} notas={comoNotas(carro.pit)} />
        )}
        <CardPeca peca={carro.peca} />
      </div>
    </section>
  );
}

function TabelaGrid({ state }: { state: DraftState }) {
  return (
    <table className="tabela-grid">
      <thead>
        <tr>
          <th>Jogador</th>
          <th>Piloto</th>
          <th>Chassi</th>
          <th>Motor</th>
          <th>Estrategista</th>
          <th>Pit</th>
          <th>Peça</th>
        </tr>
      </thead>
      <tbody>
        {state.jogadores.map((jogador) => {
          const loadout = state.loadouts[jogador.id];
          if (!loadout) return null;
          const piloto = dataset.pilotosById.get(loadout.pilotoId);
          const chassi = dataset.chassisById.get(loadout.chassiId);
          const motor = dataset.motoresById.get(loadout.motorId);
          const estrategista = dataset.estrategistasById.get(loadout.estrategistaId);
          const pit = dataset.pitsById.get(loadout.pitId);
          const peca = dataset.pecasById.get(loadout.pecaId);
          const ehHumano = jogador.id === ID_HUMANO;
          return (
            <tr key={jogador.id} className={ehHumano ? 'linha-humano' : ''}>
              <td>{ehHumano ? 'Você' : jogador.id}</td>
              <td>{piloto?.nome ?? '?'}</td>
              <td>{chassi ? `${chassi.equipe} ${chassi.ano}` : '?'}</td>
              <td>{motor ? `${motor.equipe} ${motor.ano}` : '?'}</td>
              <td>{estrategista?.nome ?? '?'}</td>
              <td>{pit ? `${pit.equipe} ${pit.ano}` : '?'}</td>
              <td>{peca?.nome ?? '?'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
