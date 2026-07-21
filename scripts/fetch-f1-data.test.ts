/**
 * Testes de `fetch-f1-data.ts` (PR 4.1). Mockados — nenhuma requisição real
 * de rede. Cache atômico é testado num diretório real (dentro de
 * `scripts/cache/__test-tmp__`, limpo antes/depois), não com `fs` mockado —
 * exercita de verdade a escrita tmp+rename.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buscarPaginaComCache,
  caminhoCachePitstops,
  caminhoCacheResults,
  criarThrottle,
  deveBuscar,
  executarDownload,
  extrairRoundsUnicos,
  offsetsFromEnvelope,
  pitstopsUrl,
  resultsUrl,
  type Dependencias,
  type RaceTablePagina,
} from './fetch-f1-data';

const CACHE_TESTE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'cache', '__test-tmp__');

beforeEach(() => {
  rmSync(CACHE_TESTE_DIR, { recursive: true, force: true });
  mkdirSync(CACHE_TESTE_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(CACHE_TESTE_DIR, { recursive: true, force: true });
});

function envelopeResultsFake(round: string, total = 1, limit = 100): RaceTablePagina {
  return {
    MRData: {
      total: String(total),
      limit: String(limit),
      offset: '0',
      RaceTable: { Races: [{ round }] },
    },
  };
}

function respostaOk(corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status: 200 });
}

function respostaStatus(status: number): Response {
  return new Response('', { status });
}

function criarDepsFake(overrides: Partial<Dependencias> = {}): Dependencias {
  return {
    fetchImpl: vi.fn(),
    throttle: criarThrottle(10_000, vi.fn().mockResolvedValue(undefined), () => 0),
    sleepBackoff: vi.fn().mockResolvedValue(undefined),
    log: vi.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Construção de URLs
// ---------------------------------------------------------------------------

describe('resultsUrl / pitstopsUrl', () => {
  it('monta a URL de results com limit/offset', () => {
    expect(resultsUrl(1987, 200)).toBe('https://api.jolpi.ca/ergast/f1/1987/results.json?limit=100&offset=200');
  });

  it('monta a URL de pitstops com season/round/offset', () => {
    expect(pitstopsUrl(2019, '5', 0)).toBe(
      'https://api.jolpi.ca/ergast/f1/2019/5/pitstops.json?limit=100&offset=0',
    );
  });
});

// ---------------------------------------------------------------------------
// Paginação
// ---------------------------------------------------------------------------

describe('offsetsFromEnvelope', () => {
  it('total=330, limit=100 ⇒ offsets 0/100/200/300', () => {
    expect(offsetsFromEnvelope(330, 100)).toEqual([0, 100, 200, 300]);
  });

  it('total=100, limit=100 ⇒ só offset 0', () => {
    expect(offsetsFromEnvelope(100, 100)).toEqual([0]);
  });

  it('total=0 ⇒ offset 0 (evita lista vazia)', () => {
    expect(offsetsFromEnvelope(0, 100)).toEqual([0]);
  });
});

// ---------------------------------------------------------------------------
// Extração de rounds únicos
// ---------------------------------------------------------------------------

describe('extrairRoundsUnicos', () => {
  it('extrai rounds únicos e ordena numericamente', () => {
    const paginas: RaceTablePagina[] = [
      {
        MRData: {
          total: '3',
          limit: '100',
          offset: '0',
          RaceTable: { Races: [{ round: '2' }, { round: '10' }, { round: '2' }] },
        },
      },
      {
        MRData: {
          total: '3',
          limit: '100',
          offset: '100',
          RaceTable: { Races: [{ round: '1' }] },
        },
      },
    ];
    expect(extrairRoundsUnicos(paginas)).toEqual(['1', '2', '10']);
  });

  it('lista vazia pra páginas sem corridas', () => {
    expect(extrairRoundsUnicos([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// deveBuscar (decisão hit/fetch)
// ---------------------------------------------------------------------------

describe('deveBuscar', () => {
  it('true quando não há arquivo (null)', () => {
    expect(deveBuscar(null)).toBe(true);
  });

  it('false quando o conteúdo é JSON válido (hit)', () => {
    expect(deveBuscar('{"a":1}')).toBe(false);
  });

  it('true quando o conteúdo existe mas não parseia (corrompido/parcial)', () => {
    expect(deveBuscar('{"a": incompleto')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Resume + escrita atômica (via buscarPaginaComCache, disco real em tmp dir)
// ---------------------------------------------------------------------------

describe('buscarPaginaComCache — resume-safe e escrita atômica', () => {
  it('arquivo válido existente ⇒ fetch NÃO é chamado (cache hit)', async () => {
    const caminho = join(CACHE_TESTE_DIR, 'hit.json');
    writeFileSync(caminho, JSON.stringify({ ok: true }));
    const deps = criarDepsFake();

    const resultado = await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(resultado).toEqual({ tipo: 'hit', dados: { ok: true } });
    expect(deps.fetchImpl).not.toHaveBeenCalled();
    expect(deps.log).toHaveBeenCalledWith('rotulo — hit');
  });

  it('arquivo inválido existente ⇒ é deletado e refeito da rede', async () => {
    const caminho = join(CACHE_TESTE_DIR, 'invalido.json');
    writeFileSync(caminho, '{ invalido');
    const fetchImpl = vi.fn().mockResolvedValue(respostaOk({ refeito: true }));
    const deps = criarDepsFake({ fetchImpl });

    const resultado = await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ tipo: 'fetch', dados: { refeito: true } });
    expect(JSON.parse(readFileSync(caminho, 'utf8'))).toEqual({ refeito: true });
  });

  it('sem arquivo ⇒ busca da rede e escreve atomicamente (sem sobrar .tmp)', async () => {
    const caminho = join(CACHE_TESTE_DIR, 'novo', 'pagina.json');
    const fetchImpl = vi.fn().mockResolvedValue(respostaOk({ novo: true }));
    const deps = criarDepsFake({ fetchImpl });

    await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(existsSync(caminho)).toBe(true);
    expect(existsSync(`${caminho}.tmp`)).toBe(false);
    expect(JSON.parse(readFileSync(caminho, 'utf8'))).toEqual({ novo: true });
  });

  it('caminhoCacheResults gera 1 arquivo por página dentro da pasta da temporada', () => {
    expect(caminhoCacheResults(CACHE_TESTE_DIR, 1987, 2)).toBe(join(CACHE_TESTE_DIR, '1987', 'results-p2.json'));
  });

  it('caminhoCachePitstops gera 1 arquivo por (round, página) dentro da pasta da temporada', () => {
    expect(caminhoCachePitstops(CACHE_TESTE_DIR, 2019, '5', 1)).toBe(
      join(CACHE_TESTE_DIR, '2019', 'r5-pitstops-p1.json'),
    );
  });
});

// ---------------------------------------------------------------------------
// Throttle — só entre fetches reais, nunca em hits
// ---------------------------------------------------------------------------

describe('criarThrottle', () => {
  it('não espera na primeira chamada', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const throttle = criarThrottle(10_000, sleep, () => 1000);
    await throttle.aguardar();
    expect(sleep).not.toHaveBeenCalled();
  });

  it('espera o throttleMs completo entre 2 chamadas com clock parado (fake)', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const throttle = criarThrottle(10_000, sleep, () => 1000);
    await throttle.aguardar();
    await throttle.aguardar();
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(10_000);
  });

  it('não espera se o clock já avançou o throttleMs inteiro', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let agora = 0;
    const throttle = criarThrottle(10_000, sleep, () => agora);
    await throttle.aguardar();
    agora = 10_000;
    await throttle.aguardar();
    expect(sleep).not.toHaveBeenCalled();
  });
});

describe('buscarPaginaComCache — throttle só em fetch real, nunca em hit', () => {
  it('cache hit não aciona o throttle (sleep nunca chamado)', async () => {
    const caminho = join(CACHE_TESTE_DIR, 'hit-throttle.json');
    writeFileSync(caminho, JSON.stringify({ ok: true }));
    const sleepThrottle = vi.fn().mockResolvedValue(undefined);
    const deps = criarDepsFake({ throttle: criarThrottle(10_000, sleepThrottle, () => 0) });

    await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(sleepThrottle).not.toHaveBeenCalled();
  });

  it('fetch real aciona o throttle', async () => {
    const caminho = join(CACHE_TESTE_DIR, 'fetch-throttle.json');
    const sleepThrottle = vi.fn().mockResolvedValue(undefined);
    // Segunda chamada de aguardar() já deve esperar (clock parado).
    const throttle = criarThrottle(10_000, sleepThrottle, () => 0);
    await throttle.aguardar(); // "consome" a 1a chamada livre
    const deps = criarDepsFake({
      throttle,
      fetchImpl: vi.fn().mockResolvedValue(respostaOk({ x: 1 })),
    });

    await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(sleepThrottle).toHaveBeenCalledTimes(1);
    expect(sleepThrottle).toHaveBeenCalledWith(10_000);
  });
});

// ---------------------------------------------------------------------------
// Backoff em 429 / 5xx / erro de rede
// ---------------------------------------------------------------------------

describe('buscarPaginaComCache — backoff em 429', () => {
  it('429 duas vezes e depois 200 ⇒ 2 backoffs de 60s e sucesso na 3a tentativa', async () => {
    const caminho = join(CACHE_TESTE_DIR, 'backoff.json');
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(respostaStatus(429))
      .mockResolvedValueOnce(respostaStatus(429))
      .mockResolvedValueOnce(respostaOk({ sucesso: true }));
    const sleepBackoff = vi.fn().mockResolvedValue(undefined);
    const deps = criarDepsFake({ fetchImpl, sleepBackoff });

    const resultado = await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleepBackoff).toHaveBeenCalledTimes(2);
    expect(sleepBackoff).toHaveBeenCalledWith(60_000);
    expect(resultado).toEqual({ tipo: 'fetch', dados: { sucesso: true } });
  });

  it('429 nas 3 tentativas ⇒ lança erro com instrução de retomada, sem escrever cache', async () => {
    const caminho = join(CACHE_TESTE_DIR, 'falha.json');
    const fetchImpl = vi.fn().mockResolvedValue(respostaStatus(429));
    const deps = criarDepsFake({ fetchImpl, sleepBackoff: vi.fn().mockResolvedValue(undefined) });

    await expect(buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo')).rejects.toThrow(
      /npm run dataset:fetch/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(existsSync(caminho)).toBe(false);
  });

  it('200 com corpo malformado (interstitial/truncado) é tratado como retry, não como SyntaxError fatal', async () => {
    // Aviso da revisão do PR 4.1: a jolpi.ca fica atrás de Cloudflare — um
    // 200 com corpo não-JSON deve cair no caminho de backoff+retry, e o
    // cache não pode ser escrito com o corpo-lixo.
    const caminho = join(CACHE_TESTE_DIR, 'malformado.json');
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>interstitial</html>', { status: 200 }))
      .mockResolvedValueOnce(respostaOk({ ok: 1 }));
    const sleepBackoff = vi.fn().mockResolvedValue(undefined);
    const deps = criarDepsFake({ fetchImpl, sleepBackoff });

    const resultado = await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepBackoff).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ tipo: 'fetch', dados: { ok: 1 } });
    expect(JSON.parse(readFileSync(caminho, 'utf8'))).toEqual({ ok: 1 });
  });

  it('erro de rede (timeout simulado) é tratado como retry, não trava sem backoff', async () => {
    const caminho = join(CACHE_TESTE_DIR, 'timeout.json');
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout simulado'))
      .mockResolvedValueOnce(respostaOk({ ok: 1 }));
    const sleepBackoff = vi.fn().mockResolvedValue(undefined);
    const deps = criarDepsFake({ fetchImpl, sleepBackoff });

    const resultado = await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(sleepBackoff).toHaveBeenCalledTimes(1);
    expect(sleepBackoff).toHaveBeenCalledWith(60_000);
    expect(resultado).toEqual({ tipo: 'fetch', dados: { ok: 1 } });
  });
});

// ---------------------------------------------------------------------------
// 4xx≠429 — aborta só o endpoint, não trava a corrida
// ---------------------------------------------------------------------------

describe('buscarPaginaComCache — 4xx≠429 aborta só o endpoint', () => {
  it('404 ⇒ retorna abort sem lançar erro e sem escrever cache', async () => {
    const caminho = join(CACHE_TESTE_DIR, '404.json');
    const fetchImpl = vi.fn().mockResolvedValue(respostaStatus(404));
    const deps = criarDepsFake({ fetchImpl });

    const resultado = await buscarPaginaComCache('http://exemplo/x', caminho, deps, 'rotulo');

    expect(resultado).toEqual({ tipo: 'abort' });
    expect(existsSync(caminho)).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('executarDownload segue pra próxima temporada quando o results.json de uma temporada aborta (404)', async () => {
    // Todas as temporadas respondem OK (1 round, sem pitstops relevantes),
    // exceto 1955, cujo results.json responde 404 — não deve travar o laço:
    // as demais 75 temporadas continuam sendo processadas normalmente.
    const fetchImpl = vi.fn().mockImplementation((url: string) => {
      if (url.startsWith('https://api.jolpi.ca/ergast/f1/1955/results')) {
        return Promise.resolve(respostaStatus(404));
      }
      if (url.includes('/results.json')) return Promise.resolve(respostaOk(envelopeResultsFake('1', 1)));
      return Promise.resolve(respostaOk({ MRData: { total: '0', limit: '100', offset: '0' } }));
    });
    const deps = criarDepsFake({ fetchImpl, throttle: criarThrottle(0, vi.fn(), () => 0) });

    const resumo = await executarDownload(CACHE_TESTE_DIR, deps);

    // 1955 aborta (1 requisição) e não gera pitstops (não é >=2011, então já
    // não geraria mesmo); as outras 75 temporadas de results + 15 de
    // pitstops (2011-2025) são todas fetch bem-sucedido.
    expect(resumo.abortados).toBe(1);
    expect(resumo.fetches).toBe(75 + 15);
    expect(resumo.requisicoes).toBe(76 + 15);
    expect(existsSync(join(CACHE_TESTE_DIR, '1955', 'results-p0.json'))).toBe(false);
    // Temporada seguinte (1956) foi processada normalmente (não travou o laço).
    expect(existsSync(join(CACHE_TESTE_DIR, '1956', 'results-p0.json'))).toBe(true);
  }, 20_000);
});

// ---------------------------------------------------------------------------
// executarDownload — integração pequena com 2 temporadas fake (1 sem
// pitstops, 1 com pitstops), garantindo a ordem e o resumo final.
// ---------------------------------------------------------------------------

describe('executarDownload (integração pequena, fetch mockado)', () => {
  it('processa results e pitstops só de 2011+ e conta hits/fetches/abortados', async () => {
    // Reduz o universo simulando só que a maioria das temporadas aborta de
    // primeira (envelope com total=0, 1 corrida) — mantém o teste rápido
    // mesmo cobrindo o laço real de 1950-2025.
    const chamadas: string[] = [];
    const fetchImpl = vi.fn().mockImplementation((url: string) => {
      chamadas.push(url);
      if (url.includes('/results.json')) {
        return Promise.resolve(respostaOk(envelopeResultsFake('1', 1)));
      }
      // pitstops: só 1 página, sem paradas relevantes pro teste.
      return Promise.resolve(
        respostaOk({ MRData: { total: '0', limit: '100', offset: '0' } }),
      );
    });
    const deps = criarDepsFake({ fetchImpl, throttle: criarThrottle(0, vi.fn(), () => 0) });

    const resumo = await executarDownload(CACHE_TESTE_DIR, deps);

    // 76 temporadas de results (1 página cada, total=1) + pitstops só em
    // 2011-2025 (15 temporadas × 1 round × 1 página).
    expect(resumo.requisicoes).toBe(76 + 15);
    expect(resumo.fetches).toBe(76 + 15);
    expect(resumo.hits).toBe(0);
    expect(resumo.abortados).toBe(0);

    // Ordem determinística: o 1o results de cada temporada vem antes do 1o
    // pitstops da MESMA temporada (2011), e temporadas anteriores a 2011 não
    // pedem pitstops.
    const idxResults2011 = chamadas.findIndex((u) => u.startsWith('https://api.jolpi.ca/ergast/f1/2011/results'));
    const idxPitstops2011 = chamadas.findIndex((u) => u.includes('/2011/1/pitstops'));
    expect(idxResults2011).toBeGreaterThanOrEqual(0);
    expect(idxPitstops2011).toBeGreaterThan(idxResults2011);
    expect(chamadas.some((u) => u.includes('/1950/1/pitstops'))).toBe(false);
  }, 20_000);
});
