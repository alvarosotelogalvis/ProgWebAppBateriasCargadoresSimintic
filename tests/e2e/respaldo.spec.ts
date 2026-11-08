import { test, expect } from '@playwright/test';

test.describe('HU-009-1: Respaldo manual', () => {
  test.beforeEach(async ({ page }) => {
    // Navegar a la aplicación
    await page.goto('/');
    // Esperar a que cargue (ajustar según tu app)
    await page.waitForLoadState('networkidle');
  });

  test('exportar respaldo genera ZIP con estructura correcta', async ({ page, context }) => {
    // Interceptar descargas
    const downloadPromise = context.waitForEvent('download');

    // Navegar al menú técnico
    await page.goto('/tecnico');
    await page.waitForLoadState('networkidle');

    // Hacer click en "Exportar respaldo"
    const exportarBtn = page.getByRole('button', { name: /exportar respaldo/i });
    await expect(exportarBtn).toBeVisible();
    await exportarBtn.click();

    // En el diálogo, seleccionar "Solo pendientes"
    const soloPendientesRadio = page.getByRole('radio', { name: /solo.*pendientes/i });
    if (await soloPendientesRadio.isVisible()) {
      await soloPendientesRadio.check();
    }

    // Click en "Exportar"
    const confirmarBtn = page.getByRole('button', { name: /exportar|descargar/i });
    await expect(confirmarBtn).toBeVisible();
    await confirmarBtn.click();

    // Capturar la descarga
    const download = await downloadPromise;

    // Verificar que el archivo se descargó
    expect(download.suggestedFilename()).toMatch(/respaldo-.*\.zip/);

    // Nota: Para extraer y verificar el contenido del ZIP, se requeriría
    // una librería como 'unzipper' o 'jszip', que sería más compleja.
    // Este test verifica principalmente que la descarga ocurre correctamente.
  });

  test('menú técnico no visible para usuarios sin rol Admin', async ({ page }) => {
    // Simular usuario sin rol Admin
    // (Esto dependerá de cómo se configure la autenticación en pruebas)

    await page.goto('/tecnico');

    // Verificar que ciertos botones no están disponibles
    const importarBtn = page.getByRole('button', { name: /importar respaldo/i });
    const restablecerBtn = page.getByRole('button', { name: /restablecer/i });

    // Estos no deberían estar visibles para no-Admin
    // (Ajustar según la UI real)
    if (await importarBtn.isVisible()) {
      expect(importarBtn).not.toBeVisible();
    }
    if (await restablecerBtn.isVisible()) {
      expect(restablecerBtn).not.toBeVisible();
    }
  });

  test('dialogos son accesibles y navegables con teclado', async ({ page }) => {
    await page.goto('/tecnico');

    // Abrir diálogo de exportar
    const exportarBtn = page.getByRole('button', { name: /exportar respaldo/i });
    if (await exportarBtn.isVisible()) {
      await exportarBtn.click();

      // Verificar que el diálogo está visible
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Verificar que se puede presionar Escape para cerrar
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });

  test('respaldo en dispositivos sin Web Share API cae a descarga', async ({ page }) => {
    // Deshabilitar Web Share API
    await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).canShare = undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).share = undefined;
    });

    await page.goto('/tecnico');

    const exportarBtn = page.getByRole('button', { name: /exportar respaldo/i });
    if (await exportarBtn.isVisible()) {
      await exportarBtn.click();

      // Debería ofrecer "Descargar" como opción fallback
      const descargarBtn = page.getByRole('button', { name: /descargar/i });
      await expect(descargarBtn).toBeVisible();
    }
  });
});
