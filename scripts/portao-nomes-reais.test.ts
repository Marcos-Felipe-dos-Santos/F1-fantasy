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
 * desenho; ~~quem o anonimiza é o PR 5, na escrita para `src/data/`.~~
 * ~~CORRIGIDO em 2026-08-28: o PR 5 lê o derivado e escreve
 * `equipe-anos.anonimo.json` (gitignorado), com `src/data/` INTOCADO. A cópia
 * manual NÃO morre no PR 5: morre no PR 6.~~
 * ✅ **ESTADO DESDE O PR 6 (2026-08-28):** `anonimizar.ts` publica **direto em
 * `src/data/equipe-anos.json`**; `equipe-anos.anonimo.json` **deixou de
 * existir** e a cópia manual **morreu**. A entrada (`equipe-anos.derivado.json`)
 * segue real por desenho, que é o que este bloco explica.
 * 📌 **O `BASELINE` NÃO se moveu no PR 5** (a lista é fixa e a saída do
 * `anonimizar` não estava nela) **e MOVEU no PR 6**: a linha
 * `src/data/equipe-anos.json` foi a **0** — ⚠️ **não foi "derrubada" da lista**,
 * como a redação anterior dizia; ela continua lá, medindo zero, que é o que faz
 * a cerca seguir viva. Achado da revisão do PR 6.
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
 * ⚠️ **O BUNDLE está FORA, e CONTINUA fora depois do PR 6.** A medição que
 * decide o deploy é sobre `dist/` (contagem nº 5 do inventário) e exige
 * `npm run build` — caro demais para rodar em todo `npm test`.
 * 🔴 **CORRIGIDO em 2026-08-28: esta linha dizia "entra como passo do PR 6", e
 * o que o PR 6 fez foi MEDIR À MÃO** (114 ocorrências no bundle, todas
 * sobre-contagem ou a pista da T2). **Medição manual não é portão: uma
 * regressão futura em `dist/` passa em silêncio.** Cerca automatizada do bundle
 * **continua não existindo**, e dizer o contrário faria a próxima sessão
 * confiar num portão inexistente. Achado da revisão do PR 6.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MÉTODO — VARREDURA DE TEXTO CRU, NUNCA CAMINHADA POR CAMPO.
 *
 * O arquivo é lido como uma string só e cada agulha é contada nele. **Não se
 * percorre a estrutura JSON.** A razão é medida: `scripts/derivar-notas.ts:719`
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
 * driverId real (Felipe Massa) e casa em `peca-amortecedor-massa` (era
 * `peca-amortecedor-massa-renault` antes do PR 3), onde "massa" é a palavra
 * portuguesa. São 2 ocorrências por arquivo de peças — o nome exibido
 * "Amortecedor de massa" e o id. Fica contado. Um portão que sobre-conta é
 * seguro; um que sub-conta mente.
 * 🔑 **Depois do PR 3 elas são as ÚNICAS AGULHAS que sobraram nos arquivos de
 * peças**, ou seja o 2 do baseline é 100% sobre-contagem. **Não se corrige
 * baixando o número:** a linha acima proíbe allowlist, e o dado está no estado
 * que a decisão P pediu.
 * 🔴 **"Portão em 2" NÃO É "peças sem marca", e a diferença é estrutural.**
 * `peca-turbo-modo-quali-bmw` / "Turbo modo-quali BMW anos 80" **ficou fora da
 * decisão P e mantém a marca** — e este portão **não consegue vê-la**: o
 * universo de agulhas traz `BMW Sauber` / `bmw_sauber`, nunca `BMW` sozinho
 * (medido em 2026-08-27 contra `fatos-agregados.json`). **Cegueira do universo,
 * não limpeza do dado.** Quem ler o 2 como "não há mais marca em peça" repete o
 * erro que este arquivo inteiro existe para evitar.
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
 * 🔒 BASELINE COMMITADO — contagem EXATA por arquivo.
 *
 * **Atualizar este bloco é ato deliberado, e é o ponto do portão.** Cada PR da
 * trilha derrubou números daqui: o PR 6 (a troca) derrubou
 * `src/data/equipe-anos.json`; o PR 7 derrubou `equipe-anos.json` da fixture.
 * **Baixar um número sem que o dado tenha mudado é fraudar a medição.**
 * ✅ **A TRILHA ACABOU AQUI: as DUAS linhas que podiam ir a zero foram** — os
 * dois `equipe-anos.json`, o de `src/data/` no PR 6 e o da fixture no PR 7. O que
 * resta são os 6 do piso, e nenhum PR futuro os baixa sem mudar uma DECISÃO —
 * os 4 de `massa` são sobre-contagem sobre dado limpo, e os 2 de `Red Bull
 * Ring` dependem da T2, hoje adiada.
 *
 * 📉 **MOVIDO PELA PRIMEIRA VEZ NO PR 3 (peças despidas + T1), 2026-08-27:**
 * total **9522 → 9486 (−36)**. Quatro linhas mudaram, as outras duas não.
 *
 *   | arquivo            | era | virou | o que saiu                          |
 *   |--------------------|-----|-------|-------------------------------------|
 *   | `pecas.json` (×2)  |  19 |     2 | marca e código de modelo das 10 peças |
 *   | `pistas.json` (×2) |   2 |     1 | `(Gilles Villeneuve)` do Montreal    |
 *
 * 📉 **MOVIDO PELA SEGUNDA VEZ NO PR 6 (A TROCA), 2026-08-28:**
 * total **9486 → 249 (−9237)**. **Uma linha mudou; as outras cinco não.**
 *
 *   | arquivo                     | era  | virou | o que saiu                     |
 *   |-----------------------------|------|-------|--------------------------------|
 *   | `src/data/equipe-anos.json` | 9237 |     0 | o dataset inteiro virou fictício |
 *
 * 🔑 **O ZERO foi PREVISTO antes de ser medido, e a ordem é o que faz a medida
 * valer.** A previsão saiu da mecânica — a agulha exige fronteira
 * não-alfanumérica dos dois lados, e a cerca de quase-marca do PR 4 rejeita
 * coincidência exata — e foi conferida contra a saída do `anonimizar` **antes**
 * de publicar. **Número que só existe depois do fato não pode ser surpreendido.**
 *
 * 📉 **MOVIDO PELA TERCEIRA VEZ NO PR 7 (a fixture), 2026-08-31:**
 * total **249 → 6 (−243). O PISO FOI ATINGIDO.** Uma linha mudou; as outras
 * cinco não.
 *
 *   | arquivo                                       | era | virou | o que saiu        |
 *   |-----------------------------------------------|-----|-------|-------------------|
 *   | `src/fixtures/dataset-semente/equipe-anos.json`| 243 |     0 | a fixture inteira |
 *
 * 🔒 **OS 6 QUE SOBRAM SÃO O PISO, E ELE FOI REGISTRADO ANTES DO PR 7**, a
 * pedido do dev — *"o que sobrar precisa estar explicado, não descoberto
 * depois."* Quebrado por arquivo, medido:
 *
 *   | arquivo                          | conta | natureza                    | PR 7 |
 *   |----------------------------------|-------|-----------------------------|------|
 *   | fixture `equipe-anos.json`       | ~~243~~ **0** | nome real de verdade | ✅ zerado |
 *   | `pecas.json` (×2)                |  2+2  | **sobre-contagem** de `massa` | fica |
 *   | `pistas.json` (×2)               |  1+1  | `Red Bull Ring` — **T2 adiada** | fica |
 *
 * 🔴 **6 NÃO É "o repositório está limpo", e o PR 7 não muda isso.** Este portão
 * mede SEIS ARQUIVOS DE DADOS. Segue fora do escopo: **código-fonte** (`.ts`),
 * o **bundle** (`dist/`), `scripts/derived/` (que É o universo, real por
 * desenho) e — descoberto NESTE PR — **qualquer `.md`**. Ver a nota logo abaixo.
 *
 * 🔴 **PONTO CEGO ACHADO NO PR 7: O PORTÃO NÃO MEDE `.md`, E ISSO CUSTOU CARO
 * JUSTAMENTE AQUI.** `src/fixtures/dataset-semente/README.md` citava
 * `ferrari-2004-piloto-schumacher` e se descrevia como cópia byte-idêntica de
 * `src/data/`. **O `BASELINE` lista só os seis `.json`** e `caminhoDe` resolve
 * por nome de arquivo — nada aqui olharia um `.md`. Ou seja: era possível
 * bater **6** e deixar nome real **no diretório que existe para ser lido com
 * segurança**, que é a única razão de a fixture entrar neste portão.
 * **O README foi consertado no PR 7, à mão. A cegueira continua** — quem
 * acrescentar prosa a `src/data/` ou à fixture não é vigiado por nada.
 *
 * ⚠️ **Os 4 de `massa` são sobre-contagem sobre dado LIMPO** — a peça perdeu a
 * marca no PR 3 e o que resta é `"peca-amortecedor-massa"` / `"Amortecedor de
 * massa"`, a palavra comum colidindo com o `driverId` de Felipe Massa. **O dado
 * está limpo; o número não desce.** Os 2 de `Red Bull Ring` são resíduo REAL, e
 * ficam por DECISÃO (T2), não por impossibilidade — ver a nota abaixo.
 * 🔑 **Registrado ANTES do PR 7 a pedido do dev**, para que o piso seja
 * explicado e não descoberto depois: *"o que sobrar precisa estar explicado, não
 * descoberto depois."*
 *
 * ⚠️ **A fixture entrou no PR 3, não no PR 7 — desvio do `PLANOS_ATIVOS.md`
 * aprovado pelo dev em 2026-08-27.** Motivo: `peca-suspensao-ativa-fw15` é
 * referenciado contra o dataset REAL (`card-peca-cego.test.ts`,
 * `visibilidade.test.ts`) **e** contra a FIXTURE (`corrida.test.ts`); trocar um
 * lado só deixaria duas grafias vivas do mesmo id durante os PRs 3–6. ~~**O PR 7
 * segue dono de `src/fixtures/dataset-semente/equipe-anos.json` (243).**~~
 * ✅ **E FOI: o PR 7 a trocou em 2026-08-31, 243 → 0.** A linha é riscada no
 * lugar porque o "segue dono" está em presente do indicativo e mandaria a
 * próxima sessão procurar trabalho que já foi feito.
 *
 * 🔑 **O 2 que sobra em cada `pecas.json` é 100% sobre-contagem de `massa`** —
 * ver a nota de sobre-contagem acima. O dado está limpo; o número não desce.
 * 🔑 **O 1 que sobra em cada `pistas.json` é a agulha `Red Bull` casando no NOME
 * EXIBIDO `"Red Bull Ring"` — NÃO no id.** Medido: o id é `pista-red-bull-ring`
 * (minúsculo, com hífen) e o `constructorId` é `red_bull` (com sublinhado);
 * `contarComFronteira` é sensível a caixa e nenhum dos dois casa com a agulha
 * `Red Bull`. **A pista inteira está fora da trilha pela decisão T2**
 * (`ESTADO.md` §NOMES FICTÍCIOS), e é por isso que o nome fica.
 * ⚠️ **A razão da T2 — "trocar id de pista muda `seedDaEtapa`, logo é mudança
 * de COMPORTAMENTO" — explica por que o ID não pode mudar, e NÃO explica este
 * 1**, que é nome exibido e poderia mudar sozinho, exatamente como a T1 fez com
 * o Montreal. **Registrado assim de propósito:** a redação anterior desta linha
 * dizia que o 1 vinha do id, e mandaria a próxima sessão concluir que ele é
 * intocável por determinismo. Ele é intocável por DECISÃO, que é outra coisa.
 */
const BASELINE: ReadonlyArray<readonly [string, number]> = [
  ['src/data/equipe-anos.json', 0],
  ['src/data/pecas.json', 2],
  ['src/data/pistas.json', 1],
  ['src/fixtures/dataset-semente/equipe-anos.json', 0],
  ['src/fixtures/dataset-semente/pecas.json', 2],
  ['src/fixtures/dataset-semente/pistas.json', 1],
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
