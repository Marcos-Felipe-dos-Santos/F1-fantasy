/**
 * ANONIMIZAR — PR 5 da trilha do dataset fictício.
 *
 * Aplica a `TABELA_NOMES` (PR 4, 458 entradas) sobre o dataset DERIVADO e
 * escreve o dataset ANONIMIZADO. **É o ensaio antes da troca, não a troca.**
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 O QUE ESTE PR TOCA, E O QUE NÃO TOCA — decisão do dev, 2026-08-28.
 *
 *   `scripts/derived/equipe-anos.derivado.json`  (real, entrada)
 *        ↓  anonimizar
 *   `scripts/derived/equipe-anos.anonimo.json`   (fictício, saída, GITIGNORADA)
 *
 * **`src/data/` NÃO é tocado.** 🔴 **E a consequência fica dita por inteiro,
 * para ninguém ler "morreu no 5": A CÓPIA MANUAL `derived → src/data/` NÃO
 * MORRE NESTE PR — ela morre no PR 6**, que é quem publica. Até lá ela segue
 * manual e sem guarda, exatamente como o `PUBLICADO_EQUIPE_ANOS` de
 * `caminhos-dataset.ts` registra.
 * ⚠️ Isto **SUPERA** a decisão de 2026-08-25 (`PLANOS_ATIVOS.md`: *"PR 5 — a
 * cópia manual MORRE ali, `anonimizar.ts` passa a escrever em `src/data/`"*).
 * A decisão nova está registrada no lugar da antiga, não ao lado dela.
 *
 * 🔒 **A SAÍDA NÃO É COMMITADA** (`.gitignore`), e o motivo é o mesmo que fez
 * `caminhos-dataset.ts` existir: **artefato derivado commitado é a segunda
 * fonte que precisa concordar com a primeira.** O teste diferencial
 * (`anonimizar.test.ts`) opera sobre o **retorno em memória** de `anonimizar`,
 * nunca sobre o arquivo — `npm test` não depende de artefato gerado.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 COMO O REGISTRO É REMAPEADO — pelo ID, nunca pelo nome de exibição.
 *
 * A tabela é chaveada por `constructorId`/`driverId`, e o registro derivado
 * **não carrega nenhum dos dois** — carrega `equipe` (nome exibido) e os ids
 * compostos. Duas saídas ruins foram descartadas:
 *
 * - **casar por `equipe` (nome exibido)** — depende de o nome ser único e
 *   estável, o que é exatamente a propriedade que este PR está prestes a
 *   destruir do outro lado;
 * - **casar por índice com `fatos-agregados.json`** — alinhamento entre dois
 *   arquivos, sem nada que o verifique.
 *
 * O que se faz é **DESMONTAR o id do próprio registro**, que é informação que
 * ele já carrega e que o loader já valida:
 *   `chassi.id`   = `${slug(constructorId)}-${ano}-chassi`
 *   `piloto.id`   = `${slug(constructorId)}-${ano}-piloto-${driverId}`
 * ⚠️ **`slug` é lossy** (`red_bull` → `red-bull`), então a volta é por MAPA
 * `slug(constructorId) → entrada`, construído da tabela e com **assert de
 * colisão**: se dois `constructorId` colidirem no slug, a remontagem seria
 * ambígua e o script lança em vez de escolher um.
 *
 * 🔒 **A REMONTAGEM REUSA `idsDaEquipeAno` e `slug` de `derivar-notas.ts`.**
 * Reescrever `${base}-chassi` aqui criaria uma segunda definição da forma do id
 * que teria de concordar com a primeira — a classe de defeito que o
 * `caminhos-dataset.ts` existe para matar.
 *
 * 🔴 **O 4º SÍTIO — `estrategista.nome` é RECONSTRUÍDO, nunca mapeado.**
 * Ele nasce por INTERPOLAÇÃO em `derivar-notas.ts:719`
 * (`` `Estrategista ${equipe.nome} ${season}` ``). Traduzir a string existente
 * (procurar o nome real dentro dela e substituir) deixaria "Estrategista
 * <fictício> <ano>" **inconsistente com o campo `equipe`** no dia em que a
 * interpolação mudasse de forma. Aqui a string é remontada com o MESMO molde, a
 * partir do nome fictício — e o diferencial assere essa consistência.
 * 🔑 É o campo que uma implementação por caminhada de campo esqueceria: foram
 * três sessões contando "3 sítios de normalização" quando eram 4.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 A GUARDA DE COLISÃO É RE-EXECUTADA SOBRE A PRÓPRIA SAÍDA.
 *
 * `verificarColisaoDeIds` (`derivar-notas.ts:740`) roda no `main` de
 * `derivar-notas`, sobre o DERIVADO. Este script não passa por `derivarNotas`,
 * então **contornar a chamada seria contornar a guarda existente** — um dataset
 * cujos ids colidissem quebraria o `idsVistos` único do loader
 * (`src/engine/dataset.ts`) só no consumo. Ela é chamada aqui, sobre o
 * resultado, **importada e não reimplementada**.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  idsDaEquipeAno,
  serializarDerivado,
  slug,
  verificarColisaoDeIds,
  type EquipeAnoDerivado,
} from './derivar-notas.ts';
import { EQUIPE_ANOS_ANONIMO, EQUIPE_ANOS_DERIVADO, TABELA_NOMES } from './caminhos-dataset.ts';

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

export function main(): EquipeAnoDerivado[] {
  const derivado = JSON.parse(readFileSync(EQUIPE_ANOS_DERIVADO, 'utf8')) as EquipeAnoDerivado[];
  const tabela = JSON.parse(readFileSync(TABELA_NOMES, 'utf8')) as TabelaDeNomes;

  const anonimo = anonimizar(derivado, tabela);

  // 🔒 A guarda do pipeline, re-executada sobre a SAÍDA. Ver o docblock do topo.
  verificarColisaoDeIds(anonimo);

  const conteudo = serializarDerivado(anonimo);
  // Escrita atômica (tmp+rename), mesma das outras etapas do pipeline.
  const tmp = `${EQUIPE_ANOS_ANONIMO}.tmp`;
  mkdirSync(dirname(EQUIPE_ANOS_ANONIMO), { recursive: true });
  writeFileSync(tmp, conteudo);
  renameSync(tmp, EQUIPE_ANOS_ANONIMO);

  console.log(`Escrito: ${EQUIPE_ANOS_ANONIMO}`);
  console.log(`Equipe/ano anonimizados: ${anonimo.length}`);
  console.log('src/data/ NÃO foi tocado — a publicação é o PR 6.');
  return anonimo;
}

// Mesmo idioma de `derivar-notas.ts:777` e `agregar-fatos.ts` — só roda em
// execução direta, nunca quando o teste importa a função pura.
const ehExecucaoDireta =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;

if (ehExecucaoDireta) {
  main();
}
