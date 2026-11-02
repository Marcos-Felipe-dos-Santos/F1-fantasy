/**
 * Mutações do PR 2a: aplica cada uma, roda os testes do replay e restaura o arquivo.
 * Sobrevivente = o teste não afirma o que diz. Comando: node scripts/mutar-pr2a.mjs
 * Grava `docs/pr2a-mutacoes.json`. Aborta se o trecho original não existir mais.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const PIT = 'src/ui/pit-replay.ts';
const CARRO = 'src/ui/carro-replay.ts';
const TELA = 'src/ui/TelaCorrida.tsx';
const DEFS = 'src/ui/CarroReplay.tsx';
const DIF = 'src/ui/diferenca-lider.ts';
const MOLHADO = 'src/ui/molhado.ts';
const CSS = 'src/ui/estilos.css';
const TOKENS = 'src/ui/tokens.ts';
const ONLINE = 'src/ui/FluxoOnline.tsx';
const FLUXO = 'src/ui/FluxoCorrida.tsx';
const BASE = 'src/ui/fluxo-corrida.ts';

const MUTACOES = [
  ['rumo-janela-cortada-no-box', PIT, 'return angulo(pontoNoCaminho(c, x - MEIA_JANELA_RUMO), pontoNoCaminho(c, x + MEIA_JANELA_RUMO));', 'return angulo(pontoNoCaminho(c, x), pontoNoCaminho(c, x + MEIA_JANELA_RUMO));'],
  ['rumo-invertido', PIT, 'return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;', 'return (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI;'],
  ['rumo-vaga-reduzido', PIT, 'rumo: rumoNoCaminho(c, naVaga ? p.xVaga : x),', 'rumo: rumoNoCaminho(c, x),'],
  ['fracao-no-box', PIT, 'fracaoNaPista: null,', 'fracaoNaPista: 0,'],
  ['instante-pelo-historico', PIT, 'if (janela === undefined) return instanteNasVoltas(historico, voltas);', 'if (janela !== null) return instanteNasVoltas(historico, voltas);'],
  ['asa-celular-grossa', CARRO, 'export const ASA_PROPORCIONAL = 4.1;', 'export const ASA_PROPORCIONAL = 6;'],
  ['asa-desktop-troca', CARRO, 'const espessura = estreita ? ASA_PROPORCIONAL : ASA_COMPLETA;', 'const espessura = ASA_PROPORCIONAL;'],
  ['asa-cresce-para-fora', CARRO, 'x: frente - espessura,', 'x: frente - ASA_COMPLETA,'],
  ['escala-bot-celular', CARRO, 'estreita: { bot: 1.05, humano: 1.48 },', 'estreita: { bot: 0.86, humano: 1.48 },'],
  ['escala-humano-celular', CARRO, 'estreita: { bot: 1.05, humano: 1.48 },', 'estreita: { bot: 1.05, humano: 1.2 },'],
  ['contorno-grosso', CARRO, 'const CONTORNO_BOT_VISIVEL_PX = 0.65;', 'const CONTORNO_BOT_VISIVEL_PX = 1.3;'],
  ['spray-corte-forte', CARRO, 'export const CORTE_SPRAY_FORTE = 30;', 'export const CORTE_SPRAY_FORTE = 20;'],
  ['spray-corte-medio', CARRO, 'export const CORTE_SPRAY_MEDIO = 60;', 'export const CORTE_SPRAY_MEDIO = 90;'],
  ['spray-sem-anel', CARRO, 'const voltaCompleta = i === naPista.length - 1 ? 1 : 0;', 'const voltaCompleta = 0;'],
  ['spray-conta-quem-saiu', CARRO, '(fracao === null ? [] : [{ fracao, indice }])', '[{ fracao: fracao ?? 0, indice }]'],
  ['spray-niveis-invertidos', CARRO, 'distancia < CORTE_SPRAY_FORTE ? 3 : distancia < CORTE_SPRAY_MEDIO ? 2 : 1;', 'distancia < CORTE_SPRAY_FORTE ? 1 : distancia < CORTE_SPRAY_MEDIO ? 2 : 3;'],
  ['spray-no-seco', TELA, 'resultado.chuva && !movimentoReduzido\n      ? niveisDeSpray', '!movimentoReduzido\n      ? niveisDeSpray'],
  ['spray-com-reduzido', TELA, 'resultado.chuva && !movimentoReduzido\n      ? niveisDeSpray', 'resultado.chuva\n      ? niveisDeSpray'],
  ['spray-de-quem-chegou', TELA, 'posicoes.map((p) => (p.parou ? null : p.fracaoNaPista))', 'posicoes.map((p) => p.fracaoNaPista)'],
  ['spray-sobre-os-carros', TELA, '{carros.map((c) => c.spray)}\n        {carros.map((c) => c.el)}', '{carros.map((c) => c.el)}\n        {carros.map((c) => c.spray)}'],
  ['chuva-com-reduzido', TELA, '{resultado.chuva && !movimentoReduzido && (\n              <div className="chuva-replay"', '{resultado.chuva && (\n              <div className="chuva-replay"'],
  ['molhado-sempre', TELA, "resultado.chuva ? ' tracado-svg--molhado' : ''", "' tracado-svg--molhado'"],
  ['reflexo-no-seco', TELA, '{resultado.chuva && <ReflexosMolhados pistaId={pista.id} />}', '<ReflexosMolhados pistaId={pista.id} />'],
  ['sob-a-ponte-ignorado', TELA, 'const carros = carrosDoReplay.filter((c) => c.sob === sob);', 'const carros = sob ? [] : carrosDoReplay;'],
  ['halo-em-todo-humano', TELA, 'const ehLocal = jogadorLocalId === undefined ? ehHumano : item.jogadorId === jogadorLocalId;', 'const ehLocal = ehHumano;'],
  ['humano-sem-prioridade', TELA, 'carrosDoReplay.sort((a, b) => a.prioridade - b.prioridade);', ''],
  ['painel-sem-pit', TELA, 'diferencasParaLider(resultado, classificacaoAtual, tempoSimMs, pista.voltas, linhaDoPit)', 'diferencasParaLider(resultado, classificacaoAtual, tempoSimMs, pista.voltas)'],
  ['escala-sempre-larga', TELA, 'const escalas = telaEstreita ? ESCALA_CARRO.estreita : ESCALA_CARRO.larga;', 'const escalas = ESCALA_CARRO.larga;'],
  ['desenho-sempre-largo', TELA, '<DefsDoCarro estreita={telaEstreita} />', '<DefsDoCarro estreita={false} />'],
  ['spray-sem-transform', DEFS, 'href={`#spray-${nivel}`} transform={transform}', 'href={`#spray-${nivel}`}'],
  ['lider-dnf', DIF, "const lider = ordem.find((item) => item.status !== 'dnf');", 'const lider = ordem[0];'],
  ['sem-piso', DIF, 'piso = Math.max(piso, ms);', 'piso = ms;'],
  ['chegada-sem-punicao', DIF, "if (item.status === 'terminou' && lider.status === 'terminou') {", 'if (false) {'],
  ['voltas-por-arredondamento', DIF, 'const atras = Math.floor(voltasLider - voltas);', 'const atras = Math.round(voltasLider - voltas);'],
  ['formato-ponto', DIF, ".replace('.', ',')", ''],
  ['reflexo-fora-do-asfalto', MOLHADO, 'export const DESLOCAMENTO_REFLEXO = 9;', 'export const DESLOCAMENTO_REFLEXO = 18;'],
  ['reflexo-um-lado-so', MOLHADO, '[DESLOCAMENTO_REFLEXO, -DESLOCAMENTO_REFLEXO].map', '[DESLOCAMENTO_REFLEXO, DESLOCAMENTO_REFLEXO].map'],
  ['css-molhado-sem-override', CSS, '--pista-asfalto: var(--pista-asfalto-molhado);', '--pista-asfalto-x: var(--pista-asfalto-molhado);'],
  ['halo-fio-online', ONLINE, '            jogadorLocalId={euSou}\n', ''],
  ['halo-fio-fluxo', FLUXO, '      jogadorLocalId={jogadorLocalId}\n', ''],
  ['acumulado-sem-memo', BASE, 'CACHE_ACUMULADO.set(historico, acumulado);', ''],
  ['token-molhado', TOKENS, "pistaAsfaltoMolhado: '#313131',", "pistaAsfaltoMolhado: '#2E2E2E',"],
];

const rodar = () =>
  spawnSync(
    'npx',
    [
      'vitest',
      'run',
      'src/ui/pit-replay.test.ts',
      'src/ui/carro-replay.test.ts',
      'src/ui/molhado.test.ts',
      'src/ui/diferenca-lider.test.ts',
      'src/ui/tela-corrida-render.test.ts',
      'src/ui/tokens.test.ts',
      'src/ui/contrato-corrida-online.test.ts',
      'src/ui/fluxo-corrida.test.ts',
      '--bail=1',
    ],
    { encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );

// Controle: sem isto, "N/N detectadas" não se distingue de "o comando não roda".
if (rodar().status !== 0) throw new Error('controle sem mutação não passou: nada a medir');

const resultado = [];
for (const [nome, arquivo, de, para] of MUTACOES) {
  const bruto = readFileSync(arquivo, 'utf8');
  const crlf = bruto.includes('\r\n');
  const original = crlf ? bruto.replace(/\r\n/g, '\n') : bruto;
  if (!original.includes(de)) throw new Error(`trecho não encontrado: ${nome}`);
  writeFileSync(arquivo, original.replace(de, () => para));
  try {
    const r = rodar();
    const limpa = `${r.stdout}${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
    const falha = limpa.match(/^ FAIL +(.*)$/m)?.[1] ?? null;
    // Só conta como detectada a falha de um teste nomeado, nunca o comando quebrado.
    const detectada = r.status !== 0 && falha !== null;
    resultado.push({ nome, detectada, falha });
    console.log(`${detectada ? 'DETECTADA ' : 'SOBREVIVEU'} ${nome}${falha ? ` | ${falha.slice(0, 100)}` : ''}`);
  } finally {
    writeFileSync(arquivo, bruto);
  }
}
writeFileSync('docs/pr2a-mutacoes.json', `${JSON.stringify(resultado, null, 2)}\n`);
console.log(`${resultado.filter((m) => m.detectada).length}/${resultado.length} detectadas`);
