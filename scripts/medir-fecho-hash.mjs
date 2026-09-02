/**
 * Mede o FECHO TRANSITIVO de quem alimenta `hashDoDraft` e `hashDaCorrida`, e
 * o cruza com os arquivos de um diff. Nasceu no PR H4, a pedido do dev, para
 * transformar em MEDIÇÃO o argumento do não-bump de `VERSAO_APP`.
 *
 * 🔒 **Rastreado por regra** (2026-08-30: "ou o script fica rastreado ou o
 * número não vale"). O não-bump vai virar afirmação no `ESTADO.md`; sem este
 * arquivo, a próxima sessão teria o veredito sem o meio de refazê-lo — que é
 * exatamente a dívida que o `mutar.py` do H1 registrou.
 *
 * ---
 *
 * 🔑 **A DISTINÇÃO QUE FAZ A MEDIDA VALER: CHAMAR ≠ ALIMENTAR.**
 * `src/ui/useSalaOnline.ts` **chama** os dois hashes (`:266` e `:445`) e está
 * no diff do H4. Se o critério fosse "cita o hash", ele acusaria vermelho e o
 * vermelho seria falso: o que entra na função são os ARGUMENTOS
 * (`cliente.draft` e `alvo.corrida`), e quem os produz é outro arquivo.
 *
 * Por isso as RAÍZES são quatro, não duas: as duas funções de hash **mais os
 * dois produtores dos argumentos**. Medir só as funções responderia "o cálculo
 * mudou?" e deixaria de fora "o dado mudou?", que é a metade que interessa.
 *
 * ⚠️ **O que este script NÃO prova.** Ele segue IMPORTS. Um arquivo pode mudar o
 * valor hasheado sem aparecer aqui se o fizer por mutação de objeto
 * compartilhado ou por injeção em runtime. É limite declarado, não coberto —
 * a leitura do diff continua sendo obrigatória.
 *
 * Uso: node scripts/medir-fecho-hash.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';

/**
 * As quatro raízes.
 * - `hash-draft.ts` / `hash-corrida.ts` — o CÁLCULO.
 * - `cliente.ts` — produz `cliente.draft`, o argumento de `hashDoDraft`
 *   (`sincronizarDraft`).
 * - `corrida-online.ts` — produz `alvo.corrida`, o argumento de `hashDaCorrida`
 *   (`corridaDaSala` / `alvoDoAtestado`).
 */
const RAIZES = [
  'src/net/hash-draft.ts',
  'src/net/hash-corrida.ts',
  'src/net/cliente.ts',
  'src/ui/corrida-online.ts',
];

const EXTENSOES = ['.ts', '.tsx', '.json', '/index.ts', '/index.tsx'];

function resolver(base, especificador) {
  if (!especificador.startsWith('.')) return null; // pacote externo
  const bruto = normalize(join(dirname(base), especificador));
  if (existsSync(bruto) && !existsSync(join(bruto, 'x'))) {
    try {
      if (readFileSync(bruto)) return bruto;
    } catch {
      /* diretório */
    }
  }
  for (const ext of EXTENSOES) {
    const tentativa = `${bruto}${ext}`;
    if (existsSync(tentativa)) return tentativa;
  }
  return null;
}

/**
 * Especificadores do arquivo, cada um marcado como aresta de VALOR ou de TIPO.
 *
 * 🔑 **A distinção é o coração desta medição, e ela NASCEU DE UM VERMELHO.** A
 * primeira versão deste script seguia qualquer import e acusou
 * `src/net/protocolo.ts` no fecho — bandeira vermelha — porque
 * `src/net/cliente.ts:30` o importa. **Mas a linha é
 * `import type { MensagemServidor } from './protocolo'`: aresta de TIPO,
 * APAGADA em runtime.** Tipo não entra em hash nenhum: não existe no bundle.
 *
 * ✅ **O veredito foi CONFIRMADO empiricamente antes de o script ser
 * refinado** — sonda que computa `hashDoDraft` e `hashDaCorrida` sobre fixtures
 * fixas, rodada com o `protocolo.ts` do `HEAD` e com o do H4:
 *
 *     HEAD  → draft 9fb2d2066267193e · corrida eb7a9e837d554deb
 *     H4    → draft 9fb2d2066267193e · corrida eb7a9e837d554deb   (idênticos)
 *
 * E com **anti-vacuidade**: perturbando as fixtures (`peca-a`→`peca-XX`,
 * `pista-monza`→`pista-spa`) os dois hashes MUDAM
 * (`42d6873ad1a0a7f3` · `3ba840f199e1a654`), o que prova que a sonda enxerga.
 * **Sem essa segunda metade, "os hashes não mudaram" seria compatível com uma
 * sonda que não mede nada.**
 *
 * ⚠️ `import { type X }` (especificador de tipo inline, misto) conta como
 * VALOR de propósito — é conservador na direção segura.
 */
function importsDe(arquivo) {
  const fonte = readFileSync(arquivo, 'utf8');
  const achados = [];
  const padroes = [
    { re: /(?:^|\n)\s*import\s+type\s+[^'"]*?from\s*['"]([^'"]+)['"]/g, tipo: true },
    { re: /(?:^|\n)\s*export\s+type\s+[^'"]*?from\s*['"]([^'"]+)['"]/g, tipo: true },
    { re: /(?:^|\n)\s*import\s+(?!type\s)[^'"]*?from\s*['"]([^'"]+)['"]/g, tipo: false },
    { re: /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g, tipo: false },
    { re: /(?:^|\n)\s*export\s+(?!type\s)[^'"]*?from\s*['"]([^'"]+)['"]/g, tipo: false },
    { re: /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, tipo: false },
  ];
  for (const { re, tipo } of padroes) {
    for (const m of fonte.matchAll(re)) achados.push({ esp: m[1], tipo });
  }
  return achados;
}

/** Percorre o grafo. `soValor=true` ignora arestas de tipo (apagadas em runtime). */
function fecharDe(raizes, soValor) {
  const vistos = new Set();
  const fila = [...raizes];
  while (fila.length > 0) {
    const atual = fila.shift().replace(/\\/g, '/');
    if (vistos.has(atual)) continue;
    if (!existsSync(atual)) {
      console.log(`⛔ raiz/dep inexistente: ${atual}`);
      continue;
    }
    vistos.add(atual);
    for (const { esp, tipo } of importsDe(atual)) {
      if (soValor && tipo) continue;
      const alvo = resolver(atual, esp);
      if (alvo !== null) fila.push(relative('.', alvo).replace(/\\/g, '/'));
    }
  }
  return vistos;
}

/** O que de fato ALIMENTA os hashes: só arestas que existem em runtime. */
const fecho = fecharDe(RAIZES, true);
/** O grafo inteiro, tipos incluídos — serve para mostrar a diferença. */
const fechoComTipos = fecharDe(RAIZES, false);

/** Arquivos do diff: modificados, staged e não-rastreados. */
function arquivosDoDiff() {
  const saida = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' });
  return saida
    .split('\n')
    .map((l) => l.slice(3).trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/\\/g, '/'));
}

const diff = arquivosDoDiff();
/** Teste não é servido nem hasheado — fora da pergunta. */
const ehTeste = (f) => /\.test\.tsx?$/.test(f) || f.endsWith('.mjs');
const diffProducao = diff.filter((f) => !ehTeste(f));

console.log(`\n=== FECHO DE RUNTIME das ${RAIZES.length} raízes: ${fecho.size} arquivos ===`);
for (const f of [...fecho].sort()) console.log(`   ${f}`);

const soPorTipo = [...fechoComTipos].filter((f) => !fecho.has(f)).sort();
console.log(`\n=== alcançados SÓ por aresta de TIPO (apagados em runtime): ${soPorTipo.length} ===`);
for (const f of soPorTipo) console.log(`   ~ ${f}`);

console.log(`\n=== ARQUIVOS DE PRODUÇÃO NO DIFF: ${diffProducao.length} ===`);
for (const f of diffProducao.sort()) console.log(`   ${f}`);

// 🔴 **ANTI-VACUIDADE DO PRÓPRIO SCRIPT.** Ele lê `git status`, ou seja, só
// trabalho NÃO COMMITADO. Rodado depois do commit, `diffProducao` fica vazio e
// a interseção sai vazia — imprimindo "✅ nenhum arquivo alimenta os hashes",
// **verdadeiro por vacuidade**. Para uma ferramenta cuja razão de existir é
// permitir refazer a medição depois, isso é o avesso do pretendido: entrega o
// carimbo sem a medição. Falha ALTO em vez de mentir baixo.
// 📌 Para medir um PR já commitado, compare contra a base:
//     git diff --name-only <base>...HEAD
// e passe a lista — hoje não implementado, e dito em vez de fingido.
if (diffProducao.length === 0) {
  console.log('\n🔴 NADA A MEDIR: não há arquivo de produção modificado em `git status`.');
  console.log('   Se o PR já foi commitado, este script NÃO o mede — ver o comentário no');
  console.log('   código. Saída vazia aqui NÃO é evidência de que o não-bump se sustenta.');
  process.exitCode = 2;
  process.exit();
}

const intersecao = diffProducao.filter((f) => fecho.has(f));

console.log('\n=== INTERSEÇÃO (o que ALIMENTA algum dos dois hashes) ===');
if (intersecao.length === 0) {
  console.log('   (vazia)');
  console.log('\n✅ NENHUM arquivo de produção do diff está no fecho dos hashes.');
  console.log('   O não-bump de VERSAO_APP está MEDIDO por este critério.');
} else {
  console.log('\n🔴 BANDEIRA VERMELHA — estes arquivos do diff alimentam um hash de protocolo:');
  for (const f of intersecao) console.log(`   🔴 ${f}`);
  console.log('\n   O não-bump NÃO se sustenta. Ver o C1 do 3.5.4.');
}

// Contraprova: os dois arquivos que moveram o hash do bundle.
console.log('\n=== CONTRAPROVA — os dois que MUDARAM O BUNDLE ===');
for (const alvo of ['src/net/conexao.ts', 'src/ui/useSalaOnline.ts']) {
  const dentro = fecho.has(alvo);
  console.log(`   ${dentro ? '🔴' : '✅'} ${alvo}  ${dentro ? 'ESTÁ no fecho' : 'fora do fecho'}`);
}

process.exitCode = intersecao.length === 0 ? 0 : 1;
