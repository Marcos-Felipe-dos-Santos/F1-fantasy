# PROGRESS — F1 Fantasy

> Estado do build por PR, pra retomar em sessão nova sem contexto anterior.
> Plano de referência: `PLANO_CLAUDE_CODE.md` §5. Regras: `CLAUDE.md`. Nada foi pushado — tudo local.

## Concluídos (mergeados na main)

- **PR 0.1–0.3** — Scaffold Vite+React+TS+Vitest, RNG semeado (mulberry32 + `deriveSeed` por rótulo), tipos base alinhados ao GDD v1.1.
- **PR 1.1** — Dataset semente (`src/data/`: 22 equipe/anos, 24 peças, 10 pistas) + loader puro validado (`src/engine/dataset.ts`).
- **PR 1.2** — Draft (`src/engine/draft.ts`): reducer puro de 5 sorteios de equipe/ano + rodada 6 de peça com escassez (2 cópias) + bots por seed (`bots.ts`).
- **PR 1.3** — Quali (`src/engine/quali.ts` + `carro.ts`): `resolverCarro` (Loadout → notas efetivas com bônus de peça, sem clamp) e `simularQuali` (score 0.5·QUALI + 0.4·carro ponderado pela pista + 0.1·CALL, variância semeada por sub-stream `quali:${jogadorId}`, desempate por jogadorId). Seed de ouro congelada (seed 42, Monza). Revisado pelo senior-reviewer (aprovado; aviso das listas de chaves paralelas corrigido com checagem `in`).

- **PR 1.4** — Corrida (`src/engine/corrida.ts`): simulação por carro independente, tempo por volta (0.5·RIT + 0.4·carro ponderado + 0.1·CALL, variância por sub-stream `corrida:${jogadorId}`), degradação por DESGASTE da pista atenuada por PNEU, pit obrigatório com janela por CALL + paradas extras por limiar de desgaste, custo de pit por PIT_TEMPO/PIT_ERRO, volta 1 com offset de grid (por dificuldade de ultrapassagem) + penalidade de LARG, pontuação FIA + volta mais rápida do grid inteiro (+1, desempate por posição final). Campo `paradas` adicionado a `ResultadoCorrida.classificacao`. Seed de ouro congelada (seed 42, Monza). Sem incidentes/DNF/clima (PR 1.5). Revisado pelo senior-reviewer (aprovado sem bloqueantes).

**Testes na main: 81 passando** (8 arquivos). Lint e `tsc --noEmit` limpos.

## Metas de calibração (decididas pelo dev em 2026-07-18 — executar no PR 1.6)

1. **Adiamento do harness confirmado** — PRs 1.3/1.4/1.5 entram com constantes-chute; o PR 1.6 calibra tudo.
2. **Sinal de grid**: 61/100 é fraco demais. Meta: pole com carro idêntico vence **claramente mais que 61% e bem menos que 95%** (alvo ~70-80%). Direção: subir `gridOffsetMs` e/ou baixar `variancia`. O harness DEVE medir a taxa de vitória do pole e reportar se ainda está fraca.
3. **Parada extra em desgaste Alto (75)**: 10% é baixo pro "força paradas extras" do GDD §9. Meta: a **maioria dos carros** (~40-60%, variando pelo PNEU do piloto) faz 2+ paradas em pista de desgaste Alto. Direção: baixar `limiarPneuGasto` ou subir a curva de degradação.
4. Harness também reporta: win-rate por raridade de peça (guarda contra peça dominante, GDD §14.3).

## Próximos

- **PR 1.5 (próximo)** — Incidentes (CONS, CONF, CONF_MOTOR, risco de peça, clima) + registro de eventos.
- **PR 1.6** — `scripts/balance.ts` (balance-harness). **Nota:** as constantes `QUALI_CONFIG`/`CORRIDA_CONFIG` foram expostas justamente pra esse harness calibrar; os valores atuais são chute inicial.
- **PR 1.7** — UI mínima do Single.

## Convenções que os PRs seguem

- Branch `feat/pr-X.Y-nome` → commit `feat:` → `git merge --no-ff` na main com mensagem `merge: PR X.Y — ...`.
- TDD: teste vermelho antes da implementação; seed de ouro por módulo de simulação.
- RNG: sub-stream por jogador (`deriveSeed(seed, 'fase:${jogadorId}')`) pra independência de ordem.
- Fluxo: junior-dev implementa → testes/lint/tsc → senior-reviewer revisa → correções → commit local. **Push só com ok explícito do dev.**
