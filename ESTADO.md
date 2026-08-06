# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (fases 6-7) e `HISTORICO_ARQUIVO.md` (fases 0-5,
> encerradas). Não leia nenhum dos dois inteiro — consulte o PR que interessa.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- **Branch `pr-7.7-dados-nurburgring`** · último PR **7.8** (paleta grafite/F1, dark + light) ·
  **1018 testes** (34 arquivos) verdes · working tree limpa.
- **Medido em 2026-08-06, não herdado:** `npm test` **1018/34**, `tsc --noEmit` **exit 0**,
  `npm run build` **exit 0**, `eslint src scripts` limpo, **Modo Cego verde** (3/3).
  **`npm run balance` inalterado por construção** — o harness importa só `src/engine/dataset`,
  `src/data/*.json` e `scripts/alavancas`, e nenhum dos três foi tocado pelo 7.8.
- **A branch FOI PUSHADA** em 2026-08-06, com "ok" explícito do dev: existe em
  `origin/pr-7.7-dados-nurburgring`, com os 29 commits, e local/remoto em sincronia (0 à frente,
  0 atrás). Verificar: `git rev-list --count '@{u}'..HEAD` e o inverso.
- **`origin/main` NÃO foi tocada** — segue em `b39782d` (PR 7.4). O que subiu foi a branch, não um
  avanço da main: o dev pediu *push*, não merge, e os dois portões visuais seguem abertos.
  **Merge na `main` continua exigindo "ok" próprio** (e a tag, se houver, só DEPOIS do merge).
  Distância: `git rev-list --count origin/main..HEAD`.

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

## Onde parei

Concluído: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.8**.

O **7.8 trocou a paleta inteira** (azul-noite → grafite + vermelho `#FF1801` / dourado `#FFB800` /
verde `#00D26A`) e adicionou light mode. O que esse PR ensinou, e que vale além dele: **a cor do
carro do jogador governa a paleta da pista**. O teto de luminância do asfalto é derivado de
`carro do jogador / asfalto >= 3`; trocar magenta (L 0,295) por vermelho (L 0,219) derrubou o teto
de 0,0650 pra **0,0397** e obrigou a redesenhar a escada tonal inteira. Não foi decisão de gosto.

## SEQUÊNCIA — o que sobrou

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
