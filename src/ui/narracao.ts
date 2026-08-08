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
 * - afirmar manobra ou local ("ultrapassou na freada da curva 1");
 * - afirmar clima evoluindo ("começou a chover", "a pista seca") — `chuva` é
 *   uma flag global da corrida inteira, não existe clima por volta;
 * - narrar pit como troca pra pneu de chuva — a engine documenta que desgaste
 *   e janela de pit NÃO mudam com chuva.
 * As frases abaixo são sabor sobre um deslize que a engine de fato computou;
 * nenhuma delas afirma nada que a simulação não tenha decidido.
 */

import { deriveSeed } from '../engine/rng';
import type { EventoCorrida, ResultadoCorrida, TipoEvento } from '../engine/types';
import { acumularVoltas } from './fluxo-corrida';

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
    'alargou demais e perdeu tempo',
    'se atrapalhou na troca de marcha',
  ],
  'quebra-chassi': [
    'quebrou o chassi — abandonou',
    'sentiu o carro ceder e parou — abandonou',
    'teve falha estrutural — abandonou',
  ],
  'quebra-motor': [
    'estourou o motor — abandonou',
    'perdeu potência e encostou o carro — abandonou',
    'viu fumaça na traseira e parou — abandonou',
  ],
  'problema-tecnico': [
    'teve problema técnico',
    'perdeu tempo com uma pane',
    'reclamou do carro no rádio e perdeu tempo',
  ],
  investigacao: [
    'ficou sob investigação',
    'foi chamado pelos comissários',
    'levou punição por infração',
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
    'escapou numa poça e perdeu tempo',
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
 * Um evento já pronto pra narrar: a variante de texto (PR A) mais a
 * consequência HONESTA daquele incidente (PR B).
 */
export interface EventoNarrado {
  evento: EventoCorrida;
  /** Variante escolhida por `narrarEvento`. */
  frase: string;
  /**
   * `jogadorId` de quem passou X **por causa deste incidente** — e `null`
   * quando não dá pra afirmar isso. Ver o critério contrafactual em
   * `narrarEventos`. Nunca preencher isto por coincidência de volta.
   */
  caiuAtrasDe: string | null;
  /** A volta do evento é uma volta de pit DESTE carro (`voltasDePit`). */
  entrouNosBoxes: boolean;
}

/**
 * Tipos de evento que podem receber consequência causal.
 *
 * `quebra-*` são DNF com `custoMs: 0` — não há tempo perdido *dentro* da volta
 * pra explicar troca de posição. E **`investigacao` nunca entra**: a
 * penalidade é somada PÓS-CORRIDA e, por contrato de `historicoVoltas`, não
 * está em volta nenhuma — atribuir a ela uma troca de posição seria falso por
 * construção, não impreciso.
 */
const TIPOS_COM_CUSTO_NA_VOLTA: readonly TipoEvento[] = ['erro-piloto', 'problema-tecnico'];

/**
 * Desempate estável quando dois eventos do mesmo carro empatam em `custoMs`.
 * Ordem fixa, nunca `localeCompare` (consultaria a collation do host).
 */
const ORDEM_TIPO: readonly TipoEvento[] = [
  'erro-piloto',
  'problema-tecnico',
  'quebra-motor',
  'quebra-chassi',
  'investigacao',
];

/**
 * Narra todos os eventos de uma corrida, ligando erro a consequência **só
 * quando os dados sustentam a ligação**.
 *
 * ## O critério é CONTRAFACTUAL, não coincidência
 *
 * "Errou na volta V e perdeu posição na volta V" **ainda mentiria**: o Y podia
 * vir 3 s mais rápido e passar de qualquer jeito. Com
 * `cum(v) = acumularVoltas(historico)[v-1]` (o `custoMs` do incidente **já
 * está dentro** de `historico[V-1]`), a linha causal só sai se as três
 * valerem, todas estritas:
 *
 * 1. `cumX(V-1) < cumY(V-1)` — X estava à frente antes;
 * 2. `cumY(V) < cumX(V)` — Y está à frente depois;
 * 3. `cumY(V) > cumX(V) - custos` — **sem o incidente, X continuaria à
 *    frente**. É esta que separa causalidade de coincidência.
 *
 * Se (3) falha, Y passaria mesmo sem o erro: narra-se só o erro. O resultado
 * prático é **menos** linhas causais do que uma regra ingênua produziria — e é
 * exatamente esse o ponto. A engine **não modela disputa carro a carro**
 * (cada carro é simulado isoladamente; trocas de posição são derivadas de
 * tempos independentes), então toda afirmação de causalidade que não passe
 * por aqui é invenção.
 *
 * ## Portões adicionais
 *
 * - **Volta 1 nunca tem causalidade**: `cum(0)` é 0 pra todo mundo, não há
 *   estado anterior de onde derivar um flip.
 * - **Volta de pit de X desqualifica a causalidade** e vira `entrouNosBoxes`:
 *   o tempo daquela volta está dominado pelo pit, não pelo erro. (Na prática o
 *   contrafactual já fecharia esse portão sozinho — subtrair só o `custoMs` do
 *   erro deixa X atrás —, mas o gate explícito é o que rende o rótulo honesto
 *   em vez de silêncio.) O pit de **Y** não desqualifica nada: se Y parou e
 *   ainda assim passou, o erro de X segue sendo o que explica a troca.
 * - **Candidatos a Y**: só carros com `historico.length >= V`. Isso exclui,
 *   por construção, quem abandonou antes — sem precisar de caso especial pra
 *   DNF.
 * - **Vários eventos do mesmo carro na mesma volta**: o contrafactual usa a
 *   SOMA dos custos daquela volta, e a linha sai atribuída ao de maior
 *   `custoMs` (empate por `ORDEM_TIPO`). Sem isso, dois eventos reivindicariam
 *   o mesmo flip e sairiam duas linhas causais pra uma troca só.
 *
 * ## O que o chamador deve fazer com `caiuAtrasDe`
 *
 * Fraseado **relacional** ("caiu atrás de Y"), NUNCA posição absoluta ("caiu
 * para 8º"): `classificacaoAoVivo` ordena por progresso contínuo no instante
 * do replay, enquanto isto compara na fronteira da volta. São ordenações
 * diferentes, e imprimir um número produziria contradição visível ao lado do
 * painel. E nunca inventar manobra ou local ("passou na freada da curva 1").
 */
export function narrarEventos(resultado: ResultadoCorrida): EventoNarrado[] {
  // Acumulados por jogador, calculados uma vez (não por evento).
  const acumulados = new Map<string, number[]>();
  for (const [jogadorId, historico] of Object.entries(resultado.historicoVoltas)) {
    acumulados.set(jogadorId, acumularVoltas(historico));
  }

  /** Tempo acumulado de `jogadorId` ao FIM da volta `v` (1-based); `null` se ele não completou. */
  const cum = (jogadorId: string, v: number): number | null => {
    if (v <= 0) return 0; // fronteira antes da largada: todos empatados em 0
    const acumulado = acumulados.get(jogadorId);
    if (!acumulado || acumulado.length < v) return null;
    // Defesa em profundidade: o `tsconfig` não tem `noUncheckedIndexedAccess`,
    // então o TS tipa isto como `number` mesmo se o índice não existir. Um
    // `undefined` vazando daqui não explodiria — ele silenciaria, porque toda
    // comparação numérica com `undefined` é `false` e a linha causal
    // simplesmente sumiria sem erro. Falha silenciosa é o que este projeto
    // trata como inaceitável, então o `null` é explícito.
    const valor: number | undefined = acumulado[v - 1];
    return valor === undefined ? null : valor;
  };

  // Custo total, por carro e por volta, dos incidentes que de fato pesam
  // DENTRO da volta — é o que o contrafactual desconta.
  const custoPorCarroVolta = new Map<string, number>();
  // Qual evento, dentre os do mesmo carro/volta, recebe a linha causal.
  const donoDaLinha = new Map<string, EventoCorrida>();
  for (const evento of resultado.eventos) {
    if (!TIPOS_COM_CUSTO_NA_VOLTA.includes(evento.tipo)) continue;
    const chave = `${evento.jogadorId}#${evento.volta}`;
    custoPorCarroVolta.set(chave, (custoPorCarroVolta.get(chave) ?? 0) + evento.custoMs);
    const atual = donoDaLinha.get(chave);
    if (atual === undefined || venceComoDono(evento, atual)) donoDaLinha.set(chave, evento);
  }

  return resultado.eventos.map((evento) => {
    const chave = `${evento.jogadorId}#${evento.volta}`;
    const entrouNosBoxes = (resultado.voltasDePit[evento.jogadorId] ?? []).includes(evento.volta);
    return {
      evento,
      frase: narrarEvento(evento, resultado.seed, resultado.chuva),
      entrouNosBoxes,
      caiuAtrasDe:
        donoDaLinha.get(chave) === evento && !entrouNosBoxes
          ? quemPassou(evento, custoPorCarroVolta.get(chave) ?? 0, resultado, cum)
          : null,
    };
  });
}

/** `true` se `candidato` deve ficar com a linha causal no lugar de `atual`. */
function venceComoDono(candidato: EventoCorrida, atual: EventoCorrida): boolean {
  if (candidato.custoMs !== atual.custoMs) return candidato.custoMs > atual.custoMs;
  return ORDEM_TIPO.indexOf(candidato.tipo) < ORDEM_TIPO.indexOf(atual.tipo);
}

/**
 * Aplica o contrafactual e devolve quem passou X por causa do incidente, ou
 * `null`. Havendo mais de um candidato, escolhe o que ficou IMEDIATAMENTE à
 * frente (maior `cumY(V)` entre os que passam), com desempate por `jogadorId`
 * — determinístico, sem `localeCompare`.
 */
function quemPassou(
  evento: EventoCorrida,
  custosNaVolta: number,
  resultado: ResultadoCorrida,
  cum: (jogadorId: string, v: number) => number | null,
): string | null {
  const { jogadorId: x, volta: v } = evento;
  if (v <= 1) return null; // volta 1: não há fronteira anterior

  const xAntes = cum(x, v - 1);
  const xDepois = cum(x, v);
  if (xAntes === null || xDepois === null) return null;

  let escolhido: string | null = null;
  let melhorCum = -Infinity;

  for (const y of Object.keys(resultado.historicoVoltas)) {
    if (y === x) continue;
    const yAntes = cum(y, v - 1);
    const yDepois = cum(y, v);
    // `null` aqui é o filtro de elegibilidade: quem não completou a volta V
    // (abandonou antes) nunca pode ser nomeado como quem passou.
    if (yAntes === null || yDepois === null) continue;

    const estavaAtras = xAntes < yAntes;
    const passouAgora = yDepois < xDepois;
    // O contrafactual: sem os custos da volta, X ainda estaria à frente.
    const seguiriaNaFrente = yDepois > xDepois - custosNaVolta;
    if (!estavaAtras || !passouAgora || !seguiriaNaFrente) continue;

    if (yDepois > melhorCum || (yDepois === melhorCum && escolhido !== null && y < escolhido)) {
      melhorCum = yDepois;
      escolhido = y;
    }
  }

  return escolhido;
}
