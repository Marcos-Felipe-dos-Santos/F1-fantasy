---
name: sim-engine
description: Padrões e regras para escrever ou alterar a engine de simulação do F1 Fantasy (draft, notas, corrida). Use sempre que a tarefa envolver src/engine/ — cálculo de tempo de volta, grid de classificação, incidentes, pontuação, ou o RNG semeado. Garante determinismo e a fronteira engine/UI.
---

# Engine de simulação — padrões

A engine é o coração do jogo e roda igual nos 3 modos. Ela é **pura e determinística**.

## Determinismo por seed (regra número 1)
- **Nunca** `Math.random()`. Toda aleatoriedade vem de um RNG semeado passado por parâmetro.
- Use um PRNG simples e reproduzível (ex: mulberry32 / xorshift). O RNG vive em `src/engine/rng.ts` e recebe a seed.
- Uma corrida = função `simulateRace(loadouts, pista, seed) -> Resultado`. Mesmos argumentos ⇒ mesmo resultado, sempre.
- Nada de `Date.now()`, I/O, ou estado global dentro da engine.

## Fronteira
- `src/engine/` **não importa** React nem nada de `src/ui/`.
- A UI chama a engine e apenas *desenha* o resultado (posições volta a volta). A UI nunca decide resultado.

## Modelo de cálculo (referência do GDD)
- **Classificação:** tempo de volta única por piloto = f(QUALI do piloto, pesos da pista) + variância semeada. Ordena ⇒ grid. Sem pontos.
- **Corrida (10-15 voltas):** por volta, tempo de cada carro = base(notas ponderadas pela pista) + variância semeada + efeitos (pneu, chuva, DRS/ULT em ultrapassagem).
- **Notas 0-99 normalizadas por época.** A engine trata nota como número puro; a normalização já vem nos dados.
- **Incidentes por volta:** rolagem semeada contra CONS (erro do piloto), CONF (quebra), risco técnico da peça (problema/investigação), clima. Registrar o evento pra narração.
- **Pontuação FIA:** 25-18-15-12-10-8-6-4-2-1. Ponto de volta mais rápida vai pro autor da volta mais rápida do **grid inteiro** (mesmo fora do top 10). Tratar empate de tempo de forma determinística (ex: desempata por posição).

## Ao alterar qualquer lógica aqui
1. Escreva primeiro um **teste que falha** com o comportamento novo pretendido (ver skill `balance-harness` e regra do CLAUDE.md).
2. Implemente até passar.
3. Se mexeu em nota/fórmula, rode o `balance-harness` antes de considerar pronto.

## Testabilidade
- Toda função da engine deve ser testável isoladamente com uma seed fixa.
- Guarde algumas seeds "de ouro" com resultados conhecidos como testes de regressão (se o resultado mudar sem querer, o teste quebra).
