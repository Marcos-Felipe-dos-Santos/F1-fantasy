/**
 * Transições puras do modo Campeonato (PR 6.4), no mesmo espírito de
 * `fluxo-corrida.ts`/`fluxo-draft.ts`/`fluxo-local.ts`: estado e transições
 * testáveis sem DOM, que só compõem a engine (`simularCampeonato`,
 * `acumularClassificacao`). Nenhuma regra de jogo é reimplementada aqui —
 * pontuação, desempate e simulação vêm 100% de `src/engine`.
 *
 * Estado do que ficou de fora daquele PR (atualizado no PR 8.1):
 * - Persistência do estado do campeonato (PR 6.5): **FEITA** — `persistencia.ts`.
 * - Telas e hooks React (PR 6.6): **NÃO FEITA** — nada em `App.tsx`/`TelaInicio.tsx`
 *   importa este módulo, então o modo Campeonato ainda é inalcançável pelo
 *   jogador. Reagendada como PRs 8.3 (telas) e 8.4 (integração).
 *
 * DECISÃO DE FORMATO (portão 6.3, fechado em 2026-07-27, opção B): nenhuma
 * alavanca de mitigação de dominância de draft entra no jogo. Consequência de
 * formato — a TEMPORADA CURTA DE 5 ETAPAS passa a ser o DEFAULT do modo
 * Campeonato; a temporada completa (10 etapas) vira opção. Isso substitui a
 * decisão D7 do plano da Fase 6 (lá a curta era só mitigação de tempo de
 * sessão). Ver PROGRESS.md.
 */

import type { Dataset } from '../engine/dataset';
import {
  acumularClassificacao,
  N_ETAPAS,
  simularCampeonato,
  type FormatoTemporada,
} from '../engine/campeonato';
import type { EtapaCampeonato, LinhaClassificacao, Loadout, Pista } from '../engine/types';

/* ------------------------------------------------------------------------ *
 * O CALENDÁRIO MUDOU DE CASA no PR 8.2.1: `FormatoTemporada`, `FORMATO_PADRAO`,
 * `N_ETAPAS`, `calendarioPadrao` e `calendarioSorteado` agora moram em
 * `src/engine/campeonato.ts`, e são RE-EXPORTADOS daqui.
 *
 * Por que moveu: `calendarioSorteado` era o único consumidor de RNG semeado
 * fora de `src/engine/`. Na Fase 3 (online) o desenho natural é "servidor
 * escolhe a seed, todo cliente deriva o mesmo calendário" — deixar isso na UI
 * faria `src/net/` importar de `src/ui/`, invertendo a dependência.
 *
 * Por que o re-export FICA: as ~90 referências em testes e a UI importam
 * daqui, e este módulo segue sendo a fachada do fluxo de campeonato. O
 * re-export é o que tornou o move um diff pequeno em vez de um sed global.
 * ------------------------------------------------------------------------ */
export {
  calendarioPadrao,
  calendarioSorteado,
  FORMATO_PADRAO,
  N_ETAPAS,
  type FormatoTemporada,
} from '../engine/campeonato';

/**
 * Formato da PARTIDA escolhido na `TelaInicio` (PR 8.4-mínimo): a corrida
 * avulsa de sempre, ou um dos dois campeonatos.
 *
 * É deliberadamente `'unica' | FormatoTemporada` em vez de um union novo de
 * três valores: assim os dois valores de campeonato passam DIRETO pra
 * `calendarioSorteado`/`N_ETAPAS`, sem tabela de tradução no meio pra sair de
 * sincronia depois.
 */
export type FormatoPartida = 'unica' | FormatoTemporada;

/** Estreita `FormatoPartida` pros dois formatos de campeonato. */
export function ehCampeonato(formato: FormatoPartida): formato is FormatoTemporada {
  return formato !== 'unica';
}

/**
 * A regra condicional da `TelaInicio` (PR 8.4-mínimo): o seletor de pista — e
 * a linha de perfil da pista que vem junto — só aparecem na corrida única.
 *
 * Nos campeonatos as pistas são SORTEADAS por seed, então um seletor de pista
 * ali seria mentira: o jogador escolheria Monza e correria em outras cinco.
 * Some, não desabilita (decisão do dev: "sumir mesmo, pra não confundir").
 *
 * Vive aqui, e não dentro do componente, porque o projeto não tem jsdom — a
 * lógica testável mora nos `fluxo-*.ts` e o `.tsx` é casca fina (mesmo padrão
 * de `decisaoLocal`, `seedEfetivaTexto` e `perfilPista`).
 */
export function mostraSeletorDePista(formato: FormatoPartida): boolean {
  return !ehCampeonato(formato);
}

/** Rótulos de exibição dos três formatos (a `TelaInicio` não monta texto na mão). */
export const ROTULO_FORMATO: Record<FormatoPartida, string> = {
  unica: 'Corrida única (uma corrida só)',
  curta: `Campeonato curto (${N_ETAPAS.curta} pistas sorteadas)`,
  completa: `Campeonato completo (${N_ETAPAS.completa} pistas)`,
};

/**
 * Descobre o formato a partir do TAMANHO do calendário salvo.
 *
 * O save (`SaveCampeonato`, PR 6.5) guarda `calendario: string[]` mas NÃO
 * guarda o formato — e acrescentar o campo obrigaria a bumpar
 * `VERSAO_FORMATO` e invalidar todo save existente, por uma informação que já
 * está lá implícita. Devolve `null` (nunca lança) pra um tamanho que não
 * corresponde a formato nenhum: é save adulterado ou de um dataset com outro
 * número de pistas, e quem chama é a tela de início, que só quer decidir se
 * mostra o botão "Continuar".
 */
export function formatoDoCalendario(calendario: readonly string[]): FormatoTemporada | null {
  const formatos: FormatoTemporada[] = ['curta', 'completa'];
  return formatos.find((formato) => N_ETAPAS[formato] === calendario.length) ?? null;
}

/** O que o botão "Continuar campeonato" precisa mostrar, derivado do save. */
export interface ResumoCampeonatoSalvo {
  formato: FormatoTemporada;
  /** Número da corrida em que parou, 1-based e pronto pra exibir ("corrida 3 de 5"). */
  corridaAtual: number;
  totalCorridas: number;
  concluido: boolean;
}

/**
 * Traduz um save carregado no resumo que o botão "Continuar campeonato"
 * exibe. Devolve `null` quando o save não descreve um campeonato reconhecível
 * — a tela de início simplesmente não mostra o botão, em vez de mostrar um
 * botão que leva a um erro.
 *
 * `corridaAtual` é 1-based porque é texto de UI: com `etapaAtual` (0-based) em
 * 2 e 5 etapas, o jogador está PRESTES a correr a 3ª. Num campeonato já
 * concluído (`etapaAtual === total`) satura no total, senão anunciaria uma
 * "corrida 6 de 5".
 */
export function resumoCampeonatoSalvo(
  calendario: readonly string[],
  etapaAtual: number,
): ResumoCampeonatoSalvo | null {
  const formato = formatoDoCalendario(calendario);
  if (formato === null) return null;
  if (!Number.isInteger(etapaAtual) || etapaAtual < 0 || etapaAtual > calendario.length) return null;

  const totalCorridas = calendario.length;
  const concluido = etapaAtual >= totalCorridas;
  return {
    formato,
    corridaAtual: concluido ? totalCorridas : etapaAtual + 1,
    totalCorridas,
    concluido,
  };
}

/**
 * Estado do modo Campeonato. `etapas` já vem PRÉ-SIMULADA por inteiro no
 * `iniciarCampeonato` (decisão D3 do plano da Fase 6, custo <2ms) —
 * `etapaAtual` é só um cursor de apresentação (quantas etapas já foram
 * "reveladas" ao jogador), nunca dispara nova simulação. `etapaAtual` é
 * 0-based e vale `calendario.length` quando o campeonato terminou.
 */
export interface EstadoCampeonato {
  seed: number;
  calendario: string[];
  etapaAtual: number;
  etapas: EtapaCampeonato[];
  /**
   * Universo de jogadores do campeonato, na ordem dos loadouts. Guardado
   * EXPLICITAMENTE em vez de reconstruído de `etapas[0]` (aviso 2 da revisão
   * do 6.4): `EstadoCampeonato` é tipo público e o PR 6.5 vai desserializar
   * isto de `localStorage`, onde o tipo TypeScript não garante nada — um save
   * corrompido com `etapas: []` daria um `TypeError` obscuro em vez de erro
   * de save inválido. É também o campo que o 6.5 precisa pra validar o save.
   */
  jogadorIds: string[];
}

/** Resolve um id de pista no dataset; lança alto (nunca `undefined` silencioso) se não existir. */
function resolverPista(dataset: Dataset, pistaId: string): Pista {
  const pista = dataset.pistasById.get(pistaId);
  if (!pista) {
    throw new Error(`iniciarCampeonato: pista "${pistaId}" não encontrada no dataset`);
  }
  return pista;
}

/**
 * Inicia um campeonato: pré-simula TODAS as etapas do `calendario` de uma vez
 * (`simularCampeonato`) e nasce com `etapaAtual: 0`. Rejeita calendário vazio
 * e ids de pista inexistentes no dataset (falha alta, com o id na mensagem);
 * pista duplicada é rejeitada pela própria engine (`simularCampeonato`), cuja
 * mensagem chega intacta ao chamador.
 */
export function iniciarCampeonato(
  dataset: Dataset,
  loadouts: Loadout[],
  seed: number,
  calendario: string[],
): EstadoCampeonato {
  if (calendario.length === 0) {
    throw new Error('iniciarCampeonato: calendário não pode ser vazio');
  }

  const pistas = calendario.map((pistaId) => resolverPista(dataset, pistaId));
  const resultado = simularCampeonato(dataset, loadouts, pistas, seed);

  return {
    seed,
    // CÓPIA, nunca a referência do chamador (aviso 3 da revisão do 6.4): se o
    // chamador mutar o array depois (`calendario.push(...)`), `calendario` e
    // `etapas` dessincronizam — o cursor passaria do fim das etapas simuladas
    // e a tela do 6.6 leria `etapas[i]` inexistente.
    calendario: [...calendario],
    etapaAtual: 0,
    etapas: resultado.etapas,
    jogadorIds: loadouts.map((loadout) => loadout.jogadorId),
  };
}

/**
 * Avança o cursor de apresentação em 1 etapa. Pura: devolve um estado NOVO
 * (nunca muta `estado`). Satura em `estado.calendario.length` — chamar depois
 * de já ter chegado ao fim devolve um estado equivalente (idempotente, não
 * lança). As etapas já estão todas pré-simuladas; avançar só move o cursor.
 */
export function avancarEtapa(estado: EstadoCampeonato): EstadoCampeonato {
  return {
    ...estado,
    etapaAtual: Math.min(estado.etapaAtual + 1, estado.etapas.length),
  };
}

/** Salta o cursor de apresentação direto pro fim do campeonato (todas as etapas "reveladas" de uma vez). */
export function simularOResto(estado: EstadoCampeonato): EstadoCampeonato {
  return { ...estado, etapaAtual: estado.etapas.length };
}

/**
 * Classificação acumulada das `nEtapas` primeiras etapas — o que permite
 * mostrar a tabela evoluindo etapa a etapa. `nEtapas` é uma CONTAGEM, não um
 * índice: `classificacaoApos(estado, estado.etapaAtual)` mostra a tabela
 * depois das etapas já reveladas ao jogador. (O doc anterior dizia "0-based",
 * o que convidava a um `etapaAtual - 1` que devolveria a tabela de uma etapa
 * atrás sem erro nenhum — cosmético 2 da revisão do 6.4.)
 *
 * `nEtapas = 0` devolve todos os jogadores com 0 ponto, ordenados pela
 * convenção da engine (countback FIA, depois `jogadorId`). Não reimplementa
 * desempate: delega inteiramente a `acumularClassificacao`.
 */
export function classificacaoApos(estado: EstadoCampeonato, nEtapas: number): LinhaClassificacao[] {
  // `slice` aceita qualquer coisa e devolve tabela ERRADA em silêncio: -1 vira
  // "todas menos a última", 2.7 vira 2, 999 satura no fim e — o pior — `NaN`
  // vira `[]`, ou seja, uma temporada inteira zerada apresentada como estado
  // legítimo. `NaN` é plausível no 6.6 (parseInt de query param, slider). É o
  // mesmo modo de falha que `cmpCountback` (`engine/campeonato.ts`) documenta
  // como inaceitável; aqui falha alto (aviso 1 da revisão do 6.4).
  if (!Number.isInteger(nEtapas) || nEtapas < 0 || nEtapas > estado.etapas.length) {
    throw new Error(
      `classificacaoApos: nEtapas inválido (${nEtapas}), esperado inteiro em [0, ${estado.etapas.length}]`,
    );
  }
  return acumularClassificacao(estado.etapas.slice(0, nEtapas), estado.jogadorIds);
}

/**
 * Variação de posição de cada jogador entre a classificação DEPOIS de
 * `nEtapas` e a de antes da última delas (PR 8.3, tela de classificação).
 *
 * Positivo = **subiu** (ex.: `+2` saiu de 5º pra 3º); negativo = caiu; `0` =
 * manteve. `null` quando não há referência anterior — depois da PRIMEIRA
 * corrida ninguém "subiu" nem "caiu", porque não havia tabela antes; mostrar
 * `+0` ali seria inventar um passado.
 *
 * `nEtapas` é uma CONTAGEM, no mesmo contrato de `classificacaoApos`, e herda
 * a mesma validação alta (`NaN`/negativo/estouro falham em vez de devolver
 * tabela errada em silêncio).
 */
export function variacaoDePosicao(
  estado: EstadoCampeonato,
  nEtapas: number,
): Map<string, number | null> {
  const atual = classificacaoApos(estado, nEtapas);
  const variacoes = new Map<string, number | null>();

  if (nEtapas <= 1) {
    for (const linha of atual) variacoes.set(linha.jogadorId, null);
    return variacoes;
  }

  const anterior = classificacaoApos(estado, nEtapas - 1);
  const posicaoAntes = new Map(anterior.map((linha, indice) => [linha.jogadorId, indice]));
  for (const [indice, linha] of atual.entries()) {
    const antes = posicaoAntes.get(linha.jogadorId);
    // Jogador ausente da tabela anterior não deveria acontecer (o universo é
    // fixo em `jogadorIds`), mas `null` é a resposta honesta se acontecer —
    // melhor que um número inventado a partir de `undefined`.
    variacoes.set(linha.jogadorId, antes === undefined ? null : antes - indice);
  }
  return variacoes;
}

/** Uma linha do calendário, pronta pra tela (PR 8.3). */
export interface EtapaDoCalendario {
  pistaId: string;
  /** 1-based, pra exibir ("etapa 3 de 5"). */
  numero: number;
  /** Já foi disputada e revelada ao jogador (`indice < etapaAtual`). */
  disputada: boolean;
  /** É a que o jogador vai correr agora. Falso quando o campeonato acabou. */
  proxima: boolean;
  /** Vencedor da etapa — só quando já disputada; `null` caso contrário. */
  vencedorId: string | null;
}

/**
 * O calendário do campeonato anotado pra tela (PR 8.3): o que já correu, com
 * vencedor, e qual é a próxima.
 *
 * **Só revela resultado de etapa já disputada** (`indice < etapaAtual`), mesmo
 * que TODAS estejam simuladas em memória desde o `iniciarCampeonato` — o
 * cursor é justamente o que separa "simulado" de "revelado ao jogador", e
 * vazar o vencedor da próxima corrida no calendário estragaria a corrida que
 * o jogador ainda vai assistir.
 */
export function calendarioAnotado(estado: EstadoCampeonato): EtapaDoCalendario[] {
  return estado.calendario.map((pistaId, indice) => {
    const disputada = indice < estado.etapaAtual;
    const etapa = estado.etapas[indice];
    return {
      pistaId,
      numero: indice + 1,
      disputada,
      proxima: indice === estado.etapaAtual,
      vencedorId:
        disputada && etapa ? (etapa.resultado.classificacao[0]?.jogadorId ?? null) : null,
    };
  });
}

/**
 * Verdadeiro quando o cursor de apresentação chegou ao fim. Mede contra
 * `etapas.length` (o que foi de fato simulado), não contra `calendario.length`
 * (entrada do chamador) — ver aviso 3 da revisão do 6.4.
 */
export function campeonatoConcluido(estado: EstadoCampeonato): boolean {
  return estado.etapaAtual >= estado.etapas.length;
}
