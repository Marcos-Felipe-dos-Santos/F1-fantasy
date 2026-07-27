/**
 * Persistência do modo Campeonato (PR 6.5, decisão D4 do plano da Fase 6,
 * registrada em PROGRESS.md — não reabrir aqui, só implementar).
 *
 * SÓ ENTRADA é persistida: `seed` + `DraftState` (de onde saem os loadouts) +
 * calendário + cursor de apresentação (`etapaAtual`). NUNCA os
 * `ResultadoCorrida` das etapas (`EstadoCampeonato.etapas`). Racional: o
 * campeonato inteiro é função determinística de `seed + loadouts +
 * calendário` — `iniciarCampeonato` pré-simula tudo em <2ms — então guardar
 * resultado seria redundante, gigante no `localStorage` e, pior, poderia
 * divergir silenciosamente da engine atual sem ninguém notar.
 *
 * GUARDA DE COMPATIBILIDADE: `versaoFormato` (muda só quando o SHAPE do save
 * muda) + uma IMPRESSÃO DIGITAL auto-verificante (hash determinístico dos
 * pontos/posições de TODAS as etapas, recomputado em `retomarCampeonato` e
 * comparado com o salvo). Um `versaoEngine` manual foi rejeitado
 * explicitamente na decisão D4: é uma constante que se esquece de bumpar, e a
 * falha resultante é silenciosa (save "compatível" que na verdade descreve um
 * campeonato diferente). A impressão digital não depende de ninguém lembrar de
 * nada — ela mesma detecta divergência de dataset OU de engine.
 *
 * A D4 dizia "etapa 1"; cobrimos todas porque a revisão do 6.5 provou que só a
 * etapa 1 cumpre a letra e falha o propósito declarado na mesma frase da D4
 * ("invalida o save sozinho se dataset ou engine mudarem"). Ver
 * `calcularImpressaoDigital` e o PROGRESS.md.
 *
 * Módulo de `src/ui/`: consome `src/engine/` (permitido), nunca o contrário.
 * Nenhuma regra de jogo é reimplementada aqui.
 */

import type { Dataset } from '../engine/dataset';
import { seedFromString } from '../engine/rng';
import type { DraftState, EtapaCampeonato, Jogador, Loadout } from '../engine/types';
import type { EstadoCampeonato } from './fluxo-campeonato';
import { iniciarCampeonato } from './fluxo-campeonato';

/**
 * Versão do SHAPE do save (não da engine — ver doc do módulo). Bump manual
 * sempre que um campo obrigatório de `SaveCampeonato`/`DraftState` for
 * adicionado/removido/renomeado de um jeito que quebre saves antigos.
 */
export const VERSAO_FORMATO = 1;

/** Chave única do save do modo Campeonato no `localStorage`. */
export const CHAVE_SAVE = 'f1-fantasy:campeonato';

/**
 * Subconjunto de `Storage` (lib DOM) que `persistencia.ts` realmente usa.
 * Definido à parte (em vez de usar o `Storage` global do TS) por duas razões:
 * 1. `Storage` global tem um índice `[name: string]: any`, que obriga fakes
 *    de teste a um cast forçado mesmo implementando os 3 métodos certinho.
 * 2. Deixa explícito, no próprio tipo, que este módulo nunca lê `.length`
 *    nem itera chaves — só as 3 operações que usa.
 * `window.localStorage` implementa este subconjunto estruturalmente, então
 * chamadores de produção passam ele direto, sem adaptação.
 */
export interface StorageLike {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

/**
 * Forma persistida do modo Campeonato — só entrada, nunca resultado (ver doc
 * do módulo). `draft` é o `DraftState` completo porque é dele que saem os
 * loadouts pra reconstruir o campeonato (`retomarCampeonato`); serializa
 * direto, é JSON puro (`DraftState`, `engine/types.ts`).
 */
export interface SaveCampeonato {
  versaoFormato: number;
  seed: number;
  draft: DraftState;
  calendario: string[];
  etapaAtual: number;
  impressaoDigital: string;
}

/**
 * Resultado de `carregarCampeonato`: nunca lança — todo caminho de falha
 * (chave ausente, JSON malformado, shape inválido, versão incompatível) volta
 * como valor, pro chamador (UI, PR 6.6) decidir o que mostrar sem precisar de
 * `try/catch`.
 */
export type ResultadoCarga =
  | { ok: true; save: SaveCampeonato }
  | { ok: false; motivo: 'ausente' | 'json-invalido' | 'shape-invalido' | 'versao-incompativel' };

/**
 * Comparador de string determinístico entre máquinas (code unit, `<`/`>`),
 * NUNCA `localeCompare` — mesma regra e mesmo padrão de `cmpJogadorId` em
 * `src/engine/campeonato.ts` (não exportado de lá, por isso duplicado aqui;
 * é a mesma duplicação que já existe entre `campeonato.ts`,
 * `scripts/agregar-fatos.ts` e `scripts/balance.ts`).
 */
function cmpString(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Resumo canônico de UMA etapa: ordem estável por `jogadorId`, posição, pontos e status. */
function resumoDaEtapa(etapa: EtapaCampeonato): string {
  const linhas = [...etapa.resultado.classificacao]
    .sort((a, b) => cmpString(a.jogadorId, b.jogadorId))
    .map((item) => `${item.jogadorId}:${item.posicao}:${item.pontos}:${item.status}`)
    .join('|');
  return `${etapa.pistaId}#${linhas}`;
}

/**
 * Hash determinístico e puro de TODAS as etapas do campeonato: resume cada
 * etapa (ordem estável por `jogadorId`, com posição, pontos e status) e
 * hasheia o conjunto com `seedFromString` (mesmo xmur3 que a engine usa pra
 * derivar seeds — reuso em vez de inventar hash novo). Determinístico: mesmo
 * campeonato ⇒ mesmo hash, sempre; sem `Math.random`, sem relógio.
 *
 * POR QUE TODAS AS ETAPAS, e não só a etapa 1 como dizia a letra da D4:
 * a D4 promete, na mesma frase, que a impressão digital "invalida o save
 * sozinho se dataset ou engine mudarem" — e hashear só a etapa 1 cumpre a
 * letra mas falha o propósito. A revisão do 6.5 reproduziu o buraco com o
 * dataset vivo: mexendo SÓ em Suzuka (5ª etapa) o hash da etapa 1 continua
 * batendo, `retomarCampeonato` aceita o save, e o jogador retoma um
 * campeonato cuja classificação final mudou do 3º ao 6º lugar — sem erro
 * nenhum. Como as etapas são independentes (`seedDaEtapa` por id de pista),
 * uma mudança de engine num caminho de chuva só aparece nas etapas em que
 * choveu naquela seed; se a etapa 1 foi seca, a guarda inteira passava batido.
 * Custo medido de cobrir tudo: ~19 µs por campeonato (as etapas já estão
 * pré-simuladas). Ver PROGRESS.md.
 *
 * Cobre posições E pontos de propósito: mesma soma de pontos em ORDEM
 * diferente (ex.: empate resolvido diferente pelo countback do PR 6.2) já é
 * uma corrida diferente e precisa invalidar o save.
 *
 * É CHECKSUM, NÃO MAC: qualquer um recomputa. Não vale como prova de nada na
 * fase online nem no "Desafio do Dia" — lá o servidor recomputa de
 * `seed + loadouts`.
 */
export function calcularImpressaoDigital(etapas: readonly EtapaCampeonato[]): string {
  return seedFromString(etapas.map(resumoDaEtapa).join('||')).toString(36);
}

const FASES_DRAFT = new Set(['sorteios', 'peca', 'concluido']);

function ehLoadoutValido(x: unknown): x is Loadout {
  if (typeof x !== 'object' || x === null) return false;
  const l = x as Record<string, unknown>;
  return (
    typeof l.jogadorId === 'string' &&
    typeof l.pilotoId === 'string' &&
    typeof l.chassiId === 'string' &&
    typeof l.motorId === 'string' &&
    typeof l.estrategistaId === 'string' &&
    typeof l.pitId === 'string' &&
    typeof l.pecaId === 'string'
  );
}

function ehJogadorValido(x: unknown): x is Jogador {
  if (typeof x !== 'object' || x === null) return false;
  const j = x as Record<string, unknown>;
  return typeof j.id === 'string' && (j.tipo === 'humano' || j.tipo === 'bot');
}

/**
 * Validação de shape "de verdade" (checa tipo de cada campo, nunca um
 * `as DraftState` cego) — é o que permite `carregarCampeonato` devolver
 * `shape-invalido` em vez de deixar um save corrompido/adulterado do
 * `localStorage` explodir mais tarde num `TypeError` sem contexto.
 *
 * Checagem extra (além dos campos de `DraftState`): todo `jogador.id` tem que
 * ter uma entrada correspondente em `loadouts`. `retomarCampeonato` monta a
 * lista de loadouts como `jogadores.map(j => loadouts[j.id])` — um jogador
 * sem loadout viraria `undefined` nessa lista e travaria a simulação num erro
 * obscuro dentro da engine, em vez de um `shape-invalido` claro aqui.
 */
function ehDraftStateValido(x: unknown): x is DraftState {
  if (typeof x !== 'object' || x === null) return false;
  const d = x as Record<string, unknown>;

  if (typeof d.seed !== 'number') return false;
  if (typeof d.fase !== 'string' || !FASES_DRAFT.has(d.fase)) return false;
  if (!Array.isArray(d.jogadores) || !d.jogadores.every(ehJogadorValido)) return false;
  if (typeof d.sorteios !== 'object' || d.sorteios === null) return false;
  if (typeof d.progresso !== 'object' || d.progresso === null) return false;
  if (!Array.isArray(d.ordemPeca) || !d.ordemPeca.every((v) => typeof v === 'string')) return false;
  if (typeof d.indicePeca !== 'number') return false;
  if (
    d.pecasReveladas !== null &&
    (!Array.isArray(d.pecasReveladas) || !d.pecasReveladas.every((v) => typeof v === 'string'))
  ) {
    return false;
  }
  if (typeof d.copiasRestantes !== 'object' || d.copiasRestantes === null) return false;
  if (typeof d.loadouts !== 'object' || d.loadouts === null) return false;

  const loadoutsRecord = d.loadouts as Record<string, unknown>;
  for (const jogador of d.jogadores as Jogador[]) {
    if (!ehLoadoutValido(loadoutsRecord[jogador.id])) return false;
  }

  return true;
}

/** Validação de shape de `SaveCampeonato` (ver doc de `ehDraftStateValido`). */
function ehSaveShapeValido(x: unknown): x is SaveCampeonato {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Record<string, unknown>;

  return (
    typeof s.versaoFormato === 'number' &&
    typeof s.seed === 'number' &&
    ehDraftStateValido(s.draft) &&
    Array.isArray(s.calendario) &&
    s.calendario.every((v) => typeof v === 'string') &&
    typeof s.etapaAtual === 'number' &&
    typeof s.impressaoDigital === 'string'
  );
}

/**
 * Persiste a ENTRADA do campeonato (nunca `estado.etapas`, os
 * `ResultadoCorrida` — ver doc do módulo). `seed` é recebido explícito (em
 * vez de reaproveitar `estado.seed`) porque é o mesmo valor que o chamador já
 * passou pra `iniciarCampeonato`; o `estado` é a fonte do resto (calendário,
 * cursor, etapa 1 pra hash).
 *
 * DECISÃO (item 5 do PR): erro de `setItem` (quota do `localStorage` cheia,
 * modo privado de alguns navegadores) é ENGOLIDO, não propagado. O
 * campeonato inteiro já está rodando em memória em `estado` — uma falha de
 * disco não pode derrubar a sessão do jogador por causa de um `try/catch`
 * ausente numa função de "salvar o progresso". O preço é silêncio pro
 * chamador; por isso um `console.warn` com o erro original, pra sobrar
 * rastro sem interromper o jogo.
 */
export function salvarCampeonato(
  storage: StorageLike,
  seed: number,
  draft: DraftState,
  estado: EstadoCampeonato,
): boolean {
  if (estado.etapas.length === 0) {
    // Só acontece se `estado` não veio de `iniciarCampeonato` (que já rejeita
    // calendário vazio) — bug de quem chamou, não falha de I/O. Sem etapa 1
    // não há como calcular a impressão digital; lança alto em vez de salvar
    // um save que nunca vai conseguir ser retomado.
    throw new Error('salvarCampeonato: estado sem etapas simuladas (calendário vazio)');
  }

  const save: SaveCampeonato = {
    versaoFormato: VERSAO_FORMATO,
    seed,
    draft,
    calendario: estado.calendario,
    etapaAtual: estado.etapaAtual,
    impressaoDigital: calcularImpressaoDigital(estado.etapas),
  };

  try {
    storage.setItem(CHAVE_SAVE, JSON.stringify(save));
    return true;
  } catch (erro) {
    // NÃO lança: derrubar a sessão em memória por falha de disco seria pior
    // que não salvar. Mas também não fica MUDO pro chamador (aviso A4 da
    // revisão): em Safari privado / quota cheia o `setItem` falha em TODO
    // save, o `console.warn` vai pro devtools que o jogador nunca abre, e ele
    // fecha a aba confiando no auto-save. O `false` existe pro PR 6.6 mostrar
    // um aviso discreto de "não foi possível salvar neste navegador".
    console.warn('salvarCampeonato: falha ao persistir (quota cheia ou modo privado)', erro);
    return false;
  }
}

/**
 * Carrega e valida o save do `storage`. NUNCA lança — todo caminho de falha
 * volta como `{ ok: false, motivo }` (ver doc de `ResultadoCarga`).
 */
export function carregarCampeonato(storage: StorageLike): ResultadoCarga {
  // O doc acima promete "NUNCA lança", e `getItem` PODE lançar (Safari com
  // cookies bloqueados devolve SecurityError, não `null`) — aviso A5 da
  // revisão: sem este try/catch a promessa era falsa e a tela de início
  // quebraria. Storage inacessível é indistinguível de "não há save".
  let raw: string | null;
  try {
    raw = storage.getItem(CHAVE_SAVE);
  } catch (erro) {
    console.warn('carregarCampeonato: storage inacessível', erro);
    return { ok: false, motivo: 'ausente' };
  }
  if (raw === null) return { ok: false, motivo: 'ausente' };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, motivo: 'json-invalido' };
  }

  // Checa `versaoFormato` ANTES da validação completa de shape, não depois.
  // `versaoFormato` só muda quando o shape muda (ver doc do módulo) — um save
  // de uma versão futura tipicamente TEM um shape diferente do atual, então
  // checar shape primeiro faria esse caso, o mais realista dos dois, cair
  // sempre em `shape-invalido` e nunca em `versao-incompativel` (o motivo
  // mais específico e mais informativo pro chamador: "esse save é de outra
  // versão", não "esse save está malformado"). A ordem inversa só exige que
  // `parsed` seja um objeto com `versaoFormato: number` pra decidir — não
  // depende do resto do shape estar certo.
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).versaoFormato !== 'number'
  ) {
    return { ok: false, motivo: 'shape-invalido' };
  }
  if ((parsed as { versaoFormato: number }).versaoFormato !== VERSAO_FORMATO) {
    return { ok: false, motivo: 'versao-incompativel' };
  }

  if (!ehSaveShapeValido(parsed)) return { ok: false, motivo: 'shape-invalido' };

  return { ok: true, save: parsed };
}

/**
 * Reconstrói o `EstadoCampeonato` a partir de um `SaveCampeonato` já
 * validado quanto ao shape (`carregarCampeonato`). Re-simula o campeonato
 * inteiro via `iniciarCampeonato` (a partir só de `seed` + loadouts do
 * `draft` + calendário — NUNCA lê `save.etapas`, que nem existe no tipo) e
 * então valida a impressão digital ANTES de devolver qualquer coisa ao
 * chamador. Ponto central da decisão D4: nunca degradar pra um estado
 * silenciosamente errado.
 */
export function retomarCampeonato(dataset: Dataset, save: SaveCampeonato): EstadoCampeonato {
  // Defesa em profundidade (aviso A1 da revisão): `SaveCampeonato` é tipo
  // PÚBLICO e nada obriga o chamador a ter passado por `carregarCampeonato`.
  // Sem isto, um save com jogador sem loadout produzia `undefined` no array e
  // estourava lá dentro da engine (`campeonato.ts`, `loadouts.map(l =>
  // l.jogadorId)`) com "Cannot read properties of undefined" — o erro obscuro
  // que esta camada existe pra evitar. O `tsconfig` não tem
  // `noUncheckedIndexedAccess`, então o TypeScript tipa `loadouts[id]` como
  // `Loadout` mesmo ausente e não pega nada disso.
  if (!ehSaveShapeValido(save)) {
    throw new Error('retomarCampeonato: save inválido (shape não confere)');
  }

  const loadouts = save.draft.jogadores.map((jogador) => save.draft.loadouts[jogador.id]);
  const estado = iniciarCampeonato(dataset, loadouts, save.seed, save.calendario);

  // IMPRESSÃO DIGITAL AUTO-VERIFICANTE: recomputada da etapa 1 RECÉM-simulada
  // (não confia em nada do save além de seed/loadouts/calendário) e comparada
  // com a salva. Divergência = o dataset mudou (ids de pista/peça diferentes,
  // valores rebalanceados) OU a engine de simulação mudou desde o save — os
  // dois cenários produzem uma etapa 1 diferente da que o jogador salvou.
  // Devolver esse estado em silêncio seria devolver um campeonato ERRADO
  // fingindo ser uma retomada legítima; por isso lança.
  const impressaoAtual = calcularImpressaoDigital(estado.etapas);
  if (impressaoAtual !== save.impressaoDigital) {
    throw new Error(
      'retomarCampeonato: impressão digital divergente do save — campeonato incompatível ' +
        '(dataset ou engine mudaram desde que foi salvo)',
    );
  }

  // `etapaAtual` do save não é confiável por construção de tipo (é só um
  // `number` depois do `JSON.parse`) — mesmo guard de `classificacaoApos`
  // (`fluxo-campeonato.ts`): cursor fora de [0, etapas.length] é save
  // corrompido/adulterado, não um valor "quase certo" pra saturar em
  // silêncio.
  if (
    !Number.isInteger(save.etapaAtual) ||
    save.etapaAtual < 0 ||
    save.etapaAtual > estado.etapas.length
  ) {
    throw new Error(
      `retomarCampeonato: etapaAtual inválido (${save.etapaAtual}), esperado inteiro em [0, ${estado.etapas.length}]`,
    );
  }

  return { ...estado, etapaAtual: save.etapaAtual };
}

/**
 * Remove o save do modo Campeonato do `storage` (ex.: jogador inicia um
 * campeonato novo). Como `carregarCampeonato`, tolera storage hostil: se
 * `removeItem` lançar, vira no-op com aviso em vez de derrubar o fluxo de
 * "iniciar campeonato novo" (aviso A5 da revisão).
 */
export function limparSave(storage: StorageLike): void {
  try {
    storage.removeItem(CHAVE_SAVE);
  } catch (erro) {
    console.warn('limparSave: storage inacessível', erro);
  }
}
