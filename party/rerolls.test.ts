import { env, evictAllDurableObjects, reset, runInDurableObject } from 'cloudflare:test';
import { afterEach, expect, it } from 'vitest';
import type { Connection } from 'partyserver';
import type { Sala } from './sala';
import { aoReceber, criarServidor, type EstadoServidor } from '../src/net/servidor-sala';
import { TETO_COMANDOS } from '../src/net/teto-comandos';

afterEach(async () => {
  await evictAllDurableObjects();
  await reset();
});

function iniciado() {
  const agora = Date.now();
  let s = criarServidor(
    'REROLL',
    42,
    'dificil',
    agora,
    { etapas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], calendario: 11 },
    5,
  );
  const passo = (id: string, cmd: unknown) => {
    s = aoReceber(s, id, JSON.stringify(cmd), agora, `token-${id}`).estado;
  };
  for (const id of ['a', 'b']) passo(id, { tipo: 'entrar', nome: id });
  for (const id of ['a', 'b']) passo(id, { tipo: 'pronto', pronto: true });
  passo('a', { tipo: 'iniciar' });
  return s;
}

it('Worker persiste reroll, aplica limite de rajada e reidrata revisão', async () => {
  const stub = env.Sala.get(env.Sala.idFromName('reroll-persistido')) as DurableObjectStub<Sala>;
  await runInDurableObject(stub, async (instancia, ctx) => {
    const s = iniciado();
    const prazo = s.sala.draft!.iniciadoEm['humano-01'];
    await ctx.storage.put('estado', s);
    const recebidas: string[] = [];
    const con = {
      id: 'a',
      close: () => {},
      send: (texto: string) => recebidas.push(texto),
    } as unknown as Connection;
    for (let i = 0; i <= TETO_COMANDOS; i++) {
      await instancia.onMessage(
        con,
        JSON.stringify({ tipo: 'reroll', alvo: 'marca', turnoEsperado: 1, revisaoEsperada: i }),
      );
    }
    expect(recebidas.map((m) => JSON.parse(m))).toContainEqual({
      tipo: 'erro',
      erro: 'comandos-demais',
    });
    const salvo = await ctx.storage.get<EstadoServidor>('estado');
    expect(salvo!.sala.draft!.log).toHaveLength(TETO_COMANDOS);
    expect(salvo!.sala.draft!.revisoes['humano-01']).toBe(TETO_COMANDOS);
    expect(salvo!.sala.draft!.iniciadoEm['humano-01']).toBe(prazo);
  });
  await evictAllDurableObjects();
  await runInDurableObject(stub, async (instancia, ctx) => {
    const recebidas: string[] = [];
    const con = {
      id: 'a',
      close: () => {},
      send: (texto: string) => recebidas.push(texto),
    } as unknown as Connection;
    Object.defineProperty(instancia, 'getConnection', { value: () => con });
    await instancia.onMessage(
      con,
      JSON.stringify({ tipo: 'reroll', alvo: 'ano', turnoEsperado: 1, revisaoEsperada: 0 }),
    );
    expect(recebidas.map((m) => JSON.parse(m))).toContainEqual({
      tipo: 'erro',
      erro: 'revisao-divergente',
    });
    expect((await ctx.storage.get<EstadoServidor>('estado'))!.sala.draft!.log).toHaveLength(
      TETO_COMANDOS,
    );
  });
});

it('Worker recusa explicitamente draft antigo reidratado', async () => {
  const stub = env.Sala.get(env.Sala.idFromName('reroll-legado')) as DurableObjectStub<Sala>;
  await runInDurableObject(stub, async (_instancia, ctx) => {
    const s = iniciado();
    s.sala.draft!.versao = 1;
    delete (s.sala.draft as Partial<NonNullable<typeof s.sala.draft>>).revisoes;
    await ctx.storage.put('estado', s);
  });
  await evictAllDurableObjects();
  await runInDurableObject(stub, async (instancia) => {
    const recebidas: string[] = [];
    const con = {
      id: 'a',
      close: () => {},
      send: (texto: string) => recebidas.push(texto),
    } as unknown as Connection;
    await instancia.onMessage(con, JSON.stringify({ tipo: 'sincronizar' }));
    expect(recebidas.map((m) => JSON.parse(m))).toContainEqual({
      tipo: 'erro',
      erro: 'sala-inexistente',
    });
  });
});
