/** Mutação focal do sorteio; implementação commitada, timeout120s, restauração em finally. */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const arq='src/engine/sorteio-ponderado.ts';
const original=readFileSync(arq,'utf8');
const mutantes=[
 ['sem-bonus-moderno','ref.ano >= 1985 ? 0.5 : 0','ref.ano >= 1985 ? 0 : 0'],
 ['fronteira-1985','ref.ano >= 1985','ref.ano > 1985'],
 ['sem-bonus-marcante','.includes(ref.ano) ? 0.5 : 0','.includes(ref.ano) ? 0 : 0'],
 ['sem-bonus-top3','top3 ? 0.5 : 0','top3 ? 0 : 0'],
 ['sem-remocao','candidatos.splice(indice, 1)[0].item','candidatos[indice].item'],
 ['limite-inclusivo','alvo < acumulado','alvo <= acumulado'],
 ['sem-peso','rng.next() * total','rng.next() * candidatos.length'],
 ['sem-guarda-peso','!Number.isFinite(valor) || valor <= 0','false'],
];
if(spawnSync('git',['diff','HEAD','--exit-code','--',arq]).status!==0)throw new Error('Commite implementação antes de mutar');
const rodar=()=>spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run','src/engine/sorteio-ponderado.test.ts','src/engine/draft.test.ts','scripts/draft-top3.test.ts'],{encoding:'utf8',timeout:120000,maxBuffer:1000000});
const controle=rodar();if(controle.status!==0)throw new Error(controle.stdout+controle.stderr);
const resultados=[];
for(const [nome,de,para]of mutantes){
 if(original.split(de).length!==2)throw new Error(`Alvo ausente/ambíguo ${nome}`);
 try{writeFileSync(arq,original.replace(de,para));const r=rodar();const falha=(r.stdout+r.stderr).match(/FAIL\s+([^\n]+)/)?.[1];if(r.status!==0&&!falha&&!r.error)throw new Error('Falha de infraestrutura');resultados.push({nome,detectada:r.status!==0&&!!falha&&!r.error,timeout:r.error?.code==='ETIMEDOUT',falha:falha??null});console.log(resultados.at(-1));}finally{writeFileSync(arq,original);}
}
writeFileSync('docs/draft-ponderado-mutacoes.json',JSON.stringify({timeoutMs:120000,resultados},null,2)+'\n');
if(resultados.some(x=>!x.detectada))process.exitCode=1;
