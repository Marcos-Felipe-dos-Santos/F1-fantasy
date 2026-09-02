/**
 * BASELINE VERMELHO do PR H3 — S7, o teto de `sincronizar` por CONEXÃO.
 *
 * 🔴 **Nasce VERMELHO de propósito.** Hoje `onMessage` (`party/sala.ts`) atende
 * todo `sincronizar` que chega, sem olhar quando o anterior chegou. As asserções
 * abaixo descrevem o comportamento PRETENDIDO.
 *
 * 🔑 **NÃO é vermelho de compilação** (regra travada da Fase 3): nada de novo é
 * importado do código de produção. O teste manda o comando pelo caminho real e
 * conta RESPOSTAS. Compila hoje e falha por VALOR.
 *
 * ---
 *
 * 📏 **POR QUE O ALVO É `sincronizar`, MEDIDO e não suposto.** A resposta é
 * `soPara(estado, conexaoId, estadoPara(estado))`: um comando de ~25 bytes
 * devolve o SNAPSHOT INTEIRO a quem pediu. Sonda de 2026-09-01, sala de 22
 * humanos com o log no pior caso que as guardas permitem: **283.810 bytes
 * (277,2 KiB) por resposta**. É amplificação de leitura de graça.
 *
 * ✅ **E o custo legítimo é ZERO — medido, não estimado.** `src/ui/useSalaOnline.ts`
 * NUNCA manda `sincronizar`: os envios do cliente real são `entrar`, `reentrar`,
 * `pronto`, `iniciar`, `hash`(×2), `escolher`, `corrida-concluida` e `sair`.
 * O único remetente no repositório é `src/net/harness.ts:403`, que roda em
 * PASSOS, não em milissegundos, e não passa por esta casca.
 * 🔒 **É isso que sustenta a janela de 2 s com rajada 1:** ela não pode atrasar
 * um cliente real, porque nenhum cliente real usa este comando.
 */
import { env, reset, runInDurableObject, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ROTA_CRIAR_SALA } from '../src/net/rotas';
import type { Sala } from './sala';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    Sala: DurableObjectNamespace<Sala>;
    ALLOWED_ORIGINS: string;
    ENVIRONMENT: string;
  }
}

/** Quantos `sincronizar` seguidos o caso dispara. */
const RAJADA = 6;

async function criarSala(): Promise<string> {
  const resposta = await SELF.fetch(`https://exemplo.test${ROTA_CRIAR_SALA}`, {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '198.51.100.7' },
  });
  expect(resposta.status).toBe(200);
  return ((await resposta.json()) as { codigo: string }).codigo;
}

let vivos: WebSocket[] = [];

/** Abre o socket pelo caminho real e coleta tudo o que o servidor mandar. */
async function abrirSocket(codigo: string): Promise<{ ws: WebSocket; recebidas: string[] }> {
  const resposta = await SELF.fetch(`https://exemplo.test/parties/sala/${codigo}`, {
    headers: { Upgrade: 'websocket' },
  });
  const ws = resposta.webSocket;
  if (ws === null) throw new Error('pré-condição furada: o upgrade não devolveu socket');
  const recebidas: string[] = [];
  ws.addEventListener('message', (e: MessageEvent) => {
    if (typeof e.data === 'string') recebidas.push(e.data);
  });
  // 🔴 `accept()` do lado cliente não é cerimônia — ver `conexoes.test.ts`.
  ws.accept();
  vivos.push(ws);
  return { ws, recebidas };
}

function fecharTodos(): void {
  for (const ws of vivos) {
    try {
      ws.close();
    } catch {
      // já fechado pelo servidor
    }
  }
  vivos = [];
}

/** Dá ao workerd a chance de entregar as mensagens em voo. */
const drenar = (): Promise<void> => new Promise((r) => setTimeout(r, 50));

/** Quantas respostas de SNAPSHOT chegaram (é o que `sincronizar` devolve). */
function contarSnapshots(recebidas: string[]): number {
  return recebidas.filter((t) => {
    try {
      return (JSON.parse(t) as { tipo?: string }).tipo === 'estado';
    } catch {
      return false;
    }
  }).length;
}

describe('S7 — teto de `sincronizar` por conexão', () => {
  beforeEach(async () => {
    await reset();
    // Mesma declaração explícita de `conexoes.test.ts`: sem ela a guarda de
    // Origin do H2 recusa o socket e o caso mede vacuidade.
    env.ALLOWED_ORIGINS = '';
    env.ENVIRONMENT = 'development';
  });

  afterEach(() => {
    fecharTodos();
  });

  it('🔴 BASELINE: uma rajada de `sincronizar` devolve UM snapshot, não um por comando', async () => {
    const codigo = await criarSala();
    const { ws, recebidas } = await abrirSocket(codigo);
    await drenar();

    // 🔒 PRÉ-CONDIÇÃO ASSERIDA: o socket está vivo e o servidor RESPONDE a este
    // comando. Sem isto, um ambiente em que nada trafega passaria por vacuidade.
    ws.send(JSON.stringify({ tipo: 'sincronizar' }));
    await drenar();
    expect(contarSnapshots(recebidas)).toBeGreaterThanOrEqual(1);

    const depoisDoPrimeiro = contarSnapshots(recebidas);
    for (let i = 0; i < RAJADA; i += 1) {
      ws.send(JSON.stringify({ tipo: 'sincronizar' }));
    }
    await drenar();

    // O ALVO: dentro da janela, a rajada inteira não rende snapshot nenhum.
    expect(contarSnapshots(recebidas) - depoisDoPrimeiro).toBe(0);
  });

  it('🔒 o mapa de baldes ENCOLHE quando a conexão fecha (M5)', async () => {
    const codigo = await criarSala();
    const stub = env.Sala.get(env.Sala.idFromName(codigo));
    const tamanho = (): Promise<number> =>
      runInDurableObject(stub, (sala) => {
        const alvo = sala as unknown as { baldesSincronizar: Map<string, unknown> };
        return alvo.baldesSincronizar.size;
      });

    const abertos: WebSocket[] = [];
    for (let i = 0; i < 5; i += 1) {
      const { ws } = await abrirSocket(codigo);
      ws.send(JSON.stringify({ tipo: 'sincronizar' }));
      abertos.push(ws);
    }
    await drenar();

    // 🔒 PRÉ-CONDIÇÃO ASSERIDA: os baldes REALMENTE nasceram. Sem esta linha o
    // caso ficaria verde num ambiente em que nada trafega — vacuidade.
    expect(await tamanho()).toBe(5);

    for (const ws of abertos) ws.close();
    await drenar();

    // O ALVO: o mapa não é vazamento proporcional ao churn de conexões.
    expect(await tamanho()).toBe(0);
  });

  it('🔴 BASELINE: a rajada não deixa a conexão MUDA para os outros comandos', async () => {
    const codigo = await criarSala();
    const { ws, recebidas } = await abrirSocket(codigo);
    await drenar();

    for (let i = 0; i < RAJADA; i += 1) {
      ws.send(JSON.stringify({ tipo: 'sincronizar' }));
    }
    await drenar();

    // ANTI-BANIMENTO: o teto vale para `sincronizar`, não para a conexão.
    // Um limitador que calasse o socket inteiro seria a negação de serviço que
    // ele existe para evitar — mesma disciplina do `avaliarTeto` do H1.
    const antes = recebidas.length;
    ws.send(JSON.stringify({ tipo: 'entrar', nome: 'Ana' }));
    await drenar();
    expect(recebidas.length).toBeGreaterThan(antes);
  });
});
