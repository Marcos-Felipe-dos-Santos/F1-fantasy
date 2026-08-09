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
    files: ['src/net/**'],
    ignores: ['src/net/**/*.test.ts'],
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
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Proibido em net/: use o RNG semeado de engine/rng.ts.',
        },
        {
          object: 'Date',
          property: 'now',
          message: 'Proibido em net/: determinismo — o redutor não pode depender de relógio.',
        },
        {
          object: 'performance',
          property: 'now',
          message: 'Proibido em net/: determinismo — o redutor não pode depender de relógio.',
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
