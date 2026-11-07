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


const base='http://127.0.0.1:8787/';
const pasta='docs/img/interfaces';mkdirSync(pasta,{recursive:true});
const chrome=await abrirChrome(); const registros=[];
try {
 const aba=await novaAba(); await aba.cdp('Page.enable');
 const navegar=async()=>{await aba.avaliar(`if(location.origin==='http://127.0.0.1:8787')localStorage.removeItem('f1-fantasy:campeonato')`);await aba.cdp('Page.navigate',{url:base});await esperar(900);};
 const clicar=async texto=>{const ok=await aba.avaliar(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(texto)})&&!b.disabled);if(!b)return false;b.click();return true;})()`);if(!ok)throw Error('Botão ausente: '+texto);await esperar(180);};
 const selecionar=async(indice,valor)=>{await aba.avaliar(`(()=>{const s=document.querySelectorAll('.form-inicio select')[${indice}];Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,${JSON.stringify(valor)});s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await esperar(150);};
 const preencher=async(sel,valor)=>{await aba.avaliar(`(()=>{const i=document.querySelector(${JSON.stringify(sel)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,${JSON.stringify(valor)});i.dispatchEvent(new Event('input',{bubbles:true}));})()`);await esperar(100);};
 const foto=async(nome,sel=null,mobile=false)=>{
  await aba.cdp('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:1000,deviceScaleFactor:1,mobile});
  for(const tema of ['dark','light']){
   await aba.avaliar(`document.documentElement.setAttribute('data-tema','${tema}')`);
   if(sel)await aba.avaliar(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({block:'start'})`);else await aba.avaliar('window.scrollTo(0,0)');
   await esperar(120);
   const {data}=await aba.cdp('Page.captureScreenshot',{format:'jpeg',quality:82});
   const arquivo=`${pasta}/${nome}-${tema}.jpg`;writeFileSync(arquivo,Buffer.from(data,'base64'));
   registros.push({arquivo,tela:nome,tema});
  }
 };
 await navegar();await foto('inicio');
 await aba.avaliar(`document.querySelector('.form-inicio__seed-especifica summary').click()`);await esperar(100);
 await preencher('input[placeholder*="senna"]','42');
 await selecionar(3,'curta');await clicar('Começar draft');await foto('draft');await foto('draft-celular',null,true);
 for(let i=0;i<5;i++){await aba.avaliar(`document.querySelector('button.card--clicavel').click()`);await esperar(150);}
 await foto('peca');await aba.avaliar(`document.querySelector('button.card--clicavel').click()`);await esperar(150);await foto('resumo');
 await clicar('Ir pra corrida');await foto('grid');await clicar('Largar');await foto('corrida');await foto('corrida-celular',null,true);
 await clicar('Pular para o resultado');await foto('resultado');await aba.avaliar(`document.querySelector('.resultado-tabela details').open=true`);await foto('carro', '.resultado-tabela details');await foto('carro-celular','.resultado-tabela details',true);
 await foto('campeonato','.painel-campeonato');
 // Termina as cinco etapas para registrar o encerramento real do campeonato.
 for(let i=0;i<4;i++){await clicar('Próxima corrida');await clicar('Largar');await clicar('Pular para o resultado');}
 await clicar('Próxima corrida');await foto('campeonato-final');
 await navegar();await selecionar(1,'local');await foto('configuracao-local');await clicar('Começar draft');await foto('passar-aparelho');
 await navegar();await selecionar(2,'cego');await clicar('Começar draft');await foto('draft-cego');
 await navegar();await selecionar(1,'online');await clicar('Criar ou entrar numa sala');await foto('online');await clicar('Criar sala');await esperar(900);await foto('sala-criada');await clicar('Ir para a sala');await esperar(600);await foto('entrada-sala');
 await preencher('input[placeholder="como os outros vão te ver"]','Jogador de demonstração');await clicar('Entrar');await esperar(600);await foto('lobby');
 writeFileSync('preview/interfaces-capturas.json',JSON.stringify(registros,null,2));console.log(JSON.stringify({capturas:registros.length}));await aba.fechar();
}finally{await chrome.fechar();}
