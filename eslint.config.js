import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['src/engine/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message:
                'engine/ é lógica pura e não pode depender de React. Veja a fronteira engine/UI em CLAUDE.md.',
            },
            {
              name: 'react-dom',
              message:
                'engine/ é lógica pura e não pode depender de React. Veja a fronteira engine/UI em CLAUDE.md.',
            },
          ],
          patterns: [
            {
              group: ['react/*', 'react-dom/*'],
              message:
                'engine/ é lógica pura e não pode depender de React. Veja a fronteira engine/UI em CLAUDE.md.',
            },
            {
              group: ['**/ui', '**/ui/**', '**/net', '**/net/**'],
              message:
                'engine/ não pode importar de ui/ ou net/. Engine é pura e não conhece UI nem rede.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Proibido em engine/: use o RNG semeado de engine/rng.ts.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Proibido em engine/: determinismo — nada de relógio na engine.',
        },
        {
          object: 'performance',
          property: 'now',
          message: 'Proibido em engine/: determinismo — nada de relógio na engine.',
        },
      ],
    },
  },
  {
    // `src/net/**` roda DENTRO de um Durable Object (Fase 3). Duas fronteiras
    // que hoje só existem por disciplina e que aqui viram erro de lint:
    // 1. Nada de dataset. Um import de `src/data/` puxaria 1 MB de JSON pro
    //    bundle do worker em silêncio — o princípio da fase é "o servidor
    //    carrega seed + roster + hashes, nunca o dataset".
    // 2. Nada de UI/React. O redutor precisa rodar no workerd, no Node dos
    //    testes e no navegador, sem mudança.
    // Determinismo entra pelo mesmo motivo da engine: o redutor é semeado e
    // replicado, e um relógio ou `Math.random` ali divergiria entre os 22.
    // O arquivo de TESTE fica de fora de propósito: a conformidade do roster
    // só vale se comparar com o caminho offline de verdade (`src/ui/fluxo-draft`).
    //
    // `party/**` entra na MESMA cerca a partir do PR 3.2: é o Durable Object em
    // si, o código que de fato roda no workerd. Ele é um diretório de topo, fora
    // do `include` do tsconfig e fora do glob `src/net/**` — sem esta linha, um
    // `party/sala.ts` importando `src/data/` passaria no lint sem reclamação.
    files: ['src/net/**', 'party/**'],
    ignores: ['src/net/**/*.test.ts', 'party/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: 'net/ roda no Durable Object e no navegador — nada de React.',
            },
            {
              name: 'react-dom',
              message: 'net/ roda no Durable Object e no navegador — nada de React.',
            },
          ],
          patterns: [
            {
              group: ['**/data', '**/data/**', '**/*.json'],
              message:
                'O servidor NUNCA carrega o dataset (Fase 3): seed + roster + hashes, só. Um import de src/data/ leva 1 MB de JSON pro bundle do worker.',
            },
            {
              group: ['**/ui', '**/ui/**', 'react/*', 'react-dom/*'],
              message: 'net/ não pode importar de ui/. A camada de rede é isolada do front-end.',
            },
          ],
        },
      ],
      // ⚠️ ESTA LISTA É COMPLETA DE PROPÓSITO, e o bloco de `party/**` abaixo
      // repete os dois primeiros itens em vez de "herdar" daqui.
      //
      // No flat config do ESLint, um bloco posterior que redefine a MESMA regra
      // SUBSTITUI as opções por inteiro — não faz merge de arrays. A primeira
      // versão deste PR separava `Date.now` num bloco só de `src/net/**` e, com
      // isso, apagou em silêncio a proibição de `Math.random`/`performance.now`
      // que existia desde o 3.1a. Num PR cuja tese é determinismo. Achado da
      // revisão, e o teste de cerca em `cerca-lint.test.ts` existe para que não
      // se repita: ele verifica as três propriedades nos dois diretórios.
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Proibido em net/: use o RNG semeado de engine/rng.ts.',
        },
        {
          object: 'performance',
          property: 'now',
          message: 'Proibido em net/: determinismo — o redutor não pode depender de relógio.',
        },
        {
          object: 'Date',
          property: 'now',
          message:
            'Proibido no núcleo (src/net/): o redutor recebe `agora` injetado. Ler relógio é papel da casca, party/sala.ts.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression > MemberExpression[property.name='localeCompare']",
          message:
            'Proibido: `localeCompare` consulta a collation ICU do host e quebra determinismo entre workerd/Node. Use comparador de code unit (`<`/`>`).',
        },
      ],
    },
  },
  {
    // 🔒 `Date.now` é proibido no NÚCLEO (`src/net/**`) e permitido só na CASCA
    // (`party/**`). A distinção é a tese do PR 3.2: o redutor é puro e recebe
    // `agora` injetado — se ele lesse relógio, o mesmo log produziria estados
    // diferentes e o harness deixaria de ser determinístico. Já o Durable
    // Object É o lugar legítimo de ler o relógio: alguém tem que dizer que
    // horas são, e é ele.
    //
    // A lista abaixo REPETE `Math.random` e `performance.now` de propósito —
    // ver o aviso no bloco anterior sobre substituição de regra no flat config.
    files: ['party/**'],
    ignores: ['party/**/*.test.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Proibido em party/: use o RNG semeado de engine/rng.ts.',
        },
        {
          object: 'performance',
          property: 'now',
          message: 'Proibido em party/: use `Date.now()`, que é o relógio legítimo da casca.',
        },
      ],
    },
  },
  {
    // As regras de determinismo acima só valiam em `src/engine/**`, mas nem
    // todo código crítico de determinismo mora lá (cosmético C4 da revisão do
    // PR 6.5). `persistencia.ts` calcula a impressão digital que valida saves:
    // um `Math.random` ou um `localeCompare` ali quebraria todo save em sessão
    // nova ou entre máquinas, e nenhuma rede de lint pegava.
    // `narracao.ts` entrou nesta lista no PR da narração rica: ele escolhe o
    // texto do evento por HASH (`deriveSeed`) sobre dados congelados. Um
    // `Math.random` ali faria a mesma corrida narrar diferente a cada render
    // do React — e nenhum teste de simulação pegaria, porque nada na engine
    // teria mudado.
    files: ['src/ui/persistencia.ts', 'src/ui/fluxo-campeonato.ts', 'src/ui/narracao.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Determinismo: use o RNG semeado de engine/rng.ts.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Determinismo: nada de relógio em código que decide validade de save.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression > MemberExpression[property.name='localeCompare']",
          message:
            'Proibido: `localeCompare` consulta a collation ICU do host e quebra determinismo entre SOs/versões do Node. Use comparador de code unit (`<`/`>`).',
        },
      ],
    },
  },
  eslintConfigPrettier,
);
