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
 * Compara duas linhas por countback FIA: maior número de 1ºs lugares vence;
 * empatando, maior número de 2ºs; empatando, 3ºs; e assim por diante até a
 * última posição do histograma. `posicoes` das duas linhas têm sempre o
 * mesmo tamanho (fixado em `acumularClassificacao`).
 * Devolve 0 se os dois histogramas forem idênticos (empate absoluto, cabe ao
 * chamador desempatar por `jogadorId`).
 *
 * O `?? 0` e o `Math.max` dos tamanhos são cinto-e-suspensório de propósito:
 * o tamanho igual é invariante garantido pelo construtor das linhas, mas é
 * invariante de doc-comment, não de tipo. Se algum dia uma linha vier de
 * outro caminho (desserialização de save, PR 6.5), ler índice inexistente
 * daria `undefined - n = NaN` — e `NaN` num comparador de `sort` não falha:
 * corrompe a ordem em SILÊNCIO, exatamente o modo de falha que o
 * determinismo do projeto não tolera.
 */
function cmpCountback(a: LinhaClassificacao, b: LinhaClassificacao): number {
  const tamanho = Math.max(a.posicoes.length, b.posicoes.length);
  for (let i = 0; i < tamanho; i++) {
    const pa = a.posicoes[i] ?? 0;
    const pb = b.posicoes[i] ?? 0;
    if (pa !== pb) return pb - pa;
  }
  return 0;
}

/**
 * Agrega os resultados de várias etapas numa classificação por jogador:
 * pontos somados, histograma de posições de chegada (`posicoes`), vitórias
 * (posição 1) e pódios (posição <= 3) — ambos DERIVADOS do histograma, nunca
 * contados em paralelo (garante `vitorias === posicoes[0]` e
 * `podios === posicoes[0] + posicoes[1] + posicoes[2]` por construção, sem
 * risco de os dois caminhos divergirem) —, voltas mais rápidas (jogador
 * cravou `resultado.voltaMaisRapida` naquela etapa) e DNFs (status 'dnf').
 *
 * ELEGIBILIDADE (A1 da revisão do PR 6.1): posição no histograma, pódio e
 * volta mais rápida só contam pra quem TERMINOU a corrida, espelhando a regra
 * da própria engine ("pontos FIA só pra quem terminou", `corrida.ts:436`).
 * Dois casos reais exigem isso:
 * - `simularCorrida` ordena finalizadores primeiro, mas quando MENOS DE 3
 *   CARROS TERMINAM um abandono cai em `posicao <= 3` — improvável num grid
 *   de 22, plausível em campeonato de poucos jogadores.
 * - Numa corrida 100% DNF a engine cai num fallback que aponta
 *   `voltaMaisRapida` pra um abandonador e NÃO credita o ponto de bônus
 *   (`corrida.ts:453-469`); o contador espelha exatamente essa elegibilidade.
 * Sem isso os contadores creditariam feitos a quem marcou 0 ponto — e o
 * desempate FIA (countback) consome justamente o histograma.
 *
 * `jogadorIds` fixa o universo de jogadores a agregar (garante linha com 0
 * em tudo mesmo se `etapas` estiver vazio ou não cobrir algum jogador).
 *
 * TAMANHO DO HISTOGRAMA (aviso 1 da revisão do PR 6.2): é
 * `max(jogadorIds.length, maior posição de finalizador observada)`, não
 * simplesmente `jogadorIds.length`. Em campeonato real os dois coincidem (o
 * grid é o mesmo em toda etapa), mas `acumularClassificacao` é exportada: se
 * um chamador agregar um SUBGRUPO (`jogadorIds` menor que o grid da corrida),
 * dimensionar por `jogadorIds.length` faria a chegada em posição alta ser
 * descartada em silêncio — e como `vitorias`/`podios` são derivados do
 * histograma, os dois sairiam errados sem nenhum erro. Todas as linhas
 * compartilham o MESMO tamanho, invariante de que `cmpCountback` depende.
 *
 * Ordenação (PR 6.2, critério FIA oficial): pontos desc; empatando,
 * countback (`cmpCountback`, acima); empatando ainda (histograma idêntico),
 * `jogadorId` ascendente (code unit) — garante ordem TOTAL e ESTÁVEL, sem o
 * que a classificação seria não-determinística num empate absoluto.
 */
export function acumularClassificacao(
  etapas: EtapaCampeonato[],
  jogadorIds: string[],
): LinhaClassificacao[] {
  // Pré-passo: dimensiona o histograma pra caber a maior posição de
  // finalizador observada (ver "TAMANHO DO HISTOGRAMA" no doc-comment).
  let tamanhoHistograma = jogadorIds.length;
  for (const etapa of etapas) {
    for (const item of etapa.resultado.classificacao) {
      if (item.status === 'terminou' && item.posicao > tamanhoHistograma) {
        tamanhoHistograma = item.posicao;
      }
    }
  }

  const porJogador = new Map<string, LinhaClassificacao>(
    jogadorIds.map((jogadorId) => [
      jogadorId,
      {
        jogadorId,
        pontos: 0,
        vitorias: 0,
        podios: 0,
        voltasRapidas: 0,
        dnfs: 0,
        posicoes: new Array(tamanhoHistograma).fill(0),
      },
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
      // O pré-passo acima garante que `idx` sempre cabe (nunca há descarte
      // silencioso); o guard de `>= 0` protege só contra posição inválida.
      const idx = item.posicao - 1;
      if (idx >= 0) linha.posicoes[idx]++;
    }
    const autorVoltaRapida = etapa.resultado.voltaMaisRapida.jogadorId;
    const terminou = etapa.resultado.classificacao.some(
      (item) => item.jogadorId === autorVoltaRapida && item.status === 'terminou',
    );
    const linhaVoltaRapida = porJogador.get(autorVoltaRapida);
    if (terminou && linhaVoltaRapida) linhaVoltaRapida.voltasRapidas++;
  }

  // vitorias/podios DERIVADOS do histograma (não contados em paralelo) — ver
  // doc-comment acima.
  for (const linha of porJogador.values()) {
    linha.vitorias = linha.posicoes[0] ?? 0;
    linha.podios = (linha.posicoes[0] ?? 0) + (linha.posicoes[1] ?? 0) + (linha.posicoes[2] ?? 0);
  }

  return [...porJogador.values()].sort((a, b) => {
    if (a.pontos !== b.pontos) return b.pontos - a.pontos;
    const countback = cmpCountback(a, b);
    if (countback !== 0) return countback;
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
