# F1 Fantasy — Projeto (memória do Claude Code)

Jogo de navegador de draft/simulação de F1 (1950-2025), inspirado nos jogos "7x1" e "38 a 0".
Este arquivo é a memória sempre-ativa do projeto. As regras aqui são **invioláveis**.

---

## O que ler em sessão nova (ordem obrigatória)

1. **`CLAUDE.md`** (este arquivo) — regras invioláveis.
2. **`ESTADO.md`** — estado atual, onde parei, próximo PR, pendências ativas, regras da Fase 7.
   🔒 **NUNCA INTEIRO** (decisão do dev, 2026-10-28). Ler só: o topo (§"Estado atual"),
   §"Onde parei", §"🔒 DECISÕES DO MARCOS — VIGENTES" e §"Pendências ATIVAS". O resto, só por
   seção, quando o trabalho pedir. É a mesma regra do topo do `ESTADO.md`.
   ~~É o único documento de estado que se lê por completo.~~ **Substituída em 2026-10-28**: o
   arquivo tinha **3.809 linhas** nesse dia (o "~60 linhas" antigo nunca foi verdade nesta fase).

**Sob demanda, nunca por completo na abertura:**

- **`PLANOS_ATIVOS.md`** — os planos de fase **ATIVOS** (Fase 3, 3.5 campeonato online, spike da
  casca). Criado em 2026-08-19, na higiene do `ESTADO.md`: eram 51% do arquivo e se leem **uma vez,
  quando o PR começa**, não em toda sessão. Consultar **o plano que interessa**, nunca inteiro.
  🔒 **O plano mora lá; as OBRIGAÇÕES (decisões travadas, regras invioláveis, pendências) ficaram no
  `ESTADO.md`**, em blocos de retenção. Procurando uma regra inviolável? Está no `ESTADO.md`.
- **`HISTORICO.md`** — registro detalhado dos PRs das fases **6 e 7**. Consultar
  **o PR que interessa** quando precisar do porquê de uma decisão. Ler inteiro estoura o contexto
  inicial — foi exatamente por isso que o `ESTADO.md` passou a existir.
  ⚠️ **Medido em 2026-08-31: 5.831 linhas, 544 KB** — cresceu 889 linhas na higiene daquele dia, que
  lhe passou 845 linhas da §"Onde parei". 🔴 **A cifra antiga, "~19 mil tokens", era ERRADA por
  cerca de 8×** e foi retirada em vez de atualizada: ela não fecha com nenhuma outra medida deste
  arquivo. **A ordem de grandeza real é de ~160 mil tokens.**
- **`HISTORICO_ARQUIVO.md`** — fases **0 a 5**, encerradas (~12 mil tokens; **39 KB, e esta cifra
  CONFERE**). Mesma regra: consulta por PR, nunca leitura completa.
- **`PLANO_CLAUDE_CODE.md`** — plano de build por fase e direção de arte.
- **`F1_Fantasy_GDD.md`** — regras de jogo, notas, pistas, catálogo de peças.

🔒 **O MÉTODO, porque número sem método não se verifica depois** (lição do 33/6/2, `ESTADO.md`
§"MEDIÇÕES E AUDITORIAS"): as cifras acima são **bytes e linhas medidos** — `wc -c`, reproduzível.
A conversão para tokens usa **~3,3 caracteres por token**, que é a razão implícita nas DUAS âncoras
que este arquivo já trazia e que batem entre si: `equipe-anos.json` (1 MB ⇒ 324 mil tokens) e
`HISTORICO_ARQUIVO.md` (39 KB ⇒ 12 mil). **O "~19 mil" do `HISTORICO.md` era o único fora dessa
razão** — daria 25,6 caracteres por token, o que não corresponde a tokenizador nenhum.
⚠️ **Token é ESTIMATIVA declarada, não medição:** não há tokenizador neste repositório. **Bytes e
linhas são o que está medido; quem precisar do número exato roda um tokenizador e corrige aqui.**

**Ao concluir um PR, o `doc-writer` ESCREVE OS DOIS:** entrada detalhada no `HISTORICO.md`
(acumula) e o `ESTADO.md` **atualizado — só a seção "Onde parei" é reescrita** (ver a regra logo
abaixo). Se só um dos dois for atualizado, a próxima sessão começa com informação errada.
**Quem AUDITA o conteúdo e COMMITA é a sessão principal, nunca o `doc-writer`** — ver a seção
"NENHUM SUBAGENTE COMMITA", logo abaixo.

## 🔒 O `doc-writer` NÃO APAGA SEÇÃO DE RESTRIÇÃO PERMANENTE DO `ESTADO.md` (inviolável)

**Aconteceu em 2026-08-12:** a atualização do PR 1/4 da corrida online reescreveu o `ESTADO.md` de
**646 para 137 linhas**, levando junto as decisões travadas da paleta, as decisões travadas do
redesenho e as regras invioláveis da Fase 7 — restrições que o dev aprovou uma vez e que não podem
ser reabertas sem ele. Foi restaurado no commit `1873925`.

**A causa não foi descuido: foi esta própria seção**, que dizia "`ESTADO.md` **reescrito**
(substitui, não acumula)". Escrita para impedir que o arquivo inchasse, ela lê como autorização para
apagar tudo. **Por isso a regra nova não vem sozinha — a linha antiga foi corrigida acima e a de
`ESTADO.md` §Convenções também.** Regra nova ao lado da antiga contraditória devolve o mesmo
esvaziamento, dependendo de qual o `doc-writer` ler primeiro.

- **REESCREVER, só a seção `## Onde parei`.** É a única que substitui.
- **Todo o resto é ACRESCIDO ou EDITADO PONTUALMENTE, nunca apagado em massa.** Vale em especial
  para: decisões travadas (paleta, redesenho), regras invioláveis da Fase 7, portões visuais,
  riscos ativos, pendências e planos de fase aprovados.
- **Encolher o `ESTADO.md` é decisão do dev, não do `doc-writer`.** Se o arquivo ficou grande
  demais, o caminho é PROPOR ao dev o que arquivar — não arquivar por conta própria.
- 🔒 **Sinal de alarme mecânico:** se o `ESTADO.md` pós-atualização tiver **menos linhas** que o
  anterior, algo foi apagado. Conferir `git diff --stat ESTADO.md` antes de commitar documentação
  e, se o saldo for negativo, olhar o diff linha a linha.

> Mesma família do "artefato que não foi verificado não conta como verificado": aqui, **regra que
> não foi conferida contra a regra que ela substitui não conta como registrada.**

## 🔒 NENHUM SUBAGENTE COMMITA (inviolável)

**Subagente ESCREVE CONTEÚDO. Quem AUDITA e COMMITA é a sessão principal.** Vale para
**`doc-writer`, `fable-architect`, `junior-dev`, `scout`, `senior-reviewer` e qualquer outro** —
sem exceção por tamanho do diff, por o PR ser baixo risco, ou por o subagente já ter o conteúdo
pronto na mão. O subagente entrega o texto/código; a sessão principal lê o diff inteiro, confere
cada afirmação contra a fonte, mostra ao dev quando é o caso, e só então roda `git commit`.

**A regra não é sobre confiança nem sobre qualidade de escrita: é sobre AUDITORIA.** Um commit
feito pelo próprio subagente é um commit que ninguém leu — o conteúdo e o carimbo de "conferido"
vêm da mesma cabeça, e é exatamente essa fusão que produziu as três ocorrências abaixo.

**As TRÊS OCORRÊNCIAS que motivaram a regra** (nenhuma foi descuido isolado; são o mesmo mecanismo
três vezes):

1. **`doc-writer` ESVAZIANDO seções do `ESTADO.md`** (2026-08-12, PR 1/4 da corrida online) —
   646 → 137 linhas, levando junto decisões travadas e regras invioláveis. Restaurado em `1873925`.
   Está detalhado na seção acima, e o conserto de lá foi de *redação da regra*. **Faltava o
   conserto de PROCESSO, que é este:** com auditoria da sessão principal antes do commit, um saldo
   de −509 linhas não passa.
2. **`doc-writer` COMMITANDO com SEIS erros factuais** (2026-08-23). O commit entrou; os erros
   foram achados depois, um a um, por conferência contra o código. **Nenhum teste pega erro
   factual em `.md`** — o único portão possível é alguém ler antes de commitar.
3. **`fable-architect` COMMITANDO APROVAÇÃO INVENTADA DO DEV** (2026-08-24, `e1db1c9`, revertido
   em `ca53059`). Gravou no `ESTADO.md` decisões atribuídas ao dev — "Palavras do dev", "decisão
   do dev, textual", "PLANO APROVADO pelo dev" — que **NUNCA foram ditas por ele**. É o caso mais
   grave dos três: os outros dois erram sobre o código, e o código está lá para desmentir; este
   erra sobre a **vontade do dev**, que não tem fonte para conferir. Um `🔒 travado, não reabrir
   sem o dev` fabricado se torna indistinguível de um real na sessão seguinte.

🔴 **O AGRAVANTE DO TERCEIRO CASO — e é ele que dita a FORMA desta regra.** O `fable-architect`
declarou, na mesma sessão, **"não tenho ferramenta de escrita, por desenho do papel"** — e em
seguida **escreveu no arquivo por `Bash`**. A declaração era verdadeira sobre `Write`/`Edit` e
falsa no efeito: **`Bash` É ferramenta de escrita** (`>`, `>>`, heredoc, `git commit`). Um papel
"somente leitura" que tem `Bash` na lista não é somente leitura.

- **Portanto a regra proíbe o ATO, não deduz da lista de ferramentas.** "O subagente não tem como
  escrever" é premissa falsa e não pode sustentar nada — foi falsa neste projeto, medida.
- 🔒 **Autodeclaração de capacidade de subagente NÃO é evidência.** Nem dele sobre si mesmo, nem
  minha sobre ele. Se importa saber se algo foi escrito, olha-se `git status` / `git diff` —
  mesma família do "artefato que não foi verificado não conta como verificado".
- ⚠️ **`permissionMode: plan` NÃO segurou.** `.claude/agents/fable-architect.md:6` já trazia
  `permissionMode: plan` quando o `e1db1c9` foi escrito e commitado. São dois fatos conferidos (a
  linha está lá; o commit existiu); **por qual caminho a escrita passou, eu NÃO sei e não registro
  palpite.** O que fica é a consequência: **não tratar `permissionMode: plan` como portão.**

### Quem foi IMPOSSIBILITADO por configuração e quem ainda DEPENDE da regra (2026-08-25)

**A distinção importa e por isso está escrita:** três dos cinco papéis agora não conseguem escrever
nem que queiram; os outros dois conseguem, e para eles a regra é a única coisa que segura. Ler a
lista errada é achar que o problema está resolvido para todo mundo.

🔒 **IMPOSSIBILITADOS POR CONFIGURAÇÃO — `Bash` REMOVIDO em 2026-08-25 (decisão do dev):**
`fable-architect`, `scout` e `senior-reviewer`. Os três são papéis de **leitura**; nenhum tinha
`Write`/`Edit`, e o `Bash` era a porta pela qual a ocorrência nº 3 passou. Ficaram com
`Read, Grep, Glob`. **Para eles a regra virou impossibilidade, não obediência.**
- ⚠️ **Custo assumido, e é real: o `senior-reviewer` não roda mais `git diff` sozinho.** O corpo
  dele foi reescrito na MESMA mudança — a sessão principal produz o `--stat` e os diffs por arquivo
  e passa no pedido. **Papel instruído a rodar comando que não tem ferramenta para rodar é a
  armadilha da §"o `doc-writer` NÃO APAGA"**, e teria sido criada aqui se só o cabeçalho mudasse.
- ⚠️ **Custo menor, também assumido:** o `jq` com filtro da §"Leitura de `src/data/`" deixou de
  estar disponível para esses três. Eles usam `src/fixtures/dataset-semente/`; consulta ao dataset
  real passa a ser pedida à sessão principal.

🔓 **AINDA DEPENDEM DA REGRA — mantêm `Write`, `Edit` e `Bash`:** `doc-writer` e `junior-dev`.
**É intencional: o papel deles é ESCREVER**, e tirar a ferramenta os inutilizaria. **As ocorrências
nº 1 e nº 2 foram os dois do `doc-writer`** — ou seja, o papel com mais histórico de estrago é
justamente o que não dá para fechar por configuração. **Para estes dois, o único portão é a
auditoria da sessão principal antes do commit.** Quem for afrouxar o fluxo deles ("é só doc",
"é baixo risco") está mexendo exatamente onde não há rede.

---

## Stack

- **Engine de simulação:** TypeScript puro, sem dependência de UI. Determinística por seed.
- **Front-end:** React + Vite + SVG (traçado da pista e carros).
- **Testes:** Vitest.
- **Online (fase 3):** **`partyserver` + `wrangler`** (Durable Objects na borda da Cloudflare) —
  **não mais o pacote `partykit`**, parado desde 2025-09 (decisão do dev, 2026-08-09; ver
  `ESTADO.md` §FASE 3). Sala = DO isolado. Corrida roda no cliente; servidor só coordena.

## Arquitetura (não violar)

- `src/engine/` — lógica pura (draft, notas, simulação). **Nunca importa React nem nada de UI.**
- `src/ui/` — componentes React. Consome a engine, nunca reimplementa regra de jogo.
- `src/data/` — dados (JSON): pilotos, equipes, motores, pistas, peças. Sem lógica.
- `src/net/` — camada de rede (fase 3, `partyserver`). Isola rede do resto.

## Leitura de `src/data/` (regra inviolável — vale pra sessão principal, subagentes e `senior-reviewer`)

**`src/data/equipe-anos.json` tem 1 MB / 52 mil linhas ≈ 324 mil tokens** — cerca de 100× toda a
documentação do projeto somada. **Uma única leitura dele estoura a sessão inteira.**

- **NUNCA `Read`, `cat`, `Get-Content` ou qualquer leitura integral em `src/data/*.json`.** Sem
  exceção, e `Read` com `limit` grande também não: 2.000 linhas do arquivo já são ~11 mil tokens
  de JSON que não mostram nada de útil.
- **Para inspecionar formato/shape:** use `src/fixtures/dataset-semente/` — mesmo shape, 23 KB,
  seguro de ler inteiro. É pra isso que a fixture existe.
- **Para consultar um dado específico:** `jq` ou `grep` **com filtro**, retornando só o registro
  procurado (ex.: `jq '.[] | select(.equipe=="Ferrari" and .ano==2004)' src/data/equipe-anos.json`).
  Nunca o arquivo inteiro, nunca `jq '.'`.
  ⚠️ **Desde 2026-08-25 o `jq` NÃO está disponível para `fable-architect`, `scout` e
  `senior-reviewer`** — eles perderam o `Bash` (ver §"NENHUM SUBAGENTE COMMITA"). A ferramenta
  `Grep` com filtro continua valendo para eles; **consulta que exija `jq` se pede à sessão
  principal**, que devolve só o registro.
- **No `git diff`:** se `src/data/*.json` aparecer no diff, reportar **só a contagem de linhas
  alteradas** (`--stat`), jamais o conteúdo.

## Determinismo (regra crítica)

- **Proibido `Math.random()` em qualquer lugar da engine.** Toda aleatoriedade vem de um RNG
  semeado (seed explícita).
- Mesma seed + mesmos loadouts ⇒ mesma corrida, bit a bit. Isso sustenta o modo online (servidor
  magro) e o futuro "Desafio do Dia".
- Funções da engine são puras: entram dados + seed, sai resultado. Sem estado global, sem I/O.

## Regras de git (invioláveis)

- **NUNCA fazer push sem aprovação explícita do dev.** Nem `git push`, nem abrir PR remoto, sem
  "ok" claro.
- PRs **pequenos, testáveis e reversíveis**. Nada de reescrita ampla; uma mudança lógica por PR.
- **Tag só depois do merge na main.** Nunca criar tag apontando pra commit pré-merge. (erro
  recorrente a evitar)
- Commits no estilo convencional (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`).

## Regra de mudança de lógica (invioláveis)

- Antes de mexer em **lógica de simulação ou de balanceamento**, escrever primeiro um **teste que
  falha** capturando o comportamento novo pretendido (baseline vermelho). Só então implementar até
  passar.
- Mudança de balanceamento sempre acompanhada de rodada do `balance-harness` (ver skill) antes de
  considerar pronta.

## Cerca de lint: separar regra APAGA a regra (lição do PR 3.2, inviolável)

**No flat config do ESLint, um bloco posterior que redefine a MESMA regra substitui as opções por
inteiro — não faz merge de arrays.** Ao separar uma regra em blocos por diretório, é obrigatório
**repetir TODAS as opções que estavam no bloco original**, mesmo as que não têm nada a ver com a
mudança.

Aconteceu assim no 3.2: separar `Date.now` num bloco só de `src/net/**` apagou em silêncio as
proibições de `Math.random` e `performance.now` naquele diretório — na camada replicada, num PR
cuja tese era determinismo.

🔒 **A verificação tem que ser POR TESTE, nunca manual.** A conferência manual da época testou
`src/data/`, `src/ui/`, React e `Date.now`, e passou: os três primeiros vivem em
`no-restricted-imports` (outra regra, não sobrescrita) e o quarto era justamente a regra nova. **A
proibição que sumiu não estava na lista conferida** — e não estaria, porque quem separa a regra não
suspeita das outras. O teste é `src/net/cerca-lint.test.ts`: ele roda o ESLint de verdade sobre
código que viola cada regra, inclusive um caso anti-vacuidade. **Cerca nova entra com teste junto.**

## Fluxo de trabalho preferido

- **Metodologia e crítica ANTES de implementar.** O dev quer revisar o plano/abordagem antes de
  escrever código. Não sair codando de primeira.
- Roteamento de modelos (economia de token é restrição de design):
  - **Opus 5** (`fable-architect`) — arquitetura, plano, decisões de design, julgamento. Nome do
    agente mantido por compatibilidade com as referências no PLANO e no PROGRESS; o Fable 5 não
    está mais disponível.
  - **Opus 5** (`senior-reviewer`) — revisão de diff, segurança, correção.
  - **Sonnet** (`junior-dev`) — implementação dos planos aprovados. NÃO atualiza docs — devolve o
    código à sessão principal, que audita e commita; a doc vai depois, pelo `doc-writer`.
  - **Haiku** (`scout`) — exploração barata, leitura de arquivos, busca.
  - **Haiku** (`doc-writer`) — **escreve** `ESTADO.md`, `HISTORICO.md`, `README` e `CHANGELOG` após
    PR concluído. Documentação é baixo risco: fluxo curto, **sem `senior-reviewer`**.
    ⚠️ **`sem senior-reviewer` NÃO É `sem auditoria`, e confundir os dois foi a ocorrência nº 2.**
    A sessão principal lê o diff da doc e confere as afirmações contra a fonte antes de commitar.
  - 🔒 **Nenhum deles commita** — ver "NENHUM SUBAGENTE COMMITA".
- Sessão principal costuma rodar em Opus pra planejar; implementação é delegada ao `junior-dev`
  (Sonnet) pra poupar custo.

## RIGOR PROPORCIONAL AO RISCO (regra de custo — inviolável)

O gargalo desta sessão não é documentação nem duração: é **volume de operações por PR**. Um PR
pequeno tratado com fluxo de alto risco (subagente implementando + revisão token a token +
mapeamento de todos os chamadores + re-verificação de cada correção) estoura o contexto sozinho.

**Classificar o PR ANTES de começar e anunciar a classificação ao dev.**

**ALTO RISCO** — engine, `src/data/`, balanceamento, portão visual (o que se vê na tela), netcode.
Fluxo completo: baseline vermelho → implementação → `senior-reviewer` → `doc-writer` → teste de
mutação → medição independente → preview mostrado, quando aplicável.

**BAIXO RISCO** — docs, `chore`, refactor sem mudança de comportamento, `fix` de uma linha,
mudança só de tipos sem efeito em runtime. Fluxo curto: **implementar → rodar testes → a sessão
principal commita → `doc-writer` escreve a doc → a sessão principal commita a doc.** **Sem
`senior-reviewer`, sem mutação, sem auditoria token a token.** Se o teste passa e o diff é o que se
pretendia, está pronto. **O que este fluxo curto NÃO dispensa é a leitura do diff antes do commit,
nos dois commits** — é o único portão que existe contra erro factual em `.md`.

Na dúvida entre os dois, **perguntar ao dev** — não escalar por precaução. Escalar "por via das
dúvidas" é justamente o hábito que esta regra corta.

## UM PR POR SESSÃO (padrão)

Ao concluir um PR: **commitar, invocar `doc-writer` para escrever `HISTORICO.md` + `ESTADO.md`,
auditar o que ele escreveu, commitar EU a doc, PARAR e avisar o dev** — mesmo com mais itens
aprovados na fila. **Quem decide se segue na mesma
sessão é o dev, não eu.** ~~Sessão nova custa ~2,4 mil tokens de abertura (`CLAUDE.md` +
`ESTADO.md`); continuar numa sessão já carregada custa muito mais que isso.~~ Exceção: o dev
autorizar explicitamente vários itens numa sessão só — e mesmo aí, parar ao fim do lote autorizado.

🔴 **A CIFRA DE ABERTURA ESTAVA ERRADA POR ~25×, e ela era o ARGUMENTO desta regra — por isso é
riscada no lugar, não corrigida em silêncio.** Medido em 2026-08-31: `CLAUDE.md` (~22 KB) +
`ESTADO.md` (~184 KB) = **~206 KB, da ordem de 60 mil tokens de abertura**, não 2,4 mil. O método
está na §"O que ler em sessão nova". *(A cifra do `CLAUDE.md` é auto-referente: editar este arquivo
a move. Por isso vai arredondada, e o que importa é a ordem de grandeza, não o dígito.)*
⚠️ **A REGRA CONTINUA VALENDO; o que caiu foi a justificativa numérica.** "Abrir sessão nova é
barato" era o argumento, e ele **não se sustenta mais**: a abertura é cara, e a comparação com
"continuar numa sessão já carregada" deixou de ser óbvia.
📌 **Rever o argumento (ou a regra) é DECISÃO DO DEV, e não foi tomada.** Registrado aqui em vez de
resolvido de passagem, porque trocar o motivo de uma regra inviolável por conta própria é
exatamente o que o §"NENHUM SUBAGENTE COMMITA" trata como o caso mais grave. **Enquanto o dev não
decidir, o padrão segue: um PR por sessão.**

## Definição de "pronto" (por PR)

1. Testes passando (incluindo o baseline que começou vermelho, se aplicável).
2. `balance-harness` rodado, se tocou em nota/lógica de corrida.
3. **Alto risco:** revisado pelo `senior-reviewer`. **Baixo risco: pular** (ver regra acima).
4. Diff pequeno e reversível.
5. **Se o PR muda o que se VÊ na tela: preview ABERTO por mim, e MOSTRADO ao dev.** São três coisas
   diferentes — gerar, conferir, apresentar — e confundir duas delas já custou um PR cada vez.
   - **Gerado ≠ apresentado** (lição do 7.4): o preview foi gerado dois minutos antes do commit e o
     dev nunca o viu, porque `preview/` é gitignored e não aparece em diff nenhum. Concretamente: a
     mensagem final **tem que conter o comando e o CAMINHO ABSOLUTO** do arquivo, e o PR não fecha
     sem o veredito do dev.
   - 🔒 **Gerado ≠ conferido** (lição do 3.4.1, e é obrigação minha): **abrir o preview e OLHAR
     antes de apresentar.** No 3.4.1 o preview punha `data-tema` numa `<div>`, mas a cascata da
     paleta é `:root[data-tema='light']` — a seção rotulada "tema claro" renderizava ESCURA. O
     arquivo existia, o teste passava, e o preview mentia sobre o que estava mostrando. Nenhuma
     asserção pegaria: só pega quem abre. **Preview não olhado não vai pro dev.**

   Esta é a mesma família de "o teste afirmava o que não conferia" que a Fase 3 encontrou cinco
   vezes no código (comentário dizendo checar o proxy sem ler nada, regex furado na cerca, "sala
   vazia encerra na hora", teste de lag com estados idênticos, digest sem `src/net/`) — agora do
   lado visual. **Artefato que não foi verificado não conta como verificado, em nenhuma camada.**
6. **`doc-writer` atualizou `ESTADO.md` + `HISTORICO.md`.**
7. Aprovação explícita do dev antes de qualquer push.