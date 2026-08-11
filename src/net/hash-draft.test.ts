/**
 * PR 3.4 — a impressão digital do draft.
 *
 * O que estes testes protegem é a UTILIDADE do detector, e ela tem dois lados
 * que se contradizem se um for esquecido:
 * - **sensível** ao que importa (o pool de peças) — senão o detector nunca
 *   alarma e é decoração;
 * - **insensível** ao que diverge de propósito (ordem de chave,
 *   `pecasReveladas`) — senão alarma sempre, o dev desliga, e voltamos à
 *   divergência silenciosa. Um detector que alarma sempre é PIOR que nenhum.
 */

import { describe, expect, it } from 'vitest';
import { hashDoDraft } from './hash-draft';
import type { DraftState, Loadout, ProgressoJogador } from '../engine/types';

function loadout(jogadorId: string, pecaId: string): Loadout {
  return {
    jogadorId,
    pilotoId: 'p1',
    chassiId: 'c1',
    motorId: 'm1',
    estrategistaId: 'e1',
    pitId: 'pit1',
    pecaId,
  };
}

const progresso: ProgressoJogador = { rodada: 6, slots: { pilotoId: 'p1' } };

function draftBase(): DraftState {
  return {
    seed: 2026,
    fase: 'peca',
    jogadores: [
      { id: 'humano-01', tipo: 'humano' },
      { id: 'humano-02', tipo: 'humano' },
    ],
    sorteios: {},
    progresso: { 'humano-01': progresso, 'humano-02': progresso },
    ordemPeca: ['humano-01', 'humano-02'],
    indicePeca: 1,
    pecasReveladas: null,
    copiasRestantes: { 'peca-a': 2, 'peca-b': 1 },
    loadouts: { 'humano-01': loadout('humano-01', 'peca-a') },
  };
}

describe('é ESTÁVEL onde os clientes legitimamente diferem', () => {
  it('a ordem de inserção das chaves não muda o hash', () => {
    // 🔒 O caso que motivou a serialização canônica. Clientes montam os mapas
    // na ordem em que o log chega, que não é a mesma em todos. Sem isto,
    // estados IDÊNTICOS alarmariam.
    const a = draftBase();

    const b = draftBase();
    b.copiasRestantes = { 'peca-b': 1, 'peca-a': 2 };
    b.progresso = { 'humano-02': progresso, 'humano-01': progresso };

    expect(Object.keys(a.copiasRestantes)).not.toEqual(Object.keys(b.copiasRestantes));
    expect(hashDoDraft(a)).toBe(hashDoDraft(b));
  });

  it('`pecasReveladas` NÃO entra — é `null` fora do turno, por projeto', () => {
    const a = draftBase();
    const b = draftBase();
    b.pecasReveladas = ['peca-a', 'peca-b'];
    expect(hashDoDraft(a)).toBe(hashDoDraft(b));
  });

  it('é determinístico entre chamadas', () => {
    expect(hashDoDraft(draftBase())).toBe(hashDoDraft(draftBase()));
  });
});

describe('é SENSÍVEL ao que não pode divergir', () => {
  it('🔴 uma cópia a menos no pool muda o hash — é o alvo do PR', () => {
    const a = draftBase();
    const b = draftBase();
    b.copiasRestantes = { ...b.copiasRestantes, 'peca-a': 1 };
    expect(hashDoDraft(a)).not.toBe(hashDoDraft(b));
  });

  it('uma peça diferente no loadout muda o hash', () => {
    const a = draftBase();
    const b = draftBase();
    b.loadouts = { 'humano-01': loadout('humano-01', 'peca-b') };
    expect(hashDoDraft(a)).not.toBe(hashDoDraft(b));
  });

  it('🔴 `sorteios` diferente muda o hash — pega dataset divergente no 1º atestado', () => {
    // Entrou na revisão: o cliente só atesta quando `eventosAplicados` avança,
    // então divergência já presente NA CRIAÇÃO do draft (dataset diferente)
    // não apareceria até o primeiro evento sem este campo.
    const a = draftBase();
    const b = draftBase();
    b.sorteios = { 'humano-01': [{ equipe: 'Ferrari', ano: 2004 }] };
    expect(hashDoDraft(a)).not.toBe(hashDoDraft(b));
  });

  it('fase, ordem de peça, índice e progresso mudam o hash', () => {
    const variacoes: ((d: DraftState) => void)[] = [
      (d) => (d.fase = 'concluido'),
      (d) => (d.ordemPeca = ['humano-02', 'humano-01']),
      (d) => (d.indicePeca = 0),
      (d) => (d.progresso = { ...d.progresso, 'humano-01': { rodada: 5, slots: {} } }),
      (d) => (d.sorteios = { 'humano-02': [{ equipe: 'McLaren', ano: 1988 }] }),
    ];
    const base = hashDoDraft(draftBase());
    for (const [i, aplicar] of variacoes.entries()) {
      const d = draftBase();
      aplicar(d);
      expect(hashDoDraft(d), `variação ${i}`).not.toBe(base);
    }
  });

  /**
   * 🔒 ANTI-VACUIDADE. Sem isto, um `hashDoDraft` que devolvesse uma constante
   * passaria em tudo que é "estável" acima e só falharia nos "sensível" — e se
   * alguém quebrasse a sensibilidade, a estabilidade continuaria verde e o
   * detector viraria decoração silenciosa.
   */
  it('não é constante: estados diferentes dão hashes diferentes', () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 12; i += 1) {
      const d = draftBase();
      d.copiasRestantes = { 'peca-a': i, 'peca-b': 1 };
      hashes.add(hashDoDraft(d));
    }
    expect(hashes.size).toBe(12);
  });

  it('tem a largura anunciada (64 bits em hex) — colisão acidental não é o risco', () => {
    expect(hashDoDraft(draftBase())).toMatch(/^[0-9a-f]{16}$/);
  });
});
