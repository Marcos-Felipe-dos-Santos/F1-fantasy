/**
 * Engine de campeonato (PR 6.1): agrega múltiplas etapas de corrida numa
 * classificação por pontos. Promovida de `scripts/balance.ts` (PR 1.6-5.1),
 * que até este PR reimplementava a mesma agregação localmente só pra medir
 * calibração (championRaridade, dnfCount, stdDevPontos). O harness agora
 * importa daqui e deriva as métricas de medição em cima do resultado da
 * engine.
 *
 * Módulo puro, mesmas regras da engine: sem I/O, sem React, sem estado
 * global, sem `Math.random()` — toda aleatoriedade vem de `deriveSeed`.
 */

import type { Dataset } from './dataset';
import { deriveSeed } from './rng';
import { simularQuali } from './quali';
import { simularCorrida } from './corrida';
import type {
  EtapaCampeonato,
  LinhaClassificacao,
  Loadout,
  Pista,
  ResultadoCampeonato,
} from './types';

/**
 * Deriva a seed de uma etapa de campeonato a partir da seed base do
 * campeonato e do id da pista daquela etapa.
 *
 * REGRA CRÍTICA DE DETERMINISMO: o rótulo tem que continuar sendo
 * LITERALMENTE `camp:${pistaId}` (mesmo formato usado em
 * `scripts/balance.ts` desde o PR 1.6). `deriveSeed` hasheia a string
 * inteira — trocar esse prefixo (ex.: pra `etapa:${pistaId}`) muda TODAS as
 * seeds derivadas e destrói, silenciosamente, o baseline do balance-harness
 * calibrado ao longo de várias PRs (metas de vitória de pole, paradas extras,
 * raridade de peça). Não renomear sem decisão explícita do dev, coordenada
 * com uma nova rodada do `balance-harness`.
 */
export function seedDaEtapa(seedBase: number, pistaId: string): number {
  return deriveSeed(seedBase, `camp:${pistaId}`);
}

/**
 * Simula uma etapa (1 pista) de campeonato: classificação (quali) seguida da
 * corrida, usando a MESMA seed pros dois passos — igual ao fluxo de corrida
 * avulsa.
 *
 * Decisão de design D6 (plano da Fase 6): esta função recebe a seed JÁ
 * DERIVADA (crua) e nunca deriva internamente. Isso preserva, bit a bit, 2
 * usos diferentes da mesma dupla quali+corrida:
 * - Corrida avulsa (fluxo atual, `src/ui/fluxo-corrida.ts`): chama
 *   `simularQuali`/`simularCorrida` direto com a seed crua do draft, sem
 *   passar por `seedDaEtapa` — comportamento inalterado por este PR.
 * - Campeonato (`simularCampeonato` abaixo): chama com
 *   `seedDaEtapa(seedBase, pista.id)`, uma seed derivada por etapa.
 */
export function simularEtapa(
  dataset: Dataset,
  loadouts: Loadout[],
  pista: Pista,
  seed: number,
): EtapaCampeonato {
  const grid = simularQuali(dataset, loadouts, pista, seed);
  const resultado = simularCorrida(dataset, loadouts, pista, grid, seed);
  return { pistaId: pista.id, grid, resultado };
}

/**
 * Comparador de string determinístico entre máquinas (code unit, `<`/`>`),
 * NUNCA `localeCompare` (consulta a collation ICU do host e quebraria
 * determinismo entre SOs/versões do Node) — mesmo padrão usado em
 * `scripts/agregar-fatos.ts` e `scripts/balance.ts`.
 */
function cmpJogadorId(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Agrega os resultados de várias etapas numa classificação por jogador:
 * pontos somados, vitórias (posição 1), pódios (posição <= 3), voltas mais
 * rápidas (jogador cravou `resultado.voltaMaisRapida` naquela etapa) e DNFs
 * (status 'dnf').
 *
 * ELEGIBILIDADE (A1 da revisão do PR 6.1): vitória, pódio e volta mais rápida
 * só contam pra quem TERMINOU a corrida, espelhando a regra da própria engine
 * ("pontos FIA só pra quem terminou", `corrida.ts:436`). Dois casos reais
 * exigem isso:
 * - `simularCorrida` ordena finalizadores primeiro, mas quando MENOS DE 3
 *   CARROS TERMINAM um abandono cai em `posicao <= 3` — improvável num grid
 *   de 22, plausível em campeonato de poucos jogadores.
 * - Numa corrida 100% DNF a engine cai num fallback que aponta
 *   `voltaMaisRapida` pra um abandonador e NÃO credita o ponto de bônus
 *   (`corrida.ts:453-469`); o contador espelha exatamente essa elegibilidade.
 * Sem isso os contadores creditariam feitos a quem marcou 0 ponto — e o
 * desempate FIA do PR 6.2 consome justamente estes campos.
 *
 * `jogadorIds` fixa o universo de jogadores a agregar (garante linha com 0
 * em tudo mesmo se `etapas` estiver vazio ou não cobrir algum jogador).
 *
 * Ordenação: pontos desc; empate → jogadorId ascendente (code unit).
 * // desempate provisório — critério FIA no PR 6.2
 */
export function acumularClassificacao(
  etapas: EtapaCampeonato[],
  jogadorIds: string[],
): LinhaClassificacao[] {
  const porJogador = new Map<string, LinhaClassificacao>(
    jogadorIds.map((jogadorId) => [
      jogadorId,
      { jogadorId, pontos: 0, vitorias: 0, podios: 0, voltasRapidas: 0, dnfs: 0 },
    ]),
  );

  for (const etapa of etapas) {
    for (const item of etapa.resultado.classificacao) {
      const linha = porJogador.get(item.jogadorId);
      if (!linha) continue;
      linha.pontos += item.pontos;
      if (item.status === 'dnf') {
        linha.dnfs++;
        continue;
      }
      if (item.posicao === 1) linha.vitorias++;
      if (item.posicao <= 3) linha.podios++;
    }
    const autorVoltaRapida = etapa.resultado.voltaMaisRapida.jogadorId;
    const terminou = etapa.resultado.classificacao.some(
      (item) => item.jogadorId === autorVoltaRapida && item.status === 'terminou',
    );
    const linhaVoltaRapida = porJogador.get(autorVoltaRapida);
    if (terminou && linhaVoltaRapida) linhaVoltaRapida.voltasRapidas++;
  }

  return [...porJogador.values()].sort((a, b) => {
    if (a.pontos !== b.pontos) return b.pontos - a.pontos;
    return cmpJogadorId(a.jogadorId, b.jogadorId);
  });
}

/**
 * Simula um campeonato completo: 1 etapa por pista de `pistas`, na ordem
 * dada, cada uma com a seed derivada de `seedDaEtapa(seedBase, pista.id)`.
 * Como a seed de cada etapa depende só do id da pista (não do índice/ordem
 * do calendário) e a agregação de pontos é comutativa, o resultado NÃO
 * depende da ordem de `pistas` nem da ordem de `loadouts` — só o array
 * `etapas` reflete a ordem em que o calendário foi simulado; a
 * `classificacao` final é sempre a mesma.
 */
export function simularCampeonato(
  dataset: Dataset,
  loadouts: Loadout[],
  pistas: Pista[],
  seedBase: number,
): ResultadoCampeonato {
  if (loadouts.length < 1) {
    throw new Error('simularCampeonato: precisa de ao menos 1 loadout');
  }

  // A seed de cada etapa deriva SÓ do id da pista (ver `seedDaEtapa`), então
  // repetir uma pista no calendário produziria duas etapas bit a bit
  // idênticas — uma corrida clonada dobrando os pontos, em silêncio. Incluir
  // o índice no rótulo resolveria o clone, mas destruiria o baseline do
  // balance-harness; por isso a repetição é rejeitada em vez de suportada.
  const idsPistas = new Set<string>();
  for (const pista of pistas) {
    if (idsPistas.has(pista.id)) {
      throw new Error(`simularCampeonato: pistaId duplicado "${pista.id}"`);
    }
    idsPistas.add(pista.id);
  }

  const etapas = pistas.map((pista) =>
    simularEtapa(dataset, loadouts, pista, seedDaEtapa(seedBase, pista.id)),
  );
  const jogadorIds = loadouts.map((l) => l.jogadorId);
  return { etapas, classificacao: acumularClassificacao(etapas, jogadorIds) };
}
