import type { Page } from '@playwright/test';

import { expect, prepararApp, sembrar, servicioSembrado, test } from './base';

/**
 * Rendimiento con el volumen esperado en un dispositivo: hasta ~100 servicios. Se siembran N servicios
 * directamente en IndexedDB y se miden la lista, la búsqueda y el detalle, también con la CPU frenada 4× para
 * aproximar un teléfono modesto. Imprime una línea por medida y falla si se pasa de presupuestos holgados.
 * (En una medición puntual con hasta 3.000 servicios la lista tardó 0,9 s y 6,1 s con CPU 4×: crece de forma
 * lineal porque pinta todas las filas, lo que no importa con las decenas de servicios que se esperan.)
 */
const ESTADOS = [
  'RECIBIDO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'EN_REPARACION',
  'ENTREGADO',
  'FACTURADO',
] as const;
const CLIENTES = [
  'NAVAR ASOCIADOS',
  'ARIS MINING SEGOVIA',
  'ARIS MINING MARMATO',
  'MINERA DEL NORTE',
  'CARBONES DEL SUR',
];

const generar = (cantidad: number): object[] =>
  Array.from({ length: cantidad }, (_, i) => {
    const sincronizado = i % 10 !== 0; // 10 % pendientes
    return servicioSembrado(i + 1, {
      estado: ESTADOS[i % ESTADOS.length],
      syncState: sincronizado ? 'synced' : 'pending',
      camposSucios: sincronizado ? [] : ['marca'],
      clienteNombre: CLIENTES[i % CLIENTES.length],
      codigo: `BAT-${i + 1}-SER${String(i + 1).padStart(6, '0')}`,
      serie: `SER${String(i + 1).padStart(6, '0')}`,
      // fechas distintas para que el orden por `actualizadoEn` sea real
      actualizadoEn: new Date(Date.UTC(2026, 0, 1) + i * 3_600_000).toISOString(),
    });
  });

const frenarCpu = async (page: Page, factor: number): Promise<void> => {
  const sesion = await page.context().newCDPSession(page);
  await sesion.send('Emulation.setCPUThrottlingRate', { rate: factor });
};

interface Medida {
  n: number;
  cpu: string;
  listaMs: number;
  nodos: number;
  filas: number;
  busquedaMs: number;
  detalleMs: number;
  heapMB: number;
}

const medir = async (page: Page, n: number, cpu: number): Promise<Medida> => {
  await sembrar(page, 'servicios', generar(n));
  if (cpu > 1) await frenarCpu(page, cpu);

  const t0 = Date.now();
  await page.goto('/servicios');
  await page.locator('main ul li').first().waitFor({ timeout: 120_000 });
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  );
  const listaMs = Date.now() - t0;

  const { nodos, filas, heapMB } = await page.evaluate(() => ({
    nodos: document.querySelectorAll('*').length,
    filas: document.querySelectorAll('main ul li').length,
    heapMB: Math.round(
      ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ??
        0) / 1048576
    ),
  }));

  // Búsqueda por una serie concreta: debe quedar 1 fila
  const objetivo = `SER${String(Math.max(1, Math.floor(n / 2))).padStart(6, '0')}`;
  const caja = page.getByRole('searchbox', { name: /Buscar/i });
  const t1 = Date.now();
  await caja.fill(objetivo);
  await page.waitForFunction(
    () => document.querySelectorAll('main ul li').length === 1,
    undefined,
    { timeout: 120_000 }
  );
  const busquedaMs = Date.now() - t1;

  // Abrir el detalle
  const t2 = Date.now();
  await page.locator('main ul li button').first().click();
  await page.getByRole('heading', { level: 1 }).first().waitFor({ timeout: 120_000 });
  await expect(page).toHaveURL(/\/servicios\/[0-9a-f-]+$/);
  const detalleMs = Date.now() - t2;

  return {
    n,
    cpu: cpu > 1 ? `${cpu}×` : '1×',
    listaMs,
    nodos,
    filas,
    busquedaMs,
    detalleMs,
    heapMB,
  };
};

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Se mide una sola vez, en escritorio');
  test.setTimeout(180_000);
  await prepararApp(page);
});

for (const cpu of [1, 4]) {
  for (const n of [50, 100]) {
    test(`lista, búsqueda y detalle con ${n} servicios (CPU ${cpu}×)`, async ({ page }) => {
      const m = await medir(page, n, cpu);
      // eslint-disable-next-line no-console -- la tabla de medidas es la salida útil de esta prueba
      console.log(
        `MEDIDA | N=${String(m.n).padStart(5)} | CPU ${m.cpu} | lista ${String(m.listaMs).padStart(6)} ms | filas ${String(m.filas).padStart(5)} | nodos DOM ${String(m.nodos).padStart(6)} | búsqueda ${String(m.busquedaMs).padStart(6)} ms | detalle ${String(m.detalleMs).padStart(6)} ms | heap ${m.heapMB} MB`
      );
      expect(m.filas).toBe(n);
      // Presupuestos holgados (un teléfono modesto = CPU 4×): detectan regresiones gruesas, no milisegundos.
      const factor = cpu > 1 ? 3 : 1;
      expect(m.listaMs).toBeLessThan(2_500 * factor);
      expect(m.busquedaMs).toBeLessThan(1_000 * factor);
      expect(m.detalleMs).toBeLessThan(1_000 * factor);
    });
  }
}
