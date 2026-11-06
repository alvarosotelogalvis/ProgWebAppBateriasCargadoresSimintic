import { expect, test as base, type Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, usar) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', {
        configurable: true,
        get: () => true,
      });
    });
    await usar(page);
  },
});

/**
 * Comprueba que no haya scroll horizontal real. Se compara contra
 * `window.innerWidth` porque en Chromium el ancho de documento incluye la
 * barra de scroll vertical y `clientWidth` no.
 */
export const sinDesborde = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/**
 * Recorre el asistente de configuracion inicial con la autenticacion mock.
 * Lo necesitan los E2E que entran a rutas protegidas por `SetupGuard`.
 */
export const prepararApp = async (page: Page): Promise<void> => {
  await page.goto('/configuracion-inicial');
  const empezar = page.getByRole('button', { name: /EMPEZAR/i });
  const iniciar = page.getByRole('button', { name: /Iniciar sesión con Microsoft/i });
  // El container se hidrata de forma asincrona: esperamos a que aparezca
  // cualquiera de las dos acciones antes de decidir en que paso estamos.
  await expect(empezar.or(iniciar)).toBeVisible();
  if (await empezar.isVisible()) {
    await empezar.click();
  }
  await expect(iniciar).toBeVisible();
  await iniciar.click();
  const continuar = page.getByRole('button', { name: /CONTINUAR/i });
  await expect(continuar).toBeEnabled({ timeout: 30_000 });
  await continuar.click();
  await expect(page.getByRole('heading', { name: /Todo listo/i })).toBeVisible({
    timeout: 15_000,
  });
};

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

/** Completa una recepción mínima (1 foto) y devuelve su código. */
export const crearRecepcion = async (
  page: Page,
  solicitud: string,
  serie: string
): Promise<string> => {
  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+\/etapa\/recepcion$/, {
    timeout: 15_000,
  });

  const cliente = page.getByRole('combobox', { name: 'Cliente' });
  await cliente.fill('navar');
  await page.waitForTimeout(300);
  await cliente.press('ArrowDown');
  await cliente.press('Enter');

  await page.getByRole('combobox', { name: 'Marca' }).fill('ROQUET');
  await page.getByLabel('Referencia').fill('REF-SYNC');
  await page.getByLabel('Serie').fill(serie);
  await page.getByLabel('Numero de solicitud').fill(solicitud);

  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([
      { name: `foto-${serie}.png`, mimeType: 'image/png', buffer: Buffer.from(PNG_1X1, 'base64') },
    ]);
  await expect(page.getByRole('button', { name: /^Ver / })).toHaveCount(1, { timeout: 15_000 });

  await page.getByRole('button', { name: 'Completar recepcion' }).click();
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+$/, { timeout: 15_000 });
  const codigo = `BAT-${solicitud}-${serie}`;
  await expect(page.getByText(codigo)).toBeVisible();
  return codigo;
};

export { expect };
