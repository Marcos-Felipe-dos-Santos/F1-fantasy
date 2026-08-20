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

- **§FASE 3 — ONLINE: o plano aprovado** — decisões (a)/(b)/(c) e a sequência de PRs 3.0 → 3.5.
  **EM ANDAMENTO.**
- **§3.5 CAMPEONATO ONLINE — o plano aprovado** — `B-indep`, o fatiamento em 4 PRs, o CORTE 3.5-F,
  a cerca textual de M5/M6. **EM ANDAMENTO — o 3.5.1 está feito.**
- **§SPIKE + COBERTURA DA CASCA — o plano aprovado** — `@cloudflare/vitest-pool-workers`, os 3 PRs
  A/B/C, os baselines MA/MR/MB/MD. **EM ANDAMENTO — o PR A é o próximo trabalho do projeto.**

---

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


---

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


---

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

