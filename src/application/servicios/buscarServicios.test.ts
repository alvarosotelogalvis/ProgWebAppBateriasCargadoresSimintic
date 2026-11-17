import { describe, expect, it } from 'vitest';

import { detectarSerieDuplicada, filtrarServicios } from './buscarServicios';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';

const servicios = [
  servicioBuilder()
    .conId('a')
    .conCampos({
      serie: 'NV1',
      numeroSolicitud: 10,
      clienteNombre: 'Distribuidora Andina',
      clienteId: 1,
      referencia: 'REF-A',
      marca: 'TROJAN',
      estado: 'RECIBIDO',
      fechaRecepcion: '2026-10-01',
    })
    .construir(),
  servicioBuilder()
    .conId('b')
    .conCampos({
      serie: 'X2',
      numeroSolicitud: 20,
      clienteNombre: 'Navar Asociados',
      clienteId: 2,
      referencia: 'REF-B',
      marca: 'BOSCH',
      estado: 'ENTREGADO',
      fechaRecepcion: '2026-10-10',
    })
    .construir(),
];

describe('filtrarServicios', () => {
  it('busca por varios campos y sin tildes', () => {
    expect(filtrarServicios(servicios, { texto: 'andina' })).toHaveLength(1);
    expect(filtrarServicios(servicios, { texto: 'nv1' })[0]?.id).toBe('a');
    expect(filtrarServicios(servicios, { texto: 'ref-b' })[0]?.id).toBe('b');
    expect(filtrarServicios(servicios, { texto: 'x2' })[0]?.id).toBe('b');
  });

  it('filtra por estado, fechas y cliente', () => {
    expect(filtrarServicios(servicios, { estados: ['RECIBIDO'] })).toHaveLength(1);
    expect(filtrarServicios(servicios, { fechaDesde: '2026-10-05' })).toHaveLength(1);
    expect(filtrarServicios(servicios, { fechaHasta: '2026-10-05' })).toHaveLength(1);
    expect(filtrarServicios(servicios, { clienteId: 2 })).toHaveLength(1);
  });

  it('filtra solo pendientes de sincronizacion', () => {
    const conPendiente = [
      { ...servicios[0]!, syncState: 'pending' as const },
      { ...servicios[1]!, syncState: 'synced' as const },
    ];
    expect(filtrarServicios(conPendiente, { soloPendientes: true })).toHaveLength(1);
  });
});

describe('filtrarServicios · número pendiente (ES-011-09)', () => {
  const pendiente = {
    ...servicioBuilder()
      .conId('p')
      .conCampos({ serie: 'ZZ99', numeroSolicitud: 0, estado: 'RECIBIDO' })
      .construir(),
    codigo: 'BAT-PEND-ZZ99',
  };

  it('encuentra un servicio sin número por su serie o su código', () => {
    const todos = [...servicios, pendiente];

    expect(filtrarServicios(todos, { texto: 'zz99' }).map((s) => s.id)).toEqual(['p']);
    expect(filtrarServicios(todos, { texto: 'pend' }).map((s) => s.id)).toEqual(['p']);
  });

  it('no indexa el 0 de «pendiente» como si fuera un número de solicitud', () => {
    const sinCeros = {
      ...servicioBuilder()
        .conId('q')
        .conCampos({ serie: 'ABC', numeroSolicitud: 0, estado: 'RECIBIDO' })
        .construir(),
      codigo: 'BAT-PEND-ABC',
    };

    expect(filtrarServicios([sinCeros], { texto: '0' })).toEqual([]);
  });
});

/** Como `buscarPorSerie` real: solo devuelve los servicios con esa serie. */
const porSerie = (lista: typeof servicios) => async (serie: string) =>
  lista.filter((servicio) => servicio.serie === serie);

describe('detectarSerieDuplicada', () => {
  it('encuentra otro servicio activo con la misma serie (ES-011-10)', async () => {
    const encontrado = await detectarSerieDuplicada(porSerie(servicios), 'b', 'NV1');
    expect(encontrado?.id).toBe('a');
  });

  it('también detecta uno activo que aún no tiene número', async () => {
    const sinNumero = servicioBuilder()
      .conId('p')
      .conCampos({ serie: 'NV9', numeroSolicitud: 0, estado: 'RECIBIDO' })
      .construir();
    const encontrado = await detectarSerieDuplicada(porSerie([sinNumero]), 'otro', 'NV9');
    expect(encontrado?.id).toBe('p');
  });

  it('excluye el propio servicio y los estados finales', async () => {
    const final = servicioBuilder()
      .conId('c')
      .conCampos({ serie: 'NV1', numeroSolicitud: 10, estado: 'ANULADO' })
      .construir();
    expect(await detectarSerieDuplicada(porSerie(servicios), 'a', 'NV1')).toBeUndefined();
    expect(
      await detectarSerieDuplicada(porSerie([...servicios, final]), 'a', 'NV1')
    ).toBeUndefined();
  });

  it('no consulta sin serie', async () => {
    let llamadas = 0;
    const buscar = async (): Promise<typeof servicios> => {
      llamadas += 1;
      return servicios;
    };
    expect(await detectarSerieDuplicada(buscar, 'a', '')).toBeUndefined();
    expect(llamadas).toBe(0);
  });
});
