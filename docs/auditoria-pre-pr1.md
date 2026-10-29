# Auditoria anterior à trilha visual — 2026-10-18

Sessão principal. Risco deste pacote: **BAIXO** (documentação e instrumento de
auditoria, sem mudança no jogo). Sem commit, push, merge, deploy ou tag nesta etapa.
Base fixada: `ef8c52093825aaeaa122493ea00924d682b6f3b2`, merge do PR #2.
As contagens abaixo descrevem essa árvore, antes desta documentação; não são uma
promessa de substituir todas as ocorrências, inclusive históricas.

## Receita e evidências

Na raiz do projeto, com Node 24 e as dependências já instaladas:

```powershell
npm run build
node scripts/medir-pre-pr1.mjs --ci > docs/auditoria-pre-pr1.medicoes.json
git diff --unified=0 afb5eff ef8c520 -- party/comandos.test.ts > docs/auditoria-pre-pr1.comandos.diff
git diff --unified=0 9600c53^ 9600c53 -- src/engine/versao.ts src/engine/versao.test.ts src/ui/fluxo-draft-golden.test.ts > docs/auditoria-pre-pr1.versao-golden.diff
npm test
npm run test:party
npm run lint
```

O script não muda arquivos; a redireção salva a saída. Sem `--ci`, a medição usa
apenas Git e o build local. Com `--ci`, consulta metadados e anotações públicos do
GitHub, sem ler credenciais. Exclui `.env`, credenciais, configuração local do
agente e binários da busca textual. Não imprime os datasets. O relatório JSON,
o script e os dois diffs integram o pacote proposto para versionamento.

## 1. Como os nomes voltaram no PR #2

O commit **`9600c53`** mudou dado, fixture, baselines, publisher e versão juntos.

| Guarda | Antes (`9600c53^`) | Depois (`9600c53`) |
|---|---:|---:|
| `VERSAO_APP` | 3.4.6 | 3.4.7 |
| Digest registrado **e recalculado** | `a2b34e13` | `61184d3b` |
| Arquivos cobertos pelo digest | 18 | 18 |
| Formato do save | 3 | 4 |

O digest inclui fontes de engine (exceto testes e `versao.ts`), os três JSONs de
`src/data/` e `src/net/{cliente,hash-draft}.ts`. Normaliza CRLF para LF. O diff
completo de versão e golden está em `auditoria-pre-pr1.versao-golden.diff`.
`src/engine/versao.test.ts` atual passou nesta auditoria, sem bump novo.

O `BASELINE` de `scripts/portao-nomes-reais.test.ts` mudou **no mesmo commit**:

| Arquivo | Antes | Depois, medido novamente |
|---|---:|---:|
| `src/data/equipe-anos.json` | 0 | 9237 |
| `src/data/pecas.json` | 2 | 19 |
| `src/data/pistas.json` | 1 | 2 |
| `src/fixtures/dataset-semente/equipe-anos.json` | 0 | 254 |
| `src/fixtures/dataset-semente/pecas.json` | 2 | 19 |
| `src/fixtures/dataset-semente/pistas.json` | 1 | 2 |
| **Total** | **6** | **9533** |

Universo: 909 agulhas deduplicadas, com fronteira Unicode, sem allowlist nova.
O comentário longo desse teste ainda narra o antigo piso 6/T2 adiada como se
fossem atuais. O código do baseline está correto; corrigir a prosa do teste é
uma dívida identificada, **não corrigida neste pacote documental**.

**Fixture:** também restaurada, 22 registros/44 pilotos; produção tem 771
equipe-anos. As assinaturas de todas as folhas numéricas, indexadas por caminho,
coincidem antes/depois nos seis JSONs. A diferença antiga 243 → 254 foi
recalculada contra `cd9d5b7^`: **não vem de `red-bull` versus `redbull`**; essa
troca isolada dá delta zero no contador. A explicação da entrega anterior estava
errada. A decomposição correta dos +11 é:

- +8 nomes de equipe nos estrategistas reconstruídos: Ferrari +2, McLaren +3,
  Williams +1, Renault +1, Benetton +1; saída de `Brawn` −1: saldo **+7**.
- IDs de pilotos: `michael_schumacher` +3; `hill` −1 e `damon_hill` +1;
  `verstappen` −1 e `max_verstappen` +1; `ralf_schumacher` +1: saldo **+4**.

Não é restauração byte a byte da fixture anterior à anonimização: oito
estrategistas antes nomeados (ex.: Ross Brawn/Ron Dennis) continuam no molde
`Estrategista <equipe> <ano>`, além dos IDs de pilotos/equipes canonizados.
Pilotos e equipes estão reais, com números congelados preservados. A janela
de nomes reais em `DATA_*` versus fictícios em
`FIXTURE_*` fechou. As constantes continuam separadas: a fixture tem notas
congeladas distintas do dataset vivo; **não são datasets intercambiáveis**.

**Goldens:** as cinco equipes de `SORTEIOS_VOCE_GOLDEN` mudaram de rótulo por
mapa reverso (Benetton, Williams, McLaren, Sauber, Williams). Anos, ordem de
draft, perfis e valores numéricos não foram repinados. No harness, quatro dos
seis representantes só mudaram de nome; dois mudaram de identidade porque o
desempate usa o ID lexicográfico: Alpine/Gasly 2024 entre 42 pilotos em PNEU 60;
Benetton/Piquet 1990 entre 23 em PNEU 81. Não foi recalibragem de notas. Essa
conferência de candidatos foi registrada na entrega anterior; a remedição atual
confirma os diffs e as assinaturas numéricas, sem rodar o balance completo.

**Peças/T1/T2:** dez peças recuperaram marca/modelo e IDs; os 24 registros e
valores numéricos foram preservados. Montreal voltou a “Montreal (Gilles
Villeneuve)” nos dois catálogos, só no nome. **T2 não foi implementada:** Red Bull
Ring e seu ID `pista-red-bull-ring` permaneceram; `seedDaEtapa` continua consumindo
esse mesmo ID. “T2” designava a pista, não `pecas.json`. A restauração de nomes
superou a intenção de anonimizar o rótulo; não autoriza trocar IDs de pista.

**Ferramentas históricas:** `scripts/nomes-ficticios.json` permaneceu byte a byte
no Git. As funções puras de `anonimizar.ts` e `anonimizar-fixture.ts` e seus testes
continuam para proveniência/migração reversa. Os `main()` antigos agora lançam
erro de aposentadoria e não publicam. O npm script antigo foi substituído por
`dataset:publicar`, que chama `publicar-dataset.ts`, confere colisões e publica
atomicamente o derivado real. `publicacao.test.ts` passou de “publicado igual ao
anonimizado” para **“publicado igual ao derivado real”**, mantendo comparação com
diagnóstico limitado, normalização de EOL, cardinalidade 771 e guarda de IDs.
Foi acrescentada contraprova do comparador e de seu diagnóstico limitado.

**Logos/liveries:** zero identificado no build local atual. Inventário: 1 JS,
1 CSS, HTML, fonte Bungee e licença; **0 arquivos de imagem, 0 data:image e
0 URLs de imagem**. Revisão das formas em `TelaCorrida`, `SilhuetaPista` e
`MockPista`: círculos, linhas, retângulos e cores próprias, sem emblemas ou
pinturas oficiais. O mock também está no bundle via `?mock=pista`, portanto foi
incluído na revisão. A contagem automática de recursos **não prova sozinha** a
ausência semântica de logos em SVG/CSS. `docs/img/` e `referencias/` não são
servidos pelo build; prints do repositório não entram nessa conclusão.

## 2. `comandos.test.ts`: vermelho, correção parcial, verde

Não foi uma reprodução local controlada com atraso injetado. O defeito foi
**observado no CI antes de corrigir**, com estas evidências consultadas novamente:

| SHA | Evento/run | Resultado |
|---|---|---|
| `635413b` | push `39052585050` | vermelho: `comandos.test.ts:146`, expected 0 > 0 |
| `635413b` | PR `39052613842` | verde na mesma revisão |
| `c740248` | push `39052791341` | vermelho em outro caso, `:132`, expected 0 > 0 |
| `c740248` | PR `39052793966` | verde |
| `7ca39cc` | push `39053003826` | verde |
| `7ca39cc` | PR `39053008495` | verde |
| `ef8c520` | main `39053132098` | verde após merge |

[Primeiro vermelho](https://github.com/Marcos-Felipe-dos-Santos/F1-fantasy/actions/runs/39052585050),
[segundo vermelho](https://github.com/Marcos-Felipe-dos-Santos/F1-fantasy/actions/runs/39052791341),
[verde final](https://github.com/Marcos-Felipe-dos-Santos/F1-fantasy/actions/runs/39053003826).
Anotações com arquivo, linha e mensagem também estão no JSON desta auditoria.

`c740248` corrigiu só “RESPONDE”; `7ca39cc` eliminou as esperas fixas restantes.
Os sete casos continuam. Agora se aguarda estado inicial, respostas exatas antes
de afirmações negativas e mapa de baldes vazio depois de `onClose`. Exemplo:

```diff
-await drenar(); // 50 ms, presumindo que as respostas já chegaram
-expect(contar(recebidas, 'comandos-demais')).toBeGreaterThan(0);
+await expect.poll(() => contar(recebidas, 'comandos-demais')).toBe(3);
```

Diff **integral**: `auditoria-pre-pr1.comandos.diff`, gerado de `afb5eff..ef8c520`.
Os diffs de evidência usam contexto zero, mantendo todas as linhas alteradas.
Não se alterou o limitador de produção nesses dois commits. A atribuição à
espera fixa é sustentada pelo local da asserção e pela mudança; não se mediu
quanto cada evento WebSocket demorou nos runners.

**Isso NÃO fecha 0(v).** A 0(v) de `ESTADO.md` descreve sabotagens que escrevem e
apagam arquivos enquanto outras cercas percorrem o diretório. O tratamento de
ENOENT mitigou a exceção, mas o risco de vacuidade ficou aberto. As escritas e
remoções continuam em `contrato-corrida-online.test.ts`; o PR #2 não tocou essas
cercas. Estado correto: **flake do WebSocket corrigido e validado; 0(v) segue 🟡**.
Uma rodada verde atual de 1730 testes também não demonstra erradicação de um flake.

## 3. Documentação: o que havia e o que este pacote completa

- Deploy: ambos os documentos já registravam **2026-10-17**, URL pública,
  produção e teste com amigos (relato do Marcos, distinguido do diagnóstico
  HTTP independente). `ESTADO.md` nomeava `ALLOWED_ORIGINS` e
  `ENVIRONMENT=production`; o registro é agora explícito nos dois.
- Nomes: o pedido de restauração já estava registrado; faltavam a marcação
  **🔒 decisão do Marcos**, a razão **fato histórico + uso nominativo** e os
  limites: **logos/liveries proibidos; nenhum nome real de pessoa/equipe em
  material monetizado ou anunciado**. São decisão do usuário, não parecer jurídico.
- CI: faltavam o verde final e o merge concluído; acrescentados com SHAs/runs.
  Não foi inventado fechamento de 0(v); ela foi diferenciada do flake corrigido.
- As seções antigas da anonimização ficam preservadas como história, com aviso
  local de que P/T1 foram superadas. Não se apagam restrições permanentes.
- Nova pendência **0(aq)**: rename decidido pelo Marcos; escolha de URL aberta.
  `0(ap)` era a última ocupada; o indicador da próxima livre passa a `0(ar)`.

## 4. Rename: inventário antes de implementar

Busca literal case-insensitive `f1[ _-]+fantasy` no conteúdo textual versionado
da base fixada. **66 ocorrências / 33 arquivos**, com linhas no JSON:

| Arquivo | Ocorrências |
|---|---:|
| `.claude/agents/doc-writer.md` | 2 |
| `.claude/agents/fable-architect.md` | 1 |
| `.claude/agents/junior-dev.md` | 1 |
| `.claude/agents/senior-reviewer.md` | 1 |
| `.claude/skills/sim-engine/SKILL.md` | 1 |
| `CLAUDE.md` | 2 |
| `ESTADO.md` | 11 |
| `F1_Fantasy_GDD.md` | 1 |
| `HISTORICO.md` | 8 |
| `PLANOS_ATIVOS.md` | 1 |
| `PLANO_CLAUDE_CODE.md` | 1 |
| `README.md` | 7 |
| `docs/deploy-local.md` | 1 |
| `docs/img/silhuetas.svg` | 2 |
| `docs/jogar-em-rede.md` | 3 |
| `index.html` | 1 |
| `package-lock.json` | 2 |
| `package.json` | 1 |
| `party/conexoes.test.ts` | 1 |
| `scripts/checar-casca-sem-node.ts` | 1 |
| `scripts/csp.test.ts` | 1 |
| `scripts/despejar-seeds.ts` | 1 |
| `scripts/fetch-f1-data.ts` | 1 |
| `scripts/gerar-silhuetas-readme.preview.test.ts` | 2 |
| `src/engine/types.ts` | 1 |
| `src/net/cors.test.ts` | 1 |
| `src/ui/TelaInicio.tsx` | 1 |
| `src/ui/contrato-corrida-online.test.ts` | 3 |
| `src/ui/persistencia.ts` | 1 |
| `src/ui/tema.ts` | 1 |
| `src/ui/tokens.css` | 1 |
| `src/ui/tokens.ts` | 1 |
| `wrangler.jsonc` | 2 |

Fora da contagem de conteúdo: nome do arquivo `F1_Fantasy_GDD.md`, repo remoto
`Marcos-Felipe-dos-Santos/F1-fantasy` e caminho local `E:\projetos\F1 fantasy`.
Os 33 não incluem dependências, build, referências ignoradas nem binários; não
se afirma uma busca em credenciais. São **sítios a classificar**, não 66 trocas
automáticas: URLs/SHAs históricos precisam continuar descrevendo o passado.

Cuidados no PR R:

- `wrangler.jsonc`: `name` e origem em `ALLOWED_ORIGINS`; `ENVIRONMENT` fica production.
- `index.html`/`TelaInicio`: título e h1; README/GDD/instruções de agentes:
  identidade editorial. SVG de silhuetas deve concordar com seu gerador.
- `package.json` e lock: nome do pacote; não é necessário instalar dependências.
- `CHAVE_SAVE`/`CHAVE_TEMA`: preservar compatibilidade ou migrar com teste; troca
  cega faz o jogador perder acesso ao save/tema. Trocar a origem também separa
  o localStorage, mesmo que a chave não mude. O token de reentrada em
  localStorage (`f1f:token-sala:...`) não contém a expressão buscada, mas também é
  separado por origem: redirect não transfere sozinho a identidade na sala.
- `scripts/despejar-seeds.ts`: caminho `.wrangler/state/.../f1-fantasy-sala-Sala`;
  depende da escolha do Worker. Exemplos de diretórios com espaços não precisam
  trocar; renomear a pasta local é opcional e não é rename do produto.
- `src/engine/types.ts` cita o nome do GDD em comentário. **Não tocar neste lote**:
  comentários entram no digest. Se o GDD mudar de caminho e exigir corrigir essa
  referência, avisar antes e obter exceção à regra de zero engine. Alternativa:
  conservar o caminho legado do GDD e mudar apenas título/conteúdo editorial.

### URL: decisão do Marcos EM ABERTO

O nome do Worker determina o primeiro rótulo da URL workers.dev, conforme a
[documentação oficial](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).
Mudar apenas `name` no arquivo local não deve ser tratado como migração segura
das salas persistidas. É preciso distinguir rename remoto de criar outro Worker.

| Opção | Efeito | Custo estimado de engenharia, não medição de execução |
|---|---|---|
| **A — marca nova, Worker/URL atuais** | Mantém links, origem, saves e namespaces; nome técnico antigo permanece | **Menor**: sem migração de infraestrutura; rename editorial, pacote e docs |
| **B — URL nova e antiga redireciona** | Marca aparece na URL; manter endpoint antigo, preservar path/query dos convites e planejar corte das salas | **Maior**: dois endpoints/deploys, testes de redirect/origem/WebSocket, decisão sobre namespaces e reentrada; sem compra de domínio, mas há manutenção/tráfego extra |
| **C — URL nova, aceitar quebra antiga** | Links anteriores deixam de servir como acesso atual; orientar jogadores a criar salas novas | **Intermediário**: publicar/validar novo endereço e origem, comunicação do corte; sem manter redirect, mas saves por origem e salas exigem tratamento explícito |

**Recomendação técnica: A neste rename**, se a URL antiga for aceitável. Se quiser
remover o nome da URL, B preserva o caminho dos links de entrada, mas não garante
sessões antigas automaticamente. Nenhuma opção escolhida pela sessão principal.
Não foram cotados preços nem mudados recursos. Eventual migração de namespaces
é trabalho adicional: [referência oficial de migrações](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/).

## Pré-condição do PR 2b: custo dos boxes por pista

**10 pistas, 10 silhuetas, 0 definições de entrada/saída/parada no replay.**
`tracados.ts` fornece polilinhas fechadas; Monza usa `TRACADO_GENERICO` de
`fluxo-corrida.ts`. As menções a “boxes” são comentários, não geometria de pit.
`MockPista.tsx` tem `D_PIT` fixo para Monza; é maquete descartável, não base
reutilizável da animação. O replay de produção não a usa.

Estimativas abaixo são de **trabalho futuro**, para desenhar ligação com a
silhueta atual e conferir mobile; não são tempos medidos nem promessa de
fidelidade ao pit lane real. Nenhuma geometria nova foi desenhada aqui.

| Pista | Pontos de controle existentes | Estimativa da geometria + ajuste visual |
|---|---:|---|
| Mônaco | 48 | 1–2 h; silhueta compacta/irregular |
| Spa | 47 | 1–2 h; conexão com reta diagonal |
| Monza | 49 | 0,5–1 h; reta principal bem definida |
| Silverstone | 44 | 1–2 h; integração sem sobrepor o miolo |
| Suzuka | 42 | 1–2 h; preservar leitura do oito |
| Interlagos | 44 | 1–2 h; respeitar sentido e espaço do miolo |
| Nürburgring GP | 48 | 1–2 h; região da arena compacta |
| Imola | 46 | 1–2 h; ligação com reta e trecho estreito |
| Red Bull Ring | 34 | 0,5–1 h; geometria mais simples |
| Montreal | 44 | 1–2 h; silhueta alongada e chicane final |

Total estimado de geometria: **9–18 h**. Infraestrutura comum de animação,
sincronização/velocidades/reduced-motion/testes: **mais 4–8 h**, sem duplicar por
pista. O custo depende do veredito visual e deve ser revisto antes do PR 2b.
Não muda tempo de pit nem resultado. O resultado fornece voltas de pit; escolher
um ponto dentro da volta para a encenação é decisão de apresentação, sem
inventar telemetria ou acrescentar penalidade à engine.

## Ordem ditada pelo usuário, um PR por sessão

1. **PR 1 — Resultados:** Tempo total/Melhor volta separados, recorde roxo,
   tabela/pódio legíveis no celular.
2. **PR R — Paddock Draft:** escopo acima; depende da decisão sobre URL.
3. **PR 2a — Replay:** carros orientados, chuva, spray e incidentes existentes.
4. **PR 2b — Boxes:** entrada, percurso, parada e saída; custo revisto/aprovado antes.
5. **PR 3 — Som:** motores, chuva, derrapagem, ferramentas, largada e chegada.

Regras ditadas em 2026-10-18: zero mudanças em `src/engine/` e `src/data/`;
som/animação só leem o resultado, sem alterar tempo de pit, determinismo ou
hashes. `versao.test.ts` verde sem bump; qualquer necessidade de tocar digest
deve ser apresentada antes. Classificar risco no início de cada PR e obter
baseline vermelho quando houver lógica nova. Respeitar reduced-motion e replay.
Medir FPS antes/depois com 22 carros + chuva em perfil de celular e apresentar
queda visível antes de seguir; registrar aparelho/perfil/método/script. Nenhum
FPS foi medido nesta auditoria documental. CSP intacta, sem scripts inline;
qualquer nova diretiva precisa de revisão prévia. WebAudio sintetizado ou CC0
com licença registrada; som após clique, mudo/volume persistidos, vozes limitadas.
Carros com cores/formas próprias, sem logo/livery oficial. Portão visual com
prints desktop/celular nos dois temas, aguardando veredito **antes do commit**.
Push/merge/deploy só com aprovação explícita naquele PR, sem tag; nenhum
subagente commita. Instrumentos de medição devem integrar o versionamento.

## Validação desta auditoria

Em 2026-10-18: 57/57 testes direcionados de nomes/fixture/versão/golden; suíte
principal 1730/1730, Worker 46/46; build/typecheck e grafo do Worker aprovados.
Aviso preexistente de chunk JS > 500 kB permanece. Nenhuma mudança de produto,
visual ou som foi implementada. Documentação pendente de revisão do usuário e
de **um único commit documental antes do PR 1**.

Em 2026-10-21, Marcos aprovou explicitamente o commit deste pacote documental,
o pódio adaptável e o início do PR 1. O commit visual continua condicionado ao
veredito dos previews; push, merge e deploy não estão autorizados para o PR 1.
