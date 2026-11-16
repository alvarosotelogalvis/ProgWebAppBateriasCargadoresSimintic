import { readFileSync, writeFileSync } from 'node:fs';

import type { Page } from '@playwright/test';

import { strFromU8, unzipSync } from 'fflate';

import { contar, expect, prepararApp, sembrar, servicioSembrado, test, vaciar } from './base';

// La descarga es el camino de escritorio; en WebKit de Playwright no se puede capturar igual.
test.beforeEach(async ({ page, browserName }) => {
  test.skip(
    browserName === 'webkit',
    'La captura de descargas no es fiable en WebKit de Playwright'
  );
  await prepararApp(page);
});

const abrirMenuTecnico = async (page: Page): Promise<void> => {
  await page.goto('/tecnico');
  await expect(page.getByRole('heading', { level: 1, name: 'Menú técnico' })).toBeVisible();
};

test.describe('HU-009-1: Respaldo manual', () => {
  test('exportar solo lo pendiente genera un ZIP con la estructura correcta', async ({
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    });
    await sembrar(page, 'servicios', [
      servicioSembrado(1),
      servicioSembrado(2),
      servicioSembrado(3, { syncState: 'synced', camposSucios: [], estado: 'FACTURADO' }),
    ]);
    await abrirMenuTecnico(page);

    await page.getByRole('button', { name: 'Exportar respaldo' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Exportar respaldo' });
    await expect(dialogo.getByRole('radio', { name: /Solo lo pendiente/ })).toBeChecked();
    const descarga = context.waitForEvent('download');
    await dialogo.getByRole('button', { name: 'Descargar respaldo' }).click();

    const archivo = await descarga;
    expect(archivo.suggestedFilename()).toMatch(
      /^respaldo-solo-pendientes-\d{4}-\d{2}-\d{2}\.zip$/
    );
    const zip = unzipSync(new Uint8Array(readFileSync(await archivo.path())));
    expect(Object.keys(zip)).toEqual(
      expect.arrayContaining(['manifiesto.json', 'servicios.json', 'adjuntos.json'])
    );
    const servicios = JSON.parse(strFromU8(zip['servicios.json']!)) as { id: string }[];
    expect(servicios).toHaveLength(2); // el sincronizado no va en «solo pendientes»
    await expect(dialogo).toHaveCount(0); // el diálogo se cierra al terminar
  });

  test('exportar todo e importar en un dispositivo vacío restaura los servicios sin duplicar', async ({
    page,
    context,
  }, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
    });
    await sembrar(
      page,
      'servicios',
      Array.from({ length: 20 }, (_, i) =>
        servicioSembrado(i + 1, i % 2 ? { syncState: 'synced', camposSucios: [] } : {})
      )
    );
    await abrirMenuTecnico(page);

    await page.getByRole('button', { name: 'Exportar respaldo' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Exportar respaldo' });
    await dialogo.getByText('Todos los servicios').click();
    await expect(dialogo.getByRole('radio', { name: 'Todos los servicios' })).toBeChecked();
    const descarga = context.waitForEvent('download');
    await dialogo.getByRole('button', { name: 'Descargar respaldo' }).click();
    const ruta = testInfo.outputPath('respaldo.zip');
    await (await descarga).saveAs(ruta);

    // «Otro dispositivo»: base vacía.
    await vaciar(page, 'servicios');
    expect(await contar(page, 'servicios')).toBe(0);

    await page.getByRole('button', { name: 'Importar respaldo' }).click();
    const importar = page.getByRole('dialog', { name: 'Importar respaldo' });
    await importar.getByTestId('archivo-respaldo').setInputFiles(ruta);
    await importar.getByRole('button', { name: 'Importar', exact: true }).click();

    await expect(importar.getByText(/20 servicios restaurados, 0 omitidos/)).toBeVisible();
    expect(await contar(page, 'servicios')).toBe(20);

    // Importar el mismo respaldo otra vez no duplica nada.
    await importar.getByRole('button', { name: 'Cerrar' }).first().click();
    await page.getByRole('button', { name: 'Importar respaldo' }).click();
    const otraVez = page.getByRole('dialog', { name: 'Importar respaldo' });
    await otraVez.getByTestId('archivo-respaldo').setInputFiles(ruta);
    await otraVez.getByRole('button', { name: 'Importar', exact: true }).click();
    await expect(
      otraVez.getByText('Todos los servicios del respaldo ya existen en este dispositivo.')
    ).toBeVisible();
    expect(await contar(page, 'servicios')).toBe(20);
  });

  test('un archivo que no es un respaldo muestra el error y no cambia nada', async ({
    page,
  }, testInfo) => {
    await sembrar(page, 'servicios', [servicioSembrado(1)]);
    await abrirMenuTecnico(page);
    const falso = testInfo.outputPath('no-es-un-zip.zip');
    writeFileSync(falso, 'esto no es un zip');

    await page.getByRole('button', { name: 'Importar respaldo' }).click();
    const importar = page.getByRole('dialog', { name: 'Importar respaldo' });
    await importar.getByTestId('archivo-respaldo').setInputFiles(falso);
    await importar.getByRole('button', { name: 'Importar', exact: true }).click();

    await expect(importar.getByText('Error al importar el respaldo')).toBeVisible();
    expect(await contar(page, 'servicios')).toBe(1);
  });

  test('los diálogos son accesibles: tienen nombre y Escape los cierra', async ({ page }) => {
    await abrirMenuTecnico(page);

    for (const [boton, titulo] of [
      ['Exportar respaldo', 'Exportar respaldo'],
      ['Importar respaldo', 'Importar respaldo'],
      ['Liberar espacio', 'Liberar espacio'],
    ] as const) {
      await page.getByRole('button', { name: boton }).click();
      const dialogo = page.getByRole('dialog', { name: titulo });
      await expect(dialogo).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialogo).toHaveCount(0);
    }
  });

  test('si compartir falla en un dispositivo con Web Share, cae a descargar', async ({
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: () => Promise.reject(new DOMException('no permitido', 'NotAllowedError')),
      });
    });
    await sembrar(page, 'servicios', [servicioSembrado(1)]);
    await abrirMenuTecnico(page);

    await page.getByRole('button', { name: 'Exportar respaldo' }).click();
    const descarga = context.waitForEvent('download');
    await page
      .getByRole('dialog', { name: 'Exportar respaldo' })
      .getByRole('button', { name: 'Descargar respaldo' })
      .click();

    expect((await descarga).suggestedFilename()).toMatch(/^respaldo-.*\.zip$/);
  });

  test('el administrador ve todas las acciones del menú técnico', async ({ page }) => {
    // La cuenta simulada tiene los tres roles. El caso «sin rol» lo cubre RoleGuard (unitaria).
    await abrirMenuTecnico(page);

    for (const nombre of [
      'Exportar respaldo',
      'Importar respaldo',
      'Liberar espacio',
      'Reintentar errores',
      'Restablecer la app',
    ]) {
      await expect(page.getByRole('button', { name: nombre })).toBeVisible();
    }
  });
});
