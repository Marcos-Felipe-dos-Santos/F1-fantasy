/**
 * A versão do que PRODUZ resultado — engine + dataset (PR 3.4).
 *
 * 🔑 **Por que não serve o `VERSAO_PROTOCOLO`.** Aquele número descreve o
 * FORMATO das mensagens. Dois clientes podem falar o mesmo protocolo
 * perfeitamente e, ainda assim, computar loadouts diferentes a partir do mesmo
 * log — basta que um deles rode outra versão da engine ou outro `src/data/`.
 * É essa divergência que a Fase 3 chamou de risco de float/build, e a defesa
 * aprovada foi **handshake, não detector**: barato impedir a entrada, caro
 * descobrir depois que a partida inteira estava dividida.
 *
 * ⚠️ **ESTE VALOR É MANUAL, e um valor manual apodrece.** Foi exatamente assim
 * que a fase perdeu tempo antes: um comentário afirmava conferir o proxy e não
 * conferia. Por isso ele não anda sozinho — `versao.test.ts` recalcula uma
 * impressão digital do conteúdo de `src/engine/` e `src/data/` e reprova quando
 * ela muda sem que este valor mude junto. Se o teste te trouxe aqui: **bump o
 * valor abaixo e atualize o digest no teste**, nessa ordem.
 *
 * Formato: `<marco>.<n>`. O marco acompanha a fase; `n` sobe a cada mudança de
 * engine ou dataset que altere resultado.
 *
 * 🔴 **BUMP DO PR 3.5.4 (3.4.2 → 3.4.3) — E ELE CONTRARIA A REGRA DO DIGEST DE
 * PROPÓSITO. Leia antes de "corrigir" isto.**
 *
 * O digest de `versao.test.ts` cobre `src/engine/` + `src/data/` + `cliente.ts`
 * + `hash-draft.ts`, e o 3.5.4 **não tocou nenhum deles** — o PR inteiro vive
 * em `src/ui/`. Pelo teste, o valor podia ficar parado; foi **bloqueante C1 da
 * revisão**, medido, que obrigou a subir:
 *
 * 1. O cliente **3.5.3** atesta a corrida AVULSA **sem o campo `etapa`**
 *    (`useSalaOnline.ts` na `main`, efeito do hash da corrida).
 * 2. O servidor preenche o que falta com o cursor dele
 *    (`servidor-sala.ts`: `atestado.etapa ?? cursor`) ⇒ balde `corrida:0`.
 * 3. O cliente **3.5.4** atesta a ETAPA 0 com `etapa: 0` ⇒ **o mesmo balde**,
 *    com a **mesma âncora** (os dois aplicaram o log inteiro).
 * 4. Os dois hashes **diferem por construção** — decisão D6: a avulsa simula
 *    com a `seedCorrida` crua, a etapa com `seedDaEtapa(seed, pistaId)`.
 * 5. `alarmado` **não volta atrás** ⇒ banner de divergência permanentemente
 *    errado, no PR que liga o campeonato na tela.
 *
 * 🔑 **O handshake de `VERSAO_APP` é a ÚNICA coisa que impede os dois builds de
 * dividirem uma sala** (aba velha aberta, cache — a janela que a pendência 0(q)
 * descreve, aqui em vite × vite em vez de wrangler × vite). Sem o bump, o
 * portão existia e estava aberto.
 *
 * 🔒 **A lição, para a próxima vez:** o digest cobre quem **CALCULA** o
 * resultado, e o 3.5.4 mostrou que **mudar QUANDO/COMO se atesta divide uma
 * partida do mesmo jeito**, sem tocar em nada que o digest vigia. Um PR só de
 * `src/ui/` que mude a FORMA do atestado precisa deste bump, e o teste **não
 * vai lembrar por você**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 📈 **3.4.3 → 3.4.4 no PR 3 da trilha de nomes fictícios (2026-08-27).**
 *
 * O digest cobre todo `.json` de `src/data/` e o PR renomeia 10 peças **no id**,
 * não só no rótulo. **Bump OBRIGATÓRIO, e é o caso "Sim" descrito acima:**
 * `pecaId` entra na carga do `hashDoDraft` (`src/net/hash-draft.ts:64-66`),
 * então cliente velho e novo hasheariam loadouts equivalentes de formas
 * diferentes — alarme falso de divergência dentro da mesma sala. O handshake
 * separa os dois builds.
 *
 * ⚠️ **O `hashDoDraft` NÃO é o único consumidor do id de peça — ele também
 * DESEMPATA escolha de bot** (`src/engine/bots.ts:63`: `proximo.id < atual.id`,
 * sobre o valor `bonus - 0.5 * risco`, que empata muito). **Renomear id de peça
 * PODE, em geral, mudar o que um bot escolhe.**
 * ✅ **Neste PR não mudou, e por razão estrutural, não por sorte:** os 10
 * renames são TRUNCAMENTOS de sufixo e nenhum outro id do catálogo começa por
 * um dos 10 prefixos novos ⇒ a ordem lexicográfica de todo par é preservada; e
 * o array de `pecas.json` não foi reordenado (o `--stat` fecha em 40 linhas =
 * 10 peças × 2 campos × add/remove), então a entrada do `shuffle` de
 * `revelarPecasParaJogador` é posicionalmente idêntica.
 * 🔴 **O que NÃO existe é rede:** nenhum teste fixa escolha de peça de bot
 * contra o dataset real — `src/ui/fluxo-draft-golden.test.ts` pina `ordemPeca`,
 * perfis e sorteios, e não a peça. **Um rename futuro que criasse empate
 * passaria em silêncio.** Achado da revisão do PR 3; registrado, não consertado.
 *
 * 🔴 3.4.4 → 3.4.5 NO PR 6 (2026-08-28) — A TROCA DO DATASET.
 *
 * **Este bump NÃO é o caso "refactor sem efeito" do `versao.test.ts`** — é o
 * oposto dele. `src/data/equipe-anos.json` inteiro mudou (771 registros, 7710
 * linhas em cada direção): nomes exibidos e **ids** de piloto/chassi/motor/
 * estrategista/pit. **Dois builds com datasets diferentes não podem compartilhar
 * sala**, e o handshake de `VERSAO_APP` (`servidor-sala.ts:780`, recusa em `:789`
 * e `:891`) é a única coisa que impede isso.
 * 🔑 O `hashDoDraft` consome `${equipe}@${ano}` e os seis ids de loadout
 * (`hash-draft.ts:64-68`), então cliente velho e novo hasheariam o MESMO estado
 * de formas diferentes — **alarme falso imediato**, que é literalmente o modo de
 * falha que o docblock do digest descreve.
 */
// 3.4.6 → 3.4.7: restauração de nomes/ids originais e marcas das peças.
export const VERSAO_APP = '3.4.7';
