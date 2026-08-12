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
 */
export const VERSAO_APP = '3.4.2';
