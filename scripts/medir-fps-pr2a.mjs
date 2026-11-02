/**
 * Custo por frame do replay ANTES e DEPOIS do PR 2a, intercalado, e capturas. Derivado de
 * `medir-fps-pr2c.mjs`, com duas diferenças. Lê `Performance.getMetrics`: o fps desta máquina
 * não se compara entre sessões (120 num dia, 60 em outro, no mesmo commit), então a métrica é a
 * thread principal por frame contra os 16,7 ms de um quadro. E alterna os dois builds na mesma
 * sessão, A B A B, para o ruído da máquina cair igual nos dois lados.
 *
 * ⚠️ Emulação em desktop. Não está verificado que o freio de CPU alcance rasterização e
 * composição: chuva e spray custam ali, e a rodada não enxerga esse custo por inteiro.
 *
 * Pré-requisito: dois builds de `scripts/preview-pit.tsx`, servidos nas portas.
 *
 *   node scripts/medir-fps-pr2a.mjs fps --portas 4177,4178 --rotulos antes,depois --repeticoes 5 --saida docs/pr2a-fps.json
 *   node scripts/medir-fps-pr2a.mjs print --porta 4178 --url "?pista=pista-spa" --largura 360 --altura 800 --saida x.png
 *   node scripts/medir-fps-pr2a.mjs fluxo --porta 4178 --url "?cena=retardatario&real=1"
 *
 * `--extras` (fps) soma um trecho à URL de cada porta, na ordem de `--portas`: o PR 2e repete
 * a mesma porta com `,cauda=1` para medir o trecho depois da bandeirada.
 * `fluxo` joga o `FluxoCorrida` real na velocidade rápida e cronometra do "Largar" ao resultado.
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
const baseDe = (porta) => `http://127.0.0.1:${porta}/scripts/preview-pit.html`;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function abrirChrome() {
  const perfil = mkdtempSync(join(tmpdir(), 'pr2a-chrome-'));
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
  await aba.cdp('Performance.enable');
  const amostras = [];
  for (let i = 0; i < 240 && !resultado; i++) {
    await esperar(500);
    resultado = await aba.avaliar('window.__fps');
    if (!resultado) {
      const { metrics } = await aba.cdp('Performance.getMetrics');
      const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
      amostras.push(m);
    }
  }
  await aba.fechar();
  if (resultado && amostras.length >= 6) {
    const a = amostras[3]; const b = amostras[amostras.length - 1];
    const dt = b.Timestamp - a.Timestamp;
    const frac = (k) => (b[k] - a[k]) / dt;
    resultado.ocupacaoMain = frac('TaskDuration');
    resultado.script = frac('ScriptDuration');
    resultado.layout = frac('LayoutDuration');
    resultado.estilo = frac('RecalcStyleDuration');
    resultado.janelaS = dt;
  }
  if (!resultado) throw new Error(`sem medição em ${url}`);
  return resultado;
}

const chrome = await abrirChrome();
try {
  if (modo === 'fps') {
    const portas = opcoes.portas.split(',');
    const rotulos = opcoes.rotulos.split(',');
    const linhas = [];
    for (const velocidade of (opcoes.velocidades ?? 'media,rapida').split(',')) {
      for (const pista of (opcoes.pistas ?? 'pista-spa,pista-montreal').split(',')) {
        for (let i = 0; i < Number(opcoes.repeticoes ?? 5); i++) {
          for (const [k, porta] of portas.entries()) {
            const extra = (opcoes.extras ?? '').split(',')[k] ?? '';
            const r = await medirUma(
              `${baseDe(porta)}?fps=1&chuva=1&pista=${pista}&velocidade=${velocidade}${extra === '' ? '' : `&${extra}`}`,
              360,
              800,
              Number(opcoes.freio ?? 6),
            );
            const mainPorFrame = (r.ocupacaoMain * 1000) / r.fps;
            linhas.push({ rotulo: rotulos[k], repeticao: i, mainPorFrame, ...r });
            console.log(
              `${rotulos[k]} ${pista} ${velocidade}: main ${mainPorFrame.toFixed(1)} ms/frame, render p50/p95 ${r.renderP50.toFixed(1)}/${r.renderP95.toFixed(1)} ms, ${r.fps.toFixed(1)} fps, >33ms ${r.acima33ms}, estilo ${(r.estilo * 100).toFixed(0)}% layout ${(r.layout * 100).toFixed(0)}%`,
            );
          }
        }
      }
    }
    writeFileSync(
      opcoes.saida,
      `${JSON.stringify({ freioCpu: Number(opcoes.freio ?? 6), viewport: [360, 800], carros: 22, medicoes: linhas }, null, 1)}
`,
    );
  } else if (modo === 'fluxo') {
    const aba = await novaAba();
    await aba.cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await aba.cdp('Page.enable');
    await aba.cdp('Page.navigate', { url: `${baseDe(opcoes.porta ?? 4178)}${opcoes.url}` });
    await esperar(2500);
    const clicar = (texto) =>
      aba.avaliar(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('${texto}')).click()`);
    await clicar('Largar');
    await esperar(300);
    await clicar('Rápida');
    const inicio = Date.now();
    let viuBandeirada = 0;
    let viuBotao = false;
    for (let i = 0; i < 1200; i++) {
      await esperar(50);
      const h2 = await aba.avaliar(`document.querySelector('h2')?.textContent ?? ''`);
      if (viuBandeirada === 0 && h2.includes('Bandeirada')) {
        viuBandeirada = Date.now() - inicio;
        viuBotao = await aba.avaliar(`document.body.innerText.includes('Ir para o resultado')`);
      }
      if (await aba.avaliar(`document.querySelector('.resultado-tabela') !== null`)) break;
    }
    const total = Date.now() - inicio;
    const tempos = await aba.avaliar('window.__tempos');
    const escala = tempos.vencedor / (tempos.voltas * 2200);
    console.log(JSON.stringify({
      bandeiradaMs: viuBandeirada,
      botaoNaBandeirada: viuBotao,
      resultadoMs: total,
      esperadoBandeiradaMs: Math.round(tempos.bandeirada / escala),
      esperadoResultadoMs: Math.round(tempos.fim / escala) + 1000,
      seParasseNoVencedorMs: Math.round(tempos.vencedor / escala) + 1000,
    }));
    await aba.fechar();
  } else if (modo === 'print') {
    const aba = await novaAba();
    await aba.cdp('Emulation.setDeviceMetricsOverride', {
      width: Number(opcoes.largura),
      height: Number(opcoes.altura),
      deviceScaleFactor: Number(opcoes.densidade ?? 1),
      // Sem isto a barra de rolagem do desktop tira 15 px da "tela de 360".
      mobile: Number(opcoes.largura) <= 700,
    });
    if (opcoes.reduzido === '1') {
      await aba.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    }
    await aba.cdp('Page.enable');
    await aba.cdp('Page.navigate', { url: `${baseDe(opcoes.porta ?? 4178)}${opcoes.url}` });
    await esperar(3000);
    // Depois do carregamento: antes dele, `documentElement` ainda não existe.
    if (opcoes.tema) await aba.avaliar(`document.documentElement.setAttribute('data-tema','${opcoes.tema}')`);
    const t = opcoes.t === undefined ? await aba.avaliar('window.__picoDoBox()') : Number.isNaN(Number(opcoes.t)) ? await aba.avaliar(`window.__tempos.${opcoes.t}`) : Number(opcoes.t);
    await aba.avaliar(`window.__irPara(${t})`);
    await esperar(600);
    if (opcoes.clicar) {
      await aba.avaliar(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('${opcoes.clicar}')).click()`);
      await esperar(600);
    }
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
