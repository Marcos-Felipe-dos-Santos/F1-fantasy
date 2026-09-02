/**
 * A JANELA do teto de `sincronizar` (PR H3, item S7).
 *
 * 🔑 **Roda em `npm test`, sem `workerd` e sem relógio falso** — é para isso que
 * `avaliarTetoSincronizar` recebe `agora` por parâmetro. O baseline de `party/`
 * prova que a casca CONSULTA o teto; estes casos provam que o teto é um LIMITE
 * e não um BANIMENTO, que é a parte que a suíte da casca não alcança.
 */
import { describe, expect, it } from 'vitest';

import {
  avaliarTetoSincronizar,
  JANELA_SINCRONIZAR_MS,
  TETO_SINCRONIZAR,
} from './teto-sincronizar';

const T0 = 1_700_000_000_000;

describe('avaliarTetoSincronizar', () => {
  it('o PRIMEIRO passa sempre — rajada 1', () => {
    const r = avaliarTetoSincronizar(null, T0);
    expect(r.permitido).toBe(true);
    expect(r.balde).toEqual({ inicio: T0, contagem: 1 });
  });

  it('o SEGUNDO dentro da janela é recusado', () => {
    const primeiro = avaliarTetoSincronizar(null, T0);
    expect(avaliarTetoSincronizar(primeiro.balde, T0 + 1).permitido).toBe(false);
  });

  it('🔒 é LIMITE, não BANIMENTO: passada a janela, volta a passar', () => {
    let balde = avaliarTetoSincronizar(null, T0).balde;
    // Martela DENTRO da janela — é o cenário que transformaria limite em
    // banimento se a recusa reiniciasse o relógio.
    for (let i = 1; i < 20; i += 1) {
      const r = avaliarTetoSincronizar(balde, T0 + i);
      expect(r.permitido).toBe(false);
      balde = r.balde;
    }
    const depois = avaliarTetoSincronizar(balde, T0 + JANELA_SINCRONIZAR_MS);
    expect(depois.permitido).toBe(true);
    expect(depois.balde.inicio).toBe(T0 + JANELA_SINCRONIZAR_MS);
  });

  it('🔒 a RECUSA não estende a janela — `inicio` não se move', () => {
    const primeiro = avaliarTetoSincronizar(null, T0);
    const recusado = avaliarTetoSincronizar(primeiro.balde, T0 + 500);
    expect(recusado.permitido).toBe(false);
    expect(recusado.balde.inicio).toBe(T0);
  });

  it('a fronteira da janela é INCLUSIVA (`>=`), medida e não suposta', () => {
    const primeiro = avaliarTetoSincronizar(null, T0);
    expect(avaliarTetoSincronizar(primeiro.balde, T0 + JANELA_SINCRONIZAR_MS - 1).permitido).toBe(
      false,
    );
    expect(avaliarTetoSincronizar(primeiro.balde, T0 + JANELA_SINCRONIZAR_MS).permitido).toBe(true);
  });

  it('ANTI-VACUIDADE: o teto é 1 e a janela 2 s — se mudarem, estes casos mentem', () => {
    expect(TETO_SINCRONIZAR).toBe(1);
    expect(JANELA_SINCRONIZAR_MS).toBe(2_000);
  });
});
