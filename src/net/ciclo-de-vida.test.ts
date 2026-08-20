/**
 * PR 3.3.2 — ciclo de vida da sala: janela de graça e reset.
 *
 * O que isto resolve, e por que valia um PR: o log append-only **crescia para
 * sempre** (metade do problema C2 do 3.2 — a outra metade, a escolha ilegal, já
 * foi), e uma sala com draft de dias atrás ficava de pé sem ninguém. Agora há
 * ponto de descarte definido.
 *
 * O relógio é INJETADO, como em todo o resto de `src/net/` — nada aqui lê
 * `Date.now`, e é por isso que dá pra testar a janela sem esperar 10 minutos.
 */

import { describe, expect, it } from 'vitest';
import {
  avaliarBarreiraDaCorrida,
  criarServidor,
  decidirVida,
  marcarCorridaAberta,
  registrarConexoes,
  type EstadoServidor,
} from './servidor-sala';
import { CARENCIA_VAZIO_MS, JANELA_DE_GRACA_MS, N_ETAPAS_CURTA } from './tipos';

/**
 * Seeds do campeonato para os testes desta suíte (3.5.1). Valores fixos e
 * distintivos — nenhum deles é derivado da `seedMestre`, que é o ponto do
 * `B-indep`. Quem exercita o comportamento das seeds é
 * `campeonato-online.test.ts`; aqui elas só satisfazem o construtor.
 */
const SEEDS_T = {
  etapas: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010],
  calendario: 7777,
};

const T0 = 1_000_000;
const criar = (): EstadoServidor => criarServidor('A3F9C2', 2026, 'dificil', T0, SEEDS_T, N_ETAPAS_CURTA);

/** Estado com a partida terminada em `T0`. */
function concluida(): EstadoServidor {
  const base = criar();
  const comDraft: EstadoServidor = {
    ...base,
    sala: {
      ...base.sala,
      fase: 'iniciada',
      draft: {
        versao: 1,
        jogadorIds: [],
        humanos: [],
        fase: 'concluido',
        rodada: {},
        ordemPeca: [],
        indicePeca: 0,
        ausentes: [],
        log: [],
        iniciadoEm: {},
      },
    },
  };
  // Com gente dentro: senão a carência de vazio venceria antes da janela.
  const comGente = registrarConexoes(comDraft, 3, T0);
  // 🔑 DOIS PASSOS desde o PR 3/4, e não mais um: o draft concluir só ABRE a
  // corrida; quem marca `concluidaEm` é a BARREIRA DO FIM. `timeoutMs: 0` faz
  // a barreira decidir na hora, que é o que este helper quer (uma partida já
  // terminada em `T0`) sem simular atestado de ninguém.
  //
  // 🏆 **N PASSOS desde o 3.5.2, e não mais dois.** Todo jogo online é
  // campeonato de `N_ETAPAS_CURTA` etapas: fechar a barreira da etapa k só
  // AVANÇA O CURSOR; quem marca `concluidaEm` é a barreira da ÚLTIMA. O laço
  // fecha as cinco **pelo caminho real** — nada de forjar `etapaAtual`, que é
  // o que faria este helper abençoar um estado que a produção não produz.
  // Todas as chamadas em `T0`, então `corridaAbertaEm` re-ancora sempre no
  // mesmo instante e a partida segue "terminada em T0" para quem lê daqui.
  let estado = avaliarBarreiraDaCorrida(marcarCorridaAberta(comGente, T0), T0, 0);
  let voltas = 0;
  while (estado.sala.concluidaEm === null) {
    estado = avaliarBarreiraDaCorrida(estado, T0, 0);
    voltas += 1;
    if (voltas > N_ETAPAS_CURTA) throw new Error('a barreira não concluiu o campeonato');
  }
  return estado;
}

describe('marcarCorridaAberta (antes do PR 3/4 isto era `marcarConclusao`)', () => {
  it('marca quando o draft conclui, e só então', () => {
    expect(criar().sala.corridaAbertaEm).toBeNull();
    expect(
      marcarCorridaAberta(criar(), T0).sala.corridaAbertaEm,
      'marcou sem draft concluído',
    ).toBeNull();
    expect(concluida().sala.corridaAbertaEm).toBe(T0);
  });

  it('🔑 o fim do DRAFT não arma mais a janela de graça — quem arma é a barreira', () => {
    // A mudança que o PR 3/4 fez, travada por asserção: antes, esta mesma
    // chamada marcava `concluidaEm`, e os 10 minutos passavam a correr
    // DURANTE o replay da corrida. A sala podia fechar com gente assistindo.
    const base = criar();
    const comDraftConcluido: EstadoServidor = {
      ...base,
      sala: {
        ...base.sala,
        fase: 'iniciada',
        draft: {
          versao: 1,
          jogadorIds: [],
          humanos: [],
          fase: 'concluido',
          rodada: {},
          ordemPeca: [],
          indicePeca: 0,
          ausentes: [],
          log: [],
          iniciadoEm: {},
        },
      },
    };
    const depois = marcarCorridaAberta(comDraftConcluido, T0);
    expect(depois.sala.corridaAbertaEm, 'a corrida abriu').toBe(T0);
    expect(depois.sala.concluidaEm, 'mas a partida NÃO terminou junto com o draft').toBeNull();
  });

  it('é IDEMPOTENTE — o instante da abertura não se move', () => {
    // Se cada broadcast remarcasse, o timeout da barreira nunca venceria: a
    // âncora fugiria pra frente a cada snapshot.
    const uma = concluida();
    const outra = marcarCorridaAberta(uma, T0 + 5 * 60_000);
    expect(outra.sala.corridaAbertaEm).toBe(T0);
    expect(outra, 'devolveu objeto novo à toa').toBe(uma);
  });
});

describe('decidirVida', () => {
  it('🔴 sala VAZIA tem CARÊNCIA — não morre no primeiro tique', () => {
    // Este teste afirmava o contrário ("encerra na hora") e por isso ficava
    // verde com o defeito dentro: a sala nasce vazia, o alarme dispara em 5 s,
    // e ela morria ANTES de o criador conseguir mandar o código pra alguém. O
    // caso de uso central do PR não funcionava, e o teste dizia que sim.
    const nova = criar(); // `vazioDesde = T0` — nasce vazia, de propósito
    expect(decidirVida(nova, T0)).toEqual({ tipo: 'seguir' });
    expect(decidirVida(nova, T0 + 5_000), 'morreu no primeiro tique').toEqual({ tipo: 'seguir' });
    expect(decidirVida(nova, T0 + CARENCIA_VAZIO_MS - 1)).toEqual({ tipo: 'seguir' });
  });

  it('vencida a carência sem ninguém, encerra — a sala zumbi continua impedida', () => {
    expect(decidirVida(criar(), T0 + CARENCIA_VAZIO_MS)).toEqual({
      tipo: 'encerrar',
      motivo: 'vazia',
    });
  });

  it('a carência é de 2 minutos — cobre copiar o link e trocar de app no celular', () => {
    expect(CARENCIA_VAZIO_MS).toBe(120_000);
  });

  it('partida em andamento COM GENTE DENTRO nunca encerra por tempo', () => {
    // Um draft longo não pode ser interrompido pela janela — ela só conta
    // depois do fim. `vazioDesde: null` é o que diz "tem gente".
    const comGente = registrarConexoes(criar(), 2, T0);
    expect(comGente.sala.vazioDesde).toBeNull();
    expect(decidirVida(comGente, T0 + 10 * JANELA_DE_GRACA_MS)).toEqual({ tipo: 'seguir' });
  });

  it('registrarConexoes marca e desmarca o vazio, e preserva identidade se nada muda', () => {
    const vazia = criar();
    const comGente = registrarConexoes(vazia, 3, T0 + 1000);
    expect(comGente.sala.vazioDesde).toBeNull();
    // Chamar de novo com o mesmo cenário não cria objeto novo — é o que evita
    // escrita em storage a cada tique.
    expect(registrarConexoes(comGente, 3, T0 + 2000)).toBe(comGente);

    const esvaziou = registrarConexoes(comGente, 0, T0 + 3000);
    expect(esvaziou.sala.vazioDesde).toBe(T0 + 3000);
    expect(registrarConexoes(esvaziou, 0, T0 + 9000), 'remarcou o vazio').toBe(esvaziou);
  });

  it('dentro da janela de graça, segue viva', () => {
    const estado = concluida();
    expect(decidirVida(estado, T0)).toEqual({ tipo: 'seguir' });
    expect(decidirVida(estado, T0 + JANELA_DE_GRACA_MS - 1)).toEqual({ tipo: 'seguir' });
  });

  it('vencida a janela, encerra — exatamente no limite', () => {
    const estado = concluida();
    expect(decidirVida(estado, T0 + JANELA_DE_GRACA_MS)).toEqual({
      tipo: 'encerrar',
      motivo: 'janela-vencida',
    });
    expect(decidirVida(estado, T0 + JANELA_DE_GRACA_MS + 60_000)).toEqual({
      tipo: 'encerrar',
      motivo: 'janela-vencida',
    });
  });

  it('a janela é parametrizável (o teste não espera 10 minutos de verdade)', () => {
    const estado = concluida();
    expect(decidirVida(estado, T0 + 50, 100)).toEqual({ tipo: 'seguir' });
    expect(decidirVida(estado, T0 + 100, 100)).toEqual({
      tipo: 'encerrar',
      motivo: 'janela-vencida',
    });
  });

  it('a janela padrão é de 10 minutos', () => {
    // Registrado como asserção porque é decisão, não acaso: 5 minutos é
    // apertado pra quem levanta da mesa; o alarme de 5 s já existe pro
    // cronômetro de turno, então segurar mais tempo não custa nada.
    expect(JANELA_DE_GRACA_MS).toBe(600_000);
  });
});

describe('o estado público leva `concluidaEm` (a tela precisa pra contar)', () => {
  it('está no snapshot, e não é segredo', () => {
    // Diferente de `seedMestre` e `tokens`: saber quando a partida acabou não
    // dá vantagem a ninguém, e sem isso a tela não teria como avisar.
    const publico = concluida().sala;
    expect(publico.concluidaEm).toBe(T0);
  });
});
