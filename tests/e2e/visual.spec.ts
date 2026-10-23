import type { Page } from '@playwright/test';

import { expect, test } from './base';

const sinDesborde = async (page: Page): Promise<boolean> =>
  page.evaluate(() => {
    const raiz = document.documentElement;
    return raiz.scrollWidth <= raiz.clientWidth + 1;
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
  await expect(page.getByRole('button', { name: 'Completar recepcion' })).toBeVisible();
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
  await expect(page.getByRole('list', { name: 'Linea de tiempo de etapas' })).toBeVisible();
  expect(await sinDesborde(page)).toBe(true);
  await expect(page).toHaveScreenshot('detalle-servicio.png', { fullPage: true });
});
