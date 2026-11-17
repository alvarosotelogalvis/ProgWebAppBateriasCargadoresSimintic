// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * La CSP de `public/_headers` debe permitir todos los orígenes a los que la app llama o de los que carga
 * imágenes. Lo que se comprueba aquí se midió en SharePoint real: la miniatura de una foto remota es una URL
 * prefirmada en `*.svc.ms` (p. ej. `centralus1-mediap.svc.ms`), no en `*.sharepoint.com`.
 */
const cabeceras = readFileSync(resolve(process.cwd(), 'public/_headers'), 'utf-8');
const csp = /Content-Security-Policy:\s*(.+)/.exec(cabeceras)?.[1] ?? '';
const directiva = (nombre: string): string[] => {
  const encontrada = csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${nombre} `));
  return encontrada ? encontrada.split(' ').slice(1) : [];
};

describe('CSP de public/_headers', () => {
  it('connect-src permite Graph, el login de Entra, SharePoint y el host de las miniaturas (svc.ms)', () => {
    const connect = directiva('connect-src');
    for (const origen of [
      "'self'",
      'https://login.microsoftonline.com',
      'https://graph.microsoft.com',
      'https://*.sharepoint.com',
      'https://*.svc.ms',
    ]) {
      expect(connect, `falta ${origen} en connect-src`).toContain(origen);
    }
  });

  it('img-src permite blob:, data:, SharePoint y svc.ms (fotos y miniaturas)', () => {
    const img = directiva('img-src');
    for (const origen of [
      "'self'",
      'blob:',
      'data:',
      'https://*.sharepoint.com',
      'https://*.svc.ms',
    ]) {
      expect(img, `falta ${origen} en img-src`).toContain(origen);
    }
  });

  it('sigue sin permitir estilos ni scripts en línea ni eval', () => {
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
  });
});
