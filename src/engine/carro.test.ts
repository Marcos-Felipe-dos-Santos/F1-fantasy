import { describe, expect, it } from 'vitest';
import { criarDataset } from './dataset';
import equipeAnosReal from '../fixtures/dataset-semente/equipe-anos.json';
import pecasReal from '../fixtures/dataset-semente/pecas.json';
import pistasReal from '../fixtures/dataset-semente/pistas.json';
import type { Loadout } from './types';
import { resolverCarro } from './carro';

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Loadout base: Red Bull 2023 (Verstappen), peça sem efeito nos testes que não a mencionam. */
function loadoutBase(overrides: Partial<Loadout> = {}): Loadout {
  return {
    jogadorId: 'j1',
    pilotoId: 'redbull-2023-piloto-verstappen',
    chassiId: 'redbull-2023-chassi',
    motorId: 'redbull-2023-motor',
    estrategistaId: 'redbull-2023-estrategista',
    pitId: 'redbull-2023-pit',
    pecaId: 'peca-composto-macio', // alvo: pneu (piloto) — sem efeito em aero/mec/motor/quali.
    ...overrides,
  };
}

describe('resolverCarro', () => {
  it('resolve os ids corretos a partir do dataset', () => {
    const carro = resolverCarro(dataset, loadoutBase());
    expect(carro.jogadorId).toBe('j1');
    expect(carro.peca.id).toBe('peca-composto-macio');
    // Atributos não alvejados pela peça permanecem idênticos aos do dataset.
    const pilotoOriginal = dataset.pilotosById.get('redbull-2023-piloto-verstappen')!;
    expect(carro.piloto.rit).toBe(pilotoOriginal.notas.rit);
    expect(carro.piloto.quali).toBe(pilotoOriginal.notas.quali);
    const chassiOriginal = dataset.chassisById.get('redbull-2023-chassi')!;
    expect(carro.chassi.aero).toBe(chassiOriginal.notas.aero);
    expect(carro.chassi.mec).toBe(chassiOriginal.notas.mec);
    const motorOriginal = dataset.motoresById.get('redbull-2023-motor')!;
    expect(carro.motor.motor).toBe(motorOriginal.notas.motor);
    const estrategistaOriginal = dataset.estrategistasById.get('redbull-2023-estrategista')!;
    expect(carro.estrategista.call).toBe(estrategistaOriginal.notas.call);
    expect(carro.estrategista.sangf).toBe(estrategistaOriginal.notas.sangf);
    const pitOriginal = dataset.pitsById.get('redbull-2023-pit')!;
    expect(carro.pit.pitTempo).toBe(pitOriginal.notas.pitTempo);
    expect(carro.pit.pitErro).toBe(pitOriginal.notas.pitErro);
  });

  it('aplica o bônus de uma peça de 1 atributo de piloto (peca-composto-macio → pneu)', () => {
    const pilotoOriginal = dataset.pilotosById.get('redbull-2023-piloto-verstappen')!;
    const carro = resolverCarro(dataset, loadoutBase({ pecaId: 'peca-composto-macio' }));
    expect(carro.piloto.pneu).toBe(pilotoOriginal.notas.pneu + 4);
    // Demais notas de piloto intocadas.
    expect(carro.piloto.quali).toBe(pilotoOriginal.notas.quali);
    expect(carro.piloto.rit).toBe(pilotoOriginal.notas.rit);
  });

  it('aplica o bônus de uma peça de 1 atributo de chassi (peca-duplo-difusor-brawn → aero)', () => {
    const chassiOriginal = dataset.chassisById.get('redbull-2023-chassi')!;
    const carro = resolverCarro(dataset, loadoutBase({ pecaId: 'peca-duplo-difusor-brawn' }));
    expect(carro.chassi.aero).toBe(chassiOriginal.notas.aero + 7);
    expect(carro.chassi.mec).toBe(chassiOriginal.notas.mec);
  });

  it('aplica o bônus de uma peça de 1 atributo de motor (peca-mapa-motor → motor)', () => {
    const motorOriginal = dataset.motoresById.get('redbull-2023-motor')!;
    const carro = resolverCarro(dataset, loadoutBase({ pecaId: 'peca-mapa-motor' }));
    expect(carro.motor.motor).toBe(motorOriginal.notas.motor + 4);
    expect(carro.motor.confMotor).toBe(motorOriginal.notas.confMotor);
  });

  it('aplica o bônus de uma peça de 2 atributos (peca-das-mercedes → quali + pneu), sem clamp em 99', () => {
    const pilotoOriginal = dataset.pilotosById.get('redbull-2023-piloto-verstappen')!;
    const carro = resolverCarro(dataset, loadoutBase({ pecaId: 'peca-das-mercedes' }));
    expect(carro.piloto.quali).toBe(pilotoOriginal.notas.quali + 11);
    expect(carro.piloto.pneu).toBe(pilotoOriginal.notas.pneu + 11);
    // Verstappen já tem quali 95; +11 estoura 99 de propósito (nota efetiva, não clampada).
    expect(carro.piloto.quali).toBeGreaterThan(99);
  });

  it('id inexistente lança erro descritivo contendo o id', () => {
    expect(() =>
      resolverCarro(dataset, loadoutBase({ pilotoId: 'piloto-fantasma' })),
    ).toThrow(/piloto-fantasma/);
    expect(() =>
      resolverCarro(dataset, loadoutBase({ chassiId: 'chassi-fantasma' })),
    ).toThrow(/chassi-fantasma/);
    expect(() =>
      resolverCarro(dataset, loadoutBase({ motorId: 'motor-fantasma' })),
    ).toThrow(/motor-fantasma/);
    expect(() =>
      resolverCarro(dataset, loadoutBase({ estrategistaId: 'estrategista-fantasma' })),
    ).toThrow(/estrategista-fantasma/);
    expect(() => resolverCarro(dataset, loadoutBase({ pitId: 'pit-fantasma' }))).toThrow(
      /pit-fantasma/,
    );
    expect(() => resolverCarro(dataset, loadoutBase({ pecaId: 'peca-fantasma' }))).toThrow(
      /peca-fantasma/,
    );
  });

  it('não muta as notas do dataset', () => {
    const snapshotAntes = JSON.stringify(dataset.pilotosById.get('redbull-2023-piloto-verstappen'));
    resolverCarro(dataset, loadoutBase({ pecaId: 'peca-das-mercedes' }));
    const snapshotDepois = JSON.stringify(
      dataset.pilotosById.get('redbull-2023-piloto-verstappen'),
    );
    expect(snapshotDepois).toBe(snapshotAntes);
  });
});
