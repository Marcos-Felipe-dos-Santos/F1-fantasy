# Fixture: dataset semente (congelada, pré-4.5)

Cópia byte-idêntica de `src/data/equipe-anos.json`, `src/data/pecas.json` e
`src/data/pistas.json` no momento do PR 4.4 (22 equipe/anos semente, ids como
`ferrari-2004-piloto-schumacher`).

Os testes golden/conteúdo-específico da engine e da UI (que verificam ids,
contagens e valores exatos desse dataset) importam **daqui**, não de
`src/data/`. Isso desacopla os goldens da evolução do dataset vivo — o PR 4.5
troca `src/data/equipe-anos.json` pelo dataset derivado (771 entradas) sem
deslocar nenhum golden.

**Não atualizar estes arquivos quando o dataset vivo mudar.** Se algum dia a
fixture precisar ser deliberadamente atualizada (ex.: os goldens precisarem
migrar pra outra base), isso é uma decisão de plano explícita, não um efeito
colateral de mexer em `src/data/`.

Os testes que continuam medindo o dataset **vivo** (invariantes que valem pra
qualquer dataset entregue) ficam fora daqui:
- `scripts/balance.balance.test.ts` (gate de balanceamento do PR 4.5)
- `src/ui/tracados.test.ts` (invariantes de traçado por pista)
- `src/engine/dataset-live.test.ts` (invariantes estruturais do dataset entregue)
- `src/ui/dataset-app.ts` (app — não é teste)
