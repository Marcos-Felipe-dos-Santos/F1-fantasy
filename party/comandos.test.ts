/**
 * A CASCA do teto de comandos inbound — PR H4, item S3.
 *
 * 🔒 **O que ESTE arquivo cobre e o `src/net/teto-comandos.test.ts` não.** Lá
 * mora a DECISÃO pura (a janela, o teto, a recusa que não reinicia o relógio),
 * testável em `npm test` porque recebe `agora` por parâmetro. Aqui está o que só
 * o `workerd` alcança: que o `onMessage` **consulta** o teto, que a recusa
 * **responde `comandos-demais`** em vez de calar, que o balde é **por conexão** e
 * que ele **morre no `onClose`**.
 *
 * 🔑 **O caso do `onClose` está aqui porque a mutação equivalente SOBREVIVEU no
 * H3.** Lá o `delete` do mapa de baldes ficou sem cobertura na primeira rodada e
 * só a mutação M5 revelou. Desta vez o caso nasce junto com a linha.
 */
import { env, reset, runInDurableObject, SELF } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TETO_COMANDOS } from '../src/net/teto-comandos';
import { ROTA_CRIAR_SALA } from '../src/net/rotas';
import type { Sala } from './sala';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    Sala: DurableObjectNamespace<Sala>;
    ALLOWED_ORIGINS: string;
    ENVIRONMENT: string;
  }
}

async function criarSala(): Promise<string> {
  const resposta = await SELF.fetch(`https://exemplo.test${ROTA_CRIAR_SALA}`, {
    method: 'POST',
    headers: { 'CF-Connecting-IP': '198.51.100.9' },
  });
  expect(resposta.status).toBe(200);
  return ((await resposta.json()) as { codigo: string }).codigo;
}

let vivos: WebSocket[] = [];

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

const drenar = (): Promise<void> => new Promise((r) => setTimeout(r, 50));

function contar(recebidas: string[], erro: string): number {
  return recebidas.filter((t) => {
    try {
      const m = JSON.parse(t) as { tipo?: string; erro?: string };
      return m.tipo === 'erro' && m.erro === erro;
    } catch {
      return false;
    }
  }).length;
}

/**
 * Um comando barato e legítimo, que o servidor aceita repetido — é o sítio sem
 * debounce que motivou o S3 (`TelaLobby.tsx:127`).
 */
function martelar(ws: WebSocket, quantos: number): void {
  for (let i = 0; i < quantos; i += 1) {
    ws.send(JSON.stringify({ tipo: 'quem-sou' }));
  }
}

describe('S3 — teto de comandos inbound por conexão', () => {
  beforeEach(async () => {
    await reset();
    // Sem isto a guarda de Origin do H2 recusa o socket e o caso mede vacuidade
    // — mesma declaração explícita de `conexoes.test.ts` e `sincronizar.test.ts`.
    env.ALLOWED_ORIGINS = '';
    env.ENVIRONMENT = 'development';
  });

  afterEach(() => {
    fecharTodos();
  });

  it('🔴 a rajada além do teto responde `comandos-demais`', async () => {
    const codigo = await criarSala();
    const { ws, recebidas } = await abrirSocket(codigo);
    await drenar();

    // 🔒 PRÉ-CONDIÇÃO ASSERIDA: dentro do teto, NADA é recusado. Sem esta
    // metade, um servidor que recusasse tudo passaria no caso principal.
    martelar(ws, TETO_COMANDOS);
    await drenar();
    expect(contar(recebidas, 'comandos-demais'), 'recusou dentro do teto').toBe(0);

    martelar(ws, 5);
    await drenar();
    expect(contar(recebidas, 'comandos-demais')).toBeGreaterThan(0);
  });

  it('🔴 RESPONDE em vez de calar — é a diferença deliberada para o teto do H3', async () => {
    // O teto de `sincronizar` (H3) recusa em SILÊNCIO porque o cliente real
    // nunca manda aquele comando. Aqui o silêncio faria a jogada do jogador
    // sumir enquanto o cronômetro corre — a 4ª ocorrência de uma família que
    // este projeto já catalogou 3×. Se alguém "uniformizar" os dois tetos
    // fazendo este calar, é aqui que quebra.
    const codigo = await criarSala();
    const { ws, recebidas } = await abrirSocket(codigo);
    await drenar();
    martelar(ws, TETO_COMANDOS + 3);
    await drenar();
    expect(contar(recebidas, 'comandos-demais')).toBeGreaterThan(0);
  });

  it('🔴 `sincronizar` NÃO consome a cota de jogo — isenção deliberada, não acidente', async () => {
    // 🔒 Decisão do dev (2026-09-02): os três caminhos com guarda própria
    // (frame binário, mensagem grande, `sincronizar`) ficam FORA da contagem do
    // S3. Somar puniria o jogador legítimo cujo cliente mandou um `sincronizar`
    // seguido de uma jogada.
    // 🔑 Hoje a isenção é implementada pela ORDEM das guardas no `onMessage`, e
    // ordem não é cerca: quem reordenar "para contar tudo" acha que está
    // consertando. Este caso é a cerca.
    const codigo = await criarSala();
    const { ws, recebidas } = await abrirSocket(codigo);
    await drenar();

    // Muito além do teto de jogo, só de `sincronizar` — o teto do H3 recusa em
    // silêncio, e nada disto pode encostar na cota de jogo.
    for (let i = 0; i < TETO_COMANDOS + 10; i += 1) {
      ws.send(JSON.stringify({ tipo: 'sincronizar' }));
    }
    await drenar();
    expect(
      contar(recebidas, 'comandos-demais'),
      '`sincronizar` consumiu a cota de jogo',
    ).toBe(0);

    // E a cota de jogo tem que estar INTACTA depois disso: o teto inteiro ainda
    // passa. Sem esta metade, um servidor que ignorasse o teto passaria acima.
    martelar(ws, TETO_COMANDOS);
    await drenar();
    expect(contar(recebidas, 'comandos-demais'), 'a cota de jogo foi corroída').toBe(0);

    // Pré-condição de que o teto EXISTE nesta conexão — senão o caso é vácuo.
    martelar(ws, 5);
    await drenar();
    expect(
      contar(recebidas, 'comandos-demais'),
      'o teto de jogo nem sequer dispara — o caso acima seria vácuo',
    ).toBeGreaterThan(0);
  });

  it('🔴 mensagem ACIMA do teto de bytes não consome a cota de jogo', async () => {
    // Mesma isenção, outro caminho: quem responde a mensagem gigante é o teto
    // de `MAX_BYTES_MENSAGEM`, que vem antes.
    const codigo = await criarSala();
    const { ws, recebidas } = await abrirSocket(codigo);
    await drenar();

    const gigante = JSON.stringify({ tipo: 'pronto', pronto: true, lixo: 'x'.repeat(20_000) });
    for (let i = 0; i < TETO_COMANDOS + 10; i += 1) ws.send(gigante);
    await drenar();

    // Pré-condição asserida: a guarda de bytes REALMENTE agiu.
    expect(
      contar(recebidas, 'escolha-grande-demais'),
      'a guarda de bytes não disparou — o caso seria vácuo',
    ).toBeGreaterThan(0);
    expect(contar(recebidas, 'comandos-demais'), 'a mensagem gigante consumiu a cota').toBe(0);
  });

  it('🔴 O BALDE É POR CONEXÃO — quem não abusou não é punido junto', async () => {
    const codigo = await criarSala();
    const abusador = await abrirSocket(codigo);
    const inocente = await abrirSocket(codigo);
    await drenar();

    martelar(abusador.ws, TETO_COMANDOS + 10);
    await drenar();
    expect(contar(abusador.recebidas, 'comandos-demais')).toBeGreaterThan(0);

    // O segundo socket manda POUCO, e tem que ser atendido normalmente.
    martelar(inocente.ws, 3);
    await drenar();
    expect(
      contar(inocente.recebidas, 'comandos-demais'),
      'o balde vazou de uma conexão para a outra',
    ).toBe(0);
  });

  it('🔴 O MAPA DE BALDES ENCOLHE NO `onClose` — sem isso é vazamento por churn', async () => {
    // A classe de defeito que este PR inteiro trata: estrutura que cresce com o
    // abuso e não encolhe. Foi a mutação M5 do H3, que sobreviveu à suíte na
    // primeira rodada — por isso este caso nasce junto com a linha, não depois.
    const codigo = await criarSala();
    const id = env.Sala.idFromName(codigo);
    const stub = env.Sala.get(id);

    const { ws } = await abrirSocket(codigo);
    await drenar();
    martelar(ws, 3);
    await drenar();

    await runInDurableObject(stub, (instancia: Sala) => {
      const mapa = (instancia as unknown as { baldesComandos: Map<string, unknown> })
        .baldesComandos;
      // Pré-condição asserida: o balde EXISTE antes de fechar. Sem ela, um mapa
      // que nunca é preenchido passaria no `toBe(0)` de baixo por vacuidade.
      expect(mapa.size, 'o balde nem chegou a ser criado — o caso seria vácuo').toBeGreaterThan(0);
    });

    ws.close();
    await drenar();

    await runInDurableObject(stub, (instancia: Sala) => {
      const mapa = (instancia as unknown as { baldesComandos: Map<string, unknown> })
        .baldesComandos;
      expect(mapa.size, 'o balde sobreviveu ao onClose — vazamento por churn').toBe(0);
    });
  });
});
