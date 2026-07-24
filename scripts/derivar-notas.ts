/**
 * Derivação de notas (PR 4.3, trilha "Dataset histórico 1950-2025",
 * `PROGRESS.md` seção "Próximos"). Lê `scripts/derived/fatos-agregados.json`
 * (PR 4.2, FATOS auditáveis, zero fórmula) e emite
 * `scripts/derived/equipe-anos.derivado.json` — MESMO formato de
 * `src/data/equipe-anos.json` — via percentil de Hazen por temporada +
 * shrinkage empírico-Bayes + faixa-alvo [28,96]. `src/` NÃO é tocado por este
 * script: o output é STAGING (o swap pra `src/data/` é o PR 4.5).
 *
 * Princípio anti-GDD §14.1: nenhuma nota "no olho" — toda nota vem de uma
 * fórmula explícita sobre um FATO do dataset real.
 *
 * ---------------------------------------------------------------------------
 * INFRAESTRUTURA DE NORMALIZAÇÃO (D5 — único knob livre do PR, comentado):
 * ---------------------------------------------------------------------------
 *
 * `percentilHazen(valores, v)`: percentil de Hazen de `v` dentro de
 * `valores` — rank médio pra empates, `(rank-0.5)/n`. SEMPRE calculado
 * dentro da TEMPORADA (o array `valores` já deve vir filtrado aos elegíveis
 * daquele ano antes de chamar esta função — a função em si é agnóstica de
 * temporada, só ranqueia o array que recebe). Percentil alto = melhor
 * SEMPRE; pra atributos onde um valor bruto menor é melhor (grid, posição de
 * chegada, deltas), quem chama NEGA o valor antes de ranquear
 * (`percentilHazen(valoresNegados, -valorAlvo)`) — ver os comentários por
 * atributo abaixo.
 *
 * `shrink(valor, n, mediaTemporada, pseudoN=8)`: média ponderada
 * empírico-Bayes — `(n·valor + pseudoN·mediaTemporada) / (n + pseudoN)`.
 * `n=0` ⇒ resultado é exatamente `mediaTemporada` (não há amostra própria);
 * `n` grande ⇒ resultado converge pro `valor` bruto (a média da temporada
 * pesa cada vez menos). `pseudoN=8` é o ÚNICO número mágico livre deste PR —
 * calibração fina fica pro balance-harness (PR 4.5), não é reajustada aqui.
 *
 * `paraNota(percentil, faixa=[28,96])`: mapeia percentil [0,1] linearmente
 * pra um inteiro dentro de `faixa` (arredondado). `faixa` é o segundo knob
 * exposto — usado com [28,96] (faixa padrão de notas) e faixas comprimidas
 * explícitas ([35,80] pra CALL/SANGF, [42,58] pra pit pré-2011 — ver seções
 * abaixo).
 *
 * `slug(s)`: lowercase, espaços/underscores/qualquer caractere fora de
 * [a-z0-9-] viram hífen, hífens duplicados colapsam, sem hífen nas pontas.
 * Usado pra montar ids (`slug(constructorId)-{ano}-...`) — ver `Ids` no PR.
 */

// ---------------------------------------------------------------------------
// percentilHazen — rank médio pra empates, (rank-0.5)/n.
// ---------------------------------------------------------------------------

/**
 * Percentil de Hazen de `v` dentro de `valores` (mesma temporada/grupo já
 * filtrado por quem chama). Empates recebem o rank MÉDIO do grupo empatado
 * (mid-rank: `less + (equal+1)/2`, onde `less` = quantos valores são
 * estritamente menores que `v` e `equal` = quantos são iguais a `v`,
 * incluindo o próprio `v`). `valores` vazio ⇒ 0.5 neutro (não deveria
 * acontecer em uso real — todo grupo elegível tem ao menos o próprio `v`).
 */
export function percentilHazen(valores: readonly number[], v: number): number {
  const n = valores.length;
  if (n === 0) return 0.5;

  let less = 0;
  let equal = 0;
  for (const x of valores) {
    if (x < v) less++;
    else if (x === v) equal++;
  }
  const rank = less + (equal + 1) / 2;
  return (rank - 0.5) / n;
}

// ---------------------------------------------------------------------------
// shrink — empírico-Bayes, ponderado por n (largadas).
// ---------------------------------------------------------------------------

/**
 * Shrinkage empírico-Bayes de `valor` (estatística bruta com `n` observações)
 * em direção a `mediaTemporada`, com peso de pseudo-observações
 * `pseudoN` (default 8). `n=0` ⇒ retorna `mediaTemporada` exatamente.
 */
export function shrink(valor: number, n: number, mediaTemporada: number, pseudoN = 8): number {
  return (n * valor + pseudoN * mediaTemporada) / (n + pseudoN);
}

// ---------------------------------------------------------------------------
// paraNota — percentil [0,1] → inteiro dentro de uma faixa-alvo.
// ---------------------------------------------------------------------------

/** Faixa padrão de notas do PR (D5): [28,96] — nunca 0 nem 99 puros por derivação estatística. */
export const FAIXA_PADRAO: readonly [number, number] = [28, 96];

/** Mapeia percentil [0,1] linearmente pra um inteiro dentro de `faixa` (arredondado, clampado). */
export function paraNota(percentil: number, faixa: readonly [number, number] = FAIXA_PADRAO): number {
  const [min, max] = faixa;
  const p = Math.min(1, Math.max(0, percentil));
  return Math.round(min + p * (max - min));
}

// ---------------------------------------------------------------------------
// slug — normalização de constructorId pra id de componente do dataset.
// ---------------------------------------------------------------------------

/** Lowercase, espaços/underscores/qualquer caractere fora de [a-z0-9-] → hífen; sem duplicatas nem pontas. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Pipeline de derivação — fatos-agregados.json → equipe-anos.derivado.json.
// ---------------------------------------------------------------------------
//
// ASSIMETRIA DE SHRINK (decisão do dev, sessão 2026-07-21 — "piloto com 4
// largadas não crava 99 nem 2 em NADA"):
//   - PILOTO: shrink em TODA estatística bruta (mediaGrid, poles/largadas,
//     mediaChegadaTerminou, deltaCompanheiroMediano, acidenteErro/largadas,
//     posGanhasAjustadasMediana), n = largadas do titular NAQUELA equipe/ano,
//     ANTES do percentil (encolhe o valor bruto pro prior da temporada,
//     ranqueia o valor JÁ encolhido).
//   - EQUIPE: shrink SÓ em CONF/CONF_MOTOR (n = largadas da equipe). `carro`
//     (⇒ AERO/MEC/MOTOR/PPESO/FREIO), CALL/SANGF e PIT_TEMPO/PIT_ERRO NÃO são
//     encolhidos — o corte de escopo (§ PR 4.2: ≥1/3 das etapas) já garante
//     amostra mínima de equipe, e o denominador de equipe é ~2× o do piloto
//     (soma dos 2 titulares).
//
// PRIOR (mediaTemporada do shrink) — agrupado/ponderado por largadas,
// UNIFORME pra toda estatística encolhida (decisão do dev, mesma sessão):
//   Σ(valor·peso) / Σpeso, peso = largadas, somado só sobre entidades com
//   valor não-nulo daquela stat naquela temporada. Pra proporções (CONS,
//   CONF, CONF_MOTOR) isso equivale a Σeventos/Σlargadas (a média ponderada
//   de uma taxa pelo seu próprio denominador é a taxa agrupada). Pra médias
//   de posição (mediaGrid, mediaChegadaTerminou, deltaCompanheiroMediano,
//   posGanhasAjustadasMediana) o peso é largadas mesmo que a média em si seja
//   sobre um subconjunto menor (ex.: só corridas terminadas) — decisão
//   explícita do dev, não recalculado aqui. Racional: é o prior
//   empírico-Bayes clássico; média SIMPLES entre entidades daria peso igual
//   a um piloto de 2 corridas e um de 16, contaminando o prior com o mesmo
//   ruído que o shrink existe pra conter.
//
// NULL: generalização (não literal do plano, mas extensão natural do único
// caso explícito — RIT/deltaCompanheiroMediano) — qualquer estatística bruta
// nula pra uma entidade vira percentil 0.5 NEUTRO pra ela (shrink e ranking
// são pulados só pra essa entidade/stat; ela também NÃO entra no pool de
// ranking dos demais, já que não haveria valor encolhido dela pra incluir).
// Se a temporada inteira não tiver NENHUM valor não-nulo pra uma stat (prior
// indefinido), todo mundo cai no 0.5 pra ela — não deveria ocorrer com o
// dataset real (reportado se ocorrer, ver `dataset-report.ts`).
//
// DIREÇÃO: percentil alto = melhor SEMPRE. Pra "menor é melhor" (grid,
// posição de chegada, deltas, taxas de falha/acidente — estas via
// equivalência algébrica pct(1−taxa) ≡ pct(−taxa), ambas transformações
// afins decrescentes preservam a MESMA ordem relativa e o MESMO percentil de
// Hazen, só documentado aqui pra não reimplementar a mesma conta duas vezes)
// o valor (já encolhido, se aplicável) é NEGADO antes de ranquear.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { BucketFatos, EquipeAnoFatos, FatosAgregados, TitularAnoFatos } from './agregar-fatos.ts';
import { cmpStr, OUTPUT_PATH_PADRAO as FATOS_PATH_PADRAO } from './agregar-fatos.ts';
import { PRIMEIRA_TEMPORADA_PITSTOPS } from './fetch-f1-data.ts';
import { CHU_OVERRIDES, ULT_OVERRIDES } from './overrides-curados.ts';
import type { NotasChassi, NotasMotor, NotasPiloto } from '../src/engine/types.ts';

export const DERIVED_DIR_PADRAO = join(dirname(fileURLToPath(import.meta.url)), 'derived');
export const OUTPUT_PATH_PADRAO = join(DERIVED_DIR_PADRAO, 'equipe-anos.derivado.json');

/** Faixa comprimida do CALL/SANGF (estrategista) — decisão do plano aprovado. */
export const FAIXA_CALL: readonly [number, number] = [35, 80];
/** Faixa-proxy do pit pré-2011 (sem dado real de parada) — decisão do plano aprovado. */
export const FAIXA_PIT_PROXY: readonly [number, number] = [42, 58];
/** CHU/LARG são constantes neutras na v1 (override curado é PR posterior). */
export const NOTA_CHU_V1 = 50;
export const NOTA_LARG_V1 = 50;

// ---------------------------------------------------------------------------
// PR 4.6 — buckets de circuito (AERO/MEC/MOTOR deixam de ser redundantes).
// ---------------------------------------------------------------------------
//
// `SHRINK_BUCKET_K = 8`: mesmo pseudo-N do shrink geral do PR 4.3 (§ acima) —
// nenhuma razão estatística pra usar um K diferente aqui; bucket com poucas
// largadas (equipe correu 1-2 vezes num circuito daquele bucket na temporada)
// encolhe forte em direção a 0 (sem "sinal" de diferenciação), bucket com
// largadas amplas (equipe correu o ano inteiro num bucket dominante — raro,
// mas o corte de escopo do PR 4.2 permite) converge pro delta bruto.
//
// `CAP_AJUSTE_BUCKET = 8` (notas, ±): teto absoluto do ajuste por bucket,
// simétrico. Existe pra impedir que um outlier estatístico (equipe pequena,
// poucas largadas num bucket, delta bruto grande) sozinho jogue AERO/MEC/MOTOR
// pra fora da faixa plausível da faixa-alvo [28,96] — o clamp final da nota
// já protege os limites [28,96], mas o CAP no ajuste em si evita que um
// outlier "coma" a maior parte da faixa disponível de uma vez.
//
// `ESCALA_BUCKET = 100`: calibrada empiricamente sobre a distribuição real de
// `|deltaShrunk|` das 771 equipe/anos × 3 buckets (2313 combinações,
// `fatos-agregados.json` regenerado com os campos do PR 4.6) — p50=0.0184,
// p90=0.0510, p95=0.0630, p99=0.0947, máx=0.1667 (38 combinações são
// exatamente 0 — bucket sem largada). ESCALA=100 (nº redondo) põe o p95 do
// |ajuste| PRÉ-clamp em 6.30 — dentro de [5,8], perto do teto sem estourá-lo
// na maioria dos casos (só ~2.1% das 2313 combinações — 49 — clampam em
// ±CAP_AJUSTE_BUCKET com essa escala). Escalas candidatas menores (80: p95=
// 5.04, 16 clamps) ou maiores (120: p95=7.56, 99 clamps) também caberiam na
// banda; 100 foi escolhido por ser o nº redondo mais central da banda válida.
export const SHRINK_BUCKET_K = 8;
export const CAP_AJUSTE_BUCKET = 8;
export const ESCALA_BUCKET = 100;

/**
 * Ajuste de nota (±, pré-soma com a base) de UM bucket (potencia/travado/aero)
 * pra uma equipe/ano: `deltaShrunk = (gridPercentil_b − gridPercentilGeral) ·
 * largadas_b / (largadas_b + SHRINK_BUCKET_K)`, depois `clamp(deltaShrunk ·
 * ESCALA_BUCKET, ±CAP_AJUSTE_BUCKET)`. Bucket com 0 largadas (ou
 * `gridPercentil` nulo) OU `gridPercentilGeral` nulo (equipe sem nenhuma
 * largada com grid>0 na temporada inteira — caso teórico) ⇒ ajuste 0 (não há
 * base de comparação). O arredondamento pra inteiro acontece só depois, na
 * soma com a nota base (`base + ajuste`, ver `derivarNotasEquipe`).
 */
export function ajusteBucket(gridPercentilGeral: number | null, bucketFatos: BucketFatos): number {
  if (gridPercentilGeral === null || bucketFatos.largadas === 0 || bucketFatos.gridPercentil === null) return 0;
  const deltaShrunk =
    ((bucketFatos.gridPercentil - gridPercentilGeral) * bucketFatos.largadas) / (bucketFatos.largadas + SHRINK_BUCKET_K);
  const ajustePreClamp = deltaShrunk * ESCALA_BUCKET;
  return Math.max(-CAP_AJUSTE_BUCKET, Math.min(CAP_AJUSTE_BUCKET, ajustePreClamp));
}

/** Soma o ajuste de bucket à nota base, arredonda e clampa em [28,96] (faixa-alvo padrão). */
function notaComAjusteBucket(base: number, ajuste: number): number {
  return Math.max(28, Math.min(96, Math.round(base + ajuste)));
}

// ---------------------------------------------------------------------------
// Tipos de saída — mesmo formato de `src/data/equipe-anos.json`.
// ---------------------------------------------------------------------------

export interface PilotoDerivado {
  id: string;
  nome: string;
  notas: NotasPiloto;
}

export interface ChassiDerivado {
  id: string;
  notas: NotasChassi;
}

export interface MotorDerivado {
  id: string;
  notas: NotasMotor;
}

export interface EstrategistaDerivado {
  id: string;
  nome: string;
  notas: { call: number; sangf: number };
}

export interface PitDerivado {
  id: string;
  notas: { pitTempo: number; pitErro: number };
}

export interface EquipeAnoDerivado {
  equipe: string;
  ano: number;
  pilotos: [PilotoDerivado, PilotoDerivado];
  chassi: ChassiDerivado;
  motor: MotorDerivado;
  estrategista: EstrategistaDerivado;
  pit: PitDerivado;
}

// ---------------------------------------------------------------------------
// Prior ponderado por peso (largadas) — só entidades com valor não-nulo.
// ---------------------------------------------------------------------------

interface ValorPonderado {
  valor: number | null;
  peso: number;
}

/** Σ(valor·peso)/Σpeso sobre as entradas com `valor` não-nulo; `null` se nenhuma entrada tiver valor. */
export function priorPonderado(entradas: readonly ValorPonderado[]): number | null {
  let numerador = 0;
  let denominador = 0;
  for (const { valor, peso } of entradas) {
    if (valor === null) continue;
    numerador += valor * peso;
    denominador += peso;
  }
  return denominador === 0 ? null : numerador / denominador;
}

// ---------------------------------------------------------------------------
// Pool de ranking por (temporada, estatística): valor final (encolhido, se
// `comShrink`) por chave — só entidades com valor bruto não-nulo entram.
// ---------------------------------------------------------------------------

interface EntradaPool<K> {
  chave: K;
  valor: number | null;
  peso: number;
}

/** Constrói o mapa chave→valor-final (encolhido ou bruto, conforme `comShrink`) pra uma stat de uma temporada. */
export function prepararPool<K>(
  entradas: readonly EntradaPool<K>[],
  comShrink: boolean,
  pseudoN = 8,
): Map<K, number> {
  const resultado = new Map<K, number>();
  if (!comShrink) {
    for (const e of entradas) {
      if (e.valor !== null) resultado.set(e.chave, e.valor);
    }
    return resultado;
  }
  const prior = priorPonderado(entradas);
  if (prior === null) return resultado;
  for (const e of entradas) {
    if (e.valor === null) continue;
    resultado.set(e.chave, shrink(e.valor, e.peso, prior, pseudoN));
  }
  return resultado;
}

/** Percentil de Hazen da `chave` dentro do `pool` (0.5 neutro se ausente — stat nula pra essa entidade). */
export function pctDoPool<K>(pool: Map<K, number>, chave: K, direcao: 'maior' | 'menor'): number {
  if (!pool.has(chave)) return 0.5;
  const alvo = pool.get(chave)!;
  const valores = [...pool.values()];
  if (direcao === 'maior') return percentilHazen(valores, alvo);
  return percentilHazen(
    valores.map((v) => -v),
    -alvo,
  );
}

// ---------------------------------------------------------------------------
// Pools de uma temporada — pilotos (chave = driverId) e equipes (chave =
// constructorId). Calculados 1x por temporada e reutilizados por toda
// equipe/titular daquele ano.
// ---------------------------------------------------------------------------

interface PoolsPiloto {
  mediaGrid: Map<string, number>; // shrunk
  poleRate: Map<string, number>; // shrunk
  mediaChegada: Map<string, number>; // shrunk
  deltaCompanheiro: Map<string, number>; // shrunk
  acidenteRate: Map<string, number>; // shrunk
  posGanhas: Map<string, number>; // shrunk
}

function prepararPoolsPiloto(titulares: readonly TitularAnoFatos[]): PoolsPiloto {
  return {
    mediaGrid: prepararPool(
      titulares.map((t) => ({ chave: t.driverId, valor: t.mediaGrid, peso: t.largadas })),
      true,
    ),
    poleRate: prepararPool(
      titulares.map((t) => ({ chave: t.driverId, valor: t.poles / t.largadas, peso: t.largadas })),
      true,
    ),
    mediaChegada: prepararPool(
      titulares.map((t) => ({ chave: t.driverId, valor: t.mediaChegadaTerminou, peso: t.largadas })),
      true,
    ),
    deltaCompanheiro: prepararPool(
      titulares.map((t) => ({ chave: t.driverId, valor: t.deltaCompanheiroMediano, peso: t.largadas })),
      true,
    ),
    acidenteRate: prepararPool(
      titulares.map((t) => ({ chave: t.driverId, valor: t['acidente-erro'] / t.largadas, peso: t.largadas })),
      true,
    ),
    posGanhas: prepararPool(
      titulares.map((t) => ({ chave: t.driverId, valor: t.posGanhasAjustadasMediana, peso: t.largadas })),
      true,
    ),
  };
}

interface PoolsEquipe {
  mediaGrid: Map<string, number>; // NÃO shrunk (carro)
  mediaChegada: Map<string, number>; // NÃO shrunk (carro)
  mecChassiRate: Map<string, number>; // shrunk (CONF)
  mecMotorRate: Map<string, number>; // shrunk (CONF_MOTOR)
  overachievement: Map<string, number>; // NÃO shrunk (CALL/SANGF)
  medianaDeltaPit: Map<string, number>; // NÃO shrunk (PIT_TEMPO, só 2011+)
  fracaoEstouradas: Map<string, number>; // NÃO shrunk (PIT_ERRO, só 2011+)
}

function prepararPoolsEquipe(equipes: readonly EquipeAnoFatos[]): PoolsEquipe {
  return {
    mediaGrid: prepararPool(
      equipes.map((e) => ({ chave: e.constructorId, valor: e.mediaGrid, peso: e.largadas })),
      false,
    ),
    mediaChegada: prepararPool(
      equipes.map((e) => ({ chave: e.constructorId, valor: e.mediaChegadaTerminou, peso: e.largadas })),
      false,
    ),
    mecChassiRate: prepararPool(
      equipes.map((e) => ({ chave: e.constructorId, valor: e['mecanica-chassi'] / e.largadas, peso: e.largadas })),
      true,
    ),
    mecMotorRate: prepararPool(
      equipes.map((e) => ({ chave: e.constructorId, valor: e['mecanica-motor'] / e.largadas, peso: e.largadas })),
      true,
    ),
    overachievement: prepararPool(
      equipes.map((e) => ({ chave: e.constructorId, valor: e.overachievementMediano, peso: e.largadas })),
      false,
    ),
    medianaDeltaPit: prepararPool(
      equipes.map((e) => ({ chave: e.constructorId, valor: e.medianaDeltaPit, peso: e.largadas })),
      false,
    ),
    fracaoEstouradas: prepararPool(
      equipes.map((e) => ({ chave: e.constructorId, valor: e.fracaoParadasEstouradas, peso: e.largadas })),
      false,
    ),
  };
}

// ---------------------------------------------------------------------------
// Notas do piloto (titular) — QUALI/RIT/CONS/ULT por fórmula + composições.
// ---------------------------------------------------------------------------

/**
 * QUALI = nota(0.8·pct(−mediaGrid) + 0.2·pct(poles/largadas)) — honestidade:
 * FORTE (grid é o dado mais direto de 1 volta rápida disponível 1950-2025;
 * taxa de pole reforça sem depender de nenhuma suposição extra).
 */
function calcularQuali(pools: PoolsPiloto, driverId: string): number {
  const pctGrid = pctDoPool(pools.mediaGrid, driverId, 'menor');
  const pctPoleRate = pctDoPool(pools.poleRate, driverId, 'maior');
  return paraNota(0.8 * pctGrid + 0.2 * pctPoleRate);
}

/**
 * RIT = nota(0.5·pct(−mediaChegadaTerminou) + 0.5·pct(−deltaCompanheiroMediano))
 * — honestidade: MÉDIA (mediaChegadaTerminou mistura ritmo de carro e
 * piloto; deltaCompanheiroMediano tenta isolar o piloto comparando com quem
 * dirigiu o MESMO carro, mas é `null` sem ≥2 corridas em que ambos
 * terminaram — cai no 0.5 neutro documentado no cabeçalho do pipeline).
 */
function calcularRit(pools: PoolsPiloto, driverId: string): number {
  const pctChegada = pctDoPool(pools.mediaChegada, driverId, 'menor');
  const pctDelta = pctDoPool(pools.deltaCompanheiro, driverId, 'menor');
  return paraNota(0.5 * pctChegada + 0.5 * pctDelta);
}

/**
 * CONS = nota(pct(1−acidenteErro/largadas)) com shrink — honestidade: FRACA
 * (a Ergast não distingue erro do piloto de azar/contato de terceiros dentro
 * de "Accident"/"Collision"/"Spun off" — ver `status-map.ts`; shrink é
 * decisivo aqui porque a taxa é a mais sensível a poucas largadas).
 */
function calcularCons(pools: PoolsPiloto, driverId: string): number {
  return paraNota(pctDoPool(pools.acidenteRate, driverId, 'menor'));
}

/**
 * ULT = nota(pct(−posGanhasAjustadasMediana)) — honestidade: MÉDIA (a
 * recontagem só-entre-quem-terminou anula o "presente" de DNF alheio, mas
 * ainda mistura ganho de posição por ultrapassagem real com ganho por sorte
 * de estratégia/clima que a corrida específica trouxe). PR 4.7: esta
 * derivação mede "remontada", não "ataque" — um piloto dominante que já
 * larga na frente tem pouca posição pra ganhar e sai mal aqui (Verstappen
 * 2023 = 67, Pérez mesmo carro = 94). Por isso `ULT_OVERRIDES`
 * (`overrides-curados.ts`, CURADORIA EXPLÍCITA do dev, não derivação de
 * fatos) substitui este valor pro piloto inteiro, em toda equipe/ano, quando
 * listado — ver `derivarNotasPiloto`.
 */
function calcularUlt(pools: PoolsPiloto, driverId: string): number {
  return paraNota(pctDoPool(pools.posGanhas, driverId, 'menor'));
}

function derivarNotasPiloto(pools: PoolsPiloto, titular: TitularAnoFatos): NotasPiloto {
  const rit = calcularRit(pools, titular.driverId);
  const quali = calcularQuali(pools, titular.driverId);
  const cons = calcularCons(pools, titular.driverId);
  // PR 4.7: ULT_OVERRIDES (`overrides-curados.ts`) substitui a derivação
  // estatística quando o driverId está listado — CURADORIA EXPLÍCITA do dev,
  // não fórmula, vale pra TODO equipe/ano do piloto (carreira inteira). Ver
  // comentário de honestidade em `calcularUlt` acima.
  const ult = ULT_OVERRIDES[titular.driverId] ?? calcularUlt(pools, titular.driverId);
  // DEF/SF/PNEU: combinações declaradas do plano, sobre as NOTAS já mapeadas
  // (não sobre os percentis) — honestidade FRACA (nenhum dos 2 tem estatística
  // própria no dataset Ergast; são compostas por design de jogo, não medidas).
  const def = Math.round(0.5 * rit + 0.5 * cons);
  const sf = Math.round(0.5 * cons + 0.5 * rit);
  const pneu = Math.round(0.6 * rit + 0.4 * cons);
  // PR 4.7: CHU_OVERRIDES (`overrides-curados.ts`) substitui a constante v1
  // quando o driverId está listado — CURADORIA EXPLÍCITA do dev, não fórmula
  // (nenhum fato do dataset diferencia desempenho sob chuva), vale pra TODO
  // equipe/ano do piloto (carreira inteira).
  const chu = CHU_OVERRIDES[titular.driverId] ?? NOTA_CHU_V1;
  return {
    rit,
    quali,
    cons,
    ult,
    def,
    chu, // honestidade: NENHUMA por padrão (constante v1); CURADORIA EXPLÍCITA se listado em CHU_OVERRIDES (PR 4.7).
    pneu,
    larg: NOTA_LARG_V1, // honestidade: NENHUMA — constante v1 (LARG não tocado neste PR).
    sf,
  };
}

// ---------------------------------------------------------------------------
// Notas da equipe — carro (AERO/MEC/MOTOR/PPESO/FREIO), CONF/CONF_MOTOR,
// CALL/SANGF, PIT_TEMPO/PIT_ERRO.
// ---------------------------------------------------------------------------

/**
 * `carro` = 0.5·pct(−mediaGrid da equipe) + 0.5·pct(−mediaChegadaTerminou da
 * equipe), NÃO encolhido (decisão do dev). Honestidade: FRACA. É a nota BASE
 * de PPESO/FREIO (sempre iguais a ela) e de AERO/MEC/MOTOR — que, a partir do
 * PR 4.6 ("buckets de circuito"), recebem um AJUSTE por cima dessa base (ver
 * `ajusteBucket`/`notaComAjusteBucket`), deixando de ser redundantes entre si.
 */
function calcularCarro(pools: PoolsEquipe, constructorId: string): number {
  const pctGrid = pctDoPool(pools.mediaGrid, constructorId, 'menor');
  const pctChegada = pctDoPool(pools.mediaChegada, constructorId, 'menor');
  return 0.5 * pctGrid + 0.5 * pctChegada;
}

/**
 * CONF/CONF_MOTOR = nota(pct(1−mecanicaChassi(ou motor)/largadas)) com
 * shrink (n = largadas da equipe). Honestidade: MÉDIA (a distinção
 * chassi/motor dentro de "mecânica" é convenção do projeto — ver
 * `status-map.ts` — não garantia formal da Ergast).
 */
function calcularConf(pools: PoolsEquipe, constructorId: string): number {
  return paraNota(pctDoPool(pools.mecChassiRate, constructorId, 'menor'));
}

function calcularConfMotor(pools: PoolsEquipe, constructorId: string): number {
  return paraNota(pctDoPool(pools.mecMotorRate, constructorId, 'menor'));
}

/**
 * CALL = SANGF = notaFaixa(pct(−overachievementMediano), [35,80]) —
 * comprimido porque overachievement de equipe (posições recontadas ganhas
 * pelos 2 carros vs. grid) é um proxy indireto de decisão de estratégia:
 * mistura chamada do estrategista com ritmo de carro/piloto que a recontagem
 * não separa. Honestidade: FRACA.
 */
function calcularCall(pools: PoolsEquipe, constructorId: string): number {
  // Direção 'menor' porque o sinal de `overachievementMediano` é
  // chegada − grid (recontados): NEGATIVO = terminou à frente do que largou
  // = superou o grid = bom. O nome "overachievement" lê ao contrário do
  // sinal — não "corrigir" pra 'maior' sem inverter o fato lá na agregação.
  const pctOver = pctDoPool(pools.overachievement, constructorId, 'menor');
  return paraNota(pctOver, FAIXA_CALL);
}

/**
 * PIT_TEMPO/PIT_ERRO: 2011+ usam dado real de pitstops (honestidade FORTE);
 * 1950-2010 usam proxy explícito sobre o percentil de `carro` — SEM dado
 * real de pit (honestidade NENHUMA, documentado no valor emitido).
 */
function calcularPit(
  pools: PoolsEquipe,
  constructorId: string,
  season: number,
  carroPct: number,
): { pitTempo: number; pitErro: number } {
  if (season >= PRIMEIRA_TEMPORADA_PITSTOPS) {
    const pitTempo = paraNota(pctDoPool(pools.medianaDeltaPit, constructorId, 'menor'));
    const pitErro = paraNota(pctDoPool(pools.fracaoEstouradas, constructorId, 'menor'));
    return { pitTempo, pitErro };
  }
  // Proxy pré-2011: round(42 + carroPercentil·16) ≡ paraNota(carroPct, [42,58]).
  const proxy = paraNota(carroPct, FAIXA_PIT_PROXY);
  return { pitTempo: proxy, pitErro: proxy };
}

function derivarNotasEquipe(
  pools: PoolsEquipe,
  equipe: EquipeAnoFatos,
): { chassi: NotasChassi; motor: NotasMotor; call: number; sangf: number; pit: { pitTempo: number; pitErro: number } } {
  const carroPct = calcularCarro(pools, equipe.constructorId);
  const notaCarro = paraNota(carroPct);
  const conf = calcularConf(pools, equipe.constructorId);
  const confMotor = calcularConfMotor(pools, equipe.constructorId);
  const call = calcularCall(pools, equipe.constructorId);
  const pit = calcularPit(pools, equipe.constructorId, equipe.season, carroPct);

  // PR 4.6 — AERO/MEC/MOTOR ajustados por bucket de circuito (potencia/
  // travado/aero — ver `circuit-buckets.ts`); PPESO/FREIO permanecem SEMPRE
  // na nota base `notaCarro` (não têm bucket associado no GDD §9).
  const ajusteAero = ajusteBucket(equipe.gridPercentilGeral, equipe.porBucket.aero);
  const ajusteMec = ajusteBucket(equipe.gridPercentilGeral, equipe.porBucket.travado);
  const ajusteMotor = ajusteBucket(equipe.gridPercentilGeral, equipe.porBucket.potencia);
  const aero = notaComAjusteBucket(notaCarro, ajusteAero);
  const mec = notaComAjusteBucket(notaCarro, ajusteMec);
  const motor = notaComAjusteBucket(notaCarro, ajusteMotor);

  return {
    chassi: { aero, mec, ppeso: notaCarro, conf, freio: notaCarro },
    motor: { motor, confMotor },
    call,
    sangf: call, // SANGF = CALL, por definição do plano aprovado.
    pit,
  };
}

// ---------------------------------------------------------------------------
// Ids — slug(constructorId)-{ano}-{sufixo}. Únicos globalmente: o loader
// (`src/engine/dataset.ts`) valida id único num ÚNICO conjunto compartilhado
// entre pilotos/chassis/motores/estrategistas/pits/pecas/pistas — o padrão
// aqui (sufixo fixo por categoria + slug+ano) garante isso desde que dois
// constructorIds distintos não colidam no MESMO ano depois do slug (checado
// em runtime por `verificarColisaoDeIds` mais abaixo, chamado por `main`).
// ---------------------------------------------------------------------------

function idsDaEquipeAno(constructorId: string, ano: number) {
  const base = `${slug(constructorId)}-${ano}`;
  return {
    chassi: `${base}-chassi`,
    motor: `${base}-motor`,
    estrategista: `${base}-estrategista`,
    pit: `${base}-pit`,
    piloto: (driverId: string) => `${base}-piloto-${driverId}`,
  };
}

// ---------------------------------------------------------------------------
// Orquestração — 1 EquipeAnoDerivado por entrada de `fatos.equipes`.
// ---------------------------------------------------------------------------

/**
 * Deriva o dataset completo a partir dos fatos agregados (PR 4.2). Pura:
 * recebe `FatosAgregados` já carregado, devolve o array — I/O fica no `main`
 * abaixo. Determinística: mesma entrada ⇒ mesma saída, byte a byte (mesma
 * ordem de `fatos.equipes` — já vem ano asc, constructorId asc do PR 4.2 —,
 * preservada aqui sem re-sort).
 */
export function derivarNotas(fatos: FatosAgregados): EquipeAnoDerivado[] {
  const titularesPorSeason = new Map<number, TitularAnoFatos[]>();
  for (const t of fatos.titulares) {
    const lista = titularesPorSeason.get(t.season) ?? [];
    lista.push(t);
    titularesPorSeason.set(t.season, lista);
  }
  const equipesPorSeason = new Map<number, EquipeAnoFatos[]>();
  for (const e of fatos.equipes) {
    const lista = equipesPorSeason.get(e.season) ?? [];
    lista.push(e);
    equipesPorSeason.set(e.season, lista);
  }

  const poolsPilotoPorSeason = new Map<number, PoolsPiloto>();
  const poolsEquipePorSeason = new Map<number, PoolsEquipe>();

  const resultado: EquipeAnoDerivado[] = [];

  for (const equipe of fatos.equipes) {
    const { season, constructorId } = equipe;

    let poolsPiloto = poolsPilotoPorSeason.get(season);
    if (!poolsPiloto) {
      poolsPiloto = prepararPoolsPiloto(titularesPorSeason.get(season) ?? []);
      poolsPilotoPorSeason.set(season, poolsPiloto);
    }
    let poolsEquipe = poolsEquipePorSeason.get(season);
    if (!poolsEquipe) {
      poolsEquipe = prepararPoolsEquipe(equipesPorSeason.get(season) ?? []);
      poolsEquipePorSeason.set(season, poolsEquipe);
    }

    const titularesDaEquipe = (titularesPorSeason.get(season) ?? [])
      .filter((t) => t.constructorId === constructorId)
      // Ordem [0]/[1] do par sem significado funcional (o loader não
      // distingue índice) — só pra determinismo byte a byte da saída.
      .sort((a, b) => cmpStr(a.driverId, b.driverId));
    if (titularesDaEquipe.length !== 2) {
      throw new Error(
        `derivarNotas: ${constructorId} ${season} tem ${titularesDaEquipe.length} titulares (esperado 2) — invariante do PR 4.2 quebrada`,
      );
    }

    const ids = idsDaEquipeAno(constructorId, season);
    const pilotos: [PilotoDerivado, PilotoDerivado] = [
      { id: ids.piloto(titularesDaEquipe[0].driverId), nome: titularesDaEquipe[0].nome, notas: derivarNotasPiloto(poolsPiloto, titularesDaEquipe[0]) },
      { id: ids.piloto(titularesDaEquipe[1].driverId), nome: titularesDaEquipe[1].nome, notas: derivarNotasPiloto(poolsPiloto, titularesDaEquipe[1]) },
    ];

    const notasEquipe = derivarNotasEquipe(poolsEquipe, equipe);

    resultado.push({
      equipe: equipe.nome,
      ano: season,
      pilotos,
      chassi: { id: ids.chassi, notas: notasEquipe.chassi },
      motor: { id: ids.motor, notas: notasEquipe.motor },
      estrategista: {
        id: ids.estrategista,
        nome: `Estrategista ${equipe.nome} ${season}`,
        notas: { call: notasEquipe.call, sangf: notasEquipe.sangf },
      },
      pit: { id: ids.pit, notas: notasEquipe.pit },
    });
  }

  return resultado;
}

/** Serializa de forma determinística (mesmo padrão de `agregar-fatos.ts`). */
export function serializarDerivado(dados: EquipeAnoDerivado[]): string {
  return `${JSON.stringify(dados, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// Verificação de colisão de ids — roda no `main`, não na função pura acima
// (mantém `derivarNotas` livre de asserts de "todo o dataset").
// ---------------------------------------------------------------------------

/** Lança se dois registros do derivado compartilharem o mesmo id (violaria o `idsVistos` único do loader). */
export function verificarColisaoDeIds(dados: readonly EquipeAnoDerivado[]): void {
  const vistos = new Set<string>();
  const registrar = (id: string, contexto: string) => {
    if (vistos.has(id)) throw new Error(`verificarColisaoDeIds: id duplicado "${id}" (${contexto})`);
    vistos.add(id);
  };
  for (const e of dados) {
    registrar(e.pilotos[0].id, `${e.equipe} ${e.ano} piloto[0]`);
    registrar(e.pilotos[1].id, `${e.equipe} ${e.ano} piloto[1]`);
    registrar(e.chassi.id, `${e.equipe} ${e.ano} chassi`);
    registrar(e.motor.id, `${e.equipe} ${e.ano} motor`);
    registrar(e.estrategista.id, `${e.equipe} ${e.ano} estrategista`);
    registrar(e.pit.id, `${e.equipe} ${e.ano} pit`);
  }
}

// ---------------------------------------------------------------------------
// CLI (só roda em execução direta — mesmo padrão de `agregar-fatos.ts`).
// ---------------------------------------------------------------------------

export function main(): EquipeAnoDerivado[] {
  const fatos = JSON.parse(readFileSync(FATOS_PATH_PADRAO, 'utf8')) as FatosAgregados;
  const derivado = derivarNotas(fatos);
  verificarColisaoDeIds(derivado);

  const conteudo = serializarDerivado(derivado);
  // Mesma escrita atômica das outras etapas do pipeline (tmp+rename).
  const tmp = `${OUTPUT_PATH_PADRAO}.tmp`;
  mkdirSync(dirname(OUTPUT_PATH_PADRAO), { recursive: true });
  writeFileSync(tmp, conteudo);
  renameSync(tmp, OUTPUT_PATH_PADRAO);

  console.log(`Escrito: ${OUTPUT_PATH_PADRAO}`);
  console.log(`Equipe/ano derivados: ${derivado.length}`);
  return derivado;
}

const ehExecucaoDireta = process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ehExecucaoDireta) {
  main();
}
