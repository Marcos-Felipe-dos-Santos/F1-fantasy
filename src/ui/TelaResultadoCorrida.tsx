/**
 * Tela de resultado final da corrida (PR 1.7b, GDD §10): tabela de
 * classificação com pontuação FIA, paradas e status; destaque pro humano e
 * pra volta mais rápida.
 */

import { useState } from 'react';
import type { DraftState, ResultadoCorrida } from '../engine/types';
import { dataset } from './dataset-app';
import { nomeJogador } from './loadout-view';

/** Quanto tempo o feedback "Copiado!" fica visível no botão de copiar seed (PR 2.4). */
const DURACAO_FEEDBACK_COPIA_MS = 2000;

interface TelaResultadoCorridaProps {
  state: DraftState;
  resultado: ResultadoCorrida;
  onReiniciar: () => void;
}

/** Nome de exibição via `nomeJogador` (PR 2.1a); cai no próprio id se o jogador não for encontrado. */
function nomeDoJogadorId(state: DraftState, jogadorId: string): string {
  const jogador = state.jogadores.find((j) => j.id === jogadorId);
  return jogador ? nomeJogador(jogador) : jogadorId;
}

/** `true` se `jogadorId` é humano — destaque no resultado vale pra todos os humanos (PR 2.1a). */
function ehHumanoId(state: DraftState, jogadorId: string): boolean {
  return state.jogadores.find((j) => j.id === jogadorId)?.tipo === 'humano';
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
  const resultadosHumanos = resultado.classificacao.filter((c) => ehHumanoId(state, c.jogadorId));
  const [seedCopiada, setSeedCopiada] = useState(false);

  /**
   * Copia a seed da partida pra área de transferência (PR 2.4), pra
   * reproduzir a mesma corrida depois via o campo "Usar seed específica" da
   * TelaInicio. `try/catch` silencioso-visível: se o clipboard falhar (ex.:
   * permissão negada), a seed continua exibida e selecionável no texto.
   */
  async function handleCopiarSeed() {
    try {
      await navigator.clipboard.writeText(String(state.seed));
      setSeedCopiada(true);
      setTimeout(() => setSeedCopiada(false), DURACAO_FEEDBACK_COPIA_MS);
    } catch {
      // Falha silenciosa: a seed já está visível e selecionável no texto.
    }
  }

  return (
    <div className="tela-resultado-corrida">
      <h2>Resultado da corrida</h2>
      {resultado.chuva && <span className="badge-chuva">🌧️ Chuva</span>}

      <p className="resultado-corrida__seed">
        Seed da partida: <code>{state.seed}</code>{' '}
        <button type="button" className="botao-secundario" onClick={handleCopiarSeed}>
          {seedCopiada ? 'Copiado!' : 'Copiar seed'}
        </button>
      </p>

      {resultadosHumanos.map((humano) => (
        <p key={humano.jogadorId} className="resultado-corrida__destaque">
          {nomeDoJogadorId(state, humano.jogadorId)} terminou em {humano.posicao}º — {humano.pontos} pontos
        </p>
      ))}

      <div className="tabela-grid-wrap">
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
              const ehHumano = ehHumanoId(state, item.jogadorId);
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
                  <td>{nomeDoJogadorId(state, item.jogadorId)}</td>
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
      </div>

      <p className="resultado-corrida__volta-rapida">
        Volta mais rápida: {nomeDoJogadorId(state, resultado.voltaMaisRapida.jogadorId)} — pontinho extra pra{' '}
        {nomePiloto(state, resultado.voltaMaisRapida.jogadorId)} (
        {(resultado.voltaMaisRapida.tempo / 1000).toFixed(3)}s)
      </p>

      <button type="button" className="botao-primario" onClick={onReiniciar}>
        Novo draft
      </button>
    </div>
  );
}
