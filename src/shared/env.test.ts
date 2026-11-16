import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { validarEnv } from '@/shared/env';

const baseValido = {
  VITE_APP_ENV: 'dev',
  VITE_AUTH_MODE: 'mock',
  VITE_ENTRA_CLIENT_ID: '11111111-1111-4111-8111-111111111111',
  VITE_ENTRA_TENANT_ID: '22222222-2222-4222-8222-222222222222',
  VITE_SHAREPOINT_SITE_URL: 'https://contoso.sharepoint.com/sites/DEV',
  VITE_SHAREPOINT_SITE_NAME: 'DEV',
};

describe('validarEnv', () => {
  it('acepta una configuracion valida', () => {
    const resultado = validarEnv(baseValido);
    expect(resultado.ok).toBe(true);
  });

  it('rechaza un ambiente desconocido', () => {
    const resultado = validarEnv({ ...baseValido, VITE_APP_ENV: 'qa' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.campos).toContain('VITE_APP_ENV');
    }
  });

  it('rechaza un modo de autenticacion desconocido', () => {
    const resultado = validarEnv({ ...baseValido, VITE_AUTH_MODE: 'oidc' });
    expect(resultado.ok).toBe(false);
  });

  it('rechaza un clientId que no es UUID', () => {
    const resultado = validarEnv({ ...baseValido, VITE_ENTRA_CLIENT_ID: 'no-es-uuid' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.campos).toContain('VITE_ENTRA_CLIENT_ID');
    }
  });

  it('rechaza un tenantId que no es UUID', () => {
    const resultado = validarEnv({ ...baseValido, VITE_ENTRA_TENANT_ID: '12345' });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.campos).toContain('VITE_ENTRA_TENANT_ID');
    }
  });

  it('rechaza una URL de SharePoint invalida', () => {
    const resultado = validarEnv({ ...baseValido, VITE_SHAREPOINT_SITE_URL: 'no-es-url' });
    expect(resultado.ok).toBe(false);
  });

  it('reporta todos los campos invalidos', () => {
    const resultado = validarEnv({
      ...baseValido,
      VITE_ENTRA_CLIENT_ID: 'x',
      VITE_ENTRA_TENANT_ID: 'y',
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(resultado.campos).toHaveLength(2);
    }
  });

  it('rechaza una configuracion vacia', () => {
    const resultado = validarEnv({});
    expect(resultado.ok).toBe(false);
  });
});

describe('plantillas de entorno', () => {
  const leer = (archivo: string): Record<string, string> =>
    Object.fromEntries(
      readFileSync(resolve(process.cwd(), archivo), 'utf-8')
        .split(/\r?\n/)
        .map((linea) => /^([A-Z_]+)=(.*)$/.exec(linea))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => [m[1]!, (m[2] ?? '').split('#')[0]!.trim()])
    );

  it.each(['.env.example', '.env.production.example'])(
    '%s usa valores de ambiente y de autenticación que el esquema acepta',
    (archivo) => {
      const valores = leer(archivo);

      // Los identificadores van vacíos o de relleno en la plantilla: aquí solo se comprueban los enumerados.
      const resultado = validarEnv({
        ...baseValido,
        VITE_APP_ENV: valores.VITE_APP_ENV,
        VITE_AUTH_MODE: valores.VITE_AUTH_MODE,
      });

      expect(resultado.ok, archivo + ': ' + JSON.stringify(valores)).toBe(true);
    }
  );

  it('la plantilla de producción pide autenticación real (msal), nunca la simulada', () => {
    expect(leer('.env.production.example').VITE_AUTH_MODE).toBe('msal');
  });
});
