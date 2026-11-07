import { env, evictAllDurableObjects, reset, runInDurableObject } from 'cloudflare:test';
import { afterEach, expect, it, vi } from 'vitest';
import type { Connection } from 'partyserver';
import { aoReceber, criarServidor, type EstadoServidor } from '../src/net/servidor-sala';
import type { Sala } from './sala';

afterEach(async () => {
  await evictAllDurableObjects();
  await reset();
});

it.each([1, 5, 10])('Worker persiste formato %i e reidrata o snapshot após evict', async (n) => {
  const stub = env.Sala.get(env.Sala.idFromName(`formato-${n}`)) as DurableObjectStub<Sala>;
  await runInDurableObject(stub, async (instancia, ctx) => {
    const agora = Date.now();
    let estado = criarServidor(
      'FORMAT',
      42,
      'facil',
      agora,
      { etapas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], calendario: 11 },
      5,
    );
    for (const id of ['a', 'b']) {
      estado = aoReceber(
        estado,
        id,
        JSON.stringify({ tipo: 'entrar', nome: id, versaoApp: 'teste' }),
        agora,
        `token-${id}`,
      ).estado;
      estado = aoReceber(
        estado,
        id,
        JSON.stringify({ tipo: 'pronto', pronto: true }),
        agora,
      ).estado;
    }
    expect(estado.sala.jogadores).toHaveLength(2);
    await ctx.storage.put('estado', estado);
    const erros: unknown[] = [];
    const con = {
      id: 'a',
      close: () => {},
      send: (s: string) => erros.push(JSON.parse(s)),
    } as unknown as Connection;
    Object.defineProperty(instancia, 'getConnection', { value: () => con });
    await instancia.onMessage(con, JSON.stringify({ tipo: 'configurar-formato', nEtapas: n }));
    expect(erros.filter((m) => (m as { tipo: string }).tipo === 'erro')).toEqual([]);
    const salvo = (await ctx.storage.get<EstadoServidor>('estado'))!;
    expect(salvo.sala.nEtapas).toBe(n);
    expect(salvo.sala.seq).toBe(estado.sala.seq + (n === 5 ? 0 : 1));
    expect(salvo.sala.jogadores.map((j) => j.pronto)).toEqual(
      n === 5 ? [true, true] : [false, false],
    );
    expect(salvo.sala.seedsEtapas).toEqual(estado.sala.seedsEtapas);
    const put = vi.spyOn(ctx.storage, 'put');
    const broadcast = vi.spyOn(instancia, 'broadcast');
    await instancia.onMessage(con, JSON.stringify({ tipo: 'configurar-formato', nEtapas: n }));
    expect(put).not.toHaveBeenCalled();
    expect(broadcast).not.toHaveBeenCalled();
    expect(salvo.sala).toHaveProperty('revisaoFormato', n === 5 ? 0 : 1);
    put.mockRestore();
    broadcast.mockRestore();
  });
  await evictAllDurableObjects();
  await runInDurableObject(stub, async (instancia, ctx) => {
    const recebidas: { tipo: string; estado?: { nEtapas: number; revisaoFormato?: number } }[] = [];
    const con = {
      id: 'a',
      close: () => {},
      send: (s: string) => recebidas.push(JSON.parse(s)),
    } as unknown as Connection;
    Object.defineProperty(instancia, 'getConnection', { value: () => con });
    await instancia.onMessage(con, JSON.stringify({ tipo: 'sincronizar' }));
    expect(recebidas.find((m) => m.tipo === 'estado')?.estado?.nEtapas).toBe(n);
    expect(recebidas.find((m) => m.tipo === 'estado')?.estado?.revisaoFormato).toBe(
      n === 5 ? 0 : 1,
    );
    if (n !== 5) {
      const antes = await ctx.storage.get<EstadoServidor>('estado');
      recebidas.length = 0;
      await instancia.onMessage(
        con,
        JSON.stringify({ tipo: 'pronto', pronto: true, revisaoFormatoEsperada: 0 }),
      );
      expect(recebidas).toContainEqual({ tipo: 'erro', erro: 'comando-invalido' });
      expect(await ctx.storage.get<EstadoServidor>('estado')).toEqual(antes);
    }
  });
});
