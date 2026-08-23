/**
 * O pódio do fim de campeonato (PR 8.3), agora COMPARTILHADO entre o offline e
 * o online (PR 3.5.4).
 *
 * 🔴 **Por que virou componente próprio — aviso A3 da revisão do 3.5.4, e o
 * achado é sobre um comentário que afirmava mais do que o código fazia.** O
 * `PodioOnline` nasceu como cópia do JSX do `FluxoCampeonato`, com um docblock
 * dizendo "reusar a marcação é o ponto — dois pódios com CSS próprio
 * divergiriam no primeiro ajuste de estilo". O CSS era mesmo compartilhado, mas
 * a **marcação** tinha sido duplicada — que é exatamente o vetor de divergência
 * que a frase nomeava. Um `<li>` a mais num dos dois, ou uma classe renomeada,
 * e as duas telas passariam a desenhar pódios diferentes.
 *
 * 🔒 **A ordem visual é 2º-1º-3º, e não é enfeite:** é a do pódio real, com o
 * campeão ao centro e mais alto. Quem governa a altura é a classe
 * `podio__lugar--1|2|3` no CSS, então trocar a ordem aqui sem trocar as classes
 * põe o vice no degrau do campeão.
 */

import type { DraftState, LinhaClassificacao } from '../engine/types';
import { nomeJogador } from './loadout-view';

/** Nome de exibição do jogador; cai no id se não achar (mesmo padrão das outras telas). */
function nomeDoJogador(state: DraftState, jogadorId: string): string {
  const jogador = state.jogadores.find((j) => j.id === jogadorId);
  return jogador ? nomeJogador(jogador) : jogadorId;
}

/**
 * Os três primeiros da classificação FINAL.
 *
 * ⚠️ Recebe a classificação **já ordenada** e corta os três — não ordena nada.
 * Ordenação (pontuação FIA, countback, desempate por `jogadorId`) é regra de
 * jogo e mora em `acumularClassificacao`, na engine. Reordenar aqui criaria uma
 * segunda resposta para a mesma pergunta.
 *
 * Tolera menos de três jogadores: cada degrau some sozinho se não houver quem o
 * ocupe.
 */
export function Podio({
  state,
  classificacao,
}: {
  state: DraftState;
  classificacao: LinhaClassificacao[];
}) {
  const podio = classificacao.slice(0, 3);
  return (
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
  );
}
