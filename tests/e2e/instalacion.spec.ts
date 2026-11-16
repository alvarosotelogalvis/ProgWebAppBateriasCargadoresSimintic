import { expect, test } from '@playwright/test';

import { prepararApp } from './base';

// Estos E2E NO usan el `test` de base.ts: ese simula la app ya instalada (standalone).

const UA_IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
const UA_IPHONE_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1';
const UA_WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

test.describe('iPhone sin instalar (T-22, ES-001-02/03)', () => {
  test.describe('Safari', () => {
    test.use({ userAgent: UA_IPHONE_SAFARI });

    test('lleva a /instalar con los pasos de Compartir y sin «Continuar sin instalar»', async ({
      page,
    }) => {
      await prepararApp(page);

      await page.goto('/');

      await expect(page).toHaveURL(/\/instalar$/);
      await expect(page.getByText(/Agregar a pantalla de inicio/)).toBeVisible();
      await expect(page.getByText('Continuar sin instalar')).toHaveCount(0);
    });

    test('no se puede entrar a otras pantallas sin instalar', async ({ page }) => {
      await prepararApp(page);

      await page.goto('/servicios');

      await expect(page).toHaveURL(/\/instalar$/);
    });
  });

  test.describe('otro navegador', () => {
    test.use({ userAgent: UA_IPHONE_CHROME });

    test('pide abrir el enlace en Safari', async ({ page }) => {
      await prepararApp(page);

      await page.goto('/');

      await expect(page).toHaveURL(/\/instalar$/);
      await expect(
        page.getByText('Abre este enlace en Safari para instalar la app.')
      ).toBeVisible();
      await expect(page.getByText('Continuar sin instalar')).toHaveCount(0);
    });
  });
});

test.describe('escritorio sin instalar (ES-001-04)', () => {
  test.use({ userAgent: UA_WINDOWS_CHROME });

  test('puede continuar sin instalar y ve un banner descartable que no vuelve', async ({
    page,
  }) => {
    await prepararApp(page);

    await page.goto('/instalar');
    await page.getByText('Continuar sin instalar').click();
    await expect(page).toHaveURL(/\/$/);

    const banner = page.getByRole('status').filter({ hasText: 'Instala la app' });
    await expect(banner).toBeVisible();

    await page.getByRole('button', { name: 'Ahora no' }).click();
    await expect(banner).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Instala la app' })).toHaveCount(0);
  });
});
