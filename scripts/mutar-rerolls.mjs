/** Mutação focal de rerolls: implementação commitada, timeout120s por mutante, restauração em finally. */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const ER='src/engine/rerolls.ts',NR='src/net/draft-rede.ts',CL='src/net/cliente.ts';
const mutantes=[
 ['quarta-troca-comum',ER,'controle.comunsUsados >= 3','controle.comunsUsados >= 4'],
 ['marca-muda-ano',ER,'!mesmaMarca && mesmoAno','!mesmaMarca && !mesmoAno'],
 ['ano-muda-marca',ER,'? mesmaMarca && !mesmoAno','? !mesmaMarca && !mesmoAno'],
 ['especial-muda-so-uma-dimensao',ER,"alvo === 'ambos' && !mesmaMarca && !mesmoAno","alvo === 'ambos' && (!mesmaMarca || !mesmoAno)"],
 ['recupera-descartados',ER,'[...sorteios, ...controle.descartados]','[...sorteios]'],
 ['sem-revisao',ER,'revisao: controle.revisao + 1','revisao: controle.revisao'],
 ['sem-cota-especial',ER,'if (especial ? controle.especialUsado : controle.comunsUsados >= 3)','if (especial ? false : controle.comunsUsados >= 3)'],
 ['sem-gasto-comum',ER,'novoControle.comunsUsados++;','novoControle.comunsUsados += 0;'],
 ['sem-gasto-especial',ER,'novoControle.especialUsado = true;','novoControle.especialUsado = false;'],
 ['mesmo-sorteio-todos-jogadores',ER,'draft:reroll:${jogadorId}:${rodada}:${controle.revisao}:${pedido.alvo}','draft:reroll:fixo:${rodada}:${controle.revisao}:${pedido.alvo}'],
 ['servidor-aceita-revisao-antiga',NR,"if (comando.revisaoEsperada !== estado.revisoes[remetenteId])","if (false)"],
 ['cliente-ignora-reroll',CL,"evento.tipo === 'reroll'","false"],
];
const arquivos=[...new Set(mutantes.map(x=>x[1]))];
for(const[nome,arquivo,de]of mutantes){if(readFileSync(arquivo,'utf8').split(de).length!==2)throw new Error(`Alvo ausente ou ambiguo:${nome}`);}
if(spawnSync('git',['diff','HEAD','--exit-code','--',...arquivos]).status!==0)throw new Error('Commite a implementação antes da mutação');
const testes=['src/engine/rerolls.test.ts',...readdirSync('src/net').filter(x=>/^rerolls.*\.test\.ts$/.test(x)).map(x=>`src/net/${x}`)];
const rodar=()=>spawnSync(process.execPath,['node_modules/vitest/vitest.mjs','run',...testes],{encoding:'utf8',timeout:120000,maxBuffer:2000000});
const controle=rodar();if(controle.status!==0)throw new Error(controle.stdout+controle.stderr);
const resultados=[];
for(const[nome,arquivo,de,para]of mutantes){const original=readFileSync(arquivo,'utf8');if(original.split(de).length!==2)throw new Error(`Alvo ausente ou ambiguo:${nome}`);try{writeFileSync(arquivo,original.replace(de,para));const r=rodar();const falha=(r.stdout+r.stderr).match(/FAIL\s+([^\n]+)/)?.[1]??null;if(r.status!==0&&!falha&&!r.error)throw new Error('Falha infraestrutura');resultados.push({nome,detectada:r.status!==0&&!!falha&&!r.error,timeout:r.error?.code==='ETIMEDOUT',falha});console.log(JSON.stringify(resultados.at(-1)));}finally{writeFileSync(arquivo,original);}}
writeFileSync('docs/rerolls-mutacoes.json',JSON.stringify({timeoutMs:120000,resultados},null,2)+'\n');
if(resultados.some(x=>!x.detectada))process.exitCode=1;
