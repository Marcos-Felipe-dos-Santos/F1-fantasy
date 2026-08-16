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
 * Rótulo do sub-stream de RNG da CORRIDA online (PR 1/4 de "corrida online").
 * Mesma regra de namespace do `ROTULO_SEED_DRAFT` acima.
 */
export const ROTULO_SEED_CORRIDA = 'online:corrida';

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
   * É o que o cliente precisa pra rodar `criarDraft`.
   *
   * ⚠️ **Não é uma via só, e é bom não fingir que é.** `deriveSeed` usa
   * `xmur3`, hash NÃO-criptográfico de 32 bits — não uma função unidirecional
   * de verdade. `seedDraft` não expõe a `seedMestre` diretamente, mas a
   * mestra também é um único uint32 (`party/sala.ts`, `crypto.getRandomValues`
   * sobre 1 slot), então um atacante disposto a testar as 2^32 sementes,
   * aplicando `xmur3(`${s}:online:draft`)` a cada uma e comparando com a
   * `seedDraft` publicada, encontra a mestra (sobra ~1-2 candidatos; nada no
   * draft observado desempata mais que isso, porque tudo nele deriva da
   * mesma seed). Isso pré-computa o campeonato inteiro, `seedCorrida`
   * incluída — é limitação CONHECIDA e registrada, não descuido, e o
   * portão que existe (não publicar antes da hora, ver `seedCorrida` abaixo)
   * não fecha essa porta, só a trivial. Alargar a entropia da `seedMestre`
   * resolveria de fato; é mudança de fundo, fora do escopo deste PR.
   */
  seedDraft: number;
  /**
   * Seed da CORRIDA desta partida, derivada da `seedMestre`
   * (`ROTULO_SEED_CORRIDA`) — só quando o draft CONCLUI (`fase === 'concluido'`).
   * Antes disso, `null`.
   *
   * 🔒 **Veredito do dev, não reabrir — mas escopo do que este portão compra é
   * limitado, e é bom não inflar.** Publicar a seed durante o draft daria a
   * quem a tem uma vantagem computável **no console, sem esforço**: pegar o
   * valor pronto e simular loadouts candidatos contra a pista e a corrida
   * antes de escolher — "não é hack, é chamar uma função" foi a régua do dev
   * pra rejeitar a `seedMestre` completa (decisão (b) da Fase 3), e este
   * portão fecha exatamente esse caminho trivial. Consequência aceita: a
   * PISTA também só aparece no fim do draft, já que `pistaSorteada`
   * (`src/engine/pista-sorteada.ts`) deriva dela. Sem paridade com o offline
   * aqui — decisão explícita, não descuido.
   *
   * ⚠️ **O que este portão NÃO compra:** resistência a um atacante disposto a
   * rodar um brute-force de 2^32 sobre a `seedMestre` a partir da `seedDraft`
   * pública desde o lobby (ver docblock de `seedDraft` acima) — esse caminho
   * recompõe `seedCorrida` mesmo antes do draft concluir, sem nunca precisar
   * do valor publicado aqui. Limitação conhecida, não corrigida neste PR.
   */
  seedCorrida: number | null;
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
  /**
   * Quando a CORRIDA terminou (ms). `null` = ainda em andamento.
   *
   * É o que a tela usa pra contar a janela de fechamento (`AvisoDeFechamento`
   * em `FluxoOnline.tsx`). Desde o PR 3/4 de "corrida online" ele marca o fim
   * da corrida, não o do draft — então o aviso deixa de aparecer no fim do
   * draft e passa a aparecer depois do replay, que é o pretendido.
   */
  concluidaEm: number | null;
  /**
   * Quando a corrida ficou disponível (ms) — o draft concluiu. `null` antes.
   * Vai no fio porque a tela precisa saber que a corrida começou para poder
   * atestar o fim dela (PR 3/4).
   */
  corridaAbertaEm: number | null;
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

/**
 * Janela de graça: quanto tempo a sala continua viva DEPOIS da partida acabar,
 * pra quem quiser olhar o resultado, anotar, printar. Passada a janela, os que
 * restaram são desconectados e a sala é RESETADA — estado descartado, log
 * limpo, código liberado.
 *
 * 10 minutos, e não 5: quem levanta da mesa pra buscar água não pode perder o
 * resultado. O custo é um alarme de 5 s que já existe para o cronômetro de
 * turno — segurar a sala mais tempo não custa praticamente nada.
 */
export const JANELA_DE_GRACA_MS = 10 * 60_000;

/**
 * Quanto tempo uma sala SEM NINGUÉM continua de pé antes de ser descartada.
 *
 * 🔴 Existe por causa de um defeito real: a primeira versão encerrava a sala
 * vazia **no primeiro tique** (5 s), e com isso o caso de uso central do PR
 * simplesmente não funcionava — criar a sala, copiar o link, mandar no
 * WhatsApp e o amigo abrir leva muito mais que 5 segundos, e o criador voltava
 * para "sala não encontrada". O mesmo matava quem trocasse de app no celular
 * ou desse F5 estando sozinho: o WebSocket fecha, a sala some, e a reconexão
 * do 3.2.1 vira letra morta justo quando mais importa.
 *
 * 2 minutos cobre os dois casos com folga e continua matando a sala zumbi.
 */
export const CARENCIA_VAZIO_MS = 2 * 60_000;

/**
 * Teto da BARREIRA DO FIM DA CORRIDA (PR 3/4 de "corrida online"): quanto
 * tempo a sala espera pelos atestados de fim de corrida antes de decidir
 * sozinha que a corrida acabou.
 *
 * 🔑 **A barreira NÃO bloqueia ninguém** — é mecanismo de ciclo de vida, não
 * portão de UI. Ninguém espera numa tela; quem chegou, corre. O timeout existe
 * só para o caso de alguém nunca atestar (fechou a aba no meio do replay):
 * sem ele, `concluidaEm` ficaria `null` para sempre e a janela de graça nunca
 * começaria — a sala só morreria pela carência de vazio.
 *
 * **5 minutos, dimensionado contra o replay real:** a pista mais longa do
 * dataset tem 15 voltas e a velocidade mais lenta gasta 9 s por volta
 * (`MS_REPLAY_POR_VOLTA.lenta`), ou seja ~2min15s de relógio no pior caso.
 * 5 min dá folga de mais de 2× para a tela de grid, pausas e a leitura do
 * resultado, e ainda fica bem abaixo da `JANELA_DE_GRACA_MS` — que só começa
 * a contar depois disto.
 */
export const TIMEOUT_FIM_DE_CORRIDA_MS = 5 * 60_000;

/**
 * A partir de quanto tempo restante a tela avisa que a sala vai fechar.
 * Decisão do dev: **só no último minuto** — durante os 9 primeiros a tela de
 * resultado fica limpa, sem pressão de relógio enquanto o pessoal comenta.
 */
export const AVISAR_FECHAMENTO_MS = 60_000;

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
export interface EstadoSala extends Omit<EstadoSalaPublico, 'seedDraft' | 'seedCorrida'> {
  /** Seed mestre da partida, fixada na criação da sala (uint32). */
  seedMestre: number;
  /**
   * Quando a partida terminou (ms, injetado). `null` enquanto não terminou.
   *
   * É o que arma a **janela de graça**: passada `JANELA_DE_GRACA_MS` daqui, a
   * sala é resetada. Também é o que dá ponto de descarte ao log append-only —
   * antes disso ele crescia para sempre, que era metade do problema C2 do 3.2.
   *
   * 🔑 **Desde o PR 3/4 de "corrida online", "a partida terminou" quer dizer
   * A CORRIDA acabou, não o DRAFT.** Antes disto ele era marcado assim que o
   * draft concluía, e os 10 minutos da janela corriam DURANTE o replay — a
   * sala podia fechar com gente ainda assistindo. Quem o marca agora é a
   * barreira (`avaliarBarreiraDaCorrida`), nunca o fim do draft.
   */
  concluidaEm: number | null;
  /**
   * Quando o draft concluiu e a corrida ficou disponível (ms, injetado).
   * `null` antes disso. Marcado uma vez só, e é a **âncora do timeout** da
   * barreira do fim da corrida (`TIMEOUT_FIM_DE_CORRIDA_MS`).
   *
   * Separado de `concluidaEm` de propósito: são dois instantes diferentes
   * desde o PR 3/4, e reusar um campo para os dois foi exatamente o que fazia
   * a janela de graça começar cedo demais.
   */
  corridaAbertaEm: number | null;
  /**
   * Quem já atestou que terminou a corrida (jogadorIds). Alimenta a barreira.
   *
   * 🔒 **Elegíveis são os humanos ATIVOS** — ausentes não contam. Se
   * contassem, toda sala com um abandono cairia no timeout inteiro e a
   * barreira seria decorativa.
   */
  atestaramFimDaCorrida: string[];
  /**
   * Desde quando a sala está SEM NINGUÉM conectado (ms, injetado). `null` = tem
   * gente dentro.
   *
   * Nasce preenchido: a sala é criada vazia, e é a `CARENCIA_VAZIO_MS` que dá
   * tempo de o criador copiar o código e chamar os amigos. Encerrar no primeiro
   * tique — como a primeira versão fazia — quebrava o caso de uso central.
   */
  vazioDesde: number | null;
  /**
   * jogadorId → token de reentrada. **É O SEGUNDO SEGREDO DO ESTADO**, junto com
   * a `seedMestre`, e pelo mesmo motivo: quem tem o token de alguém joga como
   * essa pessoa. Nunca sai do Durable Object — `publicarSala` copia campo a
   * campo justamente para que um segredo novo não vaze por ter sido
   * acrescentado, e há teste que verifica isso.
   *
   * O token é gerado pela CASCA (`party/sala.ts`, com `crypto.randomUUID`), não
   * pelo redutor: o redutor é puro e não sorteia. Derivar de
   * `deriveSeed(seedMestre, …)` foi recusado — daria 32 bits de entropia, pouco
   * para um segredo que vale a identidade do jogador.
   */
  tokens: Record<string, string>;
}
