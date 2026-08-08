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

import { useEffect, useState } from 'react';
import type { DraftState, LinhaClassificacao } from '../engine/types';
import { nomeJogador } from './loadout-view';

/**
 * Segundos que a classificação fica na tela antes de o modo automático seguir
 * pra próxima corrida. Curto o bastante pra não entediar, longo o bastante pra
 * dar tempo de ler a tabela e de DESLIGAR o automático (o toggle continua
 * clicável durante a contagem — é assim que se sai do modo no meio).
 */
export const SEGUNDOS_AUTO_AVANCO = 5;

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
  /**
   * Modo automático ligado (PR C). `undefined` esconde o toggle — é o que
   * mantém a corrida avulsa sem um controle que não faria sentido nela.
   */
  auto?: boolean;
  onAuto?: (ligado: boolean) => void;
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
  auto,
  onAuto,
}: PainelCampeonatoProps) {
  const campeao = classificacao[0];
  const autoAtivo = auto === true && onProximaCorrida !== null;
  const [restantes, setRestantes] = useState(SEGUNDOS_AUTO_AVANCO);

  /**
   * Contagem regressiva do modo automático.
   *
   * Um `setInterval` de 1 s que decrementa e, ao chegar a zero, avança. Fica
   * TUDO dentro deste efeito (nada de agendar timer em updater de `setState`)
   * pelo mesmo motivo registrado em `useCorrida`: o StrictMode invoca updaters
   * duas vezes em dev, e um updater que agenda timer dobraria os callbacks. O
   * cleanup é o que faz "desligar no meio da contagem" funcionar — desmarcar o
   * toggle muda `autoAtivo`, o efeito reroda e limpa o intervalo pendente.
   */
  useEffect(() => {
    if (!autoAtivo) {
      setRestantes(SEGUNDOS_AUTO_AVANCO);
      return;
    }
    const id = setInterval(() => {
      setRestantes((atual) => {
        if (atual <= 1) {
          clearInterval(id);
          onProximaCorrida();
          return 0;
        }
        return atual - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [autoAtivo, onProximaCorrida]);

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
        <div className="painel-campeonato__acoes">
          <button type="button" className="botao-primario" onClick={onProximaCorrida}>
            Próxima corrida{nomeProximaPista !== null ? ` — ${nomeProximaPista}` : ''} →
          </button>

          {onAuto !== undefined && (
            <label className="painel-campeonato__auto">
              <input
                type="checkbox"
                checked={auto === true}
                onChange={(evento) => onAuto(evento.target.checked)}
              />
              Avançar automaticamente
            </label>
          )}

          {/* A contagem fica ao lado do toggle, que segue clicável — desmarcar
              aqui cancela o avanço. É assim que se sai do modo no meio. */}
          {autoAtivo && (
            <span className="painel-campeonato__contagem" role="status">
              próxima em {restantes}s
            </span>
          )}
        </div>
      )}
    </section>
  );
}
