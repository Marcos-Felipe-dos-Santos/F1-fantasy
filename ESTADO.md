# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> **Planos de fase em `PLANOS_ATIVOS.md`** (~~Fase 3, 3.5 campeonato online, spike da casca~~ —
> ⚠️ **os três encerraram: a FASE 3 ESTÁ ENCERRADA desde 2026-08-27**, ver §"FASE 3 ENCERRADA"; o
> que segue **ATIVO ali é a trilha de NOMES FICTÍCIOS**, §"NOMES FICTÍCIOS — o plano dos 7 PRs") —
> consulte **o plano que interessa**, nunca inteiro. Histórico por PR: `HISTORICO.md` (fases 6-7 e o
> que foi arquivado daqui) e `HISTORICO_ARQUIVO.md` (fases 0-5). Não leia nenhum dos três inteiro.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

**Última medição (2026-09-01, na `main` — PR H2, teto de conexões + Origin, `91322d0`):**
`npm test` **1677/73** em **3 rodadas idênticas** — **INALTERADO**, e inalterado é o resultado
CERTO: os 7 casos novos moram em `party/conexoes.test.ts`, fora do `include` do `npm test` (mesmo
precedente do PR B do spike). **`npm run test:party` 33/33** (era 26/26, **+7**). typecheck **0**
nos três projetos, lint **0** (por exit code), build **0**.
🔑 **`VERSAO_APP` fica 3.4.5 e `VERSAO_FORMATO` fica 3 — SEM BUMP, e a prova é MECÂNICA:**
`src/engine/versao.test.ts` verde dentro do `npm test`, e o bundle saiu
**`dist/assets/index-B0pMOBwk.js` — o MESMO hash** do PR 6, do PR 7 e do H1.
`src/net/teto-conexoes.ts` só é importado por `party/`, então nada dele chega ao bundle.
⚠️ **`npm run balance` NÃO rodado, e dito por quê:** zero arquivo de `src/engine/`, `src/data/`
intocado. **`npm run preview` também não:** o PR não muda nada na tela, e o hash inalterado confirma.
🔴 **A §"Onde parei" ACUMULA de novo** — ver o motivo no bloco do H2, lá embaixo.

⚠️ **ACHADO AO ESCREVER ESTA LINHA, registrado em vez de consertado em silêncio: a medição do PR H1
NUNCA ENTROU NESTA SEÇÃO.** A entrada abaixo, do `.gitattributes`, era a que estava marcada como
"última" — e entre ela e hoje houve o H1 (`2f780bb`), cujos portões (`1677/73`, `26/26`) vivem só na
§"Onde parei". **Não reescrevi o rótulo dela nem fabriquei um bloco retroativo do H1**: o que está
medido por mim é a linha do H2, acima. 🔑 **É a mesma família do "cifra obsoleta sobrevivendo"** da
pendência 10 — seção de estado que envelhece porque a atualização mora noutro lugar.

*(Medição anterior, 2026-09-01, na `main` — PR do `.gitattributes`, `ea2c8f4`):*
`npm test` **1662/71** em **3 rodadas** (era 1659/70). ⚠️ **SUBIU, e é dito assim de propósito:** os
**3 testes novos** são a cerca de final de linha (`scripts/cerca-eol.test.ts`, arquivo novo).
**`npm run test:party` 19/19**, typecheck **0** nos três projetos, eslint **0** (por exit code),
build **0**.
🔑 **`VERSAO_APP` fica 3.4.5 e `VERSAO_FORMATO` fica 3 — SEM BUMP, e a prova é MECÂNICA:**
`src/engine/versao.test.ts` está verde. Os dois arquivos editados são `.test.ts` e `scripts/`,
**fora do escopo do digest**, e o `.gitattributes` mora na raiz, também fora.
🔑 **Bundle `dist/assets/index-B0pMOBwk.js` — MESMO hash de conteúdo do PR 6 e do PR 7.** Nada que
chega ao bundle foi tocado.
✅ **ZERO DIFF DE RENORMALIZAÇÃO, medido de duas formas independentes** (sonda não-rastreada no repo
real + clone isolado): o índice já era **100% LF, 233/233**, então `git add --renormalize .` não
encena nada. **`git status` ficou limpo antes e depois do commit.**
⚠️ **`npm run balance` NÃO rodado, e dito por quê:** zero arquivo de produção de `src/engine/`, e
`src/data/` está **byte a byte idêntico em disco** — nenhum arquivo foi reescrito. Delta zero por
construção. **`npm run preview` também não:** o PR não muda nada na tela, e o hash do bundle
inalterado é a confirmação.
🔴 **A §"Onde parei" voltou a ACUMULAR** — o bloco do PR 7 não estava espelhado (contenção **33,0%**,
medida). Ver lá.
📌 **Portão dos nomes reais NÃO re-rodado por medição direta, e é dito:** o `npm test` verde inclui
`scripts/portao-nomes-reais.test.ts`, e o PR não toca nenhum dos seis `.json` do `BASELINE`.
**Medido à parte que o portão é EOL-INVARIANTE** (contagens idênticas em LF e CRLF com os bytes
diferindo — a sonda não é vácua), então ele não podia se mover por este PR.

*(Medição anterior, 2026-08-31, na `main` — PR 7 da trilha de nomes fictícios, A FIXTURE, `cd9d5b7`):*
`npm test` **1659/70** em **3 rodadas** (era 1642/68). ⚠️ **SUBIU, e é dito assim de propósito:** os
**17 testes novos** são **7** da cerca de propriedade (`scripts/fixture-semente.test.ts`) e **10** do
diferencial da migração (`scripts/anonimizar-fixture.test.ts`), os dois arquivos novos.
**`npm run test:party` 19/19**, typecheck **0** nos três projetos, eslint **0** (por exit code),
build **0**.
🔑 **`VERSAO_APP` fica 3.4.5 e `VERSAO_FORMATO` fica 3 — SEM BUMP, e MEDIDO:** o digest **`a2b34e13`
não se moveu**, porque `src/fixtures/` está **fora do escopo** de `digestDoConteudo()` (engine +
`src/data/*.json` + 2 de `src/net/`). A fixture não é servida ao app nem persistida em save.
🔑 **Bundle `dist/assets/index-B0pMOBwk.js` — MESMO hash de conteúdo do PR 6.** Confirma por medição
que nada que chega ao bundle foi tocado; **a contagem de 114 do PR 6 segue valendo sem remedição**.
🏁 **PORTÃO DOS NOMES REAIS: 249 → 6. O PISO FOI ATINGIDO, e ele estava registrado ANTES do PR:**
`massa`=2+2 (sobre-contagem sobre dado limpo) e `Red Bull`=1+1 (`Red Bull Ring`, T2 adiada). A linha
`src/fixtures/dataset-semente/equipe-anos.json` foi de **243 a 0**; as outras cinco não se moveram.
**Medido por réplica independente do contador**, não só pelo teste verde.
✅ **`npm run balance`: DELTA ZERO** — sha256 `a0aa98e4…` **idêntico** ao baseline do PR 6, **diff
vazio**, mesma receita de filtro. **Previsto ANTES de rodar:** os dois `*.balance.test.ts` leem
`src/data/`, nunca a fixture. **Delta ≠ 0 teria sido bandeira vermelha, não a 0(ae).**
🔴 **`M-pessoa` (mapear o piloto para a pessoa ERRADA) passa em TUDO — limite honesto declarado.**
Ver a §Onde parei. **A trilha de nomes fictícios está ENTREGUE: 7 de 7.**
📄 **Medições refeitas nesta sessão, com método: `preview/medicoes-pr7/MEDICOES-DA-DOC.md`.**

*(Medição anterior, 2026-08-30, na `main` — PR 6 da trilha de nomes fictícios, A TROCA DO DATASET):*
`npm test` **1642/68** em **2 rodadas** (era 1638/67). ⚠️ **SUBIU, e é dito assim de propósito:** os
**4 testes novos** são a cerca de publicação (`scripts/publicacao.test.ts`, arquivo novo).
**`npm run test:party` 19/19**, typecheck **0** nos três projetos, eslint **0** (por exit code),
build **0** (`dist/assets/index-B0pMOBwk.js`).
🔴 **`VERSAO_APP` 3.4.4 → 3.4.5 e `VERSAO_FORMATO` 2 → 3 — OS DOIS BUMPS SÃO OBRIGATÓRIOS**, e não
são o caso "refactor sem efeito": `src/data/equipe-anos.json` mudou inteiro (**771 registros, 7710
linhas em cada direção**), nomes exibidos **e ids**. Dois builds com datasets diferentes não podem
compartilhar sala (o `hashDoDraft` consome `${equipe}@${ano}` e os seis ids de loadout), e save
antigo carrega ids que não existem mais.
🔑 **Digest `442b210c` → `a2b34e13`** (`src/engine/versao.test.ts:36`). ⚠️ **O salto NÃO é só o dado:
a FÓRMULA do digest mudou junto** — passou a normalizar CRLF → LF. Ver o C1 do PR 6 em `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md` em 2026-08-31".
✅ **Portão dos nomes reais: 9.486 → 249 (−9.237).** A linha `src/data/equipe-anos.json` foi a **0**;
as outras cinco não se moveram. **O piso do PR 7 é 6**, não 0 — quebra no docblock do portão.
✅ **Bundle medido À MÃO (não há portão): 114** no chunk JS — `button`=57 · `sala`=54 · `massa`=2 ·
`Red Bull`=1, **tudo sobre-contagem ou a pista da T2**. ⚠️ **`dist/` INTEIRO dá 128** (o CSS soma
`shadow`=13 de `box-shadow` + `button`=1). **Contra-prova:** `Ferrari` 152× no derivado → `Sarterra`
152× no publicado e no bundle, contagem idêntica.
🔴 **`npm run balance`: DELTA ≠ ZERO — 40 linhas, e é a PRIMEIRA vez que o baseline se move.**
Novo baseline `a0aa98e48d259a4e9ce9752da505331cfcf4ecf6085c51ea053b1f5d6a2aec37`
(`preview/medicoes-pr6/`), com a **mesma receita de filtro de 4 padrões** — o filtro NÃO foi
alargado. **Não é mudança de balanceamento:** as notas são byte a byte idênticas (medido, sha
`8eab5ec0…` dos dois lados despidos de nome/id); o que mudou foi **quem ganha um desempate
lexicográfico por id**. **Pendência 0(ae).**
⚠️ **`npm run dataset:report`: 255 linhas, zero `'(não encontrado)'`, sha256 `c509049b0e…` — BYTE A
BYTE igual ao do PR 2. E isso NÃO é evidência de que a troca foi segura:** `dataset-report.ts:265-266`
lê `fatos-agregados.json` e `equipe-anos.derivado.json`, **a entrada real, que o PR 6 não toca**. O
relatório é **cego para `src/data/`**. Rodado e registrado assim para ninguém o ler como portão da
publicação.
📄 **Medições refeitas nesta sessão, com método: `preview/medicoes-pr6/MEDICOES-DA-DOC.md`.**

*(Medição anterior, 2026-08-28, na `main` — PR de POSICIONAMENTO das referências, `c61b3a7`):*
`npm test` **1638/67 — INALTERADO**, e inalterado é o resultado CERTO: nenhum teste nasceu e nenhum
comportamento mudou (o PR renomeia constantes, não muda valor nenhum).
**`npm run test:party` não rodado, e dito:** zero arquivo de `party/` no diff.
typecheck **0** nos três projetos, eslint **0** (lido por **exit code**).
⚠️ **`VERSAO_APP` fica em 3.4.4 e `VERSAO_FORMATO` em 2, mas NÃO porque o digest ficou parado — ele
MUDOU: `bb6c419d` → `442b210c`**, colado em `src/engine/versao.test.ts:36`.
`src/engine/draft-test-fixtures.ts` mora em `src/engine/` e **não** tem sufixo `.test.ts`, então
entra no escopo do digest, e o import renomeado o moveu. **O não-bump é o caso "Não" que o próprio
`versao.test.ts` descreve** — o arquivo é consumido só por `bots.test.ts` e `draft.test.ts`, zero
efeito em runtime. **Mesmo precedente do PR 2 (`50bda11`), pelo mesmo arquivo.**
✅ **`npm run balance`: DELTA ZERO** — sha256 do filtrado **idêntico** ao da captura do PR 2,
`e62fe729406e6bcb0b1514ac8e337a00a5c5ed5c01c7e2e00ae0195786c0b9fc`, com a **mesma receita de filtro
de 4 padrões** (`preview/medicoes-pr2/LEIA-ME.md`).
✅ **`npm run dataset:report`: BYTE A BYTE idêntico** ao do PR 2 — 255 linhas,
`c509049b0ea9dce58b7b4c7aa4d7331f0760f97fb876fa8755ca55d63205a78c`, zero `'(não encontrado)'`.
**Rodado de propósito: nenhum teste do `npm test` o executa** e é o caminho que degrada em silêncio.
✅ **Portão dos nomes reais INALTERADO em 9.486** (`9237+2+1+243+2+1`), **por rodada direta** — e
inalterado é o CERTO: a lista `BASELINE` só tem os 6 JSON de dados e nenhum foi tocado. **O portão
não mede `.ts`.**

*(Medição anterior, 2026-08-28, na `main` — PR 5 da trilha de nomes fictícios, `3d5f105`):*
`npm test` **1638/67** em **3 rodadas** (era 1622/66). ⚠️ **SUBIU, e é dito assim de propósito:** os
**16 testes novos** são o diferencial (`scripts/anonimizar.test.ts`). **"Inalterado" aqui seria a
conflação que este arquivo já pagou.**
**`npm run test:party` 19/19**, typecheck **0** nos três projetos, eslint **0**, build **0**.
**`VERSAO_APP` 3.4.4 e `VERSAO_FORMATO` 2 — SEM BUMP, medido:** nenhum arquivo do digest tocado (o
`src/engine/versao.test.ts` verde é a prova mecânica) e nenhum id persistido mudou.
**`balance-harness` não rodado, e dito:** zero arquivo de `src/engine/`.
✅ **Portão dos nomes reais INALTERADO em 9.486** (`9237+2+1+243+2+1`), **confirmado por rodada
direta, não herdado** — e inalterado é o CERTO: `src/data/` está intocado (medido: `git diff --stat
src/data/` vazio) e a saída do `anonimizar` é **gitignorada**, fora da lista `BASELINE`.
⚠️ **O `tsc` foi o portão que a suíte não foi neste PR** — ver o erro do `'media'` no PR 5, em `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md` em 2026-08-31".

*(Medição anterior, 2026-08-27, na `main` — PR 4 da trilha de nomes fictícios, `cbe2bbc`):*
`npm test` **1622/66** em **2 rodadas** (era 1603/65). ⚠️ **SUBIU, e é dito assim de propósito:** os
**19 testes novos** são os da cerca de quase-marca (`scripts/nomes-ficticios.test.ts`). **Reportar
"inalterado" aqui seria a conflação que este arquivo já pagou.**
**`npm run test:party` 19/19**, typecheck **0** nos três projetos, eslint **0**, build **0**.
**`VERSAO_APP` 3.4.4 e `VERSAO_FORMATO` 2 — SEM BUMP, medido:** nenhum arquivo do digest tocado e
nenhum id persistido mudou (a tabela ainda não é aplicada a nada). **`balance-harness` não rodado, e
dito:** zero arquivo de `src/engine/`.
✅ **Portão dos nomes reais INALTERADO em 9.486** (`9237+2+1+243+2+1`), **confirmado por rodada
direta, não herdado** — e inalterado é o resultado CERTO: o PR não encosta em `src/data/` nem na
fixture. **A tabela nova mora em `scripts/`**, fora da lista `BASELINE` do portão.

*(Medição anterior, 2026-08-27, na `main` — PR 3 da trilha de nomes fictícios, `e501b97`):*
`npm test` **1603/65** (inalterado — o novo gerador vive em `scripts/` e roda por `npm run preview`).
**`npm run test:party` 19/19**, typecheck **0** nos três projetos, eslint **0**, build **0**.
**`VERSAO_FORMATO` 1 → 2, `VERSAO_APP` 3.4.3 → 3.4.4 — BUMP OBRIGATÓRIO** (digest de dados mudou).
Digest novo: **`96c4f6b1` → `bb6c419d`** (`src/engine/versao.test.ts:36`).
**`npm run balance`: DELTA ZERO**, sha256 do filtrado **idêntico** antes e depois — `e62fe729406e6bcb0b1514ac8e337a00a5c5ed5c01c7e2e00ae0195786c0b9fc`.
**Bundle:** amostras dos 10 ids antigos = **0**; os 4 "Gilles Villeneuve" que sobraram são o piloto (PR 6).
✅ **Portão dos nomes reais: 9.522 → 9.486 (−36). PRIMEIRO PR que move a baseline.**

*(Medição anterior, 2026-08-25, na `main` — PR 2 da trilha de nomes fictícios, `50bda11`):*
`npm test` **1603/65** em **2 rodadas pós-mudança** — **INALTERADO em relação ao PR 1 (`fc6fb6a`),
que já media 1603/65**; foi o PR 1 que subiu de 1592/64, não este. **`npm run test:party` 19/19**,
typecheck **0** nos três projetos, eslint **0**, build **0**.
⚠️ **`VERSAO_APP` fica em 3.4.3, mas NÃO porque o digest ficou parado — ele MUDOU.**
`src/engine/draft-test-fixtures.ts` mora em `src/engine/` e **não** tem sufixo `.test.ts`, então
entra no escopo do digest: `9dccd150` → **`96c4f6b1`**, colado em `src/engine/versao.test.ts:36`.
**O não-bump é o caso "Não" que o próprio `versao.test.ts` descreve** — o arquivo é consumido só por
`bots.test.ts` e `draft.test.ts`, zero efeito em runtime.
✅ **Bundle byte a byte INALTERADO, medido pelo hash de conteúdo do chunk:** `index-C10zYSkb.js`,
o **mesmo** registrado no inventário de nomes reais (ver a §"MEDIÇÕES E AUDITORIAS DA TRILHA DE NOMES") — o que também confirma que os
105/1.542/353 daquela contagem seguem valendo.

*(Medição anterior, 2026-08-23, na branch `fix-0s-sala-zumbi` — conserto da 0(s), pós-revisão):*
`npm test` **1592/64** em **3 rodadas**, **`npm run test:party` 19/19** (era 16/16), typecheck **0**
nos três projetos, eslint **0**, build **0**. `VERSAO_APP` **3.4.3** (inalterado — o diff de
produção é um `else if` na casca, e o digest não cobre `party/`).

*(Medição anterior, 2026-08-23, na branch `pr-c-gate-alarm` — PR C do spike):* `npm test`
**1592/64** em **3 rodadas** (INALTERADO, e é o resultado correto: o arquivo novo mora em `party/`,
fora do `include` do `npm test` — mesmo precedente do PR B), **`npm run test:party` 16/16**
(era 10/10), typecheck **0** nos três projetos, eslint **0**, build **0**. `VERSAO_APP` **3.4.3**
(inalterado — **zero diff de produção** neste PR).

*(Medição anterior, 2026-08-23, na branch `pr-3.5.4-ui-campeonato` — `7c5efa9` —, pós-revisão):*
`npm test` **1592/64**, **`npm run test:party` 10/10**, typecheck **0** nos três projetos, eslint **0**, build **0**.
`VERSAO_APP` **3.4.2 → 3.4.3 — BUMP OBRIGATÓRIO** (bloqueante C1 da revisão exigiu). `balance-harness`
não se aplica — zero arquivo de `src/engine/` além de `versao.ts`. 🔑 **Medição de portão instável se faz com
a saída INTEIRA salva por rodada** — filtro que guarda só o placar joga fora o dado que discrimina 0(v) de regressão.

*(Medição anterior, 2026-08-23, na `main` PÓS-MERGE do 3.5.3 — `922bdd0` —, medida na `main` e não
herdada da branch):* `npm test` **1565/64** em **8 rodadas seguidas**, **`npm run test:party` 10/10**,
typecheck **0** nos três projetos, eslint **0**, build **0**. `VERSAO_APP` **3.4.2**.
⚠️ **Uma leva ANTERIOR de 8 rodadas, no MESMO commit, teve 1 vermelho na rodada 1** (1564/1565) —
rodada **com leitura de arquivos do projeto em paralelo**, que é o gatilho da 0(v). **O nome do teste
não foi capturado** (o filtro da medição descartou a linha), então ele **não pode ser atribuído à
0(v) por medição, só por plausibilidade**. A leva limpa que vale (8/8) foi rodada sem nada
concorrente. ⚠️ Esta ressalva foi **APAGADA pela atualização de documentação do 3.5.4 e restaurada
aqui**: ela é o FATO medido, e a lição que sobrou no lugar dela (a linha do "🔑" acima) é só a
conclusão. **Conclusão sem o fato que a gerou não se verifica depois.**
✅ **2026-08-27 — A LACUNA ACIMA FOI PREENCHIDA: desta vez o NOME do teste FOI capturado.** No PR
(ab), uma rodada do `npm test` deu **1 vermelho em `src/ui/contrato-ausente.test.ts`** (1602/1603),
num PR que **só toca um arquivo de preview** e não encosta no ausente. **Três rodadas seguintes:
1603/1603.** 🔑 **É a primeira vez que a 0(v) é atribuída por MEDIÇÃO e não por plausibilidade** — o
arquivo bate exatamente com o que a §Pendências prevê ("um vermelho em `contrato-ausente.test.ts`
num PR que não toca o ausente é sintoma disso, não regressão"). **O que fez a diferença foi guardar
a saída INTEIRA por rodada**, que é a lição do 🔑 acima aplicada e agora confirmada por uso.

*(Medição anterior, PR 3.5.3, 2026-08-21, na branch `pr-3.5.3-cliente-multietapa`, pós-revisão e
pós-conserto do bloqueante C1):* `npm test` **1565/64**, **`npm run test:party` 10/10**, typecheck
**0** nos três projetos, eslint **0**, build **0**. `VERSAO_APP` **3.4.2** (sem bump — medido: o
digest não foi tocado e nenhum rótulo novo nasceu).

*(Medição anterior, PR 3.5.2, 2026-08-20, na branch `pr-3.5.2-cursor-por-etapa`):* `npm test`
**1544/64**, **`npm run test:party` 10/10**, typecheck **0** nos três projetos, eslint **0**, build
**0**. `VERSAO_APP` **3.4.2** (sem bump — o digest não foi tocado).
⚠️ **`VERSAO_ESTADO_SALA` subiu de 1 para 2** — ver o 3.5.2 em `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md` em 2026-08-31".
⚠️ **O `npm test` deste projeto tem uma corrida de I/O entre duas cercas e pode falhar por
escalonamento — pendência 0(v), medida e PRÉ-EXISTENTE.** A parcela introduzida pelo 3.5.3 foi
FECHADA NA RAIZ no proprio PR (8 rodadas seguidas a 1565/1565), mas **um vermelho em `contrato-ausente.test.ts` num PR que
não toca o ausente é sintoma disso, não regressão** — reproduzir antes de caçar bug.
⚠️ **A medição do 3.5.2 estava DUPLICADA aqui (dois blocos idênticos), sobra da atualização de
documentação do 3.5.4. A segunda cópia foi removida no PR C** — o bloco acima é o que fica.

*(Medição anterior, PR B do spike, 2026-08-19, na `main` pós-merge):* `npm test` **1516/63**,
**`npm run test:party` 8/8** (novo portão desde o PR A — era 5/5 lá), typecheck app **0**, typecheck
`party/` **0**, **typecheck `party/tsconfig.test.json` 0** (novo), eslint **0**, build **0**
(o `checar:casca` roda dentro dele). `VERSAO_APP` **3.4.2**.
⚠️ **`npm test` e `npm run test:party` são suítes SEPARADAS, e é de propósito** — `party/` roda no
`workerd` com config à parte, fora do `include` do `npm test`. **Medir só um dos dois deixa metade
do projeto sem portão.**
*(Medição anterior, PR 3.5.1, 2026-08-18: `npm test` 1516/63, typecheck app 0, typecheck `party/` 0,
eslint 0, build 0.)*
⚠️ O badge do README diz **1094** e é **estático** — não há CI neste repo (`.github/` não existe).
Está desatualizado e vai mentir se um teste quebrar.

📄 **`docs/img/` é VERSIONADA** (ao contrário de `preview/` e `referencias/`, gitignored): os três
prints do dev e a grade `silhuetas.svg`, esta **gerada** por
`scripts/gerar-silhuetas-readme.preview.test.ts` via `npm run preview`, a partir do `pathDaVolta` de
produção. **Se um traçado mudar, regerar e commitar a grade.** Licença **MIT** desde 2026-08-08.

> 📦 **O changelog histórico desta seção foi ARQUIVADO em 2026-08-19** (narrativas de PR, medições
> por PR, portão nº 2, SPIKE 3.0, inventário da `main`, push/merge de agosto, README/LICENSE):
> `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md`" → §"§Estado atual". Nada foi resumido.

🎮 **COMO TESTAR O ONLINE — dois terminais, no PowerShell:**

    Terminal 1:   npm run sala        (worker/DO — fica em 127.0.0.1:8787)
    Terminal 2:   npm run dev         (app em localhost:5173)

**Caminho principal (✅ rodado em 2026-08-11, funciona):** `http://localhost:5173/` → Modo "Online"
→ "Criar sala" → servidor sorteia código → "Copiar link" → cole numa segunda aba → nomes diferentes
→ "Estou pronto" nas duas → anfitrião 👑 clica "Começar o draft" → rodada 1 de 5 aparece nas duas
abas com sorteios independentes. (Alternativa: "Entrar na sala de um amigo" e digitar os 6 dígitos.)

✅ **QUATRO CASOS DE PROPÓSITO TESTADOS PELO DEV em 2026-08-11 (PR 3.3.4):**
- ✅ **F5 no meio do draft** — volta como o mesmo jogador, pelo token. A URL agora fica `?sala=`.
- ✅ **Fechar a aba e voltar** em menos de 2 minutos — a sala sobrevive e a reconexão traz o estado do
  draft (a carência de 2 min protege contra zumbi de draft antigo).
- ✅ **Deixar uma aba parada** até o cronômetro de turno expirar — a outra segue, e a parada passa a
  mostrar "você perdeu a vez por inatividade" (expiraTurno).
- ✅ **Um código inventado** (ex.: `FFFFFF`) — diz "Sala não encontrada", não trava.

📱 **PRA JOGAR DO CELULAR / EM REDE — trocar o terminal 2 por `npm run dev:rede`** e abrir no
celular o endereço `Network` da LAN que ele imprime (hoje `http://192.168.0.13:5173/`).
**Guia completo: `docs/jogar-em-rede.md`** (firewall, túnel, diagnóstico).

- 🎮 **COMO TESTAR O CAMPEONATO no app real** (o dev já testou single e local com 2 jogadores, e online foi fechado no 3.3.4):
  `npm run dev` → `http://localhost:5173/` → **Formato: "Campeonato curto"** → Começar draft →
  jogar o draft → **Ir pra corrida**. No fim de cada corrida, a tabela acumulada e "Próxima
  corrida". Recarregar a página no meio deve oferecer **"Continuar campeonato"** no topo.
  **Narração:** o ticker de eventos durante o replay mostra a variedade (PR A) e, quando os dados
  sustentam, "…e caiu atrás de X" (PR B). **Auto-avanço:** o toggle "Avançar automaticamente" no fim
  da corrida — ele deve avançar **e largar sozinho**, e desmarcar durante a contagem deve cancelar.

- **O repositório é PRIVADO** (`https://github.com/Marcos-Felipe-dos-Santos/F1-fantasy`) e deve
  continuar assim: o projeto usa nomes reais de pilotos e equipes e a questão jurídica do
  **GDD §14.2** ainda está em aberto. Evidência da privacidade: a API do GitHub sem autenticação
  devolve **404** para esse repo, enquanto `git ls-remote` autenticado funciona.
  Com a MIT no repositório, abrir o código deixou de ter o problema do "todos os direitos
  reservados" — mas **abrir segue sendo decisão do dev**, e o motivo do §14.2 não mudou.
  🔴 **ATUALIZADO em 2026-08-24 — O DEV DECIDIU DEPLOY PÚBLICO, e isso MUDA O STATUS DOS NOMES
  REAIS: eles deixaram de ser pendência e viraram BLOQUEADOR.** O parágrafo acima fica porque
  descreve corretamente o repositório (que segue privado, e a evidência do 404 segue valendo); o
  que envelheceu é o *raciocínio*: enquanto o alvo era jogar local e o repo era privado, nome real
  era risco contido. **Com o jogo servido publicamente, a distribuição é o fato jurídico**, e ela
  independe de o código estar aberto ou fechado. **Não há mais o caminho "adiar o §14.2".**
  ⚠️ **Ler junto com o inventário medido em 2026-08-24** (ver a §"MEDIÇÕES E AUDITORIAS DA TRILHA DE NOMES"): a frase do
  **`F1_Fantasy_GDD.md:265` e `:295` — "Engine agnóstica a nome" — é MEIA-VERDADE, medida**, e o
  custo de trocar o dataset não é o que essa frase sugere.
  ✅ **Os dois portões visuais foram FECHADOS em 2026-08-07** (silhuetas 10/10, paleta aprovada), o
  que removeu o motivo que segurava o trabalho da 7.7+ fora da `main` — merge feito em 2026-08-08.
  **Nenhuma tag foi criada para este merge.** Se for criar, só DEPOIS do merge na main (já é o caso).

## ✅ OS DOIS PORTÕES VISUAIS ESTÃO FECHADOS (dev, 2026-08-07)

**Não há portão visual aberto neste projeto.** Os dois foram aprovados pelo dev na mesma sessão.
Esta seção fica como registro do veredito — não reabrir sem ele.

### 1. AS SILHUETAS (PR 7.7/7.7.1) — ✅ APROVADAS. **Teste cego: 10/10.**

O critério de aceite era do próprio dev: *o jogador vê a pista e pensa "poxa, Interlagos" sem ler o
nome?* **Linha de base era 0/10; o placar final foi 10/10.** O redesenho a partir da geometria real
dos circuitos resolveu — e o **gatilho de abandono** que estava armado (parar e reabrir a pergunta
se o ponteiro não se movesse) **não foi acionado**.

### 2. A PALETA (PR 7.8) — ✅ APROVADA, **com o light mode**.

A troca do azul-noite pela paleta F1 (grafite + vermelho `#FF1801` + dourado `#FFB800` + verde
`#00D26A`) **resolveu o problema que motivou o PR** — palavras do dev na abertura: a tela "parecia
genérica e feita com IA". Aprovada como está, incluindo o light mode e a ilha escura do painel do
traçado (que é necessidade matemática, ver as decisões travadas mais abaixo).

> ✅ **Consequências práticas de os dois estarem fechados:**
> - **`npm run preview` voltou a ser seguro.** O aviso que existia aqui — de que ele repintaria o
>   `redesenho.html` com a paleta nova e misturaria as duas perguntas — **não vale mais**, porque
>   não há duas perguntas pendentes pra misturar.
> - **O diff da paleta deixou de ser candidato a reversão.** A instrução anterior ("se for
>   reprovada, reverter `f736e6c`") está morta.
> - Os previews seguem em `preview/` (gitignored):
>   `E:\projetos\F1 fantasy\preview\redesenho.html` e `E:\projetos\F1 fantasy\preview\paleta.html`.


## 🚩 FASE 8 — MODO CAMPEONATO: ENCERRADA (o que ficou retido)

> 📦 **Texto integral ARQUIVADO em 2026-08-19** → `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md`" →
> §"§FASE 8". A fase está completa (8.1, 8.2, 8.2.1, 8.3, 8.4-mínimo, e a rodada de narração
> rica + auto-avanço A/B/C). **Este bloco é a RETENÇÃO** — o que não pode sair daqui.

⬅️ **O ÚNICO ITEM AINDA ABERTO DA FASE 8 — VEREDITO DO DEV sobre as três telas do 8.3:**

    start "" "E:\projetos\F1 fantasy\preview\campeonato.html"

As três telas numa página só, a partir de um campeonato real (seed 2026, curta, 8 jogadores):
**calendário** (silhuetas, vencedores, próxima destacada), **classificação com variação de posição**
(▲/▼) e **fim de campeonato** (pódio + tabela final + calendário completo).

🔒 **Decisão travada do formato:** **nenhuma alavanca** (sem lastro, sem pit de meio de temporada) —
é jogo de draft, o campeonato é confirmação. Draft único por campeonato. Ordem embaralhada nas duas
modalidades. Submodos: **curta** (5 pistas sorteadas das 10, default) e **completa** (10 embaralhadas).

🔑 **O BUG QUE QUASE ENTROU — a lição que sobrevive ao PR.** As duas trilhas de corrida usam seeds
**diferentes de propósito** (decisão D6): a avulsa usa a seed **crua** do draft, a etapa de
campeonato usa `seedDaEtapa(seed, pistaId)`. Como `iniciarCampeonato` **pré-simula** as etapas e a
pontuação sai dali, ligar o campeonato no `FluxoCorrida` existente faria o jogador **assistir a uma
corrida e ver OUTRA na tabela**. **`npm test` não pegaria** — cada lado, isolado, está certo; só a
composição estava errada. `prepararCorrida` ganhou `seed` (default preserva a avulsa bit a bit) e há
teste provando a reprodução bit a bit da etapa pré-simulada.

🔒 **Regras de honestidade da narração, travadas por TESTE, não por comentário:** nenhuma frase pode
afirmar manobra, local da pista, disputa ou clima evoluindo — um regex reprova
`ultrapass|disputa|começou a chover|pneu de chuva` em qualquer variante nova. **A engine simula cada
carro isoladamente e o clima é uma flag global**; qualquer frase fora disso é falsa por construção.

📌 **Regra registrada para código que ainda não existe (item d do dev):** quando houver narração de
troca de posição, **pit não é ultrapassagem** — pit de qualquer um dos dois desqualifica a palavra.
Hoje não existe narração de troca de posição (a única narração do jogo era `ROTULOS_EVENTO`), então
a regra fica aqui aguardando o código que a consumirá.

🔒 **A decisão que sustenta a tela de calendário:** `iniciarCampeonato` **pré-simula todas as
etapas**, então o resultado das próximas está em memória o tempo todo. `calendarioAnotado` só revela
vencedor de etapa com `indice < etapaAtual` — vazar o vencedor de uma corrida que o jogador ainda
vai assistir estragaria a corrida. **Tem teste dedicado, e é o mais importante do PR.**

🔒 **A silhueta da miniatura reusa `pathDaVolta`**, a mesma geometria da tela de corrida. Foi ela que
tirou 10/10 no teste cego; redesenhar à mão na miniatura jogaria isso fora.

## 🌐 FASE 3 — ONLINE: ✅ ENCERRADA (as obrigações retidas seguem valendo)

> 📦 **O plano da fase e a sequência de PRs 3.0 → 3.5 foram MOVIDOS em 2026-08-19** →
> **`PLANOS_ATIVOS.md` §"FASE 3 — ONLINE"**, que era o arquivo dos planos **ATIVOS** (íntegro, nada
> resumido). ⚠️ **Desde 2026-08-28 aquele plano NÃO é mais ativo — a fase encerrou**; o texto segue
> lá, e **mover ou arquivar é decisão do dev**, proposta ao fim desta seção. **Este bloco é a
> RETENÇÃO:** as decisões travadas e regras invioláveis que obrigam trabalho FUTURO e por isso se
> leem toda sessão. **Cabeçalho não prova pertencimento — foi lendo o conteúdo que estas linhas
> ficaram.**

### ✅ FASE 3 ENCERRADA — decisão DITADA PELO DEV (datada por ele 2026-08-27, registrada em 2026-08-28)

📌 **PROVENIÊNCIA, e ela é parte do registro** (mesma disciplina da §"NOMES FICTÍCIOS — DECISÕES DO
DEV", escrita depois do `e1db1c9`, que gravou aprovações que nunca existiram): **o dev ditou este
encerramento nesta sessão, em palavras dele, datando-o 2026-08-27.** O registro entra em
**2026-08-28**. **Os dois fatos ficam; não escolhi entre eles.**

**O que o dev ditou, TEXTUAL e sem corte** (o trecho inteiro, não uma costura de frases — elidir
enquanto se rotula "textual" é o defeito que esta seção existe para não repetir):
> *"DECISÃO: a Fase 3 ESTÁ ENCERRADA. Ditada por mim agora, 2026-08-27. Todos os PRs da sequência
> foram entregues (3.5.1 → 3.5.2 → 3.5.3 → 3.5.4 → PR C → conserto da 0(s)), todos mergeados, todos
> com portões verdes."*

🔒 **Isto FECHA a divergência que este arquivo carregava:** a §SEQUÊNCIA dizia *"⬅️ Fase 3 PRONTA
PARA SER ENCERRADA"* e logo abaixo *"🛑 A FASE 3 NÃO ESTÁ ENCERRADA — encerrá-la é DECISÃO DO DEV, e
ela não foi tomada"*. **A decisão foi tomada.** A redação antiga foi **riscada no lugar**, não
apagada — ver lá.

🔴 **ENCERRADA NÃO QUER DIZER SEM DÍVIDA — a lista abaixo é DO DEV, ditada junto com o encerramento.**
Ele nomeou, como o que fica ABERTO apesar do encerramento:

| item | onde está | em uma linha |
|---|---|---|
| **pendência 9 em 🟡** | §Pendências, item 9 | `party/` com cobertura PARCIAL: `onMessage`/`onClose`/`encerrar`/CORS/RPC-vs-HTTP seguem sem teste |
| **0(t)** | §Pendências 0(t) | o snapshot pode se AUTOCONTRADIZER em sala `corrompida`; 3 caminhos, nenhum escolhido |
| **0(u2)** | §Pendências 0(u) | guarda de etapa ASSIMÉTRICA — `etapa > cursor` escreve balde FUTURO e pré-queima o alarme |
| **0(u3)** | §Pendências 0(u) | blip de rede de 3 s tira o jogador dos elegíveis e a sala anda sem ele |
| **0(u4)** | §Pendências 0(u) | baldes com chave antiga ficam órfãos numa sala 3.4/3.5.1 reidratada |
| **0(u5)** | §Pendências 0(u) | cliente antigo atestando na virada de etapa pode gerar alarme falso residual |
| **0(u6)** | §Pendências 0(u) | `versaoSala` é o único campo persistido SEM checagem de forma |
| **0(x)** | §Pendências 0(x) | `corrida-concluida` não carrega `etapa`; o atrasado atesta a etapa do SERVIDOR |
| **0(y)** | §Pendências 0(y) | a guarda de 22 protege o ROSTER, não as CONEXÕES — socket quieto não é limitado |
| **0(z)** | §Pendências 0(z) | renomear pista degrada em SILÊNCIO (a cerca compara duas fontes, não o conteúdo) |
| **0(aa)** | §Pendências 0(aa) | a janela entre o PR 6 e o PR 7 da trilha de nomes fictícios |
| **0(ab)** | §Pendências 0(ab) | ⚠️ **ver a ressalva medida logo abaixo** |
| **0(ac)** | §Pendências 0(ac) | save antigo perde "Continuar campeonato" SEM MENSAGEM |
| **0(q) + 0(u1)** | §Pendências 0(q) e 0(u) | **o par do DEPLOY**: os dois lados sobem no MESMO deploy, com o `wrangler` ANTES do `vite` |

✅ **ATUALIZAÇÃO SOBRE A 0(aa) DA TABELA ACIMA — FECHADA em 2026-08-28 (`c61b3a7`), depois de o dev
ter ditado esta lista.** O módulo foi particionado por origem (caminho (a)); ver a 0(aa) na
§Pendências. **A linha da tabela NÃO foi editada**, pelo mesmo motivo registrado logo abaixo para a
0(ab): a lista é do dev, e corrigi-la por conta própria é a ocorrência nº 3 do `CLAUDE.md` com o
sinal invertido. **O que fecha a pendência é o registro dela, não a linha desta tabela.**

⚠️ **RESSALVA MEDIDA SOBRE A 0(ab), registrada em vez de "corrigida" em silêncio.** O dev nomeou a
**0(ab)** na lista; **este arquivo a registra como ✅ FECHADA em 2026-08-27, no commit `9e18704`**
(`npm run preview` voltou a sair 0, 11/11) — ver a 0(ab) na §Pendências. **Não reabri a pendência e
não corrigi a lista do dev:** as duas coisas seriam a ocorrência nº 3 do `CLAUDE.md` com o sinal
invertido. O que segue aberto naquele sítio é a **lacuna assumida do 3.5.4** que o próprio
fechamento declarou: *"aquele preview não mostra o caminho de campeonato online — mostrá-lo exige
`classificacao` e `calendario` no mock; é cobertura NOVA, não conserto."* ~~🛑 **Pergunta ao dev,
aberta: era essa a dívida que ele quis listar, ou a 0(ab) deve reabrir?**~~
✅ **RESPONDIDA PELO DEV em 2026-08-28, e a resposta é a terceira opção:** *"0(ab) fica FECHADA como
está. O que segue aberto é a lacuna do 3.5.4 — registre como pendência própria, não como reabertura
da 0(ab)."* **Virou a pendência 0(ad)**, na §Pendências. 🔑 **A distinção não é formalidade:**
registrar como reabertura daria por não-resolvido um conserto que está medido e verde.

⚠️ **A lista acima é a DO DEV e eu não a completei — mas registro o que está MEDIDO no arquivo:**
seguem marcadas como abertas, e **não foram nomeadas por ele**, as pendências **0(a)** (`montarJogadores`
duplicado), **0(g)**, **0(h)**, **0(i)** (`seedMestre` de 32 bits, enumerável), **0(j)**, **0(l)**,
**0(m)**, **0(n)**, **0(o)** (assimetria de postura) e **0(v)** (a corrida de I/O do `npm test`).
**Isto não as promove nem as rebaixa** — é a diferença entre "o dev listou" e "o arquivo registra",
e ela fica visível de propósito. 🔑 **0(i) e 0(o) andam JUNTAS** e esperam o mesmo PR de alargamento
de entropia, como já está travado na 0(o).

📌 **PROPOSTA AO DEV (não executada — encolher/mover documentação é decisão dele, `CLAUDE.md`
§"o `doc-writer` NÃO APAGA"):** com a fase encerrada, o §"FASE 3 — ONLINE" do `PLANOS_ATIVOS.md`
deixou de ser plano ATIVO e caberia no `HISTORICO.md`. **Nada foi movido.**

**Decisão (a) — o alvo NÃO é mais PartyKit.** É **`partyserver` + `wrangler`**, rodando como Durable
Object comum num projeto Workers. O princípio do dia 1 fica intacto (**sala = DO isolado**); só o CLI
muda (`partykit dev` → `wrangler dev`). Motivo medido: `partykit@0.0.115` sem release há ~11 meses;
`partyserver@0.5.10` publicado dias atrás, no mesmo monorepo `cloudflare/partykit`.
🔑 **Par de versões testado no spike: `partyserver@0.5.10` + `wrangler@4.120.0` + Node v24.16.0.**
Os dois são pré-1.0/móveis — se algo quebrar no 3.2, **suspeitar da versão antes do código.**

**Decisão (b) — D-E: SEED POR ETAPA (opção B), o DO guarda a `seedMestre`.** Com a seed base completa
na mão, qualquer jogador computa as corridas futuras no console — não é hack, é chamar uma função, e
num jogo casual alguém faz e conta no grupo. **Custos aceitos pelo dev:** fork do `iniciarCampeonato`;
`campeonatoConcluido` precisa ser revisto (`fluxo-campeonato.ts:337` mede contra `etapas.length` e,
com estado incremental, devolveria `true` depois da etapa 1); e **o save do 8.2 sai de cena no
online.**
⚠️ **A decisão (b) foi SUPERADA no mecanismo pelo `B-indep`** (3.5), que preserva o propósito dela.
Ler as duas juntas — ver `PLANOS_ATIVOS.md` §"3.5 CAMPEONATO ONLINE".

🔒 **Invioláveis herdadas dos PRs 3.1a/3.1b/3.2 — valem para todo PR de netcode daqui pra frente:**

  - 🔒 **Nenhum comando carrega `jogadorId`.** `reduzirSala(estado, comando, remetenteId)`; o id vem
    do **transporte**, a partir da conexão. Sem isso, o token de turno do 3.1b nasceria sobre um
    remetente forjável.
  - 🔒 **`seedMestre` não sai do DO.** `EstadoSala` (interno) ≠ `EstadoSalaPublico` (fio); o broadcast
    leva `seedDraft = deriveSeed(seedMestre, 'online:draft')`. Esquecer de filtrar não compila.
  - 🔒 **O CONTRATO DO AUSENTE, obrigatório pro 3.3** (está no docblock de `marcarAusente`): o
    cliente completa os sorteios do ausente **no mesmo evento** em que vê a ausência no log; e na
    fase peça **joga por ele**, com escolha **determinística e idêntica nos 22** (`escolherBot`,
    semeado — nunca decisão de UI). O pool de peças é compartilhado: dois clientes escolhendo peças
    diferentes pelo mesmo ausente **furam o pool em silêncio**.
  - **Broadcast é SNAPSHOT, não delta.** Perda se corrige sozinha; fora de ordem cai pelo `seq`;
    quem entra no meio não precisa de caminho separado.
  - 🔒 **Uma escolha ILEGAL no log não mata mais a sala** (bloqueante C2 da revisão): o cliente cai
    no substituto determinístico em vez de lançar, e o servidor valida a FORMA da escolha. O
    servidor **não pode** validar conteúdo — não tem dataset.
  - **`nodejs_compat` fora, medido.** Se voltar, tem que vir com o import que a exigiu.

### 🔒 RETIDAS NO ARQUIVAMENTO DO §FASE 3 (2026-08-28) — nove blocos que o cabeçalho levaria junto

> **A regra do aninhamento aplicada, e ela pagou.** O dev nomeou cinco categorias a reter (as
> invioláveis do 3.1a/3.1b/3.2, os portões do 3.0/3.1b, a herança de config do spike, os riscos
> aprovados e o "harness headless não é opcional") — **as cinco já estavam neste arquivo**. Lendo o
> CONTEÚDO do plano, e não o cabeçalho, apareceram **mais nove** 🔒 que **não tinham contrapartida
> aqui** e obrigam trabalho FUTURO. Estão abaixo, no texto original, antes de o plano ir para o
> `HISTORICO.md`. **Cabeçalho não prova pertencimento.**

- 🔒 **`seedCalendario` TAMBÉM É SORTEADA, NUNCA DERIVADA** (emenda da sessão principal, aceita pelo
  dev). Sob 0(i) a `seedMestre` é recomponível desde o lobby, então um calendário derivado dela seria
  **computável DURANTE o draft** — dá pra escolher peça sabendo as 5 pistas.
- 🔒 **`seedsAbertas` tem o MESMO portão da `seedCorrida`** (draft concluído). A leitura aplicada é
  que **seed sem calendário não protege nada** — são 10 pistas, o jogador computa as 10 e escolhe.
- 🔒 **O rótulo de simulação NÃO muda:** o cliente compõe `seedDaEtapa(seedPublicadaDaEtapa, pistaId)`
  — **a mesma função e o mesmo rótulo `camp:${pistaId}` do offline**, travado por docblock contra o
  baseline do `balance-harness`. **Inventar um esquema paralelo é a classe de bug do 8.4.**
- 🔒 **O cursor avança pela BARREIRA, nunca pelo anfitrião.** Com a sala iniciada, `anfitriaoId` não
  é reatribuído se o host cair (`sala.ts:216-217` só age em `fase === 'aberta'`), então avanço por
  host teria modo de falha **"sala encalhada para sempre"**.
- 🔒 **INVARIANTE OBRIGATÓRIA (herdada do 3.5.3): indexar a etapa corrente por `etapas.length - 1`,
  NUNCA por `sala.etapaAtual`.** Sob a pendência **0(t)** os dois **não** dizem o mesmo (sala
  corrompida publica `etapaAtual: 4` com `seedsAbertas: []`), e indexar pelo cursor traz a 0(t) de
  volta **como tela quebrada**.
- 🔒 **`N_ETAPAS_CURTA` é duplicado em `src/net/tipos.ts`, com teste de conformidade** contra
  `N_ETAPAS.curta`. **É duplicação deliberada:** importar de `campeonato.ts` arrastaria
  `simularQuali`/`simularCorrida`/`dataset.ts` para `src/net/` — e com eles o **JSON de 1 MB**.
  Quem "limpar" essa duplicata reabre a porta que ela existe para fechar.
- 🔒 **C3 SEGUE FECHADO desde o 3.3.3** (`POST /parties/sala/000000/criar` → **404**, medido). A rota
  **não** foi movida para dentro de `/parties/` apesar de isso simplificar o proxy, porque esse
  acesso aberto é o risco que o C3 bloqueia. **Registrado para que nenhum PR futuro "simplifique" a
  rota de volta.**
- 🔒 **Negação se escreve com `includes`, não com lookahead.** Saiu do bloqueante do 3.5.1 (`m`, o
  lookahead cobre só a 1ª linha — repetição literal do "regex furado na cerca" do 3.2).
- 🔒 **VERMELHO DE COMPILAÇÃO NÃO CONTA COMO BASELINE VERMELHO.** Teste vermelho porque o campo
  ainda não existe não prova nada sobre comportamento. **Quem carrega o baseline são as MUTAÇÕES**,
  aplicadas sobre o código de produção PRONTO e **vistas** vermelhas. ✅ **A regra já se pagou uma
  vez:** foi por ela que o `MR` do PR B do spike foi desqualificado (`TS2740`, ver a §"RETIDAS NO ARQUIVAMENTO").

🔒 **E uma décima, que é consequência e não regra:** **a independência das seeds em produção é
sustentada por LEITURA DE CÓDIGO, não por teste** — a cerca de M5/M6 é **textual** e não pega quem a
contorna. **Qualquer PR que mexa em `party/sala.ts` precisa ser lido com isso em mente.** Ler junto
com a pendência **9**, que é onde essa lacuna vive.

### ✅ CORRIDA ONLINE — ENCERRADA. Plano movido para o `HISTORICO.md` em 2026-08-18

Os quatro PRs (`b67ec2b`, `8a8088a`, `50906af`, `44d0dc8`+`8489b6f`) estão feitos e o **portão visual
do 4/4 foi aprovado pelo dev em 2026-08-18**. O plano aprovado e o detalhe de cada PR vivem agora em
**`HISTORICO.md` §"CORRIDA ONLINE — o plano aprovado"** (movido íntegro, não resumido) e nas quatro
entradas "CORRIDA ONLINE — PR 1/4…4/4". **Nada pendente.**

🔒 **O QUE NÃO SAIU DAQUI.** Nasceram nesta seção e são **decisão travada / regra inviolável** — a
regra do projeto proíbe que saiam do `ESTADO.md`, então ficam retidas abaixo (e estão íntegras
também no `HISTORICO.md`, pelo registro). **Não reabrir sem o dev:**

- **🔑 VEREDITO DA SEED:** publicar `seedCorrida` **só quando o draft concluir**, nunca desde a
  criação da sala. Decisão do dev **CONTRA a recomendação do arquiteto**, pelo mesmo precedente da
  **decisão (b)** desta fase: publicar durante o draft é o mesmo buraco com outro nome — dá pra
  simular loadouts candidatos e escolher com vantagem. **A paridade com o offline foi recusada
  explicitamente** (lá não há adversário humano). Preço aceito: `| null` no tipo e um ramo no cliente.
  **Consequência aceita: a pista também só aparece no fim do draft** — é a decisão, não descuido.
- 🔒 **UMA FUNÇÃO SÓ alimenta o hash e o `FluxoCorrida`, e não se abre exceção nisso** (palavras do
  dev, PR 2/4). É a classe de bug do **8.4**: duas trilhas, cada lado certo isoladamente, composição
  errada, **`npm test` não pega**. `corridaDaSala` (`src/ui/corrida-online.ts`), mesma referência pro
  hash e pro replay, travada por `src/ui/contrato-corrida-online.test.ts` (allowlist de quem chama +
  contagem exata por arquivo). **O 3.5.3 depende desta regra e não a afrouxa.**
- 🔒 **A barreira NÃO ganha status na tela — decisão do dev** (PR 4/4). "Aguardando jogadores
  terminarem…" foi RECUSADO por afirmar um bloqueio que não existe (a barreira do 3/4 é a versão
  fraca e não segura ninguém). O `AvisoDeFechamento` cobre o único prazo real.
- 🔒 **A `key` remonta a tela no instante em que a barreira fecha a etapa — decisão do dev (3.5.4, C2 bloqueante).** A barreira fecha assim que o último elegível atesta, sem atraso, então tabela/calendário/pódio
  podem durar milissegundos e quem assiste pode ser arrancado da corrida. Palavras do dev: *"o remount
  imediato é o custo da invariante 'mesma referência alimenta hash e tela'. No online o servidor
  controla o avanço; qualquer buffer cria janela de divergência."*
  🔒 **NÃO HOUVE CONSERTO, e é isso que a decisão diz.** O comportamento fica como está. Qualquer
  buffer (tela ficando atrás do cursor, contagem regressiva antes de remontar) afrouxaria a
  invariante de "a MESMA referência alimenta hash e tela" para "a mesma função alimenta os dois" —
  por isso é decisão do dev e não conserto de passagem. **Não reabrir sem ele.**
  ⚠️ **O bump de `VERSAO_APP` para 3.4.3 NÃO tem relação com esta decisão** — a redação anterior
  desta linha dizia que ele era "o conserto" do C2, e é falso: o bump consertou o **C1**, que é
  outro bloqueante (dois BUILDS diferentes na mesma sala). Corrigido no lugar, porque um registro
  que atribui um conserto ao bloqueante errado faz a próxima pessoa acreditar que o C2 foi tratado.

### Portões, riscos e heranças da FASE 3 (valem para a fase INTEIRA, não só para a corrida online)

> Este bloco estava aninhado sob a §CORRIDA ONLINE por acidente de formatação; ganhou cabeçalho
> próprio em 2026-08-18 para não sair junto com o plano encerrado. Conteúdo inalterado.

🛑 **PORTÕES OBRIGATÓRIOS (do dev):**
1. **Parar ao final do 3.0** com o go/no-go. ✅ cumprido.
2. **Parar ao final do 3.1b** com o resultado dos DOIS testes que valem a fase:
   (1) **conformidade** — `deQuemEhAVez` bate com `alvoHumano`/`ordemPeca` da engine em **≥20 seeds**;
   (2) **commutatividade** — mesmos sorteios ⇒ `DraftState` idêntico.
   **Se a conformidade não fechar, PARAR — não contornar.**

⚙️ **Herança de config do spike que o 3.2 precisa DECIDIR, não copiar:** o `wrangler.jsonc` do spike
usa `compatibility_date: "2026-08-01"` e `compatibility_flags: ["nodejs_compat"]`. **A flag foi posta
defensivamente e não sustenta nada** — `rng.ts` tem zero imports e o cliente de teste roda fora do
worker. Entrar no 3.2 sem exame seria diferença de ambiente que ninguém escolheu.

**Riscos aprovados como propostos:**
- **Float/determinismo:** defesa por **handshake de versão, não por detector** — a engine só usa
  `Math.imul`/`max`/`round`/`min`/`floor`/`abs`, **zero transcendental**. ✅ O spike já mediu a
  paridade bit a bit workerd↔Node (4 seeds, bits IEEE-754 comparados), o que sustenta a escolha.
- **Colisão de namespace do `deriveSeed`:** todo rótulo novo com prefixo **`"online:"`**, registro em
  `src/engine/namespaces-seed.ts` **com teste que falha em duplicata**.
- **Hash de corrida sobre `ResultadoCorrida`.** (Plano original; implementação pousou em hash de
  DRAFT: é lá que o risco do ausente vive. `ResultadoCorrida` hashing fica pra quando a corrida online existir.)

📌 **O harness headless NÃO é opcional** (palavras do dev): simular 22 clientes com injeção de
latência, reordenação, duplicação e desconexão. O dev precisa testar **sem depender de amigos
disponíveis**. **Abas no navegador só pro portão visual.** O spike já deixou o embrião disso em
`E:\projetos\spike-partyserver\scripts\dois-clientes.mjs` (WebSocket global do Node ≥ 22, sem
dependência).


## Onde parei

**🔐 PR H2 — TETO DE CONEXÕES POR SALA E ORIGIN NO `onConnect`: CONCLUÍDO e MERGEADO em
2026-09-01** (`91322d0`, merge `--no-ff` de `9cc7d83` + `d23c6c4`), na `main`. **ALTO RISCO** —
mexe em `party/sala.ts` e afeta produção. **Sem push, sem tag.** Detalhe completo: `HISTORICO.md`
§"PR H2 — teto de conexões e Origin no `onConnect`".

**O que o PR faz, em uma linha:** os itens **S2** e **S4** da auditoria passam de 🔴 ABERTO a
✅ **FECHADO POR IMPLEMENTAÇÃO** — o `onConnect` ganha teto de 64 conexões por sala e validação de
`Origin` no upgrade, as duas reusando o que o H1 já construiu.

📊 **PORTÕES, medidos na `main` PÓS-MERGE (não herdados da branch):** `npm test` **1677/73** em
**3 rodadas idênticas** (INALTERADO — os casos novos moram em `party/`, fora do `include`).
**`npm run test:party` 33/33** (era 26/26, **+7**). typecheck **0**, lint **0**, build **0**,
bundle **`index-B0pMOBwk.js`, o MESMO hash** do PR 6, do PR 7 e do H1.

---

🔒 **A DECISÃO É PURA E MORA EM `src/net/teto-conexoes.ts`; a casca só conta sockets.** Mesmo
desenho do H1: `excedeuTetoDeConexoes(conexoesAbertas)` recebe o número por parâmetro, e a casca
lhe entrega `getConnections()`.

🔒 **O TETO CONTA O TRANSPORTE, NÃO O ROSTER — é isso que ataca a 0(y).** `QTD_JOGADORES` governa
`estado.jogadores`, que só cresce pelo comando `entrar`; **socket que abre e fica calado nunca
toca esse array.** `getConnections()` é a única contagem que ele alcança. Caso dedicado com **84
sockets que nunca mandam `entrar`**.

🔒 **O PISO É MEDIDO; o 64 é POLÍTICA — e a distinção é obrigatória.** Um F5 faz o mesmo jogador
ocupar DOIS sockets transitoriamente, logo o teto tem de passar de `2 × 22 = 44`, senão uma sala
cheia se tranca sozinha numa onda de recarga. ⚠️ **Nenhuma justificativa de plataforma sustenta o
64:** a 0(y) registra *"Não medido: qual o teto real do Durable Object nem qual o custo de um
socket ocioso"*, e **isso continua verdadeiro depois deste PR**.

🔒 **`>` e não `>=`, MEDIDO:** no `partyserver@0.5.10` o `accept` roda ANTES do `await
this.onConnect(...)`, então a conexão corrente já está contada quando a guarda executa (sonda: 1º,
2º e 3º socket leem `1`, `2`, `3`). Com `>=`, o teto efetivo seria 63.

🔒 **A RECUSA É `close(4403)` — status code é IMPOSSÍVEL, e isso é da plataforma.** O `partyserver`
devolve **101 sempre** (medido: 3 upgrades ⇒ `101 101 101`, inclusive o recusado). Um `onBeforeConnect`
daria 403 real, mas roda no worker, FORA do DO, onde `getConnections()` não existe — o teto seria
inimplementável ali.

---

🔴 **O "BLOQUEANTE C1" DITADO PELO DEV: uma parte CONFERE, uma é IMPOSSÍVEL e uma foi REFUTADA.
As três ficam registradas em vez de eu escolher entre elas.**

- ✅ **CONFERE:** `close()` no `onConnect` **dispara `onClose`** — medido, sequência
  `["onConnect-recusa", "onClose"]`. Sem tratamento, o socket recusado atravessaria `aoDesconectar`
  + `registrarConexoes` + `aplicar` para um id que nunca passou por `aoConectar`. **O `4403` entrou
  como ditado.**
- 🔴 **IMPOSSÍVEL COMO DESCRITO:** *"rejeitar ANTES do `super.onConnect()`"* não existe aqui —
  `Sala.onConnect` **não chama `super.onConnect()`** (a base do `partyserver` é vazia) e não há
  variável `server`. **O `accept` acontece no `fetch` do `Server`, antes de o `onConnect` ser
  chamado.** O que entrou é a forma que o runtime permite: marcar o id num `Set` e **sair cedo no
  `onClose`**.
- 🔴 **REFUTADO POR MEDIÇÃO, e a afirmação errada foi MINHA:** escrevi no docblock que a falta da
  saída cedo custava *"uma escrita de storage POR SOCKET RECUSADO"*. **Falso** — `put('estado')`
  após 10 recusas dá **`1 → 1`** com conexão legítima e **`0 → 0`** em sala vazia, **idêntico com e
  sem a guarda**. O motivo é a propriedade que o `alarm()` já documentava: `registrarConexoes`
  preserva a IDENTIDADE quando `vazio === jaVazio`, e `aplicar` só grava quando a referência muda.
  🔒 **A guarda FICA como BARREIRA, não como conserto** — e **não** se lê como "fechou um bug
  medido".

🔴 **O TESTE QUE ESCREVI PARA O C1 ERA VACUOSO, e foi a MUTAÇÃO que pegou.** Um oitavo caso ficou
verde enquanto **M4 sobrevivia a ele**. **Teste vacuoso é pior que teste nenhum** — classe que este
projeto catalogou seis vezes —, então **foi REMOVIDO** e M4 entra na tabela como **SOBREVIVENTE**.

⚠️ **PROVENIÊNCIA: NÃO HOUVE `senior-reviewer` NESTE PR.** O "C1" não é numeração de revisão — foi
**apontado pelo DEV e medido por mim**. Chamá-lo de bloqueante de revisão gravaria um veredito que
não existiu, que é a ocorrência nº 3 do `CLAUDE.md`. **`senior-reviewer` segue NÃO RODADO apesar do
ALTO RISCO — decisão do dev, e fica dito.**

---

📊 **A TABELA DE MUTAÇÕES — QUATRO, e uma SOBREVIVE.** Controle: `33 passed (33)`.
🔒 **Script RASTREADO em `scripts/mutar-h2.mjs` — o PRIMEIRO do projeto a cumprir a regra** de
2026-08-30 (*"ou o script fica rastreado ou o número não vale"*), que o próprio `ESTADO.md`
registrava como violada em silêncio desde o H1.

    M1  teto deixa de ser consultado (limitador off)   exit=1  2 failed | 31 passed (33)
    M2  o teto vira >= em vez de > (off-by-one)        exit=1  2 failed | 31 passed (33)
    M3  Origin deixa de ser consultado (guarda off)    exit=1  2 failed | 31 passed (33)
    M4  a saída cedo do onClose some                   exit=0  33 passed (33)  <- SOBREVIVE

🔴 **M2 NÃO CAI ONDE EU ALEGAVA — corrigido no lugar, no próprio harness.** Eu dizia que ela cobria
*"a anti-vacuidade de S2"*; **medido, a anti-vacuidade SOBREVIVE a M2** (com `>=` e teto 64, a 63ª
conexão ainda vê `63 < 64`). Quem pega o off-by-one são os **dois baselines**.
🔑 **Foi por isso que o harness passou a listar os NOMES dos testes que caem** — com só o `exit=1`,
uma mutação que derruba o teste errado é indistinguível de uma que derruba o certo.

---

🔴 **O QUE ESTE PR NÃO FAZ, e é o mais importante do registro: O TETO BALIZA A 0(y), NÃO A FECHA.**
Nada fecha um socket que conecta e nunca fala — a carência de vazio só corre com `getConnections()`
em zero, e um socket quieto a mantém não-vazia para sempre. **Depois do teto, bastam 64 sockets
quietos para trancar os 22 jogadores reais fora da sala E mantê-la imortal.** O ataque fica mais
barato em número (64 em vez de 32k) e mais limitado em dano, **mas não desaparece.** Virou a
pendência **0(ag)**.

⚠️ **A PREMISSA DO PEDIDO SOBRE O S1 FOI REFUTADA POR MEDIÇÃO.** O pedido dizia que *"se o fetch
handler já rejeitou por rate limit, o onConnect não deveria ser alcançável para aquele request"*.
**Medido: com o IP já em `429` no `POST /criar-sala`, 30 upgrades de WebSocket seguidos deram `101`
— todos.** Os caminhos são disjuntos. **Há um sentido trivial em que a frase é verdadeira** (para
aquele mesmo POST, o 429 vem antes de tudo), e ele não protege o `onConnect`. **A consequência
construtiva: o teto de conexões carrega o peso inteiro.**

⚠️ **O CLIENTE NÃO DISTINGUE 4403** — vê um fechamento e entra em "reconectando…". Nenhum
`{tipo:'erro'}` é mandado de propósito: o único código existente que serviria é `sala-inexistente`,
e `src/ui/useSalaOnline.ts:222` **APAGA o token de reentrada** ao recebê-lo, punindo um jogador
legítimo que só bateu no teto. **Mesma classe do "429 vira servidor fora do ar" do H1.** Virou a
pendência **0(ah)**.

⚠️ **A CHECAGEM DE ORIGEM RECUSA CLIENTE NÃO-NAVEGADOR quando há allowlist configurada**, porque
`Origin` ausente não está em lista nenhuma — o sítio real é **`scripts/smoke-online.mjs:32`**
(`WebSocket` global do Node). Hoje sobrevive porque `npm run sala` passa `ENVIRONMENT:development`
com allowlist vazia ⇒ curinga. **E, no caminho WS, `Origin` barra uma PÁGINA de outra origem no
navegador de quem a visita; NÃO barra script**, que forja o cabeçalho à vontade.

---

🔴 **A §"Onde parei" ACUMULA, e é a REGRA que manda.** A pré-condição da §Convenções manda **medir
por CONTEÚDO** que o bloco a substituir já está no `HISTORICO.md` — *"casar rótulo mede que os dois
textos falam da mesma coisa; não mede que um contém o outro"*. **Eu não rodei
`scripts/medir-contencao-doc.py` para o bloco do H1**, então a pré-condição está **não verificada**,
e não verificada trata-se como não cumprida. O bloco do H1 e o do PR 7 **não foram tocados**; o
saldo de `git diff --stat ESTADO.md` é **positivo**, conferido antes do commit.

---

**🔐 PR H1 — TETO POR IP NO `POST /criar-sala` E CORS COM ALLOWLIST: CONCLUÍDO e MERGEADO em
2026-09-01** (`2f780bb`, merge `--no-ff` de `3ee0c5c` + `cea3642`), na `main`. **ALTO RISCO** —
mexe em `party/sala.ts` e afeta produção. **Sem push, sem tag.** Detalhe completo: `HISTORICO.md`
§"PR H1 — o teto por IP e o CORS".

**O que o PR faz, em uma linha:** os itens **S1** e **S9** da auditoria de segurança passam de
🔴 ABERTO a ✅ **FECHADO POR IMPLEMENTAÇÃO** — o `POST /criar-sala` ganha teto de 5 por IP em janela
de 10 s, e o `Access-Control-Allow-Origin: '*'` vira allowlist configurável.

📊 **PORTÕES, medidos na `main` PÓS-MERGE (não herdados da branch):** `npm test` **1677/73** em
**3 rodadas** idênticas (era 1662/71 — **+15**: 9 de `cors.test.ts` e 6 de `rate-limit.test.ts`,
arquivos novos). **`npm run test:party` 26/26** (era 19/19, **+7**). typecheck **0** nos três
projetos, lint **0**, build **0**.
🔑 **`VERSAO_APP` fica 3.4.5 e `VERSAO_FORMATO` fica 3 — SEM BUMP, e a prova é MECÂNICA:**
`src/engine/versao.test.ts` está verde e o bundle segue **`index-B0pMOBwk.js`, o MESMO hash** do
PR 6 e do PR 7. Os módulos novos de `src/net/` não estão no escopo do digest e nada deles chega ao
bundle — só `party/` os importa.
⚠️ **`npm run balance` NÃO rodado, e dito por quê:** zero arquivo de `src/engine/`, `src/data/`
intocado. **`npm run preview` também não:** o PR não muda nada na tela, e o hash inalterado confirma.

---

🔒 **A DECISÃO É PURA E MORA EM `src/net/`; a casca só lê relógio e IP.** Não é estilo: `Date.now` é
**proibido** em `src/net/**` e permitido só em `party/**` (`eslint.config.js`). `avaliarTeto(balde,
agora)` e `origemPermitida(origem, allowlist, ehDesenvolvimento)` recebem tudo por parâmetro.
🔑 **É isso que torna a JANELA testável em `npm test`** — sem relógio falso, sem `workerd`. E a
janela é o que separa um LIMITE de um BANIMENTO; o baseline de `party/` sozinho não a alcançava.

🔒 **UM DO POR IP, via `idFromName(ip)` — o IP É O SHARD.** Sem tabela de baldes, sem contenção, e
IP ocioso se despeja sozinho. Um DO único com um `Map` de todos os IPs serializaria toda criação de
sala do jogo num objeto só.
🔒 **O balde vive SÓ EM MEMÓRIA, e o número está ACOPLADO à janela:** 10 s fica abaixo do horizonte
de despejo do DO, então o despejo descarta um balde que já teria expirado. Zero escrita por
requisição. ⚠️ **Alongar a janela sem passar a persistir reabre a rajada pós-despejo — as duas
coisas se movem juntas.**

---

🔒 **ADIÇÃO 1 DO DEV (2026-09-01) — O CURINGA EXIGE DOIS SINAIS. Implementada como ditada.**
`ALLOWED_ORIGINS` ausente **não basta** para cair em `*`: é preciso também `ENVIRONMENT=development`.
Sem o segundo sinal, ausência de allowlist **REJEITA**.
**Palavras do dev:** *"Esquecer de configurar o wrangler em produção não pode anular o PR inteiro."*
🔑 **E o `wrangler.jsonc` commitado traz `ENVIRONMENT=production` de propósito:** é o MESMO arquivo
que o `wrangler deploy` consome, então pôr o sinal de dev nele o levaria a produção e anularia o PR
em silêncio — a própria falha que a adição 1 fecha. O sinal de dev entra por `--var` no
`npm run sala`. **A cerca é `src/net/cors.test.ts`, com anti-vacuidade, e a mutação M5 a confirma.**

---

🔴 **A FRONTEIRA DO PR — O TETO NÃO É GLOBAL. Ditada pelo dev; a MEDIÇÃO diverge no MECANISMO, e as
duas ficam registradas em vez de eu escolher entre elas.**

- **O que o dev ditou, textual:** *"o rate limit é POR SALA (por DO instance). Atacante criando
  salas diferentes contorna o limite porque cada DO tem seu próprio Map. Rate limit global depende
  de outra camada (WAF ou rate limit no worker de roteamento). Isso não é conserto deste PR — é a
  fronteira dele, e ela precisa estar escrita."*
- ✅ **A SUBSTÂNCIA ESTÁ CERTA E É O QUE IMPORTA: o teto NÃO é global, e um limite global depende
  mesmo de outra camada — WAF ou rate limit no worker de roteamento.** Isso fica registrado como a
  fronteira do PR, que foi o pedido.
- 🔴 **O MECANISMO, porém, foi MEDIDO e é OUTRO: o balde é por IP, não por sala.** Teste dedicado em
  `party/rate-limit.test.ts` cria **5 salas com códigos distintos** do mesmo IP (pré-condição
  asserida) e a 6ª vem **429**. **Criar salas diferentes NÃO contorna o teto.** A mutação **M2**
  confirma pelo outro lado: forçar balde global quebra a asserção de isolamento por IP.
- 🔑 **A frase ditada descreveria um desenho em que o limitador vive dentro do `Sala` DO** — que foi
  considerado e **não** é o aprovado. **A fronteira REAL é MÚLTIPLOS IPs:** quem dispuser de uma
  botnet ou de uma faixa IPv6 contorna, e é aí que WAF ou worker de roteamento entram.
- 📌 **Registrado assim, e não "corrigido" em silêncio, pelo mesmo motivo do S8:** o dev foi avisado
  da divergência antes do merge e reafirmou a redação. **Escolher entre as duas por conta própria é
  o que a §"NENHUM SUBAGENTE COMMITA" trata como o caso mais grave.** Qual redação prevalece é
  decisão dele; **as duas estão aqui até que decida.**

---

🔴 **TRÊS ITENS DA ESPECIFICAÇÃO DA DOC NÃO FORAM ESCRITOS COMO DITADOS, e o motivo de cada um é
medido. Nenhum foi silenciado.**

1. 🔴 **"O bloqueante C1 e como foi resolvido (`isDev` com inferência por `ALLOWED_ORIGINS`)" — NÃO
   ENTROU, porque NADA DISSO ACONTECEU.** **(a)** **Não houve `senior-reviewer` neste PR:** eu
   perguntei *"Rodo a revisão agora?"* e o PR foi aprovado sem resposta — **não existe bloqueante
   C1** para registrar, e inventar um veredito de revisão é exatamente o `e1db1c9`. **(b)** **O
   mecanismo implementado NÃO é inferência por `ALLOWED_ORIGINS`:** é o sinal explícito
   `env.ENVIRONMENT === AMBIENTE_DEV` (`party/sala.ts:441`, `src/net/cors.ts:25`).
   🔑 **E isto não é detalhe de redação: inferir o modo de dev da ausência de `ALLOWED_ORIGINS` é
   PRECISAMENTE o que a adição 1 proibiu.** Registrar essa inferência como "o conserto" gravaria no
   histórico o oposto da decisão que o PR implementa. ⚠️ **`senior-reviewer` segue NÃO RODADO neste
   PR, apesar do ALTO RISCO — é decisão do dev, e fica dito.**
2. ⚠️ **A tabela de mutações tem SETE linhas, não seis.** Estão todas abaixo; nenhuma foi cortada
   para fechar o número ditado. Mesma disciplina do S13/S14.
3. ⚠️ **"S1 e S9 passam de (c) para (a)" — a tabela da auditoria NÃO tem notação `(a)`/`(c)`.** Ela
   usa `🔴 ABERTO` / `🟡 PARCIAL` / `✅ FECHADO`. Os dois foram para **✅ FECHADO**, que é a leitura
   evidente do pedido; **a notação ditada não existe no arquivo** e não foi inventada.

---

📊 **A TABELA DE MUTAÇÕES — SETE, cada uma com SAÍDA REAL, e cada uma caindo na asserção que alega
cobrir.** Controle sem mutação: `15 passed (15)` e `26 passed (26)`.

    M1  teto deixa de ser consultado (limitador off)   exit=1  2 failed | 5 passed (7)
    M2  balde GLOBAL em vez de por IP                  exit=1  1 failed | 6 passed (7)
    M3  a janela NUNCA expira (vira banimento)         exit=1  2 failed | 13 passed (15)
    M4  a recusa REINICIA a janela                     exit=1  1 failed | 14 passed (15)
    M5  curinga sem o SEGUNDO sinal (furo da adição 1) exit=1  1 failed | 14 passed (15)
    M6  allowlist por PREFIXO em vez de igualdade      exit=1  1 failed | 14 passed (15)
    M7  sinal de dev VENCE a allowlist configurada     exit=1  1 failed | 14 passed (15)

🔑 **M2 é a que mede a fronteira** (balde por IP × global) e **M5 é a que mede a adição 1**.
🔒 **Reversão CONFERIDA, não presumida:** varredura por resíduo de mutação nos três arquivos, com
`balde.inicio` intacto no ramo da recusa, e as suítes de volta a 1677/73 e 26/26.
⚠️ **A primeira rodada perdeu o placar** por erro de decodificação `cp1252` do Windows ao capturar a
saída; só o `exit=1` sobreviveu. **Foi refeita com captura UTF-8** — os números acima são da segunda
rodada. Registrado porque *"medição cujo script não fica em disco não é reprodutível"*, e esta
**não está rastreada**: o `mutar.py` vive no scratchpad da sessão. **Rastreá-lo é decisão do dev.**

---

🔴 **LIMITAÇÃO CONHECIDA QUE O PR CRIOU, e ela chega ao JOGADOR: o 429 aparece como "servidor fora
do ar".** `criarSalaNoServidor` (`src/ui/sala-online.ts:83`) faz `if (!resposta.ok) return null` —
colapsa toda falha num `null` só. **Antes do H1 nenhum jogador atingia um não-200 em uso normal;
agora atinge** (5 salas em 10 s é alcançável clicando). É a mesma classe do bug do 3.3.3, que o
docblock de `src/net/rotas.ts` registra: a UI acusa o servidor de estar fora do ar enquanto ele
responde corretamente.
📌 **Perguntei ao dev se vira pendência própria ou entra no PR; NÃO foi respondido, e o PR foi
aprovado como está.** O conserto é UI (distinguir 429 de falha de rede), não lógica. **Fica aqui
sem número de pendência** — atribuir um seria decidir por ele.

---

**🔐 AUDITORIA DE SEGURANÇA — OS 17 ITENS PASSAM A EXISTIR NESTE ARQUIVO: commit de DOC em
2026-09-01**, na `main`. **BAIXO RISCO** — zero arquivo de produção no diff. **Sem push, sem tag.**
Tabela e proveniência na §"🔐 AUDITORIA DE SEGURANÇA — OS 17 ITENS", logo antes da §Pendências.

**O que o commit faz, em uma linha:** a medição dos 17 itens (S1–S17), feita em sessão **ANTERIOR** e
ditada pelo dev nesta, deixa de existir só na conversa. **Nenhum item foi consertado aqui.**

🔴 **A §"Onde parei" ACUMULA de novo, e é a REGRA que manda, não uma escolha:** a pré-condição da
§Convenções (*"conferir que o bloco a substituir já está no `HISTORICO.md`"*) segue **NÃO cumprida**
para o bloco do PR 7 — contenção **33,0%**, medida em 2026-09-01 — e o dev decidiu naquela data que
ele **fica onde está**. Os dois blocos abaixo (`.gitattributes` e PR 7) **não foram tocados**, e o
saldo de `git diff --stat ESTADO.md` é **positivo**, conferido antes do commit.

🔴 **DUAS LACUNAS ACHADAS AO REGISTRAR, e as duas são do CONTEÚDO ditado, não da redação.** Estão
detalhadas na seção nova: **(1) S13 e S14 não aparecem em nenhuma das três listas** — o ditado cobre
**15** dos 17; **(2) a descrição do S8 ("32 bytes, base64url") não corresponde a sítio nenhum medido
neste repositório.** Nada foi inventado para fechar as duas: ficam registradas como lacunas.

📌 **Doc escrita pela SESSÃO PRINCIPAL, não pelo `doc-writer`.** A auditoria não foi dispensada: o
dev viu o diff antes do commit.

⬅️ **O QUE VEM A SEGUIR, autorizado pelo dev nesta sessão: PR H1 — S1 + S9**, rate limiting por IP no
`POST /criar-sala` + CORS restrito. **ALTO RISCO** (mexe em `party/sala.ts` e afeta produção), fluxo
completo. **O plano e o baseline vão ao dev ANTES da implementação** — é o que ele pediu.

---


**🔧 `.gitattributes` — O FINAL DE LINHA DEIXA DE DEPENDER DO CHECKOUT: CONCLUÍDO e COMMITADO em
2026-09-01** (`ea2c8f4`), na `main`. **BAIXO RISCO**, e a classificação é MEDIDA, não presumida: o
PR não renormaliza arquivo nenhum. **Sem push, sem tag.** Detalhe completo: `HISTORICO.md`
§"`.gitattributes` — o final de linha".
📌 **Doc escrita pela SESSÃO PRINCIPAL, não pelo `doc-writer`** — oitavo PR seguido assim, a pedido
do dev. A auditoria não foi dispensada: o dev viu o diff da doc antes do commit.

**O que o PR faz, em uma linha:** o repo passa a pinar `* text=auto eol=lf`, e uma cerca nova trava
que toda entrada do digest está pinada — fechando a CLASSE que o C1 do PR 6 tratou como sintoma.

---

📏 **O PROBLEMA, MEDIDO E MAIOR DO QUE ESTAVA REGISTRADO.** O C1 do PR 6 descrevia "um arquivo
escrito por script ao lado de dois vindos de checkout". **Medido agora:**
- **São CINCO arquivos rastreados escritos por script**, não dois: `src/data/equipe-anos.json`,
  `src/fixtures/dataset-semente/equipe-anos.json`, os **dois** de `scripts/derived/` e
  `docs/img/silhuetas.svg`. ⚠️ **Os dois de `scripts/derived/` estão em CRLF hoje só porque ninguém
  rodou `dataset:notas`/`fatos` desde o último checkout** — rodar vira LF em silêncio.
- 🔴 **E a exposição real não é "arquivos de dado": o escopo do digest são 18 arquivos, e hoje eles
  estão 12 CRLF + 6 LF.** Em `src/engine/` convivem `draft.ts` (LF) e `bots.ts` (CRLF); em
  `src/net/`, `hash-draft.ts` (LF) e `cliente.ts` (CRLF). **Qual lado cada um cai é decidido por
  histórico de EDIÇÃO nesta máquina, não por conteúdo.**
- 🔑 **É esse número que mata a alternativa `*.json` que as duas docblocks propunham: 3 de 18.**

---

✅ **ZERO DIFF, E ISSO FOI MEDIDO DE DUAS FORMAS INDEPENDENTES — não é previsão.**
O índice já era **100% LF (233/233 rastreados de texto; 4 binários; 3 vazios)**, porque com
`core.autocrlf=true` o filtro *clean* normaliza CRLF→LF na entrada. **Logo LF e CRLF do mesmo
conteúdo produzem o MESMO blob, e final de linha NUNCA aparece em `git diff` neste repo.**
- **(1) sonda não-rastreada no repo real:** criado o `.gitattributes`, `git status` acusou **uma
  linha — o próprio arquivo novo**. Removido em seguida.
- **(2) clone isolado com o arquivo commitado:** `git status` limpo, `git add --renormalize .`
  **encena ZERO**, e apagar+refazer checkout de `pecas.json` o traz com **266 CR → 0**.
🔴 **A CONTRAPARTIDA HONESTA, e ela vira pendência: isto NÃO uniformiza esta máquina.** Ver **0(af)**.

---

🔒 **OS DOIS `replace(/\r\n/g,'\n')` FICAM — decisão do dev, e não é conservadorismo.**
Com o escopo do digest ainda em 12 CRLF + 6 LF, **remover a normalização deixa `versao.test.ts`
vermelho na hora** e re-acopla os dois testes ao modo de checkout — a classe que este PR fecha.
Mudou só o *porquê* nos comentários.

---

🔒 **A CERCA ASSERE ATRIBUTO, NUNCA BYTES DO DISCO — e o argumento contra a alternativa é o que
decide, por isso está escrito junto dela** (a pedido do dev). Um teste "sem CR nos bytes" seria
**vermelho hoje** e o resultado dele dependeria do **modo de checkout** — verde num clone fresco,
vermelho aqui, com o mesmo conteúdo commitado. **É o próprio defeito, uma camada acima.**
📊 **Matriz de mutação, cada uma caindo na asserção que alega cobri-la:**

    M1  eol=lf removido (fica só text=auto)  →  cerca principal VERMELHA
    M2  .gitattributes apagado               →  anti-vacuidade 2 + principal VERMELHAS
    M3  linhas `binary` removidas            →  anti-vacuidade 2 VERMELHA (png volta a `auto`)

🔑 **M1 é o furo que quase passou:** `text=auto` sozinho normaliza o índice e **não** fixa o
checkout. Cerca que asserisse só `text` ficaria verde com a propriedade perdida.

---

🔴 **UM ERRO MEU, ACHADO ANTES DO COMMIT — `git check-attr` lê o WORKING TREE, não o commitado.**
A primeira redação da cerca afirmava que ele responde a partir do `.gitattributes` **COMMITADO**.
**Falso, e desmentido pelo estado do próprio repo:** com o arquivo ainda **não rastreado**,
`git check-attr text` respondia `auto` enquanto `git check-attr --cached text` respondia
`unspecified`. Sem `--cached`, ele lê o disco.
🔑 **A propriedade real é OUTRO eixo, e é ela que sustenta a cerca: ATRIBUTO × BYTES**, não
"commitado × working tree". O `.gitattributes` é o mesmo em toda máquina; o final de linha com que
cada arquivo foi materializado, não.
🔒 **E ler o working tree é a escolha CERTA — não usar `--cached`.** Quem governa os checkouts desta
cópia é o arquivo em disco; quem o apagar localmente quebra os próprios checkouts, e **é isso que a
cerca deve acusar**. `--cached` ficaria verde nesse cenário, olhando um arquivo que não governa mais
nada.
⚠️ **Teria sido afirmação falsa em presente do indicativo, em prosa NOVA, no PR cuja tese é corrigir
afirmações falsas** — a mesma classe que as revisões do PR 6 e do PR 7 pegaram duas vezes cada.

---

🔴 **A §"Onde parei" ACUMULA DE NOVO, e o motivo é MEDIDO.** O bloco do PR 7 **não foi arquivado**
pela higiene de 2026-08-31 (ela moveu os PRs *anteriores* a ele, escritos antes daquela sessão).
Contenção medida: **33,0%, 766 shingles órfãos**. **Os marcadores casam 1:1 nos dois arquivos** — o
falso-positivo exato que a §Convenções descreve. A afirmação do `ESTADO.md` de que "a convenção
voltou a ser segura de aplicar" foi **riscada no lugar**, logo abaixo.

🔒 **DECISÃO DO DEV (2026-09-01): NÃO ARQUIVAR AGORA — o bloco do PR 7 fica onde está.**
**Motivo registrado, e ele é de método:** a convenção só é segura **depois** do espelhamento, e
**espelhar o PR 7 é trabalho PRÓPRIO** — ler as 80 linhas, decidir o que é retenção e mover
verbatim. **Fazer isso de carona num PR de `.gitattributes` é exatamente o tipo de coisa que a regra
existe para impedir.** O espelhamento entra quando alguém o fizer como o trabalho dele, não como
efeito colateral de outro PR.

---

**🏁 NOMES FICTÍCIOS — PR 7, A FIXTURE E O PISO DO PORTÃO: CONCLUÍDO e COMMITADO em 2026-08-31**
(`cd9d5b7`), na `main`. **ALTO RISCO** — fixture de dados, baseline de portão e goldens da engine.
**Sem push, sem tag.** Detalhe completo: `HISTORICO.md` §"NOMES FICTÍCIOS — PR 7".
✅ **É O ÚLTIMO DOS 7. A TRILHA DE NOMES FICTÍCIOS ESTÁ ENTREGUE.**
📌 **Doc escrita pela SESSÃO PRINCIPAL, não pelo `doc-writer`** — sétimo PR seguido assim, a pedido
do dev. A auditoria não foi dispensada: o dev viu o diff da doc antes do commit.

**O que o PR faz, em uma linha:** `src/fixtures/dataset-semente/equipe-anos.json` passa a ter nomes
fictícios **preservando as notas byte a byte**, e o portão dos nomes reais chega ao **piso de 6**.

---

📉 **O PORTÃO: 249 → 6, EXATOS — E O PISO FOI REGISTRADO ANTES DO PR.**
Uma linha mudou (fixture `equipe-anos.json`, 243 → **0**); as outras cinco não. Medido por **réplica
independente do contador**, não só pelo teste verde. A quebra dos 6:

    massa=2 (src/data/pecas.json) · massa=2 (fixture pecas.json)
    Red Bull=1 (src/data/pistas.json) · Red Bull=1 (fixture pistas.json)

🔒 **A ORDEM É O QUE FAZ A MEDIDA VALER.** Os **4 de `massa`** (sobre-contagem sobre dado LIMPO) e
os **2 de `Red Bull Ring`** (resíduo REAL, mantido por DECISÃO — T2 adiada) foram escritos no
docblock do portão **antes do PR 7 existir**, a pedido do dev: *"o que sobrar precisa estar
explicado, não descoberto depois."* **Bateu exatamente.**
🔴 **6 NÃO é "o repositório está limpo".** Seguem fora do portão: `.ts`, o bundle, `scripts/derived/`
e — **descoberto neste PR** — **`.md`**.

---

🔴 **O `M-pessoa` PASSA EM TUDO — LIMITE HONESTO DECLARADO, NÃO COBERTURA.**
Trocar Sander Doornbosch (fictício de **Max** Verstappen) por Jorik Doornbosch (fictício de **Jos**),
**na fixture E nos literais dos testes ao mesmo tempo**, dá `npm test` **verde**. Nem a cerca, nem o
portão, nem um golden acusa — e não é descuido: o nome novo vem da tabela, não é nome real, e as
notas não mudam de lugar. **Cada portão responde certo à sua pergunta; nenhuma delas é "é a pessoa
certa?"**

⚠️ **NÃO É HIPÓTESE — O ERRO EXISTIU NESTA TRILHA.** Um ensaio a seco do PR 7 resolveu piloto pelo
`driverId` curto da fixture e mapeou **2 dos 44 para o PAI**: `verstappen` é o id real do **Jos**,
`hill` o do **Graham**. **Pego por MEDIÇÃO durante o PR, não por teste.**
🔑 **E nenhum teste o pegaria, porque a tabela PRESERVA O SOBRENOME** — "Jorik Doornbosch" no lugar
de "Sander Doornbosch", "Gerald Aldwych" no lugar de "Bertram Aldwych". Nada num diff denunciaria.
🔒 **O que protege é o DESENHO de `scripts/anonimizar-fixture.ts`:** resolução por **nome exibido**
contra `fatos-agregados.json`, **rota única, sem fallback por id**. **Quem trocar aquela rota por
uma cadeia de fallback reabre o buraco, e a suíte inteira continuará verde.** Registrado em
`scripts/fixture-semente.test.ts`, ao lado da cerca que não o cobre.

---

🔒 **A CERCA DO TRIO — medida em 43/44 e FORA por decisão do dev. É PR PRÓPRIO.**
A revisão propôs matar o `M-pessoa` exigindo que o trio **`(driverId, constructorId, season)`**
exista em `fatos.titulares`, usando **só artefato já commitado** — sem reintroduzir nome real.

🔴 **Medido antes de prometer: 43 de 44.** Falta **`hakkinen @ mclaren @ 1993`** — e **não é defeito
da migração: é a FIXTURE discordando do DADO.** `fatos-agregados.json` registra os titulares da
McLaren 1993 como **Andretti (13 largadas) + Senna (16)**; Häkkinen correu só o fim daquele ano e o
agregado o traz na McLaren **a partir de 1994**. Quem escreveu a fixture à mão em 2025 pegou a dupla
**icônica**, não a estatística.

🔒 **DECISÃO DO DEV (2026-08-31): fica fora.** Motivo: **cerca que nasce precisando de exceção a dedo
é exatamente o que o portão proíbe** ("não existe allowlist aqui, e não se acrescenta uma").

---

🔴 **22 IDs DA FIXTURE AGORA COINCIDEM COM `src/data/` CARREGANDO NOTAS DIFERENTES — armadilha.**
`sarterra-2004-chassi` existe nos dois arquivos e **não quer dizer a mesma coisa**: na fixture são as
notas congeladas de 2025, em `src/data/` as derivadas do pipeline. Antes do PR 7 não podia acontecer,
por acidente: a fixture usava convenção de id própria que **não colidia** com a do pipeline. Passando
os dois pela mesma `TABELA_NOMES`, os espaços **convergiram**.

✅ **Não é risco hoje, e foi MEDIDO:** varredura dos 115 sítios-linha que citam id de fixture —
**nenhum arquivo carrega os dois datasets**. Lê a fixture: `src/engine/`, `src/net/`, `src/ui/` (testes).
Lê `src/data/`: `balance.balance.test.ts`, `alavancas.balance.test.ts`, `dataset-live.test.ts`,
`dataset-app.ts`.
🔒 **Se um dia precisar cruzar os dois: casar por `equipe`+`ano`, NUNCA por id.** Um teste que
resolvesse um id da fixture contra o dataset vivo **passaria e mediria a coisa errada**.

---

⚖️ **O BALANCE NÃO TEVE DELTA, e a previsão veio ANTES da rodada.**
sha256 **`a0aa98e4…`** idêntico ao baseline do PR 6, **diff vazio**, mesma receita de filtro.
🔑 **O dev previa "a mesma classe de delta da 0(ae), agora pela fixture". A previsão mecânica correta
era ZERO, e foi dita antes de rodar:** os dois `*.balance.test.ts` importam **`src/data/`**, nunca a
fixture — e o PR 7 não toca `src/data/`. **Delta ≠ 0 teria sido bandeira vermelha, não a 0(ae).**
Confirmado duas vezes: antes e depois dos consertos da revisão.

---

🔴 **O BASELINE VERMELHO FOI 66, NÃO 1.** A previsão do PR 6 (`fluxo-draft-golden.test.ts`)
respondia *"cai no PR 6?"*, não *"o que cai no PR 7?"* — ele é **1 de 66, em 9 arquivos**. A causa
são **115 sítios-linha** com id da fixture como literal, que `referencias-dataset.ts` **nunca
funilou** (ele guarda pares `equipe/ano`, não ids). Riscado no lugar naquele arquivo.

🔒 **RENOMEAR × REGERAR — decisão do dev, medida antes de tomada.** A fixture **não é recorte de
`src/data/`**: notas de 2025 e convenção de id própria. Ensaio a seco: renomear deixa **3**
vermelhos, regerar deixa **57**, dos quais **54 são goldens de VALOR**. O argumento que decidiu foi
o **README da própria fixture** (PR 4.4): rebasear goldens é decisão de plano explícita, não efeito
colateral. **Rebasear a fixture segue sendo PR próprio.**

🔴 **PONTO CEGO: O PORTÃO NÃO MEDE `.md`.** O README da fixture citava
`ferrari-2004-piloto-schumacher` e se dizia cópia byte-idêntica de `src/data/`. **Era possível marcar
6 e deixar nome real no diretório que existe para ser lido com segurança.** Consertado à mão; **a
cegueira continua**.

---

📋 **Revisão (`senior-reviewer`): 2 bloqueantes + 5 avisos, todos consertados.** Os dois bloqueantes
eram **prosa em presente do indicativo que virou falsa** — uma delas contradizendo o bloco novo do
mesmo arquivo. 🔑 **A anti-vacuidade da cerca testava o MAPA e não o PREDICADO — literalmente o mesmo
achado que a revisão do PR 6 fez** em `publicacao.test.ts`. Consertada extraindo o predicado, e a
correção **verificada por mutação**. Detalhe no `HISTORICO.md`.

📄 **Medições com método: `preview/medicoes-pr7/MEDICOES-DA-DOC.md`** (pasta gitignored).

---

> 📚 **OS PRs ANTERIORES FORAM ARQUIVADOS em 2026-08-31**, com o recorte aprovado pelo dev →
> `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md` em 2026-08-31". **845 linhas, movidas ÍNTEGRAS, linha
> por linha — nada resumido.** O que era decisão travada ficou aqui, no bloco de retenção logo abaixo.
> ✅ **A PRÉ-CONDIÇÃO DA CONVENÇÃO ESTÁ CUMPRIDA — e ela NÃO estava antes deste arquivamento.**
> A §Convenções manda conferir que o bloco a substituir **já está** no `HISTORICO.md` antes de
> reescrever a §"Onde parei". No PR 7 não estava, e por isso a seção acumulou. **Agora está**, e a
> convenção volta a ser segura de aplicar. ~~A §"Onde parei" pode ser reescrita de novo no próximo
> PR, e o que ela substituir já terá espelho.~~
>
> 🔴 **A FRASE RISCADA ACIMA ERA FALSA, e foi MEDIDA como falsa no PR do `.gitattributes`
> (2026-09-01) — riscada no lugar, não contradita ao lado.** Ela vale para os PRs que ESTE
> arquivamento moveu; **não vale para o bloco do PR 7**, que foi escrito na mesma sessão da higiene
> e **não foi arquivado por ela**. Medido com o script da própria convenção: **contenção de 33,0%,
> 766 shingles órfãos** (`python scripts/medir-contencao-doc.py 558 673`).
> 🔑 **E os marcadores CASAM 1:1** — `A CERCA DO TRIO`, `hakkinen @ mclaren @ 1993`,
> `O PORTÃO NÃO MEDE` e outros aparecem nos dois arquivos. **É exatamente o falso-positivo que este
> mesmo bloco descreve três parágrafos abaixo:** cabeçalho casado não é conteúdo espelhado. Quem
> conferisse por `grep` de marcador teria concluído "está espelhado" e apagado 6 linhas de
> obrigação, **3 delas decisões 🔒 travadas do dev** (a cerca do trio fora, o motivo do "exceção a
> dedo", e RENOMEAR × REGERAR).
> 🔒 **PORTANTO O BLOCO DO PR 7 FICA, e a §"Onde parei" ACUMULA de novo** — que é o que a convenção
> manda quando a pré-condição não está cumprida. **Arquivá-lo é decisão do dev.**
>
> ⚠️ **A REDAÇÃO ANTERIOR DESTE BLOCO FOI SUBSTITUÍDA, não deixada ao lado.** Ela dizia que a seção
> *"acumula enquanto o espelhamento não existir"* e que *"arquivar isto é DECISÃO DO DEV"* — as duas
> ficaram **falsas** no instante em que o dev aprovou o recorte, em 2026-08-31. Regra nova ao lado da
> antiga contraditória é exatamente o que o `CLAUDE.md` §"o `doc-writer` NÃO APAGA" proíbe.
>
> 🔴 **O QUE A MEDIÇÃO DESTE ARQUIVAMENTO DESMENTIU, e vale mais que o saldo de linhas.** A sessão
> começou supondo que as narrativas já estivessem espelhadas, porque o `HISTORICO.md` tem uma seção
> `###` para quase todo PR daqui. **Contenção medida: 16,7%.** As entradas de lá foram escritas
> **À PARTE** sobre os mesmos PRs — o PR 6 tem 137 linhas aqui e ~270 lá, prosa diferente, não cópia.
> Melhor caso 37,8% (3.5.4), pior 0,4% (auditoria C3). 🔒 **CABEÇALHO CASADO NÃO É CONTEÚDO
> ESPELHADO** — e é por isso que o move foi **verbatim**, em vez de "apagar o que já estava lá".
> Script: `scripts/medir-contencao-doc.py`.

---

### 🔒 RETIDAS NO ARQUIVAMENTO DA §"Onde parei" (2026-08-31) — o que o move levaria junto

> **A regra do aninhamento aplicada pela SEGUNDA vez** — a primeira foi o §FASE 3, em 2026-08-28,
> logo acima neste arquivo. Lendo o CONTEÚDO das 845 linhas movidas, e não o cabeçalho, ficam aqui
> as decisões travadas, no texto original. **Cabeçalho não prova pertencimento.**
>
> 🔴 **A LIÇÃO DE MÉTODO DESTA RODADA, e é ela que explica o tamanho deste bloco: VARREDURA DE
> RETENÇÃO POR EMOJI SUBESTIMA — 20 contra 80, razão de 4×.** Um `grep 🔒` sobre a §"Onde parei"
> achava **20** marcadores. A varredura pelas FRASES que marcam obrigação (`decisão do dev`,
> `travado`, `aprovado pelo dev`, `não reabrir`, `adiado`, `veredito do dev`) achou **80 linhas**.
> **O emoji É cabeçalho**, e a regra "ler o CONTEÚDO, não o cabeçalho" vale contra ele também.
> **Três decisões travadas do dev não têm 🔒 nenhum** — o **PR C ADIADO** (marcado ➡️), o **GATILHO
> DE REAVALIAÇÃO** (marcado 🔁) e o **"MR sai, entra MC"** (sem marcador algum). O "PR C ADIADO" é
> justamente um dos quatro marcadores que a sessão do PR 7 amostrou e **não achou em nenhum outro
> arquivo**: um arquivamento guiado por `grep 🔒` o teria levado junto.
> 🔒 **Quem for arquivar daqui em diante varre por FRASE.** Script: `scripts/medir-retencao-doc.py`.

**DA TRILHA DE NOMES FICTÍCIOS** (PR 6, posicionamento, PR 5 e PR 4 — arquivados):

- 🔒 **DUAS COISAS MORRERAM, e confundi-las era o risco. Palavras do dev:** *"a cópia manual sem
  guarda existe há meses e ninguém sabia até o PR 5 medir. Trocar um passo manual sem guarda por um
  script sem guarda não seria ganho — seria a mesma dívida com nome novo."* O **passo manual** morre
  pelo script; a **ausência de guarda** morre pela cerca. **São duas.**
- ~~⚠️ **`.gitattributes` pinando `*.json` como LF resolveria a CLASSE inteira do C1 do PR 6, mas
  reescreveria final de linha do repo todo no próximo checkout. É PR próprio e DECISÃO DO DEV**, não
  conserto de passagem. **Não foi feito.** *(Medido em 2026-08-31: o repo segue sem `.gitattributes`
  e os `.md` seguem LF puro.)*~~
  ✅ **FEITO em 2026-09-01 (`ea2c8f4`), em PR próprio, autorizado pelo dev.** Riscado no lugar
  porque a última frase — *"o repo segue sem `.gitattributes`"* — passou a ser **falsa dentro da
  mesma árvore** que agora contém o arquivo. **As outras duas afirmações também não sobreviveram
  intactas, e a correção é precisa, não varrida:**
  - 🔴 **`*.json` NÃO resolveria a classe inteira** — o recorte proposto estava errado, medido: o
    digest lê **18 arquivos e só 3 são `.json`**. Pinar só JSON consertaria **3 de 18** e deixaria
    os 12 `.ts` de `src/engine/` expostos, que é a maior parte da exposição. **O que entrou pina
    `*`**, com `*.png`/`*.woff2` explícitos como `binary`.
  - 🟡 **"Reescreveria o final de linha no próximo checkout" é VERDADE; o que era falso é o CUSTO
    que a frase sugere.** Arquivo re-checkoutado sai mesmo em LF (medido: `pecas.json`, 266 CR → 0).
    Mas **não há diff, nunca**: o índice já era **100% LF (233/233 rastreados de texto)**, então
    `git add --renormalize .` **não encena nada** e `git status` fica limpo — medido de duas formas
    independentes (sonda não-rastreada no repo real + clone isolado com o arquivo commitado). **A
    convergência é GRADUAL, por arquivo**, não um varrido só. Ver a pendência **0(af)**.
- 🔒 **É o CAMINHO (a) da pendência 0(aa), escolhido pelo dev em 2026-08-28** — particionar
  `referencias-dataset.ts` por dataset ANTES do PR 6, contra o caminho (b) (fazer 6 e 7 no mesmo PR).
  **Palavras do dev:** *"fazer 6 e 7 juntos junta o ALTO RISCO (`src/data/`, tela, netcode) com o
  BAIXO (fixture), e o portão visual do 6 ficaria misturado com mudança de fixture."*
- 🔒 **A duplicação nos três blocos `DATA_*`/`FIXTURE_*`/`DERIVADO_*` é o produto, não um resto a
  limpar.** `Red Bull 2023` está nos três e `Ferrari 2004` em dois — origens que coincidiam **por
  acaso**. **Quem deduplicar reabre a janela.** Está escrito no docblock.
- 🔴 **A partição NÃO é cerca, e está dito no código.** Nada impede um arquivo que lê a fixture de
  importar do bloco `DATA_*` — o alinhamento consumidor↔bloco é **convenção sustentada por leitura**.
  **Teste novo não entrou, por decisão do dev** (*"npm test inalterado"*).
- 🔒 **`src/data/` INTOCADO — decisão do dev, 2026-08-28, que SUPERA a de 2026-08-25** (*"o
  `anonimizar` passa a escrever em `src/data/`"*, `PLANOS_ATIVOS.md`). A antiga foi marcada como
  superada **no lugar**, não contradita ao lado.
- 🔒 **A saída `equipe-anos.anonimo.json` NÃO é commitada** (decisão do dev: *"artefato derivado
  commitado é a segunda fonte que precisa concordar com a primeira"*). Por isso o teste opera sobre o
  **RETORNO EM MEMÓRIA da função pura** — `npm test` não depende de artefato gerado.
- 🔒 **`verificarColisaoDeIds` é RE-EXECUTADA sobre a própria saída do `anonimizar`**, importada e
  não reimplementada: o `anonimizar` não passa por `derivarNotas`, então contornar a chamada seria
  contornar a guarda existente.
- 🔒 **REGRAS DE AUTORIA APROVADAS PELO DEV — valem para toda entrada nova em
  `scripts/nomes-ficticios.json`:**
  - **Família de construtor mantida, com o MESMO sufixo por fornecedor.** `cooper`/`cooper-climax`/
    `cooper-brm` → **Kestner / Kestner-Vireo / Kestner-NDK**, e **NDK é também a equipe BRM**.
  - **Sabor por época**, pela primeira temporada de cada id.
  - **Os 7 que foram piloto E construtor compartilham o nome nas duas pontas.** **Palavras do dev:
    "é coerência que o jogo ganha de graça".**
  - **Formato de id preservado, sem esquema novo** (regra travada no PR 3).
  - 🔑 **Regra ALARGADA pelo dev em 2026-08-27:** não usar como primeiro nome algo que seja
    **sobrenome real de piloto**. *(Palavras do dev: "não é falha da cerca — é da regra de autoria,
    e ela vale.")*
  - **Topônimo da casa da equipe real também sai** — `Faentina`, `Kowloon` e `Aravalli` passaram
    VERDES e foram trocados **por decisão do dev, não por medição**. *(Palavras do dev: "o objetivo é
    remover referência, não codificá-la de forma mais sutil.")*
- 🔒 **AS DUAS LACUNAS DA CERCA DE NOMES SÃO REGRA DE AUTORIA, E REGRA DE AUTORIA NÃO É CERCA** —
  nenhum teste as faz valer. **(1)** primeiro nome de piloto está **fora do universo** (um "Ayrton
  Vandel" passa VERDE); **(2)** topônimo é cegueira **estrutural** (`fatos-agregados.json` não tem
  nome de lugar). **Quem acrescentar entrada nesta tabela responde por ela na leitura, não no
  `npm test`.**

**DA FASE 3** (3.5.1 a 3.5.4, PRs A/B/C do spike e conserto da 0(s) — arquivados):

- ✅ **PR A DO SPIKE — VEREDITO DO DEV: GO (2026-08-19).** `@cloudflare/vitest-pool-workers` adotado,
  com a **decisão travada do 3.2 preservada na substância, não só na letra**.
- 🔒 **Conserto aprovado pelo dev no PR B: MR sai, entra MC** (`carregar()` deixa de ler o storage).
  **MR foi DESQUALIFICADA como baseline** por dois motivos independentes: derruba a quarta exigência
  da cerca textual e dá **TS2740**, vermelho de compilação — que não conta como baseline vermelho.
  *(A regra geral já está retida no §FASE 3, acima: "VERMELHO DE COMPILAÇÃO NÃO CONTA".)*
- ➡️ **DECISÃO DO DEV (2026-08-20): PR C ADIADO — abre o 3.5.2 direto.** Não foi cancelado: foi
  **REPOSICIONADO para DEPOIS do 3.5.4** e antes de declarar a Fase 3 encerrada. **Motivo registrado
  pelo dev:** cobertura defensiva rende mais depois de a lógica existir — o C escrito antes seria
  moldado ao código de ontem. ✅ **CUMPRIDO: o PR C foi feito em 2026-08-23** (`99afde0`).
  - ⚠️ **A PRIMEIRA METADE DESSE MOTIVO NÃO SE REALIZOU, e ficou medido:** esperava-se que o 3.5.2
    exercitasse `onMessage` de graça, e ele testou o cursor pelo redutor puro, em `src/net/`.
    **O adiamento saiu mais caro do que o registrado** — não se herdou nada.
- 🔁 **GATILHO DE REAVALIAÇÃO, travado junto com a decisão do PR C:** se o 3.5.2 ou o 3.5.3 revelarem
  na casca um bug que o PR C teria pego, **puxar o C para a frente** em vez de seguir a sequência.
  🔑 **DECISÃO DO DEV (2026-08-20): o achado `M-nEtapas` NÃO dispara o gatilho** — o gatilho nomeia o
  `alarm()`, e aquilo é o caminho de CRIAÇÃO, ausência de portão e não bug.
- 🔒 **A linha riscada sobre o encerramento da Fase 3 estava CERTA quando foi escrita e ficou FALSA
  quando o dev decidiu — por isso foi riscada NO LUGAR, e não contradita noutro parágrafo.** É a
  mesma regra do `CLAUDE.md` §"o `doc-writer` NÃO APAGA": afirmação nova ao lado da antiga
  contraditória devolve o estrago, dependendo de qual o próximo leitor achar primeiro.
- 🔒 **O 3.5.4 herdou MAIS do que o plano previa, por decisão do dev no 3.5.3 (opção A):** além dos
  painéis e do portão visual, levou o **`key={'etapa-'+k}`**, a remoção do **`naCorrida`** e o
  **atestado por etapa** — **as três são a mesma solda, e separá-las produz hash de uma etapa com a
  tela de outra** (a forma exata do bug do 8.4).
- 🔒 **Veredito do dev no 3.5.3: opção (A), derivação PURA.** A alternativa de seguir o plano à risca
  foi **descartada explicitamente** — deixaria divergência conhecida na `main` entre dois PRs.
  A lógica ficou em **módulo PURO** (`etapasDaSala`/`classificacaoDaSala` em `corrida-online.ts`),
  não no `useMemo`, porque **o projeto não tem `jsdom` nem `@testing-library` (medido)** e nada
  dentro do hook é alcançável por mutação. 🔑 **Guarda dentro de hook não tem baseline possível** —
  `M-guarda-classif` sobreviveu enquanto a guarda esteve lá dentro.
- 🔒 **Aviso 2 do 3.5.2 — `versaoSala` é o único campo persistido sem checagem de FORMA. NÃO
  consertado: é decisão do dev**, porque mexer no caso `undefined` contradiria comportamento já
  fixado por teste. Registrado como **0(u6)**.
- 🛑 **A OPÇÃO DE ABANDONAR O 3.5 FOI POSTA AO DEV em 2026-08-20 e ele decidiu SEGUIR COM O 3.5.**
  A obrigação de visibilidade está **cumprida**; **não é mais pergunta aberta**, e reabri-la é
  decisão nova do dev. ⚠️ **O que o abandono NÃO teria resolvido, e segue valendo:** as pendências
  **0(i)** (`seedMestre` de 32 bits, enumerável) e **0(o)** (assimetria de postura entre corrida
  avulsa e campeonato) — **elas são da corrida avulsa, que fica de pé sozinha.**
- ✅ **PENDÊNCIA 0(p) FECHADA em 2026-08-19 — o dev rodou o despejo real** (sala 420320 pós-3.5.1).
  `Uint32Array` sobrevive ao storage do Durable Object; foi o que fechou o R4 do spike.
- ✅ **PORTÃO VISUAL DO 3.5.4 APROVADO PELO DEV em 2026-08-23** (`preview/campeonato-online.html`).
- ✅ **PENDÊNCIA 0(w) FECHADA no 3.5.4 — decisão do dev (A2 da revisão do 3.5.3):** o cliente fixa
  `'curta'` (5) e o teto de LEITURA de `nEtapas` no servidor é `[1, 10]`, com **lookup TOTAL**
  (devolve `null`, nunca lança). 🔒 **É o lookup total que fecha de verdade** — um lookup que
  lançasse teria MOVIDO a pendência, não fechado.

> 📌 **Já retidas em outro lugar deste arquivo, e por isso NÃO repetidas aqui:** a invariante
> "indexar por `etapas.length - 1`, nunca por `sala.etapaAtual`" e o "vermelho de compilação não
> conta como baseline" estão no §FASE 3 (bloco de retenção de 2026-08-28); o **piso de 6 do portão
> dos nomes** e a **cerca do trio fora por decisão do dev** estão no bloco do PR 7, acima; as duas
> decisões de arte do PR 4/4 são as pendências **(m)** e **(n)** da §Pendências ATIVAS.

---

## 📏 MEDIÇÕES E AUDITORIAS DA TRILHA DE NOMES (2026-08-24 / 2026-08-25) — FICARAM AQUI

> 🔒 **NÃO foram arquivadas em 2026-08-31, e é decisão do dev.** Estes quatro relatórios são a
> **EVIDÊNCIA** em que as pendências **0(y)** e **0(z)** se apoiam, e as duas seguem **ABERTAS**.
> **Palavras do dev:** *"mover evidência de pendência viva para arquivo de histórico é o tipo de
> coisa que faz a próxima sessão reabrir uma pendência já medida por não achar a medição."*
> 📌 **O corte proposto — mover o corpo e reter uma linha de conclusão dentro de cada pendência — é
> PR PRÓPRIO**, porque edita a §Pendências ATIVAS, e essa seção merece o cuidado à parte.
> ⚠️ **Eles moravam sob o cabeçalho do PR 4, que FOI arquivado.** Este cabeçalho existe para que não
> fiquem órfãos: são **medições da trilha de nomes**, não narrativa daquele PR. A narrativa do PR 4
> está em `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md` em 2026-08-31".
>
> **São quatro, nesta ordem:** a refutação do **C3** (de onde saiu a 0(y)) · o **INVENTÁRIO dos nomes
> reais** (a tabela das cinco contagens, das quais duas estão aposentadas) · o **CUSTO DE TROCAR
> para dataset fictício** (o veredito 🟢) · a **SUPERFÍCIE de `pecas.json` e `pistas.json`** (de onde
> saiu a 0(z)).

**📏 DUAS MEDIÇÕES DE AUDITORIA — FECHADAS em 2026-08-24.** Nenhum diff de produção; o resultado é
o registro abaixo. **A numeração C1/C2/C3 é do audit e NÃO existe neste arquivo** — por isso o item
que sobrou aberto entra na numeração de cá, como pendência **0(y)**.

✅ **C3 (limite de 22 jogadores) É FALSO POSITIVO DO AUDIT — REFUTADO POR MEDIÇÃO** (precedente do
3.5.2 e do S1 da 0(s) — ⚠️ **os dois foram arquivados em 2026-08-31**; ver `HISTORICO.md`
§"ARQUIVADO DO `ESTADO.md` em 2026-08-31", onde a redação anterior dizia "logo abaixo").
O audit alegava guarda ausente. **Medido, os três elos:**
- **A guarda EXISTE:** `src/net/sala.ts:500` — `if (estado.jogadores.length >= QTD_JOGADORES)
  return recusar(estado, 'sala-cheia');`, com `QTD_JOGADORES = 22`.
- **O teste EXISTE e assere IDENTIDADE, não só valor:** `src/net/sala.test.ts:178-185` ("recusa a
  23ª entrada") enche a sala, confere `humano-22` no último slot, e fecha com
  `expect(r.estado).toBe(cheia)` — **`.toBe`, referência**, o que prova que a recusa não devolve
  estado novo. É a mesma força de asserção que refutou o S1 da 0(s).
- **A COMPOSIÇÃO foi verificada**, que era o buraco real a descartar: `reduzirSala` tem **2 sítios
  de produção**, e ambos são construção **imutável** — não há caminho que acrescente jogador
  contornando o redutor.

🔴 **O ACHADO ADJACENTE QUE SAIU DA MEDIÇÃO, e este é REAL: a guarda protege o ROSTER, não as
CONEXÕES.** `QTD_JOGADORES` limita quem entra na lista de jogadores via comando `entrar`; **socket
aberto que nunca manda `entrar` não é limitado por nada.** Virou a pendência **0(y)** e **continua
ABERTA** — ver lá, e ler junto com o bloqueante C1 da 0(s), que é o mesmo mecanismo de socket
quieto visto do outro lado.

---

📋 **INVENTÁRIO DOS NOMES REAIS — MEDIDO em 2026-08-24, e ele CORRIGE uma frase do projeto.**
Motivo da medição: o dev decidiu **deploy público** (ver §Estado atual), então nome real virou
bloqueador.

🔑 **"Engine agnóstica a nome" (`F1_Fantasy_GDD.md:265` e `:295`) é MEIA-VERDADE.** É verdade que a
engine não *interpreta* nome; é falso que nome seja rótulo descartável. **Medido:**
- **Os ids SÃO os nomes.** **1.542 ids de piloto com sobrenome embutido** no esquema de id.
  ✅ **RE-MEDIDO em 2026-08-24 (medição de custo, logo abaixo) e CONFERE.** A ressalva que estava
  aqui — *"medido na SESSÃO ANTERIOR, não re-medido, a releitura do dataset foi recusada por
  permissão"* — está **FECHADA para este número**. Contagem desta sessão, direto de
  `src/data/equipe-anos.json` (só agregados saíram, nenhuma leitura integral): **771 entradas
  equipe-ano · 105 nomes de equipe distintos · 1.542 ids de piloto distintos** — e 1.542 = 771 × 2
  titulares, **zero colisão**.
  ⚠️ **A ressalva NÃO caiu para o número de ARQUIVOS** — ela era compartilhada pelos dois números, e
  só um foi re-medido. Ver o item dos 33, abaixo.
- **O nome da equipe é CHAVE**, em três camadas: unicidade validada em `src/engine/dataset.ts:270`
  (⚠️ **e é chave COMPOSTA `equipe::ano`, não chave primária só de nome** — a redação que recebi
  dizia "chave primária"; o que o código faz é `const chave = \`${equipe}::${ano}\`` com assert de
  duplicata sobre o par); **lookup que LANÇA** em `src/engine/draft-utils.ts:73`
  (`encontrarEquipeAno`, `throw` na linha 75); e **insumo do hash** em **`src/net/hash-draft.ts:68`**
  — `refs.map((r) => \`${r.equipe}@${r.ano}\`)`, ou seja **o nome da equipe entra literalmente na
  string hasheada**. ⚠️ **Correção de âncora: o arquivo é `src/net/hash-draft.ts`, NÃO
  `src/engine/`.**
- **33 arquivos citam nome real fora de comentário** — **6 produção, 24 teste, 3 preview** —, dos
  quais **só 2 são app real**. ⚠️ *A ressalva de proveniência CONTINUA VALENDO SÓ PARA ESTES
  NÚMEROS: medidos na SESSÃO ANTERIOR, **não** re-medidos. Entram rotulados, não como medição.*
  🔴 **APOSENTADO em 2026-08-24 (3ª sessão) — e o motivo NÃO é "não foi re-medido": é que ele
  NÃO É RE-MENSURÁVEL.** O dev pediu para fechar a ressalva de proveniência ("ou re-meça, ou marque
  como não-medido"). Tentei re-medir e a tentativa produziu um terceiro achado: **a sessão que gerou
  o 33/6/2 nunca registrou o MÉTODO** — qual lista de nomes, qual universo de arquivos, como
  comentário foi tratado. Sem isso o número não é falsificável: qualquer contagem nova diverge dele
  sem que se possa dizer qual das duas está errada. **É a lição própria do projeto aplicada a um
  número meu:** *"Conclusão sem o fato que a gerou não se verifica depois."* **Não use 33/6/2 para
  decisão nenhuma.** O que vale está nos dois blocos abaixo, cada um com o método embutido.
  ⚠️ **Os três substitutos NÃO são "o 33 corrigido"** — medem coisas diferentes e não se somam.
  Isto agora são **CINCO** contagens convivendo neste inventário; ver o 🔑 da medição de custo.

  📏 **SUBSTITUTO 1 — literal de nome de EQUIPE em arquivo-fonte rastreado: 15 arquivos.**
  **Método (é ele que faz a medida valer):** universo de nomes = os **105** `equipe` distintos de
  `equipe-anos.json` (só agregado, nenhuma leitura integral); universo de arquivos = `git ls-files`
  filtrado a `.ts/.tsx/.mjs/.js` **fora de `src/data/`** = **166 arquivos**; "cita" = o nome dentro
  de aspas, com fronteira não-alfanumérica (para `'Lotus'` não casar dentro de `'Lotus-Climax'`),
  em linha que não é comentário. **Resultado: 1 script-fonte (`scripts/balance.ts:50`), 1
  informativo (`scripts/dataset-report.ts:162`), 1 fixture de engine
  (`src/engine/draft-test-fixtures.ts:22`), 1 preview-test, 11 testes.**
  ⚠️ **`preview/` está FORA deste universo por construção — não é rastreado pelo git** (`git ls-files
  preview/` devolve vazio). Os "3 preview" do número aposentado **não podiam** aparecer aqui.
  🔑 **E isto NÃO é erro da contagem nº 3 logo abaixo — é MÉTRICA DIFERENTE.** A nº 3 declara o
  universo dela como "em disco, fora de `node_modules`, `scripts/cache/` e `src/fixtures/`", então
  `preview/golden.test.ts` e `preview/zebra.test.ts` entram nela **corretamente**; a nº 4 usa
  `git ls-files` e por isso não pode contê-los. **As duas estão certas.** Registro a distinção
  porque quase escrevi aqui que a nº 3 estava errada — que é exatamente o defeito que esta sessão
  passou inteira diagnosticando: **contagem com método diferente não corrige outra, só difere dela.**

  🔴 **SUBSTITUTO 2 — a métrica por SOBRENOME/`driverId` é INUTILIZÁVEL, e isto é um achado.**
  Tentei a passada que faltava (ids slugados + sobrenomes, que o substituto 1 é cego a ver) e ela
  devolveu **83 arquivos / 25 "produção"** — **lixo, por colisão com palavra comum**: **`button` é
  sobrenome real (Jenson Button)**, então todo `<button>` do React casa; e **`sala` é um `driverId`
  real**, então `src/net/` inteiro casa. **Não corrigi a lista de exclusão para salvar o número** —
  registro a métrica como reprovada, porque uma allowlist escolhida a dedo até o número ficar
  bonito é exatamente o vício que produziu o 33. 🔑 **Provável causa-raiz do 33 original.**

  🟢 **SUBSTITUTO 3 — O QUE INTERESSA, e é BINÁRIO: MEDIDO NO BUNDLE, não inferido.**
  `npm run build` (exit 0) → `dist/assets/index-C10zYSkb.js`, **831 KB**. Contagem de presença:
  **105/105 nomes de equipe · 1.542/1.542 ids de piloto · 353/353 nomes exibidos de piloto.**
  Amostras de ocorrência: `Ferrari` 152×, `McLaren` 127×, `Red Bull` 44×, `Schumacher` 31×,
  `Verstappen` 18×, `Senna` 12×, `Fangio` 7×, `red-bull-2023` 6×.
  🔑 **Isto SUBSTITUI o "só 2 são app real" por algo que não depende de classificar arquivo.**
  A pergunta "quantos arquivos são app real" era um **proxy** para "o que é servido ao público"; o
  proxy tinha o defeito de exigir julgamento (foi ele que errou: `draft-test-fixtures.ts` não tem
  sufixo `.test` e um classificador ingênuo o chama de produção). **O bundle responde direto: o
  dataset real vai INTEIRO, 100%.** Nenhum arquivo precisa ser classificado para saber isso.
  🔑 **A medição de custo abaixo NÃO os re-mede** — ela conta outra coisa (quem **importa** o
  dataset, 22 arquivos), e as duas contagens não se somam nem se substituem. Mas um achado dela
  **incide** sobre o "só 2 são app real": `src/ui/dataset-app.ts` importa o dataset real e é
  consumido por `src/ui/App.tsx:16`, ou seja **os 1.542 nomes vão no bundle de produção**.
- **O `balance-harness` quebra por EXCEÇÃO**, não por número errado: `scripts/balance.ts` procura
  `'Red Bull'` 2023 com literal na **linha 50** e lança na **linha 52**
  (`loadoutForte: equipe/ano "Red Bull" 2023 não encontrado no dataset`). ⚠️ **Correção de âncora:
  a linha é 50/52, não 48.** Há outros literais de nome no mesmo arquivo (linhas 43, 47).
- **Troca de dataset força BUMP de `VERSAO_APP`** pelo digest, que cobre `src/data/**`.

⚠️ **A frase do GDD segue no lugar até o dev decidir** — corrigi-la é edição em `F1_Fantasy_GDD.md`,
proposta separadamente e não embutida aqui.
✅ **FECHADO em 2026-08-24 (3ª sessão) — a frase do GDD JÁ ESTAVA corrigida, e a correção era de
outra coisa.** O dev pediu para corrigir `F1_Fantasy_GDD.md:265` e `:295`; medido, os dois sítios
**já tinham sido corrigidos** pelo commit `1df89dc` (a 1ª sessão de nomes) e já apontavam para este
inventário. **Duas correções REAIS saíram da conferência, e nenhuma era a pedida:**
- ⚠️ **Âncora: é `:299`, não `:295`.** Mesma família das cinco correções de âncora já registradas
  neste inventário — o ditado envelheceu 4 linhas.
- 🔴 **CONTRADIÇÃO ENTRE OS DOIS DOCUMENTOS, e o GDD é que estava errado.** O GDD dizia
  **"FALSO"**; este arquivo (`:341`) diz **"MEIA-VERDADE"**. **"FALSO" excede a medição que o
  próprio GDD citava**, e a diferença é material para o plano de troca: é justamente porque a
  engine **não interpreta** nome que as notas sobrevivem ao rename e o veredito de custo deu 🟢.
  **Corrigido no GDD para MEIA-VERDADE**, com a razão junto. 🔑 **Foi a conferência de um item já
  feito que achou o erro** — item marcado como pronto e não conferido contra sua fonte é a mesma
  família do "artefato não verificado não conta como verificado".
- ➕ **Acrescentado ao GDD §14.2:** a medição do BUNDLE (substituto 3, acima), porque o §14.2 é
  onde o risco jurídico mora e ele estava argumentando por cadeia de import, não por medida.

---

📏 **CUSTO DE TROCAR PARA DATASET FICTÍCIO — MEDIDO em 2026-08-24.**
🟢 **VEREDITO: o custo é BAIXO e o balanceamento SOBREVIVE.** Continuação direta do inventário
acima — lá ficou provado que nome **não** é rótulo descartável; aqui está medido **quanto** custa
trocá-lo. **Nenhum diff de produção; o resultado é este registro.**

✅ **Os NÚMEROS são independentes do rótulo.** `derivarNotasPiloto` (`scripts/derivar-notas.ts:482`)
e `derivarNotasEquipe` (`:584`) computam sobre **pools de percentil chaveados por `driverId` /
`constructorId`**. O nome exibido e o slug do id **não entram em conta nenhuma** — trocar o dataset
move os rótulos, não as notas. É esta linha que sustenta o veredito verde.

✅ **A normalização é UMA SÓ, num arquivo só, em 4 SÍTIOS.**
📏 **CORREÇÃO 2026-08-25 — o registro dizia 3; são 4. O que faltava é `:705`**, o bullet novo no fim
desta lista. **Isto é MEDIÇÃO, não veredito**: método no próprio bullet.
⚠️ **CORREÇÃO DE ÂNCORA — o arquivo é `scripts/derivar-notas.ts`, NÃO `scripts/agregar-fatos.ts`.**
As três linhas ditadas conferem, mas **naquele** arquivo; `idsDaEquipeAno` **não existe** em
`agregar-fatos.ts` (medido: zero ocorrência no repo fora de `derivar-notas.ts`). Mesma família das
duas correções de âncora do inventário acima. Os sítios:
⚠️ **AS QUATRO ÂNCORAS ABAIXO FORAM RE-MEDIDAS E CORRIGIDAS em 2026-08-28** (PR de âncoras). Os
valores antigos — `:623-631`, `:691-692`, `:698`, `:705` — **estavam todos errados**, e a deriva é
**anterior** a esta trilha: `:698` já não batia nem somando o deslocamento do PR 5. **Os SÍTIOS
continuam sendo os mesmos quatro; só os números mudaram.**
- **`:637-646` — `idsDaEquipeAno`**, e **é aqui que o nome vira id**:
  `` const base = `${slug(constructorId)}-${ano}` `` e daí `chassi`/`motor`/`estrategista`/`pit` +
  `` piloto: (driverId) => `${base}-piloto-${driverId}` ``.
- **`:705-706`** — `nome: titularesDaEquipe[0|1].nome`, o nome exibido do piloto.
- **`:712`** — `equipe: equipe.nome`, o nome exibido da equipe.
- 📏 **`:719` — O SÍTIO QUE FALTAVA (medido em 2026-08-25, âncora corrigida em 2026-08-28).** O campo `nome` do estrategista é
  **montado por interpolação**, em tempo de construção:
  `` nome: `Estrategista ${equipe.nome} ${season}` `` — o nome da equipe entra dentro de uma string,
  não como campo próprio. **Método:** linha lida direto em `scripts/derivar-notas.ts:719`;
  contagem por agregado sobre `src/data/equipe-anos.json` (nenhuma leitura integral) —
  **771 entradas · 771 `estrategista.nome` presentes · 771 distintos**, ou seja **um por equipe-ano,
  sem buraco**; e materialização conferida na fixture, no registro **`Kaldrix 2023`**, campo
  `estrategista.nome` → `"Estrategista Kaldrix 2023"`.
  🔴 **CORRIGIDO no PR 7 (2026-08-31), e a correção é DUPLA.** A citação era
  `…/equipe-anos.json:27` → `"Estrategista Red Bull 2023"`: o nome mudou (a fixture virou fictícia)
  **e a âncora de linha morreu** — a fixture foi regravada de 728 para 1498 linhas, e a `:27` hoje
  aponta para outra coisa. **Ver a convenção nova em §Convenções: prosa não cita número de linha de
  arquivo de DADO.**
  🔑 **O que a medição implica (e é implicação, não veredito):** anonimização que percorra apenas
  campos **enumerados** não alcança este — o nome está dentro do valor, não na chave. Uma abordagem
  por varredura de **texto** o alcança; uma por caminhada de **campo** só o alcança se alguém tiver
  lembrado dele. **Qual abordagem adotar é decisão de plano, e não está decidida aqui.**

✅ **Hash do protocolo: INÓCUO entre builds.** O nome da equipe entra literalmente na string hasheada
(`src/net/hash-draft.ts:68`, ver inventário), e mesmo assim não vira divergência, por dois elos
medidos: **(1)** o handshake de `VERSAO_APP` já separa — `src/net/servidor-sala.ts:780`
(`const versaoConfere = versaoDaSala === undefined || versaoDoCliente === versaoDaSala;`), com recusa
`versao-divergente` em `:789` e `:891`; **(2)** o digest cobre `src/data/**` ⇒ **trocar o dataset
FORÇA o bump**, então dois builds com datasets diferentes não compartilham sala. Dentro de uma sala,
todos rodam o mesmo dataset ⇒ hash consistente por construção.
📏 **ESCOPO AMPLIADO em 2026-08-25 — a CONCLUSÃO não muda; o que muda é contra o que ela foi
verificada.** Esta linha foi medida contra uma carga **estreita**: só `${equipe}@${ano}`. **Medido
agora, a carga do `hashDoDraft` inclui TAMBÉM os seis ids de loadout** —
`pilotoId`, `chassiId`, `motorId`, `estrategistaId`, `pitId`, `pecaId` (`src/net/hash-draft.ts:64-66`,
consumidos em `:109-110`). **Isso importa porque a decisão P muda `pecaId` já no PR 3**, ou seja o
hash do draft se move ANTES da troca de dataset — caso que a redação acima não cobria.
✅ **Re-medido no escopo largo e continua INÓCUO:** `src/engine/versao.test.ts:96` põe **todo `.json`
de `src/data/`** no digest (`arquivosDe(src/data, (n) => n.endsWith('.json'))`), então **o PR 3
(`pecas.json`) força o bump exatamente como o PR 6**, e o handshake separa os builds nos dois casos.
🔑 **O desenho já antecipava esta classe:** o digest inclui `hash-draft.ts` em `FONTES_DE_NET`
(`:89`) pelo motivo escrito em `:85-87` — mudança no formato do hash faria "cliente velho e novo
hashearem estados IDÊNTICOS de formas diferentes, **alarme falso imediato**". **Mudar a CARGA é o
mesmo risco que mudar o FORMATO**, e o mesmo portão cobre os dois.
⚠️ **Registrado aqui, e não só no plano, porque conclusão herdada de um escopo mais estreito é
afirmação não conferida** — a mesma regra que obriga corrigir a linha antiga junto com a nova.

✅ **`balance-harness`: o baseline depende dos NÚMEROS, não do nome.** Os dois lookups de
`scripts/balance.ts` se comportam de formas opostas, e as duas são boas notícias:
- **`:50` quebra ALTO, com `throw` em `:52`** — `.find((e) => e.equipe === 'Red Bull' && e.ano ===
  2023)`, literal. ✅ âncora conferida (a correção "50/52, não 48" do inventário está certa).
- **`loadoutsParadas` (`:219`) é round-trip auto-consistente e IMUNE a rename** — ✅ o ditado está
  certo, e a razão é medível: os specs vêm de `selecionarPilotosParadas(dataset)` (`:296`),
  derivados do próprio dataset, então o `.find` sempre acha e o `throw` de `:221` é **inalcançável**.

⚠️ **CORREÇÃO — DOIS itens SAEM da coluna "quebra ALTO com throw":**
- **`scripts/dataset-report.ts:162` NÃO lança.** `encontrarEquipe` (`:150-152`) é `.find()` puro; o
  chamador imprime `'(não encontrado)'`, e o bloco é rotulado **no próprio código** (`:155`):
  `--- Spot-checks (informativo — não falha o script) ---`. **É degradação SILENCIOSA, não ruidosa**
  — muda de coluna, não some.
- **`scripts/alavancas.ts` não tem nome real nenhum** (medido: zero literal). O docblock com
  "McLaren 1988 e outros" é do **`dataset-report.ts:17-22`**, e a lista de pares está em `:212-214`
  — **mesmo arquivo do item acima, e igualmente informativo.**
🔑 **Sobra UM sítio que quebra ALTO no caminho de EQUIPE: `scripts/balance.ts:50/52`.**

⚠️ **CORREÇÃO — "só 2 arquivos tocam as 771" é FALSO, e a métrica tem que vir junto.** O que eu medi
foi **quem IMPORTA `src/data/equipe-anos.json`** (`import … from '…/data/equipe-anos.json'`, fora de
`node_modules`, `scripts/cache/` e `src/fixtures/`): **22 arquivos**, decompostos —
- **20 de TESTE**: os 4 do par balance/alavancas (`alavancas.test.ts`, `alavancas.balance.test.ts`,
  `balance.test.ts`, `balance.balance.test.ts`), 6 `scripts/preview-*.preview.test.ts`,
  `preview/golden.test.ts`, `preview/zebra.test.ts`, `src/engine/dataset-live.test.ts` e **7 de
  `src/ui/*.test.ts`** (`campeonato-render`, `corrida-online-render`, `fluxo-campeonato`,
  `persistencia`, `pista-camadas`, `suavizacao`, `tracados`);
- **1 de PRODUÇÃO**: `src/ui/dataset-app.ts` — ver a linha própria abaixo;
- **1 avulso**: `tmp-medir-save.ts` na raiz, **não rastreado pelo git**.
  ✅ **RESOLVIDO em 2026-08-24 (3ª sessão) a pedido do dev — pode APAGAR. Quatro elos verificados:**
  **(1) PROVENIÊNCIA — não é sobra das medições de 2026-08-24.** `mtime` **2026-08-07 13:47**, e
  ele é ignorado desde o commit **`897121f`** (`chore: ignora scripts tmp-*`), da mesma data. Ele
  **antecede as três sessões** do trabalho de nomes. ⚠️ **O que NÃO consigo provar: a autoria.**
  O `.gitignore:22` o chama de "script descartável **do dev**" e o `HISTORICO.md:2962` diz o mesmo,
  mas **os dois textos foram escritos pelo Claude, não pelo dev** — são a mesma alegação repetida,
  não duas fontes. `mtime` não prova autor. **O que fica provado é a data, não a mão.**
  **(2) ESTÁ QUEBRADO — verificado por mim nesta sessão, não herdado.** `criarDraft`
  (`src/engine/draft.ts:38`) tem `assert(jogadores.length === 22)` e `:45-48` exige `perfilBot` em
  bot; o arquivo passa **4 jogadores `tipo: 'bot'` sem `perfilBot`** (`:13-21`). Lança nas duas
  guardas. Confere com o que o `HISTORICO.md:2962` já registrava.
  **(3) É SUPERADO — o resultado que ele buscava já está registrado:** `HISTORICO.md:464` e
  `:2773` (**16,39 KB na curta = 0,32% de uma quota de 5 MB**, por draft REAL resolvido por bots).
  **(4) NINGUÉM O IMPORTA** — é raiz, ignorado, e não entra em `tsconfig`/`vitest`.
  🔑 **Ele importa o dataset real** (`./src/data/equipe-anos.json`), então aparece na contagem nº 3
  do inventário. **Apagá-lo faz a nº 3 cair de 22 para 21** — registrado para a contagem não parecer
  divergente na próxima sessão. ~~**Apagar é decisão do dev; nada foi apagado por mim.**~~
  ✅ **APAGADO em 2026-08-31, por decisão do dev na sessão de higiene do `ESTADO.md`.** Palavras
  dele: *"apaga. É temporário, não rastreado, quebrado, e importa o dataset real."*
  🔒 **A CONTAGEM Nº 3 É 21 DAQUI PRA FRENTE — 20 de teste + 1 de produção (`src/ui/dataset-app.ts`),
  e o avulso deixou de existir.** Quem remedir e achar 21 não está diante de divergência.
  ⚠️ **A remoção NÃO aparece em `git diff`**, porque o arquivo nunca foi rastreado (`.gitignore:22`,
  desde `897121f`). **Este registro é a única evidência dela** — é exatamente por isso que ele fica.
Os dois arquivos ditados **existem** na lista; o que é falso é a **EXCLUSIVIDADE**. A superfície de
teste real é **20, não 2**.
🔑 **Três contagens distintas convivem neste inventário e NÃO se somam:** "cita nome real" (33),
"é app real" (2) e "importa o dataset" (22). Só a terceira é medição desta sessão. Registrado
porque a confusão entre elas é o que produziu o "só 2" — e é a mesma lição do 3.5.3, quando a
lista da allowlist saiu da CERCA e não do `grep`, na direção oposta.
🔴 **ATUALIZADO em 2026-08-24 (3ª sessão) — agora são CINCO, e duas MORRERAM.** À lista acima
somam-se "literal de nome de EQUIPE em fonte rastreado" (**15**, com método) e "presença no
BUNDLE" (**105/1.542/353, ou seja 100%**). **Estado de cada uma:**

| # | contagem | valor | estado |
|---|---|---|---|
| 1 | cita nome real (sem método registrado) | 33 / 6 / 2 | 🔴 **APOSENTADA — não re-mensurável** |
| 2 | é "app real" | 2 | 🔴 **APOSENTADA — proxy, superada pela nº 5** |
| 3 | importa `equipe-anos.json` | 22 (20 teste · 1 prod · 1 avulso) | ✅ vale (medida, com método) |
| 4 | literal de nome de EQUIPE em fonte rastreado | 15 | ✅ vale (medida, com método) |
| 5 | presença no BUNDLE servido | 105/105 · 1.542/1.542 · 353/353 | ✅ **é a que decide o deploy** |
🔑 **Para a decisão de deploy público, só a nº 5 importa.** As outras dizem quanto TRABALHO a troca
dá; a nº 5 diz qual é o RISCO hoje, e ela é binária — não depende de classificar arquivo nenhum.

✅ **A fixture confere EXATAMENTE o ditado**: `src/fixtures/dataset-semente/` tem **22 entradas / 10
nomes de equipe distintos / 44 ids de piloto**, contra **771 / 105 / 1.542** do dataset real.

📏 **MEDIÇÃO 2026-08-25 — `seedDaEtapa` CONSOME id de pista.** **Método:** leitura direta de
`src/engine/campeonato.ts:38-39`, que é
`export function seedDaEtapa(seedBase: number, pistaId: string)` devolvendo
`` deriveSeed(seedBase, `camp:${pistaId}`) ``. O id da pista entra **literalmente na string
hasheada**. O docblock acima da função (`:29-37`) já registrava que o formato `camp:${pistaId}` é
literal e que trocar o **prefixo** muda todas as seeds derivadas; **a medição de agora é o outro
lado da mesma frase: trocar o `pistaId` faz o mesmo.**
🔑 **O que isso implica, e é implicação de MEDIÇÃO, não veredito:** renomear **id** de pista não é
rename de rótulo — muda a seed da etapa e portanto a corrida simulada. **Nome exibido não passa por
aqui**, o que é por que a T1 (`Montreal`, id intocado) é gratuita e o id do Red Bull Ring não é.
⚠️ **Esta medição NÃO decide nada sozinha** — o que decidiu foi a §"NOMES FICTÍCIOS — DECISÕES DO
DEV" (T2 adiada). Registrado separado de propósito: **medição e veredito não moram na mesma linha.**

📏 **MEDIÇÃO 2026-08-25 — `src/data/equipe-anos.json` é CÓPIA MANUAL do derivado, e NENHUM script
faz a cópia.** **Método, três elos:**
- **São byte a byte idênticos.** `git hash-object` devolve **o mesmo `7c47fa0f`** para
  `scripts/derived/equipe-anos.derivado.json` e `src/data/equipe-anos.json`; `cmp` entre os dois sai
  **exit 0**. (Nenhuma leitura de conteúdo — só hash e comparação.)
- **Nada escreve em `src/data/`.** Varredura de `writeFileSync`/`renameSync` em `scripts/*.ts`
  (fora de teste): os três escritores são `fetch-f1-data.ts:282-283`, `agregar-fatos.ts:803-804` e
  `derivar-notas.ts:755-756` — e o destino deste último é `OUTPUT_PATH_PADRAO`, sob
  `DERIVED_DIR_PADRAO` (`:168`), isto é **`scripts/derived/`**. Nenhum `copyFile` no repo.
  Os `npm scripts` também não têm passo de cópia (`dataset:fetch`/`fatos`/`notas`/`report`).
- **É por desenho, e está escrito no código:** `scripts/derivar-notas.ts:8` — *"o output é STAGING
  (o swap pra `src/data/` é o PR 4.5)"*. O swap **foi** um PR manual: `8d2493a`.
🔑 **A consequência medida: não existe guarda.** Rodar `npm run dataset:notas` atualiza **só**
`scripts/derived/`; se `src/data/` divergir do derivado, **nenhum teste falha e nada avisa** — a
identidade de hoje é resultado de alguém ter copiado certo, não de um portão. **Ambos os arquivos
são rastreados** (`git ls-files scripts/derived/` devolve os dois `.json`).
⚠️ **Isto é o estado medido, não um pedido de conserto.** Se a trilha dos nomes fictícios for
gerar dataset novo, ela herda este passo manual — quem planejar decide se o transforma em script,
em cerca, ou em nada. **Nada foi alterado.**

---

🔴 **SUPERFÍCIE DE NOME REAL QUE NENHUMA MEDIÇÃO ANTERIOR COBRIU — medida em 2026-08-24 (3ª sessão).**
Todo o inventário até aqui tratou "nome real" como **piloto + equipe**, porque foi de
`equipe-anos.json` que ele partiu. **Os outros dois arquivos de `src/data/` também têm nome real**, e
um deles muda a FORMA do plano de troca. **Método:** casar os 105 nomes de equipe e os 353 nomes de
piloto (agregados de `equipe-anos.json`) contra o texto de `pecas.json` e `pistas.json` — arquivos de
5 KB e 2 KB, consultados por filtro, sem leitura integral.

🔑 **`src/data/pecas.json` — 10 das 24 peças nomeiam uma inovação REAL, no id E no nome exibido:**
`peca-efeito-solo-lotus-79` · `peca-duplo-difusor-brawn` · `peca-difusor-soprado-redbull` ·
`peca-f-duct-mclaren` · `peca-amortecedor-massa-renault` · `peca-suspensao-ativa-fw15` (Williams) ·
`peca-seis-rodas-tyrrell-p34` · `peca-das-mercedes` · `peca-freio-direcao-mclaren` ·
`peca-carro-ventoinha-brabham-bt46b`.
🔴 **É um problema DIFERENTE do dos pilotos, em três eixos, e é por isso que fica registrado:**
- **Escala inverte o argumento:** são **10 itens**, não 1.542. Curar à mão é trivial; o problema
  **não é volume**.
- **Exposição é MAIOR por item:** cada uma nomeia uma inovação específica **por equipe + número de
  modelo** (BT46B, P34, FW15, Lotus 79). É mais pontudo que um sobrenome numa lista.
- 🔑 **O rótulo NÃO é descartável aqui — e este é o ponto que separa das notas.** O veredito 🟢 de
  custo vale porque as notas são números e o nome não entra em conta nenhuma. **Peça é o
  contrário:** o catálogo é conteúdo de DESIGN (GDD), e "Seis rodas Tyrrell P34" renomeado perde a
  referência, que é o apelo. Trocar peça é decisão de **produto**, não de pipeline.
- ⚠️ **E `pecas.json` NÃO é derivado:** não sai de `agregar-fatos.ts` → `derivar-notas.ts`, é curado
  à mão. **Qualquer solução na camada do pipeline não o alcança** — tem de entrar no plano por
  outra porta.

🔑 **`src/data/pistas.json` — as 10 são circuitos reais, mas só 2 carregam marca/pessoa.**
**8 são TOPÔNIMOS** (Monza, Spa-Francorchamps, Imola, Suzuka, Interlagos, Silverstone, Mônaco,
Nürburgring GP-Strecke) — são LUGARES. **2 não são:** `pista-red-bull-ring` (marca) e
`pista-montreal`, exibida como "Montreal (Gilles Villeneuve)" (pessoa).
🔑 **Isto abre um corte cirúrgico que o plano deve pesar:** renomear **2** em vez de 10 tocaria
muito menos a pendência **0(z)** (degradação silenciosa de traçado) e `docs/img/silhuetas.svg`,
que é VERSIONADA. **A parte jurídica é decisão do dev; o que está medido é só o custo técnico.**

~~⚠️ **A FIXTURE TAMBÉM TEM NOME REAL, e isso é auto-referente:**
`src/fixtures/dataset-semente/equipe-anos.json` (Ferrari, McLaren, Williams, Schumacher, Prost,
Senna) **e `pecas.json` da fixture** (McLaren, Williams).~~
✅ **RESOLVIDO: `pecas.json` no PR 3, `equipe-anos.json` no PR 7 (2026-08-31) — 243 → 0.**
Riscado no lugar; o parágrafo abaixo explica por que a fixture não podia ficar de fora, e continua
sendo a razão certa. **A fixture é o artefato que existe para
ser lido com segurança** (regra inviolável do `CLAUDE.md`) — se a troca não a cobrir, a próxima
sessão volta a ler nome real justamente no arquivo criado para evitar isso.

🔴 **O DATASET REAL ESTÁ NO HISTÓRICO DO GIT — 5 commits tocam `src/data/equipe-anos.json`.**
**Trocar o dataset daqui pra frente NÃO remove os nomes do histórico:** `git log`/`git show`
continuam servindo-os. Hoje o repo é privado (§Estado atual, evidência do 404), então não é risco
ativo; vira risco se o código abrir algum dia.
🔑 **Isto NÃO muda a ordem do roadmap** — o bundle servido é o risco imediato e é o que a troca
resolve. **Muda a definição de "pronto":** existe um item SEPARADO — reescrever histórico ou aceitar
o resíduo — que é **decisão do dev** e que não deve ser resolvido de passagem dentro do PR de troca.

🔴 **O ACHADO QUE MAIS IMPORTA PARA O DEPLOY PÚBLICO — código de PRODUÇÃO importa o dataset real.**
`src/ui/dataset-app.ts` importa `../data/equipe-anos.json` e é consumido por `src/ui/App.tsx:16`.
**Os 1.542 nomes reais vão no bundle**, não ficam confinados em teste. É load-bearing para o
bloqueador dos nomes reais (§Estado atual): trocar o dataset **não é** mexer só em fixture de teste.

🔴 **O RISCO SILENCIOSO ESTÁ NAS PISTAS, NÃO NAS EQUIPES — virou a pendência 0(z).** No caminho de
equipe, tudo que quebra, quebra alto (o `throw` do `balance.ts:50`). No de pista, não:
- **`tracadoDaPista` NÃO lança:** `TRACADOS_POR_PISTA[pistaId] ?? TRACADO_GENERICO`
  (**`src/ui/tracados.ts:613`** — ⚠️ âncora completada: é **`src/ui/`**, não `src/engine/`). Id sem
  par **degrada para a silhueta genérica em SILÊNCIO**.
- **A cerca não pega rename COORDENADO:** `src/ui/tracados.test.ts:63-67` itera `dataset.pistas` e
  exige `TRACADOS_POR_PISTA[pista.id]` definido. Pega divergência **entre** `pistas.json` e o mapa;
  **fica VERDE se os dois lados forem renomeados juntos** — e deixa obsoletos o `preview-redesenho`
  e `docs/img/silhuetas.svg`, **que é VERSIONADA** (§Estado atual).
- **`src/ui/TelaInicio.tsx:94`** tem non-null assertion **no caminho de FALLBACK**:
  `dataset.pistasById.get(pistaId) ?? dataset.pistasById.get(PISTA_CORRIDA_ID)!`, com
  `PISTA_CORRIDA_ID = 'pista-monza'` (`src/ui/fluxo-corrida.ts:28`). ✅ as duas âncoras conferidas.
  Renomear sem atualizar a constante dá **`undefined!` justo no ramo que existe para salvar o caso.**
🟡 **MITIGAÇÃO PARCIAL, medida por mim e AUSENTE do ditado — e ela NÃO fecha o risco:**
`medirParadasExtras` (`scripts/balance.ts:289-293`) tem `pista-monza`/`pista-spa`/`pista-suzuka`
hardcoded e **LANÇA** se faltar ⇒ rename de pista quebra o **harness** alto. **Mas ela não toca o
caminho silencioso** (`tracadoDaPista` + `TelaInicio.tsx:94`), que é o da TELA. **O risco continua
aberto** — quem ler isto como "o harness cobre" reabre o buraco.

---

*(Resumo global, retido do bloco arquivado em 2026-08-31.)*
**Concluído antes:** Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.8**, e a Fase 8 nos
PRs **8.1** (calendário sorteado), **8.2** (round-trip do save) e **8.4-mínimo** (o campeonato
deixou de ser inalcançável — tem seletor, encadeia corridas, salva e retoma).

## SEQUÊNCIA — o que sobrou

**🔢 ~~ATÉ FECHAR A FASE 3~~ — SEQUÊNCIA CUMPRIDA (atualizado em 2026-08-20, decisão do dev que
adiou o PR C do spike; ✅ RISCADA em 2026-08-28, no encerramento da fase):**
**~~3.5.2 → 3.5.3 → 3.5.4 → PR C → Fase 3 encerrada.~~** Os quatro passos foram entregues, mais o
**conserto da 0(s)** que o PR C obrigou. O PR C era o gate do `alarm()` e foi **reposicionado** para
o fim, não cancelado — motivo e gatilho de reavaliação na §"RETIDAS NO ARQUIVAMENTO".
✅ **A FASE 3 ESTÁ ENCERRADA desde 2026-08-27 (decisão ditada pelo dev). Ver a §"FASE 3 ENCERRADA"**,
no bloco da Fase 3 lá em cima, para a proveniência e para a **lista do que fica aberto apesar do
encerramento** — encerrada não quer dizer sem dívida.

**Os portões visuais saíram desta lista: os dois foram aprovados em 2026-08-07.**
**O teste do online foi FECHADO no PR 3.3.4 com todos os quatro casos validados pelo dev.**
**O alarme de divergência foi MOSTRADO ao jogador no PR 3.4.1 — SURFACING CONCLUÍDO.**

1. ✅ **A CORRIDA ONLINE — OS QUATRO PRs FEITOS E O PORTÃO VISUAL DO 4/4 APROVADO PELO DEV
   (2026-08-18). ITEM ENCERRADO.** Plano dos 4 PRs no `HISTORICO.md`; o da fase, em `PLANOS_ATIVOS.md` §"FASE 3". `b67ec2b`, `8a8088a`,
   `50906af`, `44d0dc8`+`8489b6f`. **A corrida online está fechada** — nada de código nem de veredito
   pendente nela. ~~O que fecha a Fase 3 agora é o **3.5 campeonato online**, cujo plano está aprovado
   e registrado em `PLANOS_ATIVOS.md` §"3.5 CAMPEONATO ONLINE".~~
   ✅ **ATUALIZADO em 2026-08-28: o 3.5 campeonato online FOI ENTREGUE (3.5.1 → 3.5.4) e a FASE 3
   ESTÁ ENCERRADA** — ditado pelo dev, ver a §"FASE 3 ENCERRADA".
2. ⬅️ **VEREDITO do dev sobre `preview/campeonato.html`** (as três telas do 8.3) — segue aberto.
4. **PR de INFRA — DESTRAVADO pela aprovação das silhuetas.** Era "pré-requisito caso as silhuetas
   fossem aprovadas"; com o 10/10, **deixa de ser pré-requisito e vira consolidação**: restrições
   geométricas como testes vermelhos + allowlist `LEGADO` que só encolhe. **Reavaliar o escopo com o
   dev antes de fazer** — pode ter encolhido junto.
5. 🛑 **Depois, o pit (7.9).**
6. **Decisão de arte ainda aberta:** o `88/40%` da zebra (seção própria abaixo) — não foi tocado
   pela aprovação dos portões.

## 🔒 NOMES FICTÍCIOS — DECISÕES DO DEV, ditadas em 2026-08-25. Não reabrir sem ele.

📌 **PROVENIÊNCIA, e ela é parte da decisão.** Estas três decisões foram **ditadas pelo dev em
2026-08-25**, nesta sessão, e transcritas por mim. Fica registrado que o commit `e1db1c9`
(2026-08-24) já havia gravado três vereditos **com o mesmo assunto** atribuindo-os ao dev — "Palavras
do dev", "decisão do dev, textual", "PLANO APROVADO pelo dev" — **sem que ele os tivesse dito**; foi
revertido em `ca53059`. 🔑 **O conteúdo de lá coincidir em parte com o que o dev decidiu de fato NÃO
o torna retroativamente válido** — aprovação inventada que por acaso acerta continua não sendo
aprovação, e é por isso que a proveniência entra escrita aqui em vez de o texto ser reaproveitado.
Regra de processo que saiu daí: `CLAUDE.md` §"NENHUM SUBAGENTE COMMITA".

🔒 **DECISÃO P — APROVADA. As 10 peças perdem a MARCA e o CÓDIGO DE MODELO, mantêm a INOVAÇÃO.**

    Efeito solo · Duplo difusor · Difusor soprado · F-duct · Amortecedor de massa ·
    Suspensão ativa · Seis rodas · DAS · Freio-direção · Carro-ventoinha

**Os ids mudam junto** — não é troca só de rótulo exibido.

🔒 **DECISÃO T — T1 ENTRA; T2 ADIADA (adiada, não recusada).**
- ✅ **T1 — `src/data/pistas.json`: `"Montreal (Gilles Villeneuve)"` → `"Montreal"`.** **Só o nome
  exibido; o id NÃO é tocado.** ✅ âncoras conferidas nesta sessão: o par está em `pistas.json:93-94`,
  `"id": "pista-montreal"` / `"nome": "Montreal (Gilles Villeneuve)"`. **Entra na trilha.**
- ⏸️ **T2 — `pista-red-bull-ring` fica FORA desta trilha. ADIADA; reavaliar quando a trilha
  principal fechar.** **Motivo do dev: `seedDaEtapa` consome id de pista**, então trocar o id **é
  mudança de COMPORTAMENTO, não rename** — e por isso exigiria **consertar a pendência 0(z) inteira
  junto**. ✅ âncora conferida nesta sessão: `src/engine/campeonato.ts:38-39` —
  `export function seedDaEtapa(seedBase: number, pistaId: string)` devolvendo
  `deriveSeed(seedBase, \`camp:${pistaId}\`)`. A 0(z) está registrada na §"MEDIÇÕES E AUDITORIAS DA TRILHA DE NOMES" (degradação
  silenciosa de traçado); **o motivo acima é auto-suficiente e não depende dela para se entender.**
- ✅ **CONTRA renomear as outras 9 pistas.** **O teste cego 10/10 provou que a GEOMETRIA carrega a
  identificação**, não o rótulo — ver §"OS DOIS PORTÕES VISUAIS". Renomear compra ~nada e paga o
  custo inteiro.

🔒 **DECISÃO H — (a): ACEITAR O RESÍDUO DO HISTÓRICO. Repo privado.**
🔴 **"PRONTO PARA DEPLOY" NÃO INCLUI O HISTÓRICO DO GIT — e isso é DECISÃO CONSCIENTE do dev, não
esquecimento.** A troca de dataset limpa o que é distribuído; `git log`/`git show` seguem servindo
nome real. ✅ **Medido nesta sessão:** **5 commits** tocam `src/data/equipe-anos.json` (`a7d54bb`,
`a711b38`, `bc60799`, `8d2493a`, `916ec41`). Quem ler "nomes fictícios entregues" e concluir "o repo
está limpo" está errado — esta linha existe para impedir essa leitura.
- ❌ **(b) reescrever o histórico está DESCARTADA.** Motivo do dev: **invalida todas as SHAs citadas
  no `ESTADO.md` e no `HISTORICO.md`** — e este projeto cita SHA o tempo todo (`1873925`, `ca53059`,
  `922bdd0`, `897121f`, `e1db1c9`…). O dano documental é maior que o ganho.
- 📌 **(c) REGISTRADA como a saída SE o código abrir um dia:** espelho público **a partir de árvore
  achatada**, preservando o repo privado e as citações internas de SHA intactas. Não é o plano de
  agora; é o caminho já escolhido para quando a pergunta voltar.

✅ **PLANO DE 7 PRs — APROVADO pelo dev, começando pelo PORTÃO.**
🔒 **A ORDEM É TRAVADA, ditada pelo dev em 2026-08-25:**
**1** portão · **2** funil de literais · **3** ✅ peças despidas + T1 (`e501b97`, **portão visual APROVADO pelo dev em 2026-08-27**) ·
**4** ✅ tabela de nomes (`cbe2bbc`, **amostra de 20 APROVADA pelo dev em 2026-08-27**) ·
⬅️ **5** `anonimizar` + diferencial · **6** A TROCA · **7** fixture e baseline a zero.
⚠️ **ATUALIZADO em 2026-08-25 — a redação anterior desta linha ficou MEIO-FALSA e por isso foi
corrigida no lugar, não contradita noutro arquivo.** Ela dizia que "o detalhamento PR a PR não foi
ditado pelo dev": **a ORDEM passou a ser ditada** (acima) e é travada; o que **segue não travado**
é o **conteúdo interno de cada PR**. **A distinção importa** — quem ler a versão antiga ao lado do
plano novo não saberia qual das duas governa, que é exatamente o modo de falha que este arquivo já
pagou várias vezes.
📋 **O detalhamento PR a PR está em `PLANOS_ATIVOS.md` §"NOMES FICTÍCIOS — o plano dos 7 PRs"**,
escrito em 2026-08-25 **e rotulado lá como proposta**, não como decisão travada. **Quatro itens
dependem do dev** e estão reunidos numa tabela no fim daquela seção — o maior deles é **quem
inventa os 458 nomes fictícios e com que critério**, que é decisão de produto.
🔴 **Não tratar nenhuma lista de 7 itens encontrada no commit revertido (`e1db1c9`) como aprovada.**
O plano novo não a reaproveitou: onde precisou de número, mediu.

## Decisões travadas da PALETA (7.8 — ✅ APROVADA pelo dev, não reabrir sem ele)

- 🔒 **Os três acentos da marca são IDÊNTICOS nos dois modos onde são PREENCHIMENTO.** Onde a cor
  vira TINTA (texto, ícone, linha de 1px) existe um token irmão `*Texto`, mode-scoped. Não é
  preciosismo: `#FFB800` e `#00D26A` dão **1,53:1 e 1,78:1** sobre o branco quente — é teto da cor.
- 🔒 **`primaria/fundo` é 3:1, não 4,5** (decisão do dev). O vermelho é botão/destaque/carro, não
  corpo de texto, e `#FF1801` tem teto de 5,383 contra preto puro — exigir 4,5 significaria
  abandonar o hex da marca. Vermelho em texto usa `primariaTexto`.
- 🔒 **Todo token `pista*` é MODE-INVARIANTE** e o painel do replay é ilha escura nos dois temas.
  A regra 1 da Fase 7 é impossível sobre base clara (teto do asfalto 0,0397 vs. base clara 0,877).
  `fundo`/`fundoAfundado`/`fundoElevado` **saíram da união `CorDePista`** — a regressão nem compila.
- 🔒 **`borda` continua DECORATIVA**, fora de `PARES_CONTRASTE`. Verificado, não assumido: a
  separação card/base é fraca nos DOIS modos (1,213 escuro / 1,132 claro), então o claro não
  introduziu problema novo.
- **Zebra é vermelho + branco** (era amarelo + salmão) — o zebra real de F1.
- **A cascata do tema tem três blocos e a ordem importa:** `:root` escuro → `@media` escopado com
  **`:root:not([data-tema])`** → `[data-tema]` manual. Sem o `:not()`, o toggle não vence o SO.

## Decisões travadas do redesenho (✅ silhuetas APROVADAS 10/10 — não reabrir sem o dev)

- 🔒 **TODA guarda geométrica nova neste projeto MEDE EM ARCO, NUNCA EM ÍNDICE** (dev, 2026-08-01).
  **Palavras do dev: "já custou duas vezes".**
- **Era dos traçados: layout MODERNO/ATUAL.** Nürburgring = GP-Strecke, não Nordschleife.
- **`LARGURA_ASFALTO = 34` mantida.** Separação ≥ 34 u e raio ≥ 20 u; as 10 passam.
- **Escala UNIFORME por pista** (nunca esticar x e y independentemente). Consequência aceita:
  Interlagos não enche a moldura na horizontal.
- **Moldura de desenho: x ∈ [56, 924], y ∈ [36, 564].**
- **Nada de métrica automatizável de reconhecimento.** Hausdorff contra a pista real recusado.
- **A detecção de zebra roda no traçado de CONTROLE**, não na curva suavizada.

## 🎨 DECISÃO DE ARTE ABERTA — 88/40%, com o parque inteiro na mesa

`JANELA_CURVATURA_ZEBRA = 88` foi calibrado contra a Monza de 16 pontos, que **não existe mais**.
Reabrir é decisão de arte do dev. Medido no parque novo: o teto de 40% **morde em 8 das 10** — só
Spa (33,4%) e Red Bull Ring (28,0%) não perdem candidato. Caso extremo, o Nürburgring: **29 trechos
/ 50,0% sem teto contra 24 / 38,7% com ele** — é o teto que segue impedindo a faixa contínua que o
dev reprovou.

## 🟡 RISCO ATIVO — `party/` TEM COBERTURA PARCIAL (era 🔴 "NÃO TEM COBERTURA AUTOMATIZADA")

> 🟡 **Rebaixado de 🔴 para 🟡 em 2026-08-20**, junto com a pendência 9 e por decisão do dev. **O
> título antigo virou falso no PR B** e por isso foi corrigido, não só anotado: `party/seeds.test.ts`
> executa a casca de verdade. **A seção CONTINUA ABERTA** — o inventário do que segue descoberto
> está no bloco 📊 no fim dela, e o gate do `alarm()` é o mais relevante deles.

**Registrado como pendência própria pelo dev em 2026-08-18**, ao aprovar o 3.5.1 — explicitamente
**não** como linha dentro daquele PR. É a camada que **sorteia**, **reidrata** e que vai **carregar
o cursor no 3.5.2**, e nenhum teste a executa.

**O que foi MEDIDO (não deduzido), durante a revisão do 3.5.1:**

- **Nada no repositório importa `party/sala.ts`.** `grep` por import/require de `party` em `src/` e
  `scripts/` devolve zero (as ocorrências que aparecem são `partyserver`/`partykit`, o pacote).
- **`src/net/cerca-lint.test.ts` não o alcança:** ele roda o ESLint sobre arquivos SINTÉTICOS
  (`party/zz-cerca.ts`), para provar que a cerca está configurada — não sobre o arquivo real.
- **`src/ui/contrato-corrida-online.test.ts` exclui `party/` de propósito** da varredura.
- As únicas menções a "party/sala" em arquivos de teste são **comentários** em
  `src/net/barreira-corrida.test.ts`, não asserções.

**🔴 A consequência já se materializou UMA VEZ, e é por isso que isto é risco e não observação.**
O baseline do 3.5.1 **declarou cobertura que não existia**: todo o bloco `B-indep` rodava sobre uma
fixture literal passada a `criarSala`, e um comentário em `harness.ts` afirmava que
`campeonato-online.test.ts` provava que a produção sorteia. **Medido: as mutações M5 (derivar por
índice) e M6 (recoplar o 11º slot) aplicadas dentro de `party/sala.ts` — o sítio real — deixavam a
suíte INTEIRA verde, 1509/63.** Foi bloqueante da revisão.

**O que existe hoje como mitigação, e o tamanho dela:** uma cerca **textual** sobre o arquivo (ver
`PLANOS_ATIVOS.md` §"A CERCA DE M5/M6 É TEXTUAL"). Ela pega a mutação desatenta e **não** pega quem
contorna — um `xmur3` inline ou uma chamada por alias passam.

🛑 **O que o 3.5.2 herda:** o cursor passa a se mover, e quem o move é a casca (`alarm()` +
`aoPassarOTempo`). O gate de sala corrompida no `alarm()` (aviso A2 da revisão do 3.5.1) **também
não tem teste que o execute** — foi verificado por leitura.

✅ **A DECISÃO FOI TOMADA — dev, 2026-08-19: adotar `@cloudflare/vitest-pool-workers` ANTES do
3.5.2.** Esta seção registrava a pergunta em aberto; **decidido que sim.** Motivo, gate de versão
medido e custos residuais estão na **pendência 9**.

📊 **ESTADO DA SEÇÃO em 2026-08-19, pós PR A + PR B (ambos mergeados na `main`):**
- ✅ **"nenhum teste a executa" DEIXOU DE SER VERDADE.** `party/seeds.test.ts` executa o sorteio real
  (`criarSeNova` → `criar`) e a reidratação pós-`evictAllDurableObjects()`. `npm run test:party` 8/8.
- ✅ **A consequência que já se materializou uma vez está coberta:** M6 (recoplar o 11º slot) agora
  cai comportamentalmente, não só na cerca textual.
- 🔴 **A SEÇÃO CONTINUA ABERTA, e o motivo é específico:** `onMessage`, `onClose`, `encerrar`, CORS e
  a propriedade RPC-vs-HTTP seguem **sem nenhum teste**, e o **gate do `alarm()` (aviso A2) também**
  — ele é o PR C, que **não foi feito**. O 3.5.2 põe o cursor exatamente ali.
  ➡️ **ATUALIZAÇÃO 2026-08-20:** o PR C foi **adiado por decisão do dev** para **depois do 3.5.4**
  (sequência **3.5.2 → 3.5.3 → 3.5.4 → PR C → Fase 3 encerrada**). ~~Enquanto ele não vier, **este
  parágrafo é a descrição corrente do risco, não histórico** — e o 3.5.2 abre ciente disso.~~
  ➡️ **ATUALIZAÇÃO 2026-08-28 (encerramento da Fase 3 ditado pelo dev — ver a §"FASE 3 ENCERRADA"):
  o PR C FOI FEITO** (`party/alarme.test.ts`, 2026-08-23), então a sentença riscada acima envelheceu.
  🔒 **O que NÃO envelheceu, e é o que fica valendo:** `onMessage`, `onClose`, `encerrar`, CORS e a
  propriedade RPC-vs-HTTP **seguem sem teste**. É por isso que a **pendência 9 ficou em 🟡 e não em
  ✅** no encerramento — encerrada não quer dizer sem dívida.
  ⚠️ **CORREÇÃO MEDIDA EM 2026-08-20 — a redação anterior deste item era FALSA e por isso foi
  corrigida aqui, não só contradita abaixo.** Ela dizia: *"o 3.5.2 exercita `onMessage` (é por onde o
  atestado da barreira chega e o cursor anda), então a lacuna de `onMessage` encolhe como efeito
  colateral"*. **Não encolheu — o 3.5.2 NÃO exercitou `onMessage`, e a lacuna está do mesmo tamanho.**
  Medido, não deduzido: o teste do cursor é `src/net/cursor-etapas.test.ts`, que roda em `npm test` e
  chama **`aoReceber`** — o redutor PURO de `src/net/`. `onMessage` vive em `party/sala.ts:238`, é
  a casca, e **nenhum arquivo de `party/` foi tocado pelo 3.5.2**: `npm run test:party` segue **8/8**,
  os mesmos oito do PR B. 🔑 **A lição por trás do erro:** "o PR exercita X" foi inferido de *o PR
  mexe na lógica que X carrega*, e as duas coisas são diferentes quando existe um redutor puro no
  meio — que é exatamente a arquitetura deste projeto. **`aoReceber` testado não é `onMessage`
  testado.**
  ✅ **MAS a lacuna encolheu por OUTRO caminho, no mesmo dia:** o 3.5.2 acrescentou cobertura
  comportamental à casca pelo lado da CRIAÇÃO: `party/seeds.test.ts` ganhou **dois testes** (a
  cerca de `nEtapas` do aviso A5 + a anti-vacuidade dela), e a suíte `npm run test:party` — que é
  `seeds.test.ts` **mais** `smoke.test.ts` — foi de **8 para 10**. **Isso NÃO é `onMessage`, `onClose`, `encerrar`, CORS nem o gate
  do `alarm()`** — nenhum deles mudou de tamanho. Registrado aqui só para que a contagem de
  `test:party` não pareça ter mudado sozinha.
- 🔴 **ACHADO DO 3.5.2 (2026-08-20) QUE PERTENCE A ESTA SEÇÃO — a casca podia declarar o FORMATO
  ERRADO sem nenhum portão notar.** `M-nEtapas` (trocar `N_ETAPAS_CURTA` por `1` na chamada de
  `criarServidor` em `party/sala.ts`) sobrevivia a typecheck 0, eslint 0, `npm test` 1531/1531 e
  `npm run test:party` 8/8 — **mesma FORMA do bloqueante do 3.5.1** (M5/M6 no sítio real, suíte
  verde a 1509/63), agora sobre `nEtapas` em vez das seeds. ✅ **Fechado no mesmo PR** por cerca
  comportamental. 🔑 **A lição que fica maior que o caso: parâmetro obrigatório sem default pega a
  OMISSÃO, não o VALOR ERRADO** — quem escrever "é obrigatório, então está protegido" está errado
  pela metade.
- 🔒 **M5 SEGUE INDETECTÁVEL COMPORTAMENTALMENTE, PARA SEMPRE**, e por isso **a cerca textual de
  `src/net/campeonato-online.test.ts` NÃO SAI.** Seeds derivadas por índice também são distintas
  entre si e entre salas; e não dá para fixar a `seedMestre` e comparar salas, porque `criar()` só
  roda com o storage vazio. A matriz de cobertura medida vive no docblock da cerca.
  ⚠️ **A ressalva do 0(p) continua valendo e NÃO foi resolvida pela cobertura nova.**
🔒 **A regra de método que esse PR não pode furar:** o baseline vermelho **não pode ser M5 nem M6** —
a cerca **textual** já pega as duas, então as duas cercas ficariam vermelhas juntas e o PR não
provaria nada sobre o teste NOVO. O baseline tem que ser uma mutação que a cerca textual
**provadamente não pega** (`PLANOS_ATIVOS.md` §"A CERCA DE M5/M6 É TEXTUAL" lista os furos), com critério de sucesso
**cerca textual VERDE + teste comportamental novo VERMELHO**.

*(Texto original da pergunta, preservado:)* Vale decidir, ANTES do 3.5.2, se a
casca deixa de ser terra sem teste; a opção conhecida é `@cloudflare/vitest-pool-workers`, que é
**dependência nova e decisão do dev**, não minha.
## ✅ RISCO ATIVO FECHADO — divergência do ausente DETECTADA E VISÍVEL

> 📦 **Corpo ARQUIVADO em 2026-08-19** → `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md`" →
> §"§RISCO ATIVO FECHADO". Em uma linha: o ausente é a **única** decisão que cada cliente toma
> sozinho; divergir furava o pool em silêncio; o detector do **3.4** acusa e o **3.4.1** mostra.
> 🔒 **As duas RESSALVAS ficaram aqui porque PERMANECEM:**

**RESSALVAS — garantias que o alarme NÃO oferece:**

1. **A garantia é "na âncora terminal", NÃO "no primeiro divergente".** Appends rápidos e sucessivos
   derrubam atestados de âncora intermediária dos retardatários, porque o balde só guarda a maior.
   Vale no fim, quando todos convergem. Não é "detecção instantânea em tempo real", é "certificação
   pós-convergência".
2. **Cliente com bundle em cache fica fixo em versão `''` e tranca os atuais com `versao-divergente`.**
   O erro não carrega qual versão a sala espera — jogador não sabe que precisa de F5 forçado.
   Limitação conhecida.

## 🔐 AUDITORIA DE SEGURANÇA — OS 17 ITENS (S1–S17), registrados em 2026-09-01

> 📌 **PROVENIÊNCIA, e ela é parte do registro — ler ANTES da tabela.** Esta seção segue a mesma
> disciplina da §"NOMES FICTÍCIOS — DECISÕES DO DEV", escrita depois do `e1db1c9` (o commit que
> gravou aprovações que nunca existiram).
>
> - **Quem MEDIU:** uma **sessão ANTERIOR**. **Não fui eu, e nada nesta tabela é medição desta
>   sessão** — exceto as três linhas explicitamente marcadas `conferido nesta sessão`, abaixo.
> - **Quem DITOU o registro:** o **dev**, nesta sessão, em **2026-09-01**, com o status item a item.
> - 🔴 **O MÉTODO NÃO ESTÁ REGISTRADO NESTE REPOSITÓRIO, e isso é MEDIDO.** Antes deste commit,
>   `S1`–`S17` **não existia em arquivo nenhum**: o `grep` sobre `*.md` devolve apenas o `S1` da
>   numeração de **sugestão do `senior-reviewer`** (esquema diferente, em `HISTORICO.md:2338` e
>   `:5561`, citado aqui em `:987` e `:995`). **Não há a lista dos 17, não há critério, não há
>   script.**
> - 🔑 **É a situação EXATA do 33/6/2** (§"MEDIÇÕES E AUDITORIAS"): número sem método não é
>   falsificável — qualquer contagem nova diverge dele sem que se possa dizer qual das duas erra.
>   **A diferença é de dono e de destino: lá o número era MEU e foi APOSENTADO; aqui é do dev e é
>   REGISTRADO.** O que não se pode fazer é chamá-lo de medição desta sessão, e não se faz.
> - 📌 **O que isso OBRIGA, e é decisão do dev:** §Convenções, *"medição cujo script não fica em
>   disco não é reprodutível"* — se algum destes vereditos for sustentar um PR, o recorte que o
>   produziu tem de virar rastreado. **Nada foi feito a respeito nesta sessão.**

### A tabela completa

| item | status | veredito, como ditado | mapeamento |
|---|---|---|---|
| **S1** | ✅ **FECHADO** | teto de 5/IP por janela de 10 s no `POST /criar-sala` | fechado no **PR H1**, 2026-09-01 |
| **S2** | ✅ **FECHADO** | teto de 64 conexões por sala, contando TODAS — não só o roster | fechado no **PR H2**, 2026-09-01 — ⚠️ **baliza a 0(y), não a fecha**; ver 0(ag) |
| **S3** | 🟡 PARCIAL | `difundir()` checa identidade, **mas sem rate limit inbound** | — |
| **S4** | ✅ **FECHADO** | `Origin` validado no upgrade, reusando a allowlist do H1 | fechado no **PR H2**, 2026-09-01 |
| **S5** | 🔴 ABERTO | nenhum detalhe ditado | `= M4` (não conferível) |
| **S6** | ✅ FECHADO | **falso positivo**, 3ª confirmação | — |
| **S7** | 🔴 ABERTO | nenhum detalhe ditado | — |
| **S8** | ✅ FECHADO | `crypto.getRandomValues`, **32 bytes, base64url** | ⚠️ **não casa com o repo** — ver abaixo |
| **S9** | ✅ **FECHADO** | CORS com allowlist; o curinga exige **dois** sinais | fechado no **PR H1**, 2026-09-01 |
| **S10** | 🟡 PARCIAL | `aplicar()` só grava quando muda, **mas o tique roda e cobra CPU** | — |
| **S11** | ✅ FECHADO | **zero `dangerouslySetInnerHTML`**, React escapa em todos os sítios | ✅ metade conferida nesta sessão |
| **S12** | 🔴 ABERTO | nenhum detalhe ditado | — |
| **S13** | ⬜ **NÃO DITADO** | **ausente das três listas** — ver a lacuna 1 | — |
| **S14** | ⬜ **NÃO DITADO** | **ausente das três listas** — ver a lacuna 1 | — |
| **S15** | 🔴 ABERTO | nenhum detalhe ditado | `= A4` (não conferível) |
| **S16** | ✅ FECHADO | `MAX_BYTES_MENSAGEM` checado **ANTES** do `JSON.parse` | ✅ conferido nesta sessão |
| **S17** | 🔴 ABERTO | nenhum detalhe ditado | — |

**Placar ditado em 2026-09-01: 4 fechados · 2 parcialmente mitigados · 9 abertos = 15.**
🔄 **ATUALIZADO em 2026-09-01, pelo PR H2: o S2 e o S4 passaram a ✅ FECHADO — também por
IMPLEMENTAÇÃO.** Placar corrente: **8 fechados · 2 parciais · 5 abertos**.
⚠️ **O ✅ DO S2 TEM RESSALVA, e ela precisa viajar junto com a linha da tabela:** o teto LIMITA o
socket quieto, não o EXPIRA. A pendência **0(y)** por isso **NÃO foi fechada** — ela foi
**balizada**, e o resto virou a **0(ag)**. Um `✅` lido sem esta linha diz mais do que o código faz.
🔴 **A NOTAÇÃO `(c)` → `(a)` DO PEDIDO DE DOC NÃO EXISTE NESTA TABELA — e é a SEGUNDA vez que
ela é pedida.** A mesma discrepância está registrada para o H1, três parágrafos abaixo. A tabela
sempre usou 🔴/🟡/✅; os dois foram para **✅**, que é a leitura evidente. **A notação não foi
inventada nem nas duas vezes.**

🔄 **ATUALIZADO no mesmo dia, pelo PR H1: o S1 e o S9 passaram a ✅ FECHADO — por IMPLEMENTAÇÃO,
não por medição.** Placar corrente: **6 fechados · 2 parciais · 7 abertos**. ⚠️ **A distinção não é
formalidade:** os 4 originais foram fechados por alguém MEDIR que não havia problema; estes dois
foram fechados por CÓDIGO NOVO, com baseline vermelho e sete mutações. Ver a §"Onde parei".
⚠️ **A notação `(a)`/`(c)` que o pedido de doc citou NÃO EXISTE nesta tabela** — ela sempre usou
🔴/🟡/✅. Os dois foram para ✅, que é a leitura evidente; a notação não foi inventada.
🔒 **"Fechado por medição" aqui significa NÃO CONSERTA, REGISTRA** — formulação do dev. Nenhum diff
de produção saiu destes quatro.

### 🔴 Lacuna 1 — S13 e S14 NÃO FORAM DITADOS. O ditado cobre 15 dos 17.

**Aritmética, e ela é o achado:** fechados `S6 · S8 · S16 · S11` = **4**; parciais `S10 · S3` = **2**;
abertos `S1 · S2 · S4 · S5 · S7 · S9 · S12 · S15 · S17` = **9**. **4 + 2 + 9 = 15**, e a numeração
ditada pula exatamente **S13 e S14**.

🔑 **Registrado como lacuna em vez de resolvido de passagem, e o motivo é de regra.** As saídas
disponíveis eram inventar um status, silenciar os dois, ou renumerar os 15 para fechar em 17 — **as
três fabricam conteúdo atribuído ao dev**, que é a ocorrência nº 3 do `CLAUDE.md` (o `e1db1c9`).
**Ficam em branco até ele dizer.**
📌 **As leituras possíveis, e NENHUMA foi escolhida por mim:** (a) os dois existem e o status não foi
ditado; (b) a auditoria tem 15 itens e "17" é o rótulo errado; (c) foram fechados antes e saíram da
lista. **É pergunta ao dev.**

### ⚠️ Lacuna 2 — a descrição do S8 não corresponde a sítio nenhum deste repositório

**MEDIDO NESTA SESSÃO** (isto é medição minha, e por isso entra rotulada). O ditado diz
`crypto.getRandomValues`, **32 bytes, base64url**. Os três sítios que sorteiam segredo aqui são:

- **o token de reentrada** — `crypto.randomUUID`, **128 bits**, gerado na casca (`party/sala.ts`, no
  `onMessage`; docblock em `src/net/sala.ts:573`). **Não é `getRandomValues`, não é 32 bytes, não é
  base64url.**
- **o código da sala** — `sortearCodigo` (`party/sala.ts:406-409`): `Uint8Array(TAMANHO_CODIGO / 2)`,
  ou seja **3 bytes**, renderizados em **hex** por `codigoDeBytes`. É `getRandomValues`; **não** são
  32 bytes nem base64url.
- **as seeds** — `Uint32Array` (`party/sala.ts:91` e `:114`), a `seedMestre` sendo **um único
  uint32** — que é a pendência **0(i)**, aberta justamente por ser estreita demais.

🔑 **A discrepância fica registrada, NÃO resolvida — e não é "o dev errou".** Três leituras cabem: o
S8 pode descrever artefato fora deste repositório; pode descrever um alvo pretendido em vez do
estado atual; ou o número pode ter envelhecido. **Ancorar o S8 num destes três sítios seria inventar
a âncora**, que é a classe de erro que este arquivo já corrigiu seis vezes na §"MEDIÇÕES E
AUDITORIAS". **É pergunta ao dev.**
🔴 **E ela importa para a decisão, não é preciosismo:** se o S8 fosse o token ou a seed, um
`✅ FECHADO` entraria em conflito direto com a **0(i)**, que registra 32 bits enumeráveis e segue
**ABERTA**.

### O que o repositório CONFERE, e o que ele não tem como conferir

⚠️ **ATUALIZADO em 2026-09-01 pelo PR H2 — o parágrafo abaixo descrevia os DOIS como abertos, e
o S2 fechou. O texto original fica; só esta ressalva entra na frente**, porque o elo `S2 = C2` que
ele documenta **continua correto** e é justamente o que sustenta a 0(y).
🔑 **E a 0(y) NÃO fechou junto com o S2** — o teto conta o socket quieto, não o expira. A
pendência segue **ABERTA em 🟡**, com a metade restante na **0(ag)**. **É exatamente por isso que
"S2 fechado" e "0(y) fechada" não são a mesma afirmação.**

✅ **S2 = C2 ⇒ pendência 0(y) — ÚNICO elo do mapeamento que este repositório confirma, e ele bate.**
O `C2` do audit de 2026-08-24 é *"a guarda de 22 protege o ROSTER, não as CONEXÕES"*, registrado como
**0(y)** na §Pendências e **ABERTO** lá. O dev lista o **S2 como ABERTO**. **Os dois concordam.**

🔴 **S1 = C1, S4 = A3, S5 = M4, S15 = A4 — NÃO CONFERÍVEIS, e a falta é do arquivo, não do dev.**
A §"MEDIÇÕES E AUDITORIAS" diz textualmente que *"a numeração C1/C2/C3 é do audit e NÃO existe neste
arquivo"*, e daquele audit **só o C3 (refutado) e o C2 (⇒ 0(y)) tiveram o conteúdo registrado**. **O
C1 nunca foi descrito aqui.** De `A3`, `M4` e `A4` não há sequer o esquema de letras registrado.
⚠️ **Pior que ausente, `C1` é AMBÍGUO neste arquivo:** ele nomeia também o **bloqueante C1 da 0(s)**
(o zumbi de sala corrompida) e o **C1 do PR 6** (a normalização CRLF do digest) — rótulos de revisões
diferentes. **Dizer a qual deles o `S1 = C1` se refere exige o dev.**

✅ **S16 — CONFERIDO NESTA SESSÃO, e o veredito procede.** `party/sala.ts:257-264`: `onMessage`
descarta não-string e o teto `if (message.length > MAX_BYTES_MENSAGEM)` responde **antes** de
`carregar()` e de qualquer `JSON.parse`, devolvendo `escolha-grande-demais`. O comentário no sítio
explica o porquê (`MAX_BYTES_ESCOLHA` só age depois de parsear, e só para `escolher`).
⚠️ **Nuance medida por mim, que NÃO invalida o veredito e por isso entra como nuance:** a comparação
é sobre **`message.length`** — unidades de código UTF-16, **não bytes**, apesar do nome da constante.
Para conteúdo não-ASCII o teto real em bytes é **maior** que o nominal (até ~3× em UTF-8). **Continua
sendo um teto rígido antes do `parse`**, que é o que o S16 afirma; o que não é exato é a unidade.
**Nada foi mexido.**

✅ **S11 — a METADE mecânica está conferida nesta sessão: `dangerouslySetInnerHTML` dá ZERO** em todo
o repositório fora de `node_modules` (`.ts`/`.tsx`, incluindo testes e `preview/`), e `innerHTML`
também não aparece em código de produção.
⚠️ **A outra metade — *"React escapa em todos os sítios"* — NÃO foi re-medida por mim**, e é uma
afirmação universal. Fica como ditada, não como conferida. A distinção é a mesma que separa o
substituto 3 do inventário de nomes (binário, medido no bundle) dos proxies que foram aposentados lá.

### O que esta seção NÃO faz

🔒 **Não vira pendência numerada `0(ag)`…, e isso é deliberado.** A numeração `S` é de outra
auditoria, e este arquivo tem precedente explícito de que **numeração estrangeira fica estrangeira**
(o `C2` só virou `0(y)` quando alguém descreveu o conteúdo dele por inteiro aqui). Fundir os 17 na
§Pendências inventaria um mapeamento que o dev não ditou, e a própria §"MEDIÇÕES E AUDITORIAS" já
registra que **editar a §Pendências ATIVAS merece PR próprio**.
📌 **Ligar cada `S` à pendência `0(…)` correspondente é trabalho PRÓPRIO e decisão do dev** — hoje só
o `S2 ⇒ 0(y)` está ligado, porque é o único que o arquivo sustenta.

## Pendências ATIVAS

0. **Abertas na Fase 3:**
   (a) **`montarJogadores` está duplicado** entre `fluxo-draft.ts:117` (UI) e `congelarRoster`
   (`src/net/sala.ts`), assim como `QTD_JOGADORES = 22`. Hoje a divergência é **vigiada** por um
   `it.each` de conformidade (`facil`×`dificil` × {2,3,5,22} humanos) contra
   `iniciarDraft(...).jogadores`; o certo é **extrair pra `src/engine/` e ter uma função só** —
   refactor pequeno e separado, candidato a rodar antes do 3.1b. ⚠️ Limite conhecido: a
   conformidade **não** trava o `sort` de `congelarRoster` (o array offline já chega ordenado);
   quem trava é o teste de ordem embaralhada.
   (b) ✅ FEITA no 3.1b · (c) ✅ RECONEXÃO feita no 3.2.1 · (d) ✅ `seq` resolvido no 3.2, **falta
   ainda** correlacionar erro↔comando · (e) ✅ prazo do turno tem dono no 3.2, **falta a UI** mostrar
   o cronômetro · (f) ✅ 3.4 + 3.4.1 feitos. **Texto integral das cinco:** `HISTORICO.md`
   §"Pendências FECHADAS, arquivadas do `ESTADO.md`".
   (g) **15% de perda com conexão intacta não é modo de falha real de WebSocket** (nota da revisão
   do 3.2): TCP entrega ou a conexão cai. O stress do harness continua válido como stress; só não
   deve ser lido como "a rede real perde 15%".
   (h) **Token por origem, não por aba** (medido no 3.3.4): duas abas do mesmo navegador compartilham
   o `localStorage` e portanto o token `f1f:token-sala:<código>`. Com o anfitrião já dentro, abrir o
   link numa aba nova faz ela reentrar **como o anfitrião**, e a sala conta 1 jogador não 2. **Não
   afeta jogo real** (cada pessoa está em seu navegador); **corrompe o teste na própria máquina**.
   Contorno documentado em `docs/jogar-em-rede.md` (segundo navegador ou janela anônima).
   (i) 🔴 **NOVA (PR 1/4 da corrida online) — a `seedMestre` tem 32 BITS e é enumerável. DECISÃO DO
   DEV.** Medido: `party/sala.ts` sorteia **um único uint32** (`crypto.getRandomValues` sobre 1 slot),
   e `deriveSeed` é `xmur3` — hash **não-criptográfico** de 32 bits, não função unidirecional. Como a
   `seedDraft` é publicada **desde o lobby** (antes até do handshake de versão), quem enumerar as 2³²
   sementes contra ela recompõe a `seedMestre` — sobram ~1-2 candidatos, e **nada no draft observado
   desempata mais que isso, porque tudo nele deriva da mesma seed** — e com ela a `seedCorrida`,
   **sem nunca passar pelo portão do PR 1**.
   **O que o portão compra, então:** ele fecha o caminho trivial, que era a régua explícita do dev
   ("não é hack, é chamar uma função"). **O que ele NÃO compra:** resistência a um script.
   ⚠️ A afirmação falsa ("da `seedDraft` não se recompõe a `seedMestre`") era **pré-existente no
   `tipos.ts` desde o 3.1a** e foi corrigida no PR 1/4 — os docblocks agora dizem a propriedade real.
   **Conserto de fundo:** alargar a entropia da `seedMestre`. Resolve de verdade (com uma mestra
   larga, a `seedDraft` de 32 bits não permite mais enumerar), **não** exige mexer na engine — ela só
   vê seeds derivadas —, mas mexe na semeadura do online inteiro e no estado persistido do Durable
   Object. **PR próprio, e é decisão do dev, não minha.**
   (j) **NOVA (PR 2/4 da corrida online) — o atestado de hash da corrida ATIVA UMA VEZ.** `useSalaOnline` chama `corridaDaSala` em `useMemo` e a ref fica estável entre renders; `registrarAtestado` ativa sobre mudança de `corrida`. **Limitação:** a estabilidade depende de `cliente.draft` ter REFERÊNCIA estável entre re-sincronizações sem evento novo — rastreada manualmente em `sincronizarDraft`, **sem asserção própria** porque o projeto não tem jsdom/@testing-library pra renderizar o hook. **Se `sincronizarDraft` mudar** (ex.: reconstruir de forma diferente, remover memoização), o efeito volta a reatestar cada snapshot, **silenciosamente**. Nenhum teste vai falhar — é a mesma classe de regressão invisível que (d) lista. Registrado para que ninguém apague o `useMemo` achando que está ocioso.
   (k) ✅ **FECHADA no 3.5.2 (2026-08-20) — o conjunto DEIXOU de congelar.** `elegiveisDaBarreira`
   passou a exigir **conexão viva** além de humano e não-ausente; quem reconecta volta a ser
   elegível sozinho. Era limite aceitável com UMA corrida (timeout pago uma vez) e virava bloqueante
   com N etapas: quem fechasse a aba na etapa 1 faria **cada** etapa seguinte pagar
   `TIMEOUT_FIM_DE_CORRIDA_MS`. Baseline vermelho visto (`M-eleg`). ⚠️ **Preço registrado como
   0(u3):** blip de rede de 3 s tira o jogador dos elegíveis e a sala anda sem ele.
   *(Texto original, preservado:)* **LIMITE CONHECIDO (PR 3/4 da corrida online) — congelamento de elegíveis.** O conjunto de elegíveis para a barreira **congela quando o draft conclui**. Ninguém vira ausente **depois** — qualquer dropout durante o replay ainda custa o timeout cheio (`TIMEOUT_FIM_DE_CORRIDA_MS = 5 min`). Sem reconexão de corrida implementada. Documentado e testado.
   (l) **NOVA (PR 4/4) — F5 no meio da corrida volta pro resumo.** `naCorrida` é estado LOCAL do
   `FluxoOnline`, não vem do servidor; recarregar a página o perde e o jogador clica "Ir pra
   corrida" de novo. **Aceitável porque a corrida é determinística** — rever é rever exatamente a
   mesma corrida. Consequência ligada a (k): quem dá F5 **não reatesta**, então a sala paga o
   `TIMEOUT_FIM_DE_CORRIDA_MS` inteiro. Persistir exigiria campo novo no protocolo para uma
   conveniência, não para uma correção.
   (m) **NOVA (PR 4/4) — o ramo da corrida não tem cobertura automática.** `FluxoOnline.tsx:218-230`
   é a linha central do PR e nenhum teste a renderiza: `naCorrida` só vira `true` por clique e o
   projeto não tem jsdom. O teste monta `FluxoCorrida` direto, que é **outro sítio de chamada** —
   então "o `onChegouAoResultado` está ligado" e "é o `FluxoCorrida` que aparece" ficam só no
   preview. **Fechar barato:** extrair o ramo `draft.fase === 'concluido'` para um componente
   exportado que receba `naCorrida`/`corrida` por prop, e renderizá-lo no teste. Registrado pela
   revisão, não feito.
   (n) **ABERTA, decisão de arte (PR 4/4) — dois botões primários lado a lado.** No `TelaResumo`,
   "Ir pra corrida →" e "← Voltar ao início" usam **ambos** `botao-primario` (`TelaResumo.tsx:62` e
   `:66`): a ação principal não se distingue da secundária. **Pré-existente do fluxo offline** — o
   PR 4 só torna o par visível no online pela primeira vez. Conserto seria trocar o segundo para
   `botao-secundario`; **é decisão do dev.**
   (o) 🔴 **NOVA (planejamento do 3.5, 2026-08-18) — ASSIMETRIA DE POSTURA DE SEGURANÇA, endereçada
   ao PR DE ALARGAMENTO DE ENTROPIA (o conserto de fundo da pendência (i)).** Com o `B-indep`
   aprovado, o **campeonato** online passa a ter as pistas protegidas durante o draft (seeds e
   `seedCalendario` sorteadas, não derivadas), mas a **corrida avulsa** online continua com
   `seedCorrida` **DERIVADA** da `seedMestre` — e sob (i) ela é recomponível desde o lobby. **Dois
   caminhos do mesmo produto ficam com posturas diferentes.**
   **Decisão explícita do dev em 2026-08-18: NÃO entra no 3.5** — *"o 3.5 já está com quatro PRs, o
   tamanho da corrida online inteira"*. Fica para o PR de alargamento de entropia, que é onde (i)
   também vive. ⚠️ **O custo marginal lá é quase zero** (o `EstadoSala` já terá segredos sorteados
   pelo 3.5.1): quem pegar aquele PR deve tratar (i) e (o) **juntos**, não um de cada vez.
   (p) ✅ **FECHADA em 2026-08-19 — MEDIDA PELO DEV EM PRODUÇÃO, NÃO DEDUZIDA.**
   🔑 **O MÉTODO, porque é ele que faz a medida valer** (registrado aqui a pedido do dev, 2026-08-19,
   para não depender do `HISTORICO.md`): **(1) despejo** do storage do Durable Object da sala `420320`
   (pós-3.5.1) via `scripts/despejar-seeds.ts`, anotando os 11 números; **(2) derrubada real** do
   worker — Ctrl-C no `npm run sala`, não um reload nem um restart de dev server; **(3) reconexão**,
   forçando a sala a reidratar do storage em vez de servir cache de memória; **(4) segundo despejo**
   e comparação número a número. **Os 11 vieram IDÊNTICOS.** As cinco salas pré-3.5.1 caíram em
   `legado`. Fecha os requisitos **(a)** reidratação e **(b)** extratibilidade do baseline do 3.5.1.
   **Detalhe completo:** `HISTORICO.md`.
   ✅ **AUTOMATIZADA no PR B (2026-08-19):** o que o dev fez à mão agora tem par em teste —
   `party/seeds.test.ts` cria a sala pelo caminho real, despeja a instância com
   `evictAllDurableObjects()` e exige que as 11 seeds voltem idênticas **e que a sala não se
   re-crie**. Baseline **MC** visto vermelho. **Isto NÃO substitui a medida em produção** (workerd
   local não é a borda da Cloudflare); ele impede a regressão silenciosa entre uma medida manual e a
   próxima.
   🔑 **A RESSALVA, que não pode sair daqui:** `seedCalendario 1903767602` ≠ `seedsEtapas[0]
   3187109758` **refuta M6** (11º slot recoplado) e **NÃO diz nada sobre M5** (derivar por índice) —
   seeds derivadas por índice **também** diferem entre si. **NÃO ler como "independência das seeds
   confirmada".** A cerca textual continua valendo por causa de M5.
   ⚠️ **O ramo `corrompida` segue NÃO OBSERVADO em produção** — existe só em teste. É ganho do spike.
   🔴 **Achado técnico que fica valendo:** o DO é `new_sqlite_classes` e `ctx.storage.put` grava na
   `_cf_KV` **V8-serializado, não JSON** — `sqlite3`/`strings` mostram os NOMES dos campos e não os
   números; por isso `scripts/despejar-seeds.ts` desserializa com `node:v8`. **Isto REFUTA o docblock
   de `party/sala.ts:90-92`** — ✅ **corrigido no PR A do spike**, como planejado.
   🔑 **R4 — MEDIDO NO `workerd` REAL PELO PR B (2026-08-19). Era pergunta explicitamente em aberto;
   virou fato.** O 0(p) provou o **serializador** (V8, não JSON); faltava saber o que o V8 faz com um
   `Uint32Array`. Executado em `party/seeds.test.ts` (bloco R4), **na forma aninhada de produção**
   (`estado.sala.seedsEtapas`, não um valor no topo da chave — medir o topo e afirmar sobre o
   aninhado seria supor que o structured clone é recursivo em vez de conferir):
   **o `Uint32Array` SOBREVIVE ao round-trip, íntegro, como `Uint32Array`.**
   🔒 **Consequência travada: `Array.from` na fronteira é NECESSÁRIO, não estilo — e o caminho de
   falha é o pior dos dois para diagnosticar.** As seeds **não somem** nem viram `{"0":…}`: elas
   voltam perfeitas, e mesmo assim `estadoDasSeeds` reprova no **`Array.isArray`**
   (`src/net/sala.ts:192`) ⇒ a sala vira **`corrompida` e passa a RECUSAR TODO MUNDO**. Quem um dia
   olhar `const todas = Array.from(slots)` e achar que é cerimônia tem, agora, o número e o teste.
   (q) **NOVA (PR 3.5.1) — ORDEM DE DEPLOY a partir do 3.5.2: `wrangler` ANTES do `vite`.**
   ⚠️ **ATUALIZADA em 2026-08-20 (revisão do 3.5.2): esta pendência tem AGORA uma irmã que aponta
   para o outro lado — a 0(u1).** Sozinha, a 0(q) diz "worker primeiro"; a 0(u1) mede que o worker
   3.5.2 sozinho pendura a sala ~20 min contra o cliente 3.5.1. **Lidas juntas, a conclusão é a
   única segura: os dois lados sobem no MESMO deploy, com o `wrangler` primeiro dentro dele.**
   `cliente.ts` não valida forma de snapshot. Num deploy escalonado, cliente novo contra worker
   antigo receberia `seedsAbertas: undefined` — **inócuo no 3.5.1** (ninguém lê), **letal no 3.5.2**,
   quando o cliente passar a derivar as etapas dele.
   (r) ✅ **FECHADA no 3.5.2 (2026-08-20).** `cursorIntegro` entrou em `estadoDasSeeds`: cursor fora
   de `[0, nEtapas-1]` ⇒ sala `corrompida`. As três leituras `?? 0` viraram **uma** função tolerante
   com dono e docblock (`cursorDaSala`), que existe só para sala LEGADO. ⚠️ **Fechá-la ABRIU a
   0(t)** — é o custo registrado, não um efeito colateral esquecido.
   *(Texto original, preservado:)* **NOVA (PR 3.5.1) — `etapaAtual` está FORA do discriminante.** Três leituras defensivas
   (`?? 0`) tratam o cursor de forma frouxa, enquanto `estadoDasSeeds` valida as seeds com rigor.
   Hoje é inconsistência de tese, não vazamento: `cursorPublicavel` clampa e o servidor nunca grava
   outro tipo. Mas **o cursor é justamente o campo que governa quantos segredos saem no fio** —
   quando o 3.5.2 o fizer se mover, trazê-lo para dentro do discriminante.
   (s) ✅ **RESOLVIDA em 2026-08-23** (branch `fix-0s-sala-zumbi`) — o `alarm()` passou a persistir
   o registro de conexões também no ramo NÃO JOGÁVEL, com uma guarda. `party/alarme.test.ts` cobre
   a regressão, a cadeia até `decidirVida` e as duas direções de `registrarConexoes`.
   🔒 **A NUANCE FOI RESPEITADA, e é o que quase se perdeu:** continua NÃO sendo "toda sala
   corrompida morre". Sala corrompida com `vazioDesde` já gravado sempre morreu normalmente (teste
   MD), e MD + a anti-vacuidade dele seguem **verdes** — foi essa dupla que provou que o caso antigo
   não foi quebrado.
   🔴 **BLOQUEANTE C1 DA REVISÃO — o conserto quebrava esse caso pelo lado OPOSTO ao que se temia, e
   passou perto de entrar.** `registrarConexoes` mexe no campo nas **DUAS** direções: grava `agora`
   quando a sala fica vazia e **`null`** quando deixa de estar. A primeira versão do conserto
   persistia as duas. Numa sala corrompida isso é alcançável: `onConnect`/`onMessage` **recusam** o
   cliente, mas o socket só é fechado quando ele **manda** alguma coisa — um cliente conectado e
   **quieto** segue contado em `getConnections()`. Efeito: a sala corrompida que morria no primeiro
   tique quieto passaria a ter a carência **REINICIADA a cada tique**. O zumbi voltaria como "sala
   corrompida com um cliente quieto nunca morre".
   🔒 **A guarda, e é o coração do conserto:** `else if (atualizado.sala.vazioDesde !== null)` —
   persiste **só a direção que INICIA o relógio**, e deixa a inércia de antes do conserto intacta na
   direção que o zeraria. Semanticamente é o certo: uma sala corrompida recusa todo mundo, seu único
   destino legítimo é morrer, então conexão contada não pode comprar sobrevida para ela.
   ⚠️ **A lacuna de cobertura que deixou o furo passar, e ela é estrutural:** **nenhum teste de
   `party/` abria socket**, então o arquivo inteiro rodava com `quantasConexoes() === 0` e a direção
   não-vazia não tinha asserção nenhuma. Fechada com `tiqueComConexoes`, que injeta **só o contador**
   — todo o resto do `alarm()` continua sendo o de produção.
   *(Texto do diagnóstico, preservado — ele descreve o bug que foi consertado:)*
   🔴 **CONFIRMADA POR MEDIÇÃO no PR C (2026-08-23) — BUG DE PRODUÇÃO REAL: sala corrompida
   com `vazioDesde: null` NUNCA MORRE.** Deixou de ser suspeita: `party/alarme.test.ts` executa a
   casca no `workerd` e mede o storage.
   **O que foi medido, e como:** fixture de sala corrompida (`seedsEtapas` removida, `versaoSala`
   mantida — a corrupção real de reidratação), `vazioDesde: null`, `concluidaEm: null`, 0 conexões.
   Depois de **TRÊS tiques** de `alarm()`, o `vazioDesde` **continua `null` no storage**. Três e não
   um de propósito: um tique só provaria "não persistiu desta vez", e a pendência afirma "nunca
   persiste, então o relógio de morte nunca começa". **Contraste medido no mesmo arquivo:** na sala
   **sã**, o MESMO tique **persiste** o `vazioDesde`. É o par que separa o bug de "o tique não faz
   nada em sala nenhuma".
   🔑 **A MEDIÇÃO ACRESCENTOU UMA NUANCE QUE A LEITURA DE 2026-08-19 NÃO TINHA, e ela muda o
   diagnóstico: NÃO é "toda sala corrompida vira zumbi".** O teste **MD** do mesmo arquivo mostra o
   oposto — sala corrompida com o `vazioDesde` **já gravado** (vazia há mais de 2 min antes de ser
   corrompida) **MORRE normalmente** no tique. O zumbi é **só** o caso em que a sala se corrompe
   **enquanto ainda tinha conexões**: aí o `vazioDesde` precisaria ser ESCRITO pela primeira vez, e
   é essa escrita que nunca acontece. **Quem for consertar precisa desta distinção** — um conserto
   que faça "sala corrompida sempre morrer" muda também o caso que hoje já funciona.
   *(Texto original do achado por LEITURA, preservado — a cadeia estava certa:)* Achado por LEITURA
   de `party/sala.ts:268-306` pelo `fable-architect`; **não confirmado por execução** à época — era
   exatamente por não haver como executar a casca. Cadeia: (1) `carregar()` devolve o estado com
   `vazioDesde: null`; (2) `registrarConexoes` produz `atualizado` com `vazioDesde = agora`, num
   objeto NOVO; (3) `decidirVida`: `agora - agora = 0 < CARENCIA_VAZIO_MS` ⇒ segue; (4) `jogavel` é
   **false** ⇒ **`aplicar()` nunca é chamado** ⇒ `atualizado` nunca é persistido e `this.estado`
   continua com `vazioDesde: null`; (5) próximo tique repete — `agora - agora` é sempre 0.
   **Consequência: uma sala que se corrompe ENQUANTO AINDA TINHA CONEXÕES vira o zumbi exato que o
   comentário de `party/sala.ts:299-302` afirma que a posição do gate impede** — recusa todo mundo e
   nunca libera o código.
   🔒 **DECISÃO DO DEV (2026-08-19, REAFIRMADA em 2026-08-23): reportar, NÃO consertar dentro do
   spike** — "zero diff de produção" é o que sustenta o rótulo BAIXO RISCO do PR C e o
   `senior-reviewer` pulado. **O conserto é PR PRÓPRIO, curto e com baseline próprio**, e é o
   passo que agora antecede o encerramento da Fase 3 (ver a §SEQUÊNCIA). ⚠️ Palavras do dev ao
   reafirmar: *"mudar isso sem revisão é o atalho que este projeto já pagou caro."*
   ⚠️ A redação de 2026-08-19 dizia que o conserto "entra ANTES do 3.5.2" — **envelheceu**: o PR C
   foi adiado para depois do 3.5.4, então o conserto vem depois dele. Corrigido aqui em vez de
   contradito noutro arquivo.
   ⚠️ É caminho que o **3.5.1 criou** (sala corrompida só existe desde o discriminante), então não é
   dívida velha.
   ✅ **E o palpite se confirmou: é o argumento mais forte a favor da dependência do spike** — o
   harness achou (mediu, e refinou o diagnóstico) o que a leitura só suspeitou.
   (t) 🟠 **NOVA (3.5.2, 2026-08-20) — A INVARIANTE DO SNAPSHOT DEIXOU DE SER LOCAL: ele pode se
   AUTOCONTRADIZER quando a sala é `corrompida`.** Achado ao trazer o cursor para dentro do
   discriminante (pendência 0(r)); **registrado por decisão do dev, NÃO consertado no 3.5.2.**
   **A cadeia, verificada no código:** `publicarSala` monta o snapshot com dois leitores que agora
   respondem a autoridades diferentes. `cursorPublicavel` (`src/net/sala.ts`) **clampa** — cursor 15
   sai como 4. `seedsAbertasDe` chama `estadoDasSeeds`, que desde o 3.5.2 reprova cursor fora de
   faixa e devolve **`corrompida` ⇒ `seedsAbertas: []`**. Resultado no fio:
   **`etapaAtual: 4`, `nEtapas: 5`, `seedsAbertas: []`** — um snapshot que afirma estar na etapa 5
   e não publica seed nenhuma. A invariante que o 3.5.1 travou por teste
   (`seedsAbertas.length === min(etapaAtual + 1, nEtapas)`) **quebra**.
   🔑 **Por que isto é mudança de tese e não um bug qualquer:** até o 3.5.1 a invariante era
   **LOCAL** — dava para prová-la olhando só `publicarSala`, porque os dois campos saíam do mesmo
   clamp. Agora ela **depende de uma guarda ANTERIOR** (a casca recusar a sala `corrompida` antes de
   publicá-la). O snapshot só é coerente **se ninguém publicar sala não validada** — e é exatamente
   a aposta que o docblock de `cursorPublicavel` diz não querer fazer ("aposta que o aviso A1 da
   revisão do 3.5.1 já perdeu uma vez"). ⚠️ **Hoje não é vazamento** (o caminho vaza *menos*, não
   mais: publica zero seed), e nenhuma sala de produção chega lá — o servidor nunca grava cursor
   fora de faixa. **É armadilha para quem vier depois:** o cliente do 3.5.3 vai derivar as etapas de
   `seedsAbertas` e ler `etapaAtual` para indexar o calendário.
   **Caminhos possíveis, nenhum escolhido:** (1) `publicarSala` recusar publicar sala `corrompida`,
   levando a guarda para dentro; (2) o clamp passar a zerar o cursor quando as seeds não estão `ok`,
   restaurando a localidade; (3) manter e travar a nova invariante condicional por teste. **É
   decisão do dev.** Os 2 vermelhos do grupo 2 em `campeonato-online.test.ts` são a manifestação
   disto — os testes forjam `etapaAtual: 15` e `-3` à mão, que é o único jeito de chegar ao estado.
   ➡️ **ATUALIZAÇÃO 2026-08-20, pós-revisão: SEGUE ABERTA, e o conserto do N2 encolheu o problema
   sem resolvê-lo.** `avaliarBarreiraDaCorrida` passou a recusar cursor fora de faixa em vez de
   curá-lo (a barreira voltou a ser local), mas **`publicarSala` continua com os dois leitores
   respondendo a autoridades diferentes** — que é a pendência. Os três caminhos possíveis continuam
   sem escolha, e o teste que TRAVA o comportamento atual (`🟠 PENDÊNCIA 0(t)` em
   `campeonato-online.test.ts`) continua no lugar, de propósito: ele não abençoa, ele impede que
   mude sem alguém perceber.
   (u) 🟠 **NOVA (revisão do 3.5.2, 2026-08-20) — OS AVISOS QUE O DEV DECIDIU NÃO CONSERTAR NESTE
   PR.** O escopo autorizado foi "bloqueantes + A5 + A4/N2"; o que sobrou está aqui, para não virar
   folclore de revisão. **Nenhum bloqueia o merge; o primeiro bloqueia o DEPLOY.**
   🔑 **PROVENIÊNCIA, e ela não é uniforme — ler o rótulo de cada item antes de agir sobre ele.**
   Esta sessão refutou por mutação uma das alegações da própria revisão (a de que
   `todas[MAX_ETAPAS] → todas[0]` estaria descoberto — **já estava coberto**), então achado de
   revisão obtido por LEITURA tem taxa de erro conhecida e **não entra aqui como fato medido**.
   Mesmo padrão da 0(s) ("achado por LEITURA … não confirmado por execução") e da 0(p) ("MEDIDA …
   NÃO DEDUZIDA"). **Só a u1 foi medida; u2–u5 são leitura.**
   - 🔴 **(u1) ORDEM DE DEPLOY — o worker do 3.5.2 SÓ VAI A PRODUÇÃO JUNTO COM O CLIENTE DO 3.5.3.**
     ✅ **MEDIDO nesta sessão, rastreando a cadeia de chamada no código — não é a leitura da
     revisão.** É pendência NOVA e **não é a 0(q)** (aquela é cliente novo × worker antigo; esta é o
     inverso). A cadeia, verificada arquivo a arquivo:
     `useSalaOnline.ts:219-224` — `corrida` é `useMemo` sobre `[cliente.draft,
     cliente.sala?.seedCorrida]`, **sem `etapaAtual` e sem `seedsAbertas`**, logo a corrida é
     computada **uma vez** e a referência nunca troca; `FluxoCorrida.tsx:77` — `onChegouAoResultado`
     dispara no efeito `if (fase === 'resultado')`, e `fase` fica em `'resultado'` para sempre;
     `FluxoOnline.tsx:225` liga esse callback a `atestarFimDaCorrida`
     (`useSalaOnline.ts:286-289`), que envia `{tipo: 'corrida-concluida'}`.
     **Consequência:** com worker 3.5.2 e cliente 3.5.1, a etapa 0 fecha normalmente, o cursor vai a
     1, os atestados zeram — **e nada no cliente reatesta, porque nada nele mudou de referência**.
     As quatro barreiras seguintes fecham só por `TIMEOUT_FIM_DE_CORRIDA_MS`: **4 × 5 min = ~20
     minutos** de jogador parado na tela de resultado.
     ⚠️ **Ler junto com a 0(q): as duas juntas dizem que os dois lados sobem no MESMO deploy, com o
     `wrangler` antes do `vite` dentro dele.**
   - 🟠 **(u2) — ACHADO POR LEITURA DA REVISÃO, NÃO MEDIDO. A guarda de etapa é ASSIMÉTRICA —
     `etapa > cursor` é aceita e escreve balde FUTURO.**
     `atestadoValido` só impõe o teto `nEtapas - 1`, então um cliente manda `etapa: 4` com o cursor
     em 0 e o estado persistido ganha `corrida:4` antes de a etapa 4 existir. **Não é crescimento
     ilimitado** (o teto segura em `escopos × nEtapas`); o dano é outro: quando a etapa 4 chegar, a
     âncora é a mesma (o log do draft parou de crescer), então o balde envenenado **sobrevive** e um
     `alarmado: true` pré-queimado **suprime o alarme real daquela etapa** — o oposto do que o PR
     existe para garantir. Conserto mínimo seria `etapa !== cursor` ignorar em silêncio (nunca
     `comando-invalido`, para não punir cliente em corrida legítima). ⚠️ **Isso derrubaria vários
     testes atuais do detector**, o que é evidência de que eles não modelam o fluxo de produção — os
     do bloco do detector atestam `etapa: 1` com o cursor em 0, que é atestado ADIANTADO.
   - 🟠 **(u3) — ACHADO POR LEITURA DA REVISÃO, NÃO MEDIDO. Blip de rede faz a sala ANDAR sem o
     jogador.** É o preço da 0(k) fechada: elegível
     passou a exigir conexão viva, e `aoDesconectar` tira do mapa na hora. A + B + C na etapa 1, B e
     C já atestaram, A cai por 3 s ⇒ no tique seguinte (o tique é de **5 s**) a barreira fecha sem
     A e o cursor anda. **Sem perda de dado** (as seeds `0..cursor` seguem abertas e o cliente
     re-simula), mas é repetível em rede ruim. Fechar exigiria carência de desconexão — campo novo
     no estado, **decisão do dev**.
   - 🟢 **(u4) — LEITURA, não medido. Baldes com a chave ANTIGA (`'draft'`, `'corrida'`, sem etapa) ficam órfãos para
     sempre** numa sala 3.4/3.5.1 reidratada. Custo: duas entradas mortas e um `alarmado` perdido —
     um alarme pode redisparar uma vez após o deploy.
   - 🟡 **(u6) — ACHADO POR LEITURA (2ª passada), NÃO MEDIDO. `versaoSala` é o único campo
     persistido SEM checagem de forma.** `null >= 2` é `false` e `null === undefined` é `false`, então
     `null`, `0`, `NaN` ou string **atravessam as duas portas** do discriminante: não tomam o ramo
     `legado` e escapam da guarda de `nEtapas`. Com `nEtapas` ausente ⇒ piso 1 ⇒ a primeira barreira
     encerra um campeonato de 5 etapas em silêncio — o desfecho que o C1 existe para matar. **Exige
     corrupção de VALOR, não perda de campo** (por isso não é bloqueante). **É decisão do dev**:
     validar a forma (`inteiro em [1, VERSAO_ESTADO_SALA]`, fora disso `corrompida`) mexeria no caso
     `undefined`, que já está fixado por teste como `legado`.
   - 🟢 **(u5) — LEITURA, não medido. Cliente antigo (sem `etapa`) atestando na virada de etapa** é
     bucketizado na etapa nova e pode produzir alarme falso residual — a mesma classe que o PR
     conserta, agora numa janela estreita.
   (v) 🟠 **NOVA (3.5.3, 2026-08-21) — MEDIDA, NÃO DEDUZIDA: o `npm test` tem uma corrida de I/O
   entre as cercas, e ela é PRÉ-EXISTENTE.** `contrato-ausente.test.ts` percorre `src/ui/` com
   `readdirSync`/`statSync` (`arquivosDaUi`), enquanto `contrato-corrida-online.test.ts` **grava e
   apaga** arquivos de sabotagem na MESMA pasta, em paralelo. Arquivo que some no meio da caminhada
   faz o `statSync` estourar, e o sintoma aparece **em outro arquivo**, sem relação com o PR.
   **Medido contra a base `3f54436`:** as duas cercas rodadas juntas já falham **1-2 testes**
   **sem** o 3.5.3; com a primeira versão do 3.5.3, **3-4**, e o `npm test` inteiro passou a cair.
   🔴 **NOVO DADO (PR 7, 2026-08-31): O SINTOMA NÃO É EXCLUSIVO DE `contrato-ausente.test.ts`.**
   Uma rodada do `npm test` deu **1 vermelho em `src/net/cerca-lint.test.ts`** (1658/1659), no teste
   *"proíbe Math.random, Date.now E performance.now"*. **Quatro rodadas seguintes: 1659/1659**, e o
   arquivo isolado: **7/7**. ✅ **Descartada regressão por medição, não por suposição:** nem o
   commit de código (`cd9d5b7`) nem o de doc tocam **um arquivo sequer** de `src/net/` ou o config
   do ESLint — conferido por `git show --name-only` e `git diff --name-only`.
   🔑 **Por que ele se encaixa na 0(v) e por que isso AMPLIA a pendência:** `cerca-lint.test.ts`
   **roda o ESLint de verdade** sobre arquivos que ele grava e apaga — é a mesma classe de I/O
   concorrente que a descrição acima nomeia, só que noutro par de cercas. **A redação anterior
   nomeava `contrato-ausente.test.ts` como O sintoma; ele é UM sintoma.** Quem vir vermelho em
   `cerca-lint.test.ts` num PR que não toca `src/net/` deve **reproduzir antes de caçar bug**.
   ✅ **A contribuição do 3.5.3 foi FECHADA no próprio PR** (a sabotagem nova passou de 6 varreduras
   com o arquivo em disco para 1). ✅ **E A CAUSA RAIZ FOI CONSERTADA NO MESMO PR (2ª passada da
   revisão) — porque estreitar a janela NÃO BASTOU: a taxa voltou a 3 falhas em 6 rodadas.**
   `arquivosDaUi` não tolerava arquivo sumindo durante a caminhada, e as sabotagens de allowlist
   gravam/apagam em `src/ui/` **por desenho**. Entrou `catch` **estreito (só `ENOENT`)** nos DOIS
   pontos da janela — `statSync` **e** `readFileSync`.
   ⚠️ **A primeira tentativa guardou só o `statSync` e AFIRMOU no docblock que a leitura não
   precisava — falso, medido:** o `ENOENT` capturado era **na leitura**
   (`open 'src\ui\__sabotagem_etapas_dupla.tsx'`). Corrigido no lugar.
   **Medido depois do conserto: 8 rodadas seguidas de `npm test`, 1565/1565 em todas** (taxa anterior
   ~50%). 🔑 Colateral: `NodeJS.ErrnoException` não compila aqui (sem `@types/node`) — virou
   `{ code?: string }`.
   🟡 **Fica em 🟡 e não em ✅ por uma razão:** o conserto torna a VARREDURA robusta, mas o desenho
   que a provoca continua de pé — suíte que grava em `src/ui/` enquanto outra a percorre. Uma cerca
   futura que pergunte *"TODO arquivo contém X"* (em vez de *"algum contém"*) voltaria a ser
   vulnerável, agora por vacuidade em vez de exceção. Está escrito no docblock de `lerFonte`.
   ⚠️ **Era um portão que passava por SORTE**, e a regra do projeto trata portão assim como risco,
   não como detalhe.
   (w) 🟠 **NOVA (revisão do 3.5.3, 2026-08-21) — O CLIENTE FIXA `'curta'` (5) E O TETO DE LEITURA DE
   `nEtapas` NO SERVIDOR É `[1, 10]`. DECISÃO DO DEV.** `etapasDaSala` chama
   `calendarioSorteado(dataset, seedCalendario, 'curta')` e ignora o `nEtapas` do snapshot — hoje
   coerente, porque `party/sala.ts` sempre cria a sala com `N_ETAPAS_CURTA`. **Mas o caminho de
   LEITURA não prende em 5:** `sala.ts:324` valida `nEtapasIntegro(sala.nEtapas, seedsEtapas.length)`
   com `seedsEtapas.length === MAX_ETAPAS === 10`. Uma sala v2 com `nEtapas: 10` é **`ok`**, publica
   6+ seeds abertas, e `etapasDaSala` **lança** em `calendario[5]` — dentro de um `useMemo`, **em
   render**, e **não existe `ErrorBoundary` em `src/`** (medido: zero ocorrências). Resultado: tela
   branca para todos os 22, e o F5 rederiva do mesmo snapshot ⇒ laço.
   **Não é alcançável hoje** (por isso aviso, não bloqueante) — é o dia em que alguém ligar o formato
   "completa" no servidor sem tocar no cliente. ⚠️ **Mesma família do `M-nEtapas` do 3.5.2**: o valor
   está certo hoje e nada o prende amanhã.
   **Dois caminhos, NENHUM escolhido:** (1) derivar o formato de `sala.nEtapas` — mantendo o portão
   `seedCalendario === null` **ANTES**, porque sala legado publica `nEtapas: 1`, que não existe em
   `N_ETAPAS` e faria um lookup ingênuo lançar onde hoje devolve `[]` corretamente; (2) o hook
   capturar e expor pelo canal de erro que já tem, deixando a função pura lançando alto.
   🔑 **Registrada também no docblock de `etapasDaSala`**, que é onde a próxima pessoa vai olhar.
   ➡️ **O 3.5.4 vai pelo caminho (1), decidido pelo dev em 2026-08-23.** Esta linha NÃO afirma que
   está fechada: quem fecha é o commit de feature, e o registro do fechamento entra com ele.
   (x) 🟠 **NOVA (planejamento do 3.5.4, 2026-08-23) — `corrida-concluida` NÃO CARREGA `etapa`, e o
   jogador ATRASADO atesta a etapa em que o SERVIDOR está, não a que ele assistiu. DECISÃO DO DEV:
   registrar, NÃO consertar no 3.5.4** ("o servidor é dono do cursor e grava no balde correto sem o
   campo; este PR já é grande o suficiente").
   **Medido no código, não deduzido da revisão:** `protocolo.ts:117` dá `etapa?: number` ao comando
   **`hash`** — e **só a ele**; `corrida-concluida` é `{ tipo: 'corrida-concluida' }`, sem campo
   nenhum (`protocolo.ts:132`). No servidor, `atestarFimDaCorrida(estado, remetenteId)`
   (`servidor-sala.ts:860`) grava no balde da **etapa corrente do servidor**.
   **A consequência, dita por inteiro:** quem ainda assiste a etapa k quando a barreira de k fecha
   por `TIMEOUT_FIM_DE_CORRIDA_MS` chega ao resultado com o cursor já em k+1 — e o atestado dele
   **conta para a k+1**, uma etapa que ele não viu. A barreira de k+1 fecha mais cedo do que devia,
   para todo mundo.
   🔑 **Por que NÃO é regressão do 3.5.4 e não vira bloqueante dele:** o caminho existe desde o
   **3.5.2**, que é quem fez o cursor andar; o 3.5.4 só o torna alcançável com mais frequência, ao
   ligar de fato as N etapas na tela. **É o espelho exato da guarda `etapa < cursor` que o 3.5.2
   escreveu para o `hash`** — lá o cliente atrasado é ignorado em silêncio, aqui ele é contado.
   ⚠️ **A assimetria é o achado**: o mesmo PR protegeu um dos dois atestados e não o outro.
   **Conserto natural, quando vier:** `corrida-concluida` ganha `etapa?: number` (opcional, pelo
   mesmo motivo do `hash` — cliente antigo não pode virar `comando-invalido` na janela de deploy) e
   o servidor ignora em silêncio quem atesta etapa ≠ cursor. **Ler junto com a 0(u2)**, que é a
   assimetria irmã no `hash` (etapa FUTURA é aceita e escreve balde adiantado).
   (y) 🟡 **BALIZADA pelo PR H2 (2026-09-01) — CONTINUA ABERTA, e o rebaixamento de 🔴 para
   🟡 é o registro exato do que mudou.** O `onConnect` passou a ter **teto de 64 conexões por
   sala, contando TODAS** (`src/net/teto-conexoes.ts`), com caso dedicado de **84 sockets que nunca
   mandam `entrar`**. **O socket quieto deixou de ser ilimitado.**
   🔴 **O QUE NÃO FECHOU, e é por isso que a pendência não vai a ✅: nada o EXPIRA.** A carência de
   vazio só corre com `getConnections()` em zero, e um socket quieto a mantém não-vazia para
   sempre; `PRAZO_TURNO_MS` não o alcança porque quem nunca mandou `entrar` não é jogador.
   **Bastam 64 sockets quietos para trancar os 22 jogadores reais fora da sala E mantê-la
   imortal** — o ataque ficou mais barato em número (64 em vez de 32k) e mais limitado em dano,
   **mas não desapareceu.** O conserto de fundo é a **0(ag)**.
   ✅ **A OBRIGAÇÃO DE RE-VERIFICAR A 0(s) FOI CUMPRIDA** (a linha 🔒 abaixo a exige): `npm run
   test:party` **33/33**, com `party/alarme.test.ts` — o par **MD** + anti-vacuidade — **verde**.
   🔑 **E a direção do risco é segura por construção, não só por teste verde:** o teto só REDUZ
   conexões contadas, e menos conexões fazem a sala morrer MAIS CEDO — o zumbi da 0(s) nasce do
   oposto (carência reiniciada por conexão contada).
   ⚠️ **`Não medido` CONTINUA VALENDO para as duas grandezas que a pendência nomeia** — o teto real
   do Durable Object e o custo de um socket ocioso. **O 64 é POLÍTICA** (folga sobre o piso medido
   de `2 × 22 = 44`, que vem do F5 ocupando dois sockets por jogador), **não um limite derivado da
   plataforma.** Detalhe: `HISTORICO.md` §"PR H2".
   *(Texto original da pendência, preservado:)*
   🔴 **NOVA (medição de auditoria, 2026-08-24) — A GUARDA DE 22 PROTEGE O ROSTER, NÃO AS
   CONEXÕES. Socket aberto que nunca manda `entrar` não é limitado por nada.** É o **item C2 do
   audit**, e é o único dos três que sobreviveu à medição — o C3 foi refutado (ver a §"MEDIÇÕES E AUDITORIAS DA TRILHA DE NOMES").
   **O que foi medido:** `src/net/sala.ts:500` recusa a 23ª entrada com `sala-cheia`, e o teste de
   `src/net/sala.test.ts:178-185` o fixa por identidade. Mas `QTD_JOGADORES` governa o array
   `estado.jogadores`, que só cresce pelo comando **`entrar`**. **Um cliente que abre o WebSocket e
   fica calado nunca toca esse array** — logo nunca encontra a guarda.
   🔑 **NÃO é achado novo do audit: é a GENERALIZAÇÃO do mecanismo que o bloqueante C1 da 0(s) já
   documentou**, visto do outro lado. Palavras de lá: *"`onConnect`/`onMessage` **recusam** o
   cliente, mas o socket só é fechado quando ele **manda** alguma coisa — um cliente conectado e
   **quieto** segue contado em `getConnections()`."* **Ler as duas juntas:** a 0(s) mostra que
   socket quieto **conta** em `getConnections()`; a 0(y) mostra que ele **não conta** no roster. É
   a mesma assimetria — contado pelo transporte, invisível para a lógica de sala — e por isso as
   duas se movem juntas.
   🔒 **Obrigação para quem for fechar a 0(y):** limitar conexões mexe em `getConnections()`, que é
   exatamente o insumo da guarda `vazioDesde !== null` instalada pelo C1 da 0(s). **Fechar a 0(y)
   sem re-verificar a 0(s) reabre o zumbi de sala corrompida.** O par `MD` + anti-vacuidade de
   `party/alarme.test.ts` é o baseline que tem que continuar verde.
   ⚠️ **Ganha urgência com o deploy público** (§Estado atual): sala privada entre amigos não é alvo;
   endpoint público sem teto de conexão é. **Não medido:** qual o teto real do Durable Object nem
   qual o custo de um socket ocioso. **É decisão do dev, e é PR próprio.**
   (z) 🔴 **NOVA (medição de custo do dataset fictício, 2026-08-24) — RENOMEAR PISTA DEGRADA EM
   SILÊNCIO.** É o único risco que sobrou aberto da medição; todo o resto dela deu verde (ver
   a §"MEDIÇÕES E AUDITORIAS DA TRILHA DE NOMES"). **A numeração é minha, atribuída nesta sessão** pelo mesmo precedente da 0(y) —
   conferido que `0(z)` estava livre; `0(x)` também está, e aparece **pulado** no arquivo, não
   ocupado por mim.
   **O que foi medido, os três elos:** `tracadoDaPista` (`src/ui/tracados.ts:613`) devolve
   `TRACADOS_POR_PISTA[pistaId] ?? TRACADO_GENERICO` — **não lança**, degrada para a silhueta
   genérica; a cerca de `src/ui/tracados.test.ts:63-67` compara `pistas.json` **contra** o mapa e
   por isso **fica verde num rename coordenado nos dois lados**; e `src/ui/TelaInicio.tsx:94` tem
   `?? dataset.pistasById.get(PISTA_CORRIDA_ID)!` com `PISTA_CORRIDA_ID = 'pista-monza'`
   (`src/ui/fluxo-corrida.ts:28`) — **`undefined!` no ramo de fallback**.
   🔑 **É a família do "artefato que não foi verificado não conta como verificado", agora na
   CERCA**: o teste afirma acoplamento entre duas fontes e não afirma nada sobre o **conteúdo** de
   nenhuma das duas. Mesmo defeito que o projeto já catalogou cinco vezes na Fase 3.
   🟡 **Mitigação PARCIAL medida, que NÃO fecha a pendência:** `scripts/balance.ts:289-293`
   (`medirParadasExtras`) lança se `pista-monza`/`pista-spa`/`pista-suzuka` sumirem — o **harness**
   quebra alto. **O caminho da TELA segue silencioso**, e é o que importa aqui.
   ⚠️ **Dano colateral do rename silencioso:** `preview-redesenho` e **`docs/img/silhuetas.svg`, que
   é VERSIONADA**, ficam obsoletos sem nenhum portão vermelho (§Estado atual manda regerar e
   commitar a grade quando um traçado muda — mas nada obriga).
   **Conserto natural, quando vier:** cerca que assere os ids de pista **por valor literal**, não por
   acoplamento entre as duas fontes, e trocar a non-null assertion de `TelaInicio.tsx:94` por erro
   explícito. **Só se aplica se o dev decidir trocar o dataset — é PR próprio e nada foi mexido.**
   ✅ **(aa) FECHADA em 2026-08-28 (`c61b3a7`) — CAMINHO (a), escolhido pelo dev: o módulo foi
   PARTICIONADO POR ORIGEM antes do PR 6.** Três blocos com prefixo no nome da constante —
   `DATA_*` (troca no PR 6), `FIXTURE_*` (troca no PR 7), `DERIVADO_*` (nunca troca) — e os 7
   consumidores importam o bloco da própria origem. **`RED_BULL_2023` deixou de ser uma constante
   só servindo os três lados**, que era exatamente a janela. Ver `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md` em 2026-08-31".
   🔒 **Palavras do dev ao decidir:** *"fazer 6 e 7 juntos junta o ALTO RISCO (`src/data/`, tela,
   netcode) com o BAIXO (fixture), e o portão visual do 6 ficaria misturado com mudança de fixture.
   Posicionar as referências antes fecha a janela sem inchar o PR grande."*
   ⚠️ **O QUE A PARTIÇÃO NÃO FECHA, e por isso não some daqui:** ela **não é cerca**. Nada impede
   um arquivo que lê a fixture de importar do bloco `DATA_*` — o alinhamento consumidor↔bloco é
   **convenção sustentada por leitura, não por teste**, e está escrito no docblock do módulo.
   **Teste novo não entrou, por decisão do dev** (*"npm test inalterado"*). Quem cobre o
   desalinhamento são os dois portões do PR 6 que já estavam no plano: o `throw` de
   `balance.ts:52` (ruidoso) e o `npm run dataset:report` com sha256 (o caminho silencioso).
   ⚠️ **O item menor abaixo — `referencias-dataset.ts` fora do digest — CONTINUA VALENDO e não foi
   tocado**, exceto por um fato novo que o PR mediu: o CONSUMIDOR `src/engine/draft-test-fixtures.ts`
   **está** no digest, e renomear o import dele moveu `bb6c419d` → `442b210c`. **São coisas
   diferentes e as duas ficam registradas.**
   *(Texto original da pendência, preservado:)*
   🔴 **(aa) ABERTA — A JANELA ENTRE O PR 6 E O PR 7 (medida no PR 2, 2026-08-25).**
   ~~🔒 **Decisão do dev, 2026-08-25: NÃO se decide agora — o caminho se escolhe no PR 5.** Não
   bloqueia nada antes disso; os PRs 3, 4 e 5 não tocam neste ponto.~~
   ⚠️ **A linha riscada acima envelheceu duas vezes e é riscada NO LUGAR, não contradita ao lado:**
   o caminho **não** foi escolhido no PR 5 (que saiu com `src/data/` intocado), e sim num PR de
   posicionamento próprio, depois dele.
   **Medido:** os 7 arquivos que importam `src/fixtures/referencias-dataset.ts` **não leem todos o
   mesmo dataset**, e a trilha troca cada dataset num PR diferente:
   - `scripts/balance.ts`, `alavancas.test.ts`, `balance.test.ts` → leem `src/data/` → **trocam no PR 6**
   - `src/engine/corrida.test.ts` e `draft-test-fixtures.ts` (via `bots.test.ts`/`draft.test.ts`)
     → leem `src/fixtures/dataset-semente/` → **trocam no PR 7**
   - `scripts/dataset-report.ts`, `derivar-notas.test.ts` → leem `scripts/derived/` → **nunca trocam**
     (o derivado segue com nome real por desenho, como o portão do PR 1 já registra)
   🔑 **`RED_BULL_2023` é consumido pelos TRÊS.** Entre o PR 6 e o PR 7 ~~existe~~ **existiu** uma
   janela em que `src/data/` já era fictício e a fixture ainda era real — e **uma constante só não
   serve os dois lados**. ✅ **A JANELA FECHOU no PR 7:** `DATA_*` e `FIXTURE_*` voltaram a coincidir
   em VALOR (`Kaldrix 2023`), e só o `DERIVADO_*` segue em `Red Bull 2023`, **para sempre**, porque a
   entrada do pipeline é real por desenho. **Quem deduplicar os três blocos reabre a janela** — eles
   coincidem em valor, não em ORIGEM. Nessa janela o `.find` do lado não-trocado deixa de achar: `balance.ts:52` **lançaria**
   (ruidoso, bom) e `dataset-report.ts` imprimiria `'(não encontrado)'` (**silencioso, ruim**).
   ~~**Os dois caminhos, nenhum escolhido:** (A) particionar o módulo por dataset antes do PR 6;
   (B) fazer o PR 6 e o PR 7 no mesmo PR.~~ ✅ **ESCOLHIDO: (A), pelo dev, 2026-08-28 — executado
   em `c61b3a7`.**
   ⚠️ **O funil NÃO criou esta janela** — ela existia igual com os literais espalhados por 7
   arquivos, e nada a apontava. O que o PR 2 fez foi torná-la visível.
   ⚠️ **Item menor da mesma pendência, e é o INVERSO do que parece:** `draft-test-fixtures.ts` está
   no escopo do digest, mas **`src/fixtures/referencias-dataset.ts` NÃO está** — ou seja, **mudar
   uma constante lá dentro não faz o digest subir**. Zero efeito hoje (é literal de teste, e o hash
   do bundle prova), mas quem executar o PR 6/7 precisa saber.
   (ab) 🔴 **NOVA (PR 3 da trilha de nomes fictícios, 2026-08-27) — `npm run preview` sai com exit 1 por quebra PRÉ-EXISTENTE.** `scripts/preview-corrida-online.preview.test.ts` falha em `FluxoOnline.tsx:205` (`online.etapas[online.etapaCorrente]`, `TypeError`), porque o mock de `useSalaOnline` não declara `etapas` nem `etapaCorrente` — campos que o `FluxoOnline` passou a ler no **3.5.4**. Nenhum dos dois arquivos está no diff do PR 3 (prova de que a quebra é pré-existente); `preview/corrida-online.html` em disco é de **17/08**, anterior ao 3.5.4. Só apareceu porque o bloqueante do `docs/img/silhuetas.svg` (revisão do PR 3) obrigou a rodar `npm run preview`, coisa que ninguém fazia desde o 3.5.4. ⚠️ **Consequência que interessa: `npm run preview` é o comando que a definição de pronto §5 exige para QUALQUER PR com portão visual, e hoje ele sai 1** — quem o rodar vai ver vermelho que não é dele. **O conserto provável são os dois campos faltando no mock, dentro do próprio gerador**; não foi feito, é decisão do dev se entra em PR próprio ou fica aqui.
   ✅ **FECHADA em 2026-08-27 (`9e18704`), em PR curto próprio, por decisão do dev — `npm run preview` volta a sair 0 (11/11).** `etapas: []` e `etapaCorrente: **-1**` no mock; o `-1` é a invariante `etapas.length - 1`, não um `0` que daria o mesmo `undefined` por acidente.
   🔴 **E o conserto EXPÔS um achado maior que ele: o 3.5.4 removeu o caminho que aquele preview existia para mostrar, e nada acusou.** `online.corrida` **não é mais lido** pelo `FluxoOnline`, e `mostrarIrParaCorrida={false}` é **fixo** em `FluxoOnline.tsx:283` — então as seções "o botão APARECE" e "a GUARDA, a única diferença é o botão" renderizavam a **mesma tela sem botão**. Uma virou falsa, a outra vacuosa; foram fundidas numa honesta.
   🔑 **A guarda daquele preview era VACUOSA e ninguém tinha como saber:** `expect(pagina).toContain('Ir pra corrida')` passava casando com o **título da seção**, não com o botão renderizado. **Guarda que mede a prosa da própria página.** Trocada por âncora de marcação + `not.toContain` como guarda de regressão. **Prova medida:** removido o título, `"Ir pra corrida"` aparece **0 vezes em qualquer forma** no HTML gerado. Mesma família do `>F-duct McLaren<` do preview das peças, no mesmo dia.
   ⚠️ **LACUNA ASSUMIDA e ela é do 3.5.4, não do conserto:** aquele preview **não mostra o caminho de campeonato online**, que é o normal de toda sala 3.5.1+. Mostrá-lo exige `classificacao` e `calendario` no mock — **cobertura nova, não conserto**. Registrado no arquivo e aqui.
   (ac) 🔴 **NOVA (achado da revisão do PR 3, registrada em 2026-08-27 por decisão do dev — NÃO consertada) — save antigo perde o botão "Continuar campeonato" SEM MENSAGEM.** `carregarCampeonato` devolve `{ ok: false, motivo }` com quatro motivos distinguíveis (`ausente`, `json-invalido`, `shape-invalido`, `versao-incompativel` — `src/ui/persistencia.ts:94`), e o único chamador **joga o `motivo` fora**: `App.tsx:121`, `return carga.ok ? carga.save : null` (bloco `118-122`). ⚠️ **Correção de âncora: é `:121` dentro de `118-122`, não `119-123`** — conferido nesta sessão.
   🔑 **O call site SEMPRE foi assim; o que mudou foi a probabilidade de disparar.** Enquanto `VERSAO_FORMATO` valeu 1 desde sempre, `versao-incompativel` era ramo morto na prática. **O bump 1 → 2 do PR 3 é a primeira vez que ele dispara de verdade** — e dispara para todo jogador que tenha um campeonato em andamento.
   🔴 **Com DEPLOY PÚBLICO (decisão de 2026-08-24, §Estado atual), o efeito deixa de ser teórico:** o jogador abre o jogo, o botão "Continuar campeonato" simplesmente **não está mais lá**, sem nada que diga por quê nem que o save foi descartado de propósito. Não é perda de dado silenciosa (o save cai limpo, que é o comportamento correto e desejado) — **é perda de EXPLICAÇÃO.**
   📌 **Decisão do dev: consertar antes do deploy é chamada dele.** Registrado sem conserto a pedido dele. O conserto natural é o `App` passar a distinguir `versao-incompativel` dos demais motivos e dizer ao jogador que a versão do jogo mudou; o custo é UI nova, não lógica.
   (ad) 🟠 **NOVA (2026-08-28, por decisão do dev, no encerramento da Fase 3) — `preview/corrida-online.html`
   NÃO MOSTRA O CAMINHO DE CAMPEONATO ONLINE, que é o normal de toda sala 3.5.1+.**
   🔑 **É pendência PRÓPRIA, e NÃO é reabertura da 0(ab)** — a distinção é decisão explícita do dev,
   ditada nesta data. A **0(ab) fica FECHADA** (`9e18704`, `npm run preview` voltou a sair 0, 11/11);
   o que nasce aqui é a **lacuna assumida que aquele fechamento declarou** e que ele mesmo classificou
   como *"cobertura NOVA, não conserto"*. **Registrar como reabertura teria dado por não-resolvido um
   conserto que está medido e verde.**
   **O que falta, dito por inteiro:** `FluxoOnline.tsx:216-253` é o ramo de campeonato online, e o
   gerador não o renderiza — mostrá-lo exige `classificacao` e `calendario` no mock de
   `useSalaOnline`. Enquanto isso, o preview cobre o ramo do "beco sem saída com saída" (sala legado,
   corrompida, `nEtapas` sem formato) e **nada acusa que o caminho principal está fora**.
   ⚠️ **Por que importa e não é capricho:** a definição de pronto §5 manda **abrir e OLHAR** o preview
   antes de mostrar ao dev. Um preview que não desenha o caminho normal faz o portão visual passar
   sobre o caso raro — a mesma família do 3.4.1 ("o preview mentia sobre o que estava mostrando"),
   agora por omissão em vez de por cascata errada.
   🔑 **A lacuna é do 3.5.4, não do PR (ab)** — foi o 3.5.4 que ligou as N etapas na tela sem
   atualizar o gerador. **Não foi feita, é decisão do dev se entra em PR próprio.**
   (ae) 🟠 **NOVA (PR 6 da trilha de nomes fictícios, 2026-08-30) — O RESULTADO DEPENDE DO RÓTULO, e
   não só dos números: DESEMPATE LEXICOGRÁFICO POR `id`.**
   🔑 **A CLASSE, que é o que importa aqui — o sintoma é só como ela apareceu.** Em pelo menos dois
   sítios, um empate de valor é resolvido comparando **ids em ordem lexicográfica**. Enquanto os ids
   forem estáveis isso é determinístico e invisível; **renomear qualquer coisa reembaralha quem
   ganha**, sem que nenhuma nota mude. É a razão de o `npm run balance` do PR 6 ter dado **delta ≠ 0
   com as notas byte a byte idênticas** (medido: sha `8eab5ec0…` dos dois datasets despidos de
   nome/id).
   **Os dois sítios, medidos:**
   - **`src/engine/bots.ts:58-64`** (`melhorCandidato`) — *"empate desempata por id em ordem
     lexicográfica (menor vence)"*. Efeito medido: drafts em que um piloto é trocado pelo
     **companheiro de dupla da MESMA equipe/ano**, nunca por outro carro.
   - **`scripts/balance.ts:167`** (`escolherExtremoPneu`) — desempata por `pilotoId` ascendente. Os
     extremos afetados são **empate massivo: 42 pilotos em PNEU 60 e 23 em PNEU 81**, contagem
     idêntica antes e depois. Foi o que moveu 2 das 6 linhas pinadas de `balance.test.ts`.
   🔴 **A MAGNITUDE É INCERTA; A CLASSE ESTÁ CONFIRMADA. Quem for consertar precisa saber que o
   NÚMERO NÃO É O PONTO** (formulação do dev, 2026-08-30).
   - **INCERTO — quantos:** a sessão do PR 6 mediu **2 drafts em 200**; a sessão da doc, com
     comparador POSICIONAL refeito, mede **4/200** (seeds 68, 88, 171, 175; `0..199` e `1..200` dão o
     mesmo). **O script da primeira medição não foi preservado**, então não há como saber que recorte
     ela usou. **Os dois números ficam** — escolher entre eles seria inventar a medição de outra
     pessoa. Método e saída da segunda em `preview/medicoes-pr6/MEDICOES-DA-DOC.md`.
   - ✅ **CONFIRMADO — o quê:** o mecanismo **reproduz idêntico** nas duas medições. Toda divergência
     é `pilotoN` trocado pelo **companheiro de dupla da MESMA equipe/ano**, nunca por outro carro, e
     bate com o desempate de `melhorCandidato`.
   🔑 **Dimensionar esta pendência por "são só 2 (ou 4) em 200" é ler o número errado.** O que ela
   afirma é que **renomeação move resultado**; a frequência depende do recorte medido, do conjunto de
   seeds e de quantos empates o dataset tiver naquele momento — **nenhum dos três é fixo.** Um
   conserto que persiga a frequência não conserta nada.
   📌 **Decisão do dev, 2026-08-28: caminho (C) — aceitar o delta, RE-CAPTURAR o baseline e registrar
   a pendência.** Não houve conserto e não se propõe um aqui: desempate por id é determinístico e
   legítimo; o que está registrado é que **ele torna o resultado sensível a RENOMEAÇÃO.**
   ⚠️ **Consequência prática para o PR 7:** ele renomeia a fixture, e **a mesma classe pode mover
   oráculos que leem `src/fixtures/dataset-semente/`**. Esperar delta ali não é regressão; **não
   esperar delta é que seria descuido.**
   🔑 **Ler junto com a 0(z)** (renomear pista degrada em SILÊNCIO): as duas são a mesma família —
   **rótulo carregando efeito que ninguém declarou.**
   (af) 🟡 **NOVA (PR do `.gitattributes`, 2026-09-01) — O `.gitattributes` NÃO UNIFORMIZA ESTA
   MÁQUINA: o working tree segue MISTO até que cada arquivo seja re-checkoutado. DECISÃO DO DEV:
   registrar, NÃO renormalizar neste PR.**
   **A numeração é minha, atribuída nesta sessão** pelo mesmo precedente da 0(y)/0(z) — conferido
   que `0(af)` estava livre (última ocupada: `0(ae)`).
   **O que foi medido, e é o oposto de um problema novo:** entrar com o `.gitattributes` **não
   renormaliza nada e não produz diff** — o índice já era 100% LF (233/233), `git add --renormalize .`
   encena zero e `git status` fica limpo. **A consequência é justamente essa: nada força a
   conversão.** O working tree converge **por arquivo**, conforme cada um for re-checkoutado.
   **O estado que persiste aqui, medido em 2026-09-01:** 147 arquivos em CRLF e 86 em LF; e **dentro
   do escopo do digest, 12 CRLF + 6 LF**. Um clone fresco, por contraste, nasce **233/233 em CRLF** e
   converge para LF conforme os arquivos forem materializados sob os atributos novos.
   🔒 **É POR ISSO QUE OS DOIS `replace(/\r\n/g,'\n')` NÃO SAEM** (`versao.test.ts`,
   `publicacao.test.ts`). Enquanto esta pendência estiver aberta, removê-los deixa o digest vermelho
   **na hora**. Está escrito nos dois docblocks, que é onde a próxima pessoa vai olhar.
   ⚠️ **Nada quebra hoje por causa disto** — os consumidores que comparam bytes ou já normalizam
   (digest, cerca de publicação) ou são imunes por construção (portão dos nomes reais, medido como
   EOL-invariante; as cercas que usam `JSON.parse`). **A pendência é sobre reprodutibilidade**, não
   sobre defeito ativo: medição feita aqui e medição feita num clone fresco leem bytes diferentes do
   mesmo conteúdo.
   🔴 **Os dois idiomas de conserto e por que NENHUM entrou:** `git rm --cached -r . && git reset
   --hard` — e **`reset --hard` é PROIBIDO sem autorização explícita do dev** (`CLAUDE.md`
   §Segurança) — ou apagar os rastreados e refazer checkout. **Os dois reescrevem ~147 arquivos em
   disco** (com `git status` limpo o tempo todo, já que o índice não se move) e **nenhum cabe num PR
   BAIXO RISCO**. **É PR próprio e decisão do dev.**
   🔑 **Ler junto com a 0(ae)**: as duas são a mesma família — **estado que não é conteúdo carregando
   efeito sobre medição** (lá, rótulo movendo desempate; aqui, modo de checkout movendo bytes).
   (ag) 🔴 **NOVA (PR H2, 2026-09-01) — SOCKET OCIOSO NÃO EXPIRA: o teto do S2 LIMITA o socket
   quieto, mas nada o FECHA. É a metade da 0(y) que o H2 não cobriu.**
   **A numeração é minha**, pelo precedente da 0(y)/0(z)/0(af) — conferido que `0(ag)` estava livre
   (a única ocorrência anterior da sigla é a linha que diz que a auditoria `S` **não** vira
   `0(ag)`).
   **A cadeia, verificada no código:** `decidirVida` só conta a carência com `getConnections()` em
   zero; um socket quieto mantém a sala não-vazia **para sempre**. `PRAZO_TURNO_MS` não o alcança
   — quem nunca mandou `entrar` não entra em `deQuemEhAVez`. **Não existe timeout de conexão sem
   handshake em lugar nenhum de `party/`.**
   🔑 **O que o teto mudou, e o que NÃO mudou:** o custo do ataque caiu de ~32k sockets para
   **64**, e o dano ficou confinado a uma sala. **Mas 64 sockets quietos trancam os 22 jogadores
   reais fora dela E a mantêm imortal** — o código da sala nunca é liberado.
   **Conserto natural, quando vier:** fechar conexão que não mandou `entrar` dentro de N segundos,
   com o prazo vindo do núcleo puro (como `PRAZO_TURNO_MS`) e o relógio da casca. ⚠️ **Mexe em
   `getConnections()`, que é o insumo da guarda `vazioDesde !== null` do C1 da 0(s)** — vale a
   mesma obrigação escrita na 0(y): **re-verificar o par `MD` + anti-vacuidade de
   `party/alarme.test.ts`.** 🔑 Desta vez a direção do risco é a PERIGOSA: fechar sockets faz a
   sala esvaziar mais cedo, e a interação com a carência precisa de baseline próprio.
   **É PR próprio e decisão do dev** — foi proposto no plano do H2 e **não autorizado**, e nada
   foi mexido.
   (ah) 🟠 **NOVA (PR H2, 2026-09-01) — O CLIENTE NÃO DISTINGUE O `close(4403)` DA RECUSA POR
   POLÍTICA: para o jogador, sala lotada e origem barrada viram "reconectando…" para sempre.**
   **O que foi medido:** `recusarPorPolitica` (`party/sala.ts`) fecha com **4403** e **não manda
   `{tipo:'erro'}`**. O cliente não tem ramo para código de fechamento — cai no caminho de
   reconexão, e o jogador que bateu no teto vê a sala "voltando" indefinidamente.
   🔑 **Por que NÃO se mandou um erro de protocolo, e isto é escolha medida, não esquecimento:**
   o único código de `ErroSala` que serviria é `sala-inexistente`, e `src/ui/useSalaOnline.ts:222`
   **APAGA o token de reentrada** ao recebê-lo — puniria com perda de identidade um jogador
   legítimo que só esbarrou no teto. **Reusar o código errado seria pior que a limitação.**
   ⚠️ **É a MESMA CLASSE do "429 aparece como servidor fora do ar" que o H1 registrou** e do bug
   do 3.3.3 que o docblock de `src/net/rotas.ts` guarda: **a UI acusa falha de rede enquanto o
   servidor responde corretamente.** Terceira ocorrência da família.
   **Conserto natural:** `ErroSala` ganha `sala-lotada` (e, se o dev quiser, `origem-recusada`), o
   servidor manda a mensagem **antes** do `close`, e o cliente ganha um ramo que **não** apaga o
   token. **O custo é UI + uma linha de protocolo, não lógica.** Perguntei ao dev qual erro o
   cliente deveria receber; **a pergunta não foi respondida e o PR foi aprovado como está** —
   registrado aqui em vez de decidido por mim.

1. **Abertas pelo 7.8:** (a) o `BotaoTema` é um botão discreto no canto do `app-shell` — posição e
   forma **não passaram por veredito de arte**; (b) `erro` (salmão `#FF7B85`) e `raridadeProibido`
   (`#FF4757`) continuam sendo dois vermelhos ao lado do vermelho da marca — não foi mexido porque
   é decisão de arte; (c) **flash de tema no carregamento**: o `data-tema` só é escrito quando o
   React monta e o efeito do `BotaoTema` roda, então quem tem o SO no claro e escolheu escuro vê
   um lampejo claro (e vice-versa). Conserto padrão é um script inline de duas linhas no
   `index.html` — fora do que foi pedido neste PR, registrado como limitação conhecida.
2. **`AMOSTRAS_POR_SEGMENTO` pode cair de 12 pra 4-6 — COM o número.** A justificativa de N=12 era
   que N=8 estourava o teto de 0,7 u; com as silhuetas novas **N=8 desvia 0,539 u**. Baixar move
   todos os goldens, então é execução própria.
3. **Fusão de camadas — o ASFALTO está resolvido, o resto não.** As 10 passam a guarda do asfalto
   (34), mas **as 10 fundem a camada de LIMITE** (42), de 8,5 (Red Bull Ring) a 21,1 (Suzuka).
   Report-only.
4. **Guardas O(n²) — ADIADA por decisão do dev (2026-08-01).** Não é problema demonstrado.
5. **O elo testado do 7.3 trava o componente, não o uso dele:** apagar `<CamadasDaPista/>` de dentro
   do `<svg>` de `TelaCorrida` ainda passa. Limite conhecido.
6. ✅ **Dívida de processo do 7.4 — RESOLVIDA na prática em 2026-08-06** (virou branch; a `main` foi
   pushada em 2026-08-07). Texto integral no `HISTORICO.md`.
7. **A rede de segurança da memoização da LUT (7.5) acabou.** Recuperar exige capturar o golden
   sobre uma polilinha SINTÉTICA fixa — registrado, não feito.
8. ✅ **ENCOLHER O `ESTADO.md` — EXECUTADA em 2026-08-19, em sessão própria** (aberta em 2026-08-18).
   **Método: SEPARAÇÃO + PODA, nada apagado.** Os planos de fase ativos (Fase 3, 3.5, spike) foram
   para o **`PLANOS_ATIVOS.md`** novo; o material encerrado (§FASE 8, changelog da §Estado atual,
   corpo do §RISCO ATIVO FECHADO, pendências fechadas) foi para o **`HISTORICO.md`** — **íntegro,
   linha por linha, não resumido**. Extração por faixa de linha (`sed`), não redigitada.
   **Verificação de integridade por diferença de conjuntos** (`comm -23` do arquivo antigo contra a
   união dos três novos): nenhuma linha ficou sem destino.
   🔒 **REGRA APRENDIDA EM 2026-08-18, ao mover a §CORRIDA ONLINE — VERIFICAR ANINHAMENTO POR
   ACIDENTE DE FORMATAÇÃO ANTES DE MOVER.** A §CORRIDA ONLINE tinha **quatro portões ATIVOS da Fase
   3** aninhados sob o cabeçalho dela (portões obrigatórios do 3.0/3.1b, herança de config do spike,
   riscos aprovados da fase, "harness headless não é opcional"): eram da fase inteira, não do
   trabalho encerrado, e teriam saído junto. **Cabeçalho não prova pertencimento — ler o conteúdo.**
   ✅ **A regra foi aplicada:** os quatro portões, as três retenções da §CORRIDA ONLINE, as
   invioláveis do 3.1a/3.1b/3.2 e as cinco retenções da §FASE 8 **ficaram neste arquivo**.
9. 🟡 **`party/` COM COBERTURA PARCIAL — aberta 🔴 em 2026-08-18, pendência NOMEADA a pedido do
   dev; passou a 🟡 em 2026-08-20 (ver o STATUS mais abaixo neste item).** Seção própria acima
   (§"🟡 RISCO ATIVO — `party/` TEM COBERTURA PARCIAL"), com o que foi medido e o que o 3.5.2 herda.
   Em uma linha: é a camada que sorteia, reidrata e vai carregar o cursor; ~~**nenhum teste a
   executa**~~ **— falso desde o PR B (2026-08-19): `party/seeds.test.ts` executa sorteio e
   reidratação reais; o que segue sem teste é o `alarm()` + `onMessage`/`onClose`/`encerrar`/CORS** —
   e a consequência já se materializou uma vez (o baseline do 3.5.1 declarou cobertura
   inexistente; M5/M6 no sítio real deixavam a suíte verde). Mitigação **contra M5** segue sendo a
   cerca **textual**, que não pega quem contorna.
   ✅ **PLANO APROVADO PELO DEV em 2026-08-19 — está em `PLANOS_ATIVOS.md` §"SPIKE + COBERTURA DA CASCA"**,
   com as 5 decisões dele (Ramo 1 do `nodejs_compat` + compensador `--dry-run` inegociável em PR A ·
   duas cópias de wrangler · **PR A é SPIKE com go/no-go** · docblock do R4 corrigido no A · MZ vira
   pendência **0(s)**). Três PRs (A/B/C), o A sozinho. ~~**Nada implementado.**~~ **Desatualizado em
   2026-08-19 — ver o ANDAMENTO logo abaixo.**
   ⚠️ **Fecha esta pendência só PARCIALMENTE: ela vai a 🟡, não a ✅** — M5 segue indetectável
   comportamentalmente e `onMessage`/`onClose`/`encerrar`/CORS seguem descobertos.
   📊 **ANDAMENTO em 2026-08-19: PR A ✅ e PR B ✅, ambos mergeados na `main`. PR C NÃO feito.**
   🟡 **STATUS EM 2026-08-20: 🔴 → 🟡, POR DECISÃO DO DEV** (a mesma que adiou o PR C para depois do
   3.5.4). ⚠️ **A redação anterior desta linha dizia o contrário** — *"continua 🔴 e NÃO vai a 🟡
   ainda, porque o 🟡 do plano é depois de A+B+C"* — e foi **corrigida aqui, não só contradita
   abaixo**, pela regra do `CLAUDE.md` §"o `doc-writer` NÃO APAGA": regra nova ao lado da antiga
   contraditória devolve o mesmo estrago, dependendo de qual o leitor achar primeiro.
   🔒 **O que este 🟡 significa EXATAMENTE, para ninguém o ler como mais do que é:** a casca deixou
   de ser terra sem teste (`npm run test:party` 8/8 executa sorteio real e reidratação real), **e**
   o gate do `alarm()` **segue sem nenhum teste que o execute**, junto com `onMessage`, `onClose`,
   `encerrar`, CORS e a propriedade RPC-vs-HTTP. O 🟡 é *"parcialmente coberta"*, não *"o plano
   A+B+C cumpriu"* — o C não foi feito.
   🔑 **Gate de versão MEDIDO em 2026-08-19, antes de planejar** (era o risco que mudava a FORMA do
   plano, não um detalhe): `@cloudflare/vitest-pool-workers@0.22.0` tem peer **`vitest ^4.1.0`** e o
   projeto já roda **`vitest@4.1.10`** — **não há downgrade nem bump de major**, o que era o custo
   que teria inviabilizado a adoção (seria mexer em 63 arquivos / 1516 testes). ⚠️ **Custos que
   sobram e não devem sumir daqui:** o pacote arrasta `miniflare 5.20260815.0-alpha` (**alpha**) e um
   **segundo `wrangler` (4.124.0)** ao lado do `4.120.0` que o `wrangler.jsonc` fixa de propósito
   desde o SPIKE 3.0.
10. ✅ **FECHADA em 2026-09-01, na doc do PR H1 — que É o "próximo commit de docs" que esta
    pendência esperava.** A cifra foi **RETIRADA, não atualizada com palpite**, e no lugar dela
    ficou a medição com método: **6.176 linhas / 567 KB**, ordem de **~170 mil tokens** a ~3,3
    caracteres por token. ⚠️ **A âncora `HISTORICO.md:8` morreu junto** — o cabeçalho cresceu; o
    texto novo está no bloco de abertura do arquivo. *(Texto original da pendência, preservado:)*
10. 🟡 **CIFRA OBSOLETA SOBREVIVENDO EM `HISTORICO.md:8` — "~19 mil tokens". PARA O PRÓXIMO COMMIT
    DE DOCS, por decisão do dev (2026-09-01); NÃO tocada no PR do `.gitattributes`, que é fora de
    escopo.**
    ⚠️ **Correção de âncora, e ela importa:** o dev nomeou "`CLAUDE.md`:8" ao decidir; **o sítio é
    `HISTORICO.md:8`**. No `CLAUDE.md` a cifra **já foi retirada** — é justamente de lá que veio a
    classificação. Registrado com a âncora certa pela mesma disciplina das seis correções de âncora
    do §"MEDIÇÕES E AUDITORIAS".
    **O que está lá:** *"Ler o arquivo inteiro consome ~19 mil tokens e foi por isso que o
    `ESTADO.md` passou a existir"*. O `CLAUDE.md` §"O que ler em sessão nova" já classificou esse
    número como **ERRADO por cerca de 8×** (daria 25,6 caracteres por token, que não corresponde a
    tokenizador nenhum) e o **retirou em vez de atualizar**; a ordem de grandeza real é de
    **~160 mil tokens**. Medido em 2026-09-01: o arquivo está em **5.973 linhas / 566 KB**.
    🔑 **Sobreviver aqui é RESÍDUO, não decisão** — a mesma cifra, já reprovada noutro arquivo,
    seguindo viva neste. **É instrução de cabeçalho, não narrativa datada**, então corrigi-la não
    esbarra na decisão de não reescrever histórico.

> ✅ Fechadas no 7.7: pendência 1 antiga (Spa fundia asfalto) · espinho de ~180° no vértice #0 de
> Spa · preview da densidade alvo. Fechada no 7.7.1: Monza sem imagem.
>
> ⚠️ **Lição permanente:** este arquivo já afirmou por um dia "`tsc`/`build` limpos" sendo falso,
> por herança de reescrita em reescrita **sem nunca medir**. **Afirmação de estado só entra medida.**

## Regras invioláveis da Fase 7

1. **Tabela de luminância — RECALCULADA no 7.8 pra paleta grafite.** Ordem travada:
   escape 0,0060 < chão 0,0103 < terreno 0,0144 < serviço 0,0194 < muro 0,0273 <
   **asfalto 0,0369** < carro do jogador 0,219. O asfalto é sempre a superfície mais clara; toda
   superfície nova passa por aqui antes de entrar. **O teto do asfalto (0,0397) é DERIVADO** do par
   `carro do jogador / asfalto >= 3` — mexer na cor do carro do jogador move a pista inteira.
2. **Regra dos 360px.** Elemento ilegível a 360px de largura não entra. A ordem e o sentido das
   curvas nunca se mexem por esse motivo.
3. **Zebra só em CURVA, nunca em reta.** Virada ACUMULADA ≥ 28° numa janela de
   `JANELA_CURVATURA_ZEBRA` = 88 u de arco, com teto de 40% do perímetro.

Mais dois critérios permanentes: **entorno é moldura, pista e carros são conteúdo**; e **decisão de
arte vai ao dev** — mudar composição sozinho já custou 2 bloqueantes no 7.3.

## Processo (regra completa no `CLAUDE.md`)

- **RIGOR PROPORCIONAL AO RISCO.** Classificar e anunciar ANTES de começar; na dúvida, perguntar em
  vez de escalar.
- **UM PR POR SESSÃO.** Ao concluir: commitar, atualizar os dois docs, **PARAR e avisar o dev.**
- 🔒 **LIÇÃO ACUMULADA DA FASE 3:** três bugs (F5 perdia sala, porta ocupada falha silencioso, duas
  abas compartilham token) passaram por suíte verde porque o teste afirmava a coisa errada ou não lia
  o que dizia ler. **Baseline vermelho real + guarda anti-vacuidade são obrigatórios**, especialmente
  no **3.4, que é literalmente sobre detectar divergência silenciosa**. Ver `CLAUDE.md` §"Cerca de
  lint: separar regra APAGA a regra" e §"Regra de mudança de lógica".
  **Quarta instância (3.4):** um dos dois testes de lag comparava estados IDÊNTICOS, então permanecia
  verde mesmo sem a regra de âncora — era cobertura ilusória. Reescrito com atraso real. Registrado
  como padrão a observar: teste que parece cobrir uma guarda mas testa o caminho feliz.
  🔒 **SEXTA instância (3.5.2, achada pela revisão e CONFIRMADA por mutação, 2026-08-20):** o teste
  `🔴 BASELINE D1: cliente ATRASADO … é ignorado EM SILÊNCIO` rodava com o cursor em **0** e mandava
  o atestado atrasado com `etapa: 0`. A guarda é `etapa < cursor` — **`0 < 0`, nunca entrada.**
  Apagar a guarda deixava a suíte inteira verde (1531/1531). O silêncio observado vinha do balde
  vazio, não da guarda. 🔑 **A regra operacional que esta instância acrescenta às cinco anteriores:
  BASELINE CUJO CENÁRIO NÃO ALCANÇA A GUARDA NÃO É BASELINE** — e o jeito de não repetir é **asserir
  a pré-condição** (aqui: "o cursor ANDOU" e "o balde da etapa velha está POPULADO") em vez de
  supô-la, porque a pré-condição suposta é justamente o que sai do lugar.
  ⚠️ **Irmã dela, na mesma revisão:** a metade 1 da mesma decisão (`atestado.etapa ?? cursor`) não
  tinha teste NENHUM — o mutante `?? 0` sobrevivia a tudo. **Guarda documentada em docblock não é
  guarda testada.**
- **Ao mexer em silhueta, use o harness de `preview/`** (`preview/harness.test.ts` +
  `preview/desenhos.ts`, gitignored). Rodar:
  `npx vitest run --config preview/harness.config.ts --reporter=verbose --silent=false`.
- **`OpcoesZebra` é andaime de MEDIÇÃO, não configuração.** Nenhum caminho de produção passa o
  argumento.

## Convenções (as demais estão no `CLAUDE.md`)

- **Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e este
  `ESTADO.md` **atualizado**.
- 🔒 **Neste arquivo, SÓ a seção `## Onde parei` é reescrita.** Todo o resto — decisões travadas,
  regras invioláveis da Fase 7, portões, riscos ativos, pendências, planos de fase — é **acrescido
  ou editado pontualmente, NUNCA apagado em massa**. A redação anterior desta linha dizia
  "reescrito (substitui, não acumula)" e foi o que autorizou o esvaziamento de 646 → 137 linhas em
  2026-08-12 (restaurado em `1873925`). Regra completa no `CLAUDE.md` §"O `doc-writer` NÃO APAGA
  SEÇÃO DE RESTRIÇÃO PERMANENTE". **Encolher este arquivo é decisão do dev.**
  - 🔴 **ATENÇÃO — ESTA REGRA TEM UMA PRÉ-CONDIÇÃO QUE NADA VERIFICA, e ela quase custou caro no PR
    7 (2026-08-31). A pré-condição, dita pelo dev:** *"a convenção 'só a §Onde parei se reescreve' é
    segura APENAS quando o conteúdo antigo já foi espelhado no `HISTORICO.md`. Nada verifica isso
    automaticamente."*
    🔒 **PORTANTO, ANTES DE REESCREVER A §"Onde parei": CONFERIR QUE O BLOCO A SER SUBSTITUÍDO JÁ
    ESTÁ NO `HISTORICO.md`. Se NÃO estiver, o bloco novo entra ANTES do antigo, e o antigo FICA.**
    A seção **acumula** enquanto o espelhamento não existir.
    ⚠️ **O que aconteceu, medido:** a reescrita da §"Onde parei" no PR 7 deu saldo de **−1108
    linhas** e levaria junto **22 marcadores de restrição**. Os quatro amostrados tinham **ZERO
    ocorrências em qualquer outro arquivo** — `🔒 DUAS COISAS MORRERAM` (PR 6),
    `🔒 REGRAS DE AUTORIA APROVADAS PELO DEV`, `➡️ DECISÃO DO DEV: PR C ADIADO` e
    `🔒 src/data/ INTOCADO … SUPERA a de 2026-08-25` — **dois deles decisões TRAVADAS do dev.**
    🔑 **O ALARME DE SALDO FOI A ÚNICA DEFESA.** Não havia teste, não havia revisão de subagente e
    o diff era grande demais para alguém notar por leitura. **É a diferença entre esta ocorrência e
    a de 2026-08-12** — lá a regra autorizou o esvaziamento e ninguém percebeu na hora; aqui a
    contagem de linhas acusou, a conferência linha a linha confirmou, e a reescrita foi desfeita
    antes do commit. **Quem for afrouxar o alarme está removendo o único portão que existe.**
    📌 **Falha da CONVENÇÃO, não de quem a seguiu:** seguir a regra ao pé da letra produzia a perda.
    Por isso o conserto é da regra, aqui, no lugar — e não uma nota de cuidado noutro arquivo.
    ✅ **PRÉ-CONDIÇÃO CUMPRIDA em 2026-08-31, na higiene aprovada pelo dev:** as 845 linhas dos PRs
    anteriores foram para `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md` em 2026-08-31", **íntegras**.
    **A convenção voltou a ser segura de aplicar** — a §"Onde parei" pode ser reescrita de novo no
    próximo PR, e o que ela substituir já terá espelho.
    🔴 **E CONFERIR NÃO É CASAR CABEÇALHO — foi o erro que esta higiene quase cometeu.** O
    `HISTORICO.md` tinha uma seção `###` para quase todo PR da §"Onde parei", e mesmo assim a
    contenção real do TEXTO era de **16,7%**: as entradas de lá foram escritas **à parte** sobre os
    mesmos PRs, não eram cópia. **"Tem seção com o nome do PR" não cumpre a pré-condição.**
    🔒 **A conferência é por CONTEÚDO, e existe script:** `scripts/medir-contencao-doc.py`.
    ⚠️ **Cobertura alta também não decide sozinha** — bloco de RETENÇÃO pontua alto porque o arquivo
    que o arquivou cita o que ficou. Foi o caso do §FASE 8 (75,4%), que **não** foi arquivado nesta
    rodada: a leitura mostrou que ele já era a retenção de 2026-08-19, com um item **ainda aberto**
    dentro. **O script tria; quem decide é a leitura.**
    🔴 **SEGUNDA MORDIDA DESTA FAMÍLIA, em 2026-09-01 — e desta vez ela incidiu sobre A PRÓPRIA
    CONVENÇÃO.** O bloco acima já dizia "cabeçalho casado não é conteúdo espelhado"; mesmo assim, a
    afirmação de que *"a convenção voltou a ser segura de aplicar"* foi escrita logo depois e era
    **falsa para o bloco do PR 7**, que aquela higiene não arquivou. Medido: **contenção 33,0%,
    766 shingles órfãos**.
    🔑 **CONFERIR ESPELHAMENTO POR `grep` DE MARCADOR É FALSO-POSITIVO, e agora está medido.** Os
    marcadores casam **1:1** entre os dois arquivos — `A CERCA DO TRIO`,
    `hakkinen @ mclaren @ 1993`, `O PORTÃO NÃO MEDE` **todos casam** — porque as entradas do
    `HISTORICO.md` **citam os mesmos nomes** ao narrar o mesmo PR. **Casar rótulo mede que os dois
    textos falam da mesma coisa; não mede que um contém o outro.** É a mesma classe do §FASE 8, onde
    **75,4% de cobertura era RETENÇÃO, não redundância** — as duas pontas do mesmo erro: lá o número
    alto enganava, aqui o marcador casado engana.
    🔒 **Espelhamento se confere medindo CONTEÚDO — `scripts/medir-contencao-doc.py`, shingles —
    NUNCA casando rótulo.**
    🔴 **E O ALARME DE SALDO NÃO PEGA ESTE CASO. Isto precisa estar dito, porque o alarme é tratado
    neste arquivo como "o único portão que existe":** ele compara contagem de linhas, então cobre
    **APAGAMENTO**, e **reescrita é SUBSTITUIÇÃO** — trocar 80 linhas por 80 linhas dá saldo ~zero e
    passa limpo. **O alarme de saldo e a conferência de espelhamento cobrem coisas diferentes, e
    nenhum dos dois substitui o outro.** Na ocorrência de 2026-08-31 o alarme salvou porque a
    reescrita era muito menor que o original (−1108); numa reescrita de tamanho parecido ele teria
    ficado quieto.
- 🔒 **VARREDURA DE RETENÇÃO SE FAZ POR FRASE, NUNCA POR EMOJI — medido em 2026-08-31, na higiene
  da §"Onde parei".** Antes de arquivar qualquer bloco deste arquivo, o que **fica** se acha
  varrendo as FRASES que marcam obrigação (`decisão do dev`, `palavras do dev`, `aprovado pelo dev`,
  `travado`, `não reabrir`, `adiado`, `veredito do dev`, `pendência`), **não** procurando 🔒.
  📊 **Na §"Onde parei", o `grep 🔒` achava 20 linhas; a varredura por frase achou 80 — razão de 4×.**
  🔴 **Três decisões travadas do dev não tinham 🔒 nenhum:** o **PR C ADIADO** (marcado ➡️), o
  **GATILHO DE REAVALIAÇÃO** (marcado 🔁) e o **"MR sai, entra MC"** (sem marcador algum). O
  "PR C ADIADO" é um dos quatro marcadores que a sessão do PR 7 amostrou e **não achou em nenhum
  outro arquivo** — um arquivamento guiado por `grep 🔒` o teria levado junto.
  🔑 **É a regra do aninhamento aplicada ao próprio marcador: o EMOJI É CABEÇALHO**, e "ler o
  CONTEÚDO, não o cabeçalho" vale contra ele também. Script: `scripts/medir-retencao-doc.py`.
  ⚠️ **O script TRIA, não decide** — `pendência` casa tanto uma aberta quanto uma referência de
  passagem a uma fechada. Cada acerto é lido no contexto antes de virar retenção.
- Previews visuais em `preview/` (gitignored). **Preview gerado só conta como entregue depois de
  MOSTRADO ao dev, com CAMINHO ABSOLUTO** — foi exatamente o que falhou no 7.4.
- **`referencias/` é gitignored** (imagens de terceiros, GDD §14.2).
- Harness: `npm run balance` já embute `--reporter=verbose --silent=false`. Ao chamar o vitest na
  mão, passar as flags, senão a tabela é engolida.
- **Nunca ler `src/data/*.json` por completo** (`equipe-anos.json` ≈ 324 mil tokens). Formato:
  `src/fixtures/dataset-semente/`. Consulta: `jq`/`grep` com filtro.
- 🔒 **PROSA NÃO CITA NÚMERO DE LINHA DE ARQUIVO DE DADO — cita o CAMPO ou o REGISTRO. Convenção
  ditada pelo dev em 2026-08-31, no fechamento do PR 7.** Palavras dele: *"arquivo de dado é
  regerado inteiro, e nenhuma âncora sobrevive a isso."*
  ✅ **Certo:** *"no registro `Kaldrix 2023`, campo `estrategista.nome`"* · `pistas.json`, o registro
  de id `pista-montreal`.
  ❌ **Errado:** `src/fixtures/dataset-semente/equipe-anos.json:27` · `equipe-anos.json:4812`.
  **É a SEGUNDA VEZ EM TRÊS PRs que uma âncora dessas quebra, e o mecanismo é o mesmo:**
  1. **`974a92a` (2026-08-28)** — quatro citações de `derivar-notas.ts` corrigidas; a `:705` apontava
     pro sítio errado.
  2. **PR 7 (2026-08-31)** — o §"Onde parei" citava `…/equipe-anos.json:27` → `"Estrategista Red
     Bull 2023"`. **As duas metades morreram de uma vez:** o nome (a fixture virou fictícia) e a
     âncora (o arquivo foi de **728 para 1498 linhas** ao ser regravado pelo serializador).
  🔑 **A distinção que faz a regra valer: âncora em `.ts` envelhece por EDIÇÃO, âncora em dado morre
  por REGERAÇÃO — e regerar é a operação NORMAL do pipeline**, não um acidente. Um `:27` num arquivo
  que um script reescreve inteiro já nasce condenado. **Campo e id sobrevivem à regeração; número de
  linha, não.**
  ⚠️ **Vale para `src/data/*.json`, `src/fixtures/dataset-semente/*.json` e `scripts/derived/*.json`.**
  Para `.ts`/`.tsx` a citação por linha **continua valendo** — é o que torna este arquivo navegável —,
  mas confira antes de escrever.
- 🔒 **MEDIÇÃO CUJO SCRIPT NÃO FICA EM DISCO NÃO É REPRODUZÍVEL — regra ditada pelo dev em
  2026-08-30, no fechamento do PR 6.** Palavras dele: *"se a captura importa, ou o script fica
  rastreado ou o número não vale."*
  **As duas ocorrências que a motivaram, e nenhuma foi descuido isolado — é o mesmo mecanismo:**
  1. **A captura do `balance` do PR 2** (`e62fe729…`) e a do PR 6 (`a0aa98e4…`) vivem em
     `preview/medicoes-pr*/`, que é **gitignored**. Sobrevivem nesta máquina; **não existem no
     histórico**, então um clone limpo não tem baseline nenhum contra o qual comparar. **A receita do
     filtro está registrada em prosa no `LEIA-ME.md`, não como script rastreado.**
  2. **O comparador do PR 6** — o script sumiu por inteiro, e por isso a sessão da doc mediu
     **4/200** onde a sessão do PR tinha medido **2/200**, **sem meio de reconciliar**. Está na
     pendência **0(ae)**.
  🔑 **O custo não é o número perdido: é que uma re-medição divergente vira DIVERGÊNCIA PERMANENTE**
  em vez de bug a achar. Com o script em disco, 2 × 4 seria uma diferença de recorte, diagnosticável
  em minutos.
  📌 **O que isso obriga, na prática:** medição que vai virar afirmação em documento entra com o
  script que a produziu **rastreado no repositório** (`scripts/`, ou `preview/` deixando de ser o
  único domicílio dela). **Saída em `preview/` continua valendo — o que não pode ficar só lá é o
  MEIO de refazer a saída.**
  > Mesma família do **"artefato que não foi verificado não conta como verificado"**: aqui, **medição
  > que não pode ser refeita não conta como medida** — só como lembrança.

  ⚠️ **A REGRA AINDA NÃO ESTÁ CUMPRIDA, e isso fica dito em vez de subentendido.** O comparador
  refeito no PR 6 foi preservado como **`preview/medicoes-pr6/tmp-comparador.test.ts.txt`** — ou
  seja, **em `preview/`, gitignored: exatamente o domicílio que a regra acabou de reprovar.** Foi o
  melhor que a sessão da doc podia fazer sem alargar o diff de um PR já aprovado. **Rastrear o
  comparador (e a receita do filtro do `balance`) é PR próprio e decisão do dev.** Regra escrita cujo
  primeiro caso segue violando-a em silêncio é como a próxima sessão herda a ilusão de que está
  resolvido.