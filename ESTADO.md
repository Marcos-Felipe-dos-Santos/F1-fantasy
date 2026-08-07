# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (fases 6-7) e `HISTORICO_ARQUIVO.md` (fases 0-5,
> encerradas). Não leia nenhum dos dois inteiro — consulte o PR que interessa.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- **Branch `pr-8.1-calendario-sorteado`** · últimos PRs **8.1** (calendário sorteado por seed,
  commit `63e3e82`) e **8.2** (round-trip do save com calendário sorteado, commit `6cb02cc`) ·
  **1031 testes** (34 arquivos) verdes.
- **Medido em 2026-08-07, não herdado:** `npm test` **1031/34**, `tsc --noEmit` **exit 0**,
  `eslint src scripts` **exit 0**. **`npm run balance` inalterado por construção** — o harness
  importa só `src/engine/dataset`, `src/data/*.json` e `scripts/alavancas`, e nenhum dos três foi
  tocado pelo 8.1. `prettier --check` reprova `fluxo-campeonato.ts`/`.test.ts`, mas **já reprovava
  no HEAD** (verificado com `git show HEAD:<arquivo>`) — pré-existente, e prettier não é gate.
- **Working tree:** só `tmp-medir-save.ts` untracked — script descartável do dev, **quebrado**
  (`criarDraft` exige 22 jogadores + `atribuirPerfis` antes; o arquivo passa 4). Não commitar. A
  medição que ele buscava já foi feita e está registrada abaixo.
- **Estado do remoto MEDIDO em 2026-08-07** (`git ls-remote --heads origin`): existem exatamente
  duas branches lá — `main` em `b39782d` e `pr-7.7-dados-nurburgring` em `ccfc035`.
  **`pr-8.1-calendario-sorteado` NÃO existe no remoto**; a branch atual saiu da 7.7 e nunca foi
  pushada — o dev pediu explicitamente **sem push**.
- ⚠️ **EXISTEM DUAS `main`s e elas divergem** (medido em 2026-08-07, `git rev-parse main origin/main`):
  **`main` local = `49f3ca8`** (contém até o PR 7.6.1, com merge commits) está **21 commits à frente**
  de **`origin/main` = `b39782d`** (PR 7.4). Quem fizer `git checkout main` cai na LOCAL, não na do
  remoto. **Nenhuma das duas tem 7.7, 7.7.1, 7.8, 8.1 e 8.2** — esses só existem nesta branch, que
  está **34 commits à frente de `origin/main`**. Os dois portões visuais seguem abertos.
  **Merge na `main` continua exigindo "ok" próprio** (e a tag, se houver, só DEPOIS do merge).

## 🛑 DOIS PORTÕES VISUAIS ABERTOS — não confundir um com o outro

### 1. A PALETA (novo, PR 7.8)

    start "" "E:\projetos\F1 fantasy\preview\paleta.html"

Draft + corrida (Interlagos), **dark e light lado a lado**, marcação idêntica nos dois painéis —
a única variável é o conjunto de custom properties. Embaixo, as amostras de token com `*` marcando
o que muda entre os modos.

**Perguntas do portão:** (a) a tela diz "F1" agora? (b) o light mode entra ou fica só o dark?
(c) o painel do traçado **não clareia** no light (é ilha escura por necessidade matemática, ver
abaixo) — isso incomoda?

⚠️ **O preview é MAQUETE, não o app rodando.** Ele monta CSS próprio a partir dos tokens reais;
não carrega o `estilos.css`. Serve pra julgar a COR (é o que o portão pergunta), não pra auditar
se cada seletor de produção usa o token certo — isso é papel dos testes, e o pareamento
"preenchimento de acento + tinta escura" ganhou guarda de CSS no commit `358ab6f`.

### 2. AS SILHUETAS (herdado do 7.7, AINDA SEM VEREDITO)

    start "" "E:\projetos\F1 fantasy\preview\redesenho.html"

**A pergunta é a do critério de aceite do dev:** *o jogador vê a pista e pensa "poxa, Interlagos"
sem ler o nome?* **Linha de base: 0/10.** O placar do teste cego precisa ser anotado aqui embaixo.
Se o ponteiro não se mover, vale o gatilho de abandono aceito pelo dev: parar e reabrir a pergunta.

> ⚠️ **`npm run preview` regenera TODOS os previews e repintaria o `redesenho.html` com a paleta
> nova** — o que misturaria as duas perguntas acima. Enquanto o veredito das silhuetas não sair,
> regerar só o da paleta:
> `npx vitest run --config vitest.preview.config.ts scripts/preview-paleta.preview.test.ts`
> `preview/` é gitignored.

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

**O que NUNCA foi feito é o antigo PR 6.6 — as TELAS.** Nada em `App.tsx` / `TelaInicio.tsx`
importa campeonato (confirmado por grep). **O modo existe, é determinístico, é testado, e é
INALCANÇÁVEL pelo jogador.** É daí que vem o desalinhamento inteiro.

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

### ⬅️ PRÓXIMOS DOIS PRs — decididos pelo dev em 2026-08-07. **A ORDEM IMPORTA.**

**1º — PR 8.2.1: mover o calendário pra `src/engine/`.** BAIXO RISCO, mecânico.
`N_ETAPAS`, `FORMATO_PADRAO`, `calendarioPadrao` e `calendarioSorteado` saem de
`src/ui/fluxo-campeonato.ts` e vão pra `src/engine/campeonato.ts`; `fluxo-campeonato.ts`
**re-exporta**, então as ~90 referências de teste não mudam. Fecha a pendência 0.
**Tem que vir ANTES do wiring** — o argumento inteiro do "é barato hoje" é ser feito *antes* de a UI
e os caminhos de save apontarem pro path de `src/ui/`. Fazer depois é justamente o caro.

**2º — PR 8.4-mínimo: wiring pra ver a mecânica rodando.** 🛑 **ALTO RISCO — É PORTÃO VISUAL.**
Escopo: 3ª opção na `TelaInicio` (Corrida rápida / Campeonato curto / Campeonato completo) +
`iniciarCampeonato` + tabela final crua. O dev escolheu isto **em vez** do script de demo, sabendo
que vira portão visual. Consequências que não podem ser esquecidas:
- Fluxo completo: baseline vermelho → implementação → `senior-reviewer` → mutação → **preview
  gerado E MOSTRADO ao dev, com CAMINHO ABSOLUTO na mensagem final**. Preview gerado não é preview
  aprovado — isso já custou o PR 7.4.
- ⚠️ **`npm run preview` regenera TODOS os previews e repintaria o `redesenho.html`**, misturando a
  pergunta nova com o portão herdado das silhuetas, que segue sem veredito. Gerar só o que interessa.
- Provavelmente **não fecha numa sessão**. Se não fechar, parar e avisar, não empurrar.
- **Design system da paleta nova** (7.8) — e ela também segue sem veredito. São três portões
  visuais abertos ao mesmo tempo; não confundir um com o outro.

## Onde parei

Concluído: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato **sem UI** (6.1-6.5), Fase 7 até o **7.8**, e o
**8.1** (calendário sorteado por seed).

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

0. ⬅️ **PR 8.2.1 (mover calendário pra engine) e depois o 8.4-mínimo (wiring)** — decididos pelo dev
   em 2026-08-07, **nessa ordem**, ver a seção 🚩 acima. O 8.4-mínimo **abre um terceiro portão
   visual**, somando-se aos dois abaixo que seguem sem veredito.
1. ⬅️ **VEREDITO DO DEV sobre `paleta.html`** (portão novo) **e sobre `redesenho.html`** (portão
   herdado). São perguntas independentes e podem ser respondidas em qualquer ordem.
2. **Se a paleta for reprovada:** o diff é reversível num commit só (`f736e6c`) — `src/engine/` e
   `src/data/` não aparecem nele.
3. **Se as silhuetas forem aprovadas:** o PR de INFRA (restrições como testes vermelhos +
   allowlist `LEGADO` que só encolhe) deixa de ser pré-requisito e vira consolidação. Reavaliar o
   escopo com o dev antes de fazer.
4. 🛑 **Depois, o pit (7.9).**

## Decisões travadas da PALETA (7.8 — não reabrir sem o dev)

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

## Decisões travadas do redesenho (não reabrir sem o dev)

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

0. ✅ **DECIDIDA em 2026-08-07 — o dev escolheu MOVER. Vira o PR 8.2.1, o próximo da fila** (ver
   seção "PRÓXIMOS DOIS PRs"). Fica aqui até ser executada. Contexto original:
   **RNG semeado fora da engine (aviso da revisão do 8.1).**
   `calendarioSorteado` é o **primeiro consumidor de RNG semeado fora de `src/engine/`** (os outros
   13 usos de `deriveSeed` em `src/` estão todos na engine). Não é bloqueante: `calendarioPadrao` já
   morava em `src/ui/fluxo-campeonato.ts` desde a Fase 6, e `eslint.config.js:76` já trata esse
   arquivo como crítico de determinismo. **O custo é na Fase 3 (online):** o desenho natural é
   "servidor escolhe a seed, todo cliente deriva o mesmo calendário", o que faria `src/net/`
   importar de `src/ui/`. **Mover hoje é barato** (as 4 exportações vão pra `engine/campeonato.ts` e
   `fluxo-campeonato.ts` re-exporta — zero mudança nas ~90 referências de teste); depois que a UI da
   Fase 8 e os caminhos de save apontarem pro path de `ui/`, fica caro.
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
   `origin/pr-7.7-dados-nurburgring` e deixou a `main` remota parada em `b39782d`. O que sobra é o
   passo seguinte, e ele é uma decisão do dev, não uma dívida: como a `main` recebe esses 29
   commits — PR no GitHub (o remoto já ofereceu o link no push) ou fast-forward direto, que é
   possível porque o histórico é linear (`git merge-base --is-ancestor origin/main HEAD` = 0).
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
