/**
 * O SERVIDOR da sala, sem I/O (PR 3.2).
 *
 * Aqui mora tudo que o Durable Object faz **menos** abrir socket: parsear o
 * JSON de uma conexão, decidir de quem é a mensagem, chamar o redutor certo e
 * dizer **o que responder e pra quem**. `party/sala.ts` é só a casca que liga
 * isso a `partyserver` — e é fina de propósito: o que não é testável sem rede
 * tende a não ser testado.
 *
 * 🔒 O MAPA conexão→jogador vive AQUI, no servidor, e nunca no fio. É ele que
 * responde "quem mandou isto?" — a defesa contra personificação que o 3.1a
 * estabeleceu (nenhum comando carrega `jogadorId`). Uma conexão só vira jogador
 * pelo `entrar`, e o id vem do redutor, não do cliente.
 *
 * 📡 BROADCAST É SNAPSHOT, NÃO DELTA. Toda mudança aceita reenvia o estado
 * público inteiro. Custa mais bytes e compra as três coisas que a rede quebra:
 * mensagem perdida se corrige sozinha no próximo broadcast; mensagem fora de
 * ordem é descartada pelo `seq`; e cliente que entra no meio não precisa de
 * caminho de recuperação separado — o que ele recebe já é o estado todo.
 */

import {
  VERSAO_PROTOCOLO,
  type ComandoDraft,
  type ComandoSala,
  type MensagemServidor,
} from './protocolo';
import {
  criarSala,
  expirarNaSala,
  jogadorDoToken,
  publicarSala,
  reduzirDraftDaSala,
  reduzirSala,
} from './sala';
import { expirados } from './draft-rede';
import { PRAZO_TURNO_MS, type EstadoSala } from './tipos';
import type { Dificuldade } from '../engine/types';

/** Uma mensagem endereçada: `para === null` significa broadcast pra todos. */
export interface Envio {
  para: string | null;
  mensagem: MensagemServidor;
}

/**
 * Estado completo do servidor: a sala + o mapa conexão→jogador. Serializável,
 * porque o Durable Object persiste isto.
 */
export interface EstadoServidor {
  sala: EstadoSala;
  /** conexaoId → jogadorId. Só o `entrar` escreve aqui. */
  jogadorPorConexao: Record<string, string>;
}

export interface ResultadoServidor {
  estado: EstadoServidor;
  envios: Envio[];
}

export function criarServidor(
  salaId: string,
  seedMestre: number,
  dificuldade: Dificuldade,
): EstadoServidor {
  return { sala: criarSala(salaId, seedMestre, dificuldade), jogadorPorConexao: {} };
}

const estadoPara = (estado: EstadoServidor): MensagemServidor => ({
  tipo: 'estado',
  versaoProtocolo: VERSAO_PROTOCOLO,
  estado: publicarSala(estado.sala),
});

/** Broadcast do snapshot + o que mais vier junto. */
function difundir(estado: EstadoServidor, extras: Envio[] = []): ResultadoServidor {
  return { estado, envios: [...extras, { para: null, mensagem: estadoPara(estado) }] };
}

/** Nada mudou: responde só a quem perguntou. */
function soPara(estado: EstadoServidor, conexaoId: string, mensagem: MensagemServidor) {
  return { estado, envios: [{ para: conexaoId, mensagem }] };
}

/** Conexão nova: manda o snapshot corrente só pra ela. Não altera estado. */
export function aoConectar(estado: EstadoServidor, conexaoId: string): ResultadoServidor {
  return soPara(estado, conexaoId, estadoPara(estado));
}

/**
 * Conexão caiu. Antes de a sala iniciar, sair é sair — o roster ainda é móvel.
 * Depois de iniciada, **NÃO** marca ausente: cair não é abandonar, e o jogador
 * pode voltar. Quem decide que ele não volta é o CRONÔMETRO (`aoPassarOTempo`),
 * que é o mesmo critério para quem está com a aba aberta e não joga.
 *
 * O mapa conexão→jogador é limpo; a volta é pelo `reentrar` com o token
 * (PR 3.2.1), que é o único comando de lobby que funciona com a sala iniciada.
 */
export function aoDesconectar(
  estado: EstadoServidor,
  conexaoId: string,
  agora: number,
): ResultadoServidor {
  const jogadorId = estado.jogadorPorConexao[conexaoId];
  if (jogadorId === undefined) return { estado, envios: [] };

  const jogadorPorConexao = { ...estado.jogadorPorConexao };
  delete jogadorPorConexao[conexaoId];

  if (estado.sala.fase === 'aberta') {
    const r = reduzirSala(estado.sala, { tipo: 'sair' }, jogadorId, agora);
    return difundir({ sala: r.estado, jogadorPorConexao });
  }
  return difundir({ ...estado, jogadorPorConexao });
}

/**
 * Mapa conexao->jogador com `conexaoId` apontando para `jogadorId`, e **sem
 * nenhuma outra conexao apontando para esse mesmo jogador**.
 *
 * UMA CONEXAO POR JOGADOR, SEMPRE. Duas chaves vivas para o mesmo jogador
 * significam duas pessoas podendo jogar por ele -- a personificacao que o 3.1a
 * fechou, reaberta pelo lado do mapa. Vale para `entrar` E para `reentrar`: a
 * primeira versao do 3.2.1 so evictava no segundo, e o furo estava no primeiro.
 */
function mapearConexao(
  jogadorPorConexao: Record<string, string>,
  conexaoId: string,
  jogadorId: string,
): Record<string, string> {
  const novo: Record<string, string> = {};
  for (const [conexao, jogador] of Object.entries(jogadorPorConexao)) {
    if (jogador !== jogadorId && conexao !== conexaoId) novo[conexao] = jogador;
  }
  novo[conexaoId] = jogadorId;
  return novo;
}

/** Comandos de lobby e de draft chegam pelo mesmo socket; o tipo separa. */
const EH_DRAFT = new Set(['escolher', 'abandonar']);

/**
 * Processa uma mensagem crua vinda de uma conexão. **Nunca lança**: JSON
 * inválido, tipo desconhecido e payload malformado viram `erro`, porque o
 * cliente é hostil por hipótese.
 */
export function aoReceber(
  estado: EstadoServidor,
  conexaoId: string,
  bruto: string,
  agora: number,
  tokenNovo = '',
): ResultadoServidor {
  let comando: unknown;
  try {
    comando = JSON.parse(bruto);
  } catch {
    return soPara(estado, conexaoId, { tipo: 'erro', erro: 'comando-invalido' });
  }

  const tipo = (comando as { tipo?: unknown } | null)?.tipo;
  if (typeof tipo !== 'string') {
    return soPara(estado, conexaoId, { tipo: 'erro', erro: 'comando-invalido' });
  }

  const remetenteId = estado.jogadorPorConexao[conexaoId] ?? null;

  // Recuperação de identidade: não muda estado, então não difunde nem avança
  // `seq`. Responde `voce-e` se a conexão for jogador, e erro se não for.
  // 🔑 RECONEXÃO. É o único comando de lobby que vale com a sala já iniciada —
  // e o motivo de existir: sem ele, quem cai continua no roster ocupando turno
  // sem ter por onde jogar, até o cronômetro o expulsar.
  if (tipo === 'reentrar') {
    const dono = jogadorDoToken(estado.sala, (comando as { token?: unknown }).token);
    // Uma conexao que JA tem identidade nao troca de identidade: so confunde o
    // estado (o jogador anterior ficaria no roster sem conexao ate expirar) e
    // nao serve a caso legitimo nenhum -- reconectar e sempre de socket novo.
    if (dono === null || (remetenteId !== null && remetenteId !== dono)) {
      return soPara(estado, conexaoId, { tipo: 'erro', erro: 'token-invalido' });
    }
    // Reentrada repetida da MESMA conexao nao muda nada: devolver o MESMO
    // objeto evita que o Durable Object grave a toa (ver `aplicar` em party/).
    if (estado.jogadorPorConexao[conexaoId] === dono) {
      return {
        estado,
        envios: [
          { para: conexaoId, mensagem: { tipo: 'voce-e', jogadorId: dono } },
          { para: conexaoId, mensagem: estadoPara(estado) },
        ],
      };
    }
    const jogadorPorConexao = mapearConexao(estado.jogadorPorConexao, conexaoId, dono);

    const reconectado = { ...estado, jogadorPorConexao };
    return {
      estado: reconectado,
      envios: [
        { para: conexaoId, mensagem: { tipo: 'voce-e', jogadorId: dono } },
        { para: conexaoId, mensagem: estadoPara(reconectado) },
      ],
    };
  }

  // Re-pedido de snapshot: não muda estado, então responde só a quem pediu.
  if (tipo === 'sincronizar') {
    return soPara(estado, conexaoId, estadoPara(estado));
  }

  if (tipo === 'quem-sou') {
    return remetenteId === null
      ? soPara(estado, conexaoId, { tipo: 'erro', erro: 'jogador-desconhecido' })
      : soPara(estado, conexaoId, { tipo: 'voce-e', jogadorId: remetenteId });
  }

  if (EH_DRAFT.has(tipo)) {
    const r = reduzirDraftDaSala(estado.sala, comando as ComandoDraft, remetenteId, agora);
    if (r.erro !== null) {
      return soPara(estado, conexaoId, { tipo: 'erro', erro: r.erro });
    }
    return difundir({ ...estado, sala: r.estado });
  }

  // Um `entrar` sem token gerado gravaria `tokens[id] = ''`: o jogador ficaria
  // sem poder reconectar e so descobriria muito depois. Erro alto no ponto do
  // bug e melhor que falha silenciosa.
  if (tipo === 'entrar' && tokenNovo === '') {
    return soPara(estado, conexaoId, { tipo: 'erro', erro: 'comando-invalido' });
  }

  const r = reduzirSala(estado.sala, comando as ComandoSala, remetenteId, agora, tokenNovo);
  if (r.erro !== null) {
    return soPara(estado, conexaoId, { tipo: 'erro', erro: r.erro });
  }

  // `entrar` aceito e o unico ponto em que uma conexao vira jogador -- e passa
  // pela MESMA eviccao do `reentrar`. `sair` aceito faz o inverso: a conexao
  // deixa de ser jogador, senao continuaria mandando comando por um id que
  // voltou pro bolo e que o proximo a entrar vai receber.
  let jogadorPorConexao = estado.jogadorPorConexao;
  if (r.jogadorId !== undefined) {
    jogadorPorConexao = mapearConexao(jogadorPorConexao, conexaoId, r.jogadorId);
  } else if (tipo === 'sair') {
    jogadorPorConexao = { ...jogadorPorConexao };
    delete jogadorPorConexao[conexaoId];
  }

  const extras: Envio[] =
    r.jogadorId !== undefined
      ? [
          {
            para: conexaoId,
            // O token vai SÓ para quem entrou — nunca em broadcast.
            mensagem: { tipo: 'voce-e', jogadorId: r.jogadorId, token: tokenNovo },
          },
        ]
      : [];

  return difundir({ sala: r.estado, jogadorPorConexao }, extras);
}

/**
 * Tique do relógio: expira quem estourou o prazo. É o servidor que decide isso
 * — nunca um cliente (ver `expirarJogador`). Sem broadcast se ninguém expirou,
 * pra que um tique ocioso não gere tráfego.
 */
export function aoPassarOTempo(
  estado: EstadoServidor,
  agora: number,
  prazoMs: number = PRAZO_TURNO_MS,
): ResultadoServidor {
  if (estado.sala.draft === null) return { estado, envios: [] };
  const vencidos = expirados(estado.sala.draft, agora, prazoMs);
  if (vencidos.length === 0) return { estado, envios: [] };

  let sala = estado.sala;
  for (const jogadorId of vencidos) {
    const r = expirarNaSala(sala, jogadorId, agora);
    if (r.erro === null) sala = r.estado;
  }
  return difundir({ ...estado, sala });
}
