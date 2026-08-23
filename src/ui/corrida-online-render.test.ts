/**
 * PR 4/4 de "corrida online" — a corrida CHEGA NA TELA.
 *
 * 🔴 **Por que este arquivo existe.** Os PRs 1 a 3 construíram a corrida online
 * inteira — seed publicada ao fim do draft (1/4), a fonte única que computa a
 * corrida (2/4), a barreira que decide quando a partida acabou (3/4) — e o
 * jogador continuava parado no `TelaResumo`, com o botão "Ir pra corrida"
 * escondido de propósito. Este PR liga o último metro, e é aqui que ele trava.
 *
 * O que ele NÃO é: teste de aparência. Não há jsdom no projeto (de propósito,
 * `environment: 'node'`), então **não há clique**. Ele cobre o que quebra de
 * verdade num render estático: o botão aparecer quando — e só quando — a
 * corrida existe, a composição `{ modo: 'pronta' }` montar sem explodir, e o
 * texto do alarme ramificar por escopo.
 *
 * ⚠️ **O que fica FORA e é coberto pelo PORTÃO VISUAL, não por asserção:** o
 * clique em "Ir pra corrida", o replay avançando e o disparo de
 * `atestarFimDaCorrida` ao chegar em `fase === 'resultado'`. `renderToStaticMarkup`
 * monta uma vez e não roda efeito nem evento; `useCorrida` nasce em `'grid'` e
 * nada estático o move dali. Fingir cobertura aqui seria a sexta ocorrência de
 * "o teste afirmava o que não conferia" — o projeto já catalogou essa família.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { criarDataset } from '../engine/dataset';
// 🔑 Dataset REAL, não a fixture-semente — mesmo precedente de
// `campeonato-render.test.ts`. `TelaResumo` e `TelaResultadoCorrida` consomem
// `dataset-app` (o real) por dentro; um draft montado sobre a fixture referencia
// ids que não existem lá e `resolverCarro` lança. Os dois lados têm que ser o
// mesmo dataset.
import equipeAnosReal from '../data/equipe-anos.json';
import pecasReal from '../data/pecas.json';
import pistasReal from '../data/pistas.json';
import { revelarRodada } from '../engine/draft';
import type { DraftState, EscolhaDraft } from '../engine/types';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from './fluxo-draft';
import { corridaDaSala, etapasDaSala } from './corrida-online';
import { criarCliente, type EstadoCliente } from '../net/cliente';
import type { EstadoSalaPublico } from '../net/tipos';
import { FluxoOnline } from './FluxoOnline';
import { FluxoCorrida } from './FluxoCorrida';
import { TelaResultadoCorrida } from './TelaResultadoCorrida';
import * as useSalaOnlineModule from './useSalaOnline';

// O ramo do lobby monta a URL do socket a partir de `window.location`, e os
// testes rodam em `environment: 'node'`. Stub mínimo, igual ao de
// `banner-divergencia.test.ts` — só o que `baseParaEstaPagina` lê.
(globalThis as unknown as { window: unknown }).window = {
  location: { protocol: 'http:', host: 'localhost:5173' },
};

const dataset = criarDataset(equipeAnosReal, pecasReal, pistasReal);

/** Mesmo caminho de `useCorrida.test.ts`: joga o humano até o draft concluir. */
function jogarDraftAteConcluir(seedTexto: string): DraftState {
  let atual = iniciarDraftSingle(dataset, seedTexto, 'facil');
  for (let i = 0; i < 5; i++) {
    const revelacao = revelarRodada(atual, ID_HUMANO);
    if (revelacao.fase !== 'sorteios') break;
    const slot = revelacao.slotsDisponiveis[0];
    const escolha: EscolhaDraft =
      slot === 'piloto'
        ? {
            tipo: 'piloto',
            pilotoId: (() => {
              const equipeAno = dataset.equipeAnos.find(
                (ea) =>
                  ea.equipe === revelacao.equipeAno.equipe && ea.ano === revelacao.equipeAno.ano,
              );
              if (!equipeAno) throw new Error('equipe/ano sorteada não encontrada no dataset de teste');
              return equipeAno.pilotos[0].id;
            })(),
          }
        : { tipo: 'componente', slot };
    atual = aplicarEscolhaHumano(dataset, atual, escolha);
  }
  const revelacao = revelarRodada(atual, ID_HUMANO);
  if (revelacao.fase !== 'peca' || !revelacao.pecasReveladas) {
    throw new Error('esperado fase peca com peças reveladas');
  }
  return aplicarEscolhaHumano(dataset, atual, { tipo: 'peca', pecaId: revelacao.pecasReveladas[0] });
}

const draftConcluido = jogarDraftAteConcluir('corrida-online-render');
const corridaPronta = corridaDaSala(dataset, draftConcluido, 4242);

type Retorno = ReturnType<typeof useSalaOnlineModule.useSalaOnline>;

/**
 * Um `EstadoSalaPublico` COMPLETO com o draft concluído — o estado em que o PR
 * 4 age. Montado campo a campo, e não com um cast parcial: o cast compilava
 * mentindo, e um campo novo no tipo passaria a faltar aqui em silêncio.
 */
function salaConcluida(concluidaEm: number | null = null): EstadoSalaPublico {
  return {
    salaId: 'A3F9C2',
    seedDraft: 2026,
    seedCorrida: 4242,
    etapaAtual: 0,
    nEtapas: 5,
    seedCalendario: 555_001,
    seedsAbertas: [900_001],
    dificuldade: 'dificil',
    fase: 'iniciada',
    anfitriaoId: ID_HUMANO,
    jogadores: [],
    roster: null,
    draft: null,
    seq: 7,
    concluidaEm,
    corridaAbertaEm: null,
  };
}

/**
 * 🔒 `cliente` sai de `extras` ANTES do spread, e isso é uma armadilha de
 * vacuidade desarmada, não estilo (achado da revisão). Com `...extras` por
 * cima, um chamador que passasse `extras.cliente` descartaria o `cliente`
 * COMPLETO montado em `renderizarOnline` e poria um parcial no lugar. Um
 * cliente parcial cai no early return `draft === null` do `FluxoOnline`
 * ("Preparando o draft…") e TODOS os `not.toContain` deste arquivo passariam
 * por vacuidade — a sexta família de "o teste afirmava o que não conferia".
 * O merge do cliente é responsabilidade de `renderizarOnline`, num lugar só.
 */
function retornoFalso(cliente: EstadoCliente, extras: Partial<Retorno> = {}): Retorno {
  const outros = { ...extras };
  delete outros.cliente;
  return {
    estadoConexao: 'aberta',
    euSou: ID_HUMANO,
    minhaVez: false,
    souAusente: false,
    encerrada: false,
    inexistente: false,
    ultimoErro: null,
    corrida: null,
    // PR 3.5.3: as etapas do campeonato online. Vazias no DEFAULT de propósito
    // — assim todo teste que não fala de etapa exercita o ramo **sem etapa
    // aberta** (sala legado, ou a janela entre o draft concluir e a primeira
    // seed chegar). O ramo do CAMPEONATO, que o 3.5.4 ligou, tem bloco próprio
    // mais abaixo neste mesmo arquivo, passando `etapas` explicitamente.
    // ⚠️ `etapaCorrente: -1` é o valor coerente com `etapas: []` — é o que
    // `etapaCorrenteDaSala([])` devolve. Pôr `0` aqui faria os testes deste
    // arquivo passarem por um caminho que a produção nunca toma.
    etapas: [],
    etapaCorrente: -1,
    calendario: [],
    classificacao: [],
    entrar: () => {},
    definirPronto: () => {},
    iniciar: () => {},
    sair: () => {},
    escolher: () => {},
    atestarFimDaCorrida: () => {},
    ...outros,
    cliente,
  };
}

/** Renderiza o `FluxoOnline` com um retorno de hook forjado. */
function renderizarOnline(extras: Partial<Retorno> = {}): string {
  const cliente: EstadoCliente = {
    ...criarCliente(),
    draft: draftConcluido,
    euSou: ID_HUMANO,
    sala: salaConcluida(),
    ...(extras.cliente ?? {}),
  };
  const espiao = vi
    .spyOn(useSalaOnlineModule, 'useSalaOnline')
    .mockReturnValue(retornoFalso(cliente, extras));
  try {
    return renderToStaticMarkup(createElement(FluxoOnline, { sala: 'A3F9C2', onVoltar: () => {} }));
  } finally {
    espiao.mockRestore();
  }
}

const ROTULO_IR = 'Ir pra corrida';

describe('🏁 o botão "Ir pra corrida" e a guarda da seed', () => {
  /**
   * ⚠️ **ESTE BLOCO MUDOU DE TESE NO PR 3.5.4 — e a mudança é intencional, não
   * um teste ajustado para passar.**
   *
   * Até o 3.5.3 a asserção era *"com a corrida disponível, o botão APARECE"*.
   * O 3.5.4 **removeu o botão e o `naCorrida` que ele alimentava**: no
   * campeonato online não existe clique a dar, porque quem abre a etapa é a
   * barreira do servidor e a tela troca sozinha quando o snapshot cresce.
   *
   * 🔒 **O teste não foi apagado, foi INVERTIDO** — continua havendo asserção
   * sobre o rótulo, agora exigindo a AUSÊNCIA dele nos dois ramos. Apagar
   * deixaria o rótulo livre para voltar por descuido, que é exatamente o que
   * uma cerca existe para impedir.
   */
  it('🔴 3.5.4: mesmo com a corrida avulsa disponível, NÃO há botão "Ir pra corrida"', () => {
    const html = renderizarOnline({ corrida: corridaPronta });
    expect(html).not.toContain(ROTULO_IR);
    // 🔒 ANTI-VACUIDADE: o resumo do draft REALMENTE renderizou. Sem isto, um
    // early return qualquer (cliente parcial, draft null) faria o `not.toContain`
    // passar sem provar nada — a família "o teste afirmava o que não conferia".
    expect(html).toContain('Draft concluído');
  });

  /**
   * A janela entre o draft concluir e a primeira seed chegar: mensagens
   * diferentes do servidor. Sem corrida e sem etapa, o resumo aparece — e
   * continua sem botão, porque continua sem destino.
   */
  it('🔒 sem corrida e sem etapa aberta, o resumo aparece sem botão de corrida', () => {
    const html = renderizarOnline({ corrida: null });
    expect(html).not.toContain(ROTULO_IR);
    expect(html).toContain('Draft concluído');
  });
});

/* ========================================================================== *
 * 🏆 PR 3.5.4 — O CAMPEONATO CHEGA NA TELA
 *
 * ⚠️ **Os limites deste arquivo continuam valendo, e um deles é o ponto:**
 * `renderToStaticMarkup` monta UMA vez, não roda efeito nem evento, e o React
 * **não emite `key` no markup**. Portanto **nada aqui prova a `key={'etapa-'+k}`
 * nem a remontagem entre etapas** — isso é o PORTÃO VISUAL, e dizer o
 * contrário seria a família "o teste afirmava o que não conferia".
 *
 * O que ESTES testes provam é a outra metade, que erraria em silêncio: que a
 * tela monta a etapa CORRENTE (e não a primeira), pelo caminho real do
 * componente.
 * ========================================================================== */
describe('🏆 o campeonato online na tela (PR 3.5.4)', () => {
  const SEED_CAL = 555_001;
  const SEEDS = [900_001, 900_002, 900_003];
  const etapasAbertas = etapasDaSala(dataset, draftConcluido, SEED_CAL, SEEDS, 5);

  it('🔴 monta a etapa CORRENTE (a última aberta), não a primeira', () => {
    // 🔒 PRÉ-CONDIÇÃO: as pistas das etapas 0 e 2 têm que ser DIFERENTES,
    // senão a asserção não discrimina nada — o calendário sorteia sem repetir,
    // mas isso é propriedade de outra função e aqui tem que ser conferido.
    expect(etapasAbertas, 'PRÉ-CONDIÇÃO: 3 etapas abertas').toHaveLength(3);
    expect(
      etapasAbertas[0].pista.nome,
      'PRÉ-CONDIÇÃO: pistas distinguíveis',
    ).not.toBe(etapasAbertas[2].pista.nome);

    const html = renderizarOnline({
      etapas: etapasAbertas,
      etapaCorrente: 2,
      classificacao: [],
      calendario: [],
    });

    // A tela de grid nomeia a pista. Se a indexação caísse na etapa 0 — que é
    // o que acontece com `key` ausente, ou indexando por um cursor errado — o
    // nome seria o da PRIMEIRA pista.
    expect(html).toContain(etapasAbertas[2].pista.nome);
    expect(html).not.toContain(etapasAbertas[0].pista.nome);
  });

  /**
   * 🔒 O ramo sem etapa: `etapaCorrente` é `-1` e `etapas[-1]` é `undefined`.
   * A tela **não pode** montar corrida nenhuma — tem que cair no resumo.
   * Sem esta asserção, um `etapas[etapaCorrente]` sem guarda passaria
   * `undefined` como `corrida` e o `FluxoCorrida` explodiria em render.
   */
  it('🔒 0(t): etapaCorrente -1 cai no resumo, sem montar corrida', () => {
    const html = renderizarOnline({ etapas: [], etapaCorrente: -1, calendario: [] });
    expect(html).toContain('Draft concluído');
  });
});

describe('🏁 a corrida online COMPÕE com as telas do offline', () => {
  /**
   * A tese do PR 2/4, agora do lado da tela: a MESMA referência que alimentou o
   * hash alimenta o replay. `{ modo: 'pronta' }` não pode preparar nada — é o
   * que `contrato-corrida-online.test.ts` varre estruturalmente e o que este
   * teste confirma em runtime.
   */
  it('🔴 `FluxoCorrida` monta no modo "pronta" com a corrida da sala', () => {
    const html = renderToStaticMarkup(
      createElement(FluxoCorrida, {
        state: draftConcluido,
        fonte: { modo: 'pronta', corrida: corridaPronta },
        onReiniciar: () => {},
      }),
    );
    // A tela de grid é a primeira fase de `useCorrida` — se montou, a
    // composição está de pé.
    expect(html).toContain(corridaPronta.pista.nome);
  });

  it('🔒 no modo "pronta" o replay usa a pista SORTEADA pela seed, não uma fixa', () => {
    // Anti-vacuidade da asserção acima: se `corridaDaSala` fosse ignorada e a
    // tela caísse numa pista default, este par de seeds daria o mesmo nome.
    const outra = corridaDaSala(dataset, draftConcluido, 99_999);
    const nomes = new Set([corridaPronta.pista.nome, outra.pista.nome]);
    expect(nomes.size, 'duas seeds diferentes deram a MESMA pista — sorteio não está agindo').toBe(2);
  });

  it('🔴 o resultado da corrida online mostra a PONTUAÇÃO FIA', () => {
    const html = renderToStaticMarkup(
      createElement(TelaResultadoCorrida, {
        state: draftConcluido,
        resultado: corridaPronta.resultado,
        onReiniciar: () => {},
      }),
    );
    expect(html).toContain('Pontos');
    // O vencedor da corrida online tem os 25 pontos da vitória na tabela.
    const vencedor = corridaPronta.resultado.classificacao[0];
    expect(vencedor.posicao).toBe(1);
    expect(html).toContain(`<td>${vencedor.pontos}</td>`);
  });
});

describe('🔴 o alarme de divergência RAMIFICA por escopo', () => {
  const comEscopo = (escopo: string) =>
    renderizarOnline({
      corrida: corridaPronta,
      cliente: {
        ...criarCliente(),
        draft: draftConcluido,
        euSou: ID_HUMANO,
        sala: salaConcluida(),
        divergencia: { escopo, ancora: 12, jogadores: ['humano-07'] },
      } as EstadoCliente,
    });

  /**
   * 🔒 As asserções afirmam a FRASE INTEIRA do ramo, não a palavra solta
   * (achado da revisão). `toContain('a corrida')` era **vacuamente verdadeira**:
   * a mesma tela renderiza o botão "Ir pra corrida →", que contém "a corrida"
   * como substring — logo passava mesmo com o banner dizendo "o draft". A
   * frase completa é simétrica ao `not.toContain` de baixo, e só um dos dois
   * ramos pode satisfazê-la.
   */
  const FRASE_CORRIDA = 'que a corrida é a mesma em todas as telas';
  const FRASE_DRAFT = 'que o draft é o mesmo em todas as telas';

  it('🔴 escopo "corrida": o texto fala da CORRIDA, não do draft', () => {
    const html = comEscopo('corrida');
    expect(html).toContain('As máquinas divergiram');
    expect(html).toContain(FRASE_CORRIDA);
    expect(html).not.toContain(FRASE_DRAFT);
  });

  /**
   * 🔒 ANTI-VACUIDADE. Sem isto, um texto que dissesse "a corrida" SEMPRE
   * passaria no teste acima — e o alarme do draft (3.4.1, já aprovado pelo dev)
   * teria regredido em silêncio.
   */
  it('🔒 escopo "draft": o texto continua falando do DRAFT', () => {
    const html = comEscopo('draft');
    expect(html).toContain('As máquinas divergiram');
    expect(html).toContain(FRASE_DRAFT);
    expect(html).not.toContain(FRASE_CORRIDA);
  });

  it('🔒 nenhum dos dois acusa jogador nominalmente', () => {
    expect(comEscopo('corrida')).not.toContain('humano-07');
    expect(comEscopo('draft')).not.toContain('humano-07');
  });
});
