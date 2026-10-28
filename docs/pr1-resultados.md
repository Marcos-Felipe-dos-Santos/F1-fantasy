# PR 1 — Resultados e pódio

Estado em 2026-10-21: implementação local, **aguardando veredito visual do Marcos**.
Branch `codex/pr1-resultados`, base documental `26ad532`.
Risco **ALTO** pelo portão visual exigido no CLAUDE.md; sem alteração de simulação.

## Comportamento

- Tempo total e melhor volta em colunas separadas; VR roxo somente na melhor volta
  do recordista escolhido pela engine, inclusive em empate.
- Melhor volta lida do histórico já calculado. A última entrada do DNF é a volta
  da quebra e fica excluída, seguindo o significado existente na engine.
- Sem volta válida: travessão, sem Infinity/NaN nem promessa de ponto extra.
  Corrida sem finalistas não anuncia bônus. Pontos recebidos não são recalculados.
- Resumos individuais e tabela em cartões até 700 px, nomes longos quebram linha.
- Pódio com DOM 1–2–3; visual 2–1–3 no desktop e lista 1–2–3 até 420 px.
- Sem animação nova, sem alteração das velocidades ou de reduced-motion.

## Validação

Baseline principal anterior: 1730 testes. Novos testes foram executados antes da
implementação: 9 falhas / 241 sucessos; pódio em execução separada: 1 falha / 5
ignorados. Logs em `pr1-baseline-vermelho.txt` e `pr1-podio-vermelho.txt`.
As quatro falhas iniciais do helper eram export ausente; as demais verificavam
render e contraste. A defesa comportamental adicional foi por mutação.

Validação após implementação:

- `npm test`: **1764 testes, 81 arquivos**, verdes.
- `npm run test:party`: **46 testes, 8 arquivos**, verdes.
- `npm run lint` e `npm run build`: verdes; build inclui typecheck e grafo do Worker.
- `npx vitest run src/engine/versao.test.ts`: 3 verdes, versão **3.4.7**, digest
  **61184d3b** preservados.
- `node scripts/mutar-resultados.mjs`: três mutantes detectados por asserção
  (volta da quebra, VR em empate e nomes do pódio invertidos); restauração dos
  fontes verificada no script. Evidência: `pr1-mutacoes.json`.
- Após restauração, testes de resultado/fluxo: **80 verdes**.
- Revisão independente somente de leitura: sem achados acionáveis. Aprovação
  visual continua sendo do Marcos.

O teste de render online deixou de procurar qualquer `<td>` com pontos e passou
a conferir a célula de pontos da primeira linha. Nenhuma regra online mudou.
Aviso preexistente de bundle acima de 500 kB permanece.

## Desempenho: evidência e limite

Instrumento rastreável: `scripts/preview-resultados.tsx`, HTML, CSS e config de
build de revisão. Usa os componentes reais e resultado determinístico com 22
carros, Interlagos, seed da corrida 3, chuva verdadeira. Chuva nesta versão é
o estado existente, **sem partículas**, que pertencem ao futuro PR 2a.

Mesmo perfil antes/depois: viewport 360×800, DPR 1, Chrome 155 em Windows,
60 frames de aquecimento + 300 intervalos requestAnimationFrame por velocidade.
Sem throttling de CPU/GPU; mede cadência rAF, **não certifica FPS de celular real**.
O navegador disponível não oferece emulação de CPU. Validação em aparelho real
continua pendente; não converter esta medição em aprovação desse requisito.

| Velocidade | Antes (cadência rAF/s) | Depois | p95 antes/depois | Intervalos >33,34 ms |
|---|---:|---:|---|---:|
| Lenta | 180,02 | 180,01 | 5,6 / 5,6 ms | 0 / 0 |
| Média | 180,00 | 180,02 | 5,6 / 5,6 ms | 0 / 0 |
| Rápida | 180,03 | 180,02 | 5,6 / 5,6 ms | 0 / 0 |

Sem queda observada neste ambiente. Intervalos brutos, UA e parâmetros em
`pr1-fps-antes.json` e `pr1-fps-depois.json`.

## Reproduzir a prévia e a medição

```powershell
npx vite build --config scripts/preview-resultados.config.ts
npx vite preview --outDir .wrangler/pr1-preview --host 127.0.0.1 --port 4174 --strictPort
```

Abrir `http://127.0.0.1:4174/scripts/preview-resultados.html`.
Usar Resultados/Pódio e Tema. Para medir, viewport 360×800, selecionar cada
velocidade e clicar Medir replay; salvar o JSON exibido após 300 amostras.
Para repetir o antes, usar o código de produto de `26ad532` em checkout separado
com o mesmo instrumento de revisão. Não alterar arquivos enquanto roda mutação.
O instrumento não entra no entrypoint nem no build normal do jogo.

## Portão visual

Capturas reais em `pr1-imagens/`: resultados, pódio e detalhes da tabela, nos dois
temas; desktop 1280×1000 e celular 360×800. Sem overflow horizontal nos tamanhos
conferidos. Pódio desktop: campeão no centro; celular: campeão na primeira linha.
A conferência encontrou friso humano duplicado no celular; corrigido por seletor
restrito à tabela de resultado e reconferido (borda da célula = 0 px).

Arquivos de produto alterados: `src/ui/Podio.tsx`, `TelaResultadoCorrida.tsx`,
`fluxo-corrida.ts`, `estilos.css`, `tokens.ts`, `tokens.css` e quatro testes de UI
(incluindo o novo `resultado-corrida.test.ts`). Instrumentos/evidências e esta
documentação acompanham o trabalho. Nenhum arquivo em engine/data/net/party ou
CSP foi alterado; nomes reais preservados, sem assets oficiais novos.

Somente o commit documental foi autorizado e realizado. **Produto sem commit;
sem push, merge, deploy ou tag.** Sugestão de commit após aprovação visual:
`feat(ui): separa tempos e adapta resultados e podio`.
