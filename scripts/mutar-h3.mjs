/**
 * Harness de MUTAÇÃO do PR H3 (S7 — teto de `sincronizar` por conexão).
 *
 * 🔒 **Rastreado em disco por regra** (2026-08-30: "ou o script fica rastreado
 * ou o número não vale"). Segue o `scripts/mutar-h2.mjs`, inclusive na lição
 * que o H2 pagou: **lista os NOMES dos testes que caem**, não só o `exit`.
 * Com só o código de saída, uma mutação que derruba o teste ERRADO é
 * indistinguível de uma que derruba o certo.
 *
 * Uso: node scripts/mutar-h3.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CASCA = 'party/sala.ts';
const PURO = 'src/net/teto-sincronizar.ts';

/** Cada mutação: onde, o que troca por o quê, e que suíte deve acusar. */
const MUTACOES = [
  {
    id: 'M1',
    desc: 'teto deixa de ser consultado (limitador off)',
    arquivo: CASCA,
    de: "if (this.recusarSincronizar(message, connection.id, Date.now())) return;",
    para: "void this.recusarSincronizar(message, connection.id, Date.now());",
    suite: 'party',
  },
  {
    id: 'M2',
    desc: 'o teto vira 2 em vez de 1 (off-by-one da rajada)',
    arquivo: PURO,
    de: 'permitido: contagem <= TETO_SINCRONIZAR,',
    para: 'permitido: contagem <= TETO_SINCRONIZAR + 1,',
    suite: 'ambas',
  },
  {
    id: 'M3',
    desc: 'a janela NUNCA expira (limite vira BANIMENTO)',
    arquivo: PURO,
    de: 'const expirou = balde === null || agora - balde.inicio >= JANELA_SINCRONIZAR_MS;',
    para: 'const expirou = balde === null;',
    suite: 'npm',
  },
  {
    id: 'M4',
    desc: 'a recusa REINICIA a janela',
    arquivo: PURO,
    de: 'balde: { inicio: balde.inicio, contagem },',
    para: 'balde: { inicio: agora, contagem },',
    suite: 'npm',
  },
  {
    id: 'M5',
    desc: 'o mapa de baldes NAO encolhe no onClose (vazamento)',
    arquivo: CASCA,
    de: 'this.baldesSincronizar.delete(connection.id);',
    para: 'void connection.id;',
    suite: 'ambas',
  },
];

function rodar(cmd) {
  try {
    const saida = execFileSync('npx', cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    return { exit: 0, saida };
  } catch (e) {
    return { exit: e.status ?? 1, saida: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const SUITES = {
  npm: ['vitest', 'run', '--reporter=verbose'],
  party: ['vitest', 'run', '--config', 'vitest.party.config.ts', '--reporter=verbose'],
};

/** Placar + nomes dos testes que falharam. */
function resumir(r) {
  const placar = /Tests\s+(.*)/.exec(r.saida)?.[1]?.trim() ?? '(placar não capturado)';
  const nomes = [...r.saida.matchAll(/^\s*[×x]\s+(.+?)(?:\s+\d+ms)?$/gm)]
    .map((m) => m[1].trim())
    .filter((n) => n.length > 0);
  return { placar, nomes };
}

function medir(rotulo, chaves) {
  const linhas = [];
  for (const chave of chaves) {
    const r = rodar(SUITES[chave]);
    const { placar, nomes } = resumir(r);
    linhas.push(`      [${chave}] exit=${r.exit}  ${placar}`);
    for (const n of nomes.slice(0, 6)) linhas.push(`         ↳ ${n}`);
  }
  return linhas;
}

const chavesDe = (s) => (s === 'ambas' ? ['npm', 'party'] : [s]);

console.log('=== CONTROLE (sem mutação) ===');
for (const l of medir('controle', ['npm', 'party'])) console.log(l);

for (const m of MUTACOES) {
  const antes = readFileSync(m.arquivo, 'utf8');
  if (!antes.includes(m.de)) {
    console.log(`\n${m.id}  ${m.desc}\n      ⛔ ALVO NÃO ENCONTRADO em ${m.arquivo} — mutação NÃO aplicada`);
    continue;
  }
  writeFileSync(m.arquivo, antes.replace(m.de, m.para));
  console.log(`\n${m.id}  ${m.desc}   (${m.arquivo})`);
  try {
    for (const l of medir(m.id, chavesDe(m.suite))) console.log(l);
  } finally {
    writeFileSync(m.arquivo, antes);
  }
}

console.log('\n=== REVERSÃO — conferida, não presumida ===');
for (const l of medir('reversao', ['npm', 'party'])) console.log(l);
