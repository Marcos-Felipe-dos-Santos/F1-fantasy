/**
 * FPS do replay com CPU limitada, e capturas do preview do PR 2c. Sem dependência
 * nova: Chrome do sistema + protocolo de depuração pelo WebSocket nativo do Node.
 * O PR 1 não limitou a CPU porque o navegador de lá não emulava; `Emulation.
 * setCPUThrottlingRate` emula. Continua sendo emulação em desktop, não aparelho real.
 *
 * Pré-requisito: o build servido em `--porta` (ver `scripts/preview-pit.tsx`).
 *
 *   node scripts/medir-fps-pr2c.mjs fps --porta 4175 --rotulo depois --saida docs/pr2c-fps-depois.json
 *   node scripts/medir-fps-pr2c.mjs print --porta 4175 --url "?pista=pista-spa" --largura 1280 --altura 800 --saida x.png
 */

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA_DEBUG = 9337;
const [modo, ...resto] = process.argv.slice(2);
const opcoes = {};
for (let i = 0; i < resto.length; i += 2) opcoes[resto[i].replace(/^--/, '')] = resto[i + 1];
const base = `http://127.0.0.1:${opcoes.porta ?? 4175}/scripts/preview-pit.html`;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrirChrome() {
  const perfil = mkdtempSync(join(tmpdir(), 'pr2c-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORTA_DEBUG}`,
    `--user-data-dir=${perfil}`,
    '--no-first-run',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    'about:blank',
  ]);
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/version`);
      break;
    } catch {
      await esperar(200);
    }
  }
  return {
    fechar: async () => {
      chrome.kill();
      await esperar(500);
      rmSync(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}

async function novaAba() {
  const r = await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/new?about:blank`, { method: 'PUT' });
  const { webSocketDebuggerUrl, id } = await r.json();
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
  let proximo = 1;
  const pendentes = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pendentes.has(m.id)) {
      const { ok, erro } = pendentes.get(m.id);
      pendentes.delete(m.id);
      if (m.error) erro(new Error(m.error.message));
      else ok(m.result);
    }
  });
  const cdp = (method, params = {}) =>
    new Promise((ok, erro) => {
      const idMsg = proximo++;
      pendentes.set(idMsg, { ok, erro });
      ws.send(JSON.stringify({ id: idMsg, method, params }));
    });
  const avaliar = async (expression) =>
    (await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
  const fechar = async () => {
    ws.close();
    await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/close/${id}`);
  };
  return { cdp, avaliar, fechar };
}

async function medirUma(url, largura, altura, freio) {
  const aba = await novaAba();
  await aba.cdp('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: true });
  await aba.cdp('Emulation.setCPUThrottlingRate', { rate: freio });
  await aba.cdp('Page.enable');
  await aba.cdp('Page.navigate', { url });
  let resultado;
  for (let i = 0; i < 240 && !resultado; i++) {
    await esperar(500);
    resultado = await aba.avaliar('window.__fps');
  }
  await aba.fechar();
  if (!resultado) throw new Error(`sem medição em ${url}`);
  return resultado;
}

const chrome = await abrirChrome();
try {
  if (modo === 'fps') {
    const linhas = [];
    for (const freio of (opcoes.freios ?? '4,6').split(',').map(Number)) {
      for (const velocidade of (opcoes.velocidades ?? 'media,rapida').split(',')) {
        for (const pista of (opcoes.pistas ?? 'pista-spa,pista-montreal').split(',')) {
          // Repetir é obrigatório: 5 rodadas do mesmo caso variaram de 53 a 102 fps nesta máquina.
          for (let i = 0; i < Number(opcoes.repeticoes ?? 1); i++) {
            const r = await medirUma(`${base}?fps=1&chuva=1&pista=${pista}&velocidade=${velocidade}`, 360, 800, freio);
            linhas.push({ freioCpu: freio, ...r });
            console.log(
              `${opcoes.rotulo} ${freio}x ${pista} ${velocidade}: ${r.fps.toFixed(1)} fps, p95 ${r.intervaloP95.toFixed(1)} ms, >33ms ${r.acima33ms}, render p50/p95 ${r.renderP50.toFixed(1)}/${r.renderP95.toFixed(1)} ms`,
            );
          }
        }
      }
    }
    writeFileSync(
      opcoes.saida,
      `${JSON.stringify({ rotulo: opcoes.rotulo, viewport: [360, 800], carros: 22, medicoes: linhas }, null, 1)}\n`,
    );
  } else if (modo === 'print') {
    const aba = await novaAba();
    await aba.cdp('Emulation.setDeviceMetricsOverride', {
      width: Number(opcoes.largura),
      height: Number(opcoes.altura),
      deviceScaleFactor: 1,
      mobile: false,
    });
    if (opcoes.reduzido === '1') {
      await aba.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    }
    await aba.cdp('Page.enable');
    await aba.cdp('Page.navigate', { url: `${base}${opcoes.url}` });
    await esperar(3000);
    // Depois do carregamento: antes dele, `documentElement` ainda não existe.
    if (opcoes.tema) await aba.avaliar(`document.documentElement.setAttribute('data-tema','${opcoes.tema}')`);
    // `--expr` (PR 2f): o instante sai de uma expressão na página, como `window.__punicao.inicio`.
    const t = opcoes.t ? Number(opcoes.t) : await aba.avaliar(opcoes.expr ?? 'window.__picoDoBox()');
    await aba.avaliar(`window.__irPara(${t})`);
    await esperar(600);
    const texto = await aba.avaliar(`document.querySelector('nav').innerText`);
    console.log(`t=${t} | ${texto?.replaceAll('\n', ' ')}`);
    const { data } = await aba.cdp('Page.captureScreenshot', { format: 'png' });
    writeFileSync(opcoes.saida, Buffer.from(data, 'base64'));
    await aba.fechar();
  } else {
    throw new Error(`modo desconhecido: ${modo}`);
  }
} finally {
  await chrome.fechar();
}
