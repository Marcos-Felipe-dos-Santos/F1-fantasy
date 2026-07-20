/**
 * Tela de resultado final da corrida (PR 1.7b, GDD §10): tabela de
 * classificação com pontuação FIA, paradas e status; destaque pro humano e
 * pra volta mais rápida.
 */

import type { DraftState, ResultadoCorrida } from '../engine/types';
import { dataset } from './dataset-app';
import { ID_HUMANO } from './fluxo-draft';

interface TelaResultadoCorridaProps {
  state: DraftState;
  resultado: ResultadoCorrida;
  onReiniciar: () => void;
}

function nomeJogador(jogadorId: string): string {
  return jogadorId === ID_HUMANO ? 'Você' : jogadorId;
}

function nomePiloto(state: DraftState, jogadorId: string): string {
  const loadout = state.loadouts[jogadorId];
  if (!loadout) return '?';
  return dataset.pilotosById.get(loadout.pilotoId)?.nome ?? '?';
}

/** `ms` → "m:ss.mmm". */
function formatarTempo(ms: number): string {
  const totalMs = Math.round(ms);
  const minutos = Math.floor(totalMs / 60_000);
  const segundos = Math.floor((totalMs % 60_000) / 1000);
  const milissegundos = totalMs % 1000;
  return `${minutos}:${String(segundos).padStart(2, '0')}.${String(milissegundos).padStart(3, '0')}`;
}

export function TelaResultadoCorrida({ state, resultado, onReiniciar }: TelaResultadoCorridaProps) {
  const humano = resultado.classificacao.find((c) => c.jogadorId === ID_HUMANO);

  return (
    <div className="tela-resultado-corrida">
      <h2>Resultado da corrida</h2>
      {resultado.chuva && <span className="badge-chuva">🌧️ Chuva</span>}

      {humano && (
        <p className="resultado-corrida__destaque">
          Você terminou em {humano.posicao}º — {humano.pontos} pontos
        </p>
      )}

      <table className="tabela-grid">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Jogador</th>
            <th>Piloto</th>
            <th>Status</th>
            <th>Paradas</th>
            <th>Pontos</th>
          </tr>
        </thead>
        <tbody>
          {resultado.classificacao.map((item) => {
            const ehHumano = item.jogadorId === ID_HUMANO;
            const ehVoltaRapida = item.jogadorId === resultado.voltaMaisRapida.jogadorId;
            const status =
              item.status === 'terminou'
                ? formatarTempo(item.tempoTotal)
                : `DNF (volta ${item.voltasCompletadas})`;
            const classes = [ehHumano ? 'linha-humano' : '', ehVoltaRapida ? 'linha-volta-rapida' : '']
              .filter(Boolean)
              .join(' ');
            return (
              <tr key={item.jogadorId} className={classes}>
                <td>{item.posicao}</td>
                <td>{nomeJogador(item.jogadorId)}</td>
                <td>{nomePiloto(state, item.jogadorId)}</td>
                <td>
                  {status}
                  {ehVoltaRapida && ' 🏆 VR'}
                </td>
                <td>{item.paradas}</td>
                <td>{item.pontos}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p className="resultado-corrida__volta-rapida">
        Volta mais rápida: {nomeJogador(resultado.voltaMaisRapida.jogadorId)} — pontinho extra pra{' '}
        {nomePiloto(state, resultado.voltaMaisRapida.jogadorId)} (
        {(resultado.voltaMaisRapida.tempo / 1000).toFixed(3)}s)
      </p>

      <button type="button" className="botao-primario" onClick={onReiniciar}>
        Novo draft
      </button>
    </div>
  );
}
