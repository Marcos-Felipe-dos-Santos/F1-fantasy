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
import type { EventoCorrida, TipoEvento } from '../engine/types';

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
