import { describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { itemACambio } from './cambioRemotoMapper';
import { aCamposSP } from './servicioMapper';

describe('itemACambio', () => {
  it('traduce un ítem de la lista al dominio (ida y vuelta con aCamposSP)', () => {
    const servicio = servicioBuilder().diagnosticado().sincronizado().construir();

    const cambio = itemACambio({
      id: 42,
      fields: aCamposSP(servicio),
      '@odata.etag': '"3"',
      webUrl: 'https://sp/42',
      lastModifiedDateTime: '2026-11-06T10:00:00Z',
      lastModifiedBy: { user: { email: 'otra@empresa.com', displayName: 'Otra Persona' } },
    });

    expect(cambio).toMatchObject({
      id: '42',
      itemId: '42',
      servicioId: servicio.id,
      eTag: '"3"',
      webUrl: 'https://sp/42',
      modified: '2026-11-06T10:00:00Z',
      editor: 'otra@empresa.com',
      editorNombre: 'Otra Persona',
      fields: {
        estado: 'DIAGNOSTICADO',
        serie: servicio.serie,
        diagnostico: servicio.diagnostico,
        fechaRecepcion: servicio.fechaRecepcion,
      },
      meta: {
        codigo: servicio.codigo,
        capturadoPor: servicio.capturadoPor,
        dispositivoId: servicio.dispositivoId,
        appVersion: servicio.appVersion,
      },
    });
    expect(cambio.deleted).toBeUndefined();
  });

  it('una entrada eliminada del delta solo trae el id', () => {
    const cambio = itemACambio({ id: '7', '@removed': { reason: 'deleted' } });

    expect(cambio).toMatchObject({ itemId: '7', servicioId: '', fields: {}, deleted: true });
  });

  it('un ítem sin ServicioId queda con servicioId vacío (creado a mano en SharePoint)', () => {
    expect(itemACambio({ id: '8', fields: { Title: 'manual' } }).servicioId).toBe('');
  });
});
