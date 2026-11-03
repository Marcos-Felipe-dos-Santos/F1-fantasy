/**
 * Helpers puros de formatação pra exibição (PR 1.7a): traduzem ids de
 * `ProgressoJogador`/`Loadout` em texto (nome + origem equipe/ano) a partir
 * do `Dataset`. Não decidem nem validam nada de regra de jogo — só leem
 * dados já resolvidos pela engine pra exibição. Reutilizado por `TelaDraft`
 * (loadout parcial) e `TelaResumo` (grid final).
 */

import type { Dataset } from '../engine/dataset';
import type { Jogador, Loadout, ProgressoJogador } from '../engine/types';

/**
 * Nome de exibição de um jogador (PR 2.1a): usa `jogador.nome` (aparado)
 * quando não vazio; senão cai em "Você" pro humano sem nome (Single) ou no
 * `id` pro bot. `.trim()` evita renderizar nome em branco quando o campo
 * vier `''` ou só espaços.
 */
export function nomeJogador(jogador: Jogador): string {
  return jogador.nome?.trim() || (jogador.tipo === 'humano' ? 'Você' : jogador.id);
}

/**
 * Nome do piloto de cada carro, para o painel e o ticker (PR 2d). Decisão do Marcos: o
 * ano só entra quando o nome se repete no grid, em ~1,45 nomes por corrida. A mesma
 * temporada em dois carros (26% das corridas) deixaria o ano igual: daí o "(2)".
 */
export function rotulosDosPilotos(
  loadouts: Readonly<Record<string, Loadout>>,
  dataset: Pick<Dataset, 'pilotosById'>,
): Map<string, string> {
  const pilotos = Object.entries(loadouts).map(([jogadorId, l]) => ({ jogadorId, piloto: dataset.pilotosById.get(l.pilotoId) }));
  const vezes = new Map<string, number>();
  for (const { piloto } of pilotos) {
    if (piloto !== undefined) vezes.set(piloto.nome, (vezes.get(piloto.nome) ?? 0) + 1);
  }
  const jaUsados = new Map<string, number>();
  const rotulos = new Map<string, string>();
  // Ordem de `jogadorId`: `Object.entries` segue a de criação, e o rótulo não pode depender dela.
  for (const { jogadorId, piloto } of [...pilotos].sort((a, b) => (a.jogadorId < b.jogadorId ? -1 : 1))) {
    if (piloto === undefined) {
      rotulos.set(jogadorId, '?');
      continue;
    }
    const base = (vezes.get(piloto.nome) ?? 0) > 1 ? `${piloto.nome} ${piloto.ano}` : piloto.nome;
    const vez = (jaUsados.get(base) ?? 0) + 1;
    jaUsados.set(base, vez);
    rotulos.set(jogadorId, vez === 1 ? base : `${base} (${vez})`);
  }
  return rotulos;
}

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
