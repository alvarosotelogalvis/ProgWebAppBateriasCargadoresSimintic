import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seleccionarPurgables, puedeEliminarse } from '@/domain/purgas';

describe('domain/purgas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('seleccionarPurgables', () => {
    const hoy = new Date('2026-11-08');

    const servicioBase = {
      id: '1',
      codigo: 'SVC-001',
      estado: 'FACTURADO',
      syncState: 'synced',
      ultimaSincronizacion: '2026-11-01',
    } as Record<string, unknown>;

    it('excluye servicios con syncState != synced', () => {
      vi.setSystemTime(hoy);
      const servicios = [
        { ...servicioBase, id: '1', syncState: 'synced' },
        { ...servicioBase, id: '2', syncState: 'pending' },
        { ...servicioBase, id: '3', syncState: 'error' },
      ];

      const purgables = seleccionarPurgables(servicios, []);
      expect(purgables.servicios.map((s) => s.id)).toEqual(['1']);
    });

    it('excluye servicios abiertos', () => {
      vi.setSystemTime(hoy);
      const servicios = [
        { ...servicioBase, id: '1', estado: 'FACTURADO' },
        { ...servicioBase, id: '2', estado: 'EN_REPARACION' },
        { ...servicioBase, id: '3', estado: 'ENTREGADO' },
      ];

      const purgables = seleccionarPurgables(servicios, []);
      expect(purgables.servicios.filter((s) => s.id !== '1').length).toBe(0);
    });

    it('filtra por días para originales de archivos', () => {
      vi.setSystemTime(hoy);
      const servicios = [
        {
          ...servicioBase,
          id: '1',
          adjuntos: [
            {
              id: 'a1',
              ultimaSincronizacion: '2026-10-25',
              tieneOriginal: true,
            },
          ],
        },
      ];

      const purgables = seleccionarPurgables(servicios, [], 7);
      expect(purgables.archivos.length).toBeGreaterThan(0);
    });

    it('filtra por meses para servicios cerrados', () => {
      vi.setSystemTime(hoy);
      const servicios = [
        { ...servicioBase, id: '1', ultimaSincronizacion: '2026-08-08' },
        { ...servicioBase, id: '2', ultimaSincronizacion: '2026-10-08' },
      ];

      const purgables = seleccionarPurgables(servicios, [], 7, 3);
      expect(purgables.servicios.map((s) => s.id)).toContain('1');
    });
  });

  describe('puedeEliminarse', () => {
    const servicio = {
      id: '1',
      estado: 'FACTURADO',
      syncState: 'synced',
    } as Record<string, unknown>;

    it('retorna false si syncState != synced', () => {
      expect(puedeEliminarse({ ...servicio, syncState: 'pending' })).toBe(false);
      expect(puedeEliminarse({ ...servicio, syncState: 'error' })).toBe(false);
    });

    it('retorna false si estado es abierto', () => {
      expect(puedeEliminarse({ ...servicio, estado: 'ENTREGADO' })).toBe(false);
      expect(puedeEliminarse({ ...servicio, estado: 'EN_REPARACION' })).toBe(false);
    });

    it('retorna true solo si cerrado y synced', () => {
      expect(puedeEliminarse({ ...servicio, estado: 'FACTURADO', syncState: 'synced' })).toBe(true);
      expect(puedeEliminarse({ ...servicio, estado: 'ANULADO', syncState: 'synced' })).toBe(true);
    });
  });
});
