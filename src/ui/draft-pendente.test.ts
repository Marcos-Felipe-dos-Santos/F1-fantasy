import { describe, expect, it } from 'vitest';
import { aguardaComandoDraft } from './draft-pendente';

const enviado = { fase: 'sorteios', turno: 1, revisao: 0, erros: 0 };
describe('pending de comando online', () => {
  it('mantém bloqueio enquanto coordenadas e conexão não mudarem', () => {
    expect(aguardaComandoDraft(enviado, enviado, 'aberta')).toBe(true);
  });
  it('libera ACK por revisão sem avanço da rodada', () => {
    expect(aguardaComandoDraft(enviado, { ...enviado, revisao: 1 }, 'aberta')).toBe(false);
  });
  it('libera erro sem mudança de rodada/revisão', () => {
    expect(aguardaComandoDraft(enviado, { ...enviado, erros: 1 }, 'aberta')).toBe(false);
  });
  it('libera avanço de turno e fase, perda de sala e desconexão', () => {
    expect(aguardaComandoDraft(enviado, { ...enviado, turno: 2 }, 'aberta')).toBe(false);
    expect(aguardaComandoDraft(enviado, { ...enviado, fase: 'peca' }, 'aberta')).toBe(false);
    expect(aguardaComandoDraft(enviado, null, 'aberta')).toBe(false);
    expect(aguardaComandoDraft(enviado, enviado, 'reconectando')).toBe(false);
    expect(aguardaComandoDraft(null, enviado, 'aberta')).toBe(false);
  });
});
