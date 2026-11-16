import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import boundaries from 'eslint-plugin-boundaries';
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

  // Capas de la arquitectura (ADR-0004, SDD §4.1, CLAUDE.md §3.4).
  // domain ← application ← features; infrastructure implementa los puertos de application.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/test/**'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { project: './tsconfig.json' }, node: true },
      'boundaries/elements': [
        // Transversales (van antes que `shared` y `app`: gana la primera coincidencia).
        // `AppError` es el contrato de errores de todas las capas (SDD §13).
        { type: 'errores', pattern: 'src/shared/errors.ts', mode: 'file' },
        // Único punto por el que `shared` accede a la composición de dependencias (SDD §4.1).
        { type: 'contenedor', pattern: 'src/app/containerContext.tsx', mode: 'file' },
        { type: 'domain', pattern: 'src/domain' },
        { type: 'application', pattern: 'src/application' },
        { type: 'infrastructure', pattern: 'src/infrastructure' },
        { type: 'features', pattern: 'src/features' },
        { type: 'shared', pattern: 'src/shared' },
        { type: 'app', pattern: 'src/app' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: '${file.type} no puede importar ${dependency.type} (ADR-0004, SDD §4.1).',
          rules: [
            { from: 'domain', allow: ['domain', 'errores'] },
            { from: 'application', allow: ['domain', 'application', 'errores'] },
            {
              from: 'infrastructure',
              allow: ['domain', 'application', 'infrastructure', 'shared', 'errores'],
            },
            { from: 'shared', allow: ['domain', 'shared', 'errores', 'contenedor'] },
            {
              from: 'features',
              allow: [
                'domain',
                'application',
                'infrastructure',
                'shared',
                'features',
                'app',
                'errores',
                'contenedor',
              ],
            },
            {
              from: 'app',
              allow: [
                'domain',
                'application',
                'infrastructure',
                'shared',
                'features',
                'app',
                'errores',
                'contenedor',
              ],
            },
            {
              from: 'contenedor',
              allow: [
                'domain',
                'application',
                'infrastructure',
                'shared',
                'errores',
                'features',
                'app',
              ],
            },
            { from: 'errores', allow: ['domain', 'errores'] },
          ],
        },
      ],
    },
  },

  // domain/ y application/ no dependen de React, Dexie, MSAL ni de la red (CLAUDE.md §3.4).
  // Esta regla reemplaza la de `no-restricted-imports` global para estas carpetas: repite la de UI externa.
  {
    files: ['src/domain/**/*.{ts,tsx}', 'src/application/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@fluentui/*', '@mui/*', 'antd'],
              message: 'Prohibido usar librerias de UI externas (ADR-0022).',
            },
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*', 'react-aria-components'],
              message: 'domain/ y application/ no importan React (ADR-0004).',
            },
            {
              regex: '^(dexie|dexie-react-hooks|@azure/[^/]+)(/.*)?$',
              message: 'Dexie y MSAL solo viven en infrastructure/ (ADR-0004); usa un puerto.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'El acceso a la red vive en infrastructure/ (ADR-0004).' },
      ],
    },
  },

  // DEUDA CONOCIDA (ADR-0004): estos casos de uso usan Dexie o utilidades de infrastructure en vez de
  // un puerto. Es una excepción por archivo, no por capa: cualquier archivo nuevo sigue bajo la regla.
  // Al migrarlos a puertos (repositorios / hash / zip), quitar el archivo de esta lista.
  {
    files: [
      'src/application/adjuntos/agregarPdf.ts',
      'src/application/adjuntos/casosDeUso.ts',
      'src/application/mantenimiento/reintentarErrores.ts',
      'src/application/mantenimiento/restablecerApp.ts',
      'src/application/respaldo/respaldo.ts',
      'src/application/sync/purgas.ts',
    ],
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: '${file.type} no puede importar ${dependency.type} (ADR-0004, SDD §4.1).',
          rules: [
            { from: 'application', allow: ['domain', 'application', 'errores', 'infrastructure'] },
          ],
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
