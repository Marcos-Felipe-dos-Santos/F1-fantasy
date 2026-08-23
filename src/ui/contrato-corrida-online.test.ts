/**
 * 🔴 A GUARDA ESTRUTURAL do PR 2/4 de "corrida online" — a tese é a classe de
 * bug do PR 8.4: duas trilhas de corrida, cada lado correto isoladamente, a
 * composição errada, e `npm test` não pega, porque hoje (determinístico) as
 * duas trilhas dão o mesmo resultado. O jogador assistiria a uma corrida e
 * veria OUTRA na tabela.
 *
 * A defesa: só um lugar computa a corrida online — `corridaDaSala`
 * (`src/ui/corrida-online.ts`), chamada de dentro de `useSalaOnline` — e a
 * MESMA referência alimenta o hash de divergência e a tela. Este arquivo
 * varre o repo pra impedir um segundo caminho.
 *
 * Molde de `contrato-ausente.test.ts` (o precedente do projeto): mesmas
 * funções utilitárias (varredura recursiva, remoção de comentários) pelo
 * mesmo motivo documentado lá — regex ingênuo sobre código com comentários é
 * falso-negativo.
 *
 * 🔴 REVISADO após dois bloqueantes e quatro achados de uma revisão (Opus, com
 * probes empíricos fora do repo — ver HISTORICO):
 *
 * 1. **Bloqueante — lista negra vs. allowlist.** A primeira versão checava
 *    `modo: 'preparar'` só em `FluxoOnline.tsx` e `useSalaOnline.ts` — um
 *    arquivo TERCEIRO (ex.: um `CorridaOnline.tsx` do PR 4) escapava e a
 *    suíte continuava verde. Agora varre TODO `src/ui/**` e exige que o
 *    CONJUNTO seja exatamente `{App.tsx, FluxoCampeonato.tsx}` — os dois
 *    únicos chamadores offline legítimos.
 * 2. **Bloqueante — allowlist de ARQUIVOS, nunca de QUANTIDADE.** Nada
 *    impedia `useSalaOnline.ts` de computar a corrida duas vezes (uma pro
 *    `useMemo` da tela, outra dentro do efeito de hash) — mesmo arquivo,
 *    mesma função, duas referências, hash de uma e tela de outra. Agora há
 *    contagem EXATA: `corridaDaSala` uma vez em `useSalaOnline.ts`,
 *    `prepararCorrida` uma vez em `corrida-online.ts`.
 * 3. **Cego a alias e indireção.** `chamadasDe` exige `nomeFn(` — não pega
 *    `const prep = prepararCorrida; prep(d)`, `import {x as prep}`,
 *    `obj['prepararCorrida'](d)` nem `{prep: prepararCorrida}`. A allowlist
 *    de QUEM PODE REFERENCIAR cada função (não só chamar) usa `referenciaDe`,
 *    que não exige parêntese — pega o identificador em QUALQUER posição
 *    (import, alias, valor de objeto, string de acesso computado), porque
 *    todas essas formas preservam o TOKEN original em algum lugar do texto.
 * 4. **`/\*` num literal engole código real.** Mesma família do
 *    `contrato-ausente.test.ts`. As contagens EXATAS (bloqueante 2) usam o
 *    MÁXIMO entre a fonte CRUA e a sem-comentários — se o strip comer um
 *    trecho real por engano, a fonte crua ainda enxerga.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(AQUI, '..');
/** Raiz do projeto (duas pastas acima de `src/ui`) — base de `relativo`, ver o item 8 da revisão. */
const RAIZ_PROJETO = join(SRC_DIR, '..');

/** Tira comentários da fonte antes de procurar (mesmo motivo de `contrato-ausente.test.ts`). */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\r\n]*/g, '$1');
}

/** Anda na árvore inteira, não só no primeiro nível. */
function tsRecursivo(dir: string, incluirTestes: boolean): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return tsRecursivo(caminho, incluirTestes);
    if (!/\.tsx?$/.test(nome)) return [];
    if (!incluirTestes && /\.test\.tsx?$/.test(nome)) return [];
    return [caminho];
  });
}

/**
 * Todo `.ts`/`.tsx` de PRODUÇÃO (sem teste) de `engine/`, `net/` e `ui/` —
 * ESCOPO REAL da varredura, não o repositório inteiro: `scripts/` e `party/`
 * ficam de fora (o alvo aqui são `prepararCorrida`/`simularCorrida`/
 * `simularQuali`/`corridaDaSala`/`pistaSorteada`, e nenhuma delas é chamável
 * dali sem cruzar `src/`, que já está coberto).
 */
function arquivosDeProducao(): string[] {
  return ['engine', 'net', 'ui'].flatMap((pasta) => tsRecursivo(join(SRC_DIR, pasta), false));
}

function arquivosDaUi(): string[] {
  return tsRecursivo(AQUI, false);
}

/**
 * `E:\...\F1 fantasy\src\ui\corrida-online.ts` → `src/ui/corrida-online.ts`.
 *
 * 🔴 Item 8 da revisão: a versão anterior usava `caminho.indexOf('src')`, que
 * sai errado num checkout cujo CAMINHO ABSOLUTO contenha a substring "src"
 * antes da pasta do projeto (ex.: `C:\src\projetos\F1 fantasy\...` — o
 * `indexOf` acha o "src" de `C:\src\` primeiro). Fatiar por
 * `RAIZ_PROJETO.length` não depende do conteúdo do caminho, só da posição.
 *
 * A normalização de separador é `replace(/\\/g, '/')` e **não** `split(sep)`:
 * este projeto não tem `@types/node` instalado (as tipagens de `node:path`
 * que chegam por tabela vêm do vitest e expõem só `dirname`/`join`), então
 * importar `sep` reprova `tsc --noEmit` — medido. Trocar barra invertida por
 * barra é equivalente no Windows e no-op no POSIX, onde não há `\` em caminho.
 */
const relativo = (caminho: string): string =>
  caminho.slice(RAIZ_PROJETO.length + 1).replace(/\\/g, '/');

/**
 * Quantas vezes `nomeFn(` aparece como CHAMADA, excluindo a própria
 * declaração (`function nomeFn(`, `export function nomeFn(`). Sem essa
 * exclusão, `corrida.ts`/`quali.ts` (onde `simularCorrida`/`simularQuali` são
 * DEFINIDAS) reprovariam a varredura por conterem a própria assinatura.
 *
 * Usada só para as contagens EXATAS (bloqueante 2) — exige parêntese, então
 * NÃO pega alias/indireção. Para "quem pode ao menos REFERENCIAR a função",
 * ver `referenciaDe` abaixo.
 */
function chamadasDe(fonte: string, nomeFn: string): number {
  const marca = new RegExp(`(?<!function\\s)\\b${nomeFn}\\s*\\(`, 'g');
  return (fonte.match(marca) ?? []).length;
}

/**
 * `chamadasDe`, mas pelo MÁXIMO entre a fonte crua e a sem-comentários
 * (achado 4 da revisão): se um literal contendo `/\*` em QUALQUER lugar do
 * arquivo fizer `semComentarios` engolir um trecho de código real por
 * engano, a contagem sobre a fonte crua ainda vê a chamada verdadeira — o
 * máximo nunca fica abaixo do que existe de fato.
 *
 * Só usada nas DUAS contagens exatas do bloqueante 2, cujos arquivos-alvo
 * foram conferidos manualmente (`grep`) pra não ter nenhuma OUTRA menção com
 * parêntese em comentário — nesses dois arquivos, fonte crua e
 * sem-comentários concordam hoje; o `max` é rede de segurança pro futuro.
 */
function chamadasMax(fonteCrua: string, nomeFn: string): number {
  return Math.max(chamadasDe(fonteCrua, nomeFn), chamadasDe(semComentarios(fonteCrua), nomeFn));
}

/**
 * O identificador `nomeFn` aparece em QUALQUER posição do texto — não exige
 * parêntese logo depois. Pega chamada direta, mas TAMBÉM:
 * - alias de variável: `const prep = prepararCorrida;`
 * - import renomeado: `import { prepararCorrida as prep } from '...'` (o
 *   especificador guarda o nome ORIGINAL antes do `as`, então o token
 *   sobrevive ao alias);
 * - acesso computado por string: `obj['prepararCorrida'](d)` (a string
 *   literal contém o token; `\b` marca fronteira em torno de aspas também);
 * - alias de propriedade de objeto: `{ prep: prepararCorrida }`.
 *
 * Aplicada sobre a fonte SEM COMENTÁRIOS: um docblock que MENCIONA o nome da
 * função (há vários neste PR, incluindo este arquivo) não conta como
 * referência de código — só comentário, que não executa. Excluir comentário
 * é o que permite usar esta função pra "quem pode referenciar" sem forçar
 * todo arquivo que documenta a costura a entrar na allowlist.
 *
 * Ainda exclui a própria declaração (`function nomeFn(`), pelo mesmo motivo
 * de `chamadasDe`.
 *
 * 🔴 Também exclui `nomeFn` seguido de `:` — o IDIOMA deste codebase pra
 * mensagem de erro autorreferente, presente em TODA função destas:
 * `throw new Error('prepararCorrida: o draft precisa...')`,
 * `throw new Error('simularCorrida: jogadorId duplicado...')` etc. Sem essa
 * exclusão, `corrida.ts`/`quali.ts`/`pista-sorteada.ts`/`fluxo-corrida.ts` —
 * os arquivos que DECLARAM as funções — apareceriam como "referenciadores"
 * de si mesmos por causa da própria mensagem de erro, não por chamar/aliasar
 * nada. Nenhuma forma real de alias/indireção termina com `nomeFn` seguido
 * imediatamente de `:` (chamada usa `(`, alias usa `;`/`,`/`}`/espaço/`as`).
 */
function referenciaDe(fonteSemComentarios: string, nomeFn: string): boolean {
  const marca = new RegExp(`(?<!function\\s)\\b${nomeFn}\\b(?!:)`);
  return marca.test(fonteSemComentarios);
}

/**
 * Únicos arquivos de PRODUÇÃO permitidos a REFERENCIAR cada função, por nome
 * — levantado a partir do código real (não do plano):
 *
 * - `simularCorrida`/`simularQuali` já eram chamadas de produção por
 *   `src/engine/campeonato.ts` (`simularEtapa`, pré-simulação das etapas do
 *   campeonato OFFLINE) antes deste PR — não é caminho novo da corrida
 *   online, é uso pré-existente que a guarda não pode reprovar.
 * - `corridaDaSala` não estava na lista do plano original, mas é o CORAÇÃO
 *   da tese — "só um lugar computa a corrida online" só vale se só
 *   `useSalaOnline.ts` a referenciar.
 * - `pistaSorteada` entrou na revisão (achado 9): o PR 4 poderia re-derivar
 *   a pista pra um cabeçalho com a seed errada e mostrar pista diferente da
 *   hasheada — mesma família de risco, outra porta. Só `corrida-online.ts`
 *   (dentro de `corridaDaSala`) pode chamá-la.
 * - `corridaDaSala` ganhou um SEGUNDO sítio no 3.5.3: `corrida-online.ts`,
 *   onde `etapasDaSala` a chama uma vez por etapa aberta. **Não é
 *   afrouxamento** — são dois sítios com dono declarado (a corrida avulsa no
 *   hook, as etapas no módulo puro), cada um travado em UMA chamada exata
 *   pelo bloqueante 2 abaixo. Um terceiro arquivo continua reprovando.
 * - 🔴 **`etapasDaSala` e `classificacaoDaSala` entraram por BLOQUEANTE da
 *   revisão (C1), e a lacuna foi MEDIDA:** com elas fora da allowlist, um
 *   painel do 3.5.4 chamando `etapasDaSala` direto deixava esta cerca
 *   **verde, 26/26** — nenhum dos nomes vigiados aparece, porque todos ficam
 *   atrás da indireção. Ponto de entrada público que computa corrida online
 *   entra aqui **no PR que o cria**, nunca no seguinte.
 * - 🔒 **`seedDaEtapa` entrou no 3.5.3 — cerca NOVA, não relaxamento de
 *   nenhuma.** ⚠️ **O que ela mede, dito com precisão** (aviso A4 da revisão;
 *   a redação anterior afirmava mais): ela garante **UMA COSTURA SÓ** entre a
 *   seed publicada e a simulação — ninguém além destes arquivos chama a
 *   função. Ela **NÃO** pega quem derivar por fora sem citá-la: um
 *   `deriveSeed(seed, \`camp:${pistaId}:online\`)` num arquivo novo passa
 *   aqui **e** no registro de namespaces (o prefixo capturado é `camp`, que
 *   está registrado). Contra ESSE caminho quem defende é o teste de
 *   conformidade bit a bit contra `simularEtapa`, não esta varredura.
 *   Os dois primeiros arquivos
 *   são pré-existentes (medidos por `grep`, não herdados do plano): a engine
 *   a declara e a usa em `simularCampeonato`, e `FluxoCampeonato.tsx` a chama
 *   na etapa offline. As menções em `fluxo-corrida.ts`, `persistencia.ts` e
 *   `net/sala.ts` são só COMENTÁRIO, e `semComentarios` as remove.
 * - 🔴 **`namespaces-seed.ts` entrou na lista por MEDIÇÃO, contrariando o que
 *   este bloco dizia antes de a cerca rodar.** O `grep` mostrava a linha 36
 *   e ela foi classificada como "registro, não código"; a cerca discordou. O
 *   nome está dentro de uma STRING (`dono: '… (seedDaEtapa)'`), e
 *   `semComentarios` remove comentário, não literal — `referenciaDe` não
 *   distingue string de código, e não deveria mesmo: um acesso computado
 *   `obj['seedDaEtapa']` também mora numa string, e é indireção de verdade.
 *   A entrada é o registro do DONO do rótulo `camp:`, o oposto de um segundo
 *   caminho de derivação. **Fica listada; o preço é uma linha aqui, e a
 *   alternativa — editar a string do registro para escapar da cerca — seria
 *   mexer em produção para a conveniência do teste.**
 */
const PERMITIDOS: Record<string, string[]> = {
  prepararCorrida: ['src/ui/useCorrida.ts', 'src/ui/corrida-online.ts'],
  simularCorrida: ['src/engine/campeonato.ts', 'src/ui/fluxo-corrida.ts'],
  simularQuali: ['src/engine/campeonato.ts', 'src/ui/fluxo-corrida.ts'],
  corridaDaSala: ['src/ui/corrida-online.ts', 'src/ui/useSalaOnline.ts'],
  pistaSorteada: ['src/ui/corrida-online.ts'],
  seedDaEtapa: [
    'src/engine/campeonato.ts',
    'src/engine/namespaces-seed.ts',
    'src/ui/FluxoCampeonato.tsx',
    'src/ui/corrida-online.ts',
  ],
  etapasDaSala: ['src/ui/useSalaOnline.ts'],
  classificacaoDaSala: ['src/ui/useSalaOnline.ts'],
  // 🔴 **A METADE DO CALENDÁRIO, que a primeira rodada de cercas esqueceu**
  // (aviso A2 da segunda passada). O docblock de `etapasDaSala` declara que a
  // etapa k é o PAR `(seedsAbertas[k], calendario[k])` — o PR cercou a metade
  // da SEED (`seedDaEtapa`) e deixou a do CALENDÁRIO livre.
  //
  // Por que a lacuna é real e não simetria estética: `etapasDaSala` expõe **só
  // as etapas abertas**, e o 3.5.4 precisa do calendário INTEIRO (inclusive as
  // pistas fechadas) para desenhar o `PainelCalendario` — lista que **não sai
  // do hook**. A saída óbvia é chamar `calendarioSorteado` dentro do painel; se
  // ele passar `'completa'`, ou pegar a seed de outra fonte, **o calendário
  // exibido diverge das pistas efetivamente corridas e NADA acusa**: o hash
  // cobre a corrida, não o calendário, e a conformidade contra `simularEtapa`
  // não olha painel nenhum. Mesmo argumento que pôs `pistaSorteada` aqui.
  //
  // ⚠️ **Esta entrada é FROUXA e é honesto dizer:** são 4 arquivos
  // pré-existentes. O que ela pega é o cenário que importa — **arquivo NOVO**
  // do 3.5.4 derivando calendário por conta própria.
  //
  // 🔑 **A lista saiu da CERCA, não de `grep`, e a diferença apareceu:** um
  // `grep -l` acusa também `pista-sorteada.ts` e dois arquivos de `src/net/`,
  // mas nos três a menção é só COMENTÁRIO, e `semComentarios` a remove. Foi o
  // teste que deu a lista certa — a mesma lição do 3.5.3 sobre
  // `namespaces-seed.ts`, agora na direção oposta.
  calendarioSorteado: [
    'src/engine/campeonato.ts',
    'src/ui/App.tsx',
    'src/ui/corrida-online.ts',
    'src/ui/fluxo-campeonato.ts',
  ],
};

describe('a varredura enxerga os arquivos de verdade (anti-vacuidade)', () => {
  it('encontra arquivos de produção suficientes pra não estar vazia', () => {
    const arquivos = arquivosDeProducao();
    expect(arquivos.length).toBeGreaterThan(40);
    expect(arquivos.some((a) => a.endsWith('FluxoOnline.tsx'))).toBe(true);
    expect(arquivos.some((a) => a.endsWith('useSalaOnline.ts'))).toBe(true);
    expect(arquivos.some((a) => a.endsWith('campeonato.ts'))).toBe(true);
  });

  it('`chamadasDe` encontra as chamadas LEGÍTIMAS nos arquivos da allowlist', () => {
    const useCorridaFonte = readFileSync(join(AQUI, 'useCorrida.ts'), 'utf8');
    expect(chamadasDe(useCorridaFonte, 'prepararCorrida')).toBeGreaterThan(0);

    const fluxoCorridaFonte = readFileSync(join(AQUI, 'fluxo-corrida.ts'), 'utf8');
    expect(chamadasDe(fluxoCorridaFonte, 'simularQuali')).toBeGreaterThan(0);
    expect(chamadasDe(fluxoCorridaFonte, 'simularCorrida')).toBeGreaterThan(0);

    const corridaOnlineFonte = readFileSync(join(AQUI, 'corrida-online.ts'), 'utf8');
    expect(chamadasDe(corridaOnlineFonte, 'prepararCorrida')).toBeGreaterThan(0);
    expect(chamadasDe(corridaOnlineFonte, 'pistaSorteada')).toBeGreaterThan(0);

    const useSalaOnlineFonte = readFileSync(join(AQUI, 'useSalaOnline.ts'), 'utf8');
    expect(chamadasDe(useSalaOnlineFonte, 'corridaDaSala')).toBeGreaterThan(0);

    // PR 3.5.3: a cerca nova de `seedDaEtapa` tem que enxergar os dois sítios
    // legítimos, senão ela passaria por não encontrar nada em lugar nenhum.
    expect(chamadasDe(corridaOnlineFonte, 'seedDaEtapa')).toBeGreaterThan(0);
    const fluxoCampeonatoFonte = readFileSync(join(AQUI, 'FluxoCampeonato.tsx'), 'utf8');
    expect(chamadasDe(fluxoCampeonatoFonte, 'seedDaEtapa')).toBeGreaterThan(0);
  });

  it('`chamadasDe` NÃO conta a própria declaração da função (anti-falso-positivo)', () => {
    // `export function simularCorrida(` não é uma CHAMADA de simularCorrida.
    // Sem a exclusão, `src/engine/corrida.ts` (onde ela é definida) reprovaria
    // a varredura sozinho, pra sempre.
    expect(chamadasDe('export function simularCorrida(\n  dataset', 'simularCorrida')).toBe(0);
    expect(chamadasDe('  simularCorrida(dataset, loadouts)', 'simularCorrida')).toBe(1);
  });

  it('`relativo` não depende de "src" aparecer só uma vez no caminho (achado 8)', () => {
    // Simula um checkout em `.../src/projetos/F1 fantasy/...`: se `relativo`
    // usasse `indexOf('src')`, acharia o "src" ERRADO (o de fora do projeto)
    // e devolveria um caminho relativo furado. Fatiar por `RAIZ_PROJETO.length`
    // é imune a isso porque não procura substring nenhuma.
    const comSrcDuplicado = join(RAIZ_PROJETO, 'src', 'ui', 'corrida-online.ts');
    expect(relativo(comSrcDuplicado)).toBe('src/ui/corrida-online.ts');
  });

  it('`referenciaDe` pega alias, import renomeado, acesso computado e alias de objeto (achado 3)', () => {
    // Os quatro exemplos exatos medidos na revisão — nenhum tem `nomeFn(`
    // logo em seguida, então `chamadasDe` não pegaria nenhum deles.
    expect(referenciaDe('const prep = prepararCorrida;\nprep(d);', 'prepararCorrida')).toBe(true);
    expect(
      referenciaDe(`import { prepararCorrida as prep } from './fluxo-corrida';\nprep(d);`, 'prepararCorrida'),
    ).toBe(true);
    expect(referenciaDe(`fc['prepararCorrida'](d);`, 'prepararCorrida')).toBe(true);
    expect(
      referenciaDe('const t = { prep: prepararCorrida };\nt.prep(d);', 'prepararCorrida'),
    ).toBe(true);
  });

  it('`referenciaDe` NÃO conta a própria declaração, e NÃO conta menção em comentário (anti-falso-positivo)', () => {
    expect(referenciaDe('export function prepararCorrida(\n  dataset', 'prepararCorrida')).toBe(false);
    // Comentário já removido antes de chegar aqui — `referenciaDe` não sabe
    // que era comentário, só que o texto não contém mais o token.
    expect(
      referenciaDe(semComentarios('/** chama `prepararCorrida` internamente */\nconst x = 1;'), 'prepararCorrida'),
    ).toBe(false);
  });

  it('`referenciaDe` NÃO conta o idioma de mensagem de erro autorreferente (anti-falso-positivo, medido)', () => {
    // Achado real ao rodar contra o repo: `corrida.ts`, `quali.ts`,
    // `pista-sorteada.ts` e `fluxo-corrida.ts` usam `throw new Error('nomeFn:
    // mensagem')` dentro da PRÓPRIA função — sem esta exclusão, cada um
    // apareceria como "referenciador" de si mesmo, e a allowlist nunca
    // fecharia porque o arquivo que DEFINE a função sempre bateria.
    expect(
      referenciaDe(`throw new Error('prepararCorrida: o draft precisa estar concluído');`, 'prepararCorrida'),
    ).toBe(false);
    expect(
      referenciaDe('throw new Error(`simularCorrida: jogadorId duplicado "${x}"`);', 'simularCorrida'),
    ).toBe(false);
    // Mas uma chamada de verdade logo depois de um `:` de rótulo continua
    // contando — a exclusão é só pro padrão `nomeFn:` GRUDADO.
    expect(referenciaDe('const resultado = prepararCorrida(dataset, state);', 'prepararCorrida')).toBe(
      true,
    );
  });
});

describe('ALLOWLIST em src/{engine,net,ui}: quem pode REFERENCIAR cada função', () => {
  it.each(Object.keys(PERMITIDOS))('só os arquivos aprovados referenciam `%s`', (nomeFn) => {
    const permitidos = [...PERMITIDOS[nomeFn]].sort();
    const referenciadores = arquivosDeProducao()
      .filter((arquivo) => referenciaDe(semComentarios(readFileSync(arquivo, 'utf8')), nomeFn))
      .map(relativo)
      .sort();
    expect(
      referenciadores,
      `"${nomeFn}" só pode ser referenciada (chamada, importada com alias, ou indireta) dos arquivos da allowlist`,
    ).toEqual(permitidos);
  });

  it('🔴 SABOTAGEM: um arquivo terceiro que referencia `prepararCorrida` por ALIAS reprova a guarda', () => {
    // Prova viva de que a allowlist pega indireção, não só chamada direta —
    // exatamente o cenário que `chamadasDe` (exige parêntese) deixaria passar.
    const sabotagem = join(AQUI, '__sabotagem_alias.ts');
    writeFileSync(
      sabotagem,
      [
        "import { prepararCorrida as prep } from './fluxo-corrida';",
        "import { dataset } from './dataset-app';",
        "export function fuga(state: import('../engine/types').DraftState) {",
        '  return prep(dataset, state);',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    try {
      const referenciadores = arquivosDeProducao()
        .filter((arquivo) => referenciaDe(semComentarios(readFileSync(arquivo, 'utf8')), 'prepararCorrida'))
        .map(relativo)
        .sort();
      expect(referenciadores).not.toEqual([...PERMITIDOS.prepararCorrida].sort());
      expect(referenciadores).toContain('src/ui/__sabotagem_alias.ts');
    } finally {
      unlinkSync(sabotagem);
    }
  });

  it('🔴 SABOTAGEM: o arquivo NOVO do 3.5.4 que deriva as etapas por conta própria reprova (PR 3.5.3)', () => {
    // 🔴 **BLOQUEANTE C1 DA REVISÃO, e ele era real — medido, não lido.** A
    // primeira versão deste PR pôs `etapasDaSala`/`classificacaoDaSala` em
    // produção SEM entrada na allowlist. Medido com um `PainelFuga.tsx`
    // sintético na árvore chamando `etapasDaSala`: esta cerca ficava
    // **VERDE, 26/26** — o arquivo não referencia nenhum dos nomes vigiados,
    // porque todos ficam ATRÁS da indireção. Era o cenário literal da
    // sabotagem `__sabotagem_corrida_dupla` entrando por uma porta nova:
    // duas listas de etapas com referências diferentes, a tela lendo uma e o
    // atestado a outra — a classe de bug do 8.4, que é a tese do arquivo.
    //
    // 🔒 **Cerca criada no MESMO PR da tentação, de propósito.** O 3.5.4 é
    // quem vai desenhar a tabela e o calendário, e a tentação exata é chamar
    // `etapasDaSala` direto no painel em vez de receber a lista já computada
    // por `useSalaOnline`. Escrita depois, seria moldada pela tentação.
    //
    // 🔑 **Um arquivo só para as TRÊS cercas novas, e isso não é economia de
    // digitação:** cada sabotagem que grava em `src/ui/` abre uma janela em
    // que outra suíte varrendo a mesma árvore em paralelo pode falhar. A
    // janela é PRÉ-EXISTENTE e está medida (ver a dívida registrada no
    // `ESTADO.md`); somar um arquivo por cerca a alargaria de graça.
    const sabotagem = join(AQUI, '__sabotagem_etapas_dupla.tsx');
    writeFileSync(
      sabotagem,
      [
        "import { classificacaoDaSala, etapasDaSala } from './corrida-online';",
        "import { seedDaEtapa } from '../engine/campeonato';",
        "import { dataset } from './dataset-app';",
        'export function PainelFuga({ draft, seedCal, abertas }: { draft: any; seedCal: number; abertas: number[] }) {',
        '  const etapas = etapasDaSala(dataset, draft, seedCal, abertas);',
        '  const tabela = classificacaoDaSala(etapas, draft);',
        '  return <p>{tabela.length + seedDaEtapa(seedCal, "x")}</p>;',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    // 🔴 **UMA varredura só, e o arquivo sai do disco IMEDIATAMENTE depois.**
    // A primeira versão deste teste varria a árvore SEIS vezes (uma por
    // asserção) com o arquivo de sabotagem em disco, e isso derrubou o
    // `npm test`: `contrato-ausente.test.ts` percorre `src/ui/` com
    // `readdirSync`/`statSync` em paralelo, e um arquivo que some no meio do
    // passeio faz o `statSync` estourar. Foi observado como **2 testes
    // vermelhos em `contrato-ausente.test.ts`**, num PR que não toca nada do
    // ausente. Ler o disco uma vez e assertar em memória fecha a janela para
    // o tamanho das outras sabotagens.
    let fontes: { caminho: string; semCom: string }[];
    try {
      fontes = arquivosDeProducao().map((arquivo) => ({
        caminho: relativo(arquivo),
        semCom: semComentarios(readFileSync(arquivo, 'utf8')),
      }));
    } finally {
      unlinkSync(sabotagem);
    }

    const referenciadoresDe = (nomeFn: string): string[] =>
      fontes
        .filter(({ semCom }) => referenciaDe(semCom, nomeFn))
        .map(({ caminho }) => caminho)
        .sort();

    for (const nomeFn of ['etapasDaSala', 'classificacaoDaSala', 'seedDaEtapa']) {
      expect(
        referenciadoresDe(nomeFn),
        `a cerca de "${nomeFn}" não pegou o arquivo de fuga — é o bloqueante C1 voltando`,
      ).not.toEqual([...PERMITIDOS[nomeFn]].sort());
      expect(referenciadoresDe(nomeFn)).toContain('src/ui/__sabotagem_etapas_dupla.tsx');
    }
  });

  it('🔴 SABOTAGEM: um arquivo NOVO do PR 4 que computa a corrida por conta própria reprova', () => {
    // O cenário LITERAL que o dev nomeou ao confirmar o achado da revisão:
    // "um arquivo novo no PR 4 passaria batido". O PR 4 é a UI da corrida
    // online, e a tentação exata é um `CorridaOnline.tsx` que chama
    // `corridaDaSala` ele mesmo em vez de receber a referência já computada
    // por `useSalaOnline` — segunda trilha, hash de uma e tela de outra,
    // suíte verde. Esta sabotagem prova que a allowlist reprova o arquivo
    // novo SEM precisar conhecer o nome dele de antemão.
    const sabotagem = join(AQUI, '__sabotagem_corrida_dupla.tsx');
    writeFileSync(
      sabotagem,
      [
        "import { corridaDaSala } from './corrida-online';",
        "import { dataset } from './dataset-app';",
        'export function CorridaOnlineFuga({ draft, seedCorrida }: { draft: any; seedCorrida: number }) {',
        '  const corrida = corridaDaSala(dataset, draft, seedCorrida);',
        '  return <p>{corrida.pistaId}</p>;',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    try {
      const referenciadores = arquivosDeProducao()
        .filter((arquivo) => referenciaDe(semComentarios(readFileSync(arquivo, 'utf8')), 'corridaDaSala'))
        .map(relativo)
        .sort();
      expect(referenciadores).not.toEqual([...PERMITIDOS.corridaDaSala].sort());
      expect(referenciadores).toContain('src/ui/__sabotagem_corrida_dupla.tsx');
    } finally {
      unlinkSync(sabotagem);
    }
  });
});

describe('BLOQUEANTE 1 (allowlist, não lista negra): quem pode preparar a corrida OFFLINE', () => {
  /**
   * `modo: 'preparar'` só é válido nos DOIS chamadores offline. Varre
   * `src/ui/**` INTEIRO (não uma lista de dois nomes fixos) — um arquivo
   * NOVO com `modo: 'preparar'` reprova por padrão, sem precisar saber o
   * nome dele de antemão.
   *
   * O padrão exige VÍRGULA logo após `'preparar'` — é o que distingue o
   * USO (`{ modo: 'preparar', pistaId }`, sempre seguido de mais campos, daí
   * a vírgula) da DECLARAÇÃO DE TIPO em `useCorrida.ts`
   * (`{ modo: 'preparar'; pistaId: string; seed?: number }`, que usa `;`
   * como separador de membro de tipo). Sem essa distinção, o próprio arquivo
   * que DEFINE `FonteDaCorrida` apareceria como "violação".
   *
   * Checa RAW e SEM-COMENTÁRIOS, com OR entre os dois (achado 4: a defesa
   * contra `/\*` engolindo texto tem que ir na direção que nunca PERDE uma
   * violação — então basta aparecer em QUALQUER um dos dois pra contar).
   */
  const PADRAO_USO = /modo\s*:\s*['"]preparar['"]\s*,/;

  function arquivosComModoPreparar(): string[] {
    return arquivosDaUi()
      .filter((arquivo) => {
        const crua = readFileSync(arquivo, 'utf8');
        return PADRAO_USO.test(crua) || PADRAO_USO.test(semComentarios(crua));
      })
      .map(relativo)
      .sort();
  }

  it('o conjunto é EXATAMENTE {App.tsx, FluxoCampeonato.tsx} — nada mais, nada menos', () => {
    expect(arquivosComModoPreparar()).toEqual(['src/ui/App.tsx', 'src/ui/FluxoCampeonato.tsx']);
  });

  it('🔴 SABOTAGEM: um arquivo terceiro com `modo: \'preparar\'` reprova', () => {
    // O cenário nomeado na revisão: um `CorridaOnline.tsx` do PR 4 preparando
    // a corrida por conta própria, em vez de receber `{ modo: 'pronta' }`.
    const sabotagem = join(AQUI, '__sabotagem_modo_preparar.tsx');
    writeFileSync(
      sabotagem,
      [
        "import { FluxoCorrida } from './FluxoCorrida';",
        'export function Fuga({ state, pistaId, seed }: { state: any; pistaId: string; seed: number }) {',
        "  return <FluxoCorrida state={state} fonte={{ modo: 'preparar', pistaId, seed }} onReiniciar={() => {}} />;",
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    try {
      expect(arquivosComModoPreparar()).not.toEqual(['src/ui/App.tsx', 'src/ui/FluxoCampeonato.tsx']);
      expect(arquivosComModoPreparar()).toContain('src/ui/__sabotagem_modo_preparar.tsx');
    } finally {
      unlinkSync(sabotagem);
    }
  });

  it('a declaração de tipo em `useCorrida.ts` NÃO conta como uso (separador `;`, não `,`)', () => {
    // Anti-falso-positivo: se este teste falhasse, o arquivo que DEFINE
    // `FonteDaCorrida` seria acusado de violar a própria regra que declara.
    expect(arquivosComModoPreparar()).not.toContain('src/ui/useCorrida.ts');
  });
});

describe('BLOQUEANTE 2: contagem EXATA — nunca duas computações no mesmo arquivo', () => {
  it('`corridaDaSala` é chamada exatamente 1 vez em `useSalaOnline.ts`', () => {
    const fonte = readFileSync(join(AQUI, 'useSalaOnline.ts'), 'utf8');
    expect(
      chamadasMax(fonte, 'corridaDaSala'),
      'duas chamadas nesse arquivo = duas computações independentes da corrida online — a tese do PR morre em silêncio',
    ).toBe(1);
  });

  it('`prepararCorrida` é chamada exatamente 1 vez em `corrida-online.ts`', () => {
    const fonte = readFileSync(join(AQUI, 'corrida-online.ts'), 'utf8');
    expect(chamadasMax(fonte, 'prepararCorrida')).toBe(1);
  });

  it('`corridaDaSala` é chamada exatamente 1 vez em `corrida-online.ts` (PR 3.5.3)', () => {
    // O sítio das ETAPAS, dentro de `etapasDaSala`. A allowlist acima permite o
    // arquivo; esta contagem impede que ele ganhe uma SEGUNDA computação — por
    // exemplo, um ramo "recomputar a etapa corrente" ao lado do `map`, que
    // devolveria uma referência diferente da que entrou na lista e da que o
    // hash vai atestar no 3.5.4. Mesmo defeito do bloqueante 2, uma porta
    // adiante — o mesmo raciocínio que trouxe `useCorrida.ts` pra cá.
    const fonte = readFileSync(join(AQUI, 'corrida-online.ts'), 'utf8');
    expect(
      chamadasMax(fonte, 'corridaDaSala'),
      'só `etapasDaSala` pode computar etapa aqui, e uma vez só (dentro do `map`)',
    ).toBe(1);
  });

  it('`etapasDaSala` e `classificacaoDaSala` são chamadas exatamente 1 vez em `useSalaOnline.ts`', () => {
    // 🔴 **O conserto do bloqueante C1 fechou QUEM chama, e não QUANTAS VEZES —
    // e a allowlist, sozinha, nunca fechou a segunda pergunta.** Este arquivo
    // já documenta essa distinção para `useCorrida.ts`, logo abaixo; aqui ela
    // vale para a superfície NOVA do 3.5.3.
    //
    // Modo de falha concreto, e é a tentação óbvia do 3.5.4: um segundo
    // `useMemo` "da etapa corrente" no mesmo hook chama `etapasDaSala` de novo
    // e devolve um array com conteúdo IDÊNTICO e REFERÊNCIA diferente. A
    // allowlist passa (mesmo arquivo aprovado), o typecheck passa, e a tela
    // renderiza uma lista enquanto o atestado de hash carrega a outra — a
    // classe de bug do 8.4, entrando pelo arquivo que a cerca já aprovou.
    const fonte = readFileSync(join(AQUI, 'useSalaOnline.ts'), 'utf8');
    expect(
      chamadasMax(fonte, 'etapasDaSala'),
      'uma segunda derivação das etapas neste arquivo = duas listas com referências diferentes; a tela lê uma e o hash atesta a outra',
    ).toBe(1);
    expect(chamadasMax(fonte, 'classificacaoDaSala')).toBe(1);
  });

  it('🔴 SABOTAGEM: duplicar a chamada de `etapasDaSala` em `useSalaOnline.ts` reprova', () => {
    // Em memória, como as demais sabotagens de contagem.
    const original = readFileSync(join(AQUI, 'useSalaOnline.ts'), 'utf8');
    const sabotado = original.replace(
      'return etapasDaSala(',
      'return etapasDaSala(dataset, cliente.draft, null, []) ?? etapasDaSala(',
    );
    expect(sabotado, 'a substituição de texto não encontrou o alvo — o teste não provaria nada').not.toBe(
      original,
    );
    expect(chamadasMax(sabotado, 'etapasDaSala')).not.toBe(1);
  });

  it('🔴 SABOTAGEM: duplicar a chamada de `classificacaoDaSala` em `useSalaOnline.ts` reprova', () => {
    // O par da sabotagem acima — a contagem de `classificacaoDaSala` tinha
    // asserção e não tinha demonstração (sugestão da segunda passada).
    const original = readFileSync(join(AQUI, 'useSalaOnline.ts'), 'utf8');
    const sabotado = original.replace(
      '? [] : classificacaoDaSala(etapas, cliente.draft)),',
      '? [] : classificacaoDaSala(etapas, cliente.draft) ?? classificacaoDaSala(etapas, cliente.draft)),',
    );
    expect(sabotado, 'a substituição de texto não encontrou o alvo — o teste não provaria nada').not.toBe(
      original,
    );
    expect(chamadasMax(sabotado, 'classificacaoDaSala')).not.toBe(1);
  });

  it('🔴 SABOTAGEM: duplicar a chamada de `corridaDaSala` em `corrida-online.ts` reprova', () => {
    // Em memória, pelo mesmo motivo das outras sabotagens de contagem.
    const original = readFileSync(join(AQUI, 'corrida-online.ts'), 'utf8');
    const sabotado = original.replace(
      'return corridaDaSala(dataset, draft, seed, pistaId);',
      'return corridaDaSala(dataset, draft, seed, pistaId) ?? corridaDaSala(dataset, draft, seed, pistaId);',
    );
    expect(sabotado, 'a substituição de texto não encontrou o alvo — o teste não provaria nada').not.toBe(
      original,
    );
    expect(chamadasMax(sabotado, 'corridaDaSala')).not.toBe(1);
  });

  it('`prepararCorrida` é chamada exatamente 1 vez em `useCorrida.ts`', () => {
    // 🔴 O furo que sobrava depois dos dois bloqueantes: `useCorrida.ts` está
    // na allowlist de `prepararCorrida` (é o caminho OFFLINE legítimo, dentro
    // de `corridaInicial`), e a allowlist limita QUEM chama, não QUANTAS vezes
    // — o mesmo defeito do bloqueante 2, uma porta adiante. Uma segunda
    // chamada aqui (um efeito de "re-preparar quando a prop mudar", por
    // exemplo) prepararia a corrida de novo no caminho por onde a corrida
    // ONLINE também passa, e a tela mostraria uma preparação nova em vez da
    // referência que o hash atestou — a classe de bug do 8.4, entrando pelo
    // arquivo que a allowlist já aprovou.
    const fonte = readFileSync(join(AQUI, 'useCorrida.ts'), 'utf8');
    expect(
      chamadasMax(fonte, 'prepararCorrida'),
      'só `corridaInicial` pode preparar a corrida aqui, e uma vez só — no modo "pronta" NENHUMA preparação pode acontecer. ' +
        'ATENÇÃO ao depurar: `chamadasMax` usa o MÁXIMO entre a fonte crua e a sem-comentários (nunca subcontar), ' +
        'então um COMENTÁRIO novo neste arquivo que escreva `prepararCorrida(` também derruba esta contagem — ' +
        'confira se a segunda ocorrência é código de verdade antes de caçar bug que não existe.',
    ).toBe(1);
  });

  it('🔴 SABOTAGEM: duplicar a chamada de `prepararCorrida` em `useCorrida.ts` reprova', () => {
    // Em memória, pelo mesmo motivo documentado na sabotagem acima.
    const original = readFileSync(join(AQUI, 'useCorrida.ts'), 'utf8');
    const sabotado = original.replace(
      'const preparo = prepararCorrida(dataset, state, fonte.pistaId, fonte.seed);',
      'const preparo = prepararCorrida(dataset, state, fonte.pistaId, fonte.seed) ?? prepararCorrida(dataset, state, fonte.pistaId, fonte.seed);',
    );
    expect(sabotado, 'a substituição de texto não encontrou o alvo — o teste não provaria nada').not.toBe(
      original,
    );
    expect(chamadasMax(sabotado, 'prepararCorrida')).not.toBe(1);
  });

  /**
   * 🔒 As sabotagens de CONTAGEM rodam **em memória**, nunca gravando no
   * arquivo de produção (achado da revisão). `chamadasMax` é pura sobre
   * string, então o round-trip em disco não acrescentava poder de detecção
   * nenhum — e trazia dois riscos reais:
   *
   * 1. o vitest roda arquivos de teste em PARALELO, e `contrato-ausente.test.ts`
   *    percorre a MESMA árvore (`readdirSync`/`statSync`); um arquivo mutilado
   *    dentro da janela de escrita pode quebrar um teste alheio;
   * 2. processo morto no meio da janela deixa `useSalaOnline.ts`/`useCorrida.ts`
   *    SABOTADOS na árvore — e como os dois já aparecem como ` M` no
   *    `git status` durante o PR, nada denunciaria.
   *
   * A guarda `expect(sabotado).not.toBe(original)` continua sendo o que
   * impede a sabotagem de virar teatro: se o alvo do `replace` sumir do
   * arquivo real, o teste falha em vez de provar nada.
   */
  it('🔴 SABOTAGEM: duplicar a chamada de `corridaDaSala` em `useSalaOnline.ts` reprova', () => {
    const original = readFileSync(join(AQUI, 'useSalaOnline.ts'), 'utf8');
    const sabotado = original.replace(
      'return corridaDaSala(dataset, cliente.draft, seedCorrida);',
      'return corridaDaSala(dataset, cliente.draft, seedCorrida) ?? corridaDaSala(dataset, cliente.draft, seedCorrida);',
    );
    expect(sabotado, 'a substituição de texto não encontrou o alvo — o teste não provaria nada').not.toBe(
      original,
    );
    expect(chamadasMax(sabotado, 'corridaDaSala')).not.toBe(1);
  });
});
