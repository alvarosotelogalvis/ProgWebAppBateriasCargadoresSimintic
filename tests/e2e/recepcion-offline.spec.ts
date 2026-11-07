import AxeBuilder from '@axe-core/playwright';

import { expect, prepararApp, test } from './base';

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const PNG_ROJO =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_AZUL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('recepción completa, persistencia y consulta sin conexión', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no soporta guardar Blob en IndexedDB');

  await prepararApp(page);

  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+\/etapa\/recepcion$/, {
    timeout: 15_000,
  });

  const cliente = page.getByRole('combobox', { name: 'Cliente' });
  await cliente.fill('navar');
  await page.waitForTimeout(300);
  await cliente.press('ArrowDown');
  await cliente.press('Enter');

  const marca = page.getByRole('combobox', { name: 'Marca' });
  await marca.fill('ROQUET');
  await page.getByLabel('Referencia').fill('REF-E2E');
  await page.getByLabel('Serie').fill('SERIE-E2E-1');
  await page.getByLabel('Número de solicitud').fill('321');

  await page.locator('input[type="file"][multiple]').setInputFiles([
    {
      name: 'ingreso-1.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_1X1, 'base64'),
    },
    {
      name: 'ingreso-2.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_ROJO, 'base64'),
    },
    {
      name: 'ingreso-3.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_AZUL, 'base64'),
    },
  ]);
  await expect(page.getByRole('button', { name: /^Ver / })).toHaveCount(3, {
    timeout: 15_000,
  });

  const accesibilidadFormulario = await new AxeBuilder({ page }).analyze();
  expect(
    accesibilidadFormulario.violations.filter(
      (violacion) => violacion.impact === 'serious' || violacion.impact === 'critical'
    )
  ).toEqual([]);

  await page.getByRole('button', { name: 'Completar recepción' }).click();
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+$/, { timeout: 15_000 });
  await expect(page.getByText('BAT-321-SERIE-E2E-1')).toBeVisible();

  const accesibilidadDetalle = await new AxeBuilder({ page }).analyze();
  expect(
    accesibilidadDetalle.violations.filter(
      (violacion) => violacion.impact === 'serious' || violacion.impact === 'critical'
    )
  ).toEqual([]);

  await page.reload();
  await expect(page.getByText('BAT-321-SERIE-E2E-1')).toBeVisible({ timeout: 15_000 });

  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.goto('/servicios');
  await expect(page.getByText('BAT-321-SERIE-E2E-1')).toBeVisible({ timeout: 15_000 });
  await context.setOffline(false);
});
