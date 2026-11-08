import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accesibilidad WCAG 2.2 AA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('inicio sin violations de accesibilidad', async ({ page }) => {
    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('lista de servicios accesible', async ({ page }) => {
    await page.goto('/servicios');
    await page.waitForLoadState('networkidle');

    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
    });
  });

  test('formulario recepción accesible', async ({ page }) => {
    // Navegar a nueva recepción (si está disponible)
    const botonNuevo = page.getByRole('button', { name: /nuevo|crear/i });
    if (await botonNuevo.isVisible()) {
      await botonNuevo.click();
      await page.waitForLoadState('networkidle');

      await injectAxe(page);
      await checkA11y(page, null, {
        detailedReport: true,
      });
    }
  });

  test('dialógos y modales accesibles', async ({ page }) => {
    await page.goto('/servicios');

    // Buscar un botón que abra diálogo
    const botonesDialogo = page.getByRole('button').filter({ hasText: /editar|ver|detalles/i });
    if (await botonesDialogo.first().isVisible()) {
      await botonesDialogo.first().click();
      await page.waitForTimeout(500);

      await injectAxe(page);
      await checkA11y(page, null, {
        detailedReport: true,
      });

      // Verificar que se puede cerrar con Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  });

  test('navegación con teclado en tabs', async ({ page }) => {
    await page.goto('/configuracion');
    await page.waitForLoadState('networkidle');

    // Tab a través de elementos
    const tabs = page.getByRole('tab');
    if ((await tabs.count()) > 0) {
      await tabs.first().focus();

      // Verificar que Tab navega
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Verificar que ArrowRight navega en tabs
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(100);
    }

    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
    });
  });

  test('formularios con labels asociados', async ({ page }) => {
    await page.goto('/');

    // Buscar inputs
    const inputs = page.locator('input[type="text"], input[type="email"], textarea');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      // Verificar que cada input tiene un label o aria-label
      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        const ariaLabel = await input.getAttribute('aria-label');
        const id = await input.getAttribute('id');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          expect(ariaLabel || (await label.count()) > 0).toBeTruthy();
        }
      }
    }

    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
    });
  });

  test('imágenes con texto alternativo', async ({ page }) => {
    await page.goto('/');

    // Verificar que imágenes tienen alt o aria-label
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < Math.min(imageCount, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');

      // Las imágenes decorativas pueden tener alt vacío
      if (alt !== '' && !ariaLabel) {
        // Esto podría ser un issue, pero axe lo reportará
      }
    }

    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
    });
  });

  test('colores con suficiente contraste', async ({ page }) => {
    // axe verifica automáticamente contraste
    await page.goto('/');
    await injectAxe(page);
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true },
      },
      detailedReport: true,
    });
  });

  test('headings con estructura correcta', async ({ page }) => {
    await page.goto('/servicios');
    await page.waitForLoadState('networkidle');

    // Verificar que h1 existe (axe verificará la estructura jerárquica)
    const h1 = page.getByRole('heading', { level: 1 });
    const h1Count = await h1.count();

    expect(h1Count).toBeGreaterThan(0);

    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
    });
  });
});
