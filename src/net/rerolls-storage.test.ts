import { expect, it } from 'vitest';
import { criarServidor } from './servidor-sala';
import { criarDraftRede, draftRedeValido, reduzirDraft } from './draft-rede';
import { estadoDasSeeds } from './sala';

const sala = () =>
  criarServidor(
    'teste',
    42,
    'dificil',
    100,
    {
      etapas: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      calendario: 11,
    },
    5,
  ).sala;
const draft = () => criarDraftRede([{ id: 'a', tipo: 'humano' }], 42, 100);

it('recusa draft antigo e controles corrompidos, preserva lobby legado', () => {
  const s = sala();
  delete s.versaoSala;
  expect(estadoDasSeeds(s).tipo).toBe('legado');
  s.draft = draft();
  s.draft.versao = 1;
  expect(estadoDasSeeds(s).tipo).toBe('corrompida');
  s.draft = draft();
  delete (s.draft as Partial<typeof s.draft>).revisoes;
  expect(estadoDasSeeds(s).tipo).toBe('corrompida');
  s.draft = draft();
  s.draft.revisoes.a = 65;
  expect(estadoDasSeeds(s).tipo).toBe('corrompida');
});

it('valida replay persistido e detecta revisão que não corresponde ao log', () => {
  const s = sala();
  s.draft = reduzirDraft(
    draft(),
    { tipo: 'reroll', alvo: 'ano', turnoEsperado: 1, revisaoEsperada: 0 },
    'a',
    200,
  ).estado;
  expect(estadoDasSeeds(JSON.parse(JSON.stringify(s)))).toMatchObject({ tipo: 'ok' });
  s.draft.revisoes.a = 0;
  expect(estadoDasSeeds(s).tipo).toBe('corrompida');
});

it('storage parcial ou malformado nunca lanca na validacao', () => {
  for (const valor of [
    null,
    undefined,
    1,
    'x',
    {},
    [],
    { versao: 2 },
    { ...draft(), revisoes: null },
    { ...draft(), jogadorIds: null },
    { ...draft(), log: [null] },
    { ...draft(), log: [{ seq: 1, jogadorId: 'a', tipo: 'reroll' }] },
    { ...draft(), humanos: [null] },
    { ...draft(), fase: undefined },
    { ...draft(), rodada: null },
    { ...draft(), ordemPeca: null },
    { ...draft(), ausentes: null },
    { ...draft(), iniciadoEm: undefined },
    { ...draft(), log: {} },
  ]) {
    expect(() => draftRedeValido(valor)).not.toThrow();
    expect(draftRedeValido(valor)).toBe(false);
  }
});
