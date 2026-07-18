/**
 * Resolução de Loadout → carro efetivo (PR 1.3).
 *
 * Helper puro reutilizado pela quali (PR 1.3) e pela corrida (PR 1.4):
 * traduz os ids de um `Loadout` nos registros reais do `Dataset` e aplica o
 * bônus da peça icônica sorteada nos atributos-alvo. Não muta o dataset —
 * sempre devolve cópias das notas.
 *
 * Nota efetiva **não é clampada em 99**: uma peça forte turbinando um carro
 * já bom pode (de propósito) passar da escala normal de qualidade — isso é
 * o que torna peças raras valiosas mesmo em equipe/ano já excelente (§7).
 */

import type { Dataset } from './dataset';
import type { Loadout, Nota, NotasChassi, NotasMotor, NotasPiloto, Peca } from './types';

/** Carro de um jogador já resolvido: notas efetivas (com bônus de peça aplicado). */
export interface CarroResolvido {
  jogadorId: string;
  piloto: NotasPiloto;
  chassi: NotasChassi;
  motor: NotasMotor;
  estrategista: { call: Nota; sangf: Nota };
  pit: { pitTempo: Nota; pitErro: Nota };
  peca: Peca;
}

/** Resolve um `Loadout` nos registros do dataset e aplica o bônus da peça sorteada. */
export function resolverCarro(dataset: Dataset, loadout: Loadout): CarroResolvido {
  const pilotoRegistro = dataset.pilotosById.get(loadout.pilotoId);
  if (!pilotoRegistro) {
    throw new Error(`resolverCarro: pilotoId "${loadout.pilotoId}" não encontrado`);
  }
  const chassiRegistro = dataset.chassisById.get(loadout.chassiId);
  if (!chassiRegistro) {
    throw new Error(`resolverCarro: chassiId "${loadout.chassiId}" não encontrado`);
  }
  const motorRegistro = dataset.motoresById.get(loadout.motorId);
  if (!motorRegistro) {
    throw new Error(`resolverCarro: motorId "${loadout.motorId}" não encontrado`);
  }
  const estrategistaRegistro = dataset.estrategistasById.get(loadout.estrategistaId);
  if (!estrategistaRegistro) {
    throw new Error(
      `resolverCarro: estrategistaId "${loadout.estrategistaId}" não encontrado`,
    );
  }
  const pitRegistro = dataset.pitsById.get(loadout.pitId);
  if (!pitRegistro) {
    throw new Error(`resolverCarro: pitId "${loadout.pitId}" não encontrado`);
  }
  const peca = dataset.pecasById.get(loadout.pecaId);
  if (!peca) {
    throw new Error(`resolverCarro: pecaId "${loadout.pecaId}" não encontrado`);
  }

  // Cópias — nunca mutar os registros do dataset.
  const piloto: NotasPiloto = { ...pilotoRegistro.notas };
  const chassi: NotasChassi = { ...chassiRegistro.notas };
  const motor: NotasMotor = { ...motorRegistro.notas };

  // Checagem `in` direto nas cópias: auto-sincroniza com os tipos de notas
  // (sem lista paralela de chaves que poderia engolir um bônus em silêncio).
  // As chaves de NotasPiloto/NotasChassi/NotasMotor são disjuntas.
  for (const atributo of peca.atributosAlvo) {
    if (atributo in piloto) {
      piloto[atributo as keyof NotasPiloto] += peca.bonus;
    } else if (atributo in chassi) {
      chassi[atributo as keyof NotasChassi] += peca.bonus;
    } else if (atributo in motor) {
      motor[atributo as keyof NotasMotor] += peca.bonus;
    } else {
      throw new Error(
        `resolverCarro: atributo alvo "${atributo}" da peça "${peca.id}" não corresponde a nenhuma nota`,
      );
    }
  }

  return {
    jogadorId: loadout.jogadorId,
    piloto,
    chassi,
    motor,
    estrategista: { ...estrategistaRegistro.notas },
    pit: { ...pitRegistro.notas },
    peca,
  };
}
