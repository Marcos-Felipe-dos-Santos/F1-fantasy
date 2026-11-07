import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORTA_DEBUG = 9337;

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
      if (dirname(resolve(perfil)) !== resolve(tmpdir()) || !basename(perfil).startsWith('pr2a-chrome-')) {
        throw new Error('perfil temporário fora do diretório esperado; remoção recusada');
      }
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
  const avaliar = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description?.split('\n')[0] ?? r.exceptionDetails.text);
    return r.result.value;
  };
  const fechar = async () => {
    ws.close();
    await fetch(`http://127.0.0.1:${PORTA_DEBUG}/json/close/${id}`);
  };
  return { cdp, avaliar, fechar };
}

const base = process.argv[2] ?? 'http://127.0.0.1:4180/';
mkdirSync('preview/rerolls', { recursive: true });
const chrome = await abrirChrome();
try {
  const aba = await novaAba();
  await aba.cdp('Emulation.setDeviceMetricsOverride', { width: 360, height: 800, deviceScaleFactor: 1, mobile: true });
  await aba.cdp('Page.enable');
  await aba.cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__audioTeste = { decodificados:0, fontes:new Set(), violacoes:[] };
    document.addEventListener('securitypolicyviolation', e=>window.__audioTeste.violacoes.push(e.violatedDirective));
    const Native=window.AudioContext;
    if(Native)window.AudioContext=class extends Native {
      constructor(...args){super(...args);window.__audioTeste.ctx=this;}
      decodeAudioData(...args){return super.decodeAudioData(...args).then(b=>{window.__audioTeste.decodificados++;return b;});}
      createBufferSource(){const src=super.createBufferSource();src.addEventListener('ended',()=>window.__audioTeste.fontes.delete(src));const iniciar=src.start.bind(src);src.start=(...a)=>{window.__audioTeste.fontes.add(src);return iniciar(...a);};return src;}
    };
  ` });
  await aba.cdp('Page.navigate', { url: base });
  await esperar(1800);
  const texto = () => aba.avaliar('document.body.innerText');
  if (!((await texto()).includes('Paddock Draft'))) throw new Error('Nome novo ausente');
  const inicioPng=await aba.cdp('Page.captureScreenshot',{format:'png'});
  writeFileSync('preview/rerolls/inicio-celular.png',Buffer.from(inicioPng.data,'base64'));
  const clicar = async (rotulo) => {
    const ok = await aba.avaliar(`(() => {const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(rotulo)})&&!b.disabled);if(!b)return false;b.click();return true;})()`);
    if (!ok) throw new Error(`Botão indisponível: ${rotulo}`);
    await esperar(150);
  };
  await aba.avaliar(`document.querySelector('.form-inicio__seed-especifica summary').click()`);
  await esperar(100);
  await aba.avaliar(`(() => {const i=document.querySelector('input[placeholder*="senna"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'42');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await clicar('Começar draft');
  const revelacao = () => aba.avaliar(`document.querySelector('.tela-draft__equipe-ano')?.textContent.trim()`);
  const inicio = await revelacao();
  if (!inicio) throw new Error('Draft não abriu');
  await clicar('Trocar marca');
  const trocada = await revelacao();
  if (inicio === trocada || inicio.match(/\d{4}$/)?.[0] !== trocada.match(/\d{4}$/)?.[0]) throw new Error('Troca de marca alterou ano ou não trocou');
  for (const tema of ['dark','light']) {
    await aba.avaliar(`document.documentElement.setAttribute('data-tema','${tema}')`);
    const {data} = await aba.cdp('Page.captureScreenshot', {format:'png'});
    writeFileSync(`preview/rerolls/celular-${tema}.png`,Buffer.from(data,'base64'));
  }
  for(let i=0;i<2;i++) await clicar('Trocar marca');
  const comunsBloqueados = await aba.avaliar(`[...document.querySelectorAll('button')].filter(b=>/^(Trocar marca|Trocar ano)$/.test(b.textContent.trim())).every(b=>b.disabled)`);
  if(!comunsBloqueados)throw new Error('Cota comum não bloqueou');
  const antesEspecial=await revelacao();
  await clicar('Trocar marca + ano');
  const depoisEspecial=await revelacao();
  if(antesEspecial===depoisEspecial)throw new Error('Especial não mudou revelação');
  const especialBloqueado=await aba.avaliar(`[...document.querySelectorAll('button')].filter(b=>b.textContent.includes('Trocar marca + ano')).every(b=>b.disabled)`);
  if(!especialBloqueado)throw new Error('Especial não bloqueou');
  writeFileSync('preview/rerolls/smoke.json',JSON.stringify({base,inicio,trocada,antesEspecial,depoisEspecial,comunsBloqueados,especialBloqueado,texto:await texto()},null,2));
  console.log(JSON.stringify({inicio,trocada,antesEspecial,depoisEspecial,comunsBloqueados,especialBloqueado}));
  // Conclui as cinco escolhas e a peça usando a UI real.
  for(let i=0;i<8;i++) {
    const escolheu=await aba.avaliar(`(() => {const b=document.querySelector('button.card--clicavel');if(!b)return false;b.click();return true;})()`);
    if(!escolheu) break;
    await esperar(150);
  }
  await clicar('Ir pra corrida');
  await clicar('Largar');
  await clicar('Rápida');
  if(process.env.TESTE_CORRIDA_INTEIRA==='1') {
    let terminou=false;
    for(let i=0;i<450;i++) {
      await esperar(200);
      if(await aba.avaliar(`document.querySelector('.resultado-tabela')!==null`)){terminou=true;break;}
    }
    if(!terminou)throw new Error('Corrida inteira não terminou em90s');
    console.log('Corrida inteira concluída pela UI real');
  } else {
    await esperar(1200);
    await clicar('Pular para o resultado');
    if(!(await aba.avaliar(`document.querySelector('.resultado-tabela')!==null`)))throw new Error('Pular para o resultado não abriu resultado');
    console.log('Pular para o resultado confirmou resultado');
  }
  await esperar(3200);
  const audio = await aba.avaliar(`({decodificados:window.__audioTeste.decodificados,ativas:window.__audioTeste.fontes.size,contexto:window.__audioTeste.ctx?.state,violacoes:window.__audioTeste.violacoes})`);
  if(audio.decodificados!==17||audio.ativas!==0||audio.violacoes.length)throw new Error(`Áudio/CSP:${JSON.stringify(audio)}`);
  writeFileSync(process.env.TESTE_CORRIDA_INTEIRA==='1'?'preview/rerolls/corrida-inteira.json':'preview/rerolls/acelerar.json',JSON.stringify(audio,null,2));
  console.log(JSON.stringify({audio}));
  await aba.fechar();
} finally { await chrome.fechar(); }
