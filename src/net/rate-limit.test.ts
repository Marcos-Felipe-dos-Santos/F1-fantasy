/**
 * A JANELA do teto — o que o baseline de `party/` NÃO podia provar (PR H1).
 *
 * 🔴 **É este arquivo que separa um LIMITE de um BANIMENTO.** O baseline em
 * `party/rate-limit.test.ts` assere só "N+1 ⇒ 429", e um limitador de "5 salas
 * por IP, para sempre" passaria nele inteiro — o pior desfecho num jogo casual
 * (um NAT doméstico, cinco salas, acabou). A expiração se prova aqui.
 *
 * 🔑 **Só é testável porque `agora` é PARÂMETRO.** Sem relógio falso, sem
 * `workerd`, sem esperar 10 segundos. É o retorno concreto de a decisão morar
 * em `src/net/` — que, por sua vez, é o que a cerca de lint obriga.
 */
import { describe, expect, it } from 'vitest';

import { avaliarTeto, JANELA_TETO_MS, TETO_CRIAR_SALA, type BaldeDeTeto } from './rate-limit';

/** Gasta o teto inteiro a partir de `t0` e devolve o balde cheio. */
function encherOBalde(t0: number): BaldeDeTeto {
  let balde: BaldeDeTeto | null = null;
  for (let i = 0; i < TETO_CRIAR_SALA; i += 1) {
    const v = avaliarTeto(balde, t0);
    expect(v.permitido, `a ${i + 1}ª devia passar`).toBe(true);
    balde = v.balde;
  }
  return balde as BaldeDeTeto;
}

describe('avaliarTeto — dentro da janela', () => {
  it(`as primeiras ${TETO_CRIAR_SALA} passam e a seguinte é recusada`, () => {
    const cheio = encherOBalde(1_000);
    expect(avaliarTeto(cheio, 1_000).permitido).toBe(false);
  });

  it('o balde começa vazio: a primeira de todas passa', () => {
    expect(avaliarTeto(null, 0).permitido).toBe(true);
    expect(avaliarTeto(null, 0).balde).toEqual({ inicio: 0, contagem: 1 });
  });

  it('recusa ainda no último instante DENTRO da janela', () => {
    const cheio = encherOBalde(1_000);
    // Fronteira: 1 ms antes de expirar ainda está dentro.
    expect(avaliarTeto(cheio, 1_000 + JANELA_TETO_MS - 1).permitido).toBe(false);
  });
});

describe('🔴 avaliarTeto — A JANELA EXPIRA (é limite, não banimento)', () => {
  it('passada a janela, o MESMO balde volta a permitir', () => {
    const cheio = encherOBalde(1_000);
    const depois = avaliarTeto(cheio, 1_000 + JANELA_TETO_MS);
    expect(depois.permitido).toBe(true);
    // E o balde REINICIA — senão a próxima já viria recusada.
    expect(depois.balde).toEqual({ inicio: 1_000 + JANELA_TETO_MS, contagem: 1 });
  });

  it('🔒 a RECUSA não estende a janela — quem bate no teto não é punido a mais', () => {
    const t0 = 1_000;
    let balde = encherOBalde(t0);
    // Um script insistindo durante a janela inteira, a cada milissegundo.
    for (let t = t0; t < t0 + JANELA_TETO_MS; t += 1_000) {
      const v = avaliarTeto(balde, t);
      expect(v.permitido, `t=${t} devia recusar`).toBe(false);
      balde = v.balde;
    }
    // Se `inicio` tivesse sido reiniciado por alguma recusa, esta viria false —
    // e o limite teria virado o banimento que o projeto decidiu não ter.
    expect(avaliarTeto(balde, t0 + JANELA_TETO_MS).permitido).toBe(true);
  });

  it('a janela é FIXA, não deslizante — e o preço está medido', () => {
    // Documenta a rajada de fronteira que a janela fixa aceita: gastar tudo no
    // fim de uma janela e tudo no início da seguinte dá 2× o teto em pouco
    // tempo. Está aqui para ser uma escolha registrada, não uma surpresa.
    const t0 = 0;
    const cheio = encherOBalde(t0 + JANELA_TETO_MS - 1);
    expect(avaliarTeto(cheio, t0 + JANELA_TETO_MS - 1).permitido).toBe(false);
    const novaJanela = encherOBalde(t0 + JANELA_TETO_MS);
    expect(novaJanela.contagem).toBe(TETO_CRIAR_SALA);
  });
});
