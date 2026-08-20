/**
 * SMOKE do pool (`@cloudflare/vitest-pool-workers`) — PR A do spike.
 *
 * 🔒 **Nenhuma asserção de lógica de sala mora aqui, de propósito.** Este
 * arquivo responde só a pergunta do spike: *o `workerd` sobe no Windows, lê o
 * `wrangler.jsonc` de produção, dá acesso ao DO e o storage SQLite faz
 * round-trip?* A lógica (sorteio, reidratação, gate do `alarm()`) é dos PRs B e
 * C, e um smoke que já asserisse regra confundiria "a infra funciona" com "a
 * sala está certa" — os PRs B/C precisam de baseline vermelho PRÓPRIO.
 *
 * 🔑 **Vermelho de infra não conta como baseline** (regra travada da §3.5).
 * É por isso que o smoke vem primeiro e verde: sem ele, a primeira mutação de B
 * ficaria vermelha e ninguém saberia se foi a mutação ou o `workerd`.
 */
import { env, evictAllDurableObjects, reset, runInDurableObject } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

import type { Sala } from './sala';

/**
 * O `env` de `cloudflare:test` é tipado como `Cloudflare.Env` — namespace global
 * que normalmente vem de `wrangler types`, comando que este projeto não roda.
 * Declarar o binding aqui é o mínimo que faz o gate de tipos valer alguma coisa:
 * sem isto, `env.Sala` seria `any` e o `tsconfig.test.json` certificaria nada.
 *
 * ⚠️ Em `@cloudflare/vitest-pool-workers@0.22.0` NÃO é mais `ProvidedEnv` (o
 * mecanismo das versões antigas). Descoberto pelo próprio gate, que reprovou a
 * primeira versão deste arquivo — a prova de que o `tsconfig.test.json` não é
 * cerimônia.
 */
declare global {
  // Augmentação de namespace GLOBAL é a única forma de tipar `Cloudflare.Env`;
  // `declare module` não alcança. Desligado na linha, nunca no config — separar
  // regra no flat config é o que já apagou proibições neste projeto (PR 3.2).
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    interface Env {
      Sala: DurableObjectNamespace<Sala>;
    }
  }
}

/** Um stub qualquer: o smoke não cria sala, só precisa de um DO para habitar. */
function stubDeSmoke(nome: string): DurableObjectStub<Sala> {
  return env.Sala.get(env.Sala.idFromName(nome));
}

/**
 * 🔒 Guarda de ORDEM do canário de isolamento, abaixo.
 *
 * O teste "a escrita do teste anterior sobrevive" só diz o que promete se o
 * teste anterior REALMENTE rodou antes. Sob `--shuffle`, sob `-t` filtrando um
 * caso só, ou se alguém inserir um teste no meio, ele ficaria vermelho por
 * causa da FLAG do runner e leria como "o isolamento voltou". Seria um teste
 * afirmando o que não confere — no arquivo cuja função é provar o runner
 * honesto. Com esta flag, o desfecho é uma mensagem dizendo que o canário não
 * rodou em ordem.
 */
let escreveuNoTesteAnterior = false;

describe('smoke do pool de workers', () => {
  it('lê o binding do DO declarado no `wrangler.jsonc` de produção', () => {
    // Se a config de produção não tivesse sido lida, não haveria binding
    // nenhum — é esta asserção que liga o teste ao arquivo que o deploy usa.
    expect(env.Sala).toBeDefined();
    expect(typeof env.Sala.idFromName).toBe('function');
  });

  it('roda dentro do DO e faz round-trip no storage SQLite', async () => {
    // `new_sqlite_classes` no `wrangler.jsonc` — este é o teste de que o
    // backend SQLite do DO funciona sob `workerd` no Windows, que era um dos
    // riscos de descoberta declarados do spike.
    const lido = await runInDurableObject(stubDeSmoke('smoke-storage'), async (_sala, ctx) => {
      await ctx.storage.put('chave-do-smoke', { n: 42 });
      return ctx.storage.get<{ n: number }>('chave-do-smoke');
    });
    expect(lido).toEqual({ n: 42 });
    escreveuNoTesteAnterior = true;
  });

  it('🔑 `evictAllDurableObjects` derruba a instância e PRESERVA o storage', async () => {
    // 🔑 **Esta é a ferramenta que o PR B precisa, e por isso ela é medida
    // aqui e não lá.** O baseline **MR** (requisito (a) do dev) é sobre
    // REIDRATAÇÃO: o estado tem de voltar do storage depois que a instância
    // morre. Só que `Sala` guarda `this.estado` em memória e `carregar()`
    // devolve o cache sem tocar no storage — um teste que apenas chamasse o DO
    // de novo leria a memória e passaria sem nunca reidratar nada. Vacuidade
    // pronta para acontecer.
    //
    // Round-trip inteiro num `it` só, de propósito: sem acoplamento de ordem.
    const stub = stubDeSmoke('smoke-evict');
    await runInDurableObject(stub, (_sala, ctx) => ctx.storage.put('sobrevive', 'sim'));
    await evictAllDurableObjects();
    const depois = await runInDurableObject(stub, (_sala, ctx) =>
      ctx.storage.get<string>('sobrevive'),
    );
    expect(depois).toBe('sim');
  });

  it('🔑 NÃO há isolamento automático: a escrita do teste anterior SOBREVIVE', async () => {
    // 🔴 MEDIDO em 2026-08-19, e é o INVERSO do que o plano do spike previa.
    // O plano dizia "`isolatedStorage` (ligado por padrão) desfaz escritas
    // entre testes"; em `@cloudflare/vitest-pool-workers@0.22.0` a opção **não
    // existe mais** (zero ocorrências no pacote) e o storage ATRAVESSA os
    // `it`s. Este teste trava o achado: se uma versão futura reintroduzir o
    // isolamento, ele fica vermelho e ninguém descobre por acidente.
    //
    // 🔒 **Consequência para os PRs B e C:** o risco deixa de ser "a escrita
    // some entre testes" e passa a ser VAZAMENTO — dois testes que usem o
    // mesmo nome de DO compartilham estado, e um deles pode passar por causa
    // da fixture do outro. Defesa: nome de DO distinto por teste **e**
    // `reset()` no `afterEach` (abaixo).
    expect(
      escreveuNoTesteAnterior,
      'o canário depende do teste de round-trip ter rodado ANTES (ver a guarda de ordem no topo)',
    ).toBe(true);
    const sobrou = await runInDurableObject(stubDeSmoke('smoke-storage'), (_sala, ctx) =>
      ctx.storage.get<{ n: number }>('chave-do-smoke'),
    );
    expect(sobrou).toEqual({ n: 42 });
  });

  it('`reset()` limpa o storage — é ele que substitui o `isolatedStorage`', async () => {
    await reset();
    const sobrou = await runInDurableObject(stubDeSmoke('smoke-storage'), (_sala, ctx) =>
      ctx.storage.get('chave-do-smoke'),
    );
    expect(sobrou).toBeUndefined();
  });
});
