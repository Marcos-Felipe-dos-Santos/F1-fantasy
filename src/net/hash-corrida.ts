/**
 * Impressão digital da CORRIDA (PR 2/4 de "corrida online") — o mesmo
 * detector de divergência do PR 3.4 (`hash-draft.ts`), agora sobre
 * `CorridaPreparada`. `escopo: 'corrida'` no comando `hash` já existia como
 * promessa no protocolo (ver `EscopoHash` em `protocolo.ts`); este arquivo é
 * quem cumpre a promessa, "sem mudar o protocolo".
 *
 * 🔒 **O servidor NÃO computa este hash e não pode**, pelo mesmo motivo do
 * draft: ele não tem o dataset (fronteira travada no 3.2). Compara strings
 * opacas. Todo o significado mora aqui, no cliente.
 *
 * Só pode importar `src/engine/` — nunca `src/ui/`: `CorridaPreparada` (tipo)
 * vem de `src/ui/corrida-online.ts`, mas este arquivo não importa aquele
 * módulo, só declara localmente a forma mínima que precisa ler. Isso evita
 * puxar `src/ui/**` (proibido em `src/net/**` pela cerca do ESLint) só para
 * um tipo.
 */

import { deriveSeed } from '../engine/rng';

/** A forma mínima de `CorridaPreparada` (`src/ui/corrida-online.ts`) que este hash precisa ler. */
interface CorridaParaHash {
  pistaId: string;
  resultado: {
    classificacao: {
      jogadorId: string;
      posicao: number;
      status: 'terminou' | 'dnf';
      tempoTotal: number;
    }[];
    voltaMaisRapida: { jogadorId: string };
    historicoVoltas: Record<string, number[]>;
  };
}

/**
 * O que ENTRA no hash, e por quê:
 *
 * - `pistaId` — dois clientes que derivem pistas diferentes (bug de seed, de
 *   dataset, ou de ordem de sorteio) não estão assistindo à mesma corrida.
 *   Pega a divergência mais barata de detectar, antes mesmo de olhar pra
 *   dentro da simulação.
 * - `classificacao`, campo a campo, **na ORDEM do array** — aqui a ordem É
 *   significado, é a ordem de chegada:
 *   - `jogadorId` — de quem é a posição.
 *   - `posicao` — o resultado que a pontuação e a tela usam.
 *   - `status` — 'terminou' vs. 'dnf'; dois clientes discordando disso já é
 *     jogo diferente, mesmo com o mesmo `tempoTotal` acumulado até aí.
 *   - `tempoTotal` — resume TODA a simulação por carro (offset de largada,
 *     erro de piloto, chuva, pit, investigação): se dois clientes divergirem
 *     em qualquer evento da corrida, `tempoTotal` diverge também, porque é a
 *     soma de tudo. É o campo mais barato que ainda pega o mais fundo.
 *
 * - 🔴 `voltaMaisRapida.jogadorId` — **o autor, não o tempo.** Entrou depois do
 *   achado da revisão (confirmado pelo dev) que derrubou a justificativa
 *   original deste arquivo. A versão anterior deixava `pontos` de fora
 *   afirmando que ele "deriva de `posicao`/`status`" — e **não deriva**:
 *   `corrida.ts:468` soma `pontoVoltaMaisRapida` ao autor da volta mais rápida,
 *   escolhido por `melhorVolta` (`corrida.ts:455-464`), que é o MENOR tempo do
 *   histórico e não a soma. Dois clientes podiam então mostrar **25 vs. 26
 *   pontos** para o mesmo jogador com hash IDÊNTICO — furo na própria tese do
 *   PR, num detector cujo trabalho é justamente não deixar divergência passar
 *   calada.
 *   **Por que os DOIS campos, e não só `historicoVoltas`:** hashear o histórico
 *   sozinho já fecharia o furo dos 25 vs. 26 pontos, porque o autor é derivável
 *   de (voltas + status + posição). O que `voltaMaisRapida.jogadorId` acrescenta
 *   é outra classe: o cliente cuja **lógica de seleção** divergiu — `melhorVolta`
 *   ou o desempate por posição (`corrida.ts:455-464`) — com a simulação idêntica.
 *   Histórico igual, autor diferente: só este campo pega.
 *   O `tempo` fica de fora por ser função pura de `historicoVoltas[autor]` +
 *   `status[autor]`, ambos hasheados. ⚠️ E é função dos dois, não só do
 *   histórico: `melhorVolta` só é atualizado no FIM do corpo do loop
 *   (`corrida.ts:349`), e os ramos de quebra dão `break` depois do
 *   `voltas.push` — então a volta do DNF **entra no histórico e NÃO conta**
 *   pra `melhorVolta` (e é `Infinity` em DNF na volta 1).
 * - 🔴 `historicoVoltas`, **com as chaves ORDENADAS** — é o insumo do replay
 *   volta a volta (o que o jogador de fato ASSISTE) e é de onde `melhorVolta`
 *   sai. Também estava de fora, sob o argumento de que `tempoTotal` agrega o
 *   histórico: agrega a SOMA, e o ponto da volta rápida depende do MÍNIMO —
 *   duas sequências de mesma soma e mínimos diferentes passavam batidas.
 *   🔒 A ordenação das chaves não é preciosismo: `Record` preserva ordem de
 *   INSERÇÃO, e sem canonizar, dois clientes CORRETOS cujos objetos foram
 *   montados em ordens diferentes alarmariam um ao outro. **Falso alarme é
 *   pior que o furo que este parágrafo fecha** — e é o mesmo cuidado que
 *   `hash-draft.ts` já tomava.
 *
 * O que FICA DE FORA, e por quê — cada um é, por construção, redundante com o
 * que já entra (mesma informação, granularidade mais fina, sem pegar nada que
 * os campos acima não pegassem):
 *
 * - `resultado.pontos` — redundante, mas **só porque o autor da volta mais
 *   rápida entrou**: `pontos` é a tabela FIA aplicada a `posicao`/`status`
 *   MAIS o bônus do autor, e os três estão hasheados. Enquanto
 *   `voltaMaisRapida` estava fora, esta linha era falsa — ver o 🔴 acima.
 * - `resultado.paradas` e `voltasCompletadas` — resumo intermediário do MESMO
 *   cálculo que produz `tempoTotal` (cada parada e cada volta perdida em DNF
 *   custam tempo, que já está somado ali). Uma divergência aqui sem
 *   divergência em `tempoTotal` exigiria que os custos se cancelassem
 *   exatamente — teoricamente possível, mas coincidência tão rara quanto uma
 *   colisão de hash, e não é o tipo de bug que este detector foi desenhado
 *   pra caçar (é o próprio DEFEITO de balanceamento, não de sincronização).
 * - `voltaMaisRapida.tempo` e `eventos` (narração) — cobertos pela combinação de
 *   `historicoVoltas` + `classificacao`, que agora estão hasheados. Para quase
 *   todo evento o `custoMs` está embutido no tempo da volta em que ocorreu, e
 *   portanto no histórico. ⚠️ **A exceção é `investigacao`**, cuja penalidade é
 *   somada direto a `tempoTotal` PÓS-corrida (`corrida.ts:355-356`) e não entra
 *   em volta nenhuma — quem a cobre é `tempoTotal`, não o histórico. A conclusão
 *   se sustenta; a razão é que são os DOIS campos juntos, não o histórico
 *   sozinho. (Precisão vinda da revisão.)
 * - `chuva` — resultado de UM `next()` de um sub-stream de RNG cujo efeito
 *   (tudo mais lento) já se propaga a `tempoTotal` de todo mundo. Uma rolagem
 *   de clima diferente entre clientes produziria tempos diferentes, que já
 *   aparecem.
 * - `resultado.seed` — é o eco da `seedCorrida` usada pra simular. Uma seed
 *   diferente muda a simulação INTEIRA (grid, eventos, tempos), então
 *   `classificacao` diverge — e, na maioria dos casos, `pistaId` também
 *   (`pistaSorteada` deriva da mesma seed), mas não por garantia: é um
 *   `shuffle` sobre ~10 pistas, e duas seeds diferentes podem colidir na
 *   mesma pista por acaso. A detecção não depende dessa coincidência —
 *   `classificacao` sozinha já pega.
 * - `grid` (o resultado da quali) — é INSUMO de `simularCorrida`, não saída
 *   independente: se dois clientes computassem grids diferentes, a ordem de
 *   largada mudaria e a `classificacao` resultante divergiria. Hashear os
 *   dois seria hashear a mesma causa duas vezes.
 * - `voltasDePit` — as voltas em que cada carro parou. O custo de cada parada
 *   já está somado ao tempo da volta correspondente em `historicoVoltas`, que
 *   agora é hasheado: divergir em QUANDO se parou muda o tempo daquela volta.
 */
function cargaCanonica(corrida: CorridaParaHash): string {
  const { classificacao, voltaMaisRapida, historicoVoltas } = corrida.resultado;
  const partes: string[] = [
    `pistaId=${corrida.pistaId}`,
    `classificacao=${classificacao
      .map((c) => [c.jogadorId, c.posicao, c.status, c.tempoTotal].join('|'))
      .join(',')}`,
    `voltaMaisRapida=${voltaMaisRapida.jogadorId}`,
    // 🔒 Chaves ORDENADAS, nunca na ordem de inserção do `Record` — ver o
    // parágrafo de `historicoVoltas` acima. Sem isto, dois clientes corretos
    // que montaram o objeto em ordens diferentes alarmariam um ao outro.
    `historicoVoltas=${Object.keys(historicoVoltas)
      .sort()
      // 🔒 Separador `~`, NUNCA `.`: os tempos de volta são float e nunca são
      // arredondados (`tempoVolta` em `corrida.ts`), então `.` seria separador
      // E ponto decimal ao mesmo tempo — `[1.2, 3]` e `[1, 2.3]` colidiriam na
      // MESMA string. Com tempos plausíveis (~90 000 ms) a colisão exigiria
      // voltas de milissegundos, mas a falha seria SILENCIOSA (divergência real
      // não acusada), que é o modo de falha que este arquivo inteiro existe pra
      // evitar. Custa um caractere. (Achado da revisão; nada implantado, sem
      // questão de compatibilidade.)
      .map((jogadorId) => `${jogadorId}|${historicoVoltas[jogadorId].join('~')}`)
      .join(',')}`,
  ];
  return partes.join(';');
}

/**
 * A impressão digital da corrida. Mesmo desenho do `hashDoDraft`:
 * `deriveSeed` usado como HASH (não como stream — nenhum RNG é consumido,
 * nenhum tempo de corrida muda) e duas derivações com sais diferentes
 * concatenadas, pra tirar a colisão acidental do campo das coisas que valha
 * discutir.
 */
export function hashDaCorrida(corrida: CorridaParaHash): string {
  const carga = cargaCanonica(corrida);
  const a = deriveSeed(0, `online:hash-corrida:a:${carga}`);
  const b = deriveSeed(1, `online:hash-corrida:b:${carga}`);
  return `${a.toString(16).padStart(8, '0')}${b.toString(16).padStart(8, '0')}`;
}
