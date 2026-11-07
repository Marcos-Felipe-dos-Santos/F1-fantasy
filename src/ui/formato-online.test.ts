import { describe, expect, it } from 'vitest';
import { calendarioSorteado } from '../engine/campeonato';
import { criarDataset } from '../engine/dataset';
import { revelarRodada } from '../engine/draft';
import equipeAnos from '../fixtures/dataset-semente/equipe-anos.json';
import pecas from '../fixtures/dataset-semente/pecas.json';
import pistas from '../fixtures/dataset-semente/pistas.json';
import { calendarioDaSala, corridaDaSala, etapasDaSala } from './corrida-online';
import { aplicarEscolhaHumano, ID_HUMANO, iniciarDraftSingle } from './fluxo-draft';

const dataset = criarDataset(equipeAnos, pecas, pistas);
let draft = iniciarDraftSingle(dataset, 'formato-online', 'facil');
for (let i = 0; i < 5; i++) {
  const r = revelarRodada(draft, ID_HUMANO);
  if (r.fase !== 'sorteios') throw new Error('esperado sorteio');
  const slot = r.slotsDisponiveis[0];
  const piloto = dataset.equipeAnos.find(
    (ea) => ea.equipe === r.equipeAno.equipe && ea.ano === r.equipeAno.ano,
  )!.pilotos[0].id;
  draft = aplicarEscolhaHumano(
    dataset,
    draft,
    slot === 'piloto' ? { tipo: 'piloto', pilotoId: piloto } : { tipo: 'componente', slot },
  );
}
const revelacao = revelarRodada(draft, ID_HUMANO);
if (revelacao.fase !== 'peca' || !revelacao.pecasReveladas) throw new Error('esperada peça');
draft = aplicarEscolhaHumano(dataset, draft, { tipo: 'peca', pecaId: revelacao.pecasReveladas[0] });

describe.each([1, 5, 10])('formato online %i', (n) => {
  it.each([1, 42, 987654])('preserva o calendário semeado, seed %i', (seed) => {
    const esperado = calendarioSorteado(dataset, seed, n === 5 ? 'curta' : 'completa').slice(0, n);
    const calendario = calendarioDaSala(dataset, seed, n, [], 0);
    expect(calendario.map((e) => e.pistaId)).toEqual(esperado);
    expect(calendario.map((e) => e.numero)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    expect(calendario.every((e) => e.vencedorId === null)).toBe(true);
  });

  it('deriva etapas abertas com as mesmas pistas e seeds e recompõe após F5', () => {
    const snapshot = {
      seedCalendario: 42,
      nEtapas: n,
      seedsAbertas: Array.from({ length: n }, (_, i) => 100 + i),
    };
    const esperado = calendarioSorteado(dataset, 42, n === 5 ? 'curta' : 'completa').slice(0, n);
    const etapas = etapasDaSala(dataset, draft, 42, snapshot.seedsAbertas, n);
    expect(etapas).toEqual(
      esperado.map((pistaId, i) =>
        corridaDaSala(dataset, draft, snapshot.seedsAbertas[i], pistaId),
      ),
    );
    const salvo = JSON.parse(JSON.stringify(snapshot)) as typeof snapshot;
    expect(
      etapasDaSala(dataset, draft, salvo.seedCalendario, salvo.seedsAbertas, salvo.nEtapas),
    ).toEqual(etapas);
    expect(
      calendarioDaSala(dataset, 42, n, etapas, n).every(
        (e) => e.disputada && e.vencedorId !== null,
      ),
    ).toBe(true);
  });
});

it('mantém legado sem calendário e valores não suportados vazios', () => {
  expect(calendarioDaSala(dataset, null, 1, [], 0)).toEqual([]);
  expect(etapasDaSala(dataset, draft, null, [1], 1)).toEqual([]);
  expect(calendarioDaSala(dataset, 42, 7, [], 0)).toEqual([]);
});

it('não aceita mais etapas abertas que o calendário de uma etapa', () => {
  expect(() => etapasDaSala(dataset, draft, 42, [1, 2], 1)).toThrow('2 etapas abertas');
});
