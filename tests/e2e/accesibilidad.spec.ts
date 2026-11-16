import AxeBuilder from '@axe-core/playwright';

import { expect, prepararApp, sinDesborde, test } from './base';

/** Pantallas que no dependen de datos previos. `/tecnico` exige rol Administrador (la cuenta mock lo tiene). */
const RUTAS = [
  '/',
  '/servicios',
  '/alertas',
  '/sincronizacion',
  '/mas',
  '/ajustes',
  '/ayuda',
  '/ayuda/etapas-servicio',
  '/acerca',
  '/cuenta',
  '/tecnico',
  '/tecnico/ui',
  '/instalar',
] as const;

/** Anchos de 320 a 1920 px (CE-001-08): el contenido nunca debe desplazarse en horizontal. */
const ANCHOS = [320, 360, 600, 768, 1024, 1280, 1440, 1920] as const;
const RUTAS_SIN_DESBORDE = ['/', '/servicios', '/mas', '/ajustes', '/ayuda', '/acerca'] as const;

const ETIQUETAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('Accesibilidad WCAG 2.2 AA', () => {
  test.beforeEach(async ({ page }) => {
    await prepararApp(page);
  });

  for (const ruta of RUTAS) {
    test(`${ruta} sin violaciones de axe`, async ({ page }) => {
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
        timeout: 15_000,
      });

      const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS).analyze();

      expect(
        resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)
      ).toEqual([]);
    });
  }

  test('sin desplazamiento horizontal de 320 a 1920 px (CE-001-08)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium-desktop', 'Fija su propio tamaño de ventana');

    for (const ruta of RUTAS_SIN_DESBORDE) {
      await page.goto(ruta);
      await expect(page.getByRole('main')).toBeVisible();
      for (const ancho of ANCHOS) {
        await page.setViewportSize({ width: ancho, height: 800 });
        expect(await sinDesborde(page), `${ruta} a ${ancho}px`).toBe(true);
      }
    }
  });

  test('el menú técnico no tiene botones sin nombre accesible', async ({ page }) => {
    await page.goto('/tecnico');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    const botones = page.getByRole('button');
    const total = await botones.count();
    for (let i = 0; i < total; i++) {
      const nombre = await botones.nth(i).evaluate((el) => {
        const aria = el.getAttribute('aria-label') ?? '';
        return (aria || el.textContent || '').trim();
      });
      expect(nombre.length).toBeGreaterThan(0);
    }
  });
});
