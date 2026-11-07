import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DetalhesCarroResultado } from './DetalhesCarroResultado';
import { dataset } from './dataset-app';

it('abre a composição correta e a peça sem expor notas', () => {
  const primeiro = <T,>(mapa: Map<string, T>): T => [...mapa.values()][0];
  const piloto = primeiro(dataset.pilotosById);
  const chassi = primeiro(dataset.chassisById);
  const motor = primeiro(dataset.motoresById);
  const estrategista = primeiro(dataset.estrategistasById);
  const pit = primeiro(dataset.pitsById);
  const peca = primeiro(dataset.pecasById);
  const html = renderToStaticMarkup(createElement(DetalhesCarroResultado, {
    nome: piloto.nome,
    loadout: { jogadorId: 'teste', pilotoId: piloto.id, chassiId: chassi.id, motorId: motor.id,
      estrategistaId: estrategista.id, pitId: pit.id, pecaId: peca.id },
  }));
  expect(html).toContain('<summary>');
  expect(html).toContain('Ver carro');
  for (const item of [piloto, chassi, motor, estrategista, pit]) {
    expect(html).toContain(`${item.equipe} ${item.ano}`);
  }
  expect(html).toContain(peca.nome.replaceAll('&', '&amp;'));
  expect(html).not.toContain('tabela-notas');
});

it('preserva o nome quando não há composição disponível', () => {
  expect(renderToStaticMarkup(createElement(DetalhesCarroResultado, { nome: 'Visitante' })))
    .toBe('Visitante');
});
