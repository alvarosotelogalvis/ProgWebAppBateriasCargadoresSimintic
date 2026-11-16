import { expect, sinDesborde, test } from './base';
import { crearEmuladorGraph } from '../fixtures/graph/emulador';

test.describe('Configuración inicial', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      // La pantalla muestra el espacio disponible: se fija para que no dependa del disco de quien corre.
      const proto = (globalThis as { StorageManager?: { prototype: object } }).StorageManager
        ?.prototype;
      if (proto) {
        Object.defineProperty(proto, 'estimate', {
          configurable: true,
          value: async () => ({ usage: 2_000_000, quota: 8_000_000_000 }),
        });
        Object.defineProperty(proto, 'persist', {
          configurable: true,
          value: async () => false,
        });
      }
    });
    const emulador = crearEmuladorGraph();
    await page.route('**/sites/**', async (route) => {
      try {
        const postData = await route
          .request()
          .postDataJSON()
          .catch(() => undefined);
        const respuesta = emulador.manejar(
          route.request().url(),
          route.request().method(),
          postData
        );
        await route.fulfill({
          status: respuesta.status,
          contentType: 'application/json',
          body: JSON.stringify(respuesta.body),
        });
      } catch {
        await route.continue();
      }
    });
    await page.route('**/v1.0/sites/**', async (route) => {
      try {
        const postData = await route
          .request()
          .postDataJSON()
          .catch(() => undefined);
        const respuesta = emulador.manejar(
          route.request().url(),
          route.request().method(),
          postData
        );
        await route.fulfill({
          status: respuesta.status,
          contentType: 'application/json',
          body: JSON.stringify(respuesta.body),
        });
      } catch {
        await route.continue();
      }
    });
  });

  test('flujo completo', async ({ page }) => {
    await page.goto('/configuracion-inicial');
    await expect(page.getByRole('heading', { name: /SERVICIO TÉCNICO/i })).toBeVisible();
    expect(await sinDesborde(page)).toBe(true);
    await expect(page).toHaveScreenshot('configuracion-inicial-bienvenida.png', { fullPage: true });

    await page.getByRole('button', { name: /EMPEZAR/i }).click();
    await expect(page.getByRole('heading', { name: /Inicia sesión/i })).toBeVisible();
    expect(await sinDesborde(page)).toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot('configuracion-inicial-login.png', { fullPage: true });

    await page.getByRole('button', { name: /Iniciar sesión con Microsoft/i }).click();
    await expect(page.getByRole('heading', { name: /Preparar datos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /CONTINUAR/i })).toBeEnabled({ timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    expect(await sinDesborde(page)).toBe(true);
    await expect(page).toHaveScreenshot('configuracion-inicial-preparar.png', { fullPage: true });

    await page.getByRole('button', { name: /CONTINUAR/i }).click();
    await expect(page.getByRole('heading', { name: /Todo listo/i })).toBeVisible({
      timeout: 15000,
    });
    await page.evaluate(() => document.fonts.ready);
    expect(await sinDesborde(page)).toBe(true);
    await expect(page).toHaveScreenshot('configuracion-inicial-listo.png', { fullPage: true });
  });
});
