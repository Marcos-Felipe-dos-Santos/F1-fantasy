/**
 * Fetch + cache da Jolpica-F1 (PR 4.1, trilha "Dataset histórico 1950-2025",
 * `HISTORICO.md` seção "Próximos"). Projeto voluntário com custo próprio — a
 * disciplina de rede abaixo é INVIOLÁVEL:
 *
 *   - throttle de 1 requisição real a cada 10s (constante documentada
 *     abaixo, ajustável só por `--throttle-ms`);
 *   - cache resume-safe rigoroso em disco (`scripts/cache/jolpica/`,
 *     gitignored): 1 arquivo por requisição, escrita atômica (tmp+rename),
 *     NUNCA refetch de um arquivo que já parseia como JSON válido;
 *   - backoff em 429/5xx/erro de rede (espera 60s, até 3 tentativas, depois
 *     ABORTA A CORRIDA TODA com mensagem de como retomar — rodar de novo só
 *     continua de onde parou, o cache garante isso);
 *   - 4xx≠429 aborta só aquele endpoint (log + segue pro próximo), não a
 *     corrida toda (ex.: round sem pitstops, temporada sem dados).
 *
 * Roda via `npm run dataset:fetch` (Node 24 nativo, type stripping — sem
 * enums/namespaces/parameter properties, `import type` pra tipos).
 *
 * Baixa 2 blocos de fatos crus da API Jolpica-F1 (`https://api.jolpi.ca/ergast/f1/`,
 * compatível com Ergast):
 *   1. `/{season}/results.json` pra season 1950..2025 (paginado por `total`
 *      do envelope MRData, ~4 páginas/temporada).
 *   2. `/{season}/{round}/pitstops.json` só pra 2011..2025 — os rounds de
 *      cada temporada são os `Race.round` únicos das páginas de results já
 *      baixadas dessa temporada, SEM requisição extra de schedule.
 *
 * A ordem das requisições é determinística (seasons asc, páginas asc;
 * pitstops depois dos results da mesma temporada) — o resume é previsível.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Constantes (documentadas — aprovadas pelo dev em 2026-07-21).
// ---------------------------------------------------------------------------

export const BASE_URL = 'https://api.jolpi.ca/ergast/f1/';
export const LIMIT_PADRAO = 100;
/** 1 requisição real a cada 10s — disciplina de rede aprovada pelo dev. Ajustável só por `--throttle-ms`. */
export const THROTTLE_MS_PADRAO = 10_000;
export const TIMEOUT_MS = 30_000;
export const BACKOFF_MS = 60_000;
export const MAX_TENTATIVAS = 3;
export const USER_AGENT = 'f1-fantasy-dataset-script (projeto pessoal, contato via github)';

export const PRIMEIRA_TEMPORADA = 1950;
export const ULTIMA_TEMPORADA = 2025;
export const PRIMEIRA_TEMPORADA_PITSTOPS = 2011;

export const CACHE_DIR_PADRAO = join(dirname(fileURLToPath(import.meta.url)), 'cache', 'jolpica');

// ---------------------------------------------------------------------------
// Tipos do envelope MRData (subset usado — formato documentado pela API
// Jolpica/Ergast).
// ---------------------------------------------------------------------------

export interface EnvelopePaginado {
  MRData: {
    total: string;
    limit: string;
    offset: string;
  };
}

export interface RaceTablePagina {
  MRData: {
    total: string;
    limit: string;
    offset: string;
    RaceTable: {
      Races: Array<{ round: string }>;
    };
  };
}

// ---------------------------------------------------------------------------
// Lógica pura — montagem de URLs/paths, paginação, extração de rounds,
// decisão de cache hit/fetch. Testável sem I/O nem rede.
// ---------------------------------------------------------------------------

export function resultsUrl(season: number, offset: number, limit: number = LIMIT_PADRAO): string {
  return `${BASE_URL}${season}/results.json?limit=${limit}&offset=${offset}`;
}

export function pitstopsUrl(
  season: number,
  round: string,
  offset: number,
  limit: number = LIMIT_PADRAO,
): string {
  return `${BASE_URL}${season}/${round}/pitstops.json?limit=${limit}&offset=${offset}`;
}

/** Dado o `total`/`limit` do envelope MRData, os offsets de todas as páginas (0, limit, 2·limit, ...). */
export function offsetsFromEnvelope(total: number, limit: number): number[] {
  if (total <= 0) return [0];
  const paginas = Math.ceil(total / limit);
  return Array.from({ length: paginas }, (_, i) => i * limit);
}

/** Extrai os `Race.round` únicos das páginas de results de uma temporada, ordenados numericamente. */
export function extrairRoundsUnicos(paginas: readonly RaceTablePagina[]): string[] {
  const vistos = new Set<string>();
  for (const pagina of paginas) {
    for (const race of pagina.MRData.RaceTable.Races) {
      vistos.add(race.round);
    }
  }
  return [...vistos].sort((a, b) => Number(a) - Number(b));
}

/**
 * true se precisa buscar da rede: sem arquivo (`conteudoArquivo === null`) ou
 * arquivo existe mas não parseia como JSON válido (parcial/corrompido).
 */
export function deveBuscar(conteudoArquivo: string | null): boolean {
  if (conteudoArquivo === null) return true;
  try {
    JSON.parse(conteudoArquivo);
    return false;
  } catch {
    return true;
  }
}

export function caminhoCacheResults(cacheDir: string, season: number, pageIndex: number): string {
  return join(cacheDir, String(season), `results-p${pageIndex}.json`);
}

export function caminhoCachePitstops(
  cacheDir: string,
  season: number,
  round: string,
  pageIndex: number,
): string {
  return join(cacheDir, String(season), `r${round}-pitstops-p${pageIndex}.json`);
}

/** Classifica uma resposta HTTP: sucesso, retry (429/5xx) ou abort (4xx≠429). */
export function classificarStatus(status: number): 'ok' | 'retry' | 'abort' {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 429 || status >= 500) return 'retry';
  return 'abort';
}

function obterPaginacao(dados: unknown): { total: number; limit: number } {
  const envelope = dados as EnvelopePaginado;
  const total = Number(envelope.MRData.total);
  const limit = Number(envelope.MRData.limit) || LIMIT_PADRAO;
  return { total, limit };
}

// ---------------------------------------------------------------------------
// Throttle — 1 requisição real a cada `throttleMs`; NUNCA aplicado a cache
// hits. `sleep`/`now` injetáveis pra teste (clock fake, sem esperar de verdade).
// ---------------------------------------------------------------------------

export interface Throttle {
  aguardar(): Promise<void>;
}

export function criarThrottle(
  throttleMs: number,
  sleep: (ms: number) => Promise<void>,
  now: () => number,
): Throttle {
  let proximoPermitido = -Infinity;
  return {
    async aguardar(): Promise<void> {
      const agora = now();
      const espera = proximoPermitido - agora;
      if (espera > 0) {
        await sleep(espera);
      }
      proximoPermitido = Math.max(agora, proximoPermitido) + throttleMs;
    },
  };
}

function sleepReal(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Executor (I/O: rede + disco). Dependências injetáveis pra teste.
// ---------------------------------------------------------------------------

export interface Dependencias {
  fetchImpl: typeof fetch;
  throttle: Throttle;
  /** Sleep usado só pro backoff de retry (429/5xx/erro de rede) — nunca pro throttle, que já embute o seu. */
  sleepBackoff: (ms: number) => Promise<void>;
  log: (msg: string) => void;
}

type ResultadoBusca = { tipo: 'ok'; dados: unknown } | { tipo: 'abort' };

/**
 * Busca `url` com retry/backoff. Throttle é aplicado 1x por requisição
 * lógica (não por tentativa) — retries são governados só pelo backoff de
 * 60s. Erros de rede (timeout do AbortController, DNS, etc.) são tratados
 * igual a 429/5xx (retry); 4xx≠429 aborta só este endpoint (não lança).
 * Depois de `MAX_TENTATIVAS` sem sucesso em 429/5xx/erro de rede, lança um
 * erro que HALTS a corrida toda, com instrução de como retomar.
 */
async function buscarComRetry(url: string, deps: Dependencias, rotulo: string): Promise<ResultadoBusca> {
  await deps.throttle.aguardar();

  let tentativas = 0;
  for (;;) {
    tentativas++;
    let resposta: Response | undefined;
    let erroRede: unknown = null;
    try {
      resposta = await fetchComTimeout(url, deps);
    } catch (e) {
      erroRede = e;
    }

    if (!erroRede && resposta) {
      const classe = classificarStatus(resposta.status);
      if (classe === 'ok') {
        // Leitura do corpo + parse DENTRO do caminho de retry (aviso da
        // revisão do PR 4.1): um 200 com corpo malformado/truncado (a
        // jolpi.ca fica atrás de Cloudflare — interstitial ou reset no meio
        // da leitura acontecem) é transitório e deve RETENTAR com backoff,
        // não derrubar a corrida inteira com SyntaxError cru.
        try {
          const texto = await resposta.text();
          return { tipo: 'ok', dados: JSON.parse(texto) };
        } catch (e) {
          erroRede = e;
        }
      } else if (classe === 'abort') {
        deps.log(`${rotulo} — abort (HTTP ${resposta.status}, endpoint pulado)`);
        return { tipo: 'abort' };
      }
      // classe === 'retry' (429 ou 5xx) ou corpo malformado — cai pro retry abaixo.
    }

    if (tentativas >= MAX_TENTATIVAS) {
      const motivo = erroRede
        ? `erro de rede (${erroRede instanceof Error ? erroRede.message : String(erroRede)})`
        : `HTTP ${resposta?.status}`;
      throw new Error(
        `${rotulo}: falhou após ${MAX_TENTATIVAS} tentativas (${motivo}). ` +
          `Rode "npm run dataset:fetch" de novo pra retomar — o cache resume-safe garante que nada já baixado é refeito.`,
      );
    }

    deps.log(`${rotulo} — retry (tentativa ${tentativas}/${MAX_TENTATIVAS}, aguardando ${BACKOFF_MS / 1000}s)`);
    await deps.sleepBackoff(BACKOFF_MS);
  }
}

async function fetchComTimeout(url: string, deps: Dependencias): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await deps.fetchImpl(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function escreverCacheAtomic(caminho: string, conteudo: string): void {
  mkdirSync(dirname(caminho), { recursive: true });
  const tmp = `${caminho}.tmp`;
  writeFileSync(tmp, conteudo);
  renameSync(tmp, caminho);
}

type ResultadoPagina = { tipo: 'hit' | 'fetch'; dados: unknown } | { tipo: 'abort' };

/**
 * Busca uma página com cache resume-safe: hit se o arquivo existe e parseia
 * como JSON válido (zero rede, zero throttle); senão busca da rede (com
 * retry/throttle) e escreve atomicamente. Arquivo inválido é deletado antes
 * do refetch — nunca conta como cache.
 */
export async function buscarPaginaComCache(
  url: string,
  caminhoCache: string,
  deps: Dependencias,
  rotulo: string,
): Promise<ResultadoPagina> {
  const existente = existsSync(caminhoCache) ? readFileSync(caminhoCache, 'utf8') : null;

  if (!deveBuscar(existente)) {
    deps.log(`${rotulo} — hit`);
    return { tipo: 'hit', dados: JSON.parse(existente as string) };
  }
  if (existente !== null) {
    unlinkSync(caminhoCache);
  }

  const resultado = await buscarComRetry(url, deps, rotulo);
  if (resultado.tipo === 'abort') return { tipo: 'abort' };

  escreverCacheAtomic(caminhoCache, JSON.stringify(resultado.dados));
  deps.log(`${rotulo} — fetch`);
  return { tipo: 'fetch', dados: resultado.dados };
}

// ---------------------------------------------------------------------------
// Orquestração (seasons asc, páginas asc; pitstops depois dos results da
// mesma temporada — ordem determinística, HISTORICO.md item 8).
// ---------------------------------------------------------------------------

export interface ResumoExecucao {
  requisicoes: number;
  hits: number;
  fetches: number;
  abortados: number;
}

function novoResumo(): ResumoExecucao {
  return { requisicoes: 0, hits: 0, fetches: 0, abortados: 0 };
}

/**
 * Total de requisições é só uma ESTIMATIVA pro log de progresso
 * (`[i/total-estimado]`) — o real depende da paginação dinâmica descoberta
 * em tempo de execução (total de results/pitstops varia por temporada/round).
 */
function estimarTotalRequisicoes(): number {
  const nTemporadas = ULTIMA_TEMPORADA - PRIMEIRA_TEMPORADA + 1;
  const paginasResultsEstimadas = nTemporadas * 4; // ~4 páginas/temporada (spec)
  const nTemporadasPitstops = ULTIMA_TEMPORADA - PRIMEIRA_TEMPORADA_PITSTOPS + 1;
  const roundsEstimadosPorTemporada = 20; // aprox. corridas por temporada moderna
  const paginasPitstopsEstimadas = nTemporadasPitstops * roundsEstimadosPorTemporada; // ~1 página/round
  return paginasResultsEstimadas + paginasPitstopsEstimadas;
}

async function requisitarPagina(
  url: string,
  caminhoCache: string,
  deps: Dependencias,
  resumo: ResumoExecucao,
  totalEstimado: number,
  rotulo: string,
): Promise<ResultadoPagina> {
  resumo.requisicoes++;
  const prefixo = `[${resumo.requisicoes}/${totalEstimado}] ${rotulo}`;
  const resultado = await buscarPaginaComCache(url, caminhoCache, deps, prefixo);
  if (resultado.tipo === 'hit') resumo.hits++;
  else if (resultado.tipo === 'fetch') resumo.fetches++;
  else resumo.abortados++;
  return resultado;
}

async function baixarResultsDaTemporada(
  season: number,
  cacheDir: string,
  deps: Dependencias,
  resumo: ResumoExecucao,
  totalEstimado: number,
): Promise<RaceTablePagina[]> {
  const paginas: RaceTablePagina[] = [];
  const rotuloBase = `${season}/results`;

  const primeira = await requisitarPagina(
    resultsUrl(season, 0),
    caminhoCacheResults(cacheDir, season, 0),
    deps,
    resumo,
    totalEstimado,
    `${rotuloBase} p0`,
  );
  if (primeira.tipo === 'abort') return paginas;
  paginas.push(primeira.dados as RaceTablePagina);

  const { total, limit } = obterPaginacao(primeira.dados);
  const offsets = offsetsFromEnvelope(total, limit).filter((o) => o > 0);
  for (const offset of offsets) {
    const pageIndex = offset / limit;
    const pagina = await requisitarPagina(
      resultsUrl(season, offset, limit),
      caminhoCacheResults(cacheDir, season, pageIndex),
      deps,
      resumo,
      totalEstimado,
      `${rotuloBase} p${pageIndex}`,
    );
    if (pagina.tipo === 'abort') break;
    paginas.push(pagina.dados as RaceTablePagina);
  }

  return paginas;
}

async function baixarPitstopsDoRound(
  season: number,
  round: string,
  cacheDir: string,
  deps: Dependencias,
  resumo: ResumoExecucao,
  totalEstimado: number,
): Promise<void> {
  const rotuloBase = `${season}/${round}/pitstops`;

  const primeira = await requisitarPagina(
    pitstopsUrl(season, round, 0),
    caminhoCachePitstops(cacheDir, season, round, 0),
    deps,
    resumo,
    totalEstimado,
    `${rotuloBase} p0`,
  );
  if (primeira.tipo === 'abort') return;

  const { total, limit } = obterPaginacao(primeira.dados);
  const offsets = offsetsFromEnvelope(total, limit).filter((o) => o > 0);
  for (const offset of offsets) {
    const pageIndex = offset / limit;
    const pagina = await requisitarPagina(
      pitstopsUrl(season, round, offset, limit),
      caminhoCachePitstops(cacheDir, season, round, pageIndex),
      deps,
      resumo,
      totalEstimado,
      `${rotuloBase} p${pageIndex}`,
    );
    if (pagina.tipo === 'abort') break;
  }
}

/** Baixa (com cache resume-safe) results 1950-2025 + pitstops 2011-2025. */
export async function executarDownload(
  cacheDir: string,
  deps: Dependencias,
): Promise<ResumoExecucao> {
  const resumo = novoResumo();
  const totalEstimado = estimarTotalRequisicoes();

  for (let season = PRIMEIRA_TEMPORADA; season <= ULTIMA_TEMPORADA; season++) {
    const paginasResults = await baixarResultsDaTemporada(season, cacheDir, deps, resumo, totalEstimado);

    if (season >= PRIMEIRA_TEMPORADA_PITSTOPS) {
      const rounds = extrairRoundsUnicos(paginasResults);
      for (const round of rounds) {
        await baixarPitstopsDoRound(season, round, cacheDir, deps, resumo, totalEstimado);
      }
    }
  }

  return resumo;
}

export function formatarResumoFinal(resumo: ResumoExecucao): string {
  return [
    '=== fetch-f1-data — resumo ===',
    `Requisições: ${resumo.requisicoes}`,
    `Cache hits: ${resumo.hits}`,
    `Fetches reais: ${resumo.fetches}`,
    `Endpoints abortados (4xx≠429, ver log acima): ${resumo.abortados}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// CLI (só roda em execução direta — `node scripts/fetch-f1-data.ts`; nunca
// ao importar o módulo em teste).
// ---------------------------------------------------------------------------

export async function main(argv: string[] = process.argv.slice(2)): Promise<ResumoExecucao> {
  const flagIndex = argv.indexOf('--throttle-ms');
  const throttleMs = flagIndex !== -1 ? Number(argv[flagIndex + 1]) : THROTTLE_MS_PADRAO;

  const deps: Dependencias = {
    fetchImpl: fetch,
    throttle: criarThrottle(throttleMs, sleepReal, Date.now),
    sleepBackoff: sleepReal,
    log: (msg) => console.log(msg),
  };

  const resumo = await executarDownload(CACHE_DIR_PADRAO, deps);
  console.log(formatarResumoFinal(resumo));
  return resumo;
}

// Comparação por URL de arquivo (robusta a separador/maiúscula de drive no
// Windows) — só o processo executado diretamente dispara o download real.
const ehExecucaoDireta =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ehExecucaoDireta) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
