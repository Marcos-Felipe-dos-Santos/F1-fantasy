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
- **PR 1.2** — Draft: 5 sorteios de equipe/ano (jogador pega 1 componente por rodada; rodada 5 forçada) + rodada 6 com 5 peças reveladas do pool compartilhado (2 cópias). Bots por seed. Testes.
- **PR 1.3** — Classificação: volta única ⇒ grid. Teste com seed de ouro.
- **PR 1.4** — Corrida: tempo de volta por notas+pista+variância, 10-15 voltas, pontuação FIA, volta mais rápida do grid inteiro. Testes de regressão por seed.
- **PR 1.5** — Incidentes: erro (CONS), quebra (CONF), problema/investigação (risco da peça), clima. Registro de eventos.
- **PR 1.6** — `scripts/balance.ts` (balance-harness) + primeiras métricas do dataset semente.
- **PR 1.7** — UI mínima do Single: traçado SVG de 1 pista + bolinhas/carros animados + botão Acelerar + tela de resultado. 21 bots (comportamento por seed).

**Marco:** dá pra jogar sozinho contra bots e medir balanceamento. Aqui você conecta o dataset gerado por IA e roda o harness em cima dele.

### Fase 2 — Modo Local (hotseat 2-4)

> Reorganizada em 2026-07-19 (plano do fable-architect aprovado pelo dev): o PR 2.2 original
> ("bots até 22 + grid com todos") foi fundido no 2.1 — bots até 22 é `22 − nHumanos` na montagem
> de jogadores e o grid com todos já existe desde os PRs 1.7a/1.7b; seria um PR sem conteúdo
> próprio. Em troca, o 2.1 foi dividido em dois PRs pequenos. Numeração original mantida (2.3).

- **PR 2.1a** — Generalização pra N humanos por baixo, Single intacto: `fluxo-draft.ts` aceita
  lista de humanos `{id, nome}` (ids fixos `humano-1..4` — id alimenta `deriveSeed`, nome é só
  exibição via `Jogador.nome?`), bots = 22 − nHumanos, telas destacam por `tipo === 'humano'`.
  Teste de equivalência: mesma seed ⇒ `DraftState` idêntico ao Single atual.
- **PR 2.1b** — Fluxo de turnos hotseat (passa o dispositivo): rodadas 1-5 em bloco por humano,
  rodada 6 seguindo a `ordemPeca` da engine; `fluxo-local.ts` puro (`alvoHumano` + decisão
  handoff/jogar/concluido), `TelaHandoff` neutra sem dados de jogo (anti-vazamento), TelaInicio
  com modo Single/Local e 2-4 nomes.
- **PR 2.3** — Modo Craque / Modo Cego (esconde notas, base→efetiva e toda dica de raridade —
  emoji, cor, bônus, risco, atributos-alvo). Mesma engine, UI condicional por prop `visibilidade`,
  opção na TelaInicio válida pra Single e Local.

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

### Fase 5 — Identidade visual e polimento (registrada em 2026-07-22; EXECUTAR depois do dataset, não agora)

> **Direção de arte: ARCADE ADULTO — "painel de telemetria", neon sobre escuro.**
> Corrigida pelo dev em 2026-07-27 (PR 7.0). **A formulação anterior — "ARCADE/LÚDICO, cores
> vibrantes, estilo chapado, divertido, jogo pra rir com amigos, não simulador sério" — foi
> REJEITADA e não vale mais.** Ela levava a verde-limão chapado, arvorezinha de desenho, laguinho
> azul-piscina: cara de brinquedo, que não combina com o resto do projeto. Se você chegou aqui
> vindo de uma referência de jogo mobile infantil, o que se aproveita dela é a ESTRUTURA, nunca o
> estilo.
>
> A direção correta é **estrutura de simulador + sofisticação do design system que já existe**:
> - **Estrutura:** pista com LARGURA real (não linha fina), pit lane com box e garagens, ambiente
>   que dá profundidade, carros que se leem como carros.
> - **Sofisticação:** os tokens do PR 5.1 são a fonte da paleta — fundo azul-noite `#16132E`,
>   amarelo `#FFCC00` e ciano `#29D9F5` de acento, magenta `#FF4FA3` reservado ao jogador humano,
>   Bungee nos títulos. **Não introduzir cor fora do sistema** (em especial: nada de verde-limão).
> - **Ambiente por TONALIDADE E CONTRASTE** — áreas de escape, zebras, muros, iluminação —,
>   **nunca por objeto decorativo infantil**. Nada de arvorezinha e laguinho.
> - **Pista:** asfalto escuro com marcações claras e zebras nas curvas. A hierarquia tonal é o que
>   dá leitura: a pista é o elemento mais claro da tela, tudo fora dela é mais escuro.
> - **Explicitamente NÃO: desenho animado.**
>
> Continua valendo o motivo original de não perseguir realismo: contorna a ausência de arte
> fotorrealista e de mapas oficiais (GDD §14.2). O que mudou é o destino — de "lúdico/infantil"
> para "retrô-moderno adulto".

- **PR 5.1** — Design system: paleta, tipografia (display forte + corpo legível), tokens de
  cor/espaçamento/raio, componentes base (botões, cards, selects) num estilo flat consistente.
  Substitui o visual cru atual. **CONCLUÍDO** (5.1a/5.1b/5.1c) — é a fonte da paleta citada acima.
- ~~**PR 5.2** — Traçados de pista bonitos~~ **SUBSTITUÍDO E AMPLIADO pela rodada visual (PRs 7.x,
  plano aprovado pelo dev em 2026-07-27)**: o 5.2 previa "linhas grossas e cores vibrantes", que é
  a direção rejeitada. A rodada 7.x entrega pista com largura em camadas, pit lane visual, ambiente
  tonal e marcador de carro. **NOTA JURÍDICA (GDD §14.2) segue valendo integralmente:** silhuetas
  PRÓPRIAS reconhecíveis, nunca decalcar o mapa oficial estilizado da F1/FIA — geometria do circuito
  é fato, o desenho oficial é obra protegida. Mesma consulta jurídica dos nomes/capacetes. O plano
  7.x adiciona um critério operacional checável pra isso (teto de waypoints, normalização que
  distorce proporção, origem declarada em comentário).
- **PR 5.3** — Editor de capacete: o jogador desenha/customiza seu capacete (padrões base + paletas),
  usado como marcador na pista. **NOTA JURÍDICA:** designs originais que evocam épocas, nunca copiar
  a pintura exata de um piloto real e nomear. **Reconciliação com a rodada 7.x (decisão D5, aprovada
  pelo dev em 2026-07-27):** o marcador na pista passa a ser um CARRO visto de cima **cujo cockpit é
  o disco do capacete**. Assim o GDD §11 ("carrinhos como capacetes estilizados") continua verdadeiro,
  o jogador ganha silhueta de carro, e este editor continua tendo superfície onde pintar.
- **PR 5.4** — Animações e transições: draft (revelar carta), corrida (já tem replay — melhorar),
  resultado (celebração), transições entre telas.
- **PR 5.5** — Tela de abertura + identidade de marca (nome/logo do jogo).
- **PR 5.6** — Som: efeitos (seleção, largada, ultrapassagem, vitória) e talvez música. Avaliar
  biblioteca leve, sem dependência pesada.

### Fase 7 — Rodada visual da tela de corrida (plano do fable-architect aprovado pelo dev em 2026-07-27)

> Nasceu de o dev jogar e achar o jogo "divertido, mas cru demais visualmente". Segue a direção de
> arte corrigida acima. **Engine intocada em TODOS os PRs** — toda geometria e animação mora em
> `src/ui/*.ts` puro, testável sem DOM (o projeto não tem jsdom e não vai instalar).

**Núcleo aprovado (prioridade):**
- ~~**PR 7.0**~~ — Corrigir a direção de arte neste arquivo (é o que você está lendo). Obrigatório e
  primeiro: enquanto a norma escrita dissesse "vibrante/lúdico", o `junior-dev` e o `senior-reviewer`
  reintroduziriam o visual rejeitado — com razão, porque era o que estava escrito.
- **PR 7.1** — **PORTÃO.** Mock estático de Monza (`?mock=pista`, fora da navegação), sem animação,
  descartável. Materializa "arcade adulto" pro dev aprovar ou reprovar ANTES de investir nos demais.
  Critério de aceite é o olho do dev, não teste automatizado — e isso está declarado, não fingido.
- **PR 7.2** — Tokens de pista + pares de contraste. **Corrige BUG PRESENTE:** hoje os 21 bots são
  `#3DDC64` sobre pista `#B9B3DC` = **1,10:1**, e o humano magenta = **1,53:1** (mínimo WCAG pra
  elemento de UI é 3:1). Os carros estão praticamente fundidos com o asfalto e nenhum teste pega,
  porque `PARES_CONTRASTE` não tem par de carro-sobre-pista. Entram na lista pra travar por teste.
- **PR 7.3** — Camadas da pista (largura, linha central, zebras, muro, escape) por stroke em
  camadas, ainda em polilinha reta; viewBox ganha margem. **Maior valor percebido por esforço.**
- **PR 7.7** — Geometria do pit como DADO (entrada/saída/caminho/box), 2 pistas primeiro.
- **PR 7.8** — Animação do pit: o carro sai da pista, desce o pit lane, PARA no box e volta.
  Reparametrização temporal pura. Custo de pit derivado na UI de `historicoVoltas` — **não** expor
  campo novo em `ResultadoCorrida`, que quebraria as 2 seeds de ouro (`corrida.test.ts:467,550`
  usam rest-spread). **Expectativa aceita pelo dev: a animação dura ~0,5-1,1s.** Não esticar
  artificialmente — a relação tempo↔espaço é o que dá credibilidade ao replay.

- **PR 7.4 — Suavização Bézier. PROMOVIDO DE CORTÁVEL PARA NÚCLEO pelo dev em 2026-07-27**, vendo a
  revisão 3 do mock: *"com o resto ficando bom, o polígono genérico passa a ser o elemento que mais
  destoa"*. Ou seja, a prioridade mudou por evidência visual, não por opinião a priori — foi o mock
  do 7.1 fazendo o trabalho pelo qual ele existe. Catmull-Rom **centrípeta** (alpha 0,5; a variante
  uniforme produz loops e cusps exatamente em ângulo agudo — hairpin de Mônaco, chicanes de Monza).
  **Continua sendo o PR de maior risco do plano** (overshoot em Mônaco/Nürburgring, tensão precisa
  de iteração pista a pista) e **arrasta o 7.5 como dependência DURA** — densificar a polilinha sem
  memoizar a LUT de comprimento de arco degrada ~10x, porque `pontoNoTracado` realoca os segmentos
  a cada chamada. Promover o 7.4 sem o 7.5 quebra o replay.

**Cortáveis (o dev decide depois de ver o núcleo):** 7.6 zebras por curvatura (o critério já está
validado no mock: ângulo de virada ≥ 28° por vértice, 11 trechos em Monza — o 7.6 só automatiza o
que hoje é constante), 7.9 marcador de carro (chassi + cockpit-capacete, D5), 7.10 performance do
replay, 7.11 pit das outras 8 pistas.

**Critério permanente de entorno (decidido em 2026-07-27, vale pra todo PR da Fase 7):** a pista e
os 22 carros são o **conteúdo**; entorno é **moldura**. Se qualquer adição prejudicar a leitura dos
carros, ela está errada. Toda superfície nova passa antes pela **tabela de luminância** — ordem
travada hoje: escape 0,005 < fundo 0,008 < terreno 0,011 < escape-de-curva/paddock 0,017 < muro
0,029 < **asfalto 0,048** < carro 0,477. O asfalto tem que continuar sendo a superfície mais clara.
Regra de escala junto: **se um elemento não é legível a 360px de largura, não entra** (foi o que
eliminou os acessos de serviço finos do paddock no mock).

**Zebra só em CURVA, nunca em reta** (decidido em 2026-07-27): faixa contínua contornando a volta
inteira dominava a tela e puxava pro cartunesco, além de não existir na F1 real. Critério
operacional já validado no mock: ângulo de virada ≥ 28° por vértice. O limite de pista contínuo é
uma **linha branca fina e discreta** (2 unidades de cada lado, ~1,4px na tela), não a zebra.

**Decisões do dev registradas:** identidade dos 22 carros = **número de largada no chassi**, não cor
(paleta categórica de 22 matizes está proibida; se o número for ilegível a ~21×10px, plano B é
identidade só no painel lateral). Suzuka vai quebrar `cruzamentosMidSegmento` quando a suavização
tirar o cruzamento do vértice compartilhado (índices 4 e 12, ambos `(500,300)`): **exceção nomeada
pra Suzuka, NUNCA afrouxar a guarda geral** — ela já pegou bugs reais em Spa e Interlagos no PR 2.8.

**Item 4 (narração de ultrapassagem) — decidido em 2026-07-27: opção (a).** Ver PROGRESS.md.

---

## 6. Ordem de ataque sugerida
Comece pela **Fase 0 e 1 inteiras** antes de pensar em rede. O modo Single com o balance-harness é o que prova que o jogo é divertido e justo — se o balanceamento não fechar aí, não adianta ter multiplayer. Rede é a casca final.

> **Atualização 2026-07-22:** Fases 0-2 concluídas; trilha do dataset (PR 4.x) em andamento.
> A **Fase 3 (Online/PartyKit) continua pendente**. Ordem sugerida pós-dataset: decidir entre
> **Fase 3 (online)** e **Fase 5 (identidade visual)** — ambas grandes, escolha do dev.
