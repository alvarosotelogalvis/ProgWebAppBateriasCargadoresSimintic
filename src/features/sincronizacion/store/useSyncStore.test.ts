import { beforeEach, describe, expect, it } from 'vitest';

import { EventBusSync } from '@/application/sync/eventosSync';

import {
  conectarSyncStore,
  ESTADO_INICIAL_SYNC,
  porcentajeEjecucion,
  reducirEventoSync,
  useSyncStore,
} from './useSyncStore';

const COLA = [
  { servicioId: 's1', codigo: 'CAR-1' },
  { servicioId: 's2', codigo: 'BAT-2' },
];

beforeEach(() => {
  useSyncStore.getState().reiniciar();
});

describe('reducirEventoSync', () => {
  it('marca el inicio y conserva la cola preparada', () => {
    const preparado = {
      ...ESTADO_INICIAL_SYNC,
      filas: COLA.map((c) => ({ ...c, estado: 'enCola' as const, archivos: [] })),
    };
    const estado = reducirEventoSync(preparado, { tipo: 'inicio', correlationId: 'c', total: 2 });

    expect(estado.sincronizando).toBe(true);
    expect(estado.total).toBe(2);
    expect(estado.filas.map((f) => f.estado)).toEqual(['enCola', 'enCola']);
  });

  it('sigue el avance de cada archivo y servicio (ES-005-14)', () => {
    let estado = reducirEventoSync(ESTADO_INICIAL_SYNC, {
      tipo: 'inicio',
      correlationId: 'c',
      total: 1,
    });
    estado = reducirEventoSync(estado, {
      tipo: 'servicio:inicio',
      servicioId: 's1',
      codigo: 'CAR-1',
    });
    estado = reducirEventoSync(estado, {
      tipo: 'archivo:progreso',
      servicioId: 's1',
      adjuntoId: 'a1',
      nombreArchivo: 'foto-1.jpg',
      bytesEnviados: 50,
      bytesTotales: 100,
    });

    expect(estado.filas[0]).toMatchObject({ estado: 'subiendo', codigo: 'CAR-1' });
    expect(estado.filas[0]?.archivos).toEqual([
      { adjuntoId: 'a1', nombre: 'foto-1.jpg', enviados: 50, totales: 100 },
    ]);

    estado = reducirEventoSync(estado, {
      tipo: 'archivo:progreso',
      servicioId: 's1',
      adjuntoId: 'a1',
      nombreArchivo: 'foto-1.jpg',
      bytesEnviados: 100,
      bytesTotales: 100,
    });
    expect(estado.filas[0]?.archivos).toHaveLength(1);

    estado = reducirEventoSync(estado, {
      tipo: 'servicio:ok',
      servicioId: 's1',
      archivosSubidos: 1,
    });
    expect(estado.filas[0]?.estado).toBe('listo');
  });

  it('distingue errores definitivos de cortes que dejan el servicio en cola', () => {
    let estado = reducirEventoSync(ESTADO_INICIAL_SYNC, {
      tipo: 'servicio:inicio',
      servicioId: 's1',
      codigo: 'CAR-1',
    });
    estado = reducirEventoSync(estado, {
      tipo: 'servicio:error',
      servicioId: 's1',
      clase: 'SIN_PERMISO',
      mensaje: 'Sin permiso',
    });
    expect(estado.filas[0]).toMatchObject({ estado: 'error', mensaje: 'Sin permiso' });

    estado = reducirEventoSync(estado, { tipo: 'servicio:inicio', servicioId: 's2', codigo: 'B' });
    estado = reducirEventoSync(estado, {
      tipo: 'servicio:error',
      servicioId: 's2',
      clase: 'RED',
      mensaje: 'Sin red',
    });
    expect(estado.filas[1]?.estado).toBe('enCola');
  });

  it('registra conflictos, ocupado y el resumen final (ES-005-19, ES-005-20)', () => {
    let estado = reducirEventoSync(ESTADO_INICIAL_SYNC, {
      tipo: 'conflicto',
      servicioId: 's1',
      campos: ['serie'],
    });
    expect(estado.filas[0]?.estado).toBe('conflicto');

    estado = reducirEventoSync(estado, { tipo: 'ocupado' });
    expect(estado.ocupado).toBe(true);

    const resumen = {
      subidos: 1,
      archivos: 2,
      errores: 0,
      conflictos: 1,
      resultado: 'Parcial' as const,
    };
    estado = reducirEventoSync({ ...estado, sincronizando: true }, { tipo: 'fin', resumen });
    expect(estado.sincronizando).toBe(false);
    expect(estado.resumen).toEqual(resumen);
  });
});

describe('porcentajeEjecucion', () => {
  it('calcula el % de servicios terminados', () => {
    expect(porcentajeEjecucion(ESTADO_INICIAL_SYNC)).toBe(0);
    expect(
      porcentajeEjecucion({
        ...ESTADO_INICIAL_SYNC,
        total: 4,
        filas: [
          { servicioId: 'a', codigo: 'A', estado: 'listo', archivos: [] },
          { servicioId: 'b', codigo: 'B', estado: 'error', archivos: [] },
          { servicioId: 'c', codigo: 'C', estado: 'subiendo', archivos: [] },
        ],
      })
    ).toBe(50);
  });
});

describe('useSyncStore', () => {
  it('se suscribe al bus del motor y se puede desconectar', () => {
    const bus = new EventBusSync();
    useSyncStore.getState().preparar(COLA);
    const desconectar = conectarSyncStore(bus);

    bus.emitir({ tipo: 'inicio', correlationId: 'c', total: 2 });
    bus.emitir({ tipo: 'servicio:inicio', servicioId: 's1', codigo: 'CAR-1' });

    expect(useSyncStore.getState().sincronizando).toBe(true);
    expect(useSyncStore.getState().filas.map((f) => f.estado)).toEqual(['subiendo', 'enCola']);

    desconectar();
    bus.emitir({ tipo: 'servicio:ok', servicioId: 's1', archivosSubidos: 0 });
    expect(useSyncStore.getState().filas[0]?.estado).toBe('subiendo');
  });

  it('limpia el resumen al cerrarlo', () => {
    const resumen = {
      subidos: 1,
      archivos: 0,
      errores: 0,
      conflictos: 0,
      resultado: 'OK' as const,
    };
    useSyncStore.getState().aplicar({ tipo: 'fin', resumen });
    expect(useSyncStore.getState().resumen).toEqual(resumen);

    useSyncStore.getState().limpiarResumen();
    expect(useSyncStore.getState().resumen).toBeNull();
  });
});
