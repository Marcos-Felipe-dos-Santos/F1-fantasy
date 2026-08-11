# F1 Fantasy — Projeto (memória do Claude Code)

Jogo de navegador de draft/simulação de F1 (1950-2025), inspirado nos jogos "7x1" e "38 a 0".
Este arquivo é a memória sempre-ativa do projeto. As regras aqui são **invioláveis**.

---

## O que ler em sessão nova (ordem obrigatória)

1. **`CLAUDE.md`** (este arquivo) — regras invioláveis.
2. **`ESTADO.md`** — estado atual, onde parei, próximo PR, pendências ativas, regras da Fase 7.
   Curto de propósito (~60 linhas). **É o único documento de estado que se lê por completo.**

**Sob demanda, nunca por completo na abertura:**

- **`HISTORICO.md`** — registro detalhado dos PRs das fases **6 e 7** (~19 mil tokens). Consultar
  **o PR que interessa** quando precisar do porquê de uma decisão. Ler inteiro estoura o contexto
  inicial — foi exatamente por isso que o `ESTADO.md` passou a existir.
- **`HISTORICO_ARQUIVO.md`** — fases **0 a 5**, encerradas (~12 mil tokens). Mesma regra: consulta
  por PR, nunca leitura completa.
- **`PLANO_CLAUDE_CODE.md`** — plano de build por fase e direção de arte.
- **`F1_Fantasy_GDD.md`** — regras de jogo, notas, pistas, catálogo de peças.

**Ao concluir um PR, o `doc-writer` atualiza OS DOIS:** entrada detalhada no `HISTORICO.md`
(acumula) e o `ESTADO.md` **reescrito** (substitui, não acumula). Se só um dos dois for atualizado,
a próxima sessão começa com informação errada.

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
  - **Sonnet** (`junior-dev`) — implementação dos planos aprovados. NÃO atualiza docs — delega
    ao `doc-writer` após concluir o commit.
  - **Haiku** (`scout`) — exploração barata, leitura de arquivos, busca.
  - **Haiku** (`doc-writer`) — atualiza `ESTADO.md`, `HISTORICO.md`, `README` e `CHANGELOG` após
    PR concluído. Documentação é baixo risco: fluxo curto, **sem `senior-reviewer`**.
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
mudança só de tipos sem efeito em runtime. Fluxo curto: **implementar → rodar testes → commitar
→ `doc-writer`.** **Sem `senior-reviewer`, sem mutação, sem auditoria token a token.** Se o teste
passa e o diff é o que se pretendia, está pronto.

Na dúvida entre os dois, **perguntar ao dev** — não escalar por precaução. Escalar "por via das
dúvidas" é justamente o hábito que esta regra corta.

## UM PR POR SESSÃO (padrão)

Ao concluir um PR: **commitar, invocar `doc-writer` para atualizar `HISTORICO.md` + `ESTADO.md`,
PARAR e avisar o dev** — mesmo com mais itens aprovados na fila. **Quem decide se segue na mesma
sessão é o dev, não eu.** Sessão nova custa ~2,4 mil tokens de abertura (`CLAUDE.md` + `ESTADO.md`);
continuar numa sessão já carregada custa muito mais que isso. Exceção: o dev autorizar
explicitamente vários itens numa sessão só — e mesmo aí, parar ao fim do lote autorizado.

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