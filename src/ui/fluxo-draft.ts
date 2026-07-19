/**
 * Transições puras do draft modo Single (1 humano + 21 bots), extraídas do
 * hook `useDraft` pra permitir teste sem DOM (PR 1.7a).
 *
 * Regra de fronteira: cada função aqui é só composição de funções da engine
 * (`criarDraft`, `aplicarEscolha`, `resolverBots`) — nenhuma regra de jogo é
 * reimplementada. A UI (hook e telas) só chama estas funções; nunca chama a
 * engine diretamente pra transições de estado.
 */

import { atribuirPerfis } from '../engine/bots';
import { aplicarEscolha, criarDraft, resolverBots } from '../engine/draft';
import type { Dataset } from '../engine/dataset';
import { seedFromString } from '../engine/rng';
import type { Dificuldade, DraftState, EscolhaDraft, Jogador } from '../engine/types';

/** Id fixo do jogador humano no modo Single. */
export const ID_HUMANO = 'voce';

/** Quantidade de bots no modo Single (1 humano + 21 bots = 22 jogadores, §3/§12). */
const QTD_BOTS = 21;

/**
 * Converte o texto de seed digitado pelo jogador numa seed numérica
 * determinística: só dígitos vira `Number`, qualquer outro texto passa por
 * `seedFromString`.
 */
export function seedDeTexto(texto: string): number {
  return /^\d+$/.test(texto) ? Number(texto) : seedFromString(texto);
}

function montarJogadores(seed: number, dificuldade: Dificuldade): Jogador[] {
  const base: Jogador[] = [
    { id: ID_HUMANO, tipo: 'humano' },
    ...Array.from({ length: QTD_BOTS }, (_, i) => ({
      id: `bot-${String(i + 1).padStart(2, '0')}`,
      tipo: 'bot' as const,
    })),
  ];
  return atribuirPerfis(base, seed, dificuldade);
}

/**
 * Monta os 22 jogadores do modo Single, cria o draft e resolve os bots até a
 * UI precisar de uma decisão do humano (ou o draft terminar, caso o humano
 * não exista — nunca acontece aqui, mas mantém o mesmo caminho da engine).
 */
export function iniciarDraftSingle(
  dataset: Dataset,
  seedTexto: string,
  dificuldade: Dificuldade,
): DraftState {
  const seed = seedDeTexto(seedTexto);
  const jogadores = montarJogadores(seed, dificuldade);
  const inicial = criarDraft(dataset, jogadores, seed);
  return resolverBots(inicial, dataset);
}

/**
 * Aplica a escolha do humano e resolve os bots subsequentes, sempre
 * devolvendo um novo `DraftState` (a engine já é imutável).
 */
export function aplicarEscolhaHumano(
  dataset: Dataset,
  state: DraftState,
  escolha: EscolhaDraft,
): DraftState {
  const proximo = aplicarEscolha(state, dataset, ID_HUMANO, escolha);
  return resolverBots(proximo, dataset);
}
