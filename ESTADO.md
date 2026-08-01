# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (fases 6-7) e `HISTORICO_ARQUIVO.md` (fases 0-5,
> encerradas). Não leia nenhum dos dois inteiro — consulte o PR que interessa.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- **Branch `main`** · último PR **7.6.1** (previews de decisão + pendência 2) · **893 testes**
  (33 arquivos) verdes · working tree limpa.
- **Medido em 2026-08-01, não herdado:** `tsc --noEmit` **exit 0**, `npm run build` **exit 0**,
  `eslint` limpo. `npm run balance` não se aplica (nada de nota/lógica de corrida foi tocado).
- **`origin/main` está em `b39782d` (PR 7.4). A `main` local está ~21 commits à frente e NADA
  disso foi pushado.** **Push continua só com "ok" explícito do dev.**

## 🛑 AGUARDANDO O DEV — dois previews gerados e MOSTRADOS, sem veredito ainda

    start "" "E:\projetos\F1 fantasy\preview\cego.html"
    start "" "E:\projetos\F1 fantasy\preview\zebra-densidade.html"

Regenerar: `npm run preview` (escreve os três: traçados, cego, zebra). `preview/` é gitignored.

1. **`cego.html` — a LINHA DE BASE.** 10 silhuetas atuais sem nome, ordem por hash do id, com
   placar. **O placar precisa ser anotado aqui embaixo** — é a régua da fatia 1 e o insumo do
   gatilho de abandono. Placar baixo é o esperado (as silhuetas são as que o 7.4 reprovou).
2. **`zebra-densidade.html` — a decisão 88/40%** (pendência 4). Ver o achado abaixo antes de decidir.

## Onde parei

Concluído: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.6.1**.

**PORTÃO DO 7.4 (2026-07-30): suavização APROVADA, objetivo NÃO atingido.** O dev viu o preview:
*"o aspecto poligonal sumiu e o design está bom"*, **mas nenhuma das 10 pistas é reconhecível**.
Não é falha do 7.4 — a causa são as **silhuetas de origem** do PR 2.8 (formas ilustrativas de 12-22
pontos). Suavizar forma genérica dá forma genérica arredondada. Daí a trilha de redesenho abaixo.

**Critério de aceite do dev (subjetivo e não automatizável, ele assume):** o jogador vê a pista e
pensa *"poxa, Interlagos"* **sem ler o nome**. Portão visual dele, possivelmente em várias rodadas.

## SEQUÊNCIA APROVADA — seguir nesta ordem

1. ✅ **Chore docs + `permissions.deny`** · 2. ✅ **PR 7.5 — memoização da LUT** (`bfbbb98`) ·
   3. ✅ **PR 7.6 — zebra invariante à densidade** (`f3653ab`; portão medido e PASSOU, 10 pistas
   byte a byte iguais).
2. ✅ **PR 7.6.1 — os dois previews + pendência 2.** Fatiamento decidido pelo dev em 2026-08-01:
   **previews ANTES da infra** — o preview da zebra destrava a decisão 88/40% que precede a fatia 1,
   é o item mais barato, e a infra merece sessão limpa. **Aguarda veredito do dev (ver acima).**
3. ⬅️ **PRÓXIMO — PR de INFRA (ALTO RISCO, sessão própria)** — restrições declaradas como testes
   vermelhos + allowlist `LEGADO` que só encolhe.
4. **FATIA 1 — Monza + Interlagos.** Critério de fatiamento: **"estressa as restrições"**, não
   "as mais icônicas". Mostrar ao dev.
5. 🛑 **PARAR e ir pro pit (7.7, 7.8).** As fatias 2-5 (Mônaco+Spa+Silverstone · Imola+Montreal+RBR ·
   Suzuka sozinha · Nordschleife sozinha · fechamento) só **depois** do pit.
   **Gatilho de abandono aceito pelo dev: se a fatia 1 não mover o ponteiro contra a linha de base
   cega, PARAR e reabrir a pergunta** em vez de fazer as outras 8 por inércia.

## Decisões travadas do redesenho (não reabrir sem o dev)

- 🔒 **TODA guarda geométrica nova neste projeto MEDE EM ARCO, NUNCA EM ÍNDICE** (dev, 2026-08-01).
  Medir "não adjacente" ou "alcance" contando pontos é dependente de densidade e vira falso positivo
  assim que as curvas triplicam. **Palavras do dev: "já custou duas vezes"** — a mais recente foi o
  bug que o 7.6 consertou na zebra. Vale pra `minNaoAdj`, `separacaoMinima`, raio, e para qualquer
  guarda futura — em especial as que o PR de infra vai declarar.
- **Era dos traçados: layout MODERNO/ATUAL**, Nordschleife como exceção. Monza sem oval banqueado,
  Spa de 7 km, Imola pós-95. Vale pra qualquer redesenho futuro.
- **Nordschleife perde ~40 das ~73 curvas.** Karussell ilegível a 360px é consequência aceita.
- **`LARGURA_ASFALTO = 34` mantida.** Largura por pista foi rejeitada (colide com a guarda de raio
  de carro). Separação ≥ 34 u e raio ≥ 20 u viram restrições de desenho testadas.
- **`AMOSTRAS_POR_SEGMENTO` cai de 12 pra 4-6** (sagita escala com a corda). N adaptativo rejeitado.
- **Nada de métrica automatizável de reconhecimento.** Hausdorff contra a pista real recusado —
  aproximaria do mapa oficial (GDD §14.2).
- **A allowlist `LEGADO` do PR de infra é CONTRATO DE PROGRESSO, não guarda de regressão** (dev,
  2026-08-01). Ela nasce com as **10 pistas dentro**, ou seja, **sem poder de detecção nenhum** — e
  isso é o desenho, não um defeito a corrigir. **Proibido calibrar limiar pra "morder" parte do
  parque hoje:** limiar afrouxado pra dar verde esconderia exatamente o que o dev quer ver melhorar.
  O valor está em ela ENCOLHER a cada fatia. Deixar isso explícito no código.
- **A detecção de zebra continua rodando no traçado de CONTROLE**, não na curva suavizada — desde o
  7.6 isso é **decisão de escopo** (preservar o desenho aprovado no 7.1), não impossibilidade
  técnica: rodar na curva devolveria zebra sim (16,6-40,0% a 120 pontos).

## 🎨 DECISÃO DE ARTE ABERTA — 88/40%, com o achado que o preview trouxe

**A 120 pontos uniformes, o teto de 40% deixa de ser restrição geométrica e vira COTA DE CONTAGEM.**
Cada trecho cobre ~1/120 do perímetro (alcance = `segmento/2` de cada lado), então o teto admite
exatamente `0,40 × 120 = 48` trechos — e **7 das 10 pistas param em 48 trechos / ~39,8%**. Mônaco tem
93 candidatos, o Nordschleife 102; as duas desenham a **mesma quantidade de zebra que Monza**, que
tem 48. Quem escolhe QUAIS 48 é a **ordem gulosa**, não a geometria da pista.
**Consequência a pesar: mantido o teto em 40%, o redesenho não muda a QUANTIDADE de zebra de pista
nenhuma — só a posição dela.**

Medido por pista a 120 pts (aceitos/candidatos · cobertura): o teto **CORTA em 6** — Mônaco 48/93 ·
Nordschleife 48/102 · Imola 48/64 · Red Bull Ring 48/61 · Interlagos 48/63 · Silverstone 48/53 — e
**SATURA em 7** (as 6 + Monza 48/48 · 39,8%). Folgadas: Spa 46/46 · 38,2%, Montreal 34/34 · 28,2%,
Suzuka 20/20 · 16,6%. *(Reconcilia o "7 das 10" da revisão do 7.6: os dois números estavam certos sob
definições diferentes — cortar candidatos vs. encher o teto.)*

## Pendências ATIVAS

1. **Fusão de camadas.** Spa já está em **8,8** na curva suavizada (regressão herdada do 7.4,
   limiar ≥ 17); o redesenho de Spa fecha. Monza/Nordschleife vão aproximar mais trechos.
2. **Guardas O(n²) — ADIADA por decisão do dev (2026-08-01), não esquecida.** `minNaoAdj`,
   `separacaoMinima` e `cruzamentos` sobre curvas 3-4x maiores vão desacelerar a suíte. **Custo
   medido hoje: ~9 ms** (medição da sessão de 2026-07-31). Não é problema demonstrado, e bucketizar
   código espacial é otimização preventiva sutil — o `CLAUDE.md` manda não escalar por precaução.
   **Reavaliar quando a fatia 1 mostrar o custo real**, com o número novo em mãos.
3. **O elo testado do 7.3 trava o componente, não o uso dele:** apagar `<CamadasDaPista/>` de dentro
   do `<svg>` de `TelaCorrida` ainda passa. Limite conhecido.
4. **Dívida de processo do 7.4.** A branch foi renomeada por cima da `main` (`git branch -M`), sem
   merge commit. O chore `50f5fd9` também foi direto na `main` e está à frente do `origin/main`.
   Decidir se vira branch antes de qualquer push. (Os merges desde 2026-07-31 já são `--no-ff`
   com branch própria — a dívida é só do histórico anterior.)

> ✅ Fechadas: **pendência 0** (`build` quebrado, `030a5f4`) · **pendência 2** (`tracados.test.ts`
> travava o viewBox `0 0 1000 600` de antes do 7.3, proibindo a faixa y 600-630 que o 7.4 abriu —
> agora lê de `VIEWBOX_*`) · **pendência 4** (preview da densidade alvo gerado; falta o veredito).
> Pelo 7.4: dívida do viewBox e exceção nomeada do Suzuka. O **espinho de ~180°** no vértice #0 de
> Spa e Interlagos **não se corrige separado** — o redesenho resolve.
>
> ⚠️ **Lição permanente:** este arquivo já afirmou por um dia "`tsc`/`build` limpos" sendo falso, por
> herança de reescrita em reescrita **sem nunca medir**. **Afirmação de estado só entra medida.**

## Regras invioláveis da Fase 7

1. **Tabela de luminância.** Ordem travada: escape 0,005 < fundo 0,008 < terreno 0,011 <
   escape-de-curva/paddock 0,017 < muro 0,029 < **asfalto 0,048** < carro 0,477. O asfalto é sempre a
   superfície mais clara; toda superfície nova passa por aqui antes de entrar.
2. **Regra dos 360px.** Elemento ilegível a 360px de largura não entra. Já eliminou os acessos de
   serviço do paddock (7.1) e a linha central tracejada (7.3).
3. **Zebra só em CURVA, nunca em reta.** **Virada ACUMULADA ≥ 28° numa janela de
   `JANELA_CURVATURA_ZEBRA` = 88 u de arco** (PR 7.6 — antes era ângulo ≥ 28° *por vértice*, que
   se diluía com a densidade), com teto de 40% do perímetro (sem o teto, Nürburgring dá 85% e vira
   a faixa contínua que o dev reprovou). A regra é testada nas duas densidades: 16 pontos e
   48/80/120.

Mais dois critérios permanentes: **entorno é moldura, pista e carros são conteúdo** (adição que
prejudique a leitura dos carros está errada); e **decisão de arte vai ao dev** — a base visual da
fase é um portão aprovado a olho (7.1), e mudar composição sozinho já custou 2 bloqueantes no 7.3.

## Processo (regra completa no `CLAUDE.md`)

- **RIGOR PROPORCIONAL AO RISCO.** Alto risco (engine, `src/data/`, balanceamento, portão visual,
  netcode) = fluxo completo com `senior-reviewer`. **Baixo risco (docs, chore, refactor sem
  mudança de comportamento, fix de uma linha) = implementar → testes → commitar.** Classificar e
  anunciar ANTES de começar; na dúvida, perguntar em vez de escalar.
- **UM PR POR SESSÃO.** Ao concluir: commitar, atualizar os dois docs, **PARAR e avisar o dev.**
- **`OpcoesZebra` é andaime de MEDIÇÃO, não configuração.** `trechosDeZebra` aceita sobrescrita dos
  4 parâmetros, com default nas constantes; **nenhum caminho de produção passa o argumento.** Existe
  pra o preview varrer valores com o algoritmo de produção em vez de uma cópia — preview que
  reimplementa o critério para de refletir a tela e não decide nada.

## Convenções (as demais estão no `CLAUDE.md`)

- **Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e este
  `ESTADO.md` **reescrito** (substitui, não acumula).
- Previews visuais em `preview/` (gitignored). **Gitignored significa que ninguém vê por acidente:
  preview gerado só conta como entregue depois de MOSTRADO ao dev, com CAMINHO ABSOLUTO** — foi
  exatamente o que falhou no 7.4.
- Harness: `npm run balance` já embute `--reporter=verbose --silent=false`. Ao chamar o vitest na
  mão, passar as flags, senão a tabela é engolida.
- **Nunca ler `src/data/*.json` por completo** (`equipe-anos.json` ≈ 324 mil tokens). Formato:
  `src/fixtures/dataset-semente/`. Consulta: `jq`/`grep` com filtro. Regra completa no `CLAUDE.md`.
