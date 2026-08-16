/**
 * Orquestra as corridas de um campeonato (PR 8.4-mínimo): casca fina que
 * escolhe a etapa da vez, monta a corrida dela e, no fim, mostra a tabela
 * acumulada com o botão da próxima. Quando o cursor chega ao fim do
 * calendário, mostra a tabela final.
 *
 * Nenhuma regra de jogo mora aqui. As etapas JÁ ESTÃO SIMULADAS dentro de
 * `EstadoCampeonato` (`iniciarCampeonato` pré-simula tudo); este componente só
 * decide o que aparece na tela.
 *
 * 🔑 **A seed é o detalhe que faz a coisa toda ser verdade.** A corrida
 * exibida é preparada com `seedDaEtapa(state.seed, pistaId)` — a MESMA seed
 * que `simularCampeonato` usou pra pré-simular aquela etapa. Sem isso o
 * jogador assistiria a uma corrida simulada com a seed crua do draft e veria
 * outra na tabela de pontos, porque a pontuação vem de `campeonato.etapas`.
 */

import { useState } from 'react';
import { seedDaEtapa } from '../engine/campeonato';
import type { DraftState } from '../engine/types';
import { dataset } from './dataset-app';
import {
  calendarioAnotado,
  campeonatoConcluido,
  classificacaoApos,
  variacaoDePosicao,
  type EstadoCampeonato,
} from './fluxo-campeonato';
import { FluxoCorrida } from './FluxoCorrida';
import { nomeJogador } from './loadout-view';
import { PainelCalendario } from './PainelCalendario';
import { PainelCampeonato } from './PainelCampeonato';

interface FluxoCampeonatoProps {
  state: DraftState;
  campeonato: EstadoCampeonato;
  onProximaCorrida: () => void;
  onReiniciar: () => void;
}

/** Nome de exibição do jogador; cai no id se não achar (mesmo padrão das outras telas). */
function nomeDoJogador(state: DraftState, jogadorId: string): string {
  const jogador = state.jogadores.find((j) => j.id === jogadorId);
  return jogador ? nomeJogador(jogador) : jogadorId;
}

/** Nome da pista pra exibição; cai no id se o dataset não a tiver (save de outro dataset). */
function nomeDaPista(pistaId: string | undefined): string | null {
  if (pistaId === undefined) return null;
  return dataset.pistasById.get(pistaId)?.nome ?? pistaId;
}

export function FluxoCampeonato({
  state,
  campeonato,
  onProximaCorrida,
  onReiniciar,
}: FluxoCampeonatoProps) {
  const totalCorridas = campeonato.etapas.length;
  // O toggle mora AQUI, não no `PainelCampeonato`: este componente não remonta
  // entre etapas (o `key` está no `FluxoCorrida`, o filho), então a escolha
  // sobrevive ao avanço. No painel, ela seria perdida a cada corrida.
  // Deliberadamente NÃO persistido no save: o save tem impressão digital e
  // `VERSAO_FORMATO`, e preferência de UI não é estado de campeonato.
  const [auto, setAuto] = useState(false);

  // Fim de temporada: o cursor passou da última etapa.
  if (campeonatoConcluido(campeonato)) {
    const finais = classificacaoApos(campeonato, totalCorridas);
    const podio = finais.slice(0, 3);
    return (
      <div className="tela-fim-campeonato">
        <h2>🏆 Fim do campeonato</h2>

        {/* Pódio antes da tabela: é o desfecho, e o que o jogador quer ver
            primeiro. A ordem 2º-1º-3º é a do pódio real, com o campeão ao
            centro e mais alto — a classe governa a altura no CSS. */}
        <ol className="podio">
          {[podio[1], podio[0], podio[2]].map((linha, posicaoVisual) =>
            linha === undefined ? null : (
              <li
                key={linha.jogadorId}
                className={`podio__lugar podio__lugar--${[2, 1, 3][posicaoVisual]}`}
              >
                <span className="podio__medalha">{['🥈', '🥇', '🥉'][posicaoVisual]}</span>
                <span className="podio__nome">{nomeDoJogador(state, linha.jogadorId)}</span>
                <span className="podio__pontos">{linha.pontos} pts</span>
              </li>
            ),
          )}
        </ol>

        <PainelCampeonato
          state={state}
          classificacao={finais}
          corridasFeitas={totalCorridas}
          totalCorridas={totalCorridas}
          concluido
          onProximaCorrida={null}
          nomeProximaPista={null}
        />

        <PainelCalendario state={state} etapas={calendarioAnotado(campeonato)} />

        <button type="button" className="botao-primario" onClick={onReiniciar}>
          Novo draft
        </button>
      </div>
    );
  }

  const indice = campeonato.etapaAtual;
  const pistaId = campeonato.calendario[indice];
  const ehUltima = indice + 1 >= totalCorridas;

  return (
    <FluxoCorrida
      // `key` força a REMONTAGEM do `FluxoCorrida` a cada etapa. Sem ela, o
      // `useState` de `useCorrida` mantém a corrida da etapa anterior (o
      // inicializador só roda na montagem) e o jogador correria a primeira
      // pista do calendário até o fim do campeonato.
      key={`etapa-${indice}`}
      state={state}
      fonte={{ modo: 'preparar', pistaId, seed: seedDaEtapa(state.seed, pistaId) }}
      // No automático a corrida larga sozinha — sem isso o avanço pararia na
      // tela de grid esperando um clique, e o modo pareceria quebrado.
      autoLargar={auto}
      onReiniciar={onReiniciar}
      extraResultado={
        <>
          <PainelCampeonato
            state={state}
            // `indice + 1`: a tabela mostrada no fim da corrida INCLUI a corrida
            // que o jogador acabou de ver.
            classificacao={classificacaoApos(campeonato, indice + 1)}
            variacao={variacaoDePosicao(campeonato, indice + 1)}
            corridasFeitas={indice + 1}
            totalCorridas={totalCorridas}
            concluido={false}
            onProximaCorrida={onProximaCorrida}
            nomeProximaPista={ehUltima ? null : nomeDaPista(campeonato.calendario[indice + 1])}
            auto={auto}
            onAuto={setAuto}
          />
          {/* O calendário usa o estado com o cursor JÁ avançado pela corrida
              que acabou de ser assistida — senão a etapa recém-corrida
              apareceria como "próxima" na tela do próprio resultado dela. */}
          <PainelCalendario
            state={state}
            etapas={calendarioAnotado({ ...campeonato, etapaAtual: indice + 1 })}
          />
        </>
      }
    />
  );
}
