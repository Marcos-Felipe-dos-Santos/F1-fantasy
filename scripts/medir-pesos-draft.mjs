/** Medição exploratória; não altera sorteios nem notas do jogo. */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const pares = JSON.parse(readFileSync('src/data/equipe-anos.json', 'utf8')).map(({ equipe, ano }) => ({ equipe, ano }));
const famosos = [1988, 1991, 1994, 2004, 2008, 2012, 2016, 2021, 2023];
const top = new Set();
for (const ano of readdirSync('scripts/cache/jolpica').filter(x => /^\d{4}$/.test(x))) {
  const pontos = new Map(), vistos = new Set();
  for (const f of readdirSync(join('scripts/cache/jolpica', ano)).filter(x => /^results-p\d+\.json$/.test(x))) {
    const d = JSON.parse(readFileSync(join('scripts/cache/jolpica', ano, f), 'utf8'));
    for (const r of d.MRData?.RaceTable?.Races ?? []) for (const x of r.Results ?? []) {
      const chave = `${r.round}:${x.Driver.driverId}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      pontos.set(x.Constructor.name, (pontos.get(x.Constructor.name) ?? 0) + Number(x.points));
    }
  }
  for (const [nome] of [...pontos].sort((a,b) => b[1]-a[1] || (a[0]<b[0]?-1:1)).slice(0,3)) top.add(`${nome}:${ano}`);
}
const registros = pares.map(p => ({...p, moderno:p.ano>=1985, famoso:famosos.includes(p.ano), top:top.has(`${p.equipe}:${p.ano}`)}));
const resumo = (bonus) => {
  const peso = p => 1 + bonus * (Number(p.moderno)+Number(p.famoso)+Number(p.top));
  const soma = registros.reduce((n,p)=>n+peso(p),0);
  return { bonus, pesoMin:1, pesoMax:1+3*bonus, porcentagem1985mais:100*registros.filter(p=>p.moderno).reduce((n,p)=>n+peso(p),0)/soma, porcentagemAnosMarcantes:100*registros.filter(p=>p.famoso).reduce((n,p)=>n+peso(p),0)/soma, porcentagemTop3:100*registros.filter(p=>p.top).reduce((n,p)=>n+peso(p),0)/soma };
};
const relatorio = { metodo:'Probabilidade exata de uma primeira extração por soma de pesos; não simula 5 rodadas sem reposição ou rerolls. Top 3 PROVISÓRIO por soma de pontos das corridas no cache: faltam sprints e ajustes oficiais. Nomes precisam de conciliação antes de produção.', anosMarcantes:famosos, pares:pares.length, paresTop3Conciliados:registros.filter(p=>p.top).length, cenarios:[0,.25,.5].map(resumo) };
writeFileSync('docs/draft-pesos-exploracao.json', JSON.stringify(relatorio,null,2)+'\n');
console.log(JSON.stringify(relatorio,null,2));
