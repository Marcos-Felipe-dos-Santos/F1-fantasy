/**
 * CAMINHOS DO DATASET — a constante ÚNICA (PR 1 da trilha do dataset fictício).
 *
 * Antes deste arquivo, `join(dirname(fileURLToPath(import.meta.url)), 'derived')`
 * estava DUPLICADO em `agregar-fatos.ts:66` e `derivar-notas.ts:168` — duas
 * definições que precisavam concordar, que é a mesma classe de defeito descrita
 * no docblock do proxy em `vite.config.ts` ("como o problema era haver duas
 * listas que precisavam concordar, a correção não foi acrescentar a chave que
 * faltava e sim derivar o bloco inteiro").
 *
 * 🔒 **Os dois scripts agora REEXPORTAM daqui**, com os nomes antigos
 * preservados (`DERIVED_DIR_PADRAO`, `OUTPUT_PATH_PADRAO`), então nenhum
 * consumidor mudou e o comportamento é byte a byte o mesmo. **Caminho novo de
 * dataset entra AQUI**, não num script.
 *
 * 📌 **Por que isto nasce no PR 1 e não no PR 5:** o portão dos nomes reais
 * (`portao-nomes-reais.test.ts`) precisa do caminho do universo, e um portão que
 * define o próprio caminho seria a terceira cópia. O PR 5 (`anonimizar.ts`) é
 * quem passa a ESCREVER em `src/data/` — e ele importa daqui, não redefine.
 * ⚠️ Hoje a publicação `scripts/derived/` → `src/data/` é **cópia manual sem
 * guarda** (medido: os dois arquivos são byte a byte idênticos e nenhum script
 * faz a cópia). `PUBLICADO_EQUIPE_ANOS` existe para que o PR 5 tenha o destino
 * declarado num lugar só quando matar esse passo manual.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Raiz do repositório (um nível acima de `scripts/`). */
export const RAIZ = join(AQUI, '..');

/** Saída dos scripts de pipeline. **Segue com nome REAL, por desenho.** */
export const DERIVED_DIR = join(AQUI, 'derived');

/**
 * Fatos agregados — a saída de `agregar-fatos.ts`.
 * 🔒 **É o UNIVERSO DE NOMES do portão** (`equipes[].nome/constructorId` e
 * `titulares[].nome/driverId`). Decisão do dev, 2026-08-25.
 */
export const FATOS_AGREGADOS = join(DERIVED_DIR, 'fatos-agregados.json');

/** Dataset derivado — a saída de `derivar-notas.ts` (staging). */
export const EQUIPE_ANOS_DERIVADO = join(DERIVED_DIR, 'equipe-anos.derivado.json');

/** Dados servidos ao app. É o que entra no bundle. */
export const DATA_DIR = join(RAIZ, 'src', 'data');

/** Destino da publicação, hoje feita à mão. O PR 5 passa a escrever aqui. */
export const PUBLICADO_EQUIPE_ANOS = join(DATA_DIR, 'equipe-anos.json');

/** Fixture pequena e segura de ler inteira (regra do `CLAUDE.md`). */
export const FIXTURE_DIR = join(RAIZ, 'src', 'fixtures', 'dataset-semente');
