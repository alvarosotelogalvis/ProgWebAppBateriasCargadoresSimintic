import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function git(...args: string[]): string {
  try {
    return execSync(`git ${args.join(' ')}`, { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    return 'desconocido';
  }
}

const version = process.env.npm_package_version ?? '0.0.0';
const commit = git('rev-parse', '--short', 'HEAD');
const buildDate = new Date().toISOString();

export default defineConfig(({ mode }) => {
  const authMode = process.env.VITE_AUTH_MODE ?? 'mock';
  if (mode === 'production' && authMode === 'mock') {
    throw new Error(
      'El build de producción no puede usar VITE_AUTH_MODE=mock (SDD 8.6). ' +
        'Configura VITE_AUTH_MODE=msal antes de compilar.'
    );
  }

  return {
    plugins: [
      react(),
      svgr(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['icons/*.png'],
        manifest: {
          name: 'Servicio Técnico Baterías y Cargadores',
          short_name: 'STBC',
          description: 'App de servicio técnico de baterías y cargadores',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait-primary',
          background_color: '#1F6FE5',
          theme_color: '#4A4AF8',
          lang: 'es-CO',
          categories: ['business', 'productivity'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
          clientsClaim: false,
          skipWaiting: false,
          runtimeCaching: [],
        },
        devOptions: { enabled: false },
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __GIT_COMMIT__: JSON.stringify(commit),
      __BUILD_DATE__: JSON.stringify(buildDate),
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
        generateScopedName: '[name]__[local]__[hash:base64:5]',
      },
    },
    build: {
      target: 'es2020',
      sourcemap: mode !== 'production',
      chunkSizeWarningLimit: 400,
    },
    server: {
      port: 5173,
    },
    preview: {
      port: 4173,
    },
  };
});
