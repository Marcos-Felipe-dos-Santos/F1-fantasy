/**
 * CERCA DE PROPRIEDADE DA FIXTURE — PR 7 da trilha do dataset fictício.
 *
 * Trava o que o PR 7 precisa manter para sempre:
 *
 *     todo nome exibido da fixture vem da `TABELA_NOMES`,
 *     e todo id é o que `idsDaEquipeAno` produz para aquele `codigo`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 POR QUE **PROPRIEDADE** E NÃO **IDENTIDADE**, como a cerca do PR 6.
 *
 * `scripts/publicacao.test.ts` consegue asserir
 * `src/data/ === anonimizar(derivado, tabela)` porque a ENTRADA daquela
 * transformação — `scripts/derived/equipe-anos.derivado.json` — **é commitada e
 * segue real por desenho**. A comparação tem os dois lados disponíveis em
 * qualquer clone.
 *
 * **Aqui não tem.** A entrada da migração era a própria fixture com nome real, e
 * ela deixou de existir no PR 7. Reproduzir a cerca de identidade exigiria
 * commitar a fixture REAL ao lado da fictícia — ou seja **reintroduzir no
 * repositório as 243 ocorrências que o PR 7 existe para remover**, num segundo
 * artefato que precisaria concordar com o primeiro. É exatamente o defeito que
 * `caminhos-dataset.ts` e a cerca do PR 6 existem para matar, montado de novo.
 *
 * 🔑 **Para artefato CONGELADO, a pergunta certa é outra.** `src/data/` é
 * REGENERADO a cada rodada do pipeline, e o risco lá é o artefato divergir da
 * função — identidade responde isso. A fixture **nunca é regenerada** (o README
 * dela proíbe, e `anonimizar-fixture.ts` não tem `npm run`); o risco que resta é
 * **alguém editá-la à mão**. Propriedade responde isso, e sem entrada real.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️ ESTA CERCA NÃO É REDUNDANTE COM O PORTÃO DOS NOMES REAIS. A DIREÇÃO É
 * OPOSTA, E É POR ISSO QUE AS DUAS EXISTEM.
 *
 * - **Portão** (`portao-nomes-reais.test.ts`): *"nenhum nome do universo REAL
 *   aparece aqui"* — mede contra as 909 agulhas de `fatos-agregados.json`.
 * - **Esta cerca**: *"todo nome que aparece aqui vem da TABELA fictícia"*.
 *
 * Um `"Foo Bar"` digitado à mão **passa no portão** (não é nome real de F1) e
 * **cai aqui**. Um `"Ayrton Senna"` cai nos dois. Nenhuma das duas cobre o
 * buraco da outra — mesma tese que a tabela de mutações do PR 6 mediu para o
 * par diferencial/cerca, agora do lado da fixture.
 *
 * 📌 **O que esta cerca NÃO afirma:** que as NOTAS estão certas. Ela não olha
 * nota nenhuma — quem trava valor são os goldens de `corrida.test.ts`,
 * `quali.test.ts` e `campeonato.test.ts`, que o PR 7 deixou intocados de
 * propósito.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 O LIMITE DESTA CERCA, MEDIDO E NÃO SUPOSTO: ELA NÃO SABE **QUEM** É CADA
 * PILOTO. É o achado da tabela de mutações do PR 7, e o mais importante dela.
 *
 * **Mutante `M-pessoa`** — trocar Sander Doornbosch (fictício de *Max*
 * Verstappen) por Jorik Doornbosch (fictício de *Jos*), **na fixture E nos
 * literais dos testes ao mesmo tempo**, que é exatamente como um defeito no
 * `anonimizar-fixture.ts` teria entrado:
 *
 *     resultado medido: `npm test` 1648/69 — **TUDO VERDE**.
 *
 * Nem esta cerca, nem o portão, nem um golden de valor acusa. E não é
 * negligência de desenho: o nome NOVO vem da tabela (esta cerca passa), não é
 * nome real (o portão passa), e as NOTAS não mudam de lugar (os goldens
 * passam). **Cada portão responde corretamente à sua pergunta; nenhuma delas é
 * "é a pessoa certa?".**
 *
 * ⚠️ **Não é hipótese — o erro EXISTIU nesta trilha.** Um ensaio a seco do PR 7
 * resolveu os pilotos pelo `driverId` curto da fixture e mapeou 2 dos 44 para o
 * PAI: `verstappen` é o id real de *Jos*, `hill` o de *Graham*. Foi pego por
 * MEDIÇÃO durante o PR, não por teste — e a tabela de nomes preserva o
 * sobrenome, então o diff dizia "Jorik Doornbosch" onde devia dizer "Sander
 * Doornbosch". **Nada num code review pegaria isso.**
 *
 * 🔒 **O que protege, então, é o DESENHO do `anonimizar-fixture.ts`:** resolver
 * por NOME EXIBIDO contra `fatos-agregados.json`, rota única, sem fallback por
 * id. Está escrito lá com a tabela dos 4 ids fora de convenção. **Quem trocar
 * aquela rota por uma cadeia de fallback reabre este buraco, e esta suíte
 * inteira continuará verde.** É por isso que o limite está escrito aqui, ao
 * lado da cerca que não o cobre, e não só no script.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TabelaDeNomes } from './anonimizar.ts';
import {
  idsDaEquipeAno,
  verificarColisaoDeIds,
  type EquipeAnoDerivado,
} from './derivar-notas.ts';
import { FIXTURE_EQUIPE_ANOS, TABELA_NOMES } from './caminhos-dataset.ts';

const fixture = JSON.parse(readFileSync(FIXTURE_EQUIPE_ANOS, 'utf8')) as EquipeAnoDerivado[];
const tabela = JSON.parse(readFileSync(TABELA_NOMES, 'utf8')) as TabelaDeNomes;

/** `nome fictício → codigo`, dos dois lados da tabela. */
const codigoPorNomeDeEquipe = new Map(
  Object.values(tabela.equipes).map((e) => [e.nome, e.codigo] as const),
);
const codigoPorNomeDePiloto = new Map(
  Object.values(tabela.pilotos).map((p) => [p.nome, p.codigo] as const),
);

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
    expect(Object.keys(tabela.equipes)).toHaveLength(105);
    expect(Object.keys(tabela.pilotos)).toHaveLength(353);
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
  it('ANTI-VACUIDADE: o mesmo filtro dos testes acima ACUSA nome real de F1', () => {
    // As MESMAS funções que os dois testes acima usam — não uma cópia delas.
    expect(forasteirosDeEquipe(['Ferrari'])).toEqual(['Ferrari']);
    expect(forasteirosDePiloto(['Ayrton Senna', 'Michael Schumacher'])).toEqual([
      'Ayrton Senna',
      'Michael Schumacher',
    ]);
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
