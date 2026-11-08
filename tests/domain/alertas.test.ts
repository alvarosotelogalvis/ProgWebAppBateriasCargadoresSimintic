import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calcularNivelAlertaDesdeDate,
  diasRestantesDesdeDate,
  formatearTextoFecha,
  filtrarAlertasActivas,
} from '@/domain/alertas';

describe('domain/alertas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  describe('diasRestantesDesdeDate', () => {
    it('debe retornar 0 para hoy', () => {
      vi.setSystemTime(new Date('2026-11-07T10:00:00'));
      expect(diasRestantesDesdeDate(new Date('2026-11-07'))).toBe(0);
    });

    it('debe retornar 1 para mañana', () => {
      vi.setSystemTime(new Date('2026-11-07T10:00:00'));
      expect(diasRestantesDesdeDate(new Date('2026-11-08'))).toBe(1);
    });

    it('debe retornar -1 para ayer', () => {
      vi.setSystemTime(new Date('2026-11-07T10:00:00'));
      expect(diasRestantesDesdeDate(new Date('2026-11-06'))).toBe(-1);
    });

    it('debe retornar 30 para 30 días en el futuro', () => {
      vi.setSystemTime(new Date('2026-11-07T10:00:00'));
      expect(diasRestantesDesdeDate(new Date('2026-12-07'))).toBe(30);
    });
  });

  describe('calcularNivelAlertaDesdeDate', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-11-07T10:00:00'));
    });

    it('debe retornar null si no hay fecha', () => {
      expect(calcularNivelAlertaDesdeDate(null)).toBe(null);
      expect(calcularNivelAlertaDesdeDate(undefined)).toBe(null);
    });

    it('debe retornar vencida para fechas pasadas', () => {
      expect(calcularNivelAlertaDesdeDate(new Date('2026-11-06'))).toBe('vencida');
    });

    it('debe retornar 30 para ≤30 días', () => {
      expect(calcularNivelAlertaDesdeDate(new Date('2026-11-30'))).toBe('30');
    });

    it('debe retornar 60 para >30 y ≤60 días', () => {
      expect(calcularNivelAlertaDesdeDate(new Date('2026-12-15'))).toBe('60');
    });

    it('debe retornar 90 para >60 y ≤90 días', () => {
      expect(calcularNivelAlertaDesdeDate(new Date('2027-01-20'))).toBe('90');
    });

    it('debe retornar null para >90 días', () => {
      expect(calcularNivelAlertaDesdeDate(new Date('2027-02-10'))).toBe(null);
    });
  });

  describe('formatearTextoFecha', () => {
    it('debe mostrar Vence en N días para futuros', () => {
      expect(formatearTextoFecha(1)).toBe('Vence en 1 día');
      expect(formatearTextoFecha(5)).toBe('Vence en 5 días');
    });

    it('debe mostrar Venció hace N días para pasados', () => {
      expect(formatearTextoFecha(-1)).toBe('Venció hace 1 día');
      expect(formatearTextoFecha(-5)).toBe('Venció hace 5 días');
    });
  });

  describe('filtrarAlertasActivas', () => {
    beforeEach(() => {
      vi.setSystemTime(new Date('2026-11-07T10:00:00'));
    });

    const servicioBase = {
      id: '1',
      codigo: 'SVC-001',
      clienteNombre: 'Cliente A',
      serie: 'SERIE-123',
      estado: 'ENTREGADO',
      proyeccionVidaUtil: new Date('2026-12-07'),
    } as Record<string, unknown>;

    it('debe incluir ENTREGADO y FACTURADO', () => {
      const servicios = [
        { ...servicioBase, id: '1', estado: 'ENTREGADO' },
        { ...servicioBase, id: '2', estado: 'FACTURADO' },
      ];
      expect(filtrarAlertasActivas(servicios)).toHaveLength(2);
    });

    it('debe excluir ANULADO', () => {
      const servicios = [{ ...servicioBase, id: '1', estado: 'ANULADO' }];
      expect(filtrarAlertasActivas(servicios)).toHaveLength(0);
    });

    it('debe excluir sin proyeccion', () => {
      const servicios = [{ ...servicioBase, proyeccionVidaUtil: null }];
      expect(filtrarAlertasActivas(servicios)).toHaveLength(0);
    });
  });
});
