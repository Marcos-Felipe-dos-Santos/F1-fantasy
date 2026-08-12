# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (fases 6-7) e `HISTORICO_ARQUIVO.md` (fases 0-5,
> encerradas). Não leia nenhum dos dois inteiro — consulte o PR que interessa.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- ✅ **CORRIDA ONLINE INICIANDO — PR 1/4 FEITO em 2026-08-12** (commit `b67ec2b`). **`seedCorrida` entra em `EstadoSalaPublico` como `number | null`, publicada quando o draft concluir.** `pistaSorteada` nova em `src/engine/`, função pura, rótulo próprio `'online:pista'`. Veredito do dev: publicar a seed desde a criação levaria a simular loadouts candidatos durante o draft — mesmo buraco da decisão (b) da fase, com outro nome. Paridade com offline recusada explicitamente: lá é inofensivo porque não há adversário humano.
- **Medido:** `npm test` **1412/56** (era 1398/55), `npm run typecheck` **0**, `eslint src scripts party vite.config.ts` **0**, `npm run build` **0**. `npm run balance` **inalterado** (mudou `src/engine/`, detecta o tripwire de `versao.test.ts` — bump `VERSAO_APP` 3.4.0 → 3.4.2).
- 🔴 **ACHADO DA REVISÃO:** docblock afirmava "da `seedDraft` não se recompõe a `seedMestre`" — afirmação **pré-existente desde 3.1a** e **falsa**. `xmur3` é hash de 32 bits, não função unidirecional; quem enumerar as 2³² sementes contra a `seedDraft` (publicada desde o lobby) recompõe a mestra e com ela a `seedCorrida`, **sem depender do portão**. O portão fecha o caminho trivial (regra do dev: "não é hack, é chamar uma função") — **não** o caminho com script. Alargar a `seedMestre` resolveria de fato, fica como pendência 0(i): mexe na semeadura do online inteiro e no estado persistido do DO.
- 🟡 **LIÇÃO DE TESTE:** nenhum dos nove testes da sala via o portão disparar por caminho REAL — forjavam a fase com `publicarSala` direto. Reescrever `estadoPara` à mão vazaria a `seedMestre` no fio com todos verdes. Entrou teste que dirige draft de verdade até concluir, pelo funil de broadcast — foi visto vermelho nas duas mutações. Sexta ocorrência da classe "o teste afirmava o que não conferia" na Fase 3.

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

## 🌐 FASE 3 — ONLINE: plano aprovado (registrado em 2026-08-12)

> ⚠️ **PLANO REGISTRADO AQUI para não se perder entre sessões.** Ele foi aprovado numa sessão anterior
> mas **não estava documentado**. Ficava só na memória de quem conduziu a sessão.

**Decisão (a) — o alvo é `partyserver` + `wrangler`.** Durable Object comum num projeto Workers. Sala = DO isolado. Motivo medido: `partykit@0.0.115` parado ~11 meses; `partyserver@0.5.10` publicado dias atrás.

**Decisão (b) — SEED POR ETAPA (opção B), o DO guarda a `seedMestre`.** Com seed base completa, qualquer jogador computa corridas futuras no console — não é hack, é chamar uma função. **Custos aceitos:** fork do `iniciarCampeonato`; `campeonatoConcluido` revisto; save do 8.2 sai de cena no online.

**Decisão (c) — divisão 3.1a / 3.1b aprovada.** O 3.1b é onde vive o risco.

**Sequência de PRs — TODOS ALTO RISCO:**
- ✅ **3.0 SPIKE** — go/no-go. **FEITO, GO.**
- ✅ **3.1a, 3.1b** — FEITOS (`246d937`, `2efb145`). Conformidade e commutatividade verdes em 20+ seeds.
- ✅ **3.2** — FEITO (`30e2556`). Servidor magro, cliente com reconstrução incremental.
- ✅ **3.2.1** — FEITO. Token de rejoin, reconexão ativa.
- ✅ **3.3–3.3.4** — FEITOS. Lobby, draft online, F5 e código de sala funcionando.
- ✅ **3.4** — FEITO (`75ccfbe`). Detector de divergência (`versao.test.ts` tripwire).
- ✅ **3.4.1** — FEITO (`615e94f`). Surfacing do alarme — veredito do dev: aprovado.
- **3.5 CORRIDA ONLINE — 4 PRs (seed, pista, coração, barreira, UI)** — Autorizado pelo dev, em planejamento pelo `fable-architect`.

### 🎯 FATIAMENTO DA CORRIDA ONLINE (4 PRs, aprovado em 2026-08-12)

**PR 1/4 — Seed e pista:**
- `seedCorrida: number | null` em `EstadoSalaPublico`, publicada **ao término do draft** (`draft.fase === 'concluido'`).
- `pistaSorteada` pura em `src/engine/pista-sorteada.ts`, rótulo **`'online:pista'`** (não reusar `'calendario'` — faria pista avulsa ser sempre etapa 1 do futuro campeonato).
- Teste discriminante incluído.
- **VEREDITO DA SEED (decisão do dev contra recomendação do arquiteto):** publicar durante o draft permitiria simular loadouts candidatos — buraco idêntico à decisão (b), com nome diferente. Paridade offline recusada: lá pista antes é inofensivo porque não há adversário. **Preço:** `| null` no tipo, ramo no cliente.
- **Consequência:** pista também só aparece no fim do draft, porque deriva dela.
- 🔴 **Achado da revisão:** docblock afirmava falsa segurança sobre recomposição de `seedMestre`. Corrigido. Alargar entropia fica como pendência 0(i).

**PR 2/4 — O coração (corrida no DO):**
- Planejar estrutura.
- **Defesa obrigatória:** UMA função só alimentando hash e `FluxoCorrida`. Mesma classe de bug do 8.4 (duas trilhas, cada lado certo, composição errada, npm test não pega).

**PR 3/4 — Barreira (persistência, se houver tempo):**
- **CORTE Nº 1 se a fase inflar:** derruba este PR, mantém `concluidaEm` no fim do draft.

**PR 4/4 — UI (com portão visual):**
- Player vê a pista, começa a corrida.
- **Portão visual obrigatório:** preview ABERTO e conferido antes de apresentar ao dev.

---

## 🚩 FASE 8 — MODO CAMPEONATO: o plano foi cumprido

**Status:** ✅ Concluída. Seletor de formato, calendário sorteado, telas (calendário com silhuetas, classificação com variação de posição, pódio), persistência, salva/retoma. Fases 0-2, dataset (trilha 4.x), Fase 8 nos PRs 8.1/8.2/8.4-mínimo e a rodada de narração + auto-avanço (A/B/C) — **1412 testes** verdes. Próximo: corrida online.

## Onde parei

**Autorizado e em planejamento:** Fase 3 Item 5 — **Corrida Online** (4 PRs, fatiamento acima). Depois dela, 3.5 (campeonato online).

## SEQUÊNCIA — o que sobrou

1. **3.5 Corrida Online (4 PRs)** — PR 1/4 feito, 2/3/4 aguardando. **CORTE Nº 1 se inflar:** derruba PR 3, mantém `concluidaEm`.
2. ⬅️ **VEREDITO do dev sobre `preview/campeonato.html`** (as três telas do 8.3) — segue aberto.
3. 🛑 **Depois, o pit (7.9).**

## Pendências ATIVAS

0. **Abertas na Fase 3:**
   (a) `montarJogadores` duplicado entre UI e `congelarRoster`. Conformidade vigiada por teste de equivalência; o certo é extrair pra engine. Refactor pequeno, candidato a antes do 3.1b.
   (b) ✅ **`namespaces-seed.ts` FEITO no 3.1b.**
   (c) ✅ **RECONEXÃO FEITA no 3.2.1** — token, `reentrar`, evicção.
   (d) ✅ **`seq` resolvido no 3.2** — incrementa, não muda sob contador congelado. Falta correlacionar erro↔comando.
   (e) ✅ **Prazo do turno tem dono no 3.2** — `alarm()` chama `aoPassarOTempo` a cada 5 s. ⚠️ **Reagenda SEMPRE; quem para é `encerrar()`.** Importa pro plano da corrida online: adiar `concluidaEm` faz o tique voltar. **Afirmação de estado só entra medida.** Falta UI mostrar cronômetro.
   (f) ✅ **3.4 + 3.4.1 feitos (detector + surfacing).** Corrida online é item 1 da SEQUÊNCIA, próximo passo natural.
   (g) 15% perda com conexão intacta não é modo real (TCP entrega ou cai); stress válido, não é modo real.
   (h) Token por origem, não por aba — duas abas do mesmo navegador compartilham token. Não afeta jogo real, corrompe teste próprio. Contorno: segundo navegador ou janela anônima (docs).
   **(i) 🔴 NOVA — `seedMestre` com 32 bits é enumerável** (2³² sementes contra `seedDraft` pública desde lobby). Portão fecha caminho trivial, não script. **Alargar entropia pendente** — mexe na semeadura do online inteiro e DO. Decisão do dev. Registrado em 0(i).

## ✅ RISCO ATIVO FECHADO — divergência do ausente DETECTADA E VISÍVEL

**Registrado como risco pelo dev em 2026-08-09, ao aprovar o portão do 3.1b.** Deixou de ser "diverge
em silêncio" (🔴) para "diverge com alarme que ninguém vê" (🟡) no **PR 3.4**, e foi CONCLUÍDO no **PR 3.4.1** quando o alarme subiu à tela. Ressalvas abaixo registram as limitações que permanecerão.

**O que é.** Quando um jogador abandona, o redutor o marca ausente e **pula a casa dele**. Servidor não pode escolher (não tem dataset); cada cliente escolhe **localmente**. Pool compartilhado de rodada 6. Se dois clientes escolherem **diferentes**, os estados divergem. **Antes:** silencioso. **Agora:** detectado com `EstadoCliente.divergencia`.

**✅ DETECTOR FUNCIONA (PR 3.4):**
- Hash determinístico do draft em `src/net/hash-draft.ts`.
- Handshake de versão em `src/engine/versao.ts`.
- `registrarAtestado` compara strings opacas sem dataset.
- 20 seeds sem sabotagem → alarme limpo.

**RESSALVAS — garantias que o alarme NÃO oferece:**
1. "Na âncora terminal, não no primeiro divergente" — appends rápidos derrubam atestados intermediários.
2. Cliente em cache fica fixo em versão `''` e tranca atuais com `versao-divergente` — erro não diz qual versão esperada.

## Medições e marco

- **1412 testes** (56 arquivos) verdes — medido em 2026-08-12 (PR 1/4 corrida online).
- **`VERSAO_APP` = 3.4.2** (tripwire de `versao.test.ts` para detector da Fase 3).
- ⚠️ Badge do README diz **1094** (estático, desatualizado).
- **Working tree limpa.** Estamos na `main`, HEAD = `b67ec2b`.

## Convenções

- **Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e este
  `ESTADO.md` **reescrito** (substitui, não acumula).
- Previews visuais em `preview/` (gitignored). **Preview gerado só conta como entregue depois de
  MOSTRADO ao dev, com CAMINHO ABSOLUTO.**
- **`referencias/` é gitignored** (imagens de terceiros, GDD §14.2).
- Harness: `npm run balance` embute `--reporter=verbose --silent=false`. Na mão: passar as flags.
- **Nunca ler `src/data/*.json`** (`equipe-anos.json` ≈ 324 mil tokens). Formato: `src/fixtures/dataset-semente/`. Consulta: `jq`/`grep` com filtro.
