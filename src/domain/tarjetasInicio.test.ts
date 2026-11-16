import { describe, expect, it } from 'vitest';

import { contarTarjetas, cumpleTarjeta, tarjetaPorClave, tarjetasPorRol } from './tarjetasInicio';

const claves = (roles: Parameters<typeof tarjetasPorRol>[0]) =>
  tarjetasPorRol(roles).map((tarjeta) => tarjeta.clave);

describe('tarjetasPorRol (ES-007-31 a 33)', () => {
  it('Técnico: borradores, recibidos, cotizados aprobados y en reparación', () => {
    expect(claves(['Tecnico'])).toEqual(['borradores', 'recibidos', 'porOT', 'porEntregar']);
  });

  it('Comercial: diagnosticados, cotizados pendientes de respuesta y entregados', () => {
    expect(claves(['Comercial'])).toEqual(['porCotizar', 'cotizadosPendientes', 'porFacturar']);
  });

  it('varios roles: unión sin duplicados', () => {
    expect(claves(['Tecnico', 'Comercial'])).toEqual([
      'borradores',
      'recibidos',
      'porOT',
      'porEntregar',
      'porCotizar',
      'cotizadosPendientes',
      'porFacturar',
    ]);
    expect(claves(['Comercial', 'Tecnico', 'Tecnico'])).toHaveLength(7);
  });

  it('el Administrador puede avanzar cualquier etapa: ve todas las tarjetas', () => {
    expect(claves(['Administrador'])).toHaveLength(7);
  });

  it('sin roles no hay tarjetas', () => {
    expect(claves([])).toEqual([]);
  });
});

describe('cumpleTarjeta y contarTarjetas', () => {
  const servicios = [
    { estado: 'RECIBIDO' as const },
    { estado: 'RECIBIDO' as const },
    { estado: 'COTIZADO' as const, cotizacionEstado: 'APROBADA' as const },
    { estado: 'COTIZADO' as const, cotizacionEstado: 'PENDIENTE' as const },
    { estado: 'COTIZADO' as const }, // sin respuesta registrada = pendiente
    { estado: 'COTIZADO' as const, cotizacionEstado: 'RECHAZADA' as const },
    { estado: 'ENTREGADO' as const },
    { estado: 'FACTURADO' as const },
  ];

  it('cuenta por estado', () => {
    const conteo = contarTarjetas(servicios, tarjetasPorRol(['Tecnico', 'Comercial']));

    expect(conteo).toMatchObject({ recibidos: 2, porFacturar: 1, borradores: 0, porEntregar: 0 });
  });

  it('cotizados aprobados (por OT) y pendientes de respuesta se separan por la respuesta', () => {
    const conteo = contarTarjetas(servicios, tarjetasPorRol(['Tecnico', 'Comercial']));

    expect(conteo.porOT).toBe(1);
    expect(conteo.cotizadosPendientes).toBe(2);
  });

  it('un cotizado rechazado no cuenta ni como OT ni como pendiente', () => {
    const rechazado = { estado: 'COTIZADO' as const, cotizacionEstado: 'RECHAZADA' as const };

    expect(cumpleTarjeta(rechazado, tarjetaPorClave('porOT')!)).toBe(false);
    expect(cumpleTarjeta(rechazado, tarjetaPorClave('cotizadosPendientes')!)).toBe(false);
  });

  it('los estados finales no aparecen en ninguna tarjeta', () => {
    const todas = tarjetasPorRol(['Administrador']);

    for (const estado of ['FACTURADO', 'DISPOSICION_FINAL', 'ANULADO'] as const) {
      expect(todas.some((tarjeta) => cumpleTarjeta({ estado }, tarjeta))).toBe(false);
    }
  });
});

describe('tarjetaPorClave', () => {
  it('encuentra una tarjeta por su clave y devuelve undefined si no existe', () => {
    expect(tarjetaPorClave('porFacturar')?.criterio).toEqual({ estado: 'ENTREGADO' });
    expect(tarjetaPorClave('inventada')).toBeUndefined();
  });
});
