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
  confundir com o corte nº 1 *da corrida online* — que **perdeu a razão de ser, medido no PR 3/4**, e
  cujo texto foi para o `HISTORICO.md` com o plano encerrado — nem com o **CORTE 3.5-F**, que é
  interno ao 3.5). Autorizado pelo dev em 2026-08-11. ➡️ **PLANO APROVADO em 2026-08-18 — está na
  §"🏆 3.5 CAMPEONATO ONLINE" mais abaixo, com D1 = `B-indep` decidido.** O mecanismo lá **supera** o
  da decisão (b) desta seção; ler as duas juntas.

### ✅ CORRIDA ONLINE — ENCERRADA. Plano movido para o `HISTORICO.md` em 2026-08-18

Os quatro PRs (`b67ec2b`, `8a8088a`, `50906af`, `44d0dc8`+`8489b6f`) estão feitos e o **portão visual
do 4/4 foi aprovado pelo dev em 2026-08-18**. O plano aprovado e o detalhe de cada PR vivem agora em
**`HISTORICO.md` §"CORRIDA ONLINE — o plano aprovado"** (movido íntegro, não resumido) e nas quatro
entradas "CORRIDA ONLINE — PR 1/4…4/4". **Nada pendente.**

🔒 **O QUE NÃO SAIU DAQUI.** Nasceram nesta seção e são **decisão travada / regra inviolável** — a
regra do projeto proíbe que saiam do `ESTADO.md`, então ficam retidas abaixo (e estão íntegras
também no `HISTORICO.md`, pelo registro). **Não reabrir sem o dev:**

- **🔑 VEREDITO DA SEED:** publicar `seedCorrida` **só quando o draft concluir**, nunca desde a
  criação da sala. Decisão do dev **CONTRA a recomendação do arquiteto**, pelo mesmo precedente da
  **decisão (b)** desta fase: publicar durante o draft é o mesmo buraco com outro nome — dá pra
  simular loadouts candidatos e escolher com vantagem. **A paridade com o offline foi recusada
  explicitamente** (lá não há adversário humano). Preço aceito: `| null` no tipo e um ramo no cliente.
  **Consequência aceita: a pista também só aparece no fim do draft** — é a decisão, não descuido.
- 🔒 **UMA FUNÇÃO SÓ alimenta o hash e o `FluxoCorrida`, e não se abre exceção nisso** (palavras do
  dev, PR 2/4). É a classe de bug do **8.4**: duas trilhas, cada lado certo isoladamente, composição
  errada, **`npm test` não pega**. `corridaDaSala` (`src/ui/corrida-online.ts`), mesma referência pro
  hash e pro replay, travada por `src/ui/contrato-corrida-online.test.ts` (allowlist de quem chama +
  contagem exata por arquivo). **O 3.5.3 depende desta regra e não a afrouxa.**
- 🔒 **A barreira NÃO ganha status na tela — decisão do dev** (PR 4/4). "Aguardando jogadores
  terminarem…" foi RECUSADO por afirmar um bloqueio que não existe (a barreira do 3/4 é a versão
  fraca e não segura ninguém). O `AvisoDeFechamento` cobre o único prazo real.

### Portões, riscos e heranças da FASE 3 (valem para a fase INTEIRA, não só para a corrida online)

> Este bloco estava aninhado sob a §CORRIDA ONLINE por acidente de formatação; ganhou cabeçalho
> próprio em 2026-08-18 para não sair junto com o plano encerrado. Conteúdo inalterado.

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

### 🏆 3.5 CAMPEONATO ONLINE — o plano aprovado (registrado em 2026-08-18)

> Terceira vez que um plano desta fase corria risco de não ser registrado (ver os dois avisos
> idênticos no topo da §FASE 3 e da §CORRIDA ONLINE). **Registrado no mesmo dia da aprovação.**
> Proposto pelo `fable-architect`, criticado pela sessão principal, **aprovado pelo dev em
> 2026-08-18.** ALTO RISCO (netcode) nos quatro PRs. **Nada implementado.**

**O fato de arquitetura que decidiu tudo:** o servidor **não tem dataset ⇒ não conhece o calendário
⇒ não pode computar `seedDaEtapa(X, pistaId)`** (ela exige `pistaId`, `src/engine/campeonato.ts:38`).
Isso eliminou a solução óbvia e forçou a decisão D1 abaixo.

**🔑 D1 — DECIDIDO PELO DEV: `B-indep`. N seeds INDEPENDENTES sorteadas no DO**, publicadas uma por
etapa quando aquela etapa abre.

⚠️ **HOMÔNIMO — não confundir com a decisão (b) da §FASE 3.** Aquela está registrada como *"D-E: SEED
POR ETAPA (**opção B**), o DO guarda a `seedMestre`"*. O `B-indep` é **outro mecanismo**: N randoms
independentes, sem mestra única. **Ele SUPERA O MECANISMO da decisão (b) preservando o PROPÓSITO
dela** (ninguém computa etapa futura). Foi aprovado como troca consciente, não como continuidade.

**Por que não as alternativas:** publicar a seed base reabre a decisão (b) literalmente; derivar por
índice (`deriveSeed(seedMestre,'online:etapa:k')`) compra **ZERO** contra o atacante da pendência
0(i) — recomposta a `seedMestre` pela `seedDraft` do lobby, todas as etapas caem juntas — e faria a
segurança do 3.5 depender de o PR de alargamento de entropia vir antes. Com `B-indep`, saber a etapa 1
não diz nada sobre a 2, e a ordenação de fase deixa de importar.

🔒 **`seedCalendario` TAMBÉM É SORTEADA, NUNCA DERIVADA** (emenda da sessão principal, aceita pelo
dev). Sob 0(i) a `seedMestre` é recomponível desde o lobby, então um calendário derivado dela seria
**computável DURANTE o draft** — dá pra escolher peça sabendo as 5 pistas. É exatamente a vantagem que
o portão do PR 1/4 fechou. **Sorteio: `Uint32Array(11)`** no mesmo `crypto.getRandomValues` que
`party/sala.ts` já faz para 1 slot — **10 etapas (máximo) + o 11º slot, independente, do calendário.**
O 11º **não é `seedsEtapas[0]` reusado**: registrado assim para que ninguém "simplifique" depois e
recople os dois. Sortear 10 sempre (e usar as N primeiras) desacopla o sorteio do formato.

🔒 **O rótulo de simulação NÃO muda.** O cliente compõe `seedDaEtapa(seedPublicadaDaEtapa, pistaId)` —
**a mesma função e o mesmo rótulo `camp:${pistaId}` do offline**, travado por docblock contra o
baseline do balance-harness. Inventar um esquema paralelo seria a classe de bug do 8.4. O rótulo novo
`online:calendario` que o plano original previa **deixa de existir sob `B-indep`** (a seed é sorteada,
não derivada). ⚠️ **Conferir na implementação se sobra algum rótulo novo a registrar em
`src/engine/namespaces-seed.ts`; se não sobrar, o bump de `VERSAO_APP` do 3.5.1 pode não ser
necessário. MEDIR, não herdar desta linha.**

**Estado de SERVIDOR × estado de CLIENTE.** Servidor: `seedsEtapas` (segredo), `etapaAtual` (o
servidor é o dono do cursor), `etapaAbertaEm` e `atestaramFimDaEtapa` **resetados a cada etapa**,
`concluidaEm` marcado **só quando a barreira da ÚLTIMA etapa fecha**. Fio (`EstadoSalaPublico`):
`etapaAtual`, `nEtapas`, `seedCalendario | null` (portão: draft concluído) e `seedsAbertas: number[]`
— crescente, **nunca as futuras**; é ela que deixa quem reentra recompor as etapas passadas. O
**cliente** apura a pontuação com `acumularClassificacao` (`campeonato.ts:244`), a mesma do offline.

🔑 **Dois dos três custos da decisão (b) SOMEM:** sem `EstadoCampeonato`/`iniciarCampeonato`, não há
fork (custo i) e `campeonatoConcluido` não é chamado (custo ii) — "acabou" é `etapaAtual >= nEtapas`,
do servidor. **Só o custo (iii) permanece: o save do 8.2 continua fora do online.**

🔒 **O cursor avança pela BARREIRA, nunca pelo anfitrião.** Com a sala iniciada, `anfitriaoId` não é
reatribuído se o host cair (`sala.ts:216-217` só age em `fase === 'aberta'`), então avanço por host
teria modo de falha "sala encalhada para sempre". **Não é barreira de largada:** ninguém fica preso
esperando; quem está atrasado assiste à etapa 2 enquanto os outros já estão na 3, porque a etapa k
segue computável para sempre depois que a seed dela foi publicada.

**Reentrada:** identidade **coberta pela 3.2.1 sem mudança** (`sala.ts:277` só exige o jogador em
`estado.jogadores`, e com a sala iniciada ninguém sai de lá). ✅ **A pendência 0(l) morre de graça:**
com `etapaAtual` + `seedsAbertas` no snapshot, `naCorrida` (estado local, `FluxoOnline.tsx:56`) sai de
cena e o F5 devolve o jogador à etapa certa com a tabela certa; reatestar é idempotente
(`servidor-sala.ts:234-241`). 🔴 **A pendência 0(k) vira BLOQUEANTE:** elegíveis congelados no fim do
draft fariam **cada** etapa pagar `TIMEOUT_FIM_DE_CORRIDA_MS` por quem caiu na etapa 1 — 5 × 5 min de
sala parada. Recomputar por etapa (humano, não-ausente, com conexão em `jogadorPorConexao`).

#### 🔴 ACHADO QUE MUDOU O ESCOPO — o detector dispara ALARME FALSO e ele TRAVA

Descoberto ao planejar, não estava em pendência nenhuma. O balde de atestados é indexado **só por
escopo** (`baldes[atestado.escopo]`, `servidor-sala.ts:454`) e a âncora é `draft.log.length`
(`:638`), que **para de crescer quando o draft conclui**. Logo as etapas 1..N atestam com **a mesma
âncora e o mesmo escopo `'corrida'`**, e o hash difere por `pistaId` (`hash-corrida.ts:132`) — por
construção. **Verificado no código, não deduzido:** `alarmado: base.alarmado || divergentes.length > 0`
(`servidor-sala.ts:509-513`) e `base` reusa o balde existente quando a âncora é igual — que é o caso.
`porJogador` **acumula entre etapas**, então o hash da etapa 1 do jogador A é comparado contra o da
etapa 2 do jogador B.

**Consequência real: UM alarme falso na virada da etapa 2, TRAVADO para o resto do campeonato, sem
caminho para limpar.** A reação natural a um banner permanentemente errado é desligar o banner — que
é como se mata o detector inteiro, justamente na parte nova do jogo.

🔒 **Conserto, NÃO CORTÁVEL e alocado ao PR 3.5.2:** o comando `hash` ganha `etapa: number` (validado
como FORMA — o servidor continua sem entender conteúdo) e a chave do balde vira `${escopo}:${etapa}`.
`ESCOPOS_VALIDOS ... satisfies Record<EscopoHash, true>` (`servidor-sala.ts:392`) faz o typecheck
reprovar antes de qualquer teste.

#### ✂️ CORTE 3.5-F — o corte nº 1 DENTRO do 3.5 (aprovado pelo dev)

⚠️ **Três homônimos no projeto, não confundir:** (1) "o 3.5 é o corte nº 1 **da Fase 3**"; (2) o
"corte nº 1 **da corrida online**", que **perdeu a razão de ser**, medido no PR 3/4; (3) este, o
**corte interno do 3.5**.

> **CORTE 3.5-F — formato fixo: campeonato curto de 5 etapas, SEM seletor no lobby.**

**Sai:** o `<select>` de formato na `TelaLobby`, o campo `formato` no comando `iniciar` e sua
propagação por `EstadoSala`/`EstadoSalaPublico`. **Fica:** `N_ETAPAS.curta` fixo no servidor.
**O jogo ainda entrega:** campeonato online completo e determinístico de 5 etapas, com calendário
sorteado, tabela acumulada, pódio final e reentrada. Restaurar depois = um campo no `iniciar` + um
`<select>`, PR de uma sessão. **Corte reserva (pior):** 3.5-T, tabela acumulada só no fim — é *menos*
atraente do que parece, porque `PainelCampeonato`/`PainelCalendario` já recebem `classificacao` pronta
(`FluxoCampeonato.tsx:93-103,131-140`); cortar o formato é mais barato. **NÃO cortável:** a máquina de
etapas, a barreira por etapa e o detector por etapa.

#### 📏 O TAMANHO — o corte honesto da Fase 3 pode ser o PRÓPRIO 3.5 (registro pedido pelo dev)

O 3.5 estava listado na §FASE 3 como **"CORTE Nº 1 DA FASE"** e está planejado com **quatro PRs — o
mesmo tamanho da corrida online inteira**. 🛑 **Se a fase inflar, a opção a considerar é abandonar o
3.5, não o 3.5-F.** O dev pediu esta opção **visível no momento em que ele estiver no 3.5.2 decidindo
se continua** — é ali que a decisão é barata, e não depois do 3.5.3.

#### Fatiamento — QUATRO PRs, um por sessão, todos ALTO RISCO

1. ✅ **3.5.1 — seed por etapa e cursor no servidor** — **FEITO em 2026-08-18** (`83a6fde` +
   `ffdabc1` + `4a4b801`). `seedsEtapas` + `etapaAtual` + `nEtapas` no estado; `publicarSala` publica
   `etapaAtual`, `nEtapas`, `seedCalendario` (portão do draft concluído) e `seedsAbertas` (só as
   abertas); `Uint32Array(11)` na casca. **O cursor ainda NÃO avança** — este PR publica só a etapa 0.
   **Medido:** 1516/63, typecheck app 0, typecheck `party/` 0, eslint 0, build 0.
   - 🔑 **`VERSAO_APP` NÃO precisou de bump, e foi MEDIDO** — fecha a dúvida que esta seção
     registrava logo acima ("MEDIR, não herdar desta linha"). Duas pernas: o digest do
     `versao.test.ts` cobre `src/engine/**` + `src/data/**.json` + `cliente.ts` + `hash-draft.ts`, e
     **nenhum foi tocado**; e **nenhum rótulo novo nasceu** — `calendarioSorteado` deriva
     internamente com `'calendario'` e `seedDaEtapa` com `camp:`, ambos já registrados.
   - 🔒 **`N_ETAPAS_CURTA` é duplicado em `src/net/tipos.ts`, com teste de conformidade** contra
     `N_ETAPAS.curta`. Importar de `campeonato.ts` arrastaria `simularQuali`/`simularCorrida`/
     `resolverCarro` pro grafo do Durable Object (imports de RUNTIME lá), e **a cerca de lint não
     pegaria — ela casa especificador, não grafo transitivo.** Medido também o que NÃO acontece:
     `dataset.ts` importa só `./types`, então o JSON de 1 MB não entraria por essa porta.
   - 🔒 **`seedsAbertas` tem o MESMO portão da `seedCorrida`** (draft concluído). O plano só o dava
     explícito pra `seedCalendario`; a leitura aplicada é que **seed sem calendário não protege
     nada** — são 10 pistas, o jogador computa as 10 e escolhe.
   - 🔒 **O DISCRIMINANTE `VERSAO_ESTADO_SALA` (exigência do dev).** A leitura `?? []` colapsaria
     "sala de antes do 3.5.1" com "sala que PERDEU as seeds na reidratação", e a segunda tratada como
     a primeira **re-sortearia as etapas em silêncio**. `estadoDasSeeds` devolve
     `legado | ok | corrompida`; `corrompida` **não tem cura** e a casca recusa a sala.
   - 🔴 **DÉCIMA OCORRÊNCIA de "o teste afirmava o que não conferia", e foi BLOQUEANTE:**
     **`party/` tem cobertura automatizada ZERO**, então os testes de `B-indep` rodavam sobre fixture
     literal passada a `criarSala`. **Medido: M5 e M6 aplicadas no sítio real (`party/sala.ts`)
     deixavam a suíte inteira VERDE — 1509/63.** Entrou cerca textual sobre `party/sala.ts`, que
     **nasceu com dois defeitos, os dois pegos rodando**: regex de negação falso-negativo (sem flag
     `m`, o lookahead cobre só a 1ª linha — repetição literal do "regex furado na cerca" do 3.2), e
     cheque cego que reprovava a casca CORRETA por causa de um comentário. 🔒 **Negação se escreve
     com `includes`, não com lookahead.**
     ⚠️ **A cerca que fechou esse bloqueante é TEXTUAL — leia a seção logo abaixo antes de citar
     "M5 e M6 vermelhas" como garantia.**
2. **3.5.2 — barreira e avanço de cursor por etapa** + elegíveis recomputados por etapa +
   `concluidaEm` só na última **+ o conserto do detector (campo `etapa`, chave `${escopo}:${etapa}`)**.
3. **3.5.3 — cliente: N etapas por derivação pura.** `useMemo` sobre `seedsAbertas`; `corridaDaSala`
   passa a aceitar `pistaId` explícito (quando vier, **não** chama `pistaSorteada`); classificação por
   `acumularClassificacao`; atestado por etapa (o campo já veio do 3.5.2). **Nada de estado local
   acumulado** — tudo derivado do snapshot, que é o que faz o F5 funcionar.
   🔒 **A restrição "uma função só" NÃO abre exceção:** `chamadasDe` conta **sítios TEXTUAIS**, não
   invocações (`src/ui/contrato-corrida-online.test.ts:115`), então um `map` mantém a contagem em
   **1**. `PERMITIDOS` (`:187`) ganha `seedDaEtapa: ['src/engine/campeonato.ts',
   'src/ui/FluxoCampeonato.tsx', 'src/ui/corrida-online.ts']` — **cerca NOVA, não afrouxamento**:
   impede que alguém "conserte" a derivação criando um segundo caminho.
4. **3.5.4 — UI do campeonato online, com PORTÃO VISUAL.** Reusa
   `PainelCampeonato`/`PainelCalendario`/pódio do 8.3, `FluxoCorrida` em `{modo:'pronta'}` e
   🔑 **`key={'etapa-'+k}`** — sem a `key`, o `useState` de `useCorrida` mantém a corrida anterior e o
   jogador corre a etapa 1 cinco vezes (lição literal de `FluxoCampeonato.tsx:118-122`). Remove
   `naCorrida`.

#### ⚠️ A CERCA DE M5/M6 É **TEXTUAL**, NÃO COMPORTAMENTAL — o que ela NÃO prova (registro pedido pelo dev, 2026-08-18)

> **Escrito para ser lido daqui a três PRs**, por quem encontrar "M5 e M6 vistas vermelhas" no
> `HISTORICO.md` e concluir que a independência das seeds está garantida por teste. **Não está.**

A cerca vive em `src/net/campeonato-online.test.ts` §"CERCA DO SÍTIO QUE REALMENTE SORTEIA" e faz
**varredura de string** sobre o texto de `party/sala.ts` (com comentários removidos). O que ela
realmente afirma é:

- a string `deriveSeed(` **não aparece** em código na casca;
- existe um `new Uint32Array(SLOTS_SEEDS)` seguido de `crypto.getRandomValues(`;
- o calendário vem literalmente de `todas[MAX_ETAPAS]` e as etapas de `todas.slice(0, MAX_ETAPAS)`;
- existe um `Array.from(slots)`.

**🔴 O QUE ELA NÃO PROVA: que as seeds são independentes em produção.** Ela não executa a casca, não
observa valor nenhum, não compara seed com seed. Passa com as seeds acopladas em pelo menos estes
casos, todos plausíveis:

- **um `xmur3` inline** — copiar as ~6 linhas do hash direto para `party/sala.ts` e derivar dali;
- **chamada por alias** — `import { deriveSeed as derivar }` ou `rng.deriveSeed(...)`;
- **qualquer derivação que não escreva o identificador**, inclusive um helper novo em `src/net/`
  chamado da casca (a cerca só lê `party/sala.ts`);
- **acoplamento sem derivação** — `todas[MAX_ETAPAS] = todas[0]` numa linha antes da chamada
  mantém as duas expressões exigidas e acopla o calendário à etapa 0 mesmo assim.

**Por que ficou assim, e não é descuido:** não há como instanciar um Durable Object no Vitest, e a
alternativa (`vitest-pool-workers` / `unstable_dev`) é dependência nova e infraestrutura própria —
fora do escopo de um PR que já estava do tamanho da corrida online inteira. **A cerca compra o que
dá para comprar barato: ela pega a mutação DESATENTA, que é a provável.** Não pega quem contorna.

🔒 **Consequência prática, e é ela que importa:** a independência das seeds em produção é sustentada
por **leitura de código**, não por teste. Qualquer PR que mexa em `party/sala.ts` precisa ser lido
com isso em mente — e se alguém for **fortalecer** a garantia, o caminho é executar a casca de
verdade, não acrescentar mais padrões à varredura. Ver o RISCO ATIVO de `party/` mais abaixo.

#### 🔒 O QUE O DEV EXIGIU NO BASELINE VERMELHO DO 3.5.1 (não é nota de rodapé)

**Seeds independentes NÃO são reconstituíveis** — e isso cobra um preço que a derivação não cobrava.
Palavras do dev: *"hoje um bug de corrida se reproduz com uma seed; num campeonato `B-indep` preciso
das 11."* Portanto as seeds têm obrigatoriamente que:

- **(a) SOBREVIVER À REIDRATAÇÃO DO DURABLE OBJECT.** Se não sobreviverem, um despejo no meio do
  campeonato **re-sorteia as etapas futuras** e o jogador corre uma corrida diferente da que atestou:
  quebra de determinismo **silenciosa**. (Reidratação de storage **já foi bloqueante de revisão no PR
  3/4** — é reincidência conhecida, não risco hipotético.)
- **(b) SER EXTRAÍVEIS PARA RELATÓRIO DE BUG.** *"Se eu não conseguir reproduzir uma etapa depois de
  um despejo, o determinismo virou promessa não verificável."* ⚠️ Isto convive com a regra de que
  `seedsEtapas` é SEGREDO: a extração é **do lado do dev/operador**, nunca no fio para os jogadores —
  a via tem que ser desenhada no 3.5.1 sem virar vazamento.

**Os dois entram no baseline vermelho do 3.5.1**, junto com: snapshot não vaza segredo (varredura de
`JSON.stringify`, não campo a campo), `seedsAbertas.length === 1` na abertura, conformidade
`seedDaEtapa(seedsAbertas[0], calendario[0])` recomposta de forma independente no teste, e calendário
sem pista repetida.

#### 🔒 REGRAS DE MÉTODO TRAVADAS PARA OS QUATRO PRs (crítica aceita pelo dev nos 4 pontos)

1. **O baseline vermelho do detector é do 3.5.2 e é de SERVIDOR PURO** — atestados da etapa 0 por
   todos, depois etapa 1 com a MESMA âncora e hash diferente: **alarme antes, silêncio depois**. Sem
   cliente, sem jsdom. Deixá-lo no 3.5.3 prenderia o teste mais importante da fase à única camada sem
   cobertura automática (0(m)).
2. 🔒 **VERMELHO DE COMPILAÇÃO NÃO CONTA COMO BASELINE VERMELHO.** Um teste vermelho porque o campo
   ainda não existe não prova nada sobre comportamento. **Quem carrega o baseline são as MUTAÇÕES, e
   elas se aplicam sobre o código de produção PRONTO e têm que ser VISTAS vermelhas.** É a décima
   ocorrência de "o teste afirmava o que não conferia" esperando para acontecer.
3. **Persistência/reidratação entra no baseline** (ver o bloco do dev acima).
4. **Caminho correto do contrato:** `src/ui/contrato-corrida-online.test.ts` — **não** `src/net/`.

**Riscos aceitos conscientemente:** o brute-force de 2³² sobre a `seedMestre` continua abrindo o
**draft** mesmo com `B-indep` (status quo de 0(i); o 3.5 não piora nem conserta) · `FluxoOnline` segue
sem cobertura automática, mitigado mantendo lógica em `fluxo-*.ts` puro e o `.tsx` como casca fina ·
CPU da recomputação (5 etapas × 22 carros a cada mudança de `seedsAbertas`) **a medir no 3.5.3**; se
passar de ~50 ms, memoizar por etapa. Não antecipar otimização.

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

**🏆 3.5 CAMPEONATO ONLINE COMEÇOU — PR 3.5.1 FEITO em 2026-08-18**, na branch
`pr-3.5.1-seed-por-etapa` (`83a6fde` + `ffdabc1` + `4a4b801`). ✅ **MERGEADO na `main`** (`3308be3`)
✅ **e PUSHADO** — **sem tag**, como o dev pediu. Plano na §"3.5 CAMPEONATO ONLINE" logo acima, com
o fatiamento atualizado.

⚠️ **CORREÇÃO DE AFIRMAÇÃO DE ESTADO (2026-08-19).** Esta linha dizia *"NÃO mergeada, NÃO pushada,
sem tag — aguardando o dev"* e **estava falsa nas duas primeiras pernas**. Medido ao vivo, não
herdado: `git ls-remote origin refs/heads/main` = `f9d5348`, **idêntico ao `HEAD` local**, e
`git rev-list --left-right --count origin/main...main` = `0 0`. A branch `pr-3.5.1-seed-por-etapa`
segue existindo **só local**, em `3282852`, já contida na `main`. É a terceira ocorrência da lição
do rodapé das pendências — **"afirmação de estado só entra medida"** —, desta vez sobre git.

- **`B-indep` no ar:** 11 seeds independentes sorteadas no DO (10 etapas + calendário), publicadas
  uma por etapa. **O cursor não avança** — só a etapa 0 sai. `VERSAO_ESTADO_SALA` discrimina sala
  legado de sala corrompida; `estadoDasSeeds` devolve `legado | ok | corrompida` e a casca recusa a
  corrompida sem nunca re-semear.
- **Medido:** `npm test` **1516/63** (era 1480/62), typecheck app **0**, typecheck `party/` **0**,
  eslint **0**, build **0**. `npm run balance` não se aplica.
- 🔑 **`VERSAO_APP` ficou em 3.4.2 — sem bump, e MEDIDO** (o plano dava o bump como certo).
- 🔴 **A revisão achou UM BLOQUEANTE e ele era real: `party/` tem cobertura zero.** M5 e M6
  aplicadas no sítio que de fato sorteia deixavam a suíte **inteira verde**. Corrigido com cerca
  textual sobre `party/sala.ts` — que por sua vez nasceu com dois defeitos próprios, ambos pegos
  rodando. Detalhe completo no `HISTORICO.md` §"PR 3.5.1".
- 6 avisos da revisão aplicados (A1–A6). Três pendências novas registradas: **0(p)** ✅ **FECHADA em
  2026-08-19 pela medição do dev** (ver a pendência), **0(q)** ordem de deploy `wrangler` antes de
  `vite` a partir do 3.5.2, **0(r)** `etapaAtual` fora do discriminante — **as duas seguem abertas**.

✅ **PENDÊNCIA 0(p) FECHADA em 2026-08-19 — o dev rodou o despejo real.** Sala `420320` pós-3.5.1,
worker derrubado de verdade e reconexão forçando reidratação: **as 11 seeds vieram idênticas**, e as
cinco salas antigas caíram em `legado`. Os requisitos **(a)** e **(b)** do baseline do 3.5.1 deixam
de ser projeto e viram **fato medido**. Ressalva registrada na pendência: isso **refuta M6, não M5**.

**➡️ PRÓXIMO: NÃO é o 3.5.2. É o PR A do SPIKE de `@cloudflare/vitest-pool-workers`** — decisão do
dev em 2026-08-19, com **plano APROVADO e registrado na §"🧪 SPIKE + COBERTURA DA CASCA"**.
**Motivo do dev, e ele é de método:** o 3.5.2 põe o cursor na casca, ou seja, **a lógica de avanço de
etapa nasceria exatamente na camada sem cobertura**. Escrever o cursor primeiro e testar depois faz o
teste nascer **moldado ao código** — que é como se produz a próxima ocorrência da família "o teste
afirmava o que não conferia". O **gate do `alarm()` para sala corrompida (aviso A2 do 3.5.1)**, hoje
verificado só por leitura, entra no PR C.

🛑 **O PR A é SPIKE e fecha com GO/NO-GO do dev** (precedente deliberado do SPIKE 3.0). Se **NO-GO**:
nada de produção mudou, pendência 9 fica 🟡 e **o 3.5.2 abre na sessão seguinte** com a cerca textual.
**Começar pelo passo 0:** `npm i -D @cloudflare/vitest-pool-workers --dry-run` e **reportar
contagem/MB ao dev ANTES de instalar de verdade**.

**Depois dele, o PR 3.5.2** — barreira e avanço de cursor por etapa, elegíveis recomputados por
etapa, `concluidaEm` só na última **+ o conserto do detector** (campo `etapa`, chave
`${escopo}:${etapa}`).
🛑 **É no 3.5.2 que o dev pediu para ver, VISÍVEL, a opção de abandonar o 3.5 inteiro** — o corte
honesto da fase pode ser o próprio 3.5, e é ali que a decisão é barata.

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

## 🔴 RISCO ATIVO ABERTO — `party/` NÃO TEM COBERTURA AUTOMATIZADA

**Registrado como pendência própria pelo dev em 2026-08-18**, ao aprovar o 3.5.1 — explicitamente
**não** como linha dentro daquele PR. É a camada que **sorteia**, **reidrata** e que vai **carregar
o cursor no 3.5.2**, e nenhum teste a executa.

**O que foi MEDIDO (não deduzido), durante a revisão do 3.5.1:**

- **Nada no repositório importa `party/sala.ts`.** `grep` por import/require de `party` em `src/` e
  `scripts/` devolve zero (as ocorrências que aparecem são `partyserver`/`partykit`, o pacote).
- **`src/net/cerca-lint.test.ts` não o alcança:** ele roda o ESLint sobre arquivos SINTÉTICOS
  (`party/zz-cerca.ts`), para provar que a cerca está configurada — não sobre o arquivo real.
- **`src/ui/contrato-corrida-online.test.ts` exclui `party/` de propósito** da varredura.
- As únicas menções a "party/sala" em arquivos de teste são **comentários** em
  `src/net/barreira-corrida.test.ts`, não asserções.

**🔴 A consequência já se materializou UMA VEZ, e é por isso que isto é risco e não observação.**
O baseline do 3.5.1 **declarou cobertura que não existia**: todo o bloco `B-indep` rodava sobre uma
fixture literal passada a `criarSala`, e um comentário em `harness.ts` afirmava que
`campeonato-online.test.ts` provava que a produção sorteia. **Medido: as mutações M5 (derivar por
índice) e M6 (recoplar o 11º slot) aplicadas dentro de `party/sala.ts` — o sítio real — deixavam a
suíte INTEIRA verde, 1509/63.** Foi bloqueante da revisão.

**O que existe hoje como mitigação, e o tamanho dela:** uma cerca **textual** sobre o arquivo (ver
a seção "A CERCA DE M5/M6 É TEXTUAL" na §3.5). Ela pega a mutação desatenta e **não** pega quem
contorna — um `xmur3` inline ou uma chamada por alias passam.

🛑 **O que o 3.5.2 herda:** o cursor passa a se mover, e quem o move é a casca (`alarm()` +
`aoPassarOTempo`). O gate de sala corrompida no `alarm()` (aviso A2 da revisão do 3.5.1) **também
não tem teste que o execute** — foi verificado por leitura.

✅ **A DECISÃO FOI TOMADA — dev, 2026-08-19: adotar `@cloudflare/vitest-pool-workers` ANTES do
3.5.2.** Esta seção registrava a pergunta em aberto; **decidido que sim.** Motivo, gate de versão
medido e custos residuais estão na **pendência 9**.
🔒 **A regra de método que esse PR não pode furar:** o baseline vermelho **não pode ser M5 nem M6** —
a cerca **textual** já pega as duas, então as duas cercas ficariam vermelhas juntas e o PR não
provaria nada sobre o teste NOVO. O baseline tem que ser uma mutação que a cerca textual
**provadamente não pega** (a §"A CERCA DE M5/M6 É TEXTUAL" lista os furos), com critério de sucesso
**cerca textual VERDE + teste comportamental novo VERMELHO**.

*(Texto original da pergunta, preservado:)* Vale decidir, ANTES do 3.5.2, se a
casca deixa de ser terra sem teste; a opção conhecida é `@cloudflare/vitest-pool-workers`, que é
**dependência nova e decisão do dev**, não minha.

## 🧪 SPIKE + COBERTURA DA CASCA — o plano aprovado (registrado em 2026-08-19)

> ⚠️ **QUARTA vez que um plano desta fase corre risco de não ser registrado** (ver os avisos
> idênticos no topo da §FASE 3, da §CORRIDA ONLINE e da §3.5 CAMPEONATO ONLINE). **Registrado no
> mesmo dia da aprovação, a pedido explícito do dev, escrito pela sessão principal (sem
> `doc-writer`).** Proposto pelo `fable-architect`, criticado pela sessão principal, **aprovado pelo
> dev em 2026-08-19 com as 5 decisões abaixo.** Fecha (parcialmente) a **pendência 9**.
> **Plano longo, íntegro:** `C:\Users\marcos\.claude\plans\radiant-jingling-phoenix-agent-a3a867774469c99b1.md`
> — este registro é o que basta para retomar sem ele.

**Vem ANTES do 3.5.2**, e o motivo é de método: o 3.5.2 põe o cursor na casca, então a lógica de
avanço de etapa nasceria na única camada sem cobertura, e o teste nasceria **moldado ao código**.

🔑 **GATE DE VERSÃO — MEDIDO em 2026-08-19, antes de planejar.** Era o risco que mudava a FORMA do
plano: `@cloudflare/vitest-pool-workers@0.22.0` tem peer **`vitest ^4.1.0`** e o projeto já roda
**`vitest@4.1.10`**. **Sem downgrade nem bump de major** — o custo que teria inviabilizado a adoção
(mexer em 63 arquivos / 1516 testes) não existe.

### As 5 decisões do dev (2026-08-19)

1. 🔒 **`nodejs_compat`: RAMO 1** — a flag vive **só** em `poolOptions.workers.miniflare.
   compatibilityFlags`, no `vitest.party.config.ts`. **`wrangler.jsonc` INTOCADO.**
   🔒 **O COMPENSADOR ENTRA NO PR A, INEGOCIÁVEL, e é `wrangler deploy --dry-run`.** Razão aceita
   pelo dev: com a flag ligada nos testes, a suíte **deixa de certificar** que o grafo do DO não
   toca `node:*` — um import acidental passaria verde e quebraria o deploy real. **Adotar o pool sem
   compensador REDUZ uma garantia no mesmo PR que aumenta cobertura**, que é a forma exata do defeito
   que este projeto persegue. O `--dry-run` empacota com a config de PRODUÇÃO (sem a flag) e falha de
   verdade — é **comportamental e pega grafo transitivo**, ao contrário da cerca de lint, que casa
   **especificador** (limitação que já mordeu no 3.5.1, no `N_ETAPAS_CURTA`).
   ⚠️ **Registrado para não se perder:** mesmo o Ramo 1 preserva **a letra** da decisão travada do
   3.2, **não a substância** — o teste roda sob uma configuração de compat que a produção não tem.
   O dev aceitou **sabendo**; não é detalhe de config.
2. 🔒 **Wrangler duplicado: ACEITAR AS DUAS CÓPIAS.** O pool traz `wrangler 4.124.0`; o de produção
   **continua o par exato validado no SPIKE 3.0** (`partyserver@0.5.10` + `wrangler@4.120.0`).
   **NÃO subir para 4.124.0 agora**, e não usar `overrides` (arriscaria romper a dependência exata
   do pool).
3. 🛑 **O PR A É UM SPIKE, COM GO/NO-GO EXPLÍCITO — veredito do dev no fim da sessão.** Precedente
   deliberado: o SPIKE 3.0, que é como este projeto trata dependência móvel. Ele carrega **todo o
   risco de descoberta** (miniflare alpha, wrangler duplicado, workerd no Windows, SQLite +
   `isolatedStorage`) e **nenhuma asserção de lógica de sala**.
   **Se NO-GO:** perdeu-se uma sessão, **nada de produção mudou** (rollback = `git checkout
   package.json package-lock.json`), a **pendência 9 fica 🟡** e o **3.5.2 abre na sessão seguinte**
   com a cerca textual. Isto devolve ao dev a decisão barata que o adiamento do 3.5.2 tinha empurrado
   três sessões para a frente.
4. **O docblock refutado do `Array.from` — CORRIGIR DENTRO DO PR A** (duas linhas; o spike já mexe na
   casca). Não merece PR próprio. Ver o bloco "R4" abaixo.
5. **O MZ (zumbi) — REPORTAR como pendência, NÃO consertar dentro do spike.** Se confirmar que é bug,
   **entra ANTES do 3.5.2 como PR curto.** Registrado como **pendência 0(s)**.

### Classificação e portões

**BAIXO RISCO pelo diff** — infra de teste, `party/sala.ts` e `src/net/*.ts` intactos (exceto as duas
linhas de comentário da decisão 4). **`senior-reviewer`: PULAR.** Dois portões que **não vêm do
rótulo** e valem mesmo assim:
- **(i) cada mutação VISTA vermelha, uma a uma**, sobre código de produção pronto. Ordem obrigatória:
  código pronto → teste VERDE → aplica a mutação → **VÊ** vermelho → reverte → VERDE de novo.
- **(ii) `npm test` medido antes e depois: tem que continuar 1516/63.**
🔒 **Vermelho de compilação/infra NÃO CONTA como baseline** — por isso o PR A entrega um smoke verde
primeiro (regra travada da §3.5, item 2).

### Fatiamento — TRÊS PRs, o A estritamente sozinho

- **PR A — INFRA / SPIKE.** Passo 0: `npm i -D @cloudflare/vitest-pool-workers --dry-run` e
  **REPORTAR contagem/MB ao dev ANTES de instalar de verdade** (portão barato que troca estimativa
  por número). Depois: `vitest.party.config.ts` (`include: ['party/**/*.test.ts']`,
  `wrangler: { configPath: './wrangler.jsonc' }`), script `test:party`, `party/tsconfig.test.json`
  entrando em `typecheck` **e** `build`, `party/smoke.test.ts` verde, o compensador `--dry-run`, e a
  correção do docblock (decisão 4). **Fecha com veredito go/no-go do dev.**
  🔒 **O `party/tsconfig.json` atual EXCLUI `**/*.test.ts` de propósito — NÃO mexer nele.** Sem um
  tsconfig de teste próprio, o arquivo que referencia `cloudflare:test`/`env` não é checado por gate
  nenhum, e é onde erro silencioso mora.
  🔒 **O TESTE MORA EM `party/`, NUNCA EM `src/`** — sob `src/` ele entraria no `include` do
  `npm test` e arrastaria os 63 arquivos para dentro do workerd.
- **PR B — sorteio real e reidratação** (`party/seeds.test.ts`). Baselines **MA** e **MR**.
  **Edita o docblock da cerca textual com a matriz de cobertura** (obrigatório — ver abaixo).
- **PR C — gate do `alarm()`** (`party/alarme.test.ts`). Baselines **MB**, **MD** e a anti-vacuidade.

### Os baselines vermelhos

**Critério em todos: `src/net/campeonato-online.test.ts` (a cerca textual) VERDE e o teste novo
VERMELHO, na MESMA invocação. Par OBSERVADO, não raciocinado** — raciocinar sobre cerca é o que já
falhou duas vezes neste projeto.

- 🔑 **MA — `todas[MAX_ETAPAS] = todas[0]`** na linha antes de `criarServidor` (`party/sala.ts:96`).
  **É o furo ENUMERADO da cerca textual**, então ela fica VERDE e o teste novo cai em 100% das salas.
  **Era essencial não usar M5/M6 como baseline:** a cerca textual já pega as duas, as duas cercas
  ficariam vermelhas juntas e o PR não provaria nada sobre o teste NOVO.
  N = 5 salas, não 20 (MA cai já na primeira; salas extras compram largura, não força).
- **MR — `const todas = slots`** (sem `Array.from`), o requisito (a) do dev. ⚠️ **`isolatedStorage`
  (ligado por padrão) desfaz escritas entre testes** — escrita e leitura no MESMO `it`.
- **MB — remover o gate do `alarm()`** (aviso A2): sala CORROMPIDA com draft em andamento e turno
  vencido ⇒ `seq` e `draft` INALTERADOS. Com a mutação, o draft se joga sozinho.
- **MD — gate cedo demais** (early return no topo): sala corrompida e vazia há mais de 2 min **ainda
  morre**. Protege o "o gate cobre SÓ o `aoPassarOTempo`" de `party/sala.ts:299-302`.
- **ANTI-VACUIDADE de MB, obrigatória:** sala sã, mesmo setup de relógio, o alarme **EXPIRA** o turno.
  Sem ela, "não avança" passaria por "nada nunca avança".

🛑 **A ARMADILHA DE VACUIDADE — o furo mais grave, e é obrigatório resolvê-lo.** Conferido no código,
não deduzido: em `alarm()`, `decidirVida` chama **`encerrar()` na linha 274, ANTES do gate da 303**.
Se o setup atrasar **todos** os timestamps de uma vez, `vazioDesde` estoura `CARENCIA_VAZIO_MS`, a
sala é DESTRUÍDA e `aoPassarOTempo` nunca roda: **teste verde, gate nunca exercitado** — "o teste
afirmava o que não conferia" no teste que o dev chamou de mais importante. **Os dois relógios são
independentes e o setup dita cada um:**
- **MB:** `vazioDesde: null` (com 0 conexões, `registrarConexoes` grava `agora`, e `agora - agora`
  = 0 ⇒ a sala SOBREVIVE até a 303) **E** `draft.iniciadoEm[jogadorDaVez] = agora - 10 × PRAZO_TURNO_MS`.
- **MD:** o oposto — `vazioDesde = agora - 3 × 60_000` e 0 conexões.
🔒 **`decidirVida` tem DUAS portas de `encerrar`, não uma** (`src/net/servidor-sala.ts:145`:
`concluidaEm !== null && agora - concluidaEm >= janelaMs`). As fixtures são montadas à mão via
`storage.put`, então **fixar `concluidaEm: null` explicitamente, com comentário do porquê** — senão a
armadilha volta pela segunda porta e a nota sobre ela lê como coberta sem estar.

### 🔴 O que NÃO passa a ser coberto — e a cerca textual FICA

**M5 (derivar seeds por índice) continua fora de alcance COMPORTAMENTAL, para sempre.** Seeds
derivadas por índice **também** são distintas entre si e entre salas; um teste que compara "são
diferentes" não pega M5. E não dá para fixar a `seedMestre` e comparar salas, porque `criar()` só
roda com o storage vazio. Matriz que **vai escrita no docblock da cerca, no PR B**:

| Mutação | cerca textual | comportamental |
|---|---|---|
| **M5** (derivar por índice) | SIM | **NÃO, nunca** |
| **M6** (calendário = `todas[0]` no literal) | SIM | SIM |
| **MA** (`todas[MAX_ETAPAS] = todas[0]`) | **NÃO** | SIM |

🔒 **A CERCA TEXTUAL PERMANECE, E PERMANECE POR CAUSA DE M5.** Sem essa frase no docblock, o próximo
leitor a apaga citando a cobertura comportamental nova — é o risco R3 do plano.
**A pendência 9 vai de 🔴 para 🟡, NÃO para ✅:** depois de A+B+C, `onMessage`, `onClose`, `encerrar`,
CORS e a propriedade RPC-vs-HTTP seguem sem cobertura. Também seguem fora: `FluxoOnline.tsx`
(workerd não é jsdom — **não muda nada** em 0(m)/0(j)), fan-out REAL (latência, concorrência de
borda, hibernação de verdade), token por origem 0(h) e o brute-force de 2³² de 0(i).

### R4 — o docblock de `party/sala.ts:90-92` está REFUTADO pela medição do 0(p)

O comentário afirma que o estado *"é persistido via **JSON**, e um `Uint32Array` round-trip vira
`{"0":…}`"*. 🔑 **JSON não está no caminho:** o despejo do dev (pendência 0(p), 2026-08-19)
estabeleceu que `ctx.storage.put` grava **V8-serializado** na `_cf_KV` — foi por isso que o
`despejar-seeds.ts` precisou do `node:v8`. **É afirmação técnica errada em código de produção.**
- **MR continua baseline VÁLIDO** — conferido: `estadoDasSeeds` usa `Array.isArray`
  (`src/net/sala.ts:192`) e um `Uint32Array` reprova ali. Mas fica vermelho **por outro motivo** do
  que o docblock diz: a sala vira **`corrompida` e é RECUSADA**, não "as seeds somem e as etapas
  futuras são re-sorteadas em silêncio".
- 🔒 **O teste tem que asserir o comportamento OBSERVADO, não o docblocado.**
- **Ainda genuinamente aberto:** se o `Uint32Array` sobrevive ao V8 (structured clone normalmente
  preserva typed arrays, mas **não foi executado em workerd**). O 0(p) prova o **serializador**, não
  esse detalhe.

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
   (o) 🔴 **NOVA (planejamento do 3.5, 2026-08-18) — ASSIMETRIA DE POSTURA DE SEGURANÇA, endereçada
   ao PR DE ALARGAMENTO DE ENTROPIA (o conserto de fundo da pendência (i)).** Com o `B-indep`
   aprovado, o **campeonato** online passa a ter as pistas protegidas durante o draft (seeds e
   `seedCalendario` sorteadas, não derivadas), mas a **corrida avulsa** online continua com
   `seedCorrida` **DERIVADA** da `seedMestre` — e sob (i) ela é recomponível desde o lobby. **Dois
   caminhos do mesmo produto ficam com posturas diferentes.**
   **Decisão explícita do dev em 2026-08-18: NÃO entra no 3.5** — *"o 3.5 já está com quatro PRs, o
   tamanho da corrida online inteira"*. Fica para o PR de alargamento de entropia, que é onde (i)
   também vive. ⚠️ **O custo marginal lá é quase zero** (o `EstadoSala` já terá segredos sorteados
   pelo 3.5.1): quem pegar aquele PR deve tratar (i) e (o) **juntos**, não um de cada vez.
   (p) ✅ **FECHADA em 2026-08-19 — MEDIDA PELO DEV, NÃO DEDUZIDA.** O requisito (b) foi confirmado
   em produção, e de quebra o (a) junto. **Método (é o que dá valor ao fechamento):** sala nova
   `420320` criada pós-3.5.1 (`versaoSala: 1`, `etapaAtual: 0`, 10 slots de etapa), os 11 números
   anotados; **derrubada real do worker** (Ctrl-C no `npm run sala`); worker subido de novo;
   **reconexão pela 420320 no navegador, forçando a reidratação**; segundo despejo. **Os 11 números
   vieram IDÊNTICOS.**
   - ✅ **Requisito (a) — SOBREVIVER À REIDRATAÇÃO DO DURABLE OBJECT — confirmado em produção.** Até
     aqui (a) estava sustentado só por teste unitário sobre o blob persistido; agora atravessou um
     restart de verdade do DO. Fecha a reincidência que já tinha sido bloqueante de revisão no PR 3/4.
   - ✅ **Requisito (b) — SER EXTRAÍVEL PARA RELATÓRIO DE BUG — deixou de ser projeto e virou fato
     medido.** `scripts/despejar-seeds.ts` roda e devolve as 11 seeds de uma sala real.
   - ✅ **O OUTRO RAMO DO DISCRIMINANTE confirmado em dados reais:** as cinco salas pré-3.5.1 foram
     classificadas como **`legado`**. ⚠️ **O ramo `corrompida` continua NÃO OBSERVADO em produção** —
     existe só em teste, e fechar (p) não fecha isso. (É um dos ganhos da pendência 9.)
   - 🔑 **O QUE A MEDIÇÃO REFUTA, COM PRECISÃO — ler antes de citá-la:** `seedCalendario 1903767602`
     ≠ primeira `seedsEtapas 3187109758` ⇒ **o 11º slot NÃO foi recoplado. Isso é a mutação M6
     refutada em dados de produção.** 🛑 **E não diz NADA sobre M5** (derivar por índice): seeds
     derivadas por índice **também** diferem entre si, então "os números são diferentes" não
     distingue sorteio de derivação. **NÃO ler esta medição como "independência das seeds confirmada
     em produção"** — é exatamente o exagero que a §"A CERCA DE M5/M6 É TEXTUAL" foi escrita para
     impedir daqui a três PRs. A cerca textual continua valendo, por causa de M5.
   - ℹ️ **"qtd de etapas: 10" no despejo são os 10 SLOTS sorteados** (`Uint32Array(11)` = 10 etapas +
     o 11º do calendário), **não** mudança de formato — o **CORTE 3.5-F** segue fixando curta = 5.
   🔴 **Achado técnico que fica valendo: NÃO dá pra olhar o SQLite direto.** O DO é
   `new_sqlite_classes`, e `ctx.storage.put` grava na tabela `_cf_KV` com o valor **V8-serializado,
   não JSON** — o blob começa em `ff 0f` e um número é a tag `N` + 8 bytes IEEE-754. `sqlite3`,
   `strings` ou qualquer dump de texto mostram os NOMES dos campos e **não os números**; por isso o
   script desserializa com `node:v8`. Texto original da pendência abaixo, preservado:
   **o requisito (b) do dev está entregue PELA METADE.** `relatorioDeSeeds`
   existe e é testado a partir do blob persistido (não-circular, não é código morto), mas **o comando
   de despejo do storage do Durable Object nunca foi rodado** — o docblock diz "a confirmar pelo dev
   na máquina dele". Fechar (b) de fato é rodar o despejo real numa sala local **uma vez** e registrar
   o comando. Enquanto isso não acontece, "as seeds são extraíveis" é projeto, não fato medido.
   (q) **NOVA (PR 3.5.1) — ORDEM DE DEPLOY a partir do 3.5.2: `wrangler` ANTES do `vite`.**
   `cliente.ts` não valida forma de snapshot. Num deploy escalonado, cliente novo contra worker
   antigo receberia `seedsAbertas: undefined` — **inócuo no 3.5.1** (ninguém lê), **letal no 3.5.2**,
   quando o cliente passar a derivar as etapas dele.
   (r) **NOVA (PR 3.5.1) — `etapaAtual` está FORA do discriminante.** Três leituras defensivas
   (`?? 0`) tratam o cursor de forma frouxa, enquanto `estadoDasSeeds` valida as seeds com rigor.
   Hoje é inconsistência de tese, não vazamento: `cursorPublicavel` clampa e o servidor nunca grava
   outro tipo. Mas **o cursor é justamente o campo que governa quantos segredos saem no fio** —
   quando o 3.5.2 o fizer se mover, trazê-lo para dentro do discriminante.
   (s) 🟠 **NOVA (planejamento do spike, 2026-08-19) — SUSPEITA DE BUG DE PRODUÇÃO: sala corrompida
   com `vazioDesde: null` pode NUNCA MORRER.** Achado por LEITURA de `party/sala.ts:268-306` pelo
   `fable-architect`; **não confirmado por execução** — é exatamente por não haver como executar a
   casca que ele não foi confirmado. Cadeia: (1) `carregar()` devolve o estado com
   `vazioDesde: null`; (2) `registrarConexoes` produz `atualizado` com `vazioDesde = agora`, num
   objeto NOVO; (3) `decidirVida`: `agora - agora = 0 < CARENCIA_VAZIO_MS` ⇒ segue; (4) `jogavel` é
   **false** ⇒ **`aplicar()` nunca é chamado** ⇒ `atualizado` nunca é persistido e `this.estado`
   continua com `vazioDesde: null`; (5) próximo tique repete — `agora - agora` é sempre 0.
   **Consequência: uma sala que se corrompe ENQUANTO AINDA TINHA CONEXÕES vira o zumbi exato que o
   comentário de `party/sala.ts:299-302` afirma que a posição do gate impede** — recusa todo mundo e
   nunca libera o código.
   🔒 **DECISÃO DO DEV (2026-08-19): reportar, NÃO consertar dentro do spike** — "zero diff de
   produção" é restrição que aquele PR se impõe e mantém. **Se o PR C confirmar que é bug, o conserto
   entra ANTES do 3.5.2, como PR curto e com baseline próprio.** ⚠️ É caminho que o **3.5.1 acabou de
   criar** (sala corrompida só existe desde o discriminante), então não é dívida velha.
   💡 Se confirmar, é também **o argumento mais forte a favor da dependência**: o harness achou o que
   a leitura não achou.
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
8. 📉 **ENCOLHER O `ESTADO.md` — aberta em 2026-08-18, adiada pelo dev.** O arquivo é lido por
   inteiro na abertura de toda sessão, então cada linha é custo fixo; hoje ele tem ~930 linhas.
   **Candidatos:** §FASE 8 encerrada (~128 linhas — único item vivo é o veredito do
   `campeonato.html`) e §RISCO ATIVO FECHADO (~46 linhas). **Alvo: ~750 linhas.**
   🔒 **REGRA APRENDIDA EM 2026-08-18, ao mover a §CORRIDA ONLINE — VERIFICAR ANINHAMENTO POR
   ACIDENTE DE FORMATAÇÃO ANTES DE MOVER.** A §CORRIDA ONLINE tinha **quatro portões ATIVOS da Fase
   3** aninhados sob o cabeçalho dela (portões obrigatórios do 3.0/3.1b, herança de config do spike,
   riscos aprovados da fase, "harness headless não é opcional"): eram da fase inteira, não do
   trabalho encerrado, e teriam saído junto. **Cabeçalho não prova pertencimento — ler o conteúdo.**
   🛑 **SESSÃO PRÓPRIA, NÃO NO FIM DE OUTRA** (decisão do dev): cada movimento desses tem risco real
   de levar coisa viva junto, e o fim de uma sessão longa é o pior momento para corrê-lo.
9. 🔴 **`party/` SEM COBERTURA AUTOMATIZADA — aberta em 2026-08-18, pendência NOMEADA a pedido do
   dev.** Seção própria acima (§"🔴 RISCO ATIVO ABERTO"), com o que foi medido e o que o 3.5.2
   herda. Em uma linha: é a camada que sorteia, reidrata e vai carregar o cursor, **nenhum teste a
   executa**, e a consequência já se materializou uma vez (o baseline do 3.5.1 declarou cobertura
   inexistente; M5/M6 no sítio real deixavam a suíte verde). Mitigação atual é cerca **textual**,
   que não pega quem contorna.
   ✅ **PLANO APROVADO PELO DEV em 2026-08-19 — está na §"🧪 SPIKE + COBERTURA DA CASCA" acima**,
   com as 5 decisões dele (Ramo 1 do `nodejs_compat` + compensador `--dry-run` inegociável em PR A ·
   duas cópias de wrangler · **PR A é SPIKE com go/no-go** · docblock do R4 corrigido no A · MZ vira
   pendência **0(s)**). Três PRs (A/B/C), o A sozinho. **Nada implementado.**
   ⚠️ **Fecha esta pendência só PARCIALMENTE: ela vai a 🟡, não a ✅** — M5 segue indetectável
   comportamentalmente e `onMessage`/`onClose`/`encerrar`/CORS seguem descobertos.
   🔑 **Gate de versão MEDIDO em 2026-08-19, antes de planejar** (era o risco que mudava a FORMA do
   plano, não um detalhe): `@cloudflare/vitest-pool-workers@0.22.0` tem peer **`vitest ^4.1.0`** e o
   projeto já roda **`vitest@4.1.10`** — **não há downgrade nem bump de major**, o que era o custo
   que teria inviabilizado a adoção (seria mexer em 63 arquivos / 1516 testes). ⚠️ **Custos que
   sobram e não devem sumir daqui:** o pacote arrasta `miniflare 5.20260815.0-alpha` (**alpha**) e um
   **segundo `wrangler` (4.124.0)** ao lado do `4.120.0` que o `wrangler.jsonc` fixa de propósito
   desde o SPIKE 3.0.

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
