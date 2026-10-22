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
