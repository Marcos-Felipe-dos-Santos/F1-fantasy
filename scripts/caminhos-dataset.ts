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
 * define o próprio caminho seria a terceira cópia. ~~O PR 5 (`anonimizar.ts`) é
 * quem passa a ESCREVER em `src/data/` — e ele importa daqui, não redefine.~~
 * ⚠️ **CORRIGIDO em 2026-08-28 (decisão do dev):** o PR 5 escreve em
 * `EQUIPE_ANOS_ANONIMO`, **não** em `src/data/`. Quem escreve em `src/data/` é
 * o **PR 6**, e ele importa daqui, não redefine.
 * ⚠️ A publicação `scripts/derived/` → `src/data/` **segue sendo cópia manual
 * sem guarda** (medido: os dois arquivos são byte a byte idênticos e nenhum
 * script faz a cópia). `PUBLICADO_EQUIPE_ANOS` existe para que o **PR 6** tenha
 * o destino declarado num lugar só quando matar esse passo manual.
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

/**
 * Dataset ANONIMIZADO — a saída de `anonimizar.ts` (PR 5). Mesmo shape do
 * derivado, com equipe/piloto/id/estrategista trocados pela `TABELA_NOMES`.
 *
 * 🔒 **NÃO É COMMITADO — decisão do dev, 2026-08-28** (`.gitignore`). O motivo
 * é o mesmo que fez este arquivo existir: **artefato derivado commitado é a
 * segunda fonte que precisa concordar com a primeira.** Quem precisar dele roda
 * `npm run dataset:anonimizar`; o teste diferencial NÃO o lê — opera sobre o
 * retorno em memória da função pura, para que `npm test` nunca dependa de
 * artefato gerado.
 */
export const EQUIPE_ANOS_ANONIMO = join(DERIVED_DIR, 'equipe-anos.anonimo.json');

/** Dados servidos ao app. É o que entra no bundle. */
export const DATA_DIR = join(RAIZ, 'src', 'data');

/**
 * Destino da publicação, HOJE AINDA FEITA À MÃO.
 *
 * ⚠️ **CORRIGIDO em 2026-08-28: NÃO é o PR 5 que escreve aqui — é o PR 6.**
 * A redação anterior desta linha dizia "o PR 5 passa a escrever aqui", pela
 * decisão do dev de 2026-08-25 (`PLANOS_ATIVOS.md`, "a cópia manual MORRE
 * ali"). **Essa decisão foi SUPERADA pela do dev em 2026-08-28:** o PR 5 lê o
 * derivado e escreve `EQUIPE_ANOS_ANONIMO`, com `src/data/` **intocado** — ele
 * é o ensaio, não a troca.
 * 🔴 **Consequência dita por inteiro, para ninguém ler "morreu no 5": A CÓPIA
 * MANUAL `derived → src/data/` NÃO MORRE NO PR 5. Ela morre no PR 6**, que é
 * quem publica. Até lá segue manual e sem guarda.
 */
export const PUBLICADO_EQUIPE_ANOS = join(DATA_DIR, 'equipe-anos.json');

/** Fixture pequena e segura de ler inteira (regra do `CLAUDE.md`). */
export const FIXTURE_DIR = join(RAIZ, 'src', 'fixtures', 'dataset-semente');

/**
 * Tabela `id real → nome fictício` (PR 4 da trilha).
 *
 * 🔒 **Mora em `scripts/`, e o motivo é MECÂNICO, não de gosto:**
 * `src/engine/versao.test.ts:96` põe **todo `.json` de `src/data/`** no digest
 * de `VERSAO_APP`. A tabela em `src/data/` forçaria bump por um arquivo que
 * nenhum código de produção consome — e o PR 4 não muda nada em runtime.
 *
 * 📌 **Ninguém a consome ainda.** Quem a aplica sobre o derivado é o
 * `anonimizar.ts` do PR 5; ela entra sozinha para poder ser lida e corrigida
 * sem quebrar nada.
 */
export const TABELA_NOMES = join(AQUI, 'nomes-ficticios.json');
