/**
 * O GATE DO `alarm()` — PR C do spike, o último antes de encerrar a Fase 3.
 *
 * 🔑 **O que este arquivo cobre, e por que ele existe.** O 3.5.1 pôs uma guarda
 * no relógio do Durable Object (`party/sala.ts`, aviso A2 daquela revisão):
 * numa sala CORROMPIDA — pós-3.5.1 e sem as seeds do campeonato — o tique de
 * 5 s não pode chamar `aoPassarOTempo`, porque `aoPassarOTempo` **resolve
 * turnos vencidos**. Sem a guarda, ninguém conseguia conectar nem mandar
 * comando naquela sala e mesmo assim **o draft se jogava inteiro sozinho**,
 * num lugar que jogador nenhum podia ver. Até hoje essa guarda não tinha
 * nenhuma asserção que a executasse: `party/` só tinha cobertura do sorteio
 * (PR B) e do smoke (PR A).
 *
 * 🔒 **A guarda cobre SÓ o `aoPassarOTempo`, e é isso que MD prova.**
 * `registrarConexoes`, `decidirVida` e `encerrar` ficam FORA dela de propósito:
 * a sala corrompida precisa continuar podendo MORRER pela carência de vazio,
 * senão vira zumbi que recusa todo mundo e nunca libera o código. Um gate posto
 * cedo demais — early return no topo do `alarm()` — parece mais limpo e produz
 * exatamente esse zumbi.
 *
 * ## 🛑 A ARMADILHA DE VACUIDADE, e ela é o motivo de metade deste arquivo
 *
 * Conferido no código, não deduzido: em `alarm()`, `decidirVida` pode chamar
 * `encerrar()` **ANTES** de o gate ser alcançado. Se o setup envelhecesse
 * TODOS os timestamps de uma vez — o jeito óbvio de fazer um turno vencer —,
 * `vazioDesde` estouraria `CARENCIA_VAZIO_MS`, a sala seria DESTRUÍDA e
 * `aoPassarOTempo` nunca rodaria: **teste verde, gate nunca exercitado**, com a
 * mutação de MB verde junto. Seria "o teste afirmava o que não conferia" dentro
 * do teste que o plano chama de mais importante do spike.
 *
 * 🔑 **`criarSala` (`src/net/sala.ts`) grava `vazioDesde: agora`** — medido, não
 * suposto. Por isso a fixture nasce com o relógio NORMAL (`Date.now()`) e só
 * então três campos são sobrescritos cirurgicamente:
 *
 * - `sala.vazioDesde = null` — com 0 conexões, `registrarConexoes` grava
 *   `agora`, e `agora - agora = 0` ⇒ a sala SOBREVIVE até o gate;
 * - `sala.concluidaEm = null` explícito — `decidirVida` tem **DUAS** portas de
 *   `encerrar` (`servidor-sala.ts`: `concluidaEm !== null && agora - concluidaEm
 *   >= janelaMs`), e sem fixar esta a armadilha volta pela segunda porta;
 * - `draft.iniciadoEm[*] = agora - 10 × PRAZO_TURNO_MS` — o ÚNICO relógio
 *   envelhecido. ⚠️ O campo tem que EXISTIR: `deQuemEstourou` lê
 *   `iniciadoEm[id] ?? agora`, então campo ausente **não expira** e o teste
 *   passaria por vacuidade.
 *
 * ## As duas defesas que os achados do PR A obrigam
 *
 * - **`isolatedStorage` não existe na v0.22** e o storage ATRAVESSA os `it`s.
 *   Defesa: nome de DO distinto por teste **e** `reset()` + `evictAllDurableObjects()`
 *   no `afterEach`, nessa ordem — a mesma de `party/seeds.test.ts`.
 * - ⚠️ **`nodejs_compat` continua fora**, aqui e no `vitest.party.config.ts`: o
 *   achado do PR A é que ela nunca foi necessária, e teste e produção rodam sob
 *   a MESMA configuração de compat. Não ligar "por conveniência".
 *
 * 🔒 **Zero diff de produção.** É o que sustenta o rótulo BAIXO RISCO deste PR.
 */
import { env, evictAllDurableObjects, reset, runInDurableObject } from 'cloudflare:test';
import { afterEach, describe, expect, it } from 'vitest';

import { aoReceber, criarServidor, type EstadoServidor } from '../src/net/servidor-sala';
import { estadoDasSeeds } from '../src/net/sala';
import { N_ETAPAS_CURTA, PRAZO_TURNO_MS } from '../src/net/tipos';

import type { Sala } from './sala';

/**
 * Seeds válidas para o construtor. Valores fixos e distintivos; quem exercita o
 * comportamento delas é `party/seeds.test.ts`. Aqui elas existem para que a
 * sala nasça `ok` — e possa ser corrompida DEPOIS, de propósito.
 */
const SEEDS_OK = {
  etapas: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010],
  calendario: 7777,
};

/** O binding é declarado uma vez em `party/smoke.test.ts` — ver o docblock de `seeds.test.ts`. */
function stubDaSala(nome: string): DurableObjectStub<Sala> {
  return env.Sala.get(env.Sala.idFromName(nome));
}

/**
 * Uma sala com o draft REALMENTE iniciado, montada pelas funções PURAS de
 * `src/net/` — o mesmo caminho de `servidor-sala.test.ts`.
 *
 * 🔑 **`agora` é o relógio REAL, e não um `T0` sintético.** É a metade da
 * defesa contra a armadilha de vacuidade: `criarSala` grava `vazioDesde: agora`,
 * então um `T0` no passado mataria a sala por carência de vazio antes de o gate
 * ser alcançado.
 */
function salaComDraftEmAndamento(agora: number): EstadoServidor {
  const passo = (estado: EstadoServidor, conexaoId: string, comando: unknown): EstadoServidor =>
    aoReceber(estado, conexaoId, JSON.stringify(comando), agora, `tk-${conexaoId}`).estado;

  let estado = criarServidor('ALARME', 2026, 'dificil', agora, SEEDS_OK, N_ETAPAS_CURTA);
  estado = passo(estado, 'c1', { tipo: 'entrar', nome: 'Ana' });
  estado = passo(estado, 'c2', { tipo: 'entrar', nome: 'Beto' });
  estado = passo(estado, 'c1', { tipo: 'pronto', pronto: true });
  estado = passo(estado, 'c2', { tipo: 'pronto', pronto: true });
  estado = passo(estado, 'c1', { tipo: 'iniciar' });

  const draft = estado.sala.draft;
  if (draft === null) {
    throw new Error('pré-condição furada: o draft não iniciou — o setup da sala mudou');
  }
  if (draft.fase === 'concluido') {
    throw new Error('pré-condição furada: o draft nasceu concluído, não há turno para expirar');
  }
  return estado;
}

/**
 * Envelhece SÓ o relógio de turno, e neutraliza as duas portas de `encerrar`.
 *
 * Envelhece o turno de TODOS os humanos em vez de descobrir de quem é a vez:
 * o resultado é o mesmo e não depende de reimplementar `deQuemEhAVez` aqui —
 * regra de turno duplicada no teste é a classe de erro que este projeto já
 * catalogou.
 */
function comTurnoVencido(estado: EstadoServidor, agora: number): EstadoServidor {
  const draft = estado.sala.draft!;
  const vencido = agora - 10 * PRAZO_TURNO_MS;
  return {
    ...estado,
    sala: {
      ...estado.sala,
      // 🛑 As duas portas de `encerrar`, fixadas explicitamente. Ver o docblock
      // do topo: sem isto o teste fica verde sem nunca alcançar o gate.
      vazioDesde: null,
      concluidaEm: null,
      draft: {
        ...draft,
        iniciadoEm: Object.fromEntries(draft.humanos.map((id) => [id, vencido])),
      },
    },
  };
}

/**
 * Tira as seeds do campeonato — a corrupção REAL: uma sala pós-3.5.1 que
 * perdeu `seedsEtapas` na reidratação. `versaoSala` FICA, e é o que separa
 * `corrompida` de `legado`.
 */
function corromper(estado: EstadoServidor): EstadoServidor {
  // `delete` numa cópia em vez de desestruturação com descarte: o descarte
  // (`{ seedsEtapas: _fora, ...resto }`) reprova no `no-unused-vars` do projeto,
  // e desligar a regra por uma linha de teste seria afrouxar uma cerca por
  // conveniência.
  const sala = { ...estado.sala };
  delete sala.seedsEtapas;
  return { ...estado, sala };
}

/**
 * 🔒 Pré-condição que LANÇA, e não `expect` — mesmo padrão do `seedsDe` do
 * `seeds.test.ts`, invertido.
 *
 * Se a corrupção caísse em `legado` em vez de `corrompida`, `jogavel()`
 * devolveria `true`, o gate não agiria e o cenário **não alcançaria a guarda**
 * que o teste existe para provar — a sexta instância do 3.5.2, literalmente
 * ("baseline cujo cenário não ALCANÇA a guarda não é baseline").
 */
function exigirCorrompida(estado: EstadoServidor): EstadoServidor {
  const seeds = estadoDasSeeds(estado.sala);
  if (seeds.tipo !== 'corrompida') {
    throw new Error(
      `pré-condição furada: esperava seeds 'corrompida', veio '${seeds.tipo}' — o gate não seria exercitado`,
    );
  }
  return estado;
}

/** O oposto: garante que a sala SÃ é mesmo `ok` (a anti-vacuidade depende disso). */
function exigirSa(estado: EstadoServidor): EstadoServidor {
  const seeds = estadoDasSeeds(estado.sala);
  if (seeds.tipo !== 'ok') {
    throw new Error(`pré-condição furada: esperava seeds 'ok', veio '${seeds.tipo}'`);
  }
  return estado;
}

/** Grava o estado direto no storage — a fixture não passa por `criar()`. */
function gravar(nome: string, estado: EstadoServidor): Promise<void> {
  return runInDurableObject(stubDaSala(nome), (_sala, ctx) => ctx.storage.put('estado', estado));
}

/** O estado como está PERSISTIDO — a mesma chave que `carregar()` lê. */
function lerEstadoPersistido(nome: string): Promise<EstadoServidor | undefined> {
  return runInDurableObject(stubDaSala(nome), (_sala, ctx) =>
    ctx.storage.get<EstadoServidor>('estado'),
  );
}

/** Dispara UM tique do relógio, pelo método real. */
function tique(nome: string): Promise<void> {
  return runInDurableObject(stubDaSala(nome), (sala) => sala.alarm());
}

/**
 * Grava a fixture e despeja a instância ANTES do tique.
 *
 * 🔑 O evict não é zelo: `carregar()` devolve `this.estado` quando ele não é
 * `null`, e a instância que acabou de servir o `storage.put` pode ter cache. Sem
 * despejar, o `alarm()` rodaria sobre outro objeto que não o da fixture.
 */
async function prepararEDisparar(nome: string, estado: EstadoServidor): Promise<void> {
  await gravar(nome, estado);
  await evictAllDurableObjects();
  await tique(nome);
}

afterEach(async () => {
  // Os dois, nesta ordem — mesma defesa de `seeds.test.ts`.
  await reset();
  await evictAllDurableObjects();
});

describe('🔒 o gate do `alarm()` — sala CORROMPIDA não joga o draft sozinha (MB)', () => {
  it('🔴 MB: com as seeds corrompidas e o turno VENCIDO, `seq` e `draft` ficam INALTERADOS', async () => {
    const agora = Date.now();
    // 🔴 **A ORDEM IMPORTA, e a primeira versão desta linha ESQUECEU o
    // `corromper` — a pré-condição pegou na primeira execução.** Sem ele a
    // fixture era uma sala SÃ e o teste teria rodado o cenário errado. É o
    // registro de que `exigirCorrompida` não é cerimônia: ela pegou o defeito
    // que ela existe para pegar, no próprio PR que a escreveu.
    const fixture = exigirCorrompida(
      comTurnoVencido(corromper(salaComDraftEmAndamento(agora)), agora),
    );
    const antes = fixture.sala;

    await prepararEDisparar('alarme-mb', fixture);

    const depois = await lerEstadoPersistido('alarme-mb');
    if (depois === undefined) {
      throw new Error('a sala foi DESTRUÍDA pelo tique — a armadilha de vacuidade mordeu');
    }

    // 🔴 É esta dupla que a mutação de MB derruba: sem o gate, `aoPassarOTempo`
    // roda, `expirarJogador` marca ausente e o draft anda sozinho.
    expect(depois.sala.seq, 'o `seq` mudou: a sala corrompida processou o tique').toBe(antes.seq);
    expect(
      JSON.stringify(depois.sala.draft),
      'o draft mudou: o turno vencido foi resolvido numa sala que ninguém pode ver',
    ).toBe(JSON.stringify(antes.draft));
    expect(
      depois.sala.draft?.ausentes,
      'alguém foi marcado ausente pelo relógio numa sala corrompida',
    ).toEqual(antes.draft?.ausentes);
  });

  /**
   * 🔴 ANTI-VACUIDADE de MB, obrigatória pelo plano. Sem ela, "não avança"
   * passaria por "nada nunca avança" — e o teste acima ficaria verde mesmo se
   * o relógio estivesse quebrado, o turno não estivesse vencido, ou
   * `aoPassarOTempo` fosse código morto.
   *
   * MESMO setup de relógio, única diferença: as seeds estão OK.
   */
  it('🔴 ANTI-VACUIDADE: com as seeds OK e o MESMO relógio, o alarme EXPIRA o turno', async () => {
    const agora = Date.now();
    const fixture = exigirSa(comTurnoVencido(salaComDraftEmAndamento(agora), agora));
    const antes = fixture.sala;
    expect(antes.draft?.ausentes, 'pré-condição: ninguém ausente antes do tique').toEqual([]);

    await prepararEDisparar('alarme-antivacuidade', fixture);

    const depois = await lerEstadoPersistido('alarme-antivacuidade');
    if (depois === undefined) {
      throw new Error('a sala foi DESTRUÍDA pelo tique — a armadilha de vacuidade mordeu');
    }

    expect(
      depois.sala.draft?.ausentes.length,
      'o turno vencido NÃO foi resolvido numa sala sã: o cenário de MB não prova nada',
    ).toBeGreaterThan(0);
  });
});

describe('🔒 o gate cobre SÓ o `aoPassarOTempo` — a sala corrompida ainda MORRE (MD)', () => {
  /**
   * 🔴 MD — o gate posto cedo demais. Um early return no topo do `alarm()`
   * parece mais limpo e produz um zumbi: a sala corrompida recusa todo mundo
   * (`onConnect`/`onMessage` já barram) e nunca morre, então o código de 6
   * dígitos nunca é liberado.
   *
   * Aqui o relógio de vazio é o ENVELHECIDO — o oposto de MB —, e o turno não
   * importa.
   */
  it('🔴 MD: corrompida e vazia há mais de 2 min, a sala é DESTRUÍDA pelo tique', async () => {
    const agora = Date.now();
    const base = exigirCorrompida(corromper(salaComDraftEmAndamento(agora)));
    const fixture: EstadoServidor = {
      ...base,
      sala: {
        ...base.sala,
        // 3 min > CARENCIA_VAZIO_MS (2 min). 0 conexões no ambiente de teste.
        vazioDesde: agora - 3 * 60_000,
        concluidaEm: null,
      },
    };

    await prepararEDisparar('alarme-md', fixture);

    expect(
      await lerEstadoPersistido('alarme-md'),
      'a sala corrompida SOBREVIVEU à carência de vazio: é o zumbi que recusa todo mundo e nunca libera o código',
    ).toBeUndefined();
  });

  /**
   * 🔒 ANTI-VACUIDADE de MD: uma sala corrompida com o vazio DENTRO da carência
   * sobrevive ao mesmo tique. Sem isto, "morreu" passaria por "toda sala
   * corrompida morre sempre", e MD não distinguiria o gate cedo do gate certo.
   */
  it('🔒 ANTI-VACUIDADE: vazia há POUCO tempo, a mesma sala corrompida sobrevive', async () => {
    const agora = Date.now();
    const base = exigirCorrompida(corromper(salaComDraftEmAndamento(agora)));
    const fixture: EstadoServidor = {
      ...base,
      sala: { ...base.sala, vazioDesde: agora - 1_000, concluidaEm: null },
    };

    await prepararEDisparar('alarme-md-antivac', fixture);

    expect(
      await lerEstadoPersistido('alarme-md-antivac'),
      'a sala morreu com 1 s de vazio: a carência não está sendo respeitada',
    ).toBeDefined();
  });
});

describe('🟠 SONDA DA PENDÊNCIA 0(s) — a sala corrompida com `vazioDesde: null` chega a morrer?', () => {
  /**
   * 🟠 **A pendência 0(s), aberta em 2026-08-19 por LEITURA e nunca confirmada
   * por execução** — porque quem a confirmaria é exatamente este harness.
   *
   * A cadeia suspeitada: (1) `carregar()` devolve o estado com `vazioDesde:
   * null`; (2) `registrarConexoes` produz um objeto NOVO com `vazioDesde =
   * agora`; (3) `decidirVida` vê `agora - agora = 0` e segue; (4) `jogavel` é
   * **false** ⇒ `aplicar()` nunca é chamado ⇒ **o objeto novo nunca é
   * persistido**; (5) o tique seguinte relê `vazioDesde: null` e repete. O
   * relógio de morte nunca começa a correr.
   *
   * 🔑 **Medível em UM tique, e sem esperar 2 minutos:** o que a cadeia afirma é
   * que `vazioDesde` **não é persistido**. Isso se observa direto no storage.
   * Ticar N vezes esperando a carência seria mais lento e provaria menos.
   *
   * ⚠️ **Esta sonda NÃO conserta nada** — o PR C tem zero diff de produção, e o
   * conserto (se houver) é PR próprio, com baseline próprio. Decisão do dev.
   */
  it('🟠 corrompida: o `vazioDesde` sobrevive ao tique, ou o relógio de morte nunca começa?', async () => {
    const agora = Date.now();
    const base = exigirCorrompida(corromper(salaComDraftEmAndamento(agora)));
    const fixture: EstadoServidor = {
      ...base,
      sala: { ...base.sala, vazioDesde: null, concluidaEm: null },
    };
    expect(fixture.sala.vazioDesde, 'pré-condição: a fixture entra com vazioDesde null').toBeNull();

    await prepararEDisparar('alarme-0s-corrompida', fixture);

    // 🔑 **TRÊS tiques, e não um.** Um tique só provaria "não persistiu desta
    // vez"; a 0(s) afirma "NUNCA persiste, então o relógio de morte nunca
    // começa". Ticar de novo é o que separa um efeito de primeira vez de um
    // laço — e é barato, porque o que se mede é o storage, não a passagem de
    // 2 minutos de relógio real.
    await tique('alarme-0s-corrompida');
    await tique('alarme-0s-corrompida');

    const depois = await lerEstadoPersistido('alarme-0s-corrompida');
    if (depois === undefined) {
      throw new Error('a sala morreu nos três tiques — a fixture não modela a 0(s)');
    }

    // 🔴 **A ASSERÇÃO É O REGISTRO DO COMPORTAMENTO MEDIDO, não um desejo.**
    // Se `vazioDesde` continua `null` depois do tique, a 0(s) está CONFIRMADA:
    // o relógio de morte não começou, e não começará em tique nenhum.
    expect(
      depois.sala.vazioDesde,
      'a 0(s) foi REFUTADA: o `vazioDesde` foi persistido, então a carência de vazio corre normalmente',
    ).toBeNull();
  });

  /**
   * 🔒 O CONTRASTE que dá sentido à sonda acima: na sala SÃ o mesmo tique
   * PERSISTE o `vazioDesde`, porque `aplicar()` roda. Sem este par, "continuou
   * null" não distinguiria a 0(s) de "o tique não faz nada em sala nenhuma".
   */
  it('🔒 CONTRASTE: na sala SÃ, o mesmo tique PERSISTE o `vazioDesde`', async () => {
    const agora = Date.now();
    const base = exigirSa(salaComDraftEmAndamento(agora));
    const fixture: EstadoServidor = {
      ...base,
      sala: { ...base.sala, vazioDesde: null, concluidaEm: null },
    };

    await prepararEDisparar('alarme-0s-sa', fixture);

    const depois = await lerEstadoPersistido('alarme-0s-sa');
    if (depois === undefined) {
      throw new Error('a sala sã morreu no primeiro tique — o contraste não vale');
    }
    expect(
      depois.sala.vazioDesde,
      'nem na sala sã o `vazioDesde` foi persistido: o contraste da 0(s) não se sustenta',
    ).not.toBeNull();
  });
});
