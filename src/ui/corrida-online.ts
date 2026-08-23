/**
 * A fonte ÚNICA da corrida online (PR 2/4 de "corrida online", Fase 3).
 *
 * 🔴 **A tese deste arquivo é a classe de bug do PR 8.4**: duas trilhas de
 * corrida, cada lado correto isoladamente, a composição errada, e `npm test`
 * não pega — porque hoje, com a mesma seed, as duas trilhas dão o mesmo
 * resultado. O jogador assistiria a uma corrida e veria OUTRA na tabela.
 *
 * A defesa: `useSalaOnline` chama esta função UMA vez (`useMemo`), e a MESMA
 * referência alimenta tanto o hash de divergência (`hashDaCorrida`) quanto a
 * tela (`FluxoCorrida`, via `{ modo: 'pronta', corrida }`). Ninguém mais
 * chama `prepararCorrida` na trilha online — é o que
 * `contrato-corrida-online.test.ts` varre.
 *
 * 🏆 **O PR 3.5.3 acrescentou as ETAPAS do campeonato online** (`etapasDaSala`,
 * `classificacaoDaSala`) e a tese não mudou de forma: continua havendo UMA
 * função que computa corrida online, e agora ela é chamada de dois sítios com
 * dono declarado — a corrida avulsa em `useSalaOnline`, as etapas no `map`
 * daqui —, cada um travado em UMA chamada exata pelo contrato.
 *
 * Mora em `src/ui/`, não em `src/net/`, por força da cerca do ESLint:
 * `prepararCorrida` está em `src/ui/fluxo-corrida.ts` (consome
 * `simularQuali`/`simularCorrida` da engine) e `src/net/**` está proibido de
 * importar `src/ui/**` (isola a camada de rede do front-end). `corrida-online.ts`
 * é o ponto onde a pista sorteada (engine pura) encontra a preparação da
 * corrida (UI) — e por isso vive do lado que pode importar os dois.
 */

import {
  N_ETAPAS,
  acumularClassificacao,
  calendarioSorteado,
  seedDaEtapa,
  type FormatoTemporada,
} from '../engine/campeonato';
import type { Dataset } from '../engine/dataset';
import { pistaSorteada } from '../engine/pista-sorteada';
import type {
  DraftState,
  LinhaClassificacao,
  Pista,
  ResultadoCorrida,
  ResultadoQuali,
} from '../engine/types';
import { prepararCorrida } from './fluxo-corrida';
import type { EtapaDoCalendario } from './fluxo-campeonato';

/** A corrida completa de uma sala online: pista sorteada + grid + resultado, já computados. */
export interface CorridaPreparada {
  pistaId: string;
  pista: Pista;
  grid: ResultadoQuali;
  resultado: ResultadoCorrida;
}

/**
 * Prepara a corrida de uma sala online a partir do draft concluído. Pura e
 * determinística: mesmas entradas ⇒ mesma pista e mesmo resultado, em qualquer
 * cliente que a chame — é essa propriedade que faz os 22 verem a mesma corrida
 * sem o servidor conhecer o dataset.
 *
 * 🔴 **DUAS SEMÂNTICAS DE SEED, e a diferença NÃO é estilo — é a decisão D6 da
 * Fase 6, preservada bit a bit (PR 3.5.3).**
 *
 * - **Sem `pistaId` (corrida avulsa online, PR 1/4):** a pista sai de
 *   `pistaSorteada(seed)` e a simulação usa a seed **CRUA**, exatamente como
 *   a corrida avulsa offline.
 * - **Com `pistaId` (etapa de campeonato online, PR 3.5.3):** a pista vem do
 *   CALENDÁRIO — `pistaSorteada` **não é chamada** — e a simulação usa
 *   `seedDaEtapa(seed, pistaId)`, **a mesma função e o mesmo rótulo
 *   `camp:${pistaId}`** da etapa offline.
 *
 * 🔒 **Inverter isso é a classe de bug do 8.4.** Passar a seed publicada crua
 * (ou re-sortear a pista com ela) produz uma corrida perfeitamente
 * determinística e **diferente da etapa que o offline simula com a mesma seed**
 * — e nada quebra: o hash bate entre os clientes, a tela mostra uma corrida
 * coerente, e só o baseline de conformidade contra `simularEtapa` acusa.
 * ⚠️ Pior: `prepararCorrida` tem **default `seed = draftState.seed`**, então
 * ESQUECER o 4º argumento compila limpo e erra em silêncio.
 */
export function corridaDaSala(
  dataset: Dataset,
  draft: DraftState,
  seed: number,
  pistaId?: string,
): CorridaPreparada {
  const idDaPista = pistaId ?? pistaSorteada(dataset, seed);
  const seedDaSimulacao = pistaId === undefined ? seed : seedDaEtapa(seed, pistaId);
  const { pista, grid, resultado } = prepararCorrida(dataset, draft, idDaPista, seedDaSimulacao);
  return { pistaId: idDaPista, pista, grid, resultado };
}

/**
 * 🏆 As etapas ABERTAS do campeonato online, derivadas do snapshot (PR 3.5.3).
 *
 * 🔒 **Derivação PURA, sem estado local acumulado** — é o que faz o F5
 * funcionar: quem recarrega a página recompõe exatamente as mesmas etapas do
 * snapshot, sem depender de nada que o navegador tenha guardado. Não há
 * "adicionar a etapa nova à lista": a lista inteira é função do snapshot.
 *
 * 🔒 **A etapa k é o PAR `(seedsAbertas[k], calendario[k])`** — as duas metades
 * vêm do servidor pela mesma via e têm que ser casadas pelo MESMO índice. É
 * este pareamento que os baselines M-pista e M-indice atacam.
 *
 * O servidor publica só as seeds já abertas (`seedsAbertas`, crescente), então
 * o comprimento do array é o próprio limite: **as etapas futuras não são
 * computáveis porque a seed delas não está aqui**, não porque alguém se lembrou
 * de cortar a lista.
 *
 * Devolve `[]` em dois casos, e **só nesses dois**: `seedCalendario === null`
 * e `seedsAbertas` vazio. Na prática é o que cobre sala **legado** (nunca teve
 * seeds) e o draft em andamento — mas por caminho INDIRETO, e a diferença
 * importa.
 *
 * ⚠️ **Esta função NÃO olha `draft.fase`, e a redação anterior deste bloco
 * dizia que ela devolvia `[]` "quando o draft ainda não concluiu"** (aviso A5
 * da revisão). Isso é falso: chamada com draft em andamento e `seedsAbertas`
 * não vazio, ela **LANÇA**, por `prepararCorrida` (`fluxo-corrida.ts`). Quem
 * garante que esse par nunca acontece são o portão do SERVIDOR (segura
 * `seedCalendario`/`seedsAbertas` até o draft concluir, mesmo portão da
 * `seedCorrida`) e a guarda de fase do `useSalaOnline`. Quem chamar daqui
 * sem uma das duas recebe exceção, não lista vazia.
 *
 * ✅ **`nEtapas` DO SNAPSHOT É LIDO AQUI desde o 3.5.4 — pendência 0(w) fechada
 * pelo caminho (1).** Antes o formato era o literal `'curta'` (5) enquanto o
 * teto de LEITURA do servidor era `[1, 10]` (`sala.ts`, contra
 * `seedsEtapas.length === MAX_ETAPAS`): uma sala v2 com `nEtapas: 10` era
 * considerada **`ok`**, publicava 6+ seeds abertas, e esta função **lançava**
 * em `calendario[5]` — dentro de um `useMemo`, **em render**, sem
 * `ErrorBoundary` no projeto (medido: zero ocorrências) ⇒ tela branca para os
 * 22, com o F5 rederivando do mesmo snapshot num laço.
 *
 * 🔒 **A ORDEM DOS DOIS PORTÕES É A REGRA, não estilo** (exigência do dev):
 * `seedCalendario === null` é testado **ANTES** do lookup do formato. Sala
 * **legado** publica `nEtapas: 1`, que **não existe** em `N_ETAPAS` — um lookup
 * ingênuo colocado antes faria a sala legado tomar o caminho de erro onde hoje
 * ela devolve `[]` corretamente, trocando um comportamento certo por um errado.
 *
 * 🔑 **O lookup é TOTAL (`formatoDeNEtapas` devolve `null`, nunca lança), e é
 * isso que fecha a pendência de verdade.** O teto do servidor é `[1, 10]`, não
 * `{5, 10}`: uma sala com `nEtapas: 7` passa o discriminante como `ok` e passa
 * o portão da seed. Se o lookup lançasse nesse caso, a 0(w) estaria movida, não
 * fechada — o `throw` em render continuaria alcançável, só que por outro valor.
 *
 * ✅ **Consequência MEDIDA do fechamento:** com o calendário passando a ter
 * exatamente `nEtapas` entradas e o servidor limitando `seedsAbertas` a
 * `nEtapas`, o `throw` de `pistaId === undefined` logo abaixo deixa de ser
 * alcançável por sala válida. Ele **fica** de propósito: continua sendo a
 * resposta certa para um servidor que publique mais etapas abertas do que o
 * calendário comporta, que é incoerência de contrato e não deve ser silenciada.
 */
export function etapasDaSala(
  dataset: Dataset,
  draft: DraftState,
  seedCalendario: number | null,
  seedsAbertas: readonly number[],
  nEtapas: number,
): CorridaPreparada[] {
  if (seedCalendario === null || seedsAbertas.length === 0) return [];
  // 🔒 **PENDÊNCIA 0(w), FECHADA AQUI pelo caminho (1)** — o formato sai de
  // `sala.nEtapas`, não é mais o literal `'curta'`. O rótulo `'calendario'`
  // continua sendo o mesmo e nenhum rótulo novo nasce.
  const formato = formatoDeNEtapas(nEtapas);
  if (formato === null) return [];
  const calendario = calendarioSorteado(dataset, seedCalendario, formato);
  return seedsAbertas.map((seed, k) => {
    const pistaId = calendario[k];
    // Lança alto em vez de derivar `undefined`: um servidor publicando mais
    // etapas abertas do que o calendário tem é incoerência de contrato, e o
    // silêncio aqui viraria uma etapa com pista errada mais adiante.
    if (pistaId === undefined) {
      throw new Error(
        `etapasDaSala: ${seedsAbertas.length} etapas abertas para um calendário de ${calendario.length}`,
      );
    }
    return corridaDaSala(dataset, draft, seed, pistaId);
  });
}

/**
 * 🏆 A classificação acumulada do campeonato online (PR 3.5.3).
 *
 * 🔒 **Delega inteiramente a `acumularClassificacao`** — a MESMA função do
 * offline (pontuação FIA, countback, desempate por `jogadorId`). Reimplementar
 * a soma aqui seria a classe de bug do 8.4 na tabela em vez de na corrida.
 *
 * 🔒 **`jogadorIds` sai de `draft.loadouts`, ordenado como `prepararCorrida`
 * ordena os loadouts que efetivamente correram** (`fluxo-corrida.ts:80-82`).
 * Não monta roster próprio de propósito: `montarJogadores` já está duplicado
 * entre a UI e `src/net/` (pendência 0(a)) e uma terceira cópia seria pior.
 *
 * Acumula **só as etapas abertas** que recebe — a tabela cresce junto com o
 * cursor do servidor, e nenhuma etapa futura entra na conta.
 *
 * 🔴 **DEVOLVE `[]` COM O DRAFT EM ANDAMENTO, e a guarda mora AQUI de propósito**
 * (aviso A1 da segunda passada da revisão, e o conserto dele em segunda
 * tentativa). `aplicarEscolha` (`engine/draft.ts`) popula `loadouts`
 * **incrementalmente**, antes de `fase: 'concluido'` — medido: na fase de peça
 * de um draft de teste já havia **17 loadouts**, e sem esta guarda a função
 * devolvia 17 linhas zeradas. Um painel do 3.5.4 aberto com
 * `classificacao.length > 0` mostraria a **tabela do campeonato durante o
 * draft**, cheia de zeros, antes de existir etapa nenhuma.
 *
 * 🔑 **Por que na função PURA e não no `useMemo`, onde ela nasceu:** a primeira
 * versão do conserto pôs a guarda no hook, e a **mutação que a apagava
 * SOBREVIVEU a tudo** — o projeto não tem jsdom, então guarda dentro do hook é
 * inalcançável por teste. Guarda sem baseline é exatamente o defeito que este
 * PR existe para combater. Aqui ela tem mutação vermelha ao lado.
 */
export function classificacaoDaSala(
  etapas: readonly CorridaPreparada[],
  draft: DraftState,
): LinhaClassificacao[] {
  if (draft.fase !== 'concluido') return [];
  const jogadorIds = Object.keys(draft.loadouts).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return acumularClassificacao([...etapas], jogadorIds);
}

/**
 * 🏆 O formato de temporada que tem exatamente `nEtapas` etapas (PR 3.5.4) —
 * o lookup REVERSO de `N_ETAPAS`.
 *
 * 🔒 **TOTAL de propósito: devolve `null`, nunca lança.** É a metade que fecha
 * a pendência 0(w). O teto de LEITURA de `nEtapas` no servidor é `[1, 10]`
 * (`src/net/sala.ts`, contra `seedsEtapas.length`), e **não** `{5, 10}` — então
 * `nEtapas: 7` é uma sala `ok` para o discriminante, sem formato correspondente
 * aqui. Uma versão que lançasse teria MOVIDO a 0(w) (o `throw` em render
 * continuaria alcançável, por outro valor) em vez de fechá-la.
 *
 * ⚠️ **Sala LEGADO publica `nEtapas: 1`** e cai neste `null` — mas quem a
 * protege de verdade é o portão `seedCalendario === null` **antes** desta
 * chamada, em `etapasDaSala`. Este `null` é a segunda linha de defesa, não a
 * primeira.
 *
 * 🔑 **Deriva de `N_ETAPAS`, não repete os números.** Escrever `5 → 'curta'` à
 * mão aqui criaria uma segunda fonte para o mesmo fato, e mudar o formato num
 * lugar só é a classe de bug do 8.4 na tabela de formatos.
 */
export function formatoDeNEtapas(nEtapas: number): FormatoTemporada | null {
  for (const [formato, n] of Object.entries(N_ETAPAS) as [FormatoTemporada, number][]) {
    if (n === nEtapas) return formato;
  }
  return null;
}

/**
 * 🏆 O índice da etapa que o jogador corre AGORA (PR 3.5.4). `-1` quando não há
 * etapa aberta nenhuma.
 *
 * 🔒 **É `etapas.length - 1`, e NUNCA `sala.etapaAtual` — invariante herdada do
 * 3.5.3, travada pelo dev.** Sob a pendência 0(t) os dois **não** dizem o
 * mesmo: uma sala `corrompida` publica `etapaAtual: 4` junto com
 * `seedsAbertas: []`, um snapshot que se autocontradiz. Derivando do
 * comprimento, uma sala assim dá `-1` e a tela não abre etapa nenhuma;
 * indexando pelo cursor, `etapas[4]` de uma lista vazia é `undefined` e a 0(t)
 * volta como **tela quebrada**. O 3.5.3 melhorou a 0(t) justamente por nunca
 * ler `etapaAtual`, e é fácil desfazer isso sem perceber.
 *
 * 🔑 **Existe como FUNÇÃO, e não inline no JSX, por causa do baseline.** O
 * projeto não tem jsdom (medido no 3.5.3), então nada dentro do componente é
 * alcançável por mutação — escrita inline, a troca por `sala.etapaAtual` não
 * teria como ficar vermelha, e a invariante mais importante do PR estaria
 * defendida só por comentário. Aqui ela tem mutação vermelha ao lado (M2).
 */
export function etapaCorrenteDaSala(etapas: readonly CorridaPreparada[]): number {
  return etapas.length - 1;
}

/** O que o cliente deve atestar agora, e sob qual etapa (PR 3.5.4). */
export interface AlvoDoAtestado {
  /** A corrida cujo hash vai no atestado — a MESMA referência que vai à tela. */
  corrida: CorridaPreparada;
  /** A etapa do campeonato; `undefined` na corrida avulsa (sala sem etapas). */
  etapa: number | undefined;
}

/**
 * 🔴 **QUAL corrida o cliente atesta — e ela é UMA SÓ (PR 3.5.4).**
 *
 * 🔑 **ACHADO DESTE PR, e não estava no plano: sem esta função o 3.5.4 produz
 * ALARME FALSO TRAVADO — o bug exato que o conserto do detector do 3.5.2 existe
 * para matar.** A cadeia, verificada no código:
 *
 * 1. A sala publica `seedCorrida` (corrida avulsa, PR 1/4) **e**
 *    `seedsAbertas` (etapas, 3.5.1) — as duas convivem no mesmo snapshot.
 * 2. O atestado da avulsa vai **sem `etapa`**, e `protocolo.ts:113-115` diz o
 *    que o servidor faz nesse caso: usa o `etapaAtual` **dele**. Ou seja, o
 *    atestado da avulsa cai no balde `corrida:k` — o MESMO balde da etapa k.
 * 3. Os dois hashes **diferem por construção**: a avulsa simula com a
 *    `seedCorrida` **crua**, a etapa com `seedDaEtapa(seed, pistaId)`. É a
 *    decisão D6, preservada de propósito (ver `corridaDaSala`).
 * 4. `alarmado: base.alarmado || divergentes.length > 0` não volta atrás ⇒
 *    **banner de divergência permanentemente errado**, no PR que finalmente
 *    liga o campeonato na tela.
 *
 * 🔒 **A regra: campeonato tem PRECEDÊNCIA sobre a avulsa.** Havendo etapa
 * aberta, é a etapa corrente que vale — para o hash E para a tela, que é a
 * mesma referência (a tese de `corridaDaSala`). A avulsa só sobra em sala sem
 * etapa nenhuma, que é a sala **legado** (nunca teve seeds).
 *
 * 🔑 **Mora aqui, e não no `useEffect` que envia, pelo motivo de sempre:** sem
 * jsdom nada dentro do hook é alcançável por mutação, e uma precedência
 * invertida lá dentro passaria por todos os portões — que é exatamente como
 * este bug entraria. Aqui ela tem mutação vermelha ao lado (M6).
 */
export function alvoDoAtestado(
  corrida: CorridaPreparada | null,
  etapas: readonly CorridaPreparada[],
): AlvoDoAtestado | null {
  const corrente = etapaCorrenteDaSala(etapas);
  const etapa = etapas[corrente];
  if (etapa !== undefined) return { corrida: etapa, etapa: corrente };
  return corrida === null ? null : { corrida, etapa: undefined };
}

/**
 * 🏆 O calendário INTEIRO da sala, anotado pra tela (PR 3.5.4) — o análogo
 * online de `calendarioAnotado` (`fluxo-campeonato.ts`), que só serve ao
 * offline porque exige um `EstadoCampeonato`, e o `B-indep` não tem nenhum
 * (não há `iniciarCampeonato` no online).
 *
 * 🔴 **Devolve o calendário INTEIRO, incluindo as etapas ainda FECHADAS** — é
 * exatamente por isso que ele não sai de `etapasDaSala`, que expõe só as
 * abertas. O `PainelCalendario` precisa desenhar as pistas que ainda vêm; é
 * essa lista que faz a tela parecer um campeonato e não uma corrida avulsa.
 * ⚠️ **Pista futura NÃO é spoiler; vencedor futuro é.** O calendário do offline
 * mostra as 5 pistas desde a etapa 1, e a decisão travada do 8.3 é sobre o
 * VENCEDOR — ver abaixo.
 *
 * 🔒 **`etapasVistas` é a fronteira do spoiler, e é parâmetro EXPLÍCITO de
 * propósito** (é o mesmo papel que `etapaAtual` faz em `calendarioAnotado`).
 * `vencedorId` só sai de etapa com `indice < etapasVistas`. Não basta a etapa
 * estar em `etapas`: **todas as abertas estão simuladas em memória o tempo
 * todo**, inclusive a que o jogador ainda está assistindo. Revelar o vencedor
 * de uma corrida que ele ainda vai ver estragaria a corrida — é a decisão
 * travada do 8.3, e o teste dela lá cobre a função offline, não esta.
 *
 * 🔑 **Quem chama passa `etapas.length`, e isso é correto SÓ porque o painel
 * vive no `extraResultado`** (`FluxoCorrida.tsx:80-87`, sob
 * `if (fase === 'resultado')`): naquele ponto o jogador já assistiu à etapa
 * corrente. Renderizar este calendário em qualquer ponto ANTERIOR ao resultado
 * — grid, replay — passaria a revelar o vencedor da corrida em curso. **A
 * defesa é estrutural (onde o painel é montado), e por isso está dita aqui.**
 */
export function calendarioDaSala(
  dataset: Dataset,
  seedCalendario: number | null,
  nEtapas: number,
  etapas: readonly CorridaPreparada[],
  etapasVistas: number,
): EtapaDoCalendario[] {
  // Os mesmos dois portões de `etapasDaSala`, na MESMA ordem e pelo mesmo
  // motivo (sala legado publica `nEtapas: 1`): seed antes do formato.
  if (seedCalendario === null) return [];
  const formato = formatoDeNEtapas(nEtapas);
  if (formato === null) return [];
  return calendarioSorteado(dataset, seedCalendario, formato).map((pistaId, indice) => {
    const disputada = indice < etapasVistas;
    const etapa = etapas[indice];
    return {
      pistaId,
      numero: indice + 1,
      disputada,
      proxima: indice === etapasVistas,
      vencedorId:
        disputada && etapa ? (etapa.resultado.classificacao[0]?.jogadorId ?? null) : null,
    };
  });
}
