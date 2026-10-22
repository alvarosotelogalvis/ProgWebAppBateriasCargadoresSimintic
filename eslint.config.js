import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'playwright-report',
      'test-results',
      'public',
      'docs',
      '.specify',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs['recommended-latest'],
  reactRefresh.configs.vite,
  jsxA11y.flatConfigs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // Prohibiciones del plan 001 - T007
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message:
            'Prohibido dangerouslySetInnerHTML (Articulo IX). Usa componentes y texto de i18n.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@fluentui/*', '@mui/*', 'antd'],
              message: 'Prohibido usar librerias de UI externas (ADR-0022).',
            },
          ],
        },
      ],
    },
  },

  // localStorage solo en infrastructure/auth y features/ajustes (Articulo IX / ADR-0018)
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/infrastructure/auth/**', 'src/features/ajustes/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'localStorage',
          message: 'localStorage solo se permite en infrastructure/auth y features/ajustes.',
        },
        {
          object: 'localStorage',
          property: 'getItem',
          message: 'localStorage solo se permite en infrastructure/auth y features/ajustes.',
        },
        {
          object: 'localStorage',
          property: 'setItem',
          message: 'localStorage solo se permite en infrastructure/auth y features/ajustes.',
        },
      ],
    },
  },

  {
    files: ['src/features/**/*.{ts,tsx}', 'src/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-zÃÃ‰ÃÃ“ÃšÃ¡Ã©Ã­Ã³ÃºÃ±Ã‘]{3,}/]',
          message:
            'Prohibido escribir texto de UI directamente en JSX. Usa useTranslation con claves de src/locales/es-CO.',
        },
      ],
    },
  },

  {
    files: ['scripts/**/*', '*.config.ts', '*.config.js', 'eslint.config.js'],
    rules: {
      'no-console': 'off',
    },
  }
);
