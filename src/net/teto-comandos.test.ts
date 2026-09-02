import { describe, expect, it } from 'vitest';
import {
  JANELA_COMANDOS_MS,
  TETO_COMANDOS,
  avaliarTetoComandos,
} from './teto-comandos';

/**
 * S3 — o teto de comandos por conexão (PR H4).
 *
 * 🔒 Mesma fronteira dos três PRs anteriores: a decisão é PURA e recebe `agora`
 * por parâmetro (`Date.now` é proibido em `src/net/**`). É isso que torna a
 * JANELA testável aqui, e a janela é o que separa um LIMITE de um BANIMENTO.
 */
describe('teto de comandos inbound por conexão (S3)', () => {
  it('o primeiro comando de uma conexão nova sempre passa', () => {
    const r = avaliarTetoComandos(null, 1_000);
    expect(r.permitido).toBe(true);
    expect(r.balde).toEqual({ inicio: 1_000, contagem: 1 });
  });

  it('a rajada de conexão cabe FOLGADA — é o caso legítimo medido', () => {
    // Medido em 2026-09-02: o cliente real não tem polling (zero `setInterval`
    // em `useSalaOnline`). A maior rajada legítima é a de (re)conexão —
    // `reentrar` + a fila `pendentes` + os dois efeitos de `hash` —, da ordem
    // de 3 a 6 comandos em milissegundos. O teto tem que passá-la sem pensar.
    let balde = null as ReturnType<typeof avaliarTetoComandos>['balde'] | null;
    for (let i = 0; i < 6; i += 1) {
      const r = avaliarTetoComandos(balde, 1_000);
      expect(r.permitido, `comando ${i + 1} da rajada de conexão foi recusado`).toBe(true);
      balde = r.balde;
    }
  });

  it('passa exatamente TETO_COMANDOS e recusa o seguinte', () => {
    let balde = null as ReturnType<typeof avaliarTetoComandos>['balde'] | null;
    for (let i = 0; i < TETO_COMANDOS; i += 1) {
      const r = avaliarTetoComandos(balde, 1_000);
      expect(r.permitido, `comando ${i + 1} de ${TETO_COMANDOS} foi recusado`).toBe(true);
      balde = r.balde;
    }
    expect(avaliarTetoComandos(balde, 1_000).permitido).toBe(false);
  });

  it('🔴 É LIMITE, NÃO BANIMENTO — a janela expira e o comando seguinte passa', () => {
    const balde = { inicio: 1_000, contagem: TETO_COMANDOS + 5 };
    const aindaDentro = avaliarTetoComandos(balde, 1_000 + JANELA_COMANDOS_MS - 1);
    expect(aindaDentro.permitido).toBe(false);
    const jaFora = avaliarTetoComandos(balde, 1_000 + JANELA_COMANDOS_MS);
    expect(jaFora.permitido).toBe(true);
    expect(jaFora.balde).toEqual({ inicio: 1_000 + JANELA_COMANDOS_MS, contagem: 1 });
  });

  it('🔴 A RECUSA NÃO REINICIA A JANELA — senão o limite vira banimento', () => {
    // Um script batendo sem parar manteria o balde eternamente cheio se cada
    // recusa empurrasse `inicio` para a frente. `contagem` cresce; `inicio` não
    // se move. Mesma disciplina do H1 e do H3.
    let balde = { inicio: 1_000, contagem: TETO_COMANDOS };
    for (let i = 0; i < 50; i += 1) {
      const r = avaliarTetoComandos(balde, 1_000 + i);
      expect(r.permitido).toBe(false);
      expect(r.balde.inicio, 'a recusa moveu o início da janela').toBe(1_000);
      balde = r.balde;
    }
    // Passada a janela contada do início ORIGINAL, volta a atender.
    expect(avaliarTetoComandos(balde, 1_000 + JANELA_COMANDOS_MS).permitido).toBe(true);
  });

  it('o balde é devolvido SEMPRE, inclusive na recusa', () => {
    const r = avaliarTetoComandos({ inicio: 1_000, contagem: TETO_COMANDOS }, 1_010);
    expect(r.permitido).toBe(false);
    expect(r.balde.contagem).toBe(TETO_COMANDOS + 1);
  });

  it('os números são os ditados: 20 comandos por janela de 1 s', () => {
    expect(TETO_COMANDOS).toBe(20);
    expect(JANELA_COMANDOS_MS).toBe(1_000);
  });
});
