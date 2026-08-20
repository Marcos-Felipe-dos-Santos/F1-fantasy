/**
 * O COMPENSADOR do PR A do spike: o grafo do Durable Object continua sem tocar
 * `node:*`?
 *
 * 🔒 **Por que ele é INEGOCIÁVEL neste PR** (decisão 1 do dev, 2026-08-19).
 * Adotar um runner de teste que aceite `node:*` — seja pela flag, seja por
 * polyfill do próprio pool — faz a suíte DEIXAR de certificar o que o
 * `wrangler.jsonc` decidiu no 3.2: que `nodejs_compat` não é necessária. Um
 * import acidental passaria verde nos testes. Aumentar cobertura reduzindo uma
 * garantia, no mesmo PR, é a forma exata do defeito que este projeto persegue.
 *
 * 🔴 **A ESPECIFICAÇÃO ORIGINAL DO COMPENSADOR ERA VACUOSA — medido, não
 * deduzido (2026-08-19).** O plano aprovado dizia que `wrangler deploy
 * --dry-run` "falha de verdade" com um import de `node:*` fora da flag. **Não
 * falha.** Com `import { join } from 'node:path'` em `party/sala.ts`, USADO no
 * topo do módulo:
 *
 *   - `wrangler deploy --dry-run` imprime um WARNING amarelo e sai **exit 0**;
 *   - `npm run test:party` fica **verde**, 4/4 — o pool resolve `node:*` mesmo
 *     sem `compatibility_flags`.
 *
 * Ou seja: os dois gates óbvios são cegos, e um compensador que só chamasse o
 * `--dry-run` seria uma garantia que nunca fica vermelha. É por isso que este
 * script existe em vez de uma linha no `package.json`.
 *
 * 🔑 **O que ele checa, e por que sobre o BUNDLE.** Ele empacota com a config
 * de PRODUÇÃO (`wrangler.jsonc`, sem a flag) e inspeciona o artefato emitido —
 * o mesmo que subiria num deploy. O esbuild do wrangler já resolveu o grafo
 * INTEIRO ali, então um `node:*` que entre por dependência transitiva, por
 * alias ou por reexport aparece do mesmo jeito. É a diferença que já mordeu
 * este projeto no 3.5.1: a cerca de lint casa ESPECIFICADOR no fonte e não vê
 * nada disso.
 *
 * 🔒 **SÃO DOIS MECANISMOS, e cada um pega uma FORMA de import — os dois foram
 * exercitados com mutação, não deduzidos:**
 *
 *   1. **Especificador com prefixo** (`import 'node:path'`): o wrangler
 *      empacota com sucesso e deixa o import no bundle. Quem pega é a
 *      inspeção do artefato, mais abaixo.
 *   2. **Builtin SEM prefixo** (`import { Readable } from 'stream'`): o esbuild
 *      não resolve um builtin nu para o alvo `workers` e o **empacotamento
 *      falha**. Quem pega é o `execFileSync` lançando — daí o `try/catch`
 *      abaixo existir para transformar o dump de bytes numa mensagem legível.
 *      Um gate que falha ilegível é um gate que alguém desliga.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Casa `node:x` só em posição de ESPECIFICADOR de módulo — `import … from
 * "node:path"`, `import "node:path"`, `require("node:path")`. Uma string
 * qualquer que contenha "node:" no meio do código não dispara.
 */
const IMPORT_DE_NODE = /(?:from|import|require\s*\()\s*["'](node:[\w/.-]+)["']/g;

/** Dentro de `.wrangler/`, que o `.gitignore` já cobre. */
const SAIDA = join('.wrangler', 'dry-run');

// 🔒 APAGA ANTES DE EMPACOTAR, e isso é anti-vacuidade, não higiene. Com um
// diretório fixo, um bundle sobrando de uma execução anterior seria inspecionado
// como se fosse o atual: o wrangler poderia falhar e o script ainda passaria
// verde sobre o artefato VELHO, afirmando limpo um grafo que nem foi empacotado.
rmSync(SAIDA, { recursive: true, force: true });

/**
 * `--dry-run` não faz deploy nem exige autenticação: só empacota e sai.
 *
 * 🔑 **Chama o entry JS do wrangler LOCAL, não `npx`** — e não é preferência de
 * estilo, são três motivos medidos:
 *   1. `npx.cmd` sem `shell` dá **EINVAL** no Node 24 (spawn de `.cmd` foi
 *      fechado pela correção do CVE-2024-27980); e com `shell: true` o Node
 *      emite DEP0190 e o caminho desta bancada tem espaço (`F1 fantasy`).
 *   2. Desde a adoção do pool existem **DUAS cópias de wrangler** no projeto
 *      (4.120.0 no topo, 4.124.0 dentro de `@cloudflare/vitest-pool-workers`).
 *      O compensador tem de empacotar com a **de produção** — a do par exato
 *      validado no SPIKE 3.0 —, não com a que veio de carona.
 *   3. Sem `npx`, não há resolução de rede nem de cache no meio do gate.
 */
try {
  execFileSync(
    process.execPath,
    [
      join('node_modules', 'wrangler', 'bin', 'wrangler.js'),
      'deploy',
      '--dry-run',
      '--outdir',
      SAIDA,
    ],
    { stdio: 'pipe' },
  );
} catch (erro) {
  // O empacotamento em si falhou — é o caminho (2) do docblock, e o mais
  // provável é um builtin do Node importado SEM o prefixo `node:`.
  const bytes = (erro as { stderr?: Uint8Array }).stderr;
  process.stderr.write(
    [
      '',
      '\x1b[31m✖ O wrangler NÃO conseguiu empacotar a casca.\x1b[0m',
      '',
      '  Causa típica: um módulo embutido do Node importado sem o prefixo',
      '  `node:` (ex.: `from "stream"`), que o esbuild não resolve para o alvo',
      '  `workers`. Um `node:*` explícito não cairia aqui — empacotaria e seria',
      '  pego pela inspeção do bundle.',
      '',
      '  Saída do wrangler:',
      '',
      bytes === undefined ? '  (sem stderr)' : new TextDecoder().decode(bytes),
      '',
    ].join('\n'),
  );
  process.exit(1);
}

const bundles = readdirSync(SAIDA).filter((nome) => nome.endsWith('.js'));

// 🔒 Guarda ANTI-VACUIDADE: sem bundle nenhum, o laço abaixo não acharia nada e
// o script passaria verde afirmando que o grafo está limpo. Já aconteceu neste
// projeto de um teste "verificar" um artefato que não existia.
if (bundles.length === 0) {
  process.stderr.write(
    `\n\x1b[31m✖ O wrangler não emitiu bundle nenhum em ${SAIDA} — nada foi verificado.\x1b[0m\n\n`,
  );
  process.exit(1);
}

const achados = new Map<string, Set<string>>();
for (const nome of bundles) {
  const codigo = readFileSync(join(SAIDA, nome), 'utf8');
  for (const [, modulo] of codigo.matchAll(IMPORT_DE_NODE)) {
    const onde = achados.get(modulo) ?? new Set<string>();
    onde.add(nome);
    achados.set(modulo, onde);
  }
}

if (achados.size > 0) {
  const lista = [...achados].map(
    ([modulo, onde]) => `      ${modulo}  (em ${[...onde].join(', ')})`,
  );
  process.stderr.write(
    [
      '',
      '\x1b[31m✖ O bundle do Durable Object importa módulo `node:*`.\x1b[0m',
      '',
      '  Módulos encontrados no artefato que iria pro deploy:',
      '',
      ...lista,
      '',
      '  O `wrangler.jsonc` NÃO tem `compatibility_flags: ["nodejs_compat"]`, e',
      '  isso é decisão do PR 3.2, não esquecimento — em produção este import',
      '  lançaria em runtime.',
      '',
      '  ⚠️ Nem `wrangler deploy --dry-run` (só avisa, sai 0) nem `npm run',
      '  test:party` (o pool resolve `node:*`) pegam isto. Este script é o',
      '  único gate que pega — por isso ele não deve ser afrouxado.',
      '',
      '  Se o import for MESMO necessário, a decisão é do dev: ligar a flag no',
      '  `wrangler.jsonc` e REGISTRAR ali qual import a exigiu.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

process.stdout.write(
  `✔ Grafo do DO limpo: nenhum \`node:*\` em ${bundles.length} bundle(s) empacotado(s) sem \`nodejs_compat\`.\n`,
);
