import { describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import { mergeTresVias } from './merge';
import type { CamposServicio, Servicio } from './servicio';

const baseServicio = (): Servicio => servicioBuilder().recibido().sincronizado().construir();

const localCon = (
  cambios: Partial<CamposServicio>,
  sucios: (keyof CamposServicio)[]
): Servicio => ({
  ...baseServicio(),
  ...cambios,
  camposSucios: sucios,
  syncState: 'pending',
});

describe('mergeTresVias', () => {
  it('adopta el valor remoto cuando el campo local no está sucio', () => {
    const { servicio, conflictos } = mergeTresVias(localCon({}, []), { marca: 'REMOTO' });
    expect(servicio.marca).toBe('REMOTO');
    expect(conflictos).toEqual([]);
    expect(servicio.syncState).toBe('synced');
  });

  it('conserva el valor local si el servidor no cambió el campo', () => {
    const local = localCon({ marca: 'LOCAL' }, ['marca']);
    const { servicio, conflictos } = mergeTresVias(local, {
      marca: baseServicio().marca,
    });
    expect(servicio.marca).toBe('LOCAL');
    expect(servicio.camposSucios).toContain('marca');
    expect(conflictos).toEqual([]);
  });

  it('acepta el valor remoto y limpia el campo cuando ambos coinciden', () => {
    const local = localCon({ marca: 'NUEVA' }, ['marca']);
    const { servicio } = mergeTresVias(local, { marca: 'NUEVA' });
    expect(servicio.marca).toBe('NUEVA');
    expect(servicio.camposSucios).not.toContain('marca');
    expect(servicio.syncState).toBe('synced');
  });

  it('marca conflicto y conserva el valor local si ambos cambiaron distinto', () => {
    const local = localCon({ marca: 'LOCAL' }, ['marca']);
    const { servicio, conflictos } = mergeTresVias(local, { marca: 'REMOTO' });

    expect(servicio.marca).toBe('LOCAL');
    expect(servicio.camposSucios).toContain('marca');
    expect(conflictos).toEqual([{ campo: 'marca', local: 'LOCAL', remoto: 'REMOTO' }]);
    expect(servicio.syncState).toBe('conflict');
  });

  it('deja ganar el estado remoto si está más avanzado', () => {
    const local = localCon({ estado: 'COTIZADO', cotizacionFechaEnvio: '2026-10-10' }, [
      'estado',
      'cotizacionFechaEnvio',
    ]);
    const { servicio, conflictos } = mergeTresVias(local, {
      estado: 'EN_REPARACION',
      otDetalle: 'Cambio de celdas y prueba de carga.',
      otCostoReparacion: 150000,
    });

    expect(servicio.estado).toBe('EN_REPARACION');
    expect(servicio.camposSucios).not.toContain('estado');
    expect(conflictos).toEqual([]);
  });

  it('conserva el estado local si está más avanzado que el remoto', () => {
    const local = localCon(
      {
        estado: 'EN_REPARACION',
        otDetalle: 'Cambio de celdas y prueba de carga.',
        otCostoReparacion: 150000,
      },
      ['estado']
    );
    const { servicio, conflictos } = mergeTresVias(local, {
      estado: 'COTIZADO',
      cotizacionFechaEnvio: '2026-10-10',
    });

    expect(servicio.estado).toBe('EN_REPARACION');
    expect(servicio.camposSucios).toContain('estado');
    expect(conflictos).toEqual([]);
  });

  it('hace ganar siempre un estado final remoto', () => {
    const local = localCon({ estado: 'COTIZADO', cotizacionFechaEnvio: '2026-10-10' }, ['estado']);
    const { servicio, conflictos } = mergeTresVias(local, {
      estado: 'FACTURADO',
      facturaFecha: '2026-10-16',
    });

    expect(servicio.estado).toBe('FACTURADO');
    expect(servicio.camposSucios).not.toContain('estado');
    expect(conflictos).toEqual([]);
  });

  it('actualiza la base con los valores remotos y recalcula el código', () => {
    const local = localCon({ serie: 'nv 1' }, ['serie']);
    const { servicio } = mergeTresVias(local, { serie: 'NV 1' });

    expect(servicio.base?.serie).toBe('NV 1');
    expect(servicio.codigo).toBe('CAR-1-NV1');
    expect(servicio.camposSucios).toContain('serie');
  });

  it('actualiza el eTag de SharePoint cuando el remoto lo trae', () => {
    const local: Servicio = {
      ...baseServicio(),
      sp: {
        itemId: 'sp-1',
        eTag: 'e1',
        modificadoEn: '2026-10-21T08:00:00.000Z',
        webUrl: 'https://empresa.sharepoint.com/sites/servicio/Lists/Servicios/1',
      },
    };
    const { servicio } = mergeTresVias(local, { marca: 'REMOTO', eTag: 'e2' });
    expect(servicio.sp?.eTag).toBe('e2');
  });

  it('mantiene estado y suciedad si el resultado es incoherente', () => {
    const local = localCon({ estado: 'ENTREGADO' }, ['estado']);
    const { servicio, conflictos } = mergeTresVias(local, {
      estado: 'COTIZADO',
      cotizacionFechaEnvio: '2026-10-10',
    });

    expect(servicio.estado).toBe('COTIZADO');
    expect(servicio.camposSucios).toContain('estado');
    expect(conflictos.some((conflicto) => conflicto.campo === 'estado')).toBe(true);
  });
});
