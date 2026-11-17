import { crearRecepcion, expect, prepararApp, sincronizar, test } from './base';

/**
 * Cliente nuevo desde el formulario (spec 010, ADR-0023): sin red se escribe y se agrega ahí mismo, queda como un
 * cliente más (sin «provisional»), un nombre igual propone el existente y al sincronizar existe una sola vez.
 */
test('cliente nuevo sin red → se reutiliza al escribirlo otra vez → al sincronizar existe una sola vez', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no soporta guardar Blob en IndexedDB');
  test.setTimeout(120_000);

  await prepararApp(page);
  await page.goto('/');
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);

  // ES-010-01: sin red se escribe el cliente y se agrega; queda seleccionado como uno más.
  await crearRecepcion(page, 'CLI-NUEVO-1', { nuevo: 'Minera Los Andes' });
  await expect(page.getByText('MINERA LOS ANDES').first()).toBeVisible();
  await expect(page.getByText(/provisional/i)).toHaveCount(0);

  // ES-010-02: el mismo nombre con otras tildes, mayúsculas y espacios propone el existente.
  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/etapa\/recepcion$/, { timeout: 15_000 });
  await page.getByRole('combobox', { name: 'Cliente' }).fill('minera  LOS   andés');
  await expect(
    page.getByRole('button', { name: 'Ya existe «MINERA LOS ANDES». Usar ese cliente' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Agregar «/ })).toHaveCount(0);

  // ES-010-05: el segundo servicio usa el mismo cliente (no se crea otro).
  await crearRecepcion(page, 'CLI-NUEVO-2', { nuevo: 'minera  LOS   andés' });
  await expect(page.getByText('MINERA LOS ANDES').first()).toBeVisible();

  // ES-010-03: al volver la red se sincroniza y el cliente existe una sola vez.
  await context.setOffline(false);
  await sincronizar(page);

  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/etapa\/recepcion$/, { timeout: 15_000 });
  const cliente = page.getByRole('combobox', { name: 'Cliente' });
  await cliente.fill('minera');
  await cliente.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'MINERA LOS ANDES' })).toHaveCount(1);
});
