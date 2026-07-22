import { describe, expect, it } from 'vitest';
import { NAO_LARGOU, mapearStatus, statusEhConhecido, statusEhLargada } from './status-map.ts';

describe('mapearStatus', () => {
  it('"Finished" ⇒ terminou', () => {
    expect(mapearStatus('Finished')).toBe('terminou');
  });

  it('"+1 Lap" / "+2 Laps" ⇒ terminou (voltas perdidas, mas terminou a prova)', () => {
    expect(mapearStatus('+1 Lap')).toBe('terminou');
    expect(mapearStatus('+2 Laps')).toBe('terminou');
    expect(mapearStatus('+13 Laps')).toBe('terminou');
  });

  it('Accident/Collision/Spun off ⇒ acidente-erro', () => {
    expect(mapearStatus('Accident')).toBe('acidente-erro');
    expect(mapearStatus('Collision')).toBe('acidente-erro');
    expect(mapearStatus('Collision damage')).toBe('acidente-erro');
    expect(mapearStatus('Spun off')).toBe('acidente-erro');
  });

  it('Engine/Turbo/Fuel/Electrical/ERS etc. ⇒ mecanica-motor', () => {
    expect(mapearStatus('Engine')).toBe('mecanica-motor');
    expect(mapearStatus('Turbo')).toBe('mecanica-motor');
    expect(mapearStatus('Fuel')).toBe('mecanica-motor');
    expect(mapearStatus('Electrical')).toBe('mecanica-motor');
    expect(mapearStatus('ERS')).toBe('mecanica-motor');
  });

  it('Gearbox/Suspension/Brakes/Tyre etc. ⇒ mecanica-chassi', () => {
    expect(mapearStatus('Gearbox')).toBe('mecanica-chassi');
    expect(mapearStatus('Suspension')).toBe('mecanica-chassi');
    expect(mapearStatus('Brakes')).toBe('mecanica-chassi');
    expect(mapearStatus('Tyre')).toBe('mecanica-chassi');
  });

  it('Retired/Disqualified/Physical/Illness ⇒ outro', () => {
    expect(mapearStatus('Retired')).toBe('outro');
    expect(mapearStatus('Disqualified')).toBe('outro');
    expect(mapearStatus('Physical')).toBe('outro');
    expect(mapearStatus('Illness')).toBe('outro');
  });

  it('status desconhecido cai no fallback "outro" (nunca lança)', () => {
    expect(mapearStatus('Alien Abduction')).toBe('outro');
  });

  it('"Damage" ⇒ outro (neutralizado de propósito: não dá pra saber se é acidente ou mecânica)', () => {
    expect(mapearStatus('Damage')).toBe('outro');
  });

  it('"Lapped" ⇒ terminou (rodado mas em pista ao fim, mesma situação de "+N Laps" sem o N)', () => {
    expect(mapearStatus('Lapped')).toBe('terminou');
  });

  it('PR 4.3 — 1 exemplo por categoria nova (completude do dataset real, 37 statuses)', () => {
    // mecanica-motor: fogo é convenção motor/combustível (ver cabeçalho).
    expect(mapearStatus('Injection')).toBe('mecanica-motor');
    expect(mapearStatus('Fire')).toBe('mecanica-motor');
    // mecanica-chassi: genéricos por convenção + eletrônica de controle
    // (distinta de "Electrical", que é motor).
    expect(mapearStatus('Mechanical')).toBe('mecanica-chassi');
    expect(mapearStatus('Technical')).toBe('mecanica-chassi');
    expect(mapearStatus('Electronics')).toBe('mecanica-chassi');
    expect(mapearStatus('Broken wing')).toBe('mecanica-chassi');
    // outro: "Out of fuel" é decisão explícita do dev — operacional, não
    // penaliza CONF nem CONS.
    expect(mapearStatus('Out of fuel')).toBe('outro');
    expect(mapearStatus('Driver unwell')).toBe('outro');
  });
});

describe('NAO_LARGOU / statusEhLargada', () => {
  it('"Did not qualify"/"Did not prequalify"/"Withdrew"/"Did not start" NÃO são largada', () => {
    expect(statusEhLargada('Did not qualify')).toBe(false);
    expect(statusEhLargada('Did not prequalify')).toBe(false);
    expect(statusEhLargada('Withdrew')).toBe(false);
    expect(statusEhLargada('Did not start')).toBe(false);
  });

  it('"Disqualified"/"Excluded" SÃO largada (punição pós-largada, não ausência de largada)', () => {
    expect(statusEhLargada('Disqualified')).toBe(true);
    expect(statusEhLargada('Excluded')).toBe(true);
    expect(NAO_LARGOU.has('Disqualified')).toBe(false);
    expect(NAO_LARGOU.has('Excluded')).toBe(false);
  });

  it('"Finished" é largada normal', () => {
    expect(statusEhLargada('Finished')).toBe(true);
  });

  it('status de NAO_LARGOU continua "conhecido" pra auditoria (não aparece em statusesNaoMapeados)', () => {
    expect(statusEhConhecido('Did not qualify')).toBe(true);
    expect(statusEhConhecido('Withdrew')).toBe(true);
  });
});

describe('statusEhConhecido', () => {
  it('true pros status mapeados explicitamente e pro padrão "+N Lap(s)"', () => {
    expect(statusEhConhecido('Finished')).toBe(true);
    expect(statusEhConhecido('+3 Laps')).toBe(true);
    expect(statusEhConhecido('Accident')).toBe(true);
    expect(statusEhConhecido('Engine')).toBe(true);
    expect(statusEhConhecido('Gearbox')).toBe(true);
    expect(statusEhConhecido('Retired')).toBe(true);
  });

  it('false pra status fora da tabela — dispara a auditoria no agregador', () => {
    expect(statusEhConhecido('Alien Abduction')).toBe(false);
  });
});
