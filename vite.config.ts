import { defineConfig, loadEnv } from 'vite';
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
  const env = loadEnv(mode, rootDir, '');
  const authMode = env.VITE_AUTH_MODE ?? process.env.VITE_AUTH_MODE ?? 'mock';
  if (mode === 'production' && authMode === 'mock') {
    throw new Error(
      'El build de producción no puede usar VITE_AUTH_MODE=mock (SDD 8.6). ' +
        'Define VITE_AUTH_MODE=msal en .env.local, .env.production o en el entorno antes de compilar.'
    );
  }

  if (mode === 'production') {
    const pendientes = [
      'VITE_ENTRA_CLIENT_ID',
      'VITE_ENTRA_TENANT_ID',
      'VITE_SHAREPOINT_SITE_URL',
      'VITE_SHAREPOINT_SITE_NAME',
    ].filter((nombre) => {
      const valor = env[nombre] ?? process.env[nombre] ?? '';
      return (
        valor === '' ||
        /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(valor) ||
        /contoso|TU-TENANT/i.test(valor)
      );
    });
    if (pendientes.length > 0) {
      throw new Error(
        `El build de producción tiene valores sin configurar: ${pendientes.join(', ')}. ` +
          'Completa .env.production a partir de .env.production.example.'
      );
    }
  }

  return {
    plugins: [
      react(),
      svgr(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'script-defer',
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
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
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
