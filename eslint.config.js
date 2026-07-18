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
      ],
    },
  },
  eslintConfigPrettier,
);
