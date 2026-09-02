/**
 * Conta NOME REAL DE F1 no bundle servido (`dist/`), que é a medição que decide
 * o deploy público. Nasceu na atualização do README de 2026-09-02, a pedido do
 * dev, quando a cifra de 114 do PR 6 deixou de valer.
 *
 * 🔒 **Rastreado por regra** (2026-08-30: *"se a captura importa, ou o script
 * fica rastreado ou o número não vale"*). O README passou a afirmar **124**;
 * sem este arquivo, a próxima sessão teria o número sem o meio de refazê-lo —
 * a dívida exata que o `mutar.py` do H1 e o comparador do PR 6 registraram.
 *
 * ---
 *
 * 🔴 **O PORTÃO NÃO COBRE ISTO, E É POR ISSO QUE O SCRIPT EXISTE.**
 * `scripts/portao-nomes-reais.test.ts` mede **só os seis JSON de dados** e roda
 * dentro do `npm test`. O bundle exige `npm run build`, caro demais para todo
 * teste — então a contagem do `dist/` é **manual por desenho**, e uma regressão
 * ali passa em silêncio. **Este script NÃO é portão; é a ferramenta de refazer
 * a medida à mão.**
 *
 * ---
 *
 * 🔑 **A FRONTEIRA NÃO-ALFANUMÉRICA É O QUE SEPARA MEDIÇÃO DE LIXO — medido.**
 * Sem ela, a mesma varredura sobre `index-UkRE1HGe.js` devolve **784**, porque
 * ids curtos de construtor casam dentro de código minificado: `ags`=217,
 * `era`=130, `rb`=117, `bar`=57, `ram`=43. Todos são substring, nenhum é nome.
 * Com fronteira dos dois lados, o resultado cai para **124** e as agulhas
 * sobreviventes são quatro, todas explicáveis.
 *
 * ⚠️ **E A FRONTEIRA TEM UM PONTO CEGO CONHECIDO, que fica declarado em vez de
 * escondido: ela não pega nome real GRUDADO EM DÍGITO.** O caso real deste
 * repositório é o placeholder `"ex.: senna1988 ou 42"`
 * (`src/ui/TelaInicio.tsx`): `senna` é `driverId` real, mas o `1988` colado
 * anula a fronteira e a ocorrência não entra na conta. **Quem usar este número
 * como "não há nome real no bundle" está errado** — ele responde "quantas
 * agulhas do universo aparecem como palavra inteira", e só isso.
 *
 * ---
 *
 * UNIVERSO DE AGULHAS — o mesmo do portão, de propósito, para que os dois
 * números sejam comparáveis. Sai de `scripts/derived/fatos-agregados.json`
 * (que é real por desenho: ele DEFINE a lista de nomes reais), em quatro
 * campos — `equipes[].nome`, `equipes[].constructorId`, `titulares[].nome`,
 * `titulares[].driverId` —, deduplicado: 916 → **909**. As 7 repetidas foram
 * piloto E construtor.
 *
 * 🔑 **OS IDs ENTRAM.** Um contador só de nome exibido leria zero num bundle em
 * que todo `red-bull-2023-piloto-fangio` continuasse intacto.
 *
 * ---
 *
 * Uso:
 *   npm run build
 *   node scripts/medir-nomes-bundle.mjs                  # varre dist/ inteiro
 *   node scripts/medir-nomes-bundle.mjs <arquivo>...     # alvos explícitos
 *   node scripts/medir-nomes-bundle.mjs --contraprova    # + a checagem abaixo
 *
 * A CONTRAPROVA é o que separa "a contagem baixou" de "a troca aconteceu":
 * confere que os nomes reais famosos dão 0 **e** que o fictício que ocupou o
 * lugar de um deles aparece na MESMA contagem que o real tinha no derivado.
 * Contagem que só desce pode ser bug na varredura; contagem que desce enquanto
 * a substituta sobe no mesmo número, não.
 */
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
      const marca = nReal === 0 ? 'ok' : 'ATENCAO';
      const parte = ficticio ? `   |   ${ficticio} = ${cru(ficticio)}` : '';
      console.log(`   ${real.padEnd(12)} = ${nReal}  [${marca}]${parte}`);
    }
  }
}

main();
