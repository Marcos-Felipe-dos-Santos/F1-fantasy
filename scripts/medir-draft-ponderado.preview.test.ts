import { readFileSync, writeFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { createRng, deriveSeed } from '../src/engine/rng';
import { pesoDoSorteio, sortearPonderado } from '../src/engine/sorteio-ponderado';

it('mede cinco extrações por jogador antes/depois, sem alterar o draft publicado', () => {
  const cobertura = JSON.parse(readFileSync('docs/draft-top3-cobertura.json','utf8'));
  if (!cobertura.completo) throw new Error('Top3 oficial ainda não conciliado; medição final bloqueada');
  const historia = JSON.parse(readFileSync('scripts/derived/draft-top3.json','utf8'));
  const top = new Set<string>(historia.temporadas.flatMap((t: {ano:number;top3:{equipe:string}[]}) => t.top3.map(x=>`${x.equipe}:${t.ano}`)));
  const refs: {equipe:string;ano:number}[] = JSON.parse(readFileSync('src/data/equipe-anos.json','utf8')).map(({equipe,ano}:{equipe:string;ano:number})=>({equipe,ano}));
  const famosos = new Set([1988,1991,1994,2004,2008,2012,2016,2021,2023]);
  const resultados = [];
  for (const ponderado of [false,true]) {
    let modernos=0, marcantes=0, melhores=0, repetidos=0;
    const marcas: Record<string,number> = {};
    const n=10000;
    for(let seed=0;seed<n;seed++) {
      const rng=createRng(deriveSeed(seed,'draft:sorteios:medicao'));
      const sorteados=ponderado ? sortearPonderado(refs,5,p=>pesoDoSorteio(p,top.has(`${p.equipe}:${p.ano}`)),rng) : rng.shuffle(refs).slice(0,5);
      if(new Set(sorteados.map(x=>`${x.equipe}:${x.ano}`)).size!==5) repetidos++;
      for(const p of sorteados){modernos+=Number(p.ano>=1985);marcantes+=Number(famosos.has(p.ano));melhores+=Number(top.has(`${p.equipe}:${p.ano}`));marcas[p.equipe]=(marcas[p.equipe]??0)+1;}
    }
    expect(repetidos).toBe(0);
    resultados.push({ponderado,jogadores:n,extracoes:n*5,modernosPct:100*modernos/(n*5),marcantesPct:100*marcantes/(n*5),top3Pct:100*melhores/(n*5),repetidos,marcas});
  }
  writeFileSync('docs/draft-pesos-cinco-rodadas.json',JSON.stringify({metodo:'10000 jogadores, seeds 0..9999, cinco sorteios sem reposição, mesmo substream; sem rerolls e sem medir vitórias',resultados},null,2)+'\n');
},60000);
