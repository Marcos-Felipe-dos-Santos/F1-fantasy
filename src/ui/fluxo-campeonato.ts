/**
 * Transições puras do modo Campeonato (PR 6.4), no mesmo espírito de
 * `fluxo-corrida.ts`/`fluxo-draft.ts`/`fluxo-local.ts`: estado e transições
 * testáveis sem DOM, que só compõem a engine (`simularCampeonato`,
 * `acumularClassificacao`). Nenhuma regra de jogo é reimplementada aqui —
 * pontuação, desempate e simulação vêm 100% de `src/engine`.
 *
 * Fora de escopo deste PR (fica pros PRs seguintes da Fase 6):
 * - Telas e hooks React (PR 6.6).
 * - Persistência do estado do campeonato (PR 6.5).
 *
 * DECISÃO DE FORMATO (portão 6.3, fechado em 2026-07-27, opção B): nenhuma
 * alavanca de mitigação de dominância de draft entra no jogo. Consequência de
 * formato — a TEMPORADA CURTA DE 5 ETAPAS passa a ser o DEFAULT do modo
 * Campeonato; a temporada completa (10 etapas) vira opção. Isso substitui a
 * decisão D7 do plano da Fase 6 (lá a curta era só mitigação de tempo de
 * sessão). Ver PROGRESS.md.
 */

import type { Dataset } from '../engine/dataset';
import { acumularClassificacao, simularCampeonato } from '../engine/campeonato';
import type { EtapaCampeonato, LinhaClassificacao, Loadout, Pista } from '../engine/types';

/** Os dois formatos de temporada do modo Campeonato (portão 6.3). */
export type FormatoTemporada = 'curta' | 'completa';

/** Default do modo Campeonato: temporada curta (5 etapas) — decisão do portão 6.3. */
export const FORMATO_PADRAO: FormatoTemporada = 'curta';

/** Número de etapas de cada formato de temporada. */
export const N_ETAPAS: Record<FormatoTemporada, number> = { curta: 5, completa: 10 };

/**
 * Calendário padrão do modo Campeonato: os ids das pistas na ORDEM do
 * `dataset.pistas`, cortado em `N_ETAPAS[formato]`. Default `FORMATO_PADRAO`
 * ('curta'). A temporada curta é sempre um PREFIXO da completa (mesmos ids,
 * mesma ordem) — invariante que garante que as 5 primeiras etapas saem bit a
 * bit idênticas nos dois formatos (a seed de cada etapa depende só do id da
 * pista, nunca do índice/tamanho do calendário — ver `seedDaEtapa`).
 */
export function calendarioPadrao(
  dataset: Dataset,
  formato: FormatoTemporada = FORMATO_PADRAO,
): string[] {
  return dataset.pistas.slice(0, N_ETAPAS[formato]).map((pista) => pista.id);
}

/**
 * Estado do modo Campeonato. `etapas` já vem PRÉ-SIMULADA por inteiro no
 * `iniciarCampeonato` (decisão D3 do plano da Fase 6, custo <2ms) —
 * `etapaAtual` é só um cursor de apresentação (quantas etapas já foram
 * "reveladas" ao jogador), nunca dispara nova simulação. `etapaAtual` é
 * 0-based e vale `calendario.length` quando o campeonato terminou.
 */
export interface EstadoCampeonato {
  seed: number;
  calendario: string[];
  etapaAtual: number;
  etapas: EtapaCampeonato[];
}

/** Resolve um id de pista no dataset; lança alto (nunca `undefined` silencioso) se não existir. */
function resolverPista(dataset: Dataset, pistaId: string): Pista {
  const pista = dataset.pistasById.get(pistaId);
  if (!pista) {
    throw new Error(`iniciarCampeonato: pista "${pistaId}" não encontrada no dataset`);
  }
  return pista;
}

/**
 * Inicia um campeonato: pré-simula TODAS as etapas do `calendario` de uma vez
 * (`simularCampeonato`) e nasce com `etapaAtual: 0`. Rejeita calendário vazio
 * e ids de pista inexistentes no dataset (falha alta, com o id na mensagem);
 * pista duplicada é rejeitada pela própria engine (`simularCampeonato`), cuja
 * mensagem chega intacta ao chamador.
 */
export function iniciarCampeonato(
  dataset: Dataset,
  loadouts: Loadout[],
  seed: number,
  calendario: string[],
): EstadoCampeonato {
  if (calendario.length === 0) {
    throw new Error('iniciarCampeonato: calendário não pode ser vazio');
  }

  const pistas = calendario.map((pistaId) => resolverPista(dataset, pistaId));
  const resultado = simularCampeonato(dataset, loadouts, pistas, seed);

  return {
    seed,
    calendario,
    etapaAtual: 0,
    etapas: resultado.etapas,
  };
}

/**
 * Avança o cursor de apresentação em 1 etapa. Pura: devolve um estado NOVO
 * (nunca muta `estado`). Satura em `estado.calendario.length` — chamar depois
 * de já ter chegado ao fim devolve um estado equivalente (idempotente, não
 * lança). As etapas já estão todas pré-simuladas; avançar só move o cursor.
 */
export function avancarEtapa(estado: EstadoCampeonato): EstadoCampeonato {
  return {
    ...estado,
    etapaAtual: Math.min(estado.etapaAtual + 1, estado.calendario.length),
  };
}

/** Salta o cursor de apresentação direto pro fim do campeonato (todas as etapas "reveladas" de uma vez). */
export function simularOResto(estado: EstadoCampeonato): EstadoCampeonato {
  return { ...estado, etapaAtual: estado.calendario.length };
}

/**
 * Classificação acumulada das `n` primeiras etapas (0-based sobre
 * `estado.etapas`, `n` etapas contadas a partir do início) — o que permite
 * mostrar a tabela evoluindo etapa a etapa. `n = 0` devolve todos os
 * jogadores com 0 ponto, ordenados pela convenção da engine (countback FIA,
 * depois `jogadorId`). O universo de jogadores é recuperado do grid da
 * primeira etapa pré-simulada (mesmo grid em toda etapa do campeonato) — não
 * reimplementa desempate, delega inteiramente a `acumularClassificacao`.
 */
export function classificacaoApos(estado: EstadoCampeonato, nEtapas: number): LinhaClassificacao[] {
  const jogadorIds = estado.etapas[0].resultado.classificacao.map((item) => item.jogadorId);
  return acumularClassificacao(estado.etapas.slice(0, nEtapas), jogadorIds);
}

/** Verdadeiro quando o cursor de apresentação chegou ao fim do calendário. */
export function campeonatoConcluido(estado: EstadoCampeonato): boolean {
  return estado.etapaAtual >= estado.calendario.length;
}
