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
  type EscopoHash,
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
import {
  CARENCIA_VAZIO_MS,
  JANELA_DE_GRACA_MS,
  PRAZO_TURNO_MS,
  type EstadoSala,
} from './tipos';
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
  /**
   * Atestados de hash por escopo (PR 3.4). Ver `Atestados` — e note que só
   * existe UM balde por escopo, o da âncora mais alta vista. Isso é o que
   * mantém o estado limitado num log append-only.
   */
  atestados?: Partial<Record<EscopoHash, Atestados>>;
  /**
   * A `VERSAO_APP` desta sala (PR 3.4), fixada por quem entrou primeiro.
   * `undefined` enquanto ninguém entrou; `''` quando quem abriu a sala é um
   * cliente que não manda versão — e aí quem manda também é recusado, porque
   * "não sei a sua versão" não é o mesmo que "a sua versão serve".
   *
   * Mora aqui e não em `EstadoSala` de propósito: é política de ADMISSÃO, não
   * regra de jogo, e `reduzirSala` continua puro e sem saber que versão existe.
   */
  versaoApp?: string;
}

/**
 * Os hashes de UMA âncora, por jogador.
 *
 * 🔒 O servidor não sabe o que estas strings significam — ele não tem o dataset
 * (fronteira do 3.2). Ele só verifica se são todas iguais.
 */
export interface Atestados {
  /** A âncora deste balde: `eventosAplicados`. Só a mais alta é guardada. */
  ancora: number;
  /** jogadorId → hash atestado nesta âncora. */
  porJogador: Record<string, string>;
  /** O alarme já saiu para esta âncora? Evita enxurrada. */
  alarmado: boolean;
}

export interface ResultadoServidor {
  estado: EstadoServidor;
  envios: Envio[];
}

export function criarServidor(
  salaId: string,
  seedMestre: number,
  dificuldade: Dificuldade,
  agora: number,
): EstadoServidor {
  return { sala: criarSala(salaId, seedMestre, dificuldade, agora), jogadorPorConexao: {} };
}

/** O que o servidor deve fazer com a sala neste instante. */
export type DecisaoDeVida =
  | { tipo: 'seguir' }
  /** Reset: descartar estado, log e código. */
  | { tipo: 'encerrar'; motivo: 'vazia' | 'janela-vencida' };

/**
 * Decide o ciclo de vida da sala. **Pura**: recebe `agora` e quantas conexões
 * existem, não lê relógio nem sockets — quem sabe disso é a casca.
 *
 * As duas regras, e por que cada uma:
 * - **Sem ninguém há mais que a carência ⇒ encerra.** Não faz sentido segurar
 *   estado sem ninguém, e é isso que impede a "sala zumbi com draft de dias
 *   atrás" — mas com folga para o criador compartilhar o código e para uma
 *   queda de conexão momentânea (ver `CARENCIA_VAZIO_MS`).
 * - **Partida concluída + janela vencida ⇒ encerra.** A janela existe pra
 *   olhar o resultado, anotar, printar (`JANELA_DE_GRACA_MS`). Passada ela, o
 *   log append-only finalmente tem ponto de descarte — antes crescia pra
 *   sempre, que era metade do problema C2 do PR 3.2.
 */
export function decidirVida(
  estado: EstadoServidor,
  agora: number,
  janelaMs: number = JANELA_DE_GRACA_MS,
  carenciaMs: number = CARENCIA_VAZIO_MS,
): DecisaoDeVida {
  const { vazioDesde, concluidaEm } = estado.sala;
  // 🔴 VAZIA COM CARÊNCIA, não vazia na hora. A primeira versão encerrava no
  // primeiro tique com zero conexões — e como a sala nasce vazia, ela morria
  // em 5 s, antes de o criador conseguir mandar o código pra alguém. O mesmo
  // matava quem trocasse de app no celular estando sozinho.
  if (vazioDesde !== null && agora - vazioDesde >= carenciaMs) {
    return { tipo: 'encerrar', motivo: 'vazia' };
  }
  if (concluidaEm !== null && agora - concluidaEm >= janelaMs) {
    return { tipo: 'encerrar', motivo: 'janela-vencida' };
  }
  return { tipo: 'seguir' };
}

/**
 * Registra quantas conexões existem agora. É o que alimenta a carência de
 * vazio — e mora aqui, e não na casca, porque **decidir é do núcleo**: a
 * primeira versão tomava essa decisão dentro do `onClose` do Durable Object,
 * duplicando `decidirVida` num lugar que nenhum teste alcança.
 */
export function registrarConexoes(
  estado: EstadoServidor,
  conexoesAbertas: number,
  agora: number,
): EstadoServidor {
  const vazio = conexoesAbertas === 0;
  const jaVazio = estado.sala.vazioDesde !== null;
  if (vazio === jaVazio) return estado; // nada mudou: preserva a identidade
  return { ...estado, sala: { ...estado.sala, vazioDesde: vazio ? agora : null } };
}

/**
 * Marca o instante em que a partida terminou, se acabou de terminar. É o que
 * arma a janela de graça — e é idempotente: uma vez marcado, não se mexe mais.
 */
export function marcarConclusao(estado: EstadoServidor, agora: number): EstadoServidor {
  if (estado.sala.concluidaEm !== null) return estado;
  if (estado.sala.draft?.fase !== 'concluido') return estado;
  return { ...estado, sala: { ...estado.sala, concluidaEm: agora } };
}

const estadoPara = (estado: EstadoServidor): MensagemServidor => ({
  tipo: 'estado',
  versaoProtocolo: VERSAO_PROTOCOLO,
  estado: publicarSala(estado.sala),
});

/**
 * Broadcast do snapshot + o que mais vier junto.
 *
 * `agora` entra aqui só para marcar o fim da partida no MESMO evento que a
 * concluiu — se ficasse para o próximo tique, o snapshot que anuncia o fim iria
 * sem `concluidaEm`, e a tela não teria como contar a janela.
 */
function difundir(estado: EstadoServidor, agora: number, extras: Envio[] = []): ResultadoServidor {
  const comConclusao = marcarConclusao(estado, agora);
  return {
    estado: comConclusao,
    envios: [...extras, { para: null, mensagem: estadoPara(comConclusao) }],
  };
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
    return difundir({ sala: r.estado, jogadorPorConexao }, agora);
  }
  return difundir({ ...estado, jogadorPorConexao }, agora);
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
 * Um atestado bem-formado? O cliente é hostil por hipótese.
 *
 * 🔴 **`tetoAncora` NÃO é preciosismo — sem ele o detector se desliga sozinho.**
 * O balde guarda só a âncora mais alta vista, e atestado com âncora menor é
 * ignorado em silêncio (é assim que lag não vira alarme falso). Logo, UMA
 * mensagem com `ancora: 2**40` de qualquer jogador sentado faz todo atestado
 * honesto seguinte cair no ramo do silêncio **pelo resto da partida** — sem
 * derrubar nada, sem inflar nada, apenas apagando a defesa que este PR existe
 * pra criar.
 *
 * O servidor pode barrar isso SEM dataset: a âncora é um índice do log, e o log
 * é dele. Comparar contadores não é entender conteúdo.
 */
function atestadoValido(
  c: unknown,
  tetoAncora: number,
): c is { escopo: EscopoHash; ancora: number; hash: string } {
  const o = c as { escopo?: unknown; ancora?: unknown; hash?: unknown };
  return (
    o.escopo === 'draft' &&
    typeof o.ancora === 'number' &&
    Number.isInteger(o.ancora) &&
    o.ancora >= 0 &&
    o.ancora <= tetoAncora &&
    typeof o.hash === 'string' &&
    // Teto de tamanho: o hash tem 16 hex; aceitar string livre deixaria um
    // cliente hostil inflar o estado persistido do Durable Object de graça.
    /^[0-9a-f]{16}$/.test(o.hash)
  );
}

/**
 * Registra um atestado e decide se o alarme sai (PR 3.4).
 *
 * As três situações, e por que cada uma é tratada assim:
 *
 * - **Âncora MAIOR que a do balde** ⇒ balde novo. O jogo andou; os hashes
 *   antigos não interessam mais e guardar todos faria o estado crescer sem
 *   limite, no mesmo log append-only que já custou o crítico C2 do 3.2.
 * - **Âncora MENOR** ⇒ **IGNORA, em silêncio.** É um cliente legitimamente
 *   atrasado — ele ainda não aplicou os últimos eventos. Alarmar aqui seria o
 *   erro fatal do detector: um alarme que dispara com lag de rede é desligado
 *   pelo dev na primeira semana, e aí a divergência real volta a ser silenciosa.
 * - **Âncora IGUAL** ⇒ compara. Diferente do que já havia ⇒ alarme, uma vez só.
 */
function registrarAtestado(
  estado: EstadoServidor,
  jogadorId: string,
  atestado: { escopo: EscopoHash; ancora: number; hash: string },
): ResultadoServidor {
  const baldes = estado.atestados ?? {};
  const balde = baldes[atestado.escopo];

  if (balde !== undefined && atestado.ancora < balde.ancora) {
    return { estado, envios: [] };
  }

  const base: Atestados =
    balde === undefined || atestado.ancora > balde.ancora
      ? { ancora: atestado.ancora, porJogador: {}, alarmado: false }
      : balde;

  // 🔒 NADA MUDOU ⇒ MESMO OBJETO. O Durable Object grava quando o estado muda
  // de identidade (ver `aplicar` em `party/sala.ts`), então reconstruir o balde
  // a cada atestado daria ~22 escritas por evento de draft — e reenviar o mesmo
  // payload válido seria amplificação de escrita de graça, que é justamente a
  // ameaça que aquele arquivo nomeia como "barata de explorar".
  if (
    balde !== undefined &&
    balde.ancora === atestado.ancora &&
    balde.porJogador[jogadorId] === atestado.hash
  ) {
    return { estado, envios: [] };
  }

  const porJogador = { ...base.porJogador, [jogadorId]: atestado.hash };

  // A referência é o hash MAJORITÁRIO, não o do menor id.
  //
  // 🔑 A diferença é de diagnóstico, e importa: com o menor id como eixo, se
  // quem diverge for justamente o primeiro na ordem, `jogadores` acusaria os 21
  // HONESTOS e inocentaria o divergente. A moda nomeia quem está fora do grupo.
  // Continua sendo pista e não veredito — o servidor não tem dataset e não sabe
  // quem está certo —, mas é uma pista que aponta pro lado certo.
  //
  // Empate (metade e metade) resolve pelo hash menor: arbitrário, porém estável
  // e independente de ordem de chegada, que é o que a comparação exige.
  const ids = Object.keys(porJogador).sort();
  const votos = new Map<string, number>();
  for (const id of ids) {
    const h = porJogador[id];
    votos.set(h, (votos.get(h) ?? 0) + 1);
  }
  let referencia = '';
  let melhor = -1;
  for (const h of [...votos.keys()].sort()) {
    const n = votos.get(h)!;
    if (n > melhor) {
      melhor = n;
      referencia = h;
    }
  }
  const divergentes = ids.filter((id) => porJogador[id] !== referencia);

  const deveAlarmar = divergentes.length > 0 && !base.alarmado;
  const atualizado: Atestados = {
    ancora: atestado.ancora,
    porJogador,
    alarmado: base.alarmado || divergentes.length > 0,
  };

  const novoEstado: EstadoServidor = {
    ...estado,
    atestados: { ...baldes, [atestado.escopo]: atualizado },
  };

  return {
    estado: novoEstado,
    envios: deveAlarmar
      ? [
          {
            para: null,
            mensagem: {
              tipo: 'divergencia',
              escopo: atestado.escopo,
              ancora: atestado.ancora,
              jogadores: divergentes,
            },
          },
        ]
      : [],
  };
}

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

  // A versão declarada por este comando, normalizada. `''` = cliente que não
  // manda versão — tratado como divergente, porque "não sei a sua versão" não é
  // o mesmo que "a sua versão serve".
  const versaoDoCliente = (() => {
    const v = (comando as { versaoApp?: unknown }).versaoApp;
    return typeof v === 'string' ? v : '';
  })();
  const versaoDaSala = estado.versaoApp;

  /**
   * 🔒 HANDSHAKE (PR 3.4). Vale para `entrar` E para `reentrar`.
   *
   * 🔴 O `reentrar` é o caminho que mais importa, e a primeira versão deste PR
   * o deixou passar: entra-se numa sala uma vez, mas reconecta-se a cada F5, e
   * a UI dispara `reentrar` sozinha em todo `open` de socket enquanto houver
   * token no `localStorage`. Um deploy no meio da partida faria o jogador
   * voltar com engine nova numa sala de engine velha — sem passar por
   * verificação nenhuma. Achado da revisão.
   */
  const versaoConfere = versaoDaSala === undefined || versaoDoCliente === versaoDaSala;

  // Recuperação de identidade: não muda estado, então não difunde nem avança
  // `seq`. Responde `voce-e` se a conexão for jogador, e erro se não for.
  // 🔑 RECONEXÃO. É o único comando de lobby que vale com a sala já iniciada —
  // e o motivo de existir: sem ele, quem cai continua no roster ocupando turno
  // sem ter por onde jogar, até o cronômetro o expulsar.
  if (tipo === 'reentrar') {
    if (!versaoConfere) {
      return soPara(estado, conexaoId, { tipo: 'erro', erro: 'versao-divergente' });
    }
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

  // Atestado de hash (PR 3.4). Não difunde snapshot: não muda o jogo, e um
  // broadcast por atestado multiplicaria o tráfego por 22 sem nada mudar.
  if (tipo === 'hash') {
    if (remetenteId === null) {
      return soPara(estado, conexaoId, { tipo: 'erro', erro: 'jogador-desconhecido' });
    }
    // O teto é o tamanho do log: a âncora é um índice dele. Ver `atestadoValido`.
    if (!atestadoValido(comando, estado.sala.draft?.log.length ?? 0)) {
      return soPara(estado, conexaoId, { tipo: 'erro', erro: 'comando-invalido' });
    }
    return registrarAtestado(estado, remetenteId, comando);
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
    return difundir({ ...estado, sala: r.estado }, agora);
  }

  // Um `entrar` sem token gerado gravaria `tokens[id] = ''`: o jogador ficaria
  // sem poder reconectar e so descobriria muito depois. Erro alto no ponto do
  // bug e melhor que falha silenciosa.
  if (tipo === 'entrar' && tokenNovo === '') {
    return soPara(estado, conexaoId, { tipo: 'erro', erro: 'comando-invalido' });
  }

  // Handshake no `entrar` — a metade preventiva. Deixar entrar um build
  // diferente criaria a divergência que o detector então acusaria, e o jogador
  // perderia a partida por algo que dava pra barrar na porta.
  if (tipo === 'entrar' && !versaoConfere) {
    return soPara(estado, conexaoId, { tipo: 'erro', erro: 'versao-divergente' });
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

  // A versão da sala é fixada pelo PRIMEIRO `entrar` ACEITO — nunca por um
  // recusado, senão um cliente hostil fixaria a versão da sala sem entrar nela
  // e trancaria todo mundo do lado de fora.
  // `...estado` nos DOIS ramos, nunca enumerando campos: um campo novo em
  // `EstadoServidor` sumiria em silêncio no caminho do primeiro `entrar`. É a
  // mesma classe da lição da cerca de ESLint no `CLAUDE.md` — bloco posterior
  // que apaga o que não repetiu. Achado da revisão.
  const comVersao: EstadoServidor =
    tipo === 'entrar' && r.jogadorId !== undefined && versaoDaSala === undefined
      ? { ...estado, sala: r.estado, jogadorPorConexao, versaoApp: versaoDoCliente }
      : { ...estado, sala: r.estado, jogadorPorConexao };

  return difundir(comVersao, agora, extras);
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
  return difundir({ ...estado, sala }, agora);
}
