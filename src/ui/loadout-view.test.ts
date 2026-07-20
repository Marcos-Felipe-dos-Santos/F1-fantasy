/**
 * Testes de `nomeJogador` (PR 2.1a, correção A3 da revisão): fallback pra
 * "Você"/id quando `nome` é `undefined`, `''` ou só espaços — sem DOM, função
 * pura.
 */

import { describe, expect, it } from 'vitest';
import type { Jogador } from '../engine/types';
import { nomeJogador } from './loadout-view';

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
