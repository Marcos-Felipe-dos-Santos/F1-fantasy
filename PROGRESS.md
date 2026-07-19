# PROGRESS — F1 Fantasy

> Estado do build por PR, pra retomar em sessão nova sem contexto anterior.
> Plano de referência: `PLANO_CLAUDE_CODE.md` §5. Regras: `CLAUDE.md`. Nada foi pushado — tudo local.

## Concluídos (mergeados na main)

- **PR 0.1–0.3** — Scaffold Vite+React+TS+Vitest, RNG semeado (mulberry32 + `deriveSeed` por rótulo), tipos base alinhados ao GDD v1.1.
- **PR 1.1** — Dataset semente (`src/data/`: 22 equipe/anos, 24 peças, 10 pistas) + loader puro validado (`src/engine/dataset.ts`).
- **PR 1.2** — Draft (`src/engine/draft.ts`): reducer puro de 5 sorteios de equipe/ano + rodada 6 de peça com escassez (2 cópias) + bots por seed (`bots.ts`).
- **PR 1.3** — Quali (`src/engine/quali.ts` + `carro.ts`): `resolverCarro` (Loadout → notas efetivas com bônus de peça, sem clamp) e `simularQuali` (score 0.5·QUALI + 0.4·carro ponderado pela pista + 0.1·CALL, variância semeada por sub-stream `quali:${jogadorId}`, desempate por jogadorId). Seed de ouro congelada (seed 42, Monza). Revisado pelo senior-reviewer (aprovado; aviso das listas de chaves paralelas corrigido com checagem `in`).

- **PR 1.4** — Corrida (`src/engine/corrida.ts`): simulação por carro independente, tempo por volta (0.5·RIT + 0.4·carro ponderado + 0.1·CALL, variância por sub-stream `corrida:${jogadorId}`), degradação por DESGASTE da pista atenuada por PNEU, pit obrigatório com janela por CALL + paradas extras por limiar de desgaste, custo de pit por PIT_TEMPO/PIT_ERRO, volta 1 com offset de grid (por dificuldade de ultrapassagem) + penalidade de LARG, pontuação FIA + volta mais rápida do grid inteiro (+1, desempate por posição final). Campo `paradas` adicionado a `ResultadoCorrida.classificacao`. Seed de ouro congelada (seed 42, Monza). Sem incidentes/DNF/clima (PR 1.5). Revisado pelo senior-reviewer (aprovado sem bloqueantes).

- **PR 1.5a** — Incidentes (`corrida.ts`): erro de piloto (CONS, perda de tempo), quebra de chassi/motor (CONF/CONF_MOTOR ⇒ DNF), risco técnico da peça (rolagem única por corrida: problema técnico numa volta + investigação com penalidade em ms só pra quem termina, GDD §8), registro de `eventos` ordenado (volta, jogadorId, tipo) pra narração. DNF: 0 pontos, classificado após os que terminaram (voltasCompletadas desc); volta mais rápida só entre quem terminou. Tipos novos: `TipoEvento`, `EventoCorrida`, `status`/`voltasCompletadas` na classificação. Ordem de consumo do RNG documentada como contrato no cabeçalho de `corrida.ts`. Revisado (aprovado; sort de eventos ganhou desempate terciário por tipo e o doc do contrato de RNG foi completado).

- **PR 1.5b** — Clima (`corrida.ts`): rolagem global de chuva 1×/corrida em sub-stream próprio (`corrida:clima`), sem consumo extra nos streams por carro; chuva soma lentidão global (`chuvaLentidao`·tempoBase) + penalidade por CHU baixo por volta e multiplica a chance de erro (`chuvaMultErro`, cap 1). Chuva NÃO altera degradação/pit/quebras/risco (pneu de chuva não modelado); quali segue seca. `chuva: boolean` em `ResultadoCorrida`. Seed de ouro seca inalterada bit a bit; segunda seed de ouro molhada (Interlagos chanceChuva:1, seed 42). Contrato de RNG documenta que o stream molhado diverge do seco a partir do 1º erro-só-na-chuva (custo consome 1 next extra). Revisado (aprovado; caveats replicados nos testes de paradas).

- **PR 1.6** — Balance-harness (`scripts/balance.ts` + `scripts/balance.balance.test.ts`, comando `npm run balance`, config própria `vitest.balance.config.ts` — fora do `npm test`) e calibração das 3 metas do dev (ver "Metas de calibração" abaixo, agora marcadas como cumpridas). Harness mede, com o dataset real: `medirVitoriaPole` (taxa de vitória do pole com carros idênticos, Monza/Spa/Mônaco), `medirParadasExtras` (fração de 2+ paradas por nível de desgaste e por bucket de PNEU, Monza/Spa/Suzuka) e `medirRaridadePeca` (championShare vs. playerShare por raridade de peça, sobre 200 campeonatos de 22 jogadores × 10 pistas com draft simplificado semeado). Baseline vermelho confirmado antes de calibrar (media grid 55.0%, alto paradas 3.6%); metas 1 e 2 calibradas mexendo só em `CORRIDA_CONFIG.variancia` (0.006→0.004), `gridOffsetMs` (facil/media/dificil 150/300/500→500/800/1200) e `limiarPneuGasto` (6→3.5); meta 3 (guarda anti-dominância da peça proibida) já passava no baseline e segue passando (ratio final 1.25, bem abaixo do limite 3.0). `npm run balance` roda em ~0.5s. Recalibração deslocou as 2 seeds de ouro de `corrida.test.ts` (recongeladas) e fortaleceu 2 testes direcionais que eram só qualitativos (limiares reais com margem de segurança abaixo do observado); os testes de clima com caveat de seed não quebraram. Revisado pelo senior-reviewer (aprovado; determinismo, fronteira engine/scripts, Ns e números do relatório verificados de forma independente).

**Testes na main: 99 passando** (8 arquivos) + 1 do harness via `npm run balance`. Lint e `tsc --noEmit` limpos.

## Acompanhamentos registrados pela revisão do PR 1.6 (não são defeitos; candidatos a PR futuro)

- `medirParadasExtras` usa equipes históricas inteiras — o CALL do estrategista desloca a 1ª parada e vira confound secundário do bucket de PNEU (o bucket <60 é na prática 1 piloto). Sinal mais limpo: fixar chassi/motor/estrategista/pit e variar só o piloto.
- `medirRaridadePeca` usa draft uniforme simplificado (dilui preferência de pick e interação peça×carro); a guarda (1.25 ≤ 3.0) segue significativa, mas com sensibilidade limitada a dominância sob draft real.
- Margens finas e determinísticas nos asserts do harness: facil 64.3% vs piso 63%; alto 56.0% vs teto 60%. Mudança de dataset pode exigir recalibração — rodar `npm run balance` sempre que tocar notas/fórmulas.

## Metas de calibração (decididas pelo dev em 2026-07-18 — cumpridas no PR 1.6)

1. **Adiamento do harness confirmado** — PRs 1.3/1.4/1.5 entram com constantes-chute; o PR 1.6 calibra tudo. ✅
2. **Sinal de grid**: 61/100 é fraco demais. Meta: pole com carro idêntico vence **claramente mais que 61% e bem menos que 95%** (alvo ~70-80%). Direção: subir `gridOffsetMs` e/ou baixar `variancia`. O harness DEVE medir a taxa de vitória do pole e reportar se ainda está fraca. ✅ (facil 64.3%, media 72.5%, dificil 85.3%)
3. **Parada extra em desgaste Alto (75)**: 10% é baixo pro "força paradas extras" do GDD §9. Meta: a **maioria dos carros** (~40-60%, variando pelo PNEU do piloto) faz 2+ paradas em pista de desgaste Alto. Direção: baixar `limiarPneuGasto` ou subir a curva de degradação. ✅ (alto 56.0%; bucket PNEU<60 100%, 60-80 80.3%, >80 0%)
4. Harness também reporta: win-rate por raridade de peça (guarda contra peça dominante, GDD §14.3). ✅ (ratio proibido 1.25, limite 3.0)

## Próximos

- **PR 1.7 (próximo)** — UI mínima do Single.

## Convenções que os PRs seguem

- Branch `feat/pr-X.Y-nome` → commit `feat:` → `git merge --no-ff` na main com mensagem `merge: PR X.Y — ...`.
- TDD: teste vermelho antes da implementação; seed de ouro por módulo de simulação.
- RNG: sub-stream por jogador (`deriveSeed(seed, 'fase:${jogadorId}')`) pra independência de ordem.
- Fluxo: junior-dev implementa → testes/lint/tsc → senior-reviewer revisa → correções → commit local. **Push só com ok explícito do dev.**
