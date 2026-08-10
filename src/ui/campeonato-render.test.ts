/**
 * Smoke-test de RENDER do wiring do modo Campeonato (PR 8.4-mínimo).
 *
 * O projeto não tem jsdom, e por isso nenhum componente costuma ser testado —
 * mas este PR é justamente o que liga o campeonato à tela, e um erro de
 * runtime na primeira renderização (prop faltando, `undefined.map`, hook mal
 * usado) passaria por `tsc`, por `eslint` e pela suíte inteira, e só
 * apareceria como tela branca na mão do dev.
 *
 * `.ts` (não `.tsx`) com `createElement`, e `renderToStaticMarkup` em Node
 * puro: mesmo padrão já usado em `pista-camadas-render.test.ts` e
 * `card-peca-cego.test.ts`, pra não mexer no include glob do vitest.
 *
 * Isto NÃO substitui o teste do dev no app real — não há eventos, não há
 * clique, não há localStorage. Cobre exatamente uma coisa: as telas montam.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { criarDataset } from '../engine/dataset';
import equipeAnos from '../data/equipe-anos.json';
import pecas from '../data/pecas.json';
import pistas from '../data/pistas.json';
import type { DraftState, Loadout } from '../engine/types';
import {
  avancarEtapa,
  calendarioAnotado,
  calendarioSorteado,
  classificacaoApos,
  iniciarCampeonato,
  resumoCampeonatoSalvo,
  simularOResto,
  variacaoDePosicao,
} from './fluxo-campeonato';
import { FluxoCampeonato } from './FluxoCampeonato';
import { PainelCalendario } from './PainelCalendario';
import { PainelCampeonato, SEGUNDOS_AUTO_AVANCO } from './PainelCampeonato';
import { TelaInicio } from './TelaInicio';

const dataset = criarDataset(equipeAnos, pecas, pistas);

/** Loadouts genéricos (mesmo helper dos testes de fluxo/persistência). */
function loadoutsDeTeste(n: number): Loadout[] {
  const peca = dataset.pecas[0];
  return Array.from({ length: n }, (_, i) => {
    const equipeAno = dataset.equipeAnos[i];
    return {
      jogadorId: `jogador-${i}`,
      pilotoId: equipeAno.pilotos[0].id,
      chassiId: equipeAno.chassi.id,
      motorId: equipeAno.motor.id,
      estrategistaId: equipeAno.estrategista.id,
      pitId: equipeAno.pit.id,
      pecaId: peca.id,
    };
  });
}

/** `DraftState` concluído sintético — o suficiente pras telas lerem jogadores/loadouts. */
function draftDeTeste(loadouts: Loadout[]): DraftState {
  const loadoutsRecord: Record<string, Loadout> = {};
  for (const loadout of loadouts) loadoutsRecord[loadout.jogadorId] = loadout;
  return {
    seed: 42,
    fase: 'concluido',
    jogadores: loadouts.map((l, i) => ({
      id: l.jogadorId,
      tipo: i === 0 ? 'humano' : 'bot',
      perfilBot: i === 0 ? undefined : 'praGanhar',
    })),
    sorteios: {},
    progresso: {},
    ordemPeca: loadouts.map((l) => l.jogadorId),
    indicePeca: loadouts.length,
    pecasReveladas: null,
    copiasRestantes: {},
    loadouts: loadoutsRecord,
  };
}

const loadouts = loadoutsDeTeste(4);
const draft = draftDeTeste(loadouts);
const calendario = calendarioSorteado(dataset, 42, 'curta');
const campeonato = iniciarCampeonato(dataset, loadouts, 42, calendario);

describe('TelaInicio monta', () => {
  it('sem campeonato salvo: tem o seletor de Formato e o de Pista', () => {
    const html = renderToStaticMarkup(
      createElement(TelaInicio, {
        onComecar: () => {},
        campeonatoSalvo: null,
        onContinuarCampeonato: () => {},
        onEntrarOnline: () => {},
      }),
    );
    expect(html).toContain('Formato');
    // Default é 'unica' ⇒ o seletor de pista aparece.
    expect(html).toContain('Pista');
    expect(html).not.toContain('Continuar campeonato');
  });

  it('com campeonato salvo: mostra o botão Continuar e onde parou', () => {
    const resumo = resumoCampeonatoSalvo(calendario, 2);
    expect(resumo).not.toBeNull();
    const html = renderToStaticMarkup(
      createElement(TelaInicio, {
        onComecar: () => {},
        campeonatoSalvo: resumo,
        onContinuarCampeonato: () => {},
        onEntrarOnline: () => {},
      }),
    );
    expect(html).toContain('Continuar campeonato');
    expect(html).toContain('Campeonato curto');
    expect(html).toContain('corrida 3 de 5');
  });
});

describe('PainelCampeonato monta', () => {
  it('em andamento: tabela com todos os jogadores e botão da próxima', () => {
    const html = renderToStaticMarkup(
      createElement(PainelCampeonato, {
        state: draft,
        classificacao: classificacaoApos(campeonato, 1),
        corridasFeitas: 1,
        totalCorridas: 5,
        concluido: false,
        onProximaCorrida: () => {},
        nomeProximaPista: 'Interlagos',
      }),
    );
    expect(html).toContain('Próxima corrida');
    expect(html).toContain('Interlagos');
    // Os 4 jogadores aparecem: o humano pelo nome de exibição ("Você", via
    // `nomeJogador`) e os bots pelo id. Contar as linhas do corpo é o que
    // realmente garante que ninguém sumiu da tabela.
    expect(html).toContain('Você');
    expect(html.match(/<tr[ >]/g) ?? []).toHaveLength(1 + loadouts.length); // cabeçalho + 4
    expect(html).toContain('linha-humano');
  });

  it('concluído: anuncia campeão e NÃO oferece próxima corrida', () => {
    const html = renderToStaticMarkup(
      createElement(PainelCampeonato, {
        state: draft,
        classificacao: classificacaoApos(campeonato, 5),
        corridasFeitas: 5,
        totalCorridas: 5,
        concluido: true,
        onProximaCorrida: null,
        nomeProximaPista: null,
      }),
    );
    expect(html).toContain('Campeão');
    expect(html).not.toContain('Próxima corrida');
  });
});

describe('PainelCampeonato — modo automático (PR C)', () => {
  const base = {
    state: draft,
    classificacao: classificacaoApos(campeonato, 1),
    corridasFeitas: 1,
    totalCorridas: 5,
    concluido: false,
    onProximaCorrida: () => {},
    nomeProximaPista: 'Interlagos',
  };

  it('sem `onAuto` o toggle nem aparece — a corrida avulsa não ganha controle sem sentido', () => {
    const html = renderToStaticMarkup(createElement(PainelCampeonato, base));
    expect(html).not.toContain('Avançar automaticamente');
  });

  it('com `onAuto` e desligado: toggle presente, desmarcado, sem contagem', () => {
    const html = renderToStaticMarkup(
      createElement(PainelCampeonato, { ...base, auto: false, onAuto: () => {} }),
    );
    expect(html).toContain('Avançar automaticamente');
    expect(html).not.toContain('checked');
    expect(html).not.toContain('próxima em');
  });

  it('ligado: toggle marcado e contagem visível (o botão manual continua lá)', () => {
    const html = renderToStaticMarkup(
      createElement(PainelCampeonato, { ...base, auto: true, onAuto: () => {} }),
    );
    expect(html).toContain('checked');
    expect(html).toContain(`próxima em ${SEGUNDOS_AUTO_AVANCO}s`);
    expect(html).toContain('Próxima corrida');
  });

  it('no fim do campeonato o automático não conta nem oferece avanço', () => {
    // `onProximaCorrida: null` ⇒ não há pra onde avançar; ligar o auto não
    // pode produzir contagem eterna na tela de fim de temporada.
    const html = renderToStaticMarkup(
      createElement(PainelCampeonato, {
        ...base,
        concluido: true,
        onProximaCorrida: null,
        nomeProximaPista: null,
        auto: true,
        onAuto: () => {},
      }),
    );
    expect(html).not.toContain('próxima em');
    expect(html).not.toContain('Próxima corrida');
  });
});

describe('FluxoCampeonato monta', () => {
  it('campeonato concluído renderiza a tela de fim de temporada', () => {
    const html = renderToStaticMarkup(
      createElement(FluxoCampeonato, {
        state: draft,
        campeonato: simularOResto(campeonato),
        onProximaCorrida: () => {},
        onReiniciar: () => {},
      }),
    );
    expect(html).toContain('Fim do campeonato');
    expect(html).toContain('Campeão');
  });
});

/**
 * PR 8.3 — as telas novas montam. Sem jsdom, `renderToStaticMarkup` é o que
 * pega prop faltando / `undefined.map` antes de virar tela branca na mão do dev.
 */
describe('PainelCalendario monta (PR 8.3)', () => {
  it('lista todas as etapas com número, nome e silhueta', () => {
    const estado = iniciarCampeonato(dataset, loadouts, 42, calendario);
    const html = renderToStaticMarkup(
      createElement(PainelCalendario, { state: draft, etapas: calendarioAnotado(estado) }),
    );
    expect(html).toContain('Calendário');
    // 5 silhuetas (uma por etapa), desenhadas com a geometria real. Conta o
    // `<svg>`, não a classe: o `<path>` interno também tem prefixo
    // `silhueta-pista` (`__volta`) e dobraria a contagem.
    expect(html.match(/<svg class="silhueta-pista /g) ?? []).toHaveLength(5);
    // A primeira é a próxima; nenhuma foi disputada ainda.
    expect(html).toContain('próxima');
    expect(html).toContain('silhueta-pista--proxima');
    expect(html).not.toContain('🏁');
  });

  it('depois de uma corrida, mostra o vencedor dela e NÃO o das seguintes', () => {
    const estado = avancarEtapa(iniciarCampeonato(dataset, loadouts, 42, calendario));
    const html = renderToStaticMarkup(
      createElement(PainelCalendario, { state: draft, etapas: calendarioAnotado(estado) }),
    );
    // Exatamente um vencedor revelado — o vazamento do resultado das próximas
    // seria o pior defeito possível nesta tela.
    expect(html.match(/🏁/g) ?? []).toHaveLength(1);
    expect(html).toContain('silhueta-pista--disputada');
  });
});

describe('PainelCampeonato — variação de posição (PR 8.3)', () => {
  const estado = iniciarCampeonato(dataset, loadouts, 42, calendario);

  it('sem `variacao` a coluna não existe (corrida avulsa/1ª corrida)', () => {
    const html = renderToStaticMarkup(
      createElement(PainelCampeonato, {
        state: draft,
        classificacao: classificacaoApos(estado, 1),
        corridasFeitas: 1,
        totalCorridas: 5,
        concluido: false,
        onProximaCorrida: () => {},
        nomeProximaPista: 'Interlagos',
      }),
    );
    expect(html).not.toContain('class="variacao');
  });

  it('com `variacao` mostra a coluna, e depois da 1ª corrida é tudo "sem mudança"', () => {
    const html = renderToStaticMarkup(
      createElement(PainelCampeonato, {
        state: draft,
        classificacao: classificacaoApos(estado, 1),
        variacao: variacaoDePosicao(estado, 1),
        corridasFeitas: 1,
        totalCorridas: 5,
        concluido: false,
        onProximaCorrida: () => {},
        nomeProximaPista: 'Interlagos',
      }),
    );
    expect(html).toContain('class="variacao');
    // `null` (sem referência anterior) nunca vira seta — seria inventar passado.
    expect(html).not.toContain('▲');
    expect(html).not.toContain('▼');
  });

  it('renderiza subida, queda e "igual" com o símbolo e o rótulo acessível certos', () => {
    // Variação montada À MÃO, não derivada do fixture: com estes loadouts a
    // ordem não muda nas primeiras corridas (o jogador-0 vence tudo), então
    // derivar daqui testaria o fixture, não a renderização. O cálculo em si
    // já tem teste próprio em `fluxo-campeonato.test.ts`.
    const classificacao = classificacaoApos(estado, 3);
    const variacao = new Map<string, number | null>([
      [classificacao[0].jogadorId, 2],
      [classificacao[1].jogadorId, -1],
      [classificacao[2].jogadorId, 0],
      [classificacao[3].jogadorId, null],
    ]);
    const html = renderToStaticMarkup(
      createElement(PainelCampeonato, {
        state: draft,
        classificacao,
        variacao,
        corridasFeitas: 3,
        totalCorridas: 5,
        concluido: false,
        onProximaCorrida: () => {},
        nomeProximaPista: 'Monza',
      }),
    );
    expect(html).toContain('▲2');
    expect(html).toContain('▼1');
    expect(html).toContain('subiu 2 posições');
    expect(html).toContain('caiu 1 posição'); // singular, não "1 posições"
    // 0 e null são ambos "sem mudança" — nenhum vira seta.
    expect(html.match(/variacao--igual/g) ?? []).toHaveLength(2);
  });
});

describe('FluxoCampeonato — tela de fim (PR 8.3)', () => {
  it('mostra pódio com as três medalhas, tabela final e calendário completo', () => {
    const html = renderToStaticMarkup(
      createElement(FluxoCampeonato, {
        state: draft,
        campeonato: simularOResto(campeonato),
        onProximaCorrida: () => {},
        onReiniciar: () => {},
      }),
    );
    expect(html).toContain('Fim do campeonato');
    expect(html).toContain('🥇');
    expect(html).toContain('🥈');
    expect(html).toContain('🥉');
    expect(html).toContain('Campeão');
    expect(html).toContain('Calendário');
    // Campeonato encerrado: as 5 etapas disputadas, todas com vencedor.
    expect(html.match(/🏁/g) ?? []).toHaveLength(5);
    expect(html).not.toContain('próxima');
  });
});
