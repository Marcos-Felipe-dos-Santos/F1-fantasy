/**
 * Relatório do dataset derivado (PR 4.3, trilha "Dataset histórico 1950-2025",
 * `HISTORICO.md` seção "Próximos"). Lê `scripts/derived/equipe-anos.derivado.json`
 * (PR 4.3, `derivar-notas.ts`) + `scripts/derived/fatos-agregados.json` (PR
 * 4.2) e imprime números pro dev revisar antes do swap pra `src/data/` (PR
 * 4.5). Só leitura + `console.log` — nenhuma fórmula nova, nenhuma escrita.
 *
 * Roda via `npm run dataset:report` (Node 24 nativo, mesmo estilo dos
 * outros scripts do pipeline).
 *
 * Seções impressas:
 *   1. Total de entradas (equipe/anos) do derivado.
 *   2. Histograma (10 buckets de 10 em 10, 0-99) por atributo por década.
 *   3. Min/max/média por atributo (visão geral, todas as temporadas).
 *   4. Top-10 / bottom-10 equipe/ano por AERO (`chassi.notas.aero`).
 *   5. Spot-checks INFORMATIVOS (imprime valores, nunca falha o script):
 *      Senna quali 1988-91, McLaren-1988 aero, Ferrari-2004 aero,
 *      Minardi-1995 aero, Verstappen-2023 rit, Red Bull-2012 pitTempo.
 *   6. PR 4.6 — buckets de circuito: distribuição dos ajustes de bucket
 *      (min/max/média, contagem de clamps em ±CAP_AJUSTE_BUCKET) + spot-checks
 *      AERO/MEC/MOTOR (Red Bull 2011, Mercedes 2015, McLaren 2015, Ferrari
 *      2004, McLaren 1988) — também informativos, nunca falham o script.
 *
 * `CALL=SANGF` continuam redundantes por definição do plano (rotulado só
 * `call`, pra não inflar o relatório com uma coluna idêntica). `PPESO=FREIO`
 * também continuam sempre iguais entre si (nota base `carro`, sem bucket) —
 * mas, a partir do PR 4.6, `AERO`/`MEC`/`MOTOR` NÃO SÃO MAIS idênticos entre
 * si nem a `PPESO`/`FREIO` (ajustados por bucket de circuito — ver
 * `derivar-notas.ts`), por isso aparecem como atributos próprios no relatório.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { FatosAgregados } from './agregar-fatos.ts';
import { OUTPUT_PATH_PADRAO as FATOS_PATH_PADRAO } from './agregar-fatos.ts';
import type { EquipeAnoDerivado } from './derivar-notas.ts';
import { ajusteBucket, CAP_AJUSTE_BUCKET, OUTPUT_PATH_PADRAO as DERIVADO_PATH_PADRAO } from './derivar-notas.ts';

// ---------------------------------------------------------------------------
// Extração de atributos — 1 valor por entidade (piloto/equipe) com o ano.
// ---------------------------------------------------------------------------

interface ValorAno {
  ano: number;
  valor: number;
}

const ATRIBUTOS_PILOTO = ['rit', 'quali', 'cons', 'ult', 'def', 'chu', 'pneu', 'larg', 'sf'] as const;
type AtributoPiloto = (typeof ATRIBUTOS_PILOTO)[number];

/**
 * Rótulo → extrator. `carro` = base sem ajuste de bucket (`ppeso`, sempre
 * igual a `freio` — ver cabeçalho); `aero`/`mec`/`potencia` são as notas
 * ajustadas por bucket (PR 4.6, divergem de `carro` e entre si). `call` é
 * representante da coluna idêntica a `sangf` (ver cabeçalho).
 */
const ATRIBUTOS_EQUIPE: Record<string, (e: EquipeAnoDerivado) => number> = {
  carro: (e) => e.chassi.notas.ppeso,
  aero: (e) => e.chassi.notas.aero,
  mec: (e) => e.chassi.notas.mec,
  potencia: (e) => e.motor.notas.motor,
  conf: (e) => e.chassi.notas.conf,
  confMotor: (e) => e.motor.notas.confMotor,
  call: (e) => e.estrategista.notas.call,
  pitTempo: (e) => e.pit.notas.pitTempo,
  pitErro: (e) => e.pit.notas.pitErro,
};

function valoresPiloto(derivado: readonly EquipeAnoDerivado[], atributo: AtributoPiloto): ValorAno[] {
  const valores: ValorAno[] = [];
  for (const e of derivado) {
    for (const p of e.pilotos) {
      valores.push({ ano: e.ano, valor: p.notas[atributo] });
    }
  }
  return valores;
}

function valoresEquipe(derivado: readonly EquipeAnoDerivado[], atributo: string): ValorAno[] {
  const extrator = ATRIBUTOS_EQUIPE[atributo];
  return derivado.map((e) => ({ ano: e.ano, valor: extrator(e) }));
}

// ---------------------------------------------------------------------------
// Estatísticas — histograma (10 buckets fixos 0-9..90-99), min/max/média.
// ---------------------------------------------------------------------------

const N_BUCKETS = 10;
const LARGURA_BUCKET = 10; // 0-99 em 10 buckets de 10.

function histograma(valores: readonly number[]): number[] {
  const buckets = new Array<number>(N_BUCKETS).fill(0);
  for (const v of valores) {
    const idx = Math.min(N_BUCKETS - 1, Math.max(0, Math.floor(v / LARGURA_BUCKET)));
    buckets[idx]++;
  }
  return buckets;
}

function decada(ano: number): number {
  return Math.floor(ano / 10) * 10;
}

function minMaxMedia(valores: readonly number[]): { min: number; max: number; media: number } {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const media = valores.reduce((a, b) => a + b, 0) / valores.length;
  return { min, max, media: Math.round(media * 100) / 100 };
}

function formatarHistograma(buckets: readonly number[]): string {
  return buckets.map((c, i) => `[${i * 10}-${i * 10 + 9}]:${c}`).join(' ');
}

// ---------------------------------------------------------------------------
// Impressão das seções.
// ---------------------------------------------------------------------------

function imprimirHistogramaPorDecada(rotulo: string, valoresAno: readonly ValorAno[]): void {
  console.log(`\n--- Histograma por década — ${rotulo} ---`);
  const decadas = [...new Set(valoresAno.map((v) => decada(v.ano)))].sort((a, b) => a - b);
  for (const d of decadas) {
    const valoresDaDecada = valoresAno.filter((v) => decada(v.ano) === d).map((v) => v.valor);
    console.log(`${d}s (n=${valoresDaDecada.length}): ${formatarHistograma(histograma(valoresDaDecada))}`);
  }
}

function imprimirMinMaxMedia(rotulo: string, valoresAno: readonly ValorAno[]): void {
  const { min, max, media } = minMaxMedia(valoresAno.map((v) => v.valor));
  console.log(`${rotulo}: min=${min} max=${max} média=${media}`);
}

function imprimirTopBottomCarro(derivado: readonly EquipeAnoDerivado[]): void {
  const ordenado = [...derivado].sort((a, b) => b.chassi.notas.aero - a.chassi.notas.aero);
  console.log('\n--- Top-10 por AERO (chassi.notas.aero) ---');
  for (const e of ordenado.slice(0, 10)) {
    console.log(`  ${e.equipe} ${e.ano}: aero=${e.chassi.notas.aero}`);
  }
  console.log('\n--- Bottom-10 por AERO (chassi.notas.aero) ---');
  for (const e of ordenado.slice(-10).reverse()) {
    console.log(`  ${e.equipe} ${e.ano}: aero=${e.chassi.notas.aero}`);
  }
}

function encontrarPiloto(derivado: readonly EquipeAnoDerivado[], driverIdSuffix: string, ano: number) {
  const entrada = derivado.find((e) => e.ano === ano && e.pilotos.some((p) => p.id.endsWith(`piloto-${driverIdSuffix}`)));
  return entrada?.pilotos.find((p) => p.id.endsWith(`piloto-${driverIdSuffix}`));
}

function encontrarEquipe(derivado: readonly EquipeAnoDerivado[], equipeNome: string, ano: number) {
  return derivado.find((e) => e.equipe === equipeNome && e.ano === ano);
}

function imprimirSpotChecks(derivado: readonly EquipeAnoDerivado[]): void {
  console.log('\n--- Spot-checks (informativo — não falha o script) ---');

  for (const ano of [1988, 1989, 1990, 1991]) {
    const senna = encontrarPiloto(derivado, 'senna', ano);
    console.log(`Senna ${ano} QUALI: ${senna ? senna.notas.quali : '(não encontrado)'}`);
  }

  const mclaren1988 = encontrarEquipe(derivado, 'McLaren', 1988);
  console.log(`McLaren 1988 AERO: ${mclaren1988 ? mclaren1988.chassi.notas.aero : '(não encontrado)'}`);

  const ferrari2004 = encontrarEquipe(derivado, 'Ferrari', 2004);
  console.log(`Ferrari 2004 AERO: ${ferrari2004 ? ferrari2004.chassi.notas.aero : '(não encontrado)'}`);

  const minardi1995 = encontrarEquipe(derivado, 'Minardi', 1995);
  console.log(`Minardi 1995 AERO: ${minardi1995 ? minardi1995.chassi.notas.aero : '(não encontrado)'}`);

  const verstappen2023 = encontrarPiloto(derivado, 'max_verstappen', 2023);
  console.log(`Verstappen 2023 RIT: ${verstappen2023 ? verstappen2023.notas.rit : '(não encontrado)'}`);

  const redbull2012 = encontrarEquipe(derivado, 'Red Bull', 2012);
  console.log(`Red Bull 2012 PIT_TEMPO: ${redbull2012 ? redbull2012.pit.notas.pitTempo : '(não encontrado)'}`);
}

// ---------------------------------------------------------------------------
// PR 4.6 — buckets de circuito: distribuição dos ajustes + spot-checks
// AERO/MEC/MOTOR. Recalcula `ajusteBucket` a partir de `fatos` (mesma fórmula
// de `derivar-notas.ts`) só pra ter o valor PRÉ-clamp — o derivado só guarda
// a nota final, já somada à base e clampada em [28,96].
// ---------------------------------------------------------------------------

function imprimirDistribuicaoBuckets(fatos: FatosAgregados): void {
  console.log('\n=== PR 4.6 — Distribuição dos ajustes de bucket (AERO/MEC/MOTOR) ===');
  const ajustes: number[] = [];
  for (const e of fatos.equipes) {
    ajustes.push(
      ajusteBucket(e.gridPercentilGeral, e.porBucket.aero),
      ajusteBucket(e.gridPercentilGeral, e.porBucket.travado),
      ajusteBucket(e.gridPercentilGeral, e.porBucket.potencia),
    );
  }
  const { min, max, media } = minMaxMedia(ajustes);
  console.log(`Ajustes de bucket (${ajustes.length} combinações = ${fatos.equipes.length} equipe/ano × 3): min=${min} max=${max} média=${media}`);
  const clampsPositivos = ajustes.filter((a) => a === CAP_AJUSTE_BUCKET).length;
  const clampsNegativos = ajustes.filter((a) => a === -CAP_AJUSTE_BUCKET).length;
  const totalClamps = clampsPositivos + clampsNegativos;
  console.log(
    `Clamps em ±${CAP_AJUSTE_BUCKET}: ${totalClamps} (${((totalClamps / ajustes.length) * 100).toFixed(1)}%) — ${clampsPositivos} em +${CAP_AJUSTE_BUCKET}, ${clampsNegativos} em -${CAP_AJUSTE_BUCKET}`,
  );
  const zeros = ajustes.filter((a) => a === 0).length;
  console.log(`Ajustes exatamente 0 (bucket sem largada ou sem gridPercentilGeral): ${zeros}`);
}

function imprimirSpotChecksBuckets(derivado: readonly EquipeAnoDerivado[]): void {
  console.log('\n--- Spot-checks AERO/MEC/MOTOR (informativo — não falha o script) ---');
  const casos: Array<[string, number]> = [
    ['Red Bull', 2011],
    ['Mercedes', 2015],
    ['McLaren', 2015],
    ['Ferrari', 2004],
    ['McLaren', 1988],
  ];
  for (const [nome, ano] of casos) {
    const e = encontrarEquipe(derivado, nome, ano);
    if (!e) {
      console.log(`${nome} ${ano}: (não encontrado)`);
      continue;
    }
    console.log(
      `${nome} ${ano}: aero=${e.chassi.notas.aero} mec=${e.chassi.notas.mec} motor=${e.motor.notas.motor} (base carro=${e.chassi.notas.ppeso})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Orquestração.
// ---------------------------------------------------------------------------

export function gerarRelatorio(derivado: readonly EquipeAnoDerivado[], fatos: FatosAgregados): void {
  console.log(`Total de entradas (equipe/ano) no derivado: ${derivado.length}`);
  console.log(`Total de equipe/ano elegíveis no fatos-agregados: ${fatos.equipes.length}`);

  console.log('\n=== Histogramas por atributo por década ===');
  for (const atributo of ATRIBUTOS_PILOTO) {
    imprimirHistogramaPorDecada(`piloto.${atributo}`, valoresPiloto(derivado, atributo));
  }
  for (const atributo of Object.keys(ATRIBUTOS_EQUIPE)) {
    imprimirHistogramaPorDecada(`equipe.${atributo}`, valoresEquipe(derivado, atributo));
  }

  console.log('\n=== Min/max/média por atributo (todas as temporadas) ===');
  for (const atributo of ATRIBUTOS_PILOTO) {
    imprimirMinMaxMedia(`piloto.${atributo}`, valoresPiloto(derivado, atributo));
  }
  for (const atributo of Object.keys(ATRIBUTOS_EQUIPE)) {
    imprimirMinMaxMedia(`equipe.${atributo}`, valoresEquipe(derivado, atributo));
  }

  imprimirTopBottomCarro(derivado);
  imprimirSpotChecks(derivado);
  imprimirDistribuicaoBuckets(fatos);
  imprimirSpotChecksBuckets(derivado);
}

export function main(): void {
  const fatos = JSON.parse(readFileSync(FATOS_PATH_PADRAO, 'utf8')) as FatosAgregados;
  const derivado = JSON.parse(readFileSync(DERIVADO_PATH_PADRAO, 'utf8')) as EquipeAnoDerivado[];
  gerarRelatorio(derivado, fatos);
}

// Só roda em execução direta (mesmo padrão de `agregar-fatos.ts`/`derivar-notas.ts`)
// — evita I/O e print se este módulo for importado por um teste no futuro.
const ehExecucaoDireta = process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ehExecucaoDireta) {
  main();
}
