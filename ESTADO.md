# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> **Planos de fase ATIVOS: `PLANOS_ATIVOS.md`** (Fase 3, 3.5 campeonato online, spike da casca) —
> consulte **o plano que interessa**, nunca inteiro. Histórico por PR: `HISTORICO.md` (fases 6-7 e o
> que foi arquivado daqui) e `HISTORICO_ARQUIVO.md` (fases 0-5). Não leia nenhum dos três inteiro.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

**Última medição (PR 3.5.3, 2026-08-21, na branch `pr-3.5.3-cliente-multietapa`, pós-revisão e
pós-conserto do bloqueante C1):** `npm test` **1565/64**, **`npm run test:party` 10/10**, typecheck
**0** nos três projetos, eslint **0**, build **0**. `VERSAO_APP` **3.4.2** (sem bump — medido: o
digest não foi tocado e nenhum rótulo novo nasceu).
⚠️ **O `npm test` deste projeto tem uma corrida de I/O entre duas cercas e pode falhar por
escalonamento — pendência 0(v), medida e PRÉ-EXISTENTE.** A parcela introduzida pelo 3.5.3 foi
FECHADA NA RAIZ no proprio PR (8 rodadas seguidas a 1565/1565), mas **um vermelho em `contrato-ausente.test.ts` num PR que
não toca o ausente é sintoma disso, não regressão** — reproduzir antes de caçar bug.

*(Medição anterior, PR 3.5.2, 2026-08-20, na branch `pr-3.5.2-cursor-por-etapa`):* `npm test`
**1544/64**, **`npm run test:party` 10/10**, typecheck **0** nos três projetos, eslint **0**, build
**0**. `VERSAO_APP` **3.4.2** (sem bump — o digest não foi tocado).
⚠️ **`VERSAO_ESTADO_SALA` subiu de 1 para 2** — ver a §Onde parei.

*(Medição anterior, PR B do spike, 2026-08-19, na `main` pós-merge):* `npm test` **1516/63**,
**`npm run test:party` 8/8** (novo portão desde o PR A — era 5/5 lá), typecheck app **0**, typecheck
`party/` **0**, **typecheck `party/tsconfig.test.json` 0** (novo), eslint **0**, build **0**
(o `checar:casca` roda dentro dele). `VERSAO_APP` **3.4.2**.
⚠️ **`npm test` e `npm run test:party` são suítes SEPARADAS, e é de propósito** — `party/` roda no
`workerd` com config à parte, fora do `include` do `npm test`. **Medir só um dos dois deixa metade
do projeto sem portão.**
*(Medição anterior, PR 3.5.1, 2026-08-18: `npm test` 1516/63, typecheck app 0, typecheck `party/` 0,
eslint 0, build 0.)*
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

**🏆 PR 3.5.3 — CLIENTE MULTIETAPA: CÓDIGO COMPLETO E VERDE em 2026-08-21**, na branch
**`pr-3.5.3-cliente-multietapa`** (`cffe699` + `c64b8b4` + `01689a5` + `d478617` + `92bcee7` + `e48a5fc`). **NÃO mergeado, NÃO pushado,
sem tag.** **Medido:** `npm test` **1565/64** (era 1544/64), `npm run test:party` **10/10**
(inalterado — não toca `party/`), typecheck **0** nos três projetos, eslint **0**, build **0**.
**`VERSAO_APP` 3.4.2 sem bump, MEDIDO** (nenhum arquivo do digest tocado, nenhum `deriveSeed` novo).
**`balance-harness` não rodado, e dito**: rótulo `camp:` intacto, zero arquivo de `src/engine/`.
Detalhe completo: `HISTORICO.md` §"PR 3.5.3".

🔑 **O RECORTE MUDOU ANTES DE COMEÇAR, por decisão do dev — e o motivo é código, não preferência.**
O plano punha "atestado por etapa" no 3.5.3 e o `key={'etapa-'+k}` + remoção do `naCorrida` no
3.5.4. Rastreado no código: `useCorrida` semeia o `useState` de `fonte` UMA vez, o atestado sai por
mudança de REFERÊNCIA de `corrida`, e `corrida-concluida` não carrega etapa (o balde vem do cursor
do servidor). Logo, atestar `etapa: etapaAtual` **sem o remount** dá **hash da etapa k com a tela da
etapa 0** — a forma exata do bug do 8.4, produzida pelo fatiamento, dentro do PR cuja cerca existe
para impedi-la; e `contrato-corrida-online.test.ts` **não pegaria** (conta sítios textuais, não
remount). **Veredito do dev: opção (A), derivação PURA.** A fiação inteira vai para o 3.5.4, que tem
portão visual. A opção de seguir o plano à risca foi descartada explicitamente — deixaria
divergência conhecida na `main` entre dois PRs.

🔒 **A lógica ficou em módulo PURO (`etapasDaSala`/`classificacaoDaSala` em `corrida-online.ts`), não
no `useMemo`** — porque **o projeto não tem `jsdom` nem `@testing-library` (medido)** e nada dentro
do hook é alcançável por mutação. Desvio declarado da letra do dev ("o map mantém a contagem em 1"):
o sítio único **mudou de arquivo**, não deixou de ser único, e virou testável.

🔴 **A REVISÃO REPROVOU NA PRIMEIRA PASSADA — um bloqueante, confirmado por MEDIÇÃO:**
- **C1** — `etapasDaSala`/`classificacaoDaSala` nasceram **fora** da allowlist. Medido com um
  `PainelFuga.tsx` sintético chamando `etapasDaSala`: a cerca ficava **VERDE, 26/26**, porque o
  arquivo não cita nenhum nome vigiado — **todos ficam atrás da indireção**. 🔑 **Ponto de entrada
  público que computa corrida online entra na cerca NO PR QUE O CRIA** (o 3.5.4 é quem desenha os
  painéis, e é lá que a tentação mora).
- **A3** — a metade **avulsa** das duas semânticas de seed **não tinha baseline**: a mutação
  `seedDaSimulacao = seedDaEtapa(seed, idDaPista)` deixava a suíte **INTEIRA verde, 1557/1557**,
  `tsc` e `eslint` limpos. 🔑 **Bifurcação declarada crítica com um lado travado é meia cerca.**
- **A4/A5 + a meia-frase da 0(t)** — três docblocks que afirmavam mais que o código: a cerca de
  `seedDaEtapa` garante **uma costura só** e não pega quem derive por fora sem citá-la
  (`deriveSeed(seed,'camp:X:online')` passa nela e no registro de namespaces); `etapasDaSala` **não
  olha `draft.fase`** e **LANÇA** em vez de devolver `[]`; e a etapa corrente é
  **`etapas.length - 1`, NUNCA `sala.etapaAtual`**. **Todos consertados.**

📊 **11 mutações, 0 sobreviventes, tabela RERODADA INTEIRA após os consertos** — todas com `tsc` e
`eslint` limpos, cada reversão conferida por `git hash-object`: `M-seedcrua` · `M-seed-default` ·
`M-pista` · `M-indice` · `M-futuras` · `M-throw` · `M-classif` · `M-jogadores` · `M-avulsa` ·
`M-conta` · `M-guarda-classif`.
🔴 **`M-guarda-classif` SOBREVIVEU na primeira tentativa, e é o registro que mais importa da 2ª
passada:** a guarda de fase tinha sido posta dentro do `useMemo`, e **sem jsdom não existe baseline
possível para código dentro do hook** — apagá-la deixava tudo verde. Movida para a função pura, a
mesma mutação ficou vermelha. 🔑 **Guarda sem baseline é o defeito que este PR combate, cometido no
conserto dele** — repetição literal do que o 3.5.2 registrou.

🔁 **A SEGUNDA PASSADA DA REVISÃO voltou SEM BLOQUEANTE, com três avisos — e dois eram sobre os
consertos da primeira:** **A1** (o docblock dizia que a classificação era `[]` junto com `etapas`;
medido, na fase de peça ela já devolvia **17 linhas zeradas**, e um painel do 3.5.4 aberto com
`classificacao.length > 0` mostraria a tabela do campeonato **durante o draft**); **A2**
(`calendarioSorteado` ficou fora da cerca — o docblock declara a etapa como o PAR
`(seed, calendario)` e só a metade da seed estava cercada, justo quando o 3.5.4 precisa do
calendário INTEIRO, que não sai do hook); e **A3** (os números da documentação, que os próprios
commits de conserto tornaram falsos). **Os três atendidos.**
⚠️ **A lista da allowlist de `calendarioSorteado` saiu da CERCA, não de `grep`** — `grep -l` acusava
três arquivos a mais, todos com menção só em comentário. É a lição do `namespaces-seed.ts` na
direção oposta.

🔑 **A PENDÊNCIA 0(t) MELHOROU — e o 3.5.4 pode desfazer isso sem perceber.** A 0(t) previa que este
cliente leria `etapaAtual` para indexar o calendário; **ele nunca lê `etapaAtual`**. No caso
corrompido o snapshot publica `seedsAbertas: []` ⇒ `etapas` é `[]`, sem travar e sem consumir o
campo autocontraditório. 🔒 **Invariante obrigatória para o 3.5.4: indexar por `etapas.length - 1`,
nunca por `sala.etapaAtual`.**

🔴 **TRÊS ACHADOS DE MÉTODO desta sessão** (detalhe no `HISTORICO.md`): (1) a asserção de
**pré-condição** pegou uma seed que colidia com o calendário — `M-pista` sobreviveria por acaso;
(2) a cerca **contrariou a minha própria medição** sobre `namespaces-seed.ts` (o nome está numa
STRING, e `semComentarios` remove comentário, não literal); (3) 🔴 **`git checkout --` apagou o PR
num arquivo** no meio da tabela, porque o alvo era trabalho **não commitado** — a guarda de hash
acusou na hora e as mutações seguintes disseram `ALVO NAO ENCONTRADO` em vez de darem falso verde.
**Reversão de mutação sobre trabalho não commitado se faz por CÓPIA.**

🔴 **O PORTÃO PRINCIPAL FICOU VERMELHO POR CAUSA DA SABOTAGEM NOVA, e o conserto está medido.**
`npm test` caiu com 2 testes de `contrato-ausente.test.ts` — arquivo que o PR não toca. Causa: a
sabotagem varria a árvore **6×** com o arquivo de fuga em disco, e aquela suíte percorre `src/ui/`
com `readdirSync`/`statSync` em paralelo. Conserto: **uma varredura só**, apagar, assertar em
memória, E a causa RAIZ consertada nos dois pontos da janela. **8 rodadas seguidas de `npm test`, 1565/1565 em todas** (a taxa era ~50%). ⚠️ **A janela é PRÉ-EXISTENTE,
medido contra a base:** em `3f54436` as duas cercas juntas já falham **1-2 testes**. Virou a
pendência **0(v)**.

⬅️ **ABERTO, decisão do dev: o aviso A2 da revisão** — o cliente fixa `'curta'` (5) e o teto de
LEITURA de `nEtapas` no servidor é `[1, 10]` (`sala.ts:324`, contra `seedsEtapas.length`). Virou a
pendência **0(w)**.

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
rev-list --left-right --count origin/main...main` = `0 0`. ⚠️ Esta linha citou por um momento um
`5fca74b` que **não era o `HEAD`** — quarta ocorrência da mesma lição, dentro do próprio bloco que a
registra. Branch `pr-3.5.1-seed-por-etapa` segue só local (`3282852`), contida na `main`. É a
terceira ocorrência de **"afirmação de estado só entra medida"** — desta vez sobre git.

🔄 **ESTADO DO GIT REMEDIDO EM 2026-08-19, pós PR A + PR B** (a linha acima descrevia a sessão
anterior e envelheceu — remedir é obrigação, não zelo):
`git rev-parse HEAD` = **`aa68690`**, branch **`main`**; `git ls-remote origin refs/heads/main` =
**`b41deb7`**; `git rev-list --left-right --count origin/main...main` = **`0 6`**.
**A `main` local está 6 commits À FRENTE do remoto e NADA foi pushado** — os merges do PR A
(`c798976`) e do PR B (`aa68690`) são locais, **sem tag**, como o dev pediu.

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

**✅ PR A DO SPIKE — VEREDITO DO DEV: GO (2026-08-19).** `@cloudflare/vitest-pool-workers` adotado.
Commit de código `72b931e`, **MERGEADO na `main` em `c798976`** (`--no-ff`), sem tag, sem push.
**Três achados que contrariam o plano aprovado** (o valor do spike): (1) `nodejs_compat` **não foi
necessária** — teste passa SEM flag, então teste e produção rodam sob a MESMA config de compat, e a
decisão travada do 3.2 fica preservada na substância, não só na letra; (2) compensador `--dry-run`
era vacuoso — `scripts/checar-casca-sem-node.ts` empacota e **inspeciona o bundle**, e roda dentro do
`npm run build`; (3) **`isolatedStorage` não existe mais na v0.22** — o storage ATRAVESSA os `it`s;
substitutos medidos: nome de DO distinto por teste + `reset()` + `evictAllDurableObjects()`.
**Descoberta crítica:** o `wrangler` do topo precisou ser **PINADO exato (4.120.0)** pra não
deduplicar para o 4.124.0 que o pool traz. Detalhes em `HISTORICO.md` §"PR A".

**✅ PR B DO SPIKE — FEITO em 2026-08-19.** Commit `ceb2228` na branch `pr-b-cobertura-seeds-casca`,
**MERGEADO na `main` em `aa68690`** (`--no-ff`), sem tag, sem push. **BAIXO RISCO** (diff de produção
= 4 linhas de comentário, aprovadas pelo dev), sem `senior-reviewer`.
🔑 **É o primeiro arquivo do projeto que asserta LÓGICA sobre `party/sala.ts`** (`party/seeds.test.ts`,
rodando no `workerd`): sorteio dos 11 slots pelo caminho real (`criarSeNova` → `criar`) e reidratação
pós-`evictAllDurableObjects()` sem re-sorteio.
**Medido na `main` pós-merge:** `npm test` **1516/63** (inalterado, e correto — a matriz entrou como
docblock, não como asserção), `npm run test:party` **8/8** (era 5/5 no PR A), typecheck **0** nos
três projetos, eslint **0**, build **0**.
🔴 **DOIS ACHADOS QUE DERRUBARAM O PLANO APROVADO, ambos medidos antes de escrever teste:**
(1) **MR é inutilizável como baseline** — ela derruba a **quarta** exigência da cerca textual
(`const todas = Array.from(slots)`, que o plano não considerou) **e** dá **TS2740**, vermelho de
compilação, que não conta. Os dois motivos são independentes.
(2) 🔑 **Mais grave: NENHUM baseline do plano exigia o `evictAllDurableObjects()`** — MA cai na
criação, MR também. A metade **reidratação** sairia com **cobertura declarada e não provada**, que é
a forma exata do defeito do baseline do 3.5.1, dentro do PR que existe para fechá-lo.
**Conserto aprovado pelo dev: MR sai, entra MC** (`carregar()` deixa de ler o storage) — o vermelho
dela pousa **DEPOIS** do evict, com as asserções anteriores passando. Baselines **MA** e **MC**
vistos vermelhos um a um, com a cerca textual **VERDE (36/36)** ao lado, revertidos e verdes de novo.
✅ **R4 fechado por medição** (ver pendência 0(p)): `Uint32Array` sobrevive ao storage do DO.

**➡️ DECISÃO DO DEV (2026-08-20): PR C ADIADO — abre o 3.5.2 direto.** O **PR C** é o gate do
`alarm()` (`party/alarme.test.ts`, baselines MB/MD + anti-vacuidade). **Ele não foi cancelado: foi
REPOSICIONADO para DEPOIS do 3.5.4**, último PR da Fase 3, e **antes de declarar a Fase 3 encerrada**.
**Motivo registrado pelo dev:** o 3.5.2 vai exercitar `onMessage` de qualquer forma ao testar o
cursor, e **cobertura defensiva rende mais depois de a lógica existir** — o C escrito hoje seria
moldado ao código de ontem, e escrito depois é moldado aos bugs reais que a casca revelar.
⚠️ **A PRIMEIRA METADE DESSE MOTIVO NÃO SE REALIZOU — medido em 2026-08-20, ver a correção na
§"🟡 RISCO ATIVO".** O 3.5.2 testou o cursor pelo redutor puro (`aoReceber`, em `src/net/`), **não
por `onMessage`**; `npm run test:party` segue 8/8 e nenhum arquivo de `party/` foi tocado. **A
decisão de adiar o PR C continua de pé** — a segunda metade do motivo (cobertura moldada aos bugs
reais) é independente e não foi afetada —, mas o adiamento sai **mais caro do que o registrado**:
esperava-se herdar `onMessage` de graça, e não se herdou nada.
🔁 **GATILHO DE REAVALIAÇÃO, travado junto com a decisão:** se o **3.5.2 ou o 3.5.3 revelarem na
casca um bug que o PR C teria pego**, puxar o C para a frente em vez de seguir a sequência.
🛑 **O preço aceito, dito por inteiro** (era o argumento contra, e continua verdadeiro): o 3.5.2
nasce na única parte da casca ainda sem cobertura, e a **pendência 0(s)** — suspeita de sala-zumbi —
segue **não confirmada**, porque quem a confirmaria é o harness que o C constrói.

**🔢 SEQUÊNCIA ATÉ FECHAR A FASE 3 (atualizada em 2026-08-21):**
**~~3.5.2~~ ✅ → ~~3.5.3~~ ✅ → 3.5.4 → PR C → Fase 3 encerrada.**
🔒 **O 3.5.4 herda MAIS do que o plano previa**, por decisão do dev no 3.5.3 (opção A): além dos
painéis e do portão visual, ele leva o **`key={'etapa-'+k}`**, a remoção do **`naCorrida`** e o
**atestado por etapa** — as três são a mesma solda, e separá-las produz hash de uma etapa com a tela
de outra. Ver a §Onde parei.

**🏆 PR 3.5.2 — CÓDIGO COMPLETO E VERDE em 2026-08-20**, na branch **`pr-3.5.2-cursor-por-etapa`**
(o commit `wip` `469278f` mais o trabalho desta sessão). **NÃO commitado como final, NÃO mergeado,
NÃO pushado, sem tag.**
✅ **ITEM 3 DO `CLAUDE.md` (revisão de ALTO RISCO) FECHADO — em DUAS passadas.** A primeira
**reprovou** (três bloqueantes). Os consertos foram revisados numa **segunda passada, que voltou SEM
BLOQUEANTE** e com quatro avisos; **três deles eram sobre o próprio conserto e foram atendidos** —
ver "A segunda passada" abaixo. Rodar a segunda passada não era zelo: mutação verde prova que o
conserto FUNCIONA, e não substitui o portão. Barreira e avanço de cursor por etapa, elegíveis recomputados, `concluidaEm` só na última,
**+ conserto do detector** (campo `etapa`, chave `${escopo}:${etapa}`), **+ os três bloqueantes da
revisão consertados**. **Medido:** `npm test` **1544/64** (era 1516/63), `npm run test:party`
**10/10** (era 8/8), typecheck **0**, eslint **0**, build **0**.

🔴 **A REVISÃO REPROVOU O PR NA PRIMEIRA PASSADA — três bloqueantes, e os três se confirmaram por
MEDIÇÃO, não por leitura.** É o registro que mais importa desta sessão:

- **C1 (substância, código de produção).** `nEtapas` virou campo do estado persistido e ficou **fora
  do discriminante**, lido por um `??` com default 1 — enquanto `seedsEtapas`, `seedCalendario` e
  `etapaAtual` já estavam dentro. **Medido em sonda descartável:** sala de 5 etapas que perde o
  campo na reidratação faz a PRIMEIRA barreira gravar `concluidaEm` (contra `concluidaEm: null` +
  cursor 1 no controle) — **campeonato de 5 etapas encerrado na etapa 1, em silêncio**; e com o
  cursor já em 3 a sala vira **`corrompida`** (`etapaAtual fora de [0, 0]: 3`) e recusa todo mundo.
  🔑 **O bump de `VERSAO_ESTADO_SALA` (1 → 2) era PRÉ-REQUISITO do conserto, não zelo:** com a
  versão parada, "sala 3.5.1 que legitimamente não tem o campo" e "sala 3.5.2 que o perdeu" são o
  mesmo objeto e **nenhuma guarda consegue separá-las**. Conserto: versão 2, `nEtapas` em
  `estadoDasSeeds` sob `versaoSala >= 2`, e default 1 preservado **só** para v1.
- **C2 e C3 (método).** Aqui o código estava **certo** — o que não existia era prova. **C2:**
  neutralizar a guarda `if (etapa < cursor)` deixava a suíte **inteira verde, 1531/1531**, incluindo
  o teste chamado `🔴 BASELINE D1: cliente ATRASADO … é ignorado EM SILÊNCIO`. Ele rodava com o
  cursor parado em 0, então a condição era `0 < 0` — **a guarda nunca era entrada**, e o silêncio
  vinha do balde vazio. **C3:** o mutante `atestado.etapa ?? 0` — que o docblock diz que "devolveria
  o alarme falso inteiro pela porta do conserto" — sobrevivia a tudo, porque nenhum teste mandava
  atestado sem o campo com o cursor fora do zero.

🔑 **É a SEXTA instância de "o teste afirmava o que não conferia"** (as cinco anteriores estão na
§Processo), desta vez **dentro do teste rotulado como baseline** da decisão que o PR chama de
inseparável. **A lição operacional que fica: baseline cujo cenário não ALCANÇA a guarda não é
baseline.** Os dois testes agora asserem as pré-condições (cursor andou; balde populado com hash
conflitante) em vez de supô-las, e os dois foram **validados por mutação**.

📊 **TABELA DE MUTAÇÕES — 12 mutações, todas VERMELHAS contra o código final**, e todas com
`tsc` limpo (vermelho comportamental, nunca de compilação). Ordem em todas: verde → aplica → **vê
vermelho** → reverte → verde, com `git hash-object` conferindo cada reversão:
`M-det` 7 · `M-cursor` 22 · `M-anchor` 1 · `M-eleg` 1 · `M-nEtapas` 2 (na casca) · `M-C1` 4 ·
`M-C1v` (versão volta a 1) 5 · `M-C2` 1 · `M-C3` 1 · `M-A4` 1 · `M-A1` 3 · `M-A3` 1.

🔑 **DUAS MUTAÇÕES SOBREVIVERAM NA RODADA INTERMEDIÁRIA, e as duas eram sobre o conserto que eu
mesmo tinha acabado de escrever — foi assim que os avisos 1 e 3 da segunda passada saíram de
"leitura do revisor" para "fato medido".** Registrado porque é o argumento a favor de rodar a tabela
INTEIRA de novo depois de cada conserto, e não só as mutações novas.

🔴 **ACHADO PRÓPRIO DA SESSÃO, e ele nasceu VERDE — `M-nEtapas`.** Trocar `N_ETAPAS_CURTA` por `1`
na chamada de `criarServidor` em `party/sala.ts` sobrevivia a **TODOS** os portões: typecheck 0,
eslint 0, `npm test` 1531/1531, `npm run test:party` 8/8. Medido em duas formas para eliminar o
colateral: com `1` literal o eslint acusava só o import órfão; com `Math.min(N_ETAPAS_CURTA, 1)`
**nada acusava nada**. Em produção: campeonato online de UMA etapa, com todo o resto do PR
funcionando. 🔑 **O parâmetro obrigatório sem default pega a OMISSÃO (não compila) e NÃO pega o
VALOR ERRADO** — o docblock de `criarSala` podia ser lido como mais forte do que é. **Fechado nesta
sessão** (aviso A5 da revisão, autorizado pelo dev): `party/seeds.test.ts` ganhou cerca
comportamental que lê `nEtapas` do estado **persistido** e do **snapshot**, com anti-vacuidade.
✅ **A segunda propriedade que a revisão dava como descoberta JÁ ESTAVA COBERTA** — refutado por
mutação: `todas[MAX_ETAPAS] → todas[0]` cai em `party/seeds.test.ts:137`, a asserção de MA do PR B.
**Achado de revisão também entra medido.**

**🔁 A SEGUNDA PASSADA DA REVISÃO — sem bloqueante, quatro avisos, TRÊS deles sobre o conserto:**
- 🔴 **Aviso 1 — a guarda do N2 NÃO cobria o caso C1, e o docblock dizia que cobria.** Ela validava
  a forma do **cursor**; uma sala v2 sem `nEtapas` **com o cursor em 0** tem `nEtapasDaSala` no piso
  1, `cursorIntegro(0, 1)` verdadeiro, guarda passando — **o modo de falha do C1 intacto dentro da
  camada pura**, defendido só pelo `jogavel()` da casca, exatamente como antes. **Medido e
  consertado:** a guarda passou a consultar `estadoDasSeeds`, a MESMA autoridade do discriminante.
  🔑 **É a classe de defeito que este PR inteiro existe para combater, cometida no conserto dela** —
  escrever a garantia no comentário não a implementa.
- 🔴 **Aviso 3 — `nEtapas` tinha guarda de ESCRITA e não de LEITURA.** `criarSala` limitava a
  `[1, seeds.etapas.length]`, mas um `nEtapas: 999` vindo do storage passava, e `aoReceber` usa
  `nEtapasDaSala - 1` como teto de `atestadoValido` ⇒ **999 baldes por escopo no Durable Object**,
  derrubando a propriedade que o próprio PR declara. **Guarda de escrita sem guarda de leitura não
  é teto, é convenção.** Consertado no discriminante, com anti-vacuidade (`MAX_ETAPAS` continua
  legítimo).
- 🔴 **Aviso 4 — dois docblocks que o PRÓPRIO PR falsificou.** `tipos.ts` dizia que `nEtapas` é
  "fixo em `N_ETAPAS_CURTA`" (deixou de ser: o snapshot publica 1 para sala v1/legado) e que o
  cursor "no 3.5.1 NÃO avança" (é o PR que o faz avançar); `sala.ts` dizia que `seedsAbertas`
  devolve "exatamente UM elemento". **Corrigidos no lugar**, não contraditos em outro arquivo.
- 🟡 **Aviso 2 — `versaoSala` é o único campo persistido sem checagem de FORMA.** `null`, `0`,
  `NaN` ou string atravessam as duas portas (`=== undefined` falso, `>= 2` falso). **NÃO
  consertado: é decisão do dev**, porque mexer no caso `undefined` contradiria comportamento já
  fixado por teste. Registrado como **0(u6)**.

🔴 **E a guarda morta que a tabela pegou:** o cheque de cursor que sobrou ao lado do novo virou
**inalcançável**, e `M-N2` passou a deixar a suíte inteira verde. **Removido, não documentado** —
guarda que nenhuma mutação mata é guarda morta, e guarda morta ao lado de um comentário que a
explica é a próxima afirmação falsa esperando leitor.

**Consertos aplicados nesta sessão, com o escopo que o dev autorizou** (bloqueantes + A5 + A4/N2):
- **C1** — `VERSAO_ESTADO_SALA = 2`; `nEtapas` no discriminante; default 1 restrito a v1; corrigido
  o comentário FALSO de `servidor-sala.ts` que afirmava "sem bump — o formato não mudou".
- **C2/C3** — os dois testes da D1 reescritos para alcançar as guardas de verdade.
- **A5** — cerca comportamental de `nEtapas` na casca (`party/seeds.test.ts`).
- **A4** — `criarSala` recusa `nEtapas` fora de `[1, seeds.etapas.length]`, na mesma guarda e pelo
  mesmo motivo do `throw` da cardinalidade das seeds.
- **N2** — a barreira deixou de **curar em silêncio** um cursor fora de faixa: `etapaAtual: -3`
  saía de lá como `1`, transformando sala `corrompida` em íntegra. Agora devolve o mesmo objeto.
  Preserva sala LEGADO (campo AUSENTE ≠ campo fora de faixa), com anti-vacuidade própria.

⬅️ **AVISOS DA REVISÃO NÃO CONSERTADOS — viraram a pendência 0(u)**, por estarem fora do escopo
autorizado. **O mais urgente é de DEPLOY, não de merge (A3).**

🔑 **DECISÃO DO DEV (2026-08-20) sobre o gatilho do PR C: o achado `M-nEtapas` NÃO o dispara.** O
gatilho nomeia o `alarm()`; isto é o caminho de CRIAÇÃO, o valor está certo hoje, e é ausência de
portão, não bug. **PR C segue depois do 3.5.4.**

🛑 **A OPÇÃO DE ABANDONAR O 3.5 FOI POSTA AO DEV nesta sessão, como o `ESTADO.md` exigia — e ele
decidiu SEGUIR COM O 3.5** (2026-08-20). A obrigação de visibilidade está cumprida; o texto do
"o que o abandono custaria" fica abaixo como registro do que foi pesado, não como pergunta aberta.

*Texto original do item, preservado:* **PR 3.5.2** — barreira e avanço de cursor por etapa,
elegíveis recomputados,
`concluidaEm` só na última, **+ conserto do detector** (campo `etapa`, chave `${escopo}:${etapa}`).
🛑 **É no 3.5.2 que o dev pediu para ver, VISÍVEL, a opção de abandonar o 3.5 inteiro** — o corte
honesto da fase pode ser o próprio 3.5, e é ali que a decisão é barata.
✅ **CUMPRIDO E DECIDIDO EM 2026-08-20: a opção foi apresentada ao dev na sessão do 3.5.2, com os
três bloqueantes da revisão já na mesa (o que a tornava mais barata ainda — C2 e C3 evaporariam
junto com o 3.5, e C1 quase todo). VEREDITO DO DEV: SEGUIR COM O 3.5.** O bloco abaixo fica como
registro do que foi pesado; **não é mais pergunta aberta**, e reabri-lo é decisão nova do dev.
🛑 **(Texto do pedido original, preservado.) E É AGORA (2026-08-20): o 3.5.2 é esta sessão.** O pedido
foi para a opção estar visível **no momento** do 3.5.2, não depois — abandonar o 3.5 custa 3 PRs
poupados agora (3.5.2 + 3.5.3 + 3.5.4) e custa muito mais depois do 3.5.3. **O que o abandono
sacrificaria:** o campeonato online inteiro; a corrida online avulsa (encerrada no 4/4) **fica de
pé sozinha** e a Fase 3 fecharia com ela + o PR C.
**O que o abandono TAMBÉM dispensa:** o conserto do detector (alarme falso travado a partir da
etapa 2) — o alarme falso **só existe porque existe etapa 2**, então ele some junto com o 3.5. Não
é dívida que fica; é trabalho que deixa de ser necessário.
**O que o abandono NÃO resolve:** as pendências **0(i)** (`seedMestre` de 32 bits, enumerável) e
**0(o)** (assimetria de postura entre corrida avulsa e campeonato) — elas seguem abertas de
qualquer jeito, e continuam esperando o PR de alargamento de entropia. ⚠️ Com o 3.5 abandonado,
0(o) muda de forma (não haveria campeonato online para contrastar com a avulsa), **mas 0(i) não
muda em nada** — ela é da corrida avulsa, que fica.

**Duas decisões de arte esperando o dev** (nenhuma bloqueia o merge): os dois botões do
`TelaResumo` são ambos `botao-primario` (pré-existente do offline, agora visível no online); e o
`FluxoOnline.tsx:218-230` não tem cobertura automática — sem jsdom não há clique.

Concluído antes: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.8**, e a Fase 8 nos
PRs **8.1** (calendário sorteado), **8.2** (round-trip do save) e **8.4-mínimo** (o campeonato
deixou de ser inalcançável — tem seletor, encadeia corridas, salva e retoma).

## SEQUÊNCIA — o que sobrou

**🔢 ATÉ FECHAR A FASE 3 (atualizado em 2026-08-20, decisão do dev que adiou o PR C do spike):**
**3.5.2 → 3.5.3 → 3.5.4 → PR C → Fase 3 encerrada.** O PR C é o gate do `alarm()` e foi
**reposicionado** para o fim, não cancelado — motivo e gatilho de reavaliação na §"Onde parei".

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

## 🟡 RISCO ATIVO — `party/` TEM COBERTURA PARCIAL (era 🔴 "NÃO TEM COBERTURA AUTOMATIZADA")

> 🟡 **Rebaixado de 🔴 para 🟡 em 2026-08-20**, junto com a pendência 9 e por decisão do dev. **O
> título antigo virou falso no PR B** e por isso foi corrigido, não só anotado: `party/seeds.test.ts`
> executa a casca de verdade. **A seção CONTINUA ABERTA** — o inventário do que segue descoberto
> está no bloco 📊 no fim dela, e o gate do `alarm()` é o mais relevante deles.

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

📊 **ESTADO DA SEÇÃO em 2026-08-19, pós PR A + PR B (ambos mergeados na `main`):**
- ✅ **"nenhum teste a executa" DEIXOU DE SER VERDADE.** `party/seeds.test.ts` executa o sorteio real
  (`criarSeNova` → `criar`) e a reidratação pós-`evictAllDurableObjects()`. `npm run test:party` 8/8.
- ✅ **A consequência que já se materializou uma vez está coberta:** M6 (recoplar o 11º slot) agora
  cai comportamentalmente, não só na cerca textual.
- 🔴 **A SEÇÃO CONTINUA ABERTA, e o motivo é específico:** `onMessage`, `onClose`, `encerrar`, CORS e
  a propriedade RPC-vs-HTTP seguem **sem nenhum teste**, e o **gate do `alarm()` (aviso A2) também**
  — ele é o PR C, que **não foi feito**. O 3.5.2 põe o cursor exatamente ali.
  ➡️ **ATUALIZAÇÃO 2026-08-20:** o PR C foi **adiado por decisão do dev** para **depois do 3.5.4**
  (sequência **3.5.2 → 3.5.3 → 3.5.4 → PR C → Fase 3 encerrada**). Enquanto ele não vier, **este
  parágrafo é a descrição corrente do risco, não histórico** — e o 3.5.2 abre ciente disso.
  ⚠️ **CORREÇÃO MEDIDA EM 2026-08-20 — a redação anterior deste item era FALSA e por isso foi
  corrigida aqui, não só contradita abaixo.** Ela dizia: *"o 3.5.2 exercita `onMessage` (é por onde o
  atestado da barreira chega e o cursor anda), então a lacuna de `onMessage` encolhe como efeito
  colateral"*. **Não encolheu — o 3.5.2 NÃO exercitou `onMessage`, e a lacuna está do mesmo tamanho.**
  Medido, não deduzido: o teste do cursor é `src/net/cursor-etapas.test.ts`, que roda em `npm test` e
  chama **`aoReceber`** — o redutor PURO de `src/net/`. `onMessage` vive em `party/sala.ts:238`, é
  a casca, e **nenhum arquivo de `party/` foi tocado pelo 3.5.2**: `npm run test:party` segue **8/8**,
  os mesmos oito do PR B. 🔑 **A lição por trás do erro:** "o PR exercita X" foi inferido de *o PR
  mexe na lógica que X carrega*, e as duas coisas são diferentes quando existe um redutor puro no
  meio — que é exatamente a arquitetura deste projeto. **`aoReceber` testado não é `onMessage`
  testado.**
  ✅ **MAS a lacuna encolheu por OUTRO caminho, no mesmo dia:** o 3.5.2 acrescentou cobertura
  comportamental à casca pelo lado da CRIAÇÃO: `party/seeds.test.ts` ganhou **dois testes** (a
  cerca de `nEtapas` do aviso A5 + a anti-vacuidade dela), e a suíte `npm run test:party` — que é
  `seeds.test.ts` **mais** `smoke.test.ts` — foi de **8 para 10**. **Isso NÃO é `onMessage`, `onClose`, `encerrar`, CORS nem o gate
  do `alarm()`** — nenhum deles mudou de tamanho. Registrado aqui só para que a contagem de
  `test:party` não pareça ter mudado sozinha.
- 🔴 **ACHADO DO 3.5.2 (2026-08-20) QUE PERTENCE A ESTA SEÇÃO — a casca podia declarar o FORMATO
  ERRADO sem nenhum portão notar.** `M-nEtapas` (trocar `N_ETAPAS_CURTA` por `1` na chamada de
  `criarServidor` em `party/sala.ts`) sobrevivia a typecheck 0, eslint 0, `npm test` 1531/1531 e
  `npm run test:party` 8/8 — **mesma FORMA do bloqueante do 3.5.1** (M5/M6 no sítio real, suíte
  verde a 1509/63), agora sobre `nEtapas` em vez das seeds. ✅ **Fechado no mesmo PR** por cerca
  comportamental. 🔑 **A lição que fica maior que o caso: parâmetro obrigatório sem default pega a
  OMISSÃO, não o VALOR ERRADO** — quem escrever "é obrigatório, então está protegido" está errado
  pela metade.
- 🔒 **M5 SEGUE INDETECTÁVEL COMPORTAMENTALMENTE, PARA SEMPRE**, e por isso **a cerca textual de
  `src/net/campeonato-online.test.ts` NÃO SAI.** Seeds derivadas por índice também são distintas
  entre si e entre salas; e não dá para fixar a `seedMestre` e comparar salas, porque `criar()` só
  roda com o storage vazio. A matriz de cobertura medida vive no docblock da cerca.
  ⚠️ **A ressalva do 0(p) continua valendo e NÃO foi resolvida pela cobertura nova.**
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
   (k) ✅ **FECHADA no 3.5.2 (2026-08-20) — o conjunto DEIXOU de congelar.** `elegiveisDaBarreira`
   passou a exigir **conexão viva** além de humano e não-ausente; quem reconecta volta a ser
   elegível sozinho. Era limite aceitável com UMA corrida (timeout pago uma vez) e virava bloqueante
   com N etapas: quem fechasse a aba na etapa 1 faria **cada** etapa seguinte pagar
   `TIMEOUT_FIM_DE_CORRIDA_MS`. Baseline vermelho visto (`M-eleg`). ⚠️ **Preço registrado como
   0(u3):** blip de rede de 3 s tira o jogador dos elegíveis e a sala anda sem ele.
   *(Texto original, preservado:)* **LIMITE CONHECIDO (PR 3/4 da corrida online) — congelamento de elegíveis.** O conjunto de elegíveis para a barreira **congela quando o draft conclui**. Ninguém vira ausente **depois** — qualquer dropout durante o replay ainda custa o timeout cheio (`TIMEOUT_FIM_DE_CORRIDA_MS = 5 min`). Sem reconexão de corrida implementada. Documentado e testado.
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
   (p) ✅ **FECHADA em 2026-08-19 — MEDIDA PELO DEV EM PRODUÇÃO, NÃO DEDUZIDA.**
   🔑 **O MÉTODO, porque é ele que faz a medida valer** (registrado aqui a pedido do dev, 2026-08-19,
   para não depender do `HISTORICO.md`): **(1) despejo** do storage do Durable Object da sala `420320`
   (pós-3.5.1) via `scripts/despejar-seeds.ts`, anotando os 11 números; **(2) derrubada real** do
   worker — Ctrl-C no `npm run sala`, não um reload nem um restart de dev server; **(3) reconexão**,
   forçando a sala a reidratar do storage em vez de servir cache de memória; **(4) segundo despejo**
   e comparação número a número. **Os 11 vieram IDÊNTICOS.** As cinco salas pré-3.5.1 caíram em
   `legado`. Fecha os requisitos **(a)** reidratação e **(b)** extratibilidade do baseline do 3.5.1.
   **Detalhe completo:** `HISTORICO.md`.
   ✅ **AUTOMATIZADA no PR B (2026-08-19):** o que o dev fez à mão agora tem par em teste —
   `party/seeds.test.ts` cria a sala pelo caminho real, despeja a instância com
   `evictAllDurableObjects()` e exige que as 11 seeds voltem idênticas **e que a sala não se
   re-crie**. Baseline **MC** visto vermelho. **Isto NÃO substitui a medida em produção** (workerd
   local não é a borda da Cloudflare); ele impede a regressão silenciosa entre uma medida manual e a
   próxima.
   🔑 **A RESSALVA, que não pode sair daqui:** `seedCalendario 1903767602` ≠ `seedsEtapas[0]
   3187109758` **refuta M6** (11º slot recoplado) e **NÃO diz nada sobre M5** (derivar por índice) —
   seeds derivadas por índice **também** diferem entre si. **NÃO ler como "independência das seeds
   confirmada".** A cerca textual continua valendo por causa de M5.
   ⚠️ **O ramo `corrompida` segue NÃO OBSERVADO em produção** — existe só em teste. É ganho do spike.
   🔴 **Achado técnico que fica valendo:** o DO é `new_sqlite_classes` e `ctx.storage.put` grava na
   `_cf_KV` **V8-serializado, não JSON** — `sqlite3`/`strings` mostram os NOMES dos campos e não os
   números; por isso `scripts/despejar-seeds.ts` desserializa com `node:v8`. **Isto REFUTA o docblock
   de `party/sala.ts:90-92`** — ✅ **corrigido no PR A do spike**, como planejado.
   🔑 **R4 — MEDIDO NO `workerd` REAL PELO PR B (2026-08-19). Era pergunta explicitamente em aberto;
   virou fato.** O 0(p) provou o **serializador** (V8, não JSON); faltava saber o que o V8 faz com um
   `Uint32Array`. Executado em `party/seeds.test.ts` (bloco R4), **na forma aninhada de produção**
   (`estado.sala.seedsEtapas`, não um valor no topo da chave — medir o topo e afirmar sobre o
   aninhado seria supor que o structured clone é recursivo em vez de conferir):
   **o `Uint32Array` SOBREVIVE ao round-trip, íntegro, como `Uint32Array`.**
   🔒 **Consequência travada: `Array.from` na fronteira é NECESSÁRIO, não estilo — e o caminho de
   falha é o pior dos dois para diagnosticar.** As seeds **não somem** nem viram `{"0":…}`: elas
   voltam perfeitas, e mesmo assim `estadoDasSeeds` reprova no **`Array.isArray`**
   (`src/net/sala.ts:192`) ⇒ a sala vira **`corrompida` e passa a RECUSAR TODO MUNDO**. Quem um dia
   olhar `const todas = Array.from(slots)` e achar que é cerimônia tem, agora, o número e o teste.
   (q) **NOVA (PR 3.5.1) — ORDEM DE DEPLOY a partir do 3.5.2: `wrangler` ANTES do `vite`.**
   ⚠️ **ATUALIZADA em 2026-08-20 (revisão do 3.5.2): esta pendência tem AGORA uma irmã que aponta
   para o outro lado — a 0(u1).** Sozinha, a 0(q) diz "worker primeiro"; a 0(u1) mede que o worker
   3.5.2 sozinho pendura a sala ~20 min contra o cliente 3.5.1. **Lidas juntas, a conclusão é a
   única segura: os dois lados sobem no MESMO deploy, com o `wrangler` primeiro dentro dele.**
   `cliente.ts` não valida forma de snapshot. Num deploy escalonado, cliente novo contra worker
   antigo receberia `seedsAbertas: undefined` — **inócuo no 3.5.1** (ninguém lê), **letal no 3.5.2**,
   quando o cliente passar a derivar as etapas dele.
   (r) ✅ **FECHADA no 3.5.2 (2026-08-20).** `cursorIntegro` entrou em `estadoDasSeeds`: cursor fora
   de `[0, nEtapas-1]` ⇒ sala `corrompida`. As três leituras `?? 0` viraram **uma** função tolerante
   com dono e docblock (`cursorDaSala`), que existe só para sala LEGADO. ⚠️ **Fechá-la ABRIU a
   0(t)** — é o custo registrado, não um efeito colateral esquecido.
   *(Texto original, preservado:)* **NOVA (PR 3.5.1) — `etapaAtual` está FORA do discriminante.** Três leituras defensivas
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
   (t) 🟠 **NOVA (3.5.2, 2026-08-20) — A INVARIANTE DO SNAPSHOT DEIXOU DE SER LOCAL: ele pode se
   AUTOCONTRADIZER quando a sala é `corrompida`.** Achado ao trazer o cursor para dentro do
   discriminante (pendência 0(r)); **registrado por decisão do dev, NÃO consertado no 3.5.2.**
   **A cadeia, verificada no código:** `publicarSala` monta o snapshot com dois leitores que agora
   respondem a autoridades diferentes. `cursorPublicavel` (`src/net/sala.ts`) **clampa** — cursor 15
   sai como 4. `seedsAbertasDe` chama `estadoDasSeeds`, que desde o 3.5.2 reprova cursor fora de
   faixa e devolve **`corrompida` ⇒ `seedsAbertas: []`**. Resultado no fio:
   **`etapaAtual: 4`, `nEtapas: 5`, `seedsAbertas: []`** — um snapshot que afirma estar na etapa 5
   e não publica seed nenhuma. A invariante que o 3.5.1 travou por teste
   (`seedsAbertas.length === min(etapaAtual + 1, nEtapas)`) **quebra**.
   🔑 **Por que isto é mudança de tese e não um bug qualquer:** até o 3.5.1 a invariante era
   **LOCAL** — dava para prová-la olhando só `publicarSala`, porque os dois campos saíam do mesmo
   clamp. Agora ela **depende de uma guarda ANTERIOR** (a casca recusar a sala `corrompida` antes de
   publicá-la). O snapshot só é coerente **se ninguém publicar sala não validada** — e é exatamente
   a aposta que o docblock de `cursorPublicavel` diz não querer fazer ("aposta que o aviso A1 da
   revisão do 3.5.1 já perdeu uma vez"). ⚠️ **Hoje não é vazamento** (o caminho vaza *menos*, não
   mais: publica zero seed), e nenhuma sala de produção chega lá — o servidor nunca grava cursor
   fora de faixa. **É armadilha para quem vier depois:** o cliente do 3.5.3 vai derivar as etapas de
   `seedsAbertas` e ler `etapaAtual` para indexar o calendário.
   **Caminhos possíveis, nenhum escolhido:** (1) `publicarSala` recusar publicar sala `corrompida`,
   levando a guarda para dentro; (2) o clamp passar a zerar o cursor quando as seeds não estão `ok`,
   restaurando a localidade; (3) manter e travar a nova invariante condicional por teste. **É
   decisão do dev.** Os 2 vermelhos do grupo 2 em `campeonato-online.test.ts` são a manifestação
   disto — os testes forjam `etapaAtual: 15` e `-3` à mão, que é o único jeito de chegar ao estado.
   ➡️ **ATUALIZAÇÃO 2026-08-20, pós-revisão: SEGUE ABERTA, e o conserto do N2 encolheu o problema
   sem resolvê-lo.** `avaliarBarreiraDaCorrida` passou a recusar cursor fora de faixa em vez de
   curá-lo (a barreira voltou a ser local), mas **`publicarSala` continua com os dois leitores
   respondendo a autoridades diferentes** — que é a pendência. Os três caminhos possíveis continuam
   sem escolha, e o teste que TRAVA o comportamento atual (`🟠 PENDÊNCIA 0(t)` em
   `campeonato-online.test.ts`) continua no lugar, de propósito: ele não abençoa, ele impede que
   mude sem alguém perceber.
   (u) 🟠 **NOVA (revisão do 3.5.2, 2026-08-20) — OS AVISOS QUE O DEV DECIDIU NÃO CONSERTAR NESTE
   PR.** O escopo autorizado foi "bloqueantes + A5 + A4/N2"; o que sobrou está aqui, para não virar
   folclore de revisão. **Nenhum bloqueia o merge; o primeiro bloqueia o DEPLOY.**
   🔑 **PROVENIÊNCIA, e ela não é uniforme — ler o rótulo de cada item antes de agir sobre ele.**
   Esta sessão refutou por mutação uma das alegações da própria revisão (a de que
   `todas[MAX_ETAPAS] → todas[0]` estaria descoberto — **já estava coberto**), então achado de
   revisão obtido por LEITURA tem taxa de erro conhecida e **não entra aqui como fato medido**.
   Mesmo padrão da 0(s) ("achado por LEITURA … não confirmado por execução") e da 0(p) ("MEDIDA …
   NÃO DEDUZIDA"). **Só a u1 foi medida; u2–u5 são leitura.**
   - 🔴 **(u1) ORDEM DE DEPLOY — o worker do 3.5.2 SÓ VAI A PRODUÇÃO JUNTO COM O CLIENTE DO 3.5.3.**
     ✅ **MEDIDO nesta sessão, rastreando a cadeia de chamada no código — não é a leitura da
     revisão.** É pendência NOVA e **não é a 0(q)** (aquela é cliente novo × worker antigo; esta é o
     inverso). A cadeia, verificada arquivo a arquivo:
     `useSalaOnline.ts:219-224` — `corrida` é `useMemo` sobre `[cliente.draft,
     cliente.sala?.seedCorrida]`, **sem `etapaAtual` e sem `seedsAbertas`**, logo a corrida é
     computada **uma vez** e a referência nunca troca; `FluxoCorrida.tsx:77` — `onChegouAoResultado`
     dispara no efeito `if (fase === 'resultado')`, e `fase` fica em `'resultado'` para sempre;
     `FluxoOnline.tsx:225` liga esse callback a `atestarFimDaCorrida`
     (`useSalaOnline.ts:286-289`), que envia `{tipo: 'corrida-concluida'}`.
     **Consequência:** com worker 3.5.2 e cliente 3.5.1, a etapa 0 fecha normalmente, o cursor vai a
     1, os atestados zeram — **e nada no cliente reatesta, porque nada nele mudou de referência**.
     As quatro barreiras seguintes fecham só por `TIMEOUT_FIM_DE_CORRIDA_MS`: **4 × 5 min = ~20
     minutos** de jogador parado na tela de resultado.
     ⚠️ **Ler junto com a 0(q): as duas juntas dizem que os dois lados sobem no MESMO deploy, com o
     `wrangler` antes do `vite` dentro dele.**
   - 🟠 **(u2) — ACHADO POR LEITURA DA REVISÃO, NÃO MEDIDO. A guarda de etapa é ASSIMÉTRICA —
     `etapa > cursor` é aceita e escreve balde FUTURO.**
     `atestadoValido` só impõe o teto `nEtapas - 1`, então um cliente manda `etapa: 4` com o cursor
     em 0 e o estado persistido ganha `corrida:4` antes de a etapa 4 existir. **Não é crescimento
     ilimitado** (o teto segura em `escopos × nEtapas`); o dano é outro: quando a etapa 4 chegar, a
     âncora é a mesma (o log do draft parou de crescer), então o balde envenenado **sobrevive** e um
     `alarmado: true` pré-queimado **suprime o alarme real daquela etapa** — o oposto do que o PR
     existe para garantir. Conserto mínimo seria `etapa !== cursor` ignorar em silêncio (nunca
     `comando-invalido`, para não punir cliente em corrida legítima). ⚠️ **Isso derrubaria vários
     testes atuais do detector**, o que é evidência de que eles não modelam o fluxo de produção — os
     do bloco do detector atestam `etapa: 1` com o cursor em 0, que é atestado ADIANTADO.
   - 🟠 **(u3) — ACHADO POR LEITURA DA REVISÃO, NÃO MEDIDO. Blip de rede faz a sala ANDAR sem o
     jogador.** É o preço da 0(k) fechada: elegível
     passou a exigir conexão viva, e `aoDesconectar` tira do mapa na hora. A + B + C na etapa 1, B e
     C já atestaram, A cai por 3 s ⇒ no tique seguinte (o tique é de **5 s**) a barreira fecha sem
     A e o cursor anda. **Sem perda de dado** (as seeds `0..cursor` seguem abertas e o cliente
     re-simula), mas é repetível em rede ruim. Fechar exigiria carência de desconexão — campo novo
     no estado, **decisão do dev**.
   - 🟢 **(u4) — LEITURA, não medido. Baldes com a chave ANTIGA (`'draft'`, `'corrida'`, sem etapa) ficam órfãos para
     sempre** numa sala 3.4/3.5.1 reidratada. Custo: duas entradas mortas e um `alarmado` perdido —
     um alarme pode redisparar uma vez após o deploy.
   - 🟡 **(u6) — ACHADO POR LEITURA (2ª passada), NÃO MEDIDO. `versaoSala` é o único campo
     persistido SEM checagem de forma.** `null >= 2` é `false` e `null === undefined` é `false`, então
     `null`, `0`, `NaN` ou string **atravessam as duas portas** do discriminante: não tomam o ramo
     `legado` e escapam da guarda de `nEtapas`. Com `nEtapas` ausente ⇒ piso 1 ⇒ a primeira barreira
     encerra um campeonato de 5 etapas em silêncio — o desfecho que o C1 existe para matar. **Exige
     corrupção de VALOR, não perda de campo** (por isso não é bloqueante). **É decisão do dev**:
     validar a forma (`inteiro em [1, VERSAO_ESTADO_SALA]`, fora disso `corrompida`) mexeria no caso
     `undefined`, que já está fixado por teste como `legado`.
   - 🟢 **(u5) — LEITURA, não medido. Cliente antigo (sem `etapa`) atestando na virada de etapa** é
     bucketizado na etapa nova e pode produzir alarme falso residual — a mesma classe que o PR
     conserta, agora numa janela estreita.
   (v) 🟠 **NOVA (3.5.3, 2026-08-21) — MEDIDA, NÃO DEDUZIDA: o `npm test` tem uma corrida de I/O
   entre as cercas, e ela é PRÉ-EXISTENTE.** `contrato-ausente.test.ts` percorre `src/ui/` com
   `readdirSync`/`statSync` (`arquivosDaUi`), enquanto `contrato-corrida-online.test.ts` **grava e
   apaga** arquivos de sabotagem na MESMA pasta, em paralelo. Arquivo que some no meio da caminhada
   faz o `statSync` estourar, e o sintoma aparece **em outro arquivo**, sem relação com o PR.
   **Medido contra a base `3f54436`:** as duas cercas rodadas juntas já falham **1-2 testes**
   **sem** o 3.5.3; com a primeira versão do 3.5.3, **3-4**, e o `npm test` inteiro passou a cair.
   ✅ **A contribuição do 3.5.3 foi FECHADA no próprio PR** (a sabotagem nova passou de 6 varreduras
   com o arquivo em disco para 1). ✅ **E A CAUSA RAIZ FOI CONSERTADA NO MESMO PR (2ª passada da
   revisão) — porque estreitar a janela NÃO BASTOU: a taxa voltou a 3 falhas em 6 rodadas.**
   `arquivosDaUi` não tolerava arquivo sumindo durante a caminhada, e as sabotagens de allowlist
   gravam/apagam em `src/ui/` **por desenho**. Entrou `catch` **estreito (só `ENOENT`)** nos DOIS
   pontos da janela — `statSync` **e** `readFileSync`.
   ⚠️ **A primeira tentativa guardou só o `statSync` e AFIRMOU no docblock que a leitura não
   precisava — falso, medido:** o `ENOENT` capturado era **na leitura**
   (`open 'src\ui\__sabotagem_etapas_dupla.tsx'`). Corrigido no lugar.
   **Medido depois do conserto: 8 rodadas seguidas de `npm test`, 1565/1565 em todas** (taxa anterior
   ~50%). 🔑 Colateral: `NodeJS.ErrnoException` não compila aqui (sem `@types/node`) — virou
   `{ code?: string }`.
   🟡 **Fica em 🟡 e não em ✅ por uma razão:** o conserto torna a VARREDURA robusta, mas o desenho
   que a provoca continua de pé — suíte que grava em `src/ui/` enquanto outra a percorre. Uma cerca
   futura que pergunte *"TODO arquivo contém X"* (em vez de *"algum contém"*) voltaria a ser
   vulnerável, agora por vacuidade em vez de exceção. Está escrito no docblock de `lerFonte`.
   ⚠️ **Era um portão que passava por SORTE**, e a regra do projeto trata portão assim como risco,
   não como detalhe.
   (w) 🟠 **NOVA (revisão do 3.5.3, 2026-08-21) — O CLIENTE FIXA `'curta'` (5) E O TETO DE LEITURA DE
   `nEtapas` NO SERVIDOR É `[1, 10]`. DECISÃO DO DEV.** `etapasDaSala` chama
   `calendarioSorteado(dataset, seedCalendario, 'curta')` e ignora o `nEtapas` do snapshot — hoje
   coerente, porque `party/sala.ts` sempre cria a sala com `N_ETAPAS_CURTA`. **Mas o caminho de
   LEITURA não prende em 5:** `sala.ts:324` valida `nEtapasIntegro(sala.nEtapas, seedsEtapas.length)`
   com `seedsEtapas.length === MAX_ETAPAS === 10`. Uma sala v2 com `nEtapas: 10` é **`ok`**, publica
   6+ seeds abertas, e `etapasDaSala` **lança** em `calendario[5]` — dentro de um `useMemo`, **em
   render**, e **não existe `ErrorBoundary` em `src/`** (medido: zero ocorrências). Resultado: tela
   branca para todos os 22, e o F5 rederiva do mesmo snapshot ⇒ laço.
   **Não é alcançável hoje** (por isso aviso, não bloqueante) — é o dia em que alguém ligar o formato
   "completa" no servidor sem tocar no cliente. ⚠️ **Mesma família do `M-nEtapas` do 3.5.2**: o valor
   está certo hoje e nada o prende amanhã.
   **Dois caminhos, NENHUM escolhido:** (1) derivar o formato de `sala.nEtapas` — mantendo o portão
   `seedCalendario === null` **ANTES**, porque sala legado publica `nEtapas: 1`, que não existe em
   `N_ETAPAS` e faria um lookup ingênuo lançar onde hoje devolve `[]` corretamente; (2) o hook
   capturar e expor pelo canal de erro que já tem, deixando a função pura lançando alto.
   🔑 **Registrada também no docblock de `etapasDaSala`**, que é onde a próxima pessoa vai olhar.
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
9. 🟡 **`party/` COM COBERTURA PARCIAL — aberta 🔴 em 2026-08-18, pendência NOMEADA a pedido do
   dev; passou a 🟡 em 2026-08-20 (ver o STATUS mais abaixo neste item).** Seção própria acima
   (§"🟡 RISCO ATIVO — `party/` TEM COBERTURA PARCIAL"), com o que foi medido e o que o 3.5.2 herda.
   Em uma linha: é a camada que sorteia, reidrata e vai carregar o cursor; ~~**nenhum teste a
   executa**~~ **— falso desde o PR B (2026-08-19): `party/seeds.test.ts` executa sorteio e
   reidratação reais; o que segue sem teste é o `alarm()` + `onMessage`/`onClose`/`encerrar`/CORS** —
   e a consequência já se materializou uma vez (o baseline do 3.5.1 declarou cobertura
   inexistente; M5/M6 no sítio real deixavam a suíte verde). Mitigação **contra M5** segue sendo a
   cerca **textual**, que não pega quem contorna.
   ✅ **PLANO APROVADO PELO DEV em 2026-08-19 — está em `PLANOS_ATIVOS.md` §"SPIKE + COBERTURA DA CASCA"**,
   com as 5 decisões dele (Ramo 1 do `nodejs_compat` + compensador `--dry-run` inegociável em PR A ·
   duas cópias de wrangler · **PR A é SPIKE com go/no-go** · docblock do R4 corrigido no A · MZ vira
   pendência **0(s)**). Três PRs (A/B/C), o A sozinho. ~~**Nada implementado.**~~ **Desatualizado em
   2026-08-19 — ver o ANDAMENTO logo abaixo.**
   ⚠️ **Fecha esta pendência só PARCIALMENTE: ela vai a 🟡, não a ✅** — M5 segue indetectável
   comportamentalmente e `onMessage`/`onClose`/`encerrar`/CORS seguem descobertos.
   📊 **ANDAMENTO em 2026-08-19: PR A ✅ e PR B ✅, ambos mergeados na `main`. PR C NÃO feito.**
   🟡 **STATUS EM 2026-08-20: 🔴 → 🟡, POR DECISÃO DO DEV** (a mesma que adiou o PR C para depois do
   3.5.4). ⚠️ **A redação anterior desta linha dizia o contrário** — *"continua 🔴 e NÃO vai a 🟡
   ainda, porque o 🟡 do plano é depois de A+B+C"* — e foi **corrigida aqui, não só contradita
   abaixo**, pela regra do `CLAUDE.md` §"o `doc-writer` NÃO APAGA": regra nova ao lado da antiga
   contraditória devolve o mesmo estrago, dependendo de qual o leitor achar primeiro.
   🔒 **O que este 🟡 significa EXATAMENTE, para ninguém o ler como mais do que é:** a casca deixou
   de ser terra sem teste (`npm run test:party` 8/8 executa sorteio real e reidratação real), **e**
   o gate do `alarm()` **segue sem nenhum teste que o execute**, junto com `onMessage`, `onClose`,
   `encerrar`, CORS e a propriedade RPC-vs-HTTP. O 🟡 é *"parcialmente coberta"*, não *"o plano
   A+B+C cumpriu"* — o C não foi feito.
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
  🔒 **SEXTA instância (3.5.2, achada pela revisão e CONFIRMADA por mutação, 2026-08-20):** o teste
  `🔴 BASELINE D1: cliente ATRASADO … é ignorado EM SILÊNCIO` rodava com o cursor em **0** e mandava
  o atestado atrasado com `etapa: 0`. A guarda é `etapa < cursor` — **`0 < 0`, nunca entrada.**
  Apagar a guarda deixava a suíte inteira verde (1531/1531). O silêncio observado vinha do balde
  vazio, não da guarda. 🔑 **A regra operacional que esta instância acrescenta às cinco anteriores:
  BASELINE CUJO CENÁRIO NÃO ALCANÇA A GUARDA NÃO É BASELINE** — e o jeito de não repetir é **asserir
  a pré-condição** (aqui: "o cursor ANDOU" e "o balde da etapa velha está POPULADO") em vez de
  supô-la, porque a pré-condição suposta é justamente o que sai do lugar.
  ⚠️ **Irmã dela, na mesma revisão:** a metade 1 da mesma decisão (`atestado.etapa ?? cursor`) não
  tinha teste NENHUM — o mutante `?? 0` sobrevivia a tudo. **Guarda documentada em docblock não é
  guarda testada.**
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
