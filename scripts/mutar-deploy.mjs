// Mutações pequenas, reversíveis e rastreadas. Nunca executar junto da suíte.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const casos = [
  ['etapa', 'src/net/servidor-sala.ts', "const etapa = (comando as { etapa?: unknown }).etapa;", 'const etapa = cursorDaSala(estado.sala);', ['src/net/barreira-corrida.test.ts']],
  ['recusa', 'src/net/conexao.ts', 'evento.code === 4403 || evento.code === 4408', 'false', ['src/net/conexao-runtime.test.ts']],
  ['identificacao', 'party/sala.ts', "else if (agora >= prazo)", 'else if (false)', ['--config', 'vitest.party.config.ts', 'party/conexoes.test.ts']],
  ['hashes', 'party/sala.ts', '      TETO_HASHES,', '      20,', ['--config', 'vitest.party.config.ts', 'party/comandos.test.ts']],
];
for (const [nome, arquivo, antes, depois, args] of casos) {
  const fonte = readFileSync(arquivo, 'utf8');
  if (!fonte.includes(antes)) throw new Error(`Âncora ausente: ${nome}`);
  try {
    writeFileSync(arquivo, fonte.replace(antes, depois));
    const resultado = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', ...args, '--reporter=dot'], { encoding: 'utf8', timeout: 60_000 });
    if (resultado.error || resultado.signal || !resultado.stdout.includes('AssertionError') && !resultado.stderr.includes('AssertionError')) {
      throw new Error(`Mutação ${nome}: sem falha de asserção; status ${resultado.status}`);
    }
    if (resultado.status === 0) throw new Error(`Mutação sobreviveu: ${nome}`);
    console.log(`MORTA por asserção: ${nome}`);
  } finally {
    writeFileSync(arquivo, fonte);
  }
}
