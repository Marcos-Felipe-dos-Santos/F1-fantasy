# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (fases 6-7) e `HISTORICO_ARQUIVO.md` (fases 0-5,
> encerradas). Não leia nenhum dos dois inteiro — consulte o PR que interessa.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- 🏁 **CORRIDA ONLINE COMEÇOU — PR 1/4 FEITO em 2026-08-12** (`b67ec2b`). `seedCorrida: number | null`
  em `EstadoSalaPublico`, publicada **só quando o draft conclui**; `pistaSorteada` nova em
  `src/engine/pista-sorteada.ts`, pura, rótulo próprio `'online:pista'`. **O plano dos 4 PRs está
  registrado na §FASE 3 abaixo** — ele não estava em lugar nenhum do repositório até agora.
  - **Medido (PR 1/4):** `npm test` **1412/56** (era 1398/55), `npm run typecheck` **0**, `eslint` **0**,
    `npm run build` **0**, `npm run balance` **inalterado** (tocou `src/engine/`).
    `VERSAO_APP` **3.4.0 → 3.4.2** (tripwire do `versao.test.ts`).
  - 🔴 **A revisão derrubou uma afirmação de SEGURANÇA, não um bug** — ver pendência 0(i).
  - 🟡 **Sexta ocorrência de "o teste afirmava o que não conferia"**: os nove testes do portão
    chamavam `publicarSala` direto e **forjavam** a fase; reescrever `estadoPara` à mão vazaria a
    `seedMestre` no fio com todos verdes. Entrou teste que dirige um draft de verdade até concluir,
    pelo funil de broadcast — **visto vermelho nas duas mutações** antes de ficar verde.
- ✅ **TESTE DO ONLINE FECHADO — PR 3.3.4 em 2026-08-11** (F5 perdia sala; porta 8787 ocupada falha
  silencioso). **Os quatro casos de propósito rodados e validados pelo dev.**
- ✅ **SURFACING DO ALARME CONCLUÍDO — PR 3.4.1 em 2026-08-11** (BannerDivergencia em FluxoOnline). **Detector (3.4) agora visível ao jogador — alarme aparece em todas as telas do online.** Veredito do dev: "legível, destacado sem ser gritante, texto correto". **Próximo PR: corrida online (autorizada pelo dev; 3.5 de campeonato online fecha a Fase 3).**
- ✅ **CÓDIGO DE SALA E CICLO DE VIDA FEITOS — PR 3.3.2 em 2026-08-10** (`02ff6ee` + `b882d9b`).
  **O modo online agora tem sala privada por padrão** (código hexadecimal de 6 dígitos, não 4, sorteado
  pelo servidor; enumeração impossível em tempo casual).
- ✅ **ROTA `/CRIAR-SALA` FUNCIONANDO — PR 3.3.3 em 2026-08-11** (`a6010ef`). O 3.3.2 trocou a criação para
  `POST /criar-sala` no worker, mas o proxy do Vite repassava só `/parties/*`. Corrigido centralizando rotas
  em `src/net/rotas.ts` — fonte única que o `vite.config.ts` consome. Tela órfã do modo Online removida
  (campo "Nome da sala" e estado morto). **Caminho principal testado e funcionando** (criar sala → link em segunda aba →
  nomes → prontos → "Começar o draft" → rodada 1 de 5 nas duas).

  🎮 **COMO TESTAR O ONLINE — dois terminais, no PowerShell:**

      Terminal 1:   npm run sala        (worker/DO — fica em 127.0.0.1:8787)
      Terminal 2:   npm run dev         (app em localhost:5173)

  **Caminho principal (✅ rodado em 2026-08-11, funciona):** `http://localhost:5173/` → Modo "Online"
  → "Criar sala" → servidor sorteia código → "Copiar link" → cole numa segunda aba → nomes diferentes
  → "Estou pronto" nas duas → anfitrião 👑 clica "Começar o draft" → rodada 1 de 5 aparece nas duas
  abas com sorteios independentes. (Alternativa: "Entrar na sala de um amigo" e digitar os 6 dígitos.)

  ✅ **QUATRO CASOS DE PROPÓSITO TESTADOS PELO DEV em 2026-08-11 (PR 3.3.4):**
  - ✅ **F5 no meio do draft** — volta como o mesmo jogador, pelo token. A URL agora fica `?sala=`.
  - ✅ **Fechar a aba e voltar** em menos de 2 minutos — a sala sobrevive e a reconexão traz o estado do
    draft (a carência de 2 min protege contra zumbi de draft antigo).
  - ✅ **Deixar uma aba parada** até o cronômetro de turno expirar — a outra segue, e a parada passa a
    mostrar "você perdeu a vez por inatividade" (expiraTurno).
  - ✅ **Um código inventado** (ex.: `FFFFFF`) — diz "Sala não encontrada", não trava.

  📱 **PRA JOGAR DO CELULAR / EM REDE — trocar o terminal 2 por `npm run dev:rede`** e abrir no
  celular o endereço `Network` da LAN que ele imprime (hoje `http://192.168.0.13:5173/`).
  **Guia completo: `docs/jogar-em-rede.md`** (firewall, túnel, diagnóstico).

  - **Medido (3.3.3):** `npm test` **1362/50** (era 1355/49), `npm run typecheck` **0** (app + `party/`),
    `eslint src scripts party vite.config.ts` **0**, `npm run build` **0**. `npm run balance` **não rodado**
    — nada em `src/engine/`, `src/data/` ou `scripts/alavancas` foi tocado.
  - **Medido (3.3.4):** `npm test` **1368/51** (era 1362/50), `npm run typecheck` **0**, `eslint` **0**,
    `npm run build` **0**. `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/` ou
    `scripts/alavancas` foi tocado.
  - **Medido (3.4):** `npm test` **1394/54** (era 1368/51), `npm run typecheck` **0**, `eslint` **0**,
    `npm run build` **0**. `npm run balance` **rodado** (tocou `src/engine/versao.ts`): **inalterado**.
  - **Medido (3.4.1):** `npm test` **1398/55** (era 1394/54), `npm run typecheck` **0**, `eslint` **0**,
    `npm run build` **0**. `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/` ou
    `scripts/alavancas` foi tocado.
  - 🔌 **PR 3.3.1 (`23d1cce`) — o worker passa pela PORTA DO VITE.** `wrangler dev` sobe em
    `127.0.0.1` (só localhost), então de fora o app carregava e o WebSocket morria; e abrir o worker
    na rede **não bastaria**, porque a URL do WS era fixa (`:8787`) e **cada visitante chega por um
    IP diferente**. Agora o Vite repassa `/parties/*` (proxy com `ws: true`) e a URL do socket vem
    do **host da página**. Uma porta só (5173), qualquer interface.
    **Medido:** o smoke de 17 cheques passou pelas **quatro** rotas — `localhost`, `192.168.0.13`
    (LAN), `10.241.222.232` (ZeroTier) e `26.156.17.128` (Radmin) — todas na 5173, com o worker
    ainda fechado em `127.0.0.1`.
  - 🔴 **O CONTRATO DO AUSENTE tem teste explícito agora** (`src/ui/contrato-ausente.test.ts`) —
    pedido do dev. Ver o RISCO ATIVO abaixo.
- ✅ **PORTÃO Nº 2 APROVADO PELO DEV em 2026-08-09.** O 3.1b (`2efb145`) fechou com os dois testes
  verdes (conformidade e commutatividade, 20 seeds cada) e o dev **chancelou as duas coisas que
  precisavam de decisão**: (a) `deQuemEhAVez` devolver um **CONJUNTO** e não um id — a fase sorteios
  é concorrente no online, e espelhar `alvoHumano` serializaria 22 jogadores; (b) o **contrato do
  ausente** como obrigação herdada, registrado como **RISCO ATIVO** (seção própria abaixo).
  Detalhe completo no `HISTORICO.md` (entradas "PR 3.1a", "PR 3.1b" e "PR 3.2").
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
  **1412 testes** (56 arquivos) verdes — medido em 2026-08-12 (PR 1/4 da corrida online); eram
  1398/55 no 3.4.1 e 1094/36 antes da Fase 3.
  ⚠️ O badge do README ainda diz **1094** e é estático — está desatualizado (deveria ser 1398).
- **Medido em 2026-08-07, não herdado:** `npm test` **1094/36**, `tsc --noEmit` **exit 0**,
  `eslint src scripts` **exit 0**, `npm run build` **exit 0**. **`npm run balance` inalterado por
  construção** — o harness importa só `src/engine/dataset`, `src/data/*.json` e `scripts/alavancas`,
  e nenhum dos três foi tocado. `prettier --check` reprova `fluxo-campeonato.ts`/`.test.ts`, mas
  **já reprovava no HEAD** (verificado com `git show HEAD:<arquivo>`) — pré-existente, não é gate.
- 🎮 **COMO TESTAR O CAMPEONATO no app real** (o dev já testou single e local com 2 jogadores, e online foi fechado no 3.3.4):
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
- ✅ **3.2 Transporte + harness** — **FEITO** (`30e2556`). O que o 3.3 herda:
  - **Três camadas com fronteira dura:** `src/net/servidor-sala.ts` (servidor SEM I/O) ·
    `party/sala.ts` (casca: socket, relógio, storage) · `src/net/cliente.ts` (estado local +
    reconstrução incremental). O que não é testável sem rede tende a não ser testado — por isso a
    casca é fina.
  - **Broadcast é SNAPSHOT, não delta.** Perda se corrige sozinha; fora de ordem cai pelo `seq`;
    quem entra no meio não precisa de caminho separado.
  - **`quem-sou` e `sincronizar` existem porque mensagem direcionada perdida MATA o jogador.** Sem
    o primeiro, quem perde o `voce-e` nunca sabe quem é; sem o segundo, quem perde o snapshot de
    "é a sua vez" espera o cronômetro. Os dois foram descobertos medindo, não projetando.
  - 🔒 **Uma escolha ILEGAL no log não mata mais a sala** (bloqueante C2 da revisão): o cliente cai
    no substituto determinístico em vez de lançar, e o servidor valida a FORMA da escolha. O
    servidor **não pode** validar conteúdo — não tem dataset.
  - **`nodejs_compat` fora, medido.** Se voltar, tem que vir com o import que a exigiu.
  - ⚠️ **Ainda não há reconexão** (pendência (c)): o mapa conexão→jogador é apagado ao cair e
    `entrar` é recusado com a sala iniciada. Falta o token de rejoin.
- ✅ **3.2.1 Reconexão + token de rejoin** — FEITO. O token nasce na CASCA
  (`crypto.randomUUID`), é o **segundo segredo** do estado (com a `seedMestre`) e nunca vai em
  broadcast. **No LOBBY cair é sair e o token morre**; com a sala iniciada, o `reentrar` devolve
  identidade e estado. Quem volta depois de já ter expirado volta como **espectador**.
- ✅ **3.3 Lobby + draft online na UI** — FEITO (`TelaLobby.tsx`, `FluxoOnline.tsx`,
  `useSalaOnline.ts`, `src/net/conexao.ts`). Reusa `TelaDraft`/`TelaPeca`/`TelaResumo` do offline.
  ⚠️ **A corrida online ainda NÃO existe**: o draft online termina no resumo. É o próximo passo
  natural depois do 3.4.
- ✅ **3.3.1 Jogar em rede** — FEITO (`23d1cce`). O worker é servido **pela porta do Vite**
  (proxy de `/parties/*` com `ws: true`), e a URL do WebSocket vem do **host da página** — nunca
  fixa, porque cada visitante chega por um IP diferente. `npm run dev:rede` expõe na rede;
  `docs/jogar-em-rede.md` tem firewall, túnel e diagnóstico.
- ✅ **3.3.2 Código de sala e ciclo de vida** — FEITO (`02ff6ee` + `b882d9b`). **Sala privada por
  padrão:** código hexadecimal de 6 dígitos (256× mais caro que 4 na enumeração), sorteado pelo
  servidor, link compartilhável. Ciclo: vive enquanto houver gente; após a partida, janela de
  10 min pra olhar resultado; depois reseta (ou se ficar vazia por 2 min). Fechou os três críticos
  da revisão (C1: sala morria em 5s antes de alguém entrar; C2: `onClose` encerrava na hora; C3:
  `onRequest` deixava atacante criar sala com código escolhido). Medido: 20/20 smoke, incluindo
  "sala esvaziou e sobreviveu à carência". 🔒 **C3 continua fechado em 3.3.3** (`POST /parties/sala/000000/criar` → **404**, medido depois da mudança). A rota não foi movida pra dentro de `/parties/` apesar de isso simplificar o proxy, porque esse acesso aberto é o risco que C3 precisava bloquear — registrado pra que nenhum PR futuro "simplifique" a rota de volta.
- ✅ **3.3.3 Criar sala não passava pelo proxy** — FEITO (`a6010ef`). Rota `/criar-sala` centralizada em `src/net/rotas.ts`, que o `vite.config.ts` consome; rota nova atravessa proxy sozinha. Tela órfã removida (campo "Nome da sala" morto desde o 3.3.2, UI contradizia server).
- ✅ **3.3.4 F5 no draft perdia a sala; porta 8787 ocupada falha silencioso** — FEITO (`6b9fb3a`). Duas correções baixo risco: (a) `fixarSalaNaBarra` em `sala-online.ts` + funil único `entrarNaSala` no App — a sala agora aparece na URL (`?sala=CÓDIGO`) e não é perdida no F5; teste novo `sala-na-url.test.ts` com baseline vermelho (1 falhou / 5 passaram). (b) pré-voo `scripts/checar-porta-sala.ts` no `npm run sala` que tenta escutar na porta e falha com `exit 1` se ocupada. **Fecha os quatro casos de propósito do online**, todos rodados e validados pelo dev. **Pendência registrada:** duas abas do mesmo navegador compartilham o token e reentram como o anfitrião (não afeta jogo real, corrompe teste na própria máquina; documentado em `docs/jogar-em-rede.md` com contorno).
- ✅ **3.4 Handshake de versão + detector de divergência** — FEITO (`75ccfbe`). Escolha do ausente era a única decisão local; divergência furava o pool em silêncio. Agora acusa. O que o 3.5 / corrida online herda: âncora = `eventosAplicados`, teto = tamanho do log, atrasado ignorado em silêncio; servidor compara strings opacas (fronteira "sem dataset" do 3.2 intacta); alarme vive em `EstadoCliente.divergencia`, não na tela. 🔑 **Tripwire: `versao.test.ts` hasheia `src/engine/`, `src/data/`, `cliente.ts` e `hash-draft.ts`, reprova sem bump de `VERSAO_APP` — próximo PR tocando engine tem teste vermelho com contexto.**
- ✅ **3.4.1 Surfacing do alarme de divergência** — FEITO (`615e94f`). `BannerDivergencia` em `FluxoOnline` renderiza o detector (3.4) ao jogador em todas as telas. Veredito do dev: aprovado. Preview em `E:\projetos\F1 fantasy\preview\divergencia.html` (regenerável por `npm run preview`). **Lição registrada em `CLAUDE.md` § item 5:** preview de componente real com CSS real; defeito (`data-tema` em `<div>` vs cascata `:root`) só pegável abrindo; corrigido com iframe por tema.
- 🏁 **CORRIDA ONLINE — 4 PRs, plano aprovado. Registrado abaixo, em seção própria.**
- **3.5 Campeonato online (seed por etapa)** — **CORTE Nº 1 DA FASE** se ela ficar grande (não
  confundir com o corte nº 1 *da corrida online*, logo abaixo). Autorizado pelo dev em 2026-08-11.

### 🏁 CORRIDA ONLINE — o plano aprovado (registrado em 2026-08-12)

> ⚠️ **Este plano foi aprovado numa sessão anterior e NÃO estava em lugar nenhum do repositório** —
> nem aqui, nem no `HISTORICO.md`. Segunda vez que isso acontece nesta fase (ver o aviso idêntico
> no topo da §FASE 3). Fica registrado para não custar uma terceira.

**🔑 VEREDITO DA SEED — a decisão que estava em aberto, resolvida pelo dev CONTRA a recomendação do
arquiteto:** publicar `seedCorrida` **só quando o draft concluir**, nunca desde a criação da sala.

Razão, nas palavras do dev: é o mesmo precedente da **decisão (b)** desta fase. A seed base completa
foi rejeitada porque *"qualquer jogador computa as corridas futuras no console — não é hack, é chamar
uma função"*. Publicar durante o draft **é o mesmo buraco com outro nome**: dá pra simular loadouts
candidatos e escolher com vantagem. **O contra-argumento da paridade com o offline foi recusado
explicitamente** — lá a pista aparecer antes do draft é inofensivo porque não há adversário humano.
Preço aceito: `| null` no tipo e um ramo no cliente.

**Consequência aceita:** a **pista também só aparece no fim do draft**, porque deriva da mesma seed.
Isso não é descuido nem regressão de UX — é a decisão.

**Fatiamento aprovado:**

- ✅ **PR 1/4 — seed e pista** — FEITO (`b67ec2b`).
- ✅ **PR 2/4 — o coração.** FEITO (`8a8088a`). 🔒 **A defesa estrutural é UMA FUNÇÃO SÓ alimentando o hash e o
  `FluxoCorrida`, e não se abre exceção nisso** (palavras do dev). É a classe de bug do **8.4**: duas
  trilhas, cada lado certo isoladamente, composição errada, **`npm test` não pega**. Determinado: uma
  função só (`corridaDaSala`, `src/ui/corrida-online.ts`), mesma referência pro hash e pro replay.
  Guarda estrutural travada em `contrato-corrida-online.test.ts` (allowlist de QUEM chama, contagem exata por arquivo).
- ✅ **PR 3/4 — barreira no fim + `concluidaEm` marca a corrida** — FEITO (`50906af`). 🔒 **O CORTE Nº 1 PERDEU A RAZÃO DE SER — MEDIDO.** O custo do tique durante o replay é **zero** (com o draft concluído, `deQuemEhAVez()` devolve `[]`, `aoPassarOTempo()` devolve a **mesma referência** sem envios, `aplicar()` só grava quando muda). Ver item 0(e) de "Pendências ATIVAS" — medição registrada, comentário errado em `party/sala.ts` corrigido. **Bloqueante da revisão (reidratação de storage) foi corrigido.**
- ✅ **PR 4/4 — UI, com PORTÃO VISUAL** — FEITO (`44d0dc8` + `8489b6f`), **✅ PORTÃO VISUAL APROVADO
  PELO DEV em 2026-08-18.** O botão "Ir pra corrida" aparece (com guarda `corrida !== null`), `FluxoCorrida` roda no
  modo `'pronta'` com a MESMA referência do hash, o resultado mostra pontuação FIA e o fim do replay
  atesta a barreira do 3/4. Banner de divergência passou a **ramificar por escopo**.
  🔒 **A barreira NÃO ganhou status na tela — decisão do dev.** "Aguardando jogadores terminarem…"
  foi RECUSADO por afirmar um bloqueio que não existe (a barreira do 3/4 é a versão fraca e não
  segura ninguém). O `AvisoDeFechamento` cobre o único prazo real.
  🔴 **Nona ocorrência de "o teste afirmava o que não conferia", desta vez NO TESTE DESTE PR:**
  `toContain('a corrida')` era vacuamente verdadeira — o botão "Ir pra corrida →" contém a
  substring. Achado pela revisão; corrigido para a frase inteira e **confirmado por mutação**.
  Preview conferido: `E:\projetos\F1 fantasy\preview\corrida-online.html`.

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
- **Hash de corrida sobre `ResultadoCorrida`.** (Plano original; implementação pousou em hash de
  DRAFT: é lá que o risco do ausente vive. `ResultadoCorrida` hashing fica pra quando a corrida online existir.)

📌 **O harness headless NÃO é opcional** (palavras do dev): simular 22 clientes com injeção de
latência, reordenação, duplicação e desconexão. O dev precisa testar **sem depender de amigos
disponíveis**. **Abas no navegador só pro portão visual.** O spike já deixou o embrião disso em
`E:\projetos\spike-partyserver\scripts\dois-clientes.mjs` (WebSocket global do Node ≥ 22, sem
dependência).

## Onde parei

**🏁 CORRIDA ONLINE — ENCERRADA. Os quatro PRs feitos (2026-08-12 a 2026-08-17) e o ✅ PORTÃO VISUAL
DO 4/4 APROVADO PELO DEV em 2026-08-18.** Não há nada pendente na corrida online.
- PR 1/4 (`b67ec2b`) — seed e pista sorteadas ao fim do draft online. **Medido:** 1412/56.
- PR 2/4 (`8a8088a`) — uma função só computa a corrida online; mesma referência pra hash e tela (defesa contra bug do 8.4). **Medido:** 1454/60.
- PR 3/4 (`50906af`) — barreira no fim (versão fraca, não bloqueia ninguém) + `concluidaEm` marca a corrida. **Medido:** 1472/61. **Bloqueante da revisão (reidratação) foi corrigido.**
- PR 4/4 (`44d0dc8` + `8489b6f`) — **a corrida chega na tela.** Botão "Ir pra corrida" com guarda,
  `FluxoCorrida` no modo `'pronta'`, resultado com pontuação FIA, atestado da barreira no fim do
  replay, banner ramificando por escopo. **Medido:** 1480/62, typecheck 0, eslint 0, build 0.
  Revisão (Opus) **aprovada sem bloqueante**; 6 avisos aplicados.

✅ **Veredito do dev sobre `preview\corrida-online.html`: APROVADO (2026-08-18).** Portão fechado; não
reabrir sem ele.

**➡️ PRÓXIMO: o 3.5 campeonato online, que fecha a Fase 3.** O plano foi proposto pelo
`fable-architect`, criticado pela sessão principal e **APROVADO pelo dev em 2026-08-18** — está
registrado na §"3.5 CAMPEONATO ONLINE" logo acima. **Próxima sessão abre o PR 3.5.1**, que é o
primeiro dos quatro. Nada dele foi implementado.

**Duas decisões de arte esperando o dev** (nenhuma bloqueia o merge): os dois botões do
`TelaResumo` são ambos `botao-primario` (pré-existente do offline, agora visível no online); e o
`FluxoOnline.tsx:218-230` não tem cobertura automática — sem jsdom não há clique.

Concluído antes: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.8**, e a Fase 8 nos
PRs **8.1** (calendário sorteado), **8.2** (round-trip do save) e **8.4-mínimo** (o campeonato
deixou de ser inalcançável — tem seletor, encadeia corridas, salva e retoma).

## SEQUÊNCIA — o que sobrou

**Os portões visuais saíram desta lista: os dois foram aprovados em 2026-08-07.**
**O teste do online foi FECHADO no PR 3.3.4 com todos os quatro casos validados pelo dev.**
**O alarme de divergência foi MOSTRADO ao jogador no PR 3.4.1 — SURFACING CONCLUÍDO.**

1. ✅ **A CORRIDA ONLINE — OS QUATRO PRs FEITOS E O PORTÃO VISUAL DO 4/4 APROVADO PELO DEV
   (2026-08-18). ITEM ENCERRADO.** Plano dos 4 PRs registrado na §FASE 3. `b67ec2b`, `8a8088a`,
   `50906af`, `44d0dc8`+`8489b6f`. **A corrida online está fechada** — nada de código nem de veredito
   pendente nela. O que fecha a Fase 3 agora é o **3.5 campeonato online**, cujo plano está aprovado
   e registrado em seção própria logo abaixo da §CORRIDA ONLINE.
2. ⬅️ **VEREDITO do dev sobre `preview/campeonato.html`** (as três telas do 8.3) — segue aberto.
4. **PR de INFRA — DESTRAVADO pela aprovação das silhuetas.** Era "pré-requisito caso as silhuetas
   fossem aprovadas"; com o 10/10, **deixa de ser pré-requisito e vira consolidação**: restrições
   geométricas como testes vermelhos + allowlist `LEGADO` que só encolhe. **Reavaliar o escopo com o
   dev antes de fazer** — pode ter encolhido junto.
5. 🛑 **Depois, o pit (7.9).**
6. **Decisão de arte ainda aberta:** o `88/40%` da zebra (seção própria abaixo) — não foi tocado
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

## ✅ RISCO ATIVO FECHADO — divergência do ausente DETECTADA E VISÍVEL

**Registrado como risco pelo dev em 2026-08-09, ao aprovar o portão do 3.1b.** Deixou de ser "diverge
em silêncio" (🔴) para "diverge com alarme que ninguém vê" (🟡) no **PR 3.4**, e foi CONCLUÍDO no **PR 3.4.1** quando o alarme subiu à tela. Ressalvas abaixo registram as limitações que permanecerão.

**O que é.** Quando um jogador abandona ou estoura o prazo, o redutor do servidor o marca ausente e
**pula a casa dele** — o servidor não pode escolher por ele, porque escolher é regra de jogo e regra
de jogo precisa do dataset. Quem escolhe pelo ausente é **cada cliente, localmente**. A rodada 6 tem
**pool compartilhado, 2 cópias por peça**. Se dois clientes escolherem peças **diferentes** pelo mesmo
ausente, cada um debita uma cópia diferente: os estados divergem, os loadouts divergem, corrida que
cada um assiste é outra. **Antes:** nada acusava. **Agora:** o detector compara hashes do draft entre
os 22 e acusa em `EstadoCliente.divergencia`.

**✅ DETECTOR FUNCIONA (PR 3.4):**
- `src/net/hash-draft.ts` (novo): hash determinístico do estado do draft, campos enumerados, chaves
  ordenadas.
- `src/engine/versao.ts` (novo): handshake de versão recusa entrada se build diferente.
- `registrarAtestado` em `src/net/servidor-sala.ts`: servidor compara strings opacas, sem dataset.
- Resultado: divergência do ausente → detectada · 20 seeds sem sabotagem → nenhum alarme falso · cliente
  atrasado com estado diferente → silencioso (regra de âncora) · atestado malformado → recusado.

**✅ TESTE EXPLÍCITO (pedido do dev no 3.3):**
`src/ui/contrato-ausente.test.ts` — **allowlist repo-wide** de quem pode tocar `escolherBot`
(asserir *ausência* num diretório era contornável por indireção), `escolhaPadrao` banida na UI,
proibição do 3º argumento de `sincronizarDraft` **por contagem de parênteses balanceados** (a versão
por regex era falso-negativo: com a sabotagem aplicada, continuava verde), varredura recursiva, e
testes de que a substituição é determinística entre execuções independentes.

**Já coberto:**
- o portão do 3.1b abandona jogadores nas duas fases em 10 seeds e assere a reconvergência passo a
  passo;
- o **harness do 3.2 mede isso empiricamente**: o CONTROLE NEGATIVO faz um cliente escolher
  diferente pelo ausente e **exige que a comparação FALHE**. Foi ali que se descobriu que sabotar a
  escolha *própria* não diverge nada (ela vai pro log, que é a verdade compartilhada) — **a
  substituição do ausente é literalmente a única decisão que cada cliente toma sozinho.**

**RESSALVAS — garantias que o alarme NÃO oferece:**

1. **A garantia é "na âncora terminal", NÃO "no primeiro divergente".** Appends rápidos e sucessivos
   derrubam atestados de âncora intermediária dos retardatários, porque o balde só guarda a maior.
   Vale no fim, quando todos convergem. Não é "detecção instantânea em tempo real", é "certificação
   pós-convergência".
2. **Cliente com bundle em cache fica fixo em versão `''` e tranca os atuais com `versao-divergente`.**
   O erro não carrega qual versão a sala espera — jogador não sabe que precisa de F5 forçado.
   Limitação conhecida.

## Pendências ATIVAS

0. **Abertas na Fase 3:**
   (a) **`montarJogadores` está duplicado** entre `fluxo-draft.ts:117` (UI) e `congelarRoster`
   (`src/net/sala.ts`), assim como `QTD_JOGADORES = 22`. Hoje a divergência é **vigiada** por um
   `it.each` de conformidade (`facil`×`dificil` × {2,3,5,22} humanos) contra
   `iniciarDraft(...).jogadores`; o certo é **extrair pra `src/engine/` e ter uma função só** —
   refactor pequeno e separado, candidato a rodar antes do 3.1b. ⚠️ Limite conhecido: a
   conformidade **não** trava o `sort` de `congelarRoster` (o array offline já chega ordenado);
   quem trava é o teste de ordem embaralhada.
   (b) ✅ **`src/engine/namespaces-seed.ts` FEITO no 3.1b** — registro + varredura do código-fonte
   que reprova rótulo não registrado, com guarda anti-vacuidade. Fecha o risco aprovado da fase.
   (c) ✅ **RECONEXÃO FEITA no 3.2.1.** O token nasce na casca (`crypto.randomUUID`), `reentrar` é o
   único comando de lobby que vale com a sala iniciada, e há evicção (uma conexão por jogador).
   **O que ficou de fora, de propósito:** quem volta DEPOIS de já ter expirado volta como
   espectador — desfazer a ausência exigiria reconstruir `rodada` a partir do log, porque
   `marcarAusente` a sobrescreve, e isso é complexidade que o jogo não precisa.
   (d) ✅ **`seq` resolvido no 3.2** — `reduzirDraftDaSala`/`expirarNaSala` incrementam o contador,
   então o `draft` não muda mais sob um `seq` congelado. **Falta ainda** correlacionar erro↔comando:
   com duplicação e reordenação, um `{tipo:'erro'}` continua inatribuível.
   (e) ✅ **Prazo do turno tem dono no 3.2**: o `alarm()` do Durable Object chama `aoPassarOTempo` a
   cada 5 s. ⚠️ **CORRIGIDO em 2026-08-11 — esta linha afirmava que ele "para de se reagendar com a
   sala concluída ou vazia", e o código não faz isso** (achado do `fable-architect` ao planejar a
   corrida online). `party/sala.ts:237` reagenda SEMPRE; quem para o tique é o `encerrar()`, que
   apaga o alarme. Com a sala concluída o que fica de fora é só a chamada a `aoPassarOTempo` — o
   tique continua. **✅ MEDIÇÃO DO PR 3/4 (2026-08-16):** adiar `concluidaEm` para o fim da corrida **faz custo ZERO** — com o draft concluído, `deQuemEhAVez()` devolve `[]`, `aoPassarOTempo()` devolve a **mesma referência** sem envios, `aplicar()` só grava quando a identidade muda. Medido com par anti-vacuidade (baseline vermelho confirmado). Isso **fecha a razão do "CORTE Nº 1"** que o ESTADO anterior registrava. **Falta a UI** mostrar o cronômetro ao jogador — isso é 3.3.
   (f) ✅ **O 3.4 foi FEITO (detector + handshake). O 3.4.1 foi FEITO (surfacing visual).**
   🏁 **A CORRIDA ONLINE COMEÇOU** — plano dos 4 PRs na §FASE 3, PR 1/4 feito em 2026-08-12
   (`b67ec2b`). **Até o PR 4/4 o draft online continua terminando no `TelaResumo`**, com o botão
   "Ir pra corrida" escondido de propósito — prometer a corrida e devolver à tela inicial é pior que
   botão nenhum.
   (g) **15% de perda com conexão intacta não é modo de falha real de WebSocket** (nota da revisão
   do 3.2): TCP entrega ou a conexão cai. O stress do harness continua válido como stress; só não
   deve ser lido como "a rede real perde 15%".
   (h) **Token por origem, não por aba** (medido no 3.3.4): duas abas do mesmo navegador compartilham
   o `localStorage` e portanto o token `f1f:token-sala:<código>`. Com o anfitrião já dentro, abrir o
   link numa aba nova faz ela reentrar **como o anfitrião**, e a sala conta 1 jogador não 2. **Não
   afeta jogo real** (cada pessoa está em seu navegador); **corrompe o teste na própria máquina**.
   Contorno documentado em `docs/jogar-em-rede.md` (segundo navegador ou janela anônima).
   (i) 🔴 **NOVA (PR 1/4 da corrida online) — a `seedMestre` tem 32 BITS e é enumerável. DECISÃO DO
   DEV.** Medido: `party/sala.ts` sorteia **um único uint32** (`crypto.getRandomValues` sobre 1 slot),
   e `deriveSeed` é `xmur3` — hash **não-criptográfico** de 32 bits, não função unidirecional. Como a
   `seedDraft` é publicada **desde o lobby** (antes até do handshake de versão), quem enumerar as 2³²
   sementes contra ela recompõe a `seedMestre` — sobram ~1-2 candidatos, e **nada no draft observado
   desempata mais que isso, porque tudo nele deriva da mesma seed** — e com ela a `seedCorrida`,
   **sem nunca passar pelo portão do PR 1**.
   **O que o portão compra, então:** ele fecha o caminho trivial, que era a régua explícita do dev
   ("não é hack, é chamar uma função"). **O que ele NÃO compra:** resistência a um script.
   ⚠️ A afirmação falsa ("da `seedDraft` não se recompõe a `seedMestre`") era **pré-existente no
   `tipos.ts` desde o 3.1a** e foi corrigida no PR 1/4 — os docblocks agora dizem a propriedade real.
   **Conserto de fundo:** alargar a entropia da `seedMestre`. Resolve de verdade (com uma mestra
   larga, a `seedDraft` de 32 bits não permite mais enumerar), **não** exige mexer na engine — ela só
   vê seeds derivadas —, mas mexe na semeadura do online inteiro e no estado persistido do Durable
   Object. **PR próprio, e é decisão do dev, não minha.**
   (j) **NOVA (PR 2/4 da corrida online) — o atestado de hash da corrida ATIVA UMA VEZ.** `useSalaOnline` chama `corridaDaSala` em `useMemo` e a ref fica estável entre renders; `registrarAtestado` ativa sobre mudança de `corrida`. **Limitação:** a estabilidade depende de `cliente.draft` ter REFERÊNCIA estável entre re-sincronizações sem evento novo — rastreada manualmente em `sincronizarDraft`, **sem asserção própria** porque o projeto não tem jsdom/@testing-library pra renderizar o hook. **Se `sincronizarDraft` mudar** (ex.: reconstruir de forma diferente, remover memoização), o efeito volta a reatestar cada snapshot, **silenciosamente**. Nenhum teste vai falhar — é a mesma classe de regressão invisível que (d) lista. Registrado para que ninguém apague o `useMemo` achando que está ocioso.
   (k) **LIMITE CONHECIDO (PR 3/4 da corrida online) — congelamento de elegíveis.** O conjunto de elegíveis para a barreira **congela quando o draft conclui**. Ninguém vira ausente **depois** — qualquer dropout durante o replay ainda custa o timeout cheio (`TIMEOUT_FIM_DE_CORRIDA_MS = 5 min`). Sem reconexão de corrida implementada. Documentado e testado.
   (l) **NOVA (PR 4/4) — F5 no meio da corrida volta pro resumo.** `naCorrida` é estado LOCAL do
   `FluxoOnline`, não vem do servidor; recarregar a página o perde e o jogador clica "Ir pra
   corrida" de novo. **Aceitável porque a corrida é determinística** — rever é rever exatamente a
   mesma corrida. Consequência ligada a (k): quem dá F5 **não reatesta**, então a sala paga o
   `TIMEOUT_FIM_DE_CORRIDA_MS` inteiro. Persistir exigiria campo novo no protocolo para uma
   conveniência, não para uma correção.
   (m) **NOVA (PR 4/4) — o ramo da corrida não tem cobertura automática.** `FluxoOnline.tsx:218-230`
   é a linha central do PR e nenhum teste a renderiza: `naCorrida` só vira `true` por clique e o
   projeto não tem jsdom. O teste monta `FluxoCorrida` direto, que é **outro sítio de chamada** —
   então "o `onChegouAoResultado` está ligado" e "é o `FluxoCorrida` que aparece" ficam só no
   preview. **Fechar barato:** extrair o ramo `draft.fase === 'concluido'` para um componente
   exportado que receba `naCorrida`/`corrida` por prop, e renderizá-lo no teste. Registrado pela
   revisão, não feito.
   (n) **ABERTA, decisão de arte (PR 4/4) — dois botões primários lado a lado.** No `TelaResumo`,
   "Ir pra corrida →" e "← Voltar ao início" usam **ambos** `botao-primario` (`TelaResumo.tsx:62` e
   `:66`): a ação principal não se distingue da secundária. **Pré-existente do fluxo offline** — o
   PR 4 só torna o par visível no online pela primeira vez. Conserto seria trocar o segundo para
   `botao-secundario`; **é decisão do dev.**
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
- 🔒 **LIÇÃO ACUMULADA DA FASE 3:** três bugs (F5 perdia sala, porta ocupada falha silencioso, duas
  abas compartilham token) passaram por suíte verde porque o teste afirmava a coisa errada ou não lia
  o que dizia ler. **Baseline vermelho real + guarda anti-vacuidade são obrigatórios**, especialmente
  no **3.4, que é literalmente sobre detectar divergência silenciosa**. Ver `CLAUDE.md` §"Cerca de
  lint: separar regra APAGA a regra" e §"Regra de mudança de lógica".
  **Quarta instância (3.4):** um dos dois testes de lag comparava estados IDÊNTICOS, então permanecia
  verde mesmo sem a regra de âncora — era cobertura ilusória. Reescrito com atraso real. Registrado
  como padrão a observar: teste que parece cobrir uma guarda mas testa o caminho feliz.
- **Ao mexer em silhueta, use o harness de `preview/`** (`preview/harness.test.ts` +
  `preview/desenhos.ts`, gitignored). Rodar:
  `npx vitest run --config preview/harness.config.ts --reporter=verbose --silent=false`.
- **`OpcoesZebra` é andaime de MEDIÇÃO, não configuração.** Nenhum caminho de produção passa o
  argumento.

## Convenções (as demais estão no `CLAUDE.md`)

- **Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e este
  `ESTADO.md` **atualizado**.
- 🔒 **Neste arquivo, SÓ a seção `## Onde parei` é reescrita.** Todo o resto — decisões travadas,
  regras invioláveis da Fase 7, portões, riscos ativos, pendências, planos de fase — é **acrescido
  ou editado pontualmente, NUNCA apagado em massa**. A redação anterior desta linha dizia
  "reescrito (substitui, não acumula)" e foi o que autorizou o esvaziamento de 646 → 137 linhas em
  2026-08-12 (restaurado em `1873925`). Regra completa no `CLAUDE.md` §"O `doc-writer` NÃO APAGA
  SEÇÃO DE RESTRIÇÃO PERMANENTE". **Encolher este arquivo é decisão do dev.**
- Previews visuais em `preview/` (gitignored). **Preview gerado só conta como entregue depois de
  MOSTRADO ao dev, com CAMINHO ABSOLUTO** — foi exatamente o que falhou no 7.4.
- **`referencias/` é gitignored** (imagens de terceiros, GDD §14.2).
- Harness: `npm run balance` já embute `--reporter=verbose --silent=false`. Ao chamar o vitest na
  mão, passar as flags, senão a tabela é engolida.
- **Nunca ler `src/data/*.json` por completo** (`equipe-anos.json` ≈ 324 mil tokens). Formato:
  `src/fixtures/dataset-semente/`. Consulta: `jq`/`grep` com filtro.
