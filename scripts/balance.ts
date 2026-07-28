/**
 * Balance-harness (PR 1.6, skill "balance-harness": balanceamento é medido,
 * não sentido — GDD §9/§14.3).
 *
 * Mede, em cima do dataset real (`src/data/`), as 3 metas de calibração
 * decididas pelo dev em 2026-07-18 (`HISTORICO.md`, seção "Metas de
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
import { QUALI_CONFIG, simularQuali } from '../src/engine/quali';
import { resolverCarro } from '../src/engine/carro';
import { CORRIDA_CONFIG, simularCorrida } from '../src/engine/corrida';
import { simularCampeonato as simularCampeonatoEngine } from '../src/engine/campeonato';
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
 *
 * Exportada (PR 6.3.1): devolve também `copiasRestantes` do estado final do
 * draft (pool de peças pós-draft) — insumo pra alavanca de "pit de meio de
 * temporada" (`scripts/alavancas.ts`), que precisa saber quantas cópias de
 * cada peça ainda estão livres pra sortear na troca. `draftarLoadoutsCampeonato`
 * abaixo continua existindo (mesmo comportamento de antes, só `.loadouts`)
 * pra não tocar em nenhum outro chamador deste arquivo.
 */
export function draftarCampeonato(
  dataset: Dataset,
  seedBase: number,
): { loadouts: Loadout[]; copiasRestantes: Record<string, number> } {
  const seedDraft = deriveSeed(seedBase, 'camp:draft');
  const jogadoresBase: Jogador[] = Array.from({ length: N_JOGADORES }, (_, i) => ({
    id: `j${String(i + 1).padStart(2, '0')}`,
    tipo: 'bot' as const,
  }));
  const jogadores = atribuirPerfis(jogadoresBase, seedDraft, 'dificil');
  const estadoFinal = resolverBots(criarDraft(dataset, jogadores, seedDraft), dataset);
  const loadouts = jogadores.map((j) => {
    const loadout = estadoFinal.loadouts[j.id];
    if (!loadout) {
      throw new Error(`draftarCampeonato: draft não concluiu pro bot "${j.id}"`);
    }
    return loadout;
  });
  return { loadouts, copiasRestantes: estadoFinal.copiasRestantes };
}

function draftarLoadoutsCampeonato(dataset: Dataset, seedBase: number): Loadout[] {
  return draftarCampeonato(dataset, seedBase).loadouts;
}

/**
 * Métricas de MEDIÇÃO do balance-harness (não confundir com o
 * `ResultadoCampeonato` da engine, `src/engine/campeonato.ts` — este tipo é
 * local ao harness, PR 6.1: renomeado de `ResultadoCampeonato` pra
 * `MetricasCampeonato` pra não colidir com o import da engine).
 */
interface MetricasCampeonato {
  campeaoRaridade: Raridade;
  raridadePorJogador: Raridade[];
  dnfCount: number;
  totalCarros: number;
  stdDevPontos: number;
}

/**
 * Simula 1 campeonato (22 jogadores draftados, todas as pistas do dataset) e
 * deriva as métricas de medição do harness em cima do `ResultadoCampeonato`
 * da engine (PR 6.1: a agregação de pontos/classificação e a derivação de
 * seed por etapa agora vivem em `src/engine/campeonato.ts`; este helper só
 * monta o setup de medição — draft dos 22 bots — e extrai raridade/DNF/
 * desvio-padrão a partir do resultado).
 */
function simularCampeonato(dataset: Dataset, seedBase: number): MetricasCampeonato {
  const loadouts = draftarLoadoutsCampeonato(dataset, seedBase);
  const { classificacao, etapas } = simularCampeonatoEngine(
    dataset,
    loadouts,
    dataset.pistas,
    seedBase,
  );

  // Denominador derivado das etapas EFETIVAMENTE simuladas, não de
  // `dataset.pistas` (S1 da revisão do PR 6.1): hoje dá o mesmo número porque
  // a chamada acima passa o calendário inteiro, mas se o harness um dia medir
  // um subconjunto de pistas o `dnfRateMedia` ficaria silenciosamente errado.
  let dnfCount = 0;
  let totalCarros = 0;
  for (const linha of classificacao) {
    totalCarros += etapas.length;
    dnfCount += linha.dnfs;
  }

  // classificacao[0] já é "maior pontuação; empate por countback FIA (mais
  // 1ºs, depois 2ºs, ...); empate absoluto pelo menor jogadorId" (PR 6.2,
  // `acumularClassificacao` em `src/engine/campeonato.ts`).
  const campeaoJogadorId = classificacao[0].jogadorId;
  const pecaPorJogador = new Map(loadouts.map((l) => [l.jogadorId, l.pecaId]));
  const raridadePorJogador = loadouts.map(
    (l) => dataset.pecasById.get(l.pecaId)!.raridade,
  );
  const campeaoRaridade = dataset.pecasById.get(pecaPorJogador.get(campeaoJogadorId)!)!.raridade;

  const valoresPontos = classificacao.map((l) => l.pontos);
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
// PR 6.3 — dominância do draft (report-only, PORTÃO DE DECISÃO da Fase 6:
// "o campeonato é decidido no draft?"). Se a força do carro montado no draft
// explicar quase toda a classificação final, as 10 corridas são teatro e o
// modo campeonato precisa de mitigação (ex.: "pit de meio de temporada",
// HISTORICO.md D1) ANTES de qualquer UI. SEM assert bloqueante — mesmo padrão
// informativo da Meta 3/4; quem decide o limiar aceitável é o dev, a partir
// do relatório impresso.
// ---------------------------------------------------------------------------

/**
 * Score determinístico de força de um loadout numa pista — RÉPLICA EXATA da
 * fórmula inline de `src/engine/quali.ts:52-59` (pesos de `QUALI_CONFIG`),
 * SEM a variância aleatória da quali. Medir força COM ruído (ex.: usando
 * `simularQuali`) atenuaria artificialmente a correlação com o resultado do
 * campeonato — ruído na variável independente sempre ATENUA correlação,
 * enviesando o portão na direção mais perigosa (o jogo pareceria menos
 * decidido pelo draft do que realmente é). O guard-rail de sincronia em
 * `scripts/balance.test.ts` trava esta réplica contra o drift da fórmula
 * real. NÃO refatorar `quali.ts` pra compartilhar isso (goldens congelados
 * — GDD/CLAUDE.md; o ganho não compensa o risco); este PR é `scripts/`-only.
 */
export function scoreCarroPista(dataset: Dataset, loadout: Loadout, pista: Pista): number {
  const carro = resolverCarro(dataset, loadout);
  const notaCarro =
    carro.chassi.aero * pista.pesos.aero +
    carro.chassi.mec * pista.pesos.mec +
    carro.motor.motor * pista.pesos.motor;
  return (
    QUALI_CONFIG.pesoPiloto * carro.piloto.quali +
    QUALI_CONFIG.pesoCarro * notaCarro +
    QUALI_CONFIG.pesoCall * carro.estrategista.call
  );
}

/**
 * Score determinístico de RITMO DE CORRIDA — réplica exata da fórmula inline
 * de `src/engine/corrida.ts:189-196` (pesos de `CORRIDA_CONFIG`), sem
 * variância. Difere de `scoreCarroPista` em um ponto decisivo: usa
 * `piloto.rit` em vez de `piloto.quali`.
 *
 * Existe por causa do aviso 3 da revisão do PR 6.3: medir a força do loadout
 * só pelo score de QUALI subestima a dominância do draft, porque o campeonato
 * é decidido pelo ritmo de corrida, não pelo grid. Medido nos mesmos 200
 * campeonatos: ρ com proxy de quali = 0.909, com proxy de corrida = 0.893,
 * com os dois combinados = 0.953. O número honesto de "força do loadout" é o
 * combinado; reportar só o de quali entregaria um PISO ao dev sem avisar.
 */
export function scoreCorridaPista(dataset: Dataset, loadout: Loadout, pista: Pista): number {
  const carro = resolverCarro(dataset, loadout);
  const notaCarro =
    carro.chassi.aero * pista.pesos.aero +
    carro.chassi.mec * pista.pesos.mec +
    carro.motor.motor * pista.pesos.motor;
  return (
    CORRIDA_CONFIG.pesoPiloto * carro.piloto.rit +
    CORRIDA_CONFIG.pesoCarro * notaCarro +
    CORRIDA_CONFIG.pesoCall * carro.estrategista.call
  );
}

/** Como `forcaMedia`, mas com um score por pista fornecido pelo chamador. */
function mediaNoCalendario(
  dataset: Dataset,
  loadout: Loadout,
  score: (dataset: Dataset, loadout: Loadout, pista: Pista) => number,
): number {
  const soma = dataset.pistas.reduce((acc, pista) => acc + score(dataset, loadout, pista), 0);
  return soma / dataset.pistas.length;
}

/**
 * Força média de um loadout no calendário inteiro (`dataset.pistas`, as 10
 * pistas do GDD §9) — não uma única pista "neutra" arbitrária: o campeonato
 * roda as 10, então a força relevante pro portão é a média delas. Escolher
 * uma pista só introduziria viés de perfil (ex.: um carro de motor pareceria
 * fraco se a escolhida fosse Mônaco, de baixo peso de motor).
 *
 * `forcaMediaCombinada` é a MÉTRICA PRINCIPAL do portão: média dos scores de
 * quali e de corrida, cobrindo os dois usos que o draft realmente decide
 * (grid e ritmo). As duas variantes puras seguem expostas pro relatório
 * mostrar a decomposição.
 */
function forcaMediaQuali(dataset: Dataset, loadout: Loadout): number {
  return mediaNoCalendario(dataset, loadout, scoreCarroPista);
}

function forcaMediaCorrida(dataset: Dataset, loadout: Loadout): number {
  return mediaNoCalendario(dataset, loadout, scoreCorridaPista);
}

function forcaMediaCombinada(dataset: Dataset, loadout: Loadout): number {
  return (forcaMediaQuali(dataset, loadout) + forcaMediaCorrida(dataset, loadout)) / 2;
}

/**
 * Rank médio (mid-rank) de cada valor de `valores` — MESMA convenção de
 * empate do percentil de Hazen (`percentilHazen` em `scripts/derivar-notas.ts`):
 * rank = (contagem estritamente melhor) + (contagem empatada + 1) / 2.
 * `direcao` 'asc': rank 1 = MENOR valor. 'desc': rank 1 = MAIOR valor.
 */
export function rankMedio(
  valores: readonly number[],
  direcao: 'asc' | 'desc' = 'asc',
): number[] {
  return valores.map((v) => {
    let melhor = 0;
    let empatados = 0;
    for (const x of valores) {
      const xEhMelhor = direcao === 'asc' ? x < v : x > v;
      if (xEhMelhor) melhor++;
      else if (x === v) empatados++;
    }
    return melhor + (empatados + 1) / 2;
  });
}

/** Correlação de Pearson padrão (denominador populacional, n) entre dois arrays do mesmo tamanho e alinhamento. */
function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  const mediaA = a.reduce((x, y) => x + y, 0) / n;
  const mediaB = b.reduce((x, y) => x + y, 0) / n;
  let cov = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - mediaA;
    const db = b[i] - mediaB;
    cov += da * db;
    varA += da * da;
    varB += db * db;
  }
  // Sem variação num dos lados ⇒ correlação indefinida; 0 é o valor neutro
  // seguro pro agregado do relatório (nunca deveria ocorrer com dado real).
  if (varA === 0 || varB === 0) return 0;
  return cov / Math.sqrt(varA * varB);
}

/**
 * Correlação de Spearman (ρ) padrão entre dois arrays de valores BRUTOS
 * (definição independente de convenção de domínio): ranqueia cada array
 * ascendente com rank médio pra empates (`rankMedio`) e correlaciona
 * (Pearson) os ranks resultantes. `a` e `b` precisam ter o mesmo tamanho e
 * estar alinhados por índice.
 */
export function spearman(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error('spearman: arrays de tamanhos diferentes');
  }
  return pearson(rankMedio(a, 'asc'), rankMedio(b, 'asc'));
}

/** `n!/(k!(n-k)!)`, sem passar por fatoriais gigantes (produto incremental). */
function combinacoes(n: number, k: number): number {
  let resultado = 1;
  for (let i = 0; i < k; i++) {
    resultado = (resultado * (n - i)) / (i + 1);
  }
  return resultado;
}

export interface RelatorioDominancia {
  /** Média de ρ (Spearman) entre os campeonatos simulados. */
  spearmanMedio: number;
  /** Desvio-padrão de ρ entre os campeonatos — mede se a correlação é estável ou varia muito. */
  spearmanStdDev: number;
  /** Menor e maior ρ observados entre os campeonatos (mais legíveis que o desvio pra ρ). */
  spearmanMin: number;
  spearmanMax: number;
  /** Decomposição report-only: ρ usando só o score de quali / só o de ritmo de corrida. */
  spearmanQuali: number;
  spearmanCorrida: number;
  /** Fração dos campeonatos em que o campeão estava no top-3 de força (draft). */
  pCampeaoTop3Forca: number;
  /** Referência de acaso puro: 3/22 (chance de estar no top-3 por sorteio uniforme, sem draft decidir nada). */
  pCampeaoTop3ForcaAcaso: number;
  /** Fração dos campeonatos em que ao menos 1 dos 3 primeiros colocados veio de fora do top-5 de força. */
  pForaTop5NoPodio: number;
  /** Referência de acaso puro: `1 - C(5,3)/C(22,3)` (analítica, não simulada). */
  pForaTop5NoPodioAcaso: number;
}

/**
 * Mede se o campeonato é "decidido no draft" (PR 6.3, PORTÃO DE DECISÃO da
 * Fase 6): correlaciona a força determinística do loadout (`forcaMedia`, SEM
 * a variância da quali) com a posição final do campeonato, agregando sobre
 * `nCampeonatos` campeonatos simulados com o MESMO setup (
 * `draftarLoadoutsCampeonato` + engine real de campeonato) usado nas metas
 * 3/4 — mesma população de campeonatos, números comparáveis entre seções do
 * relatório.
 *
 * CONVENÇÃO (documentada também no relatório impresso): ambos os ranks usam
 * 1 = MELHOR (1 = loadout mais forte; 1 = campeão). Assim ρ = +1 significa
 * "o draft decide tudo" e ρ = 0 significa "o draft não explica nada" — sinal
 * trocado aqui inverteria a leitura do dev.
 */
export function medirDominanciaDraft(dataset: Dataset, nCampeonatos: number): RelatorioDominancia {
  const rhos: number[] = [];
  const rhosQuali: number[] = [];
  const rhosCorrida: number[] = [];
  let countCampeaoTop3 = 0;
  let countForaTop5NoPodio = 0;

  /**
   * Lookup que FALHA ALTO em vez de devolver `undefined` (sugestão da revisão
   * do PR 6.3): um desalinhamento entre jogadorIds e classificação viraria
   * `NaN`, que envenena a média do ρ EM SILÊNCIO — sem lançar, sem teste
   * vermelho, com o portão de decisão devolvendo um número errado.
   */
  function exigir<T>(mapa: Map<string, T>, id: string, campo: string): T {
    const valor = mapa.get(id);
    if (valor === undefined) {
      throw new Error(`medirDominanciaDraft: ${campo} ausente pro jogador "${id}"`);
    }
    return valor;
  }

  for (let c = 0; c < nCampeonatos; c++) {
    const loadouts = draftarLoadoutsCampeonato(dataset, c);
    const { classificacao } = simularCampeonatoEngine(dataset, loadouts, dataset.pistas, c);

    const jogadorIds = loadouts.map((l) => l.jogadorId);
    const scores = loadouts.map((l) => forcaMediaCombinada(dataset, l));

    // Rank de força, 1 = mais forte (desc) — usado pros checks de top-3/top-5.
    const rankForcaArr = rankMedio(scores, 'desc');
    const rankForcaPorJogador = new Map(jogadorIds.map((id, i) => [id, rankForcaArr[i]]));

    const posicaoFinalPorJogador = new Map(
      classificacao.map((linha, i) => [linha.jogadorId, i + 1]),
    );
    const posicoesFinais = jogadorIds.map((id) =>
      exigir(posicaoFinalPorJogador, id, 'posição final'),
    );

    // ρ: score negado antes de `spearman` ranquear ascendente == ranquear
    // desc (1 = mais forte) — alinha a convenção com `posicoesFinais`, que já
    // é 1 = melhor/campeão por construção (ver doc-comment da função).
    rhos.push(spearman(scores.map((s) => -s), posicoesFinais));
    // Decomposição report-only (aviso 3 da revisão): mostra quanto cada
    // componente da força explica sozinho.
    rhosQuali.push(
      spearman(loadouts.map((l) => -forcaMediaQuali(dataset, l)), posicoesFinais),
    );
    rhosCorrida.push(
      spearman(loadouts.map((l) => -forcaMediaCorrida(dataset, l)), posicoesFinais),
    );

    const campeaoId = classificacao[0].jogadorId;
    if (exigir(rankForcaPorJogador, campeaoId, 'rank de força') <= 3) countCampeaoTop3++;

    const podioIds = classificacao.slice(0, 3).map((l) => l.jogadorId);
    if (podioIds.some((id) => exigir(rankForcaPorJogador, id, 'rank de força') > 5)) {
      countForaTop5NoPodio++;
    }
  }

  const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const mediaRho = media(rhos);
  const varianciaRho = rhos.reduce((acc, r) => acc + (r - mediaRho) ** 2, 0) / rhos.length;

  return {
    spearmanMedio: mediaRho,
    spearmanStdDev: Math.sqrt(varianciaRho),
    // min/max são mais legíveis que o desvio pra ρ (limitado em [-1,1] e
    // assimétrico perto dos extremos) — sugestão da revisão do PR 6.3.
    spearmanMin: Math.min(...rhos),
    spearmanMax: Math.max(...rhos),
    spearmanQuali: media(rhosQuali),
    spearmanCorrida: media(rhosCorrida),
    pCampeaoTop3Forca: countCampeaoTop3 / nCampeonatos,
    pCampeaoTop3ForcaAcaso: 3 / N_JOGADORES,
    pForaTop5NoPodio: countForaTop5NoPodio / nCampeonatos,
    pForaTop5NoPodioAcaso: 1 - combinacoes(5, 3) / combinacoes(N_JOGADORES, 3),
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
  dominancia: RelatorioDominancia,
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
  linhas.push('');
  linhas.push('-- PR 6.3: dominância do draft (PORTÃO DE DECISÃO, report-only, sem limiar) --');
  linhas.push(
    '  Convenção: 1 = melhor em ambos os ranks (1 = loadout mais forte; 1 = campeão).',
  );
  linhas.push(
    '  ρ = +1 => "o draft decide tudo"; ρ = 0 => "o draft não explica nada".',
  );
  linhas.push(
    `  Spearman (força do loadout x posição final): média=${dominancia.spearmanMedio.toFixed(3)}  desvio-padrão=${dominancia.spearmanStdDev.toFixed(3)}  [min ${dominancia.spearmanMin.toFixed(3)}, max ${dominancia.spearmanMax.toFixed(3)}]`,
  );
  linhas.push(
    `    decomposição: só score de quali=${dominancia.spearmanQuali.toFixed(3)}  só ritmo de corrida=${dominancia.spearmanCorrida.toFixed(3)}`,
  );
  linhas.push(
    `  P(campeão no top-3 de força):        ${pct(dominancia.pCampeaoTop3Forca)}  (acaso puro: ${pct(dominancia.pCampeaoTop3ForcaAcaso)})`,
  );
  linhas.push(
    `  P(pódio com alguém fora do top-5):   ${pct(dominancia.pForaTop5NoPodio)}  (acaso puro: ${pct(dominancia.pForaTop5NoPodioAcaso)})`,
  );
  return linhas.join('\n');
}
