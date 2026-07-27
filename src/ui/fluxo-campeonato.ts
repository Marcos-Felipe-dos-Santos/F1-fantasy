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
  // Os dois guards existem porque `slice` NUNCA reclama: com um `formato` fora
  // do union (string vinda de save/URL em 6.5/6.6, onde o tipo não vale nada)
  // `N_ETAPAS[formato]` é `undefined` e `slice(0, undefined)` devolveria o
  // calendário INTEIRO; com um dataset menor que o formato, `slice` satura e o
  // jogador disputaria 8 etapas achando que são 10. Os dois casos entregam uma
  // temporada errada sem erro nenhum — falha silenciosa, que este projeto
  // trata como inaceitável (mesmo padrão de `resolverPista` abaixo).
  if (!Object.prototype.hasOwnProperty.call(N_ETAPAS, formato)) {
    throw new Error(`calendarioPadrao: formato inválido "${formato}"`);
  }
  const nEtapas = N_ETAPAS[formato];
  if (dataset.pistas.length < nEtapas) {
    throw new Error(
      `calendarioPadrao: dataset tem ${dataset.pistas.length} pistas, formato "${formato}" precisa de ${nEtapas}`,
    );
  }
  return dataset.pistas.slice(0, nEtapas).map((pista) => pista.id);
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
  /**
   * Universo de jogadores do campeonato, na ordem dos loadouts. Guardado
   * EXPLICITAMENTE em vez de reconstruído de `etapas[0]` (aviso 2 da revisão
   * do 6.4): `EstadoCampeonato` é tipo público e o PR 6.5 vai desserializar
   * isto de `localStorage`, onde o tipo TypeScript não garante nada — um save
   * corrompido com `etapas: []` daria um `TypeError` obscuro em vez de erro
   * de save inválido. É também o campo que o 6.5 precisa pra validar o save.
   */
  jogadorIds: string[];
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
    // CÓPIA, nunca a referência do chamador (aviso 3 da revisão do 6.4): se o
    // chamador mutar o array depois (`calendario.push(...)`), `calendario` e
    // `etapas` dessincronizam — o cursor passaria do fim das etapas simuladas
    // e a tela do 6.6 leria `etapas[i]` inexistente.
    calendario: [...calendario],
    etapaAtual: 0,
    etapas: resultado.etapas,
    jogadorIds: loadouts.map((loadout) => loadout.jogadorId),
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
    etapaAtual: Math.min(estado.etapaAtual + 1, estado.etapas.length),
  };
}

/** Salta o cursor de apresentação direto pro fim do campeonato (todas as etapas "reveladas" de uma vez). */
export function simularOResto(estado: EstadoCampeonato): EstadoCampeonato {
  return { ...estado, etapaAtual: estado.etapas.length };
}

/**
 * Classificação acumulada das `nEtapas` primeiras etapas — o que permite
 * mostrar a tabela evoluindo etapa a etapa. `nEtapas` é uma CONTAGEM, não um
 * índice: `classificacaoApos(estado, estado.etapaAtual)` mostra a tabela
 * depois das etapas já reveladas ao jogador. (O doc anterior dizia "0-based",
 * o que convidava a um `etapaAtual - 1` que devolveria a tabela de uma etapa
 * atrás sem erro nenhum — cosmético 2 da revisão do 6.4.)
 *
 * `nEtapas = 0` devolve todos os jogadores com 0 ponto, ordenados pela
 * convenção da engine (countback FIA, depois `jogadorId`). Não reimplementa
 * desempate: delega inteiramente a `acumularClassificacao`.
 */
export function classificacaoApos(estado: EstadoCampeonato, nEtapas: number): LinhaClassificacao[] {
  // `slice` aceita qualquer coisa e devolve tabela ERRADA em silêncio: -1 vira
  // "todas menos a última", 2.7 vira 2, 999 satura no fim e — o pior — `NaN`
  // vira `[]`, ou seja, uma temporada inteira zerada apresentada como estado
  // legítimo. `NaN` é plausível no 6.6 (parseInt de query param, slider). É o
  // mesmo modo de falha que `cmpCountback` (`engine/campeonato.ts`) documenta
  // como inaceitável; aqui falha alto (aviso 1 da revisão do 6.4).
  if (!Number.isInteger(nEtapas) || nEtapas < 0 || nEtapas > estado.etapas.length) {
    throw new Error(
      `classificacaoApos: nEtapas inválido (${nEtapas}), esperado inteiro em [0, ${estado.etapas.length}]`,
    );
  }
  return acumularClassificacao(estado.etapas.slice(0, nEtapas), estado.jogadorIds);
}

/**
 * Verdadeiro quando o cursor de apresentação chegou ao fim. Mede contra
 * `etapas.length` (o que foi de fato simulado), não contra `calendario.length`
 * (entrada do chamador) — ver aviso 3 da revisão do 6.4.
 */
export function campeonatoConcluido(estado: EstadoCampeonato): boolean {
  return estado.etapaAtual >= estado.etapas.length;
}
