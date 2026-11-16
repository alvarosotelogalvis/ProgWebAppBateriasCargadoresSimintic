import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, rmSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

import type { Page } from '@playwright/test';

import { expect, prepararApp, test } from './base';

/**
 * T-23 (HU-001-5): dos builds con distinta versión servidos como si fueran el mismo sitio.
 * Se construye A (1.0.0) y B (9.9.9) y un servidor estático sirve A; a mitad de la prueba pasa a
 * servir B, como si se hubiera publicado una versión nueva.
 */
const RAIZ = resolve(process.cwd(), 'tests/.tmp-actualizacion');
const BUILD_A = join(RAIZ, 'a');
const BUILD_B = join(RAIZ, 'b');
const PUERTO = 4180;
const VERSION_A = '1.0.0';
const VERSION_B = '9.9.9';

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

const construir = (destino: string, version: string): void => {
  execFileSync(
    process.execPath,
    ['./node_modules/vite/bin/vite.js', 'build', '--mode', 'development', '--outDir', destino],
    {
      env: { ...process.env, npm_package_version: version },
      stdio: 'pipe',
    }
  );
};

let servidor: Server | undefined;
let construido = false;
let carpetaActual = BUILD_A;

test.use({ baseURL: `http://localhost:${PUERTO}` });

test.beforeAll(async ({ browserName: _navegador }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Un solo proyecto basta');
  test.setTimeout(240_000);

  construir(BUILD_A, VERSION_A);
  construir(BUILD_B, VERSION_B);
  construido = true;

  servidor = createServer((peticion, respuesta) => {
    const ruta = normalize(decodeURIComponent((peticion.url ?? '/').split('?')[0] ?? '/'));
    let archivo = join(carpetaActual, ruta);
    if (
      !archivo.startsWith(carpetaActual) ||
      !existsSync(archivo) ||
      statSync(archivo).isDirectory()
    ) {
      archivo = join(carpetaActual, 'index.html'); // la app es una SPA
    }
    respuesta.setHeader('Content-Type', TIPOS[extname(archivo)] ?? 'application/octet-stream');
    // El service worker y el HTML nunca se cachean: así se detecta la versión nueva.
    respuesta.setHeader('Cache-Control', 'no-cache');
    createReadStream(archivo).pipe(respuesta);
  });
  await new Promise<void>((listo) => servidor.listen(PUERTO, listo));
});

test.afterAll(async () => {
  // Solo limpia quien construyó: los proyectos omitidos no deben borrar los builds del que corre.
  if (!construido) return;
  rmSync(RAIZ, { recursive: true, force: true });
  await new Promise<void>((listo) => (servidor ? servidor.close(() => listo()) : listo()));
});

const versionMostrada = async (page: Page): Promise<string> => {
  await page.goto('/acerca');
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  return (await page.locator('main').innerText()).includes(VERSION_B) ? VERSION_B : VERSION_A;
};

test('aviso de versión nueva: con cambios sin guardar espera; sin trabajo en curso actualiza', async ({
  page,
}) => {
  test.setTimeout(120_000);
  carpetaActual = BUILD_A;

  await prepararApp(page);
  expect(await versionMostrada(page)).toBe(VERSION_A);

  // El service worker de la versión A queda activo y controlando la página.
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await expect(page.getByText('Hay una nueva versión disponible.')).toHaveCount(0);

  // Se «publica» la versión B y la app la detecta.
  carpetaActual = BUILD_B;
  await page.evaluate(async () => {
    const registro = await navigator.serviceWorker.getRegistration();
    await registro?.update();
  });
  await expect(page.getByText('Hay una nueva versión disponible.')).toBeVisible({
    timeout: 30_000,
  });

  // Un formulario con cambios por guardar: la actualización ESPERA (ES-001-19).
  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+\/etapa\/recepcion$/, { timeout: 15_000 });
  await page.getByLabel('Referencia').fill('REF-EN-CURSO');
  await page.getByRole('button', { name: 'ACTUALIZAR' }).click();
  await expect(page.getByText('Se actualizará al terminar lo que estás haciendo.')).toBeVisible();
  await expect(page.getByLabel('Referencia')).toHaveValue('REF-EN-CURSO'); // no se recargó

  // Terminado el autoguardado ya no hay trabajo en curso: ACTUALIZAR aplica la versión B (ES-001-20).
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible({ timeout: 10_000 });
  await Promise.all([
    page.waitForEvent('load', { timeout: 30_000 }),
    page.getByRole('button', { name: 'ACTUALIZAR' }).click(),
  ]);

  expect(await versionMostrada(page)).toBe(VERSION_B);
  await expect(page.getByText('Hay una nueva versión disponible.')).toHaveCount(0);
});
