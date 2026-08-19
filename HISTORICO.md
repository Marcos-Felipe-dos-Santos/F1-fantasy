# HISTÓRICO — F1 Fantasy

> ⚠️ **Registro histórico detalhado. NÃO leia por completo em sessão nova — leia o `ESTADO.md`.**
>
> Este arquivo acumula uma entrada por PR, com as decisões, os números medidos e os achados de
> revisão de cada um. Ele existe pra ser **consultado por PR** (`PR 6.3`, `PR 7.3`…) quando você
> precisar do porquê de alguma coisa — não pra ser lido de ponta a ponta. Ler o arquivo inteiro
> consome ~19 mil tokens e foi por isso que o `ESTADO.md` passou a existir (chore de 2026-07-28).
>
> **Fases 0 a 5 (encerradas) estão em `HISTORICO_ARQUIVO.md`** (chore de 2026-07-30). Aqui ficam
> só as fases 6 e 7.
>
> **Onde olhar primeiro:** `ESTADO.md` (estado atual, próximo PR, pendências ativas, regras da fase).
> Plano de build e direção de arte: `PLANO_CLAUDE_CODE.md`. Regras invioláveis: `CLAUDE.md`.
> Regras de jogo: `F1_Fantasy_GDD.md`. Nada foi pushado — tudo local.
>
> **Ao concluir um PR, atualizar OS DOIS:** entrada nova aqui (acumula) e o `ESTADO.md`
> **atualizado — só a seção `## Onde parei` é reescrita.**
>
> 🔒 **CORRIGIDO em 2026-08-17 (PR 4/4 da corrida online): esta linha dizia "`ESTADO.md` reescrito
> (substitui, não acumula)" — a TERCEIRA cópia da instrução que esvaziou o arquivo de 646 para 137
> linhas em 2026-08-12.** O `CLAUDE.md` registra que a linha foi corrigida em dois lugares (nele e
> no `ESTADO.md` §Convenções); esta aqui passou despercebida. É exatamente o cenário que a regra
> descreve: **regra nova ao lado da antiga contraditória devolve o mesmo esvaziamento, dependendo
> de qual o `doc-writer` ler primeiro.** Todo o resto do `ESTADO.md` é ACRESCIDO ou EDITADO
> PONTUALMENTE — nunca apagado em massa. Ver a seção inviolável do `CLAUDE.md`.

## Concluídos (mergeados na main — **exceto os do fim da lista**)

> ⚠️ **"Concluído" aqui significa "PR fechado", não "mergeado" — e existem DUAS `main`s. Medido em
> 2026-08-07** (`git rev-parse main origin/main`):
> - **`main` LOCAL = `49f3ca8`**, **21 commits à frente** de `origin/main`. É onde uma sessão que
>   fizer `git checkout main` vai parar. Contém, com merge commit, até o **PR 7.6.1**.
> - **`origin/main` = `b39782d`** (PR 7.4). Nunca recebeu 7.5, 7.6 nem 7.6.1.
> - **Nenhuma das duas tem 7.7, 7.7.1, 7.8, 8.1 e 8.2** — esses vivem só na branch de trabalho.
>
> Confira antes de assumir, nunca herde daqui: `git rev-parse main origin/main`,
> `git log --oneline origin/main..main`, `git rev-list --count origin/main..HEAD`.

> 📦 **Fases 0 a 5 (encerradas) foram movidas para `HISTORICO_ARQUIVO.md`** no chore de
> 2026-07-30 — PRs 0.1 a 5.1c e os marcos daquelas fases. Consulte lá quando precisar do
> porquê de uma decisão antiga. Aqui ficam só as fases **6 e 7** (ativas).

- **PR 6.1** — Engine de campeonato promovida do balance-harness (1º da Fase 6 — Modo Campeonato; plano do fable-architect aprovado pelo dev em 2026-07-25). `src/engine/campeonato.ts` (novo) recebe o que `scripts/balance.ts` reimplementava localmente desde o PR 1.6 (linhas 369-408): laço de etapas, derivação de seed por pista e acumulação de pontos. API: `seedDaEtapa`, `simularEtapa`, `acumularClassificacao`, `simularCampeonato`. **Rótulo do `deriveSeed` mantido LITERALMENTE `camp:${pistaId}`** — `deriveSeed` hasheia a string inteira, então renomear o prefixo mudaria todas as seeds e destruiria em silêncio o baseline calibrado nos PRs 1.6/4.5/4.6.1/4.7 (regra comentada no código-fonte, não só no PR). `simularEtapa` recebe a seed **já derivada** e nunca deriva internamente (decisão D6 do plano): a corrida avulsa segue chamando com a seed crua do draft, inalterada bit a bit — é o que permite campeonato e corrida rápida compartilharem código sem que as seeds já anotadas pelo dev mudem de resultado. **NÃO promovidos:** `draftarLoadoutsCampeonato` (setup de medição, 22 bots em dificuldade fixa) e as métricas do harness; o tipo local `ResultadoCampeonato` do harness virou `MetricasCampeonato` pra não colidir com o da engine. **Critério de aceite cumprido: relatório do `npm run balance` byte a byte idêntico ao da main** (verificado por `diff` e, independentemente, pelo revisor rodando a main num `git worktree` separado). `corrida.ts`/`quali.ts` intocados (nenhum golden congelado ameaçado); `types.ts` só aditivo; zero dependência nova. TDD vermelho antes da implementação e de novo antes de cada correção da revisão. Revisado pelo senior-reviewer (**aprovado sem bloqueantes**, com prova formal de que o desempate novo é equivalente ao laço antigo — a ordem (pontos desc, jogadorId asc) é total estrita porque os ids são únicos, logo máximo por varredura sequencial e `sort()[0]` coincidem e a estabilidade do sort é irrelevante). Achados aplicados: **A1** — vitórias/pódios/voltas rápidas só contam pra quem TERMINOU (`simularCorrida` põe finalizadores primeiro, mas com menos de 3 finalizadores um abandono cai em `posicao <= 3`; e em corrida 100% DNF a `voltaMaisRapida` aponta pra um abandonador sem creditar ponto, `corrida.ts:453-469`) — **corrigido no 6.1 de propósito, porque o desempate FIA do 6.2 consome esses contadores e nasceria contando vitória de quem abandonou**; **A2** — `simularCampeonato` rejeita `pistaId` duplicado (a seed depende só do id da pista, então repetir clonaria a corrida bit a bit e dobraria pontos em silêncio; incluir o índice no rótulo resolveria mas destruiria o baseline); **A3** — teste de desempate com ordem de entrada invertida (um comparador que devolvesse 0 no empate passava no teste antigo) + cobertura dos contadores novos, que estavam zerada; **S1** — `totalCarros` do harness deriva de `etapas.length`, não de `dataset.pistas.length`; **S2** — prova direta de que a seed vem do id e não do índice (etapas homônimas bit a bit iguais entre calendários permutados, em vez de só evidência agregada); **S4** — guard de loadouts vazio no padrão de `simularQuali`/`simularCorrida`. Próximo: PR 6.2 (desempate FIA oficial).

- **PR 6.2** — Desempate FIA por countback na classificação de campeonato (2º da Fase 6). Substitui o desempate provisório herdado do harness (pontos desc, empate por `jogadorId`) pelo critério oficial: pontos → mais 1ºs → mais 2ºs → … → `jogadorId` ascendente como fallback final, o que garante ordem **total e estável** (sem ela a classificação seria não-determinística em empate absoluto). `LinhaClassificacao` ganha `posicoes: number[]` (histograma, JSON puro pensando na persistência do 6.5); `vitorias`/`podios` passam a ser **derivados** do histograma, nunca contados em paralelo — elimina divergência silenciosa entre os dois caminhos. Elegibilidade herdada do 6.1: só finalizadores entram no countback. **Balance: relatório byte a byte idêntico, INCLUSIVE o `championShare`, que tinha licença do dev pra mudar.** Diagnóstico rodado pra provar que isso não é código morto: nos 200 campeonatos do harness há **0 empates de pontos no 1º lugar**, mas **200/200 campeonatos têm empate em algum par da tabela — 3755 pares, 100% resolvidos pelo countback e 0 caindo no fallback de `jogadorId`**; como o harness só reporta a raridade da peça do CAMPEÃO, a métrica não tinha como se mover. Metas 1 e 2 (pole/paradas) intactas, como exigido. Golden do 6.1 inalterado (104/72/60 — pontos distintos não acionam desempate). TDD vermelho (8 falhas); os cenários de empate foram redesenhados na implementação porque a 1ª versão dava ao vencedor do countback o `jogadorId` MENOR, e aí o critério antigo já produzia o mesmo resultado (teste incapaz de detectar a ausência do countback). Revisado pelo senior-reviewer (**aprovado**, com verificação empírica da anti-tautologia — reimplementou o comparador antigo e comparou as saídas cenário a cenário). Correções aplicadas: **aviso 1** — o histograma era dimensionado por `jogadorIds.length` e **descartava em silêncio** a chegada de quem terminasse além do universo (classificação de subgrupo); como `vitorias`/`podios` viraram derivados, os dois saíam errados sem erro nenhum (regressão vs. o 6.1) — corrigido pra `max(jogadorIds.length, maior posição de finalizador)`, preservando a invariante de tamanho igual entre linhas; **aviso 2** — o teste de consistência asseria a própria fórmula da implementação (poder de detecção zero: passaria até com histograma errado), trocado por valores concretos por jogador; **sugestão 4** — `cmpCountback` defensivo (`?? 0` + `Math.max` dos tamanhos), porque `NaN` num comparador não falha, corrompe a ordem em silêncio; **sugestão 5** — teste de desempate resolvido fora do pódio (índices 3 e 4). **Registrado pro PR 6.5 (sugestão 3 da revisão):** `posicoes` é dado 100% reconstruível a partir de `etapas` — decidir se a classificação é serializada (e aí `LinhaClassificacao` vira shape versionado, e save antigo sem `posicoes` estoura em `cmpCountback`) ou **recomputada no load**; a revisão recomenda recomputar (some a migração e o save encolhe ~484 números redundantes). Próximo: **PR 6.3 — portão de decisão** (o dev pediu parada com os números).

- **PR 6.3** — Dominância do draft: o PORTÃO DE DECISÃO da Fase 6 (3º da fase). **Report-only: `src/` inteiro intocado, mudança só em `scripts/`** — mede, não muda o jogo. Responde "o campeonato é decidido no draft?" correlacionando (Spearman) a força determinística do loadout com a posição final, nos MESMOS 200 campeonatos da Meta 3/4 (mesma população ⇒ números comparáveis entre seções do relatório). Sem assert de limiar: padrão informativo, quem decide o aceitável é o dev.
  **Métrica CORRIGIDA durante o PR (registro explícito, pedido do dev):** o ρ reportado na primeira rodada, **0.909, era um PISO, não a resposta** — media a força do loadout só pelo **score de QUALI** (`piloto.quali`), e o campeonato não é decidido no grid, é decidido no **ritmo de corrida** (`piloto.rit`, fórmula de `corrida.ts`). Medir a variável independente por um proxy incompleto **atenua** a correlação, ou seja, o erro empurrava o portão na direção mais perigosa: o jogo pareceria **menos** decidido pelo draft do que realmente é. A força real do loadout — **combinada quali+ritmo** — dá **ρ = 0.953**. Decomposição report-only mantida no relatório: só quali = 0.909, só ritmo = 0.893, combinada = 0.953 (as duas metades se complementam; nenhuma sozinha é a força do carro montado). A métrica principal do portão passou a ser a combinada.
  **Números do portão (200 campeonatos, 22 bots 'dificil', 10 pistas):** ρ médio **0.953**, desvio-padrão 0.029, faixa [0.768, 0.991] — correlação alta E estável, não é média de campeonatos díspares. **P(campeão no top-3 de força) = 99.0%** contra 13.6% de acaso puro (3/22). **P(pódio com alguém fora do top-5 de força) = 5.0%** contra 99.4% de acaso puro (`1 - C(5,3)/C(22,3)`, analítico). Leitura: o draft explica quase toda a classificação final; as 10 corridas quase não reordenam nada.
  **Guard-rails da medição:** `scoreCarroPista`/`scoreCorridaPista` são réplicas das fórmulas inline de `quali.ts`/`corrida.ts` SEM a variância aleatória (medir a força COM ruído atenuaria a correlação de novo) — travadas contra drift por teste que **reconstrói EXATAMENTE o tempo de quali da engine, termo a termo, incluindo o termo do RNG**; a versão original tolerava uma banda de variância e a revisão provou por MUTAÇÃO que era larga demais (apagar `pesoCall * call`, trocar `pesoPiloto` com `pesoCarro`, ignorar os pesos de pista — tudo passava). Força medida como MÉDIA no calendário inteiro, nunca numa pista "neutra" arbitrária (escolher uma só introduziria viés de perfil: carro de motor pareceria fraco em Mônaco). Lookups falham alto em vez de devolver `undefined` — um desalinhamento viraria `NaN` envenenando a média do ρ em silêncio, com o portão devolvendo número errado sem teste vermelho. `rankMedio` usa a mesma convenção de empate do percentil de Hazen (`derivar-notas.ts`); empates de força existem na população real (3 dos 200 campeonatos). **Metas 1-3 e informativas byte a byte idênticas à main** (verificado rodando o harness com as mudanças stashed). **528 testes** (521 + 7 do 6.3). Zero dependência nova.
  **PARADA no portão, como o dev pediu:** nenhuma alavanca de mitigação entra no jogo sem decisão explícita. Próximo: **PR 6.3.1 — medição comparativa de alavancas** (ainda report-only, `scripts/`-only): baseline vs. pit de meio de temporada (D1) vs. lastro de sucesso (penalidade progressiva por posição no campeonato) vs. temporada curta de 5 etapas (D7) vs. combinações.

- **PR 6.3.1** — Medição comparativa de alavancas contra a dominância do draft (report-only, `scripts/`-only: `alavancas.ts` + `alavancas.balance.test.ts`; `src/` intocado). 18 cenários × 200 campeonatos, mesma população de drafts entre cenários (seed = índice), rodando em ~6,5s. Únicas mudanças fora do arquivo novo: `draftarLoadoutsCampeonato` de `balance.ts` virou `draftarCampeonato` **exportada**, devolvendo também `copiasRestantes` do estado final do draft (o pit de meio de temporada precisa saber que cópias sobraram); o wrapper antigo continua existindo com o mesmo comportamento pra não tocar em nenhum outro chamador.
  **Duas métricas, não uma — correção de rumo dentro do PR.** O ρ correlaciona os 22 jogadores da tabela inteira; uma alavanca que só aperta o PÓDIO muda quem ganha sem mover o ρ. Reportar só o ρ teria dito "lastro não funciona" quando o achado real era outro. Daí a coluna **P(campeão mudou)** — comparação **pareada por seed** contra o baseline, não agregada. As duas respondem perguntas diferentes: P(campeão mudou) = "o campeão está decidido antes de começar?" (topo da tabela); ρ = "a tabela inteira é previsível?" (importa porque num grid de 22 a maioria não vai ganhar, e quem está em 8º também precisa sentir que as corridas valem algo).
  **Resultados (baseline A: ρ 0.953, P(camp top-3) 99.0%, P(pódio fora top-5) 5.0%):** **lastro de sucesso não move o ρ em NENHUMA forma nem intensidade** — harmônico 12%@etapa4 dá Δρ −0.000 com 18.5% de campeão trocado (alavanca de pódio pura, exatamente como o dev previu). **A variante LINEAR falhou** — foi acrescentada na revisão com a hipótese de que espalhar a intensidade pela tabela apareceria no ρ; não apareceu (Δρ −0.001) e ainda move MENOS o campeão (7.5% no 12%, contra 18.5% do harmônico). É dominada nas duas métricas; a hipótese que a motivou está registrada como **refutada**, não como pendência. **Pit após a 5ª (B)** é o único que move as duas: ρ 0.872 (Δ −0.081) com 16.0% de campeão trocado e P(pódio fora top-5) 5%→21%. Melhor combinação **E pit+lastro 12%@etapa4**: ρ 0.865 (Δ −0.088), 33.5% de campeão trocado, P(pódio fora top-5) 28%. **Temporada curta de 5 etapas (D)**: ρ 0.937 (Δ −0.016), 21.5% de campeão trocado, a custo zero de mecânica nova.
  **Ressalva que o relatório expõe e que pesou na decisão:** `ρ pós-pit` = 0.923–0.927 em TODAS as linhas com pit — *acima* do ρ da própria linha (0.865–0.872). Pelo critério do próprio cabeçalho do relatório ("se cair bem abaixo, a decisão migrou do draft pra loteria"), aconteceu o oposto: o pit **não dissolve** a previsibilidade, ele **transfere o ponto de decisão do draft pro pit**. O loadout segue explicando a tabela a 0.92 — só que o pós-troca. Pro jogador em 8º isso troca "decidido no draft" por "decidido na etapa 5"; as corridas continuam não valendo muito. E o teto de todas as alavancas é baixo: a melhor corta ~9% do ρ e deixa P(campeão top-3) em 91%, contra 13.6% do acaso puro.
  **544 testes** (528 + 16 do 6.3.1) + 2 runners de `npm run balance`. `tsc --noEmit` e `eslint` limpos. Zero dependência nova. **Nota operacional:** os runners `*.balance.test.ts` reportam por `console.log` e o reporter padrão do vitest 4.1.10 **engole a tabela** — o run sai com exit 0 mostrando só "Test Files 1 passed". Pra ver o relatório: `npx vitest run --config vitest.balance.config.ts scripts/alavancas.balance.test.ts --reporter=verbose --silent=false`.

- **🚪 PORTÃO 6.3 — DECIDIDO PELO DEV EM 2026-07-27: opção B, "o jogo é de DRAFT; o campeonato é confirmação, não disputa".** **Nenhuma alavanca entra no jogo** (nem pit de meio de temporada, nem lastro de sucesso). Justificativa registrada pelo dev: nenhuma alavanca medida no 6.3.1 resolve a dominância — a melhor corta 9% do ρ e deixa P(campeão top-3) em 91% contra 13.6% do acaso. **A raiz não está no campeonato e sim na corrida individual, que já é ~75-80% determinada (Meta 1 de calibração) — somar corridas REDUZ variância**, então nenhuma alavanca de nível de campeonato podia resolver isso. Mexer na variância da corrida recalibraria tudo dos PRs 1.6/4.5/4.6.1 e reduziria a recompensa por montar um bom carro, **que é o pilar #1 do GDD**. Decisão: aceitar a dominância e ajustar o FORMATO.
  **Consequência de formato: TEMPORADA CURTA DE 5 ETAPAS VIRA O DEFAULT**; 10 etapas fica como opção "temporada completa". Motivo: 5 etapas entrega ρ 0.937 e 21.5% de campeão trocado — praticamente igual às alavancas complexas, a custo zero de mecânica, e sem confirmar por 10 corridas algo que já estava decidido. Isto **substitui** a D7 do plano da Fase 6, onde a temporada curta era mitigação opcional de tempo de sessão; agora é o formato padrão. Impacta 6.4 (calendário default) e 6.7 (seletor).

- **PR 6.4** — `src/ui/fluxo-campeonato.ts`: estado e transições puras do modo Campeonato (4º da Fase 6). Sem React, sem DOM, sem I/O — mesmo padrão de `fluxo-corrida.ts`/`fluxo-draft.ts`/`fluxo-local.ts`, testável sem jsdom. **`src/engine/` inteiro intocado** (diff = 2 arquivos novos); nenhuma regra de jogo reimplementada — pontuação, desempate e simulação vêm 100% de `simularCampeonato`/`acumularClassificacao`. API: `FormatoTemporada` ('curta' | 'completa'), `FORMATO_PADRAO = 'curta'`, `N_ETAPAS = {curta: 5, completa: 10}`, `calendarioPadrao`, `iniciarCampeonato`, `avancarEtapa`, `simularOResto`, `classificacaoApos`, `campeonatoConcluido`. **Temporada curta de 5 etapas é o default** (decisão do portão 6.3). As etapas são PRÉ-SIMULADAS por inteiro no `iniciarCampeonato` (D3); `etapaAtual` é só cursor de apresentação e nunca dispara simulação nova.
  **Invariante travado por teste: a temporada curta é PREFIXO BIT A BIT da completa.** Como `seedDaEtapa` deriva do id da pista e nunca do índice (D8), trocar de formato não pode alterar as 5 primeiras etapas. A revisão confirmou que este teste tem poder de detecção real: a mutação que faz a seed depender de `pistas.length` morre nele. Consequência prática: "temporada curta" não precisou de calendário novo — é `slice(0, 5)` da ordem do dataset (Mônaco, Spa, Monza, Silverstone, Suzuka = 68 voltas; as 10 = 132).
  **Revisão do senior-reviewer: nenhum bloqueante**, 4 avisos — **3 deles sobre falha silenciosa**, todos corrigidos antes do merge (commit `fix:` separado): (1) `classificacaoApos` aceitava `nEtapas` inválido e devolvia tabela errada sem erro — `-1` virava "todas menos a última", `2.7` truncava, `999` saturava e **`NaN` devolvia a temporada inteira zerada como estado legítimo** (plausível no 6.6 via `parseInt` de query param/slider); é o mesmo modo de falha que `cmpCountback` documenta como inaceitável, agora falha alto; (2) o universo de jogadores era reconstruído de `etapas[0]` — virou campo explícito **`jogadorIds` no `EstadoCampeonato`**, porque o tipo é público e o **6.5 vai desserializá-lo de `localStorage`**, onde o tipo TypeScript não garante nada (é também o campo que o save precisa pra validar); (3) `calendario` era guardado por referência do chamador — agora é cópia, e `avancarEtapa`/`simularOResto`/`campeonatoConcluido` medem contra `etapas.length` (o que foi de fato simulado) em vez de `calendario.length` (entrada mutável); (4) `calendarioPadrao` com `formato` fora do union devolvia o **calendário inteiro** (`slice(0, undefined)`), e com dataset menor que o formato saturava em silêncio. **Decisão registrada: NÃO adicionei `formato` ao `EstadoCampeonato`** (cosmético 3 da revisão) — formato não é bem definido pra calendário custom, que a D5 explicitamente habilita; o 6.5 persiste o `calendario`, que é estritamente mais informativo que um rótulo de formato.
  **Mutation testing da revisão: 18 mutações, 16 mortas.** As 2 sobreviventes são benignas (`etapas[0]`→`etapas[length-1]`, correto por design; e a seed por índice, que morre na suíte da engine). **Achado de cosmético que virou comentário no teste:** o golden de voltas 68/132 **não trava a ordem** do calendário — as 10 pistas em ordem alfabética também somam 68 nas 5 primeiras; quem detecta ordem é o teste vizinho, e agora há um aviso pra ninguém apagar o teste certo achando que o outro cobre. A cobertura de DNF no universo era incidental (dependia da seed 42 por acaso produzir um abandono) e virou asserção explícita.
  **572 testes** (563 do 6.4 + 9 dos guards da revisão). `tsc --noEmit` e `eslint` limpos. Balance-harness não se aplica (nenhuma nota ou fórmula de corrida tocada); verificado mesmo assim por `diff` do relatório completo contra a main — idêntico. Zero dependência nova.

- **PR 6.5** — Persistência do modo Campeonato (`src/ui/persistencia.ts`, 5º da Fase 6; decisão D4). **`src/engine/` intocado.** Salva **SÓ ENTRADA** (`versaoFormato` + `seed` + `DraftState` + `calendario` + `etapaAtual` + `impressaoDigital`), nunca os `ResultadoCorrida`: o campeonato inteiro é função determinística de `seed + loadouts + calendário` e `iniciarCampeonato` re-simula tudo em <2ms, então guardar resultado seria redundante, gigante no `localStorage` e — pior — poderia divergir da engine atual em silêncio. `StorageLike` injetado (subconjunto `getItem`/`setItem`/`removeItem`) em vez do `Storage` global do TS, que tem índice `[name: string]: any` e forçaria cast em todo fake de teste; testável sem jsdom, que o projeto não tem. `calcularImpressaoDigital` **reusa `seedFromString` (xmur3) da engine** em vez de inventar hash novo.
  **⚠️ DESVIO DELIBERADO DA LETRA DA D4 — decisão minha, reversível em 3 linhas, sujeita a confirmação do dev.** A D4 diz "hash dos pontos da **etapa 1**". Implementamos o hash de **TODAS as etapas**. Motivo: a revisão do 6.5 classificou a versão "só etapa 1" como **bloqueante**, com repro empírico no dataset vivo — mexendo SÓ em Suzuka (5ª etapa: `desgaste +20`, `chanceChuva 0.9`), o hash da etapa 1 continuava batendo, `retomarCampeonato` aceitava o save, e a classificação final do campeonato mudava do 3º ao 6º lugar **sem erro nenhum**. Ou seja: hashear só a etapa 1 cumpre a LETRA da D4 e falha o PROPÓSITO declarado na mesma frase dela ("invalida o save sozinho se dataset ou engine mudarem"). Agravante: como as etapas são independentes (`seedDaEtapa` por id de pista), uma mudança de engine num caminho de chuva só aparece nas etapas em que choveu naquela seed — se a etapa 1 foi seca, a guarda inteira passava batido. Custo medido de cobrir tudo: **~19 µs por campeonato** (as etapas já estão pré-simuladas). Feito **agora** porque não existe save em campo: não há migração. Depois do 6.6 o mesmo ajuste exigiria bumpar `VERSAO_FORMATO` pra 2. **Se o dev preferir a versão literal da D4, é reverter `calcularImpressaoDigital` pra receber uma etapa só — mas então isto fica registrado como limitação conhecida da guarda.**
  **Revisão do senior-reviewer: 1 bloqueante (acima) + 5 avisos, todos corrigidos antes do merge.** (A1) `retomarCampeonato` não revalidava nada — `SaveCampeonato` é tipo público e nada obriga a passar por `carregarCampeonato`; um save com jogador sem loadout virava `undefined` no array e estourava dentro da engine com "Cannot read properties of undefined" (o `tsconfig` não tem `noUncheckedIndexedAccess`, então o TS tipa `loadouts[id]` como `Loadout` mesmo ausente). (A2) o teste anti-regressão "o save não contém resultado" era **lista negra de substrings** e deixava passar 3 mutantes reais — gravar `grids`, gravar `voltaMaisRapida` por etapa, ou cachear a classificação da etapa 1; nenhum contém `tempoTotal`/`historicoVoltas`, então a invariante "só entrada" morria sem ninguém notar. Virou **lista branca de chaves**. (A3) o teste de determinismo do hash comparava dois valores no MESMO processo — um `const SALT = Math.random()` no escopo do módulo passava nele e quebrava todo save em sessão nova; também sobreviviam `localeCompare` no lugar de `cmpString`, e hash sem `posicao`/`status`/`pistaId`/`sort`. Resolvido com **golden de constante congelada** + teste de ordem de entrada + teste de posições trocadas (countback do 6.2). (A4) `salvarCampeonato` era `void` e ficava mudo: em Safari privado/quota cheia o `console.warn` vai pro devtools que o jogador nunca abre, e ele fecha a aba confiando num save que não aconteceu — agora devolve `boolean` (continua não lançando; derrubar a sessão por falha de disco seria pior), pro 6.6 poder avisar na tela. (A5) `carregarCampeonato` prometia no doc "NUNCA lança" mas `getItem` **pode** lançar (Safari com cookies bloqueados devolve `SecurityError`, não `null`) — a promessa era falsa; idem `removeItem` em `limparSave`, que quebrava o fluxo "iniciar campeonato novo".
  **Confirmado pela revisão e mantido como está:** ordem de validação (checar `versaoFormato` ANTES do shape) está correta — sem isso `versao-incompativel` seria inalcançável na prática, porque uma versão futura normalmente muda o shape junto; e o hash de **32 bits** basta pro propósito (chance de colisão ~2,3e-10 por rebalanceamento). Registrado no código que a impressão digital é **checksum, não MAC**: qualquer um recomputa, então **não vale como prova de nada na Fase 3 (online) nem no "Desafio do Dia"** — lá o servidor recomputa de `seed + loadouts`.
  **Endurecimento de lint (cosmético C4 da revisão, aplicado):** as regras de determinismo (`no-restricted-properties` pra `Math.random`/`Date.now`) só valiam em `src/engine/**`, mas `persistencia.ts` decide validade de save e é igualmente crítico. `eslint.config.js` ganhou um bloco pra `src/ui/persistencia.ts` e `src/ui/fluxo-campeonato.ts`, **incluindo proibição de `localeCompare`** — que até este PR não era proibida por lint em lugar nenhum do projeto, só por convenção em comentário. Verificado empiricamente que as duas regras disparam.
  **595 testes** (587 do 6.5 + 8 dos guards da revisão). `tsc --noEmit` e `eslint` limpos. Balance-harness não se aplica. Zero dependência nova.
  **Follow-up registrado (não bloqueante):** `cmpString` é a **4ª cópia** do comparador de code unit no projeto (`campeonato.ts`, `agregar-fatos.ts`, `balance.ts`, `persistencia.ts`) — já passou do ponto de exportar `cmpJogadorId` da engine; ficou fora deste PR porque tocaria `src/engine/`, que este PR se comprometeu a não tocar.

- **PR 7.0** — Correção da direção de arte no `PLANO_CLAUDE_CODE.md` (1º da Fase 7 — rodada visual da tela de corrida; plano do fable-architect aprovado pelo dev em 2026-07-27). **Só documentação, zero código.** O §5 dizia `**Direção de arte: ARCADE/LÚDICO** — cores vibrantes, estilo chapado (flat), divertido. […] jogo pra rir com amigos, não simulador sério`, e descrevia o PR 5.2 como "linhas grossas, **cores vibrantes**". Isso é exatamente o visual que o dev rejeitou ao definir a direção nova, e **enquanto fosse a norma escrita do projeto o `junior-dev` e o `senior-reviewer` reintroduziriam o verde-limão — com razão, porque era o que estava escrito**. Foi por isso que este PR veio primeiro e é obrigatório: risco de processo, não de código. Substituído por **"ARCADE ADULTO — painel de telemetria, neon sobre escuro"**: estrutura de simulador (pista com largura, pit lane com box, ambiente por tonalidade) + sofisticação do design system do 5.1 (tokens existentes como fonte da paleta; proibido introduzir cor fora do sistema, em especial verde-limão); ambiente por **tonalidade e contraste**, nunca por objeto decorativo infantil; asfalto escuro com marcações claras e a pista como elemento mais claro da tela; **explicitamente NÃO desenho animado**. O PR 5.2 foi marcado como **substituído e ampliado** pela rodada 7.x (a nota jurídica do GDD §14.2 segue valendo integralmente, agora com critério operacional checável). A Fase 7 inteira foi registrada no PLANO.
  **Origem da rodada:** o dev jogou e achou o jogo "divertido, mas cru demais visualmente", e mandou uma referência de jogo mobile. **Leitura crítica registrada:** a referência demonstra 2 dos 4 pedidos (largura de pista e pit lane com garagens são literalmente o layout pedido), mas **NÃO** demonstra os outros 2 — os carros dela são discos chapados de 1 cor (o que o projeto já tem hoje) e o traçado é um oval genérico (zero informação sobre fazer Mônaco parecer Mônaco). Ou seja, "traçado reconhecível" e "carro legível" são aspiração do dev **sem alvo visual na imagem**; usar a imagem como critério de aceite deles seria erro. Daí o PR 7.1 ser um portão de mock próprio.
  **Decisões do dev tomadas nesta rodada:** **D5 aprovada** — o marcador vira um CARRO visto de cima **cujo cockpit é o disco do capacete**, reconciliando o pedido "carros que se leem como carros" com o GDD §11 ("carrinhos como capacetes estilizados") e preservando superfície pro editor de capacete do PR 5.3. **Identidade dos 22 carros = número de largada no chassi, não cor** (paleta categórica de 22 matizes proibida: quebraria a coesão e as garantias de contraste; se o número for ilegível a ~21×10px reais, o plano B é identidade só no painel lateral, sem inventar paleta). Correção registrada: o bloqueio a cor-por-equipe é **coesão de paleta, não Modo Cego** — `visibilidade.ts` mantém nome de equipe e ano visíveis, então cor-por-equipe não vazaria nada; a razão certa importa pra decisão não se desfazer depois. **Duração do pit (~0,5-1,1s de animação) aceita**: o valor está em existir e fazer sentido, não em durar; esticar artificialmente quebraria a relação tempo↔espaço que dá credibilidade ao replay — se quiser peso dramático, a alavanca é o ticker.
  **Bug PRESENTE descoberto ao planejar (vai pro PR 7.2 como correção prioritária):** o contraste dos marcadores de carro sobre a pista é **1,10:1 pros 21 bots** (`raridadeComum #3DDC64` sobre `textoSuave #B9B3DC`) e **1,53:1 pro humano** (`magenta #FF4FA3`) — o mínimo WCAG pra elemento de UI é 3:1, e nenhum teste pega porque `PARES_CONTRASTE` não tem nenhum par de carro-sobre-pista. **⚠️ CORREÇÃO REGISTRADA PELA REVISÃO DO PR 7.2:** estes dois números são contraste de PREENCHIMENTO contra PREENCHIMENTO e **ignoram o anel escuro que cada carro já tem** — `.tracado-svg__carro` traz `stroke: var(--cor-fundo)` de 1,5px, que dá **9,04:1** contra a pista atual. Na prática os carros **são acháveis hoje**, bem mais do que 1,10/1,53 sugerem. O bug é real, mas **não** é "carros invisíveis"; a formulação original (minha) inflava a gravidade, e foi parte do que levou o 7.2 a tentar trocar pista e carro de uma vez. Não usar esses números pra justificar decisão maior do que eles sustentam. Nota secundária: `.tracado-svg__carro` pinta todo carro com `var(--raridade-comum)` — usar um token de **raridade** como cor de marcador não vaza nada hoje (é fixo pra todos), mas é bomba-relógio semântica no Modo Cego; trocar sai de graça no 7.2.

- **PR 7.1 — 🚪 PORTÃO DE DIREÇÃO DE ARTE: APROVADO PELO DEV EM 2026-07-27.** Maquete estática de Monza (`src/ui/MockPista.tsx`, atrás de `?mock=pista`, fora da navegação). **Código descartável de propósito** — o PR 7.3 reescreve como dado puro testável; existe só pra o dev aprovar/reprovar a direção antes de investir nos 5 PRs seguintes. Engine intocada; 595 testes inalterados.
  **Foram 3 revisões, e o portão funcionou exatamente como devia — cada uma nasceu de crítica do dev sobre coisa que só aparece vendo:** rev. 1 entregou camadas de pista, pit lane com garagens e carro parado no box; a rev. 2 veio de uma 2ª referência (Automation Test Track) e acrescentou **entorno** — a pista antes flutuava sobre fundo chapado, com uma única superfície ao redor; a rev. 3 corrigiu os 3 problemas que sobraram. **Custo total: 1 PR descartável em vez de descobrir isso no meio de 6 PRs de produção.**
  **Rev. 3 — os 3 ajustes finais:** (1) **ZEBRA SÓ EM CURVA.** A faixa vermelho-coral contornando a volta inteira era o maior problema visual — uniforme e grossa, dominava a tela e puxava pro cartunesco, além de não existir na F1 real. Critério **calculado, não escolhido a olho**: ângulo de virada em cada um dos 16 vértices, zebra só onde passa de **28°** ⇒ 11 trechos, cada um cobrindo 44 unidades de arco antes e depois do vértice; as duas retas longas (largada e Rettilineo) ficaram limpas. (2) **Limite de pista em linha branca fina** (56 contra 52 do asfalto ⇒ 2 unidades de cada lado, ~1,4px na tela) contínua em toda a volta — é ela que delimita na reta, onde zebra não existe. (3) **PELOTÃO em vez de distribuição uniforme**: espaçamento igual lia como decoração, não como corrida; agora há líder isolado, trio brigando na reta, humano em dupla na chicane, pack de 5 nas Lesmo e retardatários. No jogo real esse espaçamento **sai do `historicoVoltas`** — a corrida já produz os gaps sozinha.
  **Achado próprio, que não veio de nenhuma referência e o dev não teria visto a olho:** o muro em `borda #3A3468` tinha luminância **0,0435** contra **0,0482** do asfalto — 10% de diferença, então o aro do muro competia com a própria pista pela atenção. Escurecido pra `#2F2A55` (0,0292). Só apareceu porque a regra do dev ("entorno é moldura") foi convertida em medição.
  **Três critérios permanentes da Fase 7 nasceram aqui e valem pra todo PR seguinte:** **(a) tabela de luminância** — ordem travada `escape 0,005 < fundo 0,008 < terreno 0,011 < escape-de-curva/paddock 0,017 < muro 0,029 < ASFALTO 0,048 < carro 0,477`; o asfalto tem que continuar sendo a superfície mais clara, e toda superfície nova passa por aqui antes de entrar. **(b) regra dos 360px** — se um elemento não é legível na largura mínima do projeto, não entra (foi ela que eliminou os acessos de serviço finos do paddock, que ficavam com ~5px). **(c) zebra só em curva**, nunca em reta.
  **Mudança de prioridade decidida pelo dev vendo o mock: o PR 7.4 (Bézier) saiu de "cortável" e virou NÚCLEO** — *"com o resto ficando bom, o polígono genérico passa a ser o elemento que mais destoa"*. É a prioridade mudando por evidência visual em vez de opinião a priori, que é a função do portão. **Arrasta o 7.5 como dependência dura** (densificar sem memoizar a LUT degrada ~10x). Segue sendo o PR de maior risco do plano; **instrução explícita do dev: se o overshoot em Mônaco/Nürburgring não fechar com Catmull-Rom centrípeta, PARAR e mostrar antes de contornar por conta própria.**
  **Núcleo restante aprovado:** 7.2 → 7.3 → 7.4+7.5 → 7.7 → 7.8, com `senior-reviewer` em cada um e parada ao final do 7.8 pro dev ver **rodando de verdade, não em mock**.

- **PR 7.2** — Tokens de pista + guardas de contraste (2º da Fase 7). **PURAMENTE ADITIVO: +153 linhas, ZERO remoções, `src/engine/` e `estilos.css` intocados.** 5 tokens novos (`pistaAsfalto #3E3A5C`, `pistaMuro #2F2A55`, `pistaTerreno #1B1738`, `pistaServico #221E42`, `carroBot #B9B3DC`, valores vindos da maquete aprovada no 7.1), 4 pares novos em `PARES_CONTRASTE` (`carroBot/pistaAsfalto` **5,37**, `magenta/pistaAsfalto` **3,51**, `textoEscuro/carroBot` **9,04**, `textoEscuro/magenta` **5,91**), teste de **ordem de luminância** da hierarquia de pista, e a prova de impossibilidade virou **teste executável**. **608 testes** (595 + 13).
  **🔴 BLOQUEANTE da revisão, que mudou o escopo do PR.** A versão original também trocava `.tracado-svg__pista` de `--cor-texto-fraco` pra `--pista-asfalto`. O revisor **rasterizou o painel do replay em Node**, reproduzindo o que `TelaCorrida.tsx` emite, e comparou `main` contra a branch: a troca derrubava o contraste **da própria pista** contra o painel (`fundoElevado #241F45`) de **7,77:1 para 1,45:1**. Motivo: o tom `#3E3A5C` foi escolhido pra viver DENTRO do sanduíche de camadas do mock, onde o **muro e a linha branca** é que fazem a pista ler; na tela de hoje o traçado ainda é uma `<polyline>` única de 10px — as camadas só chegam no 7.3 — e sozinho sobre o painel ele some. **O PR importou a premissa da prova de impossibilidade sem importar a camada que a sustenta.** Agravantes que só a rasterização mostrou: o **frame da largada** (início de todo replay, 22 carros amontoados na reta) é o pior caso e é garantido, com ~95% da volta sendo só a linha a 1,45:1; e **a 360px o stroke fica com ~3,3px**, exatamente a classe de elemento que a regra dos 360px existe pra rejeitar (os acessos de serviço eliminados do mock tinham ~5px e contraste melhor). **Correção aplicada: opção (a)** — as 2 hunks de `estilos.css` foram revertidas e o PR virou puramente aditivo. A trava contra o bug **passa a existir por teste já aqui**; a troca na tela vai pro 7.3, atomicamente com as camadas. `PARES_CONTRASTE` é declarativo e independente do CSS, então adiar o pixel não enfraquece a guarda.
  **Aviso relevante para o 7.3 (mutação da revisão):** o teste de ordem de luminância mata 3 de 3 mutantes de troca de ordem, **mas** um mutante `pistaAsfalto → #322D58` passa nos 608 testes preservando a ordem inteira e mesmo assim derruba a pista pra **1,22:1** contra o painel. Ou seja, a guarda nova é **ortogonal** ao risco que a aplicação no CSS cria. O 7.3 precisa trazer um par contra a superfície de fundo real do replay, ou um teste de **separação mínima** de luminância — não só de ordem.
  **PENDÊNCIA DELIBERADA registrada no código, a fechar no 7.3:** a guarda "nenhuma regra `.tracado-svg__*` referencia `var(--raridade-*)`" foi escrita, **falhou legitimamente** (o CSS de produção ainda pinta o carro com `--raridade-comum`) e foi removida com o motivo documentado — escrevê-la agora seria commitar teste vermelho. Ela entra no 7.3, no mesmo diff que remove a última referência. O guard no nível do *valor* (`carroBot !== raridadeComum`) ficou, mas a revisão apontou corretamente que ele é o nível errado: o risco do Modo Cego é a **referência no CSS**, não o hex.
  **Outros achados aplicados:** comentários factualmente errados corrigidos (`tokens.ts` dizia que `carroBot` tinha "mesmo hex" de `raridadeComum`; `tokens.test.ts` tinha frase quebrada contradizendo o próprio `expect` três linhas abaixo); ressalva registrada de que o número no chassi é desenhado **sobre o disco do capacete**, não sobre o corpo (os dois passam com folga — 10,57 e 11,90 —, os pares entram quando o 7.9 levar o marcador pra produção). **Dívida registrada pro 7.3/7.7:** cores fora do sistema ainda no mock (`#8E88B8`, `#D93B85`, `#37334F`, `#2E2952`); e `.badge-pit`/`.linha-volta-rapida` usam `raridadeLendario` em contexto de corrida — mesma classe de acoplamento semântico, mas não é vazamento de Modo Cego (não são marcadores de carro), então é higiene.

- **PR 7.3** — Camadas da pista como dado puro (3º da Fase 7). `src/ui/pista-camadas.ts` (novo) declara a pilha de `stroke`s que substitui a `<polyline>` única de 10px do PR 2.8, aplicada em `TelaCorrida.tsx` + `estilos.css` **atomicamente** com a troca da cor da pista (adiar a troca sem as camadas era o bloqueante da revisão do 7.2). **`src/engine/`, `tracados.ts` e `MockPista.tsx` intocados; zero dependência nova; balance idêntico** (`scripts/` não importa `src/ui` — isolamento estrutural, não só empírico). **727 testes** (608 + 119).
  **PENDÊNCIA 1 FECHADA — a guarda deixou de ser ortogonal ao risco.** Duas guardas, cada uma matando um modo de falha diferente, porque o dev exigiu explicitamente que ordem não bastasse: **(a) separação mínima de luminância** (razão ≥ 1,25 entre superfícies consecutivas; mínimo real 1,357) — o mutante `#322D58`, que a revisão do 7.2 provou passar em 608 testes **preservando a ordem inteira**, dá **1,118 contra o muro e morre**; o teste é anti-tautológico e nomeia o mutante. **(b) par contra a superfície REAL do replay** — a linha branca de limite virou token opaco (`pistaLimite #A5A2BB`) travado em ≥3:1 contra as **7** superfícies possíveis (mínimo real 4,32), com o `fill` do chão casado por teste contra o CSS. **As duas são necessárias:** a revisão verificou que (b) sozinha NÃO mataria o mutante (`pistaLimite/#322D58` = 5,14:1, passa folgado) e que (a) sozinha não cobre fundo trocado.
  **PENDÊNCIA 2 FECHADA** — guarda de CSS anti-raridade (varre `estilos.css`, exige ≥4 regras `.tracado-svg*` como anti-tautologia) no mesmo diff que troca `.tracado-svg__carro` de `var(--raridade-comum)` pra `var(--carro-bot)`. De quebra o contraste do carro sobre a pista sai de 1,10:1 pra 5,37:1.
  **Números MEDIDOS antes de escolher, não decididos a olho — e dois deles contradizem a maquete:** **(1) a largura 52 da maquete só funciona em Monza.** Medindo a menor distância entre trechos não-adjacentes das 10 silhuetas (Spa 18,6 · Mônaco 20,0 · Interlagos 26,7 · Monza 43,6 · … · Suzuka 113,6), 52 funde 6 das 10 pistas, até 33,4 em Spa. **Largura escolhida: 34** — Monza fica em ZERO (a maquete aprovada já fundia 8,4 e o dev aprovou vendo), e só Spa 15,4 / Mônaco 14,0 / Interlagos 7,3 fundem. Travado por teste com limiar `LARGURA_ASFALTO / 2` = 17 (derivado, não mágico: nenhum trecho pode ter o EIXO dentro do asfalto de outro). **(2) o critério de 28° do mock não generaliza:** dá **85% do perímetro no Nürburgring** (os 22 vértices são todos ≥28°) e 75% em Mônaco — exatamente a "faixa contínua contornando a volta inteira" que o dev reprovou na revisão 3 do 7.1. Solução: **limiar de 28° mantido + teto de cobertura de 40%**, gastando o orçamento pelos vértices de maior ângulo. O teto morde em 6 pistas e **não morde em Monza (38,4% sem teto nenhum)**, que sai com os **11 trechos exatos** que o dev aprovou. **Isto ABSORVE o PR 7.6** (que era "automatizar zebra por curvatura"): ele deixa de existir como PR.
  **Omissões e correções exigidas pelos critérios permanentes:** a **linha central tracejada da maquete SAI** (1,6 unidade = 0,46px a 360px — reprovada pela regra dos 360px, mesmo motivo que eliminou os acessos de serviço do paddock na revisão 3); a **linha de limite foi de 2 pra 4 unidades de cada lado** (2 dão 0,57px a 360px e reprovam); e o **raio dos carros foi compensado** (bot 6→7, humano 10→12) porque o viewBox cresceu 14% e o marcador encolheria 12,3% na tela — a regra permanente diz que a pista é moldura e o carro é conteúdo, então o conteúdo não pode degradar pela moldura.
  **Revisado 2× pelo senior-reviewer, com recomputação independente de TODOS os números do plano** (luminâncias, as 10 distâncias mínimas, o algoritmo de zebra inteiro com união de arcos, folga do viewBox) — **zero divergência numérica**; e com verificação **por mutação** das guardas, não por leitura. **2 BLOQUEANTES na 1ª revisão, ambos decisões de arte minhas, ambos revertidos:** (B1) o anel de escape usava `pistaServico` (0,017) no papel do `fundoAfundado` (0,005) da maquete, invertendo a relação com o terreno — e a justificativa que eu havia escrito no código ("evita um 4º token") era **factualmente falsa**, `fundoAfundado` já existia como token; (B2) eu trocara o `background` do painel do traçado pra `--fundo`, o que o fazia parar de ler como card e tornava falso um comentário existente — e era **desnecessário** *para a pendência de contraste*, porque `pistaLimite/fundoElevado` = 6,25:1 já passa. Depois da reversão **o painel ficou idêntico à main** e o PR virou só "a pista ganha camadas". **⚠️ NÃO USAR ESTE PARÁGRAFO COMO ARGUMENTO PRA REVERTER O 7.3.1:** o que estava errado no 7.3 era eu ter mudado o fundo **sozinho, como efeito colateral**, sem o dev — e não o valor em si. O dev depois escolheu `--fundo` **explicitamente**, de olho, pelo relevo do terreno (ver PR 7.3.1). O `background` de hoje é `--fundo` **por decisão**, não por descuido. **Avisos aplicados:** a guarda do fundo mirava o `background` **inerte** de `.tracado-svg` (o `<rect>` de chão cobre 100% do viewBox, então quem pinta é o `fill`, que não tinha teste); nada ligava `CAMADAS_PISTA` ao que a tela desenha (apagar as 25 linhas de JSX deixava tudo verde) — virou `CamadasDaPista` exportado + `pista-camadas-render.test.ts` no padrão `renderToStaticMarkup` do `card-peca-cego.test.ts`; nada ligava a COR das camadas à hierarquia (golden `id→cor` + backstop de luminância escopado, que mata 7/7 mutações); e a adjacência real chão→terreno não era travada por ninguém, porque `fundoElevado` não está em `HIERARQUIA_SUPERFICIES` — daí `CamadaPista.papel` e `CORRENTE_TONAL_DA_PILHA`, derivada do dado. Também: `break`→`continue` no algoritmo de zebra (resultado idêntico nas 10 pistas hoje, mais robusto pro 7.4) e o teste de render passou a vigiar `stroke-dasharray`/`stroke-dashoffset`/`className`/`d` — sem isso, apagar o deslocamento fazia as duas zebras coincidirem e a alternância sumir com a suíte verde.
  **✅ RESOLVIDO NO PR 7.3.1 (variante B, ver a entrada abaixo) — achado C da re-revisão, decisão de OLHO que nenhum teste reprova:** como efeito **combinado** das duas reversões (escape fiel à maquete + painel fiel à main), o terreno (0,0113) ficou **mais escuro que o chão do painel** (`fundoElevado`, 0,0178). Na maquete do 7.1 o chão era `#16132E` (0,0083) e o terreno era um degrau **claro** sobre ele; agora a pilha lê como um "poço" em vez do relevo aprovado. As duas opções são mutuamente exclusivas com a paleta atual (não existe token entre 0,0178 e o muro 0,0292 pra servir de terreno claro). Preview comparativo A/B das 6 pistas gerado pro dev julgar. **Não decidi sozinho: já errei duas vezes neste PR mexendo em arte sem o portão.**
  **Dívida registrada (não bloqueante):** o viewBox está superdimensionado — o envelope mínimo das 10 pistas é `10 -10 970 620` e o PR usa `-70 -70 1140 740`, sobrando 80/90 em x; foi isso que forçou inflar os carros. Headroom é defensável porque Catmull-Rom (7.4) faz overshoot fora do bounding box dos vértices, **mas isso não estava escrito** — `MARGEM_VIEWBOX = 70` é a única constante do módulo sem justificativa medida; o 7.4 deve apertar e devolver os raios, ou documentar. Também: a fusão da camada de LIMITE (largura 42) em Spa 23,4 / Mônaco 22,0 / Interlagos 15,3 fica **report-only** por teste (é consequência da fusão do asfalto — onde o asfalto já fundiu não há fronteira a desenhar), com os números escritos pro 7.4 comparar; `HIERARQUIA_SUPERFICIES` segue válida como guarda de **paleta**, não da pilha; e o elo testado trava o componente, não o uso dele (apagar `<CamadasDaPista/>` de dentro do `<svg>` ainda passa).

- **PR 7.3.1** — Relevo do terreno: o chão do replay volta pra `--fundo` (4º da Fase 7). **DECISÃO DE OLHO DO DEV EM 2026-07-28 sobre o achado C da revisão do 7.3**, não decisão de teste. Das duas composições possíveis, fica a da maquete aprovada no portão 7.1: chão em `fundo` (0,0083), com `pistaTerreno` (0,0113) lendo como **degrau CLARO que sobe** e fazendo relevo. Com `fundoElevado` (0,0178) o terreno ficava mais escuro que o chão e a moldura lia como um "poço".
  **O dev aceitou explicitamente o custo:** o painel do traçado deixa de ler como card e passa a ser delimitado só pela borda. Registrado a pedido dele: **(a)** foi decisão de olho; **(b)** **nenhum teste reprova nenhuma das duas composições** — as duas passam em todas as guardas de contraste e de separação; **(c)** a restrição real é de **PALETA**: não existe token entre `fundoElevado` (0,0178) e `pistaMuro` (0,0292) pra servir de terreno claro mantendo o painel elevado. Se um dia surgir, dá pra ter as duas coisas.
  **Por isso a decisão entrou TRAVADA POR TESTE PRÓPRIO.** Como nenhuma guarda de contraste reprovaria a volta atrás, sem um teste dedicado a decisão se desfaria sozinha na primeira refatoração. Verificado por mutação: voltar o chão pra `fundoElevado` reprova em 4 testes (a constante, o casamento do `fill` do chão com o CSS, o casamento do `background` do painel e o sinal do degrau). Diff de 4 arquivos, todos em `src/ui/`; engine intocada. **729 testes.**
  **Revisado pelo senior-reviewer (aprovado, 0 bloqueantes), com 2 avisos corrigidos antes do merge — os dois em código cujo propósito declarado é SER LIDO por quem for rever a decisão depois:** **(1)** o mutante `#191632` **deixou de demonstrar o achado B**. Com o chão em `fundo`, o par `fundo→terreno` virou adjacente TAMBÉM em `HIERARQUIA_SUPERFICIES`, então as duas guardas passaram a matá-lo e ele não provava mais por que `CORRENTE_TONAL_DA_PILHA` precisa existir; o comentário ainda afirmava que "a guarda de paleta não pega". Trocado por um mutante que ataca uma das **duas** adjacências que só a pilha cobre (`terreno→escape` e `escape→muro`, porque na hierarquia o `fundoAfundado` do escape fica na outra ponta da lista): a camada de escape recebe a cor do terreno e **o anel escuro some do desenho** sem nenhum token mudar de valor. Verificado por mutação real no dado — reprova a guarda da pilha, passa limpa na de paleta. **(2)** `expect(razaoRelevo).toBeGreaterThan(1)` era **asserção vazia com comentário afirmando o contrário**: `razaoSeparacao` é `max/min`, logo ≥ 1 por construção pra qualquer par — não dizia nada sobre qual é o mais claro. Quem faz o trabalho de sinal é a asserção de luminância seguinte; a linha virou uma que fixa a magnitude.
  **Registrado pela revisão:** o degrau do relevo (**1,357**) passou a ser a **adjacência mais apertada de toda a pilha** — com `fundoElevado` era 1,578. A decisão corrigiu o **sinal** do degrau ao custo da **razão**, o que é desejável (a guarda morde primeiro exatamente onde a decisão mora), mas significa que qualquer ajuste futuro em `fundo` ou `pistaTerreno` estoura ali antes de qualquer outro lugar. Também: as 3 entradas de pista em `PARES_CONTRASTE` são duplicatas de cobertura do teste iterativo sobre `SUPERFICIES_DO_REPLAY`, e nada mantém as duas listas em sincronia (defensável — uma é contrato declarado, a outra é derivada); e `.tracado-svg` passou a usar o token cru `var(--fundo)` em vez da bridge var, o que o teste novo agora exige (um `var(--cor-fundo)` futuro, semanticamente idêntico, reprovaria).

- **PR 7.4** — Suavização Bézier do traçado: Catmull-Rom **centrípeta** (5º da Fase 7, commit `b39782d`, 2026-07-28). O traçado desenhado deixa de ser a polilinha de controle e passa a ser uma curva Catmull-Rom centrípeta (`ALPHA_CENTRIPETA = 0,5`, `src/ui/suavizacao.ts:47`) densificada com N=12 amostras/segmento. Separa duas coisas que antes eram a mesma: `tracadoDaPista` (intenção de desenho, intocada, fonte da detecção de zebra por ângulo de vértice) e `tracadoSuavizado` (o que se desenha e por onde os carros andam). Alpha escolhido por medição: cordal estoura (55,6 em Mônaco), uniforme faz cusp em ângulo agudo, centrípeta fica ≤ 15,1 nas 10. N=12 escolhido por medição de sagita (0,55u = 0,39px no maior painel; N=8 daria 0,76px, visível).
  **A PARADA OBRIGATÓRIA do plano FECHOU** (`suavizacao.test.ts:318-352`, golden `OVERSHOOT_MEDIDO` medido com N=64, mais fino que a produção — amostrar mais só pode achar extremo maior, então o golden é conservador): **Mônaco 15,1** (pior das 10) e **Nürburgring 0,0**, contra os **70 de margem** que o 7.3 reservava. Não houve contorno por conta própria — o critério que o dev definiu foi atingido de frente. Zero auto-interseção nas 10.
  **Pendência 1 do 7.3 (dívida do viewBox) fechada:** viewBox reapertado de `-70 -70 1140 740` para `-10 -30 1000 660`, medido lado a lado (envelope da curva + meia camada mais larga, folga de 10 no pior lado, tabela em `pista-camadas.ts:169-194`). Com a largura de volta em **1000** — exatamente o valor pré-7.3 — a escala volta a ser a da main e **os raios dos carros voltam aos originais: bot 7→6, humano 12→10** (`RAIO_CARRO_BOT`/`RAIO_CARRO_HUMANO`, travados contra os valores da main em `pista-camadas.test.ts:847-852`). Teste novo impede reinflar o viewBox "por segurança": no máximo 15% de área além do envelope real das 10.
  **Pendência 2 do 7.3 (Suzuka) fechada como o dev exigiu: exceção NOMEADA, guarda geral NÃO afrouxada.** `AUTOCONTATOS_INTENCIONAIS` (`suavizacao.test.ts:380`) é uma lista **fechada** com uma única entrada — Suzuka, vértices de controle 4 e 12 na mesma coordenada `(500,300)`, a ponte do layout em "8". Toda pista sem entrada tem tolerância **zero**. A guarda ganhou uma versão mais **forte**, não mais fraca: roda agora também sobre a curva desenhada, em duas variantes (mid-segmento e inclusive-em-vértice). O X de Suzuka se mantém num vértice compartilhado porque `amostrarSegmento` emite o ponto de controle por cópia, não pela fórmula — os dois vértices continuam bit a bit iguais depois de suavizar, e há teste travando essa propriedade.
  **Registrado, e é DECISÃO DE ARTE pendente do dev:** Spa (169,5° ⇒ 120,7°) e Interlagos (164,1° ⇒ 101,6°) continuam angulosos, e **isso não é falha da suavização** — as duas silhuetas têm no vértice #0 um espinho de quase 180° (a polilinha volta por cima de si mesma na largada/chegada). Catmull-Rom é interpolante: é obrigada a passar pelo vértice e arredonda o espinho com raio ~0,2u. Só editar as duas silhuetas resolve, e silhueta é arte — vai ao dev com o preview.
  **Preview obrigatório:** `preview/tracados.html` (248 KB, 10 SVGs, controle vs. suavizado lado a lado), gerado por `npm run preview` (`scripts/preview-tracados.preview.test.ts`, config própria `vitest.preview.config.ts`, fora do `npm test`). **Gerado em 2026-07-28 19:19, dois minutos antes do commit, mas NUNCA MOSTRADO AO DEV — e `preview/` é gitignored, então não apareceu em nenhum diff.** Regenerado em 2026-07-30 e conferido **idêntico bit a bit** ao original, portanto ainda reflete o HEAD. **A aprovação a olho continua PENDENTE.**
  **Desvio de processo, registrado de propósito:** este PR **não passou pelo fluxo**. Não houve merge commit — a branch `feat/pr-7.4-suavizacao-bezier` foi **renomeada por cima da `main`** (`git branch -M`, ver reflog), a branch não existe mais, **foi pushada pra `origin/main`**, e nem `HISTORICO.md` nem `ESTADO.md` foram atualizados na época. Esta entrada é a reconstrução feita em 2026-07-30 a partir do commit, do código e dos testes.

- **🧹 CHORE 2026-07-30 — corte de consumo de contexto** (commit `50f5fd9`). Diagnóstico mediu os consumidores reais: docs de abertura são ~3,5 mil tokens (não eram o problema); skills e agents carregam **sob demanda** (só as `description` entram sempre, ~550 tokens somados). Os vazamentos: **(1)** `src/data/equipe-anos.json` — 1 MB / 52 mil linhas / **~324 mil tokens**, ~100× toda a documentação somada; `CLAUDE.md` ganhou seção inviolável proibindo leitura integral de `src/data/*.json`, apontando `src/fixtures/dataset-semente/` (mesmo shape, 23 KB) pra formato e `jq`/`grep` filtrado pra consulta. **(2)** `git diff` cru na revisão — o diff do 7.4 tem 68 KB (~19 mil tokens) e o `senior-reviewer` roda em Opus; o agente passa a começar por `--stat`, abrir só o que importa, pular `*.test.ts` que só ganhou casos e nunca ler conteúdo de `src/data/*.json`. **(3)** `HISTORICO.md` com 108 KB — fases 0-5 (30 PRs + 4 marcos, 41 KB) movidas pra `HISTORICO_ARQUIVO.md`; 41 PRs antes, 30 + 11 depois, nada perdido. Também: `npm run balance` voltou a embutir `--reporter=verbose --silent=false` (sem a flag o reporter engole o `console.log` do harness e o relatório sai invisível). **Zero código tocado**, 851 testes inalterados.

- **🧹 CHORE 2026-07-28 — reestruturação da documentação.** `PROGRESS.md` (183 linhas, **97 KB, ~27 mil tokens**) era lido por inteiro em toda sessão nova e consumia quase todo o contexto inicial. Passa a ser `HISTORICO.md` (este arquivo), consultado **por PR**, com aviso no topo. No lugar dele entra **`ESTADO.md`** (64 linhas, **4,1 KB, ~1,1 mil tokens** — **24× menor**), que é o que se lê primeiro: estado atual, onde parei, pendências ATIVAS, as 3 regras invioláveis da Fase 7 e ponteiros. `CLAUDE.md` passa a mandar ler `CLAUDE.md` + `ESTADO.md` na abertura, com GDD/PLANO/HISTORICO sob demanda. Criada `preview/` (gitignored, mesmo tratamento de `referencias/`) pros previews visuais dos PRs da Fase 7 — o caminho anterior era o diretório temporário da sessão, frágil e enorme. **Zero código tocado.** Regra nova, valendo daqui pra frente: ao concluir um PR, atualizar OS DOIS — entrada detalhada aqui (acumula) e `ESTADO.md` **reescrito** (substitui).

- **PR 7.5** — Memoização da LUT de comprimento de arco (branch `feat/pr-7.5-memoizacao-lut`, commit `e1dc825` + ajustes de revisão). `pontoNoTracado` (`fluxo-corrida.ts`) remontava a tabela de segmentos `{a, b, comprimento}` **a cada chamada** — 22 carros × 60 fps sobre um traçado já densificado pelo 7.4. Agora a tabela vem de `lutDoTracado`, memoizada em **`WeakMap` chaveado pela IDENTIDADE do array** do traçado.
  **Design escolhido contra o plano original, por leitura do código:** o plano pedia LUT por `pistaId`, o que obrigaria a passar um id pra dentro de uma função de geometria pura. Mas `tracadoSuavizado(pistaId)` (`suavizacao.ts:257`) **já era memoizado** e devolve sempre a mesma referência, e é ela que `TelaCorrida.tsx:218` passa a cada frame — então chavear por identidade resolve sem tocar na assinatura pública. **Efeito colateral registrado: a estabilidade daquela referência virou CONTRATO** entre os dois módulos, e o comentário do `suavizacao.ts` foi reescrito pra dizer isso (trocar aquele `Map` ou devolver cópia defensiva desligaria o cache **em silêncio**, sem nada ficar vermelho).
  **Requisito duro: identidade BIT A BIT.** Soma de prefixos e busca binária foram **proibidas explicitamente** — mudariam a ordem das operações de ponto flutuante e quebrariam os últimos bits. A varredura linear com `alvo -= segmento.comprimento` e os três early-returns ficaram intactos; só a construção da tabela saiu de dentro da função. Travado por golden de **10 pistas × 6 frações com `toBe`** (igualdade exata, `Object.is`), capturado da implementação **anterior** ao PR. Os valores incluem `500.0000000000001` e `299.9999999999995` (Suzuka), que são a assinatura da acumulação linear — qualquer reassociação os quebraria.
  **Motivo real, medido (o PLANO dizia outra coisa):** não é gargalo de CPU. 113 µs/frame antes, 1.100 µs a 1.920 pontos, contra 16.600 de orçamento — 6,6% no pior caso. O custo é **alocação/GC**, até 2,5 M de objetos/s. Texto do PLANO corrigido no chore anterior.
  **Baseline vermelho:** os 3 testes de `lutDoTracado` falhavam com `is not a function`. Os 10 de golden já passavam contra a implementação antiga — eram rede de segurança, não baseline.
  **Revisado pelo `senior-reviewer`: aprovado, 0 bloqueantes.** Ele auditou a identidade bit a bit token a token (não aceitou o comentário como prova), mapeou **todos** os chamadores de `pontoNoTracado` confirmando que nenhum constrói array por chamada (senão o cache só geraria lixo), e varreu o código por mutação in-place de traçado. **3 avisos corrigidos antes do fecho:** (1) o comentário do `suavizacao.ts` passou a mentir com este commit e foi reescrito — era justamente o que o código novo cita como prova; (2) trava de aridade no golden (remover uma fração de `FRACOES` fazia o teste passar cobrindo menos, em silêncio); (3) as três bordas de `pontoNoTracado` (vazio lança, 1 ponto, comprimento total 0) não tinham teste — lacuna pré-existente, fechada aqui porque o PR mexeu na vizinhança delas: a LUT passou a ser construída **antes** do check de `comprimentoTotal === 0`.
  **Aviso 🟡 NÃO corrigido, virou candidato a PR próprio:** a premissa de imutabilidade do traçado não tem trava de tipo. Antes, mutar um ponto dava erro por um frame e se auto-corrigia; **agora a LUT em cache fica permanentemente dessincronizada, em silêncio.** Tipar `TRACADOS_POR_PISTA`/`tracadoDaPista` como `ReadonlyArray<Readonly<Ponto>>` transformaria a premissa em garantia do compilador, a custo quase zero.
  **867 testes** (851 + 13 do PR + 3 de borda da revisão). `eslint` limpo.

- **PR 7.6 — ZEBRA INVARIANTE À DENSIDADE** (branch `feat/pr-7.6-zebra-invariante`, commit `f3653ab`). O critério de zebra deixa de ser "ângulo de virada ≥ 28° **por vértice**" e passa a ser **virada ACUMULADA numa janela de arco** (`JANELA_CURVATURA_ZEBRA = 2 × ALCANCE_ZEBRA = 88 u`), via a função nova `viradaAcumuladaNaJanela`. Motivo: a soma dos ângulos ao longo de um trecho telescopa na virada total e sobrevive à reamostragem; o ângulo por vértice se dilui (90° em 4 vértices = 22,5° cada, abaixo do corte) e a zebra SOME quando a silhueta é densificada — e o redesenho vai de 16 pra 42-115 pontos.
  **🛑 PORTÃO OBRIGATÓRIO DO DEV: PASSOU, medido antes de escrever código.** Monza na densidade atual dá **11 trechos / 38,4%** com os índices `0,2,3,5,6,7,8,9,11,14,15` — reproduzido, não contornado. Janelas de 44, 66 e 88 dão o mesmo resultado; 110 já muda a seleção, e é por isso que 88 é o teto (preservar o desenho do 7.1 — **não** por violação da regra 3, como uma versão do comentário chegou a afirmar: o vértice 1 é a PONTA da reta de largada, não o meio).
  **A saída das 10 pistas é IDÊNTICA.** Provado dumpando os `d` de `pathsDeZebraDaPista` das 10 pistas antes e depois: **diff vazio, byte a byte**. O revisor foi além e comparou o `JSON.stringify` dos `TrechoZebra` completos — idêntico. **Por isso este PR não teve preview: ele não muda um pixel** (o que é diferente de "não mostrei").
  **DESCOBERTA DO REVISOR que muda a leitura do PR: na densidade de hoje a janela é INERTE.** Em Monza, `viradaAcumuladaNaJanela` devolve exatamente o ângulo do vértice nos 16 vértices, porque todo segmento é maior que meia janela (44 u) e nenhum vizinho cai dentro. A preservação do desenho é **estrutural**, não coincidência — mas o mecanismo novo **não é exercitado por nenhuma geometria de produção**, só por sintéticos e curvas densificadas. Está escrito no código com essas palavras.
  **Medições (curva suavizada reamostrada, 10 pistas):** a 120 pontos o critério antigo entrega **0,0-11,6%** de cobertura (Suzuka literalmente 0); o novo, **16,6-40,0%**. A densidade foi variada sobre a **curva suavizada**, não sobre a polilinha de quinas — reamostrar quinas CORTA CANTOS e mediria outra coisa.
  **Divergência deliberada do plano, com dado:** o plano previa trocar também o grampo do alcance (`min(ALCANCE_ZEBRA, segmento/2)`) por um em arco. A medição desaconselhou: com a janela no lugar, todo vértice de uma curva densificada vira candidato e trechos vizinhos de meio-segmento **particionam** o arco da curva (se tocam, nunca se sobrepõem), então a união já cobre a curva; trocar o grampo mudaria a saída de HOJE, quebrando a única coisa que o PR precisa preservar. Registrado como opção disponível, não como dívida.
  **Baseline vermelho:** 11 testes de invariância falhando antes da implementação (Monza 5,6% a 120 pontos). **Mutação nos dois sentidos:** janela `0` derruba 12 testes de invariância; janela `220` derruba o golden do 7.1 — os testes cercam o valor por cima e por baixo.
  **Revisão do `senior-reviewer`: 2 BLOQUEANTES + 5 avisos, todos corrigidos.** (1) o cabeçalho do `suavizacao.ts` afirmava que rodar a detecção na curva "devolveria zero zebras em todas as 10 pistas" — deixou de ser verdade com este PR e foi reescrito (**mesmo arquivo que já custou um bloqueante no 7.5**); (2) a regra inviolável 3 no `ESTADO.md` ainda descrevia o critério antigo; (3) a justificativa do 88 inventava uma violação da regra 3 que não ocorre; (4) faltava dizer que a janela é inerte hoje; (5) **`GOLDEN_COBERTURA` ganhou `indices`** — contagem + cobertura NÃO identificam a seleção, e como a chave de ordenação mudou (`angulo`→`virada`) e o teto de 40% morde em 6 das 10 pistas, outra seleção poderia passar com os mesmos números; (6) a regra 3 passou a ser testada também em densidade alta (48/80/120); (7) o piso do teste de invariância caiu de 15 pra **12**, porque a fronteira real é Suzuka (16,6%) e 1,6 ponto de folga viraria vermelho por qualquer mexida em `AMOSTRAS_POR_SEGMENTO` sem significar regressão de zebra.
  **⚠️ PARA O DEV VER ANTES DO REDESENHO (levantado pelo revisor, fora do escopo deste PR):** a 120 pontos o teto de 40% passa a ser **vinculante em 7 das 10 pistas** e Monza vai de 11 pra ~48 trechos. No regime denso, quem decide o desenho é o teto + a ordem gulosa, não a geometria — e o tracejado `12 12` reinicia a cada trecho. **É decisão de arte e pede preview na densidade alvo** antes de travar 88/40%.
  **882 testes** (867 + 15). `tsc --noEmit`, `eslint` e `npm run build` exit 0.

- **🧹 LOTE DE 2026-07-31 — 3 itens de BAIXO RISCO numa sessão só, autorizados em bloco pelo dev.** Todos com o fluxo curto da regra nova (implementar → testes → commitar), **sem `senior-reviewer`**, cada um em branch própria com merge `--no-ff`.
  **(a) Merge do PR 7.5** (`bfbbb98`) — a memoização da LUT entrou na `main`.
  **(b) `fix:` do shim** (`030a5f4`) — `scripts/node-shims.d.ts:18` passa a declarar `writeFileSync(path, data, encoding?: 'utf8')`. **Pendência 0 FECHADA e MEDIDA: `tsc --noEmit` exit 0, `npm run build` exit 0.** O `tsc` volta a valer como portão depois de 1 dia inútil.
  **(c) `refactor:` traçados imutáveis** (`2c04118`) — fecha o aviso 🟡 do 7.5. Tipo novo **`TracadoImutavel = ReadonlyArray<Readonly<Ponto>>`** declarado em `fluxo-corrida.ts` (junto do `Ponto` e do `WeakMap` que o motiva; declarar em `tracados.ts` faria ciclo de import). `TRACADO_GENERICO`, `TRACADOS_POR_PISTA` e `tracadoDaPista` adotam. Propagação real medida: **zero erros na produção** (as assinaturas já eram `readonly Ponto[]`), só 7 helpers de leitura em `pista-camadas.test.ts`/`tracados.test.ts` que pediam `Ponto[]` mutável. **Zero mudança de runtime.** 867 testes, `eslint` limpo, build verde.
  **⚙️ MUDANÇA DE PROCESSO no `CLAUDE.md`** (`02fffa0`), decidida pelo dev depois de o contexto bater 100% no 7.5: **(1) RIGOR PROPORCIONAL AO RISCO** — alto risco (engine, `src/data/`, balanceamento, portão visual, netcode) mantém o fluxo completo; **baixo risco (docs, chore, refactor sem mudança de comportamento, fix de uma linha) vai direto de implementar pra commitar**, sem `senior-reviewer`, sem mutação, sem auditoria token a token. Diagnóstico do dev, textual: *a causa não é documentação nem duração de sessão, é o **volume de operações por PR***; o 7.5 e o fix do shim eram baixo risco e receberam tratamento de alto risco. **(2) UM PR POR SESSÃO** como padrão — ao concluir, commitar, atualizar docs e **PARAR**, mesmo com fila aprovada; quem decide continuar é o dev. Sessão nova custa ~2,4 mil tokens de abertura.

- **PR 7.6.1 — PREVIEWS DE DECISÃO (cego + zebra na densidade alvo) + pendência 2** (branch `feat/pr-7.6.1-previews-de-decisao`). **BAIXO RISCO, anunciado antes de começar:** nenhum pixel da tela do jogo muda; entrega dois geradores de artefato em `preview/` (config própria, fora do `npm test`) e um teste desatualizado. **Fatiamento decidido pelo dev: previews ANTES da infra** — o preview da zebra destrava a decisão 88/40% que precede a fatia 1, é o item mais barato, e a infra de restrições merece sessão limpa.
  **`scripts/preview-cego.preview.test.ts` → `preview/cego.html`.** A LINHA DE BASE do redesenho, rodada sobre as silhuetas **atuais** (as que o portão do 7.4 já reprovou): 10 silhuetas sem nome, ordem embaralhada por **hash FNV-1a do id** (determinística — nada de `Math.random()`, aqui também não — e não a do dataset, senão a posição entrega a pista), voto por cartão (reconheci / na dúvida / não faço ideia), revelar-tudo e um resumo em texto pra colar no `ESTADO.md`. Geometria, cores e viewBox de produção, **sem** a polilinha de controle rosa: o dev julga o que o jogador vê, não o andaime. Placar baixo aqui é o resultado ESPERADO — é a régua contra a qual a fatia 1 será medida, e o insumo do gatilho de abandono já aceito.
  **`scripts/preview-zebra.preview.test.ts` → `preview/zebra-densidade.html`.** Fecha a **pendência 4** (decisão de arte 88/40%). Por pista, 5 células lado a lado: HOJE (controle de 16 pts) + a mesma forma reamostrada em **120 pontos** com teto 25% / **40% (atual)** / 60% / sem teto. Mais uma **tabela de sensibilidade à JANELA** (44/66/**88**/132/176) — a outra metade da decisão, que o pedido do dev só cobria pelo lado do teto. Toggles pra marcar início/fim de cada trecho (é onde o tracejado `12 12` REINICIA) e pra desligar o tracejado.
  **🔍 ACHADO PRINCIPAL, não previsto no plano: a 120 pontos uniformes o teto de 40% deixa de ser restrição geométrica e vira COTA DE CONTAGEM.** Cada trecho cobre ~1/120 do perímetro (o alcance vira `segmento/2` de cada lado), então o teto admite exatamente `0,40 × 120 = 48` trechos — e é por isso que **sete das dez pistas param em 48 trechos / ~39,8%**. Mônaco tem 93 candidatos e o Nordschleife 102; as duas desenham a MESMA quantidade de zebra que Monza, que tem 48. Quem escolhe QUAIS 48 é a ordem gulosa, não a geometria da pista. Consequência que o dev precisa pesar: **mantido o teto em 40%, o redesenho não muda a QUANTIDADE de zebra de pista nenhuma, só a posição dela.**
  **Reconciliação do "7 das 10" herdado da revisão do 7.6.** Medido por pista, os dois números estão certos sob definições diferentes e o preview agora mostra as duas: o teto **CORTA candidatos em 6** (Mônaco 48/93, Nordschleife 48/102, Imola 48/64, Red Bull Ring 48/61, Interlagos 48/63, Silverstone 48/53) e **SATURA em 7** (as 6 + Monza, 48/48 a 39,8% — todos os candidatos couberam, mas encheram o teto no limite). Spa 46/46 · 38,2%, Montreal 34/34 · 28,2%, Suzuka 20/20 · 16,6% ficam folgadas. **Monza a 120 pts: 48 trechos / 39,8%** — confirma o "~48" que o `ESTADO` previa.
  **Desvio declarado ao dev antes de implementar:** pra varrer o teto no preview, ou o script reimplementava o critério — e aí pararia de refletir a tela, que é a premissa declarada no cabeçalho do preview do 7.4 — ou `trechosDeZebra` ganhava parâmetros. Escolhido o segundo: **`OpcoesZebra` (`anguloMinimo`/`alcance`/`coberturaMaxima`/`janela`), aditivo, todos com default nas constantes do módulo.** Nenhum caminho de produção passa o argumento. Provado por **11 testes novos**: 10 fixam `trechosDeZebra(t, {defaults explícitos})` ≡ `trechosDeZebra(t)` nas 10 pistas (pega a mudança pela CAUSA; os goldens já pegariam pela SAÍDA), e 1 exige que **cada** parâmetro MORDA fora do default — sem ele, um `opcoes` esquecido em qualquer dos quatro usos passaria despercebido pelo teste de identidade. Esse teste nasceu vermelho por motivo real e útil: escrito em Monza, falhou com `expected 48 to be greater than 48` — porque em Monza o teto não corta nada a 120 pts. Trocado pro Nürburgring, a pista onde morde.
  **Pendência 2 FECHADA:** `tracados.test.ts` travava "pontos dentro de `0 0 1000 600`", o viewBox de antes do 7.3, proibindo a faixa y 600-630 que o próprio 7.4 abriu. Agora as bordas vêm de `VIEWBOX_X/Y/LARGURA/ALTURA`, e o teste declara seu escopo: guarda da INTENÇÃO DE DESENHO (o controle), não do que se DESENHA — a curva estoura o bounding box do controle em até 15,1 u (Mônaco) e cada camada espalha 60 u por lado; essa restrição, medida sobre a curva, é do PR de infra.
  **Verificação estrutural do artefato antes de mostrar** (o risco novo era o `<use>` entre SVGs — se a referência quebra, o preview abre em branco e custa uma viagem ao dev): 20 defs / 20 refs, **zero órfãs**, 51 `<svg>` balanceados, 3862 paths de zebra, nenhum `d` vazio, `NaN` ou `undefined`. As camadas da volta viram `<use>` do mesmo `<path>` porque 4 cópias do `d` por célula custariam ~30 KB à toa.
  **893 testes** (882 + 11), 33 arquivos. `tsc --noEmit`, `eslint` e `npm run build` exit 0 — medidos, não herdados. `npm run balance` não se aplica (nada de nota ou lógica de corrida foi tocado). **Sem `senior-reviewer`, pela regra de rigor proporcional ao risco.**


- **PR 7.7 — REDESENHO DAS 10 SILHUETAS a partir da geometria real dos circuitos** (branch
  `pr-7.7-dados-nurburgring`, commit `5564018`). **ALTO RISCO** (portão visual), anunciado ao dev
  antes de começar. Fecha o problema que o portão do 7.4 registrou: *"o aspecto poligonal sumiu e
  o design está bom, mas nenhuma das 10 pistas é reconhecível"*. A causa nunca foi a suavização —
  eram as silhuetas de origem do PR 2.8, formas ilustrativas de 12-22 pontos.

  **O que foi DESCARTADO, e por quê.** A tentativa anterior (Monza + Interlagos, não commitada)
  desenhou coordenadas a partir **só do texto** da referência, mediu depois, e ao encontrar
  divergência **racionalizou nos comentários** em vez de corrigir — o código-fonte dela admitia
  literalmente *"o miolo abaixo está ESPELHADO em relação ao Interlagos real"* e *"T2 saiu como
  KINK de 19,2°, não como a contra-curva imediata fechada da referência"*. O dev viu o preview e
  reprovou. Essas coordenadas foram jogadas fora, não remendadas.

  **O que mudou no método: um harness de verificação ANTES do commit** (em `preview/`, gitignored,
  regenerável). O que faltava não era capricho, era loop de feedback — desenhar às cegas e medir
  depois produz exatamente o erro acima. O harness renderiza a **curva suavizada** (não a
  polilinha de controle) em ASCII com aspecto corrigido, e mede, por pista: sentido de giro na
  tela, sequência de curvas esquerda/direita, separação por arco, raio mínimo, `minNaoAdj`,
  envelope das camadas contra o viewBox e os piores vértices da curva. **Cada guarda que entrou no
  harness pegou defeito real** — a de 45°/vértice pegou três bicos (o canto do ômega da Mercedes
  Arena a 62°, a ponta do grampo de Montreal a 69°, o Loop de Silverstone a 40°), e a de
  `minNaoAdj` pegou a hairpin L'Épingle com os braços a 14 u.

  **As 10 vêm da geometria verificável de cada circuito**: as 9 imagens de referência que o dev
  mandou (`referencias/`, gitignored — obra de terceiros, ver GDD §14.2) lidas como topologia e
  proporção, mais `REFERENCIA_TRACADOS.md`. **Monza é a única sem imagem** e foi desenhada só pela
  descrição textual §1; se o dev largar o print depois, vale refazer. Nenhum mapa foi decalcado: o
  que se leu foi sequência de curvas, sentido e proporção reta/curva, que é fato.

  **Restrições que as 10 respeitam, todas medidas antes de entrar:** sentido de giro na tela
  conforme a referência (horário em 7, anti-horário em Interlagos e Imola, Suzuka mistura por ser
  o 8) — o shoelace em coordenadas de tela tem o sinal invertido em relação à convenção
  matemática, e era o candidato número um a espelhar as 10 de uma vez; separação ≥ 34 u entre
  trechos distantes **no arco, nunca por índice** (decisão travada do dev); raio ≥ 20 u;
  auto-interseção só a de Suzuka, em vértice compartilhado — **exatamente um par, verificado**, um
  segundo seria bug disfarçado de golden velho; < 45° de virada por vértice na curva suavizada.

  **Escala UNIFORME por pista, decidido e declarado.** Cada silhueta é ajustada à moldura
  preservando o aspecto real do circuito. Esticar em x e y independentemente encheria melhor a
  tela e destruiria o "estreito e comprido" de Montreal e o formato compacto de Interlagos, que
  são justamente o que se reconhece. Consequência aceita: **Interlagos não enche a moldura na
  horizontal** (usa 670 de 880), porque o traçado real é quase quadrado.

  **A moldura recuou** de (60,30,940,570) para (56,36,924,564): a guarda de viewBox exige que a
  curva mais `MEIA_CAMADA_MAIS_LARGA` (60 u, o terreno) caiba, e com o recuo anterior o terreno era
  **clipado em até 12 u**. Pior folga hoje: 3,4 (Suzuka).

  **Onde a escala obrigou a escolher, a ESTILIZAÇÃO ganhou da fidelidade** — a regra dos 360 px
  manda que elemento ilegível não entre. O miolo de Interlagos (sete curvas lentas em pouco
  espaço) foi aberto em dois picos separados: a ALTERNÂNCIA é o que identifica a pista, o aperto
  real vira borrão. Idem a garganta do ômega da Mercedes Arena e o zigue-zague de chicanes de
  Montreal. O que nunca se mexeu foi a ORDEM e o SENTIDO das curvas.

  **DUAS LISTAS DE EXCEÇÃO ENCOLHERAM — é o critério declarado no `ESTADO.md`:**
  **(1) espinho de ~180°:** Spa era o último caso (169,5° ⇒ 120,7°) e virou **111,7° ⇒ 24,8°**. A
  lista **ZEROU**, e ganhou um teste que impede ela de voltar a crescer em silêncio, nomeando a
  pista que reintroduzir espinho. **(2) fusão de asfalto na curva suavizada:** Spa saiu (8,8 ⇒
  41,3), o que **FECHA a pendência 1**. Sobra só Suzuka, que é o X do 8, intencional.

  **Goldens re-derivados; NENHUM limiar alterado** (45°/vértice, 17 u de sobreposição, 34 u de
  separação, 20 u de raio, 28°/88 u/40% da zebra). Classificação usada antes de tocar em qualquer
  número: medição descritiva (re-derivar), golden de identidade (re-capturar) e teste cuja premissa
  morreu (reescrever contando a verdade nova). **Três casos do terceiro tipo, documentados no
  lugar:**
  - **`N=8` deixou de reprovar.** O teste provava que N=12 não era chute porque N=8 estourava o
    teto de 0,7 u. Com as silhuetas novas (34-48 pontos) as cordas encolheram, a sagita escala com
    a corda, e **N=8 desvia 0,539 u — passa folgado**. A justificativa de N=12 caiu; o teto NÃO foi
    mexido e `AMOSTRAS_POR_SEGMENTO` continua 12. A redução pra 4-6 já é decisão travada do
    `ESTADO.md` e agora tem o número em mãos — mas é execução própria, não foi feita aqui.
  - **Monza saiu do ZERO de sobreposição** (5,4). O par que aperta **não é ramo contra ramo** — é o
    fim da reta principal contra a saída da Variante del Rettifilo, ou seja, a própria chicane.
    Alargar até voltar a zero exigiria arredondar o degrau, que é o que a referência §1 diz que
    descaracteriza Monza. O teto de 17 segue de pé e Monza passa com 11,6 de folga.
  - **A rede de segurança da memoização da LUT (PR 7.5) acabou**, e isso está escrito no teste:
    golden de geometria não sobrevive a redesenho de geometria, e desta vez não sobrou silhueta
    antiga pra comparar. Sugestão registrada (não feita): recapturar sobre uma polilinha SINTÉTICA
    fixa, que redesenho nenhum mexe.

  **Números do parque redesenhado:** 34-48 pontos por pista (era 12-22); o teto de 40% da zebra
  **morde em 8 das 10** — só Spa (33,4%) e Red Bull Ring (28,0%) não perdem candidato pro corte; a
  janela de arco do PR 7.6 **deixou de ser inerte em produção**, encontrando de 1 (Silverstone) a
  15 (Mônaco) candidatos que o critério por vértice perde, e é SUPERCONJUNTO dele nas 10.

  **904 testes** (893 + 11), 33 arquivos. `tsc --noEmit`, `eslint` e `npm run build` exit 0 —
  medidos, não herdados. `npm run balance` não se aplica (nada de nota ou lógica de corrida).
  ⚠️ **Os números de MONZA nesta entrada foram substituídos pelo PR 7.7.1**, que refez a pista
  quando a imagem de referência dela chegou. O resto da entrada continua valendo.

  **Preview: `preview/redesenho.html`** (o `preview-fatia1` foi generalizado das 2 pistas pras 10),
  com teste cego primeiro e antes/depois depois, ambos passando pelo mesmo pipeline de produção.
  **Aguarda o veredito do dev** — é portão visual, e preview gerado não é preview aprovado.
- **PR 7.7.1 — MONZA REFEITA COM A IMAGEM DE REFERÊNCIA.** A imagem de Monza chegou depois das
  outras nove; no 7.7 ela foi a única desenhada só pela descrição textual de
  `REFERENCIA_TRACADOS.md` §1, e **saiu errada**. O dev mandou o print e pediu o mesmo tratamento,
  sem mexer no resto — foi o que se fez: **só `TRACADO_GENERICO` mudou**, as outras 9 silhuetas
  estão byte a byte iguais.

  **O que a descrição textual não entregou.** A §1 diz "um L muito alongado e achatado", "duas
  retas enormes em direções opostas", "as Lesmo juntas viram ~170°". Tudo verdade, e ainda assim a
  silhueta saiu com a **reta principal em diagonal subindo pela esquerda**. A real é uma **CUNHA**:
  reta principal HORIZONTAL embaixo, lado esquerdo subindo até as Lesmo no canto de cima, a
  diagonal longa do Serraglio descendo até Ascari, reta de volta pra direita e a Parabólica
  fechando na ponta direita. **Prosa correta, forma errada** — é o argumento empírico de que
  descrição textual não substitui ver o traçado, e vale registrar porque foi exatamente o erro que
  o 7.7 corrigiu nas outras.

  **Mesmo método, mesmas guardas, medidas antes do commit:** sentido horário ✅ · envelope das
  camadas cabe no viewBox com folga 4,5 ✅ · separação por arco 90,9 u ✅ · raio mínimo 40,8 u ✅ ·
  pior vértice da curva suavizada 15,7° (guarda < 45°) ✅ · `minNaoAdj` 21,5 ✅. Duas iterações
  vieram do harness: o degrau da **Roggia** estava a 18,4 u (alargado até 21,5) e a **subida do
  lado esquerdo** tinha quatro pontos quase colineares, o que fazia `seg(i)` e `seg(i+2)` medirem
  como trechos diferentes da pista — o mesmo falso positivo de densidade que Montreal deu no 7.7,
  corrigido do mesmo jeito: no DESENHO, espaçando os pontos, nunca no teste.

  **Números que se moveram (só Monza).** 37 ⇒ **49 pontos**. Ângulo do pior vértice 92,95° ⇒ 75,68°
  no controle e 23,65° ⇒ **15,73°** na curva. Overshoot 1,67 ⇒ 1,49. Separação na curva 46,27 ⇒
  50,30. `minNaoAdj` 28,6 ⇒ 21,5, ou seja **sobreposição de asfalto 5,4 ⇒ 12,5** — subiu, e o motivo
  é o mesmo de antes: quem aperta é a chicane desenhada como DEGRAU, agora a Roggia. **O teto de 17
  não foi mexido e Monza passa com 4,5 de folga**; o degrau já foi alargado o quanto dava sem virar
  curva, e arredondar é justamente o que a §1 diz que descaracteriza a pista. Zebra: 18 trechos /
  37,9% ⇒ **27 / 38,5%**, com o teto cortando 4 candidatos (eram 31 / 45,9% sem teto). A janela de
  arco do 7.6 encontra **20 candidatos** que o critério por vértice perde em Monza — passou a ser a
  maior divergência do parque (era Mônaco, com 15).

  **904 testes** verdes, os mesmos do 7.7 (nenhum teste novo; 10 goldens de Monza re-derivados e
  nenhum limiar alterado). `tsc`, `eslint` e `build` exit 0. Preview regenerado em
  `preview/redesenho.html`. **O veredito do dev sobre o portão visual segue pendente.**

- **🔴 DÍVIDA DESCOBERTA EM 2026-07-30: `npm run build` está QUEBRADO na `main` desde o PR 7.4 — e foi pushado pro `origin/main`.** `scripts/node-shims.d.ts:18` declara `writeFileSync(path: string, data: string)` com **dois** parâmetros; o gerador de preview do 7.4 (`scripts/preview-tracados.preview.test.ts:164`) chama com **três** (`'utf8'`). Em runtime o Node aceita o encoding, então `npm run preview` roda normalmente e ninguém percebeu. `npm run build` é `tsc --noEmit && vite build` e sai com **exit 2**. **Enquanto durar, o `tsc` é inútil como portão de qualidade.** Correção é uma linha (encoding opcional no shim), mas fica em `fix:` próprio. **Registro do que isso significa:** o `ESTADO.md` afirmava "`tsc --noEmit`, `eslint`, `npm run build` limpos" e a afirmação era falsa desde o 7.4 — foi **herdada de reescrita em reescrita sem nunca ser medida**, inclusive por mim em duas reescritas do mesmo dia. É o mesmo padrão do "nada foi pushado", também falso e também herdado. **Afirmação de estado em doc só entra medida.** E não é coincidência que o PR que pulou o fluxo inteiro (sem branch, sem merge commit, sem revisão, sem docs) seja o mesmo que deixou o build vermelho.

- **🚦 ERA DOS TRAÇADOS — DECIDIDO PELO DEV EM 2026-07-30. Vale pra QUALQUER redesenho futuro de silhueta, não só pro PR corrente.** Usar sempre o **layout MODERNO/ATUAL** de cada pista, com a **Nordschleife como exceção óbvia** (a F1 parou de correr lá em 1976, não existe versão moderna). Casos concretos já decididos: **Monza SEM o oval banqueado**; **Spa de 7 km, não a de 14 km**; **Imola pós-1995**. **Motivo, nas palavras do dev:** o critério de aceite é *"o jogador reconhece"*, e o que ele reconhece é **o traçado que vê na TV hoje**. Consequência: fidelidade histórica ao layout de época NÃO é objetivo do projeto e não deve ser proposta como melhoria — o jogo cobre 1950-2025 nos DADOS (equipe/ano, notas), não nas silhuetas.

- **🚦 PORTÃO DO PR 7.4 — VEREDITO DO DEV EM 2026-07-30, depois de ver `preview/tracados.html`: SUAVIZAÇÃO APROVADA, OBJETIVO NÃO ATINGIDO.** Textualmente: *"o aspecto poligonal sumiu e o design está bom"*, **mas** *"nenhuma das 10 pistas é reconhecível"* — Suzuka virou um 8 simétrico perfeito (o real tem reta longa e curvas assimétricas), Monza não tem as duas retas longuíssimas nem as chicanes, Interlagos não tem o S nem a subida. **O dev registrou explicitamente que isto NÃO é falha do 7.4** — ele fez o trabalho dele. A causa é a SILHUETA DE ORIGEM (PR 2.8): formas ilustrativas de 12-22 pontos. **Suavizar forma genérica dá forma genérica arredondada.** Daí nasceu a trilha de redesenho abaixo. **Critério de aceite declarado pelo dev, assumidamente subjetivo e não automatizável:** o jogador vê a pista e pensa *"poxa, Interlagos"* **sem ler o nome**. Portão visual do dev, possivelmente em mais de uma rodada (o 7.1 levou 3).

- **📐 TRILHA DE REDESENHO DAS SILHUETAS — PLANO APROVADO PELO DEV EM 2026-07-30** (planejado pelo `fable-architect`, medições reproduzidas na sessão principal antes de reportar). **Três medições contradisseram premissas e mudaram o plano:**
  **(1) A premissa da zebra estava INVERTIDA.** A premissa do dev era *"mais vértices = mais candidatos a zebra"*. Medido (mesma forma, reamostrada por arco, densidade crescente): **Monza cai de 11 trechos / 38,4% com 16 pontos pra 8 trechos / 9,6% com 80 pontos**; Nürburgring cai de 85,2% pra 24,8%. Duas causas somando: o ângulo por vértice **se dilui** (curva de 90° repartida em 4 vértices = 22,5° cada, abaixo do corte de 28°) e `alcance = min(ALCANCE_ZEBRA, segmento/2)` é grampeado por um segmento que encolhe junto. O modelo foi validado contra a produção: a linha de 16 pontos reproduz exatamente o golden aprovado de Monza (`pista-camadas.test.ts:663`). **Consequência: o teto de 40% deixa de morder e o risco é zebra NENHUMA, não zebra demais.** Se a fatia 1 fosse ao portão assim, o dev não conseguiria separar "a silhueta está errada" de "as zebras sumiram". **O critério de 28° por vértice é proxy de curvatura que só funciona na densidade de hoje (~16 pontos/volta) e quebra por construção no redesenho.**
  **(2) O motivo do 7.5 escrito no PLANO estava errado.** Medido (22 carros × 600 frames): 113 µs/frame hoje, 1.100 µs a 1.920 pontos, contra 16.600 de orçamento — **6,6% do frame no pior caso**. O "degrada ~10x" é verdade como razão e falso como implicação; **o custo real é alocação/GC, não throughput**. O 7.5 continua vindo primeiro, por motivo melhor: tira a contagem de pontos da mesa pra que o orçamento seja decisão visual/jurídica. Texto do `PLANO_CLAUDE_CODE.md` corrigido no mesmo chore.
  **(3) `AMOSTRAS_POR_SEGMENTO` tem que CAIR de 12 pra 4-6, não subir.** O critério que fixou 12 é sagita ≤ 0,7 u **por segmento**, e sagita escala com a corda; a corda média de Monza cai de 132 u pra ~44 u com 48 pontos. Manter 12 geraria curvas de 600-1.300 pontos sem ganho visível. N adaptativo foi **rejeitado**: `indiceDoVertice` depende de N uniforme pro mapeamento aritmético controle→curva.
  **Orçamento de pontos aprovado** (método: `2×retas + 3×curvas + 2`, limitado por `perímetro / 24 u`; 24 u ≈ 7,7 px a 320px, acima do piso dos 360px e abaixo de `ALCANCE_ZEBRA = 44`): Red Bull Ring 38-44 · Monza 42-50 · Imola 48-56 · Montreal 48-58 · Interlagos 48-58 · Silverstone 52-62 · Suzuka 52-62 · Mônaco 52-62 · Spa 56-66 · **Nordschleife 95-115**. É 2,5-4x o de hoje, ~6x na Nordschleife.
  **DECISÃO DE ARTE DO DEV, tomada ANTES de desenhar: a Nordschleife PERDE ~40 das ~73 curvas** (retém ~30-35). Razão aceita pelo dev: *"ninguém reconhece a Nordschleife pela curva 47, e sim pelo contorno alongado assimétrico e pela Döttinger Höhe"*. Karussell ilegível a 360px é **consequência aceita da regra dos 360px**, que continua valendo. **Largura de asfalto por pista foi REJEITADA pelo dev**: colidiria com a guarda de raio de carro (`pista-camadas.test.ts:853` trava que o marcador a 360px não encolha abaixo do que era na main) *"pra ganhar detalhe invisível — trade ruim"*. Princípio que vale pras 10: **fidelidade de SILHUETA e de 4-6 features assinatura, não de linha de centro.**
  **`LARGURA_ASFALTO = 34` MANTIDA.** Separação ≥ 34 u entre trechos não adjacentes e raio de curva ≥ 20 u viram **restrições de desenho declaradas e testadas** — que é exatamente a distorção que a nota jurídica quer, então trabalha a favor.
  **Baseline vermelho honesto:** nenhuma métrica automatizável de reconhecimento foi inventada. **Distância de Hausdorff contra a pista real foi explicitamente RECUSADA** — aproximaria o artefato do mapa oficial, que é o que o GDD §14.2 proíbe. No lugar, as **restrições viram testes vermelhos hoje** (contagem de pontos, passo mínimo, separação, raio, preenchimento ≥ 85% da moldura, `ORIGEM_DECLARADA`, e a invariância da zebra à densidade), silenciados por uma allowlist `LEGADO` **que só encolhe**.
  **Sequência aprovada:** 7.5 (LUT) → zebra invariante à densidade (**PARADA OBRIGATÓRIA: se a métrica nova não reproduzir 11 trechos / 38,4% em Monza na densidade atual, PARAR e mostrar ao dev**) → infra de restrições + preview cego rodado sobre as silhuetas ATUAIS como **linha de base documentada** → **fatia 1 = Monza + Interlagos** → **PARAR e ir pro pit (7.7/7.8)**. Fatias seguintes (Mônaco+Spa+Silverstone, Imola+Montreal+RBR, Suzuka sozinha, Nordschleife sozinha, fechamento) só depois do pit. **Critério de fatiamento aprovado: "estressa as restrições", NÃO "as mais icônicas"** — iconicidade não informa se o método funciona. **Gatilho de parada aceito pelo dev: se a fatia 1 não mover o ponteiro contra a linha de base cega, PARAR e reabrir a pergunta em vez de fazer as outras 8 por inércia** — o risco de fundo é que reconhecimento talvez não seja função de fidelidade geométrica.
  **Descrições geométricas das 10 aprovadas sem correções** (item 1 do plano; 6 de memória, 4 pesquisadas com fonte citada: Nordschleife, Red Bull Ring, Montreal, Imola). Divergência registrada e deliberadamente NÃO resolvida: uma fonte descreve Tosa→Piratella (Imola) como descida, contra o conhecimento prévio de subida — **irrelevante em vista de cima**, e o dev mandou seguir.

- **🚦 ITEM 4 (narração de ultrapassagem) — DECIDIDO PELO DEV EM 2026-07-27: opção (a).** Narrar só trocas significativas, **sem tocar a engine**. **REGISTRO EXPLÍCITO, pedido do dev: "ultrapassagem narrada" neste jogo é TROCA DE POSIÇÃO DERIVADA DE TEMPOS DE VOLTA INDEPENDENTES, NÃO uma disputa modelada.** Nunca vai existir "defendeu a posição por três voltas", e a UI não deve sugerir que existe.
  **A premissa original do dev estava errada e ele registrou isso:** não existe "modelo de bloqueio do PR 1.4". `corrida.ts:13-17` diz textualmente que *"cada carro é simulado de forma independente — sem interação carro-a-carro (ultrapassagem/defesa real, tráfego)"*; `simularCorrida` chama `simularCarro` num `map` isolado e a posição só nasce do `sort` final por tempo total. O que o PR 1.4 tem é `gridOffsetMs`, um custo em ms embutido na volta 1 por posição de grid — **calibragem, não disputa**.
  **Medição que sustenta o "só trecho significativo"** (20 corridas × 5 pistas, arquivo temporário, não commitado): derivar ultrapassagem comparando a ordem entre voltas consecutivas dá **9,1 trocas de posição por volta** num grid de 22 — 41% do grid muda de lugar toda volta — e **só 22,8% têm explicação narrável (pit do próprio carro)**. Em Monza dariam ~127 "ultrapassagens" por corrida. Sem filtro, é ruído, não narração.
  **(b) — modelar interação carro-a-carro de verdade — está DESCARTADO**, com o motivo registrado pelo dev: reabriria o portão 6.3 fechado no mesmo dia. Mudaria os tempos de volta de todo mundo, quebraria as 2 seeds de ouro de `corrida.test.ts`, forçaria recalibrar as Metas 1-3 do balance-harness e **aumentaria a variância da corrida** — ou seja, mexeria justamente no ρ que a opção B do portão decidiu aceitar.

- **PR 7.8 - PALETA GRAFITE/F1, COM DARK E LIGHT MODE** (branch `pr-7.7-dados-nurburgring`, commit
  `f736e6c`). O dev pediu a troca da paleta azul-noite (`#16132E` e derivados) porque ela "parece
  genérica e feita com IA — todo projeto que usa IA gera esse mesmo azul-roxo", e especificou a
  substituta: grafite neutro com três acentos que têm SIGNIFICADO em F1 — vermelho `#FF1801`
  (marca/ação primária/jogador), dourado `#FFB800` (pódio/campeão), verde `#00D26A`
  (largada/status ok). **Engine intocada; `src/engine/` e `src/data/` não aparecem no diff.**

  **O que a medição achou ANTES de escrever código** (é o que definiu o PR). O dark mode proposto
  passou quase inteiro: **uma única falha**, `vermelho/fundo` a 4,461 contra 4,5 — 0,9%. O light
  mode teve **9 falhas**, todas com a mesma causa raiz, que não é ajustável: `#FFB800` tem
  luminância 0,555 e `#00D26A`, 0,471; contra o branco quente `#F5F0EB` (0,877) eles dão **1,53:1
  e 1,78:1**. Acento de luminância média não pode ser texto sobre fundo quase branco — é teto da
  cor, não par a corrigir. Isso conflitava de frente com o pedido explícito "os três acentos ficam
  IGUAIS nos dois modos", então foi ao dev com os números em vez de ser resolvido por conta.

  **Três decisões do dev** (todas as recomendadas): (1) **hex da marca idêntico nos dois modos onde
  é PREENCHIMENTO**, e um token irmão `*Texto` mode-scoped só onde a cor vira tinta (texto, ícone,
  linha de 1px) — botão dourado com texto `#0F0F0F` dá 11,05:1 nos dois modos, e o link dourado no
  claro sai de 1,53 pra 4,52; (2) **`primaria/fundo` reclassificado pra 3:1**, porque pelo próprio
  brief o vermelho é botão/destaque/carro — elemento de UI, não corpo de texto — e `#FF1801` tem
  teto de 5,383 contra preto puro, de modo que exigir 4,5 significaria abandonar o hex da marca;
  (3) **zebra vermelho + branco**, que é o zebra real de F1 e saiu de graça com o vermelho virando
  a primária (era amarelo + salmão).

  **A CONSEQUÊNCIA QUE NINGUÉM TINHA PEDIDO: a pista inteira teve que escurecer.** O teto de
  luminância do asfalto não é escolha de gosto — é derivado do par `carro do jogador / asfalto >=
  3`. Com o magenta (L 0,295) o teto era **0,0650**; com o vermelho `#FF1801` (L 0,219) caiu pra
  **0,0397**, e o asfalto roxo antigo (`#3E3A5C`, 0,0482) **deixou de caber**. Tabela recalculada:
  escape 0,0060 < chão 0,0103 < terreno 0,0144 < serviço 0,0194 < muro 0,0273 < **asfalto 0,0369**
  (7,7% de folga sob o teto). Ordem e hierarquia preservadas; a adjacência mais apertada deixou de
  ser chão->terreno (agora 1,398) e passou a ser muro->asfalto (1,350). Ganhou teste dedicado que
  falha apontando a CAUSA ("o carro do jogador some") em vez de um par genérico, mais um teste que
  registra que o asfalto antigo não caberia — pra ninguém "restaurar" achando que foi troca de
  gosto.

  **`pistaChao` e `pistaEscape`: tokens novos, mesmos valores do escuro.** Estes dois papéis eram
  de `fundo` e `fundoAfundado`, e esses agora MUDAM com o tema. No claro, o chão do replay viraria
  `#F5F0EB` e o sulco de escape `#E8E3DE`: o terreno ficaria muito mais escuro que o chão, o relevo
  aprovado no 7.3.1 inverteria pro "poço" que o dev REJEITOU, e uma faixa branca apareceria no meio
  da pista. Como os valores no escuro são idênticos aos de antes, **o modo escuro não mudou de
  aparência em nada**. A guarda mais barata do PR veio junto: `fundo`, `fundoAfundado` e
  `fundoElevado` **saíram da união `CorDePista`**, então pintar camada de pista com token que muda
  de tema **nem compila**.

  **O painel do replay é ilha escura nos dois temas**, e isso é estrutural, não estético: a regra 1
  da Fase 7 (asfalto é a superfície mais clara) é impossível sobre base clara — o teto do asfalto é
  0,0397 e a base clara está em 0,877. Consequência registrada: `SUPERFICIES_DO_REPLAY` perdeu
  `fundo`/`fundoElevado`, porque o limite de pista não encosta neles (e não passaria: `pistaLimite`
  contra card branco dá 2,81).

  **Decisão de olho do 7.3.1 preservada, com o teste reescrito pra travar a SUBSTÂNCIA.** O teste
  afirmava `SUPERFICIE_BASE_REPLAY === 'fundo'`; agora afirma `'pistaChao'` + que o chão **não pode
  ser mode-scoped** + que o terreno é degrau que SOBE. Travar o nome do token teria feito a decisão
  passar no escuro e ser falsa no claro.

  **`borda` continua DECORATIVA** (fora de `PARES_CONTRASTE`) — foi verificado, não assumido: a
  separação card/base é fraca nos DOIS modos por construção (1,213 no escuro, 1,132 no claro), o
  claro não piorou nada, e exigir 3:1 da borda transformaria todo card em wireframe.

  **Tema em três blocos de cascata** (`tokens.css`): `:root` escuro -> `@media
  (prefers-color-scheme: light)` escopado com **`:root:not([data-tema])`** -> `:root[data-tema]`
  manual. O `:not()` é o que faz o toggle vencer o SO **nos dois sentidos** — sem ele, quem tem o
  SO no claro e escolhe escuro continua no claro, porque o `@media` vem depois com a mesma
  especificidade. É um bug que passa despercebido em quem testa num SO só, então ganhou teste.
  `tema.ts` (lógica pura) tem TRÊS estados, não dois: `'sistema'` REMOVE o atributo, que é o que
  reativa o `@media`.

  **A sincronia `tokens.ts` <-> `tokens.css` teve que mudar de forma.** O parser antigo varria o
  arquivo inteiro com um regex e jogava tudo num `Map`: com dois temas, a última declaração de
  `--fundo` (a do bloco claro) sobrescreveria a do `:root` e o teste passaria a comparar o valor
  CLARO contra `cores`. Agora lê **bloco a bloco**, cada um contra a paleta do seu modo, e reprova
  token declarado só no tema claro.

  **Medido, não herdado (2026-08-06):** `npm test` **1012 passando, 34 arquivos** (eram 904/33 —
  os pares rodando nos dois modos somaram ~97); `tsc --noEmit` e `npm run build` **exit 0**;
  `eslint src scripts` **limpo**; **Modo Cego verde** (`card-peca-cego`, 3/3 — a troca de paleta
  não introduziu vazamento de raridade). **`npm run balance` inalterado por construção**, e a prova
  é de dependência, não de olho: o harness importa só `src/engine/dataset`, `src/data/*.json` e
  `scripts/alavancas`, e **nenhum dos três aparece no diff** — a paleta não tem caminho até ele.

  **Mutação (7 mutantes, todos mortos):** asfalto clareado pra `#3C3C3C` -> 5 falhas; `primaria`
  virando mode-scoped -> 4; `pistaChao` virando mode-scoped -> 4; `textoEscuro` voltando a ser
  igual ao `fundo` -> 3; zebra sumindo contra o asfalto -> 2; `@media` sem o `:not([data-tema])`
  -> 1; `tokens.css` dessincronizado do `tokens.ts` -> 1. O mutante nomeado do 7.2 (`#322D58`,
  razão 1,118 contra o muro) foi trocado pelo análogo grafite `#313131` (1,124), escolhido pelo
  mesmo critério: preserva a ordem inteira de luminância e mesmo assim reprova na separação.

  **Preview: `preview/paleta.html`, ARQUIVO NOVO de propósito.** Não regenera `redesenho.html` —
  aquele é o portão AINDA ABERTO das silhuetas, e repintá-lo misturaria duas perguntas que o dev
  precisa responder separado. ATENÇÃO: **`npm run preview` roda TODOS os geradores e repintaria o
  `redesenho.html` com a paleta nova**; enquanto o veredito das silhuetas não sair, gerar só este:
  `npx vitest run --config vitest.preview.config.ts scripts/preview-paleta.preview.test.ts`.

  **Pendências abertas por este PR:** (1) o `BotaoTema` é um botão discreto no canto do
  `app-shell` — posição e forma não passaram por veredito de arte; (2) `erro` (salmão `#FF7B85`) e
  `raridadeProibido` (`#FF4757`) continuam sendo dois vermelhos ao lado do vermelho da marca — não
  foi mexido porque é decisão de arte, mas o dev pode querer olhar com a paleta nova na tela.

- **PR 8.1 — CALENDÁRIO DO CAMPEONATO SORTEADO POR SEED** (branch `pr-8.1-calendario-sorteado`,
  commit `63e3e82`). Abre a **Fase 8 — Modo Campeonato**, aprovada pelo dev na sessão anterior em 4
  PRs (8.1 engine, 8.2 persistência, 8.3 telas, 8.4 integração), com dois submodos: **curta** (5
  pistas sorteadas das 10, default) e **completa** (10 pistas em ordem embaralhada), convivendo com
  a "Corrida rápida" de hoje.

  🔎 **O ACHADO QUE REDESENHOU A FASE, e vale mais que o PR:** o plano aprovado descrevia o 8.1 como
  "engine do campeonato: encadear N corridas acumulando pontos FIA, promover a lógica do
  balance-harness". **Isso já existia inteiro desde a Fase 6** e a promoção já tinha acontecido —
  `src/engine/campeonato.ts` (simulação por etapa, pontuação FIA, `acumularClassificacao` com
  desempate countback), `src/ui/fluxo-campeonato.ts` (formatos curta/completa, `N_ETAPAS`,
  `iniciarCampeonato`, `avancarEtapa`, `simularOResto`, `classificacaoApos`) e
  `src/ui/persistencia.ts` (save, impressão digital, `retomarCampeonato`) já estavam escritos e
  testados. **O que NUNCA foi feito é o antigo PR 6.6 — as telas.** Nada em `App.tsx` /
  `TelaInicio.tsx` importa campeonato: o modo existe, é determinístico, é testado, e é
  **inalcançável pelo jogador**. Sobrou de verdade pro 8.1 exatamente uma coisa: o sorteio do
  calendário — que é, literalmente, o nome da branch.

  **`calendarioPadrao` NÃO foi tocado.** Ele é o calendário estável dos testes, dos goldens e do
  harness, e um teste existente (`fluxo-campeonato.test.ts`, "devolve os ids na ordem do
  dataset.pistas") trava essa ordem de propósito. O sorteio entrou como função IRMÃ,
  `calendarioSorteado(dataset, seed, formato)`; os dois guards de validação (formato fora do union,
  dataset menor que o formato) viraram o helper `etapasDoFormato`, que recebe o nome da função pra
  a mensagem de erro sair byte a byte igual à de antes.

  **Três propriedades do desenho, cada uma com o teste que a trava:**
  1. **Embaralha as 10 e SÓ ENTÃO corta em N** — nunca sorteia 5 direto. Por isso a curta é prefixo
     da completa pra QUALQUER seed: `formato` não entra no `deriveSeed` nem no input do `shuffle`,
     então as duas chamadas consomem o mesmo stream e só diferem no corte. É propriedade por
     construção, não empírica — travada num loop de 50 seeds, não numa seed de sorte.
  2. **Namespace de seed próprio**, `deriveSeed(seed, 'calendario')`, nunca a seed crua. Inventário
     de labels em uso conferido na revisão: `bots`, `draft:*`, `quali:*`, `corrida:*`,
     `camp:<pistaId>`, `pit:*`, `grid:*`, `paradas:*` — sem colisão.
  3. **A classificação final NÃO depende da ordem do calendário.** `seedDaEtapa` deriva a seed só do
     id da pista e a soma de pontos é comutativa. Isso só é PROVA porque o comparador de
     `acumularClassificacao` termina em `cmpJogadorId` (`campeonato.ts:204-209`) e portanto é ordem
     **total** — se ele pudesse devolver 0, o `sort` estável preservaria a ordem de inserção (que
     difere entre os dois calendários) e o teste estaria passando por sorte do fixture. Verificado
     no código, não na doc.

  **Medido, não herdado (2026-08-07):** `npm test` **1028 passando, 34 arquivos** (era 1018 — os 10
  novos são o baseline vermelho deste PR); `tsc --noEmit` e `eslint src scripts` **exit 0**.
  Baseline vermelho legítimo antes da implementação: 10 falhas, todas `calendarioSorteado is not a
  function`. **Mutação:** trocar o namespace pela seed crua mata o teste de namespace; cortar antes
  de embaralhar mata o teste de prefixo. `npm run balance` **inalterado por construção** — o harness
  importa `src/engine/dataset`, `src/data/*.json` e `scripts/alavancas`, e nenhum dos três foi tocado.
  **`prettier --check` reprova os dois arquivos, mas já reprovava no HEAD** (verificado com
  `git show HEAD:<arquivo>`): é pré-existente, não regressão, e prettier não está no gate.

  **Revisão (`senior-reviewer`): sem bloqueante.** Avisos aplicados: precondição explícita
  `expect(dataset.pistas).toHaveLength(N_ETAPAS.completa)` nos dois testes que assumiam 10 pistas em
  silêncio (com 11, falhariam parecendo bug de calendário em vez de premissa velha); prefixo virou
  propriedade sobre 50 seeds; `nomeFn` virou union em vez de `string`.

  **📏 MEDIÇÃO DO SAVE — o número que mata o compress+base64 do plano do 8.2.** O save real do
  campeonato é **16.876 chars ≈ 16,48 KB** (22 jogadores, temporada completa; a curta dá 16.784) —
  **0,32% de uma quota de 5 MB**. Método: draft REAL resolvido por bots até `fase === 'concluido'`
  (com sorteios/progresso/`copiasRestantes` populados), não save sintético de teste, que é menor que
  a vida real. **Compressão seria dependência nova sem problema pra resolver.**

  **Verificado por LEITURA, sem teste** (candidato natural ao que sobra do 8.2):
  `SaveCampeonato.calendario` é `string[]` persistido explicitamente e `retomarCampeonato`
  re-hidrata a partir DELE (`iniciarCampeonato(dataset, loadouts, save.seed, save.calendario)`),
  nunca recomputando o calendário a partir da seed. Logo **calendário sorteado faz round-trip sem
  bump de `VERSAO_FORMATO`** — e, de quebra, reordenar/acrescentar pista no dataset não corrompe
  save existente, o que torna a ausência de um golden "seed 42 ⇒ [ids…]" correta, não uma lacuna.

  **Pendência aberta por este PR (aviso da revisão, NÃO aplicado — é decisão do dev):**
  `calendarioSorteado` é o **primeiro consumidor de RNG semeado fora de `src/engine/`** (os outros 13
  usos de `deriveSeed` em `src/` estão todos na engine). Não é bloqueante — `calendarioPadrao` já
  morava aqui desde a Fase 6, e `eslint.config.js:76` já trata `fluxo-campeonato.ts` como arquivo
  crítico de determinismo. O custo é na **Fase 3 (online)**: o desenho natural é "servidor escolhe a
  seed, todo cliente deriva o mesmo calendário", o que faria `src/net/` importar de `src/ui/`. Mover
  hoje é barato (as 4 exportações vão pra `engine/campeonato.ts` e `fluxo-campeonato.ts`
  re-exporta, zero mudança em ~90 referências de teste); depois que a UI da Fase 8 e os caminhos de
  save apontarem pro path de `ui/`, fica caro.

- **PR 8.2 — SAVE DO CAMPEONATO AGUENTA CALENDÁRIO SORTEADO** (branch `pr-8.1-calendario-sorteado`,
  commit `6cb02cc`). **Diff SÓ DE TESTE — `persistencia.ts` não foi tocado.** O 8.2 do plano previa
  compress+base64 e uma camada de abstração; a camada já existia (PR 6.5) e a compressão morreu na
  medição registrada na entrada do 8.1 (**16,48 KB = 0,32% de 5 MB**). Sobrou uma pergunta, e este
  PR é ela: o save aguenta o calendário sorteado do 8.1? Era "sim, por leitura" — virou medido, que
  é a regra do projeto.

  **O teste discriminante, e por que ele é o que vale:** um save cujo `calendario` foi **REORDENADO**
  (mesmos 10 ids, ordem trocada) é **REJEITADO** na retomada. `calcularImpressaoDigital` é
  `seedFromString(etapas.map(resumoDaEtapa).join('||'))` — junta na **ORDEM** do array. Se cobrisse
  só o CONJUNTO de resultados, um save adulterado (ou mangled por bug de serialização) retomaria em
  SILÊNCIO com outra ordem de corridas, e o jogador veria um campeonato diferente do que salvou.
  Não é hipotético pro resto da fase: é a UI dos PRs 8.3/8.4 que vai gravar e reler esse save.
  **Mutação:** fazer a impressão digital ordenar as etapas antes de juntar (isto é, cobrir só o
  conjunto) mata exatamente esse teste, e só ele.

  Os outros dois: round-trip preserva o calendário embaralhado e o cursor **sem bump de
  `VERSAO_FORMATO`** — com anti-tautologia explícita (`expect(calendario).not.toEqual(
  calendarioPadrao(...))`, sem a qual uma implementação que ignorasse `estado.calendario` e
  recomputasse a ordem do dataset passaria) —; e **temporada curta sorteada e CONCLUÍDA**
  (`etapaAtual === etapas.length`) fazendo round-trip inteiro.

  **Revisão (`senior-reviewer`): sem bloqueante, três avisos, todos aplicados** no commit `0f3e178`.
  O aviso que vale registrar como lição: **duas das quatro asserções do primeiro teste eram
  INFALSIFICÁVEIS.** `versaoFormato === VERSAO_FORMATO` é implicado por `carga.ok` (o `carregar` já
  devolve `versao-incompativel` pra qualquer outro valor) e comparar a impressão digital do estado
  retomado com a do save é implicado por `retomarCampeonato` ter retornado (ele LANÇA quando
  divergem). **Bumpar `VERSAO_FORMATO` pra 2 não quebrava a primeira** — asserção que não pode
  falhar é ruído que se lê como cobertura. Quem de fato garante a ausência de bump é a lista literal
  de chaves de `salvarCampeonato`. Também entrou o caso de borda que faltava e que o 8.4 vai gerar
  toda vez que alguém terminar um campeonato: o guard de `persistencia.ts:368-376` rejeita
  `etapaAtual > length` e **aceita `=== length`**, mas os testes só exercitavam os valores fora de
  faixa (999, -1) — o limite VÁLIDO, que é o estado da tela de fim de temporada, nunca era exercido.

  **Medido em 2026-08-07:** `npm test` **1031/34** (era 1028), `tsc --noEmit` e `eslint src scripts`
  **exit 0**. **Duas mutações:** ordenar as etapas na impressão digital mata o teste de reordenação;
  trocar o guard pra `>= length` mata o teste de borda. Cada uma mata um teste, e só ele.

- **PR 8.4-mínimo — SELETOR DE FORMATO E MODO CAMPEONATO JOGÁVEL** (branch
  `pr-8.1-calendario-sorteado`, commit `4ba4f50`). O dev pediu o seletor de "Formato" na
  `TelaInicio` e classificou como **baixo risco (UI)** — classificação mantida, porque ele mesmo vai
  rodar o app, o que é mais forte que qualquer preview.

  **O PR é maior que o pedido literal, e de propósito.** Um seletor de Formato sozinho seria
  decorativo: antes deste commit **nada** em `App.tsx`/`TelaInicio.tsx` importava campeonato e
  **nada** chamava `salvarCampeonato`, então escolher "Campeonato curto" levaria a uma corrida
  avulsa e o botão "Continuar" nunca apareceria. O critério de aceite do dev era testar o
  campeonato inteiro; entregar só o `<select>` falharia nele.

  🔑 **O BUG QUE QUASE ENTROU — vale mais que o resto da entrada.** As duas trilhas de corrida usam
  seeds **diferentes de propósito** (decisão D6, `engine/campeonato.ts`): a corrida avulsa simula
  com a seed **crua** do draft; a etapa de campeonato usa `seedDaEtapa(seed, pistaId)`. Como
  `iniciarCampeonato` **pré-simula todas as etapas** e a pontuação sai dali, rotear o campeonato
  pelo `FluxoCorrida` existente faria o jogador **assistir a uma corrida e ver OUTRA na tabela** —
  vencer na tela e aparecer em 8º nos pontos. **Nada em `npm test` pegaria**, porque cada lado,
  isolado, está correto; só a composição está errada. Conserto: `prepararCorrida` ganhou o parâmetro
  `seed` (default = seed do draft, então a corrida avulsa fica bit a bit igual), e há teste provando
  que, com `seedDaEtapa`, o que se assiste **reproduz a etapa pré-simulada bit a bit**.

  **Decisões de desenho que valem além deste PR:**
  - `FormatoPartida` é `'unica' | FormatoTemporada`, **não** um union novo de três valores: os dois
    valores de campeonato passam DIRETO pra `calendarioSorteado`/`N_ETAPAS`, sem tabela de tradução
    no meio pra sair de sincronia depois.
  - A regra condicional (`mostraSeletorDePista`) e o resumo do save (`resumoCampeonatoSalvo`) moram
    em `fluxo-campeonato.ts`, **não no `.tsx`** — o projeto não tem jsdom, então lógica dentro de
    componente é lógica sem teste. Mesmo padrão de `decisaoLocal`/`seedEfetivaTexto`.
  - **O formato NÃO foi acrescentado ao save.** É derivável do tamanho do calendário, e o campo novo
    obrigaria a bumpar `VERSAO_FORMATO` e invalidar todo save existente por informação já implícita.
  - **`key` por etapa no `FluxoCorrida`**: o `useState` de `useCorrida` só roda o inicializador na
    montagem — sem a `key`, trocar de etapa não re-prepararia a corrida e o jogador correria a
    primeira pista o campeonato inteiro.
  - **O save só é apagado no "Novo draft" explícito e ao começar partida nova**, nunca ao abrir a
    página: fechar a aba no meio de um campeonato não pode perder progresso, que é o ponto do
    "Continuar".
  - "Continuar campeonato" exigiu um caminho de **hidratação** no `useDraft` (`retomar`), que não
    existia — o hook só sabia criar draft do zero. `humanosDoDraft` reconstrói a lista de humanos a
    partir de `draft.jogadores` (o save não guarda a config da TelaInicio) e ganhou teste próprio,
    porque errar ali traz o modo Local de volta com nomes trocados e quebra o roteamento hotseat.

  O `PainelCampeonato` é **cru de propósito** (reusa `.tabela-grid`, ~40 linhas de CSS novas): as
  telas de verdade são o **PR 8.3**. Ele existe pra tornar a mecânica jogável e julgável ANTES de
  investir no design.

  **Medido em 2026-08-07:** `npm test` **1051/35** (era 1046), `tsc --noEmit`, `eslint src scripts` e
  `npm run build` **exit 0**. Entrou `campeonato-render.test.ts`, que renderiza as telas novas com
  `renderToStaticMarkup` em Node puro (padrão já usado em `pista-camadas-render.test.ts`): **um erro
  de runtime na primeira tela passaria por `tsc`, por `eslint` e pela suíte inteira** e só apareceria
  como tela branca na mão do dev.

- **PR A (narração rica) — VARIEDADE E CONTEXTO DE CHUVA NOS EVENTOS** (branch
  `pr-8.1-calendario-sorteado`, commit `1537ad6`). Feedback de quem jogou: a narração dizia sempre
  "Erro de pilotagem". Agora cada evento tem variante, e a chuva troca o vocabulário.

  **Plano feito pelo `fable-architect`** (3 PRs: A variedade, B causalidade, C auto-avanço),
  aprovado pelo dev com as três correções que o plano propôs ao pedido original — ver a entrada do
  PR B para a mais importante delas.

  🔑 **`deriveSeed` como HASH, nunca como stream.** A escolha da variante é
  `deriveSeed(seed, 'narracao:<jogador>:<volta>:<tipo>') % pool.length`. Não há `createRng` no
  módulo, não há estado mutável, não se consome sequência. **Nenhum tempo de volta muda e nenhum RNG
  novo é consumido** — as seeds de ouro e o `balance-harness` ficam intactos *por construção*, que
  era a restrição nomeada pelo dev. E a mesma corrida narra igual sempre: reabrir um save não
  reescreve o que foi dito. O `tipo` entra na label porque um carro pode ter dois eventos na mesma
  volta; sem ele, os dois cairiam no mesmo índice.

  **Resposta ao "isso exige tocar a engine?": NÃO, nem aditivamente.** Tudo sai do que
  `ResultadoCorrida` já carrega (`custoMs`, `historicoVoltas`, `voltasDePit`, flag `chuva`).

  **Duas decisões de HONESTIDADE, que limitam de propósito o que se pode escrever:**
  1. **Pool de chuva só pra `erro-piloto`.** Verificado no código, não suposto: a chuva tem UM
     efeito sobre incidentes — dobra a chance de erro do piloto (`chuvaMultErro: 2.0`, aplicado só
     sobre `chanceErro`, `corrida.ts:151/271`). Quebra de motor/chassi rola contra CONF, que a chuva
     não toca. Vocabulário molhado numa quebra sugeriria causalidade inexistente.
  2. **Nenhuma frase afirma manobra, local da pista, disputa ou clima evoluindo** — a engine simula
     cada carro **isoladamente** e o clima é global. Isso virou **teste**, não comentário: um regex
     reprova `ultrapass|disputa|começou a chover|pneu de chuva` em qualquer variante nova.

  **Sem golden de texto, e a decisão está registrada no próprio teste:** o índice sai de
  `hash % pool.length`, então acrescentar UMA variante remexe todos os textos — um golden reprovaria
  "escrevi uma frase nova", que não é regressão. Os testes travam o CONTRATO: determinismo, pool
  certo por condição, todo `TipoEvento` com texto, e que o pool **inteiro** é alcançável (a guarda
  contra "tem 8 variantes mas o hash só cai em 3").

  `narracao.ts` entrou na lista de arquivos críticos de determinismo do `eslint.config.js`.
  **Mutação:** trocar o hash por `Math.random` reprova no lint.
  **Medido em 2026-08-07:** `npm test` **1063/36** (era 1051), `tsc`, `eslint` e `build` **exit 0**.

- **PR B (narração rica) — CAUSALIDADE CONTRAFACTUAL, COM GATE DE PIT** (commit `43fe420`). Liga
  erro a consequência — **só quando os dados sustentam a ligação**.

  🔑 **O critério NÃO é coincidência, e essa é a correção que o plano fez ao pedido do dev.**
  "Errou na volta V e perdeu posição na volta V" ainda mentiria: o Y podia vir 3 s mais rápido e
  passar de qualquer jeito. A linha causal só sai se as três valerem, estritas:
  1. `cumX(V-1) < cumY(V-1)` — X estava à frente antes;
  2. `cumY(V) < cumX(V)` — Y está à frente depois;
  3. `cumY(V) > cumX(V) − custos` — **sem o incidente, X seguiria à frente**.

  A (3) é a que separa causalidade de coincidência. O dev aprovou sabendo que é **mais restritivo**
  que o pedido original — palavras dele: *"prefiro poucas linhas verdadeiras a muitas linhas
  inventadas"*. A engine **não modela disputa carro a carro**; toda afirmação causal que não passe
  por aqui é invenção.

  📏 **MEDIDO em 200 corridas reais** (20 seeds × 10 pistas, draft resolvido por bots) — o dev pediu
  o número ANTES de julgar o fraseado, porque cogitou cortar o PR se rendesse pouco:
  - **3,19 linhas causais por corrida**;
  - **93% das corridas** têm pelo menos uma;
  - 42% dos eventos viram linha causal.
  Muito acima do "1 a cada 3 corridas" que se temia. **Vale a complexidade** — decidido com o
  número na mão, não por intuição.

  **Portões adicionais:** volta 1 nunca tem causalidade (`cum(0)` = 0 pra todos); volta de pit de X
  desqualifica a causalidade e vira "entrou nos boxes" (o tempo daquela volta está dominado pelo
  pit), mas **o pit de Y não desqualifica nada** — se Y parou e ainda assim passou, o erro de X
  segue explicando; candidatos a Y são só os que completaram a volta V, o que **exclui DNF por
  construção**, sem caso especial; **`investigacao` nunca é causal** (penalidade pós-corrida, não
  está em `historicoVoltas` — seria falso por construção, não impreciso); vários eventos do mesmo
  carro na mesma volta usam a SOMA dos custos e uma só linha, no de maior `custoMs`.

  **Fraseado RELACIONAL** ("caiu atrás de Y"), nunca posição absoluta: `classificacaoAoVivo` ordena
  por progresso contínuo no instante do replay e isto compara na fronteira da volta — um número aqui
  brigaria com o do painel ao lado.

  **Baseline vermelho:** 10 falhas, todas `narrarEventos is not a function`. **Quatro mutações**,
  cada uma matando o teste certo: remover o contrafactual mata o CASO 2 (discriminante); remover
  "X estava à frente" mata o CASO 8b; ignorar o gate de pit mata o CASO 4; deixar `investigacao` ser
  causal mata o CASO 6.

  ⚠️ **O CASO 8b entrou DEPOIS, e é a lição de processo do PR:** a primeira rodada de mutação
  mostrou que "X já estava atrás e continuou atrás" **não era coberto** — a mutação sobrevivia. Foi
  o teste de mutação, não a revisão nem o tsc, que achou a lacuna. Junto veio a troca do acesso
  indexado por checagem explícita de `undefined`: sem `noUncheckedIndexedAccess`, um índice ausente
  não explodiria, ele **silenciaria** (toda comparação numérica com `undefined` é `false`) e a linha
  sumiria sem erro.

  **Medido:** `npm test` **1074/36** (era 1063), `tsc`, `eslint` e `build` **exit 0**.

- **PR C — AVANÇO AUTOMÁTICO ENTRE CORRIDAS DO CAMPEONATO** (commit `fc7f20d`). Toggle "Avançar
  automaticamente": ao terminar uma corrida, mostra a classificação por 5 s e segue pra próxima.

  🔑 **O furo que faria a feature parecer quebrada:** avançar o cursor leva à fase `'grid'`, que só
  sai no botão "Largar" — o automático **empacaria ali, corrida após corrida**. Por isso auto também
  **auto-larga** (`useCorrida` ganhou `autoLargar`, default `false`, então a corrida avulsa não
  muda). Foi o `fable-architect` que apontou isso no plano, antes de existir código.

  **Onde cada estado mora, e por quê:**
  - **O toggle vive no `FluxoCampeonato`, não no `PainelCampeonato`** — o Fluxo **não remonta** entre
    etapas (a `key` está no `FluxoCorrida`, o filho), então a escolha sobrevive ao avanço. No
    painel, seria perdida a cada corrida.
  - A contagem vive no painel, que monta exatamente na tela de resultado.
  - **O toggle segue clicável durante a contagem, e desmarcar cancela o timer** — é assim que se
    desliga no meio, requisito do dev. O cleanup do efeito é o que faz isso funcionar.
  - **Não persiste no save:** o save tem impressão digital e `VERSAO_FORMATO`, e preferência de UI
    não é estado de campeonato. Se um dia for pra lembrar, é chave própria no localStorage.

  Timer inteiro dentro do `useEffect`, nada de agendar em updater de `setState` — mesmo motivo já
  registrado em `useCorrida`: o StrictMode invoca updaters duas vezes em dev e dobraria os callbacks.

  **Escopo delimitado de propósito:** `simularOResto` **já existe** pra quem quer pular tudo. Este
  toggle é pra **assistir sem clicar**, não é um segundo "pular".

  4 testes de render novos, incluindo o do fim de campeonato (auto ligado não pode produzir contagem
  eterna quando não há próxima). **O que estes testes NÃO cobrem, e não há como cobrir sem jsdom: o
  timer disparando e o clique.** Isso é o teste do dev no app.
  **Medido:** `npm test` **1078/36** (era 1074), `tsc`, `eslint` e `build` **exit 0**.

- **✅ OS DOIS PORTÕES VISUAIS — FECHADOS pelo dev em 2026-08-07.** Não é um PR: é o veredito que os
  PRs 7.7/7.7.1 e 7.8 estavam esperando, alguns dias em aberto.

  **1. SILHUETAS (7.7/7.7.1) — APROVADAS. Teste cego 10/10.** O critério de aceite era do próprio
  dev: *o jogador vê a pista e pensa "poxa, Interlagos" sem ler o nome?* **A linha de base era
  0/10** — o parque antigo não fazia ninguém reconhecer nada. O redesenho a partir da geometria real
  dos circuitos levou o placar a **10/10**. Vale registrar o que isso encerra: havia um **gatilho de
  abandono** combinado com o dev — se o ponteiro não se movesse, era pra parar e reabrir a pergunta
  em vez de insistir. **Ele não foi acionado.** A aposta de redesenhar a partir da geometria real,
  em vez de estilizar à mão, foi o que pagou.

  **2. PALETA (7.8) — APROVADA, com o light mode.** A troca do azul-noite pelo grafite + vermelho
  `#FF1801` + dourado `#FFB800` + verde `#00D26A` **resolveu o problema que motivou o PR** — nas
  palavras do dev na abertura, a tela "parecia genérica e feita com IA, todo projeto que usa IA gera
  esse mesmo azul-roxo". Aprovada incluindo o light mode e a ilha escura do painel do traçado, que é
  necessidade matemática (o teto de luminância do asfalto, 0,0397, é derivado do par
  `carro do jogador / asfalto >= 3` e é impossível sobre base clara).

  **O que o fechamento destrava, e que estava parado sem necessidade:**
  - **`npm run preview` voltou a ser seguro.** Havia um aviso permanente de que ele repintaria o
    `redesenho.html` com a paleta nova e **misturaria as duas perguntas em aberto**; sem perguntas
    pendentes, o aviso morreu.
  - **O diff da paleta deixou de ser candidato a reversão** (a instrução era reverter `f736e6c` se
    fosse reprovada).
  - **O PR de INFRA deixa de ser pré-requisito e vira consolidação** — era condicionado a "se as
    silhuetas forem aprovadas". Escopo a reavaliar com o dev: pode ter encolhido junto.
  - **Sai o motivo que segurava 7.7/7.8 fora da `main`.** O merge agora é decisão de processo do
    dev, não espera de veredito visual.

- **PR 8.2.1 — CALENDÁRIO DO CAMPEONATO VAI PRA `src/engine/`** (commit `cfe1c47`). Fecha a
  **pendência 0**, aberta pela revisão do 8.1: `calendarioSorteado` era o ÚNICO consumidor de RNG
  semeado fora de `src/engine/` (os outros 13 usos de `deriveSeed` em `src/` já estavam na engine).

  Movidos: `FormatoTemporada`, `FORMATO_PADRAO`, `N_ETAPAS`, `calendarioPadrao`,
  `calendarioSorteado` e o helper `etapasDoFormato`. **`fluxo-campeonato.ts` RE-EXPORTA os cinco
  públicos, então nenhum chamador mudou** — nem as ~90 referências de teste, nem a UI. Foi o
  re-export que tornou isto um diff de dois arquivos em vez de um sed global.

  **Por que agora, e não depois:** o custo aparece na Fase 3 (online), cujo desenho natural é
  "servidor escolhe a seed, todo cliente deriva o mesmo calendário". Com o calendário na UI,
  `src/net/` teria que importar de `src/ui/` — inversão da dependência que a arquitetura proíbe.

  **O que FICOU na UI, de propósito:** `FormatoPartida`, `ehCampeonato`, `mostraSeletorDePista`,
  `ROTULO_FORMATO`, `formatoDoCalendario`, `resumoCampeonatoSalvo`. Nenhum é regra de jogo — são
  decisões de TELA. Movê-los levaria UI pra dentro da engine, que é a violação inversa.

  **Refactor sem mudança de comportamento: os mesmos 1078 testes passam, sem nenhum teste novo — e o
  ponto é esse.** `tsc`, `eslint` e `build` limpos. **`npm run balance` rodado** porque mexeu em
  `src/engine/`: **tabela idêntica, mesmos números por cenário** — `seedDaEtapa` e
  `simularCampeonato` não foram tocados, só mudaram de vizinhança.

- **PR 8.3 — TELAS DO CAMPEONATO: calendário, variação de posição e pódio** (commit `0da36fb`;
  gerador de preview em `499114c`). Substitui as telas cruas do 8.4-mínimo pelas de verdade, com a
  paleta grafite/F1 já aprovada. **A mecânica não foi tocada** — o dev testou single e local com 2
  jogadores e confirmou que o wiring funciona; este PR é apresentação.

  **CALENDÁRIO** (`PainelCalendario` + `SilhuetaPista`): as 5 ou 10 etapas com a silhueta de cada
  pista, o que já correu com vencedor, e a próxima destacada com friso da marca.

  🔑 **A silhueta reusa `pathDaVolta` — a MESMA geometria da tela de corrida, não um desenho
  paralelo.** Deliberado: as silhuetas passaram no teste cego **10/10** justamente por virem da
  geometria real dos circuitos, e redesenhar à mão na miniatura jogaria fora o que o 7.7 conquistou.
  Uma linha só, sem a pilha de `CAMADAS_PISTA`: no tamanho de miniatura asfalto + limite + zebra
  viram borrão, e o que precisa ser legível nessa escala é a FORMA.

  🔑 **O CUIDADO QUE DECIDE ESTA TELA, e o teste mais importante do PR:** `iniciarCampeonato`
  **pré-simula todas as etapas**, então o resultado das próximas corridas está em memória o tempo
  todo. `calendarioAnotado` só revela vencedor de etapa com `indice < etapaAtual` — **vazar o
  vencedor de uma corrida que o jogador ainda vai assistir estragaria a corrida**. O cursor é o que
  separa "simulado" de "revelado", e há teste dedicado a isso.

  **CLASSIFICAÇÃO:** coluna de variação desde a corrida anterior (▲/▼). `null` quando não há
  referência — depois da 1ª corrida ninguém subiu nem caiu, e mostrar `+0` ali **seria inventar um
  passado**. A soma das variações é **zero por construção** (posição é permutação), e isso virou
  teste: um sinal trocado quebraria.

  **FIM DE CAMPEONATO:** pódio 2º-1º-3º (campeão ao centro e mais alto, como pódio real), tabela
  final e calendário completo.

  **CSS segue a regra do 7.8:** acento como PREENCHIMENTO usa o token cheio (friso da próxima etapa
  = `--primaria`); acento como TINTA usa o irmão `*Texto` (pontos do campeão = `--acento-texto`,
  setas = `--sucesso-texto`/`--primaria-texto`). **Regra dos 360px:** o pódio empilha abaixo disso.

  Funções puras novas (`variacaoDePosicao`, `calendarioAnotado`) em `fluxo-campeonato.ts` porque o
  projeto não tem jsdom — dentro do `.tsx` não haveria teste nenhum sobre elas.

  ⚠️ **Dois testes meus falharam antes de passar, e os dois eram erro do TESTE, não do código:** o
  regex contava o `<path>` interno junto do `<svg>` (10 em vez de 5), e o fixture não troca posições
  nas 3 primeiras corridas (o jogador-0 vence tudo), então a variação virou `Map` montado à mão —
  derivar do fixture testaria o fixture, não a renderização.

  **Preview** (`preview/campeonato.html`, gitignored): as três telas numa página só, a partir de um
  campeonato real. **NÃO é maquete** — inlina `tokens.css` e `estilos.css` REAIS e renderiza os
  componentes REAIS; falta só interação. A distinção importa porque confundir maquete com app
  rodando já custou uma leitura errada de portão no 7.8.

  **Medido em 2026-08-07:** `npm test` **1094/36** (era 1088), `tsc`, `eslint` e `build` **exit 0**.

### SPIKE 3.0 — go/no-go da dependência de rede (2026-08-09) — ✅ **GO**

Spike descartável, **fora do repositório**: `E:\projetos\spike-partyserver\`, com `package.json`
próprio. Não é branch — branch ainda escreveria no `node_modules/` compartilhado, e a suíte de 1094
testes deixaria de rodar contra a mesma árvore que a produziu. **Medido depois do spike:
`git status` limpo, `HEAD` em `87c82c0`, e nenhum pacote de rede no `node_modules/` do projeto.**

**A decisão (a), com os números que a sustentam.** O alvo deixou de ser o pacote `partykit`:
`0.0.115`, último `time.modified` em **2025-09-11** (11 meses). O desenvolvimento está em
`partyserver`: `0.5.10`, **2026-08-03** (6 dias antes do spike). Mesmo monorepo
(`git://github.com/cloudflare/partykit.git`, autor Sunil Pai), mesmo princípio — **sala = Durable
Object isolado**. O que muda é só o CLI: `partykit dev` → `wrangler dev`.

🔑 **O PAR DE VERSÕES TESTADO — anotar, porque os dois são móveis:** `partyserver@0.5.10` +
`wrangler@4.120.0` + `@cloudflare/workers-types@5.20260809.1`, Node **v24.16.0**, npm 11.13.0.
`partyserver` é pré-1.0 e `wrangler` 4.120.0 saiu 2 dias antes do spike: **era o pareamento sem
tempo de maturação, e portanto o gate que de fato podia matar a fase.** Passou. Uma dependência
pré-1.0 que "funcionou uma vez" sem a versão registrada é armadilha pro 3.2.

**Os quatro cheques pedidos pelo dev, todos rodados no PowerShell:**

1. **`wrangler dev` sobe no PowerShell** — sim, `--port 8787 --ip 127.0.0.1`, e o **hot reload**
   funcionou (a página de abas foi adicionada com o servidor no ar e os testes repassaram sem
   restart). `tsc --noEmit` exit 0; `wrangler deploy --dry-run` exit 0 — este último é o que valida
   o **shape da config**: `durable_objects.bindings` + bloco `migrations` com `new_sqlite_classes`
   foram aceitos pelo wrangler 4.120.0, e o binding apareceu resolvido na saída.
2. **Dois clientes ecoam** — feito **headless** (`scripts/dois-clientes.mjs`, WebSocket global do
   Node ≥ 22, zero dependência nova), o que é mais forte e reprodutível que abas. 10 cheques verdes:
   conexão, `this.name` chegando como `sala-teste`, A notificado da entrada de B (**prova que os
   dois caem no MESMO DO**), eco pro remetente, broadcast nos dois sentidos, e A notificado da
   saída de B. Rota: `/parties/sala-spike/<sala>` — `routePartykitRequest` kebab-caseia o nome do
   binding (`SalaSpike` → `sala-spike`).
3. **`rng.ts` no servidor** — passou, e **o cheque foi ampliado de propósito: compilar não era a
   pergunta, rodar era.** `rng.ts` foi copiado bit a bit (mesmo md5) e um módulo compartilhado
   (`impressao-rng.ts`) é importado pelos DOIS lados, workerd e Node. 🔑 **PARIDADE BIT A BIT
   CONFIRMADA: 35 linhas idênticas, 4 seeds (1, 2026, 123456789, 4294967295)**, cobrindo 10 `next()`,
   `int`, `pick`, `shuffle`, `seedFromString` e `deriveSeed` — e **comparando os bits IEEE-754 crus
   dos doubles**, não a formatação. É a medição mais valiosa do spike: a arquitetura inteira
   ("corrida roda no cliente, servidor só coordena") repousa nela. Esperado, já que a engine só usa
   `Math.imul`/`>>>`/divisão — mas o spike existe pra virar "deve passar" em "medido".
4. **Bundle** — **40,34 KiB, gzip 11,93 KiB** (37,92 / 10,91 antes da página de abas). Esses dois são
   os números **medidos**; o teto do plano Free (da ordem de alguns MB gzip) **não foi verificado
   nesta sessão** e fica pra confirmar no 3.2 — a folga é evidentemente enorme, mas *afirmação de
   estado só entra medida*. O valor importa como **orçamento**, não como pass/fail: o 3.1b vai
   carregar seed + roster + hashes, e agora existe linha de base pra comparar.

**Escopo mantido curto de propósito:** o spike NÃO criou `protocolo.ts`, `tipos.ts`,
`namespaces-seed.ts` nem qualquer forma de redutor — isso é 3.1a/3.1b, e o dev travou um portão
antes deles. `partyserver`/`wrangler` **não entraram no `package.json` do projeto** — isso é
entrega do 3.2.

**Testes na main: 893 passando (33 arquivos)** — medido em 2026-08-01 via `npm test`. Mais o harness, por config própria (`npm run balance`), e os **três** geradores de preview (`npm run preview`: traçados, cego, zebra), todos fora do `npm test`.
> A linha anterior dizia **"521 passando (27 arquivos)"**, número da época do PR 6.2 — ficou parada enquanto a suíte crescia até 851. Corrigida no chore de 2026-07-30. Contagem de teste envelhece rápido: quem atualizar, **meça** (`npm test`), não some de cabeça.

### PR 3.1a — sala + roster congelado (2026-08-09, commit `246d937`) — ALTO RISCO

Primeiro código da Fase 3. Quatro arquivos novos em `src/net/` (`tipos.ts`, `protocolo.ts`,
`sala.ts`, `sala.test.ts`) + um bloco no `eslint.config.js`. **Zero dependência nova** —
`partyserver`/`wrangler` continuam fora do `package.json` (isso é o 3.2). `src/engine/` e
`src/data/` **intocados**, então `npm run balance` está inalterado **por construção**.

🔑 **O FATO QUE GOVERNA O PR.** `criarDraft` embaralha `ordemPeca` a partir de
`jogadores.map(j => j.id)` (`draft.ts:73`) — depende da **ORDEM DO ARRAY**, não do conjunto. Logo
"roster congelado" **não é um conjunto de 22 ids**: é um `Jogador[]` explícito e ordenado que os 22
clientes reproduzem igual. Dois clientes com o mesmo conjunto em ordens diferentes jogariam a
rodada 6 em ordens diferentes, **em silêncio**. Defesa: **ordem canônica crescente por id**
(`humano-01`, padding de 2 dígitos pra que a ordem lexicográfica seja a numérica), mantida no array
da sala **e aplicada de novo** dentro de `congelarRoster` — defesa em profundidade contra
round-trip de JSON, merge de estado ou bug futuro no redutor.

🐤 **A canária inversa, que é o teste mais fácil de esquecer:** um teste afirma que
`criarDraft([...roster].reverse()).ordemPeca` **DIFERE** do canônico. Sem ela, se a engine um dia
deixasse de depender da ordem, a suíte ficaria verde, o `sort` viraria peso morto e os três
docblocks que o justificam virariam mentira sem ninguém notar. Foi achado da revisão.

**Conformidade com o caminho offline.** `congelarRoster` duplica de propósito a composição de
`montarJogadores` (privado em `fluxo-draft.ts:117`), porque `src/net/` não deve importar da UI. A
trava contra divergência é um `it.each` que compara o roster online com
`iniciarDraft(...).jogadores` em **`facil` × `dificil` × {2, 3, 5, 22} humanos** — 22 é a borda em
que `qtdBots === 0`. **Limite conhecido, registrado pra não gerar ilusão:** essa comparação **não**
trava o `sort` (o array offline já chega ordenado); quem trava o `sort` é o teste de ordem
embaralhada. O caminho definitivo seria extrair `montarJogadores` + `QTD_JOGADORES` pra
`src/engine/` e ter **uma** função só — ficou como refactor separado (ver ESTADO, pendências).

**As seis correções que a revisão exigiu antes do merge** (todas de forma; nada quebrava hoje
porque não existe transporte — é justamente por isso que era barato agora):

1. 🔴 **Personificação por construção.** `ComandoSala` carregava `jogadorId`. Qualquer cliente
   mandaria `{tipo:'sair', jogadorId:'humano-01'}` e expulsaria outro, ou iniciaria a partida se
   passando pelo anfitrião — e o **token de turno do 3.1b nasceria sobre um remetente forjável**.
   Agora nenhum comando diz de quem é: `reduzirSala(estado, comando, remetenteId)`, com o id
   injetado pelo **transporte** a partir da conexão.
2. 🔴 **`seedMestre` ia no broadcast.** Contradizia a decisão (b) da fase, cuja justificativa é
   literalmente que com a seed base na mão qualquer jogador computa as corridas futuras no console.
   Agora `EstadoSala` (interno do DO) e `EstadoSalaPublico` (o que vai no fio) são tipos
   **diferentes**, `MensagemServidor` usa o público, e `publicarSala` devolve
   `seedDraft = deriveSeed(seedMestre, 'online:draft')`. **Esquecer de filtrar não compila.**
   `publicarSala` copia **campo a campo** de propósito: com `{...resto}`, um segredo novo em
   `EstadoSala` passaria a vazar sozinho por ter sido acrescentado.
3. 🟡 **Anfitrião roubado.** `anfitriaoId` era recalculado como `jogadores[0].id` a cada entrada;
   como o id livre é reusado, quem entrasse depois da saída do anfitrião pegava o `humano-01` e
   **virava anfitrião na hora**. Agora é **pegajoso**: só muda em `sair`, e só se quem saiu era ele.
   Inverter a regra não matava nenhum teste — buraco de cobertura real, agora coberto.
4. 🟡 **Guarda de fase global** virou guarda **por handler**. O 3.1b acrescenta comandos que só
   valem com a sala **iniciada** (turno, abandono, cronômetro) e *abandono é literalmente `sair`
   depois do início*: a guarda global obrigaria a **reescrever** o ponto de entrada em vez de
   estendê-lo.
5. 🟡 **`default` no switch + checagem de tipo do payload.** O contrato "toda recusa deixa o estado
   INTOCADO" estava escrito no `protocolo.ts` mas não valia: `{tipo:'entrar', nome:null}` **lançava**
   no `.trim()`, e `{tipo:'xpto'}` devolvia `undefined`. O cliente é JSON não confiável, não TS.
6. 🟡 **`seq` monotônico** (recusa não incrementa) e **`seedMestre` normalizada pra uint32** — a
   mesma convenção de `seedDeTexto` (`>>> 0`). O `seq` é o que permite ao cliente descartar
   broadcast atrasado/duplicado, e é contra ele que o **harness headless do 3.2** vai asserir.

🔒 **A fronteira "o servidor NUNCA carrega o dataset" deixou de depender de disciplina.** Bloco novo
no `eslint.config.js` para `src/net/**`: proibido importar `src/data/`, `**/*.json`, `src/ui/` e
React, e proibido `Math.random`/`Date.now`/`performance.now`/`localeCompare`. **Verificado com um
arquivo descartável que viola as cinco regras: 5 erros, um por regra.** O arquivo de **teste** está
fora da trava de propósito — a conformidade só vale se comparar com o caminho offline de verdade.

**Medido:** `npm test` **1130/37** (era 1094/36), `tsc --noEmit` **0**, `eslint src scripts` **0**,
`npm run build` **0**. **16 mutações isoladas, 16 mortas** — entre elas: `congelarRoster` sem o
`sort` (1 falha), roster congelado com a seed **mestra** em vez da derivada (2), `publicarSala`
vazando a `seedMestre` (2), anfitrião não pegajoso (1), `seq` que não avança (1), `sair` aceitando
remetente qualquer (1), id sem padding (21).

**Decisões adiadas, com o porquê:** `src/engine/namespaces-seed.ts` (registro de rótulos `online:`
com teste de duplicata) **fica pro 3.1b** — com um rótulo só, o teste de duplicata é vazio; a
constante `ROTULO_SEED_DRAFT` já centraliza o valor. **Token de reconexão** fica pro 3.2: hoje um
WebSocket que cai é um jogador que não volta (depois de `iniciar`, todo comando é recusado), e o
mesmo token resolve rejoin e personificação — mas quem gerencia conexão é o transporte.
**Correlação comando↔erro** também é do transporte.

### PR 3.1b — turnos no redutor, o coração da Fase 3 (2026-08-09) — ALTO RISCO · 🛑 PORTÃO Nº 2

O PR que o dev marcou como portão. Novos: `src/net/draft-rede.ts` + dois testes
(`draft-rede.test.ts`, `conformidade-draft.test.ts`), `src/engine/namespaces-seed.ts` + teste.
Modificados: `draft.ts`, `draft-utils.ts`, `tipos.ts`, `protocolo.ts`, `sala.ts`, `sala.test.ts`,
`node-shims.d.ts`. **Zero dependência nova.**

**A ideia central.** O servidor não carrega o dataset, então **não pode chamar `aplicarEscolha`**.
Ele não sabe *o que* foi escolhido — guarda a escolha como **payload opaco** e decide só **de quem
é a vez**. Isso basta porque a engine é determinística: com a mesma seed e o mesmo roster, cada
cliente computa o mesmo draft sozinho.

🔒 **As duas regras de turno são deliberadamente DIFERENTES:**
- **Sorteios: CONCORRENTE.** `deQuemEhAVez` devolve um **CONJUNTO**. Os sorteios de cada jogador são
  sub-streams independentes (`draft:sorteios:<id>`), a ordem entre jogadores não muda nada, e 22
  pessoas não podem esperar umas às outras.
- **Peça: ESTRITA.** Só `ordemPeca[indicePeca]`. O pool de peças é compartilhado e as cópias acabam,
  então aqui a ordem **é** regra de jogo.

🔑 **A defesa nº 1 contra o risco que o dev nomeou** ("regra de turno duplicada entre engine e
redutor, derivando em silêncio"): `calcularOrdemPeca` foi **extraída** de `criarDraft` pra
`draft-utils.ts`, e engine e rede chamam **a mesma função**. Não há fórmula copiada. Mesmo motivo
levou `RODADAS_SORTEIO` pra engine, com `RODADA_COMPLETA = RODADAS_SORTEIO + 1` — achado da revisão:
o PR tinha eliminado a fórmula duplicada da `ordemPeca` e deixado o **limiar de rodada** duplicado
cinco vezes, que também é regra de turno.
⚠️ **E a primeira correção disso ficou pela metade**, o que só apareceu numa releitura: `draft.ts` e
`tipos.ts` passaram a usar a constante, mas o `draft-rede.ts` — **o arquivo que carrega a tese
anti-duplicação** — manteve dois `<= 5` literais (em `normalizar` e em `deQuemEhAVez`). Corrigido no
commit seguinte, com duas mutações novas do limiar (frouxo em cada um dos dois sítios): **65 e 74
testes mortos**. A lição é a de sempre neste projeto: *afirmação de estado só entra medida* — o
texto já dizia "resolvido" quando ainda não estava.

### 🛑 OS DOIS TESTES DO PORTÃO — resultado

**1. CONFORMIDADE — 20 seeds, VERDE.** Compara os dois modelos **a cada passo**, não nas bordas:
- **igualdade de CONJUNTO nos DOIS sentidos** entre `deQuemEhAVez` e o `progresso` da engine;
- `rede.fase === engine.fase`; `rede.ordemPeca === engine.ordemPeca`;
- `rede.indicePeca === engine.indicePeca` **a cada evento** da fase peça — um off-by-one no pulo de
  bots se realinha no fim e passaria numa comparação só de extremidades;
- **todo** humano fora da vez é recusado (não só um: um redutor com `ordemPeca` diferente **mas
  fixa** recusaria o jogador do controle negativo em 21 de 22 casos por acaso);
- a **premissa dos bots** ("nascem completos") tem asserção própria: nenhum bot pendente quando o
  controle está com humano;
- rosters de **2, 4 e 22 humanos** — 22 é a borda em que não há bot nenhum e a premissa fica vazia.

🔎 **A DIFERENÇA DE FORMA, DECLARADA (não é desvio do portão, é o portão levado a sério):**
`alvoHumano` devolve **um** id na fase sorteios — o primeiro humano em ordem de cadastro. É
convenção de UI do hotseat (D1), documentada no próprio `fluxo-local.ts` como **não sendo regra de
engine**. Espelhar isso serializaria 22 jogadores atrás uns dos outros: conformidade passaria e o
jogo estaria errado. Por isso a asserção é **igualdade de conjunto contra o `progresso` da engine**,
que é **estritamente mais forte** que "`alvoHumano` ∈ conjunto" — esta última um redutor devolvendo
os 22 humanos passaria.

**2. COMMUTATIVIDADE — 20 seeds, VERDE**, com controle negativo (permutar a fase **peça** ⇒
`nao-e-sua-vez`) e um fluxo **misto** (escolha + ausência) que também comuta.

📏 **A medição que corrigiu o enunciado do teste:** a primeira versão permutava os eventos
**totalmente** e `aplicarEscolha` **lançou em 20 de 20 seeds** ("piloto não pertence à equipe/ano
sorteada"). O erro era meu, e informativo: **a ordem INTERNA de um jogador é causal** — a rodada 3
dele só existe depois da 2, porque a equipe/ano sorteada muda a cada rodada. O que a rede reordena é
o **intercalamento entre conexões** (o WebSocket entrega em ordem por conexão). Commutatividade
aqui é **intercalamento**, não permutação livre — e a asserção verifica que a permutação usada é
real, não a identidade.

### O buraco do portão que a revisão achou — e que virou teste

O portão só mandava `escolher` válido, então **nunca tocava o caminho de ausência** — que é
exatamente onde os dois modelos são estruturalmente diferentes: a rede zera o ausente
(`RODADA_COMPLETA`) e **pula a casa dele** em `ordemPeca`; a engine não sabe o que é ausência e
ficaria esperando. Resposta da revisão à pergunta "existe redutor errado que passaria?": **sim —
qualquer um com o tratamento de ausente errado.**

Agora há uma variante com abandono nas **duas fases** (10 seeds), e ela **mede em qual fase cada
abandono caiu** (`expect(fasesDosAbandonos).toEqual(['sorteios','peca'])`) — sem isso, um número de
passo mal escolhido faria os dois caírem na fase sorteios e o teste passaria sem exercitar nada.

📏 **E o lado da engine NÃO conhece ausência** — deliberadamente. A primeira versão subtraía os
ausentes também na expectativa da engine; **medido, a subtração era peso morto** (84/84 passam sem
ela, inclusive nas 10 seeds com abandono), porque o contrato do cliente já leva o ausente além do
limiar e além da casa dele em `ordemPeca`. Mantê-la seria **pior que inútil**: mandaria o lado da
engine ignorar exatamente os jogadores em que os dois modelos diferem — espelharia no teste a
premissa da implementação, que é justamente o que um portão não pode fazer.

🔒 **O CONTRATO que o 3.3 é obrigado a cumprir**, descoberto ao escrever esse teste e registrado no
código (`draft-rede.ts`, docblock de `marcarAusente`): (1) o cliente completa os sorteios do ausente
**no mesmo evento** em que vê o `ausencia` no log — atrasar deixa os dois lados em fases diferentes;
(2) na fase peça o cliente **tem que jogar por ele**, com escolha **determinística e idêntica nos
22** (`escolherBot`, semeado, nunca decisão de UI). O pool de peças é compartilhado: dois clientes
escolhendo peças diferentes pelo mesmo ausente furam o pool **em silêncio**.

### As quatro correções da revisão

1. 🐞 **Bug real de cronômetro (o único defeito de runtime do PR).** `normalizar` reescrevia
   `iniciadoEm[daVez]` em **toda** passagem pela fase peça — quem estava travando a partida ganhava
   90 s novos toda vez que **outro** jogador abandonasse, e o prazo nunca disparava contra ele.
   Medido pela revisão: relógio pulou de `1000000` pra `1080000` após abandono de terceiro.
   **Sobreviveu às 15 mutações da primeira rodada porque o portão passava `T0` em todo evento** —
   o relógio era invisível ali. Corrigido, com teste de regressão dedicado, e agora o portão e a
   commutatividade rodam com **`agora` andando** a cada evento.
2. 🔁 **Idempotência.** Comando duplicado era aceito como segunda jogada (na fase peça, `indicePeca`
   andava duas casas e alguém perdia a vez). `ComandoDraft` ganhou `turnoEsperado` — a rodada do
   jogador na fase sorteios, o `indicePeca` na peça. Fica idempotente sob duplicação **e** sob
   reordenação. Uma linha agora; depois do 3.4 seria mudança de protocolo versionado.
3. 📦 **Teto de bytes no payload opaco.** Era o único ponto em que o PR falhava o próprio critério:
   o lobby limita o nome, o draft não limitava nada — e o payload é **persistido no DO e
   rebroadcast aos 22**. O servidor **consegue** limitar tamanho sem dataset: é validação de FORMA.
4. 🏷️ **`versao` em `EstadoDraftRede`.** O DO persiste esse objeto; sem tag de versão, mudar o
   formato desserializa sala antiga em código novo com campo faltando.

### `namespaces-seed.ts` — o risco aprovado, agora com guarda

Registro dos namespaces de `deriveSeed` do projeto inteiro (`bots`, `draft`, `calendario`, `camp`,
`corrida`, `quali`, `narracao`, `pit`, `grid`, `paradas`, `online`, `teste`) + **varredura do
código-fonte** que reprova rótulo com namespace não registrado. Tem **guarda anti-vacuidade** (a
varredura precisa achar > 10 rótulos, e rótulos `draft:` e `corrida:` especificamente) — senão
passaria por não achar nada. A asserção sobre o prefixo `online:` mora em `sala.test.ts`, contra o
valor de `ROTULO_SEED_DRAFT`: a varredura textual não enxerga constante, e `src/engine/` não pode
importar de `src/net/` (fronteira travada no eslint).

⚠️ **A primeira versão da varredura era FLAKY** e só falhava na suíte completa: `fetch-f1-data.test.ts`
cria e apaga arquivos temporários em `scripts/cache/` **em paralelo**, e o `statSync` batia em
arquivo que já tinha sumido (ENOENT). Corrigido ignorando `cache/` e tolerando o sumiço. Confirmado
com **3 execuções seguidas** da suíte inteira.

**Medido:** `npm test` **1256/40** (era 1130/37 no 3.1a e 1094/36 antes da fase), `tsc --noEmit`
**0**, `eslint src scripts` **0**, `npm run build` **0**. **`npm run balance` rodado** (o PR toca
`src/engine/`): tabela **idêntica** ao baseline — ρ médio **0,952**, desvio **0,028**,
[0,766, 0,989], desvio-padrão dos pontos **61,32**, P(campeão top-3) **99,0%**, P(pódio fora do
top-5) **7,5%**. A extração de `calcularOrdemPeca`/`RODADAS_SORTEIO` é refactor sem mudança de
comportamento, **medido e não presumido**.

### PR 3.2 — transporte + harness headless (2026-08-10, commit `30e2556`) — ALTO RISCO

`partyserver@0.5.10` + `wrangler@4.120.0` entram no `package.json` (par validado no SPIKE 3.0;
`partyserver` foi pra **devDependencies** — o bundle do worker é montado pelo wrangler, não pelo
vite). Novos: `party/sala.ts`, `party/tsconfig.json`, `wrangler.jsonc`, `src/net/servidor-sala.ts`,
`src/net/cliente.ts`, `src/net/harness.ts` + 2 testes, `src/net/cerca-lint.test.ts`,
`scripts/smoke-online.mjs`.

**Três camadas, e a fronteira entre elas é a tese do PR:**
- `servidor-sala.ts` — o servidor **sem I/O**. Parseia, resolve o remetente pelo mapa
  conexão→jogador, chama o redutor, devolve `{estado, envios}`.
- `party/sala.ts` — a **casca**: socket, relógio, storage, bytes. Fina de propósito, porque o que
  não é testável sem rede tende a não ser testado.
- `cliente.ts` — estado local e reconstrução **incremental** do `DraftState` a partir do log.

📡 **BROADCAST É SNAPSHOT, NÃO DELTA.** Custa bytes e compra as três coisas que a rede quebra:
perda se corrige sozinha no próximo, fora de ordem cai pelo `seq`, e quem entra no meio não precisa
de caminho de recuperação separado.

### Os dois bloqueantes que a revisão achou

🔴 **C1 — este PR tinha APAGADO a cerca de lint de `src/net/**`.** No flat config do ESLint, um
bloco posterior que redefine a mesma regra **substitui as opções por inteiro** — não faz merge de
arrays. Ao separar `Date.now` num bloco próprio de `src/net/**`, as proibições de `Math.random` e
`performance.now`, que existiam desde o 3.1a, **sumiram em silêncio da camada replicada**. Num PR
cuja tese é determinismo.
⚠️ **Por que a minha verificação manual não pegou:** testei `src/data/`, `src/ui/`, React e
`Date.now`. Os três primeiros vivem em `no-restricted-imports` — outra regra, não sobrescrita — e o
quarto era justamente a regra nova. **A proibição que sumiu não estava na lista que conferi.**
Correção: listas duplicadas de propósito nos dois blocos, com o aviso escrito no arquivo, mais
`src/net/cerca-lint.test.ts`, que roda o ESLint **de verdade** sobre código que viola cada regra —
inclusive um teste anti-vacuidade. *Cerca que ninguém testa não é cerca.*

🔴 **C2 — uma escolha ilegal no log matava a sala PARA SEMPRE.** O servidor não tem dataset e não
pode julgar conteúdo. Um cliente, **na própria vez legítima** e passando por todas as guardas
(remetente certo, turno certo, tamanho certo), gravava `{tipo:'piloto', pilotoId:'NAO-EXISTE'}` no
log append-only — que é **persistido no Durable Object e nunca encolhe**. A partir dali, nenhum dos
22 conseguia reconstruir a sala. **Uma mensagem, DoS permanente, sem recuperação.**
E **não depende de malícia**: um cliente com build de dataset diferente escolhendo um id que os
outros não têm produz o mesmo efeito — e o hash de dataset só chega no 3.4.
Corrigido em três camadas: (1) o cliente **não lança mais** — cai no substituto determinístico, o
mesmo do ausente, de modo que os 22 caem no mesmo lugar; (2) o servidor valida a **FORMA** da
escolha (o que dá pra fazer sem dataset), barrando `null`/`42`/`{tipo:'xpto'}` antes do log; (3) o
harness ganhou modo `clienteHostil`, e há teste provando que a sala conclui com 22/22.

### 📏 O achado que mudou o VALOR do harness

A revisão mediu o que eu não tinha medido: com rede ruim, **6 a 12 dos 22 turnos de peça estavam
sendo resolvidos por EXPIRAÇÃO, não por jogador**. "Os 22 concordam" era verdadeiro e praticamente
oco — uma regressão em que *todos* expirassem passaria verde.

**Causa raiz:** o servidor só difunde quando aceita um comando. Se o snapshot que anuncia "chegou a
sua vez" se perde, o jogador não sabe que é a vez dele, não joga, e a sala espera o cronômetro.
**Não havia como re-pedir estado.** É o mesmo padrão que já tinha mordido uma vez neste PR: o
`voce-e` é direcionado e enviado uma vez, e com 15% de perda 3 ou 4 dos 22 nunca descobriam a
própria identidade — daí `quem-sou`.

**Correção:** comando `sincronizar` (re-pedido de snapshot, idempotente, não altera estado).
**Medido antes → depois:** 18-22/22 clientes → **22/22 nas três seeds**; 6-12 turnos por expiração →
**0**; turnos jogados por humano → **22/22**. O contador `pecasPorHumano` virou **asserção com
piso** — sem ele, o verde media menos do que aparentava.

### Outras correções da revisão

`party/tsconfig.json` entrou em `npm run typecheck` e `npm run build` (portão que roda só quando
alguém lembra não é portão) · o alarme do DO **para de se reagendar** com a sala concluída ou vazia,
em vez de tiquetaquear a cada 5 s para sempre · o storage grava **só quando o estado mudou**
(`quem-sou`/`sincronizar`/erros devolvem o mesmo objeto, por projeto do 3.1a) · teto de bytes da
mensagem **antes** do `JSON.parse` · `aoDesconectar` recebe `agora` em vez de mentir `0` pro redutor.

⚙️ **`nodejs_compat` REMOVIDO — decisão medida, não cópia do spike.** O registro do spike dizia que
a flag tinha sido posta defensivamente e não sustentava nada. Aqui ela foi **retirada** e o worker
subiu, serviu e passou o smoke inteiro sem ela. `deploy --dry-run` exit 0. Se um dia precisar
voltar, tem que vir acompanhada do import que a exigiu.

**Medido:** `npm test` **1276/42** (era 1256/40), `npm run typecheck` **0** (agora inclui o
`party/`), `eslint src scripts party` **0**, `npm run build` **0**. `npm run balance` **inalterado
por construção** (`src/engine/` e `src/data/` intocados). **Smoke contra `wrangler dev` real:
13/13**, incluindo "a `seedMestre` não aparece no broadcast" e "comando duplicado é recusado".
Bundle **53,25 KiB / gzip 14,38 KiB** (o spike media 40,34 / 11,93 — a linha de base existia
justamente pra esta comparação).

**Fica registrado como limite conhecido** (nota da revisão): 15% de perda com a conexão intacta não
é modo de falha real de WebSocket — TCP entrega ou a conexão cai. O stress continua válido como
stress; só não deve ser lido como "a rede real perde 15%".

### PR 3.2.1 — reconexão com token de rejoin (2026-08-10, `205505b` + `3ab9658`) — ALTO RISCO

Feito **antes do 3.3** a pedido do dev, e o motivo é bom: a UI do lobby ia ser construída em cima do
fluxo de entrada, então a reconexão nascendo depois obrigaria a refazer `TelaLobby` e `FluxoOnline`.

Resolve duas coisas de uma vez: (1) quem cai deixa de ficar preso no roster ocupando turno sem ter
por onde jogar; (2) o token é **a prova de identidade que faltava** — antes, `entrar` alocava um id e
nada impedia outra conexão de reivindicar aquele jogador.

**O token é gerado pela CASCA** (`crypto.randomUUID`, 128 bits), não pelo redutor, que é puro e não
sorteia. Derivar de `deriveSeed(seedMestre, …)` foi **recusado**: daria 32 bits para um segredo que
vale a identidade do jogador. `tokens` virou o **segundo segredo** do estado, ao lado da
`seedMestre` — e `publicarSala` copiar campo a campo (decisão do 3.1a) foi o que impediu que ele
vazasse sozinho por ter sido acrescentado.

### Os três bloqueantes da revisão, todos com baseline vermelho

🔴 **1. JOGADOR FANTASMA → personificação.** `jogadorDoToken` só perguntava "existe esse token?",
nunca "esse jogador ainda está no roster?" — e `sair` deixava o token vivo. Cadeia medida pela
revisão: **B sai** (o roster perde `humano-02`) → **B reentra** como `humano-02`, que não existe mais
→ **C entra e RECEBE `humano-02`** (é o menor id livre) → **B manda comando como C**, sem nunca ter
tido o token dela. Se a vaga fantasma fosse a do anfitrião, seria `iniciar` pelos outros. Correção
dupla: o token morre no `sair`, e `jogadorDoToken` exige o dono no roster.

🔴 **2. `entrar` não evictava e `sair` por comando não limpava o mapa.** A evicção que o 3.2.1
introduziu cobria só o `reentrar` — **o caminho que já estava certo**. Duas conexões podiam mandar
pelo mesmo jogador sem token nenhum. Agora existe `mapearConexao`, usada nos dois.

🔴 **3. Estado persistido ANTES do 3.2.1 fazia `aoReceber` LANÇAR**, contra o docblock que promete
que ele nunca lança: o DO devolve o objeto gravado cru, sem migração de schema, e
`Object.entries(undefined)` explode.

📌 **Consequência de design que virou teste: NO LOBBY, cair É sair, e o token morre junto.** Um F5 no
lobby exige `entrar` de novo, não `reentrar`. Depois de iniciada, cair preserva tudo. A UI do 3.3
depende disso.

⚠️ **E o harness dava falsa confiança:** a reconexão reusava o MESMO `conexaoId`, e como
`aoDesconectar` já apagara a chave, **a evicção nunca era exercitada** — `tokensRecusados = 0` era
tautologia. Agora cada volta usa socket novo (`<id>-r<n>`) e o teste assere que nenhum jogador ficou
com duas conexões.

**Medido:** `npm test` **1298/43**, `typecheck`/`eslint`/`build` 0, smoke real **17/17**.

---

### PR 3.3 — lobby e draft online na tela (2026-08-10, `fa5d3d1` + `b80dd63`) — ALTO RISCO

O modo Online virou jogável. Novos: `src/net/conexao.ts` (WebSocket com reconexão automática),
`src/ui/useSalaOnline.ts`, `TelaLobby.tsx`, `FluxoOnline.tsx`, mais dois arquivos de teste.

🔑 **REUSA AS TELAS DO OFFLINE.** `TelaDraft`, `TelaPeca` e `TelaResumo` já recebiam
`DraftState` + `jogadorId` desde o modo Local (2.1b), e o cliente online reconstrói exatamente um
`DraftState` — então **não há tela de draft nova**. Duas telas desenhando a mesma coisa acabariam
divergindo.

### 🔴 O CONTRATO DO AUSENTE, testado explicitamente (pedido do dev)

O dev pediu **teste**, não só implementação: *"se dois clientes divergirem na escolha automática de
quem abandonou, o pool de peças fura em silêncio."* O harness já cobria o **mecanismo**; o que o 3.3
acrescenta é outro risco — **a UI criar um SEGUNDO caminho de decisão**.

`contrato-ausente.test.ts` tem duas metades: varredura de `src/ui/**` e verificação de determinismo
(a substituição é idêntica entre execuções independentes, depende de *quem* é o jogador —
anti-vacuidade — e não muta o estado). A varredura **ignora comentários** de propósito: os arquivos
que mais citam os nomes proibidos são os que explicam a regra, e reprovar a documentação da regra
empurraria todo mundo a apagá-la.

⚠️ **A primeira versão da cerca era contornável, e um dos testes era FALSO-NEGATIVO** — achados da
revisão, e o segundo só apareceu porque foi **medido**:
- **Indireção:** asserir *ausência* num diretório não pega um helper novo em `src/net/` chamado de um
  componente. Virou **allowlist repo-wide** (igualdade contra lista fechada). Verificado criando um
  arquivo que viola: acusou.
- **`escolhaPadrao`** se anuncia no docstring como "o que a UI vai substituir por cliques" —
  chamá-la com o id de um ausente seria um segundo caminho sem citar nome proibido. Banida na UI.
- **O 3º argumento de `sincronizarDraft`** (que existe para o harness sabotar clientes): o teste que
  o proibia usava `/sincronizarDraft\s*\([^)]*,[^)]*,/` e **não pegava** — o `[^)]*` para no primeiro
  `)`, e a chamada real tem `aplicarMensagem(a, b)` aninhado. **Medido com a sabotagem aplicada: o
  teste continuava verde.** Trocado por contagem de parênteses balanceados, com teste do próprio
  contador. Re-medido: agora pega, inclusive com arrow anônima que não cita nome nenhum.
- Varredura passou a ser **recursiva** (parava no primeiro nível).

*Teste de cerca que não pega o contorno é pior que nenhum — dá confiança falsa.*

### O bloqueante: beco sem saída

`FluxoOnline` tinha um ramo **sem saída**: bastava digitar o nome de uma sala **já iniciada** (erro de
digitação, amigo mandando o nome depois do começo, token perdido em outro navegador) para o servidor
nunca mandar `voce-e` — `euSou` ficava `null` para sempre e a tela era um parágrafo sem botão. Pior,
o erro que explicava tudo (`sala-iniciada`) não era mostrado nesse ramo. Agora **todo ramo de espera
tem saída e motivo**.

**Outras correções da revisão:** o limiar `<= 5` virou `< RODADA_COMPLETA` — era **o mesmo limiar
duplicado que o commit `7e7d018` tinha fechado, e que voltou aqui** · TDZ latente no `aoAbrir` (usava
a `const conexao` ainda em inicialização; só funciona porque `open` é assíncrono) · "Ir pra corrida"
escondido no online, porque prometia a corrida e devolvia à tela inicial · **seed, dificuldade e
formato SOMEM no modo online** em vez de ficarem editáveis com um parágrafo dizendo que não valem —
"sumir, não desabilitar" já era o padrão desta tela para o seletor de pista · `VITE_WS_BASE` para
publicar fora de `localhost` · a fila da conexão guarda só o **último** `escolher` (N cliques durante
a queda viravam N `turno-divergente` na volta) · `key={salaOnline}`.

**Medido:** `npm test` **1318/45** (era 1298/43), `npm run typecheck` **0**, `eslint src scripts
party` **0**, `npm run build` **0**. App (Vite 5173) e worker (wrangler 8787) sobem juntos e servem
(HTTP 200 em `/`, `/src/main.tsx`, `/src/ui/FluxoOnline.tsx`); smoke real **17/17**.
`src/engine/`/`src/data/` intocados ⇒ balance inalterado por construção.

⚠️ **Erro de processo registrado:** um `sed` de correção de tokens CSS chegou a alterar **13 linhas
pré-existentes** do `estilos.css` que estavam certas — os aliases `--cor-*` existem em `estilos.css`,
não em `tokens.css`, e o sed global não sabia disso. Revertido antes do commit; o diff final tem
**zero linhas removidas**, verificado. Lição: `sed` global em arquivo grande sem conferir o diff é
como o próprio projeto já aprendeu com a cerca de lint — **a verificação tem que ser o diff, não a
intenção.**

### PR 3.3.1 — jogar em rede: o worker pela porta do Vite (2026-08-10, `23d1cce`)

**O diagnóstico, com os dados reais que o dev mediu:** `wrangler dev` sobe em **`127.0.0.1:8787`**
— só localhost. `vite --host` expõe em três interfaces (`192.168.0.13` LAN, `10.241.222.232`
ZeroTier, `26.156.17.128` Radmin). Resultado: de outra máquina o app **carregava** e o WebSocket
**morria**.

🔑 **E abrir o worker na rede não teria resolvido.** A URL do WS era fixa (`ws://<host>:8787`), e
**cada visitante chega por um IP diferente**. Não existe endereço fixo que sirva LAN, VPN e celular
ao mesmo tempo — a porta era só metade do problema.

**A correção (opção 1 do dev, e ela era viável):** o Vite serve o worker. `vite.config.ts` repassa
`/parties/*` para `127.0.0.1:8787` com **`ws: true`** (é o que faz o `Upgrade: websocket` passar), e
`baseParaEstaPagina` deriva de **`location.host`** — que inclui a porta — em vez da porta fixa. Some
a classe inteira: **uma porta só** exposta (a 8787 continua fechada), **qualquer interface**, e
segue funcionando em cenário futuro sem tocar em código.

📏 **MEDIDO, e sem segunda máquina:** o smoke completo (17 cheques, WebSocket real) passou pelas
**quatro** rotas — `localhost`, `192.168.0.13`, `10.241.222.232`, `26.156.17.128` — todas na **5173**,
com o worker ainda em `127.0.0.1`. O truque de validação: **abrir por `192.168.0.13:5173` na própria
máquina já reproduz o problema**, porque o host muda. Também confirmado que `npm run dev` (sem
`--host`) continua funcionando.

`conexao.test.ts` trava as duas pontas — a base derivada (com os quatro IPs reais) e a rota
`/parties/sala/<nome>` que o `routePartykitRequest` espera. Se ela e o prefixo do proxy divergirem, o
WebSocket some **sem erro claro**. Tem asserção explícita de que `8787` **não** aparece na URL.

📄 **`docs/jogar-em-rede.md`** — comando (`npm run sala` + `npm run dev:rede`), firewall (só
**5173/TCP**, com o `New-NetFirewallRule` pronto), o `[t] start tunnel` do wrangler como alternativa
ao ZeroTier (com a ressalva de que ele expõe **só o worker**, e aí `VITE_WS_BASE` entra), e um
diagnóstico em ordem.
⚠️ **Achado que vale o registro:** as **três** interfaces desta máquina estão no perfil `Public` do
firewall (verificado com `Get-NetConnectionProfile`) — o mais restritivo, inclusive a Ethernet da
LAN. É o primeiro suspeito se o celular não conectar.

**Medido:** `npm test` **1325/46**, `typecheck`/`eslint`/`build` **0**.

### PR 3.3.2 — código de sala e ciclo de vida (2026-08-10, `02ff6ee` + `b882d9b`) — ALTO RISCO

**CÓDIGO DE SALA.** Acabou o `sala-1` que qualquer um adivinhava. A tela do online agora oferece "Criar sala" e "Entrar na sala de um amigo"; ao criar, o **SERVIDOR sorteia um código hexadecimal de 6 dígitos** (nunca de 4) e mostra com botão de copiar.

🔑 **Seis dígitos por enumeração, não por colisão.** Com 4 dígitos são 65.536 combinações, que um script varre em minutos; com 6 são 16.777.216 — **256× mais caro**, impraticável pra jogo casual em grupo. Hex ainda evita o par ambíguo `0`/`O` e `1`/`I`, que não existem em `0-9A-F`. As decisões do dev: (1) **link compartilhável** `?sala=A3F9C2`, porque ditar código e redigitar no WhatsApp é o caminho mais sujeito a erro; (2) **aviso de fechamento só no último minuto**, pra que a tela de resultado fique limpa enquanto o pessoal comenta (implementado via `JANELA_DE_GRACA_MS = 10 min`).

**CICLO DE VIDA.** A sala vive enquanto houver alguém conectado. Terminada a partida, ela fica **viva por uma janela de graça de 10 minutos** pra quem quiser olhar o resultado, anotar, printar. Vencida a janela, qualquer pessoa que reste é desconectada e a sala é **RESETADA**: estado descartado, log limpo, código liberado. Se **TODOS saem antes**, reseta na hora (não espera 10 minutos). Além disso, se a sala **fica vazia por mais de 2 minutos** (`CARENCIA_VAZIO_MS`), reseta também — mata as salas zumbis de drafts antigos e economiza storage. (O teto de 10 min em vez de 5 é porque quem levanta da mesa não pode perder o resultado; o alarme de 5 s já existia pro cronômetro de turno e seria confuso usar novamente.)

**O que isso resolve, registrado pelo dev:** colisão de nome (código é privado por padrão), o log append-only que crescia PARA SEMPRE (metade do bloqueante C2 do PR 3.2 — agora tem ponto de descarte), e a sala zumbi com draft de dias atrás.

**🔴 OS TRÊS CRÍTICOS DESCOBERTOS PELA REVISÃO — todos bloqueantes de funcionalidade:**

**C1 — O fluxo principal não funcionava.** `criar()` armava o alarme com **zero conexões**; o alarme disparava em 5s; `decidirVida` via 0 conexões e encerrava. Como a sala nasce vazia e o caso de uso é "criar → copiar link → mandar no WhatsApp → o amigo abrir", **ela morria ANTES de alguém entrar**, e o criador via "sala não encontrada" — 404 falso. **E o meu próprio teste CODIFICAVA O BUG como comportamento desejado** — "sala VAZIA encerra na hora" ficava verde porque afirmava a regra errada. Corrigido com **baseline vermelho:** `await pausa(7000)` no smoke entre `POST /criar-sala` e a primeira conexão — ficou vermelho ("A: timeout"), como precisava.

**Fixo:** `vazioDesde` no estado + `CARENCIA_VAZIO_MS = 2 min`. O alarme só encerra a sala se `agora - vazioDesde >= CARENCIA`. A janela de 2 minutos é confortável — quem trocou pro WhatsApp volta em menos de 2 minutos na maioria das vezes.

**C2 — mesma raiz.** `onClose` encerrava a sala **na hora quando a última conexão caia**. Quem estava sozinho esperando o amigo e trocava pro WhatsApp pra colar o link perdia a sala; um F5 (reconexão de aba) tinha o mesmo efeito **destruindo a reconexão do 3.2.1** exatamente no caso em que ela mais importa. **Raiz:** a decisão de vida estava duplicada entre `servidor-sala.ts` (correto) e `party/sala.ts` (casca; errado) — o cabeçalho de `party/sala.ts` afirmava "toda a decisão mora em `servidor-sala.ts`" e estava violando.

**Fixo:** `onClose` **só registra que esvaziou** (`vazioDesde = agora`); quem encerra é o alarme via `decidirVida`. A lógica de vida centraliza em **um só lugar testável** (`servidor-sala.ts`), que é onde ela deve viver.

**C3 — `onRequest` era alcançável de fora (QUEBRA DE PRIVACIDADE).** O roteador do partyserver casa qualquer caminho sob `/parties/<ns>/<nome>/…` (usa `>=`, não igualdade), então `POST /parties/sala/000000/criar` criava a sala **com o código que o atacante quisesse** — derrubando "é o servidor que sorteia", a validação de formato e a privacidade por enumeração inteira. Trocado por **RPC** (`stub.criarSeNova(codigo, agora)`), que só é alcançável de **dentro do worker**, com o código por **ARGUMENTO** em vez de `this.name`. Medido depois: a rota devolve 404 e a sala `000000` não existe — validado.

**Mais avisos da revisão, todos aplicados:**
- `this.estado = null` virou a **PRIMEIRA linha de `encerrar()`** (antes ficava depois de dois `await`, deixando a sala viva e sem alarme por um instante — um comando em voo podia regravar o estado **depois** do `deleteAll`, ressuscitando o código recem-liberado); agora há flag `encerrada` também pra redundância.
- O alarme para de chamar `aoPassarOTempo` quando a partida acabou — durante os 10 min da janela isso seriam ~120 escritas em storage e 120 broadcasts de snapshot completo por sala, sem nada mudar.
- `/criar-sala` ganhou **CORS**, porque com `VITE_WS_BASE` o `fetch` é cross-origin (o WebSocket ignora CORS; esse `fetch` não — quebrava em silêncio).

**Respostas às perguntas técnicas do dev (registradas por pedido dele):**
1. ✅ O alarme do DO serve e foi usado — o mesmo tique do cronômetro de turno (5s) decide o ciclo de vida.
2. ✅ Código de sala resetada devolve `sala-inexistente` com mensagem clara ("Esta sala não existe ou já encerrou"), não erro genérico.
3. ✅ Entrar no meio de um draft segue recusado com `sala-iniciada` (a tela do 3.3 já explica com saída). Agora só alcançável com código válido, que é estritamente melhor.
4. ✅ A reconexão do 3.2.1 continua valendo dentro da janela; depois do reset o token é limpo junto (`sala-inexistente` dispara o mesmo caminho de `token-invalido`).

**Decisão travada:** `agora` virou **OBRIGATÓRIO** em `criarSala`/`criarServidor` — com default `0`, a sala nasceria "vazia desde 1970" e morreria no primeiro tique do alarme, capturando a armadilha exata que a carência conserta. Sem default, falha alto.

**Medido (real, não estimado):**
- `npm test` **1352/49** (02ff6ee) → **1355/49** (b882d9b), `typecheck` **0**, `eslint` **0**, `build` **0**.
- Smoke contra `wrangler dev` real: **20/20 passando**, incluindo (1) "sala criada pelo servidor com código CE472E", (2) "código inexistente é recusado", (3) **"sala esvaziou e SOBREVIVEU à carência — dá pra voltar depois de um F5"** — o terceiro prova que a fix de C1+C2 funciona.

**Risco original do 3.3 não tocado:** a corrida online ainda NÃO existe. O draft online termina no resumo.

### PR 3.3.3 — criar sala não passava pelo proxy do Vite (2026-08-11, `a6010ef`) — BAIXO RISCO

**PROBLEMA: `/criar-sala` não funcionava.** O 3.3.2 trocou a criação de sala de rota do Durable Object para `POST /criar-sala` no worker, mas o `proxy` do `vite.config.ts` (escrito no 3.3.1) repassava SÓ `/parties/*`. O fetch morria DENTRO do Vite com **404**, sem uma linha no terminal do wrangler. Diagnóstico medido: `curl -X POST http://localhost:5173/criar-sala` → **404**; a mesma requisição direto em `127.0.0.1:8787` → **200 `{"codigo":"531004"}`**. A UI concluía "o servidor está rodando?" apontando pro lugar errado.

**SOLUÇÃO: fonte única de verdade.**  O problema era haver DUAS listas de rotas (`src/net/` e `vite.config.ts`) que precisavam concordar e nenhuma saber da outra — fácil esquecer uma chave. Agora `src/net/rotas.ts` é a fonte única (`ROTA_CRIAR_SALA`, `PREFIXO_PARTIES`, `ROTAS_DO_WORKER`, `proxyDoWorker()`), e `vite.config.ts` **DERIVA** o bloco `proxy` chamando `proxyDoWorker()`. Rota nova atravessa o proxy sozinha. `sala-online.ts` e `party/sala.ts` passaram a usar `ROTA_CRIAR_SALA` em vez do literal.

**Detalhe de implementação:** a primeira tentativa foi o teste IMPORTAR o `vite.config.ts` de verdade, mas isso reprova com **TS6305** — o arquivo pertence ao projeto composite `tsconfig.node.json` e o `tsc` exige o `.d.ts` compilado, que este projeto (`--noEmit` em tudo) nunca produz. Nem `disableSourceOfProjectReferenceRedirect` nem pôr o arquivo no `include` resolveram. Daí a inversão: o config importa do teste-testável (`rotas.ts`), não o contrário.

**Teste novo: `src/net/proxy-vite.test.ts`** (baseline vermelho de verdade — falhou nos dois cheques importantes antes da correção, com os outros três passando). Cobre: (1) `/criar-sala` atravessa o proxy; (2) WebSocket (`/parties/*`) segue com `ws: true`; (3) toda rota declarada é atendida; (4) **anti-vacuidade** (`/`, `/index.html`, `/src/ui/App.tsx`, `/rota-inexistente` não casam); (5) **o elo fechador** — o `vite.config.ts` USA `proxyDoWorker()` e não tem `target:` escrito à mão (verificação por texto do arquivo, com limite conhecido no docblock: prova que a **chamada** está escrita, não que o Vite a executou — runtime medido com curl).

🔒 **Lição de processo (IMPORTANTE, vale destacar — mapeada ao `CLAUDE.md` § "Cerca de lint"):** `conexao.test.ts` tinha um COMENTÁRIO afirmando que o prefixo "é o mesmo do `proxy` no `vite.config.ts`" — e **nada lia o `vite.config.ts`**. **Comentário não é asserção; é a mesma armadilha da "asserção infalsificável" do PR 8.2.** Os 1355 testes passavam com o botão quebrado porque a conferência era MANUAL, nunca testada. O comentário foi corrigido pra apontar pro teste que de fato confere (procurar "vite config" em `conexao.test.ts` agora lê `proxy-vite.test.ts`).

🔒 **C3 continua fechado, VERIFICADO DEPOIS DA MUDANÇA:** `POST /parties/sala/000000/criar` → **404** (medido). A criação segue por RPC (`criarSeNova`), fora de `/parties/`. Não foi movida pra dentro de `/parties/` apesar de isso simplificar o proxy **porque** C3 precisa ficar fechado — registrado por quê aqui pra que nenhum PR futuro "simplifique".

**PROBLEMA 2 — tela órfã na TelaInicio.** O modo Online ainda mostrava um campo "Nome da sala" com placeholder `sala-1` e o texto "quem digitar o mesmo nome cai na mesma partida" — a interface **ANTERIOR ao código gerado pelo servidor**, contradizendo o modelo do 3.3.2. O argumento já era morto (`App.tsx` fazia `onEntrarOnline={() => setEscolhendoSala(true)}`, ignorando o parâmetro). Removidos o campo, o estado `salaOnline`, a phrase; a prop virou `() => void`. Removida também, no online, a frase sobre calendário sorteado de campeonato — órfã da mesma família, já que no online não há campeonato (o 3.5 não existe; o draft online termina no resumo). A frase que sobreviveu é verdadeira e foi mantida ("Seed, dificuldade e formato não aparecem aqui porque quem decide é o servidor da sala…").

**VALIDAÇÃO NO NAVEGADOR — fluxo real, ponta a ponta:** modo Online → "Criar ou entrar numa sala" → "Criar sala" → código **C4 22 04** com link `http://localhost:5173/?sala=C42204` → link aberto em segunda aba → nomes "Anfitrião"/"Convidado", cada aba vendo a outra, anfitrião com 👑 → "Estou pronto" nas duas → "Começar o draft" → **"Rodada 1 de 5" nas duas abas**, cada uma com seu sorteio (Sauber 2018 / Osella 1984) · sem erros no console · worker registrou `POST /criar-sala 200 OK` e dois `GET /parties/sala/C42204 101 Switching Protocols`.

**Medido:**
- `npm test` **1362/50** (era 1355/49), `typecheck` **0** (app + party), `eslint src scripts party vite.config.ts` **0**, `build` **0**.
- `npm run balance` **não rodado** — nada em `src/engine/`, `src/data/` ou `scripts/alavancas` foi tocado.

### PR 3.4 — handshake de versão + detector de divergência (2026-08-11, commit `75ccfbe`) — ALTO RISCO

**RISCO ATIVO REBAIXADO — deixou de divergir em silêncio, agora diverge com alarme (ver ressalvas abaixo).** Quando um jogador abandona, o servidor marca-o ausente e **pula a vez dele**. Quem escolhe por ele é **cada cliente, localmente** — escolher é regra de jogo e regra de jogo é engine, servidor não tem dataset. Problema: a rodada 6 tem pool compartilhado (2 cópias por peça). Se dois clientes escolherem peças **diferentes** pelo ausente, cada um debita uma cópia diferente e os estados divergem. `copiasRestantes` divergem, `loadouts` divergem, corrida que cada um assiste é outra. **Antes:** nada acusava. **Agora:** detector compara e acusa em `EstadoCliente.divergencia`.

**DETECTOR — `src/net/hash-draft.ts` (novo) + `registrarAtestado` em `src/net/servidor-sala.ts`**

Campos **ENUMERADOS e chaves ORDENADAS**, nunca `JSON.stringify(draft)`: `Record` em JavaScript emitem na ordem de INSERÇÃO e cada cliente monta os mapas na ordem em que o log chega, então dois estados idênticos hasheavam diferente sem essa guarda. `pecasReveladas` fica de fora — é `null` fora do turno por projeto e acusaria 21 dos 22 sempre. `deriveSeed` usado como **HASH, nunca como stream** (precedente `narracao` no PR A): nenhum tempo muda, nenhum RNG novo é consumido, seeds de ouro intactas por construção.

O servidor compara **STRINGS OPACAS** e nada mais — ele não tem dataset, e essa fronteira do 3.2 continua intacta. A âncora é `eventosAplicados`: atestado com âncora menor é ignorado **EM SILÊNCIO**, porque cliente atrasado é normal e um alarme que dispara com lag é desligado pelo dev na primeira semana de operação.

**HANDSHAKE — `src/engine/versao.ts` (novo) + `versao.test.ts`**

`VERSAO_APP = '3.4.0'` é manual, e valor manual apodrece. Então `versao.test.ts` hasheia o conteúdo de `src/engine/`, `src/data/` e os dois arquivos de `src/net/` que decidem resultado (`cliente.ts` + `hash-draft.ts`), e reprova quando muda sem a versão mudar junto. Versão diferente **recusa a entrada** na porta: vale para `entrar` E `reentrar`. Deixar entrar criaria a divergência que o detector acusaria — é a primeira linha de defesa.

**REVISÃO — 3 bloqueantes + 4 importantes, todos corrigidos**

- **B1 — âncora sem teto.** Uma mensagem com `ancora: 2**40` de qualquer jogador sentado fazia todo atestado honesto seguinte cair no ramo do silêncio **pelo resto da partida**, desligando a defesa sem derrubar nada. Corrigido: teto = tamanho do log (servidor compara contadores sem entender conteúdo).
- **B2 — `reentrar` passava por fora do handshake.** É o caminho que MAIS importa: entra-se uma vez, reconecta-se a cada F5. Deploy no meio da partida trazia o jogador de volta com engine nova numa sala de engine velha. Corrigido: ambos os comandos de lobby checam versão.
- **B3 — o digest excluía `src/net/`.** Onde o risco ativo mora: `cliente.ts` tem `escolhaDoAusente`, `hash-draft.ts` decide o FORMATO do atestado. Mexer só em `hash-draft.ts` faria clientes corretos hashearem estados idênticos de formas diferentes — alarme falso que não era lag. Corrigido: ambos os arquivos entram no hash.

Importantes:
- **I1 — identidade preservada em atestado repetido.** Amplificação de escrita no Durable Object: idempotência testada.
- **I2 — referência = hash MAJORITÁRIO, não o do menor id.** Com o menor id, se quem divergisse fosse o primeiro na ordem, o alarme acusaria os 21 honestos. Corrigido para votação (maioria simples).
- **I3 — `...estado` nos dois ramos.** Campo novo sumiria em silêncio sem spread.
- **I4 — atestado saiu do updater do `setCliente` pra um efeito.** StrictMode da dev rodava o efeito duas vezes.
- **`sorteios` entrou no hash:** pega dataset divergente já no 1º atestado, não só na hora da escolha.

**MUTAÇÕES — o dev exigiu vermelho real**

(Implementação veio antes do teste; testes reescritos com a implementação pronta.)

- Hash sem `copiasRestantes` → mata os testes do hash-draft, **NÃO** o detector (divergência também aparece em `loadouts` — defesa em profundidade, não falha única).
- Alarme desligado → mata a detecção.
- Âncora sem separar atrasados → matou **só UM dos dois testes de lag.** O outro comparava estados **IDÊNTICOS** — atrasado com estado igual produz o mesmo hash e ficaria calado mesmo sem a regra de âncora. Reescrito com atraso real, agora mata aquele teste também.
- Teto da âncora removido → mata o teste de B1.

**RESULTADO DO DETECTOR (o que o dev pediu)**

- Divergência do ausente com harness sabotado: **detectada**
- 20 seeds sem sabotagem: **nenhum alarme falso**
- Cliente atrasado com estado genuinamente diferente: **silencioso** (pela regra de âncora)
- Atestado de não-jogador / malformado / âncora absurda: **recusado, sala intacta**
- Build diferente: **recusado na porta**

**Medido:**
- `npm test` **1394/54** (era 1368/51 do PR 3.3.4), `npm run typecheck` **0**, `eslint src scripts party vite.config.ts` **0**, `npm run build` **0**.
- `npm run balance` **rodado** (tocou `src/engine/versao.ts`): **inalterado**.

**Revisão:** nenhuma bloqueante — foi ela que guiou todas as correções. **Fluxo alto risco**, conforme `CLAUDE.md`: baseline vermelho real, mutações que matam casos, medição do resultado solicitado.

**RESSALVAS — ler antes de declarar "risco fechado"**

1. **O alarme NÃO aparece na tela.** Fica em `EstadoCliente.divergencia` (campo novo). Surfacing é mudança visual e precisa de veredito do dev — é o próximo passo natural do 3.4 e muda o que se VÊ, portanto entra na sequência com preview MOSTRADO.
2. **A garantia do detector é "na âncora terminal", não "no primeiro evento divergente".** Appends rápidos e sucessivos derrubam atestados de âncora intermediária dos retardatários, porque o balde só guarda a maior. Vale no fim, quando todos convergem. Não superdimensione: não é "detecção instantânea em tempo real", é "certificação pós-convergência".
3. **Cliente com bundle em cache que abre a sala fica fixo em versão `''` e tranca os atuais com `versao-divergente`.** O erro não carrega qual versão a sala espera — jogador não sabe que precisa de F5 forçado. Limitação conhecida.

**Pendências:**
- ✅ **Fechada:** "risco ativo divergir em silêncio" → agora diverge com alarme (não visual ainda).
- 🟡 **Surfacing do alarme** — item 0 novo da SEQUÊNCIA (é mudança visual, precisa preview + veredito).
- 🟡 **Limitação do cache + versão `''`** — pode valer um FAQ em `docs/jogar-em-rede.md` ou deixar pra quando o dev reportar problema real.

### PR 3.3.4 — F5 no draft perdia a sala; porta 8787 ocupada falha silencioso (2026-08-11, `6b9fb3a`) — BAIXO RISCO

**PROBLEMA 1 — F5 no meio do draft voltava pra tela inicial.** O dev relatou; `ESTADO.md` §FASE 3 prometia que F5 devolvia o jogador ao draft pelo token do 3.2.1. Duas hipóteses levantadas foram **REFUTADAS POR MEDIÇÃO**:
- Hipótese (falsa): "o token não está sendo salvo/lido". **Medido:** `localStorage` com a sala montada tinha `f1f:token-sala:<código>` presente, e `useSalaOnline.ts` o lê no boot e envia no `aoAbrir`.
- Hipótese (falsa): "a rota de reconexão não passa pelo proxy". **Medido:** `reentrar` **não é rota HTTP** — é mensagem dentro do WebSocket de `/parties/sala/<código>`, que já passa pelo proxy.

**A causa raiz é outra:** `App.tsx` descobre em que sala está de UMA fonte — a query string, lida uma vez no boot (`useState(() => salaDaUrl(window.location))`) — mas entrar numa sala só mexia em estado React e **nunca tocava a barra de endereço**. **Medido no navegador:** depois de "Ir para a sala", URL do anfitrião continuava `http://localhost:5173/`, sem `?sala=`. No F5 o app não sabia de qual sala voltar; caía na `TelaInicio`; token ficava no `localStorage` intacto e inútil — ninguém sabia de que sala ele era. **Assimetria crucial:** quem entra pelo LINK nunca viu o defeito; quem **CRIA** a sala (o anfitrião) via sempre.

**SOLUÇÃO: `fixarSalaNaBarra` em `sala-online.ts` + funil único `entrarNaSala` no `App.tsx`.** Usa `replaceState`, não `pushState` — entrar numa sala não é navegação, e um item novo no histórico faria o "voltar" devolver a uma tela inicial que não existe mais. A URL agora fica `?sala=CÓDIGO` e sobrevive ao F5. Novo arquivo `src/ui/sala-na-url.test.ts` trava as duas metades do contrato: (a) **round-trip puro** — o que o escritor grava (`fixarSalaNaBarra`) o leitor do boot recupera (`salaDaUrl`); (b) **varredura de fonte única** — percorre `App.tsx` exigindo que só exista UM caminho de entrada e que ele chame `fixarSalaNaBarra`. A varredura existe porque o projeto é `environment: 'node'` sem jsdom (mesmo recurso do `contrato-ausente.test.ts`).

**Baseline vermelho REAL, honestamente:** 1 falhou, 5 passaram — as asserções puras do round-trip já passavam sozinhas; o que faltava era a **fiação** do App.

**PROBLEMA 2 — porta 8787 ocupada falhava em silêncio.** Com a porta ocupada, `wrangler dev` sobe na 8788 sem reclamar, mas o proxy do Vite aponta pra 8787 FIXA (`ALVO_WORKER_DEV`). Sintoma depende do que sobrou na 8787: se nada, proxy dá 500; se um `workerd` meio-morto (aceita conexão, nunca responde), o botão fica em **"Criando…" pra sempre, sem erro, sem log**. **Reproduzido de verdade nesta bancada.**

**SOLUÇÃO: pré-voo `scripts/checar-porta-sala.ts` no `npm run sala`** — tenta ESCUTAR na porta e falha com `exit 1` e instrução acionável; `wrangler dev` passou a receber `--port 8787` explícito. **Medido nos dois estados:** porta ocupada → `exit 1` + mensagem clara; porta livre → sobe em 8787 e proxy responde 200. `scripts/node-shims.d.ts` ganhou tipos para `node:net` e `process.stderr`/`process.exit` — o projeto não usa `@types/node` (decisão do PR 4.1).

**REGISTRADO, NÃO CORRIGIDO (decisão explícita do dev):** duas abas do MESMO navegador compartilham o `localStorage` e portanto o token de reentrada. **Medido:** com o anfitrião já dentro, abrir o link numa aba nova faz ela **reentrar COMO o anfitrião** — as duas abas mostrando o mesmo jogador e a sala contando 1, não 2. **Não afeta jogo real** (cada pessoa no seu navegador); **corrompe o teste na própria máquina**. Documentado em `docs/jogar-em-rede.md` com o contorno (segundo navegador ou janela anônima). Fica como pendência ativa, item 0.(h).

**VALIDAÇÃO — o DEV testou o fluxo completo e fechou OS QUATRO CASOS DE PROPÓSITO (todos rodados com sucesso):**
- ✅ **F5 no meio do draft** — volta no mesmo ponto como o mesmo jogador.
- ✅ **Fechar a aba e voltar em menos de 2 min** — a sala sobrevive e a reconexão traz o estado do draft.
- ✅ **Cronômetro de inatividade** — "você perdeu a vez por inatividade" quando o prazo expira.
- ✅ **Código inventado (FFFFFF)** — "Sala não encontrada", sem travar.

**Medido:**
- `npm test` **1368/51** (era 1362/50), `npm run typecheck` **0**, `eslint src scripts party vite.config.ts` **0**, `npm run build` **0**.
- `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/` ou `scripts/alavancas` foi tocado.

**Revisão:** nenhuma — **baixo risco** (UI pura, zero toques em logic/dados/rede profunda). Fluxo curto: implementação → testes verdes → commitar, conforme regra da Fase 3 em `CLAUDE.md` §RIGOR PROPORCIONAL AO RISCO.

**Pendências:** 
- ✅ **Fechada:** "O DEV TESTAR O ONLINE NO NAVEGADOR" (item 0 da SEQUÊNCIA do ESTADO.md). Os quatro casos rodados e validados em 2026-08-11.
- ✅ **Aberta:** token por origem, não por aba (item 0.(h) de "Pendências ATIVAS").

### PR 3.4.1 — surfacing do alarme de divergência (2026-08-11, commit `615e94f`) — BAIXO RISCO

**O 3.4 construiu o detector inteiro — hash, comparação no servidor, broadcast, registro no cliente — e o jogador não via nada.** Do ponto de vista de quem joga, alarme que ninguém vê é o mesmo silêncio que a fase gastou um PR pra acabar. Este é o último metro.

**DECISÕES:**

- **Não fecha sozinho.** O estado já divergiu e nada no jogo o reconcilia; sumir sugeriria que passou.
- **Não acusa ninguém nominalmente.** O servidor não tem dataset e não sabe quem está certo — `jogadores` é a minoria que atestou diferente, uma pista, não um veredito. Há teste exigindo que o id não apareça na tela.
- **Sem componente novo e sem cor nova**: usa `--cor-erro`/`--cor-superficie`, os mesmos aliases da tela de erro do lobby. `--cor-erro` é `--erro-texto` (TINTA, não preenchimento), pela regra travada da paleta no 7.8.

**ARQUITETURA:**

`BannerDivergencia` fica em `FluxoOnline`, FORA do conteúdo por tela — a divergência pode acontecer em qualquer ponto (sorteios, peça, espera, resumo) e o jogador precisa vê-la em todos. Pôr em cada tela seria repetir a regra em seis lugares e esquecer num deles. O `FluxoOnline` virou um invólucro fino retornando `<> <BannerDivergencia /> <ConteudoOnline /> </>`, e o corpo antigo virou `ConteudoOnline`.

**TESTE (`src/ui/banner-divergencia.test.ts`):**

- Aparece com divergência; **NÃO** aparece sem (anti-vacuidade — alarme permanente é ruído que se aprende a ignorar, que é o mesmo que não ter alarme).
- Aparece em TODAS AS CINCO telas do online (sorteios, peça, espera, resumo, sala encerrada).
- Não vaza id de jogador.

**Mutação rodada:** o banner nunca aparecer **mata 2 dos 4** testes (anti-vacuidade + não-vaza); os outros dois (aparição em cada tela) passam vacuamente sem o render. É uma limitação real — teste cego não pega composição (testes de UI só pegam o que asserem), e a cobertura depende da guarda de anti-vacuidade pra não ficar ilusória.

**PREVIEW — a LIÇÃO que sobrevive ao PR (registrada no `CLAUDE.md` §"Definição de pronto" item 5):**

O preview (`scripts/preview-divergencia.preview.test.ts`) renderiza componente REAL com o CSS REAL de produção. **Um defeito foi pego ABRINDO o preview antes de mostrar ao dev**, não por asserção nenhuma:

- **Primeira versão:** punha `data-tema` numa `<div>`, mas a cascata da paleta é `:root[data-tema='light']` (bloco 3 do `tokens.css`).
- **Resultado:** a seção rotulada "tema claro" renderizava **ESCURA** — um preview que mentia sobre o que mostrava.
- **Por que o teste passou:** arquivo existia, teste rodava sem erro, nenhuma asserção pegaria (o test node não lê CSS do SO).
- **Corrigido:** um `<iframe>` por tema, cada um com seu próprio `:root` via `srcdoc`. A guarda agora confere a forma ESCAPADA (`data-tema=&quot;light&quot;`), o que também prova que o caminho do iframe está sendo exercido.

Isso é a **quinta instância** da mesma família de "afirmado ≠ conferido" que a Fase 3 encontrou no netcode — comentário lendo o proxy sem medir, regex furada na cerca, "sala vazia encerra na hora", testes de lag com estados idênticos, digest sem `src/net/`. Agora do lado visual. O dev pediu que virasse regra e virou — cite o `CLAUDE.md` §"Definição de pronto" item 5 ao mencionar preview.

Path do preview (regenerável por `npm run preview`, gitignored): `E:\projetos\F1 fantasy\preview\divergencia.html`.

**VEREDITO DO DEV:** "Banner aprovado nos dois temas — legível, destacado sem ser gritante, e o texto está certo ao não acusar ninguém nominalmente." O portão visual do 3.4.1 está fechado.

**MEDIDO (real, não estimado):**
- `npm test` **1398/55** (era 1394/54), `npm run typecheck` **0**, `eslint src scripts party vite.config.ts` **0**, `npm run build` **0**.
- `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/` ou `scripts/alavancas` foi tocado (stat mostra `scripts/` e `src/ui/` apenas).

**Revisão:** nenhuma — **baixo risco** (UI pura, portão visual puro). Fluxo curto: testes → commitar, conforme regra em `CLAUDE.md` §RIGOR PROPORCIONAL AO RISCO.

**Pendências:**
- ✅ **Fechada:** "alarme não está visual ainda". Agora está — veredito do dev em 2026-08-11.
- 🟡 **Próximo passo aprovado:** a CORRIDA ONLINE, autorizada pelo dev nesta sessão e em planejamento pelo `fable-architect`. Depois dela, o 3.5 (campeonato online com seed por etapa) fecha a Fase 3.

## Acompanhamentos registrados pela revisão do PR 1.6 (não são defeitos; candidatos a PR futuro)

- `medirParadasExtras` usa equipes históricas inteiras — o CALL do estrategista desloca a 1ª parada e vira confound secundário do bucket de PNEU (o bucket <60 é na prática 1 piloto). Sinal mais limpo: fixar chassi/motor/estrategista/pit e variar só o piloto.
- ~~`medirRaridadePeca` usa draft uniforme simplificado~~ **Resolvido no PR 1.6.1** (pedido do dev em 2026-07-18): a métrica agora roda o motor de draft real (`criarDraft` + `resolverBots`, 22 bots em dificuldade 'dificil'). Resultado: ratio da Proibida subiu de 1.25 (uniforme) pra **1.51** — ainda ≤ 3.0, guarda verde. Números com draft real: playerShare proibido 59.0% (bots pra-ganhar preferem peça forte), championShare 89.0%. O ratio normalizado é saudável, mas o championShare absoluto alto é esperado dado o uso massivo; se o dev quiser reduzir a onipresença da Proibida, o knob é bônus/risco no JSON de peças (decisão explícita do dev, não recalibrar por conta).
- Margens finas e determinísticas nos asserts do harness: facil 64.3% vs piso 63%; alto 56.0% vs teto 60%. Mudança de dataset pode exigir recalibração — rodar `npm run balance` sempre que tocar notas/fórmulas.

## Metas de calibração (decididas pelo dev em 2026-07-18 — cumpridas no PR 1.6)

1. **Adiamento do harness confirmado** — PRs 1.3/1.4/1.5 entram com constantes-chute; o PR 1.6 calibra tudo. ✅
2. **Sinal de grid**: 61/100 é fraco demais. Meta: pole com carro idêntico vence **claramente mais que 61% e bem menos que 95%** (alvo ~70-80%). Direção: subir `gridOffsetMs` e/ou baixar `variancia`. O harness DEVE medir a taxa de vitória do pole e reportar se ainda está fraca. ✅ (facil 64.3%, media 72.5%, dificil 85.3%)
3. **Parada extra em desgaste Alto (75)**: 10% é baixo pro "força paradas extras" do GDD §9. Meta: a **maioria dos carros** (~40-60%, variando pelo PNEU do piloto) faz 2+ paradas em pista de desgaste Alto. Direção: baixar `limiarPneuGasto` ou subir a curva de degradação. ✅ (alto 56.0%; bucket PNEU<60 100%, 60-80 80.3%, >80 0%)
4. Harness também reporta: win-rate por raridade de peça (guarda contra peça dominante, GDD §14.3). ✅ (ratio proibido 1.25, limite 3.0)

## Próximos

- **Fase 6 — Modo Campeonato (EM ANDAMENTO; plano do fable-architect aprovado pelo dev em 2026-07-25).** Encadeia as 10 pistas do GDD §9 numa temporada com pontos FIA acumulados, tabela de classificação e campeão. Ponto de partida: o `balance.ts` já simulava campeonatos desde o PR 1.6 — o 6.1 promoveu essa lógica pra engine em vez de reescrevê-la.
  **Decisões aprovadas pelo dev (todas as 7, como propostas):** **D1** draft UMA vez por campeonato (re-draft destruiria a escassez de 2 cópias da peça e a trava do online, GDD §4/§7); meio-termo de trocar a peça entre corridas rejeitado na v1; se a medição do 6.3 mostrar dominância, a alavanca é um "pit de meio de temporada" (após a 5ª etapa, troca de UM componente), não re-draft. **D2** ritmo: assistir por default, com "Só o resultado" e "Simular o resto" — as 10 pistas somam **132 voltas** ⇒ ~9,9 min de replay puro no default de 4500ms/volta (PR 2.6), ~13 min com overhead de tela; rápida ~7,8 min, lenta ~22,8 min. **D3** pré-simular o campeonato inteiro quando o draft fecha (custo medido <2ms por campeonato — o harness faz 200 campeonatos + 2.100 corridas em 436ms), o que torna "Simular o resto" instantâneo e a persistência trivial. **D4** persistência em `localStorage` (`src/ui/persistencia.ts`, `Storage` injetado pra testar sem jsdom): salva SÓ ENTRADA (seed + `DraftState` + calendário + etapa), nunca os `ResultadoCorrida`; guardas = `versaoFormato` (shape) + **impressão digital auto-verificante** (hash dos pontos da etapa 1, recomputado ao retomar — invalida o save sozinho se dataset ou engine mudarem). `versaoEngine` manual foi rejeitada explicitamente: é constante que se esquece de bumpar, com falha silenciosa. **D5** calendário fixo na ordem do GDD §9, guardado como `string[]` (não hardcode) — habilita temporada curta e calendário custom sem mudar o formato de save. **D6** corrida rápida e campeonato COEXISTEM com código unificado mas **seeds separadas**: avulsa usa a seed crua (comportamento de hoje preservado bit a bit), campeonato usa `seedDaEtapa`; unificar a seed mudaria toda corrida avulsa sem quebrar nenhum teste — mudança silenciosa, rejeitada. **D7** hotseat: o handoff só existe no draft, então as 10 etapas são assistidas juntas sem handoff nenhum; mitigação do tempo total = seletor "Temporada curta (5 etapas)" (as 5 primeiras somam 68 voltas ⇒ ~5,1 min). Online: campeonato é função de `seed + loadouts`, exatamente o que o servidor já vai distribuir — **zero mudança na arquitetura de rede**. **D8** sub-streams: `seedEtapa = deriveSeed(seedCampeonato, 'camp:' + pista.id)`, por **id da pista, nunca por índice** ⇒ ordem do calendário e ordem de execução são irrelevantes; quali e corrida compartilham a seed da etapa sem colidir porque os rótulos internos diferem.
  **Sequência:** ~~6.1 promoção da engine~~ → ~~6.2 desempate FIA oficial~~ → ~~6.3 PORTÃO DE DECISÃO~~ (medido: **ρ = 0.953**, o draft decide o campeonato) → ~~**6.3.1 medição comparativa de alavancas**~~ (report-only; **PORTÃO FECHADO em 2026-07-27 — opção B: nenhuma alavanca entra no jogo, temporada curta de 5 etapas vira o default**; ver a entrada do portão nos Concluídos) → ~~6.4 `fluxo-campeonato.ts` puro (**calendário default = 5 etapas**)~~ → ~~6.5 persistência~~ → 6.6 telas (design system 5.1) → 6.7 TelaInicio (modo, temporada completa de 10 como opção, retomar). Se precisar cortar escopo, cortar pelo 6.7; nunca pelo 6.3.

- **Dataset histórico 1950-2025 (trilha PR 4.x — EM ANDAMENTO, plano do fable-architect aprovado pelo dev em 2026-07-21).** Princípio anti-GDD §14.1: scripts derivam notas de FATOS da API Jolpica-F1 (`https://api.jolpi.ca/ergast/f1/`, Ergast-compatível, 500 req/h — throttle aprovado 1 req/10s, cache resume-safe rigoroso, NUNCA refetch); nada de nota "no olho". Pipeline em 4 estágios: `fetch-f1-data.ts` (cache cru gitignored) → `agregar-fatos.ts` (`scripts/derived/fatos-agregados.json` COMMITADO — auditabilidade) → `derivar-notas.ts` (percentil de Hazen por temporada + shrinkage + faixa-alvo [28,96], único knob livre) → `dataset-report.ts` (histogramas + spot-checks). Decisões do dev: escopo = equipe/ano com ≥1/3 das etapas e 2 pilotos com ≥2 largadas, Indy 500 1950-60 excluída (D1); QUALI = grid dos results uniforme 1950-2025 (D2); AERO/MEC/MOTOR iguais na v1 MAS **PR 4.6 (buckets de circuito) é OBRIGATÓRIO** — sem ele os pesos de pista do GDD §9 viram decoração e peça de AERO vs MOTOR dá no mesmo; dataset NÃO está pronto sem o 4.6 (D3); CHU = 50 neutro + **override curado de 30-50 especialistas de chuva** (curadoria explícita documentada, não derivação; LARG fica 50) (D4); runner = Node 24 nativo, sem tsx (D8, `node -v` = 24.16.0). Sequência: ~~4.1 fetch → 4.2 agregador → 4.3 derivação staging → 4.4 desacoplamento → 4.5 swap + balance → 4.6 buckets de circuito~~ (TODOS concluídos e mergeados) → ~~restavam CHU curado e decisão sobre override do ULT~~ **Resolvidos no PR 4.7** (overrides curados de ULT e CHU; trilha CONCLUÍDA em 2026-07-23 com o 4.6.1 + 4.7).

## Acompanhamentos registrados pela revisão do PR 4.6 (não bloqueantes)

- ~~Percentil de grid pode sair de [0,1] com dado real dos anos 50~~ **Resolvido no PR 4.6.1** (dense-rank entre largadores reais; (0,1) garantido por construção).
- Cosmético: o report imprime média dos ajustes −0.05 (base pré-clamp); medida sobre as notas finais inteiras é −0.038. Alinhar a base de medição no print numa próxima passada.
- **Fase 3 — Online (PartyKit)** — PENDENTE, começando pelo PR 3.1 (setup PartyKit, sala com código, entrar/sair, preencher com bots até 22). Exige plano do fable-architect + aprovação do dev antes de implementar (PLANO §5 Fase 3).
- **Fase 5 — Identidade visual e polimento (registrada em 2026-07-22).** ⚠️ **A DIREÇÃO DE ARTE CITADA NESTE PARÁGRAFO FOI REJEITADA PELO DEV NO PR 7.0 — não usar. A válida está no `PLANO_CLAUDE_CODE.md` §1.** Registro de como estava em 2026-07-22: direção ARCADE/LÚDICO: cores vibrantes, estilo chapado (flat), divertido — coerente com o espírito "7x1/38 a 0" e contorna a ausência de arte fotorrealista/mapas oficiais. Escopo em PRs (detalhado no PLANO §5 Fase 5): 5.1 design system (paleta, tipografia, tokens, componentes base flat — substitui o visual cru), 5.2 traçados arcade das 10 pistas (silhuetas PRÓPRIAS, nunca decalcar o mapa oficial F1/FIA — GDD §14.2), 5.3 editor de capacete (designs originais que evocam épocas, nunca cópia nomeada de pintura real), 5.4 animações/transições (draft, corrida, celebração), 5.5 tela de abertura + marca (nome/logo), 5.6 som (efeitos e talvez música; biblioteca leve, sem dependência pesada).
- **Ordem pós-dataset:** decidir entre Fase 3 (online) e Fase 5 (visual) — ambas grandes, escolha do dev.
- ~~Pendência do PR 2.6: status "parado no pit" exige engine expor a volta de cada parada~~ **Resolvido no PR 2.7** (autorizado pelo dev em 2026-07-21).

## Acompanhamentos registrados pela revisão do PR 1.7b (cosméticos, candidatos à Fase 4)

- `useCorrida`: o initializer do `useState` roda `prepararCorrida` 2× na montagem em dev (StrictMode) — determinístico e inofensivo, só CPU.
- Ticker de eventos da `TelaCorrida` usa a volta do líder como relógio comum — evento de retardatário pode aparecer "adiantado" em relação à posição dele no traçado.
- Replay com todos-DNF (improvável): o relógio do replay é o tempoTotal do 1º classificado, que num grid 100% DNF encurta o replay.
- ~~Pista da corrida é fixa (Monza); seletor de pista fica pra fase futura~~ **Resolvido nos PRs 2.5 (seletor) e 2.8 (traçado próprio por pista — item de Fase 4 antecipado a pedido do dev em 2026-07-21).**

## Convenções que os PRs seguem

- Branch `feat/pr-X.Y-nome` → commit `feat:` → `git merge --no-ff` na main com mensagem `merge: PR X.Y — ...`.
- TDD: teste vermelho antes da implementação; seed de ouro por módulo de simulação.
- RNG: sub-stream por jogador (`deriveSeed(seed, 'fase:${jogadorId}')`) pra independência de ordem.
- Fluxo: junior-dev implementa → testes/lint/tsc → senior-reviewer revisa → correções → commit local. **Push só com ok explícito do dev.**

---

## Arquivo do plano (movido do `PLANO_CLAUDE_CODE.md` no chore de 2026-07-28)

> O PLANO passou a conter **só norma ativa**: direção de arte (permanente) e fases não concluídas.
> O que estava obsoleto, duplicado ou já cumprido veio pra cá. **Nada aqui é norma** — é registro.

### Por que estas seções saíram (o critério foi "enganoso", não "grande")

O `PLANO §3` mandava rodar a sessão principal no **Fable 5** e citava **Opus 4.8** para o
`senior-reviewer`; o `§2` mandava `claude --model claude-fable-5`. O Fable não está mais disponível
e o `CLAUDE.md` já registrava isso — ou seja, o PLANO contradizia o `CLAUDE.md` em norma de processo.
É a mesma classe de armadilha que o **PR 7.0** corrigiu na direção de arte: enquanto a norma escrita
estiver errada, os agentes seguem o que está escrito, com razão. Roteamento de modelos e ciclo de PR
passam a viver **só no `CLAUDE.md`**, fonte única.

### §1 — O que vinha no pacote de setup

Estrutura original do pacote instalado na raiz do repositório em 2026-07: `CLAUDE.md`,
`PLANO_CLAUDE_CODE.md` e `.claude/` com `agents/` (`fable-architect.md`, `senior-reviewer.md`,
`junior-dev.md`, `scout.md`) e `skills/` (`sim-engine/`, `balance-harness/`, `pr-workflow/`).

### §2 — Como instalar (histórico)

Copiar `CLAUDE.md` e `.claude/` pra raiz; Claude Code v2.1.170+; reiniciar a sessão uma vez pra o
watcher pegar o diretório `.claude/agents/` recém-criado; rodar a sessão principal no Fable.
**Obsoleto:** o Fable não está mais disponível.

### §3 — Roteamento de modelos (histórico; a versão válida está no `CLAUDE.md`)

Sessão principal e `fable-architect` no Fable 5; `junior-dev` no Sonnet 5; `senior-reviewer` no
Opus 4.8; `scout` no Haiku 4.5. Havia ainda uma nota sobre classificadores de segurança do Fable
poderem cair pra um modelo de fallback em domínios sensíveis.

### §4 — Ciclo de trabalho por PR (histórico; a versão válida está no `CLAUDE.md`)

Planejar com o `fable-architect` → dev aprova → `junior-dev` implementa (teste vermelho primeiro se
tocar simulação/balanceamento) → `senior-reviewer` roda `git diff` → `balance-harness` se mexeu em
nota/fórmula → push só com "ok" explícito; tag só depois do merge.

### §6 — Ordem de ataque sugerida (cumprida)

"Comece pela Fase 0 e 1 inteiras antes de pensar em rede. O modo Single com o balance-harness é o que
prova que o jogo é divertido e justo — se o balanceamento não fechar aí, não adianta ter multiplayer.
Rede é a casca final." Atualização de 2026-07-22: Fases 0-2 concluídas, dataset em andamento, Fase 3
pendente, ordem pós-dataset a escolher entre Fase 3 e Fase 5. **Cumprida:** o dev escolheu o visual.

### Detalhe das fases concluídas (escopo original por PR)

- **Fase 0 — Scaffold.** PR 0.1 Vite+React+TS+Vitest e estrutura `engine/ ui/ data/ net/` + lint;
  PR 0.2 `engine/rng.ts` (mulberry32 semeado + testes de reprodutibilidade); PR 0.3 tipos base em
  `engine/types.ts`.
- **Fase 1 — Engine + modo Single.** PR 1.1 dataset semente; 1.2 draft (5 sorteios + rodada 6 de peça
  com 2 cópias, bots por seed); 1.3 classificação (volta única ⇒ grid, seed de ouro); 1.4 corrida
  (tempo por notas+pista+variância, pontuação FIA, volta mais rápida do grid inteiro); 1.5 incidentes
  (CONS, CONF, CONF_MOTOR, risco de peça, clima); 1.6 `scripts/balance.ts`; 1.7 UI mínima do Single.
  **Marco atingido:** dá pra jogar sozinho contra bots e medir balanceamento.
- **Fase 2 — Modo Local (hotseat 2-4).** Reorganizada em 2026-07-19: o PR 2.2 original ("bots até 22
  + grid com todos") foi FUNDIDO no 2.1 — bots até 22 é `22 − nHumanos` na montagem e o grid com
  todos já existia desde os PRs 1.7a/1.7b; seria um PR sem conteúdo próprio. Em troca o 2.1 virou
  2.1a (generalização pra N humanos, Single intacto, com teste de equivalência) + 2.1b (turnos
  hotseat, `fluxo-local.ts` puro, `TelaHandoff` neutra anti-vazamento). Numeração original do 2.3
  (Modo Craque/Cego) mantida. **Marco atingido:** jogável presencialmente com amigos.
- **Fase 4 — Polimento.** Previa capacetes estilizados (migrou pro PR 5.3), card de resultado
  compartilhável (ainda pendente), dataset completo 1950-2025 (**cumprido na trilha 4.x, com fatos da
  Jolpica em vez de geração por IA**) e "Desafio do Dia" (ainda pendente).
- **Fase 5 — PR 5.1 (design system).** Paleta, tipografia, tokens de cor/espaçamento/raio e
  componentes base flat. **Concluído** em 5.1a/5.1b/5.1c — é a fonte da paleta citada na direção de
  arte.
- **Fase 5 — PR 5.2 (traçados de pista).** **SUBSTITUÍDO E AMPLIADO pela rodada 7.x**: o 5.2 previa
  "linhas grossas e cores vibrantes", que é justamente a direção rejeitada no PR 7.0. A rodada 7.x
  entrega pista com largura em camadas, pit lane visual, ambiente tonal e marcador de carro. A nota
  jurídica do GDD §14.2 seguiu valendo e virou seção permanente do PLANO.

## CORRIDA ONLINE — PR 1/4 (seed e pista) — 2026-08-12

**Commit:** `b67ec2b`. **Mudanças:** `src/engine/pista-sorteada.ts` + `.test.ts` (58 linhas), `src/net/sala.ts` + `tipos.ts` + `.test.ts` (148 linhas novas), `src/engine/versao.ts` bump. **56 testes, 1 arquivo; +14 linhas** (teste novo dirige draft real até `concluidaEm`).

### Objetivo e design

**Registrar a seed de corrida online (`seedCorrida`) em `EstadoSalaPublico` e derivar a pista dela.**

**VEREDITO DO DEV — publicar seed DEPOIS do draft (decisão contra recomendação do arquiteto):**
- Publicar durante o draft permitiria simular loadouts candidatos e escolher com vantagem — buraco idêntico à decisão (b) da fase (b: "seed base completa permite enumerar corridas futuras no console; não é hack, é chamar uma função").
- **Contra-argumento da paridade offline recusado explicitamente:** lá pista antes é inofensivo porque não há adversário humano. Online tem 22 humanos.
- **Preço aceito:** `seedCorrida: number | null` em vez de `number`, ramo no cliente pra lidar com `null`.

**`pistaSorteada` (função pura, `src/engine/pista-sorteada.ts`):**
- Rótulo **`'online:pista'`** em vez de reusar `'calendario'`.
- Motivo: reusar faria a pista da corrida avulsa online ser **sempre** etapa 1 do futuro campeonato (porque a seed avulsa pré-existe e `deriveSeed(seed, 'calendario')` sairia sempre igual). Há teste discriminante.
- Teste novo: dois `pistaSorteada` com seeds diferentes retornam pistas diferentes.

**Publicação (`src/net/sala.ts`):**
- `estadoPara` publica `seedCorrida` quando `estado.draft.fase === 'concluido'` — mesmo predicado que `marcarConclusao` já usava.
- Campo omitido de `EstadoSala` (interno) para `EstadoSalaPublico` até esse ponto.

### Achados da revisão (não eram bugs, eram afirmações falsas)

**Docblock pré-existente (desde PR 3.1a, `tipos.ts`) afirmava:** "da `seedDraft` não se recompõe a `seedMestre`".

**Por que é falso:**
- `xmur3` é hash de 32 bits, **não função unidirecional**.
- `seedMestre` é um `Uint32`.
- Quem enumerar as **2³² sementes** contra `seedDraft` (publicada desde lobby, visível a todos) consegue recompor a `seedMestre` e portanto a `seedCorrida` — **sem depender deste portão**.
- **O portão fecha o caminho trivial** (regra do dev: "não é hack, é chamar uma função") — **não fecha o caminho com script.**

**Correção:** docblocks agora dizem que o portão é defesa contra decisão impulsiva do cliente, não contra análise séria. **Alargar a entropia da `seedMestre`** resolveria de fato (aumentar de 32 bits), fica como pendência: **mexe na semeadura do online inteiro e no estado persistido do Durable Object** — decisão do dev, registrada em `ESTADO.md` 0(i).

### Lição de teste — a sexta instância da classe "afirmado ≠ conferido"

Nove testes novos na `sala.test.ts` (rodada de publicação da seed). **Nenhum via o portão disparar por caminho REAL:**
- Todos chamavam `publicarSala(estado)` direto.
- Forjavam a fase com `marcarConclusao` ou mock.

**Por que importa:** reescrever `estadoPara` para montar o payload à mão (em vez de chamar as funções internas) **vazaria a `seedMestre` no fio** com todos os nove testes verdes — mesma classe de defeito que a Fase 3 já achou 5× (comentário falso de proxy, regex furada, "sala vazia encerra", lag com estados idênticos, digest sem `src/net/`).

**Solução:** teste novo em `servidor-sala.test.ts` — **dirige um draft REAL até `concluidaEm`**, atravessando o funil de broadcast de verdade. Aplicadas **duas mutações**:
1. Remover a guarda `draft.fase === 'concluido'` — tenta publicar antes.
2. Reescrever `estadoPara` pra montar o payload manualmente.

**Resultado:** teste fica vermelho em AMBAS. Agora está verde. Guarda de anti-vacuidade presente.

### Medições

- `npm test` **1412/56** (era 1398/55) — +14 testes, +1 arquivo.
- `npm run typecheck` **0**, `eslint src scripts party vite.config.ts` **0**, `npm run build` **0**.
- `npm run balance` **inalterado** — detecta o tripwire de `versao.test.ts` e reprova. Bump automático `VERSAO_APP` 3.4.0 → 3.4.2 (protocolo do teste).

### Status

- ✅ **Alto risco (netcode)** — o portão visual é PR 4/4. Até lá, estrutura e defesas travadas.
- ✅ **Revisão:** sem bloqueante. Achado de segurança falsa é pré-existente, não bug deste PR.
- ✅ **Próximo:** PR 2/4 (coração — corrida no DO). PR 3/4 é **CORTE Nº 1 se a fase inflar** (derruba e mantém `concluidaEm`).

### Pendências e notas

- **Novo (0(i)):** `seedMestre` com 32 bits é enumerável. Defesa por portão fecha trivial, não script. Alargar entropia pendente — mexe em online inteiro. Decisão do dev.
- **Pré-existente mas corrigido (docs):** afirmação de segurança só entra medida. Docblocks atualizados.
- **Processo:** lição 6ª "teste real vs. forjado" agora registrada em `CLAUDE.md` §"Regra de mudança de lógica".

## CORRIDA ONLINE — PR 2/4 (fonte única + hash da corrida) — 2026-08-16

**Commit:** `8a8088a`. **Mudanças:** 6 arquivos novos (`corrida-online.ts` + `.test.ts`, `hash-corrida.ts` + `.test.ts`, `contrato-corrida-online.test.ts`, `useCorrida.test.ts`), 8 modificados. **Testes:** +8 (1454/60, era 1446/60).

### Objetivo e design — defesa contra a classe de bug do PR 8.4

**A tese:** UMA FUNÇÃO SÓ computa a corrida online (`corridaDaSala`), e a MESMA referência alimenta tanto o hash de divergência (`hashDaCorrida`) quanto a tela (`FluxoCorrida`). É a defesa contra o bug do **PR 8.4**: duas trilhas de corrida, cada lado correto isoladamente, composição errada, `npm test` não pega porque hoje (determinístico) as duas trilhas dão o mesmo resultado — o jogador assistiria uma corrida e veria outra na tabela.

**`corridaDaSala` (novo arquivo `src/ui/corrida-online.ts`):**
- Assinatura: `(dataset, draft, seedCorrida) → {pistaId, pista, grid, resultado}` (pura, determinística).
- Rótulo `'online:pista'` já existe (PR 1/4) e não muda.
- Mora em `src/ui/`, não em `src/net/`, por força da cerca do ESLint: `prepararCorrida` vive em `src/ui/fluxo-corrida.ts` e `src/net/**` não pode importar `src/ui/**`. O ponto onde pista sorteada (engine pura) encontra preparação da corrida (UI) vive do lado que pode importar os dois.

**`FonteDaCorrida` em `useCorrida.ts`:**
- Novo tipo: `{modo:'preparar'} | {modo:'pronta', corrida: CorridaPreparada}`.
- Offline (avulsa e campeonato): `{modo:'preparar'}` → `FluxoCorrida` chama `prepararCorrida` internamente.
- Online (sala): `{modo:'pronta', corrida}` → `FluxoCorrida` recebe a corrida já computada, pula preparação.
- `corridaInicial` (nova função pura) gera o estado inicial do replay — **testável sem jsdom**, porque é função pura (o projeto não tem ambiente de renderização de hook).
- Responsabilidade: `useSalaOnline` chama `corridaDaSala` **UMA VEZ** (em `useMemo`) e passa a referência pra `FonteDaCorrida`, que a tela consome. Ninguém mais computa a corrida na trilha online — é o que `contrato-corrida-online.test.ts` varre.

**`hashDaCorrida` (novo arquivo `src/net/hash-corrida.ts`):**
- Cumpre a promessa que `EscopoHash` já fazia no protocolo desde PR 3.4 — novo escopo `'corrida'` entra sem mexer no protocolo.
- Tipo local `CorridaParaHash` (não importa de `src/ui/`) declara forma mínima de `CorridaPreparada.resultado` que precisa ler — evita puxar `src/ui/**` (proibido em `src/net/**` por lint).
- **`ESCOPOS_VALIDOS ... satisfies Record<EscopoHash,true>` em `protocolo.ts`:** escopo novo sem validação no servidor não compila — travado por typecheck.

### O furo que a revisão achou (confirmado pelo dev)

**Versão original do hash deixava `voltaMaisRapida` DE FORA** afirmando que `pontos` "deriva de `posicao`/`status`".

**Não deriva:** `corrida.ts:468` soma `pontoVoltaMaisRapida` **ao AUTOR**, escolhido por `melhorVolta` (o MENOR tempo do histórico, `corrida.ts:455-464`), não a soma. Dois clientes podiam mostrar **25 vs. 26 pontos** pra o mesmo jogador com hash **IDÊNTICO** — furo na própria tese do detector.

**Solução:** entraram dois campos:
1. **`voltaMaisRapida.jogadorId`** (o autor, não o tempo) — pega divergência de lógica de seleção (se `melhorVolta` ou desempate). Tempo fica de fora porque é função pura de (histórico + status).
2. **`historicoVoltas` COM CHAVES ORDENADAS** — `Record` preserva ordem de inserção; sem canonizar, dois clientes corretos que montaram em ordens diferentes alarmariam um ao outro (**falso alarme é pior que o furo que fecha**). Mesmo cuidado que `hash-draft.ts` já tomava.

**Separador `~` em vez de `.`:** tempos de volta são float nunca arredondados; `.` seria separador E ponto decimal ao mesmo tempo — `[1.2, 3]` e `[1, 2.3]` colidiriam. Custa um caractere, falha sem ruído se errado.

**Por que OS DOIS e não só histórico:** histórico sozinho fecha 25 vs. 26 (ambos deriváveis do insumo). O que `voltaMaisRapida.jogadorId` acrescenta é quando a **lógica de seleção em si** divergiu de verdade — ramo diferente de `melhorVolta` pra mesmo histórico.

### Lição de teste — sétima instância de "afirmado ≠ conferido"

Baseline vermelho visto **nas duas primeiras rodadas: 2 falharam / 8 passaram**. Parecia atribuidor até a revisão medir com mutação.

**O problema:** fixture variava `historicoVoltas` E o autor ao mesmo tempo — remover só `voltaMaisRapida=` da carga canônica deixava a **suíte INTEIRA verde (1453 passando)**. Teste real mas não-atribuidor.

**Solução:** teste novo que isola o campo — **medido vermelho sob a mutação, e SÓ ele** (não dispara falso positivo nos outros 1453). Essa é a rigor que evita chamar "baseline vermelho" de "pronto pra implementar" sem contar se o vermelho é do campo esperado ou da fixture que muda duas coisas juntas.

### Guarda estrutural — `contrato-corrida-online.test.ts`

**Primeira versão bloqueou duas vezes, achados 4 de revisão aplicados:**

1. **Lista negra → allowlist:** versão original só checava `modo:'preparar'` em dois arquivos. Um terceiro arquivo (`CorridaOnline.tsx` do PR 4) escapava. Agora varre TODO `src/ui/**` e exige conjunto **exatamente** `{App.tsx, FluxoCampeonato.tsx}` — os únicos caladores offline legítimos.

2. **Allowlist de QUEM, não de QUANTIDADE:** `useSalaOnline.ts` podia chamar `corridaDaSala` duas vezes (uma pro useMemo da tela, outra dentro de efeito pro hash), mesma função duas referências, telas recebiam de uma, hash de outra. Agora há **contagem EXATA: `corridaDaSala` uma vez em `useSalaOnline.ts`, `prepararCorrida` uma vez em `corrida-online.ts`**.

3. **Pega alias e indireção:** `chamadasDe` exige `nomeFn(` — não pega `const prep = prepararCorrida; prep()`, `import {x as prep}`, `obj['prepararCorrida']()`. Novo helper `referenciaDe` não exige parêntese — pega o **identificador em QUALQUER posição** (import, alias, valor de objeto, string de acesso computado), porque todas as formas preservam o TOKEN original.

4. **Comentários engolindo código real:** `/\*` num literal pode engolir trecho real se a strip de comentários falhar. Contagens exatas usam **máximo entre fonte crua e sem-comentários** — se uma engolir, a outra ainda enxerga a chamada verdadeira.

5. **Achado colateral:** `npm run typecheck` **vermelho pré-existente** — `sep` importado de `node:path` num projeto sem `@types/node`; vitest não typecheca, suite passava. Corrigido: `sep` é só um caractere e não precisa de import. (Não são dados da revisão, é medição que o PR descobriu.)

**Terceiro furo fechado:** `useCorrida.ts` estava na allowlist sem teto de contagem — bloqueante achado da revisão.

**Sabotagem de contagem:** roda em MEMÓRIA, nunca grava em arquivo de produção (vitest paralelo, outro teste varre a árvore, processo morto deixa arquivo sabotado).

### Medições

- `npm test` **1454/60** (era 1446/60) — +8 testes, mesmo número de arquivos.
- `npm run typecheck` **0**, `eslint` **0**, `npm run build` **0**.
- `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/`, `scripts/alavancas` foi tocado.
- **Sem bump de `VERSAO_APP`:** digest do `versao.test.ts` cobre `src/engine/`, `src/data/`, `cliente.ts` e `hash-draft.ts`, nenhum foi tocado — continue em 3.4.2.

### Status

- ✅ **Alto risco (netcode)** — revisão com dois bloqueantes e quatro achados, todos aplicados.
- ✅ **A defesa estrutural está travada:** uma função só computa, dois testes verificam (ator real, isolamento de campo), allowlist de referência (sem alias/indireção passa batido), contagem exata por arquivo.
- ✅ **Próximo:** PR 3/4 (barreira — adiar `concluidaEm` pra fim da corrida, **CORTE Nº 1 se a fase inflar**). PR 4/4 é UI com **portão visual obrigatório**.

### Pendências e notas

- **Novo (limitação conhecida sem guarda de teste):** o atestado de hash da corrida sai UMA VEZ se `cliente.draft` tiver REFERÊNCIA estável entre re-sincronizações sem evento novo — rastreada manualmente em `sincronizarDraft`, sem asserção própria porque o projeto não tem jsdom/@testing-library pra renderizar o hook. Se `sincronizarDraft` mudar, o efeito volta a reatestar cada snapshot, silenciosamente. Registrado em `ESTADO.md` pendências 0(j).
- **Padrão do projeto:** 7ª lição de "teste afirmava ≠ conferiu" (5 na Fase 3 código, 6ª no PR 1/4, agora 7ª). Baseline vermelho não basta — tem que ser atribuidor a UM campo, medido por mutação.
- **Padrão:** guarda estrutural com allowlist de QUEM (não QUANTIDADE), varredura recursiva, pega alias/indireção via token (não só chamada direta).

## CORRIDA ONLINE — PR 3/4 (barreira no fim + `concluidaEm` marca a corrida) — 2026-08-16

**Commit:** `50906af`. **Mudanças:** 9 arquivos (7 existentes, 2 novos: `barreira-corrida.test.ts`, `useCorrida.test.ts`). **Testes:** +18 (1472/61, era 1454/60).

**Veredito do dev:** "os dois, mas o (A) na versão FRACA" — adiar `concluidaEm` para o fim da corrida com a barreira que não bloqueia ninguém, não é barreira de largada.

### Objetivo — duas coisas, uma só PR

**(A) BARREIRA NO FIM DA CORRIDA (versão FRACA):**

A `seedCorrida` já vai no snapshot quando o draft conclui (PR 1/4), então cada cliente roda a corrida localmente — quem chegou, corre sozinho. A sala **só decide QUANDO encerrar a partida**: por atestado (todos os elegíveis confirmaram `concluidaEm`) ou por timeout (`TIMEOUT_FIM_DE_CORRIDA_MS = 5 min`).

**Por que fraca:** a barreira não bloqueia entrada de corredores novos — é porta de saída, não de entrada. Um jogador parado no resumo não prende os outros pelo timeout inteiro. **Se bloqueasse:** entrada futura seria impossível (todos tiveram que terminar antes de começar), riqueza do online perdida.

**Timeout dimensionado medido:** 15 voltas × 9 s (velocidade lenta) ≈ 2 min 15 s no pior caso, com folga 2× = 5 min — bem abaixo de `JANELA_DE_GRACA_MS` (10 min).

**(B) `concluidaEm` MARCA O FIM DA CORRIDA, NÃO DO DRAFT:**

O defeito: `difundir` chamava `marcarConclusao` a cada broadcast (e há vários no replay — cada frame envia estado), então a **janela de graça de 10 min corria DURANTE o replay**. A sala podia fechar com gente ainda assistindo.

**Solução:** 
- `difundir` só marca `corridaAbertaEm` (âncora do timeout).
- `avaliarBarreiraDaCorrida` marca `concluidaEm` quando alguém atesta ou o timeout vira.
- A barreira é **condição de término**, não de início — avaliada a cada `aoPassarOTempo` (tique de 5 s).

**Ausentes não contam como elegíveis:** se contassem, toda sala com abandono cairia no timeout e a barreira seria só decoração. Limite conhecido: o conjunto **congela quando o draft conclui**, então dropout DURANTE o replay ainda custa timeout cheio — não há reconexão da corrida.

### O defeito que bloqueou a revisão — reidratação de storage

**Ocorrência:** 1 de 4 sítios defendia contra sala gravada PRÉ-PR (sem `concluidaEm` / `atestados`). Comentário afirmava ser completa — era falsa.

**Consequências:**
1. **`marcarCorridaAberta`** retornava cedo PARA SEMPRE (undefined ≠ null → `concluidaEm` null eterno, log append-only sem ponto de descarte — desfazendo a proteção C2 do PR 3.2).
2. **`undefined.includes`** lançava `TypeError` dentro do `onMessage`, quebrando a promessa de `aoReceber` de **nunca lançar**.

**Solução:** leitura centralizada em **`abertaEmDe`** / **`atestadosDe`** — mesmo precedente do `tokens ?? {}` do PR 3.2.1. Teste reproduce o `TypeError` exato sob mutação.

### Teste vacuoso — oitava ocorrência de "afirmado ≠ conferiu"

Um teste usava `{tipo: 'sincronizar'}`, que é o **ÚNICO comando que NÃO difunde** (cai em `soPara`, devolve a mesma ref). Comparava um campo consigo mesmo e passava mesmo com a guarda de idempotência removida.

Trocado por comando que realmente difunde. O guarda `elegiveis.length > 0` também não tinha cobertura — mutação sobrevivia intacta.

**Colateral:** `party/sala.ts` comentário errado que estimava "~120 escritas em storage e 120 broadcasts" foi **corrigido**, porque a medição do custo real é zero (ver seção abaixo).

### 🔑 O CORTE Nº 1 DA CORRIDA ONLINE PERDEU A RAZÃO DE SER — MEDIDO

**Situação anterior:** `ESTADO.md` dizia que adiar `concluidaEm` para o fim da corrida faria o tique de 5 s voltar a rodar durante o replay. Estimativa: ~120 escritas de storage e 120 broadcasts (comentário em `party/sala.ts`).

**Medição real:** com o draft concluído:
- `deQuemEhAVez()` devolve `[]` (ninguém aguardando).
- `aoPassarOTempo()` devolve a **MESMA referência** sem envios (`Array.is` interno conserva identidade).
- `aplicar()` só grava quando **a identidade muda** — nenhuma mudança, zero gravações.

**Resultado: custo = zero.** Travado por teste com par anti-vacuidade (baseline vermelho confirmado).

**Consequência:** o corte "**derruba este PR se a fase inflar, mantendo `concluidaEm` no fim do draft**" perdia a justificativa. **Portanto: PR 3/4 entra sem ser corte.**

### Mudanças estruturais no `party/sala.ts`

- Removido: `if (concluidaEm === null)` do `alarm(): decidir` — o tique **sempre roda** agora (para quem o encerra quando sobra algo a fazer).
- Adicionado: guarda de barreira em `aoPassarOTempo` — é ali que se valida a condição de término.

### Exposição de API no `useSalaOnline`

Novo export: `atestarFimDaCorrida` — **ninguém chama ainda**. O wiring é do PR 4/4 (UI), porque o momento certo é ao fim do **replay** (não do draft, não ao entrar na corrida, após os frames rodarem).

Até lá, a barreira resolve por timeout: **degradação segura, não caminho quebrado** — a corrida fecha de qualquer forma, só demora mais.

### Medições

- `npm test` **1472/61** (era 1454/60) — +18 testes, +1 arquivo.
- `npm run typecheck` **0**, `eslint src scripts party vite.config.ts` **0**, `npm run build` **0**.
- `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/`, `scripts/alavancas` foi tocado.
- **Sem bump de `VERSAO_APP`:** digest do `versao.test.ts` cobre os três, nenhum foi tocado — continue em 3.4.2.

### Mutações rodadas (quatro, cada uma pega por teste distinto)

1. **Repor `concluidaEm` no `difundir`** — 7 testes.
2. **Ausentes voltarem a contar como elegíveis** — 1 teste.
3. **Tique deixar de avaliar a barreira** — 1 teste.
4. **Reidratação (dois sítios crus)** — 2 testes (`TypeError` direto, e a marcação eterna null).

### Status

- ✅ **Alto risco (netcode)** — bloqueante da revisão foi reidratação, corrigido com leitura centralizada.
- ✅ **A razão do corte foi medida e desapareceu** — registrado com evidência.
- ✅ **Próximo:** PR 4/4 (UI + wiring de `atestarFimDaCorrida` no fim do replay, com **portão visual obrigatório**). Depois, **3.5 campeonato online** fecha a Fase 3.
- ⚠️ **PARADA SOLICITADA PELO DEV:** após este PR.

### Pendências e notas

- **Novo (0(e) — corrigir medição):** adiar `concluidaEm` faz custo zero (medido: identidade preservada ⇒ `aplicar` não grava; envios vazios ⇒ nenhum broadcast). Atualizar `ESTADO.md` pendências 0(e).
- **Novo limite conhecido (0 item novo):** o conjunto de elegíveis **congela quando o draft conclui** — ninguém vira ausente depois, então dropout durante replay ainda custa o timeout cheio. Sem reconexão de corrida.
- **Oitava ocorrência:** teste vacuoso (`sincronizar` é o único que não difunde), registrado em série com as anteriores (5 código/net, 6 PR 1/4, 7 PR 2/4, 8 PR 3/4).
- **Colateral:** comentário errado de estimativa em `party/sala.ts` foi corrigido no código.

## CORRIDA ONLINE — PR 4/4 (a corrida chega na tela) — 2026-08-17

**Commits:** `44d0dc8` (feature) + `8489b6f` (correções da revisão). **Mudanças:** 4 arquivos de produção, 2 novos (`corrida-online-render.test.ts`, `scripts/preview-corrida-online.preview.test.ts`). **Testes:** +8 (1480/62, era 1472/61). **⬅️ AGUARDANDO VEREDITO DO DEV no portão visual.**

### Objetivo — ligar o último metro

Os PRs 1 a 3 construíram a corrida online inteira e o jogador seguia parado no `TelaResumo`, com o botão "Ir pra corrida" escondido de propósito (não havia destino). Este PR liga o caminho: botão → `FluxoCorrida` no modo `'pronta'` → replay → resultado com pontuação FIA → atestado da barreira.

**O que NÃO precisou ser feito, e é o mérito dos PRs anteriores:** a pontuação FIA já renderizava (`TelaResultadoCorrida` tinha coluna "Pontos" desde o 1.7b), `FonteDaCorrida` já tinha o modo `'pronta'` (PR 2/4), `useSalaOnline` já expunha `corrida` e `atestarFimDaCorrida`, e o `escopo: 'corrida'` já chegava ao cliente. O PR é pequeno porque o terreno estava preparado.

### As decisões do dev, tomadas ANTES do código

**1. A barreira NÃO ganha status na tela.** O pedido original sugeria "Aguardando jogadores terminarem…". **Recusado por contradizer decisão travada:** a barreira do 3/4 é a versão FRACA e não segura ninguém (`useSalaOnline.ts:78`: "chamar isto NÃO segura ninguém, e não chamar não segura ninguém tampouco"). A string afirmaria um bloqueio inexistente — a instância visual da família "o artefato afirma o que não confere". O dev escolheu **nada na tela**: o `AvisoDeFechamento` do último minuto já cobre o único prazo real, e a tela de resultado fica limpa nos 9 primeiros minutos, como ele decidiu no 3.3.2. O limite (k) fica só documentado.

**2. `senior-reviewer` autorizado explicitamente** — o harness da sessão proíbe abrir subagente sem pedido do dev, e o `CLAUDE.md` o exige para alto risco. Lacuna fechada perguntando antes, não depois.

### O que entrou

- **`FluxoOnline.tsx`** — `naCorrida` (estado local, levantado ao componente de topo porque `ConteudoOnline` tem retornos antecipados antes de qualquer hook). Ramo novo renderiza `FluxoCorrida` com `{ modo: 'pronta', corrida }`, onde `corrida` é `online.corrida` — a **mesma referência** do `useMemo` que alimenta o hash. Nenhuma computação nova: a tese do 2/4 intacta.
- **Guarda `corrida !== null`** — o botão só aparece com corrida disponível. A revisão mediu que a janela (draft concluído, `seedCorrida` ausente) é **inalcançável na prática** (`marcarCorridaAberta` roda no mesmo broadcast que conclui o draft), mas a guarda é correta e barata; mantida.
- **`FluxoCorrida.tsx`** — prop `onChegouAoResultado`, disparada de efeito na transição para `'resultado'`. É por ela que o cliente atesta o fim para a barreira do 3/4.
- **Banner de divergência RAMIFICA por escopo** — dizia "o draft" mesmo quando o que divergiu foi a corrida, mandando o jogador conferir a coisa errada.

### 🔴 NONA OCORRÊNCIA de "o teste afirmava o que não conferia" — e desta vez no MEU teste

`expect(html).toContain('a corrida')` era **vacuamente verdadeira**: a mesma tela renderiza o botão "Ir pra corrida →", que contém `"a corrida"` como substring. A asserção passava com o banner dizendo "o draft". Achado pela revisão, não por mim. Corrigido para assertar a **frase inteira do ramo**, simétrica ao `not.toContain`.

**Confirmado por MUTAÇÃO, não por leitura:** inverter o ramo do banner mata os dois testes; `mostrarIrParaCorrida={true}` mata a guarda.

**Segunda armadilha, ainda não disparada, desarmada junto:** o helper `retornoFalso` fazia `{...base, ...extras}` com `cliente` dentro de `extras` — o próximo teste que passasse um cliente parcial cairia no early return `draft === null` e **todos** os `not.toContain` do arquivo passariam por vacuidade. Série: 5 código/net · 6 PR 1/4 · 7 PR 2/4 · 8 PR 3/4 · **9 PR 4/4 (no teste, achado pela revisão)**.

### O rótulo que MENTIA

`TelaResultadoCorrida` dizia "Novo draft" no botão do rodapé, mas no online `onReiniciar` é `sairDaSala` — prometia draft novo e entregava saída da sala. Ganhou `rotuloReiniciar` opcional (default `'Novo draft'`, offline bit a bit intacto), repassado por `FluxoCorrida`. Mesmo conserto que `TelaResumo` já tinha recebido; o PR 4 só alcançou a segunda tela.

### Dois comentários que creditavam o mecanismo errado

- **`FluxoCorrida.tsx`** dizia que o efeito protege do envio duplo "pelo StrictMode". **Falso:** o StrictMode duplica o efeito na montagem também. Quem segura é a montagem sempre acontecer em `fase === 'grid'` + a guarda. Creditar o mecanismo errado convida a "simplificar" a guarda fora.
- **`useSalaOnline.ts`** prometia re-atestado "inclusive depois de um F5 na tela de resultado" — **não existe**: `naCorrida` é estado local e o F5 devolve ao resumo. As duas metades estavam documentadas em arquivos diferentes e ninguém tinha ligado uma na outra. Quem não reatesta cai no timeout, que é o fallback projetado.

### O portão visual — o preview escondia o que veio mostrar

`preview/corrida-online.html`, 5 seções × 2 temas, componentes reais com CSS real. **A conferência (obrigação de quem apresenta, `CLAUDE.md` §"Definição de pronto" item 5) pegou um defeito:** a primeira versão usava frames de 620px e o botão "Ir pra corrida" — a mudança central do PR — ficava **atrás do scroll interno do iframe**. Alturas refeitas a partir de `body.scrollHeight` **medido no navegador**, não estimado.

Mesma família do defeito do 3.4.1 (`data-tema` numa `<div>` em vez do `:root`), e igualmente **só pegável abrindo**. A lição do 3.4.1 em si foi respeitada: `data-tema` vai no `<html>` dentro do `srcdoc`, com asserção na forma escapada.

**Verificado com os olhos, não só por asserção:** tema claro renderiza claro (`rgb(245,240,235)`) e escuro escuro (`rgb(26,26,26)`); botão presente na seção 1 e ausente na 2, nos dois temas; grid de largada de Imola (sorteada por `pistaSorteada(4242)`); pontuação FIA correta (vencedor com **26** = 25 + 1 da volta mais rápida); banner dizendo "a corrida".

### Revisão (Opus) — aprovada sem bloqueante

O que ela atacou e passou: a tese do 2/4 (uma trilha só, `contrato-corrida-online.test.ts` 22/22, allowlist intacta); o efeito dispara uma vez (`useCallback` estável, `fase` não volta a `'resultado'`, sem amplificação de escrita no DO); ordem de hooks correta; determinismo (nenhum `Math.random`/`Date.now` novo).

**Aberto, por decisão de arte do dev:** no `TelaResumo`, "Ir pra corrida →" e "← Voltar ao início" usam **ambos** `botao-primario` — a ação principal não se distingue da secundária. **Pré-existente do fluxo offline**; o PR 4 só torna o par visível no online pela primeira vez.

**Sem cobertura automática (declarado, não fingido):** `FluxoOnline.tsx:218-230` — o clique em "Ir pra corrida" e o replay avançando até `'resultado'`. Sem jsdom não há clique, e `useCorrida` nasce em `'grid'`. O teste monta `FluxoCorrida` direto, que é outro sítio de chamada. Fechar barato exigiria extrair o ramo `concluido` para um componente exportado — registrado, não feito.

**Medido:** `npm test` **1480/62** (era 1472/61), `npm run typecheck` **0**, `eslint` **0**, `npm run build` **0**. `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/` ou `scripts/alavancas`. `VERSAO_APP` **não bumpado**: o tripwire hasheia `src/engine/`, `src/data/`, `cliente.ts` e `hash-draft.ts`, nenhum tocado.

### Colateral — a terceira cópia da instrução que esvaziou o `ESTADO.md`

O cabeçalho **deste arquivo** ainda dizia "o `ESTADO.md` reescrito (substitui, não acumula)". O `CLAUDE.md` registra a correção em dois lugares (nele e no `ESTADO.md` §Convenções) — esta passou despercebida. É o cenário que a própria regra descreve: regra nova ao lado da antiga contraditória devolve o mesmo esvaziamento, dependendo de qual o `doc-writer` ler primeiro. Corrigida.

## CORRIDA ONLINE — o plano aprovado (movido do `ESTADO.md` em 2026-08-18)

> 📦 **Movido, não resumido.** Este texto vivia na §"🏁 CORRIDA ONLINE — o plano aprovado" do
> `ESTADO.md` e descreve trabalho **encerrado**: os quatro PRs feitos e o portão visual do 4/4
> aprovado pelo dev em 2026-08-18. Saiu de lá porque o `ESTADO.md` é lido por inteiro na abertura de
> toda sessão e havia quatro PRs de netcode (o 3.5) pela frente pagando esse custo fixo.
>
> 🔒 **O que NÃO saiu do `ESTADO.md`:** o **VEREDITO DA SEED** (com a consequência aceita), a regra
> **"uma função só, não se abre exceção"** e a decisão **"a barreira não ganhou status na tela"**.
> São decisão travada e regra inviolável — a regra do projeto proíbe que saiam do `ESTADO.md`, então
> elas estão **nos dois arquivos**: íntegras aqui pelo registro, e retidas lá porque continuam
> valendo. Os portões obrigatórios do 3.0/3.1b, a herança de config do spike, os riscos aprovados da
> fase e o "harness headless não é opcional" **também ficaram no `ESTADO.md`** — estavam aninhados
> sob esta seção por acidente de formatação, mas são da **Fase 3 inteira**, não da corrida online.
>
> Detalhe PR a PR nas quatro entradas próprias acima: "CORRIDA ONLINE — PR 1/4", "PR 2/4", "PR 3/4"
> e "PR 4/4".

Texto íntegro, como estava no `ESTADO.md`:

---

> ⚠️ **Este plano foi aprovado numa sessão anterior e NÃO estava em lugar nenhum do repositório** —
> nem aqui, nem no `HISTORICO.md`. Segunda vez que isso acontece nesta fase (ver o aviso idêntico
> no topo da §FASE 3). Fica registrado para não custar uma terceira.

**🔑 VEREDITO DA SEED — a decisão que estava em aberto, resolvida pelo dev CONTRA a recomendação do
arquiteto:** publicar `seedCorrida` **só quando o draft concluir**, nunca desde a criação da sala.

Razão, nas palavras do dev: é o mesmo precedente da **decisão (b)** desta fase. A seed base completa
foi rejeitada porque *"qualquer jogador computa as corridas futuras no console — não é hack, é chamar
uma função"*. Publicar durante o draft **é o mesmo buraco com outro nome**: dá pra simular loadouts
candidatos e escolher com vantagem. **O contra-argumento da paridade com o offline foi recusado
explicitamente** — lá a pista aparecer antes do draft é inofensivo porque não há adversário humano.
Preço aceito: `| null` no tipo e um ramo no cliente.

**Consequência aceita:** a **pista também só aparece no fim do draft**, porque deriva da mesma seed.
Isso não é descuido nem regressão de UX — é a decisão.

**Fatiamento aprovado:**

- ✅ **PR 1/4 — seed e pista** — FEITO (`b67ec2b`).
- ✅ **PR 2/4 — o coração.** FEITO (`8a8088a`). 🔒 **A defesa estrutural é UMA FUNÇÃO SÓ alimentando o hash e o
  `FluxoCorrida`, e não se abre exceção nisso** (palavras do dev). É a classe de bug do **8.4**: duas
  trilhas, cada lado certo isoladamente, composição errada, **`npm test` não pega**. Determinado: uma
  função só (`corridaDaSala`, `src/ui/corrida-online.ts`), mesma referência pro hash e pro replay.
  Guarda estrutural travada em `contrato-corrida-online.test.ts` (allowlist de QUEM chama, contagem exata por arquivo).
- ✅ **PR 3/4 — barreira no fim + `concluidaEm` marca a corrida** — FEITO (`50906af`). 🔒 **O CORTE Nº 1 PERDEU A RAZÃO DE SER — MEDIDO.** O custo do tique durante o replay é **zero** (com o draft concluído, `deQuemEhAVez()` devolve `[]`, `aoPassarOTempo()` devolve a **mesma referência** sem envios, `aplicar()` só grava quando muda). Ver item 0(e) de "Pendências ATIVAS" — medição registrada, comentário errado em `party/sala.ts` corrigido. **Bloqueante da revisão (reidratação de storage) foi corrigido.**
- ✅ **PR 4/4 — UI, com PORTÃO VISUAL** — FEITO (`44d0dc8` + `8489b6f`), **✅ PORTÃO VISUAL APROVADO
  PELO DEV em 2026-08-18.** O botão "Ir pra corrida" aparece (com guarda `corrida !== null`), `FluxoCorrida` roda no
  modo `'pronta'` com a MESMA referência do hash, o resultado mostra pontuação FIA e o fim do replay
  atesta a barreira do 3/4. Banner de divergência passou a **ramificar por escopo**.
  🔒 **A barreira NÃO ganhou status na tela — decisão do dev.** "Aguardando jogadores terminarem…"
  foi RECUSADO por afirmar um bloqueio que não existe (a barreira do 3/4 é a versão fraca e não
  segura ninguém). O `AvisoDeFechamento` cobre o único prazo real.
  🔴 **Nona ocorrência de "o teste afirmava o que não conferia", desta vez NO TESTE DESTE PR:**
  `toContain('a corrida')` era vacuamente verdadeira — o botão "Ir pra corrida →" contém a
  substring. Achado pela revisão; corrigido para a frase inteira e **confirmado por mutação**.
  Preview conferido: `E:\projetos\F1 fantasy\preview\corrida-online.html`.

---

### PR 3.5.1 — seed por etapa e cursor no servidor (2026-08-18, `83a6fde` + `ffdabc1` + `4a4b801`) — ALTO RISCO

Primeiro dos quatro PRs do **3.5 campeonato online**, que fecha a Fase 3. Escopo como registrado no
plano aprovado: `src/net/` + `party/`, **sem UI**. Implementa o mecanismo **`B-indep`** (decisão D1
do dev, 2026-08-18): **11 seeds INDEPENDENTES sorteadas no Durable Object** — 10 etapas
(`MAX_ETAPAS`) + o calendário —, publicadas uma por etapa quando aquela etapa abre. **O cursor
ainda NÃO avança**: este PR publica só a etapa 0.

**Medido:** `npm test` **1516/63** (era 1480/62), `tsc --noEmit` app **0** e `party/` **0**,
`eslint src scripts party vite.config.ts` **0**, `npm run build` **0**. `npm run balance` **não se
aplica** — nada em `src/engine/`, `src/data/` ou `scripts/alavancas` foi tocado.

#### 🔑 `VERSAO_APP` NÃO precisou de bump — e isso foi MEDIDO, não herdado

O plano do arquiteto dava o bump como certo, e o `ESTADO.md` já registrava a dúvida ("**MEDIR, não
herdar desta linha**"). As duas pernas:

1. **O digest** do `versao.test.ts` cobre `src/engine/**` (menos `.test.ts` e `versao.ts`) +
   `src/data/**.json` + exatamente `cliente.ts` e `hash-draft.ts`. O PR toca `tipos.ts`, `sala.ts`,
   `servidor-sala.ts`, `harness.ts` e `party/sala.ts` — **nenhum dos quatro conjuntos**.
2. **Nenhum rótulo `deriveSeed` novo nasceu.** O `online:calendario` que o plano previa **não
   existe**: `calendarioSorteado` deriva internamente com `'calendario'` (já registrado) e
   `seedDaEtapa` com `camp:` (já registrado). Os únicos rótulos novos são `online:harness:etapa:<k>`
   e `online:harness:calendario`, no harness, sob o prefixo `online` já registrado.

Digest segue `9dccd150`; `versao.test.ts` e `namespaces-seed.test.ts` verdes.

#### 🔒 `N_ETAPAS_CURTA` é duplicado DE PROPÓSITO — e o motivo não é o que parece

O plano dizia "`N_ETAPAS.curta` fixo no servidor". Importar a constante de `src/engine/campeonato.ts`
**arrastaria `simularQuali`, `simularCorrida` e `resolverCarro` para o grafo do Durable Object** —
`campeonato.ts` importa `./quali` e `./corrida` **em runtime** (só `Dataset` é `import type`, que é
erasado). **A cerca de lint NÃO pegaria: ela casa especificador de import, não grafo transitivo.**

Verificado e vale registrar: `dataset.ts` importa só `./types`, então o JSON de 1 MB **não** entraria
por essa porta — o inviolável "o servidor nunca carrega o dataset" continua de pé pelos dois
caminhos. O que se evita é arrastar a simulação inteira.

A constante vive em `src/net/tipos.ts` com **teste de conformidade** (`N_ETAPAS_CURTA === N_ETAPAS.curta`),
mesmo padrão do `QTD_JOGADORES` da pendência 0(a).

#### 🔒 O DISCRIMINANTE — exigência do dev, e o achado que mudou o desenho

A primeira proposta lia as seeds com `?? []` (precedente do `atestadosDe`). **O dev derrubou**: o `??`
está certo para sala criada antes deste PR, mas **colapsa duas situações que precisam ser
distinguidas** — sala que nunca teve seeds, e sala que TINHA seeds e as perdeu na reidratação. A
segunda, tratada como a primeira, **re-sortearia as etapas em silêncio** e o jogador correria uma
corrida diferente da que atestou. É o requisito (a) do baseline entrando pela porta do conserto.

Conserto: **`VERSAO_ESTADO_SALA` gravado explicitamente** (mesmo padrão e mesmo motivo do
`VERSAO_ESTADO_DRAFT`) e `estadoDasSeeds` de **três saídas** — `legado` | `ok` | `corrompida` —
substituindo qualquer `??` espalhado. `corrompida` **não tem caminho de cura**: `criar()` segue sendo
o único sítio que sorteia e só roda com o storage vazio. A casca recusa a sala corrompida.

#### 🔴 O BLOQUEANTE DA REVISÃO — décima ocorrência de "o teste afirmava o que não conferia"

**`party/` tem cobertura automatizada ZERO.** Nada o importa, `cerca-lint.test.ts` roda o ESLint
sobre arquivos sintéticos e `contrato-corrida-online.test.ts` exclui `party/` de propósito. Todo o
bloco `B-indep` do baseline exercitava `criarSala(..., SEEDS)` com **fixture literal** — provar que
`811_000_001 !== deriveSeed(123_456_789, …)` é aritmética sobre constantes do próprio teste.

**Medido, não deduzido:** M5 (derivar por índice) e M6 (recoplar o 11º slot) aplicadas **dentro de
`party/sala.ts`, o sítio real**, deixavam a suíte inteira **VERDE — 1509/63**. E um comentário em
`harness.ts` afirmava que `campeonato-online.test.ts` provava que a produção sorteia. Não provava.

Conserto: **cerca TEXTUAL sobre `party/sala.ts`** (idioma de `namespaces-seed.test.ts` /
`contrato-ausente.test.ts`) exigindo sorteio por `crypto.getRandomValues(new Uint32Array(SLOTS_SEEDS))`,
ausência de `deriveSeed(` em código, calendário vindo de `todas[MAX_ETAPAS]` e `Array.from` na
fronteira — com anti-vacuidade que aplica cada mutação ao texto.

🔴 **A cerca nasceu com DOIS defeitos, os dois pegos rodando — e ambos são reincidência conhecida:**

1. **Regex de negação falso-negativo.** Um lookahead negativo para dizer "não contém `deriveSeed`":
   **sem a flag `m`, o `.*` do lookahead cobre só a PRIMEIRA linha**, então a cerca passava com
   `deriveSeed` na linha 2. É a repetição literal do "regex furado na cerca" do 3.2.
   **Negação se escreve com `includes`, não com lookahead.**
2. **Cheque cego reprovava a casca CORRETA** — `party/sala.ts:232` explica num comentário por que o
   token *não* usa `deriveSeed(seedMestre, …)`. Quem pegou foi **a asserção anti-vacuidade que exige
   que a casca real passe**. Comentários são removidos antes do cheque, com teste dos dois lados.

#### As mutações — sete no plano, e uma que precisou ser refeita

Todas aplicadas sobre o código de produção **pronto** e vistas vermelhas (regra travada:
**vermelho de compilação não conta**). Baseline de partida: 76 testes, 0 falhas.

| # | Mutação | Resultado |
|---|---|---|
| M1 | `seedsEtapas` como `Uint32Array` no estado | 11 failed / 65 passed |
| M2 | reordenar `seedsEtapas` na forma persistida | 10 / 66 |
| M3 | `publicarSala` com spread menos os segredos **conhecidos** | 5 / 71 |
| M4 | `slice(0, cursor + 2)` | 5 / 71 |
| M5 | derivar as etapas da `seedMestre` por índice | 9 / 67 |
| M6 | `seedCalendario = seedsEtapas[0]` | 6 / 70 |
| M7 | `estadoDasSeeds` reduzido à leitura ingênua com `??` | 6 / 70 |

🔴 **M5 saiu ERRADA na primeira tentativa e foi refeita.** A interpolação do índice foi comida pelo
shell e o rótulo virou constante para todos os índices: o resultado era vermelho, **mas pela razão
errada** — caiu "as 11 seeds são mutuamente distintas" e **não** caiu a asserção de derivação, que é
a que carrega o `B-indep`. **Vermelho pela razão errada é a mesma família do teste que afirma o que
não confere, do lado da mutação.**

**M3 é a mais informativa:** a mutação exclui `seedMestre` e `tokens` de propósito — todos os
segredos que existiam ANTES do PR. Ficou vermelha mesmo assim, porque quem vazou foi `seedsEtapas`,
o segredo NOVO. É exatamente o que aconteceu com `tokens` no 3.2.1, e é o argumento de que a
varredura tem de ser por `JSON.stringify`, nunca campo a campo.

#### Os seis avisos da revisão, todos aplicados

- **A1 — `etapaAtual` ia cru no fio** enquanto `seedsAbertas` saturava: o snapshot podia dizer
  `etapaAtual: 15` com `nEtapas: 5`, e o cliente do 3.5.2 indexaria a etapa 15 do calendário →
  `undefined`. Pior: o teste existente **abençoava** a inconsistência (olhava as seeds, não o
  cursor). Clampado por `cursorPublicavel`, **fonte única do recorte**, + teste da invariante que
  liga os três campos publicados.
- **A2 — o `alarm()` não passava pelo `jogavel`**, e `aoPassarOTempo` **expira turno**: numa sala
  corrompida ninguém conseguia conectar nem mandar comando, mas o tique de 5 s ia expirando turno
  atrás de turno e **o draft se jogava inteiro sozinho**. Gate só no `aoPassarOTempo` —
  `decidirVida`/`encerrar` ficam fora, para a sala corrompida ainda poder morrer pela carência.
- **A3** — anti-vacuidade da varredura passava só pelo `seedMestre`; agora exige que uma **seed de
  etapa** tenha sido pega.
- **A4 — rótulo que mentia.** "a extração do operador NÃO aparece no fio" era falso: `seedCalendario`
  e a etapa 0 saem no fio de propósito depois do draft. Mesmo defeito de rótulo que o PR 4/4
  corrigiu na tela. Renomeado para o que confere, e o corpo passou a partir do relatório de verdade.
- **A5** — `criarSala` valida a cardinalidade e **estoura**: sem isso, cardinalidade errada pariria
  sala natimorta com **HTTP 200 e código entregue ao jogador**.
- **A6** — `jogavel` loga o motivo. Recusa silenciosa não deixava o operador descobrir a corrupção.

#### O que fica registrado para os próximos PRs do 3.5

- 🔒 **`seedsAbertas` tem o MESMO portão da `seedCorrida`** (draft concluído). O plano só o dava
  explícito para `seedCalendario`; a leitura aplicada é que **seed sem calendário não protege nada**
  — são 10 pistas no dataset, o jogador computa as 10 e escolhe.
- **Requisito (b) entregue pela metade, e é honesto dizer:** `relatorioDeSeeds` existe e é testado a
  partir do blob persistido (não-circular), mas **o comando de despejo do storage do Durable Object
  nunca foi rodado**. Fechar (b) de fato exige rodar o despejo real numa sala local.
- **Ordem de deploy do 3.5.2 em diante: `wrangler` ANTES do `vite`.** `cliente.ts` não valida forma
  de snapshot; num deploy escalonado o cliente novo contra worker antigo receberia
  `seedsAbertas: undefined` — inócuo no 3.5.1 (ninguém lê), letal quando o cliente passar a ler.
- **`etapaAtual` está fora do discriminante** (três leituras defensivas com `?? 0`). Inconsistência
  de tese, não vazamento — o clamp coage e o servidor nunca grava outro tipo. Mas o cursor é o campo
  que governa quantos segredos saem no fio: **quando o 3.5.2 o fizer se mover, trazê-lo para dentro
  do discriminante.**

---

# ARQUIVADO DO `ESTADO.md` em 2026-08-19 (sessão de higiene — pendência 8)

> Tudo abaixo veio **íntegro, linha por linha**, do `ESTADO.md`, na sessão de higiene autorizada pelo
> dev. **Nada foi resumido e nada foi apagado.** O que era decisão travada, regra inviolável ou
> pendência aberta **ficou no `ESTADO.md`** em bloco de retenção (regra do aninhamento).
> Os **planos de fase** não vieram para cá — foram para o **`PLANOS_ATIVOS.md`**, porque seguem ativos.

## §FASE 8 — MODO CAMPEONATO (encerrada) — texto integral arquivado

**Por que saiu do `ESTADO.md`:** a Fase 8 está completa. **Ficaram lá**, em bloco de retenção: o BUG
QUE QUASE ENTROU do 8.4, as regras de honestidade da narração, o "pit não é ultrapassagem", o
`calendarioAnotado` que não vaza vencedor, a silhueta que reusa `pathDaVolta`, o "nenhuma alavanca" e
o **veredito do `campeonato.html`, que segue ABERTO**.

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

**O que NUNCA tinha sido feito é o antigo PR 6.6 — as TELAS.** Era daí que vinha o desalinhamento
inteiro: o modo existia, determinístico e testado, e era **inalcançável pelo jogador**.
✅ **Resolvido no 8.4-mínimo** (`4ba4f50`): o campeonato ganhou seletor, encadeia corridas, salva e
retoma. ✅ **E o 8.3** (`0da36fb`) substituiu as telas cruas pelas de verdade — calendário com
silhuetas, classificação com variação de posição e fim de campeonato com pódio.
**A Fase 8 está completa**; o que resta é o veredito do dev sobre o preview.

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

### ✅ PR 8.4-mínimo FEITO (commit `4ba4f50`) — o campeonato é JOGÁVEL

O dev pediu o seletor de "Formato" e classificou como **baixo risco (UI)** — a classificação vale,
porque **ele mesmo vai rodar o app**, o que é mais forte que preview. (A entrada anterior deste
arquivo dizia "alto risco, portão visual"; foi superada pela classificação do dev.)

**Entregue mais que o `<select>`, porque o `<select>` sozinho seria decorativo:** antes do commit
nada em `App.tsx` importava campeonato e nada chamava `salvarCampeonato`. Agora: seletor Formato
(única/curta/completa), Pista **e a linha de perfil** somem nos campeonatos, corridas encadeiam de
verdade, save a cada corrida, e "Continuar campeonato" no topo da `TelaInicio`.

🔑 **O BUG QUE QUASE ENTROU — a lição que sobrevive ao PR.** As duas trilhas de corrida usam seeds
**diferentes de propósito** (decisão D6): a avulsa usa a seed **crua** do draft, a etapa de
campeonato usa `seedDaEtapa(seed, pistaId)`. Como `iniciarCampeonato` **pré-simula** as etapas e a
pontuação sai dali, ligar o campeonato no `FluxoCorrida` existente faria o jogador **assistir a uma
corrida e ver OUTRA na tabela**. **`npm test` não pegaria** — cada lado, isolado, está certo; só a
composição estava errada. `prepararCorrida` ganhou `seed` (default preserva a avulsa bit a bit) e há
teste provando a reprodução bit a bit da etapa pré-simulada.

### ✅ RODADA DE NARRAÇÃO RICA + AUTO-AVANÇO (PRs A, B, C) — FEITA

Feedback de quem jogou, planejada pelo `fable-architect`, aprovada pelo dev com três correções ao
pedido original. **Nada tocou `src/engine/`** — nem aditivamente.

- **A (`1537ad6`)** — variedade de erro + vocabulário de chuva. `deriveSeed` usado como **HASH, nunca
  como stream**: nenhum tempo muda, nenhum RNG novo é consumido, seeds de ouro e `balance` intactos
  por construção. Pool de chuva **só pra `erro-piloto`**, porque `chuvaMultErro` só multiplica
  `chanceErro` — vocabulário molhado numa quebra de motor sugeriria causalidade inexistente.
- **B (`43fe420`)** — causalidade **contrafactual**: a linha causal só sai se, descontado o custo do
  erro, X continuaria à frente. Mais restritivo que o pedido original, e aprovado pelo dev
  exatamente por isso.
  📏 **MEDIDO em 200 corridas reais: 3,19 linhas causais/corrida, 93% das corridas com pelo menos
  uma, 42% de aproveitamento.** O dev cogitava cortar o PR se rendesse pouco — decidiu com o número.
- **C (`fc7f20d`)** — auto-avanço com auto-largada (sem ela, empacaria na tela de grid).

🔒 **Regras de honestidade da narração, travadas por TESTE, não por comentário:** nenhuma frase pode
afirmar manobra, local da pista, disputa ou clima evoluindo — um regex reprova
`ultrapass|disputa|começou a chover|pneu de chuva` em qualquer variante nova. **A engine simula cada
carro isoladamente e o clima é uma flag global**; qualquer frase fora disso é falsa por construção.

📌 **Regra registrada para código que ainda não existe (item d do dev):** quando houver narração de
troca de posição, **pit não é ultrapassagem** — pit de qualquer um dos dois desqualifica a palavra.
Hoje não existe narração de troca de posição (a única narração do jogo era `ROTULOS_EVENTO`), então
a regra fica aqui aguardando o código que a consumirá.

### ✅ PR 8.3 FEITO — as telas do campeonato (commits `0da36fb` + `499114c`)

⬅️ **AGUARDANDO VEREDITO DO DEV — o único item aberto do projeto agora:**

    start "" "E:\projetos\F1 fantasy\preview\campeonato.html"

As três telas numa página só, a partir de um campeonato real (seed 2026, curta, 8 jogadores):
**calendário** (silhuetas, vencedores, próxima destacada), **classificação com variação de posição**
(▲/▼) e **fim de campeonato** (pódio + tabela final + calendário completo).

⚠️ **Este preview NÃO é maquete** — diferente do `paleta.html`. Ele inlina `tokens.css` e
`estilos.css` REAIS e renderiza os COMPONENTES REAIS; o que se vê é o que o app desenha, com o mesmo
CSS. Falta só interação (nada clica, não há replay). Regerar:
`npx vitest run --config vitest.preview.config.ts scripts/preview-campeonato.preview.test.ts`
(ou `npm run preview`, que agora é seguro — os dois portões antigos estão fechados).

🔒 **A decisão que sustenta a tela de calendário:** `iniciarCampeonato` **pré-simula todas as
etapas**, então o resultado das próximas está em memória o tempo todo. `calendarioAnotado` só revela
vencedor de etapa com `indice < etapaAtual` — vazar o vencedor de uma corrida que o jogador ainda
vai assistir estragaria a corrida. **Tem teste dedicado, e é o mais importante do PR.**

🔒 **A silhueta da miniatura reusa `pathDaVolta`**, a mesma geometria da tela de corrida. Foi ela que
tirou 10/10 no teste cego; redesenhar à mão na miniatura jogaria isso fora.

### ✅ PR 8.2.1 FEITO — calendário mora na engine (fecha a pendência 0)

`FormatoTemporada`, `FORMATO_PADRAO`, `N_ETAPAS`, `calendarioPadrao`, `calendarioSorteado` e o
helper `etapasDoFormato` foram pra `src/engine/campeonato.ts`. **`fluxo-campeonato.ts` re-exporta os
cinco públicos, então NENHUM chamador mudou** — nem as ~90 referências de teste, nem a UI.

**O que FICOU na UI, de propósito:** `FormatoPartida`, `ehCampeonato`, `mostraSeletorDePista`,
`ROTULO_FORMATO`, `formatoDoCalendario`, `resumoCampeonatoSalvo`. Nenhum é regra de jogo — são
decisões de TELA (qual seletor aparece, que texto o botão mostra). Movê-los levaria UI pra dentro da
engine, que é a violação inversa.

**Refactor sem mudança de comportamento: 1078 testes seguem passando, os mesmos, sem teste novo — e
o ponto é esse.** `npm run balance` rodado (mexeu em `src/engine/`): **tabela idêntica**,
`seedDaEtapa` e `simularCampeonato` só mudaram de vizinhança.


## §Estado atual — o changelog histórico, arquivado

**Por que saiu:** era registro em ordem inversa que este arquivo já cobre por PR. **Ficaram no
`ESTADO.md`:** os dois blocos "COMO TESTAR" (online e campeonato), os quatro casos de propósito, o
bloco de celular/rede, o repositório-privado, a regra de `docs/img/` versionada e o aviso do badge.

### Bloco 1 — narrativas de PR (corrida online 1/4, 3.3.4, 3.4.1, 3.3.2, 3.3.3)

- 🏁 **CORRIDA ONLINE COMEÇOU — PR 1/4 FEITO em 2026-08-12** (`b67ec2b`). `seedCorrida: number | null`
  em `EstadoSalaPublico`, publicada **só quando o draft conclui**; `pistaSorteada` nova em
  `src/engine/pista-sorteada.ts`, pura, rótulo próprio `'online:pista'`. **O plano dos 4 PRs está
  registrado na §FASE 3 abaixo** — ele não estava em lugar nenhum do repositório até agora.
  - **Medido (PR 1/4):** `npm test` **1412/56** (era 1398/55), `npm run typecheck` **0**, `eslint` **0**,
    `npm run build` **0**, `npm run balance` **inalterado** (tocou `src/engine/`).
    `VERSAO_APP` **3.4.0 → 3.4.2** (tripwire do `versao.test.ts`).
  - 🔴 **A revisão derrubou uma afirmação de SEGURANÇA, não um bug** — ver pendência 0(i).
  - 🟡 **Sexta ocorrência de "o teste afirmava o que não conferia"**: os nove testes do portão
    chamavam `publicarSala` direto e **forjavam** a fase; reescrever `estadoPara` à mão vazaria a
    `seedMestre` no fio com todos verdes. Entrou teste que dirige um draft de verdade até concluir,
    pelo funil de broadcast — **visto vermelho nas duas mutações** antes de ficar verde.
- ✅ **TESTE DO ONLINE FECHADO — PR 3.3.4 em 2026-08-11** (F5 perdia sala; porta 8787 ocupada falha
  silencioso). **Os quatro casos de propósito rodados e validados pelo dev.**
- ✅ **SURFACING DO ALARME CONCLUÍDO — PR 3.4.1 em 2026-08-11** (BannerDivergencia em FluxoOnline). **Detector (3.4) agora visível ao jogador — alarme aparece em todas as telas do online.** Veredito do dev: "legível, destacado sem ser gritante, texto correto". **Próximo PR: corrida online (autorizada pelo dev; 3.5 de campeonato online fecha a Fase 3).**
- ✅ **CÓDIGO DE SALA E CICLO DE VIDA FEITOS — PR 3.3.2 em 2026-08-10** (`02ff6ee` + `b882d9b`).
  **O modo online agora tem sala privada por padrão** (código hexadecimal de 6 dígitos, não 4, sorteado
  pelo servidor; enumeração impossível em tempo casual).
- ✅ **ROTA `/CRIAR-SALA` FUNCIONANDO — PR 3.3.3 em 2026-08-11** (`a6010ef`). O 3.3.2 trocou a criação para
  `POST /criar-sala` no worker, mas o proxy do Vite repassava só `/parties/*`. Corrigido centralizando rotas
  em `src/net/rotas.ts` — fonte única que o `vite.config.ts` consome. Tela órfã do modo Online removida
  (campo "Nome da sala" e estado morto). **Caminho principal testado e funcionando** (criar sala → link em segunda aba →
  nomes → prontos → "Começar o draft" → rodada 1 de 5 nas duas).

### Bloco 2 — medições por PR, 3.3.1, portão nº 2, SPIKE 3.0 e o inventário da `main`

  - **Medido (3.3.3):** `npm test` **1362/50** (era 1355/49), `npm run typecheck` **0** (app + `party/`),
    `eslint src scripts party vite.config.ts` **0**, `npm run build` **0**. `npm run balance` **não rodado**
    — nada em `src/engine/`, `src/data/` ou `scripts/alavancas` foi tocado.
  - **Medido (3.3.4):** `npm test` **1368/51** (era 1362/50), `npm run typecheck` **0**, `eslint` **0**,
    `npm run build` **0**. `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/` ou
    `scripts/alavancas` foi tocado.
  - **Medido (3.4):** `npm test` **1394/54** (era 1368/51), `npm run typecheck` **0**, `eslint` **0**,
    `npm run build` **0**. `npm run balance` **rodado** (tocou `src/engine/versao.ts`): **inalterado**.
  - **Medido (3.4.1):** `npm test` **1398/55** (era 1394/54), `npm run typecheck` **0**, `eslint` **0**,
    `npm run build` **0**. `npm run balance` **não se aplica** — nada em `src/engine/`, `src/data/` ou
    `scripts/alavancas` foi tocado.
  - 🔌 **PR 3.3.1 (`23d1cce`) — o worker passa pela PORTA DO VITE.** `wrangler dev` sobe em
    `127.0.0.1` (só localhost), então de fora o app carregava e o WebSocket morria; e abrir o worker
    na rede **não bastaria**, porque a URL do WS era fixa (`:8787`) e **cada visitante chega por um
    IP diferente**. Agora o Vite repassa `/parties/*` (proxy com `ws: true`) e a URL do socket vem
    do **host da página**. Uma porta só (5173), qualquer interface.
    **Medido:** o smoke de 17 cheques passou pelas **quatro** rotas — `localhost`, `192.168.0.13`
    (LAN), `10.241.222.232` (ZeroTier) e `26.156.17.128` (Radmin) — todas na 5173, com o worker
    ainda fechado em `127.0.0.1`.
  - 🔴 **O CONTRATO DO AUSENTE tem teste explícito agora** (`src/ui/contrato-ausente.test.ts`) —
    pedido do dev. Ver o RISCO ATIVO abaixo.
- ✅ **PORTÃO Nº 2 APROVADO PELO DEV em 2026-08-09.** O 3.1b (`2efb145`) fechou com os dois testes
  verdes (conformidade e commutatividade, 20 seeds cada) e o dev **chancelou as duas coisas que
  precisavam de decisão**: (a) `deQuemEhAVez` devolver um **CONJUNTO** e não um id — a fase sorteios
  é concorrente no online, e espelhar `alvoHumano` serializaria 22 jogadores; (b) o **contrato do
  ausente** como obrigação herdada, registrado como **RISCO ATIVO** (seção própria abaixo).
  Detalhe completo no `HISTORICO.md` (entradas "PR 3.1a", "PR 3.1b" e "PR 3.2").
- 🟢 **SPIKE 3.0 RODADO em 2026-08-09 — veredito: GO** — e o **portão do dev foi CONFIRMADO na
  bancada dele: as duas abas funcionaram, digitou numa e apareceu na outra.** A paridade bit a bit
  do RNG entre workerd e Node, que era a premissa da fase inteira, passou. Detalhe
  completo no `HISTORICO.md` (entrada "SPIKE 3.0"); o resumo operacional está na seção **FASE 3**
  logo abaixo. **O spike vive FORA do repositório** (`E:\projetos\spike-partyserver\`) e a `main`
  ficou intocada — medido, não assumido: `git status` limpo e nenhum pacote de rede no
  `node_modules/` do projeto.
- **Estamos na `main`** (a branch `pr-8.1-calendario-sorteado` foi mergeada nela em 2026-08-08 e
  está encerrada) · últimos PRs **8.1** (calendário sorteado, `63e3e82`),
  **8.2** (round-trip do save, `6cb02cc`), **8.4-mínimo** (seletor de Formato + campeonato jogável,
  `4ba4f50`) e a rodada de **narração rica + auto-avanço**: **A** (variedade/chuva, `1537ad6`),
  **B** (causalidade contrafactual, `43fe420`), **C** (avanço automático, `fc7f20d`); e ainda
  **8.2.1** (calendário na engine, `cfe1c47`) e **8.3** (telas do campeonato, `0da36fb`) ·
  **1412 testes** (56 arquivos) verdes — medido em 2026-08-12 (PR 1/4 da corrida online); eram
  1398/55 no 3.4.1 e 1094/36 antes da Fase 3.
  ⚠️ O badge do README ainda diz **1094** e é estático — está desatualizado (deveria ser 1398).
- **Medido em 2026-08-07, não herdado:** `npm test` **1094/36**, `tsc --noEmit` **exit 0**,
  `eslint src scripts` **exit 0**, `npm run build` **exit 0**. **`npm run balance` inalterado por
  construção** — o harness importa só `src/engine/dataset`, `src/data/*.json` e `scripts/alavancas`,
  e nenhum dos três foi tocado. `prettier --check` reprova `fluxo-campeonato.ts`/`.test.ts`, mas
  **já reprovava no HEAD** (verificado com `git show HEAD:<arquivo>`) — pré-existente, não é gate.

### Bloco 3 — working tree, push de 2026-08-07, merge de 2026-08-08, README/LICENSE

- **Working tree limpa.** `tmp-medir-save.ts` continua no disco, mas agora é **ignorado** pelo
  `.gitignore` (regra `tmp-*`, adicionada em 2026-08-07) — é script descartável do dev e está
  **quebrado** (`criarDraft` exige 22 jogadores + `atribuirPerfis` antes; o arquivo passa 4). A
  medição que ele buscava já foi feita e está registrada abaixo.
- ✅ **A `main` FOI PUSHADA em 2026-08-07, com autorização explícita do dev** (`git push origin
  main:main --tags`, fast-forward `b39782d..49f3ca8`). **`main` local == `origin/main` == `49f3ca8`**
  (verificado: `git rev-list --left-right --count main...origin/main` = `0 0`). Não existem mais
  duas `main`s divergentes — `git checkout main` e o remoto apontam pro mesmo commit. A tag
  **`v0.1.0-fase0`** também subiu (era a única local; o remoto não tinha nenhuma).
- ✅ **MERGE NA `main` FEITO em 2026-08-08, com "ok" explícito do dev** (`git merge --no-ff`,
  commit `f1216d5`). A `main` agora **contém 7.7, 7.7.1, 7.8, 8.1, 8.2, 8.2.1, 8.3**, a rodada de
  narração + auto-avanço, e o **README/LICENSE/`docs/img/`**. Medido na `main` pós-merge:
  `npm test` **1094/36**, `tsc --noEmit` **exit 0**, `npm run build` **exit 0**.
  **`pr-8.1-calendario-sorteado` continua só local e sem uso** — todo o conteúdo dela está na `main`.
- 📄 **README, LICENSE e `docs/img/` existem desde 2026-08-08** (`10dd10a`). A licença é **MIT** —
  cobre o código escrito aqui e **não** reivindica nada sobre nomes de pilotos, equipes ou
  circuitos, o que preserva o aviso de projeto de fã não oficial. **`docs/img/` é VERSIONADA** (ao
  contrário de `preview/` e `referencias/`, gitignored): guarda os três prints do dev
  (`corrida.png`, `draft.png`, `campeonato.png`) e a grade `silhuetas.svg`, esta **gerada** por
  `scripts/gerar-silhuetas-readme.preview.test.ts` via `npm run preview`, a partir do `pathDaVolta`
  de produção. **Se um traçado mudar, regerar e commitar a grade.**
  ⚠️ O badge "testes 1094 passando" do README é **estático** — não há CI neste repo (`.github/`
  não existe). Ele não se atualiza sozinho e vai mentir se um teste quebrar.

## §RISCO ATIVO FECHADO — divergência do ausente: o corpo, arquivado

**Por que saiu:** o risco está fechado (detector no 3.4, surfacing no 3.4.1). 🔒 **As duas RESSALVAS
FICARAM no `ESTADO.md`** — são limitações que *permanecem* e precisam ser lidas toda sessão.

**Registrado como risco pelo dev em 2026-08-09, ao aprovar o portão do 3.1b.** Deixou de ser "diverge
em silêncio" (🔴) para "diverge com alarme que ninguém vê" (🟡) no **PR 3.4**, e foi CONCLUÍDO no **PR 3.4.1** quando o alarme subiu à tela. Ressalvas abaixo registram as limitações que permanecerão.

**O que é.** Quando um jogador abandona ou estoura o prazo, o redutor do servidor o marca ausente e
**pula a casa dele** — o servidor não pode escolher por ele, porque escolher é regra de jogo e regra
de jogo precisa do dataset. Quem escolhe pelo ausente é **cada cliente, localmente**. A rodada 6 tem
**pool compartilhado, 2 cópias por peça**. Se dois clientes escolherem peças **diferentes** pelo mesmo
ausente, cada um debita uma cópia diferente: os estados divergem, os loadouts divergem, corrida que
cada um assiste é outra. **Antes:** nada acusava. **Agora:** o detector compara hashes do draft entre
os 22 e acusa em `EstadoCliente.divergencia`.

**✅ DETECTOR FUNCIONA (PR 3.4):**
- `src/net/hash-draft.ts` (novo): hash determinístico do estado do draft, campos enumerados, chaves
  ordenadas.
- `src/engine/versao.ts` (novo): handshake de versão recusa entrada se build diferente.
- `registrarAtestado` em `src/net/servidor-sala.ts`: servidor compara strings opacas, sem dataset.
- Resultado: divergência do ausente → detectada · 20 seeds sem sabotagem → nenhum alarme falso · cliente
  atrasado com estado diferente → silencioso (regra de âncora) · atestado malformado → recusado.

**✅ TESTE EXPLÍCITO (pedido do dev no 3.3):**
`src/ui/contrato-ausente.test.ts` — **allowlist repo-wide** de quem pode tocar `escolherBot`
(asserir *ausência* num diretório era contornável por indireção), `escolhaPadrao` banida na UI,
proibição do 3º argumento de `sincronizarDraft` **por contagem de parênteses balanceados** (a versão
por regex era falso-negativo: com a sabotagem aplicada, continuava verde), varredura recursiva, e
testes de que a substituição é determinística entre execuções independentes.

**Já coberto:**
- o portão do 3.1b abandona jogadores nas duas fases em 10 seeds e assere a reconvergência passo a
  passo;
- o **harness do 3.2 mede isso empiricamente**: o CONTROLE NEGATIVO faz um cliente escolher
  diferente pelo ausente e **exige que a comparação FALHE**. Foi ali que se descobriu que sabotar a
  escolha *própria* não diverge nada (ela vai pro log, que é a verdade compartilhada) — **a
  substituição do ausente é literalmente a única decisão que cada cliente toma sozinho.**

## Pendências FECHADAS, arquivadas do `ESTADO.md`

**Por que saíram:** estavam marcadas ✅ e mantidas só como registro. As **abertas** e as que têm
resíduo vivo continuam todas no `ESTADO.md`.

### 0(b), 0(c), 0(d), 0(e), 0(f) — fechadas na Fase 3

   (b) ✅ **`src/engine/namespaces-seed.ts` FEITO no 3.1b** — registro + varredura do código-fonte
   que reprova rótulo não registrado, com guarda anti-vacuidade. Fecha o risco aprovado da fase.
   (c) ✅ **RECONEXÃO FEITA no 3.2.1.** O token nasce na casca (`crypto.randomUUID`), `reentrar` é o
   único comando de lobby que vale com a sala iniciada, e há evicção (uma conexão por jogador).
   **O que ficou de fora, de propósito:** quem volta DEPOIS de já ter expirado volta como
   espectador — desfazer a ausência exigiria reconstruir `rodada` a partir do log, porque
   `marcarAusente` a sobrescreve, e isso é complexidade que o jogo não precisa.
   (d) ✅ **`seq` resolvido no 3.2** — `reduzirDraftDaSala`/`expirarNaSala` incrementam o contador,
   então o `draft` não muda mais sob um `seq` congelado. **Falta ainda** correlacionar erro↔comando:
   com duplicação e reordenação, um `{tipo:'erro'}` continua inatribuível.
   (e) ✅ **Prazo do turno tem dono no 3.2**: o `alarm()` do Durable Object chama `aoPassarOTempo` a
   cada 5 s. ⚠️ **CORRIGIDO em 2026-08-11 — esta linha afirmava que ele "para de se reagendar com a
   sala concluída ou vazia", e o código não faz isso** (achado do `fable-architect` ao planejar a
   corrida online). `party/sala.ts:237` reagenda SEMPRE; quem para o tique é o `encerrar()`, que
   apaga o alarme. Com a sala concluída o que fica de fora é só a chamada a `aoPassarOTempo` — o
   tique continua. **✅ MEDIÇÃO DO PR 3/4 (2026-08-16):** adiar `concluidaEm` para o fim da corrida **faz custo ZERO** — com o draft concluído, `deQuemEhAVez()` devolve `[]`, `aoPassarOTempo()` devolve a **mesma referência** sem envios, `aplicar()` só grava quando a identidade muda. Medido com par anti-vacuidade (baseline vermelho confirmado). Isso **fecha a razão do "CORTE Nº 1"** que o ESTADO anterior registrava. **Falta a UI** mostrar o cronômetro ao jogador — isso é 3.3.
   (f) ✅ **O 3.4 foi FEITO (detector + handshake). O 3.4.1 foi FEITO (surfacing visual).**
   🏁 **A CORRIDA ONLINE COMEÇOU** — plano dos 4 PRs na §FASE 3, PR 1/4 feito em 2026-08-12
   (`b67ec2b`). **Até o PR 4/4 o draft online continua terminando no `TelaResumo`**, com o botão
   "Ir pra corrida" escondido de propósito — prometer a corrida e devolver à tela inicial é pior que
   botão nenhum.

### 0(p) — as seeds medidas em produção (fechada em 2026-08-19)

🔒 **A ressalva desta pendência FICOU no `ESTADO.md`**, resumida: a medição **refuta M6, não M5**.

   (p) ✅ **FECHADA em 2026-08-19 — MEDIDA PELO DEV, NÃO DEDUZIDA.** O requisito (b) foi confirmado
   em produção, e de quebra o (a) junto. **Método (é o que dá valor ao fechamento):** sala nova
   `420320` criada pós-3.5.1 (`versaoSala: 1`, `etapaAtual: 0`, 10 slots de etapa), os 11 números
   anotados; **derrubada real do worker** (Ctrl-C no `npm run sala`); worker subido de novo;
   **reconexão pela 420320 no navegador, forçando a reidratação**; segundo despejo. **Os 11 números
   vieram IDÊNTICOS.**
   - ✅ **Requisito (a) — SOBREVIVER À REIDRATAÇÃO DO DURABLE OBJECT — confirmado em produção.** Até
     aqui (a) estava sustentado só por teste unitário sobre o blob persistido; agora atravessou um
     restart de verdade do DO. Fecha a reincidência que já tinha sido bloqueante de revisão no PR 3/4.
   - ✅ **Requisito (b) — SER EXTRAÍVEL PARA RELATÓRIO DE BUG — deixou de ser projeto e virou fato
     medido.** `scripts/despejar-seeds.ts` roda e devolve as 11 seeds de uma sala real.
   - ✅ **O OUTRO RAMO DO DISCRIMINANTE confirmado em dados reais:** as cinco salas pré-3.5.1 foram
     classificadas como **`legado`**. ⚠️ **O ramo `corrompida` continua NÃO OBSERVADO em produção** —
     existe só em teste, e fechar (p) não fecha isso. (É um dos ganhos da pendência 9.)
   - 🔑 **O QUE A MEDIÇÃO REFUTA, COM PRECISÃO — ler antes de citá-la:** `seedCalendario 1903767602`
     ≠ primeira `seedsEtapas 3187109758` ⇒ **o 11º slot NÃO foi recoplado. Isso é a mutação M6
     refutada em dados de produção.** 🛑 **E não diz NADA sobre M5** (derivar por índice): seeds
     derivadas por índice **também** diferem entre si, então "os números são diferentes" não
     distingue sorteio de derivação. **NÃO ler esta medição como "independência das seeds confirmada
     em produção"** — é exatamente o exagero que a §"A CERCA DE M5/M6 É TEXTUAL" foi escrita para
     impedir daqui a três PRs. A cerca textual continua valendo, por causa de M5.
   - ℹ️ **"qtd de etapas: 10" no despejo são os 10 SLOTS sorteados** (`Uint32Array(11)` = 10 etapas +
     o 11º do calendário), **não** mudança de formato — o **CORTE 3.5-F** segue fixando curta = 5.
   🔴 **Achado técnico que fica valendo: NÃO dá pra olhar o SQLite direto.** O DO é
   `new_sqlite_classes`, e `ctx.storage.put` grava na tabela `_cf_KV` com o valor **V8-serializado,
   não JSON** — o blob começa em `ff 0f` e um número é a tag `N` + 8 bytes IEEE-754. `sqlite3`,
   `strings` ou qualquer dump de texto mostram os NOMES dos campos e **não os números**; por isso o
   script desserializa com `node:v8`. Texto original da pendência abaixo, preservado:
   **o requisito (b) do dev está entregue PELA METADE.** `relatorioDeSeeds`
   existe e é testado a partir do blob persistido (não-circular, não é código morto), mas **o comando
   de despejo do storage do Durable Object nunca foi rodado** — o docblock diz "a confirmar pelo dev
   na máquina dele". Fechar (b) de fato é rodar o despejo real numa sala local **uma vez** e registrar
   o comando. Enquanto isso não acontece, "as seeds são extraíveis" é projeto, não fato medido.

### Pendência 6 — dívida de processo do 7.4 (resolvida na prática em 2026-08-06)

6. **Dívida de processo do 7.4 — RESOLVIDA na prática em 2026-08-06.** A branch tinha sido
   renomeada por cima da `main` (`git branch -M`), sem merge commit, e a pendência era "decidir se
   vira branch antes de qualquer push". **Virou branch:** o push criou
   `origin/pr-7.7-dados-nurburgring` e deixou a `main` remota parada em `b39782d`. Em 2026-08-07 a
   `main` local foi pushada e o remoto subiu pra `49f3ca8` (até o 7.6.1). O que sobra é decisão do
   dev, não dívida: como a `main` recebe os commits de 7.7 em diante desta branch — PR no GitHub ou
   fast-forward direto, possível porque o histórico é linear
   (`git merge-base --is-ancestor origin/main HEAD` = 0).

### Pendência 8 — o texto ORIGINAL, antes de ser executada (aberta 2026-08-18, executada 2026-08-19)

Preservado porque registra o alvo e o diagnóstico de quem a abriu — inclusive o "SESSÃO PRÓPRIA",
que foi cumprido. O texto vivo, com o método efetivamente usado, está no `ESTADO.md`.

8. 📉 **ENCOLHER O `ESTADO.md` — aberta em 2026-08-18, adiada pelo dev.** O arquivo é lido por
   inteiro na abertura de toda sessão, então cada linha é custo fixo; hoje ele tem ~930 linhas.
   **Candidatos:** §FASE 8 encerrada (~128 linhas — único item vivo é o veredito do
   `campeonato.html`) e §RISCO ATIVO FECHADO (~46 linhas). **Alvo: ~750 linhas.**
   🔒 **REGRA APRENDIDA EM 2026-08-18, ao mover a §CORRIDA ONLINE — VERIFICAR ANINHAMENTO POR
   ACIDENTE DE FORMATAÇÃO ANTES DE MOVER.** A §CORRIDA ONLINE tinha **quatro portões ATIVOS da Fase
   3** aninhados sob o cabeçalho dela (portões obrigatórios do 3.0/3.1b, herança de config do spike,
   riscos aprovados da fase, "harness headless não é opcional"): eram da fase inteira, não do
   trabalho encerrado, e teriam saído junto. **Cabeçalho não prova pertencimento — ler o conteúdo.**
   🛑 **SESSÃO PRÓPRIA, NÃO NO FIM DE OUTRA** (decisão do dev): cada movimento desses tem risco real
   de levar coisa viva junto, e o fim de uma sessão longa é o pior momento para corrê-lo.
