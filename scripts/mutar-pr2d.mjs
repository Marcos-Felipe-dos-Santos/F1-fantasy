/**
 * Mutações do PR 2d: aplica cada uma, roda os testes do replay e restaura o arquivo.
 * Sobrevivente = o teste não afirma o que diz. Comando: node scripts/mutar-pr2d.mjs
 * Grava `docs/pr2d-mutacoes.json`. Aborta se o trecho original não existir mais.
 * `--fatia 0-10` roda um pedaço e acumula no JSON (a fatia 0 recomeça do zero).
 * Derivado de `mutar-pr2e.mjs`, com o mesmo timeout por mutante.
 */

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const INC = 'src/ui/incidentes-replay.ts';
const NAR = 'src/ui/narracao.ts';
const TELA = 'src/ui/TelaCorrida.tsx';
const BASE = 'src/ui/fluxo-corrida.ts';
const FIM = 'src/ui/fim-da-corrida.ts';
const VIEW = 'src/ui/loadout-view.ts';
const CARRO = 'src/ui/CarroReplay.tsx';
const CSS = 'src/ui/estilos.css';

const MUTACOES = [
  ['custo-espalhado', INC, 'if (tempoSimMs < i.fim) return fracao;', 'if (tempoSimMs < i.fim) continue;'],
  ['ritmo-sem-custo', INC, 'const ritmo = (sb - sa) / (tb - ta - custo);', 'const ritmo = (sb - sa) / (tb - ta);'],
  ['abandono-sem-custo', INC, 'const instante = ta + (fracao - sa) / ritmo + custo;', 'const instante = ta + (fracao - sa) / ritmo;'],
  ['inicio-sem-ritmo', INC, 'const inicio = t + (fracao - fracaoAtual) / ritmo;', 'const inicio = t;'],
  ['fim-sem-custo', INC, 't = inicio + evento.custoMs;', 't = inicio;'],
  ['fracao-nao-acumula', INC, 'fracaoAtual = fracao;\n        return', 'return'],
  ['inverso-sem-custo', INC, 'desde = i.fim;\n  }\n  return desde + (fracao - de) / p.ritmo;', 'desde = i.inicio;\n  }\n  return desde + (fracao - de) / p.ritmo;'],
  ['inverso-ignora-plano', INC, 'if (plano === undefined) return linha.instanteDoProgresso(jogadorId, historico, voltas);', 'if (plano === undefined || true) return linha.instanteDoProgresso(jogadorId, historico, voltas);'],
  ['margem-do-local', INC, 'export const MARGEM_LOCAL = 0.08;', 'export const MARGEM_LOCAL = 0;'],
  ['sem-folga-pit-depois', INC, 'const de = Math.max(MARGEM_LOCAL, sa + FOLGA_DO_PIT);', 'const de = MARGEM_LOCAL;'],
  ['sem-folga-pit-antes', INC, 'let ate = Math.min(1 - MARGEM_LOCAL, sb - FOLGA_DO_PIT);', 'let ate = 1 - MARGEM_LOCAL;'],
  ['plano-ignora-pit-antes', INC, 'const ta = pitAntes?.fim ?? (volta >= 2 ? acumulado[volta - 2] : 0);', 'const ta = volta >= 2 ? acumulado[volta - 2] : 0;'],
  ['plano-ignora-pit-na-volta', INC, 'let tb = pitNaVolta?.inicio ?? acumulado[volta - 1];', 'let tb = acumulado[volta - 1];'],
  ['abandono-na-volta-inteira', INC, 'const instante = ta + (fracao - sa) / ritmo + custo;', 'const instante = ta + ((fracao - sa) / (sb - sa)) * (tb - ta);'],
  ['abandono-nao-corta-o-plano', INC, 'sb = fracao;\n        tb = instante;', ''],
  ['erro-depois-do-abandono', INC, 'ate = fracao - FOLGA_DO_PIT;', ''],
  ['dnf-sem-plano', INC, 'if (voltaFinal !== null) voltas.add(voltaFinal);', ''],
  ['progresso-do-dnf-na-volta', INC, 'return (abandono.volta - 1 + abandono.fracao) / pista.voltas;', 'return abandono.volta / pista.voltas;'],
  ['posicao-sem-abandono', INC, 'if (abandono !== undefined && tempoSimMs >= abandono.instante) return posicaoNaPista(pista.id, abandono.fracao);', ''],
  ['posicao-sem-plano', INC, 'return posicaoNaPista(pista.id, fracaoNoPlano(plano, tempoSimMs));', 'return linha.posicao(jogadorId, historico, status, tempoSimMs, reduzido);'],
  ['parado-sem-incidente', INC, '(planoEm(jogadorId, tempoSimMs)?.incidentes.some((i) => tempoSimMs >= i.inicio && tempoSimMs < i.fim) ?? false)', 'false'],
  ['parado-sem-abandono', INC, 'abandonou(jogadorId, tempoSimMs) ||\n        (planoEm', '(planoEm'],
  ['efeito-em-tempo-simulado', INC, 'const janela = DURACAO_EFEITO_MS * simPorReal;', 'const janela = DURACAO_EFEITO_MS;'],
  ['efeito-duracao', INC, 'export const DURACAO_EFEITO_MS = 700;', 'export const DURACAO_EFEITO_MS = 900;'],
  ['efeito-chuva-em-tudo', INC, "const molhado = resultado.chuva && i.evento.tipo === 'erro-piloto';", 'const molhado = resultado.chuva;'],
  ['efeito-sem-chuva', INC, "const molhado = resultado.chuva && i.evento.tipo === 'erro-piloto';", 'const molhado = false;'],
  ['efeito-sem-abandono', INC, "if (abandono !== undefined) adicionar(`${jogadorId}-abandono`, 'fumaca', abandono.fracao, abandono.instante);", ''],
  ['efeito-idade', INC, 'idade: (tempoSimMs - inicio) / janela', 'idade: 0'],
  ['guinada-em-toda-pane', INC, ".find((i) => i.evento.tipo === 'erro-piloto' && tempoSimMs >= i.inicio", '.find((i) => tempoSimMs >= i.inicio'],
  ['guinada-sem-voltar', INC, 'return lado * GUINADA_GRAUS * Math.sin((Math.PI * (tempoSimMs - incidente.inicio)) / janela);', 'return lado * GUINADA_GRAUS;'],
  ['guinada-em-tempo-simulado', INC, 'const janela = DURACAO_GUINADA_MS * simPorReal;', 'const janela = DURACAO_GUINADA_MS;'],
  ['incidente-depois-da-linha', FIM, 'return chegada === undefined ? todos : todos.filter((i) => i.inicio < chegada.instante);', 'return todos;'],
  ['replay-sem-incidentes', FIM, 'const linha = linhaDeIncidentes(resultado, pista, linhaDoTempoDoPit(resultado, pista));', 'const linhaPura = linhaDoTempoDoPit(resultado, pista);\n  const linha = { ...linhaDeIncidentes(resultado, pista, linhaPura), progresso: linhaPura.progresso };'],
  ['painel-dnf-no-fim-do-historico', BASE, "const abandonou = pit?.abandonou?.(item.jogadorId, tempoSimMs) ?? (congelado && item.status === 'dnf');", "const abandonou = congelado && item.status === 'dnf';"],
  ['hash-sem-jogador', NAR, 'return (deriveSeed(seed, `narracao:${rotulo}:${jogadorId}:${volta}:${tipo}`) >>> 0) / 2 ** 32;', 'return (deriveSeed(seed, `narracao:${rotulo}:${volta}:${tipo}`) >>> 0) / 2 ** 32;'],
  ['hash-sem-divisao', NAR, '>>> 0) / 2 ** 32;', '>>> 0);'],
  ['hash-sem-seed', NAR, 'return (deriveSeed(seed, `narracao:${rotulo}', 'return (deriveSeed(1, `narracao:${rotulo}'],
  ['posicoes-sem-parada', NAR, 'progresso(id, incidente.inicio) <= ali && progresso(id, incidente.fim) > ali', 'progresso(id, incidente.fim) > ali'],
  ['posicoes-conta-sem-passar', NAR, 'progresso(id, incidente.inicio) <= ali && progresso(id, incidente.fim) > ali', 'progresso(id, incidente.inicio) <= ali'],
  ['ordem-por-volta', NAR, 'narradas.sort((a, b) => a.instante - b.instante);', ''],
  ['sem-memo', NAR, 'CACHE_NARRACAO.set(resultado, narradas);', ''],
  ['frase-repete', NAR, 'while (doTipo.has(pool[indice])) indice = (indice + 1) % pool.length;', ''],
  ['frase-trava-no-pool-cheio', NAR, 'if (doTipo.size >= pool.length) doTipo.clear();', 'if (doTipo.size > pool.length) doTipo.clear();'],
  ['boxes-em-toda-volta', NAR, '(resultado.voltasDePit[evento.jogadorId] ?? []).includes(evento.volta)', '(resultado.voltasDePit[evento.jogadorId] ?? []).length > 0'],
  ['quebra-com-tempo', NAR, 'tempoPerdidoMs: evento.custoMs > 0 ? evento.custoMs : null,', 'tempoPerdidoMs: evento.custoMs,'],
  ['punicao-com-posicoes', NAR, 'posicoesPerdidas: incidente === undefined ? null : quemPassou(resultado, replay, incidente),', 'posicoesPerdidas: incidente === undefined ? 0 : quemPassou(resultado, replay, incidente),'],
  ['punicao-sem-frase-propria', NAR, "if (evento.tipo === 'investigacao') return ` e levou +${segundos(tempoPerdidoMs)} s`;", ''],
  ['posicao-no-plural', NAR, "posicoesPerdidas === 1 ? 'posição' : 'posições'", "'posições'"],
  ['zero-posicoes-escrito', NAR, 'if (posicoesPerdidas === null || posicoesPerdidas === 0) return tempo;', 'if (posicoesPerdidas === null) return tempo;'],
  ['evento-sem-chegada-narrado', NAR, 'if (momento === null) continue;', 'if (momento === null) { narradas.push({ evento, frase: "", instante: 0, tempoPerdidoMs: null, posicoesPerdidas: null, foiParaOsBoxes: false }); continue; }'],
  ['instante-da-punicao', NAR, 'return chegada === undefined ? null : { instante: chegada.instante };', 'return chegada === undefined ? null : { instante: 0 };'],
  ['instante-da-quebra', NAR, 'return abandono === undefined ? null : { instante: abandono.instante };', 'return abandono === undefined ? null : { instante: 0 };'],
  ['frase-com-perdeu-tempo', NAR, "'alargou demais',", "'alargou demais e perdeu tempo',"],
  ['ano-sempre', VIEW, '(vezes.get(piloto.nome) ?? 0) > 1 ? `${piloto.nome} ${piloto.ano}` : piloto.nome', '`${piloto.nome} ${piloto.ano}`'],
  ['ano-nunca', VIEW, '(vezes.get(piloto.nome) ?? 0) > 1 ? `${piloto.nome} ${piloto.ano}` : piloto.nome', 'piloto.nome'],
  ['sem-numero-na-copia', VIEW, 'rotulos.set(jogadorId, vez === 1 ? base : `${base} (${vez})`);', 'rotulos.set(jogadorId, base);'],
  ['ordem-de-criacao', VIEW, 'of [...pilotos].sort((a, b) => (a.jogadorId < b.jogadorId ? -1 : 1))', 'of pilotos'],
  ['painel-com-id', TELA, '<span className="classificacao-ao-vivo__nome">{nomeNoPainel(item.jogadorId)}</span>', '<span className="classificacao-ao-vivo__nome">{nomeDoJogadorId(state, item.jogadorId)}</span>'],
  ['painel-humano-vira-piloto', TELA, 'ehHumanoId(state, jogadorId) ? nomeDoJogadorId(state, jogadorId) : (pilotos.get(jogadorId) ?? jogadorId)', '(pilotos.get(jogadorId) ?? jogadorId)'],
  ['ticker-na-volta-do-lider', TELA, '.filter((narrada) => narrada.instante <= tempoSimMs)', '.filter((narrada) => narrada.evento.volta <= volta)'],
  ['ticker-sem-destaque', TELA, '<span className="ticker-eventos__piloto">{pilotos.get(evento.jogadorId) ?? \'?\'}</span>', "{pilotos.get(evento.jogadorId) ?? '?'}"],
  ['ticker-sem-jogador', TELA, "{ehHumanoId(state, evento.jogadorId) && ` (${nomeDoJogadorId(state, evento.jogadorId)})`} {frase}", '{frase}'],
  ['ticker-sem-consequencia', TELA, "{consequencia !== '' && <span className=\"ticker-eventos__consequencia\">{consequencia}</span>}", ''],
  ['tela-sem-boxes', TELA, '{foiParaOsBoxes && <span className="ticker-eventos__pit"> e foi para os boxes</span>}', ''],
  ['reduzido-com-guinada', TELA, 'const guinada = movimentoReduzido ? 0 : guinadaNoInstante(', 'const guinada = guinadaNoInstante('],
  ['reduzido-com-efeito', TELA, '{!movimentoReduzido &&\n                efeitosNoInstante', '{efeitosNoInstante'],
  ['tela-sem-guinada', TELA, 'rotate(${(rumo + guinada).toFixed(1)})', 'rotate(${rumo.toFixed(1)})'],
  ['spray-no-carro-parado', TELA, 'parou: replay.chegou(item.jogadorId, tempoSimMs) || replay.parado(item.jogadorId, tempoSimMs),', 'parou: replay.chegou(item.jogadorId, tempoSimMs),'],
  ['congelado-sem-abandono', TELA, "abandonou ? 'tracado-svg__carro--congelado' : ''", "''"],
  ['efeito-sem-opacidade', CARRO, 'opacity={(1 - idade).toFixed(2)}', ''],
  ['efeito-sem-crescer', CARRO, 'const cresce = 1 + idade * CRESCIMENTO_EFEITO;', 'const cresce = 1;'],
  ['css-sem-fumaca', CSS, '.tracado-svg__efeito--fumaca {\n  fill: var(--pista-limite);', '.tracado-svg__efeito--fumaca {\n  fill: var(--primaria);'],
];

const TESTES = [
  'src/ui/incidentes-replay.test.ts',
  'src/ui/narracao.test.ts',
  'src/ui/tela-corrida-render.test.ts',
  'src/ui/fim-da-corrida.test.ts',
  'src/ui/loadout-view.test.ts',
  'src/ui/fluxo-corrida.test.ts',
  'src/ui/diferenca-lider.test.ts',
];
const LIMITE_MS = 120_000;

const rodar = () =>
  new Promise((resolver, rejeitar) => {
    const filho = spawn('npx', ['vitest', 'run', ...TESTES, '--bail=1'], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '';
    filho.stdout.on('data', (d) => (saida += d));
    filho.stderr.on('data', (d) => (saida += d));
    let estourou = false;
    const limite = setTimeout(() => {
      estourou = true;
      spawnSync('taskkill', ['/PID', String(filho.pid), '/T', '/F'], { stdio: 'ignore' });
    }, LIMITE_MS);
    filho.on('error', rejeitar);
    filho.on('close', (status) => {
      clearTimeout(limite);
      resolver({ status, estourou, saida: saida.replace(/\x1b\[[0-9;]*m/g, '') });
    });
  });

const controle = await rodar();
if (controle.status !== 0 || controle.estourou) throw new Error('controle sem mutação não passou: nada a medir');

const JSON_SAIDA = 'docs/pr2d-mutacoes.json';
const indiceFatia = process.argv.indexOf('--fatia');
const [de_, ate_] = indiceFatia === -1 ? [0, MUTACOES.length] : process.argv[indiceFatia + 1].split('-').map(Number);
const resultado = de_ === 0 ? [] : JSON.parse(readFileSync(JSON_SAIDA, 'utf8'));
for (const [nome, arquivo, de, para] of MUTACOES.slice(de_, ate_)) {
  const cru = readFileSync(arquivo, 'utf8');
  const crlf = cru.includes('\r\n');
  const original = crlf ? cru.replace(/\r\n/g, '\n') : cru;
  if (!original.includes(de)) throw new Error(`trecho não encontrado: ${nome}`);
  const mutado = original.replace(de, () => para);
  writeFileSync(arquivo, crlf ? mutado.replace(/\n/g, '\r\n') : mutado);
  try {
    const r = await rodar();
    const falha = r.saida.match(/^ FAIL +(.*)$/m)?.[1] ?? null;
    const detectada = r.status !== 0 && falha !== null;
    if (!r.estourou && r.status !== 0 && falha === null) throw new Error(`vitest caiu sem falha nomeada: ${nome}`);
    resultado.push({ nome, detectada, travou: r.estourou, falha });
    const rotulo = r.estourou ? 'TRAVOU    ' : detectada ? 'DETECTADA ' : 'SOBREVIVEU';
    console.log(`${rotulo} ${nome}${falha ? ` | ${falha.slice(0, 110)}` : ''}`);
  } finally {
    writeFileSync(arquivo, cru);
  }
  writeFileSync(JSON_SAIDA, `${JSON.stringify(resultado, null, 2)}\n`);
}
console.log(`${resultado.filter((m) => m.detectada).length}/${resultado.length} detectadas, ${resultado.filter((m) => m.travou).length} travaram, de ${MUTACOES.length}`);
