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

describe('detectarSerieDuplicada', () => {
  it('encuentra otro servicio activo con la misma serie y solicitud', async () => {
    const encontrado = await detectarSerieDuplicada(async () => servicios, 'b', 'NV1', 10);
    expect(encontrado?.id).toBe('a');
  });

  it('excluye el propio servicio y los estados finales', async () => {
    const final = servicioBuilder()
      .conId('c')
      .conCampos({ serie: 'NV1', numeroSolicitud: 10, estado: 'ANULADO' })
      .construir();
    expect(await detectarSerieDuplicada(async () => servicios, 'a', 'NV1', 10)).toBeUndefined();
    expect(
      await detectarSerieDuplicada(async () => [...servicios, final], 'a', 'NV1', 10)
    ).toBeUndefined();
  });

  it('no consulta sin serie o solicitud', async () => {
    let llamadas = 0;
    const buscar = async (): Promise<typeof servicios> => {
      llamadas += 1;
      return servicios;
    };
    expect(await detectarSerieDuplicada(buscar, 'a', '', 10)).toBeUndefined();
    expect(await detectarSerieDuplicada(buscar, 'a', 'NV1', 0)).toBeUndefined();
    expect(llamadas).toBe(0);
  });
});
