import { describe, expect, it } from 'vitest';
import type {
  Chassi,
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

// Fixtures seguem a partida-exemplo do §3 (GDD v1.1): 5 sorteios de
// equipe/ano, um componente pego em cada — chassi Red Bull 2023, piloto
// Ferrari 2004, motor Toleman 1984, estrategista McLaren 1998, pit
// Williams 1993. Cinco componentes, cinco eras.
export const pilotoFixture: Piloto = {
  id: 'piloto-ferrari-2004-1',
  nome: 'Piloto Ferrari 2004',
  equipe: 'Ferrari',
  ano: 2004,
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

export const chassiFixture: Chassi = {
  id: 'chassi-redbull-rb19-2023',
  equipe: 'Red Bull',
  ano: 2023,
  notas: {
    aero: 92,
    mec: 74,
    ppeso: 75,
    conf: 68,
    freio: 71,
  },
};

export const motorFixture: Motor = {
  id: 'motor-toleman-hart-1984',
  equipe: 'Toleman',
  ano: 1984,
  notas: {
    motor: 78,
    confMotor: 55,
  },
};

export const estrategistaFixture: Estrategista = {
  id: 'estrategista-mclaren-1998',
  nome: 'Estrategista McLaren 1998',
  equipe: 'McLaren',
  ano: 1998,
  notas: {
    call: 88,
    sangf: 85,
  },
};

export const equipePitFixture: EquipePit = {
  id: 'pit-williams-1993',
  equipe: 'Williams',
  ano: 1993,
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
  tempoBaseMs: 78000,
  desgaste: 25,
};

export const loadoutFixture: Loadout = {
  jogadorId: 'jogador-1',
  pilotoId: pilotoFixture.id,
  chassiId: chassiFixture.id,
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
    expect(loadoutFixture.chassiId).toBe(chassiFixture.id);
    expect(loadoutFixture.pecaId).toBe(pecaDuplaFixture.id);
  });

  it('os 5 sorteios de equipe/ano permitem 5 eras distintas no mesmo loadout (§3)', () => {
    const componentes = [
      pilotoFixture,
      chassiFixture,
      motorFixture,
      estrategistaFixture,
      equipePitFixture,
    ];
    expect(loadoutFixture.pilotoId).toBe(pilotoFixture.id);
    expect(loadoutFixture.chassiId).toBe(chassiFixture.id);
    expect(loadoutFixture.motorId).toBe(motorFixture.id);
    expect(loadoutFixture.estrategistaId).toBe(estrategistaFixture.id);
    expect(loadoutFixture.pitId).toBe(equipePitFixture.id);
    expect(new Set(componentes.map((c) => c.ano)).size).toBe(5);
    expect(new Set(componentes.map((c) => c.equipe)).size).toBe(5);
  });

  it('resultado de corrida traz classificação e volta mais rápida do grid inteiro (§10)', () => {
    expect(resultadoCorridaFixture.classificacao).toHaveLength(2);
    expect(resultadoCorridaFixture.voltaMaisRapida.jogadorId).toBe('jogador-2');
  });
});
