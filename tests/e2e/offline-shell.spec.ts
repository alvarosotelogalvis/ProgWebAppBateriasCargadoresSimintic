import { expect, prepararApp, test } from './base';

test('tras la primera carga, sin conexión: Inicio con Montserrat e íconos (ES-001-05, ES-001-25)', async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no registra el service worker de preview');

  await prepararApp(page);
  await page.goto('/');
  await expect(page.getByRole('main')).toBeVisible();

  // Con el service worker activo y el shell precacheado, un reload sin red debe cargar igual.
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(async () => navigator.serviceWorker.ready);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('main')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Sin conexión').first()).toBeVisible();

  // La tipografía y los íconos son locales: se ven igual que con conexión.
  const tipografia = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      cargada: document.fonts.check('1em Montserrat'),
      familia: getComputedStyle(document.body).fontFamily,
    };
  });
  expect(tipografia.cargada).toBe(true);
  expect(tipografia.familia).toContain('Montserrat');

  const iconos = page.getByRole('navigation').locator('svg');
  expect(await iconos.count()).toBeGreaterThan(0);
  const caja = await iconos.first().boundingBox();
  expect(caja?.width ?? 0).toBeGreaterThan(0);

  await context.setOffline(false);
});
