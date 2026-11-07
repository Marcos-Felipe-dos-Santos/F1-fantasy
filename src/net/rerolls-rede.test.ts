import { expect, it } from 'vitest';
import { criarDraftRede, reduzirDraft } from './draft-rede';
import type { ComandoDraft } from './protocolo';

const novo = () =>
  criarDraftRede(
    [
      { id: 'a', tipo: 'humano', nome: 'A' },
      { id: 'b', tipo: 'humano', nome: 'B' },
    ],
    42,
    100,
  );
const pedido = (revisaoEsperada: number) =>
  ({
    tipo: 'reroll',
    alvo: 'marca',
    turnoEsperado: 1,
    revisaoEsperada,
  }) as Extract<ComandoDraft, { tipo: 'reroll' }>;

it('aceita 64 pedidos sem avançar rodada nem renovar prazo; recusa 65 sem mutação', () => {
  let estado = novo();
  for (let i = 0; i < 64; i++) {
    const r = reduzirDraft(estado, pedido(i), 'a', 200 + i);
    expect(r.erro).toBeNull();
    estado = r.estado;
  }
  expect(estado.log).toHaveLength(64);
  expect(estado.rodada.a).toBe(1);
  expect(estado.iniciadoEm.a).toBe(100);
  const r = reduzirDraft(estado, pedido(64), 'a', 999);
  expect(r.erro).toBe('limite-pedidos-reroll');
  expect(r.estado).toBe(estado);
  expect(
    reduzirDraft(
      estado,
      {
        tipo: 'escolher',
        escolha: { tipo: 'componente', slot: 'chassi' },
        turnoEsperado: 1,
        revisaoEsperada: 64,
      },
      'a',
      1000,
    ).erro,
  ).toBeNull();
});

it('recusa duplicata, reordenação e escolha velha, mantendo revisões individuais', () => {
  const primeiro = reduzirDraft(novo(), pedido(0), 'a', 200);
  expect(primeiro.erro).toBeNull();
  expect(reduzirDraft(primeiro.estado, pedido(0), 'a', 300).erro).toBe('revisao-divergente');
  expect(reduzirDraft(primeiro.estado, pedido(2), 'a', 300).erro).toBe('revisao-divergente');
  expect(
    reduzirDraft(
      primeiro.estado,
      {
        tipo: 'escolher',
        escolha: { tipo: 'componente', slot: 'chassi' },
        turnoEsperado: 1,
        revisaoEsperada: 0,
      } as ComandoDraft,
      'a',
      300,
    ).erro,
  ).toBe('revisao-divergente');
  expect(reduzirDraft(primeiro.estado, pedido(0), 'b', 300).erro).toBeNull();
});

it('recusa forma invalida sem anexar campos extras ao log', () => {
  const estado = novo();
  for (const cmd of [
    { ...pedido(0), alvo: 'x' },
    { ...pedido(0), revisaoEsperada: -1 },
    { ...pedido(0), turnoEsperado: 1.5 },
  ]) {
    expect(reduzirDraft(estado, cmd as ComandoDraft, 'a', 200).estado).toBe(estado);
  }
  const r = reduzirDraft(
    estado,
    { ...pedido(0), lixo: 'x'.repeat(10000) } as unknown as ComandoDraft,
    'a',
    200,
  );
  expect(r.estado.log[0]).toEqual({ seq: 1, jogadorId: 'a', tipo: 'reroll', pedido: pedido(0) });
});

it('limita roster a 22 e permite no maximo 1408 rerolls no draft', () => {
  const roster = Array.from({ length: 22 }, (_, i) => ({ id: `h${i}`, tipo: 'humano' as const }));
  let estado = criarDraftRede(roster, 42, 100);
  for (const j of roster) {
    for (let revisao = 0; revisao < 64; revisao++) {
      const r = reduzirDraft(estado, pedido(revisao), j.id, 200);
      expect(r.erro).toBeNull();
      estado = r.estado;
    }
    expect(reduzirDraft(estado, pedido(64), j.id, 200).erro).toBe('limite-pedidos-reroll');
  }
  expect(estado.log).toHaveLength(1408);
  expect(() => criarDraftRede([...roster, { id: 'extra', tipo: 'humano' }], 42, 100)).toThrow();
});
