/**
 * Redutor puro da sala (PR 3.1a). Entra `EstadoSala` + `ComandoSala` + o id do
 * remetente (injetado pelo transporte, nunca vindo do fio), sai um
 * `EstadoSala` novo — sem I/O, sem estado global, sem `Math.random()`. O
 * transporte (3.2) só vai ligar mensagem de WebSocket neste redutor.
 *
 * Toda recusa devolve o MESMO objeto de estado (identidade preservada, não só
 * igualdade), o que torna barato pro servidor decidir se precisa fazer
 * broadcast — e nenhuma recusa incrementa `seq`.
 */

import { atribuirPerfis } from '../engine/bots';
import { deriveSeed } from '../engine/rng';
import type { Dificuldade, Jogador } from '../engine/types';
import { criarDraftRede, expirarJogador, reduzirDraft } from './draft-rede';
import {
  MAX_TAMANHO_NOME,
  type ComandoDraft,
  type ComandoSala,
  type ErroDraft,
  type ErroSala,
} from './protocolo';
import {
  MIN_HUMANOS,
  QTD_JOGADORES,
  ROTULO_SEED_DRAFT,
  type EstadoSala,
  type EstadoSalaPublico,
  type JogadorSala,
} from './tipos';

/** Resultado de uma redução. `erro === null` ⇒ o comando foi aceito. */
export interface ResultadoSala {
  estado: EstadoSala;
  erro: ErroSala | null;
  /** Id alocado — só no `entrar` aceito. */
  jogadorId?: string;
}

/** Resultado de um comando de draft aplicado sobre a sala. */
export interface ResultadoSalaOuDraft {
  estado: EstadoSala;
  erro: ErroSala | ErroDraft | null;
}

/** `humano-01` .. `humano-22`. Padding de 2 dígitos pra que a ordem lexicográfica seja a numérica. */
function idHumano(indice: number): string {
  return `humano-${String(indice).padStart(2, '0')}`;
}

/** Ordem canônica da sala: crescente por id. Com o padding, comparar string basta. */
function porId(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Cria uma sala vazia. `seedMestre` é normalizada pra uint32 (`>>> 0`), a
 * mesma convenção de `seedDeTexto` — é o contrato de seed que `createRng` e
 * `deriveSeed` esperam. No 3.2 quem gera esse valor é o Durable Object, que
 * também precisa PERSISTI-LO: regerar a seed depois de um restart mudaria a
 * partida no meio.
 */
export function criarSala(
  salaId: string,
  seedMestre: number,
  dificuldade: Dificuldade,
): EstadoSala {
  return {
    salaId,
    seedMestre: seedMestre >>> 0,
    dificuldade,
    fase: 'aberta',
    anfitriaoId: null,
    jogadores: [],
    roster: null,
    draft: null,
    seq: 0,
  };
}

/** Seed do draft desta partida — derivada, pra que a `seedMestre` não precise sair do DO. */
export function seedDoDraft(estado: EstadoSala): number {
  return deriveSeed(estado.seedMestre, ROTULO_SEED_DRAFT);
}

/**
 * O que vai no fio: tudo do estado menos a `seedMestre`, com a seed do draft
 * no lugar. Campo a campo DE PROPÓSITO, em vez de `{...resto}` com rest
 * destructuring: assim um campo novo em `EstadoSala` — outro segredo, por
 * exemplo — não passa a vazar sozinho por ter sido acrescentado. O teste
 * "publicarSala preserva todo o resto do estado" pega o esquecimento inverso.
 */
export function publicarSala(estado: EstadoSala): EstadoSalaPublico {
  return {
    salaId: estado.salaId,
    seedDraft: seedDoDraft(estado),
    dificuldade: estado.dificuldade,
    fase: estado.fase,
    anfitriaoId: estado.anfitriaoId,
    jogadores: estado.jogadores,
    roster: estado.roster,
    draft: estado.draft,
    seq: estado.seq,
  };
}

/**
 * Monta os 22 jogadores da partida a partir dos humanos da sala: humanos
 * primeiro em ORDEM CANÔNICA DE ID, depois bots `bot-01..` até completar, e
 * `atribuirPerfis` por cima — exatamente a mesma composição do caminho
 * offline (`montarJogadores`, em `fluxo-draft.ts`). Um teste de conformidade
 * compara o resultado desta função com `iniciarDraft(...).jogadores`, então
 * as duas não podem divergir em silêncio.
 *
 * A ordenação explícita por id é defesa em profundidade: mesmo que o array de
 * `jogadores` chegue fora de ordem (round-trip de JSON, merge de estado, bug
 * futuro no redutor), o roster congelado é o mesmo — e com ele `ordemPeca`.
 */
export function congelarRoster(
  jogadores: JogadorSala[],
  seedDraft: number,
  dificuldade: Dificuldade,
): Jogador[] {
  const humanos = [...jogadores].sort(porId);
  const qtdBots = QTD_JOGADORES - humanos.length;
  const base: Jogador[] = [
    ...humanos.map((h): Jogador => ({ id: h.id, tipo: 'humano', nome: h.nome })),
    ...Array.from({ length: qtdBots }, (_, i) => ({
      id: `bot-${String(i + 1).padStart(2, '0')}`,
      tipo: 'bot' as const,
    })),
  ];
  return atribuirPerfis(base, seedDraft, dificuldade);
}

function recusar(estado: EstadoSala, erro: ErroSala): ResultadoSala {
  return { estado, erro };
}

/** Aceita um comando: aplica a mudança e avança `seq`. */
function aceitar(
  estado: EstadoSala,
  mudanca: Partial<EstadoSala>,
  jogadorId?: string,
): ResultadoSala {
  return { estado: { ...estado, ...mudanca, seq: estado.seq + 1 }, erro: null, jogadorId };
}

function entrar(estado: EstadoSala, nome: unknown, remetenteId: string | null): ResultadoSala {
  if (estado.fase !== 'aberta') return recusar(estado, 'sala-iniciada');
  if (typeof nome !== 'string') return recusar(estado, 'nome-invalido');
  if (remetenteId !== null && estado.jogadores.some((j) => j.id === remetenteId)) {
    return recusar(estado, 'ja-na-sala');
  }
  // Aparar DEPOIS do corte também: o `slice` pode ter deixado espaço no fim.
  const nomeAparado = nome.trim().slice(0, MAX_TAMANHO_NOME).trim();
  if (nomeAparado.length === 0) return recusar(estado, 'nome-invalido');
  if (estado.jogadores.length >= QTD_JOGADORES) return recusar(estado, 'sala-cheia');

  // Menor id livre: reusa a vaga de quem saiu, em vez de crescer pra sempre.
  const ocupados = new Set(estado.jogadores.map((j) => j.id));
  let indice = 1;
  while (ocupados.has(idHumano(indice))) indice += 1;
  const id = idHumano(indice);

  const jogadores = [...estado.jogadores, { id, nome: nomeAparado, pronto: false }].sort(porId);
  // Anfitrião é PEGAJOSO: quem entra nunca toma o posto de quem já está. Sem
  // isso, quem reusasse o `humano-01` de um anfitrião que saiu viraria
  // anfitrião ao entrar — e poderia iniciar a partida pelos outros.
  const anfitriaoId = estado.anfitriaoId ?? id;
  return aceitar(estado, { jogadores, anfitriaoId }, id);
}

function sair(estado: EstadoSala, remetenteId: string | null): ResultadoSala {
  if (estado.fase !== 'aberta') return recusar(estado, 'sala-iniciada');
  if (remetenteId === null || !estado.jogadores.some((j) => j.id === remetenteId)) {
    return recusar(estado, 'jogador-desconhecido');
  }
  const jogadores = estado.jogadores.filter((j) => j.id !== remetenteId);
  const anfitriaoId =
    estado.anfitriaoId === remetenteId ? (jogadores[0]?.id ?? null) : estado.anfitriaoId;
  return aceitar(estado, { jogadores, anfitriaoId });
}

function definirPronto(
  estado: EstadoSala,
  pronto: unknown,
  remetenteId: string | null,
): ResultadoSala {
  if (estado.fase !== 'aberta') return recusar(estado, 'sala-iniciada');
  if (typeof pronto !== 'boolean') return recusar(estado, 'comando-invalido');
  if (remetenteId === null || !estado.jogadores.some((j) => j.id === remetenteId)) {
    return recusar(estado, 'jogador-desconhecido');
  }
  const jogadores = estado.jogadores.map((j) => (j.id === remetenteId ? { ...j, pronto } : j));
  return aceitar(estado, { jogadores });
}

function iniciar(estado: EstadoSala, remetenteId: string | null, agora: number): ResultadoSala {
  if (estado.fase !== 'aberta') return recusar(estado, 'sala-iniciada');
  if (remetenteId === null || estado.anfitriaoId !== remetenteId) {
    return recusar(estado, 'nao-e-anfitriao');
  }
  if (estado.jogadores.length < MIN_HUMANOS) return recusar(estado, 'jogadores-insuficientes');
  if (!estado.jogadores.every((j) => j.pronto)) return recusar(estado, 'nem-todos-prontos');

  // Congelar o roster e abrir o draft são o MESMO evento: um roster congelado
  // sem turno aberto seria um estado em que ninguém pode jogar.
  const seedDraft = seedDoDraft(estado);
  const roster = congelarRoster(estado.jogadores, seedDraft, estado.dificuldade);
  return aceitar(estado, {
    fase: 'iniciada',
    roster,
    draft: criarDraftRede(roster, seedDraft, agora),
  });
}

/**
 * Aplica um comando de DRAFT sobre o estado da sala.
 *
 * 🔑 Existe por causa do `seq`. `reduzirDraft` sozinho não sabe da sala, e os
 * comandos de draft não passam por `reduzirSala` — então, sem esta função, o
 * `draft` mudaria por baixo de um `seq` CONGELADO, e o cliente que descarta
 * broadcast atrasado por `seq` (que é a razão de o campo existir) jogaria fora
 * atualizações legítimas ou aceitaria as velhas. Aqui, todo comando aceito
 * avança o contador — lobby ou draft, uma regra só.
 */
export function reduzirDraftDaSala(
  estado: EstadoSala,
  comando: ComandoDraft,
  remetenteId: string | null,
  agora: number,
): ResultadoSalaOuDraft {
  if (estado.fase !== 'iniciada' || estado.draft === null) {
    return { estado, erro: 'sala-nao-iniciada' };
  }
  const r = reduzirDraft(estado.draft, comando, remetenteId, agora);
  if (r.erro !== null) return { estado, erro: r.erro };
  return { estado: { ...estado, draft: r.estado, seq: estado.seq + 1 }, erro: null };
}

/**
 * Expira o turno de um jogador. É ação do SERVIDOR (ver `expirarJogador`), então
 * não vem de `ComandoDraft` — mas passa pelo mesmo contador.
 */
export function expirarNaSala(
  estado: EstadoSala,
  jogadorId: string,
  agora: number,
): ResultadoSalaOuDraft {
  if (estado.fase !== 'iniciada' || estado.draft === null) {
    return { estado, erro: 'sala-nao-iniciada' };
  }
  const r = expirarJogador(estado.draft, jogadorId, agora);
  if (r.erro !== null) return { estado, erro: r.erro };
  return { estado: { ...estado, draft: r.estado, seq: estado.seq + 1 }, erro: null };
}

/**
 * Aplica um comando de lobby em nome de `remetenteId` — o id que o TRANSPORTE
 * associou à conexão, nunca um campo do fio. `null` = conexão que ainda não
 * entrou na sala (só `entrar` faz sentido aí).
 *
 * A guarda de fase é POR HANDLER, não global: os comandos do draft (3.1b) só
 * valem com a sala já iniciada, e uma guarda global obrigaria a reescrever este
 * ponto de entrada em vez de estendê-lo. Comandos de DRAFT não passam por aqui
 * — vão direto pra `reduzirDraft`, sobre `estado.draft`.
 *
 * `agora` (ms) é injetado, nunca lido de relógio: é ele que arma o cronômetro
 * de turno no `iniciar`. Parâmetro obrigatório de propósito — esquecê-lo faria
 * todo turno nascer expirado.
 */
export function reduzirSala(
  estado: EstadoSala,
  comando: ComandoSala,
  remetenteId: string | null,
  agora: number,
): ResultadoSala {
  switch (comando?.tipo) {
    case 'entrar':
      return entrar(estado, comando.nome, remetenteId);
    case 'sair':
      return sair(estado, remetenteId);
    case 'pronto':
      return definirPronto(estado, comando.pronto, remetenteId);
    case 'iniciar':
      return iniciar(estado, remetenteId, agora);
    default:
      // Alcançável em runtime: o cliente manda JSON não confiável, não TS.
      return recusar(estado, 'comando-invalido');
  }
}
