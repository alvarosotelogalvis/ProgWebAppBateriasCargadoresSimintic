import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Pruebas EN VIVO contra un SharePoint real. Solo se ejecutan a propósito: `npm run test:live` (ver el encabezado de cada prueba). */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/live/**/*.live.test.ts'],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    fileParallelism: false,
  },
  resolve: { alias: { '@': path.resolve(rootDir, './src') } },
});
