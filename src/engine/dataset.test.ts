import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';

/**
 * Fixtures mínimas válidas, usadas como base pra mutação nos testes de
 * rejeição. Clonar com JSON.parse(JSON.stringify(...)) evita que uma
 * mutação em um teste vaze pros outros.
 */
function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function pilotoValido(id: string) {
  return {
    id,
    nome: 'Piloto Teste',
    notas: {
      rit: 70,
      quali: 70,
      cons: 70,
      ult: 70,
      def: 70,
      chu: 70,
      pneu: 70,
      larg: 70,
      sf: 70,
    },
  };
}

function equipeAnoValida() {
  return {
    equipe: 'Equipe Teste',
    ano: 2000,
    pilotos: [pilotoValido('piloto-teste-1'), pilotoValido('piloto-teste-2')],
    chassi: {
      id: 'chassi-teste',
      notas: { aero: 70, mec: 70, ppeso: 70, conf: 70, freio: 70 },
    },
    motor: {
      id: 'motor-teste',
      notas: { motor: 70, confMotor: 70 },
    },
    estrategista: {
      id: 'estrategista-teste',
      nome: 'Estrategista Teste',
      notas: { call: 70, sangf: 70 },
    },
    pit: {
      id: 'pit-teste',
      notas: { pitTempo: 70, pitErro: 70 },
    },
  };
}

function pecaValida() {
  return {
    id: 'peca-teste',
    nome: 'Peça Teste',
    categoria: 'Teste',
    raridade: 'comum',
    atributosAlvo: ['aero'],
    bonus: 4,
    risco: 0,
  };
}

function pistaValida() {
  return {
    id: 'pista-teste',
    nome: 'Pista Teste',
    pesos: { aero: 0.4, mec: 0.3, motor: 0.3 },
    ultrapassagem: 'media',
    chanceChuva: 0.2,
    voltas: 12,
    tempoBaseMs: 80000,
    desgaste: 50,
  };
}

describe('dataset real (PR 1.1)', () => {
  it('carrega os 3 JSONs sem lançar erro', () => {
    expect(() => criarDataset(equipeAnosReal, pecasReal, pistasReal)).not.toThrow();
  });

  it('tem entre 20 e 24 equipe/anos, cobrindo os 4 anos icônicos', () => {
    const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
    expect(dataset.equipeAnos.length).toBeGreaterThanOrEqual(20);
    expect(dataset.equipeAnos.length).toBeLessThanOrEqual(24);
    const anos = new Set(dataset.equipeAnos.map((ea) => ea.ano));
    expect(anos).toEqual(new Set([2023, 2004, 1998, 1993]));
  });

  it('tem exatamente 10 pistas e catálogo completo de peças (~20)', () => {
    const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
    expect(dataset.pistas).toHaveLength(10);
    expect(dataset.pecas.length).toBeGreaterThanOrEqual(18);
  });

  it('índices por id resolvem registros conhecidos', () => {
    const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);
    expect(dataset.pistasById.get('pista-monaco')?.nome).toBe('Mônaco');
    expect(dataset.chassisById.get('ferrari-2004-chassi')?.equipe).toBe('Ferrari');
    expect(dataset.pilotosById.get('ferrari-2004-piloto-schumacher')?.nome).toBe(
      'Michael Schumacher',
    );
    expect(dataset.pecasById.get('peca-bargeboards')?.atributosAlvo).toEqual(['aero']);
  });
});

describe('validação de fixtures inválidas', () => {
  it('rejeita nota acima da escala (120), com mensagem descritiva do registro e campo', () => {
    const ea = equipeAnoValida();
    ea.pilotos[0].notas.rit = 120;
    expect(() => criarDataset([ea], [pecaValida()], [pistaValida()])).toThrow(
      /equipeAnos\[0\].*pilotos\[0\].*"rit".*0-99/s,
    );
  });

  it('rejeita nota abaixo da escala (-1)', () => {
    const ea = equipeAnoValida();
    ea.pilotos[0].notas.cons = -1;
    expect(() => criarDataset([ea], [pecaValida()], [pistaValida()])).toThrow(/0-99/);
  });

  it('rejeita equipe/ano com apenas 1 piloto', () => {
    const ea = equipeAnoValida();
    ea.pilotos = [pilotoValido('piloto-unico')];
    expect(() => criarDataset([ea], [pecaValida()], [pistaValida()])).toThrow(/2 pilotos/);
  });

  it('rejeita id duplicado', () => {
    const ea = equipeAnoValida();
    ea.chassi.id = ea.pilotos[0].id;
    expect(() => criarDataset([ea], [pecaValida()], [pistaValida()])).toThrow(/duplicado/);
  });

  it('rejeita atributosAlvo vazio', () => {
    const peca = pecaValida();
    peca.atributosAlvo = [];
    expect(() => criarDataset([equipeAnoValida()], [peca], [pistaValida()])).toThrow(/vazio/);
  });

  it('rejeita atributoAlvo inexistente ("turbo")', () => {
    const peca = pecaValida();
    peca.atributosAlvo = ['turbo'];
    expect(() => criarDataset([equipeAnoValida()], [peca], [pistaValida()])).toThrow(/inválido/);
  });

  it('rejeita chanceChuva fora de [0,1] (1.5)', () => {
    const pista = pistaValida();
    pista.chanceChuva = 1.5;
    expect(() => criarDataset([equipeAnoValida()], [pecaValida()], [pista])).toThrow(/\[0,1\]/);
  });

  it('rejeita voltas fora de 10-15 (20)', () => {
    const pista = pistaValida();
    pista.voltas = 20;
    expect(() => criarDataset([equipeAnoValida()], [pecaValida()], [pista])).toThrow(/10 e 15/);
  });

  it('rejeita pesos de pista cuja soma difere de 1.0', () => {
    const pista = pistaValida();
    pista.pesos = { aero: 0.5, mec: 0.3, motor: 0.3 };
    expect(() => criarDataset([equipeAnoValida()], [pecaValida()], [pista])).toThrow(
      /somar 1\.0/,
    );
  });

  it('rejeita equipe+ano duplicado', () => {
    const ea1 = equipeAnoValida();
    const ea2 = clone(equipeAnoValida());
    // ids de componentes precisam ser diferentes pra não confundir com o teste de id duplicado.
    ea2.pilotos[0].id = 'piloto-teste-3';
    ea2.pilotos[1].id = 'piloto-teste-4';
    ea2.chassi.id = 'chassi-teste-2';
    ea2.motor.id = 'motor-teste-2';
    ea2.estrategista.id = 'estrategista-teste-2';
    ea2.pit.id = 'pit-teste-2';
    expect(() => criarDataset([ea1, ea2], [pecaValida()], [pistaValida()])).toThrow(
      /equipe\+ano duplicado/,
    );
  });
});
