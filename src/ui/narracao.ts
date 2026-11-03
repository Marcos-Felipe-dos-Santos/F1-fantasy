/**
 * Narração dos eventos da corrida (PR A da rodada de narração rica).
 *
 * Antes disto o jogo tinha UMA frase por tipo de evento (`ROTULOS_EVENTO`, em
 * `TelaCorrida.tsx`): toda batida virava "Erro de pilotagem". Aqui cada evento
 * ganha uma variante escolhida DETERMINISTICAMENTE, e a chuva troca o
 * vocabulário.
 *
 * ## Determinismo — a regra que este módulo não pode quebrar
 *
 * A escolha usa `deriveSeed` como **HASH PURO**, nunca como stream de RNG:
 * não há `createRng` aqui, não há estado mutável, não se consome sequência
 * nenhuma. É uma função de dados já congelados (`seed` da corrida + jogador +
 * volta + tipo) para um índice. Consequências, todas necessárias:
 *
 * - **Nenhum tempo de volta muda** e **nenhum RNG novo é consumido** — as
 *   seeds de ouro e o `balance-harness` ficam intactos por construção. Era
 *   restrição explícita do dev.
 * - A mesma corrida narra igual sempre, em qualquer máquina: reabrir um save
 *   ou reassistir um replay não reescreve o que foi dito.
 *
 * Por isso este arquivo entra na lista de arquivos críticos de determinismo do
 * `eslint.config.js`, ao lado de `persistencia.ts` e `fluxo-campeonato.ts`.
 *
 * ## O que a narração NÃO pode dizer
 *
 * A engine simula **cada carro isoladamente** — não existe disputa carro a
 * carro. Então é proibido, aqui e em qualquer evolução deste módulo:
 * - afirmar manobra ou local ("ultrapassou na freada da curva 1"): o ponto do incidente
 *   na tela é sorteado (`sorteioDeLocal`), não é fato da corrida;
 * - afirmar clima evoluindo ("começou a chover", "a pista seca") — `chuva` é
 *   uma flag global da corrida inteira, não existe clima por volta;
 * - narrar pit como troca pra pneu de chuva — a engine documenta que desgaste
 *   e janela de pit NÃO mudam com chuva.
 * As frases abaixo são sabor sobre um deslize que a engine de fato computou;
 * nenhuma delas afirma nada que a simulação não tenha decidido.
 */

import { deriveSeed } from '../engine/rng';
import type { EventoCorrida, ResultadoCorrida, TipoEvento } from '../engine/types';
import type { ReplayDaCorrida } from './fim-da-corrida';
import type { IncidenteNoReplay } from './incidentes-replay';

/**
 * Variantes de tempo seco, por tipo de evento.
 *
 * `erro-piloto` tem o pool maior de propósito: é o evento mais frequente da
 * corrida, e um pool pequeno faria a tela parecer tão repetitiva quanto era
 * antes deste PR (com 3 variantes e 8 erros numa corrida, a repetição é
 * visível). Os demais tipos são raros — 3 variantes já bastam pra não soar
 * gravado.
 */
export const VARIANTES_SECO: Record<TipoEvento, readonly string[]> = {
  'erro-piloto': [
    'errou a entrada da curva',
    'pegou a grama',
    'errou a freada',
    'travou a roda',
    'escapou na saída da curva',
    'perdeu a traseira',
    'alargou demais',
    'se atrapalhou na troca de marcha',
    'saiu da pista por um instante',
    'perdeu o controle do carro',
    'escorregou na zebra',
    'deu uma guinada e quase rodou',
  ],
  'quebra-chassi': [
    'quebrou o chassi — abandonou',
    'sentiu o carro ceder e parou — abandonou',
    'teve falha estrutural — abandonou',
    'parou com a suspensão quebrada — abandonou',
  ],
  'quebra-motor': [
    'estourou o motor — abandonou',
    'perdeu potência e encostou o carro — abandonou',
    'viu fumaça na traseira e parou — abandonou',
    'ficou sem motor — abandonou',
  ],
  'problema-tecnico': [
    'teve problema técnico',
    'teve uma pane',
    'reclamou do carro no rádio',
    'ficou um tempo sem potência',
    'teve uma falha elétrica',
  ],
  investigacao: [
    'foi punido pelos comissários',
    'pagou por uma infração',
    'recebeu a punição dos comissários',
  ],
};

/**
 * Variantes de chuva — **só pra `erro-piloto`, e isso é decisão de
 * honestidade, não economia.**
 *
 * A chuva na engine tem UM efeito sobre incidentes: dobra a chance de erro do
 * piloto (`chuvaMultErro: 2.0`, aplicado só sobre `chanceErro` em
 * `corrida.ts`). Quebra de motor e de chassi rolam contra CONF, que a chuva
 * não toca. Dar vocabulário molhado a uma quebra de motor sugeriria uma
 * relação causal que a simulação não tem.
 */
export const VARIANTES_CHUVA: Partial<Record<TipoEvento, readonly string[]>> = {
  'erro-piloto': [
    'rodou na pista molhada',
    'aquaplanou',
    'escorregou na zebra molhada',
    'perdeu o carro na água',
    'errou a freada no molhado',
    'escapou numa poça',
    'rodou sozinho na água',
    'perdeu a traseira no molhado',
    'derrapou na freada',
  ],
};

/**
 * Escolhe a variante de um evento. Determinística: mesma corrida, mesmo
 * evento ⇒ mesmo texto, sempre.
 *
 * O `tipo` entra na label do hash junto de jogador e volta porque um mesmo
 * carro pode ter DOIS eventos na mesma volta (um erro e um problema técnico):
 * sem ele, os dois cairiam no mesmo índice e o sorteio ficaria correlacionado
 * à toa.
 */
export function narrarEvento(evento: EventoCorrida, seed: number, chuva: boolean): string {
  const variantes = variantesDe(evento.tipo, chuva);
  const hash = deriveSeed(seed, `narracao:${evento.jogadorId}:${evento.volta}:${evento.tipo}`);
  // `deriveSeed` devolve inteiro de 32 bits SEM sinal, mas `>>> 0` deixa isso
  // explícito: um índice negativo aqui daria `undefined` silencioso.
  return variantes[(hash >>> 0) % variantes.length];
}

/**
 * Pool efetivo de um tipo de evento. Cai no pool seco quando não há variante
 * de chuva pro tipo — ver a decisão em `VARIANTES_CHUVA`.
 */
export function variantesDe(tipo: TipoEvento, chuva: boolean): readonly string[] {
  const molhadas = chuva ? VARIANTES_CHUVA[tipo] : undefined;
  return molhadas ?? VARIANTES_SECO[tipo];
}

/**
 * Sorteio de um local na volta, de 0 a 1 (PR 2d): `deriveSeed` como hash puro, como em
 * `narrarEvento`. Mora aqui porque `namespaces-seed.ts` diz que `narracao` é deste
 * arquivo, e `src/engine/` não muda neste PR.
 */
export function sorteioDeLocal(
  seed: number,
  rotulo: 'local' | 'abandono',
  jogadorId: string,
  volta: number,
  tipo: string,
): number {
  return (deriveSeed(seed, `narracao:${rotulo}:${jogadorId}:${volta}:${tipo}`) >>> 0) / 2 ** 32;
}

/**
 * Um evento já pronto pra narrar: a variante de texto (PR A), o instante do carro e a
 * consequência (PR 2d).
 */
export interface EventoNarrado {
  evento: EventoCorrida;
  /** Variante de `variantesDe`, sem repetir na corrida enquanto houver frase nova. */
  frase: string;
  /** Quando acontece na tela: a parada, o abandono ou a passagem pela linha. */
  instante: number;
  /** Tempo do incidente ou da punição; `null` na quebra, que não custa tempo. */
  tempoPerdidoMs: number | null;
  /** Quem passou durante a parada; `null` onde não há parada: quebra e punição. */
  posicoesPerdidas: number | null;
  /** O incidente é na volta de pit deste carro (`voltasDePit`). */
  foiParaOsBoxes: boolean;
}

type ReplayNarrado = Pick<ReplayDaCorrida, 'incidentes' | 'abandono' | 'chegada' | 'progresso'>;

const CACHE_NARRACAO = new WeakMap<ResultadoCorrida, EventoNarrado[]>();

/**
 * Narra a corrida no instante de cada carro, memoizado por identidade de `resultado`,
 * como `replayDaCorrida`: a tela pede isto a cada frame.
 *
 * ## A consequência é contada NA PARADA (decisão do Marcos, PR 2d)
 *
 * O carro parado perde a posição para quem estava atrás dele no início da parada e está à
 * frente no fim. A engine não modela disputa, mas aqui não é preciso: cada carro segue a
 * própria história, e quem cruza um carro parado cruza por causa da parada. É o mesmo
 * progresso que ordena o painel, então o número não briga com ele (`docs/pr2d-medicao.json`:
 * 1642 × 1639 sem perda, contando pelo painel ou pelo contrafactual).
 *
 * Nunca imprimir posição absoluta ("caiu para 8º"): o painel muda enquanto a linha fica na
 * tela. Quebra não custa tempo. E a punição, hoje, não é parada: é somada na passagem pela
 * linha, então não leva posições (`historicoVoltas` não a tem).
 *
 * Evento sem instante na tela não é narrado: o incidente de quem já cruzou a linha.
 */
export function narrarEventos(resultado: ResultadoCorrida, replay: ReplayNarrado): EventoNarrado[] {
  const cache = CACHE_NARRACAO.get(resultado);
  if (cache !== undefined) return cache;

  const narradas: EventoNarrado[] = [];
  const usadas = new Map<TipoEvento, Set<string>>();
  for (const evento of resultado.eventos) {
    const momento = momentoDoEvento(evento, replay);
    if (momento === null) continue;
    const incidente = momento.incidente;
    narradas.push({
      evento,
      frase: fraseNova(evento, resultado, usadas),
      instante: momento.instante,
      tempoPerdidoMs: evento.custoMs > 0 ? evento.custoMs : null,
      posicoesPerdidas: incidente === undefined ? null : quemPassou(resultado, replay, incidente),
      foiParaOsBoxes: (resultado.voltasDePit[evento.jogadorId] ?? []).includes(evento.volta),
    });
  }
  narradas.sort((a, b) => a.instante - b.instante);
  CACHE_NARRACAO.set(resultado, narradas);
  return narradas;
}

function momentoDoEvento(
  evento: EventoCorrida,
  replay: ReplayNarrado,
): { instante: number; incidente?: IncidenteNoReplay } | null {
  if (evento.tipo === 'investigacao') {
    const chegada = replay.chegada(evento.jogadorId);
    return chegada === undefined ? null : { instante: chegada.instante };
  }
  if (evento.tipo === 'quebra-chassi' || evento.tipo === 'quebra-motor') {
    const abandono = replay.abandono(evento.jogadorId);
    return abandono === undefined ? null : { instante: abandono.instante };
  }
  const incidente = replay.incidentes(evento.jogadorId).find((i) => i.evento === evento);
  return incidente === undefined ? null : { instante: incidente.inicio, incidente };
}

/** A variante de `narrarEvento`, ou a próxima do pool que esta corrida ainda não usou. */
function fraseNova(evento: EventoCorrida, resultado: ResultadoCorrida, usadas: Map<TipoEvento, Set<string>>): string {
  const pool = variantesDe(evento.tipo, resultado.chuva);
  const doTipo = usadas.get(evento.tipo) ?? new Set<string>();
  usadas.set(evento.tipo, doTipo);
  if (doTipo.size >= pool.length) doTipo.clear();
  let indice = pool.indexOf(narrarEvento(evento, resultado.seed, resultado.chuva));
  while (doTipo.has(pool[indice])) indice = (indice + 1) % pool.length;
  doTipo.add(pool[indice]);
  return pool[indice];
}

function quemPassou(resultado: ResultadoCorrida, replay: ReplayNarrado, incidente: IncidenteNoReplay): number {
  const progresso = (id: string, t: number) => replay.progresso(id, resultado.historicoVoltas[id], t);
  const ali = progresso(incidente.evento.jogadorId, incidente.inicio);
  return Object.keys(resultado.historicoVoltas).filter(
    (id) => progresso(id, incidente.inicio) <= ali && progresso(id, incidente.fim) > ali,
  ).length;
}

const segundos = (ms: number) => (ms / 1000).toFixed(1).replace('.', ',');

/** ", perdeu 3,2 s e 2 posições", o que vem depois da frase; vazio na quebra. */
export function textoDaConsequencia({ evento, tempoPerdidoMs, posicoesPerdidas }: EventoNarrado): string {
  if (tempoPerdidoMs === null) return '';
  if (evento.tipo === 'investigacao') return ` e levou +${segundos(tempoPerdidoMs)} s`;
  const tempo = `, perdeu ${segundos(tempoPerdidoMs)} s`;
  if (posicoesPerdidas === null || posicoesPerdidas === 0) return tempo;
  return `${tempo} e ${posicoesPerdidas} ${posicoesPerdidas === 1 ? 'posição' : 'posições'}`;
}
