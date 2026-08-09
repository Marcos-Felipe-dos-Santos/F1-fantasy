# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (fases 6-7) e `HISTORICO_ARQUIVO.md` (fases 0-5,
> encerradas). Não leia nenhum dos dois inteiro — consulte o PR que interessa.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- 🛑 **PORTÃO Nº 2 FECHADO — os dois testes da Fase 3 PASSARAM. AGUARDANDO VEREDITO DO DEV.**
  **PR 3.1b FEITO em 2026-08-09** (`2efb145`), depois do **3.1a** (`246d937`). Os números que o
  portão pedia:
  - **CONFORMIDADE — 20 seeds, verde.** `deQuemEhAVez`/`ordemPeca`/`indicePeca` batendo com a engine
    **a cada passo**, mais rosters de 2/4/22 humanos e variante com **abandono nas duas fases**.
  - **COMMUTATIVIDADE — 20 seeds, verde**, com controle negativo e fluxo misto escolha+ausência.
  - **Medido:** `npm test` **1256/40** (era 1094/36 antes da fase), `tsc` **0**, `eslint` **0**,
    `build` **0**; **16/16 + 22/22 mutações mortas**; `npm run balance` **idêntico ao baseline**
    (ρ 0,952 · desvio 61,32 · P(campeão top-3) 99,0% · P(pódio fora top-5) 7,5%).
  - ⚠️ **UMA DIFERENÇA DE FORMA QUE O DEV PRECISA CHANCELAR** (detalhe no `HISTORICO.md`):
    `alvoHumano` devolve **um** id na fase sorteios; `deQuemEhAVez` devolve um **CONJUNTO**, porque
    online a fase é genuinamente concorrente. Espelhar `alvoHumano` serializaria 22 jogadores atrás
    uns dos outros — passaria a conformidade e o jogo estaria errado. A asserção usada é **igualdade
    de conjunto contra o `progresso` da engine**, mais forte que "`alvoHumano` ∈ conjunto".
  Detalhe completo no `HISTORICO.md` (entradas "PR 3.1a" e "PR 3.1b").
- 🟢 **SPIKE 3.0 RODADO em 2026-08-09 — veredito: GO** — e o **portão do dev foi CONFIRMADO na
  bancada dele: as duas abas funcionaram, digitou numa e apareceu na outra.** A paridade bit a bit
  do RNG entre workerd e Node, que era a premissa da fase inteira, passou. Detalhe
  completo no `HISTORICO.md` (entrada "SPIKE 3.0"); o resumo operacional está na seção **FASE 3**
  logo abaixo. **O spike vive FORA do repositório** (`E:\projetos\spike-partyserver\`) e a `main`
  ficou intocada — medido, não assumido: `git status` limpo e nenhum pacote de rede no
  `node_modules/` do projeto.
- **Estamos na `main`** (a branch `pr-8.1-calendario-sorteado` foi mergeada nela em 2026-08-08 e
  está encerrada) · últimos PRs **8.1** (calendário sorteado, `63e3e82`),
  **8.2** (round-trip do save, `6cb02cc`), **8.4-mínimo** (seletor de Formato + campeonato jogável,
  `4ba4f50`) e a rodada de **narração rica + auto-avanço**: **A** (variedade/chuva, `1537ad6`),
  **B** (causalidade contrafactual, `43fe420`), **C** (avanço automático, `fc7f20d`); e ainda
  **8.2.1** (calendário na engine, `cfe1c47`) e **8.3** (telas do campeonato, `0da36fb`) ·
  **1256 testes** (40 arquivos) verdes — medido em 2026-08-09, depois do 3.1b; eram 1094/36 antes
  da Fase 3. ⚠️ O badge do README ainda diz **1094** e é estático — está desatualizado.
- **Medido em 2026-08-07, não herdado:** `npm test` **1094/36**, `tsc --noEmit` **exit 0**,
  `eslint src scripts` **exit 0**, `npm run build` **exit 0**. **`npm run balance` inalterado por
  construção** — o harness importa só `src/engine/dataset`, `src/data/*.json` e `scripts/alavancas`,
  e nenhum dos três foi tocado. `prettier --check` reprova `fluxo-campeonato.ts`/`.test.ts`, mas
  **já reprovava no HEAD** (verificado com `git show HEAD:<arquivo>`) — pré-existente, não é gate.
- 🎮 **COMO TESTAR O CAMPEONATO no app real** (o dev já testou single e local com 2 jogadores):
  `npm run dev` → `http://localhost:5173/` → **Formato: "Campeonato curto"** → Começar draft →
  jogar o draft → **Ir pra corrida**. No fim de cada corrida, a tabela acumulada e "Próxima
  corrida". Recarregar a página no meio deve oferecer **"Continuar campeonato"** no topo.
  **Narração:** o ticker de eventos durante o replay mostra a variedade (PR A) e, quando os dados
  sustentam, "…e caiu atrás de X" (PR B). **Auto-avanço:** o toggle "Avançar automaticamente" no fim
  da corrida — ele deve avançar **e largar sozinho**, e desmarcar durante a contagem deve cancelar.
- **Working tree limpa.** `tmp-medir-save.ts` continua no disco, mas agora é **ignorado** pelo
  `.gitignore` (regra `tmp-*`, adicionada em 2026-08-07) — é script descartável do dev e está
  **quebrado** (`criarDraft` exige 22 jogadores + `atribuirPerfis` antes; o arquivo passa 4). A
  medição que ele buscava já foi feita e está registrada abaixo.
- ✅ **A `main` FOI PUSHADA em 2026-08-07, com autorização explícita do dev** (`git push origin
  main:main --tags`, fast-forward `b39782d..49f3ca8`). **`main` local == `origin/main` == `49f3ca8`**
  (verificado: `git rev-list --left-right --count main...origin/main` = `0 0`). Não existem mais
  duas `main`s divergentes — `git checkout main` e o remoto apontam pro mesmo commit. A tag
  **`v0.1.0-fase0`** também subiu (era a única local; o remoto não tinha nenhuma).
- ✅ **MERGE NA `main` FEITO em 2026-08-08, com "ok" explícito do dev** (`git merge --no-ff`,
  commit `f1216d5`). A `main` agora **contém 7.7, 7.7.1, 7.8, 8.1, 8.2, 8.2.1, 8.3**, a rodada de
  narração + auto-avanço, e o **README/LICENSE/`docs/img/`**. Medido na `main` pós-merge:
  `npm test` **1094/36**, `tsc --noEmit` **exit 0**, `npm run build` **exit 0**.
  **`pr-8.1-calendario-sorteado` continua só local e sem uso** — todo o conteúdo dela está na `main`.
- 📄 **README, LICENSE e `docs/img/` existem desde 2026-08-08** (`10dd10a`). A licença é **MIT** —
  cobre o código escrito aqui e **não** reivindica nada sobre nomes de pilotos, equipes ou
  circuitos, o que preserva o aviso de projeto de fã não oficial. **`docs/img/` é VERSIONADA** (ao
  contrário de `preview/` e `referencias/`, gitignored): guarda os três prints do dev
  (`corrida.png`, `draft.png`, `campeonato.png`) e a grade `silhuetas.svg`, esta **gerada** por
  `scripts/gerar-silhuetas-readme.preview.test.ts` via `npm run preview`, a partir do `pathDaVolta`
  de produção. **Se um traçado mudar, regerar e commitar a grade.**
  ⚠️ O badge "testes 1094 passando" do README é **estático** — não há CI neste repo (`.github/`
  não existe). Ele não se atualiza sozinho e vai mentir se um teste quebrar.
- **O repositório é PRIVADO** (`https://github.com/Marcos-Felipe-dos-Santos/F1-fantasy`) e deve
  continuar assim: o projeto usa nomes reais de pilotos e equipes e a questão jurídica do
  **GDD §14.2** ainda está em aberto. Evidência da privacidade: a API do GitHub sem autenticação
  devolve **404** para esse repo, enquanto `git ls-remote` autenticado funciona.
  Com a MIT no repositório, abrir o código deixou de ter o problema do "todos os direitos
  reservados" — mas **abrir segue sendo decisão do dev**, e o motivo do §14.2 não mudou.
  ✅ **Os dois portões visuais foram FECHADOS em 2026-08-07** (silhuetas 10/10, paleta aprovada), o
  que removeu o motivo que segurava o trabalho da 7.7+ fora da `main` — merge feito em 2026-08-08.
  **Nenhuma tag foi criada para este merge.** Se for criar, só DEPOIS do merge na main (já é o caso).

## ✅ OS DOIS PORTÕES VISUAIS ESTÃO FECHADOS (dev, 2026-08-07)

**Não há portão visual aberto neste projeto.** Os dois foram aprovados pelo dev na mesma sessão.
Esta seção fica como registro do veredito — não reabrir sem ele.

### 1. AS SILHUETAS (PR 7.7/7.7.1) — ✅ APROVADAS. **Teste cego: 10/10.**

O critério de aceite era do próprio dev: *o jogador vê a pista e pensa "poxa, Interlagos" sem ler o
nome?* **Linha de base era 0/10; o placar final foi 10/10.** O redesenho a partir da geometria real
dos circuitos resolveu — e o **gatilho de abandono** que estava armado (parar e reabrir a pergunta
se o ponteiro não se movesse) **não foi acionado**.

### 2. A PALETA (PR 7.8) — ✅ APROVADA, **com o light mode**.

A troca do azul-noite pela paleta F1 (grafite + vermelho `#FF1801` + dourado `#FFB800` + verde
`#00D26A`) **resolveu o problema que motivou o PR** — palavras do dev na abertura: a tela "parecia
genérica e feita com IA". Aprovada como está, incluindo o light mode e a ilha escura do painel do
traçado (que é necessidade matemática, ver as decisões travadas mais abaixo).

> ✅ **Consequências práticas de os dois estarem fechados:**
> - **`npm run preview` voltou a ser seguro.** O aviso que existia aqui — de que ele repintaria o
>   `redesenho.html` com a paleta nova e misturaria as duas perguntas — **não vale mais**, porque
>   não há duas perguntas pendentes pra misturar.
> - **O diff da paleta deixou de ser candidato a reversão.** A instrução anterior ("se for
>   reprovada, reverter `f736e6c`") está morta.
> - Os previews seguem em `preview/` (gitignored):
>   `E:\projetos\F1 fantasy\preview\redesenho.html` e `E:\projetos\F1 fantasy\preview\paleta.html`.

## 🚩 FASE 8 — MODO CAMPEONATO: o plano aprovado NÃO bate com o código

Plano aprovado pelo dev (sessão de 2026-08-07), 4 PRs: **8.1** engine · **8.2** persistência ·
**8.3** telas · **8.4** integração. Dois submodos — **curta** (5 pistas sorteadas das 10, default) e
**completa** (10 embaralhadas) — convivendo com "Corrida rápida" na `TelaInicio` (3 opções).
Decisões travadas: **nenhuma alavanca** (sem lastro, sem pit de meio de temporada) — é jogo de
draft, o campeonato é confirmação. Draft único por campeonato. Ordem embaralhada nas duas modalidades.

**O achado do 8.1, que reordena o resto da fase:** o 8.1 e o 8.2 do plano descreviam trabalho que
**a Fase 6 já tinha feito**. Já existiam e são testados: `src/engine/campeonato.ts` (etapas,
pontuação FIA, desempate countback), `src/ui/fluxo-campeonato.ts` (curta/completa,
`iniciarCampeonato`, `avancarEtapa`, `simularOResto`, `classificacaoApos`) e
`src/ui/persistencia.ts` (save, impressão digital, `retomarCampeonato`). A "promoção da lógica do
balance-harness pra engine" **já tinha acontecido**.

**O que NUNCA tinha sido feito é o antigo PR 6.6 — as TELAS.** Era daí que vinha o desalinhamento
inteiro: o modo existia, determinístico e testado, e era **inalcançável pelo jogador**.
✅ **Resolvido no 8.4-mínimo** (`4ba4f50`): o campeonato ganhou seletor, encadeia corridas, salva e
retoma. ✅ **E o 8.3** (`0da36fb`) substituiu as telas cruas pelas de verdade — calendário com
silhuetas, classificação com variação de posição e fim de campeonato com pódio.
**A Fase 8 está completa**; o que resta é o veredito do dev sobre o preview.

### O 8.2 colapsou — FEITO, mas não é o PR que o plano descrevia

- **compress+base64: MORTO pela medição.** Save real = **16,48 KB** (22 jogadores, completa;
  16,39 KB na curta) = **0,32% de uma quota de 5 MB**. Método: draft REAL resolvido por bots, não
  save sintético. Comprimir seria dependência nova sem problema pra resolver.
- **Camada de abstração e impressão digital: já existiam** (PR 6.5 / 6.2).
- **"Salvar após cada corrida" depende da UI**, que é o 8.4.
- ✅ **O que sobrou virou os commits `6cb02cc` + `0f3e178` — diff SÓ DE TESTE, `persistencia.ts`
  intacto.** Três testes provam que o save aguenta o calendário sorteado: round-trip preserva o
  calendário embaralhado e o cursor **sem bump de `VERSAO_FORMATO`**; temporada curta **concluída**
  (`etapaAtual === etapas.length`) faz round-trip inteiro; e o discriminante — **um save com o
  calendário REORDENADO é REJEITADO**. `calcularImpressaoDigital` junta as etapas na **ORDEM** do
  array, então a integridade cobre a ordem, não só o conjunto. Isso importa pro 8.3/8.4: é a UI que
  vai gravar e reler esse save. **Duas mutações:** ordenar as etapas na impressão digital mata o
  teste de reordenação; trocar o guard pra `>= length` mata o teste de borda.
  **Revisão: sem bloqueante, 3 avisos aplicados** — o mais útil deles é que duas asserções que eu
  tinha escrito eram **infalsificáveis** (implicadas por `carga.ok` e pelo próprio `throw` do
  `retomar`). Asserção que não pode falhar se lê como cobertura e não é.
- 🛑 **O dev pediu "pare ao final do 8.2 pra eu ver a mecânica rodando", mas depois do 8.2 não há
  nada pra ver rodando** — não existe UI. **DECIDIDO pelo dev em 2026-08-07 (ver seção abaixo):
  wiring mínimo do 8.4, não script de demo.**

### ✅ PR 8.4-mínimo FEITO (commit `4ba4f50`) — o campeonato é JOGÁVEL

O dev pediu o seletor de "Formato" e classificou como **baixo risco (UI)** — a classificação vale,
porque **ele mesmo vai rodar o app**, o que é mais forte que preview. (A entrada anterior deste
arquivo dizia "alto risco, portão visual"; foi superada pela classificação do dev.)

**Entregue mais que o `<select>`, porque o `<select>` sozinho seria decorativo:** antes do commit
nada em `App.tsx` importava campeonato e nada chamava `salvarCampeonato`. Agora: seletor Formato
(única/curta/completa), Pista **e a linha de perfil** somem nos campeonatos, corridas encadeiam de
verdade, save a cada corrida, e "Continuar campeonato" no topo da `TelaInicio`.

🔑 **O BUG QUE QUASE ENTROU — a lição que sobrevive ao PR.** As duas trilhas de corrida usam seeds
**diferentes de propósito** (decisão D6): a avulsa usa a seed **crua** do draft, a etapa de
campeonato usa `seedDaEtapa(seed, pistaId)`. Como `iniciarCampeonato` **pré-simula** as etapas e a
pontuação sai dali, ligar o campeonato no `FluxoCorrida` existente faria o jogador **assistir a uma
corrida e ver OUTRA na tabela**. **`npm test` não pegaria** — cada lado, isolado, está certo; só a
composição estava errada. `prepararCorrida` ganhou `seed` (default preserva a avulsa bit a bit) e há
teste provando a reprodução bit a bit da etapa pré-simulada.

### ✅ RODADA DE NARRAÇÃO RICA + AUTO-AVANÇO (PRs A, B, C) — FEITA

Feedback de quem jogou, planejada pelo `fable-architect`, aprovada pelo dev com três correções ao
pedido original. **Nada tocou `src/engine/`** — nem aditivamente.

- **A (`1537ad6`)** — variedade de erro + vocabulário de chuva. `deriveSeed` usado como **HASH, nunca
  como stream**: nenhum tempo muda, nenhum RNG novo é consumido, seeds de ouro e `balance` intactos
  por construção. Pool de chuva **só pra `erro-piloto`**, porque `chuvaMultErro` só multiplica
  `chanceErro` — vocabulário molhado numa quebra de motor sugeriria causalidade inexistente.
- **B (`43fe420`)** — causalidade **contrafactual**: a linha causal só sai se, descontado o custo do
  erro, X continuaria à frente. Mais restritivo que o pedido original, e aprovado pelo dev
  exatamente por isso.
  📏 **MEDIDO em 200 corridas reais: 3,19 linhas causais/corrida, 93% das corridas com pelo menos
  uma, 42% de aproveitamento.** O dev cogitava cortar o PR se rendesse pouco — decidiu com o número.
- **C (`fc7f20d`)** — auto-avanço com auto-largada (sem ela, empacaria na tela de grid).

🔒 **Regras de honestidade da narração, travadas por TESTE, não por comentário:** nenhuma frase pode
afirmar manobra, local da pista, disputa ou clima evoluindo — um regex reprova
`ultrapass|disputa|começou a chover|pneu de chuva` em qualquer variante nova. **A engine simula cada
carro isoladamente e o clima é uma flag global**; qualquer frase fora disso é falsa por construção.

📌 **Regra registrada para código que ainda não existe (item d do dev):** quando houver narração de
troca de posição, **pit não é ultrapassagem** — pit de qualquer um dos dois desqualifica a palavra.
Hoje não existe narração de troca de posição (a única narração do jogo era `ROTULOS_EVENTO`), então
a regra fica aqui aguardando o código que a consumirá.

### ✅ PR 8.3 FEITO — as telas do campeonato (commits `0da36fb` + `499114c`)

⬅️ **AGUARDANDO VEREDITO DO DEV — o único item aberto do projeto agora:**

    start "" "E:\projetos\F1 fantasy\preview\campeonato.html"

As três telas numa página só, a partir de um campeonato real (seed 2026, curta, 8 jogadores):
**calendário** (silhuetas, vencedores, próxima destacada), **classificação com variação de posição**
(▲/▼) e **fim de campeonato** (pódio + tabela final + calendário completo).

⚠️ **Este preview NÃO é maquete** — diferente do `paleta.html`. Ele inlina `tokens.css` e
`estilos.css` REAIS e renderiza os COMPONENTES REAIS; o que se vê é o que o app desenha, com o mesmo
CSS. Falta só interação (nada clica, não há replay). Regerar:
`npx vitest run --config vitest.preview.config.ts scripts/preview-campeonato.preview.test.ts`
(ou `npm run preview`, que agora é seguro — os dois portões antigos estão fechados).

🔒 **A decisão que sustenta a tela de calendário:** `iniciarCampeonato` **pré-simula todas as
etapas**, então o resultado das próximas está em memória o tempo todo. `calendarioAnotado` só revela
vencedor de etapa com `indice < etapaAtual` — vazar o vencedor de uma corrida que o jogador ainda
vai assistir estragaria a corrida. **Tem teste dedicado, e é o mais importante do PR.**

🔒 **A silhueta da miniatura reusa `pathDaVolta`**, a mesma geometria da tela de corrida. Foi ela que
tirou 10/10 no teste cego; redesenhar à mão na miniatura jogaria isso fora.

### ✅ PR 8.2.1 FEITO — calendário mora na engine (fecha a pendência 0)

`FormatoTemporada`, `FORMATO_PADRAO`, `N_ETAPAS`, `calendarioPadrao`, `calendarioSorteado` e o
helper `etapasDoFormato` foram pra `src/engine/campeonato.ts`. **`fluxo-campeonato.ts` re-exporta os
cinco públicos, então NENHUM chamador mudou** — nem as ~90 referências de teste, nem a UI.

**O que FICOU na UI, de propósito:** `FormatoPartida`, `ehCampeonato`, `mostraSeletorDePista`,
`ROTULO_FORMATO`, `formatoDoCalendario`, `resumoCampeonatoSalvo`. Nenhum é regra de jogo — são
decisões de TELA (qual seletor aparece, que texto o botão mostra). Movê-los levaria UI pra dentro da
engine, que é a violação inversa.

**Refactor sem mudança de comportamento: 1078 testes seguem passando, os mesmos, sem teste novo — e
o ponto é esse.** `npm run balance` rodado (mexeu em `src/engine/`): **tabela idêntica**,
`seedDaEtapa` e `simularCampeonato` só mudaram de vizinhança.

## 🌐 FASE 3 — ONLINE: o plano aprovado (registrado em 2026-08-09)

> ⚠️ **Este plano foi aprovado numa sessão anterior e NÃO estava neste arquivo** — o dev teve que
> recolá-lo inteiro na mão depois de reiniciar o PC. Fica aqui pra que isso não se repita.

**Decisão (a) — o alvo NÃO é mais PartyKit.** É **`partyserver` + `wrangler`**, rodando como Durable
Object comum num projeto Workers. O princípio do dia 1 fica intacto (**sala = DO isolado**); só o CLI
muda (`partykit dev` → `wrangler dev`). Motivo medido: `partykit@0.0.115` sem release há ~11 meses;
`partyserver@0.5.10` publicado dias atrás, no mesmo monorepo `cloudflare/partykit`.
🔑 **Par de versões testado no spike: `partyserver@0.5.10` + `wrangler@4.120.0` + Node v24.16.0.**
Os dois são pré-1.0/móveis — se algo quebrar no 3.2, **suspeitar da versão antes do código.**

**Decisão (b) — D-E: SEED POR ETAPA (opção B), o DO guarda a `seedMestre`.** Com a seed base completa
na mão, qualquer jogador computa as corridas futuras no console — não é hack, é chamar uma função, e
num jogo casual alguém faz e conta no grupo. **Custos aceitos pelo dev:** fork do `iniciarCampeonato`;
`campeonatoConcluido` precisa ser revisto (`fluxo-campeonato.ts:337` mede contra `etapas.length` e,
com estado incremental, devolveria `true` depois da etapa 1); e **o save do 8.2 sai de cena no
online.**

**Decisão (c) — divisão 3.1a / 3.1b aprovada.** O **3.1b é onde mora o risco**: regra de turno
duplicada entre engine e redutor, derivando em silêncio.

**Sequência de PRs — TODOS ALTO RISCO** (o `CLAUDE.md` lista netcode):

- ✅ **3.0 SPIKE** — go/no-go da dependência. **FEITO, GO** (portão do dev confirmado nas duas abas).
- ✅ **3.1a Sala + roster congelado** — **FEITO** (`246d937`). O que ficou travado e o 3.1b herda:
  - 🔑 **Roster congelado é um `Jogador[]` ORDENADO, não um conjunto.** `criarDraft` embaralha
    `ordemPeca` a partir de `jogadores.map(j => j.id)` (`draft.ts:73`) — ordem do array, não conjunto.
    Ordem canônica: crescente por id, `humano-01` com padding de 2 dígitos.
  - 🔒 **Nenhum comando carrega `jogadorId`.** `reduzirSala(estado, comando, remetenteId)`; o id vem
    do **transporte**, a partir da conexão. Sem isso, o token de turno do 3.1b nasceria sobre um
    remetente forjável.
  - 🔒 **`seedMestre` não sai do DO.** `EstadoSala` (interno) ≠ `EstadoSalaPublico` (fio); o broadcast
    leva `seedDraft = deriveSeed(seedMestre, 'online:draft')`. Esquecer de filtrar não compila.
  - **Guarda de fase é POR HANDLER**, de propósito: os comandos do 3.1b valem com a sala já
    iniciada, e *abandono é `sair` depois do início*. Estender, não reescrever.
  - **`seq` monotônico já existe** (recusa não incrementa) — é contra ele que o harness do 3.2
    assere reordenação/duplicação.
  - **eslint trava a fronteira** de `src/net/**`: nada de `src/data/`, `src/ui/`, React,
    `Math.random`/`Date.now`/`localeCompare`. Testes ficam de fora da trava de propósito.
- ✅ **3.1b Turnos no redutor (o coração)** — **FEITO** (`2efb145`). O que o 3.2/3.3 herdam:
  - 🔒 **O CONTRATO DO AUSENTE, obrigatório pro 3.3** (está no docblock de `marcarAusente`): o
    cliente completa os sorteios do ausente **no mesmo evento** em que vê a ausência no log; e na
    fase peça **joga por ele**, com escolha **determinística e idêntica nos 22** (`escolherBot`,
    semeado — nunca decisão de UI). O pool de peças é compartilhado: dois clientes escolhendo peças
    diferentes pelo mesmo ausente **furam o pool em silêncio**.
  - **`turnoEsperado` em `ComandoDraft`** dá idempotência sob duplicação e reordenação — é isso que
    o harness do 3.2 vai atacar.
  - **`expirarJogador` é comando do SERVIDOR**, fora de `ComandoDraft`: se cliente pudesse expirar
    turno, expiraria o dos outros. `agora` é sempre injetado (`Date.now` é erro de lint em `net/`).
  - **`marcarAusente` sobrescreve `rodada` destrutivamente** — trazer alguém de volta (reconexão,
    3.2) exige reconstruir a rodada dele contando os eventos `escolha` no log.
- ⬅️ **3.2 Transporte** — casca fina de I/O sobre o redutor (`party/sala.ts`, `src/net/cliente.ts`,
  `wrangler.jsonc`) + harness headless. É aqui que `partyserver`/`wrangler` entram no `package.json`.
- **3.3 Lobby + draft online na UI** (`TelaLobby.tsx`, `FluxoOnline.tsx`).
- **3.4 Handshake de versão + detector de divergência** (hash da corrida comparado entre os 22).
- **3.5 Campeonato online (seed por etapa)** — **CORTE Nº 1** se a fase ficar grande.

🛑 **PORTÕES OBRIGATÓRIOS (do dev):**
1. **Parar ao final do 3.0** com o go/no-go. ✅ cumprido.
2. **Parar ao final do 3.1b** com o resultado dos DOIS testes que valem a fase:
   (1) **conformidade** — `deQuemEhAVez` bate com `alvoHumano`/`ordemPeca` da engine em **≥20 seeds**;
   (2) **commutatividade** — mesmos sorteios ⇒ `DraftState` idêntico.
   **Se a conformidade não fechar, PARAR — não contornar.**

⚙️ **Herança de config do spike que o 3.2 precisa DECIDIR, não copiar:** o `wrangler.jsonc` do spike
usa `compatibility_date: "2026-08-01"` e `compatibility_flags: ["nodejs_compat"]`. **A flag foi posta
defensivamente e não sustenta nada** — `rng.ts` tem zero imports e o cliente de teste roda fora do
worker. Entrar no 3.2 sem exame seria diferença de ambiente que ninguém escolheu.

**Riscos aprovados como propostos:**
- **Float/determinismo:** defesa por **handshake de versão, não por detector** — a engine só usa
  `Math.imul`/`max`/`round`/`min`/`floor`/`abs`, **zero transcendental**. ✅ O spike já mediu a
  paridade bit a bit workerd↔Node (4 seeds, bits IEEE-754 comparados), o que sustenta a escolha.
- **Colisão de namespace do `deriveSeed`:** todo rótulo novo com prefixo **`"online:"`**, registro em
  `src/engine/namespaces-seed.ts` **com teste que falha em duplicata**.
- **Hash de corrida sobre `ResultadoCorrida`.**

📌 **O harness headless NÃO é opcional** (palavras do dev): simular 22 clientes com injeção de
latência, reordenação, duplicação e desconexão. O dev precisa testar **sem depender de amigos
disponíveis**. **Abas no navegador só pro portão visual.** O spike já deixou o embrião disso em
`E:\projetos\spike-partyserver\scripts\dois-clientes.mjs` (WebSocket global do Node ≥ 22, sem
dependência).

## Onde parei

Concluído: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.8**, e a Fase 8 nos
PRs **8.1** (calendário sorteado), **8.2** (round-trip do save) e **8.4-mínimo** (o campeonato
deixou de ser inalcançável — tem seletor, encadeia corridas, salva e retoma).

**PR 8.1, em uma linha:** `calendarioSorteado(dataset, seed, formato)` entrou como função IRMÃ de
`calendarioPadrao`, que **não foi tocado** (é o calendário estável dos testes, goldens e harness, e
um teste trava literalmente a ordem do dataset). Embaralha as 10 e **só então** corta em N — é isso
que faz a curta ser prefixo da completa pra QUALQUER seed. Namespace próprio
`deriveSeed(seed, 'calendario')`, sem colisão com `camp:<pistaId>`/`bots`/`draft:*`.
**A classificação final não depende da ordem** porque o comparador de `acumularClassificacao`
termina em `cmpJogadorId` (`campeonato.ts:204-209`) e portanto é ordem **total** — sem isso o teste
de equivalência estaria passando por sorte do fixture. Revisão sem bloqueante.

O **7.8 trocou a paleta inteira** (azul-noite → grafite + vermelho `#FF1801` / dourado `#FFB800` /
verde `#00D26A`) e adicionou light mode. O que esse PR ensinou, e que vale além dele: **a cor do
carro do jogador governa a paleta da pista**. O teto de luminância do asfalto é derivado de
`carro do jogador / asfalto >= 3`; trocar magenta (L 0,295) por vermelho (L 0,219) derrubou o teto
de 0,0650 pra **0,0397** e obrigou a redesenhar a escada tonal inteira. Não foi decisão de gosto.

## SEQUÊNCIA — o que sobrou

**Os portões visuais saíram desta lista: os dois foram aprovados em 2026-08-07.**

0. 🛑 **VEREDITO DO DEV sobre o PORTÃO Nº 2** (3.1b): os dois testes passaram — ver o bloco no topo.
   Nada segue pro 3.2 sem esse "ok". A chancela inclui a **diferença de forma** do `deQuemEhAVez`
   (conjunto, não id único).
1. **Depois do "ok": PR 3.2 — Transporte.** É onde `partyserver`/`wrangler` entram no
   `package.json` (par testado: `partyserver@0.5.10` + `wrangler@4.120.0`, Node v24.16.0) e onde
   o **harness headless não é opcional**. Ver a seção **FASE 3** acima.
1. ⬅️ **VEREDITO do dev sobre `preview/campeonato.html`** (as três telas do 8.3) — segue aberto.
2. **PR de INFRA — DESTRAVADO pela aprovação das silhuetas.** Era "pré-requisito caso as silhuetas
   fossem aprovadas"; com o 10/10, **deixa de ser pré-requisito e vira consolidação**: restrições
   geométricas como testes vermelhos + allowlist `LEGADO` que só encolhe. **Reavaliar o escopo com o
   dev antes de fazer** — pode ter encolhido junto.
3. **PR 8.3 — as telas de verdade do campeonato** (calendário, classificação navegável, fim de
   temporada). O painel de hoje é cru de propósito.
4. 🛑 **Depois, o pit (7.9).**
5. **Decisão de arte ainda aberta:** o `88/40%` da zebra (seção própria abaixo) — não foi tocado
   pela aprovação dos portões.

## Decisões travadas da PALETA (7.8 — ✅ APROVADA pelo dev, não reabrir sem ele)

- 🔒 **Os três acentos da marca são IDÊNTICOS nos dois modos onde são PREENCHIMENTO.** Onde a cor
  vira TINTA (texto, ícone, linha de 1px) existe um token irmão `*Texto`, mode-scoped. Não é
  preciosismo: `#FFB800` e `#00D26A` dão **1,53:1 e 1,78:1** sobre o branco quente — é teto da cor.
- 🔒 **`primaria/fundo` é 3:1, não 4,5** (decisão do dev). O vermelho é botão/destaque/carro, não
  corpo de texto, e `#FF1801` tem teto de 5,383 contra preto puro — exigir 4,5 significaria
  abandonar o hex da marca. Vermelho em texto usa `primariaTexto`.
- 🔒 **Todo token `pista*` é MODE-INVARIANTE** e o painel do replay é ilha escura nos dois temas.
  A regra 1 da Fase 7 é impossível sobre base clara (teto do asfalto 0,0397 vs. base clara 0,877).
  `fundo`/`fundoAfundado`/`fundoElevado` **saíram da união `CorDePista`** — a regressão nem compila.
- 🔒 **`borda` continua DECORATIVA**, fora de `PARES_CONTRASTE`. Verificado, não assumido: a
  separação card/base é fraca nos DOIS modos (1,213 escuro / 1,132 claro), então o claro não
  introduziu problema novo.
- **Zebra é vermelho + branco** (era amarelo + salmão) — o zebra real de F1.
- **A cascata do tema tem três blocos e a ordem importa:** `:root` escuro → `@media` escopado com
  **`:root:not([data-tema])`** → `[data-tema]` manual. Sem o `:not()`, o toggle não vence o SO.

## Decisões travadas do redesenho (✅ silhuetas APROVADAS 10/10 — não reabrir sem o dev)

- 🔒 **TODA guarda geométrica nova neste projeto MEDE EM ARCO, NUNCA EM ÍNDICE** (dev, 2026-08-01).
  **Palavras do dev: "já custou duas vezes".**
- **Era dos traçados: layout MODERNO/ATUAL.** Nürburgring = GP-Strecke, não Nordschleife.
- **`LARGURA_ASFALTO = 34` mantida.** Separação ≥ 34 u e raio ≥ 20 u; as 10 passam.
- **Escala UNIFORME por pista** (nunca esticar x e y independentemente). Consequência aceita:
  Interlagos não enche a moldura na horizontal.
- **Moldura de desenho: x ∈ [56, 924], y ∈ [36, 564].**
- **Nada de métrica automatizável de reconhecimento.** Hausdorff contra a pista real recusado.
- **A detecção de zebra roda no traçado de CONTROLE**, não na curva suavizada.

## 🎨 DECISÃO DE ARTE ABERTA — 88/40%, com o parque inteiro na mesa

`JANELA_CURVATURA_ZEBRA = 88` foi calibrado contra a Monza de 16 pontos, que **não existe mais**.
Reabrir é decisão de arte do dev. Medido no parque novo: o teto de 40% **morde em 8 das 10** — só
Spa (33,4%) e Red Bull Ring (28,0%) não perdem candidato. Caso extremo, o Nürburgring: **29 trechos
/ 50,0% sem teto contra 24 / 38,7% com ele** — é o teto que segue impedindo a faixa contínua que o
dev reprovou.

## Pendências ATIVAS

0. **Abertas pelo 3.1a (Fase 3):**
   (a) **`montarJogadores` está duplicado** entre `fluxo-draft.ts:117` (UI) e `congelarRoster`
   (`src/net/sala.ts`), assim como `QTD_JOGADORES = 22`. Hoje a divergência é **vigiada** por um
   `it.each` de conformidade (`facil`×`dificil` × {2,3,5,22} humanos) contra
   `iniciarDraft(...).jogadores`; o certo é **extrair pra `src/engine/` e ter uma função só** —
   refactor pequeno e separado, candidato a rodar antes do 3.1b. ⚠️ Limite conhecido: a
   conformidade **não** trava o `sort` de `congelarRoster` (o array offline já chega ordenado);
   quem trava é o teste de ordem embaralhada.
   (b) ✅ **`src/engine/namespaces-seed.ts` FEITO no 3.1b** — registro + varredura do código-fonte
   que reprova rótulo não registrado, com guarda anti-vacuidade. Fecha o risco aprovado da fase.
   (c) **Não há reconexão.** Depois de `iniciar`, os comandos de LOBBY são recusados — um WebSocket
   que cai é um jogador que não volta. O mesmo `tokenJogador` emitido no `entrar` resolveria rejoin
   **e** personificação. É do transporte (3.2), não do redutor. ⚠️ Detalhe descoberto no 3.1b:
   `marcarAusente` **sobrescreve `rodada` destrutivamente**, então trazer alguém de volta exige
   reconstruir a rodada dele contando os eventos `escolha` no log.
   (d) **`MensagemServidor` não correlaciona erro com comando** — com duplicação/reordenação no
   harness, um `{tipo:'erro'}` é inatribuível. Também do 3.2. Relacionado: `publicarSala` publica o
   `draft` sob um `seq` que **só `reduzirSala` incrementa**, e os comandos de draft não passam por
   ali — o contrato "o cliente descarta broadcast atrasado pelo `seq`" **precisa de dono no 3.2**.
   (e) **Prazo do turno não tem UI nem disparo automático.** `expirados`/`expirarJogador` existem e
   são puros, mas quem os chama periodicamente é o servidor (3.2) — hoje ninguém chama.
1. **Abertas pelo 7.8:** (a) o `BotaoTema` é um botão discreto no canto do `app-shell` — posição e
   forma **não passaram por veredito de arte**; (b) `erro` (salmão `#FF7B85`) e `raridadeProibido`
   (`#FF4757`) continuam sendo dois vermelhos ao lado do vermelho da marca — não foi mexido porque
   é decisão de arte; (c) **flash de tema no carregamento**: o `data-tema` só é escrito quando o
   React monta e o efeito do `BotaoTema` roda, então quem tem o SO no claro e escolheu escuro vê
   um lampejo claro (e vice-versa). Conserto padrão é um script inline de duas linhas no
   `index.html` — fora do que foi pedido neste PR, registrado como limitação conhecida.
2. **`AMOSTRAS_POR_SEGMENTO` pode cair de 12 pra 4-6 — COM o número.** A justificativa de N=12 era
   que N=8 estourava o teto de 0,7 u; com as silhuetas novas **N=8 desvia 0,539 u**. Baixar move
   todos os goldens, então é execução própria.
3. **Fusão de camadas — o ASFALTO está resolvido, o resto não.** As 10 passam a guarda do asfalto
   (34), mas **as 10 fundem a camada de LIMITE** (42), de 8,5 (Red Bull Ring) a 21,1 (Suzuka).
   Report-only.
4. **Guardas O(n²) — ADIADA por decisão do dev (2026-08-01).** Não é problema demonstrado.
5. **O elo testado do 7.3 trava o componente, não o uso dele:** apagar `<CamadasDaPista/>` de dentro
   do `<svg>` de `TelaCorrida` ainda passa. Limite conhecido.
6. **Dívida de processo do 7.4 — RESOLVIDA na prática em 2026-08-06.** A branch tinha sido
   renomeada por cima da `main` (`git branch -M`), sem merge commit, e a pendência era "decidir se
   vira branch antes de qualquer push". **Virou branch:** o push criou
   `origin/pr-7.7-dados-nurburgring` e deixou a `main` remota parada em `b39782d`. Em 2026-08-07 a
   `main` local foi pushada e o remoto subiu pra `49f3ca8` (até o 7.6.1). O que sobra é decisão do
   dev, não dívida: como a `main` recebe os commits de 7.7 em diante desta branch — PR no GitHub ou
   fast-forward direto, possível porque o histórico é linear
   (`git merge-base --is-ancestor origin/main HEAD` = 0).
7. **A rede de segurança da memoização da LUT (7.5) acabou.** Recuperar exige capturar o golden
   sobre uma polilinha SINTÉTICA fixa — registrado, não feito.

> ✅ Fechadas no 7.7: pendência 1 antiga (Spa fundia asfalto) · espinho de ~180° no vértice #0 de
> Spa · preview da densidade alvo. Fechada no 7.7.1: Monza sem imagem.
>
> ⚠️ **Lição permanente:** este arquivo já afirmou por um dia "`tsc`/`build` limpos" sendo falso,
> por herança de reescrita em reescrita **sem nunca medir**. **Afirmação de estado só entra medida.**

## Regras invioláveis da Fase 7

1. **Tabela de luminância — RECALCULADA no 7.8 pra paleta grafite.** Ordem travada:
   escape 0,0060 < chão 0,0103 < terreno 0,0144 < serviço 0,0194 < muro 0,0273 <
   **asfalto 0,0369** < carro do jogador 0,219. O asfalto é sempre a superfície mais clara; toda
   superfície nova passa por aqui antes de entrar. **O teto do asfalto (0,0397) é DERIVADO** do par
   `carro do jogador / asfalto >= 3` — mexer na cor do carro do jogador move a pista inteira.
2. **Regra dos 360px.** Elemento ilegível a 360px de largura não entra. A ordem e o sentido das
   curvas nunca se mexem por esse motivo.
3. **Zebra só em CURVA, nunca em reta.** Virada ACUMULADA ≥ 28° numa janela de
   `JANELA_CURVATURA_ZEBRA` = 88 u de arco, com teto de 40% do perímetro.

Mais dois critérios permanentes: **entorno é moldura, pista e carros são conteúdo**; e **decisão de
arte vai ao dev** — mudar composição sozinho já custou 2 bloqueantes no 7.3.

## Processo (regra completa no `CLAUDE.md`)

- **RIGOR PROPORCIONAL AO RISCO.** Classificar e anunciar ANTES de começar; na dúvida, perguntar em
  vez de escalar.
- **UM PR POR SESSÃO.** Ao concluir: commitar, atualizar os dois docs, **PARAR e avisar o dev.**
- **Ao mexer em silhueta, use o harness de `preview/`** (`preview/harness.test.ts` +
  `preview/desenhos.ts`, gitignored). Rodar:
  `npx vitest run --config preview/harness.config.ts --reporter=verbose --silent=false`.
- **`OpcoesZebra` é andaime de MEDIÇÃO, não configuração.** Nenhum caminho de produção passa o
  argumento.

## Convenções (as demais estão no `CLAUDE.md`)

- **Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e este
  `ESTADO.md` **reescrito** (substitui, não acumula).
- Previews visuais em `preview/` (gitignored). **Preview gerado só conta como entregue depois de
  MOSTRADO ao dev, com CAMINHO ABSOLUTO** — foi exatamente o que falhou no 7.4.
- **`referencias/` é gitignored** (imagens de terceiros, GDD §14.2).
- Harness: `npm run balance` já embute `--reporter=verbose --silent=false`. Ao chamar o vitest na
  mão, passar as flags, senão a tabela é engolida.
- **Nunca ler `src/data/*.json` por completo** (`equipe-anos.json` ≈ 324 mil tokens). Formato:
  `src/fixtures/dataset-semente/`. Consulta: `jq`/`grep` com filtro.
