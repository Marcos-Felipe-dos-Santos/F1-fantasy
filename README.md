<div align="center">

# 🏎️ F1 Fantasy

**Monte um carro frankenstein com peças de 76 anos de Fórmula 1 e corra contra 21 rivais.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![testes](https://img.shields.io/badge/testes-1622%20%2B%2019%20passando-brightgreen)](#-como-rodar)
[![simulação](https://img.shields.io/badge/simula%C3%A7%C3%A3o-determin%C3%ADstica%20por%20seed-orange)](#-destaques-t%C3%A9cnicos)
[![licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue)](LICENSE)

> ⚠️ **Projeto de fã, não oficial.** Sem qualquer afiliação, patrocínio ou endosso da Formula 1,
> da FIA ou de qualquer equipe. Nomes de pilotos, equipes e circuitos aparecem apenas como
> referência factual a eventos históricos públicos.

</div>

<div align="center">
  <img src="docs/img/corrida.png" alt="Corrida em andamento em Interlagos: traçado, carros e painel de posições ao vivo" width="820">
</div>

---

## 🎮 O que é

F1 Fantasy é um jogo de navegador de **draft e simulação de Fórmula 1**, inspirado nos jogos virais
brasileiros **"7x1"** e **"38 a 0"** — aquela mesma fórmula de sortear, montar e ver no que dá,
com uma partida inteira cabendo num intervalo de almoço.

A ideia é simples e cruel: você não escolhe um carro pronto. Você monta um **frankenstein**.
Sorteia uma equipe e um ano — digamos, Ferrari 2004 — e leva **um único componente** dela. Depois
sorteia de novo, e de novo. No fim você tem um piloto de uma era, um chassi de outra, um motor de
uma terceira, e uma equipe de pit stop que talvez nem existisse quando esse piloto correu. São
**76 temporadas (1950–2025)** e **771 combinações de equipe/ano** no baralho.

Aí o carro vai pra pista contra **21 rivais** que passaram exatamente pelo mesmo processo. Quali,
largada, ritmo, estratégia de parada, incidentes — tudo simulado volta a volta, e tudo derivado de
uma **seed**. A mesma seed devolve a mesma corrida, bit a bit, sempre.

---

## 🎲 Como funciona

### O draft: 6 rodadas

```mermaid
flowchart LR
    R1["🎰 Rodada 1<br/>sorteia equipe/ano<br/>→ pega 1 componente"] --> R2["🎰 Rodada 2"]
    R2 --> R3["🎰 Rodada 3"]
    R3 --> R4["🎰 Rodada 4"]
    R4 --> R5["🎰 Rodada 5"]
    R5 --> R6["⭐ Rodada 6<br/>escolha da<br/>peça icônica"]
    R6 --> C["🏁 Corrida"]
```

Nas **rodadas 1 a 5**, cada jogador recebe um sorteio de equipe/ano e escolhe **um** dos cinco
slots pra preencher com aquela combinação. O que não for pego, se perde:

| Slot                | O que representa                              |
| ------------------- | --------------------------------------------- |
| 🧑‍✈️ **Piloto**       | A dupla de pilotos daquela equipe naquele ano |
| 🏗️ **Chassi**       | O carro, aerodinâmica e comportamento         |
| ⚙️ **Motor**        | A unidade de potência                         |
| 🧠 **Estrategista** | O muro dos boxes — chamadas de parada         |
| 🔧 **Pit**          | A velocidade e a confiabilidade da troca      |

Como só há 5 rodadas para 5 slots, cada sorteio é uma decisão real: aceitar um motor mediano agora
ou torcer por algo melhor e ficar sem opção depois.

Na **rodada 6** vem a **peça icônica** — uma carta de um catálogo de **24 peças** que modifica o
carro montado. É o único momento de escolha aberta do draft.

<div align="center">
  <img src="docs/img/draft.png" alt="Tela de draft: sorteio de Theodore 1981 e os slots disponíveis" width="820">
</div>

_Rodada 2 de 5: saiu **Theodore 1981**. O piloto já foi preenchido em outra rodada, então sobram
chassi, motor, estrategista e pit — e só um deles vai levar essa equipe. No Modo Craque, as notas
aparecem; no Cego, não._

### Os modos

| Modo          | Como é                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| 👤 **Single** | Você + 21 bots                                                          |
| 👥 **Local**  | 2 a 4 jogadores humanos no mesmo dispositivo + bots completando o grid  |
| 🌐 **Online** | Sala por código de 6 dígitos, até 22 jogadores, bots completando o grid |

No **Online**, o anfitrião cria a sala, compartilha o link e o draft acontece ao vivo nas duas
pontas. A corrida roda **no cliente de cada jogador** e o servidor só coordena — é o determinismo
por seed que torna isso possível. Dar F5 no meio do draft devolve você ao mesmo lugar; fechar a aba
e voltar em **até 2 minutos** também. Quem ficar parado perde a vez por inatividade e o jogo segue
sem travar. Ver **[Como rodar](#-como-rodar)** e
**[docs/jogar-em-rede.md](docs/jogar-em-rede.md)** para jogar do celular ou pela rede local.

| Formato                      | Etapas                           |
| ---------------------------- | -------------------------------- |
| 🏁 **Corrida única**         | 1 corrida, resultado na hora     |
| 🏆 **Campeonato curto**      | 5 pistas, com tabela acumulada   |
| 🏆🏆 **Campeonato completo** | 10 pistas — o calendário inteiro |

No campeonato, o calendário é sorteado, cada etapa mostra a miniatura do traçado e a tabela
acumula entre as corridas — com a variação de posição de cada jogador etapa a etapa.

**Os três formatos valem também no Online, e o trabalho de multiplayer está concluído.** No
campeonato multiplayer o servidor sorteia uma seed independente por etapa e publica **uma de cada
vez**, conforme a etapa abre — nunca a seed-mestre. Não é zelo: com a seed base na mão, qualquer
jogador simularia as corridas futuras no console antes de draftar. Cada etapa só avança quando todos
os elegíveis atestam o fim da anterior.

<div align="center">
  <img src="docs/img/campeonato.png" alt="Calendário do campeonato completo: 10 etapas com a miniatura de cada traçado" width="820">
</div>

### Visibilidade: Craque ou Cego

| Modo          | O que você vê                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------- |
| 👁️ **Craque** | As notas dos componentes e das peças ficam visíveis. Draft de leitura e cálculo.                   |
| 🎲 **Cego**   | As notas dos componentes e das peças ficam escondidas — sobra o nome, o ano e a sua memória de F1. |

O Modo Cego esconde as notas; não esconde a pista nem o resultado da corrida. É a diferença entre
otimizar uma planilha e apostar no que você acha que sabe sobre a McLaren de 1988.

---

## 🔬 Destaques técnicos

Esta é a parte de que o projeto se orgulha.

### 🎯 Simulação 100% determinística

**Nenhum `Math.random()` em lugar nenhum da engine** — é regra arquitetural, não boa intenção. Toda
aleatoriedade sai de um RNG semeado explicitamente. Mesma seed + mesmos loadouts ⇒ **mesma corrida,
bit a bit**, em qualquer máquina.

Isso não é purismo: é o que torna o multiplayer online viável com um servidor magro (a corrida roda
no cliente, o servidor só coordena a seed), é o que permite reproduzir um bug a partir de um número,
e é o que sustenta a ideia de um "Desafio do Dia" com a mesma corrida pra todo mundo.

### 📊 Dataset derivado de fatos, não digitado à mão

As **771 combinações de equipe/ano (1950–2025)** não foram estimadas por opinião. Elas são
**derivadas de resultados históricos reais** puxados da API **Jolpica-F1** (sucessora da Ergast) e
processadas por um pipeline versionado:

```
dataset:fetch  →  dataset:fatos  →  dataset:notas  →  dataset:report
  (API pública)   (agrega fatos)   (deriva notas)    (relatório)
```

A normalização é o detalhe que faz a coisa funcionar: cada nota vem do **percentil de Hazen dentro
da própria temporada**, mapeado pra uma faixa-alvo. Ou seja — um carro é medido contra os
adversários que ele realmente enfrentou, não contra a história inteira. Sem isso, a era híbrida
esmagaria os anos 50 por puro avanço tecnológico e o draft perderia a graça.

### ⚖️ Balanceamento medido, não sentido

O projeto tem um **balance harness** próprio (`npm run balance`), rodado fora da suíte normal
porque é pesado. Ele simula em massa e mede:

| Métrica                                                                            | Amostra         |
| ---------------------------------------------------------------------------------- | --------------- |
| **Dominância por década** — nenhuma era pode ser o "botão de vencer"               | 200 campeonatos |
| **Raridade de peça** — com que frequência cada peça icônica aparece                | 200 campeonatos |
| **Taxa de vitória do pole** — a corrida tem que ser decidida no ritmo, não no grid | 400 seeds       |
| **Paradas extras** — incidência de estratégia alternativa                          | 300 seeds       |

Regra do projeto: mudou nota, fórmula ou balanceamento, roda o harness antes de considerar pronto.

### 🧱 Engine e UI separadas de verdade

```
src/engine/   TypeScript puro — draft, notas, quali, corrida, campeonato, RNG.
              NUNCA importa React nem nada de UI. Funções puras: entram dados
              + seed, sai resultado. Sem estado global, sem I/O.
src/ui/       React. Consome a engine, jamais reimplementa regra de jogo.
src/data/     JSON puro: equipe/anos, pistas, peças. Sem lógica.
src/net/      Camada de rede — o redutor PURO da sala (mesma disciplina da
              engine: entra estado + comando, sai estado novo). Isola a rede.
party/        A casca do Durable Object: WebSocket, storage e o relógio. É a
              única parte com I/O — e por isso roda numa suíte à parte.
```

A engine roda em Node sem navegador nenhum. É por isso que o harness consegue simular centenas de
campeonatos num teste.

### 🗺️ 10 pistas com silhueta própria

<div align="center">
  <img src="docs/img/silhuetas.svg" alt="Traçados das 10 pistas do F1 Fantasy" width="900">
</div>

Cada traçado é desenhado em SVG a partir de dados de curvatura, com asfalto, limites e zebras
gerados por geometria — **não são imagens de terceiros nem contornos copiados**. Passaram por
**teste cego de reconhecimento: 10/10** (contra linha de base 0/10 antes do redesenho).

A grade acima não é um print: é gerada a partir da **mesma função de geometria que a tela de
corrida usa** (`pathDaVolta`), por `npm run preview` — se o traçado mudar no jogo, muda aqui
também. Regerar é um comando, não um trabalho de captura.

### ✅ 1622 + 19 testes, em duas suítes

**1622 testes em 66 arquivos** (`npm test`) cobrindo engine, UI e o redutor de rede, mais
**19 testes em 3 arquivos** (`npm run test:party`) que rodam a casca do Durable Object dentro do
`workerd` de verdade.

**São duas suítes de propósito, e rodar só uma deixa metade do projeto sem portão:** `party/` roda
num runtime diferente, com config própria, fora do `include` do `npm test`.

Mudança de lógica de simulação neste projeto começa por um **teste que falha** capturando o
comportamento pretendido — só depois vem a implementação.

---

## 🚧 Em andamento: o dataset fictício

O jogo usa hoje **nomes reais** de pilotos e equipes. Enquanto o alvo era jogar localmente com o
repositório fechado, isso era risco contido. **Com deploy público no horizonte, deixou de ser** — e
a razão é medida, não jurídica-de-corredor: o dataset real **vai inteiro para o bundle servido**.
Contagem sobre o `dist/` gerado (2026-08-24): **105/105 nomes de equipe, 1.542/1.542 ids de piloto e
353/353 nomes exibidos**. Não é um resíduo em arquivo de teste; é 100% do dataset, servido.

Está em curso uma trilha de **7 PRs** para trocar o dataset por um fictício. **Quatro estão feitos:**

| PR  | O que                                                                                                 | Estado     |
| --- | ----------------------------------------------------------------------------------------------------- | ---------- |
| 1   | **Portão** — conta nome real nos arquivos de dados e falha se a contagem mudar, pra mais ou pra menos | ✅         |
| 2   | **Funil de literais** — os nomes espalhados em `scripts/` passam a sair de um sítio só                | ✅         |
| 3   | **Peças despidas** — as 10 peças icônicas perdem marca e código de modelo, mantêm a inovação          | ✅         |
| 4   | **A tabela** — 458 nomes fictícios (105 equipes + 353 pilotos), chaveados por id                      | ✅         |
| 5   | `anonimizar.ts` + teste diferencial, com `src/data/` ainda intocado                                   | ⬅️ próximo |
| 6   | **A troca** — `src/data/` passa a ser fictício                                                        |            |
| 7   | Fixture e baseline do portão a zero                                                                   |            |

**O portão do PR 1 é o instrumento que torna isso verificável.** Ele mede hoje **9.486 ocorrências**
de nome real nos arquivos de dados e é uma asserção de igualdade exata: baixar o número sem que o
dado tenha mudado quebra o teste. O PR 3 o moveu pela primeira vez (9.522 → 9.486).

Duas coisas que a trilha **não** resolve, e ficam ditas: o **histórico do git** continua servindo os
nomes reais (decisão consciente — reescrever histórico invalidaria as SHAs citadas na documentação
do projeto), e a **peça `Turbo modo-quali BMW`** ficou fora do escopo do PR 3 e mantém a marca.

Enquanto a troca não acontece, o aviso de projeto de fã abaixo descreve o estado real: os nomes
aparecem como referência factual a eventos históricos públicos.

---

## 🚀 Como rodar

Precisa de **Node LTS**.

```bash
npm install
npm run dev      # http://localhost:5173
```

Isso basta para o **Single**, o **Local** e os dois formatos de campeonato.

### Pro modo Online, dois terminais

```bash
# terminal 1 — o worker/Durable Object da sala
npm run sala     # 127.0.0.1:8787

# terminal 2 — o app
npm run dev      # http://localhost:5173
```

Abra `http://localhost:5173/`, escolha **Online → Criar sala**, copie o link e cole numa segunda
aba (ou mande pra outra pessoa). Quando todos marcarem "Estou pronto", o anfitrião começa o draft.

> ⚠️ **Duas abas do MESMO navegador compartilham o `localStorage`**, e portanto o token da sala —
> a segunda aba reentra como o primeiro jogador. Para testar sozinho, use **outro navegador ou uma
> janela anônima**. Não afeta jogo real, onde cada pessoa está na própria máquina.

Para jogar do celular ou pela rede local, troque o terminal 2 por `npm run dev:rede` e siga o
**[guia de rede](docs/jogar-em-rede.md)** (firewall, túnel, diagnóstico).

### Scripts

| Comando              | O que faz                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`        | Sobe o servidor de desenvolvimento (Vite)                                                                               |
| `npm run dev:rede`   | Idem, exposto na rede local — pra abrir do celular                                                                      |
| `npm run sala`       | Sobe o worker/Durable Object do modo Online (`wrangler`, em `127.0.0.1:8787`)                                           |
| `npm test`           | Suíte principal — 1622 testes (engine, UI, `src/net/`)                                                                  |
| `npm run test:party` | Suíte da casca do Durable Object — 19 testes, roda no `workerd`                                                         |
| `npm run test:watch` | Testes em modo watch                                                                                                    |
| `npm run build`      | `tsc --noEmit` + build de produção                                                                                      |
| `npm run typecheck`  | Só a checagem de tipos                                                                                                  |
| `npm run lint`       | ESLint                                                                                                                  |
| `npm run format`     | Prettier                                                                                                                |
| `npm run balance`    | Balance harness — pesado, roda fora do `npm test`                                                                       |
| `npm run preview`    | Gera os previews visuais em `preview/` (gitignored) **e** a grade de silhuetas em `docs/img/silhuetas.svg` (versionada) |

### Pipeline de dados

Só é necessário pra **regerar** o dataset — o resultado já está versionado em `src/data/`.

| Comando                  | O que faz                             |
| ------------------------ | ------------------------------------- |
| `npm run dataset:fetch`  | Baixa os fatos crus da API Jolpica-F1 |
| `npm run dataset:fatos`  | Agrega os fatos por equipe/ano        |
| `npm run dataset:notas`  | Deriva as notas por percentil         |
| `npm run dataset:report` | Relatório do dataset gerado           |

---

## 🛠️ Stack

| Camada    | Tecnologia                                                               |
| --------- | ------------------------------------------------------------------------ |
| Engine    | **TypeScript** puro, sem dependência de UI                               |
| Front-end | **React 19** + **Vite 7** + SVG                                          |
| Testes    | **Vitest 4** + **@cloudflare/vitest-pool-workers** (a suíte do `party/`) |
| Online    | **partyserver** + **wrangler** — Durable Objects na borda da Cloudflare  |

Cada sala é um **Durable Object isolado**. A corrida roda **no cliente** e o servidor só coordena —
o determinismo por seed é justamente o que permite esse desenho: o servidor não precisa simular
nada, e nem sequer carrega o dataset.

> 📌 **Foi `partykit` no papel, é `partyserver` no código.** A troca é deliberada: o pacote
> `partykit` está sem release desde 2025-09, enquanto o `partyserver` segue publicando no mesmo
> monorepo da Cloudflare. O princípio do primeiro dia não mudou — sala = Durable Object isolado —,
> só o CLI (`partykit dev` → `wrangler dev`).

---

## 📜 Créditos e avisos

### Fonte dos dados

Os fatos históricos que alimentam o dataset vêm da **[API Jolpica-F1](https://api.jolpi.ca/ergast/f1/)**,
sucessora da [Ergast Developer API](https://ergast.com/mrd/). Agradecimento sincero a quem mantém
esse serviço público — sem ele este projeto não existiria na forma em que está.

Os dados usados são **fatos históricos públicos** (resultados, posições, participações). O projeto
não reivindica direito algum sobre nomes de pilotos, equipes, motores ou circuitos: eles aparecem
como referência factual a eventos que aconteceram, e as marcas pertencem a seus respectivos
titulares.

### Aviso

> **Este é um projeto de fã, sem fins oficiais.** Não possui qualquer afiliação, patrocínio,
> licenciamento ou endosso da **Formula 1**, da **FIA**, da Formula One World Championship Limited,
> de qualquer equipe, piloto ou fabricante mencionado. _F1_, _FORMULA 1_, _GRAND PRIX_ e marcas
> relacionadas pertencem a seus respectivos titulares. Nenhuma arte, logotipo ou material gráfico de
> terceiros é incorporado ao projeto — os traçados de pista e os elementos visuais são originais.

### Licença

O **código** deste projeto está sob a **[Licença MIT](LICENSE)** — use, modifique e distribua à
vontade, mantendo o aviso de copyright.

A MIT cobre **o que foi escrito aqui**: a engine, a interface, os scripts e os traçados de pista
originais. Ela **não** concede nem reivindica direito algum sobre nomes de pilotos, equipes,
motores, circuitos ou marcas de terceiros que aparecem como referência factual — esses continuam
com seus respectivos titulares, e nada nesta licença muda isso. Os fatos históricos derivados da
API Jolpica-F1 seguem os termos da própria fonte.
