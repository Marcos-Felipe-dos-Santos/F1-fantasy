# PLANOS ATIVOS — F1 Fantasy

> **NÃO é leitura de abertura.** Consulte **o plano que interessa**, quando for trabalhar nele —
> igual ao `HISTORICO.md`. O `ESTADO.md` continua sendo o único documento lido por completo em
> sessão nova, e traz ponteiros curtos para as seções daqui.
>
> **Criado em 2026-08-19**, na sessão de higiene do `ESTADO.md` (pendência 8), por decisão do dev.
> Motivo medido: o `ESTADO.md` custava ~50 mil tokens na abertura de toda sessão, e **51% dele eram
> planos de fase** — que se leem uma vez, quando o PR começa, não toda sessão.
>
> 🔒 **REGRA DO ANINHAMENTO, que governou o que veio para cá.** Toda decisão travada, regra
> inviolável ou pendência que vivia dentro das seções movidas **FICOU no `ESTADO.md`**, em bloco de
> retenção — como a §CORRIDA ONLINE já tinha feito. O conteúdo aqui é o **plano**; as **obrigações**
> ficaram lá. Se você chegou aqui procurando uma regra inviolável, ela está no `ESTADO.md`.
>
> ⚠️ **Nada foi resumido.** Tudo abaixo é movido **íntegro**, linha por linha, do `ESTADO.md`.

## Índice

> ✅ **ATUALIZAÇÃO DO ÍNDICE em 2026-08-28 — A FASE 3 ESTÁ ENCERRADA** (decisão ditada pelo dev,
> datada por ele 2026-08-27; proveniência e a lista do que fica aberto no `ESTADO.md`
> §"FASE 3 ENCERRADA"). **Os três primeiros planos abaixo DEIXARAM de ser ativos.** Os rótulos
> antigos ficam riscados, não apagados. **Nada foi movido daqui** — arquivar é decisão do dev, e a
> proposta está registrada no `ESTADO.md`.

- **§FASE 3 — ONLINE: o plano aprovado** — decisões (a)/(b)/(c) e a sequência de PRs 3.0 → 3.5.
  ~~**EM ANDAMENTO.**~~ ✅ **ENCERRADO** (2026-08-27, decisão do dev) · 📦 **ARQUIVADO em 2026-08-28**
  → `HISTORICO.md` §"ARQUIVADO DO `PLANOS_ATIVOS.md` — §FASE 3". **As obrigações ficaram no
  `ESTADO.md`** §"RETIDAS NO ARQUIVAMENTO DO §FASE 3".
- **§3.5 CAMPEONATO ONLINE — o plano aprovado** — `B-indep`, o fatiamento em 4 PRs, o CORTE 3.5-F,
  a cerca textual de M5/M6. ~~**EM ANDAMENTO — o 3.5.1 está feito.**~~ ✅ **ENCERRADO — 3.5.1 a
  3.5.4 entregues e mergeados** · 📦 **ARQUIVADO junto com o §FASE 3**, porque estava **aninhado**
  dentro dele (`###`, não `##`) — o cabeçalho do índice sugeria seção irmã, e não era.
- **§SPIKE + COBERTURA DA CASCA — o plano aprovado** — `@cloudflare/vitest-pool-workers`, os 3 PRs
  A/B/C, os baselines MA/**MC**/MB/MD (MR disqualificada por medição). ~~**EM ANDAMENTO — PR A e PR B
  FEITOS e mergeados na `main` em 2026-08-19; o PR C foi ADIADO pelo dev em 2026-08-20 para DEPOIS
  do 3.5.4.** Sequência: **3.5.2 → 3.5.3 → 3.5.4 → PR C → Fase 3 encerrada.**~~
  ✅ **ENCERRADO — os TRÊS PRs feitos e mergeados** (o C em 2026-08-23), mais o **conserto da 0(s)**
  que o PR C obrigou. ⚠️ **A pendência 9 fica em 🟡, não em ✅:** `onMessage`/`onClose`/`encerrar`/
  CORS seguem sem teste. Ver `ESTADO.md` §Pendências, item 9.
- **§NOMES FICTÍCIOS — o plano dos 7 PRs** — o portão, o funil, as peças + T1, a tabela, o
  `anonimizar` + diferencial, A TROCA, a fixture. ~~**NÃO COMEÇADO — o PR 1 é o próximo.**~~
  🏆 **O ÚNICO PLANO ATIVO DESTE ARQUIVO. PRs 1, 2, 3 e 4 FEITOS e commitados na `main`
  (`fc6fb6a`, `50bda11`, `e501b97`, `cbe2bbc`); o PR 5 (`anonimizar` + diferencial) é o próximo.**
  ⚠️ *(Esta linha é a correção de uma afirmação FALSA — o índice dizia "não começado" com quatro PRs
  entregues. Corrigida junto porque prosa falsa vizinha da que se está corrigindo é a ocorrência
  nº 2 do `CLAUDE.md`, e nenhum teste pega erro factual em `.md`.)*
  ⚠️ **A ORDEM é decisão travada do dev; o DETALHAMENTO de cada PR é proposta minha**, e **4 itens
  dependem dele** (tabela ao fim da seção). ⚠️ **Único plano deste arquivo que NÃO veio do
  `ESTADO.md`** — nasceu aqui, em 2026-08-25.

---

## 📦 §FASE 3 — ONLINE: ARQUIVADO em 2026-08-28 (o plano saiu daqui, íntegro)

**A Fase 3 está ENCERRADA** (decisão ditada pelo dev, datada por ele 2026-08-27 — proveniência e a
lista da dívida que fica no `ESTADO.md` §"FASE 3 ENCERRADA"). O plano da fase, **incluindo a
subseção aninhada `3.5 CAMPEONATO ONLINE`**, foi movido **íntegro** para o `HISTORICO.md`
§"ARQUIVADO DO `PLANOS_ATIVOS.md` — §FASE 3". **Nada foi resumido:** extração por faixa de linha,
com verificação por diferença de conjuntos.

🔒 **AS OBRIGAÇÕES NÃO FORAM COM ELE.** Além das cinco categorias que o dev nomeou (invioláveis do
3.1a/3.1b/3.2, portões obrigatórios do 3.0/3.1b, herança de config do spike, riscos aprovados e o
"harness headless não é opcional"), a leitura do conteúdo achou **mais nove blocos 🔒** sem
contrapartida no `ESTADO.md`. Os nove foram **copiados para lá antes do movimento** —
`ESTADO.md` §"RETIDAS NO ARQUIVAMENTO DO §FASE 3". **Procurando uma regra inviolável da Fase 3? Está
no `ESTADO.md`, não aqui e não no `HISTORICO.md`.**

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
- **PR B — sorteio real e reidratação** (`party/seeds.test.ts`). Baselines **MA** e ~~MR~~ **MC**
  (troca medida e aprovada pelo dev em 2026-08-19 — ver "Os baselines vermelhos").
  **Edita o docblock da cerca textual com a matriz de cobertura** (obrigatório — ver abaixo).
  **+ mede o R4** (decisão do dev, 2026-08-19): se um `Uint32Array` sobrevive ao storage do DO.
- **PR C — gate do `alarm()`** (`party/alarme.test.ts`). Baselines **MB**, **MD** e a anti-vacuidade.
  🔁 **ADIADO POR DECISÃO DO DEV EM 2026-08-20 — NÃO CANCELADO.** Sai da posição "antes do 3.5.2" e
  vai para **depois do 3.5.4**, antes de declarar a Fase 3 encerrada. **Sequência:
  3.5.2 → 3.5.3 → 3.5.4 → PR C → Fase 3 encerrada.**
  **Motivo do dev:** o 3.5.2 exercita `onMessage` de qualquer forma ao testar o cursor, e cobertura
  defensiva **rende mais depois de a lógica existir** — o C feito agora seria moldado ao código de
  ontem; feito depois, é moldado aos bugs reais que a casca revelar.
  ⚠️ **A frase do topo desta seção — "Vem ANTES do 3.5.2, e o motivo é de método" — vale para o PR A
  (que veio antes e está feito), NÃO mais para o C.** Corrigido aqui em vez de só contradito, pela
  regra do `CLAUDE.md` §"o `doc-writer` NÃO APAGA".
  🔁 **GATILHO DE REAVALIAÇÃO:** se o 3.5.2 ou o 3.5.3 revelarem na casca um bug que MB/MD teriam
  pego, **puxar o C para a frente** em vez de seguir a sequência.
  🛑 **Preço aceito, e ele não muda por ter sido aceito:** o 3.5.2 nasce na única parte da casca sem
  cobertura, e a **pendência 0(s)** (sala-zumbi) segue **não confirmada** — quem a confirmaria é o
  harness que o C constrói. Os baselines **MB**, **MD** e a **anti-vacuidade** continuam válidos
  como especificados acima; nada neste adiamento os reabre.

### Os baselines vermelhos

**Critério em todos: `src/net/campeonato-online.test.ts` (a cerca textual) VERDE e o teste novo
VERMELHO, na MESMA invocação. Par OBSERVADO, não raciocinado** — raciocinar sobre cerca é o que já
falhou duas vezes neste projeto.

- 🔑 **MA — `todas[MAX_ETAPAS] = todas[0]`** na linha antes de `criarServidor` (`party/sala.ts:96`).
  **É o furo ENUMERADO da cerca textual**, então ela fica VERDE e o teste novo cai em 100% das salas.
  **Era essencial não usar M5/M6 como baseline:** a cerca textual já pega as duas, as duas cercas
  ficariam vermelhas juntas e o PR não provaria nada sobre o teste NOVO.
  N = 5 salas, não 20 (MA cai já na primeira; salas extras compram largura, não força).
- ❌ **MR — `const todas = slots`** (sem `Array.from`) — **DISQUALIFICADO POR MEDIÇÃO em 2026-08-19,
  na abertura do PR B. Substituído por MC, com aprovação do dev.** Dois motivos independentes,
  qualquer um sozinho já bastando:
  1. a cerca textual tem uma **quarta** exigência que este plano não considerou
     (`campeonato-online.test.ts`, *"a casca converte pra number[] antes de guardar"*, casando
     `const todas = Array.from(slots)`): sob MR ela fica **VERMELHA** — medido — e as duas cercas
     caindo juntas é exatamente por que M5/M6 já tinham sido recusadas como baseline;
  2. `Uint32Array` não é atribuível a `number[]` ⇒ **TS2740** — medido —, e **vermelho de compilação
     não conta como baseline** (regra travada da §3.5).
  ⚠️ A nota original *"`isolatedStorage` (ligado por padrão) desfaz escritas entre testes"* também
  foi refutada pelo PR A: **a opção não existe mais na v0.22** e o storage ATRAVESSA os `it`s.
- 🔑 **MC — `carregar()` deixa de ler o estado persistido** (`party/sala.ts:69`), o requisito (a) do
  dev. **Medido antes de escrever o teste:** cerca textual **VERDE 36/36**, `typecheck` **0**,
  `lint` **0** — nenhuma das cinco exigências da cerca toca `carregar()`.
  🔴 **O furo que MC conserta, e que era maior que a troca de mutação: NENHUM baseline do plano
  original exigia o `evictAllDurableObjects()`.** MA cai na criação; MR também (a sala vira
  `corrompida` já ali — o próprio R4 admite). A metade REIDRATAÇÃO sairia com **cobertura declarada
  e não provada**, que é a forma exata do defeito do baseline do 3.5.1 — dentro do PR que existe
  para fechar essa pendência. O vermelho de MC pousa **DEPOIS** do evict, na asserção de
  reidratação: a sala se **re-cria e re-sorteia**.
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

| Mutação | cerca textual | comportamental | serve de baseline? |
|---|---|---|---|
| **M5** (derivar por índice) | SIM | **NÃO, nunca** | — |
| **M6** (calendário = `todas[0]` no literal) | SIM | SIM | não: a cerca cai junto |
| **MR** (sem `Array.from`) | **SIM — medido** | SIM | **não**: cerca cai + TS2740 |
| **MA** (`todas[MAX_ETAPAS] = todas[0]`) | **NÃO — medido** | SIM | ✅ sorteio |
| **MC** (`carregar()` não lê o storage) | **NÃO — medido** | SIM | ✅ reidratação |

**Cada célula desta matriz foi MEDIDA em 2026-08-19** aplicando a mutação à árvore real e rodando as
duas suítes — não deduzida da leitura. A cópia canônica vive no docblock da cerca
(`src/net/campeonato-online.test.ts`), escrita pelo PR B.

🔒 **A CERCA TEXTUAL PERMANECE, E PERMANECE POR CAUSA DE M5.** Sem essa frase no docblock, o próximo
leitor a apaga citando a cobertura comportamental nova — é o risco R3 do plano.
**A pendência 9 vai de 🔴 para 🟡, NÃO para ✅:** depois de A+B+C, `onMessage`, `onClose`, `encerrar`,
CORS e a propriedade RPC-vs-HTTP seguem sem cobertura.
⚠️ **CORREÇÃO DE FATO em 2026-08-20: o 🟡 foi marcado com A+B feitos e o C ADIADO** — decisão do dev,
não cumprimento do plano acima. **Consequência a não perder de vista:** neste 🟡 o **gate do
`alarm()` também está descoberto**, o que não estaria na versão A+B+C.
Também seguem fora: `FluxoOnline.tsx`
(workerd não é jsdom — **não muda nada** em 0(m)/0(j)), fan-out REAL (latência, concorrência de
borda, hibernação de verdade), token por origem 0(h) e o brute-force de 2³² de 0(i).

### ✅ R4 — o docblock de `party/sala.ts:90-92` está REFUTADO pela medição do 0(p) — RESOLVIDO NO PR B

O comentário afirma que o estado *"é persistido via **JSON**, e um `Uint32Array` round-trip vira
`{"0":…}`"*. 🔑 **JSON não está no caminho:** o despejo do dev (pendência 0(p), 2026-08-19)
estabeleceu que `ctx.storage.put` grava **V8-serializado** na `_cf_KV` — foi por isso que o
`despejar-seeds.ts` precisou do `node:v8`. **É afirmação técnica errada em código de produção.**
- ❌ ~~**MR continua baseline VÁLIDO**~~ — **DERRUBADO em 2026-08-19 pela medição do PR B. Ver "Os
  baselines vermelhos" acima: MR derruba a cerca textual E dá TS2740.** A linha original ficava a
  duas telas da disqualificação e as duas se contradiziam — é a forma exata de defeito que o
  `CLAUDE.md` §"o `doc-writer` NÃO APAGA" registra: *regra nova ao lado da antiga contraditória
  devolve o mesmo estrago, dependendo de qual o leitor achar primeiro*. Por isso ela foi corrigida
  aqui, e não só acrescentada lá.
  **O que da linha antiga PERMANECE VERDADEIRO e por isso fica:** `estadoDasSeeds` usa
  `Array.isArray` (`src/net/sala.ts:192`) e um `Uint32Array` reprova ali; e o desfecho é a sala
  virando **`corrompida` e RECUSADA**, não "as seeds somem e as etapas futuras são re-sorteadas em
  silêncio". Isso descreve corretamente o COMPORTAMENTO — só não faz de MR um baseline utilizável.
- 🔒 **O teste tem que asserir o comportamento OBSERVADO, não o docblocado.**
- ✅ **FECHADO POR MEDIÇÃO NO PR B (2026-08-19).** Era: *"se o `Uint32Array` sobrevive ao V8
  (structured clone normalmente preserva typed arrays, mas **não foi executado em workerd**)"*.
  **Executado agora, em workerd de verdade** (`party/seeds.test.ts`, bloco R4): `put` de um
  `Uint32Array` → `evictAllDurableObjects()` → `get` devolve **`Uint32Array`**, íntegro. Ele
  **sobrevive**.
  🔑 **Consequência: `Array.from` na fronteira é NECESSÁRIO, e o desfecho real é o pior dos dois
  para diagnosticar.** Não é "as seeds viram `{"0":…}` e somem": elas voltam perfeitas, e mesmo
  assim `estadoDasSeeds` reprova no `Array.isArray` ⇒ sala **`corrompida`, recusando todo mundo**.
  A legenda *"exatamente o que M1 produz: objeto indexado"* em `campeonato-online.test.ts` foi
  corrigida pelo PR B — o caso de teste continua válido, a legenda é que estava errada.

---

## 🎭 NOMES FICTÍCIOS — o plano dos 7 PRs (registrado em 2026-08-25)

> 📌 **PROVENIÊNCIA, e ela é dupla — ler antes de tratar qualquer linha daqui como aprovada.**
> **A ORDEM dos 7 PRs é do dev**, ditada em 2026-08-25, e está travada no `ESTADO.md`
> §"NOMES FICTÍCIOS — DECISÕES DO DEV". **O DETALHAMENTO de cada PR abaixo é MEU**, reconstruído a
> partir das decisões travadas (P/T/H) e das medições registradas — **não foi ditado pelo dev e não
> é decisão travada.** Cada PR traz explícito o que ainda **depende dele**.
> ⚠️ **Nada aqui foi copiado do `e1db1c9`** (revertido em `ca53059` por gravar aprovações que nunca
> existiram). Onde este plano precisou de um número, ele foi **medido nesta sessão** ou citado do
> registro que já traz o método. **Uma afirmação daquele commit foi REFUTADA ao medir** — ver
> "as duas medições novas", logo abaixo.
> ⚠️ **Exceção declarada ao cabeçalho deste arquivo** (linha 16, *"tudo abaixo é movido íntegro do
> `ESTADO.md`"*): esta seção **nasceu aqui**, não foi movida. É o primeiro plano escrito direto
> neste arquivo.

### 🔴 AS DUAS MEDIÇÕES NOVAS DESTA SESSÃO — e as duas mudam o plano

**📏 MEDIÇÃO 1 — `deriveSeed` CONSOME, SIM, nome de equipe e id de dataset: pelo `hashDoDraft`.**
**Método:** enumerados os sítios de produção de `deriveSeed(` em `src/` (`grep`, fora de `.test.`) e
lida a carga de cada hash. **Resultado, e ele se divide em dois:**
- ✅ **Nenhuma seed que alimenta a SIMULAÇÃO consome nome de dataset.** Os rótulos dinâmicos
  consomem `jogadorId` (`corrida.ts:187`, `quali.ts:61`, `draft.ts:69`, `:108`), `botId`
  (`bots.ts:104`, `:144`), `pistaId` (`campeonato.ts:39`) ou literal fixo (`'bots'`, `'calendario'`,
  `'corrida:clima'`, `'draft:ordem-peca'`).
- 🔴 **Mas o `hashDoDraft` consome os dois.** `src/net/hash-draft.ts:109-110` faz
  `deriveSeed(0, 'online:hash-draft:a:' + carga)`, e a `cargaCanonica` inclui
  **`${r.equipe}@${r.ano}`** (`:68`) **e os ids de loadout** — `pilotoId`, `chassiId`, `motorId`,
  `estrategistaId`, `pitId`, `pecaId` (`:64-66`).
- ✅ **E o `hashDaCorrida` NÃO consome nenhum dos dois:** a carga dele é `pistaId`, `jogadorId`,
  `posicao`, `status`, `tempoTotal` e `historicoVoltas` (`src/net/hash-corrida.ts`,
  `cargaCanonica`).
🔑 **Isto REFUTA a afirmação do `e1db1c9`** de que *"`deriveSeed` NUNCA consome id de dataset, 100%
dos sítios de produção enumerados"* — e ela era load-bearing lá, usada para concluir "a corrida
inteira é idêntica bit a bit". **A conclusão certa é mais estreita e continua boa:** a **simulação**
é invariante à troca; o **hash do draft** não é, e muda por desenho.
🟢 **E o plano GANHA com a refutação, porque ela entrega o instrumento de prova do PR 6 pronto:**
`hashDaCorrida` **tem de ficar IDÊNTICO** antes/depois da troca, na mesma seed, e `hashDoDraft`
**tem de DIFERIR**. O segundo é a **cláusula anti-vacuidade de graça** — se os dois hashes baterem,
o `anonimizar` degenerou em cópia.

**📏 MEDIÇÃO 2 — o save GUARDA os ids, então trocar id invalida save, e o mecanismo já existe.**
**Método:** `src/ui/persistencia.ts` valida `ehLoadoutValido` com `pilotoId`…`pecaId` (`:144-154`) e
o docblock (`:5-8`) diz que a entrada persistida é `seed` + `DraftState` — **de onde saem os
loadouts**. **O portão de formato já existe:** `VERSAO_FORMATO = 1` (`:42`), e `:314-315` devolve
`versao-incompativel`. 🔑 **O custo de id novo não é "quebra saves em silêncio": é bump de UMA
LINHA**, e save antigo é descartado limpo. Vale para **peça (PR 3)** e para **piloto/chassi/motor/
estrategista/pit (PR 6)** — os dois mexem em id.

### O que este plano NÃO reabre

🔒 As decisões **P** (as 10 peças perdem marca e código de modelo, ids mudam junto), **T1**
(Montreal), **T2 adiada** e **H (a)** (aceitar o resíduo do histórico) estão travadas no `ESTADO.md`
e são **insumo, não pauta**. **Renomear as outras 9 pistas está fora** — o teste cego 10/10 provou
que a geometria carrega a identificação.

### Os 7 PRs

**1. PORTÃO — ✅ FEITO em 2026-08-25.** `scripts/portao-nomes-reais.test.ts` +
`scripts/caminhos-dataset.ts`. **Medido:** `npm test` **1603/65** (era 1592/64), typecheck **0**,
eslint **0**. **BAIXO RISCO** — zero diff de comportamento. **5 mutações, todas VERMELHAS**,
revertidas **por cópia** (o arquivo ainda não estava commitado — lição do 3.5.3) e cada reversão
conferida por `git hash-object`.
🔑 **BASELINE MEDIDO — 9.522 ocorrências em 6 arquivos**, universo de **909 agulhas**
(916 − 7 deduplicadas: `brabham`, `mclaren`, `hill`, `prost`, `stewart`, `surtees`, `fittipaldi`
foram piloto **E** construtor). Números por arquivo no `BASELINE` do próprio teste.
🔑 **DOIS DESVIOS MEUS EM RELAÇÃO AO HANDOFF, os dois medidos e declarados:**
- **Os IDs entraram no universo, além dos nomes exibidos.** O handoff dizia "105/353"; medido, um
  portão só de nomes exibidos é **cego a `red-bull-2023-piloto-fangio`**, porque o id é o nome
  slugado e minúsculo e a varredura é sensível a caixa. **Mutação M4 confirma:** tirar os ids deixa
  `pistas.json` **verde** e derruba só 5 dos 11. O universo continua saindo de
  `fatos-agregados.json` e a anti-vacuidade continua sendo 105/353 — agora em quatro campos.
- **Fronteira não-alfanumérica nos dois lados.** Sem ela a métrica é o **substituto 2 reprovado**
  renascendo: `rb` (Red Bull) casa dentro de `Nürburgring` e `pistas.json` acusava **4 ids
  fantasma** em vez de 0; `sala`, `hall`, `massa`, `pace` e `gene` são driverIds reais que colidem
  com palavra comum. **Não entrou allowlist** — a sobre-contagem conhecida (`massa` em
  `peca-amortecedor-massa-renault`, 2 por arquivo de peças) fica **contada e registrada**, porque
  portão que sobre-conta é seguro e o que sub-conta mente.
🔑 **O PAR ANTI-VACUIDADE TEM AS DUAS METADES LOAD-BEARING, e isso foi medido, não suposto:**
**M5** (carregador devolve vazio) derruba a asserção **105/353**, mas **M2** (a união deduplicada
vira `[]`) **NÃO a derruba** — quem pega M2 é a asserção das **909**. São modos de falha diferentes;
apagar qualquer uma das duas deixa um buraco.
⚠️ **O QUE O PORTÃO NÃO COBRE, escrito no docstring dele:** código-fonte `.ts`/`.tsx` (é o PR 2),
o **bundle** (é o PR 6 e a definição de pronto) e `scripts/derived/` (é o próprio universo — contar
lá seria circular). **Quem ler este teste verde e concluir "não há nome real no repo" está errado.**

*(Plano original do PR 1, preservado:)*
**PORTÃO — a cerca que conta nome real, com o universo declarado DENTRO do teste.**
- **O que:** teste novo que varre o repositório procurando os nomes reais e falha se a contagem
  passar de um teto commitado. **O baseline nasce no número de hoje** e daí em diante só encolhe.
- 🔒 **VARREDURA DE TEXTO CRU, NUNCA CAMINHADA POR CAMPO.** É o sítio `derivar-notas.ts:719` que
  dita isto: o nome da equipe está **dentro de uma string interpolada**
  (`Estrategista ${equipe.nome} ${season}`), não num campo próprio. **Enumeração de campo já falhou
  aqui uma vez** — foram três sessões contando 3 sítios de normalização quando eram 4.
- 🔒 **O UNIVERSO ENTRA ESCRITO NO TESTE.** Foi a ausência de método registrado que aposentou a
  contagem 33/6/2 como não-falsificável; e está medido no `ESTADO.md` que a contagem nº 3 (em disco,
  menos `node_modules`/`scripts/cache`/`src/fixtures`) e a nº 4 (`git ls-files`) **divergem
  legitimamente**, por terem universos diferentes. Cerca sem universo escrito repete o 33.
- 🔒 **ANTI-VACUIDADE OBRIGATÓRIA:** o teste tem de provar que **acha** nome real (asserção sobre um
  literal conhecido), senão uma varredura quebrada passa como "zero ocorrências".
- ⚠️ **PENDENTE DO DEV — qual universo o portão mede.** Recomendo os **dois, em camadas**:
  **(a)** cerca sobre **fonte rastreada** (`git ls-files`, `.ts/.tsx/.mjs/.js` fora de `src/data/`),
  rodando em todo `npm test` — barata, mas é **proxy**, e proxy foi o que aposentou a contagem nº 2;
  **(b)** verificação sobre o **BUNDLE**, que é a contagem nº 5 e a única que decide o deploy — cara
  demais para o `npm test` (exige `npm run build`), então entra como passo do PR 6 e da definição de
  pronto. **Se o dev quiser só uma das duas, é decisão dele.**
- **Risco:** BAIXO (arquivo de teste novo, zero diff de produção).

**2. FUNIL DE LITERAIS — refactor verde→verde, nenhum comportamento muda.**
- **O que:** os literais de nome real espalhados em `scripts/` passam a sair de **um sítio só**.
  Alvos medidos: **`scripts/balance.ts:50`** — `.find((e) => e.equipe === 'Red Bull' && e.ano ===
  2023)`, com `throw` em `:52`; e **`scripts/dataset-report.ts:162`**, que **não lança** (o
  `encontrarEquipe` de `:150-152` é `.find()` puro, e o bloco é rotulado no próprio código, `:155`,
  como *"informativo — não falha o script"*) — **degradação SILENCIOSA, e é a que mais interessa
  funilar.**
- 🔑 **Por que ANTES da troca:** com o funil, o PR 6 troca **um** literal em vez de caçá-los; e o
  contraste "um quebra alto, o outro degrada em silêncio" deixa de existir.
- **Portão:** `npm test` inalterado + **`npm run balance` com `--reporter=verbose`** devolvendo os
  **mesmos números** — é refactor, então **delta ZERO é a asserção**.
- **Risco:** BAIXO (sem mudança de comportamento). ⚠️ Toca o harness, então o `balance` roda.

**3. ✅ PEÇAS DESPIDAS + T1 — o primeiro PR que mexe em `src/data/` (e501b97, ⚠️ portão visual ABERTO).**
- **O que:** as 10 peças da decisão P perdem marca e código de modelo, **no nome e no id**; e
  `pistas.json` troca `"Montreal (Gilles Villeneuve)"` por `"Montreal"` — só o nome exibido, com
  `"id": "pista-montreal"` **intocado** (conferido em `pistas.json:93-94`).
- 🔴 **ALTO RISCO pela letra do `CLAUDE.md`** — `src/data/` não tem isenção por tamanho de diff.
  **Não estou rebaixando:** o diff é pequeno e curado à mão, mas a regra classifica assim, e
  classificação se anuncia antes de começar, não se negocia depois.
- 🔑 **`pecas.json` NÃO É DERIVADO — é curado à mão** (medido). **Nenhuma solução na camada do
  pipeline o alcança**, e é por isso que ele tem PR próprio em vez de entrar na troca do dataset.
- **Dois bumps obrigatórios, os dois medidos:** `VERSAO_FORMATO` (`persistencia.ts:42`), porque
  `pecaId` está no save; e **`VERSAO_APP`**, porque o digest cobre `src/data/**`.
- ⚠️ **PENDENTE DO DEV — as 10 strings de id.** A decisão P trava os **nomes** e o fato de que "os
  ids mudam junto"; **não trava o formato do id**. A derivação óbvia é tirar o sufixo de marca
  (`peca-efeito-solo-lotus-79` → `peca-efeito-solo`), e é o que proponho — mas id é dado
  **persistido**, então as 10 strings se confirmam antes de escrever.
- 🔑 **É de propósito que as peças venham ANTES da troca grande:** elas fazem o baseline do portão
  do PR 1 **cair pela primeira vez**, com um diff pequeno e reversível. **Cerca cujo número nunca
  se mexeu é cerca não exercitada.**

**4. TABELA DE NOMES FICTÍCIOS — arquivo novo que ninguém consome ainda.**
- **O que:** a tabela `nome real → nome fictício`, **sem nenhum consumidor**. Entra sozinha para
  poder ser lida e corrigida sem quebrar nada.
- **Tamanho derivado das medições:** **105** nomes de equipe + **353** nomes exibidos de piloto =
  **458** entradas; a bijeção é 1:1 nos dois níveis (105↔105, 353↔353), então a unicidade de
  `equipe::ano` (`src/engine/dataset.ts:270`) sobrevive **por construção**. ⚠️ **A aritmética é
  derivada de números medidos; a DECISÃO de fazer uma tabela de 458 linhas é proposta minha.**
- ⚠️ **PENDENTE DO DEV, e é o maior item aberto do plano: QUEM inventa os 458 nomes, e com que
  critério.** É decisão de **produto** (sabor do jogo), da mesma natureza da decisão P — não de
  pipeline. **Não escrevo nome nenhum sem isso.**
- **Risco:** BAIXO (nada importa o arquivo ainda).

**5. `anonimizar.ts` + TESTE DIFERENCIAL — a máquina, com `src/data/` INTOCADO.**
- **O que:** o script que aplica a tabela sobre o dataset derivado, e o teste que compara os dois
  lados. **`src/data/` não é tocado neste PR** — é o ensaio antes da troca.
- 🔒 **A PROVA sai da MEDIÇÃO 1 acima:** mesma seed, dataset real × dataset anonimizado ⇒
  **`hashDaCorrida` IDÊNTICO** (a simulação não vê nome) **e `hashDoDraft` DIFERENTE** (ele consome
  `${equipe}@${ano}` e os ids de loadout). **A segunda metade É a cláusula anti-vacuidade** — se os
  dois hashes baterem, `anonimizar` virou cópia e o teste tem de ficar vermelho.
- 🔒 **Assertar também que TODO `equipe`, `pilotos[].nome`, `id` e `estrategista.nome` DIFERE** — e
  o `estrategista.nome` está nessa lista **por causa do `:705`**, que é justamente o campo que uma
  implementação por caminhada de campo esqueceria.
- 🔴 **AQUI ENTRA A CÓPIA MANUAL, e é a medição com mais chance de morder na execução.**
  `src/data/equipe-anos.json` é **cópia byte a byte** de `scripts/derived/equipe-anos.derivado.json`
  (mesmo `git hash-object`), **nenhum script faz a cópia**, e **nada falha se os dois divergirem**.
  Este PR tem de dizer, explicitamente, **sobre qual artefato o `anonimizar` roda** e **em que
  momento a cópia acontece** — senão o PR 6 herda um passo manual sem guarda bem no meio da troca.
- ~~⚠️ **PENDENTE DO DEV:** transformar essa cópia em script/cerca, **ou** mantê-la manual e
  documentada. Não decido sozinho; a medição só diz que hoje **não existe guarda**.~~
  ✅ **RESPONDIDA em 2026-08-28: MANTIDA MANUAL E DOCUMENTADA neste PR**, e transformada em script
  só no **PR 6**. O `anonimizar` roda sobre `equipe-anos.derivado.json` e escreve
  `equipe-anos.anonimo.json` (gitignorado). 🔴 **A cópia manual segue viva e sem guarda até o PR 6** —
  está escrito em `caminhos-dataset.ts`, `portao-nomes-reais.test.ts`, `referencias-dataset.ts` e no
  docblock do próprio `anonimizar.ts`, de propósito.
- ~~**Risco:** BAIXO no diff~~ **MÉDIO RISCO — rótulo do dev, 2026-08-28** (script + teste,
  `src/data/` intocado) — **mas é este PR que define se o 6 é seguro.**
- ✅ **FEITO em 2026-08-28** (`3d5f105`). **A previsão do 🔒 acima se confirmou por medição:**
  `hashDaCorrida` **idêntico** (`5c5d79c59c57ed0b`) e `hashDoDraft` **diferente**
  (`9e7f69dc90bc62e6` → `6dff30f70d22f7d9`). ⚠️ **Uma afirmação deste plano ficou CURTA:** o texto
  tratava a metade "IDÊNTICO" como consequência esperada, e **três dos seis mutantes a derrubam**
  (`M-parordem`, `M-ordem`, `M-notas`) — ela é asserção com dentes, não decoração. Detalhe em
  `HISTORICO.md` §"NOMES FICTÍCIOS — PR 5".
  ⚠️ **Correção de âncora: o `estrategista.nome` é interpolado em `derivar-notas.ts:719`, não `:705`**
  (o `:705` do texto acima envelheceu com o arquivo).

**6. A TROCA — `src/data/` passa a ser fictício.**
- 🔴 **ALTO RISCO, sem discussão:** `src/data/` + balanceamento + o que vai no bundle.
- **Portões, e nenhum é opcional:**
  - **Baseline vermelho primeiro** (regra de mudança de lógica do `CLAUDE.md`).
  - **`npm run balance` com `--reporter=verbose`, DELTA ZERO nos números**, e o diff **LIDO**, não
    só `exit 0`. 🔑 **Delta zero é PREVISÍVEL mecanicamente, não esperança:** as notas computam
    sobre pools de percentil chaveados por `driverId`/`constructorId`, e o rótulo não entra em conta
    nenhuma (`derivar-notas.ts:482`, `:584`). **Delta ≠ 0 é bandeira vermelha, não ruído.**
    ⚠️ **O contraste que discrimina:** um rename de **pista** daria delta ≠ 0 (a seed da etapa
    muda) — é exatamente por isso que a T2 ficou de fora desta trilha.
  - **Bump de `VERSAO_APP`** (o digest cobre `src/data/**`) **e de `VERSAO_FORMATO`** (os ids de
    piloto/chassi/motor/estrategista/pit estão no save).
  - **O portão do PR 1 cai para perto de zero** — e é aqui que ele prova que serve para algo.
- ✅ **O hash do protocolo não vira divergência entre builds**, e isso já estava medido: o handshake
  de `VERSAO_APP` (`servidor-sala.ts:780`, recusa em `:789` e `:891`) separa builds, e o digest
  força o bump. Dentro de uma sala, todos rodam o mesmo dataset ⇒ hash consistente por construção.

**7. FIXTURE E BASELINE A ZERO — o PR que fecha o círculo.**
- **O que:** `src/fixtures/dataset-semente/equipe-anos.json` (243 ocorrências) também troca — ela
  tem **Ferrari, McLaren, Williams, Schumacher, Prost, Senna** — e o teto do portão do PR 1 desce
  ao número final. ⚠️ **`src/fixtures/dataset-semente/pecas.json` JÁ foi trocado no PR 3** — ela
  entrou cedo pela **decisão de plano: evitar duas grafias vivas do mesmo id durante os PRs 3–6.**
  (Ver `HISTORICO.md` §"NOMES FICTÍCIOS — PR 3" e `src/fixtures/referencias-dataset.ts:50-73`.)
- 🔑 **Por que a fixture não pode ficar de fora:** ela é **o artefato que existe para ser lido com
  segurança** (regra inviolável do `CLAUDE.md` §"Leitura de `src/data/`"). Deixá-la com nome real
  faz a próxima sessão voltar a ler nome real **justamente no arquivo criado para evitar isso**.

### Riscos do plano

🔴 **`dist/` OBSOLETO É O ÚNICO RISCO QUE REALIZA O DANO COM TODO O CÓDIGO CORRETO — e ele existe
AGORA, medido nesta sessão.** `dist/` é gitignored (`.gitignore:2`) **e está em disco**, com
`dist/assets/index-C10zYSkb.js` — **exatamente o arquivo da contagem nº 5**, aquele em que foram
medidos 105/105 nomes de equipe, 1.542/1.542 ids de piloto e 353/353 nomes exibidos. **Deploy a
partir desse `dist/`, depois da troca, embarca os nomes reais e NENHUM teste falha.**
🔒 **"Rebuildar antes do deploy" entra na definição de pronto do PR 6.**

~~🟢 **A cópia manual `derived → src/data/` — RESOLVIDA POR DECISÃO em 2026-08-25: vira script.** O
`anonimizar.ts` do PR 5 passa a fazer a escrita e o passo manual morre ali; o destino já está
declarado em `scripts/caminhos-dataset.ts` (`PUBLICADO_EQUIPE_ANOS`). **Segue listado como risco
até o PR 5 existir** — hoje a cópia continua manual e sem guarda.~~
🔴 **O RISCO NÃO FOI RESOLVIDO — SEGUE 🟠 ABERTO, e a linha riscada acima é por que ele quase saiu
da lista sem ter sido tratado.** Decisão do dev de 2026-08-28: **o PR 5 não escreve em `src/data/`**;
a publicação é o **PR 6**. **O PR 5 existe e foi feito** (`3d5f105`) **e a cópia continua manual e
sem guarda** — ou seja, a condição de saída que a linha antiga fixava ("até o PR 5 existir") se
cumpriu **sem** que o risco fosse tratado. **A condição correta é: até o PR 6 publicar.**

🟠 **`pecas.json` é curado à mão** — nenhuma automação do pipeline o alcança, e é por isso que ele
tem PR próprio (3) em vez de entrar na troca (6).

⚪ **O que este plano explicitamente NÃO resolve:** o **histórico do git** (decisão H (a): resíduo
aceito, repo privado) e a **pendência 0(z)** (rename de pista degrada em silêncio), que só seria
tocada se a T2 voltar.

### Pendências do dev, reunidas

| PR | o que depende dele | resposta do dev (2026-08-25) |
|---|---|---|
| 1 | qual universo o portão mede | ✅ `scripts/derived/fatos-agregados.json`, lido pela constante única de `scripts/caminhos-dataset.ts` |
| 3 | as 10 strings de **id** de peça | ✅ derivadas do nome despido, **mesmo esquema atual, sem esquema novo**: `peca-f-duct-mclaren` → `peca-f-duct` |
| 4 | quem inventa os 458 nomes e com que critério | ✅ critério abaixo; **amostra de 20 ao dev ANTES de commitar as 458** |
| 5 | a cópia `derived → src/data/` | ~~✅ **vira script** — o `anonimizar.ts` do PR 5 faz a escrita e o passo manual morre ali~~ 🔴 **SUPERADA em 2026-08-28: `src/data/` INTOCADO no PR 5; a cópia manual morre no PR 6.** Ver abaixo |

🔒 **DECISÕES DO DEV DE 2026-08-25 — as quatro pendências acima estão FECHADAS. Não reabrir.**

- **PR 1 — universo:** `fatos-agregados.json` via `scripts/caminhos-dataset.ts`. ✅ **FEITO** — ver
  o bloco do PR 1 acima.
- **PR 3 — ids de peça:** derivados do nome despido, **mesmo esquema de hoje**. Exemplo travado pelo
  dev: `peca-f-duct-mclaren` → `peca-f-duct`. **Nada de esquema novo de id.**
- 🔒 **PR 4 — critério dos 458 nomes, palavras do dev:** *"nomes plausíveis de equipe e piloto de
  automobilismo, sem semelhança com nome real, sem trocadilho com marca"*. **A cerca de
  quase-marca valida.** 🛑 **E o PR 4 tem portão de aprovação próprio: amostra de 20 mostrada ao
  dev ANTES de commitar as 458.** Não é sugestão — é a condição de entrega do PR.
- ~~🔒 **PR 5 — a cópia manual MORRE ali.** `anonimizar.ts` passa a escrever em `src/data/`, e o
  destino já está declarado em `scripts/caminhos-dataset.ts` (`PUBLICADO_EQUIPE_ANOS`, criado no
  PR 1 justamente para isso). **Some a medição "cópia byte a byte sem guarda nenhuma"** — que era o
  risco 🟠 listado acima.~~
  🔴 **SUPERADA POR DECISÃO DO DEV EM 2026-08-28 — riscada no lugar, não contradita ao lado.**
  A decisão nova, dita por ele três vezes: **o PR 5 lê `equipe-anos.derivado.json` e escreve
  `equipe-anos.anonimo.json`, com `src/data/` INTOCADO.** O PR 5 é o **ensaio**, não a troca.
  🔴 **Consequência, e ela é o OPOSTO do que a linha riscada prometia: a cópia manual NÃO morreu no
  PR 5 — ela morre no PR 6**, que é quem publica. **O risco 🟠 acima NÃO sumiu**; segue de pé, com
  a mesma medição ("cópia byte a byte sem guarda nenhuma"), até o PR 6. Palavras do dev:
  *"escreva isso explicitamente para ninguém ler 'morreu no 5'."*
  ➕ **Decisão do dev na mesma data:** `equipe-anos.anonimo.json` **NÃO é commitado** — *"arquivo
  derivado commitado é a segunda fonte que precisa concordar com a primeira, o defeito que o
  `caminhos-dataset.ts` existe para matar."* O diferencial opera sobre o **retorno em memória** da
  função pura; o `npm run dataset:anonimizar` escreve em disco quando alguém precisar.
  ✅ **PR 5 FEITO em 2026-08-28** (`3d5f105`) — ver `HISTORICO.md` §"NOMES FICTÍCIOS — PR 5".

