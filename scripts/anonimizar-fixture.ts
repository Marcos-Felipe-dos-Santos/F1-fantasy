/** Arquivo histórico: transformação pura mantida para testes de proveniência.
 * A publicação atual usa publicar-dataset.ts; CLI antiga aposentada. */
import { pathToFileURL } from 'node:url';
import type { TabelaDeNomes } from './anonimizar.ts';
import { idsDaEquipeAno, type EquipeAnoDerivado } from './derivar-notas.ts';

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

export function main(): never {
  throw new Error(
    'Migração fictícia aposentada. Use npm run dataset:publicar para nomes originais.',
  );
}

// Mesmo idioma de `anonimizar.ts` e `derivar-notas.ts`: só roda em execução
// direta, nunca quando o teste importa a função pura.
const ehExecucaoDireta =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ehExecucaoDireta) {
  main();
}
