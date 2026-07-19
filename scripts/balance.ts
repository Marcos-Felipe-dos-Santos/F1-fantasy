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
import { createRng, deriveSeed } from '../src/engine/rng';
import { simularQuali } from '../src/engine/quali';
import { simularCorrida } from '../src/engine/corrida';
import type { Loadout, Pista, Raridade, ResultadoQuali } from '../src/engine/types';

// ---------------------------------------------------------------------------
// Meta 1 — sinal de grid (taxa de vitória do pole com carros idênticos).
// ---------------------------------------------------------------------------

export interface TaxaVitoriaPole {
  facil: number;
  media: number;
  dificil: number;
}

/** Carro forte de referência (Red Bull 2023) — idêntico pros dois lados do grid. */
function loadoutForte(jogadorId: string): Loadout {
  return {
    jogadorId,
    pilotoId: 'redbull-2023-piloto-verstappen',
    chassiId: 'redbull-2023-chassi',
    motorId: 'redbull-2023-motor',
    estrategistaId: 'redbull-2023-estrategista',
    pitId: 'redbull-2023-pit',
    pecaId: 'peca-composto-macio',
  };
}

const SEED_BASE_GRID = 1000;

function taxaVitoriaPoleNaPista(dataset: Dataset, pista: Pista, nSeeds: number): number {
  const loadouts = [loadoutForte('frente'), loadoutForte('atras')];
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

interface PilotoParadaSpec {
  jogadorId: string;
  pilotoId: string;
  equipe: string;
  ano: number;
  /** PNEU documentado aqui só pra bucketing do harness — não é lido do dataset de novo. */
  pneu: number;
}

/**
 * 6 pilotos reais cobrindo a faixa de PNEU do dataset (40 a 90). Peça usada
 * é sempre `peca-blown-axle` (raro, risco 0, alvo = freio) — risco 0 pra não
 * poluir com DNF de peça, e freio não é lido em nenhuma fórmula de
 * quali/corrida, então o PNEU efetivo do piloto fica igual ao PNEU base
 * (bucketing limpo).
 */
const PILOTOS_PARADAS: PilotoParadaSpec[] = [
  { jogadorId: 'pneu90', pilotoId: 'redbull-2023-piloto-verstappen', equipe: 'Red Bull', ano: 2023, pneu: 90 },
  { jogadorId: 'pneu84', pilotoId: 'ferrari-1998-piloto-schumacher', equipe: 'Ferrari', ano: 1998, pneu: 84 },
  { jogadorId: 'pneu76', pilotoId: 'ferrari-2023-piloto-leclerc', equipe: 'Ferrari', ano: 2023, pneu: 76 },
  { jogadorId: 'pneu70', pilotoId: 'williams-2023-piloto-albon', equipe: 'Williams', ano: 2023, pneu: 70 },
  { jogadorId: 'pneu62', pilotoId: 'sauber-2004-piloto-massa', equipe: 'Sauber', ano: 2004, pneu: 62 },
  { jogadorId: 'pneu40', pilotoId: 'minardi-1993-piloto-barbazza', equipe: 'Minardi', ano: 1993, pneu: 40 },
];

const PECA_NEUTRA_ID = 'peca-blown-axle';

function loadoutsParadas(dataset: Dataset): Loadout[] {
  return PILOTOS_PARADAS.map((spec) => {
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

function bucketPneu(pneu: number): 'pneuBaixo' | 'pneuMedio' | 'pneuAlto' {
  if (pneu < 60) return 'pneuBaixo';
  if (pneu <= 80) return 'pneuMedio';
  return 'pneuAlto';
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
): { taxaGeral: number; porBucket: Record<'pneuBaixo' | 'pneuMedio' | 'pneuAlto', ContadorParadas> } {
  const loadouts = loadoutsParadas(dataset);
  const geral: ContadorParadas = { duasOuMais: 0, total: 0 };
  const porBucket: Record<'pneuBaixo' | 'pneuMedio' | 'pneuAlto', ContadorParadas> = {
    pneuBaixo: { duasOuMais: 0, total: 0 },
    pneuMedio: { duasOuMais: 0, total: 0 },
    pneuAlto: { duasOuMais: 0, total: 0 },
  };

  for (let i = 0; i < nSeeds; i++) {
    const seed = deriveSeed(SEED_BASE_PARADAS, `paradas:${pista.id}:${i}`);
    const grid = simularQuali(dataset, loadouts, pista, seed);
    const resultado = simularCorrida(dataset, loadouts, pista, grid, seed);
    for (const spec of PILOTOS_PARADAS) {
      const item = resultado.classificacao.find((c) => c.jogadorId === spec.jogadorId)!;
      // DNF distorce paradas (voltasCompletadas < voltas) — ignorado no denominador.
      if (item.status !== 'terminou') continue;
      geral.total++;
      const bucket = porBucket[bucketPneu(spec.pneu)];
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

  const baixo = taxaParadasNaPista(dataset, monza, nSeeds);
  const medio = taxaParadasNaPista(dataset, spa, nSeeds);
  const alto = taxaParadasNaPista(dataset, suzuka, nSeeds);

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
 * Monta 22 loadouts sorteados (draft simplificado, semeado por campeonato):
 * cada jogador sorteia piloto/chassi/motor/estrategista/pit de sorteios de
 * equipe/ano independentes (podem repetir entre jogadores — mistura de eras
 * é permitida pelo GDD §3) e 1 peça respeitando 2 cópias por peça no pool
 * compartilhado do campeonato.
 */
function sortearLoadoutsCampeonato(dataset: Dataset, seedBase: number): Loadout[] {
  const rng = createRng(deriveSeed(seedBase, 'draft-simplificado'));
  const copiasRestantes = new Map<string, number>(dataset.pecas.map((p) => [p.id, 2]));

  const loadouts: Loadout[] = [];
  for (let i = 0; i < N_JOGADORES; i++) {
    const jogadorId = `j${i + 1}`;
    const eaPiloto = rng.pick(dataset.equipeAnos);
    const piloto = rng.pick(eaPiloto.pilotos);
    const eaChassi = rng.pick(dataset.equipeAnos);
    const eaMotor = rng.pick(dataset.equipeAnos);
    const eaEstrategista = rng.pick(dataset.equipeAnos);
    const eaPit = rng.pick(dataset.equipeAnos);

    const pecasDisponiveis = dataset.pecas.filter((p) => (copiasRestantes.get(p.id) ?? 0) > 0);
    const peca = rng.pick(pecasDisponiveis);
    copiasRestantes.set(peca.id, (copiasRestantes.get(peca.id) ?? 0) - 1);

    loadouts.push({
      jogadorId,
      pilotoId: piloto.id,
      chassiId: eaChassi.chassi.id,
      motorId: eaMotor.motor.id,
      estrategistaId: eaEstrategista.estrategista.id,
      pitId: eaPit.pit.id,
      pecaId: peca.id,
    });
  }
  return loadouts;
}

interface ResultadoCampeonato {
  campeaoRaridade: Raridade;
  raridadePorJogador: Raridade[];
  dnfCount: number;
  totalCarros: number;
  stdDevPontos: number;
}

function simularCampeonato(dataset: Dataset, seedBase: number): ResultadoCampeonato {
  const loadouts = sortearLoadoutsCampeonato(dataset, seedBase);
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
