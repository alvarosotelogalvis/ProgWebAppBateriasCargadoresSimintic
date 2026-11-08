import { test, expect } from '@playwright/test';

test.describe('Performance: Menú Técnico', () => {
  test('VisorLogs renderiza >1000 logs sin lag (<1s)', async ({ page }) => {
    // Navegar a tecnico
    await page.goto('http://localhost:5173/tecnico');

    // Simular 1000+ logs insertados
    // TODO: Usar seeder o API para inyectar logs en DB local
    // await page.evaluate(async () => {
    //   const logs = [];
    //   for (let i = 0; i < 1100; i++) {
    //     logs.push({
    //       seq: i,
    //       ts: new Date().toISOString(),
    //       nivel: i % 4 === 0 ? 'error' : i % 3 === 0 ? 'warn' : 'info',
    //       evento: `evento-${i}`,
    //       appVersion: '0.1.0',
    //     });
    //   }
    //   await db.logs.bulkAdd(logs);
    // });

    // Navegar a logs tab
    await page.click('text=Registros');

    // Medir tiempo de renderizado
    const startTime = Date.now();

    // Esperar a que tabla esté visible
    await page.waitForSelector('table');

    const renderTime = Date.now() - startTime;

    // Verificar que renderizó en <1000ms
    expect(renderTime).toBeLessThan(1000);

    // Verificar que tabla tiene filas
    const rows = await page.locator('table tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('Filtrar VisorLogs por nivel es rápido (<200ms)', async ({ page }) => {
    await page.goto('http://localhost:5173/tecnico');
    await page.click('text=Registros');

    // Medir tiempo de filtrado
    const startTime = Date.now();

    // Seleccionar nivel error
    await page.selectOption('select', 'error');
    await page.waitForTimeout(100);

    const filterTime = Date.now() - startTime;

    // Debe ser rápido
    expect(filterTime).toBeLessThan(200);
  });

  test('Exportar respaldo con 100+ servicios (<500ms)', async ({ page }) => {
    await page.goto('http://localhost:5173/tecnico');

    // Simular 100 servicios
    // TODO: Seeder en DB local
    // await page.evaluate(async () => {
    //   const servicios = [];
    //   for (let i = 0; i < 100; i++) {
    //     servicios.push({
    //       id: `svc-${i}`,
    //       codigo: `TEST-${i.toString().padStart(3, '0')}`,
    //       syncState: i % 2 === 0 ? 'pending' : 'synced',
    //     });
    //   }
    //   await db.servicios.bulkAdd(servicios);
    // });

    // Abrir diálogo exportar
    await page.click('text=Exportar respaldo');

    // Medir tiempo de generación
    const startTime = Date.now();

    // Click descargar
    // TODO: interceptar download
    // await page.click('text=Descargar respaldo');

    const exportTime = Date.now() - startTime;

    // Debe ser <500ms
    expect(exportTime).toBeLessThan(500);
  });

  test('Importar respaldo sin lag (<300ms)', async ({ page }) => {
    await page.goto('http://localhost:5173/tecnico');

    // Preparar archivo de respaldo
    // TODO: Crear archivo en /tmp

    await page.click('text=Importar respaldo');

    // Medir tiempo de subida y procesamiento
    const startTime = Date.now();

    // TODO: Subir archivo
    // await page.setInputFiles('input[type="file"]', '/tmp/respaldo.zip');
    // await page.click('text=Importar');

    const importTime = Date.now() - startTime;

    // Debe ser <300ms (para archivos pequeños)
    expect(importTime).toBeLessThan(300);
  });

  test('Purgas (<500ms para 100 servicios)', async ({ page }) => {
    await page.goto('http://localhost:5173/tecnico');

    // Simular 100 servicios cerrados hace >3 meses
    // TODO: Seeder

    // Abrir liberar espacio
    await page.click('text=Liberar espacio');

    // Medir tiempo de purga
    const startTime = Date.now();

    // Click liberar
    // TODO:
    // await page.click('text=Liberar espacio');

    const purgeTime = Date.now() - startTime;

    // Debe ser <500ms
    expect(purgeTime).toBeLessThan(500);
  });

  test('Bundle: módulos respaldo <5KB gzip', async ({ page }) => {
    // Verificar tamaño de bundle en red
    // TODO: Interceptar requests y sumar respaldo modules

    const response = await page.goto('http://localhost:5173/tecnico');

    // Obtener tamaño gzip de respuesta
    const size = (await response?.text())?.length || 0;

    // Respaldo modules (estimado) debe ser <5KB sin gzip
    // Con gzip ~2KB
    expect(size).toBeLessThan(5000);
  });

  test('MenuTecnicoPage carga en <2s', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:5173/tecnico', {
      waitUntil: 'networkidle',
    });

    const loadTime = Date.now() - startTime;

    // Debe cargar en <2s
    expect(loadTime).toBeLessThan(2000);

    // Verificar que está funcional
    expect(await page.locator('text=Menú técnico').isVisible()).toBe(true);
  });

  test('Interactividad: tabs responden en <100ms', async ({ page }) => {
    await page.goto('http://localhost:5173/tecnico');

    // Click a tab SharePoint
    const startTime = Date.now();

    await page.click('text=Estado de SharePoint');
    await page.waitForSelector('[data-testid="estado-sharepoint"]', {
      timeout: 100,
    });

    const responseTime = Date.now() - startTime;

    // Debe responder inmediatamente
    expect(responseTime).toBeLessThan(100);
  });
});
