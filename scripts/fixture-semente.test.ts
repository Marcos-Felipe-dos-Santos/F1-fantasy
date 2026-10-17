/** Fixture congelada: nomes históricos e ids canônicos; notas verificadas separadamente. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { UniversoDeNomes } from './anonimizar-fixture.ts';
import { idsDaEquipeAno, verificarColisaoDeIds, type EquipeAnoDerivado } from './derivar-notas.ts';
import { FIXTURE_EQUIPE_ANOS, FATOS_AGREGADOS } from './caminhos-dataset.ts';

const fixture = JSON.parse(readFileSync(FIXTURE_EQUIPE_ANOS, 'utf8')) as EquipeAnoDerivado[];
const universo = JSON.parse(readFileSync(FATOS_AGREGADOS, 'utf8')) as UniversoDeNomes;

/** `nome histórico → id original`, dos dois lados da tabela. */
const codigoPorNomeDeEquipe = new Map(
  universo.equipes.map((e) => [e.nome, e.constructorId] as const),
);
const codigoPorNomeDePiloto = new Map(universo.titulares.map((p) => [p.nome, p.driverId] as const));

/**
 * 🔒 **O PREDICADO É EXTRAÍDO PARA QUE A ANTI-VACUIDADE EXERCITE O MESMO
 * CAMINHO que os testes reais, e não um parecido.**
 *
 * A revisão do PR 7 apontou que a anti-vacuidade antiga testava o MAPA
 * (`codigoPorNomeDeEquipe.has('Ferrari')`) enquanto os testes usavam um
 * `.filter` próprio — então um `.filter` degenerado deixava os testes vacuosos
 * e a anti-vacuidade verde. Repetir o filtro na cláusula anti-vacuidade
 * melhoraria, mas ainda seriam **dois sítios que precisam concordar**, que é o
 * defeito que este projeto mata desde o `caminhos-dataset.ts`. Com a função
 * extraída, quebrar o predicado quebra os dois lados **por construção**.
 */
const forasteirosDeEquipe = (nomes: readonly string[]) =>
  nomes.filter((nome) => !codigoPorNomeDeEquipe.has(nome));
const forasteirosDePiloto = (nomes: readonly string[]) =>
  nomes.filter((nome) => !codigoPorNomeDePiloto.has(nome));

describe('🔒 cerca de propriedade da fixture — o universo', () => {
  it('ANTI-VACUIDADE: a fixture tem os 22 registros e a tabela as 105/353 entradas', () => {
    // Sem isto, uma fixture vazia (ou uma tabela vazia) passaria em TODOS os
    // `for` abaixo por vacuidade, declarando a fixture limpa sem ler nada.
    expect(fixture).toHaveLength(22);
    // 🔴 O LAÇO INTERNO precisa do seu próprio prendedor. `flatMap` sobre
    // `pilotos: []` devolve `[]` e passaria em tudo abaixo; o tipo é tupla
    // `[P, P]`, mas a leitura é `JSON.parse(...) as EquipeAnoDerivado[]` e
    // **cast não valida em runtime**. Achado da revisão do PR 7.
    expect(fixture.flatMap((r) => r.pilotos)).toHaveLength(44);
    expect(new Set(universo.equipes.map((e) => e.constructorId)).size).toBe(105);
    expect(new Set(universo.titulares.map((p) => p.driverId)).size).toBe(353);
    expect(codigoPorNomeDeEquipe.size).toBe(105);
    expect(codigoPorNomeDePiloto.size).toBe(353);
  });
});

describe('🔒 cerca de propriedade da fixture — todo nome vem da tabela', () => {
  it('os 22 `equipe` são nomes da TABELA de equipes', () => {
    const forasteiros = forasteirosDeEquipe(fixture.map((r) => r.equipe));
    expect(forasteiros, `nomes de equipe que NÃO vêm da tabela: ${forasteiros.join(', ')}`).toEqual(
      [],
    );
  });

  it('os 44 `pilotos[].nome` são nomes da TABELA de pilotos', () => {
    const forasteiros = forasteirosDePiloto(fixture.flatMap((r) => r.pilotos.map((p) => p.nome)));
    expect(forasteiros, `nomes de piloto que NÃO vêm da tabela: ${forasteiros.join(', ')}`).toEqual(
      [],
    );
  });

  /**
   * 🔴 **ESTA ANTI-VACUIDADE EXERCITA O PREDICADO, NÃO O MAPA — e a diferença é
   * o achado da revisão do PR 7.**
   *
   * A redação anterior era `expect(codigoPorNomeDeEquipe.has('Ferrari')).toBe(false)`:
   * provava que a TABELA não degenerou para "aceita tudo", e **sobrevivia
   * intacta a qualquer degeneração do `.filter` dos dois testes acima**. Um
   * mutante que forçasse `forasteiros` a `[]` deixaria os dois vacuosos e esta
   * cláusula VERDE. **A metade load-bearing é o predicado.**
   *
   * 🔑 É literalmente o mesmo achado que a revisão do PR 6 fez em
   * `publicacao.test.ts` — a anti-vacuidade "cuja metade load-bearing não era a
   * que parecia". Rodando o MESMO `.filter` dos testes reais sobre entrada
   * suja, um `.filter` quebrado cai aqui.
   */
  it('ANTI-VACUIDADE: o mesmo filtro dos testes acima ACUSA nome fora do universo histórico', () => {
    // As MESMAS funções que os dois testes acima usam — não uma cópia delas.
    expect(forasteirosDeEquipe(['Equipe inexistente'])).toEqual(['Equipe inexistente']);
    expect(forasteirosDePiloto(['Piloto inexistente'])).toEqual(['Piloto inexistente']);
    // E o outro lado: nome que VEM da tabela não pode ser acusado.
    expect(forasteirosDeEquipe([fixture[0].equipe])).toEqual([]);
  });
});

describe('🔒 cerca de propriedade da fixture — todo id vem de `idsDaEquipeAno`', () => {
  /**
   * 🔑 Os ids são REMONTADOS a partir do `codigo` da tabela e comparados, em vez
   * de conferidos por regex de forma. Uma regex diria "parece um id"; isto diz
   * "é EXATAMENTE o id que o pipeline produziria para esta equipe neste ano" —
   * e é a mesma função (`idsDaEquipeAno`) que `derivar-notas.ts` e
   * `anonimizar.ts` usam, importada e não reimplementada.
   */
  it('os 5 ids de cada registro são os que o pipeline produziria', () => {
    for (const reg of fixture) {
      const codigoEquipe = codigoPorNomeDeEquipe.get(reg.equipe);
      expect(codigoEquipe, `equipe fora da tabela: ${reg.equipe}`).toBeDefined();
      const ids = idsDaEquipeAno(codigoEquipe as string, reg.ano);

      const contexto = `${reg.equipe} ${reg.ano}`;
      expect(reg.chassi.id, contexto).toBe(ids.chassi);
      expect(reg.motor.id, contexto).toBe(ids.motor);
      expect(reg.estrategista.id, contexto).toBe(ids.estrategista);
      expect(reg.pit.id, contexto).toBe(ids.pit);

      for (const piloto of reg.pilotos) {
        const codigoPiloto = codigoPorNomeDePiloto.get(piloto.nome);
        expect(codigoPiloto, `piloto fora da tabela: ${piloto.nome}`).toBeDefined();
        expect(piloto.id, `${contexto} / ${piloto.nome}`).toBe(ids.piloto(codigoPiloto as string));
      }
    }
  });

  /**
   * O 4º sítio — o que uma caminhada por campo esqueceria. Ver
   * `anonimizar.ts`: o nome do estrategista nasce por INTERPOLAÇÃO, então o
   * nome da equipe vive DENTRO de um valor e não numa chave.
   */
  /**
   * 🔴 **UNICIDADE — o teste acima NÃO a cobre, e a revisão do PR 7 mostrou o
   * buraco:** ele compara cada id ao esperado, então **dois pilotos do mesmo
   * registro com o MESMO id passariam** se os dois batessem com o esperado.
   * `verificarColisaoDeIds` já existe (`derivar-notas.ts:740`) e é a mesma
   * guarda que `publicacao.test.ts` roda do lado de `src/data/` — importada,
   * não reimplementada. Pega também dois `codigo` distintos colidindo no `slug`.
   */
  it('a guarda de COLISÃO DE IDS roda sobre a fixture', () => {
    expect(() => verificarColisaoDeIds(fixture)).not.toThrow();
  });

  it('`estrategista.nome` é remontado com o molde `Estrategista <equipe> <ano>`', () => {
    for (const reg of fixture) {
      expect(reg.estrategista.nome).toBe(`Estrategista ${reg.equipe} ${reg.ano}`);
    }
  });
});
