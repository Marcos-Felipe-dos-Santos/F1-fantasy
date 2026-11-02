/**
 * Trace da thread principal numa passada pela bandeirada (PR 2e). `medir-fps-pr2a.mjs` diz QUANDO
 * um quadro atrasa; este diz EM QUÊ: lista as tarefas longas com o que gastou tempo dentro delas.
 * Mesmas condições: CPU 6×, 360×800, chuva, velocidade lenta, para a janela de 660 quadros
 * cobrir a bandeirada.
 *
 *   node scripts/rastrear-pr2e.mjs --porta 4182 --cena retardatario --limiar 25 --saida docs/x.json
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA_DEBUG = 9338;
const opcoes = {};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) opcoes[args[i].replace(/^--/, '')] = args[i + 1];
const porta = opcoes.porta ?? 4182;
const cena = opcoes.cena ?? 'retardatario';
const limiarMs = Number(opcoes.limiar ?? 25);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const perfil = mkdtempSync(join(tmpdir(), 'pr2e-trace-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORTA_DEBUG}`,
  `--user-data-dir=${perfil}`,
  '--no-first-run',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  'about:blank',
]);

try {
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/version`);
      break;
    } catch {
      await esperar(200);
    }
  }
  const r = await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/new?about:blank`, { method: 'PUT' });
  const { webSocketDebuggerUrl } = await r.json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
  let proximo = 1;
  const pendentes = new Map();
  const eventos = [];
  let fimDoTrace;
  const terminou = new Promise((ok) => {
    fimDoTrace = ok;
  });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Tracing.dataCollected') eventos.push(...m.params.value);
    else if (m.method === 'Tracing.tracingComplete') fimDoTrace();
    else if (m.id && pendentes.has(m.id)) {
      pendentes.get(m.id)(m.result);
      pendentes.delete(m.id);
    }
  });
  const cdp = (method, params = {}) =>
    new Promise((ok) => {
      const id = proximo++;
      pendentes.set(id, ok);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const avaliar = async (expression) =>
    (await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

  await cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  await cdp('Emulation.setCPUThrottlingRate', { rate: 6 });
  await cdp('Page.enable');
  await cdp('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: {
      includedCategories: [
        'toplevel',
        'devtools.timeline',
        'disabled-by-default-devtools.timeline',
        'blink.user_timing',
        'v8',
        'loading',
        'fonts',
      ],
    },
  });
  await cdp('Page.navigate', {
    url: `http://127.0.0.1:${porta}/scripts/preview-pit.html?fps=1&chuva=1&velocidade=lenta&cena=${cena}${opcoes.extra ? `&${opcoes.extra}` : ''}`,
  });

  let fps;
  for (let i = 0; i < 120 && !fps; i++) {
    await esperar(500);
    fps = await avaliar('window.__fps');
  }
  const tempos = await avaliar('window.__tempos');
  await cdp('Tracing.end');
  await terminou;

  const nomes = new Map(
    eventos.filter((e) => e.name === 'thread_name').map((e) => [`${e.pid}:${e.tid}`, e.args.name]),
  );
  const principal = eventos.filter(
    (e) => e.ph === 'X' && nomes.get(`${e.pid}:${e.tid}`) === 'CrRendererMain',
  );
  const tarefas = principal.filter((e) => e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask');
  const ultimoRaf = Math.max(...principal.filter((e) => e.name === 'FireAnimationFrame').map((e) => e.ts));
  const longas = tarefas
    .filter((t) => t.dur / 1000 >= limiarMs && t.ts <= ultimoRaf)
    .map((t) => {
      const dentro = principal.filter((e) => e !== t && e.ts >= t.ts && e.ts + (e.dur ?? 0) <= t.ts + t.dur);
      const porNome = {};
      for (const e of dentro) porNome[e.name] = (porNome[e.name] ?? 0) + (e.dur ?? 0) / 1000;
      const antes = (ultimoRaf - t.ts) / 1000;
      return {
        msAntesDoUltimoRaf: Math.round(antes),
        duracaoMs: Math.round(t.dur / 100) / 10,
        // Sem isto não dá para distinguir layout local de layout da página inteira.
        layout: dentro
          .filter((e) => e.name === 'Layout')
          .map((e) => ({ ms: Math.round(e.dur / 100) / 10, ...e.args?.beginData })),
        estilo: dentro.filter((e) => e.name === 'UpdateLayoutTree').map((e) => ({ ms: Math.round(e.dur / 100) / 10, elementos: e.args?.elementCount })),
        fontes: dentro.filter((e) => /Font/.test(e.name)).map((e) => [e.name, Math.round((e.dur ?? 0) / 100) / 10, e.args]),
        maiores: Object.entries(porNome)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([nome, ms]) => [nome, Math.round(ms * 10) / 10]),
      };
    });
  const saida = { cena, tempos, lentos: fps?.lentos, tarefasLongas: longas };
  if (opcoes.saida) writeFileSync(opcoes.saida, `${JSON.stringify(saida, null, 1)}\n`);
  console.log(JSON.stringify(saida, null, 0));
} finally {
  chrome.kill();
  await esperar(500);
  rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
