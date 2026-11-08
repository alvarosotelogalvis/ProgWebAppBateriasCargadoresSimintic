import { describe, it, expect, beforeEach, vi } from 'vitest';
import { exportarRespaldo, importarRespaldo } from '@/application/respaldo/respaldo';

describe('application/respaldo - integración', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  const servicioBase = {
    id: '1',
    codigo: 'SVC-001',
    clienteNombre: 'Cliente A',
    serie: 'SN-001',
    estado: 'FACTURADO',
    syncState: 'pending',
    adjuntos: [],
  } as Record<string, unknown>;

  describe('exportar → importar', () => {
    it('exporta servicios pendientes', async () => {
      const servicios = [
        { ...servicioBase, id: '1', syncState: 'pending' },
        { ...servicioBase, id: '2', syncState: 'synced' },
      ];

      const resultado = await exportarRespaldo(servicios, 'solo-pendientes');
      expect(resultado.blob.size).toBeGreaterThan(0);
      expect(resultado.serviciosIncluidos).toBe(1);
    });

    it('importa sin duplicar', async () => {
      const servicios = [{ ...servicioBase, id: 'svc-001', syncState: 'pending' }];
      const resultado = await exportarRespaldo(servicios, 'solo-pendientes');

      const importados = await importarRespaldo(resultado.blob);
      expect(importados.servicios).toHaveLength(1);
      expect(importados.omitidos).toHaveLength(0);
    });

    it('ciclo A→B idempotente', async () => {
      const servicios = [{ ...servicioBase, id: 'uuid-1', syncState: 'pending' }];
      const resultado = await exportarRespaldo(servicios, 'solo-pendientes');

      const importados = await importarRespaldo(resultado.blob);
      expect(importados.servicios).toHaveLength(1);

      const reImportados = await importarRespaldo(resultado.blob, importados.servicios);
      expect(reImportados.omitidos).toHaveLength(1);
    });
  });
});
