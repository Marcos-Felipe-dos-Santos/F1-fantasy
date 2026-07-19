/**
 * Helpers puros de formatação pra exibição (PR 1.7a): traduzem ids de
 * `ProgressoJogador`/`Loadout` em texto (nome + origem equipe/ano) a partir
 * do `Dataset`. Não decidem nem validam nada de regra de jogo — só leem
 * dados já resolvidos pela engine pra exibição. Reutilizado por `TelaDraft`
 * (loadout parcial) e `TelaResumo` (grid final).
 */

import type { Dataset } from '../engine/dataset';
import type { ProgressoJogador } from '../engine/types';

/** Um slot do carro já preenchido, pronto pra exibição. */
export interface SlotVisivel {
  rotulo: string;
  nome: string;
  origem: string;
}

type CampoSlot = keyof ProgressoJogador['slots'];

const ORDEM_SLOTS: { campo: CampoSlot; rotulo: string }[] = [
  { campo: 'pilotoId', rotulo: 'Piloto' },
  { campo: 'chassiId', rotulo: 'Chassi' },
  { campo: 'motorId', rotulo: 'Motor' },
  { campo: 'estrategistaId', rotulo: 'Estrategista' },
  { campo: 'pitId', rotulo: 'Pit' },
];

function resolverComponente(
  dataset: Dataset,
  campo: CampoSlot,
  id: string,
): { nome: string; origem: string } {
  switch (campo) {
    case 'pilotoId': {
      const p = dataset.pilotosById.get(id);
      if (!p) throw new Error(`slotsPreenchidos: pilotoId "${id}" não encontrado no dataset`);
      return { nome: p.nome, origem: `${p.equipe} ${p.ano}` };
    }
    case 'chassiId': {
      const c = dataset.chassisById.get(id);
      if (!c) throw new Error(`slotsPreenchidos: chassiId "${id}" não encontrado no dataset`);
      return { nome: 'Chassi', origem: `${c.equipe} ${c.ano}` };
    }
    case 'motorId': {
      const m = dataset.motoresById.get(id);
      if (!m) throw new Error(`slotsPreenchidos: motorId "${id}" não encontrado no dataset`);
      return { nome: 'Motor', origem: `${m.equipe} ${m.ano}` };
    }
    case 'estrategistaId': {
      const e = dataset.estrategistasById.get(id);
      if (!e) throw new Error(`slotsPreenchidos: estrategistaId "${id}" não encontrado no dataset`);
      return { nome: e.nome, origem: `${e.equipe} ${e.ano}` };
    }
    case 'pitId': {
      const pit = dataset.pitsById.get(id);
      if (!pit) throw new Error(`slotsPreenchidos: pitId "${id}" não encontrado no dataset`);
      return { nome: 'Equipe de pit', origem: `${pit.equipe} ${pit.ano}` };
    }
    default:
      throw new Error(`slotsPreenchidos: campo de slot inválido "${String(campo)}"`);
  }
}

/** Lista os slots já preenchidos de um jogador (na ordem canônica), prontos pra exibição. */
export function slotsPreenchidos(dataset: Dataset, progresso: ProgressoJogador): SlotVisivel[] {
  const resultado: SlotVisivel[] = [];
  for (const { campo, rotulo } of ORDEM_SLOTS) {
    const id = progresso.slots[campo];
    if (id === undefined) continue;
    resultado.push({ rotulo, ...resolverComponente(dataset, campo, id) });
  }
  return resultado;
}
