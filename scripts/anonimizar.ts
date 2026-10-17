/** Arquivo histórico: transformação pura mantida para testes de proveniência.
 * A publicação atual usa publicar-dataset.ts; CLI antiga aposentada. */
import { pathToFileURL } from 'node:url';
import { idsDaEquipeAno, slug, type EquipeAnoDerivado } from './derivar-notas.ts';

// ---------------------------------------------------------------------------
// A tabela do PR 4.
// ---------------------------------------------------------------------------

/** Uma entrada da tabela: `codigo` alimenta o ID, `nome` alimenta o texto exibido. */
export interface NomeFicticio {
  readonly codigo: string;
  readonly nome: string;
}

/** `scripts/nomes-ficticios.json` — 105 equipes (por `constructorId`) + 353 pilotos (por `driverId`). */
export interface TabelaDeNomes {
  readonly equipes: Readonly<Record<string, NomeFicticio>>;
  readonly pilotos: Readonly<Record<string, NomeFicticio>>;
}

// ---------------------------------------------------------------------------
// Desmontagem do id — a volta de `idsDaEquipeAno`.
// ---------------------------------------------------------------------------

/**
 * A base `${slug(constructorId)}-${ano}` do registro, lida do `chassi.id`.
 * Lança com o id inteiro se a forma não bater — id fora de forma é dado
 * corrompido, não caso a tolerar.
 */
function baseDoRegistro(reg: EquipeAnoDerivado): string {
  const sufixo = '-chassi';
  if (!reg.chassi.id.endsWith(sufixo)) {
    throw new Error(`anonimizar: chassi.id fora da forma esperada: "${reg.chassi.id}"`);
  }
  return reg.chassi.id.slice(0, -sufixo.length);
}

/** O `slug(constructorId)` do registro — a base menos o `-${ano}`. */
function slugDoConstrutor(reg: EquipeAnoDerivado): string {
  const base = baseDoRegistro(reg);
  const sufixo = `-${reg.ano}`;
  if (!base.endsWith(sufixo)) {
    throw new Error(`anonimizar: base "${base}" não termina no ano ${reg.ano}`);
  }
  return base.slice(0, -sufixo.length);
}

/** O `driverId` cru do piloto `i` — o id menos o prefixo `${base}-piloto-`. */
function driverIdDoPiloto(reg: EquipeAnoDerivado, i: 0 | 1): string {
  const prefixo = `${baseDoRegistro(reg)}-piloto-`;
  const id = reg.pilotos[i].id;
  if (!id.startsWith(prefixo)) {
    throw new Error(`anonimizar: piloto.id fora da forma esperada: "${id}"`);
  }
  return id.slice(prefixo.length);
}

/**
 * `slug(constructorId) → entrada fictícia`. **Com assert de colisão:** `slug` é
 * lossy, e dois `constructorId` que colidissem no slug tornariam a volta
 * ambígua.
 */
function indicePorSlug(tabela: TabelaDeNomes): Map<string, NomeFicticio> {
  const mapa = new Map<string, NomeFicticio>();
  for (const [constructorId, entrada] of Object.entries(tabela.equipes)) {
    const chave = slug(constructorId);
    const jaTem = mapa.get(chave);
    if (jaTem !== undefined) {
      throw new Error(
        `anonimizar: dois constructorId colidem no slug "${chave}" — a remontagem de id seria ambígua`,
      );
    }
    mapa.set(chave, entrada);
  }
  return mapa;
}

// ---------------------------------------------------------------------------
// A transformação — pura, sem I/O.
// ---------------------------------------------------------------------------

/**
 * Devolve o dataset anonimizado. **Pura:** mesmas entradas ⇒ mesma saída, sem
 * ler nem escrever arquivo. Preserva, deliberadamente:
 *
 * - o **comprimento e a ORDEM** do array (é ela que faz `hashDaCorrida` bater);
 * - o **`ano`** de cada registro, posicionalmente;
 * - **todas as notas**, por referência ao objeto original (não são copiadas nem
 *   recalculadas — o balanceamento não pode mudar aqui);
 * - a **ordem do par de pilotos** `[0]`/`[1]`. ⚠️ **Não reordenar pelo
 *   `driverId` fictício**: `derivar-notas.ts` ordena o par por `driverId` REAL
 *   antes de gravar, e re-ordenar aqui trocaria os pilotos de lugar dentro da
 *   equipe. O diferencial trava isso (mutante `M-parordem`).
 */
export function anonimizar(
  derivado: readonly EquipeAnoDerivado[],
  tabela: TabelaDeNomes,
): EquipeAnoDerivado[] {
  const equipePorSlug = indicePorSlug(tabela);

  return derivado.map((reg) => {
    const chaveEquipe = slugDoConstrutor(reg);
    const equipe = equipePorSlug.get(chaveEquipe);
    if (equipe === undefined) {
      throw new Error(`anonimizar: constructorId "${chaveEquipe}" não está na tabela de nomes`);
    }

    const ids = idsDaEquipeAno(equipe.codigo, reg.ano);

    const pilotos = ([0, 1] as const).map((i) => {
      const driverId = driverIdDoPiloto(reg, i);
      const piloto = tabela.pilotos[driverId];
      if (piloto === undefined) {
        throw new Error(`anonimizar: driverId "${driverId}" não está na tabela de nomes`);
      }
      return { id: ids.piloto(piloto.codigo), nome: piloto.nome, notas: reg.pilotos[i].notas };
    }) as [EquipeAnoDerivado['pilotos'][0], EquipeAnoDerivado['pilotos'][1]];

    return {
      equipe: equipe.nome,
      ano: reg.ano,
      pilotos,
      chassi: { id: ids.chassi, notas: reg.chassi.notas },
      motor: { id: ids.motor, notas: reg.motor.notas },
      estrategista: {
        id: ids.estrategista,
        // 🔴 RECONSTRUÍDO com o mesmo molde de `derivar-notas.ts:719`, nunca
        // traduzido da string existente. Ver o docblock do topo.
        nome: `Estrategista ${equipe.nome} ${reg.ano}`,
        notas: reg.estrategista.notas,
      },
      pit: { id: ids.pit, notas: reg.pit.notas },
    };
  });
}

// ---------------------------------------------------------------------------
// CLI (`npm run dataset:anonimizar`) — mesmo padrão das outras etapas.
// ---------------------------------------------------------------------------

export function main(): never {
  throw new Error(
    'Migração fictícia aposentada. Use npm run dataset:publicar para nomes originais.',
  );
}

// Mesmo idioma de `derivar-notas.ts:777` e `agregar-fatos.ts` — só roda em
// execução direta, nunca quando o teste importa a função pura.
const ehExecucaoDireta =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ehExecucaoDireta) {
  main();
}
