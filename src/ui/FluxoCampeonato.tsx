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

import { seedDaEtapa } from '../engine/campeonato';
import type { DraftState } from '../engine/types';
import { dataset } from './dataset-app';
import {
  campeonatoConcluido,
  classificacaoApos,
  type EstadoCampeonato,
} from './fluxo-campeonato';
import { FluxoCorrida } from './FluxoCorrida';
import { PainelCampeonato } from './PainelCampeonato';

interface FluxoCampeonatoProps {
  state: DraftState;
  campeonato: EstadoCampeonato;
  onProximaCorrida: () => void;
  onReiniciar: () => void;
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

  // Fim de temporada: o cursor passou da última etapa.
  if (campeonatoConcluido(campeonato)) {
    return (
      <div className="tela-resultado-corrida">
        <h2>Fim do campeonato</h2>
        <PainelCampeonato
          state={state}
          classificacao={classificacaoApos(campeonato, totalCorridas)}
          corridasFeitas={totalCorridas}
          totalCorridas={totalCorridas}
          concluido
          onProximaCorrida={null}
          nomeProximaPista={null}
        />
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
      pistaId={pistaId}
      seed={seedDaEtapa(state.seed, pistaId)}
      onReiniciar={onReiniciar}
      extraResultado={
        <PainelCampeonato
          state={state}
          // `indice + 1`: a tabela mostrada no fim da corrida INCLUI a corrida
          // que o jogador acabou de ver.
          classificacao={classificacaoApos(campeonato, indice + 1)}
          corridasFeitas={indice + 1}
          totalCorridas={totalCorridas}
          concluido={false}
          onProximaCorrida={onProximaCorrida}
          nomeProximaPista={ehUltima ? null : nomeDaPista(campeonato.calendario[indice + 1])}
        />
      }
    />
  );
}
