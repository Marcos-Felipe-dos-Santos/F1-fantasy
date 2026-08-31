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
 * define o próprio caminho seria a terceira cópia.
 *
 * ✅ **QUEM ESCREVE EM `src/data/` É O PR 6, e ele JÁ CHEGOU** (2026-08-28):
 * `anonimizar.ts` publica em `PUBLICADO_EQUIPE_ANOS`, importando daqui em vez de
 * redefinir. **A cópia manual `scripts/derived/` → `src/data/` MORREU**, e a
 * ausência de guarda morreu com ela (`scripts/publicacao.test.ts`).
 * ~~O PR 5 (`anonimizar.ts`) é quem passa a ESCREVER em `src/data/`.~~
 * ~~CORRIGIDO em 2026-08-28: o PR 5 escreve em `EQUIPE_ANOS_ANONIMO`, não em
 * `src/data/`; quem escreve é o PR 6.~~
 * ~~A publicação segue sendo cópia manual sem guarda; `PUBLICADO_EQUIPE_ANOS`
 * existe para que o PR 6 tenha o destino declarado quando matar esse passo.~~
 * ⚠️ **As três linhas riscadas descreviam estados que deixaram de existir e são
 * riscadas NO LUGAR.** A do meio ainda cita `EQUIPE_ANOS_ANONIMO`, um símbolo
 * que **este arquivo não exporta mais** — mantê-la em presente do indicativo
 * faria quem parasse no cabeçalho concluir que o passo manual continua vivo.
 * **Achado da revisão do PR 6.**
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

/*
 * 🔴 `EQUIPE_ANOS_ANONIMO` FOI REMOVIDO NO PR 6 (2026-08-28) — não é renomeação,
 * o artefato deixou de existir.
 *
 * No PR 5 ele era a saída do `anonimizar` num mundo em que `src/data/` ficava
 * intocado. **Desde o PR 6 o `anonimizar` escreve DIRETO em
 * `PUBLICADO_EQUIPE_ANOS`** (abaixo), e manter os dois destinos recriaria a
 * própria coisa que este arquivo existe para matar: **duas fontes que precisam
 * concordar.** Palavras do dev ao decidir: *"escrever nos dois cria duas fontes
 * que precisam concordar — o defeito que a trilha inteira existe para matar."*
 *
 * 🔒 O que garante a concordância agora é **uma cerca, não uma convenção**:
 * `scripts/publicacao.test.ts` assere `src/data/equipe-anos.json ===
 * anonimizar(derivado, tabela)`, com anti-vacuidade nas duas metades.
 */

/** Dados servidos ao app. É o que entra no bundle. */
export const DATA_DIR = join(RAIZ, 'src', 'data');

/**
 * Destino da publicação. ✅ **ESCRITO POR SCRIPT desde o PR 6 (2026-08-28) — a
 * cópia manual MORREU AQUI.**
 *
 * 📉 **O que existia antes, e por quanto tempo:** `src/data/equipe-anos.json`
 * era **cópia byte a byte** de `equipe-anos.derivado.json` (mesmo
 * `git hash-object`, medido), **nenhum script fazia a cópia**, e **nada falhava
 * se os dois divergissem** — a identidade era resultado de alguém ter copiado
 * certo, não de um portão. Estava assim desde o swap manual `8d2493a`, e **só
 * foi descoberto quando o PR 5 mediu.**
 *
 * 🔒 **DUAS COISAS MORRERAM AQUI, e confundi-las é o risco.** Palavras do dev:
 * *"trocar um passo manual sem guarda por um script sem guarda não seria ganho
 * — seria a mesma dívida com nome novo."*
 * - **O passo manual** morre por `npm run dataset:anonimizar` publicar direto.
 * - **A ausência de guarda** morre pela cerca `scripts/publicacao.test.ts`, que
 *   assere `src/data/equipe-anos.json === anonimizar(derivado, tabela)` em todo
 *   `npm test`. **Sem ela, o script sozinho só automatizaria o mesmo silêncio.**
 *
 * ⚠️ **A ENTRADA do pipeline segue REAL por desenho** (`EQUIPE_ANOS_DERIVADO`,
 * em `scripts/derived/`). O fictício nasce na publicação, não no pipeline.
 */
export const PUBLICADO_EQUIPE_ANOS = join(DATA_DIR, 'equipe-anos.json');

/** Fixture pequena e segura de ler inteira (regra do `CLAUDE.md`). */
export const FIXTURE_DIR = join(RAIZ, 'src', 'fixtures', 'dataset-semente');

/**
 * O `equipe-anos.json` da fixture. **Fictício desde o PR 7 (2026-08-31).**
 *
 * 🔒 **Mora AQUI, e não no `anonimizar-fixture.ts`, por uma razão concreta:** a
 * cerca permanente (`scripts/fixture-semente.test.ts`) precisa deste caminho, e
 * o script de migração é **descartável por desenho** — é de uma via, não tem
 * `npm run`, e some no dia em que alguém limpar migrações já aplicadas. Deixar
 * a constante lá acoplaria a cerca ao artefato descartável.
 * 📌 É a regra do topo deste arquivo aplicada: *"caminho novo de dataset entra
 * AQUI, não num script."* Achado da revisão do PR 7.
 */
export const FIXTURE_EQUIPE_ANOS = join(FIXTURE_DIR, 'equipe-anos.json');

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
