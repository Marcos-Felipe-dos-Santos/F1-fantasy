/**
 * ANONIMIZAR A FIXTURE — PR 7 da trilha do dataset fictício, o que fecha o círculo.
 *
 * Aplica a `TABELA_NOMES` sobre `src/fixtures/dataset-semente/equipe-anos.json`,
 * **preservando as notas byte a byte**. Só rótulo e id mudam.
 *
 *     src/fixtures/dataset-semente/equipe-anos.json   (REAL, entrada)
 *          ↓  anonimizarFixture
 *     src/fixtures/dataset-semente/equipe-anos.json   (FICTÍCIO, no lugar)
 *
 * 🔒 **POR QUE A FIXTURE NÃO PODIA FICAR DE FORA.** Ela é o artefato que existe
 * para ser **lido com segurança** — a regra inviolável do `CLAUDE.md`
 * §"Leitura de `src/data/`" manda usá-la justamente para não abrir o dataset de
 * 1 MB. Deixá-la com nome real faz a próxima sessão voltar a ler nome real no
 * arquivo criado para evitar isso.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 ESTE SCRIPT É UMA MIGRAÇÃO DE UMA VIA, NÃO UM PIPELINE. NÃO TEM `npm run`.
 *
 * **Rodar de novo sobre a saída FALHA**, e falha de propósito: a resolução é
 * pelo NOME REAL contra `fatos-agregados.json`, e depois da migração os nomes
 * são fictícios — nenhum deles está no universo. O `throw` é o comportamento
 * correto, não um defeito a tolerar.
 *
 * 🔒 **E é por isso que ele NÃO entra no `package.json`.** O README da fixture
 * diz, desde o PR 4.4: *"Não atualizar estes arquivos quando o dataset vivo
 * mudar. Se algum dia a fixture precisar ser deliberadamente atualizada (ex.:
 * os goldens precisarem migrar pra outra base), isso é uma decisão de plano
 * explícita, não um efeito colateral."* Um `npm run` aqui seria exatamente o
 * efeito colateral que aquela linha proíbe — **e o custo está MEDIDO neste PR:**
 * regenerar a fixture a partir de `src/data/` derruba **54 goldens de VALOR**
 * (ensaio a seco, 2026-08-31). O script fica como PROVENIÊNCIA do que foi feito.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 A RESOLUÇÃO É POR NOME EXIBIDO, E NÃO É PREGUIÇA — É A ÚNICA ROTA QUE
 * FUNCIONA AQUI.
 *
 * O `anonimizar.ts` do PR 6 desmonta o **id** do registro (`chassi.id` →
 * `slug(constructorId)`), porque o derivado nasce de `idsDaEquipeAno` e os ids
 * batem com o universo por construção. **A fixture não tem essa propriedade:**
 * ela é uma cópia congelada PRÉ-4.5, com convenção de id própria. Medido:
 *
 *   | fixture                              | universo real                     |
 *   |--------------------------------------|-----------------------------------|
 *   | `redbull-2023-…`                     | `red_bull` → slug `red-bull`      |
 *   | `astonmartin-2023-…`                 | `aston_martin` → `aston-martin`   |
 *   | `…-piloto-schumacher`                | `michael_schumacher`              |
 *   | `…-piloto-r-schumacher`              | `ralf_schumacher`                 |
 *
 * Ou seja, **`anonimizar()` do PR 6 LANÇA sobre a fixture** — 2 slugs de equipe
 * e 2 `driverId` fora da tabela. As duas saídas ruins foram descartadas:
 *
 * - **mapa de compatibilidade escrito à mão** (`redbull` → `red_bull`, …) —
 *   quatro exceções a dedo, que é o vício que o portão do PR 1 proíbe no
 *   próprio docblock ("não existe allowlist aqui, e não se acrescenta uma");
 * - **cadeia de fallback** (tenta por id, senão por nome) — duas rotas para o
 *   mesmo dado, e a que falha primeiro decide em silêncio qual valeu.
 *
 * 🔴 **A CADEIA DE FALLBACK NÃO É SÓ FEIA — ELA ERRA, E ERRA CALADA. MEDIDO
 * NESTE PR, num ensaio a seco que a usou antes de ser descartada.** Os ids
 * curtos da fixture são, em dois casos, o `driverId` REAL DE OUTRO PILOTO —
 * **o pai**:
 *
 *   | fixture              | quem ela quer dizer | de quem é o id no universo |
 *   |----------------------|---------------------|----------------------------|
 *   | `…-piloto-verstappen`| **Max** Verstappen  | **Jos** Verstappen         |
 *   | `…-piloto-hill`      | **Damon** Hill      | **Graham** Hill            |
 *
 * A rota por id acertava a forma e errava a PESSOA: dava a Max o nome fictício
 * de Jos. 🔑 **E o erro seria INVISÍVEL na revisão**, porque a tabela preserva o
 * parentesco no sobrenome — "Jorik Doornbosch" no lugar de "Sander Doornbosch",
 * "Gerald Aldwych" no lugar de "Bertram Aldwych". Nada num diff denunciaria.
 * **É a degradação silenciosa que este projeto catalogou:** a rota que "quase
 * funciona" atravessa a revisão inteira.
 * ⚠️ O `driverId` do universo é `max_verstappen`/`damon_hill`; a fixture guardou
 * a forma curta porque foi escrita à mão em 2025, antes do pipeline existir.
 *
 * ✅ **O nome exibido resolve os 22 registros e os 44 pilotos por uma rota só,
 * e foi MEDIDO antes de escolher:** zero não-resolvidos, zero ambíguos (nenhum
 * nome do universo mapeia para dois ids). O assert de colisão de `indicePorNome`
 * (abaixo) **lançou zero vezes na migração**, que é o que torna aquela medição
 * verificada e não afirmada.
 * ⚠️ **E ele NÃO protege o futuro, apesar de parecer que sim.** Como este script
 * é de uma via e não roda de novo, a guarda **já cumpriu o papel dela e não
 * roda mais**. Quem protege o artefato daqui pra frente é
 * `scripts/fixture-semente.test.ts`, em todo `npm test`. **A redação anterior
 * estava em futuro do indicativo ("se um nome ambíguo entrar um dia, o script
 * lança") e citava um `assertSemColisao` que nunca existiu neste arquivo** —
 * promessa inerte com nome inventado. Achado da revisão do PR 7.
 *
 * 🔑 **`fatos-agregados.json` é a MESMA fonte que o portão dos nomes reais usa
 * como universo** (`portao-nomes-reais.test.ts`). Resolver por ela é resolver
 * contra a lista que define "nome real" neste projeto, não contra uma segunda
 * lista que teria de concordar com a primeira.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 O QUE ESTE SCRIPT **NÃO** TEM, E POR QUÊ — a cerca de identidade do PR 6
 * não se replica aqui.
 *
 * `scripts/publicacao.test.ts` consegue asserir `src/data/ === anonimizar(...)`
 * porque a ENTRADA (`scripts/derived/equipe-anos.derivado.json`) **é commitada
 * e segue real por desenho**. Replicar isso para a fixture exigiria commitar a
 * fixture REAL ao lado da fictícia — ou seja, **reintroduzir no repositório as
 * 243 ocorrências que este PR existe para remover**, num segundo artefato que
 * precisaria concordar com o primeiro.
 *
 * 🔒 **Para artefato CONGELADO a guarda certa é de PROPRIEDADE, não de
 * identidade**, e ela está em `scripts/fixture-semente.test.ts`: todo nome
 * exibido da fixture vem da `TABELA_NOMES`, e todo id é o que `idsDaEquipeAno`
 * produz para aquele `codigo`. Isso se verifica **sem a entrada real** e cobre
 * o modo de falha que resta (alguém editar a fixture à mão).
 * ⚠️ **Ela NÃO é redundante com o portão**, e a diferença é direcional: o portão
 * diz *"nenhum nome do universo real aparece aqui"*; a cerca de propriedade diz
 * *"todo nome que aparece aqui vem da tabela"*. Um `"Foo"` digitado à mão passa
 * no primeiro e cai na segunda.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { TabelaDeNomes } from './anonimizar.ts';
import { idsDaEquipeAno, serializarDerivado, type EquipeAnoDerivado } from './derivar-notas.ts';
import { FATOS_AGREGADOS, FIXTURE_EQUIPE_ANOS, TABELA_NOMES } from './caminhos-dataset.ts';

/**
 * O recorte de `fatos-agregados.json` que interessa aqui: o par nome↔id dos
 * dois lados. **Mesma forma que o portão dos nomes reais declara**, porque é a
 * mesma fonte.
 */
export interface UniversoDeNomes {
  readonly equipes: ReadonlyArray<{ readonly nome: string; readonly constructorId: string }>;
  readonly titulares: ReadonlyArray<{ readonly nome: string; readonly driverId: string }>;
}

/**
 * `nome real → id real`, **com assert de colisão**. Um nome que mapeasse para
 * dois ids tornaria a resolução ambígua, e escolher um em silêncio é
 * exatamente o modo de falha que este projeto catalogou como "degradação
 * silenciosa". Mesmo idioma do `indicePorSlug` de `anonimizar.ts:152`.
 */
export function indicePorNome(
  pares: ReadonlyArray<readonly [string, string]>,
  rotulo: string,
): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const [nome, id] of pares) {
    const jaTem = mapa.get(nome);
    if (jaTem !== undefined && jaTem !== id) {
      throw new Error(
        `anonimizar-fixture: o nome de ${rotulo} "${nome}" mapeia para dois ids ("${jaTem}" e "${id}") — a resolução seria ambígua`,
      );
    }
    mapa.set(nome, id);
  }
  return mapa;
}

/**
 * Devolve a fixture anonimizada. **Pura:** mesmas entradas ⇒ mesma saída, sem
 * I/O. Preserva, deliberadamente:
 *
 * - o **comprimento e a ORDEM** do array;
 * - o **`ano`** de cada registro;
 * - **todas as notas**, por referência ao objeto original — nada é recalculado.
 *   🔑 É esta linha que faz os goldens de VALOR continuarem verdes: medido,
 *   `corrida.test.ts`, `quali.test.ts` e o golden do campeonato não se movem;
 *   regenerar a partir de `src/data/` derrubaria 54 deles;
 * - a **ordem do par de pilotos** `[0]`/`[1]` — reordenar trocaria os pilotos
 *   de lugar dentro da equipe e a corrida deixaria de bater bit a bit.
 */
export function anonimizarFixture(
  fixture: readonly EquipeAnoDerivado[],
  tabela: TabelaDeNomes,
  universo: UniversoDeNomes,
): EquipeAnoDerivado[] {
  const idPorNomeDeEquipe = indicePorNome(
    universo.equipes.map((e) => [e.nome, e.constructorId] as const),
    'equipe',
  );
  const idPorNomeDePiloto = indicePorNome(
    universo.titulares.map((t) => [t.nome, t.driverId] as const),
    'piloto',
  );

  return fixture.map((reg) => {
    const constructorId = idPorNomeDeEquipe.get(reg.equipe);
    if (constructorId === undefined) {
      throw new Error(`anonimizar-fixture: a equipe "${reg.equipe}" não está no universo de nomes`);
    }
    const equipe = tabela.equipes[constructorId];
    if (equipe === undefined) {
      throw new Error(
        `anonimizar-fixture: constructorId "${constructorId}" não está na tabela de nomes`,
      );
    }

    const ids = idsDaEquipeAno(equipe.codigo, reg.ano);

    const pilotos = ([0, 1] as const).map((i) => {
      const original = reg.pilotos[i];
      const driverId = idPorNomeDePiloto.get(original.nome);
      if (driverId === undefined) {
        throw new Error(
          `anonimizar-fixture: o piloto "${original.nome}" não está no universo de nomes`,
        );
      }
      const piloto = tabela.pilotos[driverId];
      if (piloto === undefined) {
        throw new Error(`anonimizar-fixture: driverId "${driverId}" não está na tabela de nomes`);
      }
      return { id: ids.piloto(piloto.codigo), nome: piloto.nome, notas: original.notas };
    }) as [EquipeAnoDerivado['pilotos'][0], EquipeAnoDerivado['pilotos'][1]];

    return {
      equipe: equipe.nome,
      ano: reg.ano,
      pilotos,
      chassi: { id: ids.chassi, notas: reg.chassi.notas },
      motor: { id: ids.motor, notas: reg.motor.notas },
      estrategista: {
        id: ids.estrategista,
        // Mesmo molde de `derivar-notas.ts:719` e de `anonimizar.ts`, remontado
        // a partir do nome fictício — nunca traduzido da string existente.
        nome: `Estrategista ${equipe.nome} ${reg.ano}`,
        notas: reg.estrategista.notas,
      },
      pit: { id: ids.pit, notas: reg.pit.notas },
    };
  });
}

// ---------------------------------------------------------------------------
// CLI de MIGRAÇÃO — `node scripts/anonimizar-fixture.ts`, uma vez. Ver o topo:
// não tem `npm run`, e rodar sobre a saída LANÇA.
// ---------------------------------------------------------------------------

export function main(): EquipeAnoDerivado[] {
  const fixture = JSON.parse(readFileSync(FIXTURE_EQUIPE_ANOS, 'utf8')) as EquipeAnoDerivado[];
  const tabela = JSON.parse(readFileSync(TABELA_NOMES, 'utf8')) as TabelaDeNomes;
  const universo = JSON.parse(readFileSync(FATOS_AGREGADOS, 'utf8')) as UniversoDeNomes;

  const anonima = anonimizarFixture(fixture, tabela, universo);

  writeFileSync(FIXTURE_EQUIPE_ANOS, serializarDerivado(anonima));

  console.log(`Migrada: ${FIXTURE_EQUIPE_ANOS}`);
  console.log(`Registros: ${anonima.length} (notas preservadas byte a byte)`);
  console.log('Migração de UMA VIA — rodar de novo sobre esta saída LANÇA, e é o correto.');
  return anonima;
}

// Mesmo idioma de `anonimizar.ts` e `derivar-notas.ts`: só roda em execução
// direta, nunca quando o teste importa a função pura.
const ehExecucaoDireta =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ehExecucaoDireta) {
  main();
}
