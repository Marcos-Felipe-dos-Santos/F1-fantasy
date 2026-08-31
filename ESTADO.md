# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> **Planos de fase em `PLANOS_ATIVOS.md`** (~~Fase 3, 3.5 campeonato online, spike da casca~~ —
> ⚠️ **os três encerraram: a FASE 3 ESTÁ ENCERRADA desde 2026-08-27**, ver §"FASE 3 ENCERRADA"; o
> que segue **ATIVO ali é a trilha de NOMES FICTÍCIOS**, §"NOMES FICTÍCIOS — o plano dos 7 PRs") —
> consulte **o plano que interessa**, nunca inteiro. Histórico por PR: `HISTORICO.md` (fases 6-7 e o
> que foi arquivado daqui) e `HISTORICO_ARQUIVO.md` (fases 0-5). Não leia nenhum dos três inteiro.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

**Última medição (2026-08-30, na `main` — PR 6 da trilha de nomes fictícios, A TROCA DO DATASET):**
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
a FÓRMULA do digest mudou junto** — passou a normalizar CRLF → LF. Ver o C1 na §Onde parei.
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
⚠️ **O `tsc` foi o portão que a suíte não foi neste PR** — ver a §Onde parei, o erro do `'media'`.

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
o **mesmo** registrado no inventário de nomes reais (§Onde parei) — o que também confirma que os
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
⚠️ **`VERSAO_ESTADO_SALA` subiu de 1 para 2** — ver a §Onde parei.
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
  ⚠️ **Ler junto com o inventário medido em 2026-08-24** (§Onde parei): a frase do
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
  vez:** foi por ela que o `MR` do PR B do spike foi desqualificado (`TS2740`, ver a §Onde parei).

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

**🔀 NOMES FICTÍCIOS — PR 6, A TROCA DO DATASET: CONCLUÍDO e COMMITADO em 2026-08-30**, na `main`.
**ALTO RISCO** — `src/data/`, `VERSAO_APP`, `VERSAO_FORMATO` e o harness de balanceamento.
**Sem push, sem tag.** Detalhe completo: `HISTORICO.md` §"NOMES FICTÍCIOS — PR 6".
📌 **A doc foi escrita pela SESSÃO PRINCIPAL, não pelo `doc-writer` — pedido explícito do dev nesta
sessão.** Sexto PR seguido assim. **A auditoria não foi dispensada:** o diff foi lido e o dev o viu
antes do commit.
🔑 **E esta sessão NÃO é a que fez o PR — ela escreve a doc dele.** Por isso **toda afirmação
numérica abaixo foi REMEDIDA aqui**, não herdada do comentário de código que a descreve
(`preview/medicoes-pr6/MEDICOES-DA-DOC.md`). Uma delas **não reproduziu** — ver o comparador.

**O que o PR faz, em uma linha:** `npm run dataset:anonimizar` deixa de escrever um artefato de
ensaio e passa a **publicar direto em `src/data/equipe-anos.json`**; `equipe-anos.anonimo.json`
deixa de existir; e a igualdade `src/data/ === anonimizar(derivado, tabela)` vira **cerca**
(`scripts/publicacao.test.ts`, arquivo novo). **A entrada do pipeline segue REAL por desenho** — o
fictício nasce na publicação.

🔒 **DUAS COISAS MORRERAM, e confundi-las era o risco. Palavras do dev:** *"a cópia manual sem
guarda existe há meses e ninguém sabia até o PR 5 medir. Trocar um passo manual sem guarda por um
script sem guarda não seria ganho — seria a mesma dívida com nome novo."* O **passo manual** morre
pelo script; a **ausência de guarda** morre pela cerca. **São duas.**

---

🔴 **O C1 DA REVISÃO — O DIGEST DEPENDIA DO MODO DE CHECKOUT, NÃO DO CONTEÚDO. É o achado do PR.**

**A causa, medida:** o repo roda `core.autocrlf=true` e **não tem `.gitattributes`**. Arquivo que o
git materializa chega em **CRLF**; arquivo que um script escreve chega em **LF**. Desde este PR,
`src/data/equipe-anos.json` é **escrito por script** (52.430 LF, zero CRLF) enquanto `pecas.json`
(218 CRLF) e `pistas.json` (102 CRLF) seguem vindo de checkout — **o digest era MISTO**.

**A medição, reproduzida nesta sessão, réplica do `digestDoConteudo()`:**

| variante | dataset em LF | dataset em CRLF |
|---|---|---|
| **CRU** (antes do conserto) | **`0d9efb33`** | **`be8578eb`** |
| **NORMALIZADO** (`replace(/\r\n/g,'\n')`) | **`a2b34e13`** | **`a2b34e13`** |

🔑 **A ANTI-VACUIDADE É A LINHA DE BAIXO, E AS DUAS CÉLULAS DELA SÃO O PONTO.** Um conserto medido
só no lado LF é indistinguível de nenhum conserto. **`a2b34e13` está colado em
`src/engine/versao.test.ts:36`.**
🔴 **O modo de falha que isso evitou é preciso:** o primeiro `git clone` ou `git checkout --` deixaria
`versao.test.ts` **vermelho com a mensagem "MUDOU e `VERSAO_APP` não acompanhou"**, sem nada ter
mudado — e a instrução de conserto ("cole o digest atual") produziria **ping-pong entre as duas
máquinas**. Vermelho que não é regressão, na cerca que existe para detectar regressão.
🔑 **A contradição que a revisão achou:** `scripts/publicacao.test.ts` **já normalizava** e
`versao.test.ts` **não**. Dois arquivos do mesmo PR com a mesma tese e comportamentos opostos.
⚠️ **A alternativa — pinar `*.json` como LF num `.gitattributes` — resolveria a CLASSE inteira, mas
reescreveria final de linha do repo todo no próximo checkout. É PR próprio e DECISÃO DO DEV**, não
conserto de passagem. **Não foi feito.**

---

📉 **O PORTÃO DOS NOMES REAIS: 9.486 → 249 (−9.237). Segunda vez que a baseline se move.**
**Uma linha mudou; as outras cinco não** — `src/data/equipe-anos.json` foi de 9.237 a **0**.
⚠️ **A linha NÃO foi removida da lista `BASELINE`**: continua lá medindo zero, que é o que mantém a
cerca viva. (A redação anterior do portão dizia "derrubada"; corrigido pela revisão.)
🔑 **O ZERO FOI PREVISTO ANTES DE SER MEDIDO**, a partir da mecânica (fronteira não-alfanumérica +
cerca de quase-marca do PR 4) e conferido contra a saída do `anonimizar` **antes** de publicar.
**Número que só existe depois do fato não pode ser surpreendido.**
🔒 **O PR 7 NÃO ZERA OS 249 — o piso é 6:** 243 da fixture (viram 0 no PR 7) · **4 de `massa`**
(sobre-contagem sobre dado LIMPO: `"Amortecedor de massa"` × `driverId` de Felipe Massa) · **2 de
`Red Bull Ring`** (resíduo REAL, mantido por DECISÃO — T2 adiada). **Registrado ANTES do PR 7 a
pedido do dev:** *"o que sobrar precisa estar explicado, não descoberto depois."*

📦 **O BUNDLE: 114 — e a quebra é o que faz o número significar alguma coisa.**
Medido com as mesmas 909 agulhas e o mesmo `contarComFronteira` do portão, sobre
`dist/assets/index-B0pMOBwk.js`: **`button`=57 · `sala`=54 · `massa`=2 · `Red Bull`=1**.
Os 111 primeiros são sobre-contagem pura — `<button>` do React e o vocabulário do modo Online contra
os `driverId` de Jenson Button e Luis Pérez-Sala. **`Ferrari` no bundle = 0.**
🔑 **CONTRA-PROVA, e ela é o que separa "anonimizado" de "encolhido":** `Ferrari` **152×** no
derivado → `Sarterra` **152×** no publicado E no bundle. **Contagem idêntica, rótulo trocado.** (Nos
ids: `ferrari` 456× → `sarterra` 456×.) Sem a contra-prova, "zero Ferrari" também seria o resultado
de ter perdido registros.
⚠️ **`dist/` INTEIRO dá 128, não 114** — o CSS soma `shadow`=13 (`box-shadow` × o `constructorId` da
Shadow) e `button`=1. **Registrado de propósito:** quem medir `dist/` inteiro numa sessão futura acha
128 e lê regressão onde só há `box-shadow`.
🔴 **E O BUNDLE CONTINUA SEM PORTÃO.** O docblock do portão dizia *"entra como passo do PR 6"*; o que
o PR 6 fez foi **medir à mão**. **Medição manual não é portão** — uma regressão futura em `dist/`
passa em silêncio. Corrigido no lugar, porque dizer o contrário faria a próxima sessão confiar num
portão inexistente.

---

🧪 **A TABELA DE MUTAÇÕES — e o achado é que A CERCA E O DIFERENCIAL NÃO SE SUBSTITUEM.**
Refeita nesta sessão. Baseline limpo dos dois arquivos: **20/20**.

| mutante | diferencial (`anonimizar.test.ts`) | cerca (`publicacao.test.ts`) |
|---|---|---|
| **M-cp** (`anonimizar` devolve o derivado) | 🔴 7 vermelhos | 🔴 2 vermelhos |
| **M-parordem** (par `[0,1]` → `[1,0]`) | 🔴 3 (inclui `hashDaCorrida`, :325) | 🔴 1 |
| **M-estrategista** (nome perde o `${ano}`) | 🔴 1 (:245, o 4º sítio) | 🔴 1 (:139) |
| **M-estrategista + REPUBLICAR** | 🔴 1 (:245) | ✅ **VERDE 4/4** |
| **M-artefato** (código limpo, artefato mutado) | ✅ **VERDE 16/16** | 🔴 1 (:139) |

**Achado 1 — as duas últimas linhas, e são SIMÉTRICAS.** A cerca compara um **artefato fixo no
disco** contra a função: `mutar + republicar` a devolve ao verde, porque os dois lados passam a
mentir juntos. O diferencial é propriedade sobre a **transformação** e continua vermelho. Na direção
oposta, artefato desatualizado com código limpo deixa o diferencial **inteiro verde** e só a cerca
acusa. 🔑 **Nenhuma das duas cobre o buraco da outra — a tese do dev, agora MEDIDA em vez de
argumentada.**
**Achado 2 — `M-parordem` derruba `hashDaCorrida` (:325), e nenhuma cerca de artefato pegaria isso.**
Reordenar o par troca as NOTAS de lugar dentro da equipe e a corrida deixa de bater bit a bit. É o
único mutante que ataca o **determinismo**, que é a razão da trilha existir; quem o pega é a metade
do diferencial que roda draft+quali+corrida.
**Achado 3 — `M-estrategista` passa em "TODO `estrategista.nome` difere" e só cai no 4º sítio**
(`:245`), que pina a interpolação exata `Estrategista ${equipe} ${ano}`. Sem essa asserção
específica, uma anonimização "quase certa" atravessa o diferencial inteiro. **A anti-vacuidade que
vale é a mais ESPECÍFICA, não a mais numerosa.**
🔒 **Higiene da rodada:** `src/data/equipe-anos.json` foi copiado antes, restaurado depois e
conferido por sha256 (`477bd7e7…`); o `git diff --stat` voltou a `15420 (+7710/−7710)`.

---

⚖️ **O BALANCE MOVEU — `npm run balance` com DELTA ≠ ZERO pela primeira vez na trilha.**
**40 linhas**, novo baseline `a0aa98e4…` em `preview/medicoes-pr6/`, **com a MESMA receita de filtro
de 4 padrões do PR 2**. 🔑 **O filtro NÃO foi alargado até o sha voltar a bater** — isso teria
escondido o delta em vez de explicá-lo, a "allowlist até o número ficar bonito" que este arquivo já
aposentou uma vez. **O filtro é o mesmo; o baseline é que mudou, com o porquê registrado.**
✅ **E NÃO é mudança de balanceamento, medido:** derivado e publicado, despidos de nome e id, dão a
**mesma string byte a byte** (771 registros, 285.271 bytes, sha `8eab5ec0…` dos dois lados). **Sem
essa medida, "o delta é só desempate" seria hipótese.** O que mudou é **qual de vários candidatos
EMPATADOS** ganha um desempate lexicográfico por `id`. **É a pendência 0(ae)**, aberta neste PR.
📌 **`balance.test.ts` re-pinado: 4 linhas mudaram só de rótulo, 2 TROCARAM DE PILOTO** (empate
massivo — 42 pilotos em PNEU 60, 23 em PNEU 81, contagem idêntica antes e depois). **Os seis valores
foram DERIVADOS da tabela de nomes e só então conferidos contra a saída** — copiar o "Received" do
vermelho é o ajuste automático que o próprio comentário do teste proíbe.

🔢 **O COMPARADOR — o erro de método, e uma DIVERGÊNCIA que fica aberta.**
O erro que a sessão do PR nomeou: um comparador que dá **0/200 por comparar coisa que não podia
diferir**. A contra-prova está no comparador refeito — **mesmo mundo × mesmo mundo dá 0/200**, e um
zero desses é indistinguível de um zero informativo se ninguém olhar o que está sendo comparado.
**O método certo é POSICIONAL, nunca por rótulo:** os dois datasets têm os mesmos 771 registros na
mesma ordem, então todo id resolve para `"<índice>:<papel>"` (anti-vacuidade: 4.626 entradas de cada
lado, **zero id em comum**).
🔴 **A sessão do PR registrou `2 drafts em 200`; esta sessão mede `4/200`** (seeds 68, 88, 171, 175;
`0..199` e `1..200` dão o mesmo). **OS DOIS NÚMEROS FICAM.** O script da sessão do PR não foi
preservado, não sei que recorte ela usou, e escolher entre os dois seria inventar a medição de outra
pessoa. ✅ **O MECANISMO reproduz exatamente:** toda divergência é `pilotoN` trocado pelo
**companheiro de dupla da MESMA equipe/ano**, nunca outro carro — bate com `melhorCandidato`
(`src/engine/bots.ts:58-64`). Três das quatro caem no mesmo registro, o que é o esperado de um
empate concentrado. **É o mecanismo, não o número, que sustenta a 0(ae).**

---

🔎 **OS ACHADOS DA REVISÃO QUE VIRARAM DIFF** (além do C1): a exceção do `.gitignore` que apontava
para um arquivo que deixou de existir (riscada no lugar) · `src/data/*.tmp` ignorado, porque a
escrita atômica agora nasce **dentro de diretório versionado** e um crash entre `writeFileSync` e
`renameSync` deixaria ~1 MB colhível por `git add .` · a anti-vacuidade da cerca cuja metade
load-bearing era `derivado.length === 771`, não a que parecia · `verificarColisaoDeIds` que o
docblock dizia rodar sobre a saída e **só rodava no `main()`** (que `npm test` nunca executa) — agora
roda na cerca · o docblock de `balance.ts` que ficou falso ("Red Bull 2023 … Verstappen") ·
`balance.test.ts` e `fluxo-draft-golden.test.ts` que a doc tratava como o mesmo caso e **não são**
(medido por ensaio a seco: o segundo lê a FIXTURE e fica VERDE — **é PR 7**).

✅ **UM RESÍDUO QUE A REVISÃO NÃO PEGOU, achado nesta sessão e CONSERTADO no commit da doc:**
`scripts/anonimizar.test.ts:40-42` justificava operar em memória citando `equipe-anos.anonimo.json`,
que **morreu neste PR**. A afirmação sobre o retorno em memória seguia verdadeira; a justificativa
ficou órfã. 📌 **Decisão do dev:** *"é comentário, não alarga risco, e prosa que cita símbolo morto é
exatamente o que a próxima sessão lê como verdade."* Riscado no lugar, com a divisão de trabalho
explicitada (transformação × artefato).
🔑 **Por que escapou da revisão:** os outros cinco arquivos que citavam o artefato morto **estavam no
diff** e foram lidos por isso; este **não estava**. **Diff não é a fronteira do que um PR torna
mentira.**

---

**🧩 PR ANTERIOR — POSICIONAMENTO DAS REFERÊNCIAS — `referencias-dataset.ts` particionado por
origem: CONCLUÍDO e COMMITADO em 2026-08-28**, na `main` (`c61b3a7`). **BAIXO RISCO — rótulo do dev** (refactor
verde→verde, nenhum valor mudou). **Sem `senior-reviewer`, sem push, sem tag.**
Detalhe completo: `HISTORICO.md` §"NOMES FICTÍCIOS — POSICIONAMENTO".
📌 **A doc foi escrita pela SESSÃO PRINCIPAL, não pelo `doc-writer`** — quinto PR seguido assim, no
precedente registrado nos blocos abaixo. **A auditoria não foi dispensada:** o diff foi lido antes
do commit.

🔒 **É o CAMINHO (a) da pendência 0(aa), escolhido pelo dev em 2026-08-28** — particionar o módulo
por dataset ANTES do PR 6, contra o caminho (b) (fazer 6 e 7 no mesmo PR). **Palavras do dev:**
*"fazer 6 e 7 juntos junta o ALTO RISCO (`src/data/`, tela, netcode) com o BAIXO (fixture), e o
portão visual do 6 ficaria misturado com mudança de fixture."* **A 0(aa) fica FECHADA** — ver lá.
📌 **Este PR não estava no plano dos 7.** Ele nasce da 0(aa), que o PR 2 abriu ao tornar a janela
visível.

Três blocos, um por origem, com o prefixo **no nome da constante**: **`DATA_*`** (leem `src/data/`,
trocam no **PR 6**) · **`FIXTURE_*`** (leem `src/fixtures/dataset-semente/`, trocam no **PR 7**) ·
**`DERIVADO_*`** (leem `scripts/derived/`, **nunca** trocam). Os 7 consumidores passaram a importar
o bloco da própria origem.

🔑 **O que isso fecha:** `RED_BULL_2023` era **UMA** constante consumida pelos **TRÊS** lados, e
entre o PR 6 e o PR 7 há uma janela em que `src/data/` já é fictício e a fixture ainda é real.
Agora **o PR 6 edita SÓ o bloco `DATA_*`**.
🔑 **A duplicação é o produto, não um resto a limpar:** `Red Bull 2023` está nos três blocos e
`Ferrari 2004` em dois — origens que hoje coincidem **por acaso** e deixam de coincidir no PR 6.
**Quem deduplicar reabre a janela.** Está escrito no docblock.

🔴 **O QUE ESTE PR NÃO FAZ, e está dito no código: a partição NÃO é cerca.** Nada impede um arquivo
que lê a fixture de importar do bloco `DATA_*` — o alinhamento consumidor↔bloco é **convenção
sustentada por leitura**. **Teste novo não entrou, por decisão do dev** (*"npm test inalterado"*), e
o custo fica registrado em vez de maquiado. Quem cobre o desalinhamento são os portões do PR 6, que
já estavam no plano: o `throw` de `balance.ts:52` (ruidoso) e o `npm run dataset:report` com sha256
(o caminho silencioso). 🔑 **Mesma família de "guarda de escrita sem guarda de leitura não é teto, é
convenção"** — a diferença é que aqui a convenção está **declarada como tal**.

🔑 **O ACHADO: o digest se moveu num PR verde→verde, e quem pegou foi o `versao.test.ts`.**
`src/engine/draft-test-fixtures.ts` está no escopo do digest (`EH_FONTE_DE_ENGINE`,
`src/engine/versao.test.ts:73-74`), então renomear o import dele derrubou a primeira rodada do
`npm test` em **1637/1638**. **Sem bump de `VERSAO_APP`** — caso "Não", precedente do PR 2.
**Registrado com destaque porque digest que se move em silêncio num PR rotulado verde→verde é a
forma exata do que este repositório já pagou.**

⚠️ **ERRO MEU DE MÉTODO, registrado:** comparei o `dataset:report` rodado por `node` direto (251
linhas) contra a captura do PR 2 feita com `npm run` (255 linhas), e o sha256 divergiu. **A
divergência era do meu recorte, não do programa.** Refeito com o mesmo comando da captura, saiu byte
a byte igual. 🔑 **Comparação cujo MÉTODO de captura não bate não mede o que se pensa que mede** —
mesma lição das cinco contagens do inventário de nomes.

---

**🏆 PR ANTERIOR — NOMES FICTÍCIOS — PR 5 (`anonimizar.ts` + teste diferencial): CONCLUÍDO e
COMMITADO em 2026-08-28**, na `main` (`3d5f105`). **MÉDIO RISCO — rótulo do dev** (o `CLAUDE.md` só define ALTO e
BAIXO; rodaram as obrigações que ele listou, **sem `senior-reviewer`**). **Sem push, sem tag.**
Detalhe completo: `HISTORICO.md` §"NOMES FICTÍCIOS — PR 5".
📌 **A doc foi escrita pela SESSÃO PRINCIPAL, não pelo `doc-writer` — decisão do dev nesta sessão.**
Palavras dele: *"nas últimas quatro sessões auditá-lo custou mais que redigir, e a última rodada teve
23 erros factuais."* Terceiro PR seguido assim. **A auditoria não foi dispensada:** o diff foi
mostrado ao dev e lido antes do commit.

`scripts/anonimizar.ts` + `scripts/anonimizar.test.ts` (16 testes). `idsDaEquipeAno` virou `export`;
`EQUIPE_ANOS_ANONIMO` entrou em `caminhos-dataset.ts`; `npm run dataset:anonimizar` no `package.json`.

🔒 **`src/data/` INTOCADO — decisão do dev, 2026-08-28, que SUPERA a de 2026-08-25** (*"o
`anonimizar` passa a escrever em `src/data/`"*, `PLANOS_ATIVOS.md`). A antiga foi marcada como
superada **no lugar**, não contradita ao lado.
🔴 **E a consequência fica dita, porque ela é o oposto do que o plano prometia: A CÓPIA MANUAL
`derived → src/data/` NÃO MORREU NO PR 5 — ela morre no PR 6**, que é quem publica. Até lá segue
manual e sem guarda. Está escrito em quatro sítios de código de propósito.
🔒 **A saída `equipe-anos.anonimo.json` NÃO é commitada** (decisão do dev: *"artefato derivado
commitado é a segunda fonte que precisa concordar com a primeira"*). Por isso **o teste opera sobre o
RETORNO EM MEMÓRIA da função pura** — `npm test` não depende de artefato gerado.
🔒 **`verificarColisaoDeIds` (`derivar-notas.ts:740`) é RE-EXECUTADA sobre a própria saída**,
importada e não reimplementada: o `anonimizar` não passa por `derivarNotas`, então contornar a
chamada seria contornar a guarda existente.

🔑 **A PROVA, mesma seed (20260827, 22 bots `dificil`, `pista-montreal`):**
**`hashDaCorrida` IDÊNTICO — `5c5d79c59c57ed0b`** (o determinismo sobrevive à troca) e
**`hashDoDraft` DIFERE — `9e7f69dc90bc62e6` → `6dff30f70d22f7d9`** (a anti-vacuidade). **Se os dois
baterem, o `anonimizar` virou cópia.**

🔴 **TRÊS REGISTROS DESTE PR QUE CONTRARIAM O QUE EU AFIRMEI — ficam aqui, não só no `HISTORICO.md`:**
- 🔑 **O erro do `'media'` — e é a LIÇÃO INVERSA da que este arquivo vinha catalogando.** O
  diferencial chamava `atribuirPerfis(..., 'media')`, e **`Dificuldade` é `'facil' | 'dificil'`**
  (`src/engine/types.ts:240`). Em runtime `PROPORCAO_PRA_GANHAR['media']` é `undefined`,
  `rng.next() < undefined` é `false`, e **os 22 bots saíam todos `'passeio'`**. O teste **rodava,
  dava 16/16 verde e hash estável** — hash estável é o que um cenário degenerado produz.
  **Quem pegou foi o `npm run typecheck`, não a suíte.** As seis instâncias já registradas aqui são
  todas "o teste afirmava o que não conferia"; **esta é a primeira em que o portão foi o `tsc`.**
  ⚠️ **Consequência registrada: os hashes que mostrei ao dev no plano estavam medidos sob o cenário
  degenerado.** Os de cima foram re-medidos e **os seis mutantes foram re-rodados contra o código
  final** — a primeira rodada deles não conta.
- 🔑 **Minha previsão sobre `hashDaCorrida` estava ERRADA.** Eu disse ao dev que nenhum mutante
  atingiria a asserção "IDÊNTICO" sozinho. **Três a derrubam: `M-parordem`, `M-ordem` e `M-notas`.**
  A metade que parecia decorativa tem dentes — e `M-parordem` mostra que **trocar os dois pilotos
  DENTRO da equipe muda a corrida**. ✅ E `M-cp` a deixa VERDE, corretamente: cópia preserva a
  simulação. **É por isso que as duas metades não se substituem.**
- 🔴 **`M-idreal` mata UMA asserção só.** Trocar nome exibido e **manter o id real** é o meio-serviço
  mais provável — e o mais grave, porque **os ids SÃO os nomes** e é o id que vai no bundle. Só
  `TODO id difere` o pega: **ponto único de falha.** **Quem for mexer nesse teste precisa saber** —
  afrouxar aquela asserção deixa passar exatamente o defeito que a trilha existe para evitar.

📌 **Portão dos nomes reais INALTERADO em 9.486, e é o resultado certo:** a lista `BASELINE` é fixa e
não inclui `scripts/derived/`. **Quem move essa linha é o PR 6.**

⚠️ **EFEITO COLATERAL MEDIDO, registrado porque é armadilha recorrente aqui: exportar
`idsDaEquipeAno` com docblock EMPURROU `derivar-notas.ts` em +8 linhas e invalidou ÂNCORAS ALHEIAS.**
`idsDaEquipeAno` 629→**637**, o `.sort(cmpStr)` 688→**696**, a interpolação do estrategista
711→**719**; `verificarColisaoDeIds` ficou em **740**. Duas citações **pré-existentes** quebraram
(`scripts/nomes-ficticios.test.ts:604` e a entrada do PR 4 no `HISTORICO.md`) e foram **corrigidas no
mesmo commit de doc**. 🔑 **A lição operacional: acrescentar comentário num arquivo muito citado é
mudança de âncora**, e este projeto já registrou cinco correções de âncora por não notar isso.
⚠️ **NÃO saí corrigindo todas as âncoras do repo:** a citação `derivar-notas.ts:705` aparecia em
quatro sítios e **já estava desatualizada antes deste PR** (a interpolação nunca esteve em 705) — é
deriva pré-existente, não é minha, e mexer nela é PR próprio.
✅ **E o PR próprio veio no mesmo dia — é o bloco a seguir.**

**🧭 PR DE ÂNCORAS — CONCLUÍDO e COMMITADO em 2026-08-28**, na `main`. **BAIXO RISCO — só
comentário, zero diff de runtime.** **Sem push, sem tag.**
**Motivo de ser AGORA, palavras do dev:** *"o PR 6 vai citar âncoras dessa região, e começar com
quatro citações erradas no repo é convite para propagar mais uma."* **Mesmo argumento que fez o PR
(ab) vir antes do PR 4** — consertar o instrumento antes de usá-lo.

**As quatro âncoras de `scripts/derivar-notas.ts`, TODAS RE-MEDIDAS nesta data:**

| sítio | citado como | **medido agora** |
|---|---|---|
| `idsDaEquipeAno` | `:623-631` | **`:637-646`** |
| `nome: titularesDaEquipe[0\|1].nome` | `:691-692` | **`:705-706`** |
| `equipe: equipe.nome` | `:698` | **`:712`** |
| `` nome: `Estrategista ${equipe.nome} ${season}` `` | `:705` | **`:719`** |

🔴 **A ARMADILHA QUE ISTO DESARMA, e ela é pior que "número velho": o `:705` antigo APONTA HOJE PARA
UMA LINHA REAL E ERRADA.** A `:705` é agora `nome: titularesDaEquipe[0].nome` — **o sítio do
PILOTO**. Quem seguisse a citação encontraria código plausível, do assunto certo (normalização de
nome), e concluiria que estava no sítio do estrategista. **Âncora podre que aponta para o vazio se
denuncia sozinha; esta não se denunciava.**
🔑 **E a deriva NÃO é do PR 5:** o `:698` não bate nem somando o deslocamento de +8 que a exportação
de `idsDaEquipeAno` causou (698+8 = 706 ≠ 712). **Era anterior à trilha inteira** — o PR 5 só a
tornou visível ao mexer no arquivo.

**Os quatro sítios corrigidos:** `scripts/portao-nomes-reais.test.ts:75` (a razão MEDIDA do método
do portão), `PLANOS_ATIVOS.md` §NOMES FICTÍCIOS (a 🔒 "varredura de texto cru"), `HISTORICO.md`
(achado de método do PR 2) e este arquivo (a lista dos 4 sítios de normalização).
⚠️ **A troca NÃO foi cega, e isto quase mordeu:** um `replace` literal de `:705` → `:719` também
acertou **a linha que DESCREVE a deriva** ("`:705` aparece em quatro sítios e já estava
desatualizado"), transformando-a em absurdo. Pego na conferência do diff e reescrito à mão. **Sed
sobre prosa que fala do próprio número é armadilha.**

**Medido:** `npm test` **1638/67 — INALTERADO**, e inalterado é o resultado CERTO (nenhuma linha de
runtime foi tocada). typecheck **0**, eslint **0**. `preview/medicoes-pr2/LEVANTAMENTO-PR2.md`
também cita `:705` e **ficou de fora por não ser rastreado pelo git** (`preview/` é gitignored).

---

**🏆 PR ANTERIOR — NOMES FICTÍCIOS — PR 4 (a tabela dos 458): CONCLUÍDO e COMMITADO em 2026-08-27**, na `main`
(`cbe2bbc`). **BAIXO RISCO.** ✅ **PORTÃO DE APROVAÇÃO PRÓPRIO CUMPRIDO: amostra de 20 APROVADA
PELO DEV**, com dois ajustes pedidos por ele e aplicados. **Sem push, sem tag.**
Detalhe completo: `HISTORICO.md` §"NOMES FICTÍCIOS — PR 4".
📌 **A doc foi escrita pela SESSÃO PRINCIPAL, não pelo `doc-writer` — decisão do dev nesta sessão**
(mesmo motivo do PR (ab): auditar tem custado mais que redigir). **A auditoria não foi dispensada:**
o diff foi mostrado ao dev e lido antes do commit.

`scripts/nomes-ficticios.json` (458 entradas: 105 equipes + 353 pilotos) + `scripts/nomes-ficticios.test.ts`
(a cerca) + `TABELA_NOMES` em `caminhos-dataset.ts`. **NENHUM CONSUMIDOR** — quem a aplica é o
`anonimizar.ts` do PR 5.

🔒 **REGRAS DE AUTORIA APROVADAS PELO DEV — valem para toda entrada nova nesta tabela:**
- **Família de construtor mantida, com o MESMO sufixo por fornecedor.** `cooper`/`cooper-climax`/
  `cooper-brm` → **Kestner / Kestner-Vireo / Kestner-NDK**, e **NDK é também a equipe BRM**.
  Medido: 17 ids compostos em 7 famílias, 7 sufixos de motor.
- **Sabor por época**, pela primeira temporada de cada id.
- **Os 7 que foram piloto E construtor compartilham o nome nas duas pontas** (`brabham` → Danforth
  como equipe e como sobrenome dos dois pilotos). São as mesmas 7 agulhas deduplicadas do PR 1.
  **Palavras do dev: "é coerência que o jogo ganha de graça".**
- **Formato de id preservado, sem esquema novo** (regra travada no PR 3).

🔴 **AS DUAS LACUNAS DA CERCA — não são calibráveis, e é por isso que ficam aqui e não só no código:**
- **PRIMEIRO NOME DE PILOTO ESTÁ FORA DO UNIVERSO — decisão do dev sobre medição** (197 de 262
  primeiros nomes aparecem 1× ; agulhá-los inviabiliza a cerca). **Um "Ayrton Vandel" passa VERDE.**
  🔑 **Regra de autoria ALARGADA pelo dev em 2026-08-27:** não usar como primeiro nome algo que seja
  **sobrenome real de piloto** — `Gavin Thorncroft` e `Simon Pennington` passaram verdes e foram
  trocados. *(Palavras do dev: "não é falha da cerca — é da regra de autoria, e ela vale.")*
- **TOPÔNIMO DA CASA DA EQUIPE REAL é cegueira ESTRUTURAL:** o universo (`fatos-agregados.json`) não
  tem nome de lugar. `Faentina` (Faenza/Minardi), `Kowloon` (Theodore) e `Aravalli` (Force India)
  **passaram verdes** e foram trocados **por decisão do dev, não por medição**.
  *(Palavras do dev: "o objetivo é remover referência, não codificá-la de forma mais sutil.")*
🔒 **As duas são REGRA DE AUTORIA, e regra de autoria NÃO É CERCA** — nenhum teste as faz valer.
Quem acrescentar entrada nesta tabela responde por ela na leitura, não no `npm test`.

📏 **TRÊS DESVIOS da definição de distância que o dev tinha assinado — todos medidos, declarados a
ele ANTES da aprovação da amostra, e aprovados depois.** Aprovar nomes produzidos sob definição
diferente da assinada seria substituição silenciosa:
- **Teto 3 no limiar** — a fórmula crua dava 4 em `maxLen 12`, e **o docblock ao lado já dizia 3**.
- **Piso da substring 4 → 6.** Com 4, `berg`/`hall`/`mass` casavam dentro de sobrenome legítimo
  (`Vandenberghe` ⊃ `berg`) — **o `rb` em `Nürburgring` um degrau acima**. 📊 Curva medida:
  **48 / 38 / 36 / 36** para pisos 4/5/6/7 — estabiliza em 6, e o 7 afrouxa de graça.
- **Substring desligada no candidato NOME COMPLETO** — `gavinthorncroft` continha `gavin`, ou seja
  **a cerca proibia primeiro nome, que o dev decidiu deixar fora**.
⚠️ **Efeito colateral REGISTRADO do piso 6:** o conjunto isento de substring não são as 16 agulhas
de <4 — são **todas as de <6**, isto é **mais 116**. **16 nomes fictícios contêm uma delas**
(`Fumagalli`⊃`galli`, `Vandenberghe`⊃`berg`, `Malagoli`⊃`lago`). **São morfologia coincidente e o
dev os julgou um a um** — mas a cerca **não afirma** que estão limpos.

🔑 **FILTRO MECÂNICO TENTADO E REPROVADO, registrado em vez de escondido:** "token que aparece em
mais de um nome de equipe é genérico" devolve `lotus:6 brabham:6 ford:6 cooper:4 … mclaren:2` — **as
marcas mais fortes**, por causa dos compostos. **Inverteria a cerca.** Não entrou allowlist; a regra
do PR 1 vale igual (se o nome incomoda, troca-se o NOME). Mesma família do substituto 2 do
inventário acima.

---

**📏 DUAS MEDIÇÕES DE AUDITORIA — FECHADAS em 2026-08-24.** Nenhum diff de produção; o resultado é
o registro abaixo. **A numeração C1/C2/C3 é do audit e NÃO existe neste arquivo** — por isso o item
que sobrou aberto entra na numeração de cá, como pendência **0(y)**.

✅ **C3 (limite de 22 jogadores) É FALSO POSITIVO DO AUDIT — REFUTADO POR MEDIÇÃO** (precedente do
3.5.2 e do S1 da 0(s), logo abaixo). O audit alegava guarda ausente. **Medido, os três elos:**
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
  sem buraco**; e materialização conferida na fixture,
  `src/fixtures/dataset-semente/equipe-anos.json:27` → `"Estrategista Red Bull 2023"`.
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
  divergente na próxima sessão. **Apagar é decisão do dev; nada foi apagado por mim.**
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

⚠️ **A FIXTURE TAMBÉM TEM NOME REAL, e isso é auto-referente:**
`src/fixtures/dataset-semente/equipe-anos.json` (Ferrari, McLaren, Williams, Schumacher, Prost,
Senna) **e `pecas.json` da fixture** (McLaren, Williams). **A fixture é o artefato que existe para
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

**🏁 CONSERTO DA 0(s) — CONCLUÍDO em 2026-08-23**, na branch **`fix-0s-sala-zumbi`**
(`5f5f2f3` + `5bfa90b`). ALTO RISCO (netcode). **Diff de produção: um `else if` de três linhas** em
`party/sala.ts`. **Medido:** `npm test` **1592/64** em 3 rodadas, `npm run test:party` **19/19**
(era 18/18), typecheck **0**, eslint **0**, build **0**. Detalhe: `HISTORICO.md` §"conserto da 0(s)".

✅ **A 0(s) está FECHADA** — a sala corrompida volta a morrer pela carência de vazio. Ver a pendência
para a cadeia e para a nuance.

🔴 **A REVISÃO REPROVOU NA PRIMEIRA PASSADA, e o bloqueante era uma REGRESSÃO que eu introduzi.**
O conserto persistia `registrarConexoes` nas **duas** direções, e a direção `vazio → não-vazio`
grava `vazioDesde: null`. Com um cliente conectado e **quieto** (o socket só fecha quando ele manda
algo), a carência reiniciava a cada tique: **o caso do teste MD, que sempre funcionou, seria
quebrado pelo lado oposto ao que se temia.** Conserto: a guarda `vazioDesde !== null`.
🔑 **A causa de o furo passar é estrutural e vale além deste PR: nenhum teste de `party/` abria
socket.** Todo o harness rodava com zero conexões, então a direção não-vazia não tinha cobertura.
Fechada com `tiqueComConexoes`, que injeta **só o contador** de conexões.

📊 **BASELINE + 3 MUTAÇÕES, todas VERMELHAS, tabela rodada DUAS vezes** (a segunda contra o código
final), sempre com `tsc` limpo e `git hash-object` conferindo cada reversão:
- **Baseline vermelho**, na ordem certa: a sonda da 0(s) foi **INVERTIDA** (`toBeNull` →
  `not.toBeNull`) e vista vermelha **contra o `party/sala.ts` intacto**, ANTES de o conserto
  existir. Inverter e consertar no mesmo passo daria verde que não prova nada.
- **M-else** (conserto revertido): 3 falharam / 19 · **M-estado** (`aplicar({ estado })`, persiste o
  objeto sem o campo novo): 3 falharam / 19 — **é a que sobreviveria a uma revisão por leitura** ·
  **M-guarda** (a guarda do C1 removida): 1 falhou / 19.

🔴 **ERRO MEU, E É REINCIDÊNCIA DO QUE O PROJETO JÁ CATALOGOU:** rodei uma mutação com a guarda
**ainda não commitada**, e o `git checkout --` da reversão **apagou o conserto**. É a repetição
literal da lição do 3.5.3 — **reversão de mutação sobre trabalho não commitado se faz por CÓPIA**.
Reescrevi, **commitei antes** de voltar a mutar, e as rodadas finais saíram com a árvore limpa.

✅ **ACHADO DE REVISÃO REFUTADO POR MEDIÇÃO (precedente do 3.5.2).** A sugestão S1 dizia que a
identidade de `registrarConexoes` "não está fixada por teste nenhum" e que os testes "asseveram
valores, nunca a referência". **Falso, medido:** `src/net/ciclo-de-vida.test.ts:163-174` já a fixa
com `.toBe()` nas duas direções, com timestamps explícitos — não depende de relógio. Rodado
isolado: verde. **Não implementada.**

---

**🏁 PR C DO SPIKE — GATE DO `alarm()`: CONCLUÍDO em 2026-08-23**, na branch **`pr-c-gate-alarm`**
(`99afde0`). **Último PR do spike, e o primeiro do projeto a assertar sobre o RELÓGIO da casca.**
**Medido:** `npm run test:party` **16/16** (era 10/10), `npm test` **1592/64 INALTERADO** em 3
rodadas — e inalterado é o resultado CERTO: o arquivo mora em `party/`, fora do `include`
(precedente do PR B). typecheck **0**, eslint **0**, build **0**. **Zero diff de produção**
(`party/sala.ts` byte a byte igual ao da `main`), o que sustenta o rótulo BAIXO RISCO e o
`senior-reviewer` pulado. Detalhe completo: `HISTORICO.md` §"PR C".

🔴 **O ACHADO QUE MAIS IMPORTA: a pendência 0(s) está CONFIRMADA por execução** — e o harness ainda
**refinou o diagnóstico** que a leitura tinha. Sala corrompida com `vazioDesde: null` não persiste o
campo em tique nenhum (medido em TRÊS tiques), então o relógio de morte nunca começa; mas sala
corrompida com o `vazioDesde` **já gravado** morre normalmente. **O zumbi é só quem se corrompe
enquanto ainda tinha conexões.** Ver a pendência 0(s) para a nuance inteira — ela muda o que o
conserto pode fazer.

📊 **MB e MD, as duas VERMELHAS, e a tabela foi rodada DUAS VEZES** (a segunda contra o código
final, pela lição do 3.5.2 de que mutação sobrevive justo na rodada intermediária), sempre com
`tsc` limpo e `git hash-object` conferindo cada reversão:
- **MB** (o gate vira condição sempre verdadeira): **2 falharam / 16**, nas duas passadas. Derruba o
  teste do gate **e a sonda da 0(s)** — coerente, e é evidência a favor do diagnóstico: sem o gate,
  `aplicar()` volta a rodar e o `vazioDesde` passa a ser persistido.
- **MD** (o gate sobe para o topo do `alarm()`): **1 falhou / 16**, nas duas passadas.

🔑 **A PRÉ-CONDIÇÃO QUE LANÇA SE PAGOU NA PRIMEIRA EXECUÇÃO.** `exigirCorrompida()` — no molde do
`seedsDe` do PR B — pegou que o teste MB tinha **esquecido de chamar `corromper()`**: a fixture era
uma sala SÃ. Sem ela, o cenário teria rodado errado e o baseline teria sido reportado sem exercitar
a guarda — a sexta instância do 3.5.2 dentro do PR que existe para fechá-la.

🛑 **A ARMADILHA DE VACUIDADE ERA REAL E FOI MEDIDA ANTES DE ESCREVER:** `criarSala`
(`src/net/sala.ts`) grava `vazioDesde: agora`, então envelhecer todos os timestamps de uma vez —
o jeito óbvio de fazer um turno vencer — faria `decidirVida` DESTRUIR a sala antes do gate, deixando
MB verde e a mutação de MB verde junto. Por isso a fixture nasce com o relógio real e só três campos
são sobrescritos: `vazioDesde: null`, `concluidaEm: null` (a **segunda** porta de `encerrar`) e
`iniciadoEm` envelhecido. ⚠️ O campo `iniciadoEm` tem que EXISTIR: o consumidor lê
`iniciadoEm[id] ?? agora`, então campo ausente **não expira** e o teste passaria por vacuidade.

🔴 **DOIS DESLIZES DE MÉTODO MEUS, registrados porque são reincidência:** o `npm run lint | tail`
encadeado com `&&` **mascarou um erro de lint real** (`no-unused-vars`) e o commit saiu com ele —
é o mesmo defeito do `echo "[tsc limpo]"` incondicional do 3.5.4, duas sessões seguidas. **Portão se
lê pelo `exit code`, nunca pela cauda da saída.** Consertado no mesmo PR (por `amend`).

---

**🏆 PR 3.5.4 — UI DO CAMPEONATO ONLINE: CÓDIGO COMPLETO E VERDE em 2026-08-23**, na branch
**`pr-3.5.4-ui-campeonato`** (`cca90e1` + `2d859b5` + `7c5efa9`).
**Sem merge, sem push, sem tag** — aguardando aprovação do dev.
✅ **PORTÃO VISUAL APROVADO PELO DEV em 2026-08-23:** `preview/campeonato-online.html` (arquivo novo).
**Medido:** `npm test` **1592/64** (era 1565/64), `npm run test:party` **10/10**
(inalterado — o PR não toca `party/`), typecheck **0** nos três projetos, eslint **0**, build **0**.
**`VERSAO_APP` 3.4.2 → 3.4.3 — BUMP OBRIGATÓRIO**, e **contraria a regra do digest de propósito.**
O digest de `versao.test.ts` cobre `src/engine/**`, `src/data/**`, `cliente.ts`, `hash-draft.ts` —
nenhum deles foi tocado. O PR vive inteiro em `src/ui/`. O bloqueante C1 da revisão obrigou o bump:
o cliente 3.5.3 atesta corrida avulsa sem o campo `etapa`; servidor preenche `etapa ?? cursor`;
hashes diferem por construção (decisão D6: seed crua × `seedDaEtapa`) e `alarmado` não volta atrás
⇒ banner de divergência permanentemente aceso se os dois builds compartilham sala. Handshake de
`VERSAO_APP` era a única coisa que impedia isso.
**`balance-harness` não rodado, e dito:** zero arquivo de `src/engine/` além de `versao.ts` (constante).

Detalhe completo: `HISTORICO.md` §"PR 3.5.4".

---

**🏆 PR 3.5.3 — CLIENTE MULTIETAPA: CÓDIGO COMPLETO E VERDE em 2026-08-21**, na branch
**`pr-3.5.3-cliente-multietapa`** (`cffe699` + `c64b8b4` + `01689a5` + `d478617` + `92bcee7` + `e48a5fc`).
✅ **MERGEADO na `main` em 2026-08-23** (`922bdd0`, `--no-ff`) ✅ **e PUSHADO pelo dev** — **sem tag.**
⚠️ **CORREÇÃO DE AFIRMAÇÃO DE ESTADO (2026-08-23).** Esta linha dizia *"NÃO mergeado, NÃO pushado,
sem tag"* e a perna **"NÃO pushado" já era FALSA quando foi escrita**: medido na abertura da sessão
do 3.5.4, `git ls-remote origin refs/heads/pr-3.5.3-cliente-multietapa` devolvia **`bce5fc8`**,
idêntico ao `HEAD` local — a **branch** estava no remoto desde o 3.5.3. Só "NÃO mergeado" era
verdade, e deixou de ser nesta sessão. 🔑 **É a QUARTA ocorrência de "afirmação de estado só entra
medida" sobre git** (as anteriores estão logo abaixo, no bloco do 3.5.1) — e desta vez o erro não
foi citar o commit errado, foi **afirmar sobre o remoto sem consultar o remoto**. `git status` diz
o que a árvore tem, **não** o que o `origin` tem; quem responde isso é `git ls-remote`.
**Medido:** `npm test` **1565/64** (era 1544/64), `npm run test:party` **10/10**
(inalterado — não toca `party/`), typecheck **0** nos três projetos, eslint **0**, build **0**.
**`VERSAO_APP` 3.4.2 sem bump, MEDIDO** (nenhum arquivo do digest tocado, nenhum `deriveSeed` novo).
**`balance-harness` não rodado, e dito**: rótulo `camp:` intacto, zero arquivo de `src/engine/`.
Detalhe completo: `HISTORICO.md` §"PR 3.5.3".

🔑 **O RECORTE MUDOU ANTES DE COMEÇAR, por decisão do dev — e o motivo é código, não preferência.**
O plano punha "atestado por etapa" no 3.5.3 e o `key={'etapa-'+k}` + remoção do `naCorrida` no
3.5.4. Rastreado no código: `useCorrida` semeia o `useState` de `fonte` UMA vez, o atestado sai por
mudança de REFERÊNCIA de `corrida`, e `corrida-concluida` não carrega etapa (o balde vem do cursor
do servidor). Logo, atestar `etapa: etapaAtual` **sem o remount** dá **hash da etapa k com a tela da
etapa 0** — a forma exata do bug do 8.4, produzida pelo fatiamento, dentro do PR cuja cerca existe
para impedi-la; e `contrato-corrida-online.test.ts` **não pegaria** (conta sítios textuais, não
remount). **Veredito do dev: opção (A), derivação PURA.** A fiação inteira vai para o 3.5.4, que tem
portão visual. A opção de seguir o plano à risca foi descartada explicitamente — deixaria
divergência conhecida na `main` entre dois PRs.

🔒 **A lógica ficou em módulo PURO (`etapasDaSala`/`classificacaoDaSala` em `corrida-online.ts`), não
no `useMemo`** — porque **o projeto não tem `jsdom` nem `@testing-library` (medido)** e nada dentro
do hook é alcançável por mutação. Desvio declarado da letra do dev ("o map mantém a contagem em 1"):
o sítio único **mudou de arquivo**, não deixou de ser único, e virou testável.

🔴 **A REVISÃO REPROVOU NA PRIMEIRA PASSADA — um bloqueante, confirmado por MEDIÇÃO:**
- **C1** — `etapasDaSala`/`classificacaoDaSala` nasceram **fora** da allowlist. Medido com um
  `PainelFuga.tsx` sintético chamando `etapasDaSala`: a cerca ficava **VERDE, 26/26**, porque o
  arquivo não cita nenhum nome vigiado — **todos ficam atrás da indireção**. 🔑 **Ponto de entrada
  público que computa corrida online entra na cerca NO PR QUE O CRIA** (o 3.5.4 é quem desenha os
  painéis, e é lá que a tentação mora).
- **A3** — a metade **avulsa** das duas semânticas de seed **não tinha baseline**: a mutação
  `seedDaSimulacao = seedDaEtapa(seed, idDaPista)` deixava a suíte **INTEIRA verde, 1557/1557**,
  `tsc` e `eslint` limpos. 🔑 **Bifurcação declarada crítica com um lado travado é meia cerca.**
- **A4/A5 + a meia-frase da 0(t)** — três docblocks que afirmavam mais que o código: a cerca de
  `seedDaEtapa` garante **uma costura só** e não pega quem derive por fora sem citá-la
  (`deriveSeed(seed,'camp:X:online')` passa nela e no registro de namespaces); `etapasDaSala` **não
  olha `draft.fase`** e **LANÇA** em vez de devolver `[]`; e a etapa corrente é
  **`etapas.length - 1`, NUNCA `sala.etapaAtual`**. **Todos consertados.**

📊 **11 mutações, 0 sobreviventes, tabela RERODADA INTEIRA após os consertos** — todas com `tsc` e
`eslint` limpos, cada reversão conferida por `git hash-object`: `M-seedcrua` · `M-seed-default` ·
`M-pista` · `M-indice` · `M-futuras` · `M-throw` · `M-classif` · `M-jogadores` · `M-avulsa` ·
`M-conta` · `M-guarda-classif`.
🔴 **`M-guarda-classif` SOBREVIVEU na primeira tentativa, e é o registro que mais importa da 2ª
passada:** a guarda de fase tinha sido posta dentro do `useMemo`, e **sem jsdom não existe baseline
possível para código dentro do hook** — apagá-la deixava tudo verde. Movida para a função pura, a
mesma mutação ficou vermelha. 🔑 **Guarda sem baseline é o defeito que este PR combate, cometido no
conserto dele** — repetição literal do que o 3.5.2 registrou.

🔁 **A SEGUNDA PASSADA DA REVISÃO voltou SEM BLOQUEANTE, com três avisos — e dois eram sobre os
consertos da primeira:** **A1** (o docblock dizia que a classificação era `[]` junto com `etapas`;
medido, na fase de peça ela já devolvia **17 linhas zeradas**, e um painel do 3.5.4 aberto com
`classificacao.length > 0` mostraria a tabela do campeonato **durante o draft**); **A2**
(`calendarioSorteado` ficou fora da cerca — o docblock declara a etapa como o PAR
`(seed, calendario)` e só a metade da seed estava cercada, justo quando o 3.5.4 precisa do
calendário INTEIRO, que não sai do hook); e **A3** (os números da documentação, que os próprios
commits de conserto tornaram falsos). **Os três atendidos.**
⚠️ **A lista da allowlist de `calendarioSorteado` saiu da CERCA, não de `grep`** — `grep -l` acusava
três arquivos a mais, todos com menção só em comentário. É a lição do `namespaces-seed.ts` na
direção oposta.

🔑 **A PENDÊNCIA 0(t) MELHOROU — e o 3.5.4 pode desfazer isso sem perceber.** A 0(t) previa que este
cliente leria `etapaAtual` para indexar o calendário; **ele nunca lê `etapaAtual`**. No caso
corrompido o snapshot publica `seedsAbertas: []` ⇒ `etapas` é `[]`, sem travar e sem consumir o
campo autocontraditório. 🔒 **Invariante obrigatória para o 3.5.4: indexar por `etapas.length - 1`,
nunca por `sala.etapaAtual`.**

🔴 **TRÊS ACHADOS DE MÉTODO desta sessão** (detalhe no `HISTORICO.md`): (1) a asserção de
**pré-condição** pegou uma seed que colidia com o calendário — `M-pista` sobreviveria por acaso;
(2) a cerca **contrariou a minha própria medição** sobre `namespaces-seed.ts` (o nome está numa
STRING, e `semComentarios` remove comentário, não literal); (3) 🔴 **`git checkout --` apagou o PR
num arquivo** no meio da tabela, porque o alvo era trabalho **não commitado** — a guarda de hash
acusou na hora e as mutações seguintes disseram `ALVO NAO ENCONTRADO` em vez de darem falso verde.
**Reversão de mutação sobre trabalho não commitado se faz por CÓPIA.**

🔴 **O PORTÃO PRINCIPAL FICOU VERMELHO POR CAUSA DA SABOTAGEM NOVA, e o conserto está medido.**
`npm test` caiu com 2 testes de `contrato-ausente.test.ts` — arquivo que o PR não toca. Causa: a
sabotagem varria a árvore **6×** com o arquivo de fuga em disco, e aquela suíte percorre `src/ui/`
com `readdirSync`/`statSync` em paralelo. Conserto: **uma varredura só**, apagar, assertar em
memória, E a causa RAIZ consertada nos dois pontos da janela. **8 rodadas seguidas de `npm test`, 1565/1565 em todas** (a taxa era ~50%). ⚠️ **A janela é PRÉ-EXISTENTE,
medido contra a base:** em `3f54436` as duas cercas juntas já falham **1-2 testes**. Virou a
pendência **0(v)**.

✅ **FECHADA EM 3.5.4 — decisão do dev (A2 da revisão do 3.5.3):** o cliente fixa `'curta'` (5) e o teto de
LEITURA de `nEtapas` no servidor é `[1, 10]` (`sala.ts:324`, contra `seedsEtapas.length`). Caminho (1):
formato **sai de `sala.nEtapas`**, com portão `seedCalendario === null` ANTES do lookup, e **lookup é TOTAL**
(devolve `null`, nunca lança). O lookup total é o que fecha de verdade — teto de leitura `[1, 10]`,
não `{5, 10}`, então um lookup que lançasse teria MOVIDO a pendência, não fechado. Pendência **0(w)**.

**🏁 CORRIDA ONLINE — ENCERRADA. Os quatro PRs feitos (2026-08-12 a 2026-08-17) e o ✅ PORTÃO VISUAL
DO 4/4 APROVADO PELO DEV em 2026-08-18.** Não há nada pendente na corrida online.
- PR 1/4 (`b67ec2b`) — seed e pista sorteadas ao fim do draft online. **Medido:** 1412/56.
- PR 2/4 (`8a8088a`) — uma função só computa a corrida online; mesma referência pra hash e tela (defesa contra bug do 8.4). **Medido:** 1454/60.
- PR 3/4 (`50906af`) — barreira no fim (versão fraca, não bloqueia ninguém) + `concluidaEm` marca a corrida. **Medido:** 1472/61. **Bloqueante da revisão (reidratação) foi corrigido.**
- PR 4/4 (`44d0dc8` + `8489b6f`) — **a corrida chega na tela.** Botão "Ir pra corrida" com guarda,
  `FluxoCorrida` no modo `'pronta'`, resultado com pontuação FIA, atestado da barreira no fim do
  replay, banner ramificando por escopo. **Medido:** 1480/62, typecheck 0, eslint 0, build 0.

✅ **Veredito do dev sobre `preview\corrida-online.html`: APROVADO (2026-08-18).** Portão fechado.

**🏆 3.5 CAMPEONATO ONLINE — PR 3.5.1 FEITO em 2026-08-18**, na branch
`pr-3.5.1-seed-por-etapa` (`83a6fde` + `ffdabc1` + `4a4b801`). ✅ **MERGEADO na `main`** (`3308be3`)
✅ **e PUSHADO** — **sem tag**, como o dev pediu. **`npm test` 1516/63** (era 1480/62), typecheck
app **0**, typecheck `party/` **0**, eslint **0**, build **0**. Plano em `PLANOS_ATIVOS.md`
§"3.5 CAMPEONATO ONLINE".

⚠️ **CORREÇÃO DE AFIRMAÇÃO DE ESTADO (2026-08-19).** Linha anterior dizia *"NÃO mergeada, NÃO pushada,
sem tag — aguardando o dev"* e **estava falsa nas duas primeiras pernas**. Medido em 2026-08-19 com
HEAD na `main`: `git ls-remote origin refs/heads/main` = `f9d5348`, **idêntico ao `HEAD` local**; `git
rev-list --left-right --count origin/main...main` = `0 0`. ⚠️ Esta linha citou por um momento um
`5fca74b` que **não era o `HEAD`** — quarta ocorrência da mesma lição, dentro do próprio bloco que a
registra. Branch `pr-3.5.1-seed-por-etapa` segue só local (`3282852`), contida na `main`. É a
terceira ocorrência de **"afirmação de estado só entra medida"** — desta vez sobre git.

🔄 **ESTADO DO GIT REMEDIDO EM 2026-08-19, pós PR A + PR B** (a linha acima descrevia a sessão
anterior e envelheceu — remedir é obrigação, não zelo):
`git rev-parse HEAD` = **`aa68690`**, branch **`main`**; `git ls-remote origin refs/heads/main` =
**`b41deb7`**; `git rev-list --left-right --count origin/main...main` = **`0 6`**.
**A `main` local está 6 commits À FRENTE do remoto e NADA foi pushado** — os merges do PR A
(`c798976`) e do PR B (`aa68690`) são locais, **sem tag**, como o dev pediu.

Escopo: `src/net/` + `party/`, sem UI. Implementa `B-indep` (decisão D1): **11 seeds INDEPENDENTES
sorteadas no DO** (10 etapas + calendário), publicadas uma por etapa quando aquela abre. **O cursor
ainda NÃO avança** — só etapa 0 sai. `VERSAO_ESTADO_SALA` discrimina sala legado de corrompida;
`estadoDasSeeds` devolve `legado | ok | corrompida` e casca recusa corrompida.
- 🔑 **`VERSAO_APP` ficou em 3.4.2 — sem bump, e MEDIDO** (plano dava como certo; digest
  `src/engine/**` + `src/data/` + `cliente.ts` + `hash-draft.ts` — nenhum tocado; rótulos novos:
  nenhum em `src/engine/`).
- 🔴 **A revisão achou UM BLOQUEANTE e ele era real:** `party/` tem cobertura zero. M5 e M6 no sítio
  real deixavam suíte **inteira verde — 1509/63**. Conserto: **cerca textual** sobre `party/sala.ts`,
  nasceu com dois defeitos (ambos pegos rodando): regex falso-negativo multilinhas, cheque cego.
- **6 avisos da revisão aplicados** (A1–A6). Três pendências novas: **0(p)** ✅ **FECHADA 2026-08-19
  (dev mediu despejo real)**; **0(q)** ordem deploy wrangler antes vite (3.5.2+); **0(r)** `etapaAtual`
  fora discriminante.

✅ **PENDÊNCIA 0(p) FECHADA em 2026-08-19 — o dev rodou o despejo real.** Sala 420320 pós-3.5.1,
worker derrubado, reconexão forçando reidratação. **As 11 seeds vieram idênticas**; cinco pré-3.5.1
em `legado`. Requisitos (a) e (b) do baseline deixam de ser projeto e viram **fato medido**.

**✅ PR A DO SPIKE — VEREDITO DO DEV: GO (2026-08-19).** `@cloudflare/vitest-pool-workers` adotado.
Commit de código `72b931e`, **MERGEADO na `main` em `c798976`** (`--no-ff`), sem tag, sem push.
**Três achados que contrariam o plano aprovado** (o valor do spike): (1) `nodejs_compat` **não foi
necessária** — teste passa SEM flag, então teste e produção rodam sob a MESMA config de compat, e a
decisão travada do 3.2 fica preservada na substância, não só na letra; (2) compensador `--dry-run`
era vacuoso — `scripts/checar-casca-sem-node.ts` empacota e **inspeciona o bundle**, e roda dentro do
`npm run build`; (3) **`isolatedStorage` não existe mais na v0.22** — o storage ATRAVESSA os `it`s;
substitutos medidos: nome de DO distinto por teste + `reset()` + `evictAllDurableObjects()`.
**Descoberta crítica:** o `wrangler` do topo precisou ser **PINADO exato (4.120.0)** pra não
deduplicar para o 4.124.0 que o pool traz. Detalhes em `HISTORICO.md` §"PR A".

**✅ PR B DO SPIKE — FEITO em 2026-08-19.** Commit `ceb2228` na branch `pr-b-cobertura-seeds-casca`,
**MERGEADO na `main` em `aa68690`** (`--no-ff`), sem tag, sem push. **BAIXO RISCO** (diff de produção
= 4 linhas de comentário, aprovadas pelo dev), sem `senior-reviewer`.
🔑 **É o primeiro arquivo do projeto que asserta LÓGICA sobre `party/sala.ts`** (`party/seeds.test.ts`,
rodando no `workerd`): sorteio dos 11 slots pelo caminho real (`criarSeNova` → `criar`) e reidratação
pós-`evictAllDurableObjects()` sem re-sorteio.
**Medido na `main` pós-merge:** `npm test` **1516/63** (inalterado, e correto — a matriz entrou como
docblock, não como asserção), `npm run test:party` **8/8** (era 5/5 no PR A), typecheck **0** nos
três projetos, eslint **0**, build **0**.
🔴 **DOIS ACHADOS QUE DERRUBARAM O PLANO APROVADO, ambos medidos antes de escrever teste:**
(1) **MR é inutilizável como baseline** — ela derruba a **quarta** exigência da cerca textual
(`const todas = Array.from(slots)`, que o plano não considerou) **e** dá **TS2740**, vermelho de
compilação, que não conta. Os dois motivos são independentes.
(2) 🔑 **Mais grave: NENHUM baseline do plano exigia o `evictAllDurableObjects()`** — MA cai na
criação, MR também. A metade **reidratação** sairia com **cobertura declarada e não provada**, que é
a forma exata do defeito do baseline do 3.5.1, dentro do PR que existe para fechá-lo.
**Conserto aprovado pelo dev: MR sai, entra MC** (`carregar()` deixa de ler o storage) — o vermelho
dela pousa **DEPOIS** do evict, com as asserções anteriores passando. Baselines **MA** e **MC**
vistos vermelhos um a um, com a cerca textual **VERDE (36/36)** ao lado, revertidos e verdes de novo.
✅ **R4 fechado por medição** (ver pendência 0(p)): `Uint32Array` sobrevive ao storage do DO.

**➡️ DECISÃO DO DEV (2026-08-20): PR C ADIADO — abre o 3.5.2 direto.** O **PR C** é o gate do
`alarm()` (`party/alarme.test.ts`, baselines MB/MD + anti-vacuidade). **Ele não foi cancelado: foi
REPOSICIONADO para DEPOIS do 3.5.4**, último PR da Fase 3, e **antes de declarar a Fase 3 encerrada**.
**Motivo registrado pelo dev:** o 3.5.2 vai exercitar `onMessage` de qualquer forma ao testar o
cursor, e **cobertura defensiva rende mais depois de a lógica existir** — o C escrito hoje seria
moldado ao código de ontem, e escrito depois é moldado aos bugs reais que a casca revelar.
⚠️ **A PRIMEIRA METADE DESSE MOTIVO NÃO SE REALIZOU — medido em 2026-08-20, ver a correção na
§"🟡 RISCO ATIVO".** O 3.5.2 testou o cursor pelo redutor puro (`aoReceber`, em `src/net/`), **não
por `onMessage`**; `npm run test:party` segue 8/8 e nenhum arquivo de `party/` foi tocado. **A
decisão de adiar o PR C continua de pé** — a segunda metade do motivo (cobertura moldada aos bugs
reais) é independente e não foi afetada —, mas o adiamento sai **mais caro do que o registrado**:
esperava-se herdar `onMessage` de graça, e não se herdou nada.
🔁 **GATILHO DE REAVALIAÇÃO, travado junto com a decisão:** se o **3.5.2 ou o 3.5.3 revelarem na
casca um bug que o PR C teria pego**, puxar o C para a frente em vez de seguir a sequência.
🛑 **O preço aceito, dito por inteiro** (era o argumento contra, e continua verdadeiro): o 3.5.2
nasce na única parte da casca ainda sem cobertura, e a **pendência 0(s)** — suspeita de sala-zumbi —
segue **não confirmada**, porque quem a confirmaria é o harness que o C constrói.

**🔢 SEQUÊNCIA ATÉ FECHAR A FASE 3 (atualizada em 2026-08-23, no conserto da 0(s)):**
**~~3.5.2~~ ✅ → ~~3.5.3~~ ✅ → ~~3.5.4~~ ✅ → ~~PR C~~ ✅ → ~~CONSERTO DA 0(s)~~ ✅ →
~~⬅️ Fase 3 PRONTA PARA SER ENCERRADA.~~ ✅ **FASE 3 ENCERRADA.**
✅ **O VEREDITO VEIO — ditado pelo dev, datado por ele 2026-08-27, registrado nesta sessão de
2026-08-28.** ~~🛑 **A FASE 3 NÃO ESTÁ ENCERRADA — encerrá-la é DECISÃO DO DEV, e ela não foi
tomada.** Todos os passos planejados estão feitos; o que falta é o veredito, não trabalho. **Não
marcar como encerrada sem ele.**~~
🔒 **A linha riscada acima estava CERTA quando foi escrita e ficou FALSA quando o dev decidiu — por
isso é riscada aqui, no lugar, e não contradita noutro parágrafo.** É a mesma regra do `CLAUDE.md`
§"o `doc-writer` NÃO APAGA": afirmação nova ao lado da antiga contraditória devolve o estrago,
dependendo de qual o próximo leitor achar primeiro.
📌 **Proveniência e âncora — os dois fatos, sem escolher entre eles:** o dev ditou o encerramento
**nesta sessão**, datando-o **2026-08-27**; o registro entra em **2026-08-28**. ⚠️ **Correção de
âncora: o pedido citou `ESTADO.md:1004`, e o sítio da divergência é este bloco (`:1070-1075` antes
desta edição).** A `:1004` fala de `estadoDasSeeds` e nada tem com a Fase 3. Mesma família das
correções de âncora já registradas neste arquivo.
📋 **A lista do que fica ABERTO apesar do encerramento está na §"FASE 3 ENCERRADA"**, no bloco da
Fase 3 mais acima.
🔴 *(Registro do passo que acabou de fechar:)* **o CONSERTO DA 0(s) foi um passo NOVO, criado porque
o PR C mediu.** A pendência era suspeita por LEITURA desde 2026-08-19, ficou **CONFIRMADA por
execução** no PR C e foi **RESOLVIDA** em 2026-08-23 — ver a 0(s) na lista de pendências. A Fase 3
não podia fechar antes dele: era bug de produção conhecido, na casca.
🔒 **O 3.5.4 herda MAIS do que o plano previa**, por decisão do dev no 3.5.3 (opção A): além dos
painéis e do portão visual, ele leva o **`key={'etapa-'+k}`**, a remoção do **`naCorrida`** e o
**atestado por etapa** — as três são a mesma solda, e separá-las produz hash de uma etapa com a tela
de outra. Ver a §Onde parei.

**🏆 PR 3.5.2 — CÓDIGO COMPLETO E VERDE em 2026-08-20**, na branch **`pr-3.5.2-cursor-por-etapa`**
(o commit `wip` `469278f` mais o trabalho desta sessão). **NÃO commitado como final, NÃO mergeado,
NÃO pushado, sem tag.**
✅ **ITEM 3 DO `CLAUDE.md` (revisão de ALTO RISCO) FECHADO — em DUAS passadas.** A primeira
**reprovou** (três bloqueantes). Os consertos foram revisados numa **segunda passada, que voltou SEM
BLOQUEANTE** e com quatro avisos; **três deles eram sobre o próprio conserto e foram atendidos** —
ver "A segunda passada" abaixo. Rodar a segunda passada não era zelo: mutação verde prova que o
conserto FUNCIONA, e não substitui o portão. Barreira e avanço de cursor por etapa, elegíveis recomputados, `concluidaEm` só na última,
**+ conserto do detector** (campo `etapa`, chave `${escopo}:${etapa}`), **+ os três bloqueantes da
revisão consertados**. **Medido:** `npm test` **1544/64** (era 1516/63), `npm run test:party`
**10/10** (era 8/8), typecheck **0**, eslint **0**, build **0**.

🔴 **A REVISÃO REPROVOU O PR NA PRIMEIRA PASSADA — três bloqueantes, e os três se confirmaram por
MEDIÇÃO, não por leitura.** É o registro que mais importa desta sessão:

- **C1 (substância, código de produção).** `nEtapas` virou campo do estado persistido e ficou **fora
  do discriminante**, lido por um `??` com default 1 — enquanto `seedsEtapas`, `seedCalendario` e
  `etapaAtual` já estavam dentro. **Medido em sonda descartável:** sala de 5 etapas que perde o
  campo na reidratação faz a PRIMEIRA barreira gravar `concluidaEm` (contra `concluidaEm: null` +
  cursor 1 no controle) — **campeonato de 5 etapas encerrado na etapa 1, em silêncio**; e com o
  cursor já em 3 a sala vira **`corrompida`** (`etapaAtual fora de [0, 0]: 3`) e recusa todo mundo.
  🔑 **O bump de `VERSAO_ESTADO_SALA` (1 → 2) era PRÉ-REQUISITO do conserto, não zelo:** com a
  versão parada, "sala 3.5.1 que legitimamente não tem o campo" e "sala 3.5.2 que o perdeu" são o
  mesmo objeto e **nenhuma guarda consegue separá-las**. Conserto: versão 2, `nEtapas` em
  `estadoDasSeeds` sob `versaoSala >= 2`, e default 1 preservado **só** para v1.
- **C2 e C3 (método).** Aqui o código estava **certo** — o que não existia era prova. **C2:**
  neutralizar a guarda `if (etapa < cursor)` deixava a suíte **inteira verde, 1531/1531**, incluindo
  o teste chamado `🔴 BASELINE D1: cliente ATRASADO … é ignorado EM SILÊNCIO`. Ele rodava com o
  cursor parado em 0, então a condição era `0 < 0` — **a guarda nunca era entrada**, e o silêncio
  vinha do balde vazio. **C3:** o mutante `atestado.etapa ?? 0` — que o docblock diz que "devolveria
  o alarme falso inteiro pela porta do conserto" — sobrevivia a tudo, porque nenhum teste mandava
  atestado sem o campo com o cursor fora do zero.

🔑 **É a SEXTA instância de "o teste afirmava o que não conferia"** (as cinco anteriores estão na
§Processo), desta vez **dentro do teste rotulado como baseline** da decisão que o PR chama de
inseparável. **A lição operacional que fica: baseline cujo cenário não ALCANÇA a guarda não é
baseline.** Os dois testes agora asserem as pré-condições (cursor andou; balde populado com hash
conflitante) em vez de supô-las, e os dois foram **validados por mutação**.

📊 **TABELA DE MUTAÇÕES — 12 mutações, todas VERMELHAS contra o código final**, e todas com
`tsc` limpo (vermelho comportamental, nunca de compilação). Ordem em todas: verde → aplica → **vê
vermelho** → reverte → verde, com `git hash-object` conferindo cada reversão:
`M-det` 7 · `M-cursor` 22 · `M-anchor` 1 · `M-eleg` 1 · `M-nEtapas` 2 (na casca) · `M-C1` 4 ·
`M-C1v` (versão volta a 1) 5 · `M-C2` 1 · `M-C3` 1 · `M-A4` 1 · `M-A1` 3 · `M-A3` 1.

🔑 **DUAS MUTAÇÕES SOBREVIVERAM NA RODADA INTERMEDIÁRIA, e as duas eram sobre o conserto que eu
mesmo tinha acabado de escrever — foi assim que os avisos 1 e 3 da segunda passada saíram de
"leitura do revisor" para "fato medido".** Registrado porque é o argumento a favor de rodar a tabela
INTEIRA de novo depois de cada conserto, e não só as mutações novas.

🔴 **ACHADO PRÓPRIO DA SESSÃO, e ele nasceu VERDE — `M-nEtapas`.** Trocar `N_ETAPAS_CURTA` por `1`
na chamada de `criarServidor` em `party/sala.ts` sobrevivia a **TODOS** os portões: typecheck 0,
eslint 0, `npm test` 1531/1531, `npm run test:party` 8/8. Medido em duas formas para eliminar o
colateral: com `1` literal o eslint acusava só o import órfão; com `Math.min(N_ETAPAS_CURTA, 1)`
**nada acusava nada**. Em produção: campeonato online de UMA etapa, com todo o resto do PR
funcionando. 🔑 **O parâmetro obrigatório sem default pega a OMISSÃO (não compila) e NÃO pega o
VALOR ERRADO** — o docblock de `criarSala` podia ser lido como mais forte do que é. **Fechado nesta
sessão** (aviso A5 da revisão, autorizado pelo dev): `party/seeds.test.ts` ganhou cerca
comportamental que lê `nEtapas` do estado **persistido** e do **snapshot**, com anti-vacuidade.
✅ **A segunda propriedade que a revisão dava como descoberta JÁ ESTAVA COBERTA** — refutado por
mutação: `todas[MAX_ETAPAS] → todas[0]` cai em `party/seeds.test.ts:137`, a asserção de MA do PR B.
**Achado de revisão também entra medido.**

**🔁 A SEGUNDA PASSADA DA REVISÃO — sem bloqueante, quatro avisos, TRÊS deles sobre o conserto:**
- 🔴 **Aviso 1 — a guarda do N2 NÃO cobria o caso C1, e o docblock dizia que cobria.** Ela validava
  a forma do **cursor**; uma sala v2 sem `nEtapas` **com o cursor em 0** tem `nEtapasDaSala` no piso
  1, `cursorIntegro(0, 1)` verdadeiro, guarda passando — **o modo de falha do C1 intacto dentro da
  camada pura**, defendido só pelo `jogavel()` da casca, exatamente como antes. **Medido e
  consertado:** a guarda passou a consultar `estadoDasSeeds`, a MESMA autoridade do discriminante.
  🔑 **É a classe de defeito que este PR inteiro existe para combater, cometida no conserto dela** —
  escrever a garantia no comentário não a implementa.
- 🔴 **Aviso 3 — `nEtapas` tinha guarda de ESCRITA e não de LEITURA.** `criarSala` limitava a
  `[1, seeds.etapas.length]`, mas um `nEtapas: 999` vindo do storage passava, e `aoReceber` usa
  `nEtapasDaSala - 1` como teto de `atestadoValido` ⇒ **999 baldes por escopo no Durable Object**,
  derrubando a propriedade que o próprio PR declara. **Guarda de escrita sem guarda de leitura não
  é teto, é convenção.** Consertado no discriminante, com anti-vacuidade (`MAX_ETAPAS` continua
  legítimo).
- 🔴 **Aviso 4 — dois docblocks que o PRÓPRIO PR falsificou.** `tipos.ts` dizia que `nEtapas` é
  "fixo em `N_ETAPAS_CURTA`" (deixou de ser: o snapshot publica 1 para sala v1/legado) e que o
  cursor "no 3.5.1 NÃO avança" (é o PR que o faz avançar); `sala.ts` dizia que `seedsAbertas`
  devolve "exatamente UM elemento". **Corrigidos no lugar**, não contraditos em outro arquivo.
- 🟡 **Aviso 2 — `versaoSala` é o único campo persistido sem checagem de FORMA.** `null`, `0`,
  `NaN` ou string atravessam as duas portas (`=== undefined` falso, `>= 2` falso). **NÃO
  consertado: é decisão do dev**, porque mexer no caso `undefined` contradiria comportamento já
  fixado por teste. Registrado como **0(u6)**.

🔴 **E a guarda morta que a tabela pegou:** o cheque de cursor que sobrou ao lado do novo virou
**inalcançável**, e `M-N2` passou a deixar a suíte inteira verde. **Removido, não documentado** —
guarda que nenhuma mutação mata é guarda morta, e guarda morta ao lado de um comentário que a
explica é a próxima afirmação falsa esperando leitor.

**Consertos aplicados nesta sessão, com o escopo que o dev autorizou** (bloqueantes + A5 + A4/N2):
- **C1** — `VERSAO_ESTADO_SALA = 2`; `nEtapas` no discriminante; default 1 restrito a v1; corrigido
  o comentário FALSO de `servidor-sala.ts` que afirmava "sem bump — o formato não mudou".
- **C2/C3** — os dois testes da D1 reescritos para alcançar as guardas de verdade.
- **A5** — cerca comportamental de `nEtapas` na casca (`party/seeds.test.ts`).
- **A4** — `criarSala` recusa `nEtapas` fora de `[1, seeds.etapas.length]`, na mesma guarda e pelo
  mesmo motivo do `throw` da cardinalidade das seeds.
- **N2** — a barreira deixou de **curar em silêncio** um cursor fora de faixa: `etapaAtual: -3`
  saía de lá como `1`, transformando sala `corrompida` em íntegra. Agora devolve o mesmo objeto.
  Preserva sala LEGADO (campo AUSENTE ≠ campo fora de faixa), com anti-vacuidade própria.

⬅️ **AVISOS DA REVISÃO NÃO CONSERTADOS — viraram a pendência 0(u)**, por estarem fora do escopo
autorizado. **O mais urgente é de DEPLOY, não de merge (A3).**

🔑 **DECISÃO DO DEV (2026-08-20) sobre o gatilho do PR C: o achado `M-nEtapas` NÃO o dispara.** O
gatilho nomeia o `alarm()`; isto é o caminho de CRIAÇÃO, o valor está certo hoje, e é ausência de
portão, não bug. **PR C segue depois do 3.5.4.**

🛑 **A OPÇÃO DE ABANDONAR O 3.5 FOI POSTA AO DEV nesta sessão, como o `ESTADO.md` exigia — e ele
decidiu SEGUIR COM O 3.5** (2026-08-20). A obrigação de visibilidade está cumprida; o texto do
"o que o abandono custaria" fica abaixo como registro do que foi pesado, não como pergunta aberta.

*Texto original do item, preservado:* **PR 3.5.2** — barreira e avanço de cursor por etapa,
elegíveis recomputados,
`concluidaEm` só na última, **+ conserto do detector** (campo `etapa`, chave `${escopo}:${etapa}`).
🛑 **É no 3.5.2 que o dev pediu para ver, VISÍVEL, a opção de abandonar o 3.5 inteiro** — o corte
honesto da fase pode ser o próprio 3.5, e é ali que a decisão é barata.
✅ **CUMPRIDO E DECIDIDO EM 2026-08-20: a opção foi apresentada ao dev na sessão do 3.5.2, com os
três bloqueantes da revisão já na mesa (o que a tornava mais barata ainda — C2 e C3 evaporariam
junto com o 3.5, e C1 quase todo). VEREDITO DO DEV: SEGUIR COM O 3.5.** O bloco abaixo fica como
registro do que foi pesado; **não é mais pergunta aberta**, e reabri-lo é decisão nova do dev.
🛑 **(Texto do pedido original, preservado.) E É AGORA (2026-08-20): o 3.5.2 é esta sessão.** O pedido
foi para a opção estar visível **no momento** do 3.5.2, não depois — abandonar o 3.5 custa 3 PRs
poupados agora (3.5.2 + 3.5.3 + 3.5.4) e custa muito mais depois do 3.5.3. **O que o abandono
sacrificaria:** o campeonato online inteiro; a corrida online avulsa (encerrada no 4/4) **fica de
pé sozinha** e a Fase 3 fecharia com ela + o PR C.
**O que o abandono TAMBÉM dispensa:** o conserto do detector (alarme falso travado a partir da
etapa 2) — o alarme falso **só existe porque existe etapa 2**, então ele some junto com o 3.5. Não
é dívida que fica; é trabalho que deixa de ser necessário.
**O que o abandono NÃO resolve:** as pendências **0(i)** (`seedMestre` de 32 bits, enumerável) e
**0(o)** (assimetria de postura entre corrida avulsa e campeonato) — elas seguem abertas de
qualquer jeito, e continuam esperando o PR de alargamento de entropia. ⚠️ Com o 3.5 abandonado,
0(o) muda de forma (não haveria campeonato online para contrastar com a avulsa), **mas 0(i) não
muda em nada** — ela é da corrida avulsa, que fica.

**Duas decisões de arte esperando o dev** (nenhuma bloqueia o merge): os dois botões do
`TelaResumo` são ambos `botao-primario` (pré-existente do offline, agora visível no online); e o
`FluxoOnline.tsx:218-230` não tem cobertura automática — sem jsdom não há clique.

Concluído antes: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.8**, e a Fase 8 nos
PRs **8.1** (calendário sorteado), **8.2** (round-trip do save) e **8.4-mínimo** (o campeonato
deixou de ser inalcançável — tem seletor, encadeia corridas, salva e retoma).

## SEQUÊNCIA — o que sobrou

**🔢 ~~ATÉ FECHAR A FASE 3~~ — SEQUÊNCIA CUMPRIDA (atualizado em 2026-08-20, decisão do dev que
adiou o PR C do spike; ✅ RISCADA em 2026-08-28, no encerramento da fase):**
**~~3.5.2 → 3.5.3 → 3.5.4 → PR C → Fase 3 encerrada.~~** Os quatro passos foram entregues, mais o
**conserto da 0(s)** que o PR C obrigou. O PR C era o gate do `alarm()` e foi **reposicionado** para
o fim, não cancelado — motivo e gatilho de reavaliação na §"Onde parei".
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
  `deriveSeed(seedBase, \`camp:${pistaId}\`)`. A 0(z) está registrada na §"Onde parei" (degradação
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
   (y) 🔴 **NOVA (medição de auditoria, 2026-08-24) — A GUARDA DE 22 PROTEGE O ROSTER, NÃO AS
   CONEXÕES. Socket aberto que nunca manda `entrar` não é limitado por nada.** É o **item C2 do
   audit**, e é o único dos três que sobreviveu à medição — o C3 foi refutado (ver §Onde parei).
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
   §Onde parei). **A numeração é minha, atribuída nesta sessão** pelo mesmo precedente da 0(y) —
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
   só servindo os três lados**, que era exatamente a janela. Ver a §Onde parei.
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
   🔑 **`RED_BULL_2023` é consumido pelos TRÊS.** Entre o PR 6 e o PR 7 existe uma janela em que
   `src/data/` já é fictício e a fixture ainda é real — e **uma constante só não serve os dois
   lados**. Nessa janela o `.find` do lado não-trocado deixa de achar: `balance.ts:52` **lançaria**
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
- Previews visuais em `preview/` (gitignored). **Preview gerado só conta como entregue depois de
  MOSTRADO ao dev, com CAMINHO ABSOLUTO** — foi exatamente o que falhou no 7.4.
- **`referencias/` é gitignored** (imagens de terceiros, GDD §14.2).
- Harness: `npm run balance` já embute `--reporter=verbose --silent=false`. Ao chamar o vitest na
  mão, passar as flags, senão a tabela é engolida.
- **Nunca ler `src/data/*.json` por completo** (`equipe-anos.json` ≈ 324 mil tokens). Formato:
  `src/fixtures/dataset-semente/`. Consulta: `jq`/`grep` com filtro.
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
