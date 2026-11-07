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


const base=process.argv[2]??'http://127.0.0.1:8787/';
mkdirSync('preview/online',{recursive:true});
const chrome=await abrirChrome();
try{
 const aba=await novaAba();await aba.cdp('Page.enable');await aba.cdp('Page.navigate',{url:base});await esperar(1000);
 const resultados=await aba.avaliar(`(async()=>{
 const resultados=[];
 for(const nEtapas of [1,5,10]){
  const criada=await fetch('/criar-sala',{method:'POST'});if(!criada.ok)throw Error('Criar:'+criada.status);const {codigo}=await criada.json();
  const clientes=[];const pausa=ms=>new Promise(r=>setTimeout(r,ms));
  async function conectar(){const ws=new WebSocket(location.origin.replace(/^http/,'ws')+'/parties/sala/'+codigo);const c={ws,msgs:[]};clientes.push(c);ws.addEventListener('message',e=>c.msgs.push(JSON.parse(e.data)));await new Promise((ok,erro)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',erro,{once:true});});c.enviar=o=>ws.send(JSON.stringify(o));c.esperar=async f=>{for(let i=0;i<160;i++){const m=c.msgs.find(f);if(m)return m;await pausa(50);}throw Error('Timeout:'+nEtapas+':'+JSON.stringify(c.msgs.map(m=>({tipo:m.tipo,erro:m.erro,nEtapas:m.estado?.nEtapas,fase:m.estado?.fase,prontos:m.estado?.jogadores.map(j=>j.pronto)}))));};return c;}
  try{
   const a=await conectar();a.enviar({tipo:'entrar',nome:'Anfitrião',versaoApp:'4.1.0'});const id=await a.esperar(m=>m.tipo==='voce-e');
   const velho=await conectar();velho.enviar({tipo:'entrar',nome:'Cliente antigo',versaoApp:'4.0.0'});await velho.esperar(m=>m.tipo==='erro'&&m.erro==='versao-divergente');velho.msgs=[];velho.enviar({tipo:'reentrar',token:id.token,versaoApp:'4.0.0'});await velho.esperar(m=>m.tipo==='erro'&&m.erro==='versao-divergente');
   const b=await conectar();b.enviar({tipo:'entrar',nome:'Convidado',versaoApp:'4.1.0'});await b.esperar(m=>m.tipo==='voce-e');
   a.enviar({tipo:'pronto',pronto:true});b.enviar({tipo:'pronto',pronto:true});await a.esperar(m=>m.tipo==='estado'&&m.estado.jogadores.length===2&&m.estado.jogadores.every(j=>j.pronto));
   a.enviar({tipo:'configurar-formato',nEtapas});
   const alterou=nEtapas!==5;
   const snapshot=await a.esperar(m=>m.tipo==='estado'&&m.estado.nEtapas===nEtapas&&m.estado.jogadores.length===2&&m.estado.jogadores.every(j=>alterou?!j.pronto:j.pronto));
   await b.esperar(m=>m.tipo==='estado'&&m.estado.nEtapas===nEtapas);
   b.enviar({tipo:'configurar-formato',nEtapas:nEtapas===10?1:10});await b.esperar(m=>m.tipo==='erro'&&m.erro==='nao-e-anfitriao');
   a.enviar({tipo:'pronto',pronto:true,revisaoFormatoEsperada:nEtapas===5?0:1});b.enviar({tipo:'pronto',pronto:true,revisaoFormatoEsperada:nEtapas===5?0:1});
   await a.esperar(m=>m.tipo==='estado'&&m.estado.nEtapas===nEtapas&&m.estado.jogadores.every(j=>j.pronto));
   a.enviar({tipo:'iniciar'});await a.esperar(m=>m.tipo==='estado'&&m.estado.fase==='iniciada'&&m.estado.nEtapas===nEtapas);
   a.ws.close();await pausa(200);const r=await conectar();r.enviar({tipo:'reentrar',token:id.token,versaoApp:'4.1.0'});await r.esperar(m=>m.tipo==='estado'&&m.estado.fase==='iniciada'&&m.estado.nEtapas===nEtapas);
   r.enviar({tipo:'configurar-formato',nEtapas:nEtapas===10?1:10});await r.esperar(m=>m.tipo==='erro'&&m.erro==='sala-iniciada');
   resultados.push({nEtapas,doisClientes:true,clienteAntigoRecusado:true,reconexao:true,soAnfitriao:true,prontosRedefinidos:alterou?true:null,travadoAposInicio:true,seq:snapshot.estado.seq});
  }finally{for(const c of clientes){if(c.ws.readyState===WebSocket.OPEN){c.enviar({tipo:'sair'});c.ws.close();}}}
 }
 return resultados;
 })()`);
 writeFileSync('preview/online/formatos.json',JSON.stringify(resultados,null,2));console.log(JSON.stringify(resultados));await aba.fechar();
}finally{await chrome.fechar();}
