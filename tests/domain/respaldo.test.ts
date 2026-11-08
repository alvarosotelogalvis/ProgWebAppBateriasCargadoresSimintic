import { describe, it, expect } from 'vitest';
import { validarManifiesto, type Manifiesto } from '@/domain/respaldo';

describe('domain/respaldo', () => {
  describe('validarManifiesto', () => {
    const manifestoValido: Manifiesto = {
      version: '1.0.0',
      esquemaDb: 1,
      app_version: '0.1.0',
      dispositivo_id: 'test-device',
      fecha: new Date('2026-11-08'),
      servicios_pendientes: 2,
      adjuntos_totales: 5,
    };

    it('acepta un manifiesto válido', () => {
      const result = validarManifiesto(manifestoValido);
      expect(result.ok).toBe(true);
    });

    it('rechaza manifiesto con esquemaDb futuro', () => {
      const futuro = { ...manifestoValido, esquemaDb: 99 };
      const result = validarManifiesto(futuro);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('incompatible');
    });

    it('rechaza manifiesto con versión faltante', () => {
      const sinVersion = { ...manifestoValido } as Record<string, unknown>;
      delete sinVersion.version;
      const result = validarManifiesto(sinVersion as Manifiesto);
      expect(result.ok).toBe(false);
    });

    it('rechaza manifiesto con campos inválidos', () => {
      const invalido = { ...manifestoValido, servicios_pendientes: -1 };
      const result = validarManifiesto(invalido);
      expect(result.ok).toBe(false);
    });
  });
});
