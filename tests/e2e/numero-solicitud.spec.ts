import { crearRecepcion, expect, prepararApp, test } from './base';

/**
 * Número de solicitud automático (spec 011, ADR-0024): el técnico no lo escribe, el servicio muestra «Pendiente»
 * mientras no se sincroniza y, al sincronizar, recibe el siguiente consecutivo y su código definitivo.
 */
test('registrar sin número → «Pendiente» → sincronizar → número y código definitivos', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no soporta guardar Blob en IndexedDB');
  test.setTimeout(90_000);

  await prepararApp(page);

  // ES-011-01: el formulario no tiene el campo y avisa de que se asigna al sincronizar.
  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+\/etapa\/recepcion$/, { timeout: 15_000 });
  await expect(page.getByLabel('Número de solicitud')).toHaveCount(0);
  await expect(
    page.getByText('El número de solicitud se asigna solo cuando el servicio se sincroniza')
  ).toBeVisible();

  // El servicio se guarda con el código provisional y «Pendiente» en el detalle.
  const codigo = await crearRecepcion(page, 'NUM-E2E-1');
  expect(codigo).toBe('BAT-PEND-NUM-E2E-1');
  const numero = page.getByText('Número de solicitud', { exact: true }).locator('xpath=..');
  await expect(numero).toContainText('Pendiente');

  // ES-011-02: al sincronizar recibe el 1 y el código pasa a ser el definitivo.
  await page.goto('/sincronizacion');
  const confirmar = page.getByRole('button', { name: /Confirmar como tecnico\.demo@empresa\.com/ });
  await expect(confirmar).toBeEnabled({ timeout: 15_000 });
  await confirmar.click();
  const dialogo = page.getByRole('dialog', { name: 'Resumen de la sincronización' });
  await expect(dialogo).toBeVisible({ timeout: 30_000 });
  await dialogo.getByRole('button', { name: 'CERRAR', exact: true }).click();

  await page.goto('/servicios');
  await page.getByRole('button', { name: /NUM-E2E-1/ }).click();
  await expect(page.getByText('BAT-1-NUM-E2E-1')).toBeVisible();
  await expect(
    page.getByText('Número de solicitud', { exact: true }).locator('xpath=..')
  ).toContainText('1');
  await expect(page.getByText('BAT-PEND-NUM-E2E-1')).toHaveCount(0);
});
