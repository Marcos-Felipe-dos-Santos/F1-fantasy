import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { abrirConexao } from './conexao';

class Socket extends EventTarget {
  static OPEN = 1;
  static instancias: Socket[] = [];
  readyState = 1;
  constructor() {
    super();
    Socket.instancias.push(this);
  }
  send() {}
  close() {}
}
beforeEach(() => {
  vi.useFakeTimers();
  Socket.instancias = [];
  vi.stubGlobal('WebSocket', Socket);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('recusa de política encerra a conexão sem martelar o servidor', () => {
  const conexao = abrirConexao({ base: 'ws://teste', sala: 'ABCDEF', aoReceber: () => {} });
  const socket = Socket.instancias[0];
  socket.dispatchEvent(new Event('open'));
  socket.dispatchEvent(Object.assign(new Event('close'), { code: 4403 }));
  vi.advanceTimersByTime(60_000);
  expect(Socket.instancias).toHaveLength(1);
  expect(conexao.estado()).toBe('fechada');
});

it('abrir e cair sem receber estado mantém o backoff crescente', () => {
  const conexao = abrirConexao({ base: 'ws://teste', sala: 'ABCDEF', aoReceber: () => {} });
  Socket.instancias[0].dispatchEvent(new Event('open'));
  Socket.instancias[0].dispatchEvent(Object.assign(new Event('close'), { code: 1006 }));
  vi.advanceTimersByTime(650);
  expect(Socket.instancias).toHaveLength(2);
  Socket.instancias[1].dispatchEvent(new Event('open'));
  Socket.instancias[1].dispatchEvent(Object.assign(new Event('close'), { code: 1006 }));
  vi.advanceTimersByTime(650);
  expect(Socket.instancias).toHaveLength(2);
  vi.advanceTimersByTime(650);
  expect(Socket.instancias).toHaveLength(3);
  conexao.fechar();
});
