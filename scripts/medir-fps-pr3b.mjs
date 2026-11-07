/**
 * FPS do PR 3b: o custo por quadro do replay SEM som (build da `main` `e87c66d`) e COM som (esta
 * branch), intercalados A B A B na mesma sessão. Derivado de `medir-fps-pr2a.mjs`, com três mudanças:
 * - o Chrome sobe com `--autoplay-policy=no-user-gesture-required`: sem isto o contexto de áudio fica
 *   suspenso e a rodada "com som" mediria silêncio;
 * - a rodada com `--com-som` no rótulo é ANULADA (o script para) se o `__fps.som` não mostrar o
 *   contexto rodando, os 17 arquivos decodificados e vozes tocadas;
 * - `print` aceita `--pagina` (caminho a partir da porta), para capturar outras páginas de preview.
 *
 * ⚠️ Emulação em desktop, como no 2a: o freio de CPU não alcança por inteiro rasterização e
 * composição, e a thread de áudio do Chrome não entra na "thread principal por quadro".
 *
 *   node scripts/medir-fps-pr3b.mjs fps --portas 4177,4178 --rotulos sem-som,com-som --repeticoes 5 --saida docs/pr3b-fps.json
 *   node scripts/medir-fps-pr3b.mjs print --porta 4179 --pagina scripts/preview-pr3b.html --url "?tema=light" --largura 360 --altura 800 --saida x.png
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
const baseDe = (porta, pagina = 'scripts/preview-pit.html') => `http://127.0.0.1:${porta}/${pagina}`;

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
    '--autoplay-policy=no-user-gesture-required',
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
            if (rotulos[k].includes('com-som')) {
              const som = r.som;
              if (!som || som.contexto !== 'running' || som.decodificados !== som.total || !(som.tocadas > 0)) {
                throw new Error(`rodada com som ANULADA (som não tocou): ${JSON.stringify(som)}`);
              }
            } else if (r.som) {
              throw new Error(`rodada sem som com áudio presente: ${JSON.stringify(r.som)}`);
            }
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
    await aba.cdp('Page.navigate', { url: `${baseDe(opcoes.porta ?? 4178, opcoes.pagina)}${opcoes.url ?? ''}` });
    await esperar(3000);
    // Depois do carregamento: antes dele, `documentElement` ainda não existe.
    if (opcoes.tema) await aba.avaliar(`document.documentElement.setAttribute('data-tema','${opcoes.tema}')`);
    // Páginas sem `__irPara` (o preview do 3b) são capturadas como estão.
    const temIrPara = await aba.avaliar('typeof window.__irPara === "function"');
    const t = !temIrPara ? null : opcoes.t === undefined ? await aba.avaliar('window.__picoDoBox()') : Number.isNaN(Number(opcoes.t)) ? await aba.avaliar(`window.__tempos.${opcoes.t}`) : Number(opcoes.t);
    if (temIrPara) await aba.avaliar(`window.__irPara(${t})`);
    await esperar(600);
    if (opcoes.clicar) {
      await aba.avaliar(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('${opcoes.clicar}')).click()`);
      await esperar(600);
    }
    // O painel rola a partir da linha 12: sem isto o carro da cena pode ficar fora da captura.
    if (opcoes.rolar) {
      await aba.avaliar(`[...document.querySelectorAll('li')].find((l) => l.textContent.includes('${opcoes.rolar}')).scrollIntoView({ block: 'center' })`);
      await esperar(200);
    }
    const texto = await aba.avaliar(`document.querySelector('nav')?.innerText ?? ''`);
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
