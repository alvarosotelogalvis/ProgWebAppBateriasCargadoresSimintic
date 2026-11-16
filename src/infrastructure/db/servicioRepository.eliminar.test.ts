import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { AdjuntoRepositoryDexie } from './adjuntoRepository';
import type { AppDB } from './dexie';
import { ServicioRepositoryDexie } from './servicioRepository';

let db: AppDB;
let servicios: ServicioRepositoryDexie;
let adjuntos: AdjuntoRepositoryDexie;

beforeEach(async () => {
  db = await crearDbPrueba();
  servicios = new ServicioRepositoryDexie(db);
  adjuntos = new AdjuntoRepositoryDexie(db);
});

afterEach(async () => {
  await db.delete();
});

describe('eliminarSincronizado', () => {
  it('borra un servicio sincronizado y sus adjuntos', async () => {
    const servicio = servicioBuilder().recibido().sincronizado().construir();
    await servicios.guardar(servicio);
    await adjuntos.guardar(
      adjuntoBuilder().enServicio(servicio.id).conCampos({ syncState: 'synced' }).construir()
    );

    expect(await servicios.eliminarSincronizado(servicio.id)).toBe(true);
    expect(await servicios.obtener(servicio.id)).toBeUndefined();
    expect(await adjuntos.listarPorServicio(servicio.id)).toEqual([]);
  });

  it('nunca borra un servicio con campos sucios', async () => {
    const servicio = {
      ...servicioBuilder().recibido().sincronizado().construir(),
      camposSucios: ['marca' as const],
    };
    await servicios.guardar(servicio);

    expect(await servicios.eliminarSincronizado(servicio.id)).toBe(false);
    expect(await servicios.obtener(servicio.id)).toBeDefined();
  });

  it('nunca borra un servicio que no está sincronizado', async () => {
    const servicio = {
      ...servicioBuilder().recibido().sincronizado().construir(),
      syncState: 'pending' as const,
    };
    await servicios.guardar(servicio);

    expect(await servicios.eliminarSincronizado(servicio.id)).toBe(false);
  });

  it('nunca borra un servicio con un adjunto pendiente de subir', async () => {
    const servicio = servicioBuilder().recibido().sincronizado().construir();
    await servicios.guardar(servicio);
    await adjuntos.guardar(
      adjuntoBuilder().enServicio(servicio.id).conCampos({ syncState: 'pending' }).construir()
    );

    expect(await servicios.eliminarSincronizado(servicio.id)).toBe(false);
    expect(await adjuntos.listarPorServicio(servicio.id)).toHaveLength(1);
  });

  it('devuelve false si el servicio no existe', async () => {
    expect(await servicios.eliminarSincronizado('no-existe')).toBe(false);
  });
});
