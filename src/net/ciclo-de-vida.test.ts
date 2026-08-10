/**
 * PR 3.3.2 — ciclo de vida da sala: janela de graça e reset.
 *
 * O que isto resolve, e por que valia um PR: o log append-only **crescia para
 * sempre** (metade do problema C2 do 3.2 — a outra metade, a escolha ilegal, já
 * foi), e uma sala com draft de dias atrás ficava de pé sem ninguém. Agora há
 * ponto de descarte definido.
 *
 * O relógio é INJETADO, como em todo o resto de `src/net/` — nada aqui lê
 * `Date.now`, e é por isso que dá pra testar a janela sem esperar 10 minutos.
 */

import { describe, expect, it } from 'vitest';
import { criarServidor, decidirVida, marcarConclusao, type EstadoServidor } from './servidor-sala';
import { JANELA_DE_GRACA_MS } from './tipos';

const T0 = 1_000_000;
const criar = (): EstadoServidor => criarServidor('A3F9C2', 2026, 'dificil');

/** Estado com a partida terminada em `T0`. */
function concluida(): EstadoServidor {
  const base = criar();
  const comDraft: EstadoServidor = {
    ...base,
    sala: {
      ...base.sala,
      fase: 'iniciada',
      draft: {
        versao: 1,
        jogadorIds: [],
        humanos: [],
        fase: 'concluido',
        rodada: {},
        ordemPeca: [],
        indicePeca: 0,
        ausentes: [],
        log: [],
        iniciadoEm: {},
      },
    },
  };
  return marcarConclusao(comDraft, T0);
}

describe('marcarConclusao', () => {
  it('marca quando a partida termina, e só então', () => {
    expect(criar().sala.concluidaEm).toBeNull();
    expect(marcarConclusao(criar(), T0).sala.concluidaEm, 'marcou sem draft concluído').toBeNull();
    expect(concluida().sala.concluidaEm).toBe(T0);
  });

  it('é IDEMPOTENTE — o instante do fim não se move', () => {
    // Se cada broadcast remarcasse, a janela nunca venceria: a sala viveria
    // para sempre enquanto alguém estivesse com a aba aberta.
    const uma = concluida();
    const outra = marcarConclusao(uma, T0 + 5 * 60_000);
    expect(outra.sala.concluidaEm).toBe(T0);
    expect(outra, 'devolveu objeto novo à toa').toBe(uma);
  });
});

describe('decidirVida', () => {
  it('sala VAZIA encerra na hora, mesmo com partida em andamento', () => {
    // Não faz sentido segurar estado sem ninguém — é o que impede a sala zumbi.
    expect(decidirVida(criar(), 0, T0)).toEqual({ tipo: 'encerrar', motivo: 'vazia' });
    expect(decidirVida(concluida(), 0, T0)).toEqual({ tipo: 'encerrar', motivo: 'vazia' });
  });

  it('partida em andamento com gente dentro NUNCA encerra por tempo', () => {
    // Um draft longo não pode ser interrompido pela janela — ela só conta
    // depois do fim.
    expect(decidirVida(criar(), 2, T0 + 10 * JANELA_DE_GRACA_MS)).toEqual({ tipo: 'seguir' });
  });

  it('dentro da janela de graça, segue viva', () => {
    const estado = concluida();
    expect(decidirVida(estado, 3, T0)).toEqual({ tipo: 'seguir' });
    expect(decidirVida(estado, 3, T0 + JANELA_DE_GRACA_MS - 1)).toEqual({ tipo: 'seguir' });
  });

  it('vencida a janela, encerra — exatamente no limite', () => {
    const estado = concluida();
    expect(decidirVida(estado, 3, T0 + JANELA_DE_GRACA_MS)).toEqual({
      tipo: 'encerrar',
      motivo: 'janela-vencida',
    });
    expect(decidirVida(estado, 3, T0 + JANELA_DE_GRACA_MS + 60_000)).toEqual({
      tipo: 'encerrar',
      motivo: 'janela-vencida',
    });
  });

  it('a janela é parametrizável (o teste não espera 10 minutos de verdade)', () => {
    const estado = concluida();
    expect(decidirVida(estado, 1, T0 + 50, 100)).toEqual({ tipo: 'seguir' });
    expect(decidirVida(estado, 1, T0 + 100, 100)).toEqual({
      tipo: 'encerrar',
      motivo: 'janela-vencida',
    });
  });

  it('a janela padrão é de 10 minutos', () => {
    // Registrado como asserção porque é decisão, não acaso: 5 minutos é
    // apertado pra quem levanta da mesa; o alarme de 5 s já existe pro
    // cronômetro de turno, então segurar mais tempo não custa nada.
    expect(JANELA_DE_GRACA_MS).toBe(600_000);
  });
});

describe('o estado público leva `concluidaEm` (a tela precisa pra contar)', () => {
  it('está no snapshot, e não é segredo', () => {
    // Diferente de `seedMestre` e `tokens`: saber quando a partida acabou não
    // dá vantagem a ninguém, e sem isso a tela não teria como avisar.
    const publico = concluida().sala;
    expect(publico.concluidaEm).toBe(T0);
  });
});
