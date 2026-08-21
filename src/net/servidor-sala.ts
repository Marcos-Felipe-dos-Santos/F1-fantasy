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
  estadoDasSeeds,
  expirarNaSala,
  jogadorDoToken,
  nEtapasDaSala,
  publicarSala,
  reduzirDraftDaSala,
  reduzirSala,
} from './sala';
import { expirados } from './draft-rede';
import {
  CARENCIA_VAZIO_MS,
  JANELA_DE_GRACA_MS,
  PRAZO_TURNO_MS,
  TIMEOUT_FIM_DE_CORRIDA_MS,
  type EstadoSala,
  type SeedsDoCampeonato,
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
   * Atestados de hash por `${escopo}:${etapa}` (PR 3.4; a etapa entrou no
   * 3.5.2). Ver `Atestados` — e note que só existe UM balde por chave, o da
   * âncora mais alta vista. Isso é o que mantém o estado limitado num log
   * append-only.
   *
   * 🔒 **O TETO DO NÚMERO DE BALDES É `escopos × nEtapas`, e ele não é
   * acidente.** A partir do 3.5.2 a chave passa a depender de um número que
   * **vem do cliente**, e o estado é PERSISTIDO no Durable Object: sem teto,
   * uma sequência de `etapa` distintas cresceria o storage sem limite —
   * amplificação de escrita, que `party/sala.ts` nomeia como "barata de
   * explorar". Quem impõe o teto é `atestadoValido`, no mesmo lugar e pelo
   * mesmo motivo que o `tetoAncora` já existente.
   */
  atestados?: Record<string, Atestados>;
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
  /**
   * A ETAPA deste balde (3.5.2). Redundante com a chave `${escopo}:${etapa}`
   * de propósito: é ela que permite ignorar em silêncio o cliente atrasado
   * (decisão D1) sem parsear a chave de volta, e é ela que vai no alarme (D2).
   */
  etapa: number;
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
  /** Seeds do campeonato, sorteadas na casca. Sem default — ver `criarSala`. */
  seeds: SeedsDoCampeonato,
  /** Quantas etapas o campeonato tem. Obrigatório — ver `criarSala`. */
  nEtapas: number,
): EstadoServidor {
  return {
    sala: criarSala(salaId, seedMestre, dificuldade, agora, seeds, nEtapas),
    jogadorPorConexao: {},
  };
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
 * Marca o instante em que a CORRIDA ficou disponível (o draft concluiu), se
 * acabou de acontecer. Idempotente: uma vez marcado, não se mexe mais.
 *
 * 🔑 **Antes do PR 3/4 esta função marcava `concluidaEm`** — ou seja, o fim do
 * draft armava a janela de graça de 10 minutos, que então corria DURANTE o
 * replay da corrida. A sala podia fechar com gente ainda assistindo. Agora ela
 * marca `corridaAbertaEm`, que é só a âncora do timeout da barreira; quem
 * marca `concluidaEm` é `avaliarBarreiraDaCorrida`.
 */
/**
 * 🔒 Os dois campos da barreira, lidos de um estado que pode ter vindo do
 * storage **sem eles**.
 *
 * O Durable Object devolve o objeto persistido CRU, sem migração de schema
 * (`carregar()` em `party/sala.ts`). Uma sala gravada ANTES do PR 3/4 não tem
 * `corridaAbertaEm` nem `atestaramFimDaCorrida`, e `undefined` não é `null`:
 * um `!== null` deixaria `marcarCorridaAberta` retornar cedo para sempre — a
 * corrida nunca abriria, a barreira nunca fecharia, `concluidaEm` ficaria
 * `null` eternamente e o log append-only perderia o ponto de descarte que o C2
 * do 3.2 criou. E `undefined.includes(...)` lançaria dentro do `onMessage`,
 * quebrando a promessa de `aoReceber` de **nunca lançar**.
 *
 * Mesmo precedente e mesmo motivo do `estado.tokens ?? {}` em
 * `sala.ts` (`jogadorDoToken`), escrito quando `tokens` entrou no 3.2.1.
 * Ler por aqui, e nunca direto do campo, é o que impede o próximo sítio de
 * esquecer.
 */
const abertaEmDe = (sala: EstadoSala): number | null => sala.corridaAbertaEm ?? null;
const atestadosDe = (sala: EstadoSala): string[] => sala.atestaramFimDaCorrida ?? [];

/**
 * O cursor de etapas desta sala, para uso do SERVIDOR (3.5.2).
 *
 * 🔒 **É a ÚNICA leitura tolerante de `etapaAtual` que sobrou, e ela existe por
 * um motivo diferente do que a pendência 0(r) fechou.** A 0(r) tratava das
 * leituras `?? 0` no caminho das SEEDS — lá, cursor fora de forma agora é
 * `corrompida` e a sala é recusada (`estadoDasSeeds`), porque é o cursor que
 * decide quantos segredos saem no fio. Aqui não há segredo em jogo: uma sala
 * LEGADO (pré-3.5.1) não tem `etapaAtual` em runtime e mesmo assim precisa
 * bucketizar atestados de draft, que é o escopo que o 3.4 protege. Etapa 0 é a
 * única leitura sensata para quem não tem campeonato.
 *
 * Uma função só, num lugar só — o oposto dos três `?? 0` espalhados que a 0(r)
 * registrava como inconsistência de tese.
 */
function cursorDaSala(sala: EstadoSala): number {
  const cursor = sala.etapaAtual;
  return typeof cursor === 'number' && Number.isInteger(cursor) && cursor >= 0 ? cursor : 0;
}

export function marcarCorridaAberta(estado: EstadoServidor, agora: number): EstadoServidor {
  if (abertaEmDe(estado.sala) !== null) return estado;
  if (estado.sala.draft?.fase !== 'concluido') return estado;
  return { ...estado, sala: { ...estado.sala, corridaAbertaEm: agora } };
}

/**
 * Quem precisa atestar o fim da corrida para a barreira fechar: os humanos
 * ATIVOS do draft.
 *
 * 🔒 **Ausentes fora, e isso não é detalhe:** se contassem, qualquer sala com
 * um abandono nunca fecharia por atestado e cairia sempre no timeout inteiro —
 * a barreira viraria enfeite. Bots também não entram: não têm cliente para
 * atestar coisa nenhuma.
 *
 * ✅ **A PENDÊNCIA 0(k) FOI FECHADA AQUI, NO 3.5.2 — o conjunto DEIXOU de
 * congelar.** Ele agora exige, além de humano e não-ausente, **ter conexão
 * viva** (`jogadorPorConexao`). Era limite conhecido e aceitável enquanto
 * havia UMA corrida: o timeout era teto pago uma vez. Com N etapas ele virava
 * bloqueante — quem fechasse a aba na etapa 1 faria **cada uma** das etapas
 * seguintes pagar `TIMEOUT_FIM_DE_CORRIDA_MS`, cinco minutos de sala parada
 * por etapa, com todo mundo esperando um jogador que não vai voltar.
 *
 * 🔑 **Por que "com conexão" e não "marcar ausente":** `aoDesconectar` não
 * marca ausente com a sala iniciada (e não deve — quem cai e volta pelo token
 * continua sendo jogador), e `abandonar` é recusado depois da conclusão do
 * draft. Ler a presença direto do mapa de conexões é o que já existe e é
 * verdade no instante da avaliação. **Quem reconecta volta a ser elegível
 * sozinho**, sem caminho de cura especial.
 *
 * ⚠️ **O que isto NÃO resolve:** a sala em que TODOS caíram tem `elegiveis`
 * vazio, e aí o guarda `elegiveis.length > 0` em `avaliarBarreiraDaCorrida`
 * segura a conclusão até o timeout — de propósito. Sem ele, `every` sobre
 * lista vazia é `true` e o campeonato inteiro concluiria sozinho no primeiro
 * instante em que a sala ficasse sem ninguém.
 */
function elegiveisDaBarreira(estado: EstadoServidor): string[] {
  const draft = estado.sala.draft;
  if (draft === null) return [];
  const conectados = new Set(Object.values(estado.jogadorPorConexao));
  return draft.humanos.filter((id) => !draft.ausentes.includes(id) && conectados.has(id));
}

/**
 * Registra que um jogador terminou a corrida. Idempotente **por identidade**:
 * um atestado repetido devolve o MESMO objeto, então `aplicar` (na casca) não
 * grava no Durable Object. Sem isso, 22 clientes reatestando a cada reconexão
 * seriam 22 escritas de graça.
 */
export function atestarFimDaCorrida(estado: EstadoServidor, jogadorId: string): EstadoServidor {
  const ja = atestadosDe(estado.sala);
  if (ja.includes(jogadorId)) return estado;
  return {
    ...estado,
    sala: { ...estado.sala, atestaramFimDaCorrida: [...ja, jogadorId] },
  };
}

/**
 * 🏁 **A BARREIRA DO FIM DA CORRIDA** (PR 3/4 de "corrida online").
 *
 * Fecha `concluidaEm` quando **todos os elegíveis atestaram** ou quando o
 * **timeout venceu** para quem nunca chega. É o que decide "a partida acabou"
 * — e é o que arma a janela de graça a partir daí.
 *
 * 🔑 **Ela NÃO bloqueia ninguém.** Retomando o plano da Fase 3 ("cada um no seu
 * ritmo, com barreira no fim + timeout") e a qualificação que o dev travou:
 * **é mecanismo de ciclo de vida, não portão de UI.** Ninguém espera numa tela
 * pelos atestados alheios — a `seedCorrida` já vai no snapshot assim que o
 * draft conclui, e cada cliente corre sozinho. Se fosse barreira de LARGADA,
 * um jogador parado no resumo prenderia os outros pelo timeout inteiro; foi
 * exatamente esse desenho que o dev recusou.
 *
 * Idempotente por identidade, como todo redutor deste arquivo.
 *
 * 🏆 **NO 3.5.2 ELA PASSOU A MOVER O CURSOR — e continua sendo a MESMA
 * barreira, não uma segunda.** Fechada a barreira da etapa k:
 * - se **ainda há etapa depois**, o cursor vai a `k+1`, os atestados **zeram**
 *   e o relógio **re-ancora** em `agora`. É esse re-ancoramento que dá à etapa
 *   nova o seu próprio `TIMEOUT_FIM_DE_CORRIDA_MS`; sem ele a etapa 2 nasceria
 *   com o timeout da etapa 1 já vencido e concluiria sozinha na hora;
 * - se **era a última**, marca `concluidaEm` — e só aí a janela de graça arma.
 *
 * 🔒 **O CURSOR PARA EM `nEtapas - 1`; quem diz "acabou" é `concluidaEm`.**
 * Deixá-lo passar para `nEtapas` criaria um SEGUNDO jeito de dizer a mesma
 * coisa, e o cliente teria duas fontes para "o campeonato terminou" — a classe
 * de bug do 8.4 em miniatura, que este projeto já pagou uma vez. Também é o
 * que mantém o cursor dentro da faixa que o discriminante agora exige
 * (pendência 0(r)).
 *
 * 🔒 **O AVANÇO É PELA BARREIRA, NUNCA PELO ANFITRIÃO** (decisão travada do
 * plano do 3.5): com a sala iniciada, `anfitriaoId` não é reatribuído se o
 * host cair, então avanço por host teria modo de falha "sala encalhada para
 * sempre".
 */
export function avaliarBarreiraDaCorrida(
  estado: EstadoServidor,
  agora: number,
  timeoutMs: number = TIMEOUT_FIM_DE_CORRIDA_MS,
): EstadoServidor {
  if (estado.sala.concluidaEm !== null) return estado;
  const abertaEm = abertaEmDe(estado.sala);
  if (abertaEm === null) return estado;

  const atestaram = atestadosDe(estado.sala);
  const elegiveis = elegiveisDaBarreira(estado);
  // 🔒 `elegiveis.length > 0` não é defensividade vazia: sem ele, uma sala em
  // que TODOS os humanos viraram ausentes teria `every` sobre lista vazia =
  // `true` e fecharia a corrida no instante em que o draft concluísse — de
  // novo armando a janela de graça cedo demais, que é o defeito que este PR
  // existe para consertar. Com o guarda, esse caso resolve pelo timeout.
  const todosAtestaram =
    elegiveis.length > 0 && elegiveis.every((id) => atestaram.includes(id));
  const venceu = agora - abertaEm >= timeoutMs;
  if (!todosAtestaram && !venceu) return estado;

  const nEtapas = nEtapasDaSala(estado.sala);
  // 🔒 **Aviso N2 da revisão: o valor TOLERADO não pode ser escrito de volta.**
  // `cursorDaSala` devolve 0 para um cursor fora de forma — o que é certo para
  // BUCKETIZAR atestado de sala legado —, mas aqui o resultado vira
  // `etapaAtual: cursor + 1` no estado persistido: uma sala com `etapaAtual:
  // -3` (que `estadoDasSeeds` classifica `corrompida`) sairia daqui com
  // `etapaAtual: 1`, **curada em silêncio**. Curar corrupção é exatamente o que
  // o discriminante do 3.5.1 existe para não fazer.
  //
  // 🔴 **A PRIMEIRA VERSÃO DESTA GUARDA CHECAVA SÓ A FORMA DO CURSOR, e o
  // comentário afirmava que ela localizava a invariante inteira — mais forte do
  // que o código.** Pego pela SEGUNDA passada da revisão (aviso 1) e medido: uma
  // sala v2 que perde `nEtapas` **com o cursor em 0** tem `nEtapasDaSala` no
  // piso 1, `cursorIntegro(0, 1)` verdadeiro, guarda passando — e a linha
  // seguinte marcava `concluidaEm`. **Era o modo de falha do bloqueante C1
  // intacto dentro da camada pura**, defendido só pelo `jogavel()` da casca,
  // exatamente como antes do conserto. Escrever a garantia no comentário não a
  // implementa — é a classe de defeito que este PR inteiro existe para combater.
  //
  // 🔒 Por isso a guarda consulta **`estadoDasSeeds`, a MESMA autoridade do
  // discriminante**, em vez de uma checagem paralela: checagem paralela é como
  // se chega a duas respostas para a mesma pergunta, que é a pendência 0(t).
  // Sala `legado` NÃO é recusada aqui — ela é pré-3.5.1, é campeonato de uma
  // etapa e tem de continuar fechando a barreira (anti-vacuidade própria).
  //
  // ⚠️ **Houve por um momento um SEGUNDO cheque aqui** (`etapaAtual !==
  // undefined && !cursorIntegro(...)`), e ele foi **removido por medição, não
  // por gosto**: com o cheque do discriminante na frente, nenhuma mutação
  // conseguia matá-lo — `M-N2` passou a deixar a suíte inteira verde. Guarda
  // que nenhuma mutação mata é guarda morta, e guarda morta ao lado de um
  // comentário que a explica é a próxima afirmação falsa esperando leitor.
  // (Ela era de fato inalcançável: numa sala `legado` o `nEtapas` é 1, então o
  // ramo de avanço — o único que escreve o cursor de volta — nunca roda.)
  if (estadoDasSeeds(estado.sala).tipo === 'corrompida') {
    return estado;
  }

  const cursor = cursorDaSala(estado.sala);
  if (cursor >= nEtapas - 1) {
    return { ...estado, sala: { ...estado.sala, concluidaEm: agora } };
  }

  return {
    ...estado,
    sala: {
      ...estado.sala,
      etapaAtual: cursor + 1,
      // Os dois campos da barreira são POR ETAPA a partir daqui. Reusar os
      // nomes de "corrida" em vez de criar `etapaAbertaEm`/`atestaramFimDaEtapa`
      // é deliberado: `abertaEmDe`/`atestadosDe` já fazem a leitura defensiva
      // do estado persistido pré-PR-3/4, e um segundo par de leitores faria
      // sala antiga parecer que nunca abriu corrida. Estes dois campos, de
      // fato, não mudaram de formato — só de significado (passaram a ser POR
      // ETAPA).
      //
      // ⚠️ **Esta nota já afirmou "sem bump de `VERSAO_ESTADO_SALA` — o formato
      // não mudou", e era FALSO** (bloqueante C1 da revisão): o mesmo PR
      // acrescentou `nEtapas` ao estado persistido, o que é mudança de formato.
      // A versão subiu para **2** e `nEtapas` entrou em `estadoDasSeeds`.
      // Corrigido aqui, e não só contradito lá, porque nota antiga sobrevivente
      // ao lado da regra nova devolve o mesmo estrago.
      atestaramFimDaCorrida: [],
      corridaAbertaEm: agora,
    },
  };
}

const estadoPara = (estado: EstadoServidor): MensagemServidor => ({
  tipo: 'estado',
  versaoProtocolo: VERSAO_PROTOCOLO,
  estado: publicarSala(estado.sala),
});

/**
 * Broadcast do snapshot + o que mais vier junto.
 *
 * `agora` entra aqui só para marcar a abertura da corrida no MESMO evento que
 * concluiu o draft — se ficasse para o próximo tique, o snapshot que anuncia o
 * fim do draft iria sem `corridaAbertaEm`, e a tela não saberia que a corrida
 * começou.
 *
 * 🔑 **Só `marcarCorridaAberta` roda aqui — `concluidaEm` NÃO.** Até o PR 3/4
 * este ponto marcava o fim da partida, e era o defeito: o fim do DRAFT armava a
 * janela de graça. Quem fecha `concluidaEm` agora é a barreira, e ela é
 * avaliada onde há informação para isso (o atestado e o tique), nunca em todo
 * broadcast. Manter a chamada antiga aqui faria a barreira nunca decidir nada
 * e a suíte continuaria verde — mesma forma do bug do 8.4.
 */
function difundir(estado: EstadoServidor, agora: number, extras: Envio[] = []): ResultadoServidor {
  const comCorridaAberta = marcarCorridaAberta(estado, agora);
  return {
    estado: comCorridaAberta,
    envios: [...extras, { para: null, mensagem: estadoPara(comCorridaAberta) }],
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
 * Os valores de `EscopoHash` aceitos pelo servidor, numa forma que o
 * TypeScript FORÇA a manter em sincronia com o tipo (PR 2/4 de "corrida
 * online").
 *
 * 🔒 `satisfies Record<EscopoHash, true>` é a trava: se `EscopoHash` ganhar
 * um membro novo e este objeto não for atualizado, a linha abaixo **para de
 * compilar** (falta a chave obrigatória) — `npm run typecheck`/`build`
 * reprovam antes de qualquer teste rodar. É a mesma disciplina do `Omit` em
 * `EstadoSala` e da união `CorDePista`: o tipo, não a memória de quem edita,
 * é quem garante a sincronia.
 *
 * (Verificado manualmente durante a implementação: acrescentar um escopo
 * fictício a `EscopoHash` sem atualizar este objeto faz `tsc --noEmit`
 * reprovar com "Property '<novo>' is missing in type '{ draft: true;
 * corrida: true; }'ˮ — exatamente o efeito pretendido.)
 */
const ESCOPOS_VALIDOS = { draft: true, corrida: true } satisfies Record<EscopoHash, true>;

/** `escopo` é um dos valores de `EscopoHash`? Deriva de `ESCOPOS_VALIDOS`, nunca duplica a lista. */
function escopoValido(escopo: unknown): escopo is EscopoHash {
  return typeof escopo === 'string' && Object.hasOwn(ESCOPOS_VALIDOS, escopo);
}

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
 *
 * `escopo` aceita qualquer `EscopoHash` (via `escopoValido`), não só
 * `'draft'` — desde o PR 2/4 de "corrida online". O docblock do `escopo` em
 * `protocolo.ts` já prometia isso "sem mudar o protocolo": o tipo já era a
 * união desde o 3.4/2-de-4; o que faltava era esta validação parar de travar
 * na string literal antiga.
 *
 * 🔴 **`etapa` tem TETO PELO MESMO MOTIVO QUE `ancora`, e o motivo é ainda mais
 * direto aqui** (3.5.2): desde este PR a etapa entra na CHAVE do balde
 * (`${escopo}:${etapa}`), então ela deixa de ser um número comparado e passa a
 * criar entrada nova no estado PERSISTIDO. Um cliente mandando 10 mil etapas
 * distintas escreveria 10 mil baldes no Durable Object. Com o teto, o número
 * de baldes é no máximo `escopos × nEtapas`.
 *
 * 🔒 **AUSENTE É VÁLIDO — decisão D1 do dev (2026-08-20).** Cliente antigo não
 * manda `etapa`, e a pendência 0(q) obriga o worker novo a subir ANTES do
 * cliente novo: recusar aqui mataria o detector em silêncio na janela de
 * deploy. Quem preenche o default é `registrarAtestado`, com o `etapaAtual`
 * que o servidor conhece — **nunca `0`**, que reintroduziria o alarme falso.
 */
function atestadoValido(
  c: unknown,
  tetoAncora: number,
  tetoEtapa: number,
): c is { escopo: EscopoHash; ancora: number; hash: string; etapa?: number } {
  const o = c as { escopo?: unknown; ancora?: unknown; hash?: unknown; etapa?: unknown };
  const etapaOk =
    o.etapa === undefined ||
    (typeof o.etapa === 'number' &&
      Number.isInteger(o.etapa) &&
      o.etapa >= 0 &&
      o.etapa <= tetoEtapa);
  return (
    escopoValido(o.escopo) &&
    typeof o.ancora === 'number' &&
    Number.isInteger(o.ancora) &&
    o.ancora >= 0 &&
    o.ancora <= tetoAncora &&
    etapaOk &&
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
 *
 * 🔴 **A ETAPA (3.5.2) — o conserto do alarme falso que travava o campeonato.**
 * O balde passa a ser chaveado por `${escopo}:${etapa}`. Sem isso, a âncora
 * (`draft.log.length`) **para de crescer quando o draft conclui**, então todas
 * as etapas caem no mesmo balde com a mesma âncora e hashes que diferem por
 * `pistaId` **por construção**: alarme falso na virada da etapa 1, travado para
 * o resto do campeonato porque `alarmado` não volta atrás.
 *
 * 🔒 **AS DUAS METADES DA DECISÃO D1 SÃO INSEPARÁVEIS** (dev, 2026-08-20):
 * 1. **default = `etapaAtual` do servidor** quando o cliente não manda o campo
 *    (cliente antigo na janela de deploy da pendência 0(q)). Um default `0`
 *    fixo jogaria os atestados da etapa 3 no balde da etapa 0 e devolveria o
 *    alarme falso inteiro pela porta do conserto;
 * 2. **etapa MENOR que a do balde ⇒ ignora em silêncio**, exatamente como a
 *    âncora já faz. Sem esta metade, o cliente atrasado que ainda atesta a
 *    etapa 0 seria bucketado como etapa 1 (pelo default do item 1) e
 *    compararia o hash da etapa 0 contra os da etapa 1 — o mesmo alarme falso,
 *    de novo, por outra porta. **Uma metade sem a outra é pior que nenhuma.**
 */
function registrarAtestado(
  estado: EstadoServidor,
  jogadorId: string,
  atestado: { escopo: EscopoHash; ancora: number; hash: string; etapa?: number },
): ResultadoServidor {
  const baldes = estado.atestados ?? {};
  const cursor = cursorDaSala(estado.sala);
  // D1, metade 1: ausente ⇒ a etapa que o SERVIDOR sabe estar corrente.
  const etapa = atestado.etapa ?? cursor;

  // D1, metade 2: atrasado na ETAPA cala igual a atrasado na âncora. Sem isto,
  // um retardatário que ainda atesta a etapa que já fechou reabre a comparação
  // de uma corrida que todo mundo terminou — alarme sobre um fato que o
  // jogador não tem mais como agir, que é a definição de ruído.
  if (etapa < cursor) {
    return { estado, envios: [] };
  }

  const chave = `${atestado.escopo}:${etapa}`;
  const balde = baldes[chave];

  if (balde !== undefined && atestado.ancora < balde.ancora) {
    return { estado, envios: [] };
  }

  const base: Atestados =
    balde === undefined || atestado.ancora > balde.ancora
      ? { ancora: atestado.ancora, etapa, porJogador: {}, alarmado: false }
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
    etapa,
    porJogador,
    alarmado: base.alarmado || divergentes.length > 0,
  };

  const novoEstado: EstadoServidor = {
    ...estado,
    atestados: { ...baldes, [chave]: atualizado },
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
              // D2 (dev, 2026-08-20): o alarme diz QUAL etapa divergiu.
              etapa,
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
    // O teto da ETAPA é `nEtapas - 1` — ela vira CHAVE de balde no estado
    // persistido, então sem teto o cliente escreveria baldes à vontade.
    if (!atestadoValido(comando, estado.sala.draft?.log.length ?? 0, nEtapasDaSala(estado.sala) - 1)) {
      return soPara(estado, conexaoId, { tipo: 'erro', erro: 'comando-invalido' });
    }
    return registrarAtestado(estado, remetenteId, comando);
  }

  /**
   * 🏁 "Terminei a corrida" (PR 3/4). Alimenta a barreira do FIM — nunca a de
   * largada: nada neste servidor segura um cliente esperando os outros.
   *
   * Difunde porque `concluidaEm` pode ter acabado de mudar, e é dele que a
   * tela conta a janela de fechamento. Quando o atestado não move a barreira,
   * `avaliarBarreiraDaCorrida` devolve a mesma referência e o `difundir`
   * apenas repete o snapshot — sem escrita no Durable Object (`aplicar` só
   * grava quando a identidade muda).
   */
  if (tipo === 'corrida-concluida') {
    if (remetenteId === null) {
      return soPara(estado, conexaoId, { tipo: 'erro', erro: 'jogador-desconhecido' });
    }
    // Atestar antes de existir corrida não é comando legítimo de cliente
    // nenhum — é ruído ou tentativa de fechar a sala dos outros mais cedo.
    if (abertaEmDe(estado.sala) === null) {
      return soPara(estado, conexaoId, { tipo: 'erro', erro: 'corrida-nao-comecou' });
    }
    const comAtestado = atestarFimDaCorrida(estado, remetenteId);
    const avaliado = avaliarBarreiraDaCorrida(comAtestado, agora);
    if (avaliado === estado) return soPara(estado, conexaoId, estadoPara(estado));
    return difundir(avaliado, agora);
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

  /**
   * 🏁 Com o draft concluído não há turno para expirar — o que há é a BARREIRA
   * DO FIM DA CORRIDA para avaliar (PR 3/4). É aqui que o timeout vira decisão:
   * sem isto, uma sala em que alguém nunca atesta ficaria com `concluidaEm`
   * null para sempre e a janela de graça nunca começaria.
   *
   * 🔒 **A decisão mora no núcleo, não na casca.** `party/sala.ts` costumava
   * ter o próprio `if (concluidaEm === null)` antes de chamar esta função —
   * lógica de ciclo de vida num lugar que nenhum teste alcança, que é
   * exatamente o defeito que o 3.3.2 corrigiu no `onClose`.
   */
  if (estado.sala.draft.fase === 'concluido') {
    const avaliado = avaliarBarreiraDaCorrida(estado, agora);
    return avaliado === estado ? { estado, envios: [] } : difundir(avaliado, agora);
  }

  const vencidos = expirados(estado.sala.draft, agora, prazoMs);
  if (vencidos.length === 0) return { estado, envios: [] };

  let sala = estado.sala;
  for (const jogadorId of vencidos) {
    const r = expirarNaSala(sala, jogadorId, agora);
    if (r.erro === null) sala = r.estado;
  }
  return difundir({ ...estado, sala }, agora);
}
