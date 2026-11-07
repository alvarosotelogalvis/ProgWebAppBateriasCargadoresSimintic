import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { crearRecepcion, expect, prepararApp, sinDesborde, test } from './base';

const sinViolacionesSerias = async (page: Page): Promise<void> => {
  const resultado = await new AxeBuilder({ page }).analyze();
  expect(
    resultado.violations.filter(
      (violacion) => violacion.impact === 'serious' || violacion.impact === 'critical'
    )
  ).toEqual([]);
};

test('sin conexión → recepciones → aviso al volver la red → sincronizar → resumen', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no soporta guardar Blob en IndexedDB');
  test.setTimeout(120_000);

  await prepararApp(page);
  await page.goto('/');
  await page.evaluate(async () => navigator.serviceWorker.ready);

  // ES-005-21/23: sin red se captura igual; el contador muestra los pendientes.
  await context.setOffline(true);
  const primero = await crearRecepcion(page, '701', 'SYNC-E2E-1');
  const segundo = await crearRecepcion(page, '702', 'SYNC-E2E-2');
  await expect(page.getByRole('link', { name: /2\s*pendientes/i })).toBeVisible();

  // Al volver la conexión se ofrece sincronizar; nunca sincroniza solo.
  await context.setOffline(false);
  const aviso = page.getByText('Tienes 2 pendientes. ¿Sincronizar ahora?');
  await expect(aviso).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'SINCRONIZAR AHORA' }).click();
  await expect(page).toHaveURL(/\/sincronizacion$/);

  // Confirmación (referencia 09) y cola (referencia 07).
  const confirmar = page.getByRole('button', { name: /Confirmar como tecnico\.demo@empresa\.com/ });
  await expect(confirmar).toBeEnabled({ timeout: 15_000 });
  await expect(page.getByText('2 registros · 2 archivos', { exact: false })).toBeVisible();
  expect(await sinDesborde(page)).toBe(true);
  await sinViolacionesSerias(page);

  await confirmar.click();

  // ES-005-19: resumen al terminar.
  const dialogo = page.getByRole('dialog', { name: 'Resumen de la sincronización' });
  await expect(dialogo).toBeVisible({ timeout: 30_000 });
  await expect(dialogo.getByText('Sincronización completa')).toBeVisible();
  await expect(dialogo.getByText('Registros subidos').locator('xpath=..')).toContainText('2');
  await expect(dialogo.getByText('Archivos subidos').locator('xpath=..')).toContainText('2');
  await sinViolacionesSerias(page);
  await dialogo.getByRole('button', { name: 'CERRAR', exact: true }).click();
  await expect(dialogo).toBeHidden();

  await expect(page.getByRole('img', { name: 'Sincronizado: 100%' })).toBeVisible();
  await expect(page.getByRole('link', { name: /pendientes/i })).toBeHidden();

  // Badges de sync en la lista.
  await page.goto('/servicios');
  for (const codigo of [primero, segundo]) {
    await expect(page.getByRole('button', { name: new RegExp(codigo) })).toContainText(
      'Sincronizado'
    );
  }
});
