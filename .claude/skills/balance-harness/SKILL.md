---
name: balance-harness
description: Metodologia para checar e ajustar o balanceamento do jogo. Use sempre que tocar em notas (pilotos, carros, peças), fórmulas de simulação, ou antes de publicar uma versão dos dados. Roda simulações em massa e mede se algo está dominando indevidamente.
---

# Balance harness — balanceamento como processo, não achismo

Objetivo: garantir que nenhuma década, equipe ou raridade de peça domine o jogo. Balanceamento é medido, não "sentido".

## O harness
Script em `scripts/balance.ts` (roda com `tsx` ou via Vitest) que:
1. Gera N loadouts aleatórios (ex: N=10.000) usando uma seed base — pilotos/motores sorteados, estrategista/pit escolhidos, 1 peça.
2. Roda um campeonato (as 10 pistas) para cada, com a engine determinística.
3. Agrega e imprime as métricas abaixo.

## Métricas e limiares
- **Taxa de vitória por década** — nenhuma década deve concentrar muito além do esperado por acaso. Se uma década vence >X% acima da média, as notas daquela era estão infladas.
- **Taxa de vitória por raridade de peça** — a peça ☠️ Proibida pode ser tentadora, mas **não pode vencer sempre**. Se quem pega Proibida ganha o campeonato em muito mais que sua fatia justa, ou o bônus está alto demais ou o risco técnico está baixo demais.
- **Impacto isolado da peça** — comparar o mesmo carro com e sem a peça: o ganho de posição médio não deve ultrapassar a diferença entre um carro top e um mediano (senão a peça decide sozinha e a base histórica vira enfeite).
- **Desvio-padrão de pontos no campeonato** — variância saudável: nem tudo empatado (sem graça), nem um só dominando (injusto).
- **Frequência de DNF/incidente** — deve dar drama sem frustrar (nem raro demais, nem toda corrida).

## Fluxo ao mexer em balanceamento
1. **Baseline vermelho:** escreva/ajuste um teste que captura a meta (ex: "peça Proibida não vence mais que Z% dos campeonatos"). Ele deve falhar antes da mudança.
2. Ajuste notas/fórmula/risco.
3. Rode o harness. Compare com os limiares.
4. Itere até dentro dos limiares e o teste passar.
5. Registre no PR o antes/depois das métricas.

## Cuidado com dados gerados por IA
Se as notas vieram de IA: rode o harness **sobre elas** antes de confiar. IA tende a inflar times/pilotos famosos e achatar obscuros. O harness pega isso (uma década/equipe dominando). Ancore as notas em fatos (posição no campeonato, vitórias, poles) e faça spot-check dos anos que você conhece.
