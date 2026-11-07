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

const base=process.argv[2]??'http://127.0.0.1:4180/';
mkdirSync('preview/fundo',{recursive:true});
const chrome=await abrirChrome();
const medicoes=[];
try{
 const aba=await novaAba();
 await aba.cdp('Page.enable');await aba.cdp('Page.navigate',{url:base});await esperar(1200);
 const clicar=async texto=>{const ok=await aba.avaliar(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(texto)})&&!b.disabled);if(!b)return false;b.click();return true;})()`);if(!ok)throw new Error('Botão ausente:'+texto);await esperar(100);};
 const capturar=async etapa=>{
  for(const [perfil,width,height]of [['desktop',1440,900],['celular',360,800]]){
   await aba.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:perfil==='celular'});
   for(const tema of ['dark','light']){
    await aba.avaliar(`document.documentElement.setAttribute('data-tema','${tema}')`);await esperar(100);
    if(etapa==='corrida')await aba.avaliar(`document.querySelector('.tela-corrida > button:last-child')?.scrollIntoView({block:'end'})`);
    else await aba.avaliar('window.scrollTo(0,0)');
    const layout=await aba.avaliar(`({largura:innerWidth,documento:document.documentElement.scrollWidth,fundo:getComputedStyle(document.body,'::before').backgroundImage,decoracao:getComputedStyle(document.body,'::before').pointerEvents,camada:getComputedStyle(document.body,'::before').display,fundoBody:getComputedStyle(document.body).backgroundImage})`);
    if(layout.documento>layout.largura)throw new Error('Overflow:'+etapa+perfil+tema);
    const {data}=await aba.cdp('Page.captureScreenshot',{format:'png'});
    writeFileSync(`preview/fundo/${etapa}-${perfil}-${tema}.png`,Buffer.from(data,'base64'));
    medicoes.push({etapa,perfil,tema,...layout});
   }
  }
 };
 await capturar('inicio');
 await aba.avaliar(`document.querySelector('.form-inicio__seed-especifica summary').click()`);await esperar(100);
 await aba.avaliar(`(()=>{const i=document.querySelector('input[placeholder*="senna"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'42');i.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 await clicar('Começar draft');await capturar('draft');
 for(let i=0;i<8;i++){const ok=await aba.avaliar(`(()=>{const b=document.querySelector('button.card--clicavel');if(!b)return false;b.click();return true;})()`);if(!ok)break;await esperar(100);}
 await clicar('Ir pra corrida');await clicar('Largar');await clicar('Rápida');
 await capturar('corrida');
 const rotulo=await aba.avaliar(`document.querySelector('.tela-corrida > button:last-child')?.textContent.trim()`);
 if(!rotulo?.includes('Pular para o resultado'))throw new Error('Rótulo errado:'+rotulo);
 await clicar('Pular para o resultado');
 if(!await aba.avaliar(`document.querySelector('.resultado-tabela')!==null`))throw new Error('Botão não pulou');
 const carros=await aba.avaliar(`document.querySelectorAll('.resultado-tabela details').length`);
 if(carros!==22)throw new Error('Esperados 22 carros inspecionáveis:'+carros);
 await aba.avaliar(`document.querySelector('.resultado-tabela details').open=true`);
 await capturar('resultado');
 writeFileSync('preview/fundo/conferencia.json',JSON.stringify({rotulo,pulou:true,medicoes},null,2));
 console.log(JSON.stringify({capturas:medicoes.length,rotulo,pulou:true,overflow:false}));
 await aba.fechar();
}finally{await chrome.fechar();}
