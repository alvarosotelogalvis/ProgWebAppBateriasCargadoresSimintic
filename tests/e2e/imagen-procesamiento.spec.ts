import { expect, test } from './base';

test('la foto grande se reduce y genera miniatura', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit no soporta guardar Blob en IndexedDB');

  await page.goto('/servicios/nuevo');
  await expect(page).toHaveURL(/\/etapa\/recepcion$/, { timeout: 15_000 });

  const dataUrl = await page.evaluate(() => {
    const lienzo = document.createElement('canvas');
    lienzo.width = 3000;
    lienzo.height = 2000;
    const contexto = lienzo.getContext('2d');
    if (!contexto) throw new Error('Sin contexto 2D');
    contexto.fillStyle = '#336699';
    contexto.fillRect(0, 0, lienzo.width, lienzo.height);
    return lienzo.toDataURL('image/png');
  });

  await page.locator('input[type="file"][multiple]').setInputFiles({
    name: 'grande.png',
    mimeType: 'image/png',
    buffer: Buffer.from(dataUrl.split(',')[1]!, 'base64'),
  });

  await expect(page.getByRole('button', { name: /^Ver / })).toBeVisible({
    timeout: 20_000,
  });

  const miniatura = page.locator('figure img').first();
  await expect
    .poll(() => miniatura.evaluate((imagen: HTMLImageElement) => imagen.naturalWidth))
    .toBeGreaterThan(0);
  const ancho = await miniatura.evaluate((imagen: HTMLImageElement) => imagen.naturalWidth);
  expect(ancho).toBeLessThanOrEqual(320);
});
