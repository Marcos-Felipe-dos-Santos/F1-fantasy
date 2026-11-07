import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { ehTop3Oficial } from '../src/engine/draft-top3';
it('tabela da engine coincide com as 204 posições oficiais e exclui demais pares', () => {
  const fonte = JSON.parse(readFileSync('scripts/derived/draft-top3.json','utf8'));
  const esperado = new Set<string>();
  expect(fonte.temporadas).toHaveLength(68);
  for(const t of fonte.temporadas) for(const p of t.top3) {
    expect(p.equipe).toBe(p.nome);
    esperado.add(`${p.equipe}:${t.ano}`);
    expect(ehTop3Oficial({equipe:p.equipe,ano:t.ano})).toBe(true);
  }
  expect(esperado.size).toBe(204);
  const pares: {equipe:string;ano:number}[] = JSON.parse(readFileSync('src/data/equipe-anos.json','utf8'));
  for(const p of pares) expect(ehTop3Oficial(p)).toBe(esperado.has(`${p.equipe}:${p.ano}`));
  expect(ehTop3Oficial({equipe:'Ferrari',ano:1957})).toBe(false);
  expect(ehTop3Oficial({equipe:'Inexistente',ano:2023})).toBe(false);
});
