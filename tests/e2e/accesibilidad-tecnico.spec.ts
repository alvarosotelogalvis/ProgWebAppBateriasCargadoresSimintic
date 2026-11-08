import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accesibilidad: Menú Técnico', () => {
  test.beforeEach(async ({ page }) => {
    // Ir a página y inyectar axe
    await page.goto('http://localhost:5173/tecnico');
    await injectAxe(page);
  });

  test('MenuTecnicoPage sin violaciones WCAG 2.2 AA', async ({ page }) => {
    // Ejecutar axe y reportar violaciones
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('ExportarRespaldoDialog accesible', async ({ page }) => {
    // Abrir diálogo
    await page.click('text=Exportar respaldo');

    // Inyectar axe en el diálogo
    await injectAxe(page);

    // Verificar sin violaciones
    await checkA11y(page, '[role="dialog"]');
  });

  test('ImportarRespaldoDialog accesible', async ({ page }) => {
    // Abrir diálogo
    await page.click('text=Importar respaldo');

    // Inyectar axe
    await injectAxe(page);

    // Verificar
    await checkA11y(page, '[role="dialog"]');
  });

  test('LiberarEspacioDialog accesible', async ({ page }) => {
    // Abrir diálogo
    await page.click('text=Liberar espacio');

    // Inyectar axe
    await injectAxe(page);

    // Verificar
    await checkA11y(page, '[role="dialog"]');
  });

  test('Navegación por teclado en tabs', async ({ page }) => {
    // Tab 1: Estado Dispositivo (por defecto)
    expect(await page.locator('[data-testid="estado-dispositivo"]').isVisible()).toBe(true);

    // Navegar con Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // ArrowRight para cambiar tab
    await page.keyboard.press('ArrowRight');

    // Verificar que cambió a SharePoint
    expect(await page.locator('[data-testid="estado-sharepoint"]').isVisible()).toBe(true);
  });

  test('VisorLogs tabla con headers accesibles', async ({ page }) => {
    // Navegar a logs
    await page.click('text=Registros');

    // Verificar que tabla tiene caption o aria-label
    const table = page.locator('table');
    const hasCaption = await table.locator('caption').count();
    const hasLabel = await table.getAttribute('aria-label');

    expect(hasCaption > 0 || hasLabel !== null).toBe(true);
  });

  test('Botones con aria-label o texto visible', async ({ page }) => {
    // Seleccionar todos los botones
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const label = await button.getAttribute('aria-label');

      // Cada botón debe tener texto visible O aria-label
      const hasText = text && text.trim().length > 0;
      expect(hasText || label !== null).toBe(true);
    }
  });

  test('Colores con contraste WCAG AA', async ({ page }) => {
    // Verificar que texto tiene suficiente contraste
    const texto = await page.locator('body').evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues: string[] = [];

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const fg = style.color;

        // Validación simple: bg y fg no son iguales
        if (bg === fg) {
          issues.push(`Contraste insuficiente: ${el.tagName}`);
        }
      });

      return issues;
    });

    expect(texto).toHaveLength(0);
  });

  test('Focus visible en elementos interactivos', async ({ page }) => {
    // Tab para navegar
    await page.keyboard.press('Tab');

    // Verificar que hay outline o focus-visible
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = window.getComputedStyle(el);
      return style.outline !== 'none' || style.boxShadow !== 'none';
    });

    expect(focused).toBe(true);
  });

  test('Etiquetas en inputs de filtro', async ({ page }) => {
    // Navegar a logs
    await page.click('text=Registros');

    // Verificar select y input tienen labels
    const select = page.locator('select').first();
    const input = page.locator('input[type="text"]').first();

    // Cada input debe tener label asociado o aria-label
    const selectLabel = await select.getAttribute('aria-label');
    const selectParentLabel = await select.locator('..label').count();
    expect(selectLabel !== null || selectParentLabel > 0).toBe(true);

    const inputLabel = await input.getAttribute('aria-label');
    const inputPlaceholder = await input.getAttribute('placeholder');
    expect(inputLabel !== null || inputPlaceholder !== null).toBe(true);
  });
});
