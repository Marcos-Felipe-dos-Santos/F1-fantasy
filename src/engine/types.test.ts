import { describe, expect, it } from 'vitest';
import type {
  Carro,
  Estrategista,
  EquipePit,
  Loadout,
  Motor,
  Peca,
  Piloto,
  Pista,
  ResultadoCorrida,
} from './types';

/**
 * Fixtures do PR 0.3. O "teste real" aqui é o `tsc --strict`: se os tipos
 * estiverem errados, este arquivo nem compila. As asserções abaixo são
 * triviais mas reais, e as fixtures ficam exportadas pra servirem de
 * material dos PRs 1.x.
 */

// Titular fictício de Lotus 1978, inspirado em Mario Andretti / Ronnie Peterson.
export const pilotoFixture: Piloto = {
  id: 'piloto-lotus-1978-1',
  nome: 'Piloto Lotus 1978',
  equipe: 'Lotus',
  ano: 1978,
  notas: {
    rit: 88,
    quali: 90,
    cons: 82,
    ult: 85,
    def: 78,
    chu: 80,
    pneu: 76,
    larg: 79,
    sf: 84,
  },
};

export const carroFixture: Carro = {
  id: 'carro-lotus-79-1978',
  equipe: 'Lotus',
  ano: 1978,
  notas: {
    aero: 92,
    mec: 74,
    motor: 70,
    ppeso: 75,
    conf: 68,
    freio: 71,
  },
};

export const motorFixture: Motor = {
  id: 'motor-cosworth-dfv-1978',
  equipe: 'Lotus',
  ano: 1978,
  potencia: 72,
  conf: 70,
};

export const estrategistaFixture: Estrategista = {
  id: 'estrategista-classico',
  arquetipo: 'classico',
  notas: {
    call: 80,
    sangf: 77,
  },
};

export const equipePitFixture: EquipePit = {
  id: 'pit-veloz',
  nome: 'Equipe de Pit Veloz',
  notas: {
    pitTempo: 85,
    pitErro: 20,
  },
};

// Peça de 1 atributo.
export const pecaSimplesFixture: Peca = {
  id: 'peca-bargeboards',
  nome: 'Bargeboards',
  categoria: 'Aerodinâmica',
  raridade: 'comum',
  atributosAlvo: ['aero'],
  bonus: 4,
  risco: 0,
};

// Peça de 2 atributos, raridade proibida (§7: Suspensão ativa Williams FW15).
export const pecaDuplaFixture: Peca = {
  id: 'peca-suspensao-ativa-fw15',
  nome: 'Suspensão ativa Williams FW15',
  categoria: 'Chassi / Suspensão',
  raridade: 'proibido',
  atributosAlvo: ['aero', 'mec'],
  bonus: 20,
  risco: 8,
};

export const pistaFixture: Pista = {
  id: 'pista-monaco',
  nome: 'Mônaco',
  pesos: {
    aero: 0.5,
    mec: 0.35,
    motor: 0.15,
  },
  ultrapassagem: 'dificil',
  chanceChuva: 0.1,
  voltas: 15,
};

export const loadoutFixture: Loadout = {
  jogadorId: 'jogador-1',
  pilotoId: pilotoFixture.id,
  carroId: carroFixture.id,
  motorId: motorFixture.id,
  estrategistaId: estrategistaFixture.id,
  pitId: equipePitFixture.id,
  pecaId: pecaDuplaFixture.id,
};

export const resultadoCorridaFixture: ResultadoCorrida = {
  seed: 12345,
  classificacao: [
    { jogadorId: 'jogador-1', posicao: 1, pontos: 25, tempoTotal: 5423.1 },
    { jogadorId: 'jogador-2', posicao: 2, pontos: 18, tempoTotal: 5430.7 },
  ],
  voltaMaisRapida: { jogadorId: 'jogador-2', tempo: 71.234 },
};

describe('tipos base da engine (PR 0.3)', () => {
  it('nota de piloto fica dentro da escala 0-99 (§6)', () => {
    expect(pilotoFixture.notas.quali).toBeGreaterThanOrEqual(0);
    expect(pilotoFixture.notas.quali).toBeLessThanOrEqual(99);
  });

  it('peça simples tem exatamente 1 atributo alvo', () => {
    expect(pecaSimplesFixture.atributosAlvo.length).toBe(1);
    expect(pecaSimplesFixture.atributosAlvo).toEqual(['aero']);
  });

  it('peça dupla tem exatamente 2 atributos alvo e raridade proibida (§7)', () => {
    expect(pecaDuplaFixture.atributosAlvo.length).toBe(2);
    expect(pecaDuplaFixture.raridade).toBe('proibido');
  });

  it('pista de Mônaco tem ultrapassagem difícil (§9)', () => {
    expect(pistaFixture.ultrapassagem).toBe('dificil');
  });

  it('loadout referencia os ids das fixtures por string', () => {
    expect(loadoutFixture.pilotoId).toBe(pilotoFixture.id);
    expect(loadoutFixture.pecaId).toBe(pecaDuplaFixture.id);
  });

  it('resultado de corrida traz classificação e volta mais rápida do grid inteiro (§10)', () => {
    expect(resultadoCorridaFixture.classificacao).toHaveLength(2);
    expect(resultadoCorridaFixture.voltaMaisRapida.jogadorId).toBe('jogador-2');
  });
});
