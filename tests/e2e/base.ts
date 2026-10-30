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

export { expect };
