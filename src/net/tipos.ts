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
  /**
   * Contador monotônico, incrementado a cada comando ACEITO (recusa não
   * incrementa). O cliente descarta broadcast atrasado ou duplicado por ele —
   * é contra isto que o harness headless do 3.2 (latência, reordenação,
   * duplicação) vai asserir.
   */
  seq: number;
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
