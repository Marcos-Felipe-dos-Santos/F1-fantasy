# ESTADO — F1 Fantasy

> **Leia este arquivo PRIMEIRO em toda sessão nova.** É curto de propósito.
> Histórico detalhado por PR: `HISTORICO.md` (não leia inteiro — consulte o PR que interessa).
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras de jogo: `F1_Fantasy_GDD.md`.

## Estado atual

- **Branch `main`** · último merge **PR 7.3.1** · **729 testes** verdes · working tree limpa.
- `tsc --noEmit`, `eslint`, `npm run build` limpos. `npm run balance` idêntico ao baseline.
- **Nada foi pushado. Push só com "ok" explícito do dev.**

## Onde parei

Concluído: Fases 0-2 (engine, Single, Local hotseat, Modo Cego), dataset 1950-2025 (PR 4.x),
design system arcade (5.1a/b/c), Modo Campeonato (6.1-6.5), Fase 7 até o **7.3.1**.

**Próximo: PR 7.4 — suavização Bézier (Catmull-Rom centrípeta, alpha 0,5).** É o PR de MAIOR RISCO
do plano e o que mais importa pro dev hoje: sem ele as pistas "parecem quadradas".
**Instrução explícita do dev: se o overshoot em Mônaco/Nürburgring não fechar com Catmull-Rom
centrípeta, PARAR e mostrar antes de contornar por conta própria.**

Depois: **7.5** (memoização da LUT — dependência DURA do 7.4; densificar sem memoizar degrada ~10x)
→ **7.7** (geometria do pit como dado) → **7.8** (animação do pit).
**Parar ao final do 7.8** pro dev ver rodando de verdade, não em mock.
O **7.6 não existe mais** — zebra por curvatura virou dado no 7.3.

## Pendências ATIVAS

1. **Dívida do viewBox, herdada pelo 7.4.** Envelope mínimo das 10 pistas é `10 -10 970 620`; o 7.3
   usa `-70 -70 1140 740`. Isso forçou inflar os raios dos carros (bot 6→7, humano 10→12) pra o
   marcador não encolher na tela. **O 7.4 deve apertar o viewBox e devolver os raios, ou documentar
   a margem com medição** — `MARGEM_VIEWBOX = 70` é a única constante do módulo sem número que a
   sustente. Headroom é defensável (Catmull-Rom faz overshoot fora do bounding box), só não está escrito.
2. **Exceção nomeada pra Suzuka no teste de cruzamento.** Quando a suavização tirar o cruzamento do
   vértice compartilhado (índices 4 e 12, ambos `(500,300)`), `cruzamentosMidSegmento` quebra.
   **Exceção NOMEADA pra Suzuka; NUNCA afrouxar a guarda geral** — ela pegou bugs reais em Spa e
   Interlagos no PR 2.8.
3. **Fusão de camadas, a recomparar no 7.4.** Com asfalto 34: Spa 15,4 · Mônaco 14,0 · Interlagos 7,3
   (travado em ≤ 17 = meia-largura do asfalto). A camada de limite funde mais (23,4 / 22,0 / 15,3),
   report-only. A suavização muda essas distâncias.
4. **O elo testado do 7.3 trava o componente, não o uso dele:** apagar `<CamadasDaPista/>` de dentro
   do `<svg>` de `TelaCorrida` ainda passa. Limite conhecido.

## Regras invioláveis da Fase 7

1. **Tabela de luminância.** Ordem travada: escape 0,005 < fundo 0,008 < terreno 0,011 <
   escape-de-curva/paddock 0,017 < muro 0,029 < **asfalto 0,048** < carro 0,477. O asfalto é sempre a
   superfície mais clara; toda superfície nova passa por aqui antes de entrar.
2. **Regra dos 360px.** Elemento ilegível a 360px de largura não entra. Já eliminou os acessos de
   serviço do paddock (7.1) e a linha central tracejada (7.3).
3. **Zebra só em CURVA, nunca em reta.** Ângulo de virada ≥ 28° por vértice, com teto de 40% do
   perímetro (sem o teto, Nürburgring dá 85% e vira a faixa contínua que o dev reprovou).

Mais dois critérios permanentes: **entorno é moldura, pista e carros são conteúdo** (adição que
prejudique a leitura dos carros está errada); e **decisão de arte vai ao dev** — a base visual da
fase é um portão aprovado a olho (7.1), e mudar composição sozinho já custou 2 bloqueantes no 7.3.

## Convenções (as demais estão no `CLAUDE.md`)

- **Ao concluir um PR, atualizar OS DOIS:** entrada detalhada no `HISTORICO.md` (acumula) e este
  `ESTADO.md` **reescrito** (substitui, não acumula).
- Previews visuais em `preview/` (gitignored, mesmo tratamento de `referencias/`).
- Harness precisa de `--reporter=verbose --silent=false`, senão o vitest engole a tabela.
