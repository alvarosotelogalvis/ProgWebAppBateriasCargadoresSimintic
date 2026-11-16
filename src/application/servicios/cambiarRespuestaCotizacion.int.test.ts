import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';
import { NoEncontradoError, SinPermisoError, TransicionInvalidaError } from '@/domain/errores';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { MetaRepositoryDexie } from '@/infrastructure/db/metaRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { crearCasosDeUso } from './casosDeUso';

let db: AppDB;
let servicios: ServicioRepositoryDexie;
let casos: ReturnType<typeof crearCasosDeUso>;

beforeEach(async () => {
  db = await crearDbPrueba();
  servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const ids = new FakeIdGenerator();
  casos = crearCasosDeUso({
    servicios,
    adjuntos,
    uow: new UnidadDeTrabajoDexie(db, servicios, adjuntos),
    ids,
    clock: new FakeClock(),
    auth: new FakeAuth(),
    logger: new FakeLogger(),
    meta: new MetaRepositoryDexie(db, ids),
    config: () => CONFIG_DEFECTO,
    appVersion: 'test',
  });
});

afterEach(async () => {
  await db.delete();
});

describe('cambiarRespuestaCotizacion (HU-007-3)', () => {
  it('Comercial cambia la respuesta en COTIZADO y queda pendiente de sincronizar', async () => {
    const servicio = servicioBuilder().cotizado().construir();
    await servicios.guardar(servicio);

    const resultado = await casos.cambiarRespuestaCotizacion(servicio.id, 'APROBADA', [
      'Comercial',
    ]);

    expect(resultado).toMatchObject({
      estado: 'COTIZADO',
      cotizacionEstado: 'APROBADA',
      syncState: 'pending',
    });
    expect(resultado.camposSucios).toContain('cotizacionEstado');
    expect(await servicios.obtener(servicio.id)).toEqual(resultado);
  });

  it('el Administrador también puede cambiarla', async () => {
    const servicio = servicioBuilder().cotizado().construir();
    await servicios.guardar(servicio);

    const resultado = await casos.cambiarRespuestaCotizacion(servicio.id, 'RECHAZADA', [
      'Administrador',
    ]);

    expect(resultado.cotizacionEstado).toBe('RECHAZADA');
  });

  it('el Técnico no puede y no se modifica nada', async () => {
    const servicio = servicioBuilder().cotizado().construir();
    await servicios.guardar(servicio);

    await expect(
      casos.cambiarRespuestaCotizacion(servicio.id, 'APROBADA', ['Tecnico'])
    ).rejects.toBeInstanceOf(SinPermisoError);

    expect((await servicios.obtener(servicio.id))?.cotizacionEstado).toBe('PENDIENTE');
  });

  it.each(['RECIBIDO', 'DIAGNOSTICADO', 'EN_REPARACION', 'ENTREGADO'] as const)(
    'solo se permite en COTIZADO (rechaza en %s)',
    async (estado) => {
      const servicio = { ...servicioBuilder().cotizado().construir(), estado };
      await servicios.guardar(servicio);

      await expect(
        casos.cambiarRespuestaCotizacion(servicio.id, 'APROBADA', ['Comercial'])
      ).rejects.toBeInstanceOf(TransicionInvalidaError);
    }
  );

  it('lanza NoEncontradoError si el servicio no existe', async () => {
    await expect(
      casos.cambiarRespuestaCotizacion('no-existe', 'APROBADA', ['Comercial'])
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });

  it('con el mismo valor no ensucia el servicio ni cambia su estado de sincronización', async () => {
    const servicio = { ...servicioBuilder().cotizado().construir(), syncState: 'synced' as const };
    await servicios.guardar(servicio);

    const resultado = await casos.cambiarRespuestaCotizacion(servicio.id, 'PENDIENTE', [
      'Comercial',
    ]);

    expect(resultado.syncState).toBe('synced');
    expect(resultado.camposSucios).toEqual([]);
  });

  it('conserva el estado conflict para no ocultar un conflicto sin resolver', async () => {
    const servicio = {
      ...servicioBuilder().cotizado().construir(),
      syncState: 'conflict' as const,
    };
    await servicios.guardar(servicio);

    const resultado = await casos.cambiarRespuestaCotizacion(servicio.id, 'APROBADA', [
      'Comercial',
    ]);

    expect(resultado.syncState).toBe('conflict');
  });
});
