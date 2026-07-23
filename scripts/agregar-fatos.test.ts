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
    // gridPercentilGeral (PR 4.6): média de (N-grid+0.5)/N sobre as 8 largadas
    // de alfa (grid>0 em todas), N = nº de largadores da PROVA inteira
    // (ringA N=6, ringB N=4, ringC N=3, ringD N=3) — valores calculados à mão:
    // [11/12, 3/4, 5/8, 3/8, 5/6, 1/2, 5/6, 1/2], soma 16/3, média 2/3 ⇒ 0.6667.
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
      gridPercentilGeral: 0.6667,
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
    // gridPercentilGeral (PR 4.6): as 3 largadas de driver_p0 (grid "0") são
    // EXCLUÍDAS da métrica (mesmo precedente do mediaGrid). Só driver_q entra:
    // R1 (N=2,grid1)=(2-1+0.5)/2=0.75; R2 (N=2,grid2)=(2-2+0.5)/2=0.25;
    // R3 (N=2,grid3)=(2-3+0.5)/2=-0.25 (fixture sintética minimalista: só 2
    // linhas de Results por corrida, então N=2 mesmo com grid=3 — percentil
    // pode sair fora de [0,1], a fórmula não clampa). Média = 0.75/3 = 0.25.
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
      gridPercentilGeral: 0.25,
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
    // R1 monza (potencia, N=4): psi1 grid1 ⇒ (4-1+0.5)/4=0.875;
    //                            psi2 grid3 ⇒ (4-3+0.5)/4=0.375.
    // R2 monaco (travado, N=4): psi1 grid2 ⇒ (4-2+0.5)/4=0.625;
    //                            psi2 grid0 (pit lane) ⇒ EXCLUÍDO da métrica.
    // R3 interlagos (neutro, N=3): psi1 grid1 ⇒ (3-1+0.5)/3=0.8333;
    //                               psi2 grid2 ⇒ (3-2+0.5)/3=0.5.
    // gridPercentilGeral: média dos 5 valores válidos (psi2/R2 excluído):
    // [0.875, 0.375, 0.625, 0.8333333, 0.5] soma 3.2083333, média 0.6416667 ⇒ 0.6417.
    // potencia: largadas=2 (psi1+psi2), gridPercentil = média([0.875,0.375]) = 0.625.
    // travado: largadas=2 (psi1+psi2, psi2 conta como largada mesmo com grid "0"),
    //          gridPercentil = média só do válido [0.625] = 0.625.
    // aero: psi nunca correu em circuito aero ⇒ largadas=0, gridPercentil=null.
    expect(psi).toBeDefined();
    expect(psi!.largadas).toBe(6);
    expect(psi!.gridPercentilGeral).toBe(0.6417);
    expect(psi!.porBucket).toEqual({
      potencia: { largadas: 2, gridPercentil: 0.625 },
      travado: { largadas: 2, gridPercentil: 0.625 },
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
// Determinismo byte a byte
// ---------------------------------------------------------------------------

describe('determinismo', () => {
  it('agregar 2x sobre o mesmo cache ⇒ mesma string byte a byte', () => {
    const primeira = serializarFatos(agregarFatos(FIXTURES_DIR).fatos);
    const segunda = serializarFatos(agregarFatos(FIXTURES_DIR).fatos);
    expect(primeira).toBe(segunda);
  });
});
