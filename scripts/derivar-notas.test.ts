import { describe, expect, it } from 'vitest';
import {
  derivarNotas,
  paraNota,
  pctDoPool,
  percentilHazen,
  prepararPool,
  priorPonderado,
  serializarDerivado,
  shrink,
  slug,
  verificarColisaoDeIds,
} from './derivar-notas.ts';
import type { EquipeAnoFatos, FatosAgregados, TitularAnoFatos } from './agregar-fatos.ts';
import { criarDataset } from '../src/engine/dataset.ts';
import fatosReal from './derived/fatos-agregados.json';
import pecasReal from '../src/data/pecas.json';
import pistasReal from '../src/data/pistas.json';

describe('percentilHazen', () => {
  it('n=1 ⇒ percentil neutro 0.5 (Hazen: (1-0.5)/1)', () => {
    expect(percentilHazen([10], 10)).toBeCloseTo(0.5, 10);
  });

  it('sem empates: rank crescente ⇒ percentil crescente (Hazen (rank-0.5)/n)', () => {
    const valores = [10, 20, 30, 40];
    expect(percentilHazen(valores, 10)).toBeCloseTo(0.5 / 4, 10);
    expect(percentilHazen(valores, 20)).toBeCloseTo(1.5 / 4, 10);
    expect(percentilHazen(valores, 30)).toBeCloseTo(2.5 / 4, 10);
    expect(percentilHazen(valores, 40)).toBeCloseTo(3.5 / 4, 10);
  });

  it('empates ⇒ rank médio do grupo empatado', () => {
    // 4 valores, 2 empatados em 20: sem empate ocupariam os ranks 2 e 3;
    // com empate ambos recebem o rank médio 2.5 ⇒ percentil (2.5-0.5)/4 = 0.5.
    const valores = [10, 20, 20, 40];
    expect(percentilHazen(valores, 20)).toBeCloseTo(0.5, 10);
  });

  it('empate total (todos os valores iguais) ⇒ percentil neutro 0.5', () => {
    const valores = [5, 5, 5, 5, 5];
    expect(percentilHazen(valores, 5)).toBeCloseTo(0.5, 10);
  });

  it('n pequeno (n=2): valor menor ⇒ percentil 0.25, maior ⇒ 0.75', () => {
    const valores = [10, 20];
    expect(percentilHazen(valores, 10)).toBeCloseTo(0.25, 10);
    expect(percentilHazen(valores, 20)).toBeCloseTo(0.75, 10);
  });

  it('inversão de sinal: grid menor (melhor) ⇒ percentil maior quando se ranqueia por -grid', () => {
    // GDD: grid menor é melhor. Convenção: quem chama nega o valor antes de
    // ranquear (pct(-mediaGrid)) — grid=1 (pole) deve virar o percentil mais
    // alto do grupo.
    const grids = [1, 5, 10, 20];
    const negados = grids.map((g) => -g);
    const percentilPole = percentilHazen(negados, -1);
    const percentilUltimo = percentilHazen(negados, -20);
    expect(percentilPole).toBeGreaterThan(percentilUltimo);
    expect(percentilPole).toBeCloseTo(3.5 / 4, 10);
  });
});

describe('shrink', () => {
  it('n=0 ⇒ resultado é a média da temporada, independente do valor bruto', () => {
    expect(shrink(999, 0, 50, 8)).toBeCloseTo(50, 10);
    expect(shrink(-999, 0, 50, 8)).toBeCloseTo(50, 10);
  });

  it('n grande ⇒ resultado converge pro valor bruto (média da temporada pesa pouco)', () => {
    const resultado = shrink(80, 100_000, 50, 8);
    expect(resultado).toBeCloseTo(80, 2);
  });

  it('n = pseudoN ⇒ resultado é a média simples entre valor e média da temporada', () => {
    expect(shrink(80, 8, 50, 8)).toBeCloseTo(65, 10);
  });
});

describe('paraNota', () => {
  it('bordas: percentil 0 ⇒ mínimo da faixa; percentil 1 ⇒ máximo da faixa (default [28,96])', () => {
    expect(paraNota(0)).toBe(28);
    expect(paraNota(1)).toBe(96);
  });

  it('percentil 0.5 ⇒ meio da faixa (arredondado)', () => {
    expect(paraNota(0.5)).toBe(62); // 28 + 0.5*(96-28) = 62
  });

  it('faixa customizada (CALL/SANGF comprimido [35,80])', () => {
    expect(paraNota(0, [35, 80])).toBe(35);
    expect(paraNota(1, [35, 80])).toBe(80);
  });

  it('faixa customizada (pit pré-2011, proxy [42,58])', () => {
    expect(paraNota(0, [42, 58])).toBe(42);
    expect(paraNota(1, [42, 58])).toBe(58);
    expect(paraNota(0.5, [42, 58])).toBe(50);
  });

  it('resultado é sempre inteiro', () => {
    expect(Number.isInteger(paraNota(0.3333))).toBe(true);
  });
});

describe('slug', () => {
  it('lowercase e espaços/underscores viram hífen', () => {
    expect(slug('Red_Bull Racing')).toBe('red-bull-racing');
  });

  it('já-hífen fica intacto', () => {
    expect(slug('brabham-alfa_romeo')).toBe('brabham-alfa-romeo');
  });

  it('não deixa hífens duplicados nem nas pontas', () => {
    expect(slug('_ford__cosworth_')).toBe('ford-cosworth');
  });
});

describe('priorPonderado', () => {
  it('média ponderada por peso, ignorando entradas nulas', () => {
    expect(priorPonderado([{ valor: 10, peso: 5 }, { valor: 20, peso: 5 }])).toBeCloseTo(15, 10);
    expect(
      priorPonderado([
        { valor: 10, peso: 5 },
        { valor: null, peso: 100 },
        { valor: 20, peso: 5 },
      ]),
    ).toBeCloseTo(15, 10);
  });

  it('peso total 0 (ou tudo nulo) ⇒ null', () => {
    expect(priorPonderado([])).toBeNull();
    expect(priorPonderado([{ valor: null, peso: 5 }])).toBeNull();
  });
});

describe('prepararPool', () => {
  it('sem shrink: repassa o valor bruto direto, ignorando nulos', () => {
    const pool = prepararPool(
      [
        { chave: 'a', valor: 10, peso: 5 },
        { chave: 'b', valor: null, peso: 5 },
      ],
      false,
    );
    expect(pool.get('a')).toBe(10);
    expect(pool.has('b')).toBe(false);
  });

  it('com shrink: aplica shrink(valor, peso, prior) por entrada', () => {
    const pool = prepararPool(
      [
        { chave: 'a', valor: 10, peso: 0 }, // n=0 ⇒ deve virar o prior
        { chave: 'b', valor: 20, peso: 5 },
      ],
      true,
      8,
    );
    // prior = média ponderada (só 'b' pesa, pois 'a' tem peso 0): 20
    expect(pool.get('a')).toBeCloseTo(20, 10); // n=0 ⇒ vira o prior
    expect(pool.get('b')).toBeCloseTo(shrink(20, 5, 20, 8), 10);
  });
});

describe('pctDoPool', () => {
  it('chave ausente do pool ⇒ 0.5 neutro (stat nula pra essa entidade)', () => {
    const pool = new Map([['a', 10]]);
    expect(pctDoPool(pool, 'ausente', 'maior')).toBe(0.5);
  });

  it('direção "menor": valor menor ⇒ percentil maior', () => {
    const pool = new Map([
      ['a', 1],
      ['b', 10],
    ]);
    expect(pctDoPool(pool, 'a', 'menor')).toBeGreaterThan(pctDoPool(pool, 'b', 'menor'));
  });

  it('direção "maior": valor maior ⇒ percentil maior', () => {
    const pool = new Map([
      ['a', 1],
      ['b', 10],
    ]);
    expect(pctDoPool(pool, 'b', 'maior')).toBeGreaterThan(pctDoPool(pool, 'a', 'maior'));
  });
});

// -----------------------------------------------------------------------------
// derivarNotas — fatos SINTÉTICOS com valores calculados à mão (não apenas
// estrutura/ordenação — os números abaixo foram derivados manualmente da
// fórmula pra pegar erro de wiring, não só de forma).
// -----------------------------------------------------------------------------

function equipeFatos(parcial: Partial<EquipeAnoFatos> & Pick<EquipeAnoFatos, 'constructorId' | 'season'>): EquipeAnoFatos {
  return {
    nome: parcial.constructorId,
    roundsLargados: 5,
    largadas: 10,
    terminou: 8,
    'acidente-erro': 0,
    'mecanica-chassi': 0,
    'mecanica-motor': 0,
    outro: 0,
    mediaGrid: null,
    poles: 0,
    mediaChegadaTerminou: null,
    overachievementMediano: null,
    nParadas: null,
    medianaDeltaPit: null,
    fracaoParadasEstouradas: null,
    ...parcial,
  };
}

function titularFatos(parcial: Partial<TitularAnoFatos> & Pick<TitularAnoFatos, 'driverId' | 'constructorId' | 'season'>): TitularAnoFatos {
  return {
    nome: parcial.driverId,
    largadas: 5,
    terminou: 4,
    'acidente-erro': 0,
    'mecanica-chassi': 0,
    'mecanica-motor': 0,
    outro: 0,
    mediaGrid: null,
    poles: 0,
    mediaChegadaTerminou: null,
    posGanhasAjustadasMediana: null,
    deltaCompanheiroMediano: null,
    ...parcial,
  };
}

// Temporada 1960 (pré-2011 ⇒ pit é proxy), 2 equipes com performance
// nitidamente distinta (equipe X forte, equipe Y fraca) — permite calcular à
// mão o percentil de Hazen (n=2 ⇒ sempre 0.75/0.25 quando distintos e sem
// empate) e o shrink (n=largadas fixo em 5/equipe, 10/titular).
const equipeX = equipeFatos({
  constructorId: 'x',
  nome: 'Equipe X',
  season: 1960,
  'acidente-erro': 1,
  'mecanica-chassi': 1,
  mediaGrid: 2.0,
  poles: 3,
  mediaChegadaTerminou: 1.5,
  overachievementMediano: -0.5,
});
const equipeY = equipeFatos({
  constructorId: 'y',
  nome: 'Equipe Y',
  season: 1960,
  terminou: 6,
  'acidente-erro': 2,
  'mecanica-chassi': 2,
  'mecanica-motor': 1,
  mediaGrid: 8.0,
  poles: 0,
  mediaChegadaTerminou: 7.0,
  overachievementMediano: 0.5,
});
const x1 = titularFatos({
  driverId: 'x1',
  constructorId: 'x',
  season: 1960,
  'acidente-erro': 0,
  mediaGrid: 1.5,
  poles: 2,
  mediaChegadaTerminou: 1.0,
  posGanhasAjustadasMediana: -1,
  deltaCompanheiroMediano: -1,
});
const x2 = titularFatos({
  driverId: 'x2',
  constructorId: 'x',
  season: 1960,
  'acidente-erro': 1,
  mediaGrid: 2.5,
  poles: 1,
  mediaChegadaTerminou: 2.0,
  posGanhasAjustadasMediana: 0,
  deltaCompanheiroMediano: 1,
});
const y1 = titularFatos({
  driverId: 'y1',
  constructorId: 'y',
  season: 1960,
  terminou: 3,
  'acidente-erro': 1,
  'mecanica-chassi': 1,
  'mecanica-motor': 1,
  mediaGrid: 7.5,
  poles: 0,
  mediaChegadaTerminou: 6.0,
  posGanhasAjustadasMediana: 1,
  deltaCompanheiroMediano: null, // <2 corridas com ambos titulares terminando
});
const y2 = titularFatos({
  driverId: 'y2',
  constructorId: 'y',
  season: 1960,
  terminou: 3,
  'acidente-erro': 1,
  'mecanica-chassi': 1,
  mediaGrid: 8.5,
  poles: 0,
  mediaChegadaTerminou: 8.0,
  posGanhasAjustadasMediana: 0.5,
  deltaCompanheiroMediano: null,
});

const fatosSinteticos: FatosAgregados = {
  meta: { geradoDe: 'teste', temporadas: [{ season: 1960, etapas: 5, statusesNaoMapeados: [] }] },
  equipes: [equipeX, equipeY],
  titulares: [x1, x2, y1, y2],
};

describe('derivarNotas (fatos sintéticos, valores calculados à mão)', () => {
  const derivado = derivarNotas(fatosSinteticos);
  const porEquipe = (id: string) => derivado.find((e) => e.equipe === (id === 'x' ? 'Equipe X' : 'Equipe Y'))!;

  it('QUALI: x1 (melhor grid+poles) ⇒ 88; y2 (pior) ⇒ 38 (shrink + Hazen calculados à mão)', () => {
    const eqX = porEquipe('x');
    const eqY = porEquipe('y');
    const p1 = eqX.pilotos.find((p) => p.id.endsWith('piloto-x1'))!;
    const p2 = eqY.pilotos.find((p) => p.id.endsWith('piloto-y2'))!;
    expect(p1.notas.quali).toBe(88);
    expect(p2.notas.quali).toBe(38);
  });

  it('RIT: null de deltaCompanheiroMediano cai no 0.5 neutro (x2 e y1 empatam em 58 apesar de fatos diferentes)', () => {
    const eqX = porEquipe('x');
    const eqY = porEquipe('y');
    const p1 = eqX.pilotos.find((p) => p.id.endsWith('piloto-x1'))!;
    const px2 = eqX.pilotos.find((p) => p.id.endsWith('piloto-x2'))!;
    const py1 = eqY.pilotos.find((p) => p.id.endsWith('piloto-y1'))!;
    const py2 = eqY.pilotos.find((p) => p.id.endsWith('piloto-y2'))!;
    expect(p1.notas.rit).toBe(83);
    expect(px2.notas.rit).toBe(58);
    expect(py1.notas.rit).toBe(58); // null delta ⇒ 0.5 neutro, mesmo pct que x2
    expect(py2.notas.rit).toBe(49);
  });

  it('CONS: x1 (0 acidentes) ⇒ 88; x2/y1/y2 (mesma taxa 1/5, shrink empata) ⇒ 54', () => {
    const eqX = porEquipe('x');
    const eqY = porEquipe('y');
    const p1 = eqX.pilotos.find((p) => p.id.endsWith('piloto-x1'))!;
    const px2 = eqX.pilotos.find((p) => p.id.endsWith('piloto-x2'))!;
    const py1 = eqY.pilotos.find((p) => p.id.endsWith('piloto-y1'))!;
    const py2 = eqY.pilotos.find((p) => p.id.endsWith('piloto-y2'))!;
    expect(p1.notas.cons).toBe(88);
    expect(px2.notas.cons).toBe(54);
    expect(py1.notas.cons).toBe(54);
    expect(py2.notas.cons).toBe(54);
  });

  it('DEF/SF/PNEU compostos sobre as notas já mapeadas (x1: RIT=83, CONS=88; y2: RIT=49, CONS=54)', () => {
    const eqX = porEquipe('x');
    const eqY = porEquipe('y');
    const p1 = eqX.pilotos.find((p) => p.id.endsWith('piloto-x1'))!;
    const py2 = eqY.pilotos.find((p) => p.id.endsWith('piloto-y2'))!;
    expect(p1.notas.def).toBe(86);
    expect(p1.notas.sf).toBe(86);
    expect(p1.notas.pneu).toBe(85);
    expect(py2.notas.def).toBe(52);
    expect(py2.notas.sf).toBe(52);
    expect(py2.notas.pneu).toBe(51);
  });

  it('CHU/LARG constantes v1 = 50', () => {
    const p1 = porEquipe('x').pilotos.find((p) => p.id.endsWith('piloto-x1'))!;
    expect(p1.notas.chu).toBe(50);
    expect(p1.notas.larg).toBe(50);
  });

  it('carro (⇒ AERO=MEC=MOTOR=PPESO=FREIO): equipe X 79, equipe Y 45 (n=2 ⇒ Hazen 0.75/0.25 fixo)', () => {
    const eqX = porEquipe('x');
    const eqY = porEquipe('y');
    for (const atributo of ['aero', 'mec', 'ppeso', 'freio'] as const) {
      expect(eqX.chassi.notas[atributo]).toBe(79);
      expect(eqY.chassi.notas[atributo]).toBe(45);
    }
    expect(eqX.motor.notas.motor).toBe(79);
    expect(eqY.motor.notas.motor).toBe(45);
  });

  it('CONF: shrink por largadas da equipe (n=10) — equipe X 79, equipe Y 45', () => {
    expect(porEquipe('x').chassi.notas.conf).toBe(79);
    expect(porEquipe('y').chassi.notas.conf).toBe(45);
  });

  it('CALL=SANGF: comprimido em [35,80] — equipe X 69, equipe Y 46', () => {
    const eqX = porEquipe('x');
    const eqY = porEquipe('y');
    expect(eqX.estrategista.notas.call).toBe(69);
    expect(eqX.estrategista.notas.sangf).toBe(69);
    expect(eqY.estrategista.notas.call).toBe(46);
    expect(eqY.estrategista.notas.sangf).toBe(46);
  });

  it('PIT pré-2011: proxy em [42,58] sobre o percentil de carro, pitTempo === pitErro', () => {
    const eqX = porEquipe('x');
    const eqY = porEquipe('y');
    expect(eqX.pit.notas.pitTempo).toBe(54);
    expect(eqX.pit.notas.pitErro).toBe(54);
    expect(eqY.pit.notas.pitTempo).toBe(46);
    expect(eqY.pit.notas.pitErro).toBe(46);
  });

  it('ids seguem o padrão slug(constructorId)-{ano}-{sufixo}', () => {
    const eqX = porEquipe('x');
    expect(eqX.chassi.id).toBe('x-1960-chassi');
    expect(eqX.motor.id).toBe('x-1960-motor');
    expect(eqX.estrategista.id).toBe('x-1960-estrategista');
    expect(eqX.pit.id).toBe('x-1960-pit');
    expect(eqX.estrategista.nome).toBe('Estrategista Equipe X 1960');
  });

  it('não lança em verificarColisaoDeIds (sem ids duplicados)', () => {
    expect(() => verificarColisaoDeIds(derivado)).not.toThrow();
  });

  it('determinismo: derivar 2× a partir do mesmo fatos ⇒ mesma string', () => {
    const a = serializarDerivado(derivarNotas(fatosSinteticos));
    const b = serializarDerivado(derivarNotas(fatosSinteticos));
    expect(a).toBe(b);
  });
});

// -----------------------------------------------------------------------------
// derivarNotas sobre o DERIVADO REAL (fatos-agregados.json commitado) —
// invariantes estruturais + o loader real da engine aceitando o resultado.
// -----------------------------------------------------------------------------

describe('derivarNotas (fatos reais)', () => {
  const fatos = fatosReal as unknown as FatosAgregados;
  const derivado = derivarNotas(fatos);

  it('contagem total de entradas = nº de equipe/anos elegíveis do fatos-agregados', () => {
    expect(derivado.length).toBe(fatos.equipes.length);
  });

  it('toda entrada tem exatamente 2 pilotos', () => {
    for (const e of derivado) expect(e.pilotos.length).toBe(2);
  });

  it('toda nota é um inteiro entre 0 e 99', () => {
    const notasDe = (obj: object) => Object.values(obj).filter((v): v is number => typeof v === 'number');
    for (const e of derivado) {
      const todas = [
        ...notasDe(e.pilotos[0].notas),
        ...notasDe(e.pilotos[1].notas),
        ...notasDe(e.chassi.notas),
        ...notasDe(e.motor.notas),
        ...notasDe(e.estrategista.notas),
        ...notasDe(e.pit.notas),
      ];
      for (const nota of todas) {
        expect(Number.isInteger(nota)).toBe(true);
        expect(nota).toBeGreaterThanOrEqual(0);
        expect(nota).toBeLessThanOrEqual(99);
      }
    }
  });

  it('ids são todos únicos (não lança verificarColisaoDeIds)', () => {
    expect(() => verificarColisaoDeIds(derivado)).not.toThrow();
  });

  it('toda temporada 1950-2025 tem ao menos 1 entrada', () => {
    const anos = new Set(derivado.map((e) => e.ano));
    const faltando: number[] = [];
    for (let ano = 1950; ano <= 2025; ano++) {
      if (!anos.has(ano)) faltando.push(ano);
    }
    expect(faltando).toEqual([]);
  });

  it('determinismo: derivar 2× a partir do mesmo fatos real ⇒ mesma string', () => {
    const a = serializarDerivado(derivarNotas(fatos));
    const b = serializarDerivado(derivarNotas(fatos));
    expect(a).toBe(b);
  });

  it('o loader real (`criarDataset`) aceita o derivado junto das peças/pistas reais', () => {
    expect(() => criarDataset(derivado, pecasReal, pistasReal)).not.toThrow();
    const dataset = criarDataset(derivado, pecasReal, pistasReal);
    expect(dataset.equipeAnos.length).toBe(derivado.length);
  });
});
