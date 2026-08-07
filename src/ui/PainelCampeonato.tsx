/**
 * Painel do campeonato (PR 8.4-mínimo): a tabela de pontos acumulados que
 * aparece embaixo do resultado de cada corrida, e o botão que leva à próxima.
 *
 * É deliberadamente CRU — tabela e botão, com os tokens de cor que já existem.
 * As telas de verdade do campeonato (calendário, classificação navegável,
 * fim de temporada) são o PR 8.3; este painel existe só pra tornar a mecânica
 * jogável e testável de ponta a ponta antes de investir no design.
 *
 * Não reimplementa regra nenhuma: recebe a `LinhaClassificacao[]` que veio de
 * `classificacaoApos` (engine), já ordenada por pontos/countback/jogadorId.
 */

import type { DraftState, LinhaClassificacao } from '../engine/types';
import { nomeJogador } from './loadout-view';

interface PainelCampeonatoProps {
  state: DraftState;
  classificacao: LinhaClassificacao[];
  /** Corridas já disputadas e total do calendário — texto "corrida 3 de 5". */
  corridasFeitas: number;
  totalCorridas: number;
  concluido: boolean;
  /** `null` quando o campeonato acabou (não há próxima). */
  onProximaCorrida: (() => void) | null;
  /** Nome da próxima pista, pra o botão dizer pra onde se está indo. */
  nomeProximaPista: string | null;
}

/** Nome de exibição do jogador; cai no id se não achar (mesmo padrão de `TelaResultadoCorrida`). */
function nomeDoJogadorId(state: DraftState, jogadorId: string): string {
  const jogador = state.jogadores.find((j) => j.id === jogadorId);
  return jogador ? nomeJogador(jogador) : jogadorId;
}

function ehHumanoId(state: DraftState, jogadorId: string): boolean {
  return state.jogadores.find((j) => j.id === jogadorId)?.tipo === 'humano';
}

export function PainelCampeonato({
  state,
  classificacao,
  corridasFeitas,
  totalCorridas,
  concluido,
  onProximaCorrida,
  nomeProximaPista,
}: PainelCampeonatoProps) {
  const campeao = classificacao[0];

  return (
    <section className="painel-campeonato">
      <h3>
        {concluido
          ? '🏆 Campeonato encerrado'
          : `Classificação do campeonato — ${corridasFeitas} de ${totalCorridas} corridas`}
      </h3>

      {concluido && campeao && (
        <p className="painel-campeonato__campeao">
          Campeão: <strong>{nomeDoJogadorId(state, campeao.jogadorId)}</strong> com {campeao.pontos}{' '}
          pontos ({campeao.vitorias} vitórias, {campeao.podios} pódios)
        </p>
      )}

      <div className="tabela-grid-wrap">
        <table className="tabela-grid">
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th>Pontos</th>
              <th>Vit.</th>
              <th>Pód.</th>
              <th>VR</th>
              <th>DNF</th>
            </tr>
          </thead>
          <tbody>
            {classificacao.map((linha, indice) => (
              <tr
                key={linha.jogadorId}
                className={ehHumanoId(state, linha.jogadorId) ? 'linha-humano' : undefined}
              >
                <td>{indice + 1}</td>
                <td>{nomeDoJogadorId(state, linha.jogadorId)}</td>
                <td>
                  <strong>{linha.pontos}</strong>
                </td>
                <td>{linha.vitorias}</td>
                <td>{linha.podios}</td>
                <td>{linha.voltasRapidas}</td>
                <td>{linha.dnfs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onProximaCorrida !== null && (
        <button type="button" className="botao-primario" onClick={onProximaCorrida}>
          Próxima corrida{nomeProximaPista !== null ? ` — ${nomeProximaPista}` : ''} →
        </button>
      )}
    </section>
  );
}
