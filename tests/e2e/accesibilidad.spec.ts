import AxeBuilder from '@axe-core/playwright';

import { expect, prepararApp, test } from './base';

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
] as const;

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
