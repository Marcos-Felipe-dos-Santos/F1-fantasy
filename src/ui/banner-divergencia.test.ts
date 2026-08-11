/**
 * PR 3.4.1 — o alarme de divergência CHEGA NA TELA.
 *
 * 🔴 **Por que este teste existe.** O 3.4 construiu o detector inteiro — hash,
 * comparação no servidor, broadcast, registro no cliente — e o jogador não via
 * nada. Do ponto de vista de quem joga, um alarme que ninguém vê é o mesmo
 * silêncio que a fase gastou um PR pra acabar. Este arquivo trava o último
 * metro.
 *
 * O que ele NÃO é: teste de aparência. Não há jsdom no projeto e cor não se
 * assere em markup. Ele cobre o que quebra de verdade — o banner aparecer
 * quando (e só quando) houve divergência, **em todas as telas do online**, que
 * é onde "esqueci de pôr numa delas" moraria.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FluxoOnline } from './FluxoOnline';
import { criarCliente, type EstadoCliente } from '../net/cliente';
import * as useSalaOnlineModule from './useSalaOnline';

/** O trecho que o jogador precisa ler. Se mudar, é decisão — não acidente. */
const TRECHO = 'As máquinas divergiram';

// O ramo do lobby monta a URL do socket a partir de `window.location`, e o
// projeto roda os testes em `environment: 'node'` (sem jsdom, de propósito).
// Stub mínimo — só o que `baseParaEstaPagina` lê.
(globalThis as unknown as { window: unknown }).window = {
  location: { protocol: 'http:', host: 'localhost:5173' },
};

type Retorno = ReturnType<typeof useSalaOnlineModule.useSalaOnline>;

/** Monta um retorno de `useSalaOnline` plausível para a fase pedida. */
function retornoFalso(cliente: EstadoCliente, extras: Partial<Retorno> = {}): Retorno {
  return {
    estadoConexao: 'aberta',
    cliente,
    euSou: null,
    minhaVez: false,
    souAusente: false,
    encerrada: false,
    inexistente: false,
    ultimoErro: null,
    entrar: () => {},
    definirPronto: () => {},
    iniciar: () => {},
    sair: () => {},
    escolher: () => {},
    ...extras,
  } as Retorno;
}

function renderizar(cliente: EstadoCliente, extras: Partial<Retorno> = {}): string {
  const espiao = vi
    .spyOn(useSalaOnlineModule, 'useSalaOnline')
    .mockReturnValue(retornoFalso(cliente, extras));
  try {
    return renderToStaticMarkup(
      createElement(FluxoOnline, { sala: 'A3F9C2', onVoltar: () => {} }),
    );
  } finally {
    espiao.mockRestore();
  }
}

const divergente = { escopo: 'draft', ancora: 12, jogadores: ['humano-07'] };

describe('o alarme aparece quando — e só quando — houve divergência', () => {
  it('🔴 com divergência, o banner está na tela', () => {
    const cliente = { ...criarCliente(), divergencia: divergente };
    expect(renderizar(cliente)).toContain(TRECHO);
  });

  /**
   * 🔒 ANTI-VACUIDADE. Sem isto, um banner renderizado SEMPRE passaria no teste
   * acima — e um alarme permanente é ruído que o jogador aprende a ignorar,
   * que é o mesmo que não ter alarme.
   */
  it('🔒 sem divergência, o banner NÃO está na tela', () => {
    expect(renderizar(criarCliente())).not.toContain(TRECHO);
  });

  it('🔒 aparece em TODAS as telas do online, não só numa', () => {
    // É aqui que "esqueci de pôr numa delas" seria pego. A divergência pode
    // acontecer em qualquer ponto e o jogador precisa vê-la em qualquer tela.
    const cliente = { ...criarCliente(), divergencia: divergente };
    const telas: { nome: string; extras: Partial<Retorno> }[] = [
      { nome: 'lobby', extras: {} },
      { nome: 'sala encerrada', extras: { encerrada: true } },
      { nome: 'sala inexistente', extras: { inexistente: true } },
      { nome: 'espectador / preparando', extras: { euSou: 'humano-01' } },
      { nome: 'ausente', extras: { euSou: 'humano-01', souAusente: true } },
    ];
    for (const { nome, extras } of telas) {
      expect(renderizar(cliente, extras), `banner sumiu na tela "${nome}"`).toContain(TRECHO);
    }
  });

  it('não acusa jogador nominalmente — o servidor não sabe quem está certo', () => {
    // `jogadores` é a minoria que atestou diferente: pista, não veredito. O
    // servidor não tem dataset e não tem como saber quem está correto.
    const cliente = { ...criarCliente(), divergencia: divergente };
    expect(renderizar(cliente)).not.toContain('humano-07');
  });
});
