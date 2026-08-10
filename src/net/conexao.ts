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

/** Espera antes de tentar de novo, em ms: 0,5s → 1s → 2s → 4s → 8s (teto). */
const ESPERAS_MS = [500, 1000, 2000, 4000, 8000];

/** A URL de uma sala. `partyserver` kebab-caseia o nome do binding: `Sala` → `sala`. */
export function urlDaSala(base: string, sala: string): string {
  return `${base.replace(/\/$/, '')}/parties/sala/${encodeURIComponent(sala)}`;
}

/**
 * Base padrão a partir da página aberta. Em `npm run dev` o Vite serve na 5173
 * e o worker na 8787, então o default aponta pra 8787 — é o par de portas do
 * fluxo de desenvolvimento descrito no ESTADO.
 */
export function baseParaEstaPagina(local: { protocol: string; hostname: string }): string {
  const esquema = local.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${esquema}//${local.hostname}:8787`;
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
      tentativa = 0;
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
        opcoes.aoReceber(JSON.parse(String(evento.data)) as MensagemServidor);
      } catch {
        // Mensagem que não é JSON não derruba o cliente — o servidor também
        // não derruba com comando inválido (`aoReceber`, em servidor-sala.ts).
      }
    });

    const reagendar = (): void => {
      if (fechadaDeProposito) return;
      mudarPara('reconectando');
      const espera = ESPERAS_MS[Math.min(tentativa, ESPERAS_MS.length - 1)];
      tentativa += 1;
      timer = setTimeout(conectar, espera);
    };

    ws.addEventListener('close', reagendar);
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
