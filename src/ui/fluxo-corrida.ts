/**
 * Transições e matemática puras da corrida do modo Single (PR 1.7b), no
 * mesmo espírito de `fluxo-draft.ts`: funções testáveis sem DOM, que só
 * compõem a engine (`simularQuali`, `simularCorrida`) e cálculo geométrico
 * de apresentação (posição do carro no traçado, escala de tempo do replay).
 * Nenhuma regra de jogo é reimplementada aqui — corrida/pontuação/eventos
 * vêm 100% de `src/engine`.
 *
 * PR 2.5: a pista da corrida é escolhida na TelaInicio (10 pistas do
 * dataset). `PISTA_CORRIDA_ID` permanece como default de `prepararCorrida`
 * (Monza) pra manter o comportamento de antes quando nenhuma pista é
 * informada explicitamente.
 */

import { simularCorrida } from '../engine/corrida';
import type { Dataset } from '../engine/dataset';
import { simularQuali } from '../engine/quali';
import type {
  DraftState,
  Loadout,
  Pista,
  ResultadoCorrida,
  ResultadoQuali,
  Ultrapassagem,
} from '../engine/types';

/** Pista default da corrida (Monza) quando `prepararCorrida` é chamada sem `pistaId` explícito. */
export const PISTA_CORRIDA_ID = 'pista-monza';

/** Ponto 2D usado pelo traçado (mesmo sistema de coordenadas do viewBox SVG). */
export interface Ponto {
  x: number;
  y: number;
}

/**
 * Polilinha de traçado IMUTÁVEL. A imutabilidade não é preferência de estilo:
 * `lutDoTracado` memoiza a tabela de comprimento de arco num `WeakMap` chaveado
 * pela IDENTIDADE do array (PR 7.5). Mutar um ponto in place deixaria a LUT em
 * cache permanentemente dessincronizada, **em silêncio** — antes do 7.5 o erro
 * durava um frame e se auto-corrigia. Este tipo transforma a premissa em
 * garantia do compilador.
 */
export type TracadoImutavel = ReadonlyArray<Readonly<Ponto>>;

/**
 * Monta o grid da quali e simula a corrida a partir de um draft concluído:
 * os `Loadout[]` vêm de `draftState.loadouts`, ordenados por `jogadorId`
 * (estabilidade — a ordem de entrada não muda o resultado, ver contrato de
 * RNG por jogador em `quali.ts`/`corrida.ts`, mas mantém a construção
 * determinística mesmo assim). Usa a seed do próprio draft, então a corrida
 * de um draft concluído é sempre a mesma.
 */
export function prepararCorrida(
  dataset: Dataset,
  draftState: DraftState,
  pistaId: string = PISTA_CORRIDA_ID,
): { pista: Pista; grid: ResultadoQuali; resultado: ResultadoCorrida } {
  if (draftState.fase !== 'concluido') {
    throw new Error('prepararCorrida: o draft precisa estar concluído (fase "concluido")');
  }

  const pista = dataset.pistasById.get(pistaId);
  if (!pista) {
    throw new Error(`prepararCorrida: pista "${pistaId}" não encontrada no dataset`);
  }

  const loadouts: Loadout[] = Object.entries(draftState.loadouts)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, loadout]) => loadout);

  const grid = simularQuali(dataset, loadouts, pista, draftState.seed);
  const resultado = simularCorrida(dataset, loadouts, pista, grid, draftState.seed);

  return { pista, grid, resultado };
}

/** Rótulo + emoji de uma dificuldade de ultrapassagem, pra exibição na TelaInicio (GDD §9). */
const ROTULOS_ULTRAPASSAGEM: Record<Ultrapassagem, { rotulo: string; emoji: string }> = {
  facil: { rotulo: 'Fácil', emoji: '🟢' },
  media: { rotulo: 'Média', emoji: '🟡' },
  dificil: { rotulo: 'Difícil', emoji: '🔴' },
};

/**
 * Cortes do bucket de desgaste (§9): baixo <40, médio 40-69, alto ≥70.
 * Calibrados pros valores reais do dataset (`src/data/pistas.json`, só usa
 * 25/50/75) — Monza/Mônaco/Red Bull Ring (25) caem em baixo; Spa/Interlagos/
 * Imola/Nürburgring (50) em médio; Silverstone/Suzuka/Montreal (75) em alto,
 * batendo com a tabela do GDD §9.
 */
function bucketDesgaste(desgaste: number): 'Baixo' | 'Médio' | 'Alto' {
  if (desgaste < 40) return 'Baixo';
  if (desgaste < 70) return 'Médio';
  return 'Alto';
}

/** Perfil de apresentação de uma pista (GDD §9), pronto pra UI: sem DOM, testável isoladamente. */
export interface PerfilPista {
  ultrapassagem: { rotulo: string; emoji: string };
  desgaste: 'Baixo' | 'Médio' | 'Alto';
  /** Chance de chuva em porcentagem inteira (0-100), já arredondada. */
  chuvaPercentual: number;
  voltas: number;
}

/**
 * Deriva os rótulos de apresentação de uma `Pista` (dificuldade de
 * ultrapassagem, bucket de desgaste, chuva em % e voltas) — usado pela
 * TelaInicio pra informar a escolha da pista antes do draft. Pura, sem
 * dependência de `visibilidade`: perfil de pista é informação pública (não é
 * nota de componente), o Modo Cego não esconde isso.
 */
export function perfilPista(pista: Pista): PerfilPista {
  return {
    ultrapassagem: ROTULOS_ULTRAPASSAGEM[pista.ultrapassagem],
    desgaste: bucketDesgaste(pista.desgaste),
    chuvaPercentual: Math.round(pista.chanceChuva * 100),
    voltas: pista.voltas,
  };
}

/** Tempos acumulados por volta (ms), a partir do histórico de voltas de um carro (`ResultadoCorrida.historicoVoltas[id]`). */
export function acumularVoltas(historico: number[]): number[] {
  const acumulado: number[] = [];
  let soma = 0;
  for (const tempoVolta of historico) {
    soma += tempoVolta;
    acumulado.push(soma);
  }
  return acumulado;
}

/**
 * Fração 0..1 da corrida percorrida por um carro no instante simulado
 * `tempoSimMs`, a partir do seu histórico de voltas. Carro que completou
 * todas as `voltasTotais` fica em 1 assim que `tempoSimMs` alcança a soma do
 * histórico; carro que deu DNF (histórico mais curto que `voltasTotais`)
 * congela em `voltasCompletadas / voltasTotais` pra sempre (o histórico
 * nunca cresce além disso).
 *
 * Fração da CORRIDA INTEIRA (0..1 uma vez, do início ao fim) — não é posição
 * no traçado. Pra desenhar o carro (`pontoNoTracado`), use `fracaoVisual`,
 * que deriva desta função mas dá N voltas visuais no mesmo traçado.
 */
export function progressoNoReplay(
  historico: number[],
  tempoSimMs: number,
  voltasTotais: number,
): number {
  if (historico.length === 0 || voltasTotais <= 0) return 0;

  const acumulado = acumularVoltas(historico);
  const total = historico.length;

  let k = 0;
  while (k < total && acumulado[k] <= tempoSimMs) k++;

  if (k >= total) {
    return total / voltasTotais;
  }

  const inicioVoltaAtual = k === 0 ? 0 : acumulado[k - 1];
  const duracaoVoltaAtual = historico[k];
  const fracaoBruta =
    duracaoVoltaAtual > 0 ? (tempoSimMs - inicioVoltaAtual) / duracaoVoltaAtual : 0;
  const fracaoDentroDaVolta = Math.min(1, Math.max(0, fracaoBruta));

  return (k + fracaoDentroDaVolta) / voltasTotais;
}

/**
 * Fração 0..1 AO LONGO DO TRAÇADO (não da corrida inteira) no instante
 * `tempoSimMs` — o valor a passar pra `pontoNoTracado` (decisão de design:
 * "N voltas visuais", pra bater com o contador "Volta X/N" em vez de o carro
 * percorrer o traçado uma única vez na corrida inteira).
 *
 * Composição sobre `progressoNoReplay`: enquanto o carro ainda está rodando,
 * é só `(progresso × voltasTotais) % 1` — a volta cíclica no mesmo traçado.
 * Quando o carro já passou do seu próprio tempo total (parou de avançar em
 * `progressoNoReplay`):
 * - terminou a corrida ⇒ 0 (congela na linha de chegada/largada);
 * - deu DNF ⇒ 0.5 fixo (congela no meio do traçado, estilização "parou na
 *   pista"). Não reaproveita o `% 1` genérico aqui de propósito: o progresso
 *   de um DNF congelado é sempre `voltasCompletadas / voltasTotais`, uma
 *   fração cujo numerador ao multiplicar por `voltasTotais` vira inteiro
 *   (`voltasCompletadas`) — `% 1` daria 0 e o carro "saltaria" de volta pra
 *   a linha de largada, visualmente errado pra um abandono.
 */
export function fracaoVisual(
  historico: number[],
  tempoSimMs: number,
  status: 'terminou' | 'dnf',
  voltasTotais: number,
): number {
  if (historico.length === 0 || voltasTotais <= 0) return 0;

  const somaHistorico = acumularVoltas(historico).at(-1) ?? 0;
  const parou = tempoSimMs >= somaHistorico;

  if (parou) {
    return status === 'dnf' ? 0.5 : 0;
  }

  const progresso = progressoNoReplay(historico, tempoSimMs, voltasTotais);
  const voltasPercorridas = progresso * voltasTotais;
  return voltasPercorridas % 1;
}

/**
 * Número da volta (1-based) que um carro está cumprindo no instante
 * `tempoSimMs`, a partir do seu histórico de voltas — usado pro contador
 * "Volta X/N" do líder na tela de replay. Clampado em `[1, voltasTotais]`.
 */
export function voltaAtual(historico: number[], tempoSimMs: number, voltasTotais: number): number {
  if (historico.length === 0) return Math.max(1, Math.min(voltasTotais, 1));

  const acumulado = acumularVoltas(historico);
  const total = historico.length;

  let k = 0;
  while (k < total && acumulado[k] <= tempoSimMs) k++;

  const volta = k >= total ? total : k + 1;
  return Math.min(voltasTotais, Math.max(1, volta));
}

/** Segmento entre dois pontos consecutivos do traçado, com comprimento pré-calculado. */
interface SegmentoTracado {
  a: Ponto;
  b: Ponto;
  comprimento: number;
}

/** Tabela de comprimento de arco (LUT) de um traçado fechado — ver `lutDoTracado`. */
interface LutTracado {
  segmentos: SegmentoTracado[];
  comprimentoTotal: number;
}

/**
 * Cache da LUT de comprimento de arco, por IDENTIDADE do array de traçado
 * (não por conteúdo — ver `lutDoTracado`). WeakMap, não `Map`: a chave é o
 * próprio array do traçado, e um traçado que sai de uso (ex.: pista trocada)
 * tem que poder ser coletado pelo GC junto com a entrada do cache. Um `Map`
 * seguraria a referência pra sempre e vazaria memória a cada pista nova
 * visitada na sessão.
 */
const CACHE_LUT = new WeakMap<readonly Ponto[], LutTracado>();

/**
 * LUT (tabela de comprimento de arco) de um `tracado`, MEMOIZADA por
 * identidade do array (PR 7.5). Detalhe de PERFORMANCE, não de algoritmo:
 * antes deste PR, `pontoNoTracado` remontava a lista de segmentos e recalculava
 * `comprimentoTotal` a cada chamada — no replay isso é 22 carros × 60fps sobre
 * um traçado já densificado pela suavização Bézier (PR 7.4, 144-264 pontos),
 * até ~2,5 milhões de objetos alocados por segundo só pra jogar fora no
 * próximo frame (não é gargalo de CPU — é pressão de GC).
 *
 * A chave ser a IDENTIDADE do array (não o conteúdo) só funciona porque
 * `tracadoSuavizado(pistaId)` (`suavizacao.ts:257`) já é memoizada por
 * `pistaId` e devolve sempre a MESMA referência de array pro mesmo id — e é
 * essa mesma referência que `TelaCorrida` passa pra `pontoNoTracado` em todo
 * frame do replay. Premissa (documentada, não garantida pelo tipo): o array
 * do traçado é tratado como IMUTÁVEL depois de criado — nada muta os pontos
 * no lugar. Se algo mutasse, esta LUT ficaria desatualizada silenciosamente.
 *
 * Exportada só porque o teste depende dela pra provar o cache; não é API
 * pensada pra ser chamada fora de `pontoNoTracado`.
 */
export function lutDoTracado(tracado: readonly Ponto[]): LutTracado {
  const existente = CACHE_LUT.get(tracado);
  if (existente !== undefined) return existente;

  const segmentos: SegmentoTracado[] = [];
  let comprimentoTotal = 0;
  for (let i = 0; i < tracado.length; i++) {
    const a = tracado[i];
    const b = tracado[(i + 1) % tracado.length];
    const comprimento = Math.hypot(b.x - a.x, b.y - a.y);
    segmentos.push({ a, b, comprimento });
    comprimentoTotal += comprimento;
  }

  const lut: LutTracado = { segmentos, comprimentoTotal };
  CACHE_LUT.set(tracado, lut);
  return lut;
}

/**
 * Ponto ao longo de uma polilinha FECHADA (o último ponto liga de volta ao
 * primeiro), por comprimento de arco. `fracao` é tomada módulo 1 — o carro dá
 * N voltas no mesmo traçado. Pura: nenhuma chamada de DOM (sem
 * `getPointAtLength`).
 *
 * Pra desenhar a posição de um carro na tela de replay, passe o resultado de
 * `fracaoVisual` (fração cíclica por volta) — não `progressoNoReplay` direto
 * (fração da corrida inteira, o carro daria só 1 volta visual do início ao
 * fim, inconsistente com o contador "Volta X/N").
 *
 * A varredura linear (com `alvo -= segmento.comprimento` acumulativo) é
 * proposital e NÃO deve virar soma de prefixos nem busca binária: qualquer
 * uma das duas mudaria a ORDEM das operações de ponto flutuante e quebraria a
 * identidade bit a bit do resultado nos últimos bits (há goldens do projeto
 * sensíveis a isso, ex. `500.0000000000001`). A LUT (`lutDoTracado`) só
 * evita realocar a mesma tabela a cada chamada — a aritmética abaixo é
 * idêntica à de antes do PR 7.5.
 */
export function pontoNoTracado(tracado: readonly Ponto[], fracao: number): Ponto {
  if (tracado.length === 0) {
    throw new Error('pontoNoTracado: traçado vazio');
  }
  if (tracado.length === 1) {
    return tracado[0];
  }

  const f = ((fracao % 1) + 1) % 1;

  const { segmentos, comprimentoTotal } = lutDoTracado(tracado);

  if (comprimentoTotal === 0) {
    return tracado[0];
  }

  let alvo = f * comprimentoTotal;
  for (const segmento of segmentos) {
    if (alvo <= segmento.comprimento) {
      const t = segmento.comprimento === 0 ? 0 : alvo / segmento.comprimento;
      return {
        x: segmento.a.x + (segmento.b.x - segmento.a.x) * t,
        y: segmento.a.y + (segmento.b.y - segmento.a.y) * t,
      };
    }
    alvo -= segmento.comprimento;
  }

  // Ponto de fechamento (erro de arredondamento de ponto flutuante no último segmento).
  return tracado[0];
}

/** As 3 velocidades de replay escolhíveis na tela de corrida (PR 2.6). */
export type VelocidadeReplay = 'lenta' | 'media' | 'rapida';

/**
 * Duração-alvo do replay por volta, em ms de relógio real, por velocidade
 * (PR 2.6). Recalibração a partir do valor único anterior (2200ms/volta ⇒
 * ~30s numa corrida de 14 voltas):
 * - `rapida` preserva o valor único de antes (2200ms) — não-regressão pra
 *   quem já jogava com a velocidade "padrão" antiga;
 * - `media` (novo default) é ~2x mais lenta que `rapida` (4500ms) — dá tempo
 *   de ler a classificação ao vivo sem a corrida passar rápido demais;
 * - `lenta` é ~4x mais lenta que `rapida` (9000ms), pra acompanhar incidente
 *   por incidente.
 */
export const MS_REPLAY_POR_VOLTA: Record<VelocidadeReplay, number> = {
  lenta: 9000,
  media: 4500,
  rapida: 2200,
};

/**
 * Fator de conversão de tempo real decorrido (ms de relógio, ex.: delta do
 * `requestAnimationFrame`) pra tempo simulado (ms) avançado no replay: cada
 * ms real avança `escala` ms simulados, de forma que a corrida inteira do
 * líder (`tempoLiderMs`) dure ~`voltas * msPorVolta` ms de relógio.
 *
 * `msPorVolta` tem default `MS_REPLAY_POR_VOLTA.media` só pra manter
 * chamadas antigas (sem o 3º argumento) compilando — comportamento da função
 * não mudou, só passou a receber a duração-por-volta explicitamente em vez
 * de uma constante fixa (PR 2.6, velocidade trocável).
 */
export function escalaReplay(
  tempoLiderMs: number,
  voltas: number,
  msPorVolta: number = MS_REPLAY_POR_VOLTA.media,
): number {
  const duracaoAlvoMs = voltas * msPorVolta;
  if (duracaoAlvoMs <= 0) return 1;
  return tempoLiderMs / duracaoAlvoMs;
}

/**
 * Um item da classificação ao vivo (PR 2.6; status 'pit' no PR 2.7).
 * 'pit' é um rótulo visual sobre 'correndo' — carro ainda rodando cuja volta
 * atual coincide com uma parada registrada em `ResultadoCorrida.voltasDePit`.
 * Não muda a ordenação (ver `classificacaoAoVivo`); 'terminou'/'dnf' têm
 * precedência — um carro já congelado nunca vira 'pit'. O badge dura a volta
 * inteira do pit (aproximação visual — o custo real do pit já está embutido
 * no tempo daquela volta, não é um evento pontual no meio dela).
 */
export interface ItemClassificacaoAoVivo {
  jogadorId: string;
  status: 'correndo' | 'pit' | 'terminou' | 'dnf';
}

/**
 * Classificação ao vivo (PR 2.6): as 22 posições no instante `tempoSimMs` do
 * replay, pro painel ao lado do traçado. `gridLargada` é a ordem de largada
 * (jogadorIds), usada como critério de ordenação enquanto os carros ainda
 * não se diferenciaram por progresso.
 *
 * CONTRATO de ordenação (não é a posição final da engine, é uma projeção
 * visual dela ao longo do tempo):
 * 1. progresso decrescente (`progressoNoReplay` — fração da corrida inteira
 *    já percorrida, 0..1; carro que terminou fica parado em 1, carro em DNF
 *    congela em `voltasCompletadas / voltasTotais` < 1);
 * 2. empate em progresso: se AMBOS terminaram a corrida (status 'terminou'
 *    — logo ambos com progresso exatamente 1), desempata por `tempoTotal`
 *    crescente — a ordem real de chegada; senão (ainda correndo, ou um dos
 *    dois em DNF), desempata pela posição de largada (`gridLargada`).
 *
 * Consequências do contrato: em `tempoSimMs = 0` todo mundo empata em
 * progresso 0 e nenhum terminou ainda, então o desempate por grid reproduz
 * exatamente a ordem de largada; ao final da corrida, quem terminou converge
 * pra ordem exata de `resultado.classificacao` (chegada real) e todo DNF
 * (progresso < 1 pra sempre) afunda naturalmente atrás de quem terminou.
 *
 * O status 'pit' (PR 2.7) é calculado DEPOIS da ordenação — o critério de
 * ordenação usa só 'terminou' vs. o resto, então rotular um carro 'correndo'
 * como 'pit' nunca desloca a posição dele na lista.
 */
export function classificacaoAoVivo(
  resultado: ResultadoCorrida,
  gridLargada: string[],
  tempoSimMs: number,
  voltasTotais: number,
): ItemClassificacaoAoVivo[] {
  const posicaoLargada = new Map(gridLargada.map((jogadorId, indice) => [jogadorId, indice]));
  const tempoTotalPorJogador = new Map(
    resultado.classificacao.map((item) => [item.jogadorId, item.tempoTotal]),
  );

  const itens = resultado.classificacao.map((item) => {
    const historico = resultado.historicoVoltas[item.jogadorId] ?? [];
    const somaHistorico = acumularVoltas(historico).at(-1) ?? 0;
    const congelado = tempoSimMs >= somaHistorico;
    let status: ItemClassificacaoAoVivo['status'] = !congelado
      ? 'correndo'
      : item.status === 'dnf'
        ? 'dnf'
        : 'terminou';
    if (status === 'correndo') {
      const voltasPit = resultado.voltasDePit[item.jogadorId] ?? [];
      const volta = voltaAtual(historico, tempoSimMs, voltasTotais);
      if (voltasPit.includes(volta)) {
        status = 'pit';
      }
    }
    return {
      jogadorId: item.jogadorId,
      status,
      progresso: progressoNoReplay(historico, tempoSimMs, voltasTotais),
    };
  });

  itens.sort((a, b) => {
    if (b.progresso !== a.progresso) return b.progresso - a.progresso;

    const ambosTerminaram = a.status === 'terminou' && b.status === 'terminou';
    if (ambosTerminaram) {
      return (
        (tempoTotalPorJogador.get(a.jogadorId) ?? 0) - (tempoTotalPorJogador.get(b.jogadorId) ?? 0)
      );
    }

    return (posicaoLargada.get(a.jogadorId) ?? 0) - (posicaoLargada.get(b.jogadorId) ?? 0);
  });

  return itens.map(({ jogadorId, status }) => ({ jogadorId, status }));
}

/**
 * Traçado de MONZA (5,793 km, 11 curvas, HORÁRIO) — redesenhado no PR 7.7 a
 * partir da geometria descrita em `referencias/REFERENCIA_TRACADOS.md` §1, sem
 * decalcar mapa nenhum (GDD §14.2). É a única das dez sem imagem de referência:
 * o dev mandou nove das dez, e Monza foi desenhada só pela descrição textual.
 *
 * Duas retas enormes em direções opostas dominam tudo, e é essa proporção
 * reta/curva que carrega o reconhecimento. As três chicanes (Rettifilo, Roggia,
 * Ascari) são DEGRAUS nas retas — se virarem curvas arredondadas, deixa de ser
 * Monza na hora. Lesmo 1+2 juntas fazem o cotovelo, e a Parabólica é o único
 * arco realmente longo e contínuo do traçado.
 *
 * Continua sendo a silhueta de Monza (reaproveitada diretamente por
 * `TRACADOS_POR_PISTA`) E o FALLBACK genérico de `tracadoDaPista` pra um id de
 * pista sem silhueta própria.
 */
export const TRACADO_GENERICO: TracadoImutavel = [
  // Reta principal (Rettifilo Tribune) — a mais longa.
  { x: 134, y: 408 },
  { x: 194, y: 332 },
  { x: 258, y: 252 },
  { x: 322, y: 172 },
  { x: 378, y: 94 },
  { x: 414, y: 48 },
  // Variante del Rettifilo: degrau dir+esq.
  { x: 440, y: 36 },
  { x: 464, y: 84 },
  { x: 512, y: 66 },
  { x: 556, y: 68 },
  // Curva Grande / Biassono: arco amplo à direita.
  { x: 608, y: 78 },
  { x: 668, y: 110 },
  { x: 712, y: 162 },
  { x: 738, y: 222 },
  // Reta de Biassono.
  { x: 756, y: 298 },
  { x: 770, y: 362 },
  // Variante della Roggia: segundo degrau.
  { x: 792, y: 398 },
  { x: 820, y: 388 },
  { x: 832, y: 428 },
  // Lesmo 1 + Lesmo 2 — o cotovelo do L.
  { x: 858, y: 468 },
  { x: 882, y: 500 },
  { x: 876, y: 538 },
  { x: 842, y: 558 },
  // Reta do Serraglio, com kink leve no meio.
  { x: 780, y: 564 },
  { x: 704, y: 556 },
  { x: 628, y: 564 },
  // Variante Ascari: três degraus encadeados.
  { x: 560, y: 562 },
  { x: 514, y: 532 },
  { x: 476, y: 548 },
  { x: 436, y: 518 },
  // Reta traseira.
  { x: 376, y: 524 },
  { x: 304, y: 534 },
  { x: 236, y: 538 },
  // Parabólica: arco longo de raio crescente, fecha na reta principal.
  { x: 176, y: 532 },
  { x: 124, y: 502 },
  { x: 98, y: 460 },
  { x: 106, y: 430 },
];
