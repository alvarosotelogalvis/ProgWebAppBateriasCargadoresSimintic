import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BorradorNoEliminableError } from '@/domain/errores';
import type { Servicio } from '@/domain/servicio';
import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import type { AppDB } from './dexie';
import { ServicioRepositoryDexie } from './servicioRepository';

let db: AppDB;
let repo: ServicioRepositoryDexie;

beforeEach(async () => {
  db = await crearDbPrueba();
  repo = new ServicioRepositoryDexie(db);
});

afterEach(async () => {
  await db.delete();
});

const conSp = (servicio: Servicio, itemId: string): Servicio => ({
  ...servicio,
  sp: {
    itemId,
    eTag: 'etag-1',
    modificadoEn: '2026-10-21T08:00:00.000Z',
    webUrl: `https://empresa.sharepoint.com/sites/servicio/Lists/Servicios/${itemId}`,
  },
});

describe('ServicioRepositoryDexie', () => {
  it('guarda y recupera un servicio por id', async () => {
    const servicio = servicioBuilder().recibido().construir();
    await repo.guardar(servicio);

    expect(await repo.obtener(servicio.id)).toEqual(servicio);
    expect(await repo.obtener('no-existe')).toBeUndefined();
  });

  it('lista pendientes, errores y conflictos, excluyendo borradores y sincronizados', async () => {
    const pendiente = {
      ...servicioBuilder().recibido().construir(),
      syncState: 'pending' as const,
    };
    const error = {
      ...servicioBuilder().recibido().construir(),
      id: 'error',
      syncState: 'error' as const,
    };
    const conflicto = {
      ...servicioBuilder().recibido().construir(),
      id: 'conflicto',
      syncState: 'conflict' as const,
    };
    const borrador = {
      ...servicioBuilder().borrador().construir(),
      id: 'borrador',
      syncState: 'pending' as const,
    };
    const sincronizado = {
      ...servicioBuilder().recibido().construir(),
      id: 'sincronizado',
      syncState: 'synced' as const,
    };
    await db.servicios.bulkPut([pendiente, error, conflicto, borrador, sincronizado]);

    const ids = (await repo.listarPendientes()).map((servicio) => servicio.id).sort();
    expect(ids).toEqual([conflicto.id, error.id, pendiente.id].sort());
  });

  it('busca por itemId de SharePoint', async () => {
    const servicio = conSp(servicioBuilder().recibido().construir(), 'sp-42');
    await repo.guardar(servicio);

    expect(await repo.buscarPorSpItemId('sp-42')).toEqual(servicio);
    expect(await repo.buscarPorSpItemId('sp-99')).toBeUndefined();
  });

  it('busca por serie normalizada', async () => {
    const servicio = servicioBuilder().recibido().conCampos({ serie: 'NV-4520' }).construir();
    await repo.guardar(servicio);

    expect((await repo.buscarPorSerie(' nv-4520 ')).map((item) => item.id)).toEqual([servicio.id]);
  });

  it('elimina un borrador y rechaza eliminar cualquier otro estado', async () => {
    const borrador = servicioBuilder().borrador().construir();
    await repo.guardar(borrador);
    await repo.eliminarBorrador(borrador.id);
    expect(await repo.obtener(borrador.id)).toBeUndefined();

    const recibido = servicioBuilder().recibido().construir();
    await repo.guardar(recibido);
    await expect(repo.eliminarBorrador(recibido.id)).rejects.toBeInstanceOf(
      BorradorNoEliminableError
    );
  });

  it('purgarCerrados solo borra servicios sincronizados, finales y antiguos', async () => {
    const viejo = {
      ...servicioBuilder().facturado().sincronizado().construir(),
      id: 'viejo',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    };
    const nuevo = {
      ...servicioBuilder().facturado().sincronizado().construir(),
      id: 'nuevo',
      actualizadoEn: '2026-12-01T00:00:00.000Z',
    };
    const pendiente = {
      ...servicioBuilder().facturado().construir(),
      id: 'pendiente',
      syncState: 'pending' as const,
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    };
    const noFinal = {
      ...servicioBuilder().recibido().sincronizado().construir(),
      id: 'no-final',
      actualizadoEn: '2026-01-01T00:00:00.000Z',
    };
    await db.servicios.bulkPut([viejo, nuevo, pendiente, noFinal]);
    await db.adjuntos.bulkPut([
      adjuntoBuilder({ id: 'adj-viejo', servicioId: 'viejo' }).construir(),
      adjuntoBuilder({ id: 'adj-nuevo', servicioId: 'nuevo' }).construir(),
    ]);

    expect(await repo.purgarCerrados('2026-10-01')).toBe(1);
    expect(await db.servicios.get('viejo')).toBeUndefined();
    expect(await db.adjuntos.get('adj-viejo')).toBeUndefined();
    expect(await db.servicios.get('nuevo')).toBeDefined();
    expect(await db.adjuntos.get('adj-nuevo')).toBeDefined();
    expect(await db.servicios.get('pendiente')).toBeDefined();
    expect(await db.servicios.get('no-final')).toBeDefined();
  });
});
