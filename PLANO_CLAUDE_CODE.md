# F1 Fantasy — Plano de Setup e Build no Claude Code

Este pacote configura o Claude Code para o projeto com um time de agentes, skills e um plano de build em fatias. Feito pra rodar a sessão principal no **Fable** (seu pedido), delegando implementação pro Sonnet pra economizar token.

---

## 1. O que vem no pacote

```
f1-fantasy-claude-setup/
├── CLAUDE.md                        # memória sempre-ativa: regras invioláveis, stack, workflow
├── PLANO_CLAUDE_CODE.md             # este arquivo
└── .claude/
    ├── agents/
    │   ├── fable-architect.md        # Fable 5 — arquitetura, plano, julgamento (não coda)
    │   ├── senior-reviewer.md        # Opus 4.8 — revisão de diff (só leitura)
    │   ├── junior-dev.md             # Sonnet 5 — implementação dos planos aprovados
    │   └── scout.md                  # Haiku 4.5 — exploração barata, leitura de arquivos
    └── skills/
        ├── sim-engine/SKILL.md       # padrões da engine determinística
        ├── balance-harness/SKILL.md  # metodologia de balanceamento
        └── pr-workflow/SKILL.md      # regras de PR, git e tag
```

## 2. Como instalar
1. Copie `CLAUDE.md` e a pasta `.claude/` para a raiz do repositório do jogo.
2. Garanta o Claude Code **v2.1.170+** (necessário pro Fable). Rode `claude update` se preciso.
3. Abra o Claude Code no projeto. Como você criou a pasta `.claude/agents/` agora, **reinicie a sessão** uma vez pra ele carregar os agentes (o watcher só pega diretórios que já existiam no início da sessão).
4. Rode a sessão principal no Fable: `claude --model claude-fable-5` (ou dentro da sessão, `/model fable`).

## 3. Roteamento de modelos (economia de token)
- **Sessão principal / `fable-architect`:** Fable 5 — planeja, decide, critica. Caro; use pra julgamento, não pra grunt work.
- **`junior-dev`:** Sonnet 5 — faz o volume de implementação.
- **`senior-reviewer`:** Opus 4.8 — revisa diffs antes do "pronto".
- **`scout`:** Haiku 4.5 — acha arquivos e resume, pra não gastar contexto caro.

> Nota sobre o Fable: os classificadores de segurança dele podem, em domínios como cibersegurança/biologia, cair pra um modelo de fallback. Pra um jogo de F1 isso praticamente nunca dispara — só não estranhe se aparecer um aviso.

## 4. Ciclo de trabalho recomendado (por PR)
1. **Planejar** — peça ao `fable-architect` (Fable) o plano do próximo PR. Ele devolve objetivo + decisões + PRs + riscos e **para pra sua aprovação**.
2. **Você aprova** (ou ajusta) o plano.
3. **Implementar** — o `junior-dev` (Sonnet) executa só aquele PR. Se toca lógica de simulação/balanceamento, escreve o teste vermelho primeiro.
4. **Revisar** — o `senior-reviewer` (Opus) roda `git diff` e devolve achados priorizados.
5. **Balancear** — se mexeu em nota/fórmula, rode o `balance-harness`.
6. **Aprovar push** — nada vai pro remoto sem seu "ok" explícito. Tag só depois do merge.

---

## 5. Plano de build (fatias — cada uma jogável/testável)

### Fase 0 — Scaffold
- **PR 0.1** — Vite + React + TS + Vitest. Estrutura de pastas `engine/ ui/ data/ net/`. Config de lint.
- **PR 0.2** — `engine/rng.ts`: PRNG semeado (mulberry32) + testes de reprodutibilidade.
- **PR 0.3** — Tipos base em `engine/types.ts`: Piloto, Carro, Motor, Estrategista, Pit, Peca, Pista, Loadout, Resultado.

### Fase 1 — Engine + modo Single (valida o balanceamento sozinho)
- **PR 1.1** — Dataset semente em `data/` (3-4 anos icônicos, poucas equipes) como JSON. Sem lógica.
- **PR 1.2** — Draft: sorteio individual de piloto e motor (por seed) + escolha de estrategista e pit (pool) + escolha de peça. Testes.
- **PR 1.3** — Classificação: volta única ⇒ grid. Teste com seed de ouro.
- **PR 1.4** — Corrida: tempo de volta por notas+pista+variância, 10-15 voltas, pontuação FIA, volta mais rápida do grid inteiro. Testes de regressão por seed.
- **PR 1.5** — Incidentes: erro (CONS), quebra (CONF), problema/investigação (risco da peça), clima. Registro de eventos.
- **PR 1.6** — `scripts/balance.ts` (balance-harness) + primeiras métricas do dataset semente.
- **PR 1.7** — UI mínima do Single: traçado SVG de 1 pista + bolinhas/carros animados + botão Acelerar + tela de resultado. 21 bots (comportamento por seed).

**Marco:** dá pra jogar sozinho contra bots e medir balanceamento. Aqui você conecta o dataset gerado por IA e roda o harness em cima dele.

### Fase 2 — Modo Local (hotseat 2-4)
- **PR 2.1** — Fluxo de turnos hotseat (passa o dispositivo): cada humano faz seus sorteios/escolhas.
- **PR 2.2** — Preenchimento com bots até 22 + tela de grid da corrida com todos.
- **PR 2.3** — Modo Craque / Modo Cego (esconde tudo). Mesma engine, UI condicional.

**Marco:** jogável presencialmente com amigos.

### Fase 3 — Online (PartyKit) — servidor magro
- **PR 3.1** — Setup PartyKit; sala com código; entrar/sair; preencher com bots até 22.
- **PR 3.2** — Escolha da peça simultânea com **trava ao vivo** (2 cópias, broadcast quando esgota).
- **PR 3.3** — "Espiar amigos" (respeitando Modo Cego: só nomes, nunca notas).
- **PR 3.4** — Servidor distribui `seed + loadouts`; **corrida roda no cliente**; validação da corrida no servidor a partir da seed (anti-trapaça pra ranking futuro).
- **PR 3.5** — Bots por seed no online (mix de passeio/pra-ganhar; proporção = dificuldade).

**Marco:** salas online até 22, sem lag entre salas (cada sala é um Durable Object isolado).

### Fase 4 — Polimento
- **PR 4.x** — Capacetes estilizados (editor + presets, design original — ver nota jurídica do GDD).
- **PR 4.x** — Card de resultado compartilhável (canvas ⇒ imagem).
- **PR 4.x** — Dataset completo 1950-2025 (gerado por IA + passado pelo balance-harness).
- **PR 4.x** — "Desafio do Dia" (mesma seed pra todos) — arquitetura já pronta desde a Fase 1.

---

## 6. Ordem de ataque sugerida
Comece pela **Fase 0 e 1 inteiras** antes de pensar em rede. O modo Single com o balance-harness é o que prova que o jogo é divertido e justo — se o balanceamento não fechar aí, não adianta ter multiplayer. Rede é a casca final.
