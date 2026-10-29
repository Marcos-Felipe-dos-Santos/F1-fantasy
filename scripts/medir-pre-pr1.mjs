/** Auditoria somente leitura, anterior à trilha visual de 2026-10-18.
 * node scripts/medir-pre-pr1.mjs [--ci]
 * Usa árvores Git fixas; não faz checkout, publicação nem alteração de dados.
 * --ci consulta apenas metadados/anotações públicos do GitHub, sem credenciais.
 * Requer npm run build para a inspeção do dist local. Não despeja datasets.
 */
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const antes = '9600c5359e8f0aeb58ece37db278992c47679b49^';
const depois = '9600c5359e8f0aeb58ece37db278992c47679b49';
const base = 'ef8c52093825aaeaa122493ea00924d682b6f3b2';
const git = (...args) =>
  execFileSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
    .replace(/\r\n/g, '\n');
const ler = (ref, arquivo) => git('show', `${ref}:${arquivo}`);
const arquivos = (ref) => git('ls-tree', '-r', '--name-only', ref).trim().split('\n');
const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');

// Mesmo algoritmo e mesma ordenação da cerca versao.test.ts, conferidos por ref.
function hashTexto(texto) {
  let h = 1779033703 ^ texto.length;
  for (let i = 0; i < texto.length; i++) {
    h = Math.imul(h ^ texto.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function versao(ref) {
  const lista = arquivos(ref);
  const fontes = [
    ...lista.filter((n) => n.startsWith('src/engine/') && n.endsWith('.ts') &&
      !n.endsWith('.test.ts') && !n.endsWith('/versao.ts')).sort(),
    ...lista.filter((n) => n.startsWith('src/data/') && n.endsWith('.json')).sort(),
    'src/net/cliente.ts', 'src/net/hash-draft.ts',
  ];
  let acumulado = 0;
  for (const arquivo of fontes) {
    acumulado = hashTexto(`${acumulado}:${arquivo.slice(3)}:${hashTexto(ler(ref, arquivo))}`);
  }
  return {
    ref,
    app: ler(ref, 'src/engine/versao.ts').match(/VERSAO_APP = '([^']+)'/)[1],
    registrado: ler(ref, 'src/engine/versao.test.ts').match(/DIGEST_REGISTRADO = '([^']+)'/)[1],
    recalculado: acumulado.toString(16).padStart(8, '0'),
    fontes,
  };
}

// Caminho + valor de CADA folha numérica: preserva também ordem dos arrays.
function numeros(valor, caminho = '') {
  if (typeof valor === 'number') return [[caminho, valor]];
  if (!valor || typeof valor !== 'object') return [];
  return Object.entries(valor).flatMap(([chave, item]) => numeros(item, `${caminho}/${chave}`));
}

const dados = ['src/data', 'src/fixtures/dataset-semente'].flatMap((dir) =>
  ['equipe-anos', 'pecas', 'pistas'].map((nome) => `${dir}/${nome}.json`));
const fatos = JSON.parse(ler(base, 'scripts/derived/fatos-agregados.json'));
const agulhas = [...new Set([
  ...fatos.equipes.flatMap((e) => [e.nome, e.constructorId]),
  ...fatos.titulares.flatMap((p) => [p.nome, p.driverId]),
])];

function contar(texto, agulha) {
  let total = 0;
  let inicio = 0;
  for (;;) {
    const i = texto.indexOf(agulha, inicio);
    if (i < 0) return total;
    const fim = i + agulha.length;
    if ((i === 0 || !/[\p{L}\p{N}_]/u.test(texto[i - 1])) &&
      (fim === texto.length || !/[\p{L}\p{N}_]/u.test(texto[fim]))) total++;
    inicio = i + 1;
  }
}

const conteudos = arquivos(base).filter((nome) =>
  /\.(md|ts|tsx|css|html|json|jsonc|mjs|py|yml|yaml|txt|toml|svg)$/.test(nome) &&
  !/(^|\/)(\.env(?:\.|$)|[^/]*(?:secret|credential|private.key)[^/]*)/i.test(nome) &&
  nome !== '.claude/settings.json');
const rename = conteudos.flatMap((arquivo) => {
  const texto = ler(base, arquivo);
  const acertos = [...texto.matchAll(/f1[ _-]+fantasy/gi)];
  return acertos.length ? [{
    arquivo, ocorrencias: acertos.length,
    linhas: [...new Set(acertos.map((m) => texto.slice(0, m.index).split('\n').length))],
  }] : [];
});

const tracados = ler(base, 'src/ui/tracados.ts');
const fluxo = ler(base, 'src/ui/fluxo-corrida.ts');
const pistas = JSON.parse(ler(base, 'src/data/pistas.json'));
const registro = tracados.match(/export const TRACADOS_POR_PISTA[^=]*= \{([\s\S]*?)\n\};/)[1];
const boxes = [...registro.matchAll(/'(pista-[^']+)': (TRACADO_[A-Z_]+)/g)].map((m) => {
  const fonte = m[2] === 'TRACADO_GENERICO' ? fluxo : tracados;
  const trecho = fonte.match(new RegExp(`(?:export )?const ${m[2]}: TracadoImutavel = \\[([\\s\\S]*?)\\n\\];`));
  if (!trecho) throw new Error(`Traçado não localizado: ${m[2]}`);
  return { pistaId: m[1], nome: pistas.find((p) => p.id === m[1]).nome,
    pontosControle: [...trecho[1].matchAll(/\{ x: [\d.-]+, y: [\d.-]+ \}/g)].length };
});

function arquivosLocais(dir) {
  return readdirSync(dir).sort().flatMap((nome) => {
    const caminho = join(dir, nome);
    return statSync(caminho).isDirectory() ? arquivosLocais(caminho) : [caminho];
  });
}
const dist = arquivosLocais(join(raiz, 'dist'));
const imagens = dist.filter((n) => /\.(svg|png|jpe?g|webp|gif|ico|avif)$/i.test(n));
const textos = dist.filter((n) => /\.(js|css|html)$/i.test(n)).map((n) => readFileSync(n, 'utf8')).join('\n');

const resultado = {
  base, restauracao: { antes: versao(antes), depois: versao(depois) },
  arquivosMesmoCommit: git('diff', '--name-only', antes, depois).trim().split('\n'),
  universoAgulhas: agulhas.length,
  dados: dados.map((arquivo) => ({ arquivo, medicoes: [antes, depois].map((ref) => {
    const texto = ler(ref, arquivo);
    const parsed = JSON.parse(texto);
    return { ref, registros: parsed.length,
      ocorrenciasReais: agulhas.reduce((n, a) => n + contar(texto, a), 0),
      assinaturaNumerica: sha256(JSON.stringify(numeros(parsed))) };
  }) })),
  tabelaFicticiaInalterada: git('diff', antes, depois, '--', 'scripts/nomes-ficticios.json') === '',
  fixtureComparadaAoOriginal: (() => {
    const arquivo = 'src/fixtures/dataset-semente/equipe-anos.json';
    const original = ler('cd9d5b7^', arquivo);
    const atual = ler(base, arquivo);
    return {
      refOriginal: git('rev-parse', 'cd9d5b7^').trim(),
      totalOriginal: agulhas.reduce((n, a) => n + contar(original, a), 0),
      totalAtual: agulhas.reduce((n, a) => n + contar(atual, a), 0),
      deltaAgulhas: agulhas.map((agulha) => ({ agulha,
        antes: contar(original, agulha), depois: contar(atual, agulha) }))
        .filter((a) => a.antes !== a.depois),
      deltaApenasSlugRedBull: agulhas.reduce((n, a) =>
        n + contar(atual, a) - contar(atual.replaceAll('red-bull', 'redbull'), a), 0),
    };
  })(),
  rename: { arquivos: rename, totalArquivos: rename.length,
    totalOcorrencias: rename.reduce((n, r) => n + r.ocorrencias, 0),
    arquivosComNomeAntigo: arquivos(base).filter((n) => /f1[ _-]+fantasy/i.test(n)),
    remoto: git('remote', 'get-url', 'origin').trim(),
    excluidos: ['.claude/settings.json', '.env/credenciais', 'binários', 'arquivos ignorados/não versionados'],
  },
  boxes: { pistas: boxes, totalPistas: pistas.length,
    definicaoPitEmTracados: /(?:const|interface|type|export)\s+\w*(?:pit|box)\w*/i.test(tracados),
    maqueteTemDPit: /const D_PIT =/.test(ler(base, 'src/ui/MockPista.tsx')),
    replayUsaMaquete: /D_PIT|MockPista/.test(ler(base, 'src/ui/TelaCorrida.tsx')) },
  bundle: { arquivos: dist.map((n) => ({ arquivo: relative(raiz, n).replace(/\\/g, '/'),
    sha256: sha256(readFileSync(n)) })),
    imagens: imagens.map((n) => relative(raiz, n)),
    dataImage: [...textos.matchAll(/data:image\//gi)].length,
    urlsDeImagem: [...textos.matchAll(/https?:\/\/[^\s"'<>]+\.(?:png|svg|jpe?g|webp|gif|avif)/gi)].length,
    aviso: 'Contagens de recursos não reconhecem semanticamente logos/liveries desenhados em SVG/CSS; exigem revisão das formas.' },
};

// Guardas contra medição vazia ou alteração acidental do recorte histórico.
assert.equal(resultado.restauracao.antes.recalculado, resultado.restauracao.antes.registrado);
assert.equal(resultado.restauracao.depois.recalculado, resultado.restauracao.depois.registrado);
assert.equal(agulhas.length, 909);
assert.equal(resultado.fixtureComparadaAoOriginal.totalOriginal, 243);
assert.equal(resultado.fixtureComparadaAoOriginal.totalAtual, 254);
assert.equal(resultado.fixtureComparadaAoOriginal.deltaApenasSlugRedBull, 0);
assert.deepEqual(dados.map((_, i) => resultado.dados[i].medicoes[1].ocorrenciasReais),
  [9237, 19, 2, 254, 19, 2]);
assert.equal(rename.length, 33);
assert.equal(resultado.rename.totalOcorrencias, 66);
assert.equal(boxes.length, pistas.length);
assert.equal(boxes.length, 10);
assert.ok(boxes.every((p) => p.pontosControle > 30));
for (const dado of resultado.dados) {
  assert.equal(dado.medicoes[0].assinaturaNumerica, dado.medicoes[1].assinaturaNumerica);
}

if (process.argv.includes('--ci')) {
  resultado.ci = [];
  for (const id of [39052585050, 39052613842, 39052791341, 39052793966,
    39053003826, 39053008495, 39053132098]) {
    const api = 'https://api.github.com/repos/Marcos-Felipe-dos-Santos/F1-fantasy';
    const obter = async (url) => {
      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error(`${resposta.status}: ${url}`);
      return resposta.json();
    };
    const run = await obter(`${api}/actions/runs/${id}`);
    const jobs = await obter(`${api}/actions/runs/${id}/jobs`);
    const falhas = [];
    for (const job of jobs.jobs.filter((j) => j.conclusion === 'failure')) {
      const anotacoes = await obter(`${job.check_run_url}/annotations`);
      falhas.push(...anotacoes.filter((a) => a.path === 'party/comandos.test.ts')
        .map((a) => ({ arquivo: a.path, linha: a.start_line, mensagem: a.message })));
    }
    resultado.ci.push({ id, sha: run.head_sha, evento: run.event,
      conclusao: run.conclusion, url: run.html_url, falhas });
  }
}
console.log(JSON.stringify(resultado, null, 2));
