/**
 * Tela de resultado final da corrida (PR 1.7b, GDD §10): tabela de
 * classificação com pontuação FIA, paradas e status; destaque pro humano e
 * pra volta mais rápida.
 */

import { useState, type ReactNode } from 'react';
import type { DraftState, ResultadoCorrida } from '../engine/types';
import { dataset } from './dataset-app';
import { nomeJogador } from './loadout-view';
import { melhorVoltaDoJogador } from './fluxo-corrida';

/** Quanto tempo o feedback "Copiado!" fica visível no botão de copiar seed (PR 2.4). */
const DURACAO_FEEDBACK_COPIA_MS = 2000;

interface TelaResultadoCorridaProps {
  state: DraftState;
  resultado: ResultadoCorrida;
  onReiniciar: () => void;
  /**
   * Conteúdo extra abaixo do resultado (PR 8.4-mínimo): no modo Campeonato é
   * o `PainelCampeonato` com a tabela acumulada e o botão da próxima corrida.
   * `undefined` na corrida avulsa — a tela fica exatamente como era.
   */
  extra?: ReactNode;
  /**
   * Rótulo do botão de saída (PR 4/4 de "corrida online"). Default `'Novo
   * draft'` — o offline segue exatamente como era.
   *
   * 🔴 **Existe porque o rótulo MENTIA no online** (achado da revisão): lá
   * `onReiniciar` é `sairDaSala`, então "Novo draft" prometia um draft novo e
   * entregava a saída da sala. É o mesmo conserto que `TelaResumo` já tinha
   * recebido com `rotuloReiniciar`, agora na tela que o PR 4 passou a alcançar.
   */
  rotuloReiniciar?: string;
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

export function TelaResultadoCorrida({
  state,
  resultado,
  onReiniciar,
  extra,
  rotuloReiniciar,
}: TelaResultadoCorridaProps) {
  const resultadosHumanos = resultado.classificacao.filter((c) => ehHumanoId(state, c.jogadorId));
  const temRecorde =
    Number.isFinite(resultado.voltaMaisRapida.tempo) &&
    melhorVoltaDoJogador(resultado, resultado.voltaMaisRapida.jogadorId) !== null;
  const houveFinalista = resultado.classificacao.some((c) => c.status === 'terminou');
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

      <div className="resultado-corrida__humanos">
        {resultadosHumanos.map((humano) => (
          <div key={humano.jogadorId} className="resultado-corrida__resumo">
            <strong className="resultado-corrida__posicao">
              {humano.status === 'dnf' ? 'DNF' : `${humano.posicao}º`}
            </strong>
            <div className="resultado-corrida__jogador">
              <strong>{nomeDoJogadorId(state, humano.jogadorId)}</strong>
              <span>
                {humano.status === 'dnf'
                  ? `Abandonou na volta ${humano.voltasCompletadas}`
                  : 'Posição final'}
              </span>
            </div>
            <strong className="resultado-corrida__pontos">
              {humano.pontos}
              <span>pontos</span>
            </strong>
          </div>
        ))}
      </div>

      <div className="tabela-grid-wrap resultado-corrida__tabela">
        <table
          className="tabela-grid resultado-tabela"
          role="table"
          aria-label="Classificação final da corrida"
        >
          <thead>
            <tr>
              <th scope="col">Pos</th>
              <th scope="col">Jogador</th>
              <th scope="col">Piloto</th>
              <th scope="col">Tempo total</th>
              <th scope="col">Melhor volta</th>
              <th scope="col">Paradas</th>
              <th scope="col">Pontos</th>
            </tr>
          </thead>
          <tbody>
            {resultado.classificacao.map((item) => {
              const ehHumano = ehHumanoId(state, item.jogadorId);
              const melhor = melhorVoltaDoJogador(resultado, item.jogadorId);
              const ehVoltaRapida =
                temRecorde &&
                melhor !== null &&
                item.jogadorId === resultado.voltaMaisRapida.jogadorId;
              const status =
                item.status === 'terminou'
                  ? formatarTempo(item.tempoTotal)
                  : `DNF (volta ${item.voltasCompletadas})`;
              return (
                <tr key={item.jogadorId} className={ehHumano ? 'linha-humano' : ''}>
                  <td className="resultado-tabela__posicao">{item.posicao}</td>
                  <td className="resultado-tabela__jogador">
                    {nomeDoJogadorId(state, item.jogadorId)}
                  </td>
                  <td className="resultado-tabela__piloto">{nomePiloto(state, item.jogadorId)}</td>
                  <td className="resultado-tabela__tempo">
                    <span className="resultado-tabela__rotulo" aria-hidden="true">
                      Tempo total
                    </span>
                    {status}
                  </td>
                  <td
                    className={`resultado-tabela__volta${ehVoltaRapida ? ' celula-volta-rapida' : ''}`}
                  >
                    <span className="resultado-tabela__rotulo" aria-hidden="true">
                      Melhor volta
                    </span>
                    <span className="resultado-tabela__valor">
                      {melhor === null ? '—' : formatarTempo(melhor)}
                      {ehVoltaRapida && (
                        <span className="badge-vr" aria-label="Volta mais rápida da corrida">
                          VR
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="resultado-tabela__paradas">
                    <span className="resultado-tabela__rotulo" aria-hidden="true">
                      Paradas
                    </span>
                    {item.paradas}
                  </td>
                  <td className="resultado-tabela__pontos">
                    <span className="resultado-tabela__rotulo" aria-hidden="true">
                      Pontos
                    </span>
                    {item.pontos}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="resultado-corrida__volta-rapida">
        {temRecorde ? (
          <>
            <strong>Volta mais rápida · {formatarTempo(resultado.voltaMaisRapida.tempo)}</strong>
            <span>
              {nomeDoJogadorId(state, resultado.voltaMaisRapida.jogadorId)} ·{' '}
              {nomePiloto(state, resultado.voltaMaisRapida.jogadorId)}
            </span>
            <span>
              {houveFinalista
                ? '+1 ponto pela volta mais rápida'
                : 'Sem ponto extra: ninguém concluiu a corrida'}
            </span>
          </>
        ) : (
          'Nenhuma volta válida para registrar a volta mais rápida.'
        )}
      </p>

      {extra}

      <button type="button" className="botao-secundario" onClick={onReiniciar}>
        {rotuloReiniciar ?? 'Novo draft'}
      </button>
    </div>
  );
}
