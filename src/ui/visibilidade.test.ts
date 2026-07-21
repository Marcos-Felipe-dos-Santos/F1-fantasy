/**
 * Testes de `visibilidade.ts` (PR 2.3, GDD §5): no modo Cego, a view de uma
 * peça não pode conter nenhuma dica de raridade/força (raridade, bônus,
 * risco, atributos-alvo, categoria) — só o nome. No modo Craque, a view
 * mantém todos os campos originais. Cobre uma peça ☠️ proibida e uma 🟢
 * comum do dataset real pra garantir que a escala toda esconde igual.
 */

import { describe, expect, it } from 'vitest';
import type { Peca } from '../engine/types';
import { dataset } from './dataset-app';
import { mostrarNotas, pecaVisivel } from './visibilidade';

const pecaProibida = dataset.pecasById.get('peca-suspensao-ativa-fw15');
const pecaComum = dataset.pecasById.get('peca-asa-flexivel');

if (!pecaProibida || !pecaComum) {
  throw new Error('visibilidade.test: peças de fixture não encontradas no dataset');
}

describe('pecaVisivel', () => {
  it('modo craque: devolve todos os campos da peça, sem alterar nada', () => {
    for (const peca of [pecaProibida, pecaComum]) {
      const view = pecaVisivel(peca, 'craque');
      expect(view).toEqual(peca);
    }
  });

  it('modo cego: peça proibida ☠️ — só o nome sobra, nenhuma dica de raridade/força', () => {
    const view = pecaVisivel(pecaProibida, 'cego');
    expect(view).toEqual({ nome: pecaProibida.nome });
    expect(view.raridade).toBeUndefined();
    expect(view.bonus).toBeUndefined();
    expect(view.risco).toBeUndefined();
    expect(view.atributosAlvo).toBeUndefined();
    expect(view.categoria).toBeUndefined();
    expect('raridade' in view).toBe(false);
    expect('bonus' in view).toBe(false);
    expect('risco' in view).toBe(false);
    expect('atributosAlvo' in view).toBe(false);
    expect('categoria' in view).toBe(false);
  });

  it('modo cego: peça comum 🟢 — mesma regra (não denuncia que é fraca nem forte)', () => {
    const view = pecaVisivel(pecaComum, 'cego');
    expect(view).toEqual({ nome: pecaComum.nome });
    expect('raridade' in view).toBe(false);
    expect('bonus' in view).toBe(false);
    expect('risco' in view).toBe(false);
    expect('atributosAlvo' in view).toBe(false);
    expect('categoria' in view).toBe(false);
  });

  it('modo cego não muta a peça original (função pura)', () => {
    const original: Peca = { ...pecaProibida };
    pecaVisivel(pecaProibida, 'cego');
    expect(pecaProibida).toEqual(original);
  });
});

describe('mostrarNotas', () => {
  it('craque: notas visíveis', () => {
    expect(mostrarNotas('craque')).toBe(true);
  });

  it('cego: notas escondidas', () => {
    expect(mostrarNotas('cego')).toBe(false);
  });
});
