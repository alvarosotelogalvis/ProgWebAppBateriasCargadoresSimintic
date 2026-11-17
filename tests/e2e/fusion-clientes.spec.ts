import { crearRecepcion, expect, prepararApp, sincronizar, test } from './base';

/**
 * Fusión de clientes (spec 010, ADR-0023), en modo simulado: el Administrador fusiona un cliente en otro; los
 * servicios pasan al destino y el origen deja de ofrecerse.
 */
const ORIGEN = 'Cliente que se fusiona (dejará de ofrecerse)';
const DESTINO = 'Cliente que se conserva';

test('el administrador fusiona dos clientes y los servicios pasan al destino', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no soporta guardar Blob en IndexedDB');
  test.setTimeout(150_000);

  await prepararApp(page);
  // Un servicio sincronizado de «Navar Asociados».
  await crearRecepcion(page, 'FUS-1');
  await sincronizar(page);

  // Navegación dentro de la app: recargar reiniciaría el SharePoint simulado (vive en memoria) y se perderían
  // los servicios que acaba de subir.
  await page.evaluate(() => {
    window.history.pushState({}, '', '/tecnico/clientes');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page.getByRole('heading', { level: 1, name: 'Clientes' })).toBeVisible();
  const elegir = async (etiqueta: string, texto: string): Promise<void> => {
    const combo = page.getByRole('combobox', { name: etiqueta });
    await combo.fill(texto);
    await page.waitForTimeout(300);
    await combo.press('ArrowDown');
    await combo.press('Enter');
  };
  await elegir(ORIGEN, 'navar');
  await elegir(DESTINO, 'distribuidora');

  // ES-010-06: confirma y fusiona; el resumen cuenta los servicios reasignados.
  await page.getByRole('button', { name: 'Fusionar clientes' }).click();
  const dialogo = page.getByRole('dialog', { name: '¿Fusionar estos clientes?' });
  await expect(dialogo).toContainText('Navar Asociados');
  await expect(dialogo).toContainText('Distribuidora Andina');
  await dialogo.getByRole('button', { name: 'Fusionar', exact: true }).click();
  await expect(page.getByText(/Se reasignó 1 servicio/)).toBeVisible({ timeout: 30_000 });

  // El origen deja de ofrecerse en el formulario (solo queda ofrecer agregarlo como nuevo).
  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/etapa\/recepcion$/, { timeout: 15_000 });
  const cliente = page.getByRole('combobox', { name: 'Cliente' });
  await cliente.fill('navar');
  await cliente.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Navar Asociados' })).toHaveCount(0);
});
