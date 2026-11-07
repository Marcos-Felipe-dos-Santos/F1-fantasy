/**
 * Redutor de TURNOS do draft (PR 3.1b) — o coração da Fase 3.
 *
 * O servidor não carrega o dataset, logo **não pode chamar `aplicarEscolha`**.
 * Ele não sabe o que foi escolhido; sabe apenas **de quem é a vez**. Isso é
 * suficiente porque a engine é determinística: com a mesma seed e o mesmo
 * roster, cada cliente computa o mesmo draft sozinho.
 *
 * 🚨 O RISCO QUE ESTE ARQUIVO CARREGA (palavras do dev ao aprovar a fase):
 * regra de turno DUPLICADA entre engine e redutor, derivando em silêncio. Duas
 * defesas:
 *   1. A `ordemPeca` não é reimplementada — vem de `calcularOrdemPeca`, a MESMA
 *      função que `criarDraft` usa. Não há fórmula copiada.
 *   2. `conformidade-draft.test.ts` compara os dois lados a CADA passo, em 20
 *      seeds. É o portão da fase.
 *
 * 🔒 As duas regras de turno, e por que são diferentes:
 * - **Fase sorteios: CONCORRENTE.** Os sorteios de cada jogador são sub-streams
 *   independentes (`draft:sorteios:<id>`), então a ordem entre jogadores não
 *   muda nada — e 22 pessoas não podem esperar umas às outras. `deQuemEhAVez`
 *   devolve o CONJUNTO de quem pode jogar. (O hotseat serializa por convenção
 *   de UI, `fluxo-local.ts` D1 — convenção de tela, não regra de engine.)
 * - **Fase peça: ESTRITA.** O pool de peças é compartilhado e as cópias
 *   acabam, então a ordem é regra de jogo: só `ordemPeca[indicePeca]` joga.
 *
 * 🤖 **Bots nascem completos.** Eles não mandam comando: `resolverBots` resolve
 * TODOS os bots pendentes da fase sorteios antes de devolver o controle a
 * qualquer humano, e na fase peça pula os bots da fila. O redutor espelha isso
 * (`RODADA_COMPLETA` na criação, e o pulo em `normalizar`). A premissa tem
 * asserção própria no teste de conformidade — não é raciocínio, é medição.
 */

import { calcularOrdemPeca, RODADAS_SORTEIO } from '../engine/draft-utils';
import type { Jogador } from '../engine/types';
import { LIMITE_PEDIDOS_REROLL, type ComandoDraft, type ErroDraft } from './protocolo';
import {
  MAX_BYTES_ESCOLHA,
  QTD_JOGADORES,
  PRAZO_TURNO_MS,
  RODADA_COMPLETA,
  VERSAO_ESTADO_DRAFT,
  type EstadoDraftRede,
  type EventoDraft,
} from './tipos';

/** Resultado de uma redução do draft. `erro === null` ⇒ o comando foi aceito. */
export interface ResultadoDraft {
  estado: EstadoDraftRede;
  erro: ErroDraft | null;
}

function recusar(estado: EstadoDraftRede, erro: ErroDraft): ResultadoDraft {
  return { estado, erro };
}

/** Humano que ainda responde: manda comando e ocupa turno. Bot e ausente, não. */
function ativo(estado: EstadoDraftRede, jogadorId: string): boolean {
  return estado.humanos.includes(jogadorId) && !estado.ausentes.includes(jogadorId);
}

/**
 * Leva o estado ao próximo ponto em que um humano ativo precisa agir: fecha a
 * fase sorteios quando ninguém está pendente e pula, na fase peça, quem não
 * manda comando (bots e ausentes) — o espelho do que `resolverBots` faz do lado
 * da engine.
 */
function normalizar(estado: EstadoDraftRede, agora: number): EstadoDraftRede {
  let atual = estado;

  if (atual.fase === 'sorteios') {
    if (atual.jogadorIds.some((id) => atual.rodada[id] <= RODADAS_SORTEIO)) return atual;
    atual = { ...atual, fase: 'peca', indicePeca: 0 };
  }

  if (atual.fase !== 'peca') return atual;

  let indice = atual.indicePeca;
  while (indice < atual.ordemPeca.length && !ativo(atual, atual.ordemPeca[indice])) {
    indice += 1;
  }
  if (indice >= atual.ordemPeca.length) {
    return { ...atual, fase: 'concluido', indicePeca: atual.ordemPeca.length };
  }
  const daVez = atual.ordemPeca[indice];
  // O relógio começa quando a vez CHEGA — e só então. Reescrever a cada
  // passagem daria 90 s novos a quem está parado toda vez que outro jogador
  // abandonasse, e o cronômetro nunca dispararia contra quem trava a partida.
  // A comparação com `estado` (o de entrada), e não com `atual`, cobre a
  // transição sorteios→peça, em que `indicePeca` já foi zerado acima.
  const vezMudou = estado.fase !== 'peca' || indice !== estado.indicePeca;
  return {
    ...atual,
    indicePeca: indice,
    iniciadoEm: vezMudou ? { ...atual.iniciadoEm, [daVez]: agora } : atual.iniciadoEm,
  };
}

/**
 * Estado inicial de turno a partir do roster congelado. `agora` é injetado —
 * o redutor nunca lê relógio.
 */
export function criarDraftRede(
  roster: Jogador[],
  seedDraft: number,
  agora: number,
): EstadoDraftRede {
  if (roster.length > QTD_JOGADORES || new Set(roster.map((j) => j.id)).size !== roster.length)
    throw new Error('Roster inválido');
  const jogadorIds = roster.map((j) => j.id);
  const humanos = roster.filter((j) => j.tipo === 'humano').map((j) => j.id);
  const rodada: Record<string, number> = {};
  const iniciadoEm: Record<string, number> = {};
  for (const jogador of roster) {
    rodada[jogador.id] = jogador.tipo === 'bot' ? RODADA_COMPLETA : 1;
    if (jogador.tipo === 'humano') iniciadoEm[jogador.id] = agora;
  }

  return normalizar(
    {
      versao: VERSAO_ESTADO_DRAFT,
      jogadorIds,
      humanos,
      fase: 'sorteios',
      rodada,
      revisoes: Object.fromEntries(jogadorIds.map((id) => [id, 0])),
      ordemPeca: calcularOrdemPeca(jogadorIds, seedDraft),
      indicePeca: 0,
      ausentes: [],
      log: [],
      iniciadoEm,
    },
    agora,
  );
}

/**
 * Quem pode jogar AGORA. Conjunto na fase sorteios (concorrente), exatamente um
 * id na fase peça (estrita), vazio no fim. Ver o cabeçalho do arquivo.
 *
 * 🔒 INVARIANTE do módulo: **todo estado devolvido daqui já passou por
 * `normalizar`.** É ela que garante que o `[]` da fase peça abaixo seja
 * inalcançável — sem ela, um estado parado numa casa de bot devolveria conjunto
 * vazio e a partida travaria em silêncio, com todo mundo achando que é a vez de
 * outro.
 */
export function deQuemEhAVez(estado: EstadoDraftRede): string[] {
  if (estado.fase === 'concluido') return [];
  if (estado.fase === 'sorteios') {
    return estado.jogadorIds.filter(
      (id) => estado.rodada[id] <= RODADAS_SORTEIO && ativo(estado, id),
    );
  }
  const vez = estado.ordemPeca[estado.indicePeca];
  return vez === undefined || !ativo(estado, vez) ? [] : [vez];
}

function anexar(
  estado: EstadoDraftRede,
  evento: EventoDraft extends infer E ? (E extends EventoDraft ? Omit<E, 'seq'> : never) : never,
): EventoDraft[] {
  return [...estado.log, { ...evento, seq: estado.log.length + 1 } as EventoDraft];
}

/**
 * Marca um jogador como ausente: ele deixa de ocupar turno e para de bloquear
 * os outros. O redutor só garante que a partida não trava — QUEM escolhe no
 * lugar dele é regra de jogo, precisa do dataset, e portanto roda no cliente.
 *
 * 🔒 CONTRATO QUE O CLIENTE (3.3) É OBRIGADO A CUMPRIR — não é sugestão, é o
 * que faz os dois lados reconvergirem. Medido no teste do portão, que abandona
 * jogadores nas duas fases e assere a reconvergência passo a passo:
 *
 * 1. **No mesmo evento** em que vê o `ausencia` no log, o cliente completa os
 *    sorteios pendentes do ausente. Se atrasar, os dois lados ficam em fases
 *    diferentes durante a janela — aqui o ausente já vale como completo
 *    (`RODADA_COMPLETA`), na engine ele continua pendente.
 * 2. Na fase peça a rede **pula** a casa do ausente, então o cliente **tem que
 *    jogar por ele** — e a escolha precisa ser **determinística e idêntica nos
 *    22**. O pool de peças é compartilhado e as cópias acabam: dois clientes
 *    escolhendo peças diferentes pelo mesmo ausente furam o pool em silêncio e
 *    produzem loadouts (e corridas) diferentes. Na prática: `escolherBot`,
 *    semeado — nunca uma decisão de UI.
 */
function marcarAusente(estado: EstadoDraftRede, jogadorId: string, agora: number): EstadoDraftRede {
  return normalizar(
    {
      ...estado,
      log: anexar(estado, { jogadorId, tipo: 'ausencia' }),
      // Ordem canônica: a lista não pode depender da ordem de CHEGADA dos
      // abandonos, ou a commutatividade cai.
      ausentes: [...estado.ausentes, jogadorId].sort(),
      rodada: { ...estado.rodada, [jogadorId]: RODADA_COMPLETA },
    },
    agora,
  );
}

/**
 * Coordenada de turno corrente de um jogador: a rodada dele na fase sorteios,
 * o `indicePeca` na fase peça. É contra ela que `turnoEsperado` é conferido.
 */
export function turnoCorrente(estado: EstadoDraftRede, jogadorId: string): number {
  return estado.fase === 'sorteios' ? estado.rodada[jogadorId] : estado.indicePeca;
}

/** Tamanho do payload em bytes de JSON. `undefined` se nem serializa (ciclo, BigInt…). */
function bytesDaEscolha(escolha: unknown): number | undefined {
  try {
    const texto = JSON.stringify(escolha);
    return texto === undefined ? undefined : texto.length;
  } catch {
    return undefined;
  }
}

const SLOTS_VALIDOS = new Set(['chassi', 'motor', 'estrategista', 'pit']);

/**
 * A escolha tem a FORMA de uma `EscolhaDraft`? É o máximo que o servidor pode
 * checar sem dataset — e vale a pena checar, porque barra o lixo trivial
 * (`null`, `42`, `{tipo:'xpto'}`) antes de ele entrar no log append-only, que é
 * persistido e nunca encolhe.
 *
 * ⚠️ **Não é a defesa principal, e não pode ser confundida com uma.** Um
 * `{tipo:'piloto', pilotoId:'NAO-EXISTE'}` tem forma perfeita e só a engine, com
 * o dataset, sabe que é inválido. Quem impede que isso mate a sala é o
 * `try`/`catch` do cliente (`aplicarEscolhaDoLog`, em `cliente.ts`). Esta função
 * só encurta a superfície.
 */
function temFormaDeEscolha(escolha: unknown): boolean {
  if (typeof escolha !== 'object' || escolha === null) return false;
  const e = escolha as Record<string, unknown>;
  switch (e.tipo) {
    case 'componente':
      return typeof e.slot === 'string' && SLOTS_VALIDOS.has(e.slot);
    case 'piloto':
      return typeof e.pilotoId === 'string' && e.pilotoId.length > 0;
    case 'peca':
      return typeof e.pecaId === 'string' && e.pecaId.length > 0;
    default:
      return false;
  }
}

function escolher(
  estado: EstadoDraftRede,
  escolha: unknown,
  turnoEsperado: unknown,
  revisaoEsperada: unknown,
  remetenteId: string | null,
  agora: number,
): ResultadoDraft {
  if (estado.fase === 'concluido') return recusar(estado, 'draft-concluido');
  if (remetenteId === null || !estado.humanos.includes(remetenteId)) {
    return recusar(estado, 'jogador-desconhecido');
  }
  if (estado.ausentes.includes(remetenteId)) return recusar(estado, 'jogador-ausente');
  if (!deQuemEhAVez(estado).includes(remetenteId)) return recusar(estado, 'nao-e-sua-vez');

  // Validação de FORMA, não de conteúdo — a única que o servidor pode fazer
  // sem dataset. O payload vai pro log persistido e pro broadcast dos 22.
  const bytes = bytesDaEscolha(escolha);
  if (bytes === undefined) return recusar(estado, 'comando-invalido');
  if (bytes > MAX_BYTES_ESCOLHA) return recusar(estado, 'escolha-grande-demais');
  if (!temFormaDeEscolha(escolha)) return recusar(estado, 'comando-invalido');

  // Idempotência: mensagem duplicada ou fora de ordem traz a coordenada de um
  // turno que já passou, e é recusada em vez de contar como segunda jogada.
  if (typeof turnoEsperado !== 'number') return recusar(estado, 'comando-invalido');
  if (turnoEsperado !== turnoCorrente(estado, remetenteId)) {
    return recusar(estado, 'turno-divergente');
  }

  if (!Number.isSafeInteger(revisaoEsperada)) return recusar(estado, 'comando-invalido');
  if (revisaoEsperada !== estado.revisoes[remetenteId])
    return recusar(estado, 'revisao-divergente');

  const log = anexar(estado, { jogadorId: remetenteId, tipo: 'escolha', escolha });

  if (estado.fase === 'sorteios') {
    return {
      estado: normalizar(
        {
          ...estado,
          log,
          rodada: { ...estado.rodada, [remetenteId]: estado.rodada[remetenteId] + 1 },
          iniciadoEm: { ...estado.iniciadoEm, [remetenteId]: agora },
        },
        agora,
      ),
      erro: null,
    };
  }

  return {
    estado: normalizar({ ...estado, log, indicePeca: estado.indicePeca + 1 }, agora),
    erro: null,
  };
}

/**
 * Aplica um comando de draft em nome de `remetenteId` — o id que o TRANSPORTE
 * associou à conexão, nunca um campo do fio. `agora` é injetado.
 */
export function reduzirDraft(
  estado: EstadoDraftRede,
  comando: ComandoDraft,
  remetenteId: string | null,
  agora: number,
): ResultadoDraft {
  switch (comando?.tipo) {
    case 'escolher':
      return escolher(
        estado,
        comando.escolha,
        comando.turnoEsperado,
        comando.revisaoEsperada,
        remetenteId,
        agora,
      );
    case 'reroll': {
      if (estado.fase === 'concluido') return recusar(estado, 'draft-concluido');
      if (remetenteId === null || !estado.humanos.includes(remetenteId))
        return recusar(estado, 'jogador-desconhecido');
      if (estado.ausentes.includes(remetenteId)) return recusar(estado, 'jogador-ausente');
      if (estado.fase !== 'sorteios' || !deQuemEhAVez(estado).includes(remetenteId))
        return recusar(estado, 'nao-e-sua-vez');
      if (
        !['marca', 'ano', 'ambos'].includes(comando.alvo) ||
        !Number.isSafeInteger(comando.turnoEsperado) ||
        !Number.isSafeInteger(comando.revisaoEsperada)
      )
        return recusar(estado, 'comando-invalido');
      if (comando.turnoEsperado !== turnoCorrente(estado, remetenteId))
        return recusar(estado, 'turno-divergente');
      if (comando.revisaoEsperada !== estado.revisoes[remetenteId])
        return recusar(estado, 'revisao-divergente');
      if (
        estado.log.filter((e) => e.tipo === 'reroll' && e.jogadorId === remetenteId).length >=
        LIMITE_PEDIDOS_REROLL
      )
        return recusar(estado, 'limite-pedidos-reroll');
      const pedido = {
        tipo: 'reroll' as const,
        alvo: comando.alvo,
        turnoEsperado: comando.turnoEsperado,
        revisaoEsperada: comando.revisaoEsperada,
      };
      return {
        estado: {
          ...estado,
          revisoes: { ...estado.revisoes, [remetenteId]: estado.revisoes[remetenteId] + 1 },
          log: anexar(estado, { tipo: 'reroll', jogadorId: remetenteId, pedido }),
        },
        erro: null,
      };
    }
    case 'abandonar':
      if (estado.fase === 'concluido') return recusar(estado, 'draft-concluido');
      if (remetenteId === null || !estado.humanos.includes(remetenteId)) {
        return recusar(estado, 'jogador-desconhecido');
      }
      if (estado.ausentes.includes(remetenteId)) return recusar(estado, 'jogador-ausente');
      return { estado: marcarAusente(estado, remetenteId, agora), erro: null };
    default:
      // Alcançável em runtime: o cliente manda JSON não confiável, não TS.
      return recusar(estado, 'comando-invalido');
  }
}

/**
 * Quem estourou o prazo do turno. Só quem está com a vez conta — na fase
 * sorteios cada jogador tem seu próprio relógio, porque a fase é concorrente e
 * ninguém deveria perder a vez por causa da lentidão alheia.
 */
export function expirados(
  estado: EstadoDraftRede,
  agora: number,
  prazoMs: number = PRAZO_TURNO_MS,
): string[] {
  return deQuemEhAVez(estado).filter((id) => agora - (estado.iniciadoEm[id] ?? agora) >= prazoMs);
}

/**
 * Expira o turno de um jogador. É comando do SERVIDOR, e por isso não está em
 * `ComandoDraft`: se um cliente pudesse expirar turno, expiraria o dos outros.
 */
export function expirarJogador(
  estado: EstadoDraftRede,
  jogadorId: string,
  agora: number,
): ResultadoDraft {
  if (estado.fase === 'concluido') return recusar(estado, 'draft-concluido');
  if (!estado.humanos.includes(jogadorId)) return recusar(estado, 'jogador-desconhecido');
  if (estado.ausentes.includes(jogadorId)) return recusar(estado, 'jogador-ausente');
  return { estado: marcarAusente(estado, jogadorId, agora), erro: null };
}

/** Validação do formato persistido; nunca cria créditos ou trunca replay legado. */
export function draftRedeValido(valor: unknown): boolean {
  if (typeof valor !== 'object' || valor === null) return false;
  const d = valor as EstadoDraftRede;
  if (
    d.versao !== VERSAO_ESTADO_DRAFT ||
    !Array.isArray(d.jogadorIds) ||
    !Array.isArray(d.humanos) ||
    !Array.isArray(d.log)
  )
    return false;
  if (
    d.jogadorIds.length > QTD_JOGADORES ||
    new Set(d.jogadorIds).size !== d.jogadorIds.length ||
    d.jogadorIds.some((id) => typeof id !== 'string')
  )
    return false;
  if (
    d.humanos.length > QTD_JOGADORES ||
    new Set(d.humanos).size !== d.humanos.length ||
    d.humanos.some((id) => !d.jogadorIds.includes(id))
  )
    return false;
  if (
    !d.revisoes ||
    typeof d.revisoes !== 'object' ||
    Object.keys(d.revisoes).length !== d.jogadorIds.length
  )
    return false;
  if (!['sorteios', 'peca', 'concluido'].includes(d.fase)) return false;
  if (
    !d.rodada ||
    typeof d.rodada !== 'object' ||
    Object.keys(d.rodada).length !== d.jogadorIds.length ||
    d.jogadorIds.some(
      (id) => !Number.isInteger(d.rodada[id]) || d.rodada[id] < 1 || d.rodada[id] > RODADA_COMPLETA,
    )
  )
    return false;
  if (
    !Array.isArray(d.ordemPeca) ||
    d.ordemPeca.length !== d.jogadorIds.length ||
    new Set(d.ordemPeca).size !== d.jogadorIds.length ||
    d.ordemPeca.some((id) => !d.jogadorIds.includes(id))
  )
    return false;
  if (!Number.isInteger(d.indicePeca) || d.indicePeca < 0 || d.indicePeca > d.ordemPeca.length)
    return false;
  if (
    !Array.isArray(d.ausentes) ||
    new Set(d.ausentes).size !== d.ausentes.length ||
    d.ausentes.some((id) => !d.humanos.includes(id))
  )
    return false;
  if (
    !d.iniciadoEm ||
    typeof d.iniciadoEm !== 'object' ||
    d.humanos.some((id) => !Number.isFinite(d.iniciadoEm[id]))
  )
    return false;
  const contagens = new Map(d.jogadorIds.map((id) => [id, 0]));
  // No máximo seis escolhas + uma ausência por humano, além dos pedidos limitados.
  if (d.log.length > d.humanos.length * (LIMITE_PEDIDOS_REROLL + 7)) return false;
  for (const [indice, evento] of d.log.entries()) {
    if (!evento || evento.seq !== indice + 1 || !d.humanos.includes(evento.jogadorId)) return false;
    if (evento.tipo === 'reroll') {
      const p = evento.pedido;
      const n = contagens.get(evento.jogadorId)!;
      if (
        !p ||
        p.tipo !== 'reroll' ||
        !['marca', 'ano', 'ambos'].includes(p.alvo) ||
        !Number.isInteger(p.turnoEsperado) ||
        p.turnoEsperado < 1 ||
        p.turnoEsperado > RODADAS_SORTEIO ||
        p.revisaoEsperada !== n ||
        n >= LIMITE_PEDIDOS_REROLL ||
        Object.keys(p).length !== 4
      )
        return false;
      contagens.set(evento.jogadorId, n + 1);
    } else if (evento.tipo === 'escolha') {
      const bytes = bytesDaEscolha(evento.escolha);
      if (bytes === undefined || bytes > MAX_BYTES_ESCOLHA || !temFormaDeEscolha(evento.escolha))
        return false;
    } else if (evento.tipo !== 'ausencia') return false;
  }
  return d.jogadorIds.every((id) => d.revisoes[id] === contagens.get(id));
}
