/** Diagnóstico de nomes no bundle: nomes históricos são esperados desde 3.4.7.
 * As contagens do dataset são travadas por portao-nomes-reais.test.ts. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FATOS = 'scripts/derived/fatos-agregados.json';
const DIST = 'dist';

/** Os quatro campos do universo, deduplicados. */
function agulhas() {
  const fatos = JSON.parse(readFileSync(FATOS, 'utf8'));
  const conjunto = new Set();
  for (const equipe of fatos.equipes) {
    conjunto.add(equipe.nome);
    conjunto.add(equipe.constructorId);
  }
  for (const titular of fatos.titulares) {
    conjunto.add(titular.nome);
    conjunto.add(titular.driverId);
  }
  conjunto.delete('');
  conjunto.delete(undefined);
  return conjunto;
}

const ehAlnum = (c) => c !== undefined && /[A-Za-z0-9]/.test(c);

/** Ocorrências de `agulha` em `texto` com fronteira não-alfanumérica dos DOIS lados. */
function contarComFronteira(texto, agulha) {
  let n = 0;
  let i = 0;
  while ((i = texto.indexOf(agulha, i)) !== -1) {
    if (!ehAlnum(texto[i - 1]) && !ehAlnum(texto[i + agulha.length])) n++;
    i += agulha.length;
  }
  return n;
}

/** Todo arquivo de texto sob `dist/`, recursivo. */
function arquivosDoDist(raiz = DIST) {
  const saida = [];
  for (const entrada of readdirSync(raiz)) {
    const caminho = join(raiz, entrada);
    if (statSync(caminho).isDirectory()) saida.push(...arquivosDoDist(caminho));
    else if (/\.(js|css|html|json|svg|map)$/.test(entrada)) saida.push(caminho);
  }
  return saida;
}

/**
 * A contraprova. Os pares são `[real, ficticio]`; o fictício `null` quer dizer
 * "não há substituto a conferir, só se espera zero".
 *
 * 🔒 `Sarterra` ocupou o lugar da `Ferrari`, e a igualdade de contagem entre os
 * dois é a asserção que interessa — ela mostra que os registros foram
 * RENOMEADOS, não removidos.
 */
const CONTRAPROVA = [
  ['Ferrari', 'Sarterra'],
  ['McLaren', null],
  ['Schumacher', null],
  ['Verstappen', null],
  ['Senna', null],
];

function main() {
  const argv = process.argv.slice(2);
  const comContraprova = argv.includes('--contraprova');
  const alvos = argv.filter((a) => !a.startsWith('--'));
  const universo = agulhas();

  console.log(`universo: ${universo.size} agulhas deduplicadas (de ${FATOS})`);

  let total = 0;
  for (const alvo of alvos.length > 0 ? alvos : arquivosDoDist()) {
    const texto = readFileSync(alvo, 'utf8');
    const achadas = [];
    let doArquivo = 0;
    for (const agulha of universo) {
      const n = contarComFronteira(texto, agulha);
      if (n > 0) {
        doArquivo += n;
        achadas.push([agulha, n]);
      }
    }
    achadas.sort((a, b) => b[1] - a[1]);
    total += doArquivo;
    console.log(`\n${alvo} => ${doArquivo}`);
    for (const [agulha, n] of achadas) console.log(`   ${agulha} = ${n}`);
  }
  console.log(`\nTOTAL: ${total}`);

  if (!comContraprova) return;

  console.log('\n--- CONTRAPROVA (substring cru, SEM fronteira) ---');
  const js = arquivosDoDist().filter((a) => a.endsWith('.js'));
  for (const alvo of js) {
    const texto = readFileSync(alvo, 'utf8');
    const cru = (s) => {
      let n = 0;
      let i = 0;
      while ((i = texto.indexOf(s, i)) !== -1) {
        n++;
        i += s.length;
      }
      return n;
    };
    console.log(`\n${alvo}`);
    for (const [real, ficticio] of CONTRAPROVA) {
      const nReal = cru(real);
      const marca = 'historico';
      const parte = ficticio ? `   |   ${ficticio} = ${cru(ficticio)}` : '';
      console.log(`   ${real.padEnd(12)} = ${nReal}  [${marca}]${parte}`);
    }
  }
}

main();
