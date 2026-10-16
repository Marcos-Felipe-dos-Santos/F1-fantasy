/**
 * Conexão WebSocket com a sala (PR 3.3) — a casca de I/O do lado do CLIENTE.
 *
 * Simétrica a `party/sala.ts`: lá é a casca do servidor, aqui é a do cliente.
 * Tudo que decide alguma coisa mora em `cliente.ts`, que é puro e testado sem
 * rede; este arquivo só abre socket, manda bytes e reconecta.
 *
 * 🔁 RECONEXÃO AUTOMÁTICA com espera crescente. É o que dá sentido ao token do
 * 3.2.1: cair não pode custar a partida. E, no navegador, a "queda" mais comum
 * não é o socket morrer — é **F5**. Por isso quem guarda o token é a UI, no
 * `localStorage`, e a reconexão funciona igual nos dois casos.
 *
 * ⚠️ Duas regras de reentrada, e a diferença NÃO é detalhe (medida no 3.2.1):
 * - sala **aberta** (lobby): cair É sair, e o token morre junto — o servidor
 *   recusa o `reentrar` com `token-invalido`, e o certo é `entrar` de novo;
 * - sala **iniciada**: o jogador continua na partida, e o `reentrar` devolve a
 *   identidade e o estado.
 * Quem trata o `token-invalido` é a UI; aqui a política é só "apresente o token
 * se você tiver um".
 */

import type { ComandoDraft, ComandoSala, MensagemServidor } from './protocolo';
import { esperaDaTentativa } from './jitter-reconexao';

/** Estado do socket, do ponto de vista de quem olha a tela. */
export type EstadoConexao = 'conectando' | 'aberta' | 'reconectando' | 'fechada';

export interface OpcoesConexao {
  /** Ex.: `ws://127.0.0.1:8787` ou `wss://…`. Sem barra no fim. */
  base: string;
  sala: string;
  /** Chamado a cada mensagem do servidor. */
  aoReceber: (mensagem: MensagemServidor) => void;
  /** Chamado quando o estado do socket muda — a UI mostra isso. */
  aoMudarEstado?: (estado: EstadoConexao) => void;
  /** Chamado quando o socket abre; é aqui que a UI manda `entrar` ou `reentrar`. */
  aoAbrir?: () => void;
}

export interface Conexao {
  enviar: (comando: ComandoSala | ComandoDraft) => void;
  fechar: () => void;
  estado: () => EstadoConexao;
}

/**
 * O sorteio do jitter — **a única fonte de entropia desta casca**.
 *
 * 🔴 **`Math.random` é ERRO DE LINT aqui** (`eslint.config.js`,
 * `no-restricted-properties` sobre `src/net/**`), e `src/net/cerca-lint.test.ts`
 * roda o ESLint de verdade para garantir. **A especificação do H4 pedia
 * `Math.random()` e ela não compila limpo neste diretório.** Afrouxar a cerca
 * estava fora de questão: separar a regra num bloco novo apagaria em silêncio as
 * outras proibições do mesmo bloco — o defeito exato do `CLAUDE.md` §"Cerca de
 * lint: separar regra APAGA a regra".
 *
 * ✅ **`crypto.getRandomValues` passa na cerca** (medido: `npx eslint` exit 0) e
 * é melhor entropia. **Não é `crypto.randomUUID`**, e a diferença importa neste
 * projeto: `randomUUID` exige contexto seguro, e o jogo é servido em
 * `http://192.168.0.13:5173` na LAN (`docs/jogar-em-rede.md`).
 * `getRandomValues` não exige.
 *
 * 🔒 **Isto NÃO fura o determinismo que a cerca protege.** O que ela defende é o
 * REDUTOR — replicado nos 22, onde relógio ou sorteio divergiriam. Este arquivo
 * é a casca de I/O do cliente: já tem `new WebSocket` e `setTimeout`, e **quando
 * a reconexão acontece não entra em estado de jogo nenhum**.
 */
function sortear(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000;
}

/** A URL de uma sala. `partyserver` kebab-caseia o nome do binding: `Sala` → `sala`. */
export function urlDaSala(base: string, sala: string): string {
  return `${base.replace(/\/$/, '')}/parties/sala/${encodeURIComponent(sala)}`;
}

/**
 * Base do WebSocket: **o MESMO host e a MESMA porta da página aberta**.
 *
 * 🔑 Isto é o que faz o jogo funcionar em rede, e a razão é concreta. A versão
 * anterior devolvia `ws://<host>:8787` — porta fixa — e isso quebrava de duas
 * formas ao mesmo tempo: `wrangler dev` sobe em `127.0.0.1` (só localhost), e
 * **cada visitante chega por um IP diferente** (LAN `192.168.x`, ZeroTier
 * `10.x`, Radmin `26.x`, celular pelo Wi-Fi). Não há URL fixa que sirva todos.
 *
 * Derivando de `location.host`, a resposta é sempre certa: quem abriu
 * `http://192.168.0.13:5173` conecta em `ws://192.168.0.13:5173`, e o Vite
 * repassa `/parties/*` para o worker (ver `server.proxy` em `vite.config.ts`).
 * Uma porta só, qualquer interface, sem configurar nada por cliente.
 *
 * `location.host` inclui a porta quando ela existe — é por isso que ele é o
 * campo certo aqui, e não `hostname`.
 */
export function baseParaEstaPagina(
  local: { protocol: string; host: string },
  configurada?: string,
): string {
  // `VITE_WS_BASE` é o escape para quando o worker NÃO está atrás da mesma
  // origem (ex.: publicado em `wss://sala.exemplo.com` com o app noutro host).
  if (configurada !== undefined && configurada.length > 0) return configurada;
  const esquema = local.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${esquema}//${local.host}`;
}

export function abrirConexao(opcoes: OpcoesConexao): Conexao {
  let socket: WebSocket | null = null;
  let estadoAtual: EstadoConexao = 'conectando';
  let tentativa = 0;
  let fechadaDeProposito = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  /** Comandos enviados enquanto o socket estava fora do ar. */
  const pendentes: (ComandoSala | ComandoDraft)[] = [];

  function mudarPara(novo: EstadoConexao): void {
    if (estadoAtual === novo) return;
    estadoAtual = novo;
    opcoes.aoMudarEstado?.(novo);
  }

  function conectar(): void {
    if (fechadaDeProposito) return;
    const ws = new WebSocket(urlDaSala(opcoes.base, opcoes.sala));
    socket = ws;

    ws.addEventListener('open', () => {
      mudarPara('aberta');
      opcoes.aoAbrir?.();
      // O que ficou na fila enquanto estava fora vai agora. A identificação
      // (`entrar`/`reentrar`) sai antes, no `aoAbrir` — daí a ordem importar.
      while (pendentes.length > 0) {
        const comando = pendentes.shift()!;
        try {
          ws.send(JSON.stringify(comando));
        } catch {
          // Socket morreu no meio da drenagem: o resto espera a próxima volta.
          pendentes.unshift(comando);
          break;
        }
      }
    });

    ws.addEventListener('message', (evento) => {
      try {
        const mensagem = JSON.parse(String(evento.data)) as MensagemServidor;
        if (mensagem.tipo === 'estado') tentativa = 0;
        opcoes.aoReceber(mensagem);
      } catch {
        // Mensagem que não é JSON não derruba o cliente — o servidor também
        // não derruba com comando inválido (`aoReceber`, em servidor-sala.ts).
      }
    });

    const reagendar = (): void => {
      if (fechadaDeProposito) return;
      mudarPara('reconectando');
      // 🔁 A escada COM jitter (S15). Sem ele, 22 clientes que caem juntos
      // voltam no mesmo instante — a escada é a mesma para todos, então ela
      // SINCRONIZA a rajada em vez de espalhá-la, e cada volta custa um
      // `onConnect` mais um `reentrar` que devolve o snapshot inteiro.
      // A decisão é pura e mora em `jitter-reconexao.ts`; aqui só entra o
      // sorteio. **O jitter só ADIA, nunca antecipa** — ver o docblock de lá.
      const espera = esperaDaTentativa(tentativa, sortear());
      tentativa += 1;
      timer = setTimeout(conectar, espera);
    };

    ws.addEventListener('close', (evento) => {
      if (evento.code === 4403 || evento.code === 4408) {
        fechadaDeProposito = true;
        if (timer !== null) clearTimeout(timer);
        mudarPara('fechada');
        return;
      }
      reagendar();
    });
    ws.addEventListener('error', () => {
      // `error` costuma vir seguido de `close`; fechar aqui evita ficar preso
      // num socket zumbi quando o navegador não dispara o `close`.
      try {
        ws.close();
      } catch {
        reagendar();
      }
    });
  }

  conectar();

  return {
    enviar(comando) {
      if (socket !== null && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(comando));
        return;
      }
      // Sem socket: guarda pra mandar quando voltar. É isso que faz um clique
      // durante uma queda breve não se perder.
      //
      // Só o ÚLTIMO `escolher` fica: N cliques durante a queda virariam N
      // comandos drenados de uma vez, e o jogador levaria uma enxurrada de
      // `turno-divergente` por algo que não fez de errado. (Jogada fantasma não
      // acontece — `turnoEsperado` cobre isso, porque `rodada` e `indicePeca`
      // são monotônicos e uma coordenada velha nunca volta a valer.)
      if (comando.tipo === 'escolher') {
        const i = pendentes.findIndex((c) => c.tipo === 'escolher');
        if (i !== -1) pendentes.splice(i, 1);
      }
      pendentes.push(comando);
    },
    fechar() {
      fechadaDeProposito = true;
      if (timer !== null) clearTimeout(timer);
      mudarPara('fechada');
      socket?.close();
    },
    estado: () => estadoAtual,
  };
}
