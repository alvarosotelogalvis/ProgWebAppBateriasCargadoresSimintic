import type { Page } from '@playwright/test';

import { expect, prepararApp, test } from './base';

// Estas pruebas fijan su propio tamaño de ventana: corren una sola vez, no por proyecto.
test.beforeEach(async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'Cambia el tamaño de ventana por su cuenta'
  );
  await prepararApp(page);
});

const navegacion = (page: Page) => page.getByRole('navigation', { name: 'Navegación principal' });

test('360 px: barra inferior con 4 accesos y botón Nuevo flotante (ES-001-07)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');

  const nav = navegacion(page);
  await expect(nav.getByRole('link')).toHaveCount(4);
  for (const nombre of ['Inicio', 'Servicios', 'Sincronizar', 'Más']) {
    await expect(nav.getByRole('link', { name: new RegExp(nombre) })).toBeVisible();
  }
  await expect(nav.getByRole('link', { name: /Ajustes/ })).toHaveCount(0);

  const alto = page.viewportSize()?.height ?? 0;
  const caja = await nav.boundingBox();
  expect((caja?.y ?? 0) + (caja?.height ?? 0)).toBeGreaterThan(alto - 4); // pegada abajo
  await expect(page.getByRole('button', { name: 'Nuevo', exact: true })).toBeVisible();
});

test('768 px: riel lateral con los accesos principales (ES-001-08)', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');

  const nav = navegacion(page);
  await expect(nav.getByRole('link')).toHaveCount(4);
  const caja = await nav.boundingBox();
  expect(caja?.x ?? 99).toBeLessThan(8); // pegado a la izquierda
  expect(caja?.height ?? 0).toBeGreaterThan(300); // vertical
  await expect(page.getByRole('button', { name: 'Nuevo', exact: true })).toBeVisible();
});

test('1280 px: barra lateral con los ítems de «Más» (ES-001-09)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const nav = navegacion(page);
  for (const nombre of ['Inicio', 'Servicios', 'Sincronizar', 'Ajustes', 'Ayuda', 'Acerca de']) {
    await expect(nav.getByRole('link', { name: new RegExp(nombre) })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Nuevo', exact: true })).toBeVisible();
});

test('el indicador de conexión cambia al perder y recuperar la red (ES-001-10)', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.getByText('En línea').first()).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText('Sin conexión').first()).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText('En línea').first()).toBeVisible();
});

test('redimensionar cruzando breakpoints no pierde la ruta ni el estado', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/servicios');
  await expect(page).toHaveURL(/\/servicios$/);

  for (const ancho of [1280, 768, 360]) {
    await page.setViewportSize({ width: ancho, height: 800 });
    await expect(page).toHaveURL(/\/servicios$/);
    await expect(navegacion(page).getByRole('link', { name: /Servicios/ })).toHaveAttribute(
      'aria-current',
      'page'
    );
    await expect(page.getByRole('main')).toBeVisible();
  }
});
