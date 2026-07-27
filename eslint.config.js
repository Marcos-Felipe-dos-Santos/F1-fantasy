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
    // As regras de determinismo acima só valiam em `src/engine/**`, mas nem
    // todo código crítico de determinismo mora lá (cosmético C4 da revisão do
    // PR 6.5). `persistencia.ts` calcula a impressão digital que valida saves:
    // um `Math.random` ou um `localeCompare` ali quebraria todo save em sessão
    // nova ou entre máquinas, e nenhuma rede de lint pegava.
    files: ['src/ui/persistencia.ts', 'src/ui/fluxo-campeonato.ts'],
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
