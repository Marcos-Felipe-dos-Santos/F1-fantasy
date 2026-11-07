import { mkdtempSync as mkdtemp, mkdirSync as mkdir, readFileSync as readFile, writeFileSync as writeFile, rmSync as rm } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
// O coletor é JavaScript nativo, sem declaração TypeScript no projeto.
// @ts-expect-error módulo .mjs sem tipos; comportamento coberto abaixo.
import { executar, rodadaFinalResultados } from './obter-top3-draft.mjs';

const temporarios: string[] = [];
afterEach(async () => {
  await Promise.all(temporarios.splice(0).map(p => rm(p, { recursive: true, force: true })));
});
const pagina = (rounds = ['1', '2'], offset = '0', total = '2') => ({
  MRData: { offset, total, limit: '2', RaceTable: { season: '2025',
    Races: rounds.map(round => ({ season: '2025', round, Results: [{}] })) } },
});

it('extrai o round final independente e rejeita páginas incompletas ou temporada errada', () => {
  expect(rodadaFinalResultados([pagina()], 2025)).toBe(2);
  expect(() => rodadaFinalResultados([pagina(['1'], '0', '2')], 2025)).toThrow();
  expect(() => rodadaFinalResultados([pagina()], 2024)).toThrow();
  expect(() => rodadaFinalResultados([pagina(['1', '2'], '1')], 2025)).toThrow();
  expect(() => rodadaFinalResultados([pagina(['1', '2'], '0', '3')], 2025)).toThrow();
  expect(() => rodadaFinalResultados([pagina(['1', '3'])], 2025)).toThrow();
});

async function preparar(round: string, nomes = ['A', 'B', 'C']) {
  const base = join(process.cwd(), '.wrangler/tmp-pr3b');
  await mkdir(base, { recursive: true });
  const raiz = await mkdtemp(join(base, 'top3-coleta-'));
  temporarios.push(raiz);
  for (const d of ['scripts/derived', 'docs', 'src/data', '.wrangler/draft-top3', 'scripts/cache/jolpica/2025']) {
    await mkdir(join(raiz, d), { recursive: true });
  }
  await writeFile(join(raiz, 'src/data/equipe-anos.json'), JSON.stringify(['A', 'B', 'C'].map(equipe => ({ equipe, ano: 2025 }))));
  await writeFile(join(raiz, 'scripts/cache/jolpica/2025/results-p0.json'), JSON.stringify(pagina()));
  await writeFile(join(raiz, '.wrangler/draft-top3/2025.json'), JSON.stringify({ MRData: {
    offset: '0', total: '3', StandingsTable: { season: '2025', StandingsLists: [{ season: '2025', round,
      ConstructorStandings: nomes.map((name, i) => ({ position: String(i + 1), points: '10',
        Constructor: { name, constructorId: name } })) }] },
  } }));
  const destinos = ['scripts/derived/draft-top3.json', 'docs/draft-top3-cobertura.json'];
  const originais = ['{"temporadas":[{"ano":2025}]}\n', '{"completo":true}\n'];
  await Promise.all(destinos.map((p, i) => writeFile(join(raiz, p), originais[i])));
  return { raiz, destinos, originais };
}

it.each(['intermediária', 'ausente', 'sem correspondência'])('preserva ambos os artefatos em coleta %s', async tipo => {
  const { raiz, destinos, originais } = await preparar(tipo === 'intermediária' ? '1' : '2',
    tipo === 'sem correspondência' ? ['A', 'B', 'X'] : undefined);
  if (tipo === 'ausente') await rm(join(raiz, '.wrangler/draft-top3/2025.json'));
  await expect(executar({ raiz, offline: true, anos: [2025] })).rejects.toThrow('Coleta incompleta');
  for (const [i, p] of destinos.entries()) expect(await readFile(join(raiz, p), 'utf8')).toBe(originais[i]);
  const diagnostico = JSON.parse(await readFile(join(raiz, '.wrangler/draft-top3/diagnostico-parcial.json'), 'utf8'));
  expect(diagnostico.cobertura.completo).toBe(false);
  if (tipo === 'intermediária') expect(diagnostico.cobertura.falhas[0].erro).toContain('--offline');
});

it('promove os dois artefatos somente quando toda a coleta é válida', async () => {
  const { raiz, destinos } = await preparar('2');
  const cobertura = await executar({ raiz, offline: true, anos: [2025] });
  expect(cobertura.completo).toBe(true);
  expect(cobertura.correspondencias).toBe(3);
  expect(JSON.parse(await readFile(join(raiz, destinos[0]), 'utf8')).temporadas[0].rodadaFinal).toBe(2);
  expect(JSON.parse(await readFile(join(raiz, destinos[1]), 'utf8')).completo).toBe(true);
});

it('não promove uma temporada válida quando a seguinte falha', async () => {
  const { raiz, destinos, originais } = await preparar('2');
  await expect(executar({ raiz, offline: true, anos: [2025, 2026] })).rejects.toThrow('Coleta incompleta');
  for (const [i, p] of destinos.entries()) expect(await readFile(join(raiz, p), 'utf8')).toBe(originais[i]);
  const diagnostico = JSON.parse(await readFile(join(raiz, '.wrangler/draft-top3/diagnostico-parcial.json'), 'utf8'));
  expect(diagnostico.temporadas).toHaveLength(1);
  expect(diagnostico.cobertura.falhas[0].ano).toBe(2026);
});
