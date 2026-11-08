import { describe, it, expect } from 'vitest';
import { validarManifiesto } from './respaldo';

describe('respaldo - validarManifiesto', () => {
  it('acepta un manifiesto válido', () => {
    const manifiesto = {
      version: '1.0.0',
      esquemaDb: 1,
      app_version: '1.0.0',
      dispositivo_id: 'device-123',
      fecha: '2026-11-08T10:00:00Z',
      servicios_pendientes: 5,
      adjuntos_totales: 10,
    };

    const resultado = validarManifiesto(manifiesto);
    expect(resultado.ok).toBe(true);
  });

  it('rechaza si falta el campo "version"', () => {
    const manifiesto = {
      esquemaDb: 1,
      app_version: '1.0.0',
      dispositivo_id: 'device-123',
    };

    const resultado = validarManifiesto(manifiesto);
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain('version');
  });

  it('rechaza si falta el campo "esquemaDb"', () => {
    const manifiesto = {
      version: '1.0.0',
      app_version: '1.0.0',
      dispositivo_id: 'device-123',
    };

    const resultado = validarManifiesto(manifiesto);
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain('esquemaDb');
  });

  it('rechaza si esquemaDb es de una versión futura incompatible', () => {
    const manifiesto = {
      version: '2.0.0',
      esquemaDb: 2,
      app_version: '2.0.0',
      dispositivo_id: 'device-future',
    };

    const resultado = validarManifiesto(manifiesto);
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain('incompatible');
  });

  it('rechaza si la versión no es compatible', () => {
    const manifiesto = {
      version: '0.9.0',
      esquemaDb: 1,
      app_version: '0.9.0',
      dispositivo_id: 'device-123',
    };

    const resultado = validarManifiesto(manifiesto);
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain('no soportada');
  });

  it('rechaza si servicios_pendientes es negativo', () => {
    const manifiesto = {
      version: '1.0.0',
      esquemaDb: 1,
      app_version: '1.0.0',
      dispositivo_id: 'device-123',
      servicios_pendientes: -1,
    };

    const resultado = validarManifiesto(manifiesto);
    expect(resultado.ok).toBe(false);
  });

  it('rechaza si no es un objeto válido', () => {
    const resultado = validarManifiesto(null);
    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain('no es un objeto');
  });

  it('rechaza un string en lugar de objeto', () => {
    const resultado = validarManifiesto('no es objeto');
    expect(resultado.ok).toBe(false);
  });
});
