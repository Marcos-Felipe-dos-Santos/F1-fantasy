/**
 * Monta o preview de ESCUTA do PR 3 num HTML único e autocontido: os `.ogg` de
 * `tratar-sons.ts` (em base64, decodificados com `atob` + `decodeAudioData`, sem `data:` URI), o
 * manifesto e a cena real de `cena.preview.test.ts`. Desde as escolhas do Marcos (2026-11-06), só
 * entram os sons ESCOLHIDOS e as duas opções de marcha lenta que ele pediu para ouvir; as outras
 * variações seguem tratadas em `preview/sons/` até a integração.
 *
 * O mixer da cena é o proposto e medido em `scripts/medir-pr3.preview.test.ts`: agrupamento de
 * 250 ms por categoria, teto de 6 vozes, prioridade com o jogador à frente.
 *
 * Comando: node scripts/sons/montar-preview.ts [pasta dos sons] [saída .html]
 * Serve:   python -m http.server 4190 --bind 0.0.0.0 --directory preview
 *          (o HTML tem script inline: abrir sob a CSP do jogo o bloquearia)
 */

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESCOLHIDOS, OUVIDOS_SEM_VOZ } from './escolhas.ts';

const PASTA = process.argv[2] ?? 'preview/sons';
const SAIDA = process.argv[3] ?? 'preview/pr3-sons-escolha.html';
const LIMITE_BYTES = 10_000_000;

interface ArquivoManifesto {
  arquivo: string;
  velocidade?: string;
  durS: number;
  laco?: { inicioS: number; fimS: number };
  picoEmS?: number;
  emenda?: number;
  amostrasEsperadas: number;
  camadas: { original: string; freesound: number; deS: number; durS: number; vozMaxNoTrecho: number; vozAcimaDoLimiar: boolean; canal: string; filtro: string | null }[];
}
interface SomManifesto {
  id: string;
  categoria: string;
  rotulo: string;
  diferenca: string;
  forma: string;
  arquivos: ArquivoManifesto[];
}

/** Os escolhidos vêm de `escolhas.ts`, a mesma fonte do que vai ao jogo (`integrar-sons.ts`). */
const ESCOLHIDOS_LISTA: string[] = Object.values(ESCOLHIDOS);

const manifestoTodo = JSON.parse(readFileSync(join(PASTA, 'manifesto.json'), 'utf8')) as { sons: SomManifesto[]; ffmpeg: string };
const noPreview = new Set(ESCOLHIDOS_LISTA);
const manifesto = { ...manifestoTodo, sons: manifestoTodo.sons.filter((s) => noPreview.has(s.id)) };
if (manifesto.sons.length !== noPreview.size) throw new Error('escolha sem som tratado no manifesto');
const cena = JSON.parse(readFileSync(join(PASTA, 'cena.json'), 'utf8')) as Record<string, unknown>;
const audios: Record<string, string> = {};
function base64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
for (const s of manifesto.sons) for (const a of s.arquivos) audios[a.arquivo] = base64(readFileSync(join(PASTA, a.arquivo)));

const dados = {
  sons: manifesto.sons.map((s) => ({
    ...s,
    arquivos: s.arquivos.map((a) => ({
      arquivo: a.arquivo,
      velocidade: a.velocidade,
      durS: a.durS,
      laco: a.laco,
      picoEmS: a.picoEmS ?? 0,
      emenda: a.emenda,
      amostras: a.amostrasEsperadas,
      fontes: a.camadas.map((c) => ({ id: c.freesound, de: c.deS, dur: c.durS, voz: c.vozMaxNoTrecho, alerta: c.vozAcimaDoLimiar, canal: c.canal })),
    })),
  })),
  ffmpeg: manifesto.ffmpeg,
  escolhidos: ESCOLHIDOS_LISTA,
  ouvidosSemVoz: OUVIDOS_SEM_VOZ,
  cena,
};

const CSS = `
:root{--fundo:#f4f2ee;--cartao:#fff;--texto:#1d1d1f;--fraco:#6b6b70;--borda:#dcd8d0;--destaque:#c8102e;--ok:#1f7a4a;--alerta:#b35c00;--pista:#c9c4ba;--botao:#ece8e1}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--fundo:#141416;--cartao:#1e1e22;--texto:#ececef;--fraco:#9a9aa2;--borda:#34343a;--destaque:#ff4d5e;--ok:#4cc38a;--alerta:#f0a040;--pista:#3a3a40;--botao:#2a2a30}}
*{box-sizing:border-box}body{margin:0;background:var(--fundo);color:var(--texto);font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:980px;margin:0 auto;padding:16px}
h1{font-size:20px;margin:4px 0 4px}h2{font-size:17px;margin:26px 0 8px}h3{font-size:15px;margin:0 0 4px}
p{margin:6px 0}.fraco{color:var(--fraco);font-size:13px}
.cartao{background:var(--cartao);border:1px solid var(--borda);border-radius:10px;padding:12px;margin:10px 0}
.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px}
.var{border:1px solid var(--borda);border-radius:8px;padding:10px}
.var.escolhida{border-color:var(--destaque);box-shadow:0 0 0 1px var(--destaque) inset}
button,select{font:inherit;color:var(--texto);background:var(--botao);border:1px solid var(--borda);border-radius:7px;padding:7px 11px;margin:3px 4px 3px 0;cursor:pointer}
button.ativo{background:var(--destaque);color:#fff;border-color:var(--destaque)}
#ativar{font-size:17px;padding:12px 18px;background:var(--destaque);color:#fff;border:0}
.alerta{color:var(--alerta);font-weight:600}.ok{color:var(--ok)}
label.esc{display:inline-flex;gap:6px;align-items:center;font-size:14px;margin-top:4px}
canvas{width:100%;height:auto;display:block;background:var(--cartao);border-radius:8px;border:1px solid var(--borda)}
#log{font:12px/1.4 ui-monospace,Consolas,monospace;max-height:180px;overflow:auto;white-space:pre-wrap;background:var(--fundo);padding:6px;border-radius:6px}
textarea{width:100%;font:13px ui-monospace,Consolas,monospace;background:var(--fundo);color:var(--texto);border:1px solid var(--borda);border-radius:6px;padding:6px}
input[type=range]{width:100%}
table{border-collapse:collapse;font-size:12px;width:100%}td,th{border-bottom:1px solid var(--borda);padding:3px 4px;text-align:left}
`;

const JS = String.raw`
const D = JSON.parse(document.getElementById('dados').textContent);
const A = JSON.parse(document.getElementById('audios').textContent);
const C = D.cena;
const VELS = ['lenta', 'media', 'rapida'];
const NOME_VEL = { lenta: 'lenta', media: 'média', rapida: 'rápida' };
const CATS = [
  ['motor', 'Motor do seu carro', 'Laço. Na cena, o tom acompanha a velocidade do carro; parado na vaga, vira marcha lenta.'],
  ['lenta', 'Marcha lenta (na vaga)', 'Escolhida: (b). A (a) fica para comparar.'],
  ['pelotao', 'Pelotão (fundo)', 'Laço de fundo, com a faixa da fala atenuada 4 dB em 1,8 kHz.'],
  ['chuva', 'Chuva', 'Laço, só em corrida chuvosa.'],
  ['passagem', 'Passagem perto', 'Um arquivo por velocidade (800 / 400 / 300 ms). O pico cai na menor distância.'],
  ['spray', 'Spray (passagem na chuva)', 'Entra junto da passagem quando chove.'],
  ['largada', 'Largada', 'Um arquivo por velocidade (3,5 / 1,8 / 1,2 s).'],
  ['pistola', 'Pistola do pit', 'Ataque + laço, do início ao fim da parada na vaga: p50 de 1,05 / 0,53 / 0,26 s.'],
  ['derrapagem', 'Derrapagem (incidente)', '700 ms reais, em qualquer velocidade.'],
  ['abandono', 'Abandono (DNF)', '900 ms.'],
  ['torcida', 'Torcida (bandeirada)', 'Da bandeirada ao fim do replay: até 10,4 / 5,2 / 2,6 s. Fade no fim.'],
];
const PRIORIDADE = { largada: 5, torcida: 5, abandono: 4, derrapagem: 3, pistola: 2, passagem: 1, spray: 1 };
const JANELA_AGRUPAR_S = 0.25, TETO_VOZES = 6;
const PARADA_P50 = { lenta: 1.052, media: 0.526, rapida: 0.257 };
const CAUDA = { lenta: 7.54, media: 3.77, rapida: 1.84 };

let ctx = null, mestre = null;
const buffers = {};
// Os escolhidos são fixos; só a marcha lenta ainda se escolhe aqui. A opção "sem som próprio" não
// tem arquivo: é a cena que baixa o motor até silenciar com o carro parado.
D.sons.unshift({ id: 'lenta-silencio', categoria: 'lenta', rotulo: 'Sem som próprio', diferenca: 'parado na vaga, o seu motor baixa até silenciar e fica só o pelotão', forma: 'silencio', arquivos: [{ fontes: [] }] });
const escolha = {};
for (const id of D.escolhidos) escolha[id.split('-')[0]] = id;
// Decisão do Marcos (2026-11-06): opção (b). A (a) segue na página só para comparar.
escolha.lenta = 'lenta-v3';
try { const l = localStorage.getItem('pr3-lenta'); if (l === 'lenta-silencio' || l === 'lenta-v3') escolha.lenta = l; } catch (e) {}
const salvar = () => { try { localStorage.setItem('pr3-lenta', escolha.lenta); } catch (e) {} resumoEscolhas(); };
// Demonstração da opção (a): motor v3 com o pelotão por 1,5 s; o motor baixa em 0,8 s e o pelotão segue.
function tocarSilencio(botao) {
  const ja = botao.classList.contains('ativo'); pararTeste(); if (ja) return;
  const t = ctx.currentTime + 0.03, m = arq(escolha.motor), p = arq(escolha.pelotao);
  const fm = fonte(m.arquivo, t, 0.55), fp = fonte(p.arquivo, t, 0.22);
  for (const [f, a] of [[fm, m], [fp, p]]) { f.src.loop = true; f.src.loopStart = a.laco.inicioS; f.src.loopEnd = a.laco.fimS; }
  fm.g.gain.setValueAtTime(0.55, t + 1.5); fm.g.gain.linearRampToValueAtTime(0, t + 2.3);
  fm.src.stop(t + 2.4); fp.g.gain.setValueAtTime(0.22, t + 4); fp.g.gain.linearRampToValueAtTime(0, t + 4.4); fp.src.stop(t + 4.5);
  botao.classList.add('ativo'); tocandoTeste = fp; setTimeout(() => botao.classList.remove('ativo'), 4500);
}
const somPorId = Object.fromEntries(D.sons.map(s => [s.id, s]));
const arq = (id, vel) => { const s = somPorId[id]; return s.arquivos.find(a => !a.velocidade || a.velocidade === vel); };

// ------------------------------------------------------------ ativação e decodificação
// Mesma medida de cliqueNaEmenda (scripts/sons/audio.ts), sobre o buffer que ESTE aparelho decodificou:
// o maior salto em ±2 ms da emenda sobre o percentil 99,9 dos saltos do resto do laço.
function emendaNoAparelho(b, laco) {
  const x = b.getChannelData(0), sr = b.sampleRate;
  const i0 = Math.round(laco.inicioS * sr), i1 = Math.min(x.length, Math.round(laco.fimS * sr));
  const n = i1 - i0, d = i => Math.abs(x[i0 + ((i + 1) % n)] - x[i0 + (i % n)]);
  const viz = Math.round(0.002 * sr);
  let naEmenda = 0; for (let i = n - viz; i < n + viz; i++) naEmenda = Math.max(naEmenda, d(i));
  const corpo = []; for (let i = viz; i < n - viz - 1; i++) corpo.push(d(i));
  corpo.sort((p, q) => p - q);
  return naEmenda / (corpo[Math.floor(corpo.length * 0.999)] || 1e-9);
}
async function ativar() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // Celular (iOS em especial) cria o contexto suspenso: retoma dentro do próprio toque.
  await ctx.resume();
  mestre = ctx.createGain(); mestre.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4;
  mestre.connect(comp); comp.connect(ctx.destination);
  document.getElementById('ativar').textContent = 'Decodificando…';
  const linhas = []; let ok = 0, falhas = 0, emendasRuins = 0;
  for (const s of D.sons) for (const a of s.arquivos) {
    if (s.forma === 'silencio') continue;
    try {
      const bin = atob(A[a.arquivo]); const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const b = await ctx.decodeAudioData(u.buffer);
      buffers[a.arquivo] = b; ok++;
      const esperado = a.amostras / 44100;
      const dif = Math.round((b.duration - esperado) * 1000);
      const em = a.laco ? emendaNoAparelho(b, a.laco) : null;
      if (em !== null && em > 3) emendasRuins++;
      linhas.push('<tr><td>' + a.arquivo + '</td><td class=ok>ok</td><td>' + b.duration.toFixed(3) + ' s</td><td>' + (dif === 0 ? '0' : (dif > 0 ? '+' : '') + dif) + ' ms</td><td' + (em !== null && em > 3 ? ' class=alerta' : '') + '>' + (em === null ? '' : em.toFixed(2)) + '</td></tr>');
    } catch (e) {
      falhas++;
      linhas.push('<tr><td>' + a.arquivo + '</td><td class=alerta>FALHOU</td><td colspan=2>' + (e && e.message || e) + '</td></tr>');
    }
  }
  document.getElementById('decodif').innerHTML = '<p class="' + (falhas ? 'alerta' : 'ok') + '">' + ok + ' decodificados, ' + falhas + ' falhas (amostragem do aparelho: ' + ctx.sampleRate + ' Hz)</p><p class="' + (emendasRuins ? 'alerta' : 'ok') + '">emendas dos laços medidas no áudio decodificado por este aparelho: ' + (emendasRuins ? emendasRuins + ' acima de 3' : 'todas até 3') + ' (1 = indistinguível do corpo do som)</p><details><summary>detalhe por arquivo</summary><table><tr><th>arquivo</th><th></th><th>duração</th><th>vs. gerado</th><th>emenda</th></tr>' + linhas.join('') + '</table></details>';
  document.getElementById('ativar').style.display = 'none';
  document.getElementById('conteudo').hidden = false;
}

// ------------------------------------------------------------ tocar
function fonte(arquivo, quando, ganho, destino) {
  const b = buffers[arquivo]; if (!b) return null;
  const src = ctx.createBufferSource(); src.buffer = b;
  const g = ctx.createGain(); g.gain.value = ganho;
  src.connect(g); g.connect(destino || mestre);
  src.start(quando);
  return { src, g };
}
let tocandoTeste = null;
function pararTeste() { if (tocandoTeste) { try { tocandoTeste.g.gain.setTargetAtTime(0, ctx.currentTime, 0.02); tocandoTeste.src.stop(ctx.currentTime + 0.1); } catch (e) {} tocandoTeste = null; } document.querySelectorAll('button.ativo').forEach(b => b.classList.remove('ativo')); }
function tocarTeste(botao, s, vel, durGate) {
  if (ctx.state !== 'running') ctx.resume();
  const ja = botao.classList.contains('ativo');
  pararTeste(); if (ja) return;
  const a = arq(s.id, vel); const t = ctx.currentTime + 0.03;
  const f = fonte(a.arquivo, t, 1); if (!f) return;
  botao.classList.add('ativo'); tocandoTeste = f;
  if (s.forma === 'laco') { f.src.loop = true; f.src.loopStart = a.laco.inicioS; f.src.loopEnd = a.laco.fimS; }
  if (s.forma === 'ataqueLaco') { f.src.loop = true; f.src.loopStart = a.laco.inicioS; f.src.loopEnd = a.laco.fimS; }
  if (durGate) { f.g.gain.setValueAtTime(1, t + durGate); f.g.gain.linearRampToValueAtTime(0, t + durGate + (s.forma === 'ataqueLaco' ? 0.015 : 0.6)); f.src.stop(t + durGate + 0.7); setTimeout(() => botao.classList.remove('ativo'), (durGate + 0.7) * 1000); }
  else if (s.forma !== 'laco') setTimeout(() => botao.classList.remove('ativo'), a.durS * 1000 + 50);
  if (s.categoria === 'motor') f.src.playbackRate.value = +document.getElementById('rpm').value;
}

// ------------------------------------------------------------ cartões de variação
function cartoes() {
  const raiz = document.getElementById('variacoes');
  for (const [cat, titulo, nota] of CATS) {
    const sons = D.sons.filter(s => s.categoria === cat);
    const div = document.createElement('div'); div.className = 'cartao';
    div.innerHTML = '<h3>' + titulo + '</h3><p class=fraco>' + nota + '</p>' + (cat === 'motor' ? '<label class=fraco>tom do teste (playbackRate): <span id=rpmv>1,00</span><input id=rpm type=range min=0.5 max=1.3 step=0.01 value=1></label>' : '');
    const grade = document.createElement('div'); grade.className = 'grade';
    for (const s of sons) {
      const v = document.createElement('div'); v.className = 'var' + (escolha[cat] === s.id ? ' escolhida' : ''); v.dataset.id = s.id;
      const a0 = s.arquivos[0];
      const fontes = a0.fontes.map(f => 'Freesound ' + f.id + ' @' + f.de.toFixed(2) + ' s' + (f.canal !== 'mistura' ? ' (canal ' + f.canal + ')' : '') + ' · voz <span class="' + (f.alerta ? 'alerta' : '') + '">' + f.voz.toFixed(2) + (f.alerta ? ' ⚠' : '') + '</span>' + (f.alerta && D.ouvidosSemVoz.includes(s.id) ? ' (você ouviu: sem voz)' : '')).join('<br>');
      v.innerHTML = '<b>' + s.id.replace(cat + '-', '') + ' · ' + s.rotulo + '</b><p class=fraco>' + s.diferenca + '</p><p class=fraco>' + fontes + (a0.emenda !== undefined ? '<br>emenda do laço: ' + a0.emenda.toFixed(2) : '') + '</p>';
      const bts = document.createElement('div');
      const bt = (txt, fn) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = () => fn(b); bts.appendChild(b); };
      if (s.forma === 'silencio') bt('▶ demonstração (motor some, fica o pelotão)', b => tocarSilencio(b));
      else if (s.arquivos.length > 1) for (const vel of VELS) bt('▶ ' + NOME_VEL[vel], b => tocarTeste(b, s, vel));
      else if (s.forma === 'ataqueLaco') for (const vel of VELS) bt('▶ parada ' + NOME_VEL[vel] + ' ' + PARADA_P50[vel].toFixed(2).replace('.', ',') + ' s', b => tocarTeste(b, s, vel, PARADA_P50[vel]));
      else if (cat === 'torcida') for (const vel of VELS) bt('▶ ' + NOME_VEL[vel] + ' ' + CAUDA[vel].toFixed(1).replace('.', ',') + ' s', b => tocarTeste(b, s, vel, CAUDA[vel]));
      else bt(s.forma === 'laco' ? '▶ laço (toque de novo p/ parar)' : '▶ tocar', b => tocarTeste(b, s));
      v.appendChild(bts);
      const l = document.createElement('label'); l.className = 'esc';
      if (cat !== 'lenta') { l.innerHTML = '<span class=ok>✓ escolhida</span>'; v.appendChild(l); grade.appendChild(v); continue; }
      l.innerHTML = '<input type=radio name="esc-' + cat + '"' + (escolha[cat] === s.id ? ' checked' : '') + '> usar na cena';
      l.querySelector('input').onchange = () => { escolha[cat] = s.id; grade.querySelectorAll('.var').forEach(x => x.classList.toggle('escolhida', x.dataset.id === s.id)); salvar(); };
      v.appendChild(l);
      grade.appendChild(v);
    }
    div.appendChild(grade); raiz.appendChild(div);
  }
  const rpm = document.getElementById('rpm');
  rpm.oninput = () => { document.getElementById('rpmv').textContent = (+rpm.value).toFixed(2).replace('.', ','); if (tocandoTeste) tocandoTeste.src.playbackRate.value = +rpm.value; };
}
function resumoEscolhas() {
  const el = document.getElementById('resumo'); if (el) el.value = 'Marcha lenta PR 3 — ' + (escolha.lenta === 'lenta-silencio' ? '(a) sem som próprio' : '(b) derivada do motor v3');
}

// ------------------------------------------------------------ cena real
const N = C.tempos.length, IEU = C.ids.indexOf(C.jogador);
const cv = document.getElementById('cena'), g2 = cv.getContext('2d');
const xs = C.tracado.map(p => p[0]), ys = C.tracado.map(p => p[1]);
const minX = Math.min(...xs) - 30, maxX = Math.max(...xs) + 30, minY = Math.min(...ys) - 30, maxY = Math.max(...ys) + 30;
cv.width = 900; cv.height = Math.round(900 * (maxY - minY) / (maxX - minX));
const px = x => (x - minX) / (maxX - minX) * cv.width, py = y => (y - minY) / (maxY - minY) * cv.height;
function indiceEm(t) { // amostra por busca binária
  let a = 0, b = N - 1; while (b - a > 1) { const m = (a + b) >> 1; if (C.tempos[m] <= t) a = m; else b = m; }
  const f = C.tempos[b] > C.tempos[a] ? Math.min(1, Math.max(0, (t - C.tempos[a]) / (C.tempos[b] - C.tempos[a]))) : 0;
  return [a, b, f];
}
const posEm = (c, t) => { const [a, b, f] = indiceEm(t); return [C.xs[c][a] + (C.xs[c][b] - C.xs[c][a]) * f, C.ys[c][a] + (C.ys[c][b] - C.ys[c][a]) * f]; };
const velEm = t => { const [a, b, f] = indiceEm(t); return C.velJogador[a] + (C.velJogador[b] - C.velJogador[a]) * f; };
const VMAX = Math.max(...C.velJogador);
function desenhar(t) {
  const st = getComputedStyle(document.documentElement);
  g2.clearRect(0, 0, cv.width, cv.height);
  g2.lineWidth = 14; g2.lineJoin = 'round'; g2.strokeStyle = st.getPropertyValue('--pista');
  g2.beginPath(); C.tracado.forEach((p, i) => i ? g2.lineTo(px(p[0]), py(p[1])) : g2.moveTo(px(p[0]), py(p[1]))); g2.closePath(); g2.stroke();
  for (let c = 0; c < C.ids.length; c++) {
    if (c === IEU) continue; const [x, y] = posEm(c, t);
    g2.fillStyle = st.getPropertyValue('--fraco'); g2.beginPath(); g2.arc(px(x), py(y), 5, 0, 7); g2.fill();
  }
  const [x, y] = posEm(IEU, t);
  g2.fillStyle = st.getPropertyValue('--destaque'); g2.beginPath(); g2.arc(px(x), py(y), 8, 0, 7); g2.fill();
  g2.strokeStyle = st.getPropertyValue('--destaque'); g2.lineWidth = 2; g2.beginPath(); g2.arc(px(x), py(y), (C.perto.limiarU / (maxX - minX)) * cv.width, 0, 7); g2.stroke();
}

let vel = 'media', rodando = false, t0Real = 0, tSim0 = 0, eventos = [], prox = 0, vozes = [], ultimaCat = {}, raf = 0;
let motor = null, lenta = null, pelotao = null, chuva = null, torcidaAtiva = null;
const logEl = () => document.getElementById('log');
function log(txt) { const el = logEl(); el.textContent += txt + '\n'; el.scrollTop = el.scrollHeight; }
const escala = () => C.escalas[vel];
const simAgora = () => tSim0 + (ctx.currentTime - t0Real) * 1000 * escala();
const realDeSim = ts => t0Real + (ts - tSim0) / escala() / 1000;

function montarEventos() {
  const E = C.eventos, ev = [];
  const eu = id => id === C.jogador;
  ev.push({ t: 0, cat: 'largada', carro: C.jogador });
  for (const p of E.paradas) ev.push({ t: p.chegada, fim: p.partida, cat: 'pistola', carro: p.carro });
  for (const i of E.incidentes) ev.push({ t: i.inicio, cat: 'derrapagem', carro: i.carro });
  for (const a of E.abandonos) ev.push({ t: a.t, cat: 'abandono', carro: a.carro });
  ev.push({ t: E.bandeirada, fim: E.fim, cat: 'torcida', carro: C.jogador });
  for (const p of C.passagens) ev.push({ t: p.t, cat: 'passagem', carro: p.carro, dist: p.dist });
  for (const e of ev) e.jogador = eu(e.carro);
  return ev.sort((a, b) => a.t - b.t);
}
function ganhoDoCarro(e) {
  if (e.jogador || e.cat === 'largada' || e.cat === 'torcida') return 1;
  const [x, y] = posEm(IEU, e.t), [a, b] = posEm(C.ids.indexOf(e.carro), e.t);
  const d = Math.hypot(x - a, y - b);
  return Math.max(0.12, Math.min(0.7, 1 - d / 500)) * (e.cat === 'passagem' ? 1 : 0.8);
}
function disparar(e) {
  // Mixer de medir-pr3: agrupa por categoria em 250 ms (o jogador não é agrupado), teto de 6 vozes.
  const quando = Math.max(ctx.currentTime + 0.005, realDeSim(e.t));
  vozes = vozes.filter(v => v.fim > ctx.currentTime);
  const u = ultimaCat[e.cat];
  if (!e.jogador && u !== undefined && quando - u < JANELA_AGRUPAR_S) { log(fmt(e) + '  absorvida'); return; }
  const pri = v => PRIORIDADE[v.cat] + (v.jogador ? 10 : 0);
  if (vozes.length >= TETO_VOZES) {
    let alvo = -1;
    vozes.forEach((v, k) => { if (pri(v) < pri(e) && (alvo < 0 || pri(v) < pri(vozes[alvo]) || (pri(v) === pri(vozes[alvo]) && v.ini < vozes[alvo].ini))) alvo = k; });
    if (alvo < 0) { log(fmt(e) + '  recusada (teto)'); return; }
    const [r] = vozes.splice(alvo, 1); try { r.f.g.gain.setTargetAtTime(0, ctx.currentTime, 0.01); r.f.src.stop(ctx.currentTime + 0.05); } catch (x) {}
    log('   roubou a voz de ' + r.cat);
  }
  const a = arq(escolha[e.cat], vel);
  const gn = ganhoDoCarro(e);
  let ini = quando, fim;
  if (e.cat === 'pistola') {
    const f = fonte(a.arquivo, ini, gn * 0.9); f.src.loop = true; f.src.loopStart = a.laco.inicioS; f.src.loopEnd = a.laco.fimS;
    fim = Math.max(ini + 0.03, realDeSim(e.fim));
    f.g.gain.setValueAtTime(gn * 0.9, fim); f.g.gain.linearRampToValueAtTime(0, fim + 0.015); f.src.stop(fim + 0.03);
    vozes.push({ cat: e.cat, jogador: e.jogador, ini, fim, f });
  } else if (e.cat === 'torcida') {
    const f = fonte(a.arquivo, ini, 0.9); fim = realDeSim(e.fim);
    f.g.gain.setValueAtTime(0.9, fim); f.g.gain.linearRampToValueAtTime(0, fim + 0.6); f.src.stop(fim + 0.65);
    vozes.push({ cat: e.cat, jogador: true, ini, fim, f }); torcidaAtiva = f;
  } else {
    // O pico do arquivo cai no instante do evento.
    ini = Math.max(ctx.currentTime + 0.005, realDeSim(e.t) - a.picoEmS);
    const f = fonte(a.arquivo, ini, gn * (e.cat === 'passagem' ? 0.75 : 1)); fim = ini + a.durS;
    vozes.push({ cat: e.cat, jogador: e.jogador, ini, fim, f });
    if (e.cat === 'passagem' && C.chuva) {
      const s2 = arq(escolha.spray, vel); const f2 = fonte(s2.arquivo, Math.max(ctx.currentTime + 0.005, realDeSim(e.t) - s2.picoEmS), gn * 0.5);
      vozes.push({ cat: 'spray', jogador: e.jogador, ini, fim: ini + s2.durS, f: f2 });
    }
  }
  ultimaCat[e.cat] = quando;
  log(fmt(e));
}
const fmt = e => ((realDeSim(e.t) - t0Real + tSim0 / escala() / 1000).toFixed(2) + ' s').padStart(9) + '  ' + e.cat + (e.jogador ? ' (você)' : ' ' + e.carro) + (e.fim ? ' até ' + ((e.fim - e.t) / escala() / 1000).toFixed(2) + ' s' : '');

function laco(id, ganho) {
  const a = arq(id, vel); const f = fonte(a.arquivo, ctx.currentTime + 0.02, 0); if (!f) return null;
  f.src.loop = true; f.src.loopStart = a.laco.inicioS; f.src.loopEnd = a.laco.fimS;
  f.g.gain.setTargetAtTime(ganho, ctx.currentTime + 0.02, 0.1); return f;
}
function pararTudo() {
  cancelAnimationFrame(raf); rodando = false;
  for (const f of [motor, lenta, pelotao, chuva, torcidaAtiva, ...vozes.map(v => v.f)]) if (f) { try { f.g.gain.cancelScheduledValues(ctx.currentTime); f.g.gain.setTargetAtTime(0, ctx.currentTime, 0.03); f.src.stop(ctx.currentTime + 0.2); } catch (e) {} }
  motor = lenta = pelotao = chuva = torcidaAtiva = null; vozes = [];
  document.getElementById('play').textContent = '▶ tocar';
}
function iniciar(tSim) {
  if (ctx.state !== 'running') ctx.resume();
  pararTeste(); pararTudo();
  tSim0 = tSim; t0Real = ctx.currentTime + 0.05; eventos = montarEventos(); prox = eventos.findIndex(e => e.t >= tSim - 1); if (prox < 0) prox = eventos.length; ultimaCat = {};
  motor = laco(escolha.motor, 0.55); lenta = escolha.lenta === 'lenta-silencio' ? null : laco(escolha.lenta, 0); pelotao = laco(escolha.pelotao, 0.22); if (C.chuva) chuva = laco(escolha.chuva, 0.3);
  rodando = true; document.getElementById('play').textContent = '■ parar';
  log('— início em ' + (tSim / escala() / 1000).toFixed(1) + ' s, velocidade ' + NOME_VEL[vel] + ' —');
  quadro();
}
function quadro() {
  if (!rodando) return;
  const t = Math.min(simAgora(), C.eventos.fim);
  desenhar(Math.max(0, t));
  const v = velEm(Math.max(0, t)), r = v / VMAX;
  // Motor: tom de 0,6 a 1,1 com a velocidade; abaixo de 1 u/s, cruza para a marcha lenta.
  if (motor) { motor.src.playbackRate.setTargetAtTime(0.6 + 0.5 * r, ctx.currentTime, 0.08); motor.g.gain.setTargetAtTime(v < 1 ? 0 : 0.55, ctx.currentTime, lenta ? 0.08 : 0.25); }
  if (lenta) lenta.g.gain.setTargetAtTime(v < 1 ? 0.5 : 0, ctx.currentTime, 0.08);
  // Agenda 150 ms à frente, no relógio do áudio.
  const horizonte = tSim0 + (ctx.currentTime + 0.15 - t0Real) * 1000 * escala();
  while (prox < eventos.length && eventos[prox].t <= horizonte) { if (eventos[prox].t >= tSim0 - 1) disparar(eventos[prox]); prox++; }
  document.getElementById('relogio').textContent = (Math.max(0, t) / escala() / 1000).toFixed(1) + ' s de ' + (C.eventos.fim / escala() / 1000).toFixed(1) + ' s · velocidade do carro ' + v.toFixed(0) + ' u/s';
  if (simAgora() > C.eventos.fim + 1000 * escala()) { pararTudo(); log('— fim —'); return; }
  raf = requestAnimationFrame(quadro);
}
function cenaUI() {
  const vs = document.getElementById('vels');
  for (const v of VELS) { const b = document.createElement('button'); b.textContent = NOME_VEL[v]; b.className = v === vel ? 'ativo' : ''; b.onclick = () => { vel = v; vs.querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === b)); if (rodando) iniciar(Math.max(0, simAgora())); }; vs.appendChild(b); }
  document.getElementById('play').onclick = () => rodando ? pararTudo() : iniciar(0);
  const eu = C.eventos.paradas.find(p => p.carro === C.jogador), inc = C.eventos.incidentes.find(p => p.carro === C.jogador), ab = C.eventos.abandonos[0];
  const pulos = [['largada', 0], ['seu pit', eu.entrada - 1500], ['seu incidente', inc.inicio - 2500], ['abandono ' + ab.carro, ab.t - 2500], ['bandeirada', C.eventos.bandeirada - 3000]];
  const pj = document.getElementById('pulos');
  for (const [n, t] of pulos) { const b = document.createElement('button'); b.textContent = '⏭ ' + n; b.onclick = () => iniciar(Math.max(0, t)); pj.appendChild(b); }
  desenhar(0);
}

document.getElementById('ativar').onclick = () => ativar().catch(e => { document.getElementById('decodif').innerHTML = '<p class=alerta>Erro ao ativar o áudio: ' + (e && e.message || e) + '</p>'; });
document.addEventListener('visibilitychange', () => { if (ctx) (document.hidden ? ctx.suspend() : ctx.resume()); });
cartoes(); cenaUI(); resumoEscolhas();
document.getElementById('copiar').onclick = () => { const t = document.getElementById('resumo'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } };
`;

const c = cena as { pista: string; seed: number; voltas: number; chuva: boolean; posicaoFinal: number; perto: { limiarU: number; contagemPorLimiar: Record<string, number> }; passagens: unknown[] };
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PR 3 — Escolha dos sons</title><style>${CSS}</style></head>
<body><main>
<h1>PR 3 — escolha dos sons</h1>
<p class=fraco>Sons CC0 do Freesound tratados por <code>scripts/sons/tratar-sons.ts</code> (${dados.ffmpeg.replace(/ Copyright.*/, '')}). Ouça de fone. Estes são os sons escolhidos, incluída a marcha lenta (b), derivada do motor v3. A opção (a) segue na página só para comparar na cena (atalho "seu pit").</p>
<p class=fraco>⚠ ao lado do número de voz: o detector (heurístico) acusou fala no trecho. No controle com fala sintética, ele acusou a fala sozinha em 13 de 25 janelas, mas, misturada a 6 dB abaixo do fundo, só a viu sobre a marcha lenta (5/25) e ficou cego sobre passagem e chuva; e acusa em quase toda a gravação de um motor morrendo (852408: 75 de 86 janelas), provavelmente falso positivo. O ouvido decide.</p>
<button id=ativar>Toque para ativar o som</button>
<div id=decodif></div>
<div id=conteudo hidden>
<h2>Cena real</h2>
<div class=cartao>
<p class=fraco>${c.pista}, seed ${c.seed}, ${c.voltas} voltas, ${c.chuva ? 'com chuva' : 'seca'}. Você é o ponto vermelho (termina em P${c.posicaoFinal}); o círculo é o "perto" (${c.perto.limiarU} u): ${c.passagens.length} passagens na corrida. Os carros dos outros tocam mais baixo conforme a distância até você.</p>
<div id=vels></div>
<button id=play>▶ tocar</button>
<div id=pulos></div>
<p id=relogio class=fraco></p>
<canvas id=cena></canvas>
<div id=log></div>
</div>
<h2>Marcha lenta na cena</h2>
<div class=cartao><textarea id=resumo rows=3 readonly></textarea><button id=copiar>copiar</button></div>
<h2>Sons escolhidos e as opções de marcha lenta</h2>
<div id=variacoes></div>
<p class=fraco>A opção (b) sai de uma gravação de F1 V8 de 2012 (Freesound 150337): a semelhança com um V6 híbrido é aproximada, por tom e filtro.</p>
</div>
</main>
<script type="application/json" id="dados">${JSON.stringify(dados).replace(/</g, '\\u003c')}</script>
<script type="application/json" id="audios">${JSON.stringify(audios)}</script>
<script>${JS}</script>
</body></html>`;

writeFileSync(SAIDA, html);
const bytes = statSync(SAIDA).size;
console.log(`${SAIDA}: ${bytes} bytes`);
if (bytes > LIMITE_BYTES) throw new Error(`preview passou de ${LIMITE_BYTES} bytes`);
