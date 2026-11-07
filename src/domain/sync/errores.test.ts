import { describe, expect, it } from 'vitest';

import { clasificarError, debeAbortarSync, esReintentable } from './errores';

describe('clasificarError (tabla SDD §9.6)', () => {
  it.each([
    ['red caída', { esRed: true }, 'RED'],
    ['timeout', { esTimeout: true }, 'REINTENTABLE'],
    ['red gana al estado HTTP', { esRed: true, status: 401 }, 'RED'],
    ['401', { status: 401 }, 'AUTH'],
    ['403', { status: 403 }, 'SIN_PERMISO'],
    ['404 de lista o sitio', { status: 404 }, 'CONFIGURACION'],
    ['404 de uploadUrl', { status: 404, esSesionSubida: true }, 'SESION_SUBIDA_EXPIRADA'],
    ['409 de valor único', { status: 409 }, 'IDEMPOTENCIA'],
    ['412', { status: 412 }, 'CONFLICTO'],
    ['413', { status: 413 }, 'NO_REINTENTABLE'],
    ['429', { status: 429 }, 'REINTENTABLE'],
    ['503', { status: 503 }, 'REINTENTABLE'],
    ['504', { status: 504 }, 'REINTENTABLE'],
    ['500', { status: 500 }, 'REINTENTABLE'],
    ['502', { status: 502 }, 'REINTENTABLE'],
    ['400', { status: 400 }, 'NO_REINTENTABLE'],
    ['422', { status: 422 }, 'NO_REINTENTABLE'],
    ['408', { status: 408 }, 'REINTENTABLE'],
    ['sin estado conocido', {}, 'REINTENTABLE'],
  ] as const)('%s → %s', (_nombre, entrada, esperado) => {
    expect(clasificarError(entrada)).toBe(esperado);
  });

  it('la sesión de subida expirada se reintenta creando una sesión nueva', () => {
    expect(esReintentable('SESION_SUBIDA_EXPIRADA')).toBe(true);
    expect(esReintentable('REINTENTABLE')).toBe(true);
    expect(esReintentable('CONFLICTO')).toBe(false);
    expect(esReintentable('NO_REINTENTABLE')).toBe(false);
  });

  it('solo red, auth y configuración detienen el sync completo', () => {
    expect(debeAbortarSync('RED')).toBe(true);
    expect(debeAbortarSync('AUTH')).toBe(true);
    expect(debeAbortarSync('CONFIGURACION')).toBe(true);
    expect(debeAbortarSync('REINTENTABLE')).toBe(false);
    expect(debeAbortarSync('SIN_PERMISO')).toBe(false);
  });
});
