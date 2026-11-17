import { expect, test as base, type Page } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, usar) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', {
        configurable: true,
        get: () => true,
      });
    });
    await usar(page);
  },
});

/**
 * Comprueba que no haya scroll horizontal real. Se compara contra
 * `window.innerWidth` porque en Chromium el ancho de documento incluye la
 * barra de scroll vertical y `clientWidth` no.
 */
export const sinDesborde = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/**
 * Recorre el asistente de configuracion inicial con la autenticacion mock.
 * Lo necesitan los E2E que entran a rutas protegidas por `SetupGuard`.
 */
export const prepararApp = async (page: Page): Promise<void> => {
  await page.goto('/configuracion-inicial');
  const empezar = page.getByRole('button', { name: /EMPEZAR/i });
  const iniciar = page.getByRole('button', { name: /Iniciar sesión con Microsoft/i });
  // El container se hidrata de forma asincrona: esperamos a que aparezca
  // cualquiera de las dos acciones antes de decidir en que paso estamos.
  await expect(empezar.or(iniciar)).toBeVisible();
  if (await empezar.isVisible()) {
    await empezar.click();
  }
  await expect(iniciar).toBeVisible();
  await iniciar.click();
  const continuar = page.getByRole('button', { name: /CONTINUAR/i });
  await expect(continuar).toBeEnabled({ timeout: 30_000 });
  await continuar.click();
  await expect(page.getByRole('heading', { name: /Todo listo/i })).toBeVisible({
    timeout: 15_000,
  });
};

const NOMBRE_DB = 'servicio-tecnico-bc';

/** Inserta registros directamente en un almacén de la base local (para preparar escenarios grandes). */
export const sembrar = (
  page: Page,
  almacen: 'servicios' | 'logs',
  registros: readonly object[]
): Promise<void> =>
  page.evaluate(
    ({ nombre, almacen: alm, registros: datos }) =>
      new Promise<void>((resolver, rechazar) => {
        const abrir = indexedDB.open(nombre);
        abrir.onerror = () => rechazar(abrir.error);
        abrir.onsuccess = () => {
          const db = abrir.result;
          const tx = db.transaction(alm, 'readwrite');
          const almacenDb = tx.objectStore(alm);
          for (const dato of datos) almacenDb.put(dato);
          tx.oncomplete = () => {
            db.close();
            resolver();
          };
          tx.onerror = () => rechazar(tx.error);
        };
      }),
    { nombre: NOMBRE_DB, almacen, registros }
  );

/** Cuenta los registros de un almacén de la base local. */
export const contar = (page: Page, almacen: 'servicios' | 'logs' | 'adjuntos'): Promise<number> =>
  page.evaluate(
    ({ nombre, almacen: alm }) =>
      new Promise<number>((resolver, rechazar) => {
        const abrir = indexedDB.open(nombre);
        abrir.onerror = () => rechazar(abrir.error);
        abrir.onsuccess = () => {
          const db = abrir.result;
          const peticion = db.transaction(alm, 'readonly').objectStore(alm).count();
          peticion.onsuccess = () => {
            db.close();
            resolver(peticion.result);
          };
          peticion.onerror = () => rechazar(peticion.error);
        };
      }),
    { nombre: NOMBRE_DB, almacen }
  );

/** Vacía un almacén de la base local. */
export const vaciar = (page: Page, almacen: 'servicios' | 'logs' | 'adjuntos'): Promise<void> =>
  page.evaluate(
    ({ nombre, almacen: alm }) =>
      new Promise<void>((resolver, rechazar) => {
        const abrir = indexedDB.open(nombre);
        abrir.onerror = () => rechazar(abrir.error);
        abrir.onsuccess = () => {
          const db = abrir.result;
          const tx = db.transaction(alm, 'readwrite');
          tx.objectStore(alm).clear();
          tx.oncomplete = () => {
            db.close();
            resolver();
          };
          tx.onerror = () => rechazar(tx.error);
        };
      }),
    { nombre: NOMBRE_DB, almacen }
  );

/** Servicio mínimo pero completo para sembrar la base local. */
export const servicioSembrado = (
  indice: number,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  id: `00000000-0000-4000-8000-${String(indice).padStart(12, '0')}`,
  codigo: `BAT-${indice}-SE${indice}`,
  estado: 'RECIBIDO',
  syncState: 'pending',
  camposSucios: ['marca'],
  base: {},
  conflictos: [],
  intentos: 0,
  tipoEquipo: 'BATERIA',
  fechaRecepcion: '2026-01-10',
  clienteId: 1,
  clienteNombre: 'NAVAR ASOCIADOS',
  numeroSolicitud: indice,
  marca: 'ROQUET',
  referencia: `REF-${indice}`,
  serie: `SE${indice}`,
  creadoEn: '2026-01-10T10:00:00.000Z',
  actualizadoEn: '2026-01-10T10:00:00.000Z',
  capturadoPor: 'e2e@empresa.com',
  capturadoPorNombre: 'E2E',
  dispositivoId: 'disp-e2e',
  appVersion: '0.0.0',
  ...extra,
});

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';

/**
 * Completa una recepción mínima (1 foto) y devuelve su código. El número de solicitud no se captura: lo asigna
 * la sincronización, así que hasta entonces el código es `BAT-PEND-{serie}` (ADR-0024).
 */
export const crearRecepcion = async (page: Page, serie: string): Promise<string> => {
  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+\/etapa\/recepcion$/, {
    timeout: 15_000,
  });

  const cliente = page.getByRole('combobox', { name: 'Cliente' });
  await cliente.fill('navar');
  await page.waitForTimeout(300);
  await cliente.press('ArrowDown');
  await cliente.press('Enter');

  await page.getByRole('combobox', { name: 'Marca' }).fill('ROQUET');
  await page.getByLabel('Referencia').fill('REF-SYNC');
  await page.getByLabel('Serie').fill(serie);

  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles([
      { name: `foto-${serie}.png`, mimeType: 'image/png', buffer: Buffer.from(PNG_1X1, 'base64') },
    ]);
  await expect(page.getByRole('button', { name: /^Ver / })).toHaveCount(1, { timeout: 15_000 });

  await page.getByRole('button', { name: 'Completar recepción' }).click();
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+$/, { timeout: 15_000 });
  const codigo = `BAT-PEND-${serie}`;
  await expect(page.getByText(codigo)).toBeVisible();
  return codigo;
};

export { expect };
