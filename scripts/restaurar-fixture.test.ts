import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { anonimizar, type TabelaDeNomes } from './anonimizar.ts';
import type { UniversoDeNomes } from './anonimizar-fixture.ts';
import { restaurarFixture } from './restaurar-fixture.ts';
import {
  EQUIPE_ANOS_DERIVADO,
  FATOS_AGREGADOS,
  FIXTURE_EQUIPE_ANOS,
  PUBLICADO_EQUIPE_ANOS,
  TABELA_NOMES,
} from './caminhos-dataset.ts';
import type { EquipeAnoDerivado } from './derivar-notas.ts';

const ler = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const tabela = ler(TABELA_NOMES) as TabelaDeNomes;
const universo = ler(FATOS_AGREGADOS) as UniversoDeNomes;
const derivado = ler(EQUIPE_ANOS_DERIVADO) as EquipeAnoDerivado[];

describe('restauração reversa da fixture', () => {
  const reais = derivado.filter((r) => r.equipe === 'McLaren' && r.ano === 1988);
  it('restaura nomes e ids sem alterar notas, anos ou ordem do par', () => {
    expect(reais).toHaveLength(1);
    const anonimos = anonimizar(reais, tabela);
    const restaurados = restaurarFixture(anonimos, tabela, universo);
    expect(restaurados).toEqual(reais);
    expect(restaurados[0].pilotos[0].notas).toBe(anonimos[0].pilotos[0].notas);
    expect(restaurados[0].chassi.notas).toBe(anonimos[0].chassi.notas);
  });
  it('recusa código reverso ambíguo', () => {
    const adulterada = { ...tabela, equipes: { ...tabela.equipes, outra: tabela.equipes.mclaren } };
    expect(() => restaurarFixture(anonimizar(reais, tabela), adulterada, universo)).toThrow(
      /ambíguo/,
    );
  });
  it('recusa piloto desconhecido e segunda aplicação', () => {
    const anonimos = anonimizar(reais, tabela);
    anonimos[0].pilotos[0].id += '-inexistente';
    expect(() => restaurarFixture(anonimos, tabela, universo)).toThrow(/Piloto fora do mapa/);
    expect(() => restaurarFixture(reais, tabela, universo)).toThrow(/Equipe fora do mapa/);
  });
});

it.each([
  [PUBLICADO_EQUIPE_ANOS, 771, '8eab5ec0237b7e573a10b0cf711e674a2fb3934a635ce6bc90e048a782cdc8eb'],
  [FIXTURE_EQUIPE_ANOS, 22, '0bcdfd149b09b390cb7eda2c3f73a60e56117ad3e360fb3f538a27e59b1b5260'],
] as const)('preserva a assinatura de notas, anos e ordem: %s', (arquivo, tamanho, hash) => {
  const registros = ler(arquivo) as EquipeAnoDerivado[];
  expect(registros).toHaveLength(tamanho);
  const valores = registros.map((r) => ({
    ano: r.ano,
    pilotos: r.pilotos.map((p) => p.notas),
    chassi: r.chassi.notas,
    motor: r.motor.notas,
    estrategista: r.estrategista.notas,
    pit: r.pit.notas,
  }));
  expect(createHash('sha256').update(JSON.stringify(valores)).digest('hex')).toBe(hash);
});
