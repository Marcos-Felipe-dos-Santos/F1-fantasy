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

**Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e o
`ESTADO.md` **reescrito** (substitui, não acumula). Se só um dos dois for atualizado, a próxima
sessão começa com informação errada.

---

## Stack
- **Engine de simulação:** TypeScript puro, sem dependência de UI. Determinística por seed.
- **Front-end:** React + Vite + SVG (traçado da pista e carros).
- **Testes:** Vitest.
- **Online (fase 3):** PartyKit (Durable Objects na borda da Cloudflare). Corrida roda no cliente; servidor só coordena.
- **Ambiente do dev:** Windows 11 + PowerShell + Node LTS. Comandos e scripts devem funcionar no PowerShell.

## Arquitetura (não violar)
- `src/engine/` — lógica pura (draft, notas, simulação). **Nunca importa React nem nada de UI.**
- `src/ui/` — componentes React. Consome a engine, nunca reimplementa regra de jogo.
- `src/data/` — dados (JSON): pilotos, equipes, motores, pistas, peças. Sem lógica.
- `src/net/` — camada PartyKit (fase 3). Isola rede do resto.

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
- **Proibido `Math.random()` em qualquer lugar da engine.** Toda aleatoriedade vem de um RNG semeado (seed explícita).
- Mesma seed + mesmos loadouts ⇒ mesma corrida, bit a bit. Isso sustenta o modo online (servidor magro) e o futuro "Desafio do Dia".
- Funções da engine são puras: entram dados + seed, sai resultado. Sem estado global, sem I/O.

## Regras de git (invioláveis)
- **NUNCA fazer push sem aprovação explícita do dev.** Nem `git push`, nem abrir PR remoto, sem "ok" claro.
- PRs **pequenos, testáveis e reversíveis**. Nada de reescrita ampla; uma mudança lógica por PR.
- **Tag só depois do merge na main.** Nunca criar tag apontando pra commit pré-merge. (erro recorrente a evitar)
- Commits no estilo convencional (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`).

## Regra de mudança de lógica (invioláveis)
- Antes de mexer em **lógica de simulação ou de balanceamento**, escrever primeiro um **teste que falha** capturando o comportamento novo pretendido (baseline vermelho). Só então implementar até passar.
- Mudança de balanceamento sempre acompanhada de rodada do `balance-harness` (ver skill) antes de considerar pronta.

## Fluxo de trabalho preferido
- **Metodologia e crítica ANTES de implementar.** O dev quer revisar o plano/abordagem antes de escrever código. Não sair codando de primeira.
- Roteamento de modelos (economia de token é restrição de design):
  - **Opus 5** (`fable-architect`) — arquitetura, plano, decisões de design, julgamento. Nome do agente mantido por compatibilidade com as referências no PLANO e no PROGRESS; o Fable 5 não está mais disponível.
  - **Opus 5** (`senior-reviewer`) — revisão de diff, segurança, correção.
  - **Sonnet** (`junior-dev`) — implementação dos planos aprovados.
  - **Haiku** (`scout`) — exploração barata, leitura de arquivos, busca.
- Sessão principal costuma rodar em Opus pra planejar; implementação é delegada ao `junior-dev` (Sonnet) pra poupar custo.

## Definição de "pronto" (por PR)
1. Testes passando (incluindo o baseline que começou vermelho, se aplicável).
2. `balance-harness` rodado, se tocou em nota/lógica de corrida.
3. Revisado pelo `senior-reviewer`.
4. Diff pequeno e reversível.
5. **Se o PR muda o que se VÊ na tela: preview MOSTRADO ao dev, não apenas gerado.** São coisas
   diferentes e confundi-las já custou um PR — no 7.4 o preview foi gerado dois minutos antes do
   commit e o dev nunca o viu, porque `preview/` é gitignored e não aparece em diff nenhum.
   Concretamente: a mensagem final **tem que conter o comando e o CAMINHO ABSOLUTO** do arquivo, e
   o PR não fecha sem o veredito do dev. Preview gerado não é preview aprovado.
6. Aprovação explícita do dev antes de qualquer push.
