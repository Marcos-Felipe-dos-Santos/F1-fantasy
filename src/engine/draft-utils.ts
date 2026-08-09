/**
 * Helpers puros compartilhados entre `draft.ts` e `bots.ts` (PR 1.2).
 *
 * Módulo isolado de propósito: `draft.ts` usa `escolherBot` de `bots.ts`
 * (via `resolverBots`) e `bots.ts` precisa dos mesmos helpers de resolução
 * de slot/equipe-ano que `draft.ts` usa pra validar jogadas. Colocar esses
 * helpers aqui evita import circular entre os dois módulos.
 */

import type { EquipeAno, EquipeAnoRef, ProgressoJogador, SlotComponente } from './types';
import type { Dataset } from './dataset';
import { createRng, deriveSeed } from './rng';

/**
 * Ordem de escolha da rodada 6 (§3), embaralhada por seed.
 *
 * Mora aqui, e não dentro de `criarDraft`, porque o redutor de turnos do modo
 * online (`src/net/`) precisa da MESMA ordem e **não pode chamar `criarDraft`**:
 * o servidor não carrega o dataset. Duplicar a fórmula nos dois lados era o
 * risco número um da Fase 3 — regra de turno derivando em silêncio. Com uma
 * função só, não há o que divergir. Note que ela **não toca o dataset**: entram
 * ids e seed, sai a ordem.
 *
 * ⚠️ Depende da ORDEM do array de ids, não do conjunto (`shuffle` consome o
 * stream posição a posição). Quem chama é responsável por passar sempre a mesma
 * ordem — ver `congelarRoster` em `src/net/sala.ts`.
 */
export function calcularOrdemPeca(jogadorIds: string[], seed: number): string[] {
  return createRng(deriveSeed(seed, 'draft:ordem-peca')).shuffle(jogadorIds);
}

/**
 * Quantas rodadas de sorteio de equipe/ano cada jogador joga (§3). A rodada
 * `RODADAS_SORTEIO + 1` é a da peça icônica; quem chega nela terminou os
 * sorteios.
 *
 * Constante, e não `5` solto, porque o limiar é **regra de turno** — a mesma
 * classe de coisa que a `ordemPeca`. O modo online precisa dele para decidir de
 * quem é a vez sem carregar o dataset (`src/net/tipos.ts` deriva
 * `RODADA_COMPLETA` daqui), e dois números `5` mantidos em paralelo entre
 * engine e rede é exatamente o tipo de divergência silenciosa que a Fase 3
 * existe para evitar.
 */
export const RODADAS_SORTEIO = 5;

/** Os 5 slots de um sorteio de equipe/ano, na ordem canônica (§3). */
export const TODOS_SLOTS: readonly SlotComponente[] = [
  'piloto',
  'chassi',
  'motor',
  'estrategista',
  'pit',
];

type CampoLoadoutParcial = keyof ProgressoJogador['slots'];

/** Mapeia cada slot pro campo correspondente em `ProgressoJogador.slots` / `Loadout`. */
export const SLOT_PARA_CAMPO: Record<SlotComponente, CampoLoadoutParcial> = {
  piloto: 'pilotoId',
  chassi: 'chassiId',
  motor: 'motorId',
  estrategista: 'estrategistaId',
  pit: 'pitId',
};

/** Slots que um jogador ainda pode escolher, dado seu progresso corrente. */
export function slotsRestantes(progresso: ProgressoJogador): SlotComponente[] {
  return TODOS_SLOTS.filter((slot) => progresso.slots[SLOT_PARA_CAMPO[slot]] === undefined);
}

/** Resolve a referência leve (equipe+ano) pro registro completo no dataset. Lança se não encontrar. */
export function encontrarEquipeAno(dataset: Dataset, ref: EquipeAnoRef): EquipeAno {
  const equipeAno = dataset.equipeAnos.find((ea) => ea.equipe === ref.equipe && ea.ano === ref.ano);
  if (!equipeAno) {
    throw new Error(`encontrarEquipeAno: equipe/ano não encontrada (${ref.equipe} ${ref.ano})`);
  }
  return equipeAno;
}

/** Id do componente do slot informado dentro de uma equipe/ano (piloto exige escolha externa entre os 2 titulares). */
export function idComponenteDoSlot(
  equipeAno: EquipeAno,
  slot: Exclude<SlotComponente, 'piloto'>,
): string {
  switch (slot) {
    case 'chassi':
      return equipeAno.chassi.id;
    case 'motor':
      return equipeAno.motor.id;
    case 'estrategista':
      return equipeAno.estrategista.id;
    case 'pit':
      return equipeAno.pit.id;
    default:
      // Rede de segurança em runtime: um `slot` malformado (ex.: vindo de
      // desserialização externa, sem passar pelo type-check) não deve cair
      // silenciosamente num componente errado — falha alto e explícito.
      throw new Error(`idComponenteDoSlot: slot inválido "${String(slot)}"`);
  }
}
