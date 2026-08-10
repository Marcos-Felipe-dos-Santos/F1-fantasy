/**
 * Tipos da camada de rede (Fase 3). PR 3.1a — sala + roster congelado.
 *
 * Este módulo é PURO e sem dependência de rede: nada de `partyserver`,
 * `wrangler`, WebSocket ou React. O transporte é o PR 3.2 e vai ser uma casca
 * fina de I/O por cima daqui — este arquivo tem que continuar rodando dentro
 * de um Durable Object, no Node dos testes e no navegador, sem mudança.
 *
 * 🔒 O SERVIDOR NUNCA CARREGA O DATASET. Nada aqui importa `src/data/` nem
 * `criarDataset`: o estado da sala é seed + roster (+ hashes, no 3.1b/3.4). O
 * único ponto de contato com a engine é `atribuirPerfis` — função pura de
 * `(Jogador[], seed, dificuldade)`, que não toca dataset nenhum.
 */

import type { Dificuldade, Jogador } from '../engine/types';
import { RODADAS_SORTEIO } from '../engine/draft-utils';

/** Total de jogadores de uma partida (§3): humanos da sala + bots até completar. */
export const QTD_JOGADORES = 22;

/** Mínimo de humanos pra iniciar uma partida online — abaixo disso é modo Single, não sala. */
export const MIN_HUMANOS = 2;

/**
 * Rótulo do sub-stream de RNG do draft online.
 *
 * Prefixo `online:` é regra da Fase 3 contra colisão de namespace no
 * `deriveSeed` — os rótulos existentes são `draft:*`, `bots`, `calendario` e
 * `camp:<pistaId>`, e nenhum começa por `online:`. O registro central
 * (`src/engine/namespaces-seed.ts`, com teste que falha em duplicata) entra no
 * 3.1b, quando existirem vários rótulos online pra registrar; com um só, o
 * teste de duplicata seria vazio.
 */
export const ROTULO_SEED_DRAFT = 'online:draft';

/**
 * Fase da sala. `aberta`: entra e sai gente, o roster ainda não existe.
 * `iniciada`: roster CONGELADO — a composição da partida não muda mais.
 * (Abandono depois do início é turno, não roster: fica pro 3.1b.)
 */
export type FaseSala = 'aberta' | 'iniciada';

/** Um humano na sala, antes do congelamento. */
export interface JogadorSala {
  /** `humano-01` .. `humano-22`. Estável e alocado pelo servidor. */
  id: string;
  /**
   * Nome de exibição. NUNCA entra em `deriveSeed` nem em nenhuma decisão de
   * jogo — a engine semeia por `id` (`draft:sorteios:<id>`), e o id é sempre
   * alocado pelo servidor, jamais derivado do nome digitado. Mesma regra do
   * caminho offline (`fluxo-draft.ts`).
   */
  nome: string;
  pronto: boolean;
}

/**
 * O que a sala mostra a todo mundo — é ISTO que vai no broadcast.
 *
 * 🔑 `jogadores` é um ARRAY EXPLÍCITO em ordem canônica crescente de `id`, não
 * um `Record`. A ordem importa: `criarDraft` embaralha `ordemPeca` a partir de
 * `jogadores.map(j => j.id)` (`draft.ts:73`), então dois clientes que
 * montassem o mesmo CONJUNTO de jogadores em ordens diferentes jogariam a
 * rodada 6 em ordens diferentes — e nada avisaria.
 */
export interface EstadoSalaPublico {
  salaId: string;
  /**
   * Seed do DRAFT desta partida, derivada da `seedMestre` (`ROTULO_SEED_DRAFT`).
   * É o que o cliente precisa pra rodar `criarDraft` — e é uma via só: com ela
   * não se recompõe a `seedMestre`, logo não se pré-computa o campeonato.
   */
  seedDraft: number;
  dificuldade: Dificuldade;
  fase: FaseSala;
  /** Menor id presente na sala, ou `null` se a sala está vazia. */
  anfitriaoId: string | null;
  jogadores: JogadorSala[];
  /** Os 22 jogadores congelados no início da partida; `null` enquanto a sala está aberta. */
  roster: Jogador[] | null;
  /** Estado de turno do draft, criado junto com o roster no início; `null` antes disso. */
  draft: EstadoDraftRede | null;
  /**
   * Contador monotônico, incrementado a cada comando ACEITO (recusa não
   * incrementa). O cliente descarta broadcast atrasado ou duplicado por ele —
   * é contra isto que o harness headless do 3.2 (latência, reordenação,
   * duplicação) vai asserir.
   */
  seq: number;
}

/**
 * Rodada em que um jogador terminou os sorteios (§3: rodada 6 = completos).
 * **Derivada de `RODADAS_SORTEIO`**, não escrita como `6`: o limiar de rodada é
 * regra de turno, igual à `ordemPeca`, e dois números mantidos em paralelo
 * entre engine e rede divergiriam em silêncio.
 */
export const RODADA_COMPLETA = RODADAS_SORTEIO + 1;

/**
 * Teto de bytes do payload opaco de uma escolha. O servidor não valida o
 * CONTEÚDO (não tem dataset), mas valida a FORMA — e tamanho é forma. Sem isso,
 * um cliente enfia megabytes no log, que é persistido no Durable Object e
 * rebroadcast aos 22. O lobby já limita o nome; o draft não pode ser a única
 * porta sem limite.
 */
export const MAX_BYTES_ESCOLHA = 2048;

/**
 * Teto de bytes de uma MENSAGEM inteira, aplicado pela casca ANTES do
 * `JSON.parse`. `MAX_BYTES_ESCOLHA` só age depois de parsear e só sobre o campo
 * `escolha`; sem este teto, um payload de megabytes seria desserializado antes
 * de qualquer defesa.
 */
export const MAX_BYTES_MENSAGEM = 8192;

/** Versão do formato de `EstadoDraftRede` persistido pelo Durable Object. */
export const VERSAO_ESTADO_DRAFT = 1;

/**
 * Prazo de um turno, em ms. O redutor é PURO: nunca lê relógio — quem chama
 * injeta `agora`. É por isso que `Date.now` é erro de lint em `src/net/**`.
 */
export const PRAZO_TURNO_MS = 90_000;

/** Fase do draft do ponto de vista da REDE. Espelha `FaseDraft` da engine. */
export type FaseDraftRede = 'sorteios' | 'peca' | 'concluido';

/**
 * Entrada do log append-only. `escolha` é OPACA pro servidor: sem dataset, ele
 * não tem como validar *o que* foi escolhido — só *de quem* é a vez. Quem
 * valida o conteúdo é o cliente, que tem a engine e o dataset.
 */
export interface EventoDraft {
  /** Posição no log, 1-based. Nada derivado do estado pode depender dela. */
  seq: number;
  jogadorId: string;
  tipo: 'escolha' | 'ausencia';
  escolha?: unknown;
}

/**
 * Estado de TURNO do draft no servidor. Não é o `DraftState` da engine e nem
 * tenta ser: aqui não há sorteios, notas, peças reveladas nem loadouts —
 * **nada que exija dataset**. Só quem pode jogar agora.
 *
 * 🔑 Nada aqui deriva de POSIÇÃO no log. Só ids de jogador, contadores por
 * jogador (`rodada`) e um ponteiro legítimo (`indicePeca`). É essa disciplina
 * que faz a commutatividade valer: o log guarda a ordem de chegada, e a ordem
 * de chegada não decide nada.
 */
export interface EstadoDraftRede {
  /**
   * Versão do formato. O DO PERSISTE este objeto: sem tag de versão, mudar o
   * formato mais tarde desserializa sala antiga em código novo com campo
   * faltando. Um campo agora é uma linha; migração depois, não.
   */
  versao: number;
  /** Todos os 22, na ordem canônica do roster — `Record` não preserva ordem. */
  jogadorIds: string[];
  /** Só os humanos, mesma ordem. O redutor precisa saber quem NÃO manda comando. */
  humanos: string[];
  fase: FaseDraftRede;
  /** Rodada corrente de cada jogador, 1..6. Bots já nascem em `RODADA_COMPLETA`. */
  rodada: Record<string, number>;
  /** Ordem da rodada 6 — calculada por `calcularOrdemPeca`, a MESMA função da engine. */
  ordemPeca: string[];
  indicePeca: number;
  /** Quem abandonou ou estourou o prazo, em ordem canônica. Tratados como bot pelo turno. */
  ausentes: string[];
  log: EventoDraft[];
  /** Quando o relógio de cada jogador começou a correr (ms, injetado). */
  iniciadoEm: Record<string, number>;
}

/**
 * Estado interno da sala — JSON puro e serializável (o Durable Object persiste
 * isto). Difere do público em UM campo, e é o campo que não pode vazar.
 *
 * 🔒 `seedMestre` NUNCA sai do DO. Decisão (b) da Fase 3: a seed por etapa
 * existe justamente porque, com a seed base completa na mão, qualquer jogador
 * computa as corridas futuras no console. Quem serializa pro fio é
 * `publicarSala`, e o tipo do broadcast (`MensagemServidor`) é
 * `EstadoSalaPublico` — então esquecer de filtrar não compila.
 */
export interface EstadoSala extends Omit<EstadoSalaPublico, 'seedDraft'> {
  /** Seed mestre da partida, fixada na criação da sala (uint32). */
  seedMestre: number;
}
