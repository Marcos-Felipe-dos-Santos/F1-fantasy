/**
 * Harness de MUTAÇÃO do PR H4 (S5 CSP · S15 jitter · S3 teto de comandos).
 *
 * 🔒 **Rastreado em disco por regra** (2026-08-30: "ou o script fica rastreado
 * ou o número não vale"). Terceiro do projeto, depois de `mutar-h2.mjs` e
 * `mutar-h3.mjs`, e mantém a lição que o H2 pagou: **lista os NOMES dos testes
 * que caem**, não só o `exit`. Com só o código de saída, uma mutação que derruba
 * o teste ERRADO é indistinguível de uma que derruba o certo.
 *
 * ⚠️ **O H4 tem um alvo que os anteriores não tinham: o `dist/`.** A CSP não
 * está em nenhum arquivo fonte servido — ela é injetada no build —, então as
 * mutações de S5 são sobre o PLUGIN e sobre a política, e quem as acusa é
 * `scripts/csp.test.ts`, dentro do `npm test`.
 *
 * Uso: node scripts/mutar-h4.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CASCA = 'party/sala.ts';
const COMANDOS = 'src/net/teto-comandos.ts';
const JITTER = 'src/net/jitter-reconexao.ts';
const CSP = 'scripts/csp.ts';
const PROTOCOLO = 'src/net/protocolo.ts';

/** Cada mutação: onde, o que troca por o quê, e que suíte deve acusar. */
const MUTACOES = [
  // ---- S3: o teto de comandos inbound -------------------------------------
  {
    id: 'M1',
    desc: 'S3 — teto deixa de ser consultado (limitador off)',
    arquivo: CASCA,
    de: "if (tipo !== 'sincronizar' && this.recusarPorTetoDeComandos(connection.id, Date.now())) {",
    para: "if (false && this.recusarPorTetoDeComandos(connection.id, Date.now())) {",
    suite: 'party',
  },
  {
    id: 'M2',
    desc: 'S3 — o teto vira 21 em vez de 20 (off-by-one)',
    arquivo: COMANDOS,
    de: 'permitido: contagem <= TETO_COMANDOS,',
    para: 'permitido: contagem <= TETO_COMANDOS + 1,',
    suite: 'npm',
  },
  {
    id: 'M3',
    desc: 'S3 — a janela NUNCA expira (limite vira BANIMENTO)',
    arquivo: COMANDOS,
    de: 'const expirou = balde === null || agora - balde.inicio >= JANELA_COMANDOS_MS;',
    para: 'const expirou = balde === null;',
    suite: 'npm',
  },
  {
    id: 'M4',
    desc: 'S3 — a recusa REINICIA a janela',
    arquivo: COMANDOS,
    de: 'balde: { inicio: balde.inicio, contagem },',
    para: 'balde: { inicio: agora, contagem },',
    suite: 'npm',
  },
  {
    id: 'M5',
    desc: 'S3 — o mapa de baldes NAO encolhe no onClose (vazamento por churn)',
    arquivo: CASCA,
    de: 'this.baldesComandos.delete(connection.id);',
    para: 'void connection.id;',
    suite: 'party',
  },
  {
    id: 'M6',
    desc: 'S3 — a recusa CALA (uniformiza com o H3 e some com a jogada)',
    arquivo: CASCA,
    de: "connection.send(JSON.stringify({ tipo: 'erro', erro: 'comandos-demais' }));",
    para: '/* mutação: recusa silenciosa */',
    suite: 'party',
  },
  {
    id: 'M7',
    desc: 'S3 — `comandos-demais` passa a APAGAR o token de reentrada',
    arquivo: PROTOCOLO,
    de: "return erro === 'token-invalido' || erro === 'sala-inexistente';",
    para:
      "return erro === 'token-invalido' || erro === 'sala-inexistente' || erro === 'comandos-demais';",
    suite: 'npm',
  },
  // ---- S15: o jitter da reconexão -----------------------------------------
  {
    id: 'M8',
    desc: 'S15 — jitter SIMÉTRICO: passa a ANTECIPAR metade das tentativas',
    arquivo: JITTER,
    de: 'return Math.round(espera * (1 + sorteio * FATOR_JITTER));',
    para: 'return Math.round(espera * (1 - FATOR_JITTER / 2 + sorteio * FATOR_JITTER));',
    suite: 'npm',
  },
  {
    id: 'M9',
    desc: 'S15 — o sorteio é IGNORADO (jitter inerte, todos voltam juntos)',
    arquivo: JITTER,
    de: 'return Math.round(espera * (1 + sorteio * FATOR_JITTER));',
    para: 'return Math.round(espera * (1 + 0 * FATOR_JITTER));',
    suite: 'npm',
  },
  {
    id: 'M10',
    desc: 'S15 — jitter ANTES do clamp: o degrau saturado deixa de espalhar',
    arquivo: JITTER,
    de: 'const indice = Math.min(Math.max(tentativa, 0), ESPERAS_MS.length - 1);\n  return comJitter(ESPERAS_MS[indice], sorteio);',
    para:
      'const indice = Math.min(Math.max(tentativa, 0), ESPERAS_MS.length - 1);\n  return Math.min(comJitter(ESPERAS_MS[indice], sorteio), ESPERAS_MS[ESPERAS_MS.length - 1]);',
    suite: 'npm',
  },
  // ---- S5: a CSP ----------------------------------------------------------
  {
    id: 'M11',
    desc: "S5 — o plugin passa a rodar SEMPRE (apply removido) e quebra o dev",
    arquivo: CSP,
    de: "    apply: 'build',",
    para: '',
    suite: 'npm',
  },
  {
    id: 'M12',
    desc: 'S5 — `injetarCsp` degrada em SILÊNCIO quando não há <head>',
    arquivo: CSP,
    de: '  if (i === -1) {\n    throw new Error(',
    para: '  if (i === -1) return html;\n  if (false) {\n    throw new Error(',
    suite: 'npm',
  },
  {
    id: 'M13',
    desc: "S5 — `style-src` ganha 'unsafe-inline' (a saída fácil que a cerca proíbe)",
    arquivo: CSP,
    de: '  "style-src \'self\'",',
    para: '  "style-src \'self\' \'unsafe-inline\'",',
    suite: 'npm',
  },
  {
    // 🔒 A ISENÇÃO COMPLETA do `sincronizar` (decisão do dev em C2). Sem o
    // prefixo, o `sincronizar` ACEITO volta a consumir a cota de jogo — que é
    // o defeito que a cerca de `party/comandos.test.ts` nasceu vermelha para
    // pegar. **Não confundir com hash de CSP: não existe hash nesta CSP.**
    id: 'M15',
    desc: 'S3 — `sincronizar` aceito volta a consumir a cota de jogo',
    arquivo: CASCA,
    de: "if (tipo !== 'sincronizar' && this.recusarPorTetoDeComandos(",
    para: 'if (this.recusarPorTetoDeComandos(',
    suite: 'party',
  },
  {
    // 🔴 **SOBREVIVE, e é EQUIVALENTE — não é lacuna de cobertura.** MEDIDO:
    // construí o `dist/` com esta mutação aplicada e olhei o HTML. Com a âncora
    // em `</title>` a meta sai depois do título e **ainda antes** do `<script>`
    // e do `<link>`, porque o Vite os acrescenta no FIM do `<head>`. A
    // propriedade de segurança (a meta preceder o que ela governa) vale nas
    // duas âncoras, então não há comportamento a acusar.
    // 🔑 Fica na tabela em vez de ser removida: mutação sobrevivente omitida é
    // a tabela mentindo por seleção. O H2 registrou a M4 sobrevivente pelo
    // mesmo motivo.
    id: 'M14',
    desc: 'S5 — âncora `<head>` → `</title>`  [EQUIVALENTE, sobrevive de direito]',
    arquivo: CSP,
    de: "  const cabeca = '<head>';",
    para: "  const cabeca = '</title>';",
    suite: 'npm',
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

function medir(chaves) {
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
for (const l of medir(['npm', 'party'])) console.log(l);

for (const m of MUTACOES) {
  const antes = readFileSync(m.arquivo, 'utf8');
  if (!antes.includes(m.de)) {
    console.log(
      `\n${m.id}  ${m.desc}\n      ⛔ ALVO NÃO ENCONTRADO em ${m.arquivo} — mutação NÃO aplicada`,
    );
    continue;
  }
  writeFileSync(m.arquivo, antes.replace(m.de, m.para));
  console.log(`\n${m.id}  ${m.desc}   (${m.arquivo})`);
  try {
    for (const l of medir(chavesDe(m.suite))) console.log(l);
  } finally {
    writeFileSync(m.arquivo, antes);
  }
}

console.log('\n=== REVERSÃO — conferida, não presumida ===');
for (const l of medir(['npm', 'party'])) console.log(l);
