import type { Page } from '@playwright/test';

import { crearRecepcion, expect, prepararApp, sinDesborde, test } from './base';

// Las capturas imprimen fechas (tarjetas, recepción): se fija el reloj para que no dependan del día.
const FECHA_FIJA = new Date('2026-11-07T15:00:00-05:00');

test.beforeEach(async ({ page }) => {
  // El reloj arranca en una fecha fija pero sigue avanzando: así los registros creados uno tras otro
  // conservan su orden (con el reloj congelado tendrían la misma marca de tiempo).
  await page.clock.install({ time: FECHA_FIJA });
  await page.clock.resume();
  await prepararApp(page);
});

const listo = async (page: Page): Promise<void> => {
  await expect(page.locator('main')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};

const crearBorrador = async (page: Page): Promise<string> => {
  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/servicios\/([0-9a-f-]+)\/etapa\/recepcion$/, {
    timeout: 15_000,
  });
  const coincidencia = /\/servicios\/([0-9a-f-]+)\/etapa\/recepcion$/.exec(page.url());
  return coincidencia?.[1] ?? '';
};

test('inicio y lista no desbordan horizontalmente', async ({ page }) => {
  await page.goto('/');
  await listo(page);
  expect(await sinDesborde(page)).toBe(true);
  await expect(page).toHaveScreenshot('inicio.png', { fullPage: true });

  await crearBorrador(page);
  await page.goto('/servicios');
  await listo(page);
  expect(await sinDesborde(page)).toBe(true);
  await expect(page).toHaveScreenshot('lista-servicios.png', { fullPage: true });
});

test('formulario de recepcion no desborda horizontalmente', async ({ page }) => {
  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/etapa\/recepcion$/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Completar recepción' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await sinDesborde(page)).toBe(true);
  await expect(page).toHaveScreenshot('recepcion.png', { fullPage: true });
});

test('filtros y detalle del servicio', async ({ page }) => {
  const servicioId = await crearBorrador(page);
  await page.goto('/servicios');
  await listo(page);
  await page.getByRole('button', { name: 'Filtros' }).click();
  await page.evaluate(() => document.fonts.ready);
  expect(await sinDesborde(page)).toBe(true);
  await expect(page).toHaveScreenshot('filtros.png', { fullPage: true });

  await page.goto(`/servicios/${servicioId}`);
  await listo(page);
  await expect(page.getByRole('list', { name: 'Línea de tiempo de etapas' })).toBeVisible();
  expect(await sinDesborde(page)).toBe(true);
  await expect(page).toHaveScreenshot('detalle-servicio.png', { fullPage: true });
});

test('sincronizacion: confirmar, cola y resumen', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no soporta guardar Blob en IndexedDB');
  test.setTimeout(90_000);

  await crearRecepcion(page, '801', 'VIS-1');
  await crearRecepcion(page, '802', 'VIS-2');

  // Confirmar (referencia 09) + cola (referencia 07) con pendientes.
  await page.goto('/sincronizacion');
  await expect(page.getByTestId('resumen-pendientes')).toContainText('2 registros', {
    timeout: 15_000,
  });
  await listo(page);
  expect(await sinDesborde(page)).toBe(true);
  await expect(page).toHaveScreenshot('sincronizacion-confirmar.png', { fullPage: true });

  // Resumen final.
  await page.getByRole('button', { name: /Confirmar como/ }).click();
  const dialogo = page.getByRole('dialog', { name: 'Resumen de la sincronización' });
  await expect(dialogo).toBeVisible({ timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot('sincronizacion-resumen.png');

  // Cola sin pendientes.
  await dialogo.getByRole('button', { name: 'CERRAR', exact: true }).click();
  await expect(dialogo).toBeHidden();
  await expect(page).toHaveScreenshot('sincronizacion-cola.png', { fullPage: true });
});
