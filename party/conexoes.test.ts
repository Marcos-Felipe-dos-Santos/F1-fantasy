/**
 * BASELINE VERMELHO do PR H2 — S2 (teto de CONEXÕES) e S4 (Origin no upgrade).
 *
 * 🔴 **Este arquivo nasce VERMELHO de propósito e é para ser lido assim.** Hoje
 * `onConnect` (`party/sala.ts`) aceita conexão sem contar quantas já existem e
 * sem olhar o `Origin` do upgrade. As asserções abaixo descrevem o
 * comportamento PRETENDIDO; o que elas medem hoje é a ausência dele.
 *
 * 🔑 **NÃO é vermelho de compilação** (regra travada da Fase 3). Nada de novo é
 * importado: o teste abre WebSocket pelo caminho real (`SELF.fetch` com
 * `Upgrade`) e conta `getConnections()` de dentro do DO. Compila hoje e falha
 * por VALOR.
 *
 * ---
 *
 * 🔴 **A ASSERÇÃO NÃO PODE SER O STATUS, E ISSO É MEDIDO — é a decisão de
 * desenho deste arquivo.** O `partyserver@0.5.10` devolve **101 sempre**: no
 * `fetch` do `Server` (`node_modules/partyserver/dist/index.js`) o `accept` e o
 * `await this.onConnect(...)` acontecem ANTES do `new Response(null, { status:
 * 101 })`, e o `onConnect` não tem como trocar essa resposta. **Sonda de
 * medição, 2026-09-01: 3 upgrades ⇒ `101 101 101`, inclusive o que seria
 * recusado.** Um baseline que cobrasse `403` seria vermelho para sempre, contra
 * um alvo que este runtime não permite atingir.
 * 🔑 **Portanto a recusa é `connection.close()`, e o que se assere é o EFEITO:
 * a conexão não permanece em `getConnections()`.**
 *
 * ✅ **E o efeito é observável IMEDIATAMENTE — medido, não suposto.** Sonda de
 * 2026-09-01: um `onConnect` que só faz `close()` deixa `getConnections()` em
 * **0**, e 5 recusas seguidas também deixam **0**. **É o que impede o teto de
 * se autotrancar**: se socket recusado continuasse contado, o próprio limitador
 * viraria a negação de serviço que ele existe para evitar.
 *
 * ---
 *
 * 🔒 **A PRÉ-CONDIÇÃO É ASSERIDA, NÃO SUPOSTA** — lição da SEXTA instância
 * (3.5.2): *"baseline cujo cenário não alcança a guarda não é baseline"*. Um
 * teste que só exigisse "não passa de N" ficaria VERDE se os sockets não
 * abrissem de forma nenhuma — que é precisamente o modo de falha mais provável
 * de um teste de WebSocket. Por isso cada caso afirma primeiro que as N
 * conexões sob o teto **abriram e estão contadas**, e só então cobra que a
 * N+1 não entre.
 *
 * 🔒 **`reset()` a cada caso.** `party/smoke.test.ts` mede que este pool NÃO
 * isola automaticamente: a escrita de um teste sobrevive para o seguinte. Com
 * um teto de conexões, os casos passariam a depender da ORDEM — e ficariam
 * verdes escondendo isso.
 */
import { env, reset, runInDurableObject, runDurableObjectAlarm, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ROTA_CRIAR_SALA } from '../src/net/rotas';
import type { Sala } from './sala';

declare global {
  // Mesma augmentação de `party/smoke.test.ts` — sem ela `env.Sala` seria
  // `any` e o `party/tsconfig.test.json` não certificaria nada.
  //
  // ✅ **E o gate JÁ SE PAGOU neste arquivo:** a primeira versão declarava só
  // `Sala` e o `tsc` reprovou os quatro sítios que escrevem `ALLOWED_ORIGINS` /
  // `ENVIRONMENT` (`TS2339`). Sem os dois campos aqui, sobrescrever o `env` no
  // teste seria escrever numa propriedade que o tipo não conhece — e o caso do
  // S4 certificaria uma allowlist que ninguém configurou.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cloudflare {
    interface Env {
      Sala: DurableObjectNamespace<Sala>;
      // ⚠️ **OPCIONAIS, casando com o `Env` de `party/sala.ts`.** Declará-los
      // obrigatórios aqui faz o `Env` de lá deixar de satisfazer `Cloudflare.Env`
      // e quebra a própria produção no `tsc` (`TS2344`/`TS2345`, medido). O
      // teste descreve o ambiente; não pode redefini-lo.
      /** Sobrescrito pelos casos do S4. Ver `src/net/cors.ts`. */
      ALLOWED_ORIGINS?: string;
      /** O SEGUNDO sinal do curinga (adição 1 do dev). */
      ENVIRONMENT?: string;
    }
  }
}

/**
 * O teto de conexões PROPOSTO ao dev: **64 sockets por sala**.
 *
 * 🔒 **O PISO é DITADO pela reconexão, não escolhido.** `QTD_JOGADORES` é 22, e
 * durante um F5 o mesmo jogador ocupa transitoriamente DOIS sockets (o velho,
 * que só sai quando o `close` chega, e o novo). Um teto abaixo de
 * `2 × 22 = 44` faz uma sala cheia se trancar sozinha numa onda de recarga —
 * o limitador virando o problema.
 *
 * ⚠️ **NENHUMA justificativa de CPU está atrelada a este número, de propósito.**
 * A pendência 0(y) registra textualmente *"Não medido: qual o teto real do
 * Durable Object nem qual o custo de um socket ocioso"*, e isso **continua
 * verdadeiro**. 64 é POLÍTICA — folga sobre o piso medido —, não um limite
 * derivado da plataforma. Escrever o contrário seria a afirmação em presente do
 * indicativo que as revisões dos PRs 6 e 7 pegaram duas vezes cada.
 */
const TETO_CONEXOES_PROPOSTO = 64;

/** Uma origem que NÃO está na allowlist — o caso anti-vacuidade do S4. */
const ORIGEM_ESTRANHA = 'https://exemplo-invasor.test';

/** A origem "de produção" deste teste, posta na allowlist. */
const ORIGEM_BOA = 'https://f1-fantasy.exemplo.test';

async function criarSala(): Promise<string> {
  const resposta = await SELF.fetch(`https://exemplo.test${ROTA_CRIAR_SALA}`, {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '198.51.100.1' },
  });
  expect(resposta.status).toBe(200);
  const corpo = (await resposta.json()) as { codigo: string };
  return corpo.codigo;
}

/**
 * Sockets do lado CLIENTE mantidos vivos pelo caso em curso. Ver `abrirSocket`.
 */
let vivos: WebSocket[] = [];

/**
 * Abre um WebSocket pelo caminho REAL (`routePartykitRequest` → DO → `onConnect`).
 *
 * ⚠️ O status devolvido é sempre 101 — ver o docblock do topo. Ele é retornado
 * só para que os casos possam registrar a medição, nunca para asserir recusa.
 *
 * 🔴 **`accept()` NO LADO CLIENTE NÃO É CERIMÔNIA — sem ele o baseline fica
 * vermelho pelo motivo ERRADO, e isso foi MEDIDO, não temido.** A primeira
 * versão deste arquivo devolvia a `Response` e descartava `response.webSocket`.
 * Resultado da rodada: **abrir 64 sockets deixava 21 contados**, 84 deixavam 72,
 * 63 deixavam 52 — números que variam por rodada. A ponta cliente não aceita
 * era descartada pelo runtime e o servidor via o `close`.
 * 🔑 **Um vermelho assim é EXATAMENTE o que a SEXTA instância (3.5.2) proíbe:**
 * ele passaria por baseline sem nunca alcançar a guarda que alega medir, e
 * ficaria verde na implementação por acidente de escalonamento. **Segurar a
 * referência é o que faz o cenário chegar ao teto.**
 */
async function abrirSocket(codigo: string, origem?: string): Promise<Response> {
  const headers: Record<string, string> = { Upgrade: 'websocket' };
  if (origem !== undefined) headers.Origin = origem;
  const resposta = await SELF.fetch(`https://exemplo.test/parties/sala/${codigo}`, { headers });
  const ws = resposta.webSocket;
  if (ws !== null) {
    ws.accept();
    vivos.push(ws);
  }
  return resposta;
}

/** Fecha o que o caso abriu — sem isto um caso contamina a contagem do seguinte. */
function fecharTodos(): void {
  for (const ws of vivos) {
    try {
      ws.close();
    } catch {
      // Já fechado pelo servidor (o caminho da recusa): nada a fazer.
    }
  }
  vivos = [];
}

/** Quantos sockets a sala conta AGORA — a grandeza que este arquivo assere. */
function contarConexoes(codigo: string): Promise<number> {
  const stub = env.Sala.get(env.Sala.idFromName(codigo));
  return runInDurableObject(stub, (sala) => {
    const alvo = sala as unknown as { getConnections: () => Iterable<unknown> };
    return [...alvo.getConnections()].length;
  });
}

describe('S2 — teto de CONEXÕES por sala', () => {
  beforeEach(async () => {
    await reset();
    // 🔒 **O AMBIENTE DE ORIGEM É DECLARADO, NÃO HERDADO — e esta linha nasceu
    // de um vermelho REAL, não de precaução.** Sem ela, os três casos abaixo
    // mediam `0` conexões: a guarda do S4 recusava todo socket antes de o teto
    // ser alcançado, porque o `wrangler.jsonc` traz allowlist vazia +
    // `ENVIRONMENT=production` (o padrão seguro, que RECUSA).
    // 🔑 **Foi a PRÉ-CONDIÇÃO ASSERIDA que pegou isso** — um teste que só
    // cobrasse "não passa de 64" teria ficado VERDE com zero conexões, medindo
    // a guarda errada. É a SEXTA instância (3.5.2) evitada por construção.
    // ⚠️ E o `reset()` não restaura `env`: sem declarar aqui, a ordem dos
    // `describe` decidiria o resultado.
    env.ALLOWED_ORIGINS = '';
    env.ENVIRONMENT = 'development';
  });

  afterEach(() => {
    fecharTodos();
  });

  it('expira conexão sem identificação no alarme, preservando a identificada', async () => {
    const codigo = await criarSala();
    const identificado = await abrirSocket(codigo);
    await abrirSocket(codigo);
    expect(await contarConexoes(codigo)).toBe(2);
    identificado.webSocket!.send(JSON.stringify({ tipo: 'entrar', nome: 'Teste' }));
    const stub = env.Sala.get(env.Sala.idFromName(codigo));
    await expect
      .poll(() =>
        runInDurableObject(stub, async (_sala, ctx) => {
          const estado = await ctx.storage.get<{ jogadorPorConexao: Record<string, string> }>(
            'estado',
          );
          return Object.keys(estado!.jogadorPorConexao).length;
        }),
      )
      .toBe(1);
    await runInDurableObject(stub, (sala) => {
      const conexoes = [...sala.getConnections()];
      for (const c of conexoes) c.setState({ identificarAte: Date.now() - 1 });
    });
    await runDurableObjectAlarm(stub);
    expect(await contarConexoes(codigo)).toBe(1);
  });

  it('🔴 BASELINE: a conexão ACIMA do teto não permanece contada', async () => {
    const codigo = await criarSala();

    for (let i = 0; i < TETO_CONEXOES_PROPOSTO; i += 1) {
      await abrirSocket(codigo);
    }

    // 🔒 PRÉ-CONDIÇÃO ASSERIDA: as conexões sob o teto REALMENTE entraram.
    // Sem esta linha, um ambiente em que nenhum socket abre passaria no teste
    // seguinte por vacuidade — que é o defeito que este projeto já catalogou
    // seis vezes.
    expect(await contarConexoes(codigo)).toBe(TETO_CONEXOES_PROPOSTO);

    await abrirSocket(codigo);

    // O comportamento pretendido: a excedente é fechada e não fica contada.
    expect(await contarConexoes(codigo)).toBe(TETO_CONEXOES_PROPOSTO);
  });

  it('🔴 BASELINE: o teto conta TODAS as conexões, não só quem entrou no roster', async () => {
    const codigo = await criarSala();

    // 🔑 Nenhum destes sockets manda `entrar`. É exatamente a pendência 0(y):
    // *"a guarda de 22 protege o ROSTER, não as CONEXÕES"*. Se o teto fosse
    // sobre `estado.jogadores`, este caso passaria com qualquer número de
    // sockets quietos — e a pendência continuaria aberta com um teto por cima.
    for (let i = 0; i < TETO_CONEXOES_PROPOSTO + 20; i += 1) {
      await abrirSocket(codigo);
    }

    expect(await contarConexoes(codigo)).toBe(TETO_CONEXOES_PROPOSTO);
  });

  it('anti-vacuidade: ABAIXO do teto, toda conexão é aceita', async () => {
    const codigo = await criarSala();

    // Este caso é o que impede o teto de ser implementado como "recusa tudo".
    // Ele passa HOJE e tem de continuar passando DEPOIS — é a metade que o
    // baseline vermelho sozinho não protege.
    for (let i = 0; i < TETO_CONEXOES_PROPOSTO - 1; i += 1) {
      await abrirSocket(codigo);
    }

    expect(await contarConexoes(codigo)).toBe(TETO_CONEXOES_PROPOSTO - 1);
  });
});

describe('S4 — validação de Origin no upgrade', () => {
  beforeEach(async () => {
    await reset();
  });

  afterEach(() => {
    fecharTodos();
  });

  it('🔴 BASELINE: com allowlist configurada, origem ESTRANHA não permanece conectada', async () => {
    env.ALLOWED_ORIGINS = ORIGEM_BOA;
    env.ENVIRONMENT = 'production';
    const codigo = await criarSala();

    // 🔒 PRÉ-CONDIÇÃO ASSERIDA: a origem BOA entra. Sem ela, o caso ficaria
    // verde num mundo em que nenhum upgrade funciona.
    await abrirSocket(codigo, ORIGEM_BOA);
    expect(await contarConexoes(codigo)).toBe(1);

    await abrirSocket(codigo, ORIGEM_ESTRANHA);
    expect(await contarConexoes(codigo)).toBe(1);
  });

  it('🔴 BASELINE: com allowlist configurada, a origem BOA continua entrando', async () => {
    env.ALLOWED_ORIGINS = ORIGEM_BOA;
    env.ENVIRONMENT = 'production';
    const codigo = await criarSala();

    await abrirSocket(codigo, ORIGEM_BOA);
    await abrirSocket(codigo, ORIGEM_BOA);

    // Anti-vacuidade do S4: a guarda não pode ser "recusa todo mundo".
    expect(await contarConexoes(codigo)).toBe(2);
  });

  it('🔴 BASELINE: sem allowlist e SEM sinal de dev, origem qualquer é recusada', async () => {
    // 🔒 É a ADIÇÃO 1 DO DEV (2026-09-01) aplicada ao WebSocket: o curinga
    // exige DOIS sinais. Esquecer de configurar em produção não pode virar
    // "qualquer origem entra" — a falha de OMISSÃO, que é a mais provável.
    env.ALLOWED_ORIGINS = '';
    env.ENVIRONMENT = 'production';
    const codigo = await criarSala();

    await abrirSocket(codigo, ORIGEM_ESTRANHA);
    expect(await contarConexoes(codigo)).toBe(0);
  });

  it('anti-vacuidade: com o sinal de DEV, o curinga vale e a origem entra', async () => {
    env.ALLOWED_ORIGINS = '';
    env.ENVIRONMENT = 'development';
    const codigo = await criarSala();

    await abrirSocket(codigo, ORIGEM_ESTRANHA);
    expect(await contarConexoes(codigo)).toBe(1);
  });
});
