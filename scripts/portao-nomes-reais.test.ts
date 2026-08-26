/**
 * 🔒 PORTÃO DOS NOMES REAIS — PR 1 da trilha do dataset fictício.
 *
 * Conta quantos nomes reais de F1 aparecem nos ARQUIVOS DE DADOS e compara com
 * um baseline commitado, **por arquivo e por contagem EXATA**. Mexeu a
 * contagem, o teste cai — para mais OU para menos. É de propósito: teto que só
 * desce sozinho não registra progresso, e cerca cujo número nunca se mexeu é
 * cerca não exercitada.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNIVERSO DE AGULHAS — decisão do dev, 2026-08-25.
 *
 * Sai de `scripts/derived/fatos-agregados.json`, lido pela constante única de
 * `./caminhos-dataset.ts` (`FATOS_AGREGADOS`). São QUATRO campos, não dois:
 *   - `equipes[].nome`         → 105 nomes de equipe   ("Ferrari")
 *   - `equipes[].constructorId`→ 105 ids de equipe     ("ferrari")
 *   - `titulares[].nome`       → 353 nomes de piloto   ("Juan Manuel Fangio")
 *   - `titulares[].driverId`   → 353 ids de piloto     ("fangio")
 *
 * 🔑 **OS IDs ENTRAM, e essa é a diferença entre um portão honesto e um que
 * mente.** O id é o nome slugado e MINÚSCULO; a varredura é sensível a caixa.
 * Um portão só de nomes exibidos leria ZERO num dataset em que todo
 * `red-bull-2023-piloto-fangio` continuasse intacto — a forma exata do "o teste
 * afirmava o que não conferia" que este projeto já catalogou seis vezes.
 *
 * A união é DEDUPLICADA: 916 → **909 agulhas**. As 7 repetidas são história
 * real da F1 — `brabham`, `mclaren`, `hill`, `prost`, `stewart`, `surtees` e
 * `fittipaldi` foram piloto E construtor. Sem o dedup, cada uma contaria duas
 * vezes e o número viraria arbitrário.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ESCOPO — SÓ ARQUIVOS DE DADOS. Fixado aqui, de propósito.
 *
 * `src/data/*.json` (o que vai no bundle) e `src/fixtures/dataset-semente/*.json`
 * (o artefato que existe para ser lido com segurança — se ele ficar com nome
 * real, a próxima sessão volta a ler nome real justamente no arquivo criado
 * para evitar isso).
 *
 * ⚠️ **`scripts/derived/` está FORA, e não é esquecimento:** ele É o universo.
 * Contar nome real no arquivo que DEFINE a lista de nomes reais é circular —
 * daria 100% por construção e não mediria nada. Ele segue com nome real por
 * desenho; quem o anonimiza é o PR 5, na escrita para `src/data/`.
 *
 * ⚠️ **CÓDIGO-FONTE está FORA, e o PR 2 NÃO fechou isso.** Este portão não mede
 * `.ts`/`.tsx`, e segue sem medir depois do PR 2 (`50bda11`).
 *
 * O que o PR 2 fez foi **CONCENTRAR** os literais de `equipe/ano` em
 * `src/fixtures/referencias-dataset.ts` — 44 sítios espalhados por 7 arquivos
 * saíram de lá. **O que ele NÃO fez foi criar cerca sobre código-fonte:** nada
 * impede que um `.find((e) => e.equipe === 'Red Bull')` novo apareça amanhã, e
 * nenhum teste falharia. Medido em 2026-08-25, pós-funil: ainda há **14
 * arquivos-fonte / 58 sítios-linha** citando nome de equipe, dos quais 22 são o
 * próprio módulo de referência — os demais são oráculos pinados, fixtures
 * sintéticas, prosa e a anti-vacuidade deste arquivo.
 *
 * **Quem ler este teste verde e concluir "não há nome real no repo" está
 * errado** — ele responde "quanto nome real há nos DADOS", e só isso.
 *
 * ⚠️ **O BUNDLE está FORA.** A medição que decide o deploy é sobre `dist/`
 * (contagem nº 5 do inventário), e exige `npm run build` — caro demais para
 * rodar em todo `npm test`. Entra como passo do PR 6 e da definição de pronto.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MÉTODO — VARREDURA DE TEXTO CRU, NUNCA CAMINHADA POR CAMPO.
 *
 * O arquivo é lido como uma string só e cada agulha é contada nele. **Não se
 * percorre a estrutura JSON.** A razão é medida: `scripts/derivar-notas.ts:705`
 * monta o nome do estrategista por INTERPOLAÇÃO —
 * `` `Estrategista ${equipe.nome} ${season}` `` —, então o nome da equipe vive
 * DENTRO de um valor, não numa chave. Foram três sessões contando "3 sítios de
 * normalização" quando eram 4, justamente por pensar em campo. Varredura de
 * texto acha; enumeração de campo só acha se alguém lembrar do campo.
 *
 * 🔒 **FRONTEIRA NÃO-ALFANUMÉRICA nos dois lados, e ela não é preciosismo.**
 * Sem ela a métrica vira lixo, e isso está MEDIDO: `rb` (Red Bull) casa dentro
 * de `Nürburgring`, e `pistas.json` acusava 4 ids fantasma em vez de 0. É a
 * repetição exata do substituto 2 do inventário, reprovado por `button` (Jenson
 * Button) casar em todo `<button>` e `sala` (driverId real) casar em `src/net/`.
 * 🔒 **NÃO EXISTE ALLOWLIST AQUI, e não se acrescenta uma.** Escolher exceções
 * a dedo até o número ficar bonito é o vício que aposentou a contagem 33/6/2.
 * Se o número incomoda, corrige-se o DADO, não a lista.
 *
 * 📌 **Sobre-contagem conhecida, registrada em vez de excluída:** `massa` é
 * driverId real (Felipe Massa) e casa em `peca-amortecedor-massa-renault`, onde
 * "massa" é a palavra portuguesa. São 2 ocorrências por arquivo de peças. Fica
 * contado. Um portão que sobre-conta é seguro; um que sub-conta mente.
 *
 * 📛 **Este teste LÊ `src/data/*.json` — em bytes, para contar, NUNCA
 * imprimindo o conteúdo.** A saída de falha é limitada a 5 amostras
 * `agulha=contagem`. Mesma disciplina de `src/engine/versao.test.ts:18`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_DIR, FATOS_AGREGADOS, FIXTURE_DIR } from './caminhos-dataset.ts';

/** Cardinalidades do universo. Se qualquer uma mudar, o baseline não vale mais. */
const ESPERADO_NOMES_EQUIPE = 105;
const ESPERADO_IDS_EQUIPE = 105;
const ESPERADO_NOMES_PILOTO = 353;
const ESPERADO_IDS_PILOTO = 353;
const ESPERADO_AGULHAS_DEDUPLICADAS = 909;

/**
 * 🔒 BASELINE COMMITADO — contagem EXATA por arquivo, medida em 2026-08-25.
 *
 * **Atualizar este bloco é ato deliberado, e é o ponto do portão.** Cada PR da
 * trilha derruba números daqui: o PR 3 (peças + T1) mexe em `pecas.json` e
 * `pistas.json`; o PR 6 (a troca) derruba `src/data/equipe-anos.json`; o PR 7
 * derruba a fixture. **Baixar um número sem que o dado tenha mudado é fraudar
 * a medição.**
 */
const BASELINE: ReadonlyArray<readonly [string, number]> = [
  ['src/data/equipe-anos.json', 9237],
  ['src/data/pecas.json', 19],
  ['src/data/pistas.json', 2],
  ['src/fixtures/dataset-semente/equipe-anos.json', 243],
  ['src/fixtures/dataset-semente/pecas.json', 19],
  ['src/fixtures/dataset-semente/pistas.json', 2],
];

/** Resolve o nome relativo (POSIX, estável entre plataformas) para o caminho real. */
function caminhoDe(relativo: string): string {
  const arquivo = relativo.slice(relativo.lastIndexOf('/') + 1);
  return relativo.startsWith('src/data/')
    ? join(DATA_DIR, arquivo)
    : join(FIXTURE_DIR, arquivo);
}

const EH_ALFANUMERICO = /[\p{L}\p{N}_]/u;

/**
 * Conta ocorrências de `agulha` em `texto` exigindo fronteira não-alfanumérica
 * dos dois lados. Avança de 1 em 1 (não pelo tamanho da agulha) para não perder
 * sobreposição.
 */
export function contarComFronteira(texto: string, agulha: string): number {
  if (agulha.length === 0) return 0;
  let total = 0;
  let i = 0;
  for (;;) {
    const k = texto.indexOf(agulha, i);
    if (k < 0) return total;
    const fim = k + agulha.length;
    const antesLivre = k === 0 || !EH_ALFANUMERICO.test(texto[k - 1]);
    const depoisLivre = fim === texto.length || !EH_ALFANUMERICO.test(texto[fim]);
    if (antesLivre && depoisLivre) total += 1;
    i = k + 1;
  }
}

interface FatosDoUniverso {
  readonly equipes: ReadonlyArray<{ readonly nome: string; readonly constructorId: string }>;
  readonly titulares: ReadonlyArray<{ readonly nome: string; readonly driverId: string }>;
}

function carregarUniverso(): {
  agulhas: readonly string[];
  nomesEquipe: number;
  idsEquipe: number;
  nomesPiloto: number;
  idsPiloto: number;
} {
  const fatos = JSON.parse(readFileSync(FATOS_AGREGADOS, 'utf8')) as FatosDoUniverso;
  const nomesEquipe = new Set(fatos.equipes.map((e) => e.nome));
  const idsEquipe = new Set(fatos.equipes.map((e) => e.constructorId));
  const nomesPiloto = new Set(fatos.titulares.map((t) => t.nome));
  const idsPiloto = new Set(fatos.titulares.map((t) => t.driverId));
  const agulhas = [...new Set([...nomesEquipe, ...idsEquipe, ...nomesPiloto, ...idsPiloto])];
  return {
    agulhas,
    nomesEquipe: nomesEquipe.size,
    idsEquipe: idsEquipe.size,
    nomesPiloto: nomesPiloto.size,
    idsPiloto: idsPiloto.size,
  };
}

const UNIVERSO = carregarUniverso();

/** Contagem total + as 5 agulhas mais presentes (ordem determinística). */
function medirArquivo(caminho: string): { total: number; amostras: string } {
  const texto = readFileSync(caminho, 'utf8');
  let total = 0;
  const presentes: Array<[string, number]> = [];
  for (const agulha of UNIVERSO.agulhas) {
    const n = contarComFronteira(texto, agulha);
    if (n > 0) {
      total += n;
      presentes.push([agulha, n]);
    }
  }
  presentes.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  const amostras = presentes
    .slice(0, 5)
    .map(([a, n]) => `${a}=${n}`)
    .join(' ');
  return { total, amostras };
}

describe('🔒 portão dos nomes reais — o universo', () => {
  it('ANTI-VACUIDADE: o universo tem 105/105 de equipe e 353/353 de piloto', () => {
    // Se o carregamento quebrar e devolver listas vazias, TODA contagem vira 0
    // e o portão passaria por vacuidade, declarando o repositório limpo.
    expect(UNIVERSO.nomesEquipe).toBe(ESPERADO_NOMES_EQUIPE);
    expect(UNIVERSO.idsEquipe).toBe(ESPERADO_IDS_EQUIPE);
    expect(UNIVERSO.nomesPiloto).toBe(ESPERADO_NOMES_PILOTO);
    expect(UNIVERSO.idsPiloto).toBe(ESPERADO_IDS_PILOTO);
  });

  it('a união deduplicada tem 909 agulhas (916 − 7 piloto-que-também-é-construtor)', () => {
    expect(UNIVERSO.agulhas).toHaveLength(ESPERADO_AGULHAS_DEDUPLICADAS);
    for (const repetido of ['brabham', 'mclaren', 'hill', 'prost', 'stewart', 'surtees']) {
      expect(UNIVERSO.agulhas.filter((a) => a === repetido)).toHaveLength(1);
    }
  });
});

describe('🔒 portão dos nomes reais — o contador', () => {
  it('ANTI-VACUIDADE: string suja sintética é detectada com a contagem exata', () => {
    // Se `contarComFronteira` degenerar e devolver 0, a suíte inteira ficaria
    // verde com o repositório sujo. Este caso é o que impede isso.
    const suja = '{"equipe":"Ferrari","piloto":"Ayrton Senna","id":"ferrari-1994-piloto-senna"}';
    expect(contarComFronteira(suja, 'Ferrari')).toBe(1);
    expect(contarComFronteira(suja, 'ferrari')).toBe(1);
    expect(contarComFronteira(suja, 'Ayrton Senna')).toBe(1);
    expect(contarComFronteira(suja, 'senna')).toBe(1);
  });

  it('string LIMPA devolve zero — o contador não acusa sempre', () => {
    const limpa = '{"equipe":"Aurora","piloto":"Nome Fictício","id":"aurora-1994-piloto-ficticio"}';
    for (const agulha of ['Ferrari', 'ferrari', 'Ayrton Senna', 'senna']) {
      expect(contarComFronteira(limpa, agulha)).toBe(0);
    }
  });

  it('a FRONTEIRA é o que separa esta métrica do lixo: `rb` não casa em `Nürburgring`', () => {
    // Sem fronteira, `pistas.json` acusava 4 ids fantasma. Medido em 2026-08-25.
    expect('Nürburgring'.includes('rb')).toBe(true);
    expect(contarComFronteira('{"nome":"Nürburgring"}', 'rb')).toBe(0);
    // e a fronteira NÃO pode ser tão estrita a ponto de perder o caso real:
    expect(contarComFronteira('{"id":"pista-red-bull-ring","x":"rb"}', 'rb')).toBe(1);
  });
});

describe('🔒 portão dos nomes reais — a cerca', () => {
  for (const [relativo, esperado] of BASELINE) {
    it(`${relativo} tem EXATAMENTE ${esperado} ocorrências de nome real`, () => {
      const { total, amostras } = medirArquivo(caminhoDe(relativo));
      expect(
        total,
        [
          `🔴 A contagem de nome real em ${relativo} MUDOU.`,
          `   baseline commitado: ${esperado}`,
          `   medido agora:       ${total}`,
          `   até 5 amostras:     ${amostras}`,
          '',
          '   Se a mudança é INTENCIONAL (um PR da trilha do dataset fictício),',
          '   atualize o BASELINE deste arquivo no MESMO commit que muda o dado.',
          '   Se não é, algum nome real entrou ou saiu sem que ninguém pedisse.',
        ].join('\n'),
      ).toBe(esperado);
    });
  }
});
