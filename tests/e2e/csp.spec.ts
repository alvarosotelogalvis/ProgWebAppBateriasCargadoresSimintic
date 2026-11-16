import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, resolve } from 'node:path';

import type { Page } from '@playwright/test';

import { crearRecepcion, expect, prepararApp, test as base } from './base';

/**
 * Spike S8 (T051): la app funciona con la CSP REAL de `public/_headers` (sin `style-src 'unsafe-inline'`).
 * Se sirve el build con exactamente esas cabeceras y se falla ante cualquier violación registrada por el
 * navegador (evento `securitypolicyviolation` o error de consola «Content Security Policy»).
 * Solo se omiten, porque no tienen sentido en http://localhost, `Strict-Transport-Security` y la directiva
 * `upgrade-insecure-requests`.
 */
// Carpeta única por proceso y puertos libres: un reinicio del worker nunca choca con el anterior.
const RAIZ = resolve(process.cwd(), `tests/.tmp-csp-${process.pid}`);
const BUILD_MOCK = join(RAIZ, 'mock');
const BUILD_MSAL = join(RAIZ, 'msal');

const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

/** Cabeceras de `public/_headers` (bloque `/*`), tal como las aplicaría Cloudflare Pages. */
const cabecerasReales = (): Record<string, string> => {
  const cabeceras: Record<string, string> = {};
  for (const linea of readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf-8').split(
    /\r?\n/
  )) {
    const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(linea);
    if (!m) continue;
    const [, nombre, valor] = m as unknown as [string, string, string];
    if (nombre === 'Strict-Transport-Security') continue; // solo aplica por https
    cabeceras[nombre] = valor.replace(/;?\s*upgrade-insecure-requests/, '');
  }
  return cabeceras;
};

const construir = (destino: string, env: Record<string, string>): void => {
  execFileSync(
    process.execPath,
    ['./node_modules/vite/bin/vite.js', 'build', '--mode', 'development', '--outDir', destino],
    { env: { ...process.env, ...env }, stdio: 'pipe' }
  );
};

const servir = async (carpeta: string): Promise<{ servidor: Server; url: string }> => {
  const cabeceras = cabecerasReales();
  const servidor = createServer((peticion, respuesta) => {
    const ruta = normalize(decodeURIComponent((peticion.url ?? '/').split('?')[0] ?? '/'));
    let archivo = join(carpeta, ruta);
    if (!archivo.startsWith(carpeta) || !existsSync(archivo) || statSync(archivo).isDirectory()) {
      archivo = join(carpeta, 'index.html');
    }
    for (const [nombre, valor] of Object.entries(cabeceras)) respuesta.setHeader(nombre, valor);
    respuesta.setHeader('Content-Type', TIPOS[extname(archivo)] ?? 'application/octet-stream');
    respuesta.setHeader('Cache-Control', 'no-cache');
    createReadStream(archivo).pipe(respuesta);
  });
  await new Promise<void>((listo) => servidor.listen(0, listo));
  const { port } = servidor.address() as AddressInfo;
  return { servidor, url: `http://localhost:${port}` };
};

const urls = { mock: '', msal: '' };

/** `servidor` elige qué build se prueba; `baseURL` se resuelve al arrancar cada prueba. */
const test = base.extend<{ servidor: 'mock' | 'msal' }>({
  servidor: ['mock', { option: true }],
  baseURL: async ({ servidor }, usar) => {
    await usar(urls[servidor]);
  },
});

let servidores: Server[] = [];
let construido = false;

test.beforeAll(async ({ browserName: _navegador }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'La CSP es la misma en todos los motores'
  );
  test.setTimeout(240_000);

  construir(BUILD_MOCK, {});
  // Build con MSAL real (identificadores con formato válido; no se llega a autenticar).
  construir(BUILD_MSAL, {
    VITE_AUTH_MODE: 'msal',
    VITE_ENTRA_CLIENT_ID: '11111111-1111-4111-8111-111111111111',
    VITE_ENTRA_TENANT_ID: '22222222-2222-4222-8222-222222222222',
  });
  construido = true;
  const [mock, msal] = [await servir(BUILD_MOCK), await servir(BUILD_MSAL)];
  urls.mock = mock.url;
  urls.msal = msal.url;
  servidores = [mock.servidor, msal.servidor];
});

test.afterAll(async () => {
  if (!construido) return;
  await Promise.all(servidores.map((s) => new Promise<void>((listo) => s.close(() => listo()))));
  rmSync(RAIZ, { recursive: true, force: true });
});

let pasoActual = 'carga';

/** Marca el paso del recorrido en curso: las violaciones que aparezcan se atribuyen a él. */
const paso = async (page: Page, nombre: string): Promise<void> => {
  pasoActual = nombre;
  await page.evaluate((n) => sessionStorage.setItem('__paso', n), nombre);
};

/** Registra las violaciones de CSP que vea la página (también al navegar entre documentos). */
const vigilarCsp = async (page: Page): Promise<() => Promise<string[]>> => {
  pasoActual = 'carga';
  const consola: string[] = [];
  page.on('console', (mensaje) => {
    if (
      /Content Security Policy|Refused to (load|apply|execute|connect|frame)/i.test(mensaje.text())
    ) {
      consola.push(`[${pasoActual}] consola: ${mensaje.text().slice(0, 140)}`);
    }
  });
  page.on('pageerror', (error) =>
    consola.push(`[${pasoActual}] error de página: ${error.message}`)
  );
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const previas = JSON.parse(sessionStorage.getItem('__csp') ?? '[]') as string[];
      previas.push(
        `[${sessionStorage.getItem('__paso') ?? 'carga'}] ${e.violatedDirective} bloqueó ${e.blockedURI || '(inline)'} en ${e.sourceFile || e.documentURI}:${e.lineNumber}:${e.columnNumber} muestra «${e.sample}»`
      );
      sessionStorage.setItem('__csp', JSON.stringify(previas));
    });
  });
  return async () => {
    const enPagina = await page.evaluate(
      () => JSON.parse(sessionStorage.getItem('__csp') ?? '[]') as string[]
    );
    return [...enPagina, ...consola];
  };
};

test.describe('CSP real (public/_headers) — spike S8', () => {
  test('la CSP servida es la de _headers y no permite estilos ni scripts en línea', async ({
    page,
  }) => {
    const respuesta = await page.goto('/');
    const csp = respuesta?.headers()['content-security-policy'] ?? '';

    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });

  test('recorrido completo de la app sin una sola violación', async ({ page, context }) => {
    test.setTimeout(180_000);
    const violaciones = await vigilarCsp(page);

    // Configuración inicial (login simulado, catálogos, almacenamiento).
    await prepararApp(page);

    await paso(page, 'pantallas principales');
    // Pantallas principales y de apoyo (CSS Modules, fuentes, SVG de los íconos).
    for (const ruta of [
      '/',
      '/servicios',
      '/sincronizacion',
      '/mas',
      '/alertas',
      '/ayuda',
      '/ayuda/etapas-servicio',
      '/acerca',
      '/cuenta',
      '/ajustes',
    ]) {
      await page.goto(ruta);
      await expect(page.getByRole('main')).toBeVisible();
    }

    await paso(page, 'ajustes');
    // Ajustes: cambia el tamaño de fuente (variable CSS en <html> por CSSOM).
    await page.goto('/ajustes');
    await page.getByRole('radio', { name: 'Muy grande' }).click();
    await expect(page.getByRole('radio', { name: 'Muy grande' })).toBeChecked();

    await paso(page, 'recepción');
    // Recepción: comboboxes (popover de React Aria), fechas, foto (canvas, blob:) y miniaturas.
    await crearRecepcion(page, '901', 'CSP-1');

    await paso(page, 'filtros');
    // Lista: filtros (selects con popover, chips de fecha).
    await page.goto('/servicios');
    await page.getByRole('button', { name: /Filtros/ }).click();
    await page.locator('button[aria-haspopup="listbox"]').first().click();
    await expect(page.getByRole('listbox')).toBeVisible(); // popover de React Aria
    await page.keyboard.press('Escape');

    await paso(page, 'detalle');
    // Detalle del servicio.
    await page.getByText('BAT-901-CSP-1').first().click();
    await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+$/);
    await expect(page.getByText('BAT-901-CSP-1').first()).toBeVisible();

    await paso(page, 'menú técnico');
    // Menú técnico: pestañas, diálogos de respaldo y de liberar espacio.
    await page.goto('/tecnico');
    await page.getByRole('tab', { name: 'Registros de eventos' }).click();
    await page.getByRole('tab', { name: 'Estado de SharePoint' }).click();
    for (const boton of ['Exportar respaldo', 'Importar respaldo', 'Liberar espacio']) {
      await page.getByRole('button', { name: boton }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
    }

    await paso(page, 'catálogo de componentes');
    // Catálogo de componentes (todos los estados: select, toasts, banners, galería).
    await page.goto('/tecnico/ui');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    await paso(page, 'instalar y 404');
    // Pantallas especiales.
    await page.goto('/instalar');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/ruta-que-no-existe');
    await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();

    await paso(page, 'sin conexión');
    // Service worker y trabajo sin conexión (worker-src, caché de precarga).
    await page.goto('/');
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
    await context.setOffline(false);

    expect(await violaciones()).toEqual([]);
  });

  test.describe('con MSAL real', () => {
    test.use({ servidor: 'msal' });

    test('MSAL se carga e inicia sin violaciones y el redirect a Entra ID está permitido', async ({
      page,
    }) => {
      const violaciones = await vigilarCsp(page);
      // Entra ID no es accesible desde las pruebas: se responde una página vacía a cualquier petición.
      await page.route('https://login.microsoftonline.com/**', (ruta) =>
        ruta.fulfill({ status: 200, contentType: 'text/html', body: '<title>login</title>' })
      );
      await page.route('https://graph.microsoft.com/**', (ruta) =>
        ruta.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      );

      await page.goto('/configuracion-inicial');
      await page.getByRole('button', { name: /EMPEZAR/i }).click();
      const iniciar = page.getByRole('button', { name: /Iniciar sesión con Microsoft/i });
      await expect(iniciar).toBeVisible();
      await iniciar.click();

      // MSAL redirige a login.microsoftonline.com (frame-src / form-action / connect-src lo permiten).
      await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 30_000 });

      expect(await violaciones()).toEqual([]);
    });
  });
});
