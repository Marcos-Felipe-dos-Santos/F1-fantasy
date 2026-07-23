/**
 * Balance-harness (PR 1.6, skill "balance-harness": balanceamento é medido,
 * não sentido — GDD §9/§14.3).
 *
 * Mede, em cima do dataset real (`src/data/`), as 3 metas de calibração
 * decididas pelo dev em 2026-07-18 (`PROGRESS.md`, seção "Metas de
 * calibração"):
 *
 * 1. Sinal de grid: pole com carro idêntico deve vencer claramente mais que
 *    61% e bem menos que 95% (alvo ~70-80% em pista de ultrapassagem média).
 * 2. Parada extra em desgaste Alto (75): a maioria dos carros (~40-60%,
 *    variando pelo PNEU do piloto) deve fazer 2+ paradas.
 * 3. Raridade de peça: guarda contra peça (em especial "proibido") dominar
 *    desproporcionalmente os campeonatos frente à taxa com que é usada.
 *
 * Este módulo só exporta funções puras — toda aleatoriedade vem do RNG
 * semeado da engine (`createRng`/`deriveSeed`), nunca de `Math.random()`.
 * `scripts/` pode importar de `src/engine/`; o inverso é proibido (fronteira
 * documentada em CLAUDE.md).
 */

import type { Dataset } from '../src/engine/dataset';
import { deriveSeed } from '../src/engine/rng';
import { simularQuali } from '../src/engine/quali';
import { simularCorrida } from '../src/engine/corrida';
import { criarDraft, resolverBots } from '../src/engine/draft';
import { atribuirPerfis } from '../src/engine/bots';
import type { EquipeAno, Jogador, Loadout, Pista, Raridade, ResultadoQuali } from '../src/engine/types';

// ---------------------------------------------------------------------------
// Meta 1 — sinal de grid (taxa de vitória do pole com carros idênticos).
// ---------------------------------------------------------------------------

export interface TaxaVitoriaPole {
  facil: number;
  media: number;
  dificil: number;
}

/**
 * Carro forte de referência (Red Bull 2023) — idêntico pros dois lados do
 * grid. Resolvido do dataset vivo (nunca ids literais): titular nº1 é
 * `pilotos[0]` da entrada `equipe/ano` (no dataset derivado os titulares vêm
 * ordenados por largadas→points→driverId, então `pilotos[0]` é sempre o
 * piloto principal — Verstappen em Red Bull 2023).
 */
export function loadoutForte(dataset: Dataset, jogadorId: string): Loadout {
  const ea = dataset.equipeAnos.find((e) => e.equipe === 'Red Bull' && e.ano === 2023);
  if (!ea) {
    throw new Error('loadoutForte: equipe/ano "Red Bull" 2023 não encontrado no dataset');
  }
  return {
    jogadorId,
    pilotoId: ea.pilotos[0].id,
    chassiId: ea.chassi.id,
    motorId: ea.motor.id,
    estrategistaId: ea.estrategista.id,
    pitId: ea.pit.id,
    pecaId: 'peca-composto-macio',
  };
}

const SEED_BASE_GRID = 1000;

function taxaVitoriaPoleNaPista(dataset: Dataset, pista: Pista, nSeeds: number): number {
  const loadouts = [loadoutForte(dataset, 'frente'), loadoutForte(dataset, 'atras')];
  // Grid forçado: "frente" sempre na pole, "atras" sempre em 2o — isola o
  // efeito do offset de grid (gridOffsetMs) da variância de corrida.
  const gridForcado: ResultadoQuali = {
    grid: [
      { jogadorId: 'frente', tempo: 0 },
      { jogadorId: 'atras', tempo: 1 },
    ],
  };

  let vitoriasFrente = 0;
  for (let i = 0; i < nSeeds; i++) {
    const seed = deriveSeed(SEED_BASE_GRID, `grid:${pista.id}:${i}`);
    const resultado = simularCorrida(dataset, loadouts, pista, gridForcado, seed);
    const posFrente = resultado.classificacao.find((c) => c.jogadorId === 'frente')!.posicao;
    const posAtras = resultado.classificacao.find((c) => c.jogadorId === 'atras')!.posicao;
    if (posFrente < posAtras) vitoriasFrente++;
  }
  return vitoriasFrente / nSeeds;
}

/**
 * Mede a taxa de vitória de quem larga na pole, com carros idênticos, numa
 * pista representativa de cada nível de dificuldade de ultrapassagem
 * (facil=Monza, media=Spa, dificil=Mônaco).
 */
export function medirVitoriaPole(dataset: Dataset, nSeeds: number): TaxaVitoriaPole {
  const monza = dataset.pistasById.get('pista-monza');
  const spa = dataset.pistasById.get('pista-spa');
  const monaco = dataset.pistasById.get('pista-monaco');
  if (!monza || !spa || !monaco) {
    throw new Error('medirVitoriaPole: pista-monza/pista-spa/pista-monaco ausente do dataset');
  }
  return {
    facil: taxaVitoriaPoleNaPista(dataset, monza, nSeeds),
    media: taxaVitoriaPoleNaPista(dataset, spa, nSeeds),
    dificil: taxaVitoriaPoleNaPista(dataset, monaco, nSeeds),
  };
}

// ---------------------------------------------------------------------------
// Meta 2 — parada extra em pista de desgaste alto, variando pelo PNEU.
// ---------------------------------------------------------------------------

export interface TaxaParadas {
  baixo: number;
  medio: number;
  alto: number;
  /** Dentro do nível alto (Suzuka), taxa de 2+ paradas por faixa de PNEU. */
  altoPorBucket: {
    pneuBaixo: number; // PNEU < 60
    pneuMedio: number; // 60 <= PNEU <= 80
    pneuAlto: number; // PNEU > 80
  };
}

export interface PilotoParadaSpec {
  jogadorId: string;
  pilotoId: string;
  equipe: string;
  ano: number;
}

type BucketPneu = 'pneuBaixo' | 'pneuMedio' | 'pneuAlto';

function bucketPneu(pneu: number): BucketPneu {
  if (pneu < 60) return 'pneuBaixo';
  if (pneu <= 80) return 'pneuMedio';
  return 'pneuAlto';
}

interface CandidatoPneu {
  pilotoId: string;
  pneu: number;
  ea: EquipeAno;
}

/**
 * Comparador de string determinístico entre máquinas (code unit, `<`/`>`),
 * NUNCA `localeCompare` (consulta a collation ICU do host e quebraria o
 * determinismo entre SOs/versões do Node) — mesmo padrão de `scripts/agregar-fatos.ts`.
 */
function cmpPilotoId(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Escolhe, dentro de uma lista não-vazia, o candidato de menor/maior PNEU; empate por pilotoId ascendente. */
function escolherExtremoPneu(candidatos: CandidatoPneu[], modo: 'min' | 'max'): CandidatoPneu {
  let melhor = candidatos[0];
  for (const c of candidatos.slice(1)) {
    const estritamenteMelhor = modo === 'min' ? c.pneu < melhor.pneu : c.pneu > melhor.pneu;
    const empate = c.pneu === melhor.pneu;
    if (estritamenteMelhor || (empate && cmpPilotoId(c.pilotoId, melhor.pilotoId) < 0)) {
      melhor = c;
    }
  }
  return melhor;
}

/**
 * Seleção dinâmica (determinística) de 6 pilotos reais cobrindo a faixa de
 * PNEU do dataset vivo: varre todos os titulares de `dataset.equipeAnos`,
 * bucketiza pelo PNEU real do piloto (mesmos limiares de `bucketPneu`) e
 * escolhe, por bucket, o de MENOR e o de MAIOR PNEU (desempate por pilotoId
 * ascendente, code unit). Bucket vazio é erro alto (dataset não cobre a
 * faixa esperada) — nunca falha silenciosamente.
 */
export function selecionarPilotosParadas(dataset: Dataset): PilotoParadaSpec[] {
  const candidatosPorBucket: Record<BucketPneu, CandidatoPneu[]> = {
    pneuBaixo: [],
    pneuMedio: [],
    pneuAlto: [],
  };

  for (const ea of dataset.equipeAnos) {
    for (const piloto of ea.pilotos) {
      candidatosPorBucket[bucketPneu(piloto.notas.pneu)].push({
        pilotoId: piloto.id,
        pneu: piloto.notas.pneu,
        ea,
      });
    }
  }

  const specs: PilotoParadaSpec[] = [];
  for (const bucket of ['pneuBaixo', 'pneuMedio', 'pneuAlto'] as const) {
    const candidatos = candidatosPorBucket[bucket];
    if (candidatos.length === 0) {
      throw new Error(`selecionarPilotosParadas: bucket "${bucket}" vazio no dataset`);
    }
    const min = escolherExtremoPneu(candidatos, 'min');
    const max = escolherExtremoPneu(candidatos, 'max');
    specs.push({ jogadorId: `${bucket}-min`, pilotoId: min.pilotoId, equipe: min.ea.equipe, ano: min.ea.ano });
    specs.push({ jogadorId: `${bucket}-max`, pilotoId: max.pilotoId, equipe: max.ea.equipe, ano: max.ea.ano });
  }
  return specs;
}

const PECA_NEUTRA_ID = 'peca-blown-axle';

/**
 * Monta os loadouts dos 6 pilotos selecionados dinamicamente (`specs`), cada
 * um usando o carro completo da PRÓPRIA equipe/ano + `peca-blown-axle` (raro,
 * risco 0, alvo = freio) — risco 0 pra não poluir com DNF de peça, e freio
 * não é lido em nenhuma fórmula de quali/corrida, então o PNEU efetivo do
 * piloto fica igual ao PNEU base (bucketing limpo).
 */
function loadoutsParadas(dataset: Dataset, specs: PilotoParadaSpec[]): Loadout[] {
  return specs.map((spec) => {
    const ea = dataset.equipeAnos.find((e) => e.equipe === spec.equipe && e.ano === spec.ano);
    if (!ea) {
      throw new Error(`medirParadasExtras: equipe/ano não encontrado (${spec.equipe} ${spec.ano})`);
    }
    return {
      jogadorId: spec.jogadorId,
      pilotoId: spec.pilotoId,
      chassiId: ea.chassi.id,
      motorId: ea.motor.id,
      estrategistaId: ea.estrategista.id,
      pitId: ea.pit.id,
      pecaId: PECA_NEUTRA_ID,
    };
  });
}

const SEED_BASE_PARADAS = 2000;

interface ContadorParadas {
  duasOuMais: number;
  total: number;
}

function taxaParadasNaPista(
  dataset: Dataset,
  pista: Pista,
  nSeeds: number,
  specs: PilotoParadaSpec[],
): { taxaGeral: number; porBucket: Record<BucketPneu, ContadorParadas> } {
  const loadouts = loadoutsParadas(dataset, specs);
  const geral: ContadorParadas = { duasOuMais: 0, total: 0 };
  const porBucket: Record<BucketPneu, ContadorParadas> = {
    pneuBaixo: { duasOuMais: 0, total: 0 },
    pneuMedio: { duasOuMais: 0, total: 0 },
    pneuAlto: { duasOuMais: 0, total: 0 },
  };

  for (let i = 0; i < nSeeds; i++) {
    const seed = deriveSeed(SEED_BASE_PARADAS, `paradas:${pista.id}:${i}`);
    const grid = simularQuali(dataset, loadouts, pista, seed);
    const resultado = simularCorrida(dataset, loadouts, pista, grid, seed);
    for (const spec of specs) {
      const item = resultado.classificacao.find((c) => c.jogadorId === spec.jogadorId)!;
      // DNF distorce paradas (voltasCompletadas < voltas) — ignorado no denominador.
      if (item.status !== 'terminou') continue;
      geral.total++;
      // PNEU lido do dataset na hora (nunca duplicado numa constante à parte).
      const pneu = dataset.pilotosById.get(spec.pilotoId)!.notas.pneu;
      const bucket = porBucket[bucketPneu(pneu)];
      bucket.total++;
      if (item.paradas >= 2) {
        geral.duasOuMais++;
        bucket.duasOuMais++;
      }
    }
  }

  return { taxaGeral: geral.total > 0 ? geral.duasOuMais / geral.total : 0, porBucket };
}

function taxa(c: ContadorParadas): number {
  return c.total > 0 ? c.duasOuMais / c.total : 0;
}

/**
 * Mede a fração de (carro, corrida) com 2+ paradas, por nível de desgaste da
 * pista (baixo=Monza 25, medio=Spa 50, alto=Suzuka 75), e — dentro do nível
 * alto — por faixa de PNEU do piloto.
 */
export function medirParadasExtras(dataset: Dataset, nSeeds: number): TaxaParadas {
  const monza = dataset.pistasById.get('pista-monza');
  const spa = dataset.pistasById.get('pista-spa');
  const suzuka = dataset.pistasById.get('pista-suzuka');
  if (!monza || !spa || !suzuka) {
    throw new Error('medirParadasExtras: pista-monza/pista-spa/pista-suzuka ausente do dataset');
  }

  const specs = selecionarPilotosParadas(dataset);
  const baixo = taxaParadasNaPista(dataset, monza, nSeeds, specs);
  const medio = taxaParadasNaPista(dataset, spa, nSeeds, specs);
  const alto = taxaParadasNaPista(dataset, suzuka, nSeeds, specs);

  return {
    baixo: baixo.taxaGeral,
    medio: medio.taxaGeral,
    alto: alto.taxaGeral,
    altoPorBucket: {
      pneuBaixo: taxa(alto.porBucket.pneuBaixo),
      pneuMedio: taxa(alto.porBucket.pneuMedio),
      pneuAlto: taxa(alto.porBucket.pneuAlto),
    },
  };
}

// ---------------------------------------------------------------------------
// Meta 3 — raridade da peça do campeão vs. taxa de uso (guarda anti-dominância).
// ---------------------------------------------------------------------------

const RARIDADES: Raridade[] = ['comum', 'raro', 'epico', 'lendario', 'proibido'];
const N_JOGADORES = 22;

export interface RelatorioRaridade {
  /** Fração dos campeonatos em que o campeão carregava peça daquela raridade. */
  championShare: Record<Raridade, number>;
  /** Fração de jogadores (agregada nos campeonatos) que carregavam peça daquela raridade. */
  playerShare: Record<Raridade, number>;
  /** championShare/playerShare — >1 indica sobre-representação entre campeões. */
  ratio: Record<Raridade, number>;
  /** Taxa média de DNF por (carro, corrida), informativa. */
  dnfRateMedia: number;
  /** Desvio-padrão médio dos pontos finais do campeonato, informativo. */
  stdDevPontosMedia: number;
}

function zeroPorRaridade(): Record<Raridade, number> {
  return { comum: 0, raro: 0, epico: 0, lendario: 0, proibido: 0 };
}

/**
 * Monta os 22 loadouts do campeonato rodando o MOTOR DE DRAFT REAL do jogo
 * (`criarDraft` + `resolverBots`, PR 1.2): 22 bots com perfis atribuídos por
 * seed em dificuldade 'dificil' (60% pra-ganhar — o cenário competitivo, onde
 * dominância de peça mais importa, GDD §12/§14.3). Cada bot faz os 5 sorteios
 * de equipe/ano e a rodada 6 de peça (5 reveladas, 2 cópias por peça) com a
 * própria lógica de escolha dos bots — o playerShare por raridade reflete a
 * preferência real de pick, não um sorteio uniforme.
 */
function draftarLoadoutsCampeonato(dataset: Dataset, seedBase: number): Loadout[] {
  const seedDraft = deriveSeed(seedBase, 'camp:draft');
  const jogadoresBase: Jogador[] = Array.from({ length: N_JOGADORES }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const jogadores = atribuirPerfis(jogadoresBase, seedDraft, 'dificil');
  const estadoFinal = resolverBots(criarDraft(dataset, jogadores, seedDraft), dataset);
  return jogadores.map((j) => {
    const loadout = estadoFinal.loadouts[j.id];
    if (!loadout) {
      throw new Error(`draftarLoadoutsCampeonato: draft não concluiu pro bot "${j.id}"`);
    }
    return loadout;
  });
}

interface ResultadoCampeonato {
  campeaoRaridade: Raridade;
  raridadePorJogador: Raridade[];
  dnfCount: number;
  totalCarros: number;
  stdDevPontos: number;
}

function simularCampeonato(dataset: Dataset, seedBase: number): ResultadoCampeonato {
  const loadouts = draftarLoadoutsCampeonato(dataset, seedBase);
  const pontosPorJogador = new Map<string, number>(loadouts.map((l) => [l.jogadorId, 0]));
  let dnfCount = 0;
  let totalCarros = 0;

  for (const pista of dataset.pistas) {
    const seed = deriveSeed(seedBase, `camp:${pista.id}`);
    const grid = simularQuali(dataset, loadouts, pista, seed);
    const resultado = simularCorrida(dataset, loadouts, pista, grid, seed);
    for (const item of resultado.classificacao) {
      pontosPorJogador.set(item.jogadorId, (pontosPorJogador.get(item.jogadorId) ?? 0) + item.pontos);
      totalCarros++;
      if (item.status === 'dnf') dnfCount++;
    }
  }

  let campeaoJogadorId = loadouts[0].jogadorId;
  let maxPontos = pontosPorJogador.get(campeaoJogadorId)!;
  for (const [jogadorId, pontos] of pontosPorJogador) {
    if (pontos > maxPontos || (pontos === maxPontos && jogadorId < campeaoJogadorId)) {
      maxPontos = pontos;
      campeaoJogadorId = jogadorId;
    }
  }

  const pecaPorJogador = new Map(loadouts.map((l) => [l.jogadorId, l.pecaId]));
  const raridadePorJogador = loadouts.map(
    (l) => dataset.pecasById.get(l.pecaId)!.raridade,
  );
  const campeaoRaridade = dataset.pecasById.get(pecaPorJogador.get(campeaoJogadorId)!)!.raridade;

  const valoresPontos = [...pontosPorJogador.values()];
  const media = valoresPontos.reduce((a, b) => a + b, 0) / valoresPontos.length;
  const varianciaPontos =
    valoresPontos.reduce((acc, v) => acc + (v - media) ** 2, 0) / valoresPontos.length;
  const stdDevPontos = Math.sqrt(varianciaPontos);

  return { campeaoRaridade, raridadePorJogador, dnfCount, totalCarros, stdDevPontos };
}

/**
 * Simula `nCampeonatos` (22 jogadores, 10 pistas cada, seed base = índice do
 * campeonato) e agrega a raridade da peça do campeão vs. a taxa de uso de
 * cada raridade entre os jogadores — guarda contra peça dominante (§14.3).
 */
export function medirRaridadePeca(dataset: Dataset, nCampeonatos: number): RelatorioRaridade {
  const championCount = zeroPorRaridade();
  const playerCount = zeroPorRaridade();
  let totalJogadores = 0;
  let somaDnfRate = 0;
  let somaStdDev = 0;

  for (let c = 0; c < nCampeonatos; c++) {
    const resultado = simularCampeonato(dataset, c);
    championCount[resultado.campeaoRaridade]++;
    for (const raridade of resultado.raridadePorJogador) {
      playerCount[raridade]++;
      totalJogadores++;
    }
    somaDnfRate += resultado.dnfCount / resultado.totalCarros;
    somaStdDev += resultado.stdDevPontos;
  }

  const championShare = zeroPorRaridade();
  const playerShare = zeroPorRaridade();
  const ratio = zeroPorRaridade();
  for (const raridade of RARIDADES) {
    championShare[raridade] = championCount[raridade] / nCampeonatos;
    playerShare[raridade] = playerCount[raridade] / totalJogadores;
    ratio[raridade] =
      playerShare[raridade] > 0
        ? championShare[raridade] / playerShare[raridade]
        : championShare[raridade] > 0
          ? Infinity
          : 0;
  }

  return {
    championShare,
    playerShare,
    ratio,
    dnfRateMedia: somaDnfRate / nCampeonatos,
    stdDevPontosMedia: somaStdDev / nCampeonatos,
  };
}

// ---------------------------------------------------------------------------
// Relatório legível.
// ---------------------------------------------------------------------------

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

/** Monta o relatório legível com todas as métricas (impresso via console.log pelo runner). */
export function gerarRelatorio(
  vitoriaPole: TaxaVitoriaPole,
  paradas: TaxaParadas,
  raridade: RelatorioRaridade,
): string {
  const linhas: string[] = [];
  linhas.push('=== balance-harness — relatório (PR 1.6) ===');
  linhas.push('');
  linhas.push('-- Meta 1: taxa de vitória do pole (carros idênticos), alvo media ~70-80% --');
  linhas.push(`  facil (Monza):    ${pct(vitoriaPole.facil)}`);
  linhas.push(`  media (Spa):      ${pct(vitoriaPole.media)}`);
  linhas.push(`  dificil (Mônaco): ${pct(vitoriaPole.dificil)}`);
  linhas.push('');
  linhas.push('-- Meta 2: fração de 2+ paradas por nível de desgaste, alto alvo ~40-60% --');
  linhas.push(`  baixo (Monza, 25):  ${pct(paradas.baixo)}`);
  linhas.push(`  medio (Spa, 50):    ${pct(paradas.medio)}`);
  linhas.push(`  alto (Suzuka, 75):  ${pct(paradas.alto)}`);
  linhas.push('  alto por bucket de PNEU:');
  linhas.push(`    PNEU < 60:    ${pct(paradas.altoPorBucket.pneuBaixo)}`);
  linhas.push(`    PNEU 60-80:   ${pct(paradas.altoPorBucket.pneuMedio)}`);
  linhas.push(`    PNEU > 80:    ${pct(paradas.altoPorBucket.pneuAlto)}`);
  linhas.push('');
  linhas.push('-- Meta 3/4: raridade da peça do campeão vs. taxa de uso (guarda anti-dominância) --');
  for (const r of RARIDADES) {
    linhas.push(
      `  ${r.padEnd(9)} championShare=${pct(raridade.championShare[r])}  playerShare=${pct(raridade.playerShare[r])}  ratio=${raridade.ratio[r].toFixed(2)}`,
    );
  }
  linhas.push('');
  linhas.push('-- Informativas --');
  linhas.push(`  DNF médio por (carro, corrida): ${pct(raridade.dnfRateMedia)}`);
  linhas.push(
    `  Desvio-padrão médio dos pontos finais do campeonato: ${raridade.stdDevPontosMedia.toFixed(2)}`,
  );
  return linhas.join('\n');
}
