/**
 * Harness de MUTAÇÃO do PR H2 (S2 + S4) — rastreado de propósito.
 *
 * 🔒 **Existe porque a regra do dev manda** (`ESTADO.md` §Convenções, ditada em
 * 2026-08-30): *"se a captura importa, ou o script fica rastreado ou o número
 * não vale."* O PR H1 rodou sete mutações com um `mutar.py` que ficou no
 * scratchpad da sessão, e o próprio `ESTADO.md` registrou isso como a regra
 * **ainda não cumprida**, com o primeiro caso violando-a em silêncio. Este
 * arquivo é o primeiro que a cumpre.
 *
 * 🔑 **O que uma mutação prova, e o que ela NÃO prova.** Ela mostra que ALGUMA
 * asserção cai quando o código muda — não que a asserção certa caiu. Por isso a
 * saída registra o PLACAR (`n failed | m passed`), não só o exit code: um
 * `exit=1` sozinho é compatível com o arquivo inteiro quebrando por erro de
 * sintaxe, que não mede cobertura nenhuma.
 *
 * ⚠️ **Reversão por restauração de BYTES, nunca por edição inversa.** O
 * conteúdo original de cada arquivo é guardado em memória e reescrito no
 * `finally`; uma "des-mutação" por `replace` deixaria resíduo se o texto
 * casasse duas vezes. O `git status` no fim é a conferência.
 *
 * Uso:  node scripts/mutar-h2.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const SALA = 'party/sala.ts';
const TETO = 'src/net/teto-conexoes.ts';

/**
 * Cada mutação: o que ela sabota e qual asserção ela DEVE derrubar.
 * O campo `alega` é o contrato — se a mutação cair noutra asserção, o registro
 * tem de dizer isso, não maquiar.
 */
const MUTACOES = [
  {
    id: 'M1',
    descricao: 'o teto de conexoes deixa de ser consultado (limitador off)',
    alega: 'os casos de S2 (acima do teto / todas as conexoes)',
    arquivo: SALA,
    de: 'if (excedeuTetoDeConexoes(this.quantasConexoes())) {',
    para: 'if (false) {',
  },
  {
    id: 'M2',
    descricao: 'o teto vira >= em vez de > (off-by-one da conexao corrente)',
    // 🔴 CORRIGIDO PELA PRÓPRIA RODADA: a alegação anterior era "a
    // anti-vacuidade de S2", e a medição a REFUTOU. Com `>=` e teto 64, a 63ª
    // conexão ainda vê `63 < 64` e entra — a anti-vacuidade passa. Quem pega o
    // off-by-one são os DOIS baselines, que medem exatamente 64.
    // 🔑 É por isso que este harness lista os nomes: com só o `exit=1`, a
    // alegação errada teria sobrevivido à revisão.
    alega: 'os DOIS baselines de S2 -- NAO a anti-vacuidade, que sobrevive a ela',
    arquivo: TETO,
    de: 'return conexoesAbertas > TETO_CONEXOES;',
    para: 'return conexoesAbertas >= TETO_CONEXOES;',
  },
  {
    id: 'M3',
    descricao: 'o Origin deixa de ser consultado (guarda de origem off)',
    alega: 'os casos de S4 (origem estranha / sem allowlist e sem sinal de dev)',
    arquivo: SALA,
    de: "      ) === null\n    ) {\n      this.recusarPorPolitica(connection, 'origem nao autorizada');",
    para: "      ) === null &&\n      false\n    ) {\n      this.recusarPorPolitica(connection, 'origem nao autorizada');",
  },
  {
    id: 'M4',
    descricao: 'a saida cedo do onClose some (o BLOQUEANTE C1 reintroduzido)',
    alega: 'NADA -- registrada como SOBREVIVENTE de propósito; ver o onClose',
    arquivo: SALA,
    de: 'if (this.recusadas.delete(connection.id)) return;',
    para: 'this.recusadas.delete(connection.id);',
  },
];

function placar(saida) {
  const m = saida.match(/Tests\s+(.+)/);
  return m ? m[1].trim() : '(placar nao encontrado)';
}

/**
 * Os NOMES dos testes que caíram.
 *
 * 🔑 **É isto que separa "a mutação foi pega" de "a mutação foi pega pela
 * asserção que alega cobri-la".** Uma mutação que derruba dois testes
 * inesperados tem o mesmo `exit=1` de uma que derruba o certo — e registrar só
 * o placar deixaria a diferença invisível.
 */
function quaisCairam(saida) {
  return [...saida.matchAll(/×\s+(.+?)\s+\d+ms/g)].map((m) => m[1].trim());
}

function rodar() {
  try {
    const saida = execSync('npm run test:party -- --reporter=verbose', {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { exit: 0, placar: placar(saida), caidos: quaisCairam(saida) };
  } catch (e) {
    const saida = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    return { exit: e.status ?? 1, placar: placar(saida), caidos: quaisCairam(saida) };
  }
}

const originais = new Map();
for (const arquivo of new Set(MUTACOES.map((m) => m.arquivo))) {
  originais.set(arquivo, readFileSync(arquivo, 'utf8'));
}

const linhas = [];
try {
  const controle = rodar();
  linhas.push(`CONTROLE (sem mutacao)  exit=${controle.exit}  ${controle.placar}`);

  for (const mut of MUTACOES) {
    const original = originais.get(mut.arquivo);
    if (!original.includes(mut.de)) {
      linhas.push(`${mut.id}  !! ANCORA NAO ENCONTRADA em ${mut.arquivo} -- mutacao NAO aplicada`);
      continue;
    }
    writeFileSync(mut.arquivo, original.replace(mut.de, mut.para));
    const r = rodar();
    writeFileSync(mut.arquivo, original);
    linhas.push(`${mut.id}  ${mut.descricao.padEnd(58)} exit=${r.exit}  ${r.placar}`);
    linhas.push(`     alega cobrir: ${mut.alega}`);
    for (const nome of r.caidos) linhas.push(`     caiu: ${nome}`);
    if (r.caidos.length === 0) linhas.push('     caiu: NENHUM -- mutacao SOBREVIVENTE');
  }
} finally {
  for (const [arquivo, conteudo] of originais) writeFileSync(arquivo, conteudo);
}

console.log(`\n${linhas.join('\n')}\n`);
console.log('git status (deve estar limpo de resíduo de mutação):');
console.log(execSync('git status --porcelain', { encoding: 'utf8' }) || '  (limpo)');
