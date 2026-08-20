/**
 * COBERTURA COMPORTAMENTAL DO SORTEIO E DA REIDRATAÇÃO — PR B do spike.
 *
 * 🔑 **É o primeiro arquivo do projeto que asserta LÓGICA sobre `party/sala.ts`.**
 * Até aqui, a única defesa do sítio que sorteia era a cerca TEXTUAL de
 * `src/net/campeonato-online.test.ts`: ela exige que o sorteio esteja *escrito*
 * do jeito certo, e não executa nada. Este arquivo executa — cria salas pelo
 * caminho real (`criarSeNova` → `criar`), despeja a instância e volta do storage.
 *
 * 🔒 **A CERCA TEXTUAL NÃO SAI, E O MOTIVO É M5.** Ver a matriz no docblock dela.
 * Seeds derivadas por índice também são distintas entre si e entre salas, então
 * nenhuma asserção comportamental deste arquivo pega M5 — nunca vai pegar. Quem
 * apagar a cerca citando "agora tem cobertura de verdade" reabre o buraco.
 *
 * ## Os dois baselines, e por que NÃO são os do plano original
 *
 * O plano aprovado (`PLANOS_ATIVOS.md`) previa **MA** e **MR**. **MR foi medido
 * e disqualificado em 2026-08-19, por dois motivos independentes:**
 * 1. a cerca textual tem uma quarta exigência (`const todas = Array.from(slots)`)
 *    que MR derruba — as duas cercas ficariam vermelhas juntas e o PR não
 *    provaria nada sobre o teste NOVO, que é exatamente por que M5/M6 já tinham
 *    sido recusadas como baseline;
 * 2. `Uint32Array` não é atribuível a `number[]` ⇒ **TS2740**, e vermelho de
 *    compilação não conta como baseline (regra travada da §3.5).
 *
 * 🔴 **E havia um furo maior: nenhum baseline do plano exigia o evict.** MA cai
 * na criação; MR também (a sala vira `corrompida` já ali). A metade
 * REIDRATAÇÃO — o requisito (a) do dev — sairia com cobertura declarada e não
 * provada, que é a forma exata do defeito do baseline do 3.5.1. Por isso o
 * baseline de reidratação é **MC** (`carregar()` deixa de ler o storage): o
 * vermelho dele pousa DEPOIS do `evictAllDurableObjects()`, na asserção de
 * reidratação, e não antes.
 *
 * ## Duas defesas que os achados do PR A obrigam
 *
 * - **`isolatedStorage` não existe na v0.22** e o storage ATRAVESSA os `it`s
 *   (medido no smoke). Defesa: nome de DO distinto por teste **e** `reset()` no
 *   `afterEach` — com `evictAllDurableObjects()` junto, porque o `reset()` limpa
 *   o STORAGE e o PR A não mediu se o `this.estado` em memória sobrevive. Sem
 *   despejar a instância, um nome reusado devolveria cache e `criarSeNova` daria
 *   `false` em silêncio, com o teste asserindo sobre estado velho.
 * - **`agora` é `Date.now()` real, nunca sintético.** `criar()` grava
 *   `vazioDesde: agora` e agenda alarme para `agora + INTERVALO_TIQUE_MS`. Com
 *   timestamp fabricado o alarme vence na hora, `alarm()` roda com o relógio
 *   real, `agora - vazioDesde` estoura `CARENCIA_VAZIO_MS` e **a sala é
 *   destruída no meio do teste** — a armadilha de vacuidade que o plano
 *   documenta para o PR C morde este arquivo também.
 *
 * ⚠️ `nodejs_compat` continua fora, aqui e no `vitest.party.config.ts`: teste e
 * produção rodam sob a mesma configuração de compat, e o achado do PR A é que
 * ela nunca foi necessária. Não ligar "por conveniência".
 */
import { env, evictAllDurableObjects, reset, runInDurableObject } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';

import type { EstadoServidor } from '../src/net/servidor-sala';
import { estadoDasSeeds } from '../src/net/sala';
import { MAX_ETAPAS, SLOTS_SEEDS } from '../src/net/tipos';

import type { Sala } from './sala';

/**
 * O binding `Cloudflare.Env` é declarado UMA vez, em `party/smoke.test.ts`, e
 * augmentação de namespace global vale para o projeto inteiro do
 * `tsconfig.test.json`. Redeclarar aqui seria duplicação; depender de lá é
 * acoplamento **alto e barulhento** (apagar o smoke reprova o `typecheck` na
 * hora), não silencioso. Escolhido o segundo.
 */
function stubDaSala(nome: string): DurableObjectStub<Sala> {
  return env.Sala.get(env.Sala.idFromName(nome));
}

/**
 * Cria a sala pelo caminho REAL e devolve o que `criarSeNova` respondeu.
 *
 * `runInDurableObject` em vez de RPC pelo stub: chama o método na instância de
 * verdade, sem serialização no meio, e é o mesmo mecanismo que enxerga a
 * instância NOVA depois de um evict — que é o que o teste de reidratação mede.
 */
function criarSala(nome: string, codigo: string): Promise<boolean> {
  return runInDurableObject(stubDaSala(nome), (sala) => sala.criarSeNova(codigo, Date.now()));
}

/** O estado como ele está PERSISTIDO — a mesma chave que `carregar()` lê. */
function lerEstadoPersistido(nome: string): Promise<EstadoServidor | undefined> {
  return runInDurableObject(stubDaSala(nome), (_sala, ctx) =>
    ctx.storage.get<EstadoServidor>('estado'),
  );
}

/**
 * As 11 seeds, classificadas pelo MESMO `estadoDasSeeds` que a produção usa
 * para decidir se a sala é jogável.
 *
 * 🔒 **Lança em vez de devolver, e é de propósito.** Um `expect(...).toBe('ok')`
 * seguido de `return` deixaria o resto do teste sem rodar e ainda assim
 * contabilizado — cobertura fantasma. Aqui, seeds fora de `ok` derrubam o teste
 * na hora e com o motivo real.
 */
function seedsDe(estado: EstadoServidor | undefined): { etapas: number[]; calendario: number } {
  if (estado === undefined) {
    throw new Error('pré-condição furada: o estado não foi persistido no storage do DO');
  }
  const seeds = estadoDasSeeds(estado.sala);
  if (seeds.tipo !== 'ok') {
    const motivo = seeds.tipo === 'corrompida' ? seeds.motivo : 'sala legado (sem versaoSala)';
    throw new Error(`pré-condição furada: esperava seeds 'ok', veio '${seeds.tipo}' — ${motivo}`);
  }
  return { etapas: seeds.etapas, calendario: seeds.calendario };
}

/** N = 5: MA cai já na primeira sala; salas extras compram largura, não força. */
const N_SALAS = 5;

afterEach(async () => {
  // Os dois, nesta ordem — ver o docblock do topo. `reset()` limpa o storage;
  // o evict garante que nenhuma instância siga com `this.estado` em cache.
  await reset();
  await evictAllDurableObjects();
});

describe('o sorteio das seeds no sítio REAL (`party/sala.ts`)', () => {
  it('🔑 cada sala sorteia SLOTS_SEEDS slots independentes (mata MA)', async () => {
    const conjuntos: number[][] = [];

    for (let i = 0; i < N_SALAS; i += 1) {
      const nome = `seeds-sorteio-${i}`;
      expect(await criarSala(nome, `A0000${i}`), `sala ${i}: criarSeNova devolveu false`).toBe(true);

      const { etapas, calendario } = seedsDe(await lerEstadoPersistido(nome));
      expect(etapas).toHaveLength(MAX_ETAPAS);

      // 🔑 **A asserção que MA derruba.** `todas[MAX_ETAPAS] = todas[0]` faz o
      // calendário virar a seed da etapa 0 em 100% das salas — e a cerca
      // textual NÃO pega, porque o literal `calendario: todas[MAX_ETAPAS]`
      // continua escrito lá (medido em 2026-08-19).
      expect(calendario, 'o calendário repetiu a seed da etapa 0').not.toBe(etapas[0]);

      const todas = [...etapas, calendario];
      expect(new Set(todas).size, 'dois slots vieram iguais dentro da mesma sala').toBe(
        SLOTS_SEEDS,
      );
      conjuntos.push(todas);
    }

    // Sortear de verdade implica salas diferentes. Uma constante compilada
    // passaria em tudo acima e cairia aqui.
    const distintos = new Set(conjuntos.map((c) => c.join(',')));
    expect(distintos.size, 'duas salas nasceram com o mesmo conjunto de seeds').toBe(N_SALAS);
  });
});

describe('reidratação da sala depois de a instância morrer', () => {
  it('🔑 volta do storage e NÃO re-sorteia (mata MC)', async () => {
    const nome = 'seeds-reidratacao';
    expect(await criarSala(nome, 'B0B0B0'), 'pré-condição: a sala tinha de nascer aqui').toBe(true);
    const antes = seedsDe(await lerEstadoPersistido(nome));

    // 🔒 A instância morre de verdade. Sem isto, `carregar()` devolveria
    // `this.estado` do cache e o teste passaria sem reidratar nada — a
    // vacuidade que o smoke do PR A mediu para poder evitar aqui.
    await evictAllDurableObjects();

    // 🔑 **A asserção que MC derruba, e ela roda DEPOIS do evict.** Uma
    // instância nova só devolve `false` se `carregar()` achou o estado no
    // storage. `true` aqui significa que a sala se RE-CRIOU — e re-criar
    // re-sorteia, que é o requisito (a) do dev quebrado ao vivo: o jogador
    // correria uma corrida diferente da que atestou.
    expect(
      await criarSala(nome, 'B0B0B0'),
      'a sala se re-criou depois do evict — o estado não voltou do storage',
    ).toBe(false);

    const depois = seedsDe(await lerEstadoPersistido(nome));
    expect(depois.etapas, 'as seeds das etapas mudaram na reidratação').toEqual(antes.etapas);
    expect(depois.calendario, 'a seed do calendário mudou na reidratação').toBe(antes.calendario);
  });
});

describe('R4 — o que o storage do DO faz com um `Uint32Array`', () => {
  it('🔑 MEDIÇÃO: `Array.from` na fronteira é NECESSÁRIO, não estilo', async () => {
    // 🔑 Pergunta que o R4 deixou **explicitamente em aberto** ("não foi
    // executado em workerd"). O 0(p) provou o SERIALIZADOR — `ctx.storage.put`
    // grava V8-serializado na `_cf_KV`, não JSON —, e não este detalhe.
    //
    // 🔒 A asserção que importa para produção é a do `Array.isArray`:
    // `estadoDasSeeds` (`src/net/sala.ts`) valida `seedsEtapas` com ela, e
    // reprovar ali significa sala **corrompida e recusada**. Ela vale nos dois
    // desfechos possíveis (typed array preservado OU objeto indexado), então é
    // ela que sustenta o `Array.from` de `party/sala.ts`.
    //
    // 🔒 **ANINHADO, na FORMA REAL — e isso não é preciosismo.** A produção
    // nunca grava um `Uint32Array` no topo da chave: ela grava um
    // `EstadoServidor`, e as seeds vivem em `estado.sala.seedsEtapas`, dois
    // níveis abaixo. Medir o caso top-level e escrever "medido" sobre o caso
    // aninhado seria supor que o structured clone é recursivo em vez de
    // conferir — a distância exata entre "o teste afirmava" e "o teste
    // conferia" que este projeto já pagou cinco vezes. **Assim, este bloco
    // reproduz M1 de verdade**, que a cerca textual só consegue descrever.
    const nome = 'r4-uint32array';
    const stub = stubDaSala(nome);
    const comoAProducaoGrava = { sala: { seedsEtapas: new Uint32Array([1, 2, 3]) } };

    await runInDurableObject(stub, (_sala, ctx) => ctx.storage.put('estado', comoAProducaoGrava));
    await evictAllDurableObjects();
    const lido = await runInDurableObject(stub, (_sala, ctx) =>
      ctx.storage.get<{ sala: { seedsEtapas: unknown } }>('estado'),
    );
    if (lido === undefined) {
      throw new Error('pré-condição furada: o estado aninhado não voltou do storage');
    }
    const seedsEtapas = lido.sala.seedsEtapas;

    expect(
      Array.isArray(seedsEtapas),
      'se um Uint32Array voltasse como Array, o `Array.from` da casca seria dispensável',
    ).toBe(false);

    // O registro de QUAL dos dois mundos é o nosso — structured clone do V8
    // preserva typed arrays; JSON os transformaria em `{"0":1,…}`.
    expect(seedsEtapas).toBeInstanceOf(Uint32Array);
    expect(Array.from(seedsEtapas as Uint32Array)).toEqual([1, 2, 3]);
  });
});
