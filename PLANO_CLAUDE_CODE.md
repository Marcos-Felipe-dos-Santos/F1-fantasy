# F1 Fantasy — Plano de build

> **Este arquivo é NORMA ATIVA.** Só contém a direção de arte (permanente) e as fases **ainda não
> concluídas**. Fases fechadas e o material de setup do projeto foram movidos pro `HISTORICO.md`
> (seção "Arquivo do plano") no chore de 2026-07-28 — o que ficou aqui é o que ainda decide código.
>
> **Ordem de leitura em sessão nova:** `CLAUDE.md` → `ESTADO.md`. Este arquivo é sob demanda.
> Regras invioláveis, roteamento de modelos e ciclo de PR ficam no **`CLAUDE.md`**, que é a fonte
> única — não duplicar aqui.
>
> Por que a limpeza importa mais que o tamanho: o **PR 7.0** existiu porque a direção de arte escrita
> estava errada, e enquanto estivesse escrita o `junior-dev` e o `senior-reviewer` reintroduziam o
> visual rejeitado — **com razão, porque era o que estava escrito**. Norma desatualizada aqui é bug.

---

## 1. Direção de arte — NORMATIVA E PERMANENTE

> Promovida a seção própria no chore de 2026-07-28. Antes vivia dentro da Fase 5; como a Fase 5 está
> quase toda concluída, deixá-la lá a arrastaria pro histórico junto — repetindo exatamente o erro
> que o PR 7.0 corrigiu. **Ela não é de nenhuma fase: vale pra todo trabalho visual do projeto.**

**ARCADE ADULTO — "painel de telemetria", neon sobre escuro.** Corrigida pelo dev em 2026-07-27
(PR 7.0). **A formulação anterior — "ARCADE/LÚDICO, cores vibrantes, estilo chapado, divertido, jogo
pra rir com amigos, não simulador sério" — foi REJEITADA e não vale mais.** Ela levava a verde-limão
chapado, arvorezinha de desenho, laguinho azul-piscina: cara de brinquedo. Se você chegou aqui vindo
de uma referência de jogo mobile infantil, o que se aproveita dela é a ESTRUTURA, nunca o estilo.

A direção correta é **estrutura de simulador + sofisticação do design system que já existe**:

- **Estrutura:** pista com LARGURA real (não linha fina), pit lane com box e garagens, ambiente que
  dá profundidade, carros que se leem como carros.
- **Sofisticação:** os tokens do PR 5.1 são a fonte da paleta — fundo azul-noite `#16132E`, amarelo
  `#FFCC00` e ciano `#29D9F5` de acento, magenta `#FF4FA3` reservado ao jogador humano, Bungee nos
  títulos. **Não introduzir cor fora do sistema** (em especial: nada de verde-limão).
- **Ambiente por TONALIDADE E CONTRASTE** — áreas de escape, zebras, muros, iluminação —, **nunca
  por objeto decorativo infantil**. Nada de arvorezinha e laguinho.
- **Pista:** asfalto escuro com marcações claras e zebras nas curvas. A hierarquia tonal é o que dá
  leitura: a pista é o elemento mais claro da tela, tudo fora dela é mais escuro.
- **Explicitamente NÃO: desenho animado.**

Continua valendo o motivo original de não perseguir realismo: contorna a ausência de arte
fotorrealista e de mapas oficiais. O que mudou é o destino — de "lúdico/infantil" para
"retrô-moderno adulto".

**NOTA JURÍDICA (GDD §14.2), permanente:** silhuetas de traçado PRÓPRIAS e reconhecíveis, **nunca
decalcar o mapa oficial estilizado da F1/FIA** — a geometria do circuito é fato, o desenho oficial é
obra protegida. Mesma consulta jurídica dos nomes e capacetes. Vale igual pra capacetes: designs
originais que evocam épocas, nunca copiar a pintura exata de um piloto real e nomear.

**Decisão de arte vai ao dev** (aprendido no PR 7.3, que custou 2 bloqueantes de revisão): a base
visual da rodada 7.x é um portão aprovado A OLHO (PR 7.1). Mudança de composição — tom de superfície,
relação entre camadas, o que é claro e o que é escuro — **não se toma sozinho**, mesmo quando todos
os testes passam. Quando a diferença só aparece vendo, gerar um preview em `preview/` e perguntar.

---

## 2. Índice de fases

| Fase | O que é | Status |
|---|---|---|
| 0 | Scaffold (Vite+React+TS+Vitest, RNG semeado, tipos) | ✅ concluída |
| 1 | Engine + modo Single (draft, quali, corrida, incidentes, balance-harness, UI) | ✅ concluída |
| 2 | Modo Local hotseat 2-4 + Modo Craque/Cego | ✅ concluída |
| 4.x | Dataset histórico 1950-2025 derivado de fatos da Jolpica | ✅ concluída |
| 5 | Identidade visual | 🔶 **parcial** — 5.1 concluída, 5.2 substituída pela 7.x, **5.3-5.6 pendentes** (§4) |
| 6 | Modo Campeonato | 🔶 **parcial** — 6.1-6.5 concluídos, **6.6-6.7 pendentes** (§5) |
| 7 | Rodada visual da tela de corrida | 🔷 **EM ANDAMENTO** (§3) |
| 3 | Online (PartyKit) — servidor magro | ⬜ pendente (§6) |

Detalhe das fases concluídas: `HISTORICO.md`, seção "Arquivo do plano".

---

## 3. Fase 7 — Rodada visual da tela de corrida (EM ANDAMENTO)

> Plano do fable-architect aprovado pelo dev em 2026-07-27. Nasceu de o dev jogar e achar o jogo
> "divertido, mas cru demais visualmente". **Engine intocada em TODOS os PRs** — toda geometria e
> animação mora em `src/ui/*.ts` puro, testável sem DOM (o projeto não tem jsdom e não vai instalar).

**Concluídos:** ~~7.0~~ (correção da direção de arte) · ~~7.1~~ (PORTÃO, mock aprovado a olho) ·
~~7.2~~ (tokens de pista + pares de contraste) · ~~7.3~~ (camadas da pista como dado puro) ·
~~7.3.1~~ (relevo do terreno, decisão de olho do dev).

**~~PR 7.6~~ DEIXOU DE EXISTIR:** "zebras por curvatura" foi resolvida como dado no 7.3, junto com o
achado de que o critério de 28° sozinho não generaliza (dava 85% do perímetro no Nürburgring).

### Restante do núcleo

- **PR 7.4 — Suavização Bézier. PRÓXIMO. PR de MAIOR RISCO do plano.** Promovido de cortável para
  núcleo pelo dev em 2026-07-27, vendo a revisão 3 do mock: *"com o resto ficando bom, o polígono
  genérico passa a ser o elemento que mais destoa"* — prioridade mudou por evidência visual, que é a
  função do portão. Catmull-Rom **centrípeta** (alpha 0,5; a variante uniforme produz loops e cusps
  exatamente em ângulo agudo — hairpin de Mônaco, chicanes de Monza).
  **PARADA OBRIGATÓRIA:** se o overshoot em Mônaco/Nürburgring não fechar com centrípeta, **PARAR e
  mostrar ao dev antes de contornar por conta própria**.
  **Arrasta o 7.5** — `pontoNoTracado` realoca a tabela de segmentos a cada chamada.
  ⚠️ **Correção medida em 2026-07-30 (o texto anterior aqui estava errado):** o "degrada ~10x" é
  verdade como razão e **falso como implicação** — não quebra o replay. Medido com 22 carros e 600
  frames: 113 µs/frame hoje, 261 a 480 pontos, 556 a 960, 1.100 a 1.920, contra **16.600 µs de
  orçamento de frame** (6,6% no pior caso). **O custo real é ALOCAÇÃO/GC, não throughput** — até
  2,5 milhões de objetos `{a,b,comprimento}` por segundo, que dá engasgo, e num aparelho fraco os
  556 µs viram 4-5 ms. O 7.5 vem antes do redesenho das silhuetas mesmo assim, por um motivo melhor:
  é pequeno e **tira a contagem de pontos da mesa**, pra que o orçamento de pontos seja decisão
  visual/jurídica e não seja argumentado contra um alvo móvel de performance.
  **Herda do 7.3:** apertar o viewBox e devolver os raios dos carros, ou documentar a margem com
  medição (ver `ESTADO.md`, pendência 1). Gerar preview em `preview/` com as 10 silhuetas antes do
  merge.
- **PR 7.5** — Memoização da LUT de comprimento de arco. Dependência dura do 7.4.
- **PR 7.7** — Geometria do pit como DADO (entrada/saída/caminho/box), 2 pistas primeiro.
- **PR 7.8** — Animação do pit: o carro sai da pista, desce o pit lane, PARA no box e volta.
  Reparametrização temporal pura. Custo de pit derivado na UI de `historicoVoltas` — **não** expor
  campo novo em `ResultadoCorrida`, que quebraria as 2 seeds de ouro (`corrida.test.ts:467,550` usam
  rest-spread). **Expectativa aceita pelo dev: a animação dura ~0,5-1,1s.** Não esticar
  artificialmente — a relação tempo↔espaço é o que dá credibilidade ao replay.
  **PARAR ao final do 7.8** pro dev ver rodando de verdade, não em mock.

**Cortáveis (o dev decide depois de ver o núcleo):** 7.9 marcador de carro (chassi + cockpit-capacete,
decisão D5), 7.10 performance do replay, 7.11 pit das outras 8 pistas.

### Critérios permanentes da Fase 7

**1. Entorno é moldura; pista e carros são conteúdo.** Se qualquer adição prejudicar a leitura dos
carros, ela está errada. Toda superfície nova passa antes pela **tabela de luminância** — ordem
travada: escape 0,005 < fundo 0,008 < terreno 0,011 < escape-de-curva/paddock 0,017 < muro 0,029 <
**asfalto 0,048** < carro 0,477. O asfalto tem que continuar sendo a superfície mais clara. Desde o
7.3 a ordem não basta: vale também **separação mínima de razão de luminância 1,25** entre superfícies
adjacentes (um mutante que preservava a ordem inteira e mesmo assim apagava a leitura passou em 608
testes antes dessa guarda existir).

**2. Regra dos 360px:** se um elemento não é legível a 360px de largura, não entra. Já eliminou os
acessos de serviço finos do paddock (7.1) e a linha central tracejada (7.3), e forçou engrossar o
limite de pista de 2 pra **4 unidades de cada lado** (2 davam 0,57px).

**3. Zebra só em CURVA, nunca em reta.** Faixa contínua contornando a volta inteira dominava a tela e
puxava pro cartunesco, além de não existir na F1 real. Critério: ângulo de virada **≥ 28° por
vértice**, com **teto de 40% do perímetro** gastando o orçamento pelos vértices de maior ângulo — sem
o teto, Nürburgring dá 85% e Mônaco 75%, que é a faixa contínua reprovada. O limite de pista contínuo
é uma **linha branca fina e discreta**, não a zebra.

### Decisões do dev registradas

- **Identidade dos 22 carros = número de largada no chassi, não cor.** Paleta categórica de 22 matizes
  está proibida (quebra a coesão e as garantias de contraste); se o número for ilegível a ~21×10px, o
  plano B é identidade só no painel lateral.
- **Suzuka vai quebrar `cruzamentosMidSegmento`** quando a suavização tirar o cruzamento do vértice
  compartilhado (índices 4 e 12, ambos `(500,300)`): **exceção NOMEADA pra Suzuka, NUNCA afrouxar a
  guarda geral** — ela já pegou bugs reais em Spa e Interlagos no PR 2.8.
- **Item 4 (narração de ultrapassagem) — opção (a):** narrar só trocas significativas, sem tocar a
  engine. Ver `HISTORICO.md`.

---

## 4. Fase 5 — restante da identidade visual (pendente)

- **PR 5.3** — Editor de capacete: o jogador desenha/customiza seu capacete (padrões base + paletas).
  **Reconciliação com a rodada 7.x (decisão D5):** o marcador na pista é um CARRO visto de cima
  **cujo cockpit é o disco do capacete** — o GDD §11 continua verdadeiro, o jogador ganha silhueta de
  carro, e este editor continua tendo superfície onde pintar. Nota jurídica na §1.
- **PR 5.4** — Animações e transições: draft (revelar carta), corrida (já tem replay — melhorar),
  resultado (celebração), transições entre telas.
- **PR 5.5** — Tela de abertura + identidade de marca (nome/logo do jogo).
- **PR 5.6** — Som: efeitos (seleção, largada, ultrapassagem, vitória) e talvez música. Avaliar
  biblioteca leve, sem dependência pesada.

---

## 5. Fase 6 — restante do Modo Campeonato (pendente)

- **PR 6.6** — Telas do campeonato (consumindo o design system do 5.1).
- **PR 6.7** — TelaInicio: escolha de modo, temporada completa de 10 etapas como opção, retomar save.
  **Se precisar cortar escopo, cortar pelo 6.7.**

> **Temporada curta de 5 etapas é o DEFAULT** (portão 6.3, decidido em 2026-07-27): o campeonato é
> decidido no draft (ρ = 0,953) e **nenhuma alavanca entra no jogo**. Ver `HISTORICO.md`.

---

## 6. Fase 3 — Online (PartyKit), servidor magro (pendente)

Exige plano do fable-architect + aprovação do dev antes de implementar.

- **PR 3.1** — Setup PartyKit; sala com código; entrar/sair; preencher com bots até 22.
- **PR 3.2** — Escolha da peça simultânea com **trava ao vivo** (2 cópias, broadcast quando esgota).
- **PR 3.3** — "Espiar amigos" (respeitando Modo Cego: só nomes, nunca notas).
- **PR 3.4** — Servidor distribui `seed + loadouts`; **corrida roda no cliente**; validação da corrida
  no servidor a partir da seed (anti-trapaça pra ranking futuro).
- **PR 3.5** — Bots por seed no online (mix de passeio/pra-ganhar; proporção = dificuldade).

**Marco:** salas online até 22, sem lag entre salas (cada sala é um Durable Object isolado).

---

## 7. Fase 4 — polimento ainda pendente

- Card de resultado compartilhável (canvas ⇒ imagem).
- "Desafio do Dia" (mesma seed pra todos) — arquitetura pronta desde a Fase 1.
