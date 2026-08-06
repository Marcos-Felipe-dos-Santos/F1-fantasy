# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (fases 6-7) e `HISTORICO_ARQUIVO.md` (fases 0-5,
> encerradas). Não leia nenhum dos dois inteiro — consulte o PR que interessa.
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- **Branch `pr-7.7-dados-nurburgring`** · último PR **7.7.1** (Monza refeita com a imagem) ·
  **904 testes** (33 arquivos) verdes · working tree limpa.
- **Medido em 2026-08-05, não herdado:** `tsc --noEmit` **exit 0**, `npm run build` **exit 0**,
  `eslint` limpo. `npm run balance` não se aplica (nada de nota/lógica de corrida foi tocado).
- **A branch está à frente do `origin/main`, que segue em `b39782d` (PR 7.4), e NADA foi
  pushado** — contagem exata: `git rev-list --count b39782d..HEAD`.
  **Push continua só com "ok" explícito do dev.**

## 🛑 AGUARDANDO O DEV — o portão visual do redesenho

    start "" "E:\projetos\F1 fantasy\preview\redesenho.html"

Regenerar: `npm run preview` (escreve os quatro). `preview/` é gitignored.

**As 10 pistas foram redesenhadas** (Monza refeita no 7.7.1, com a imagem). O `redesenho.html`
tem duas seções: **teste cego** (as 10
silhuetas novas sem nome, ordem por hash do id — responder antes de revelar) e **antes/depois**
(PR 2.8 à esquerda, redesenhada à direita, mesmo pipeline de produção nas duas).

**A pergunta é a do critério de aceite do dev:** *o jogador vê a pista e pensa "poxa, Interlagos"
sem ler o nome?* **Linha de base: 0/10.** O placar do teste cego precisa ser anotado aqui embaixo.

**Se o ponteiro não se mover, o gatilho de abandono aceito pelo dev vale igual:** parar e reabrir
a pergunta, em vez de seguir ajustando por inércia.

## Onde parei

Concluído: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.7**.

O **PR 7.7 redesenhou as 10** a partir da geometria real dos circuitos, e o **7.7.1 refez Monza**
quando a imagem dela chegou (era a única que tinha saído só da descrição textual — e tinha saído
errada: reta principal em diagonal onde o real é uma cunha com a reta HORIZONTAL embaixo). Método
novo, que é o que mudou: um
**harness de verificação em `preview/`** (gitignored) que renderiza a curva suavizada em ASCII e
mede sentido de giro, separação por arco, raio, `minNaoAdj`, envelope das camadas e piores
vértices — **antes** do commit. A tentativa anterior desenhou às cegas e racionalizou a divergência
nos comentários; foi descartada.

## SEQUÊNCIA — o que sobrou

1. ⬅️ **VEREDITO DO DEV sobre `redesenho.html`.** Nada segue antes disso.
2. **Se aprovado:** o PR de INFRA (restrições como testes vermelhos + allowlist `LEGADO` que só
   encolhe) deixa de ser pré-requisito e vira consolidação — as restrições que ele ia declarar já
   estão medidas e verdes nas 10. Reavaliar o escopo dele com o dev antes de fazer.
3. **Se reprovado:** o gatilho de abandono, não mais uma rodada por inércia.
4. 🛑 **Depois, o pit (7.8).**

## Decisões travadas do redesenho (não reabrir sem o dev)

- 🔒 **TODA guarda geométrica nova neste projeto MEDE EM ARCO, NUNCA EM ÍNDICE** (dev, 2026-08-01).
  **Palavras do dev: "já custou duas vezes".** Confirmado de novo no 7.7: `minNaoAdj` (que mede por
  índice) acusou 14 u em Montreal onde o problema real era densidade — dois pontos de controle
  consecutivos a 13 u faziam `seg(i)` e `seg(i+2)` medirem como se fossem trechos diferentes da
  pista. Foi corrigido no DESENHO (espaçar os pontos), não no teste.
- **Era dos traçados: layout MODERNO/ATUAL.** Nürburgring = GP-Strecke, não Nordschleife.
- **`LARGURA_ASFALTO = 34` mantida.** Separação ≥ 34 u e raio ≥ 20 u são restrições de desenho, e
  as 10 passam.
- **Escala UNIFORME por pista** (nunca esticar x e y independentemente): destruiria o "estreito e
  comprido" de Montreal e o formato compacto de Interlagos, que é o que se reconhece. Consequência
  aceita: Interlagos não enche a moldura na horizontal.
- **Moldura de desenho: x ∈ [56, 924], y ∈ [36, 564].** Não é estética — a guarda de viewBox exige
  que a curva mais `MEIA_CAMADA_MAIS_LARGA` (60) caiba. Com o recuo anterior o terreno era clipado.
- **Nada de métrica automatizável de reconhecimento.** Hausdorff contra a pista real recusado.
- **A detecção de zebra continua rodando no traçado de CONTROLE**, não na curva suavizada — decisão
  de escopo desde o 7.6.

## 🎨 DECISÃO DE ARTE ABERTA — 88/40%, agora com o parque inteiro na mesa

O valor de `JANELA_CURVATURA_ZEBRA = 88` foi calibrado contra a Monza de 16 pontos, que **não
existe mais**. **Não foi mexido no 7.7 de propósito:** reabrir é decisão de arte do dev, e agora ela
pode ser tomada com as 10 redesenhadas medidas, que era a informação que faltava.

Medido no parque novo: o teto de 40% **morde em 8 das 10** — só Spa (33,4% de cobertura) e Red Bull
Ring (28,0%) não perdem candidato nenhum pro corte. O caso extremo é o Nürburgring: **29 trechos /
50,0% sem teto contra 24 / 38,7% com ele** — é o teto que segue impedindo a faixa contínua que o
dev reprovou. A janela do 7.6 **deixou de ser inerte**: encontra de 1 (Silverstone) a 20 (Monza)
candidatos que o critério por vértice perde, e é superconjunto dele nas 10.

## Pendências ATIVAS

1. **`AMOSTRAS_POR_SEGMENTO` pode cair de 12 pra 4-6 — agora COM o número.** A justificativa de
   N=12 era que N=8 estourava o teto de 0,7 u. Com as silhuetas novas as cordas encolheram e **N=8
   desvia 0,539 u**. O teto não foi mexido e a constante continua 12: baixar muda a geometria
   desenhada das 10 de novo e move todos os goldens, então é execução própria.
2. **Fusão de camadas — o ASFALTO está resolvido, o resto não.** As 10 passam a guarda do asfalto
   (34), mas **as 10 fundem a camada de LIMITE** (42), de 8,5 (Red Bull Ring) a 21,1 (Suzuka). É
   report-only, documenta e não trava limiar — mas agora tem os números das 10 pra decidir.
3. **Guardas O(n²) — ADIADA por decisão do dev (2026-08-01).** Com 34-49 pontos por pista a suíte
   segue rápida (904 testes em ~2 s). Não é problema demonstrado.
4. **O elo testado do 7.3 trava o componente, não o uso dele:** apagar `<CamadasDaPista/>` de dentro
   do `<svg>` de `TelaCorrida` ainda passa. Limite conhecido.
5. **Dívida de processo do 7.4.** A branch foi renomeada por cima da `main` (`git branch -M`), sem
   merge commit. Decidir se vira branch antes de qualquer push.
6. **A rede de segurança da memoização da LUT (7.5) acabou.** Golden de geometria não sobrevive a
   redesenho de geometria, e não sobrou silhueta antiga pra comparar. Recuperar exige capturar o
   golden sobre uma polilinha SINTÉTICA fixa — registrado, não feito.

> ✅ Fechadas no 7.7: **pendência 1 antiga** (Spa fundia asfalto a 8,8 → 41,3) · **espinho de ~180°
> no vértice #0 de Spa** (169,5° ⇒ 120,7° virou 111,7° ⇒ 24,8°; a lista de exceção ZEROU e ganhou
> teste que impede ela de crescer) · **pendência 4** (preview da densidade alvo).
> Fechada no 7.7.1: **Monza sem imagem** — a imagem chegou e a pista foi refeita. **As 10 agora
> vêm de imagem de referência; nenhuma sobrou só na descrição textual.**
>
> ⚠️ **Lição permanente:** este arquivo já afirmou por um dia "`tsc`/`build` limpos" sendo falso, por
> herança de reescrita em reescrita **sem nunca medir**. **Afirmação de estado só entra medida.**

## Regras invioláveis da Fase 7

1. **Tabela de luminância.** Ordem travada: escape 0,005 < fundo 0,008 < terreno 0,011 <
   escape-de-curva/paddock 0,017 < muro 0,029 < **asfalto 0,048** < carro 0,477. O asfalto é sempre a
   superfície mais clara; toda superfície nova passa por aqui antes de entrar.
2. **Regra dos 360px.** Elemento ilegível a 360px de largura não entra. No 7.7 foi ela que mandou
   abrir o miolo de Interlagos e a garganta do ômega da Mercedes Arena: o aperto real das duas vira
   borrão nessa escala. A ordem e o sentido das curvas nunca se mexem por esse motivo.
3. **Zebra só em CURVA, nunca em reta.** **Virada ACUMULADA ≥ 28° numa janela de
   `JANELA_CURVATURA_ZEBRA` = 88 u de arco**, com teto de 40% do perímetro (sem o teto o
   Nürburgring vai a 50% e vira a faixa contínua que o dev reprovou). Testada em duas densidades.

Mais dois critérios permanentes: **entorno é moldura, pista e carros são conteúdo**; e **decisão de
arte vai ao dev** — mudar composição sozinho já custou 2 bloqueantes no 7.3.

## Processo (regra completa no `CLAUDE.md`)

- **RIGOR PROPORCIONAL AO RISCO.** Classificar e anunciar ANTES de começar; na dúvida, perguntar em
  vez de escalar.
- **UM PR POR SESSÃO.** Ao concluir: commitar, atualizar os dois docs, **PARAR e avisar o dev.**
- **Ao mexer em silhueta, use o harness de `preview/`** (`preview/harness.test.ts` +
  `preview/desenhos.ts`, gitignored). Desenhar coordenadas sem olhar o resultado já custou um PR
  inteiro: a versão descartada admitia nos próprios comentários que o miolo saiu espelhado.
  Rodar: `npx vitest run --config preview/harness.config.ts --reporter=verbose --silent=false`.
- **`OpcoesZebra` é andaime de MEDIÇÃO, não configuração.** Nenhum caminho de produção passa o
  argumento.

## Convenções (as demais estão no `CLAUDE.md`)

- **Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e este
  `ESTADO.md` **reescrito** (substitui, não acumula).
- Previews visuais em `preview/` (gitignored). **Preview gerado só conta como entregue depois de
  MOSTRADO ao dev, com CAMINHO ABSOLUTO** — foi exatamente o que falhou no 7.4.
- **`referencias/` é gitignored** (imagens de terceiros, GDD §14.2). Servem pra ler geometria —
  sequência de curvas, sentido, proporção —, nunca pra virar asset.
- Harness: `npm run balance` já embute `--reporter=verbose --silent=false`. Ao chamar o vitest na
  mão, passar as flags, senão a tabela é engolida.
- **Nunca ler `src/data/*.json` por completo** (`equipe-anos.json` ≈ 324 mil tokens). Formato:
  `src/fixtures/dataset-semente/`. Consulta: `jq`/`grep` com filtro.
