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


mkdirSync('preview/online',{recursive:true});const chrome=await abrirChrome();
try{
 const aba=await novaAba();await aba.cdp('Page.enable');await aba.cdp('Page.navigate',{url:'http://127.0.0.1:8787/'});await esperar(1100);
 const clicar=async texto=>{if(!await aba.avaliar(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(texto)})&&!b.disabled);if(!b)return false;b.click();return true;})()`))throw Error('Botão:'+texto);await esperar(250);};
 const foto=async nome=>{for(const [perfil,width,height]of [['desktop',1440,1100],['celular',390,844]]){await aba.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:perfil==='celular'});for(const tema of ['dark','light']){await aba.avaliar(`document.documentElement.setAttribute('data-tema','${tema}');window.scrollTo(0,0)`);await esperar(150);if(await aba.avaliar('document.documentElement.scrollWidth>innerWidth'))throw Error('Overflow:'+nome+perfil+tema);const {data}=await aba.cdp('Page.captureScreenshot',{format:'png'});writeFileSync(`preview/online/${nome}-${perfil}-${tema}.png`,Buffer.from(data,'base64'));}}};
 await aba.avaliar(`(()=>{const s=document.querySelectorAll('.form-inicio select')[1];Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'online');s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await esperar(100);await clicar('Criar ou entrar numa sala');await foto('entrada');await clicar('Criar sala');await esperar(700);await foto('criada');await clicar('Ir para a sala');await esperar(600);await foto('identificacao');
 await aba.avaliar(`(()=>{const i=document.querySelector('input[placeholder="como os outros vão te ver"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'Marcos');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);await esperar(100);await clicar('Entrar na sala');await esperar(400);
 await aba.avaliar(`(async()=>{const codigo=document.querySelector('.tela-sala__codigo').textContent.replace(/[^a-f0-9]/gi,'');const ws=new WebSocket(location.origin.replace(/^http/,'ws')+'/parties/sala/'+codigo);window.__convidadoDemo=ws;await new Promise(ok=>ws.addEventListener('open',ok,{once:true}));ws.send(JSON.stringify({tipo:'entrar',nome:'Ana',versaoApp:'4.1.0'}));})()`);await esperar(400);
 await aba.avaliar(`(()=>{const s=document.querySelector('select[aria-label="Formato da partida"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'10');s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await esperar(400);
 if(!await aba.avaliar(`document.querySelector('select[aria-label="Formato da partida"]').value==='10'`))throw Error('Formato não confirmou');await foto('lobby');

 console.log(JSON.stringify({capturas:16,overflow:false,formato10:true}));await aba.fechar();
}finally{await chrome.fechar();}
