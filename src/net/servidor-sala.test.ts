/**
 * PR 3.2 / 3.2.1 — o servidor sem I/O: identidade de conexão, recuperação e
 * RECONEXÃO por token.
 *
 * O que este arquivo protege, acima de tudo, é a resposta para **"quem mandou
 * isto?"**. Ela não vem do fio (o 3.1a tirou `jogadorId` de todos os comandos);
 * vem do mapa conexão→jogador, que vive aqui. Cada furo nesse mapa é uma
 * personificação.
 */

import { describe, expect, it } from 'vitest';
import {
  aoConectar,
  aoDesconectar,
  aoReceber,
  criarServidor,
  type EstadoServidor,
} from './servidor-sala';
import type { MensagemServidor } from './protocolo';

const T0 = 1_000_000;

const criar = () => criarServidor('sala-teste', 2026, 'dificil');

/** Manda um comando cru, como o transporte faria. */
function mandar(
  estado: EstadoServidor,
  conexaoId: string,
  comando: unknown,
  token = 'token-novo',
): { estado: EstadoServidor; envios: { para: string | null; mensagem: MensagemServidor }[] } {
  return aoReceber(estado, conexaoId, JSON.stringify(comando), T0, token);
}

/** Faz uma conexão entrar e devolve o estado + o token que ela recebeu. */
function entrar(
  estado: EstadoServidor,
  conexaoId: string,
  nome: string,
  token: string,
): { estado: EstadoServidor; token: string } {
  const r = mandar(estado, conexaoId, { tipo: 'entrar', nome }, token);
  const voceE = r.envios.find((e) => e.mensagem.tipo === 'voce-e');
  expect(voceE, `entrar de ${nome} não devolveu voce-e`).toBeDefined();
  const msg = voceE!.mensagem as { tipo: 'voce-e'; jogadorId: string; token?: string };
  expect(msg.token, 'o token não veio no voce-e do entrar').toBe(token);
  return { estado: r.estado, token: msg.token! };
}

const conexoesDe = (estado: EstadoServidor, jogadorId: string): string[] =>
  Object.entries(estado.jogadorPorConexao)
    .filter(([, j]) => j === jogadorId)
    .map(([c]) => c);

describe('identidade da conexão', () => {
  it('só o `entrar` transforma uma conexão em jogador', () => {
    let estado = criar();
    estado = aoConectar(estado, 'c1').estado;
    expect(estado.jogadorPorConexao).toEqual({});
    estado = entrar(estado, 'c1', 'Ana', 'tk-1').estado;
    expect(estado.jogadorPorConexao).toEqual({ c1: 'humano-01' });
  });

  it('o token vai SÓ para quem entrou, nunca em broadcast', () => {
    const r = mandar(criar(), 'c1', { tipo: 'entrar', nome: 'Ana' }, 'tk-secreto');
    for (const envio of r.envios) {
      if (envio.para === null) {
        expect(JSON.stringify(envio.mensagem), 'o token vazou num broadcast').not.toContain(
          'tk-secreto',
        );
      }
    }
  });

  it('JSON inválido e comando sem tipo viram erro, não exceção', () => {
    const estado = criar();
    for (const bruto of ['{', 'nao é json', '[]', 'null', '{"semTipo":1}']) {
      const r = aoReceber(estado, 'c1', bruto, T0, 'tk');
      expect(r.envios[0].mensagem).toEqual({ tipo: 'erro', erro: 'comando-invalido' });
      expect(r.estado).toBe(estado);
    }
  });

  it('quem-sou e sincronizar não mudam o estado nem avançam o seq', () => {
    const { estado } = entrar(criar(), 'c1', 'Ana', 'tk-1');
    const seq = estado.sala.seq;
    for (const comando of [{ tipo: 'quem-sou' }, { tipo: 'sincronizar' }]) {
      const r = mandar(estado, 'c1', comando);
      expect(r.estado.sala.seq, `${comando.tipo} avançou o seq`).toBe(seq);
      expect(r.envios.every((e) => e.para === 'c1'), 'respondeu em broadcast').toBe(true);
    }
  });
});

describe('reconexão por token (PR 3.2.1)', () => {
  it('quem cai volta com o token e recupera a identidade', () => {
    let estado = criar();
    const e1 = entrar(estado, 'c1', 'Ana', 'tk-ana');
    estado = e1.estado;
    estado = entrar(estado, 'c2', 'Beto', 'tk-beto').estado;

    // Ana cai: a conexão some do mapa, mas ela continua na sala.
    estado = aoDesconectar(estado, 'c1', T0).estado;
    expect(estado.jogadorPorConexao.c1).toBeUndefined();

    // E volta, por outra conexão, apresentando o token.
    const r = mandar(estado, 'c9', { tipo: 'reentrar', token: e1.token });
    expect(r.envios.some((e) => e.mensagem.tipo === 'erro')).toBe(false);
    expect(r.estado.jogadorPorConexao.c9).toBe('humano-01');
    // E recebe de volta identidade e estado, só para ela.
    expect(r.envios.map((e) => e.mensagem.tipo).sort()).toEqual(['estado', 'voce-e']);
    expect(r.envios.every((e) => e.para === 'c9')).toBe(true);
  });

  it('EVICÇÃO: reconectar não deixa duas conexões mandando pelo mesmo jogador', () => {
    // Um cliente instável que reconecta três vezes deixaria três chaves vivas
    // apontando pro mesmo jogador — e TODAS poderiam jogar por ele. É a mesma
    // superfície de personificação que o 3.1a fechou, reaberta por outro lado.
    let estado = criar();
    const e = entrar(estado, 'c1', 'Ana', 'tk-ana');
    estado = e.estado;

    for (const conexao of ['c2', 'c3', 'c4']) {
      estado = mandar(estado, conexao, { tipo: 'reentrar', token: e.token }).estado;
    }
    expect(conexoesDe(estado, 'humano-01')).toEqual(['c4']);
  });

  it('reentrar FUNCIONA com a sala já iniciada — é o ponto do comando', () => {
    let estado = criar();
    const ana = entrar(estado, 'c1', 'Ana', 'tk-ana');
    estado = ana.estado;
    estado = entrar(estado, 'c2', 'Beto', 'tk-beto').estado;
    estado = mandar(estado, 'c1', { tipo: 'pronto', pronto: true }).estado;
    estado = mandar(estado, 'c2', { tipo: 'pronto', pronto: true }).estado;
    estado = mandar(estado, 'c1', { tipo: 'iniciar' }).estado;
    expect(estado.sala.fase).toBe('iniciada');

    // `entrar` é recusado (roster congelado)…
    expect(mandar(estado, 'c7', { tipo: 'entrar', nome: 'Atrasado' }).envios[0].mensagem).toEqual({
      tipo: 'erro',
      erro: 'sala-iniciada',
    });
    // …mas `reentrar` passa: quem já era da partida pode voltar.
    const r = mandar(estado, 'c7', { tipo: 'reentrar', token: ana.token });
    expect(r.estado.jogadorPorConexao.c7).toBe('humano-01');
  });

  it('token inválido, ausente ou de tipo errado é recusado', () => {
    const { estado } = entrar(criar(), 'c1', 'Ana', 'tk-ana');
    for (const token of ['', 'inventado', undefined, null, 42, {}]) {
      const r = mandar(estado, 'c9', { tipo: 'reentrar', token });
      expect(r.envios[0].mensagem, `aceitou ${JSON.stringify(token)}`).toEqual({
        tipo: 'erro',
        erro: 'token-invalido',
      });
      expect(r.estado).toBe(estado);
    }
  });

  it('reentrar não avança o seq (não muda o estado da SALA)', () => {
    const { estado, token } = entrar(criar(), 'c1', 'Ana', 'tk-ana');
    const r = mandar(estado, 'c2', { tipo: 'reentrar', token });
    expect(r.estado.sala.seq).toBe(estado.sala.seq);
    expect(r.estado.sala).toBe(estado.sala);
  });

  it('cair com a sala ABERTA remove da sala; com a sala INICIADA, não', () => {
    // Depois do congelamento o roster é imutável: cair não pode tirar ninguém
    // da partida. Quem decide que o jogador não volta é o cronômetro.
    let aberta = criar();
    aberta = entrar(aberta, 'c1', 'Ana', 'tk-1').estado;
    aberta = entrar(aberta, 'c2', 'Beto', 'tk-2').estado;
    expect(aoDesconectar(aberta, 'c1', T0).estado.sala.jogadores).toHaveLength(1);

    let iniciada = aberta;
    iniciada = mandar(iniciada, 'c1', { tipo: 'pronto', pronto: true }).estado;
    iniciada = mandar(iniciada, 'c2', { tipo: 'pronto', pronto: true }).estado;
    iniciada = mandar(iniciada, 'c1', { tipo: 'iniciar' }).estado;
    const apos = aoDesconectar(iniciada, 'c1', T0).estado;
    expect(apos.sala.jogadores).toHaveLength(2);
    expect(apos.sala.draft?.ausentes, 'cair não é abandonar').toEqual([]);
  });
});
