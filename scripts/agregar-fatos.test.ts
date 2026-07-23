/**
 * Testes de `agregar-fatos.ts` (PR 4.2). Só fixtures próprias em
 * `scripts/fixtures/jolpica-mini/` — NUNCA toca `scripts/cache/jolpica/`
 * (cache real do PR 4.1, pode estar em uso por um fetch em andamento).
 */

import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  agregarFatos,
  cmpStr,
  escolherTitulares,
  mediana,
  parseDuracaoPit,
  recontarPosicoesRace,
  serializarFatos,
  type ResultLinha,
} from './agregar-fatos.ts';

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'jolpica-mini');

function linha(overrides: Partial<ResultLinha> & Pick<ResultLinha, 'position' | 'grid' | 'status'>): ResultLinha {
  return {
    positionText: overrides.position,
    points: '0',
    Driver: { driverId: 'x', givenName: 'X', familyName: 'Y' },
    Constructor: { constructorId: 'time', name: 'Time' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// cmpStr — comparação por code unit, NUNCA localeCompare (determinismo entre
// máquinas/versões de ICU — ver cabeçalho do módulo).
// ---------------------------------------------------------------------------

describe('cmpStr', () => {
  it('ordena por code unit, não por collation ICU', () => {
    // '_' (0x5F) vem ANTES de 'a' (0x61) em code unit — a collation ICU
    // default costuma tratar '_' como ignorável e inverteria essa ordem
    // (ex.: slugs de driverId reais tipo "max_verstappen"). Se essa asserção
    // um dia quebrar, foi trocado localeCompare de volta em algum lugar.
    expect(cmpStr('max_verstappen', 'maxa')).toBeLessThan(0);
    expect(['maxa', 'max_verstappen'].sort(cmpStr)).toEqual(['max_verstappen', 'maxa']);
  });

  it('asc simples e empate', () => {
    expect(cmpStr('a', 'b')).toBeLessThan(0);
    expect(cmpStr('b', 'a')).toBeGreaterThan(0);
    expect(cmpStr('a', 'a')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// mediana
// ---------------------------------------------------------------------------

describe('mediana', () => {
  it('lista vazia ⇒ null', () => {
    expect(mediana([])).toBeNull();
  });

  it('ímpar ⇒ elemento do meio', () => {
    expect(mediana([3, 1, 2])).toBe(2);
  });

  it('par ⇒ média dos 2 do meio', () => {
    expect(mediana([1, 2, 3, 4])).toBe(2.5);
  });
});

// ---------------------------------------------------------------------------
// parseDuracaoPit
// ---------------------------------------------------------------------------

describe('parseDuracaoPit', () => {
  it('formato "SS.mmm" (segundos)', () => {
    expect(parseDuracaoPit('21.867')).toBeCloseTo(21.867, 6);
  });

  it('formato "MM:SS.mmm" (parada longa)', () => {
    expect(parseDuracaoPit('1:02.345')).toBeCloseTo(62.345, 6);
  });
});

// ---------------------------------------------------------------------------
// recontarPosicoesRace — a prova central: um DNF alheio não pode dar posição
// de graça pra quem sobra atrás dele.
// ---------------------------------------------------------------------------

describe('recontarPosicoesRace', () => {
  it('DNF alheio na frente dá posição de graça no cálculo cru, mas a recontagem anula', () => {
    const results: ResultLinha[] = [
      linha({
        position: '18',
        grid: '1',
        status: 'Engine', // DNF — some da frente
        Driver: { driverId: 'dnf', givenName: 'D', familyName: 'N' },
      }),
      linha({
        position: '1',
        grid: '2',
        status: 'Finished',
        Driver: { driverId: 'e', givenName: 'E', familyName: 'E' },
      }),
      linha({
        position: '2',
        grid: '3',
        status: 'Finished',
        Driver: { driverId: 'f', givenName: 'F', familyName: 'F' },
      }),
    ];

    // Cru (sem recontagem): pos1-grid2=-1 e pos2-grid3=-1 — parece que ambos
    // "ganharam" 1 posição por causa do DNF que abriu um grid ali na frente.
    const rawE = Number(results[1].position) - Number(results[1].grid);
    const rawF = Number(results[2].position) - Number(results[2].grid);
    expect(rawE).toBe(-1);
    expect(rawF).toBe(-1);

    // Recontado (só entre quem terminou): 'e' e 'f' mantêm a MESMA ordem
    // relativa de grid e chegada entre si — delta 0 pros dois, a recontagem
    // anula o "presente" do DNF alheio.
    const deltas = recontarPosicoesRace(results);
    expect(deltas.get('e')).toBe(0);
    expect(deltas.get('f')).toBe(0);
    expect(deltas.has('dnf')).toBe(false);
  });

  it('sem ninguém terminando ⇒ mapa vazio', () => {
    const results: ResultLinha[] = [linha({ position: '1', grid: '1', status: 'Accident' })];
    expect(recontarPosicoesRace(results).size).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // grid "0" — sentinel da Ergast/Jolpica pra largada do pit-lane ou sem tempo
  // classificatório. Na prática, largar do pit lane é largar atrás de TODO o
  // grid — tratar 0 como pole (menor número) inverteria o sinal do
  // overachievement exatamente pros casos mais extremos (quem mais precisa
  // dessa métrica). Decisão do dev: grid "0" entra no recount DEPOIS de todos
  // os grid > 0, com cmpStr(driverId) como desempate entre eles.
  // ---------------------------------------------------------------------------

  it('grid "0" (pit lane/sem tempo) é tratado como ÚLTIMO no rank de grid do recount', () => {
    const results: ResultLinha[] = [
      linha({
        position: '1',
        grid: '0', // largou do pit lane — sem isso, Number('0')=0 pareceria pole
        status: 'Finished',
        Driver: { driverId: 'p0', givenName: 'P', familyName: 'Zero' },
      }),
      linha({
        position: '2',
        grid: '1',
        status: 'Finished',
        Driver: { driverId: 'g1', givenName: 'G', familyName: 'One' },
      }),
      linha({
        position: '3',
        grid: '2',
        status: 'Finished',
        Driver: { driverId: 'g2', givenName: 'G', familyName: 'Two' },
      }),
    ];

    // p0 larga por último (rank de grid = 3, não 1) e termina em P1 (rank de
    // chegada = 1): delta = 1 - 3 = -2 — overachievement genuíno, não um
    // artefato de "pole falsa". Os grid>0 mantêm a ordem normal entre si.
    const deltas = recontarPosicoesRace(results);
    expect(deltas.get('p0')).toBe(-2);
    expect(deltas.get('g1')).toBe(1);
    expect(deltas.get('g2')).toBe(1);
  });

  it('dois pilotos com grid "0" na mesma corrida desempatam por driverId (determinismo)', () => {
    const results: ResultLinha[] = [
      linha({
        position: '1',
        grid: '1',
        status: 'Finished',
        Driver: { driverId: 'n1', givenName: 'N', familyName: 'One' },
      }),
      linha({
        position: '2',
        grid: '0',
        status: 'Finished',
        Driver: { driverId: 'zulu', givenName: 'Z', familyName: 'Ulu' },
      }),
      linha({
        position: '3',
        grid: '0',
        status: 'Finished',
        Driver: { driverId: 'alfa', givenName: 'A', familyName: 'Lfa' },
      }),
    ];

    // Grid>0 sempre primeiro (n1 = rank 1). Entre os dois grid=0, 'alfa' vem
    // antes de 'zulu' por cmpStr(driverId) — não pela ordem de chegada nem de
    // aparição no array de Results.
    const deltas = recontarPosicoesRace(results);
    // n1: rankGrid=1, rankChegada=1 ⇒ delta 0.
    expect(deltas.get('n1')).toBe(0);
    // alfa: rankGrid=2 (desempate driverId asc entre os zeros), rankChegada=3 ⇒ delta 1.
    expect(deltas.get('alfa')).toBe(1);
    // zulu: rankGrid=3, rankChegada=2 ⇒ delta -1.
    expect(deltas.get('zulu')).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// escolherTitulares — desempate por pontos, depois driverId
// ---------------------------------------------------------------------------

describe('escolherTitulares', () => {
  it('ordena por largadas desc', () => {
    const escolhidos = escolherTitulares([
      { driverId: 'a', largadas: 3, pontos: 0 },
      { driverId: 'b', largadas: 5, pontos: 0 },
      { driverId: 'c', largadas: 1, pontos: 0 },
    ]);
    expect(escolhidos.map((c) => c.driverId)).toEqual(['b', 'a']);
  });

  it('empate em largadas ⇒ desempata por pontos desc', () => {
    const escolhidos = escolherTitulares([
      { driverId: 'a', largadas: 4, pontos: 10 },
      { driverId: 'b', largadas: 4, pontos: 20 },
    ]);
    expect(escolhidos.map((c) => c.driverId)).toEqual(['b', 'a']);
  });

  it('empate em largadas E pontos ⇒ desempata por driverId asc (determinismo)', () => {
    const escolhidos = escolherTitulares([
      { driverId: 'zulu', largadas: 4, pontos: 10 },
      { driverId: 'alfa', largadas: 4, pontos: 10 },
    ]);
    expect(escolhidos.map((c) => c.driverId)).toEqual(['alfa', 'zulu']);
  });
});

// ---------------------------------------------------------------------------
// Integração — fixtures em scripts/fixtures/jolpica-mini/
// ---------------------------------------------------------------------------

describe('agregarFatos — temporada histórica sintética (1955)', () => {
  const { fatos, temporadasAusentes } = agregarFatos(FIXTURES_DIR);
  const meta1955 = fatos.meta.temporadas.find((t) => t.season === 1955)!;

  it('exclui a Indy 500 (1950-1960) do número de etapas do ano', () => {
    // 4 rounds normais (1-4); o round 5 é a Indy e NÃO conta.
    expect(meta1955.etapas).toBe(4);
  });

  it('coleta status desconhecido em statusesNaoMapeados (auditoria explícita)', () => {
    expect(meta1955.statusesNaoMapeados).toEqual([{ status: 'Space Weather', contagem: 1 }]);
  });

  it('corte de escopo: equipe com 1 corrida só (beta) fica de fora', () => {
    expect(fatos.equipes.find((e) => e.constructorId === 'beta' && e.season === 1955)).toBeUndefined();
  });

  it('corte de escopo: equipe com 1 piloto só (gamma, mesmo com carro compartilhado) fica de fora', () => {
    expect(fatos.equipes.find((e) => e.constructorId === 'gamma' && e.season === 1955)).toBeUndefined();
  });

  it('equipe elegível (alfa) entra com as estatísticas corretas', () => {
    const alfa = fatos.equipes.find((e) => e.constructorId === 'alfa' && e.season === 1955);
    // gridPercentilGeral (PR 4.6.1 — dense-rank entre largadores REAIS com
    // grid>0, N = nº dessas linhas): sobre as 8 largadas de alfa (grid>0 em
    // todas).
    // ringA (N=6, grids 1..6 contíguos): dense-rank(grid)===grid, IDÊNTICO à
    // fórmula anterior ⇒ driver_a grid1 ⇒ (6-1+0.5)/6=11/12; driver_b grid2 ⇒
    // (6-2+0.5)/6=3/4.
    // ringB (N=4, grids largadores {2,3,4,9} — "Space Weather" é status
    // desconhecido mas NÃO é NAO_LARGOU, então grid=9 do driver_d CONTA como
    // largador): valores distintos ordenados {2,3,4,9} ⇒ dense-rank(2)=1,
    // dense-rank(3)=2 — GAP no grid (não é 1..N contíguo), então o rank
    // diverge do grid cru e o valor MUDA em relação ao PR 4.6: driver_a
    // grid2→rank1 ⇒ (4-1+0.5)/4=7/8 (antes: 5/8); driver_b grid3→rank2 ⇒
    // (4-2+0.5)/4=5/8 (antes: 3/8).
    // ringC/ringD (N=3, grids 1..3 contíguos): dense-rank(grid)===grid,
    // IDÊNTICO à fórmula anterior ⇒ driver_a grid1 ⇒ 5/6; driver_b grid2 ⇒ 1/2
    // (em ambas as corridas).
    // Soma dos 8 valores (24avos): 22+18+21+15+20+12+20+12=140 ⇒ 140/24=35/6.
    // Média: (35/6)/8=35/48=0.729166... ⇒ round4 0.7292.
    // ringA-D são circuitIds fictícios (fora da tabela real de circuit-buckets)
    // ⇒ `lookupBucket` cai no fallback 'neutro', então `porBucket` fica zerado.
    expect(alfa).toEqual({
      constructorId: 'alfa',
      nome: 'Alfa Racing',
      season: 1955,
      roundsLargados: 4,
      largadas: 8,
      terminou: 8,
      'acidente-erro': 0,
      'mecanica-chassi': 0,
      'mecanica-motor': 0,
      outro: 0,
      mediaGrid: 1.75,
      poles: 3,
      mediaChegadaTerminou: 1.5,
      overachievementMediano: 0,
      nParadas: null,
      medianaDeltaPit: null,
      fracaoParadasEstouradas: null,
      gridPercentilGeral: 0.7292,
      porBucket: {
        potencia: { largadas: 0, gridPercentil: null },
        travado: { largadas: 0, gridPercentil: null },
        aero: { largadas: 0, gridPercentil: null },
      },
    });
  });

  it('titulares de alfa (driver_a, driver_b) com deltaCompanheiroMediano não-nulo (4 corridas em comum)', () => {
    const titularesAlfa = fatos.titulares.filter((t) => t.constructorId === 'alfa' && t.season === 1955);
    expect(titularesAlfa.map((t) => t.driverId).sort()).toEqual(['driver_a', 'driver_b']);

    const a = titularesAlfa.find((t) => t.driverId === 'driver_a')!;
    expect(a).toEqual({
      driverId: 'driver_a',
      nome: 'Ayrton Alfieri',
      constructorId: 'alfa',
      season: 1955,
      largadas: 4,
      terminou: 4,
      'acidente-erro': 0,
      'mecanica-chassi': 0,
      'mecanica-motor': 0,
      outro: 0,
      mediaGrid: 1.25,
      poles: 3,
      mediaChegadaTerminou: 1,
      posGanhasAjustadasMediana: 0,
      deltaCompanheiroMediano: -1,
    });

    const b = titularesAlfa.find((t) => t.driverId === 'driver_b')!;
    expect(b.deltaCompanheiroMediano).toBe(1);
    expect(b.posGanhasAjustadasMediana).toBe(0);
  });

  it('temporadas sem pasta no cache aparecem em temporadasAusentes (ex.: 1950)', () => {
    expect(temporadasAusentes).toContain(1950);
    expect(temporadasAusentes).not.toContain(1955);
    expect(temporadasAusentes).not.toContain(2015);
  });
});

describe('agregarFatos — temporada moderna sintética (2015, com pitstops)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);
  const meta2015 = fatos.meta.temporadas.find((t) => t.season === 2015)!;

  it('etapas = 2, sem status desconhecido', () => {
    expect(meta2015.etapas).toBe(2);
    expect(meta2015.statusesNaoMapeados).toEqual([]);
  });

  it('corte de escopo: equipe com 1 piloto só (zeta) fica de fora mesmo passando no critério de rounds', () => {
    expect(fatos.equipes.find((e) => e.constructorId === 'zeta')).toBeUndefined();
  });

  it('equipe elegível (epsilon) com pit stats corretas (parse "SS.mmm" e "MM:SS.mmm", parada estourada)', () => {
    const epsilon = fatos.equipes.find((e) => e.constructorId === 'epsilon' && e.season === 2015);
    // gridPercentilGeral (PR 4.6): R1 (circA, N=3): driver_e grid2 ⇒
    // (3-2+0.5)/3=0.5, driver_f grid3 ⇒ (3-3+0.5)/3=0.1667. R2 (circB, N=2):
    // driver_e grid1 ⇒ (2-1+0.5)/2=0.75, driver_f grid2 ⇒ (2-2+0.5)/2=0.25.
    // Média dos 4 = 5/12 = 0.4167. circA/circB são fictícios ⇒ neutro/porBucket zerado.
    expect(epsilon).toEqual({
      constructorId: 'epsilon',
      nome: 'Epsilon Racing',
      season: 2015,
      roundsLargados: 2,
      largadas: 4,
      terminou: 3,
      'acidente-erro': 0,
      'mecanica-chassi': 1,
      'mecanica-motor': 0,
      outro: 0,
      mediaGrid: 2,
      poles: 1,
      mediaChegadaTerminou: 1.3333,
      overachievementMediano: 0,
      nParadas: 4,
      medianaDeltaPit: 0.1835,
      fracaoParadasEstouradas: 0.25,
      gridPercentilGeral: 0.4167,
      porBucket: {
        potencia: { largadas: 0, gridPercentil: null },
        travado: { largadas: 0, gridPercentil: null },
        aero: { largadas: 0, gridPercentil: null },
      },
    });
  });

  it('titulares de epsilon: deltaCompanheiroMediano null (só 1 corrida em comum com ambos terminando)', () => {
    const titularesEpsilon = fatos.titulares.filter((t) => t.constructorId === 'epsilon' && t.season === 2015);
    expect(titularesEpsilon.map((t) => t.driverId).sort()).toEqual(['driver_e', 'driver_f']);
    for (const t of titularesEpsilon) {
      expect(t.deltaCompanheiroMediano).toBeNull();
    }

    const e = titularesEpsilon.find((t) => t.driverId === 'driver_e')!;
    expect(e.largadas).toBe(2);
    expect(e.terminou).toBe(2);
    expect(e.poles).toBe(1);

    const f = titularesEpsilon.find((t) => t.driverId === 'driver_f')!;
    expect(f.largadas).toBe(2);
    expect(f.terminou).toBe(1);
    expect(f['mecanica-chassi']).toBe(1);
  });
});

describe('agregarFatos — temporada sintética com largada de pit lane, grid "0" (1956)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);
  const meta1956 = fatos.meta.temporadas.find((t) => t.season === 1956)!;

  it('etapas = 3, sem status desconhecido', () => {
    expect(meta1956.etapas).toBe(3);
    expect(meta1956.statusesNaoMapeados).toEqual([]);
  });

  it('equipe omega: mediaGrid e poles seguem IGNORANDO grid "0" (comportamento pré-existente, inalterado)', () => {
    const omega = fatos.equipes.find((e) => e.constructorId === 'omega' && e.season === 1956);
    // gridPercentilGeral (PR 4.6.1 — dense-rank entre largadores REAIS com
    // grid>0): as 3 largadas de driver_p0 (grid "0") são EXCLUÍDAS da métrica
    // (mesmo precedente do mediaGrid) e NÃO contam no N. Em cada round, o
    // único largador com grid>0 é driver_q (driver_p0 tem grid "0") ⇒ N=1,
    // rank=1 sempre, independente do valor cru do grid: R1 (grid1) ⇒
    // (1-1+0.5)/1=0.5; R2 (grid2) ⇒ 0.5; R3 (grid3) ⇒ 0.5 — antes do fix (PR
    // 4.6), N incluía a linha de grid "0" (N=2) e usava o grid CRU como rank,
    // dando (2-3+0.5)/2=-0.25 em R3 (fora de [0,1], o bug corrigido aqui).
    // Média nova = 0.5.
    expect(omega).toEqual({
      constructorId: 'omega',
      nome: 'Omega Racing',
      season: 1956,
      roundsLargados: 3,
      largadas: 6,
      terminou: 6,
      'acidente-erro': 0,
      'mecanica-chassi': 0,
      'mecanica-motor': 0,
      outro: 0,
      // driver_p0 largou "0" nas 3 corridas — EXCLUÍDO da média (só grid>0
      // entra); mediaGrid é só sobre driver_q (grid 1, 2, 3).
      mediaGrid: 2,
      // idem: poles conta grid===1 — driver_p0 (grid "0") nunca conta como
      // pole, mesmo tendo vencido as 3 corridas.
      poles: 1,
      mediaChegadaTerminou: 1.5,
      overachievementMediano: 0,
      nParadas: null,
      medianaDeltaPit: null,
      fracaoParadasEstouradas: null,
      gridPercentilGeral: 0.5,
      porBucket: {
        potencia: { largadas: 0, gridPercentil: null },
        travado: { largadas: 0, gridPercentil: null },
        aero: { largadas: 0, gridPercentil: null },
      },
    });
  });

  it('titular driver_p0 (largou "0" e venceu as 3 corridas): overachievement individual capturado corretamente', () => {
    const p0 = fatos.titulares.find((t) => t.driverId === 'driver_p0' && t.season === 1956)!;
    // Recontado como se largasse por último (não pole): posGanhasAjustadasMediana
    // negativo e constante (-1) em TODAS as 3 corridas — sinal de
    // overachievement real, não um artefato de "pole falsa" no grid "0".
    expect(p0.posGanhasAjustadasMediana).toBe(-1);
    // mediaGrid do titular também ignora grid "0" (nenhuma largada com grid>0) ⇒ null.
    expect(p0.mediaGrid).toBeNull();
    // poles do titular não conta grid "0" mesmo vencendo sempre.
    expect(p0.poles).toBe(0);
    expect(p0.deltaCompanheiroMediano).toBe(-1);
  });

  it('titular driver_q (companheiro, grid>0 normal): overachievement individual espelhado (+1)', () => {
    const q = fatos.titulares.find((t) => t.driverId === 'driver_q' && t.season === 1956)!;
    expect(q.posGanhasAjustadasMediana).toBe(1);
    expect(q.mediaGrid).toBe(2);
    expect(q.poles).toBe(1);
    expect(q.deltaCompanheiroMediano).toBe(1);
  });
});

describe('agregarFatos — NAO_LARGOU (grid "0" real + "Did not qualify", 1957)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);
  const meta1957 = fatos.meta.temporadas.find((t) => t.season === 1957)!;

  it('etapas = 4, sem status desconhecido ("Did not qualify" é conhecido, some da auditoria)', () => {
    expect(meta1957.etapas).toBe(4);
    expect(meta1957.statusesNaoMapeados).toEqual([]);
  });

  it('não vira largada: kappa3 tem 1 largada real + 2 linhas "Did not qualify" — largadas da equipe EXCLUI as 2', () => {
    const kappa = fatos.equipes.find((e) => e.constructorId === 'kappa' && e.season === 1957);
    expect(kappa).toBeDefined();
    // 9 = 4 (kappa1) + 4 (kappa2) + 1 (kappa3, só a largada real). Se as 2
    // linhas "Did not qualify" de kappa3 fossem contadas, daria 11.
    expect(kappa!.largadas).toBe(9);
    expect(kappa!.roundsLargados).toBe(4);
    expect(kappa!.mediaGrid).toBe(1.6667);
    expect(kappa!.poles).toBe(4);
  });

  it('não habilita equipe no corte: lambda2 só tem 1 largada REAL (a "Did not qualify" não conta) ⇒ lambda fica de fora', () => {
    // Sem o fix, lambda2 teria "2 largadas" (1 real + 1 DNQ) e lambda passaria
    // no corte de pilotosCom2Largadas>=2 (lambda1 real=4, lambda2 "2"). Com o
    // fix, lambda2 tem 1 largada real só ⇒ só lambda1 qualifica ⇒ equipe fora.
    expect(fatos.equipes.find((e) => e.constructorId === 'lambda' && e.season === 1957)).toBeUndefined();
  });

  it('não vira titular: kappa3 (1 largada real) fica de fora dos titulares de kappa', () => {
    const titularesKappa = fatos.titulares.filter((t) => t.constructorId === 'kappa' && t.season === 1957);
    expect(titularesKappa.map((t) => t.driverId).sort()).toEqual(['driver_kappa1', 'driver_kappa2']);
  });

  it('sem titulares de lambda (equipe inteira fora do corte)', () => {
    expect(fatos.titulares.filter((t) => t.constructorId === 'lambda' && t.season === 1957)).toEqual([]);
  });
});

describe('agregarFatos — mesmo driverId em 2 equipes na mesma temporada (troca de equipe, 1958)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);

  it('driver_switch gera 2 entradas em titulares (uma por equipe), com amostras INDEPENDENTES', () => {
    const entradas = fatos.titulares.filter((t) => t.driverId === 'driver_switch' && t.season === 1958);
    expect(entradas.map((t) => t.constructorId).sort()).toEqual(['mu', 'nu']);

    const naMu = entradas.find((t) => t.constructorId === 'mu')!;
    expect(naMu.largadas).toBe(2);
    expect(naMu.mediaGrid).toBe(1);
    expect(naMu.poles).toBe(2);
    expect(naMu.posGanhasAjustadasMediana).toBe(0);
    expect(naMu.deltaCompanheiroMediano).toBe(-1);

    const naNu = entradas.find((t) => t.constructorId === 'nu')!;
    expect(naNu.largadas).toBe(2);
    expect(naNu.mediaGrid).toBe(3);
    expect(naNu.poles).toBe(0);
    expect(naNu.posGanhasAjustadasMediana).toBe(-1);
    expect(naNu.deltaCompanheiroMediano).toBe(-1);

    // As amostras não se misturam: nenhuma estatística de uma equipe vaza pra
    // outra (2 largadas em cada, não 4 combinadas; mediaGrid/poles distintos).
    expect(naMu.largadas + naNu.largadas).toBe(4);
    expect(naMu.mediaGrid).not.toBe(naNu.mediaGrid);
  });

  it('equipe mu e equipe nu têm estatísticas próprias (não combinadas)', () => {
    const mu = fatos.equipes.find((e) => e.constructorId === 'mu' && e.season === 1958)!;
    const nu = fatos.equipes.find((e) => e.constructorId === 'nu' && e.season === 1958)!;
    expect(mu.largadas).toBe(4);
    expect(mu.mediaGrid).toBe(1.5);
    expect(mu.poles).toBe(2);
    expect(nu.largadas).toBe(4);
    expect(nu.mediaGrid).toBe(2);
    expect(nu.poles).toBe(2);
  });
});

describe('agregarFatos — buckets de circuito (PR 4.6, circuitos reais monza/monaco/interlagos, 1959)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);

  it('equipe psi: gridPercentilGeral e porBucket calculados à mão', () => {
    const psi = fatos.equipes.find((e) => e.constructorId === 'psi' && e.season === 1959);
    // PR 4.6.1 — dense-rank entre largadores REAIS com grid>0, N = nº dessas
    // linhas (exclui grid "0" do N, não só do numerador).
    // R1 monza (potencia, grids largadores {1,2,3,4} contíguos, N=4):
    // dense-rank(grid)===grid, IDÊNTICO à fórmula anterior ⇒ psi1 grid1 ⇒
    // (4-1+0.5)/4=0.875; psi2 grid3 ⇒ (4-3+0.5)/4=0.375.
    // R2 monaco (travado): psi2 tem grid "0" (pit lane) ⇒ EXCLUÍDO da
    // métrica E do N (diferente do PR 4.6, que incluía a linha de grid "0" no
    // N). Largadores com grid>0: {filler_c=1, psi1=2, filler_d=3} ⇒ N=3 (não
    // 4). dense-rank(2)=2 ⇒ psi1 ⇒ (3-2+0.5)/3=0.5 (antes do fix: 0.625).
    // R3 interlagos (neutro, grids {1,2,3} contíguos, N=3): dense-rank(grid)
    // ===grid, IDÊNTICO à fórmula anterior ⇒ psi1 grid1 ⇒ (3-1+0.5)/3=0.8333;
    //                                          psi2 grid2 ⇒ (3-2+0.5)/3=0.5.
    // gridPercentilGeral: média dos 5 valores válidos (psi2/R2 excluído):
    // [0.875, 0.375, 0.5, 0.8333333, 0.5] soma 3.0833333, média 0.6166667 ⇒ 0.6167.
    // potencia: largadas=2 (psi1+psi2), gridPercentil = média([0.875,0.375]) = 0.625 (inalterado).
    // travado: largadas=2 (psi1+psi2, psi2 conta como largada mesmo com grid "0"),
    //          gridPercentil = média só do válido [0.5] = 0.5 (antes: 0.625).
    // aero: psi nunca correu em circuito aero ⇒ largadas=0, gridPercentil=null.
    expect(psi).toBeDefined();
    expect(psi!.largadas).toBe(6);
    expect(psi!.gridPercentilGeral).toBe(0.6167);
    expect(psi!.porBucket).toEqual({
      potencia: { largadas: 2, gridPercentil: 0.625 },
      travado: { largadas: 2, gridPercentil: 0.5 },
      aero: { largadas: 0, gridPercentil: null },
    });
  });
});

describe('agregarFatos — circuitosNaoMapeados (auditoria, PR 4.6)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);

  it('coleta os circuitIds fictícios das fixtures (fora da tabela real) em meta.circuitosNaoMapeados', () => {
    // Todos os circuitIds sintéticos das fixtures 1955/1956/1957/1958/2015
    // (ringA-D, circO1-3, circK1-4, circM1-2, circN1-2, circA/circB) —
    // 'indianapolis' (1955 round 5) é EXCLUÍDO antes de qualquer processamento
    // (D1) e nunca chega no lookupBucket; monza/monaco/interlagos (1959) são
    // reais e mapeados, não aparecem aqui. Ordenado por cmpStr (code unit).
    expect(fatos.meta.circuitosNaoMapeados).toEqual([
      'circA',
      'circB',
      'circK1',
      'circK2',
      'circK3',
      'circK4',
      'circM1',
      'circM2',
      'circN1',
      'circN2',
      'circO1',
      'circO2',
      'circO3',
      'ringA',
      'ringB',
      'ringC',
      'ringD',
    ]);
  });
});

// ---------------------------------------------------------------------------
// PR 4.6.1 — percentil de grid corrigido: dense-rank entre largadores REAIS
// (grid>0), N = nº dessas linhas. Corrige o bug do PR 4.6 em que qualificados
// que não largaram (DNS/DNQ, comuns nos anos 50) faziam grid>N e o percentil
// sair de [0,1] (ver `percentilGridDaLinha` em agregar-fatos.ts).
// ---------------------------------------------------------------------------

describe('agregarFatos — dense-rank entre largadores reais (PR 4.6.1, DNS de qualificados, 1951)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);

  it('equipe iota: largador real com grid > nº de largadores não gera percentil fora de [0,1]', () => {
    const iota = fatos.equipes.find((e) => e.constructorId === 'iota' && e.season === 1951);
    // R1 interlagos (neutro): 8 posições de grid, só 3 largam de fato (as
    // outras 5 são "Did not qualify" com grid 1,2,4,6,7 — qualificaram mas
    // não largaram). Largadores reais: driver_i1 grid3, driver_f5 (filler,
    // fora de iota) grid5, driver_i2 grid8. N = 3 (só linhas com grid>0 que
    // largaram), valores distintos ordenados {3,5,8} ⇒ dense-rank(3)=1,
    // dense-rank(5)=2, dense-rank(8)=3 ⇒ percentis (3-1+0.5)/3=0.8333,
    // (3-2+0.5)/3=0.5, (3-3+0.5)/3=0.1667 — exatamente os valores do plano
    // aprovado. iota só tem driver_i1 (grid3 ⇒ 0.8333) e driver_i2 (grid8 ⇒
    // 0.1667) nesta corrida; driver_f5 (grid5 ⇒ 0.5) é de outra equipe.
    // ANTES do fix (PR 4.6): N incluía só as 3 linhas que largaram (idêntico
    // aqui), mas a fórmula usava o grid CRU como rank — driver_i2 (grid8, N=3)
    // dava (3-8+0.5)/3=-1.5 (fora de [0,1], o bug relatado na revisão do 4.6).
    // R2 nurburgring (neutro, grids 1,2 contíguos, N=2, sem DNS): dense-rank
    // ===grid, IDÊNTICO à fórmula anterior ⇒ driver_i1 grid1 ⇒
    // (2-1+0.5)/2=0.75; driver_i2 grid2 ⇒ (2-2+0.5)/2=0.25.
    // gridPercentilGeral = média dos 4 valores [0.8333333, 0.1666667, 0.75,
    // 0.25] = 2/4 = 0.5 exatamente.
    expect(iota).toBeDefined();
    expect(iota!.largadas).toBe(4);
    expect(iota!.gridPercentilGeral).toBe(0.5);
  });
});

describe('agregarFatos — invariante (0,1) e grid "0" excluído do N (PR 4.6.1, 1951/1952)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);

  it('todo gridPercentilGeral calculado cai estritamente em (0,1), mesmo com DNS de qualificados', () => {
    const iota = fatos.equipes.find((e) => e.constructorId === 'iota' && e.season === 1951)!;
    expect(iota.gridPercentilGeral).not.toBeNull();
    expect(iota.gridPercentilGeral!).toBeGreaterThan(0);
    expect(iota.gridPercentilGeral!).toBeLessThan(1);
  });

  it('grid "0" no meio do campo: excluído do percentil E do N (não só do numerador) — resultado em (0,1)', () => {
    const tau = fatos.equipes.find((e) => e.constructorId === 'tau' && e.season === 1952);
    // R1 sepang (neutro): 5 posições de grid, driver_g1/driver_g4 são "Did not
    // qualify" (grid 1 e 4, fora do N). Largadores reais: driver_t1 grid2,
    // driver_t2 grid0 (pit lane — EXCLUÍDO do percentil E do N, mesma
    // convenção de mediaGrid), driver_g3 (filler2) grid3. N = 2 (só as linhas
    // de grid>0 que largaram: driver_t1 e driver_g3 — driver_t2/grid0 NÃO
    // conta no N). Valores distintos ordenados {2,3} ⇒ dense-rank(2)=1 ⇒
    // driver_t1: (2-1+0.5)/2=0.75. driver_t2 (grid0) ⇒ null, mas CONTA em
    // `largadas`.
    // R2 albert_park (neutro, grids 1,2 contíguos, N=2, sem grid "0"):
    // driver_t1 grid1 ⇒ (2-1+0.5)/2=0.75; driver_t2 grid2 ⇒
    // (2-2+0.5)/2=0.25.
    // gridPercentilGeral = média dos 3 valores válidos (driver_t2/R1
    // excluído): [0.75, 0.75, 0.25] soma 1.75, média 1.75/3=0.5833333 ⇒
    // round4 0.5833.
    expect(tau).toBeDefined();
    expect(tau!.largadas).toBe(4);
    expect(tau!.gridPercentilGeral).toBe(0.5833);
    expect(tau!.gridPercentilGeral!).toBeGreaterThan(0);
    expect(tau!.gridPercentilGeral!).toBeLessThan(1);
  });
});

describe('agregarFatos — dense-rank com grids duplicados (PR 4.6.1, anomalia de dado, 1954)', () => {
  const { fatos } = agregarFatos(FIXTURES_DIR);

  it('dois largadores com o MESMO grid cru recebem o MESMO rank (e o mesmo percentil)', () => {
    const upsilon = fatos.equipes.find((e) => e.constructorId === 'upsilon' && e.season === 1954);
    // R1 shanghai (neutro): driver_u1 e driver_u2 largam AMBOS com grid=5
    // (anomalia de dado — duplicado), driver_u3f (fillerC) grid=9. N=3,
    // valores distintos ordenados {5,9} ⇒ dense-rank(5)=1 PRA AMBOS (não 1 e
    // 2) ⇒ driver_u1 e driver_u2 ⇒ (3-1+0.5)/3=2.5/3=0.8333333 CADA UM — se o
    // rank fosse ordinal (desempatando por ordem/driverId em vez de dense),
    // um dos dois receberia rank 2 ⇒ (3-2+0.5)/3=0.5, um valor DIFERENTE do
    // outro, o que este teste detectaria via gridPercentilGeral divergente do
    // valor calculado à mão abaixo.
    // R2 yas_marina (neutro): driver_u1 e driver_u2 largam AMBOS com grid=7
    // (duplicado de novo), sem outro largador ⇒ N=2, valores distintos {7} ⇒
    // dense-rank(7)=1 PRA AMBOS ⇒ (2-1+0.5)/2=1.5/2=0.75 CADA UM.
    // gridPercentilGeral = média dos 4 valores [0.8333333, 0.8333333, 0.75,
    // 0.75] = (2×2.5/3 + 2×1.5/2)/4 = (5/3+1.5)/4 = 3.1666667/4=0.7916667 ⇒
    // round4 0.7917.
    expect(upsilon).toBeDefined();
    expect(upsilon!.largadas).toBe(4);
    expect(upsilon!.gridPercentilGeral).toBe(0.7917);
  });
});

// ---------------------------------------------------------------------------
// Determinismo byte a byte
// ---------------------------------------------------------------------------

describe('determinismo', () => {
  it('agregar 2x sobre o mesmo cache ⇒ mesma string byte a byte', () => {
    const primeira = serializarFatos(agregarFatos(FIXTURES_DIR).fatos);
    const segunda = serializarFatos(agregarFatos(FIXTURES_DIR).fatos);
    expect(primeira).toBe(segunda);
  });
});
