# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> **Planos de fase ATIVOS: `PLANOS_ATIVOS.md`** (Fase 3, 3.5 campeonato online, spike da casca) —
> consulte **o plano que interessa**, nunca inteiro. Histórico por PR: `HISTORICO.md` (fases 6-7 e o
> que foi arquivado daqui) e `HISTORICO_ARQUIVO.md` (fases 0-5). Não leia nenhum dos três inteiro.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

**Última medição (PR 3.5.1, 2026-08-18):** `npm test` **1516/63**, typecheck app **0**, typecheck
`party/` **0**, eslint **0**, build **0**. `VERSAO_APP` **3.4.2**.
⚠️ O badge do README diz **1094** e é **estático** — não há CI neste repo (`.github/` não existe).
Está desatualizado e vai mentir se um teste quebrar.

📄 **`docs/img/` é VERSIONADA** (ao contrário de `preview/` e `referencias/`, gitignored): os três
prints do dev e a grade `silhuetas.svg`, esta **gerada** por
`scripts/gerar-silhuetas-readme.preview.test.ts` via `npm run preview`, a partir do `pathDaVolta` de
produção. **Se um traçado mudar, regerar e commitar a grade.** Licença **MIT** desde 2026-08-08.

> 📦 **O changelog histórico desta seção foi ARQUIVADO em 2026-08-19** (narrativas de PR, medições
> por PR, portão nº 2, SPIKE 3.0, inventário da `main`, push/merge de agosto, README/LICENSE):
> `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md`" → §"§Estado atual". Nada foi resumido.

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

- 🎮 **COMO TESTAR O CAMPEONATO no app real** (o dev já testou single e local com 2 jogadores, e online foi fechado no 3.3.4):
  `npm run dev` → `http://localhost:5173/` → **Formato: "Campeonato curto"** → Começar draft →
  jogar o draft → **Ir pra corrida**. No fim de cada corrida, a tabela acumulada e "Próxima
  corrida". Recarregar a página no meio deve oferecer **"Continuar campeonato"** no topo.
  **Narração:** o ticker de eventos durante o replay mostra a variedade (PR A) e, quando os dados
  sustentam, "…e caiu atrás de X" (PR B). **Auto-avanço:** o toggle "Avançar automaticamente" no fim
  da corrida — ele deve avançar **e largar sozinho**, e desmarcar durante a contagem deve cancelar.

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


## 🚩 FASE 8 — MODO CAMPEONATO: ENCERRADA (o que ficou retido)

> 📦 **Texto integral ARQUIVADO em 2026-08-19** → `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md`" →
> §"§FASE 8". A fase está completa (8.1, 8.2, 8.2.1, 8.3, 8.4-mínimo, e a rodada de narração
> rica + auto-avanço A/B/C). **Este bloco é a RETENÇÃO** — o que não pode sair daqui.

⬅️ **O ÚNICO ITEM AINDA ABERTO DA FASE 8 — VEREDITO DO DEV sobre as três telas do 8.3:**

    start "" "E:\projetos\F1 fantasy\preview\campeonato.html"

As três telas numa página só, a partir de um campeonato real (seed 2026, curta, 8 jogadores):
**calendário** (silhuetas, vencedores, próxima destacada), **classificação com variação de posição**
(▲/▼) e **fim de campeonato** (pódio + tabela final + calendário completo).

🔒 **Decisão travada do formato:** **nenhuma alavanca** (sem lastro, sem pit de meio de temporada) —
é jogo de draft, o campeonato é confirmação. Draft único por campeonato. Ordem embaralhada nas duas
modalidades. Submodos: **curta** (5 pistas sorteadas das 10, default) e **completa** (10 embaralhadas).

🔑 **O BUG QUE QUASE ENTROU — a lição que sobrevive ao PR.** As duas trilhas de corrida usam seeds
**diferentes de propósito** (decisão D6): a avulsa usa a seed **crua** do draft, a etapa de
campeonato usa `seedDaEtapa(seed, pistaId)`. Como `iniciarCampeonato` **pré-simula** as etapas e a
pontuação sai dali, ligar o campeonato no `FluxoCorrida` existente faria o jogador **assistir a uma
corrida e ver OUTRA na tabela**. **`npm test` não pegaria** — cada lado, isolado, está certo; só a
composição estava errada. `prepararCorrida` ganhou `seed` (default preserva a avulsa bit a bit) e há
teste provando a reprodução bit a bit da etapa pré-simulada.

🔒 **Regras de honestidade da narração, travadas por TESTE, não por comentário:** nenhuma frase pode
afirmar manobra, local da pista, disputa ou clima evoluindo — um regex reprova
`ultrapass|disputa|começou a chover|pneu de chuva` em qualquer variante nova. **A engine simula cada
carro isoladamente e o clima é uma flag global**; qualquer frase fora disso é falsa por construção.

📌 **Regra registrada para código que ainda não existe (item d do dev):** quando houver narração de
troca de posição, **pit não é ultrapassagem** — pit de qualquer um dos dois desqualifica a palavra.
Hoje não existe narração de troca de posição (a única narração do jogo era `ROTULOS_EVENTO`), então
a regra fica aqui aguardando o código que a consumirá.

🔒 **A decisão que sustenta a tela de calendário:** `iniciarCampeonato` **pré-simula todas as
etapas**, então o resultado das próximas está em memória o tempo todo. `calendarioAnotado` só revela
vencedor de etapa com `indice < etapaAtual` — vazar o vencedor de uma corrida que o jogador ainda
vai assistir estragaria a corrida. **Tem teste dedicado, e é o mais importante do PR.**

🔒 **A silhueta da miniatura reusa `pathDaVolta`**, a mesma geometria da tela de corrida. Foi ela que
tirou 10/10 no teste cego; redesenhar à mão na miniatura jogaria isso fora.

## 🌐 FASE 3 — ONLINE: obrigações retidas (o plano está no `PLANOS_ATIVOS.md`)

> 📦 **O plano da fase e a sequência de PRs 3.0 → 3.5 foram MOVIDOS em 2026-08-19** →
> **`PLANOS_ATIVOS.md` §"FASE 3 — ONLINE"** (íntegro, nada resumido). **Este bloco é a RETENÇÃO:**
> as decisões travadas e regras invioláveis que obrigam trabalho FUTURO e por isso se leem toda
> sessão. **Cabeçalho não prova pertencimento — foi lendo o conteúdo que estas linhas ficaram.**

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
⚠️ **A decisão (b) foi SUPERADA no mecanismo pelo `B-indep`** (3.5), que preserva o propósito dela.
Ler as duas juntas — ver `PLANOS_ATIVOS.md` §"3.5 CAMPEONATO ONLINE".

🔒 **Invioláveis herdadas dos PRs 3.1a/3.1b/3.2 — valem para todo PR de netcode daqui pra frente:**

  - 🔒 **Nenhum comando carrega `jogadorId`.** `reduzirSala(estado, comando, remetenteId)`; o id vem
    do **transporte**, a partir da conexão. Sem isso, o token de turno do 3.1b nasceria sobre um
    remetente forjável.
  - 🔒 **`seedMestre` não sai do DO.** `EstadoSala` (interno) ≠ `EstadoSalaPublico` (fio); o broadcast
    leva `seedDraft = deriveSeed(seedMestre, 'online:draft')`. Esquecer de filtrar não compila.
  - 🔒 **O CONTRATO DO AUSENTE, obrigatório pro 3.3** (está no docblock de `marcarAusente`): o
    cliente completa os sorteios do ausente **no mesmo evento** em que vê a ausência no log; e na
    fase peça **joga por ele**, com escolha **determinística e idêntica nos 22** (`escolherBot`,
    semeado — nunca decisão de UI). O pool de peças é compartilhado: dois clientes escolhendo peças
    diferentes pelo mesmo ausente **furam o pool em silêncio**.
  - **Broadcast é SNAPSHOT, não delta.** Perda se corrige sozinha; fora de ordem cai pelo `seq`;
    quem entra no meio não precisa de caminho separado.
  - 🔒 **Uma escolha ILEGAL no log não mata mais a sala** (bloqueante C2 da revisão): o cliente cai
    no substituto determinístico em vez de lançar, e o servidor valida a FORMA da escolha. O
    servidor **não pode** validar conteúdo — não tem dataset.
  - **`nodejs_compat` fora, medido.** Se voltar, tem que vir com o import que a exigiu.

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


## Onde parei

**🏁 CORRIDA ONLINE — ENCERRADA. Os quatro PRs feitos (2026-08-12 a 2026-08-17) e o ✅ PORTÃO VISUAL
DO 4/4 APROVADO PELO DEV em 2026-08-18.** Não há nada pendente na corrida online.
- PR 1/4 (`b67ec2b`) — seed e pista sorteadas ao fim do draft online. **Medido:** 1412/56.
- PR 2/4 (`8a8088a`) — uma função só computa a corrida online; mesma referência pra hash e tela (defesa contra bug do 8.4). **Medido:** 1454/60.
- PR 3/4 (`50906af`) — barreira no fim (versão fraca, não bloqueia ninguém) + `concluidaEm` marca a corrida. **Medido:** 1472/61. **Bloqueante da revisão (reidratação) foi corrigido.**
- PR 4/4 (`44d0dc8` + `8489b6f`) — **a corrida chega na tela.** Botão "Ir pra corrida" com guarda,
  `FluxoCorrida` no modo `'pronta'`, resultado com pontuação FIA, atestado da barreira no fim do
  replay, banner ramificando por escopo. **Medido:** 1480/62, typecheck 0, eslint 0, build 0.

✅ **Veredito do dev sobre `preview\corrida-online.html`: APROVADO (2026-08-18).** Portão fechado.

**🏆 3.5 CAMPEONATO ONLINE — PR 3.5.1 FEITO em 2026-08-18**, na branch
`pr-3.5.1-seed-por-etapa` (`83a6fde` + `ffdabc1` + `4a4b801`). ✅ **MERGEADO na `main`** (`3308be3`)
✅ **e PUSHADO** — **sem tag**, como o dev pediu. **`npm test` 1516/63** (era 1480/62), typecheck
app **0**, typecheck `party/` **0**, eslint **0**, build **0**. Plano em `PLANOS_ATIVOS.md`
§"3.5 CAMPEONATO ONLINE".

⚠️ **CORREÇÃO DE AFIRMAÇÃO DE ESTADO (2026-08-19).** Linha anterior dizia *"NÃO mergeada, NÃO pushada,
sem tag — aguardando o dev"* e **estava falsa nas duas primeiras pernas**. Medido em 2026-08-19 com
HEAD na `main`: `git ls-remote origin refs/heads/main` = `f9d5348`, **idêntico ao `HEAD` local**; `git
rev-list --left-right --count origin/main...main` = `0 0`. **Hoje o HEAD está na branch
`pr-a-spike-vitest-pool-workers`** (o PR A; commit de código `72b931e`) e a afirmação anterior
continua valendo. ⚠️ Esta linha citou por um momento um `5fca74b` que **não era o `HEAD`** —
quarta ocorrência da mesma lição, dentro do próprio bloco que a registra. Branch
`pr-3.5.1-seed-por-etapa` segue só local (`3282852`), contida na `main`. É a terceira ocorrência de
**"afirmação de estado só entra medida"** — desta vez sobre git.

Escopo: `src/net/` + `party/`, sem UI. Implementa `B-indep` (decisão D1): **11 seeds INDEPENDENTES
sorteadas no DO** (10 etapas + calendário), publicadas uma por etapa quando aquela abre. **O cursor
ainda NÃO avança** — só etapa 0 sai. `VERSAO_ESTADO_SALA` discrimina sala legado de corrompida;
`estadoDasSeeds` devolve `legado | ok | corrompida` e casca recusa corrompida.
- 🔑 **`VERSAO_APP` ficou em 3.4.2 — sem bump, e MEDIDO** (plano dava como certo; digest
  `src/engine/**` + `src/data/` + `cliente.ts` + `hash-draft.ts` — nenhum tocado; rótulos novos:
  nenhum em `src/engine/`).
- 🔴 **A revisão achou UM BLOQUEANTE e ele era real:** `party/` tem cobertura zero. M5 e M6 no sítio
  real deixavam suíte **inteira verde — 1509/63**. Conserto: **cerca textual** sobre `party/sala.ts`,
  nasceu com dois defeitos (ambos pegos rodando): regex falso-negativo multilinhas, cheque cego.
- **6 avisos da revisão aplicados** (A1–A6). Três pendências novas: **0(p)** ✅ **FECHADA 2026-08-19
  (dev mediu despejo real)**; **0(q)** ordem deploy wrangler antes vite (3.5.2+); **0(r)** `etapaAtual`
  fora discriminante.

✅ **PENDÊNCIA 0(p) FECHADA em 2026-08-19 — o dev rodou o despejo real.** Sala 420320 pós-3.5.1,
worker derrubado, reconexão forçando reidratação. **As 11 seeds vieram idênticas**; cinco pré-3.5.1
em `legado`. Requisitos (a) e (b) do baseline deixam de ser projeto e viram **fato medido**.

**➡️ PRÓXIMO: PR A SPIKE `@cloudflare/vitest-pool-workers`** (decisão dev 2026-08-19) — **FEITO em
2026-08-19, commit `72b931e` na branch `pr-a-spike-vitest-pool-workers`, NÃO mergeada, NÃO pushada,
sem tag. Veredito GO/NO-GO pendente**. `npm test` **1516/63 antes e depois**.
`npm run test:party`: **5/5 verde (~665 ms)**. Plano aprovado: `PLANOS_ATIVOS.md` §"SPIKE + COBERTURA
DA CASCA" (5 decisões do dev). **Três achados que contrariam o plano aprovado** (o valor do spike):
(1) `nodejs_compat` não foi necessária — teste passa SEM flag; (2) compensador `--dry-run` era vacuoso
— novo script empacota e inspeciona de verdade; (3) `isolatedStorage` morreu — substitutos medidos
`reset()` + `evictAllDurableObjects()`. **Descoberta crítica:** wrangler topo precisou ser **PINADO
exato (4.120.0)** pra não deduplicar para 4.124.0 do pool. Portões **(i)** 3 mutações vistas
vermelhas, **(ii)** 1516/63 antes/depois — cumpridos. **Classificação BAIXO RISCO**, sem
`senior-reviewer`. Se NO-GO: rollback uma linha, pendência 9 fica 🟡, 3.5.2 abre próxima sessão.
Detalhes completos em `HISTORICO.md` §"PR A".

**Depois do veredito, PR 3.5.2** — barreira e avanço de cursor por etapa, elegíveis recomputados,
`concluidaEm` só na última, **+ conserto do detector** (campo `etapa`, chave `${escopo}:${etapa}`).
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
   (2026-08-18). ITEM ENCERRADO.** Plano dos 4 PRs no `HISTORICO.md`; o da fase, em `PLANOS_ATIVOS.md` §"FASE 3". `b67ec2b`, `8a8088a`,
   `50906af`, `44d0dc8`+`8489b6f`. **A corrida online está fechada** — nada de código nem de veredito
   pendente nela. O que fecha a Fase 3 agora é o **3.5 campeonato online**, cujo plano está aprovado
   e registrado em `PLANOS_ATIVOS.md` §"3.5 CAMPEONATO ONLINE".
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
`PLANOS_ATIVOS.md` §"A CERCA DE M5/M6 É TEXTUAL"). Ela pega a mutação desatenta e **não** pega quem
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
**provadamente não pega** (`PLANOS_ATIVOS.md` §"A CERCA DE M5/M6 É TEXTUAL" lista os furos), com critério de sucesso
**cerca textual VERDE + teste comportamental novo VERMELHO**.

*(Texto original da pergunta, preservado:)* Vale decidir, ANTES do 3.5.2, se a
casca deixa de ser terra sem teste; a opção conhecida é `@cloudflare/vitest-pool-workers`, que é
**dependência nova e decisão do dev**, não minha.
## ✅ RISCO ATIVO FECHADO — divergência do ausente DETECTADA E VISÍVEL

> 📦 **Corpo ARQUIVADO em 2026-08-19** → `HISTORICO.md` §"ARQUIVADO DO `ESTADO.md`" →
> §"§RISCO ATIVO FECHADO". Em uma linha: o ausente é a **única** decisão que cada cliente toma
> sozinho; divergir furava o pool em silêncio; o detector do **3.4** acusa e o **3.4.1** mostra.
> 🔒 **As duas RESSALVAS ficaram aqui porque PERMANECEM:**

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
   (b) ✅ FEITA no 3.1b · (c) ✅ RECONEXÃO feita no 3.2.1 · (d) ✅ `seq` resolvido no 3.2, **falta
   ainda** correlacionar erro↔comando · (e) ✅ prazo do turno tem dono no 3.2, **falta a UI** mostrar
   o cronômetro · (f) ✅ 3.4 + 3.4.1 feitos. **Texto integral das cinco:** `HISTORICO.md`
   §"Pendências FECHADAS, arquivadas do `ESTADO.md`".
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
   (p) ✅ **FECHADA em 2026-08-19 — MEDIDA PELO DEV, NÃO DEDUZIDA.** Sala `420320` pós-3.5.1, worker
   derrubado de verdade (Ctrl-C no `npm run sala`) e reconexão forçando reidratação: **as 11 seeds
   vieram IDÊNTICAS**; as cinco salas pré-3.5.1 caíram em `legado`. Fecha os requisitos **(a)**
   reidratação e **(b)** extratibilidade do baseline do 3.5.1. **Método e detalhe:** `HISTORICO.md`.
   🔑 **A RESSALVA, que não pode sair daqui:** `seedCalendario 1903767602` ≠ `seedsEtapas[0]
   3187109758` **refuta M6** (11º slot recoplado) e **NÃO diz nada sobre M5** (derivar por índice) —
   seeds derivadas por índice **também** diferem entre si. **NÃO ler como "independência das seeds
   confirmada".** A cerca textual continua valendo por causa de M5.
   ⚠️ **O ramo `corrompida` segue NÃO OBSERVADO em produção** — existe só em teste. É ganho do spike.
   🔴 **Achado técnico que fica valendo:** o DO é `new_sqlite_classes` e `ctx.storage.put` grava na
   `_cf_KV` **V8-serializado, não JSON** — `sqlite3`/`strings` mostram os NOMES dos campos e não os
   números; por isso `scripts/despejar-seeds.ts` desserializa com `node:v8`. **Isto REFUTA o docblock
   de `party/sala.ts:90-92`, que será corrigido no PR A do spike.**
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
6. ✅ **Dívida de processo do 7.4 — RESOLVIDA na prática em 2026-08-06** (virou branch; a `main` foi
   pushada em 2026-08-07). Texto integral no `HISTORICO.md`.
7. **A rede de segurança da memoização da LUT (7.5) acabou.** Recuperar exige capturar o golden
   sobre uma polilinha SINTÉTICA fixa — registrado, não feito.
8. ✅ **ENCOLHER O `ESTADO.md` — EXECUTADA em 2026-08-19, em sessão própria** (aberta em 2026-08-18).
   **Método: SEPARAÇÃO + PODA, nada apagado.** Os planos de fase ativos (Fase 3, 3.5, spike) foram
   para o **`PLANOS_ATIVOS.md`** novo; o material encerrado (§FASE 8, changelog da §Estado atual,
   corpo do §RISCO ATIVO FECHADO, pendências fechadas) foi para o **`HISTORICO.md`** — **íntegro,
   linha por linha, não resumido**. Extração por faixa de linha (`sed`), não redigitada.
   **Verificação de integridade por diferença de conjuntos** (`comm -23` do arquivo antigo contra a
   união dos três novos): nenhuma linha ficou sem destino.
   🔒 **REGRA APRENDIDA EM 2026-08-18, ao mover a §CORRIDA ONLINE — VERIFICAR ANINHAMENTO POR
   ACIDENTE DE FORMATAÇÃO ANTES DE MOVER.** A §CORRIDA ONLINE tinha **quatro portões ATIVOS da Fase
   3** aninhados sob o cabeçalho dela (portões obrigatórios do 3.0/3.1b, herança de config do spike,
   riscos aprovados da fase, "harness headless não é opcional"): eram da fase inteira, não do
   trabalho encerrado, e teriam saído junto. **Cabeçalho não prova pertencimento — ler o conteúdo.**
   ✅ **A regra foi aplicada:** os quatro portões, as três retenções da §CORRIDA ONLINE, as
   invioláveis do 3.1a/3.1b/3.2 e as cinco retenções da §FASE 8 **ficaram neste arquivo**.
9. 🔴 **`party/` SEM COBERTURA AUTOMATIZADA — aberta em 2026-08-18, pendência NOMEADA a pedido do
   dev.** Seção própria acima (§"🔴 RISCO ATIVO ABERTO"), com o que foi medido e o que o 3.5.2
   herda. Em uma linha: é a camada que sorteia, reidrata e vai carregar o cursor, **nenhum teste a
   executa**, e a consequência já se materializou uma vez (o baseline do 3.5.1 declarou cobertura
   inexistente; M5/M6 no sítio real deixavam a suíte verde). Mitigação atual é cerca **textual**,
   que não pega quem contorna.
   ✅ **PLANO APROVADO PELO DEV em 2026-08-19 — está em `PLANOS_ATIVOS.md` §"SPIKE + COBERTURA DA CASCA"**,
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
