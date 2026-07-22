/**
 * Agregador de fatos (PR 4.2, trilha "Dataset histórico 1950-2025",
 * `PROGRESS.md` seção "Próximos"). Lê o cache cru da Jolpica-F1 (PR 4.1,
 * `scripts/cache/jolpica/`), aplica exclusões e corte de escopo (decisões D1
 * do dev) e emite `scripts/derived/fatos-agregados.json`: contagens e médias
 * AUDITÁVEIS, direto dos fatos crus. ZERO fórmula de nota — isso é o PR 4.3.
 *
 * Roda via `npm run dataset:fatos` (Node 24 nativo, mesmo estilo de
 * `fetch-f1-data.ts`: sem enums/namespaces, `import type` pra tipos).
 *
 * Pipeline por temporada:
 *   1. Lê todas as páginas de `results-p*.json` da temporada e concatena os
 *      `Results[]` por round (uma corrida PODE vir fatiada em mais de uma
 *      página — o "total" da paginação da Jolpica é sobre linhas de
 *      resultado, não sobre corridas inteiras).
 *   2. Exclui toda Race com `Circuit.circuitId === 'indianapolis'` em
 *      temporadas 1950-1960 ANTES de qualquer contagem (inclusive do nº de
 *      etapas do ano) — decisão D1 do dev.
 *   3. `etapasDoAno` = nº de rounds distintos restantes.
 *   4. Agrupa linhas por `constructorId`; aplica o corte de escopo: entra se
 *      largou em ≥ ceil(etapasDoAno/3) rounds distintos E tem ≥2 pilotos
 *      distintos com ≥2 largadas pela equipe no ano.
 *   5. Titulares = os 2 pilotos com mais largadas pela equipe/ano (desempate:
 *      soma de `points` desc, depois `driverId` asc — determinismo).
 *   6. Pra cada equipe/titular elegível, calcula as estatísticas do §3 do
 *      plano aprovado (ver spec do PR na PR description / PROGRESS.md).
 *
 * Categorização de status: `status-map.ts` (tabela commitada, auditável).
 * Todo status desconhecido cai em `outro` e é reportado em
 * `meta.temporadas[].statusesNaoMapeados` — nunca silenciosamente perdido.
 *
 * **largada** = linha de `Results` que NÃO está em `NAO_LARGOU`
 * (`status-map.ts`: "Did not qualify", "Did not prequalify", "Withdrew", "Did
 * not start"). Linhas de `NAO_LARGOU` são excluídas de TUDO antes de qualquer
 * outra contagem — não entram no corte de escopo, na escolha de titulares,
 * em `largadas`, nem em nenhuma contagem/média de categoria (não largou ⇒
 * fora de numerador e denominador). `Disqualified`/`Excluded` NÃO fazem parte
 * de `NAO_LARGOU` (o piloto largou e correu; a punição veio depois) e contam
 * normalmente.
 *
 * Determinismo byte a byte: toda lista de saída é ordenada explicitamente
 * (season asc → constructorId asc → driverId asc; `statusesNaoMapeados` por
 * status asc) e todo número é arredondado a 4 casas fixas (`round4`) antes de
 * serializar — mata ruído de ponto flutuante entre execuções idênticas.
 * Todo desempate/ordenação de string usa `cmpStr` (comparação por code unit,
 * `<`/`>`), NUNCA `localeCompare` sem locale fixo — `localeCompare` consulta
 * a collation ICU do host (locale/versão do Node), que pode divergir entre
 * máquinas; `<`/`>` em string é especificado pelo ECMAScript e sempre igual.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mapearStatus, statusEhConhecido, statusEhLargada, type CategoriaStatus } from './status-map';
import { CACHE_DIR_PADRAO, PRIMEIRA_TEMPORADA, PRIMEIRA_TEMPORADA_PITSTOPS, ULTIMA_TEMPORADA } from './fetch-f1-data';

// ---------------------------------------------------------------------------
// Constantes de exclusão (decisão D1 do dev, PROGRESS.md).
// ---------------------------------------------------------------------------

const INDY_CIRCUIT_ID = 'indianapolis';
const INDY_PRIMEIRA_TEMPORADA = 1950;
const INDY_ULTIMA_TEMPORADA = 1960;

export const DERIVED_DIR_PADRAO = join(dirname(fileURLToPath(import.meta.url)), 'derived');
export const OUTPUT_PATH_PADRAO = join(DERIVED_DIR_PADRAO, 'fatos-agregados.json');

// ---------------------------------------------------------------------------
// Tipos do envelope MRData crus (subset usado — mesmo formato do PR 4.1).
// ---------------------------------------------------------------------------

export interface DriverBruto {
  driverId: string;
  givenName: string;
  familyName: string;
}

export interface ConstructorBruto {
  constructorId: string;
  name: string;
}

export interface ResultLinha {
  position: string;
  positionText: string;
  points: string;
  grid: string;
  status: string;
  Driver: DriverBruto;
  Constructor: ConstructorBruto;
}

export interface RaceResults {
  season: string;
  round: string;
  raceName: string;
  Circuit: { circuitId: string };
  Results: ResultLinha[];
}

interface EnvelopeResults {
  MRData: { RaceTable: { Races: RaceResults[] } };
}

export interface PitStopLinha {
  driverId: string;
  lap: string;
  duration: string;
}

interface RacePitstops {
  season: string;
  round: string;
  PitStops: PitStopLinha[];
}

interface EnvelopePitstops {
  MRData: { RaceTable: { Races: RacePitstops[] } };
}

// ---------------------------------------------------------------------------
// Tipos de saída (`fatos-agregados.json`).
// ---------------------------------------------------------------------------

export interface StatusContagem {
  status: string;
  contagem: number;
}

export interface TemporadaMeta {
  season: number;
  etapas: number;
  statusesNaoMapeados: StatusContagem[];
}

export interface CategoriaContagens {
  terminou: number;
  'acidente-erro': number;
  'mecanica-chassi': number;
  'mecanica-motor': number;
  outro: number;
}

export interface EquipeAnoFatos extends CategoriaContagens {
  constructorId: string;
  nome: string;
  season: number;
  roundsLargados: number;
  largadas: number;
  mediaGrid: number | null;
  poles: number;
  mediaChegadaTerminou: number | null;
  overachievementMediano: number | null;
  nParadas: number | null;
  medianaDeltaPit: number | null;
  fracaoParadasEstouradas: number | null;
}

export interface TitularAnoFatos extends CategoriaContagens {
  driverId: string;
  nome: string;
  constructorId: string;
  season: number;
  largadas: number;
  mediaGrid: number | null;
  poles: number;
  mediaChegadaTerminou: number | null;
  posGanhasAjustadasMediana: number | null;
  deltaCompanheiroMediano: number | null;
}

export interface FatosAgregados {
  meta: {
    geradoDe: string;
    temporadas: TemporadaMeta[];
  };
  equipes: EquipeAnoFatos[];
  titulares: TitularAnoFatos[];
}

export interface ResultadoAgregacao {
  fatos: FatosAgregados;
  temporadasAusentes: number[];
}

// ---------------------------------------------------------------------------
// Utilidades numéricas puras — arredondamento, mediana, parse de duração.
// ---------------------------------------------------------------------------

/**
 * Comparador de string determinístico entre máquinas (code unit, `<`/`>` —
 * especificado pelo ECMAScript). NUNCA `localeCompare` sem locale: consulta a
 * collation ICU do host, que pode divergir entre SOs/versões do Node e
 * quebrar o determinismo byte a byte exigido pelo PR.
 */
export function cmpStr(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/** Arredonda a 4 casas fixas — mata ruído de ponto flutuante (determinismo byte a byte). */
export function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

/** Mediana de uma lista de números; `null` se vazia. Empate par = média dos 2 do meio. */
export function mediana(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  const ordenado = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenado.length / 2);
  if (ordenado.length % 2 === 1) return ordenado[meio];
  return (ordenado[meio - 1] + ordenado[meio]) / 2;
}

function media(valores: readonly number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length;
}

/** Parse de duração de pitstop: `"21.867"` (segundos) ou `"1:02.345"` (MM:SS.mmm). */
export function parseDuracaoPit(duration: string): number {
  const partes = duration.split(':');
  if (partes.length === 2) {
    const minutos = Number(partes[0]);
    const segundos = Number(partes[1]);
    return minutos * 60 + segundos;
  }
  return Number(duration);
}

// ---------------------------------------------------------------------------
// Leitura do cache cru (I/O isolado — o resto do módulo é puro).
// ---------------------------------------------------------------------------

function paginasOrdenadas(
  arquivos: readonly string[],
  regex: RegExp,
): Array<{ nome: string; pagina: number; grupos: RegExpExecArray }> {
  return arquivos
    .map((nome) => {
      const m = regex.exec(nome);
      return m ? { nome, pagina: Number(m[m.length - 1]), grupos: m } : null;
    })
    .filter((x): x is { nome: string; pagina: number; grupos: RegExpExecArray } => x !== null)
    .sort((a, b) => a.pagina - b.pagina);
}

/**
 * Lê e concatena todas as páginas de `results-p*.json` da temporada,
 * mesclando por `round` (uma corrida pode ter os `Results[]` fatiados em
 * mais de uma página de paginação). `[]` se a pasta da temporada não existe.
 */
function lerResultsDaTemporada(cacheDir: string, season: number): RaceResults[] {
  const dirTemporada = join(cacheDir, String(season));
  if (!existsSync(dirTemporada)) return [];

  const paginas = paginasOrdenadas(readdirSync(dirTemporada), /^results-p(\d+)\.json$/);
  const racesPorRound = new Map<string, RaceResults>();

  for (const { nome } of paginas) {
    const conteudo = JSON.parse(readFileSync(join(dirTemporada, nome), 'utf8')) as EnvelopeResults;
    for (const race of conteudo.MRData.RaceTable.Races) {
      const existente = racesPorRound.get(race.round);
      if (existente) {
        existente.Results.push(...race.Results);
      } else {
        racesPorRound.set(race.round, { ...race, Results: [...race.Results] });
      }
    }
  }

  return [...racesPorRound.values()].sort((a, b) => Number(a.round) - Number(b.round));
}

/** Lê e concatena todas as páginas de pitstops da temporada, mesclando por `round`. */
function lerPitstopsDaTemporada(cacheDir: string, season: number): Map<string, PitStopLinha[]> {
  const dirTemporada = join(cacheDir, String(season));
  const porRound = new Map<string, PitStopLinha[]>();
  if (!existsSync(dirTemporada)) return porRound;

  const paginas = paginasOrdenadas(readdirSync(dirTemporada), /^r(\d+)-pitstops-p(\d+)\.json$/);
  for (const { nome } of paginas) {
    const conteudo = JSON.parse(readFileSync(join(dirTemporada, nome), 'utf8')) as EnvelopePitstops;
    for (const race of conteudo.MRData.RaceTable.Races) {
      const lista = porRound.get(race.round) ?? [];
      lista.push(...race.PitStops);
      porRound.set(race.round, lista);
    }
  }
  return porRound;
}

// ---------------------------------------------------------------------------
// Exclusão da Indy 500 (D1) — ANTES de qualquer contagem.
// ---------------------------------------------------------------------------

export function ehIndy500Excluida(race: Pick<RaceResults, 'season' | 'Circuit'>): boolean {
  const season = Number(race.season);
  return (
    race.Circuit.circuitId === INDY_CIRCUIT_ID &&
    season >= INDY_PRIMEIRA_TEMPORADA &&
    season <= INDY_ULTIMA_TEMPORADA
  );
}

// ---------------------------------------------------------------------------
// Recontagem de posições (overachievement) — só entre quem TERMINOU a
// corrida. Anula o "presente" de posição de grid/chegada que um DNF alheio
// dá pra quem sobra atrás dele.
// ---------------------------------------------------------------------------

/**
 * Pra uma corrida (linhas de `Results` do campo INTEIRO daquela corrida),
 * retorna `driverId -> delta` (posição de chegada recontada − posição de
 * grid recontada, ambas só entre quem terminou). Negativo = ganhou posições.
 * Motoristas que não terminaram não entram no mapa.
 *
 * `grid === "0"` (sentinel de largada do pit-lane/sem tempo classificatório)
 * entra no rank de grid DEPOIS de todos os `grid > 0` — ver comentário na
 * ordenação de `porGrid` abaixo.
 */
export function recontarPosicoesRace(results: readonly ResultLinha[]): Map<string, number> {
  const finalizados = results.filter((r) => mapearStatus(r.status) === 'terminou');
  if (finalizados.length === 0) return new Map();

  const porDriverIdAsc = (a: ResultLinha, b: ResultLinha) => cmpStr(a.Driver.driverId, b.Driver.driverId);

  const porChegada = [...finalizados].sort((a, b) => Number(a.position) - Number(b.position) || porDriverIdAsc(a, b));
  const rankChegada = new Map<string, number>();
  porChegada.forEach((r, i) => rankChegada.set(r.Driver.driverId, i + 1));

  // Grid "0" é o sentinel da Ergast/Jolpica pra largada do pit-lane ou sem
  // tempo classificatório. Number('0') === 0 pareceria pole (menor valor) se
  // comparado cru — na prática largar do pit lane é largar atrás de TODO o
  // grid. Tratar 0 como pole inverteria o sinal do overachievement exatamente
  // pros casos mais extremos, então grid=0 entra no rank DEPOIS de todo
  // grid>0; entre dois grid=0 na mesma corrida, desempate por
  // cmpStr(driverId) (determinismo).
  const porGrid = [...finalizados].sort((a, b) => {
    const gridA = Number(a.grid);
    const gridB = Number(b.grid);
    const aUltimo = gridA === 0;
    const bUltimo = gridB === 0;
    if (aUltimo !== bUltimo) return aUltimo ? 1 : -1;
    if (aUltimo) return porDriverIdAsc(a, b);
    return gridA - gridB || porDriverIdAsc(a, b);
  });
  const rankGrid = new Map<string, number>();
  porGrid.forEach((r, i) => rankGrid.set(r.Driver.driverId, i + 1));

  const deltas = new Map<string, number>();
  for (const r of finalizados) {
    const id = r.Driver.driverId;
    deltas.set(id, rankChegada.get(id)! - rankGrid.get(id)!);
  }
  return deltas;
}

// ---------------------------------------------------------------------------
// Escolha de titulares — mais largadas; desempate por pontos, depois
// driverId (determinismo).
// ---------------------------------------------------------------------------

interface CandidatoTitular {
  driverId: string;
  largadas: number;
  pontos: number;
}

/** Ordena candidatos a titular (mais largadas primeiro; desempate pontos desc, driverId asc) e retorna os 2 primeiros. */
export function escolherTitulares(candidatos: readonly CandidatoTitular[]): CandidatoTitular[] {
  return [...candidatos]
    .sort((a, b) => b.largadas - a.largadas || b.pontos - a.pontos || cmpStr(a.driverId, b.driverId))
    .slice(0, 2);
}

// ---------------------------------------------------------------------------
// Categorização de status — contagem por categoria sobre um conjunto de linhas.
// ---------------------------------------------------------------------------

function contarCategorias(rows: readonly ResultLinha[]): CategoriaContagens {
  const base: CategoriaContagens = { terminou: 0, 'acidente-erro': 0, 'mecanica-chassi': 0, 'mecanica-motor': 0, outro: 0 };
  for (const r of rows) {
    const categoria: CategoriaStatus = mapearStatus(r.status);
    base[categoria]++;
  }
  return base;
}

// ---------------------------------------------------------------------------
// Agregação por temporada — o núcleo puro do pipeline.
// ---------------------------------------------------------------------------

interface LinhaComRound {
  round: string;
  row: ResultLinha;
}

function agregarTemporada(
  season: number,
  racesBrutas: RaceResults[],
  pitstopsPorRound: Map<string, PitStopLinha[]>,
): { meta: TemporadaMeta; equipes: EquipeAnoFatos[]; titulares: TitularAnoFatos[] } {
  const races = racesBrutas.filter((r) => !ehIndy500Excluida(r));
  const roundsDistintos = new Set(races.map((r) => r.round));
  const etapasDoAno = roundsDistintos.size;

  // statusesNaoMapeados — auditoria explícita, sobre TODAS as linhas da
  // temporada (após exclusão da Indy), independente do corte de escopo.
  const statusesDesconhecidosContagem = new Map<string, number>();
  for (const race of races) {
    for (const row of race.Results) {
      if (!statusEhConhecido(row.status)) {
        statusesDesconhecidosContagem.set(row.status, (statusesDesconhecidosContagem.get(row.status) ?? 0) + 1);
      }
    }
  }
  const statusesNaoMapeados: StatusContagem[] = [...statusesDesconhecidosContagem.entries()]
    .map(([status, contagem]) => ({ status, contagem }))
    .sort((a, b) => cmpStr(a.status, b.status));

  // Recontagem por round (campo inteiro), reutilizada por equipe/titular.
  const deltasPorRound = new Map<string, Map<string, number>>();
  for (const race of races) {
    deltasPorRound.set(race.round, recontarPosicoesRace(race.Results));
  }

  // Mediana de pitstops da CORRIDA inteira (todas as equipes), por round —
  // só relevante 2011+, mas calculada sempre que houver dados.
  const medianaPitPorRound = new Map<string, number | null>();
  for (const [round, stops] of pitstopsPorRound) {
    medianaPitPorRound.set(round, mediana(stops.map((s) => parseDuracaoPit(s.duration))));
  }

  // Agrupamento por constructorId. Linhas de NAO_LARGOU (não largou — ver
  // cabeçalho do módulo) são excluídas AQUI, antes de qualquer contagem:
  // não viram largada, não entram no corte de escopo, na escolha de
  // titulares, nem em nenhuma contagem/média (categorias, grid, chegada).
  const porEquipe = new Map<string, { nome: string; linhas: LinhaComRound[] }>();
  for (const race of races) {
    for (const row of race.Results) {
      if (!statusEhLargada(row.status)) continue;
      const id = row.Constructor.constructorId;
      const grupo = porEquipe.get(id) ?? { nome: row.Constructor.name, linhas: [] };
      grupo.linhas.push({ round: race.round, row });
      porEquipe.set(id, grupo);
    }
  }

  const equipes: EquipeAnoFatos[] = [];
  const titulares: TitularAnoFatos[] = [];
  const limiarRounds = Math.ceil(etapasDoAno / 3);

  for (const [constructorId, { nome, linhas }] of porEquipe) {
    const roundsDaEquipe = new Set(linhas.map((l) => l.round));

    const largadasPorDriver = new Map<string, LinhaComRound[]>();
    for (const l of linhas) {
      const id = l.row.Driver.driverId;
      const lista = largadasPorDriver.get(id) ?? [];
      lista.push(l);
      largadasPorDriver.set(id, lista);
    }
    const pilotosCom2Largadas = [...largadasPorDriver.values()].filter((ls) => ls.length >= 2).length;

    const elegivel = roundsDaEquipe.size >= limiarRounds && pilotosCom2Largadas >= 2;
    if (!elegivel) continue;

    const rows = linhas.map((l) => l.row);
    const categorias = contarCategorias(rows);
    const grids = rows.map((r) => Number(r.grid)).filter((g) => g > 0);
    const mediaGrid = media(grids);
    const poles = rows.filter((r) => Number(r.grid) === 1).length;
    const chegadasTerminou = rows.filter((r) => mapearStatus(r.status) === 'terminou').map((r) => Number(r.position));
    const mediaChegadaTerminou = media(chegadasTerminou);

    // Overachievement por equipe: por round, média dos deltas recontados
    // dos carros da equipe que terminaram naquele round; mediana entre rounds.
    const mediasPorRound: number[] = [];
    for (const round of roundsDaEquipe) {
      const deltasRound = deltasPorRound.get(round)!;
      const idsDaEquipeNoRound = linhas.filter((l) => l.round === round).map((l) => l.row.Driver.driverId);
      const deltasDaEquipe = idsDaEquipeNoRound
        .map((id) => deltasRound.get(id))
        .filter((d): d is number => d !== undefined);
      if (deltasDaEquipe.length > 0) mediasPorRound.push(media(deltasDaEquipe)!);
    }
    const overachievementMediano = mediana(mediasPorRound);

    // Pit (2011+). Atribuição pitstop -> equipe via (round, driverId) das
    // linhas já agrupadas (o driver corria por esta equipe naquele round).
    let nParadas: number | null = null;
    let medianaDeltaPit: number | null = null;
    let fracaoParadasEstouradas: number | null = null;
    if (season >= PRIMEIRA_TEMPORADA_PITSTOPS) {
      const idsPorRound = new Map<string, Set<string>>();
      for (const l of linhas) {
        const s = idsPorRound.get(l.round) ?? new Set<string>();
        s.add(l.row.Driver.driverId);
        idsPorRound.set(l.round, s);
      }
      const deltasPit: number[] = [];
      let estouradas = 0;
      let totalStops = 0;
      for (const [round, ids] of idsPorRound) {
        const stopsRound = pitstopsPorRound.get(round) ?? [];
        const medianaCorrida = medianaPitPorRound.get(round);
        for (const stop of stopsRound) {
          if (!ids.has(stop.driverId)) continue;
          totalStops++;
          const duracao = parseDuracaoPit(stop.duration);
          if (medianaCorrida !== null && medianaCorrida !== undefined) {
            deltasPit.push(duracao - medianaCorrida);
            if (duracao > 1.5 * medianaCorrida) estouradas++;
          }
        }
      }
      nParadas = totalStops;
      medianaDeltaPit = mediana(deltasPit);
      fracaoParadasEstouradas = totalStops > 0 ? estouradas / totalStops : null;
    }

    equipes.push({
      constructorId,
      nome,
      season,
      roundsLargados: roundsDaEquipe.size,
      largadas: rows.length,
      terminou: categorias.terminou,
      'acidente-erro': categorias['acidente-erro'],
      'mecanica-chassi': categorias['mecanica-chassi'],
      'mecanica-motor': categorias['mecanica-motor'],
      outro: categorias.outro,
      mediaGrid: mediaGrid === null ? null : round4(mediaGrid),
      poles,
      mediaChegadaTerminou: mediaChegadaTerminou === null ? null : round4(mediaChegadaTerminou),
      overachievementMediano: overachievementMediano === null ? null : round4(overachievementMediano),
      nParadas,
      medianaDeltaPit: medianaDeltaPit === null ? null : round4(medianaDeltaPit),
      fracaoParadasEstouradas: fracaoParadasEstouradas === null ? null : round4(fracaoParadasEstouradas),
    });

    // Titulares — 2 pilotos com mais largadas pela equipe/ano.
    const candidatos: CandidatoTitular[] = [...largadasPorDriver.entries()].map(([driverId, ls]) => ({
      driverId,
      largadas: ls.length,
      pontos: ls.reduce((acc, l) => acc + Number(l.row.points), 0),
    }));
    const doisTitulares = escolherTitulares(candidatos);

    for (const titular of doisTitulares) {
      const linhasDoTitular = largadasPorDriver.get(titular.driverId)!;
      const rowsDoTitular = linhasDoTitular.map((l) => l.row);
      const categoriasT = contarCategorias(rowsDoTitular);
      const gridsT = rowsDoTitular.map((r) => Number(r.grid)).filter((g) => g > 0);
      const mediaGridT = media(gridsT);
      const polesT = rowsDoTitular.filter((r) => Number(r.grid) === 1).length;
      const chegadasTerminouT = rowsDoTitular
        .filter((r) => mapearStatus(r.status) === 'terminou')
        .map((r) => Number(r.position));
      const mediaChegadaTerminouT = media(chegadasTerminouT);

      const deltasIndividuais: number[] = [];
      for (const l of linhasDoTitular) {
        const d = deltasPorRound.get(l.round)!.get(titular.driverId);
        if (d !== undefined) deltasIndividuais.push(d);
      }
      const posGanhasAjustadasMediana = mediana(deltasIndividuais);

      // Companheiro: o outro titular (se houver 2). Diferença de posição
      // CRUA nas corridas em que AMBOS terminaram.
      const companheiro = doisTitulares.find((c) => c.driverId !== titular.driverId);
      let deltaCompanheiroMediano: number | null = null;
      if (companheiro) {
        const linhasCompanheiro = largadasPorDriver.get(companheiro.driverId)!;
        const posPorRoundCompanheiro = new Map<string, number>();
        for (const l of linhasCompanheiro) {
          if (mapearStatus(l.row.status) === 'terminou') posPorRoundCompanheiro.set(l.round, Number(l.row.position));
        }
        const diffs: number[] = [];
        for (const l of linhasDoTitular) {
          if (mapearStatus(l.row.status) !== 'terminou') continue;
          const posCompanheiro = posPorRoundCompanheiro.get(l.round);
          if (posCompanheiro !== undefined) diffs.push(Number(l.row.position) - posCompanheiro);
        }
        deltaCompanheiroMediano = diffs.length >= 2 ? mediana(diffs) : null;
      }

      titulares.push({
        driverId: titular.driverId,
        nome: `${linhasDoTitular[0].row.Driver.givenName} ${linhasDoTitular[0].row.Driver.familyName}`,
        constructorId,
        season,
        largadas: rowsDoTitular.length,
        terminou: categoriasT.terminou,
        'acidente-erro': categoriasT['acidente-erro'],
        'mecanica-chassi': categoriasT['mecanica-chassi'],
        'mecanica-motor': categoriasT['mecanica-motor'],
        outro: categoriasT.outro,
        mediaGrid: mediaGridT === null ? null : round4(mediaGridT),
        poles: polesT,
        mediaChegadaTerminou: mediaChegadaTerminouT === null ? null : round4(mediaChegadaTerminouT),
        posGanhasAjustadasMediana: posGanhasAjustadasMediana === null ? null : round4(posGanhasAjustadasMediana),
        deltaCompanheiroMediano: deltaCompanheiroMediano === null ? null : round4(deltaCompanheiroMediano),
      });
    }
  }

  return {
    meta: { season, etapas: etapasDoAno, statusesNaoMapeados },
    equipes,
    titulares,
  };
}

// ---------------------------------------------------------------------------
// Orquestração — itera as temporadas presentes no cache; reporta ausentes.
// ---------------------------------------------------------------------------

/**
 * Agrega os fatos de todo o cache disponível em `cacheDir`. Temporadas sem
 * pasta no cache são reportadas em `temporadasAusentes` (a rodada real
 * acontece só depois do fetch terminar — não é erro fatal aqui).
 */
export function agregarFatos(cacheDir: string): ResultadoAgregacao {
  const temporadas: TemporadaMeta[] = [];
  const equipes: EquipeAnoFatos[] = [];
  const titulares: TitularAnoFatos[] = [];
  const temporadasAusentes: number[] = [];

  for (let season = PRIMEIRA_TEMPORADA; season <= ULTIMA_TEMPORADA; season++) {
    const dirTemporada = join(cacheDir, String(season));
    if (!existsSync(dirTemporada)) {
      temporadasAusentes.push(season);
      continue;
    }

    const racesBrutas = lerResultsDaTemporada(cacheDir, season);
    const pitstopsPorRound: Map<string, PitStopLinha[]> =
      season >= PRIMEIRA_TEMPORADA_PITSTOPS ? lerPitstopsDaTemporada(cacheDir, season) : new Map();

    const resultado = agregarTemporada(season, racesBrutas, pitstopsPorRound);
    temporadas.push(resultado.meta);
    equipes.push(...resultado.equipes);
    titulares.push(...resultado.titulares);
  }

  equipes.sort((a, b) => a.season - b.season || cmpStr(a.constructorId, b.constructorId));
  titulares.sort(
    (a, b) => a.season - b.season || cmpStr(a.constructorId, b.constructorId) || cmpStr(a.driverId, b.driverId),
  );

  return {
    fatos: {
      meta: { geradoDe: 'jolpica cache', temporadas },
      equipes,
      titulares,
    },
    temporadasAusentes,
  };
}

/** Serializa `FatosAgregados` de forma determinística (chaves na ordem em que os objetos foram montados). */
export function serializarFatos(fatos: FatosAgregados): string {
  return `${JSON.stringify(fatos, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// CLI (só roda em execução direta — mesmo padrão de `fetch-f1-data.ts`).
// ---------------------------------------------------------------------------

function escreverArquivoAtomic(caminho: string, conteudo: string): void {
  mkdirSync(dirname(caminho), { recursive: true });
  const tmp = `${caminho}.tmp`;
  writeFileSync(tmp, conteudo);
  renameSync(tmp, caminho);
}

export function main(): ResultadoAgregacao {
  const resultado = agregarFatos(CACHE_DIR_PADRAO);

  if (resultado.temporadasAusentes.length > 0) {
    console.log(
      `Temporadas ausentes no cache (rode "npm run dataset:fetch" antes da rodada real): ${resultado.temporadasAusentes.join(', ')}`,
    );
  }

  escreverArquivoAtomic(OUTPUT_PATH_PADRAO, serializarFatos(resultado.fatos));
  console.log(`Escrito: ${OUTPUT_PATH_PADRAO}`);
  console.log(`Temporadas processadas: ${resultado.fatos.meta.temporadas.length}`);
  console.log(`Equipe/ano elegíveis: ${resultado.fatos.equipes.length}`);
  console.log(`Titulares: ${resultado.fatos.titulares.length}`);

  return resultado;
}

const ehExecucaoDireta =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ehExecucaoDireta) {
  main();
}
