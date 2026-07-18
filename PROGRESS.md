# PROGRESS — F1 Fantasy

> Estado do build por PR, pra retomar em sessão nova sem contexto anterior.
> Plano de referência: `PLANO_CLAUDE_CODE.md` §5. Regras: `CLAUDE.md`. Nada foi pushado — tudo local.

## Concluídos (mergeados na main)

- **PR 0.1–0.3** — Scaffold Vite+React+TS+Vitest, RNG semeado (mulberry32 + `deriveSeed` por rótulo), tipos base alinhados ao GDD v1.1.
- **PR 1.1** — Dataset semente (`src/data/`: 22 equipe/anos, 24 peças, 10 pistas) + loader puro validado (`src/engine/dataset.ts`).
- **PR 1.2** — Draft (`src/engine/draft.ts`): reducer puro de 5 sorteios de equipe/ano + rodada 6 de peça com escassez (2 cópias) + bots por seed (`bots.ts`).
- **PR 1.3** — Quali (`src/engine/quali.ts` + `carro.ts`): `resolverCarro` (Loadout → notas efetivas com bônus de peça, sem clamp) e `simularQuali` (score 0.5·QUALI + 0.4·carro ponderado pela pista + 0.1·CALL, variância semeada por sub-stream `quali:${jogadorId}`, desempate por jogadorId). Seed de ouro congelada (seed 42, Monza). Revisado pelo senior-reviewer (aprovado; aviso das listas de chaves paralelas corrigido com checagem `in`).

**Testes na main: 68 passando** (7 arquivos). Lint e `tsc --noEmit` limpos.

## Em andamento

- **PR 1.4 — Corrida** (`src/engine/corrida.ts`): tempo por volta (RIT + carro ponderado + variância), degradação de pneu por DESGASTE da pista atenuada por PNEU, pit obrigatório com janela por CALL + paradas extras forçadas por desgaste, custo de pit por PIT_TEMPO/PIT_ERRO, offset de grid na largada (LARG), pontuação FIA + volta mais rápida do grid inteiro (+1 ponto, desempate por posição final). Sem incidentes (ficam no PR 1.5).

## Próximos

- **PR 1.5** — Incidentes (CONS, CONF, CONF_MOTOR, risco de peça, clima) + registro de eventos.
- **PR 1.6** — `scripts/balance.ts` (balance-harness). **Nota:** as constantes `QUALI_CONFIG`/`CORRIDA_CONFIG` foram expostas justamente pra esse harness calibrar; os valores atuais são chute inicial.
- **PR 1.7** — UI mínima do Single.

## Convenções que os PRs seguem

- Branch `feat/pr-X.Y-nome` → commit `feat:` → `git merge --no-ff` na main com mensagem `merge: PR X.Y — ...`.
- TDD: teste vermelho antes da implementação; seed de ouro por módulo de simulação.
- RNG: sub-stream por jogador (`deriveSeed(seed, 'fase:${jogadorId}')`) pra independência de ordem.
- Fluxo: junior-dev implementa → testes/lint/tsc → senior-reviewer revisa → correções → commit local. **Push só com ok explícito do dev.**
