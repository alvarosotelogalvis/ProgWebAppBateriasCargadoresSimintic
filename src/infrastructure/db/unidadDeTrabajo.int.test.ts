import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { AdjuntoRepositoryDexie } from './adjuntoRepository';
import type { AppDB } from './dexie';
import { ServicioRepositoryDexie } from './servicioRepository';
import { UnidadDeTrabajoDexie } from './unidadDeTrabajo';

let db: AppDB;
let servicios: ServicioRepositoryDexie;
let adjuntos: AdjuntoRepositoryDexie;
let uow: UnidadDeTrabajoDexie;

beforeEach(async () => {
  db = await crearDbPrueba();
  servicios = new ServicioRepositoryDexie(db);
  adjuntos = new AdjuntoRepositoryDexie(db);
  uow = new UnidadDeTrabajoDexie(db, servicios, adjuntos);
});

afterEach(async () => {
  await db.delete();
});

describe('UnidadDeTrabajoDexie', () => {
  it('confirma todos los cambios cuando la operación termina bien', async () => {
    const servicio = servicioBuilder().recibido().construir();
    const adjunto = adjuntoBuilder({ id: 'adj-1', servicioId: servicio.id }).construir();

    const resultado = await uow.ejecutar(async ({ servicios, adjuntos }) => {
      await servicios.guardar(servicio);
      await adjuntos.guardar(adjunto);
      return 'ok';
    });

    expect(resultado).toBe('ok');
    expect(await db.servicios.get(servicio.id)).toBeDefined();
    expect(await db.adjuntos.get(adjunto.id)).toBeDefined();
  });

  it('revierte servicio y adjuntos si la operación falla a mitad', async () => {
    const servicio = servicioBuilder().recibido().construir();
    const adjunto = adjuntoBuilder({ id: 'adj-1', servicioId: servicio.id }).construir();

    await expect(
      uow.ejecutar(async ({ servicios, adjuntos }) => {
        await servicios.guardar(servicio);
        await adjuntos.guardar(adjunto);
        throw new Error('falla inyectada');
      })
    ).rejects.toThrow('falla inyectada');

    expect(await db.servicios.get(servicio.id)).toBeUndefined();
    expect(await db.adjuntos.get(adjunto.id)).toBeUndefined();
  });

  it('no revierte los datos que ya estaban confirmados antes de la transacción', async () => {
    const previo = servicioBuilder().recibido().construir();
    await servicios.guardar(previo);

    await expect(
      uow.ejecutar(async ({ servicios }) => {
        await servicios.guardar({ ...previo, marca: 'CAMBIADA' });
        throw new Error('falla inyectada');
      })
    ).rejects.toThrow('falla inyectada');

    expect((await db.servicios.get(previo.id))?.marca).toBe(previo.marca);
  });
});
