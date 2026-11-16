import { readFileSync } from 'node:fs';

import { strFromU8, unzipSync } from 'fflate';

import { contar, expect, prepararApp, sembrar, servicioSembrado, test, vaciar } from './base';

/**
 * Rendimiento del menú técnico con volúmenes grandes (spec 009). Los presupuestos son holgados
 * respecto de las metas de producto porque incluyen la sobrecarga de Playwright y del arranque
 * del navegador; sirven para detectar regresiones gruesas, no para medir milisegundos.
 */
const PRESUPUESTO = {
  cargaMenuMs: 3_000,
  verRegistrosMs: 2_000,
  filtrarMs: 1_500,
  exportarMs: 5_000,
  importarMs: 5_000,
  purgarMs: 5_000,
  cambiarPestanaMs: 300,
} as const;

test.beforeEach(async ({ page, browserName }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Mide una sola vez, en escritorio');
  test.skip(browserName === 'webkit', 'Sin captura de descargas en WebKit');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });
  await prepararApp(page);
});

const registros = (cantidad: number): object[] =>
  Array.from({ length: cantidad }, (_, i) => ({
    ts: new Date(Date.UTC(2026, 9, 1, 0, 0, i)).toISOString(),
    nivel: i % 4 === 0 ? 'error' : i % 3 === 0 ? 'warn' : 'info',
    evento: `evento-${i}`,
    appVersion: '0.0.0',
  }));

test('el menú técnico carga rápido', async ({ page }) => {
  const inicio = Date.now();
  await page.goto('/tecnico');
  await expect(page.getByRole('heading', { level: 1, name: 'Menú técnico' })).toBeVisible();

  expect(Date.now() - inicio).toBeLessThan(PRESUPUESTO.cargaMenuMs);
});

test('cambiar de pestaña responde al instante', async ({ page }) => {
  await page.goto('/tecnico');
  await expect(page.getByRole('tab', { name: 'Estado de SharePoint' })).toBeVisible();

  const { ms, seleccionada } = await page.evaluate(async () => {
    const pestana = [...document.querySelectorAll('[role="tab"]')].find((t) =>
      /SharePoint/.test(t.textContent ?? '')
    ) as HTMLElement;
    const t0 = performance.now();
    pestana.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { ms: performance.now() - t0, seleccionada: pestana.getAttribute('aria-selected') };
  });

  expect(seleccionada).toBe('true');
  expect(ms).toBeLessThan(PRESUPUESTO.cambiarPestanaMs);
});

test('el visor de registros con más de 1000 eventos muestra solo una página y es rápido', async ({
  page,
}) => {
  await sembrar(page, 'logs', registros(1_100));
  await page.goto('/tecnico');
  await expect(page.getByRole('tab', { name: 'Registros de eventos' })).toBeVisible();

  const inicio = Date.now();
  await page.getByRole('tab', { name: 'Registros de eventos' }).click();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  const tiempo = Date.now() - inicio;

  const filas = await page.locator('table tbody tr').count();
  expect(filas).toBeGreaterThan(0);
  expect(filas).toBeLessThanOrEqual(100); // nunca pinta los 1100
  expect(tiempo).toBeLessThan(PRESUPUESTO.verRegistrosMs);
});

test('filtrar los registros por nivel es rápido y solo deja ese nivel', async ({ page }) => {
  await sembrar(page, 'logs', registros(1_100));
  await page.goto('/tecnico');
  await page.getByRole('tab', { name: 'Registros de eventos' }).click();
  await expect(page.locator('table tbody tr').first()).toBeVisible();

  const inicio = Date.now();
  await page.getByLabel('Nivel').selectOption('error');
  await expect
    .poll(async () => {
      const niveles = await page.locator('table tbody tr td:nth-child(2)').allInnerTexts();
      return niveles.length > 0 && niveles.every((nivel) => nivel === 'ERROR');
    })
    .toBe(true);
  expect(Date.now() - inicio).toBeLessThan(PRESUPUESTO.filtrarMs);
});

test('exportar 100 servicios genera un ZIP completo y es rápido', async ({ page, context }) => {
  await sembrar(
    page,
    'servicios',
    Array.from({ length: 100 }, (_, i) =>
      servicioSembrado(i + 1, i % 2 ? { syncState: 'synced', camposSucios: [] } : {})
    )
  );
  await page.goto('/tecnico');
  await page.getByRole('button', { name: 'Exportar respaldo' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Exportar respaldo' });
  await dialogo.getByText('Todos los servicios').click();

  const descarga = context.waitForEvent('download');
  const inicio = Date.now();
  await dialogo.getByRole('button', { name: 'Descargar respaldo' }).click();
  const archivo = await descarga;
  const tiempo = Date.now() - inicio;

  const zip = unzipSync(new Uint8Array(readFileSync(await archivo.path())));
  expect(JSON.parse(strFromU8(zip['servicios.json']!)) as unknown[]).toHaveLength(100);
  expect(tiempo).toBeLessThan(PRESUPUESTO.exportarMs);
});

test('importar un respaldo de 100 servicios es rápido y no pierde ninguno', async ({
  page,
  context,
}, testInfo) => {
  await sembrar(
    page,
    'servicios',
    Array.from({ length: 100 }, (_, i) => servicioSembrado(i + 1))
  );
  await page.goto('/tecnico');
  await page.getByRole('button', { name: 'Exportar respaldo' }).click();
  const descarga = context.waitForEvent('download');
  await page
    .getByRole('dialog', { name: 'Exportar respaldo' })
    .getByRole('button', { name: 'Descargar respaldo' })
    .click();
  const ruta = testInfo.outputPath('respaldo-100.zip');
  await (await descarga).saveAs(ruta);
  await vaciar(page, 'servicios');

  await page.getByRole('button', { name: 'Importar respaldo' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Importar respaldo' });
  await dialogo.getByTestId('archivo-respaldo').setInputFiles(ruta);
  const inicio = Date.now();
  await dialogo.getByRole('button', { name: 'Importar', exact: true }).click();
  await expect(dialogo.getByText(/100 servicios restaurados/)).toBeVisible();

  expect(Date.now() - inicio).toBeLessThan(PRESUPUESTO.importarMs);
  expect(await contar(page, 'servicios')).toBe(100);
});

test('liberar espacio con 100 servicios cerrados antiguos es rápido y los purga', async ({
  page,
}) => {
  await sembrar(
    page,
    'servicios',
    Array.from({ length: 100 }, (_, i) =>
      servicioSembrado(i + 1, {
        estado: 'FACTURADO',
        syncState: 'synced',
        camposSucios: [],
        actualizadoEn: '2025-01-01T00:00:00.000Z',
      })
    )
  );
  await page.goto('/tecnico');
  await page.getByRole('button', { name: 'Liberar espacio' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Liberar espacio' });

  const inicio = Date.now();
  await dialogo.getByRole('button', { name: 'Liberar espacio' }).click();
  await expect(dialogo.getByText('Servicios purgados: 100')).toBeVisible();

  expect(Date.now() - inicio).toBeLessThan(PRESUPUESTO.purgarMs);
  expect(await contar(page, 'servicios')).toBe(0);
});

test('liberar espacio nunca purga lo pendiente de sincronizar', async ({ page }) => {
  await sembrar(page, 'servicios', [
    servicioSembrado(1, { estado: 'FACTURADO', actualizadoEn: '2025-01-01T00:00:00.000Z' }), // pending
    servicioSembrado(2, {
      estado: 'FACTURADO',
      syncState: 'synced',
      camposSucios: [],
      actualizadoEn: '2025-01-01T00:00:00.000Z',
    }),
  ]);
  await page.goto('/tecnico');
  await page.getByRole('button', { name: 'Liberar espacio' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Liberar espacio' });
  await dialogo.getByRole('button', { name: 'Liberar espacio' }).click();

  await expect(dialogo.getByText('Servicios purgados: 1')).toBeVisible();
  expect(await contar(page, 'servicios')).toBe(1); // queda el pendiente
});
