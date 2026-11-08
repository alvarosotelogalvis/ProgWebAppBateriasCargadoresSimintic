import { describe, it, expect, beforeEach, vi } from 'vitest';
import { filtrarAlertasActivas } from '@/domain/alertas';

describe('application/alertas - listar alertas activas', () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

  it('filtra solo ENTREGADO/FACTURADO con vida util', () => {
    const servicios = [
      { ...servicioBase, id: '1', estado: 'BORRADOR' },
      { ...servicioBase, id: '2', estado: 'ENTREGADO' },
      { ...servicioBase, id: '3', estado: 'FACTURADO' },
      { ...servicioBase, id: '4', estado: 'ANULADO' },
    ];

    const alertas = filtrarAlertasActivas(servicios);
    expect(alertas).toHaveLength(2);
  });

  it('agrupa por nivel de prioridad', () => {
    const servicios = [
      { ...servicioBase, id: 'v', proyeccionVidaUtil: new Date('2026-11-05') },
      { ...servicioBase, id: '30', proyeccionVidaUtil: new Date('2026-11-15') },
    ];

    const alertas = filtrarAlertasActivas(servicios);
    expect(alertas).toHaveLength(2);
  });

  it('excluye sin proyeccion', () => {
    const servicios = [
      { ...servicioBase, id: '1', proyeccionVidaUtil: new Date('2026-12-07') },
      { ...servicioBase, id: '2', proyeccionVidaUtil: null },
    ];

    const alertas = filtrarAlertasActivas(servicios);
    expect(alertas).toHaveLength(1);
  });
});
