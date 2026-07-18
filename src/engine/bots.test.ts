import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import type { DraftState, Jogador, ProgressoJogador } from './types';
import { escolherBot } from './bots';
import { stateManual } from './draft-test-fixtures';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/**
 * Monta um DraftState mínimo, artesanal, com um único bot "pra ganhar" na
 * rodada informada e os slots já preenchidos indicados. Foco isolado na
 * decisão do bot — usa o builder genérico de `draft-test-fixtures.ts`.
 */
function stateComRodada(
  botId: string,
  rodada: number,
  slotsPreenchidos: ProgressoJogador['slots'] = {},
): DraftState {
  const jogador: Jogador = { id: botId, tipo: 'bot', perfilBot: 'praGanhar' };
  return stateManual(dataset, {
    seed: 42,
    jogadores: [jogador],
    progresso: { [botId]: { rodada, slots: slotsPreenchidos } },
  });
}

describe('bot "pra ganhar" (baseline vermelho, §12)', () => {
  it('com todos os slots livres, escolhe o componente de maior média de notas (Red Bull 2023)', () => {
    const state = stateComRodada('bot-1', 1);
    const escolha = escolherBot(state, dataset, 'bot-1');

    // Red Bull 2023 (dados reais): piloto Verstappen média ~90.67, chassi
    // 89.4, motor 89.0, estrategista 89.0, pit 91.0 — pit é o maior.
    expect(escolha).toEqual({ tipo: 'componente', slot: 'pit' });
  });

  it('com só 2 slots livres, escolhe o melhor dos 2', () => {
    const state = stateComRodada('bot-1', 4, {
      pilotoId: 'redbull-2023-piloto-verstappen',
      estrategistaId: 'redbull-2023-estrategista',
      pitId: 'redbull-2023-pit',
    });
    const escolha = escolherBot(state, dataset, 'bot-1');

    // Restam chassi (média 89.4) e motor (média 89.0) — chassi vence.
    expect(escolha).toEqual({ tipo: 'componente', slot: 'chassi' });
  });
});
