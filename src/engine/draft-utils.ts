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
