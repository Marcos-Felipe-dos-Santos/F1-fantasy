# Fixture: dataset semente (congelada, pré-4.5 — **fictícia desde o PR 7**)

22 equipe/anos semente, com as notas congeladas no momento do PR 4.4 e os
**nomes fictícios** aplicados pelo PR 7 da trilha do dataset (2026-08-31).
Ids como `sarterra-2004-piloto-klaus_reithoffer`.

Os testes golden/conteúdo-específico da engine e da UI (que verificam ids,
contagens e valores exatos desse dataset) importam **daqui**, não de
`src/data/`. Isso desacopla os goldens da evolução do dataset vivo — o PR 4.5
trocou `src/data/equipe-anos.json` pelo dataset derivado (771 entradas) sem
deslocar nenhum golden.

**Não atualizar estes arquivos quando o dataset vivo mudar.** Se algum dia a
fixture precisar ser deliberadamente atualizada (ex.: os goldens precisarem
migrar pra outra base), isso é uma decisão de plano explícita, não um efeito
colateral de mexer em `src/data/`.

> 🔒 **Essa regra foi TESTADA no PR 7, e o custo dela está medido.** O plano
> original dizia "regerar a fixture a partir do publicado"; o ensaio a seco
> mostrou que isso derruba **54 goldens de VALOR**, porque a fixture **não é um
> recorte de `src/data/`** — as notas dela são as de 2025, diferentes das
> derivadas. O dev escolheu renomear preservando as notas, exatamente pelo
> parágrafo acima. **Rebasear a fixture continua sendo PR próprio.**

## O que o PR 7 mudou, e o que ele NÃO mudou

| mudou | não mudou |
|---|---|
| `equipe` (nome exibido) | as **notas**, byte a byte |
| `pilotos[].nome` e `pilotos[].id` | a **ordem** dos 22 registros |
| `chassi/motor/estrategista/pit` `.id` | a **ordem** do par de pilotos |
| `estrategista.nome` | o `ano` de cada registro |

Proveniência: `scripts/anonimizar-fixture.ts`. **É uma migração de uma via, sem
`npm run`** — rodá-lo sobre esta saída lança, porque a resolução é por nome real
contra `scripts/derived/fatos-agregados.json`.

## 🔴 ID IGUAL NÃO SIGNIFICA DADO IGUAL — a armadilha que o PR 7 criou

**Desde o PR 7, os 22 registros desta fixture têm os MESMOS ids que
`src/data/equipe-anos.json` para o mesmo equipe/ano — carregando NOTAS
DIFERENTES.** `sarterra-2004-chassi` existe nos dois arquivos e não quer dizer a
mesma coisa: aqui são as notas congeladas de 2025, lá são as derivadas do
pipeline.

Antes do PR 7 isso não podia acontecer, e o motivo é acidental: a fixture usava
uma convenção de id própria (`ferrari-2004-…`, `redbull-2023-…`) que **não
colidia** com a do pipeline (`red-bull-2023-…`). Ao passar os dois lados pela
mesma `TABELA_NOMES`, os espaços de id **convergiram**.

- **Não é risco hoje, e isso foi MEDIDO no PR 7, não suposto:** varredura dos
  115 sítios-linha que citam id de fixture em `.ts`/`.tsx` — **nenhum arquivo
  carrega os dois datasets**. Quem lê daqui: `src/engine/*.test.ts`,
  `src/net/*.test.ts`, `src/ui/*.test.ts`. Quem lê de `src/data/`:
  `scripts/balance.balance.test.ts`, `scripts/alavancas.balance.test.ts`,
  `src/engine/dataset-live.test.ts`, `src/ui/dataset-app.ts`.
- 🔒 **O que fazer se um dia precisar cruzar os dois:** casar por
  **`equipe`+`ano`**, nunca por id — e mesmo assim conferir de qual dataset veio
  cada nota. Um teste que resolvesse um id daqui contra o dataset vivo passaria
  e mediria a coisa errada.

## ⚠️ O portão dos nomes reais NÃO leu este arquivo

`scripts/portao-nomes-reais.test.ts` mede **só os seis `.json`** listados no
`BASELINE` dele; `caminhoDe` resolve por nome de arquivo e **nenhum `.md` entra**.
Este README citava `ferrari-2004-piloto-schumacher` e se descrevia como "cópia
byte-idêntica de `src/data/`" — **as duas coisas sobreviveriam a um portão
marcando 6**, no diretório que existe justamente para ser lido com segurança.
Foi consertado à mão no PR 7. **A cegueira a `.md` continua.**

## Fora daqui

Os testes que continuam medindo o dataset **vivo** (invariantes que valem pra
qualquer dataset entregue):
- `scripts/balance.balance.test.ts` e `scripts/alavancas.balance.test.ts`
  (harness de balanceamento — leem `src/data/`, **nunca esta fixture**)
- `src/ui/tracados.test.ts` (invariantes de traçado por pista)
- `src/engine/dataset-live.test.ts` (invariantes estruturais do dataset entregue)
- `src/ui/dataset-app.ts` (app — não é teste)
