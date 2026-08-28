/**
 * 🔒 CERCA DE QUASE-MARCA — PR 4 da trilha do dataset fictício.
 *
 * Valida a tabela `scripts/nomes-ficticios.json`, que mapeia **id real →
 * nome fictício** para as 105 equipes e os 353 pilotos do dataset. A tabela
 * ainda **não tem consumidor**: quem a aplica é o `anonimizar.ts` do PR 5.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * O CRITÉRIO, ditado pelo dev em 2026-08-25 e confirmado em 2026-08-27:
 *
 *   "nomes plausíveis de equipe e piloto de automobilismo, sem semelhança com
 *    nome real, sem trocadilho com marca"
 *
 * 🔑 **DAS TRÊS EXIGÊNCIAS, ESTA CERCA MECANIZA UMA.** "Plausível" e "sem
 * trocadilho com marca" **não são verificáveis por teste** — são julgamento de
 * quem autora e do dev que aprovou a amostra de 20. Quem ler esta suíte verde e
 * concluir "os 458 nomes estão aprovados" está errado: ela responde **"nenhum
 * nome fictício se parece com nome real do universo"**, e só isso.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CHAVEAMENTO POR ID — decisão do dev.
 *
 * A tabela é chaveada por `constructorId` / `driverId`, **nunca por nome**, para
 * sobreviver a mudança de rótulo a montante. A verificação é de **IGUALDADE DE
 * CONJUNTO** contra `fatos-agregados.json`, não de contagem: uma tabela com 105
 * linhas e duas chaves com typo passaria numa asserção de tamanho, e é
 * exatamente a diferença entre "chaveada por id" e "tem 458 linhas".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNIVERSO DE AGULHAS — o mesmo do portão do PR 1: `fatos-agregados.json`, lido
 * pela constante única de `./caminhos-dataset.ts`. Normalizado e deduplicado dá
 * **825 agulhas** (medido em 2026-08-27), de cinco fontes:
 *
 *   - `equipes[].nome`          — 105 nomes de equipe
 *   - `equipes[].constructorId` — 105 ids de equipe
 *   - `titulares[].nome`        — 353 nomes de piloto (completos)
 *   - `titulares[].driverId`    — 353 ids de piloto
 *   - os SOBRENOMES, tirados do último segmento do `driverId`
 *   - os tokens de nome de equipe com 3+ caracteres (`Talbot-Lago` → `talbot`,
 *     `lago`), porque é assim que uma marca composta se cita na fala
 *
 * 🔑 **O SOBRENOME SAI DO `driverId`, NÃO DE PARSEAR O NOME EXIBIDO.** O dado já
 * canonicaliza isso (`fangio`, `etancelin`, `michael_schumacher` → `schumacher`);
 * re-derivar por `nome.split(' ').pop()` criaria a segunda lista que precisa
 * concordar com a primeira — a classe de defeito que este repositório já pagou
 * no `vite.config.ts`/`rotas.ts` e na cópia `derived`/`src/data`.
 *
 * 🔴 **LACUNA DECLARADA — PRIMEIRO NOME DE PILOTO ESTÁ FORA DO UNIVERSO.**
 * Decisão do dev, 2026-08-27, sobre medição: dos **262** primeiros nomes
 * distintos, **197 aparecem uma única vez**. Agulhá-los banaria `alberto`,
 * `maurice`, `graham`, `stirling`, `phil` — e, por distância, quase todo
 * primeiro nome europeu plausível. **A cerca ficaria inviável.**
 * ⚠️ **Consequência que fica escrita:** um fictício "Ayrton Vandel" **passa
 * verde aqui**. O que impede isso é regra de AUTORIA — não reusar primeiro nome
 * que identifica sozinho um piloto real (Ayrton, Emerson, Stirling, Niki, Kimi)
 * —, e regra de autoria não é cerca. O sobrenome, que é onde a semelhança de
 * fato mora, está integralmente cercado.
 * 🔑 **A regra de autoria foi ALARGADA pelo dev em 2026-08-27, por dois casos
 * reais:** `Gavin Thorncroft` e `Simon Pennington` passaram verdes, e `gavin`
 * (Bill Gavin) e `simon` (André Simon) **são `driverId` reais**. Trocados. A
 * regra não é só "não reusar primeiro nome icônico": é **não usar como primeiro
 * nome algo que seja sobrenome real de piloto**. *(Palavras do dev: "não é
 * falha da cerca — é da regra de autoria, e ela vale.")*
 * 🔑 **Meia-defesa medida, e é meia:** o nome COMPLETO real é agulha, então
 * reusar o primeiro nome do MESMO piloto aproxima o candidato inteiro da agulha
 * inteira e tende a reprovar. Não cobre reusar o primeiro nome de OUTRO piloto.
 *
 * 🔒 **PALAVRA GENÉRICA DE CATEGORIA É AGULHA TAMBÉM, e isso é DECIDIDO, não
 * descuido.** `racing`, `team`, `point` aparecem em nome real de equipe
 * (`Racing Point`, `Team Lotus`, `Lotus Racing`), então "Oakmont Racing"
 * REPROVA. **A saída não é allowlist** — a regra do PR 1 vale aqui igual: se o
 * nome incomoda, troca-se o NOME.
 * 🔑 **Tentei o filtro mecânico óbvio e ele é INUTILIZÁVEL, medido:** "token que
 * aparece em mais de um nome de equipe é genérico" devolve
 * `lotus:6 brabham:6 ford:6 cooper:4 brm:4 team:4 … mclaren:2` — ou seja **as
 * marcas mais fortes**, que reaparecem por causa dos compostos
 * (`Cooper-Climax`, `Lotus-Ford`). O filtro inverteria a cerca: soltaria
 * `lotus` e prenderia o resto. **Registrado como reprovado**, no molde do
 * substituto 2 do inventário do `ESTADO.md`.
 * ✅ **O efeito colateral é bom:** as 105 equipes reais são majoritariamente de
 * uma palavra só (84 de 105, medido), então marca própria — "Corvetta",
 * "Ilvento" — é mais fiel ao dataset que "X Racing".
 *
 * 🔴 **TOPÔNIMO DA CASA DA EQUIPE REAL É LACUNA CONHECIDA — decisão do dev,
 * 2026-08-27 — e é ESTRUTURAL, não calibrável.** O universo é
 * `fatos-agregados.json`, que tem nome de equipe, nome de piloto e ids — e
 * **nenhum nome de lugar**. Uma equipe fictícia batizada com a cidade-sede da
 * equipe real passa VERDE aqui, e é o caso mais próximo de "trocadilho com
 * marca" que apareceu em toda a autoria.
 * 🔑 **Aconteceu, foi pego por leitura e corrigido pelo dev:** `Faentina` para
 * a Minardi (sediada em **Faenza**), `Kowloon` para a Theodore (Hong Kong) e
 * `Aravalli` para a Force India. **Nenhuma das três reprovava** — as três foram
 * trocadas por decisão, não por medição. *(Palavras do dev: "o objetivo é
 * remover referência, não codificá-la de forma mais sutil.")*
 * 🔒 **Portanto: não batizar equipe fictícia com topônimo ligado à equipe real.
 * Isso é REGRA DE AUTORIA, e regra de autoria não é cerca** — nenhum teste a
 * fará valer. Quem acrescentar entrada nesta tabela responde por ela na
 * leitura, não no `npm test`.
 *
 * ⚠️ **PISTA E PEÇA ESTÃO FORA**, porque o universo é `fatos-agregados.json` (a
 * decisão do dev no PR 1). Uma equipe fictícia chamada "Monza Corse" passaria
 * verde, e a marca sobrevivente de `peca-turbo-modo-quali-bmw` não é vista daqui
 * — o universo traz `BMW Sauber`/`bmw_sauber`, nunca `BMW` sozinho.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COMO A DISTÂNCIA É MEDIDA — a resposta a "distância de edição pequena".
 *
 * Normalização dos dois lados: NFD → tira diacrítico → minúscula → remove tudo
 * fora de `[a-z0-9]`. `Talbot-Lago`→`talbotlago`, `red_bull`→`redbull`,
 * `Étancelin`→`etancelin`. Sem isso, `Étancelin` e `etancelin` seriam agulhas
 * diferentes e o hífen esconderia metade das comparações.
 *
 * Reprova, com **ambos os lados ≥ 4 caracteres**:
 *   - **Levenshtein ≤ `max(1, floor(maxLen / 3))`, com TETO 3** — ou seja
 *     ≤5 → 1, 6–8 → 2, ≥9 → 3. Vale para TODO candidato.
 *   - **substring nas DUAS direções**, mas **só com agulha de 6+ caracteres** e
 *     **só sobre TOKEN**, nunca sobre o nome completo. Os dois limites são
 *     medidos e estão justificados em `PISO_SUBSTRING` e no docblock de
 *     `motivoDeReprovacao` — não são frouxidão, são correção de dois falsos
 *     positivos que a própria cerca produziu.
 *
 * Aferido, e os números estão nos testes abaixo:
 *   `ferarri`/`ferrari`     maxLen 7  lev 2  limiar 2  🔴
 *   `maclaren`/`mclaren`    maxLen 8  lev 1  limiar 2  🔴
 *   `schumaker`/`schumacher` maxLen 10 lev 2 limiar 3  🔴
 *   `norwick`/`norris`      maxLen 7  lev 3  limiar 2  ✅ passa
 *
 * 🔒 **AGULHA COM MENOS DE 4 CARACTERES ENTRA SÓ POR IGUALDADE EXATA.** Com 3
 * letras a distância vira ruído, e isso está medido no PR 1: sem fronteira, `rb`
 * casava dentro de `Nürburgring` e `pistas.json` acusava 4 ids fantasma. As
 * curtas são 16, listadas para o buraco ficar registrado em vez de tapado:
 *
 *     ags ats bar bmw brm brp era hrt hwm iso jr mf1 pic ram rb red
 *
 * 🔴 **E O BURACO REAL É MAIOR QUE ESSAS 16 — registrado aqui porque a redação
 * anterior o subestimava.** Depois que `PISO_SUBSTRING` subiu para 6, o
 * conjunto isento de substring não são as agulhas de <4: são **todas as de <6**,
 * ou seja **mais 116 agulhas de 4–5 caracteres** (`berg`, `hall`, `mass`,
 * `pace`, `sala`, `gene`, `hill`, `bell`, `moss`, `hunt`, `lago`, `galli`,
 * `aston`, `albon`, `simon`, `gavin`…). Elas seguem cercadas por DISTÂNCIA
 * contra candidato de tamanho parecido, mas **não** por conter/estar contido.
 * 🔑 **Consequência medida na tabela de hoje: 16 nomes fictícios contêm uma
 * delas** — `Vandenberghe`⊃`berg`, `Fumagalli`⊃`galli`, `Malagoli`⊃`lago`,
 * `Bellagamba`⊃`bell` —, e passam. **São morfologia coincidente, não
 * semelhança**, e foi por isso que o piso subiu; mas quem inspecionar esta
 * cerca precisa saber que ela NÃO afirma o contrário. **Julgar esses casos é do
 * dev, não deste arquivo.**
 *
 * 🔒 **E por isso acrônimo fictício de 3 letras tem regra PRÓPRIA:** contra
 * agulha de 3 letras exige distância ≥ 2. Sem ela, a isenção das curtas seria
 * passe livre para `ERA` → `ERB`.
 *
 * 🔒 **A CERCA É O PISO, NÃO O TETO.** `Vandel` contra `Vanwall` sai a distância
 * 3 com limiar 2 e **passa** — está na margem de propósito. Um limiar que
 * reprovasse esse caso reprovaria também a maior parte dos sobrenomes europeus
 * plausíveis. O primeiro filtro é o julgamento de quem autora; o último é o do
 * dev na amostra.
 * 🔒 **NÃO EXISTE ALLOWLIST AQUI, e não se acrescenta uma.** Se um nome
 * fictício reprova, troca-se o NOME, nunca a lista. É a mesma linha do portão do
 * PR 1, e pelo mesmo motivo: exceção escolhida a dedo até o número ficar bonito
 * foi o vício que aposentou a contagem 33/6/2.
 *
 * 📛 **Este teste LÊ `fatos-agregados.json` para contar, NUNCA imprimindo o
 * conteúdo.** A saída de falha traz o id, o nome e o motivo, limitada a 10
 * amostras. Mesma disciplina de `scripts/portao-nomes-reais.test.ts:101`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FATOS_AGREGADOS, TABELA_NOMES } from './caminhos-dataset.ts';
import { slug } from './derivar-notas.ts';

/** Cardinalidades do universo — se mudarem, a tabela não vale mais. */
const ESPERADO_EQUIPES = 105;
const ESPERADO_PILOTOS = 353;

// ---------------------------------------------------------------------------
// Normalização e distância
// ---------------------------------------------------------------------------

/** NFD → sem diacrítico → minúscula → só `[a-z0-9]`. */
export function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Distância de Levenshtein, duas linhas (as strings aqui são curtas). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(
        anterior[j] + 1,
        atual[j - 1] + 1,
        anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    anterior = atual;
  }
  return anterior[b.length];
}

/**
 * ≤5 → 1, 6–8 → 2, **≥9 → 3, com TETO em 3**.
 *
 * 🔴 **O teto não é enfeite — sem ele o código contradizia este comentário.**
 * `max(1, floor(maxLen/3))` sozinho dá **4** em `maxLen 12` e **5** em 17, e
 * candidato longo é justamente o nome COMPLETO de piloto (12–20 caracteres
 * normalizados). Medido: `theoquillard` × `grouillard` saía a distância 4 com
 * limiar 4 e reprovava — falso positivo puro, gerado por um limiar que cresce
 * sem parar. Com teto 3, os verdadeiros positivos continuam de pé
 * (`micaelschumaker` × `michaelschumacher` é distância 3).
 */
export function limiarDe(maxLen: number): number {
  return Math.min(3, Math.max(1, Math.floor(maxLen / 3)));
}

// ---------------------------------------------------------------------------
// Universo de agulhas
// ---------------------------------------------------------------------------

interface FatosDoUniverso {
  readonly equipes: ReadonlyArray<{ readonly nome: string; readonly constructorId: string }>;
  readonly titulares: ReadonlyArray<{ readonly nome: string; readonly driverId: string }>;
}

export interface Universo {
  readonly agulhas: readonly string[];
  readonly constructorIds: readonly string[];
  readonly driverIds: readonly string[];
}

/** Último segmento de um id composto: `michael_schumacher` → `schumacher`. */
function sobrenomeDoId(driverId: string): string {
  const partes = driverId.split(/[_-]/);
  return partes[partes.length - 1];
}

export function carregarUniverso(): Universo {
  const fatos = JSON.parse(readFileSync(FATOS_AGREGADOS, 'utf8')) as FatosDoUniverso;
  const constructorIds = [...new Set(fatos.equipes.map((e) => e.constructorId))];
  const driverIds = [...new Set(fatos.titulares.map((t) => t.driverId))];
  const agulhas = new Set<string>();

  for (const e of fatos.equipes) {
    agulhas.add(normalizar(e.constructorId));
    agulhas.add(normalizar(e.nome));
    // Marca composta se cita pelos pedaços: `Talbot-Lago` → `talbot`, `lago`.
    for (const token of e.nome.split(/[\s-]+/)) {
      const t = normalizar(token);
      if (t.length >= 3) agulhas.add(t);
    }
  }
  for (const t of fatos.titulares) {
    agulhas.add(normalizar(t.driverId));
    agulhas.add(normalizar(t.nome));
    agulhas.add(normalizar(sobrenomeDoId(t.driverId)));
  }
  agulhas.delete('');
  return { agulhas: [...agulhas], constructorIds, driverIds };
}

const UNIVERSO = carregarUniverso();

// ---------------------------------------------------------------------------
// A cerca
// ---------------------------------------------------------------------------

/**
 * 🔒 PISO DA COMPARAÇÃO POR SUBSTRING — agulha menor que isto não vale como
 * substring, só por distância.
 *
 * 🔴 **É o `rb` em `Nürburgring` (PR 1) um degrau acima, e foi MEDIDO aqui.**
 * Com piso 4, `berg` (Allen Berg), `hall` (Jim Hall), `mass`, `pace`, `sala` e
 * `gene` — todos `driverId` reais de 4 letras — casam dentro de sobrenomes
 * inteiramente legítimos: `Vandenberghe` reprovava por conter `berg`.
 * **Medição do impacto sobre a tabela completa:** piso 4 → 48 reprovadas ·
 * piso 5 → 38 · **piso 6 → 36** · piso 7 → 36. **Estabiliza em 6**, e os
 * verdadeiros positivos seguem todos pegos pela DISTÂNCIA (`ferarri`,
 * `maclaren`, `maseratti`, `schumaker`, `ayrtonsena`, `micaelschumaker`),
 * porque agulha de 4–5 letras continua cercada contra candidato de tamanho
 * parecido. **Piso 7 não compra nada e afrouxa de graça.**
 */
const PISO_SUBSTRING = 6;

/**
 * Devolve o motivo da reprovação, ou `null` se o candidato passa.
 * O candidato já vem NORMALIZADO.
 *
 * 🔒 **`ehNomeCompleto` DESLIGA a substring, e isso é a decisão do dev sendo
 * respeitada no código.** O primeiro nome está fora do universo de agulhas —
 * mas o candidato "nome completo" o carrega dentro de si, então uma checagem
 * de substring sobre ele reintroduz o primeiro nome pela porta dos fundos.
 * **Medido:** `Gavin Thorncroft` reprovava porque `gavinthorncroft` contém
 * `gavin`, que é `driverId` real (Bill Gavin) — ou seja, a cerca estava
 * proibindo um primeiro nome que o dev decidiu não proibir. O nome completo
 * entra **só por distância**, que é o que ele existe para medir (reuso do nome
 * real inteiro, tipo `Ayrton Sena`).
 */
export function motivoDeReprovacao(
  candidato: string,
  agulhas: readonly string[],
  ehNomeCompleto = false,
): string | null {
  if (candidato.length === 0) return 'candidato vazio depois de normalizar';
  for (const agulha of agulhas) {
    if (candidato.length >= 4 && agulha.length >= 4) {
      if (!ehNomeCompleto && agulha.length >= PISO_SUBSTRING) {
        if (candidato.includes(agulha)) return `contém a agulha "${agulha}"`;
        if (agulha.includes(candidato)) return `está contido na agulha "${agulha}"`;
      }
      const maxLen = Math.max(candidato.length, agulha.length);
      const limiar = limiarDe(maxLen);
      // Poda: diferença de comprimento já é piso da distância.
      if (Math.abs(candidato.length - agulha.length) > limiar) continue;
      const d = levenshtein(candidato, agulha);
      if (d <= limiar) return `distância ${d} ≤ ${limiar} da agulha "${agulha}"`;
    } else if (candidato.length === 3 && agulha.length === 3) {
      const d = levenshtein(candidato, agulha);
      if (d <= 1) return `acrônimo a distância ${d} da agulha "${agulha}"`;
    } else if (candidato === agulha) {
      return `idêntico à agulha "${agulha}"`;
    }
  }
  return null;
}

export interface Entrada {
  readonly codigo: string;
  readonly nome: string;
}

export interface Tabela {
  readonly equipes: Readonly<Record<string, Entrada>>;
  readonly pilotos: Readonly<Record<string, Entrada>>;
}

/** Um pedaço a examinar. `ehNomeCompleto` desliga a substring — ver acima. */
export interface Candidato {
  readonly texto: string;
  readonly ehNomeCompleto: boolean;
}

/**
 * Os pedaços de uma equipe que a cerca examina: o nome inteiro, cada token de
 * 3+ do nome, o código inteiro e cada segmento de 3+ do código.
 */
export function candidatosDeEquipe(entrada: Entrada): Candidato[] {
  const tokens = new Set<string>([normalizar(entrada.codigo)]);
  for (const token of entrada.nome.split(/[\s-]+/)) {
    const t = normalizar(token);
    if (t.length >= 3) tokens.add(t);
  }
  for (const seg of entrada.codigo.split(/[_-]/)) {
    const s = normalizar(seg);
    if (s.length >= 3) tokens.add(s);
  }
  tokens.delete('');
  return [
    { texto: normalizar(entrada.nome), ehNomeCompleto: true },
    ...[...tokens].map((texto) => ({ texto, ehNomeCompleto: false })),
  ];
}

/**
 * Os pedaços de um piloto: o nome inteiro, o SOBRENOME, o código inteiro e o
 * último segmento do código. **O primeiro nome NÃO entra** — é a lacuna
 * declarada no docblock.
 */
export function candidatosDePiloto(entrada: Entrada): Candidato[] {
  const tokens = entrada.nome.split(/[\s-]+/);
  const pedacos = new Set<string>([
    normalizar(tokens[tokens.length - 1]),
    normalizar(entrada.codigo),
    normalizar(sobrenomeDoId(entrada.codigo)),
  ]);
  pedacos.delete('');
  return [
    { texto: normalizar(entrada.nome), ehNomeCompleto: true },
    ...[...pedacos].map((texto) => ({ texto, ehNomeCompleto: false })),
  ];
}

export interface Violacao {
  readonly id: string;
  readonly nome: string;
  /**
   * O pedaço NORMALIZADO que reprovou — nome inteiro, sobrenome, código ou
   * segmento. **Sem ele a mensagem mente:** "Ayrton Sena / sena — distância 1
   * da agulha `ayrtonsenna`" faz parecer que `sena` está a 1 de `ayrtonsenna`,
   * quando quem reprovou foi o candidato `ayrtonsena`. Mensagem de falha que
   * afirma o que não confere é a família de defeito que este projeto já
   * catalogou seis vezes no código.
   */
  readonly candidato: string;
  readonly motivo: string;
}

export function avaliarTabela(tabela: Tabela, agulhas: readonly string[]): Violacao[] {
  const violacoes: Violacao[] = [];
  const passadas = [
    { pool: tabela.equipes, candidatos: candidatosDeEquipe },
    { pool: tabela.pilotos, candidatos: candidatosDePiloto },
  ] as const;
  for (const { pool, candidatos } of passadas) {
    for (const [id, entrada] of Object.entries(pool)) {
      for (const { texto, ehNomeCompleto } of candidatos(entrada)) {
        const motivo = motivoDeReprovacao(texto, agulhas, ehNomeCompleto);
        if (motivo !== null) {
          violacoes.push({
            id,
            nome: `${entrada.nome} / ${entrada.codigo}`,
            candidato: texto,
            motivo,
          });
          break;
        }
      }
    }
  }
  return violacoes;
}

function formatar(violacoes: readonly Violacao[]): string {
  return violacoes
    .slice(0, 10)
    .map((v) => `   ${v.id}: ${v.nome} — o pedaço "${v.candidato}" ${v.motivo}`)
    .join('\n');
}

const TABELA = JSON.parse(readFileSync(TABELA_NOMES, 'utf8')) as Tabela;

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe('🔒 cerca de quase-marca — o universo', () => {
  it('ANTI-VACUIDADE: o universo tem 105 constructorIds e 353 driverIds', () => {
    // Se o carregamento devolver listas vazias, NENHUM nome reprova e a cerca
    // declara a tabela limpa por vacuidade.
    expect(UNIVERSO.constructorIds).toHaveLength(ESPERADO_EQUIPES);
    expect(UNIVERSO.driverIds).toHaveLength(ESPERADO_PILOTOS);
  });

  it('a união deduplicada tem 825 agulhas — o número que o docblock afirma', () => {
    // O docblock cita 825. Sem esta asserção ele envelhece em silêncio na
    // primeira vez que alguém mexer no universo — "conclusão sem o fato que a
    // gerou não se verifica depois".
    expect(UNIVERSO.agulhas).toHaveLength(825);
  });

  it('as agulhas incluem nome, id, sobrenome e token de marca composta', () => {
    for (const esperada of [
      'ferrari', // nome e id de equipe
      'mclaren',
      'talbotlago', // nome composto inteiro
      'talbot', // e o token dele
      'lago',
      'schumacher', // sobrenome vindo de `michael_schumacher`
      'fangio',
      'juanfangio', // nome completo de piloto
    ]) {
      expect(UNIVERSO.agulhas).toContain(esperada);
    }
  });

  it('o primeiro nome NÃO é agulha — a lacuna declarada, fixada por teste', () => {
    // Se alguém acrescentar primeiro nome ao universo sem passar pelo dev, é
    // aqui que aparece. `juan` e `alberto` são primeiros nomes reais.
    expect(UNIVERSO.agulhas).not.toContain('juan');
    expect(UNIVERSO.agulhas).not.toContain('alberto');
  });
});

describe('🔒 cerca de quase-marca — o medidor', () => {
  it('o limiar é max(1, floor(maxLen/3)): ≤5→1, 6–8→2, ≥9→3', () => {
    expect(limiarDe(4)).toBe(1);
    expect(limiarDe(5)).toBe(1);
    expect(limiarDe(6)).toBe(2);
    expect(limiarDe(8)).toBe(2);
    expect(limiarDe(9)).toBe(3);
    // 🔒 O TETO. Sem ele isto seria 4, e o comentário da função mentiria.
    expect(limiarDe(12)).toBe(3);
    expect(limiarDe(20)).toBe(3);
  });

  it('a normalização tira diacrítico, caixa e separador', () => {
    expect(normalizar('Étancelin')).toBe('etancelin');
    expect(normalizar('Talbot-Lago')).toBe('talbotlago');
    expect(normalizar('red_bull')).toBe('redbull');
  });

  it('as distâncias aferidas batem com o que o docblock afirma', () => {
    expect(levenshtein('ferarri', 'ferrari')).toBe(2);
    expect(levenshtein('maclaren', 'mclaren')).toBe(1);
    expect(levenshtein('schumaker', 'schumacher')).toBe(2);
    expect(levenshtein('norwick', 'norris')).toBe(3);
  });
});

describe('🔒 cerca de quase-marca — ANTI-VACUIDADE do julgamento', () => {
  // As duas metades são load-bearing e por motivos DIFERENTES, como o par
  // M2/M5 do portão do PR 1: a suja pega uma cerca que degenerou em `null`
  // sempre; a limpa pega uma que degenerou em "reprova tudo". Qualquer uma
  // sozinha deixa um buraco.

  const SUJA: Tabela = {
    equipes: {
      ferrari: { codigo: 'ferarri', nome: 'Ferarri' },
      mclaren: { codigo: 'maclaren', nome: 'Maclaren' },
      maserati: { codigo: 'maseratti', nome: 'Maseratti Corse' },
    },
    pilotos: {
      senna: { codigo: 'sena', nome: 'Ayrton Sena' },
      michael_schumacher: { codigo: 'schumaker', nome: 'Micael Schumaker' },
    },
  };

  // ⚠️ Esta fixture nasceu SUJA por acaso e a cerca pegou — registrado porque
  // é a prova de uso da metade "limpa". Tinha `Oakmont Racing` (o token
  // `racing` é agulha, vindo de `Racing Point`/`Lotus Racing`) e
  // `Théo Quillard` (distância 3 de `grouillard`, Olivier Grouillard).
  const LIMPA: Tabela = {
    equipes: {
      ferrari: { codigo: 'corvetta', nome: 'Corvetta' },
      mclaren: { codigo: 'oakmont', nome: 'Oakmont' },
      maserati: { codigo: 'ilvento', nome: 'Ilvento' },
    },
    pilotos: {
      senna: { codigo: 'demarque', nome: 'Théo Demarque' },
      michael_schumacher: { codigo: 'brandhof', nome: 'Udo Brandhof' },
    },
  };

  it('tabela SUJA sintética é REPROVADA nas 5 entradas', () => {
    const violacoes = avaliarTabela(SUJA, UNIVERSO.agulhas);
    expect(violacoes.map((v) => v.id).sort()).toEqual(
      ['ferrari', 'maserati', 'mclaren', 'michael_schumacher', 'senna'].sort(),
    );
  });

  it('tabela LIMPA sintética é ACEITA — a cerca não reprova sempre', () => {
    const violacoes = avaliarTabela(LIMPA, UNIVERSO.agulhas);
    expect(violacoes, `esperava zero violações, veio:\n${formatar(violacoes)}`).toEqual([]);
  });

  it('acrônimo de 3 letras: `ERB` reprova contra `era`, `VKX` passa', () => {
    expect(motivoDeReprovacao('erb', UNIVERSO.agulhas)).not.toBeNull();
    expect(motivoDeReprovacao('vkx', UNIVERSO.agulhas)).toBeNull();
  });

  it('agulha curta NÃO é substring: `redbull` não contamina quem contém `red`', () => {
    // É a lição do `rb` em `Nürburgring` (PR 1). `red` tem 3 chars: entra só
    // por igualdade exata, então um fictício de 4+ que o contenha não reprova
    // por causa dele.
    expect(motivoDeReprovacao('credano', UNIVERSO.agulhas)).toBeNull();
  });

  it('PISO 6: `berg` não casa dentro de `vandenberghe`, mas segue cercado por DISTÂNCIA', () => {
    // As duas metades são o ponto. Se o piso subisse sem que a distância
    // continuasse valendo, agulha de 4 letras ficaria sem cerca nenhuma.
    expect('vandenberghe'.includes('berg')).toBe(true);
    expect(motivoDeReprovacao('vandenberghe', UNIVERSO.agulhas)).toBeNull();
    expect(motivoDeReprovacao('berq', UNIVERSO.agulhas)).not.toBeNull();
  });

  it('NOME COMPLETO não entra por substring — é a decisão do primeiro nome, no código', () => {
    // `oliver` é driverId real (Jackie Oliver) e tem 6 chars, então passa o
    // piso. Como TOKEN reprova; como NOME COMPLETO não, senão a cerca estaria
    // proibindo o primeiro nome que o dev decidiu deixar fora do universo.
    expect(motivoDeReprovacao('oliveras', UNIVERSO.agulhas, false)).not.toBeNull();
    expect(motivoDeReprovacao('oliverzaldivar', UNIVERSO.agulhas, true)).toBeNull();
    expect(motivoDeReprovacao('oliverzaldivar', UNIVERSO.agulhas, false)).not.toBeNull();
  });
});

describe('🔒 cerca de quase-marca — a tabela', () => {
  it('EQUIPES: as chaves são EXATAMENTE os 105 constructorId (igualdade de conjunto)', () => {
    // Conjunto, não contagem: 105 linhas com duas chaves com typo passariam
    // numa asserção de tamanho, e a tabela deixaria de ser chaveada por id.
    expect(Object.keys(TABELA.equipes).sort()).toEqual([...UNIVERSO.constructorIds].sort());
  });

  it('PILOTOS: as chaves são EXATAMENTE os 353 driverId (igualdade de conjunto)', () => {
    expect(Object.keys(TABELA.pilotos).sort()).toEqual([...UNIVERSO.driverIds].sort());
  });

  it('105 entram / 105 saem DISTINTOS; 353 / 353', () => {
    const nomesEquipe = Object.values(TABELA.equipes).map((e) => e.nome);
    const nomesPiloto = Object.values(TABELA.pilotos).map((p) => p.nome);
    expect(new Set(nomesEquipe).size).toBe(ESPERADO_EQUIPES);
    expect(new Set(nomesPiloto).size).toBe(ESPERADO_PILOTOS);
    expect(new Set(Object.values(TABELA.equipes).map((e) => e.codigo)).size).toBe(ESPERADO_EQUIPES);
    expect(new Set(Object.values(TABELA.pilotos).map((p) => p.codigo)).size).toBe(ESPERADO_PILOTOS);
  });

  it('CHARSET do codigo — e no lado piloto ele é a ÚNICA defesa', () => {
    // `idsDaEquipeAno` (derivar-notas.ts:629) aplica `slug()` no constructorId
    // mas interpola `${driverId}` CRU. No lado piloto o slug nunca roda, então
    // um codigo com espaço ou maiúscula entraria inteiro no id do dataset e
    // nada o normalizaria.
    const formato = /^[a-z0-9]+([_-][a-z0-9]+)*$/;
    for (const pool of [TABELA.equipes, TABELA.pilotos]) {
      for (const [id, entrada] of Object.entries(pool)) {
        expect(entrada.codigo, `codigo fora do formato em ${id}: "${entrada.codigo}"`).toMatch(
          formato,
        );
      }
    }
  });

  it('slug(codigo) é INJETIVO nos dois pools — mapa bijetivo não garante isso', () => {
    // `red_bull` e `red-bull` são codigos distintos que slugam para o MESMO
    // `red-bull`, e o dataset valida id único num conjunto compartilhado
    // (`verificarColisaoDeIds`). A bijeção da tabela não vê essa colisão.
    for (const [rotulo, pool, esperado] of [
      ['equipes', TABELA.equipes, ESPERADO_EQUIPES],
      ['pilotos', TABELA.pilotos, ESPERADO_PILOTOS],
    ] as const) {
      const slugados = Object.values(pool).map((e) => slug(e.codigo));
      expect(new Set(slugados).size, `colisão de slug(codigo) em ${rotulo}`).toBe(esperado);
    }
  });

  it('🔒 NENHUM nome fictício se parece com nome real do universo', () => {
    const violacoes = avaliarTabela(TABELA, UNIVERSO.agulhas);
    expect(
      violacoes.length,
      [
        `🔴 ${violacoes.length} nome(s) fictício(s) reprovaram na cerca de quase-marca.`,
        formatar(violacoes),
        '',
        '   Corrija o NOME na tabela. NÃO existe allowlist aqui, e não se',
        '   acrescenta uma — ver o docblock deste arquivo.',
      ].join('\n'),
    ).toBe(0);
  });
});
