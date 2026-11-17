import { join } from 'node:path';

import type { Page } from '@playwright/test';

import { crearRecepcion, expect, prepararApp, test } from './base';

/**
 * T041 · Ciclo completo de un servicio (spec 007) sobre la app con autenticación mock.
 * La cuenta mock reúne los tres roles (Técnico, Comercial y Administrador); la separación
 * de permisos por rol se verifica en las pruebas de integración de `application/servicios`.
 */

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const PDF_VALIDO = join(process.cwd(), 'tests', 'fixtures', 'pdf', 'valido-200kb.pdf');
const PDF_FALSO = join(process.cwd(), 'tests', 'fixtures', 'pdf', 'falso.pdf');
const HOY = new Date().toLocaleDateString('en-CA');

const aDetalle = (page: Page) =>
  expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+$/, { timeout: 15_000 });

const entrarA = async (page: Page, boton: string, ruta: RegExp) => {
  await page.getByRole('button', { name: boton }).click();
  await expect(page).toHaveURL(ruta, { timeout: 15_000 });
};

const adjuntarPdf = async (page: Page, indice: number, archivo = PDF_VALIDO) => {
  await page.locator('input[type="file"][accept*="pdf"]').nth(indice).setInputFiles(archivo);
};

const diagnosticar = async (page: Page, diagnostico: string) => {
  await entrarA(page, 'Registrar diagnóstico', /\/etapa\/diagnostico$/);
  await page.getByLabel('Diagnóstico', { exact: true }).selectOption(diagnostico);
  await page.getByLabel('Observación técnica').fill('Celdas con desbalance leve');
  await adjuntarPdf(page, 0);
  await expect(page.getByRole('button', { name: 'Ver PDF' })).toBeVisible();
};

const cotizar = async (page: Page, respuesta: 'Aprobada' | 'Rechazada') => {
  await entrarA(page, 'Registrar cotización', /\/etapa\/cotizacion$/);
  await page.getByLabel('Valor de la cotización').fill('1500000');
  await page.getByRole('button', { name: 'Registrar cotización' }).click();
  await aDetalle(page);
  await expect(page.getByText('Cotizado', { exact: true })).toBeVisible();

  await entrarA(page, 'Registrar respuesta del cliente', /\/etapa\/cotizacion$/);
  await page.getByRole('radio', { name: respuesta }).click();
  await expect(page.getByRole('radio', { name: respuesta })).toBeChecked();
  await page.getByRole('button', { name: 'Volver a servicios' }).click();
  await aDetalle(page);
};

const fotoDeSalida = async (page: Page) => {
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([
      { name: 'salida.png', mimeType: 'image/png', buffer: Buffer.from(PNG_1X1, 'base64') },
    ]);
  await expect(page.getByRole('button', { name: /^Ver / })).toHaveCount(1, { timeout: 15_000 });
};

/** Recepción → Diagnóstico → Cotización aprobada → OT → Entrega → Facturación. */
const cicloHastaFacturado = async (page: Page, serie: string) => {
  await prepararApp(page);
  await crearRecepcion(page, serie);

  await diagnosticar(page, 'REPARAR');
  await page.getByRole('button', { name: 'Completar diagnóstico' }).click();
  await aDetalle(page);
  await expect(page.getByText('Diagnosticado', { exact: true })).toBeVisible();

  await cotizar(page, 'Aprobada');

  await entrarA(page, 'Generar orden de trabajo', /\/etapa\/orden-trabajo$/);
  await page.getByLabel('Detalle de la reparación').fill('Cambio de celdas y prueba de carga');
  await page.getByLabel('Costo de la reparación interna').fill('350000');
  await page.getByRole('button', { name: 'Crear orden de trabajo' }).click();
  await aDetalle(page);
  await expect(page.getByText('En reparación', { exact: true })).toBeVisible();

  await entrarA(page, 'Registrar entrega', /\/etapa\/entrega$/);
  await fotoDeSalida(page);
  await page.getByRole('button', { name: '+12 meses' }).click();
  await page.getByRole('button', { name: 'Completar entrega' }).click();
  await aDetalle(page);
  await expect(page.getByText('Entregado', { exact: true })).toBeVisible();

  await entrarA(page, 'Registrar facturación', /\/etapa\/facturacion$/);
  await adjuntarPdf(page, 0);
  await expect(page.getByRole('button', { name: 'Ver PDF' })).toBeVisible();
  await page.getByLabel('Número de factura (opcional)').fill('FE-2026-001');
  await page.getByRole('button', { name: 'Completar facturación' }).click();
  await aDetalle(page);
};

test.beforeEach(({ browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no soporta guardar Blob en IndexedDB');
});

test.describe('Ciclo completo de un servicio', () => {
  test('llega de BORRADOR a FACTURADO con la ruta de reparación', async ({ page }) => {
    test.setTimeout(120_000);

    await cicloHastaFacturado(page, 'CICLO-1');

    await expect(page.getByText('Facturado', { exact: true })).toBeVisible();
    await expect(page.getByText('Este servicio ya está cerrado.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fotos de salida' })).toBeVisible();
    // La línea de tiempo resume lo registrado en cada etapa.
    await expect(page.getByText('FE-2026-001', { exact: false })).toBeVisible();
    await expect(page.getByText('REPARAR')).toBeVisible();
  });

  test('cierra por disposición final sin pasar por cotización, OT ni entrega', async ({ page }) => {
    test.setTimeout(90_000);
    await prepararApp(page);
    await crearRecepcion(page, 'CICLO-DF');

    await diagnosticar(page, 'D. FINAL');
    await expect(
      page.getByText('Se cerrará el registro sin pasar por las demás etapas.')
    ).toBeVisible();
    await page.locator('#fecha-socializacion').fill(HOY);
    await adjuntarPdf(page, 1);
    await page.getByRole('button', { name: 'Completar disposición final' }).click();
    await page.getByRole('button', { name: 'Sí, cerrar' }).click();

    await aDetalle(page);
    await expect(page.getByText('Disposición final', { exact: true })).toBeVisible();
    await expect(page.getByText('Este servicio ya está cerrado.')).toBeVisible();
  });

  test('entrega sin reparación cuando la cotización es rechazada', async ({ page }) => {
    test.setTimeout(120_000);
    await prepararApp(page);
    await crearRecepcion(page, 'CICLO-SR');
    await diagnosticar(page, 'REPARAR');
    await page.getByRole('button', { name: 'Completar diagnóstico' }).click();
    await aDetalle(page);
    await cotizar(page, 'Rechazada');

    await entrarA(page, 'Registrar entrega', /\/etapa\/entrega$/);
    await expect(page.getByRole('heading', { name: 'Entrega sin reparación' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Vida útil (opcional)' })).toBeVisible();
    await fotoDeSalida(page);
    await page.getByRole('button', { name: 'Completar entrega' }).click();

    await aDetalle(page);
    await expect(page.getByText('Entregado', { exact: true })).toBeVisible();
  });

  test('el Administrador anula un servicio con motivo y queda de solo lectura', async ({
    page,
  }) => {
    await prepararApp(page);
    await crearRecepcion(page, 'CICLO-AN');

    await page.getByRole('button', { name: 'Anular servicio' }).click();
    const confirmar = page.getByRole('button', { name: 'Sí, anular' });
    await expect(confirmar).toBeDisabled();
    await page.getByLabel('Motivo de la anulación').fill('Registro duplicado por error');
    await confirmar.click();

    await expect(page.getByText('Anulado', { exact: true })).toBeVisible();
    await expect(page.getByText('Este servicio ya está cerrado.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anular servicio' })).toHaveCount(0);
  });
});

test.describe('Validaciones del ciclo', () => {
  test('rechaza un archivo que no es PDF aunque tenga extensión .pdf', async ({ page }) => {
    await prepararApp(page);
    await crearRecepcion(page, 'CICLO-PDF');
    await entrarA(page, 'Registrar diagnóstico', /\/etapa\/diagnostico$/);

    await adjuntarPdf(page, 0, PDF_FALSO);

    await expect(page.getByRole('alert')).toContainText('El archivo no es un PDF válido.');
    await expect(page.getByRole('button', { name: 'Ver PDF' })).toHaveCount(0);
  });

  test('no deja completar el diagnóstico sin el PDF y lista lo que falta', async ({ page }) => {
    await prepararApp(page);
    await crearRecepcion(page, 'CICLO-FALTA');
    await entrarA(page, 'Registrar diagnóstico', /\/etapa\/diagnostico$/);
    await page.getByLabel('Diagnóstico', { exact: true }).selectOption('REPARAR');
    await page.getByLabel('Observación técnica').fill('Celdas con desbalance leve');

    await page.getByRole('button', { name: 'Completar diagnóstico' }).click();

    await expect(page.getByText('Faltan datos para completar:')).toBeVisible();
    await expect(
      page.getByRole('listitem').filter({ hasText: 'Formato de diagnóstico (PDF)' })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/etapa\/diagnostico$/);
  });

  test('el Administrador corrige un dato cerrado y se rechazan las fechas incoherentes', async ({
    page,
  }) => {
    test.setTimeout(150_000);
    await cicloHastaFacturado(page, 'CICLO-FIX');

    await page.getByRole('button', { name: 'Editar datos' }).click();
    await expect(page).toHaveURL(/\/corregir$/);

    // Una entrega anterior a la recepción es incoherente.
    await page.locator('#corregir-fechaEntrega').fill('2020-01-01');
    await page.getByRole('button', { name: 'Guardar correcciones' }).click();
    await expect(page.getByText('Revisa estos datos:')).toBeVisible();
    await expect(page).toHaveURL(/\/corregir$/);

    // Corregir solo el número de factura sí se guarda y el estado no cambia.
    await page.locator('#corregir-fechaEntrega').fill(HOY);
    await page.getByLabel('Número de factura (opcional)').fill('FE-2026-002');
    await page.getByRole('button', { name: 'Guardar correcciones' }).click();

    await aDetalle(page);
    await expect(page.getByText('Facturado', { exact: true })).toBeVisible();
    await expect(page.getByText('FE-2026-002', { exact: false })).toBeVisible();
  });
});
