/**
 * Testes de `nomeJogador` (PR 2.1a, correção A3 da revisão): fallback pra
 * "Você"/id quando `nome` é `undefined`, `''` ou só espaços — sem DOM, função
 * pura.
 */

import { describe, expect, it } from 'vitest';
import type { Dataset } from '../engine/dataset';
import type { Jogador, Loadout } from '../engine/types';
import { nomeJogador, rotulosDosPilotos } from './loadout-view';

describe('nomeJogador', () => {
  it('usa o nome informado (aparado) quando não vazio', () => {
    const jogador: Jogador = { id: 'humano-1', tipo: 'humano', nome: '  Ana  ' };
    expect(nomeJogador(jogador)).toBe('Ana');
  });

  it('humano sem nome (undefined) cai em "Você"', () => {
    const jogador: Jogador = { id: 'voce', tipo: 'humano' };
    expect(nomeJogador(jogador)).toBe('Você');
  });

  it('humano com nome "" cai em "Você"', () => {
    const jogador: Jogador = { id: 'voce', tipo: 'humano', nome: '' };
    expect(nomeJogador(jogador)).toBe('Você');
  });

  it('humano com nome só de espaços ("  ") cai em "Você"', () => {
    const jogador: Jogador = { id: 'voce', tipo: 'humano', nome: '   ' };
    expect(nomeJogador(jogador)).toBe('Você');
  });

  it('bot sem nome cai no próprio id', () => {
    const jogador: Jogador = { id: 'bot-01', tipo: 'bot', perfilBot: 'passeio' };
    expect(nomeJogador(jogador)).toBe('bot-01');
  });

  it('bot com nome "" cai no próprio id', () => {
    const jogador: Jogador = { id: 'bot-01', tipo: 'bot', perfilBot: 'passeio', nome: '' };
    expect(nomeJogador(jogador)).toBe('bot-01');
  });
});

describe('rotulosDosPilotos (PR 2d)', () => {
  const pilotos = {
    senna88: { nome: 'Ayrton Senna', ano: 1988 },
    senna90: { nome: 'Ayrton Senna', ano: 1990 },
    prost: { nome: 'Alain Prost', ano: 1988 },
  } as const;
  const dataset = { pilotosById: new Map(Object.entries(pilotos)) } as unknown as Pick<Dataset, 'pilotosById'>;
  const grid = (mapa: Record<string, string>) =>
    Object.fromEntries(Object.entries(mapa).map(([id, pilotoId]) => [id, { jogadorId: id, pilotoId } as Loadout]));

  it('nome único fica sem ano; nome repetido ganha o ano', () => {
    const r = rotulosDosPilotos(grid({ a: 'senna88', b: 'senna90', c: 'prost' }), dataset);
    expect(r.get('a')).toBe('Ayrton Senna 1988');
    expect(r.get('b')).toBe('Ayrton Senna 1990');
    expect(r.get('c')).toBe('Alain Prost');
  });

  it('a mesma temporada em dois carros: o segundo leva o número, pela ordem do id', () => {
    const r = rotulosDosPilotos(grid({ b: 'senna88', a: 'senna88', c: 'senna88' }), dataset);
    expect(r.get('a')).toBe('Ayrton Senna 1988');
    expect(r.get('b')).toBe('Ayrton Senna 1988 (2)');
    expect(r.get('c')).toBe('Ayrton Senna 1988 (3)');
  });

  it('piloto fora do dataset não derruba a tela', () => {
    expect(rotulosDosPilotos(grid({ a: 'nenhum' }), dataset).get('a')).toBe('?');
  });
});
