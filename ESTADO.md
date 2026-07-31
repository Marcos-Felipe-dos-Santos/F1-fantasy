# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (fases 6-7) e `HISTORICO_ARQUIVO.md` (fases 0-5,
> encerradas). Não leia nenhum dos dois inteiro — consulte o PR que interessa.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- **Branch `main`** · último PR de feature **7.6** (zebra invariante à densidade) · **882 testes**
  (33 arquivos) verdes · working tree limpa.
- **Medido em 2026-07-31, não herdado:** `tsc --noEmit` **exit 0**, `npm run build` **exit 0**,
  `eslint` limpo. `npm run balance` não se aplica (nada de nota/lógica de corrida foi tocado).
- **`origin/main` está em `b39782d` (PR 7.4). A `main` local está ~17 commits à frente e NADA
  disso foi pushado.** **Push continua só com "ok" explícito do dev.**

## Processo (mudou em 2026-07-31 — regra completa no `CLAUDE.md`)

- **RIGOR PROPORCIONAL AO RISCO.** Alto risco (engine, `src/data/`, balanceamento, portão visual,
  netcode) = fluxo completo com `senior-reviewer`. **Baixo risco (docs, chore, refactor sem
  mudança de comportamento, fix de uma linha) = implementar → testes → commitar**, sem revisão,
  sem mutação. Classificar e anunciar ANTES de começar; na dúvida, perguntar em vez de escalar.
- **UM PR POR SESSÃO.** Ao concluir: commitar, atualizar os dois docs, **PARAR e avisar o dev** —
  mesmo com fila aprovada. Causa: o contexto bateu 100% no 7.5 por **volume de operações**, não
  por documentação nem duração.

## Onde parei

Concluído: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.4**.

**PORTÃO DO 7.4 (2026-07-30): suavização APROVADA, objetivo NÃO atingido.** O dev viu o preview:
*"o aspecto poligonal sumiu e o design está bom"*, **mas nenhuma das 10 pistas é reconhecível**.
Não é falha do 7.4 — a causa são as **silhuetas de origem** do PR 2.8 (formas ilustrativas de 12-22
pontos). Suavizar forma genérica dá forma genérica arredondada. Daí a trilha de redesenho abaixo.

**Critério de aceite do dev (subjetivo e não automatizável, ele assume):** o jogador vê a pista e
pensa *"poxa, Interlagos"* **sem ler o nome**. Portão visual dele, possivelmente em várias rodadas.

## SEQUÊNCIA APROVADA (2026-07-30) — seguir nesta ordem

1. ✅ **Chore docs + `permissions.deny`** — feito (merge `e941712`).
2. ✅ **PR 7.5 — memoização da LUT** — **MERGEADO** (`bfbbb98`). 867 testes. Saída de
   `pontoNoTracado` confirmada **bit a bit idêntica** (golden de 10 pistas × 6 frações, `toBe`).
   Junto dele, no lote de baixo risco de 2026-07-31: **fix do shim** (`030a5f4`, build verde) e
   **traçados imutáveis por tipo** (`2c04118`, aviso 🟡 do 7.5 fechado).
3. ✅ **PR 7.6 — ZEBRA INVARIANTE À DENSIDADE — FEITO** (`f3653ab`). Virada acumulada em janela de
   88 u de arco. 🛑 **O portão foi MEDIDO e PASSOU: Monza na densidade atual continua em 11
   trechos / 38,4%, mesmos índices**, e as 10 pistas saem byte a byte iguais (sem mudança visual).
   O alcance NÃO virou grampo por arco — a medição desaconselhou; ver `HISTORICO.md`.
4. ⬅️ **PRÓXIMO — PR de INFRA (ALTO RISCO, sessão própria)** — restrições declaradas como testes
   vermelhos + allowlist `LEGADO` que só encolhe + gerador do **preview cego**, rodado sobre as
   silhuetas ATUAIS como **linha de base documentada**. Mostrar ao dev.
5. **FATIA 1 — Monza + Interlagos.** Critério de fatiamento: **"estressa as restrições"**, não
   "as mais icônicas". Mostrar ao dev.
6. 🛑 **PARAR e ir pro pit (7.7, 7.8).** As fatias 2-5 (Mônaco+Spa+Silverstone · Imola+Montreal+RBR ·
   Suzuka sozinha · Nordschleife sozinha · fechamento) só **depois** do pit.
   **Gatilho de abandono aceito pelo dev: se a fatia 1 não mover o ponteiro contra a linha de base
   cega, PARAR e reabrir a pergunta** em vez de fazer as outras 8 por inércia.

## Decisões travadas do redesenho (não reabrir sem o dev)

- **Era dos traçados: layout MODERNO/ATUAL**, Nordschleife como exceção. Monza sem oval banqueado,
  Spa de 7 km, Imola pós-95. Vale pra qualquer redesenho futuro.
- **Nordschleife perde ~40 das ~73 curvas.** Karussell ilegível a 360px é consequência aceita.
- **`LARGURA_ASFALTO = 34` mantida.** Largura por pista foi rejeitada (colide com a guarda de raio
  de carro). Separação ≥ 34 u e raio ≥ 20 u viram restrições de desenho testadas.
- **`AMOSTRAS_POR_SEGMENTO` cai de 12 pra 4-6** (sagita escala com a corda). N adaptativo rejeitado.
- **Nada de métrica automatizável de reconhecimento.** Hausdorff contra a pista real recusado —
  aproximaria do mapa oficial (GDD §14.2).
- ✅ **A zebra por 28°/vértice quebrava por construção no redesenho — RESOLVIDO pelo 7.6.** O que
  fica travado: a detecção continua rodando no traçado de **CONTROLE**, não na curva suavizada, e
  isso agora é **decisão de escopo** (preservar o desenho aprovado no 7.1), não impossibilidade
  técnica — desde o 7.6 rodar na curva devolveria zebra sim (16,6-40,0% a 120 pontos).

## Pendências ATIVAS

0. ✅ **FECHADA em 2026-07-31 (`030a5f4`): `npm run build` voltou a passar** — encoding opcional no
   shim. ⚠️ **Lição que fica:** este arquivo afirmou por um dia "`tsc`/`build` limpos" sendo falso,
   por herança de reescrita em reescrita **sem nunca medir**. **Afirmação de estado só entra
   medida.** O `origin/main` ainda tem o build quebrado (não foi pushado).
1. **Fusão de camadas.** Spa já está em **8,8** na curva suavizada (regressão herdada do 7.4,
   limiar ≥ 17); o redesenho de Spa fecha. Monza/Nordschleife vão aproximar mais trechos.
2. **`tracados.test.ts:102` está desatualizado desde o 7.4** — ainda trava "pontos dentro de
   `0 0 1000 600`", proibindo a faixa y 600-630 que o próprio 7.4 abriu. Corrigir no PR de infra.
3. **Guardas O(n²)** (`minNaoAdj`, `separacaoMinima`, `cruzamentos`) sobre curvas 3-4x maiores vão
   desacelerar a suíte. Bucketizar no PR de infra.
4. 🎨 **DECISÃO DE ARTE PENDENTE, levantada na revisão do 7.6 — o dev precisa VER antes de a fatia
   1 fechar.** Na densidade do redesenho (~120 pontos) o **teto de 40% passa a ser vinculante em 7
   das 10 pistas** e Monza vai de 11 pra ~48 trechos de zebra. Nesse regime quem decide o desenho é
   **o teto + a ordem gulosa**, não a geometria — e o tracejado `12 12` reinicia a cada trecho.
   Pede **preview na densidade alvo** antes de travar os valores 88/40%.
5. **O elo testado do 7.3 trava o componente, não o uso dele:** apagar `<CamadasDaPista/>` de dentro
   do `<svg>` de `TelaCorrida` ainda passa. Limite conhecido.
6. **Dívida de processo do 7.4.** A branch foi renomeada por cima da `main` (`git branch -M`), sem
   merge commit. O chore `50f5fd9` também foi direto na `main` e está à frente do `origin/main`.
   Decidir se vira branch antes de qualquer push. (Os 3 merges de 2026-07-31 já são `--no-ff`
   com branch própria — a dívida é só do histórico anterior.)

> ✅ Fechadas pelo 7.4: **dívida do viewBox** (`-10 -30 1000 660`, raios devolvidos bot 7→6 e humano
> 12→10) e **exceção nomeada do Suzuka**. O **espinho de ~180°** no vértice #0 de Spa e Interlagos
> **não se corrige separado** — o redesenho resolve.

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

## Convenções (as demais estão no `CLAUDE.md`)

- **Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e este
  `ESTADO.md` **reescrito** (substitui, não acumula).
- Previews visuais em `preview/` (gitignored, mesmo tratamento de `referencias/`). **Gitignored
  significa que ninguém vê por acidente: preview gerado só conta como entregue depois de MOSTRADO
  ao dev** — foi exatamente o que falhou no 7.4.
- Harness: `npm run balance` já embute `--reporter=verbose --silent=false` desde 2026-07-30. Ao
  chamar o vitest na mão, passar as flags, senão a tabela é engolida.
- **Nunca ler `src/data/*.json` por completo** (`equipe-anos.json` ≈ 324 mil tokens). Formato:
  `src/fixtures/dataset-semente/`. Consulta: `jq`/`grep` com filtro. Regra completa no `CLAUDE.md`.
