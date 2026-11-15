import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ValidacionError } from '@/domain/errores';
import type { Servicio } from '@/domain/servicio';
import type { AppDB } from '@/infrastructure/db/dexie';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { crearResolverConflictos } from './resolverConflictos';

let db: AppDB;
let servicios: ServicioRepositoryDexie;
let resolver: ReturnType<typeof crearResolverConflictos>;
const clock = new FakeClock();

beforeEach(async () => {
  db = await crearDbPrueba();
  servicios = new ServicioRepositoryDexie(db);
  resolver = crearResolverConflictos({ servicios, clock });
});

afterEach(async () => {
  await db.delete();
});

const enConflicto = (): Servicio => {
  const base = servicioBuilder().diagnosticado().sincronizado().construir();
  return {
    ...base,
    observacionTecnica: 'MÍA',
    marca: 'MI MARCA',
    camposSucios: ['observacionTecnica', 'marca'],
    base: { ...base.base, observacionTecnica: 'REMOTA', marca: 'MARCA REMOTA' },
    conflictos: [
      { campo: 'observacionTecnica', local: 'MÍA', remoto: 'REMOTA' },
      { campo: 'marca', local: 'MI MARCA', remoto: 'MARCA REMOTA' },
    ],
    syncState: 'conflict',
  };
};

describe('resolverConflictos', () => {
  it('exige elegir todos los campos en conflicto (ES-006-08)', async () => {
    const servicio = enConflicto();
    await servicios.guardar(servicio);

    await expect(resolver(servicio.id, [{ campo: 'marca', usar: 'LOCAL' }])).rejects.toBeInstanceOf(
      ValidacionError
    );

    expect((await servicios.obtener(servicio.id))?.syncState).toBe('conflict');
  });

  it('«Mi valor» deja el campo pendiente de subir y «SharePoint» toma el remoto', async () => {
    const servicio = enConflicto();
    await servicios.guardar(servicio);

    await resolver(servicio.id, [
      { campo: 'observacionTecnica', usar: 'LOCAL' },
      { campo: 'marca', usar: 'REMOTO' },
    ]);

    const resuelto = await servicios.obtener(servicio.id);
    expect(resuelto).toMatchObject({
      observacionTecnica: 'MÍA',
      marca: 'MARCA REMOTA',
      camposSucios: ['observacionTecnica'],
      conflictos: [],
      syncState: 'pending',
      actualizadoEn: clock.ahoraIso(),
    });
    expect(resuelto?.base.marca).toBe('MARCA REMOTA');
  });

  it('si todo se resuelve con el valor remoto, queda sincronizado y sin nada que subir', async () => {
    const servicio = enConflicto();
    await servicios.guardar(servicio);

    await resolver(servicio.id, [
      { campo: 'observacionTecnica', usar: 'REMOTO' },
      { campo: 'marca', usar: 'REMOTO' },
    ]);

    expect(await servicios.obtener(servicio.id)).toMatchObject({
      observacionTecnica: 'REMOTA',
      marca: 'MARCA REMOTA',
      camposSucios: [],
      syncState: 'synced',
    });
  });

  it('un estado incoherente se resuelve eligiendo el estado local o el remoto', async () => {
    const base = servicioBuilder().recibido().sincronizado().construir();
    const servicio: Servicio = {
      ...base,
      estado: 'DIAGNOSTICADO',
      camposSucios: ['estado'],
      conflictos: [{ campo: 'estado', local: 'DIAGNOSTICADO', remoto: 'RECIBIDO' }],
      syncState: 'conflict',
    };
    await servicios.guardar(servicio);

    await resolver(servicio.id, [{ campo: 'estado', usar: 'REMOTO' }]);

    expect(await servicios.obtener(servicio.id)).toMatchObject({
      estado: 'RECIBIDO',
      syncState: 'synced',
    });
  });

  describe('servicio eliminado en SharePoint con cambios locales', () => {
    const eliminado = (): Servicio => {
      const base = servicioBuilder().recibido().sincronizado().construir();
      return {
        ...base,
        marca: 'MÍA',
        camposSucios: ['marca'],
        conflictos: [{ campo: 'estado', local: 'RECIBIDO', remoto: undefined }],
        syncState: 'conflict',
        sp: { itemId: '9', eTag: '"x"', modificadoEn: '', webUrl: '' },
      };
    };

    it('«Mi valor» lo vuelve a crear: sin referencia remota y con todos los campos por subir', async () => {
      const servicio = eliminado();
      await servicios.guardar(servicio);

      await resolver(servicio.id, [{ campo: 'estado', usar: 'LOCAL' }]);

      const resuelto = await servicios.obtener(servicio.id);
      expect(resuelto?.sp).toBeUndefined();
      expect(resuelto).toMatchObject({ syncState: 'pending', conflictos: [], marca: 'MÍA' });
      expect(resuelto?.camposSucios).toEqual(expect.arrayContaining(['estado', 'marca', 'serie']));
    });

    it('«SharePoint» acepta la eliminación y borra la copia local', async () => {
      const servicio = eliminado();
      await servicios.guardar(servicio);

      await resolver(servicio.id, [{ campo: 'estado', usar: 'REMOTO' }]);

      expect(await servicios.obtener(servicio.id)).toBeUndefined();
    });
  });

  it('falla si el servicio no existe', async () => {
    await expect(resolver('no-existe', [])).rejects.toBeInstanceOf(ValidacionError);
  });
});
