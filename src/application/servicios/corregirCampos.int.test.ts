import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';
import {
  CampoNoEditableError,
  NoEncontradoError,
  SinPermisoError,
  ValidacionError,
} from '@/domain/errores';
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
    clock: new FakeClock(), // hoy = 2026-10-21
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

const admin = ['Administrador'] as const;

const facturado = () => ({
  ...servicioBuilder().facturado().conCampos({ facturaNumero: 'FE-001' }).construir(),
  syncState: 'synced' as const,
  camposSucios: [],
});

describe('corregirCampos (HU-007-8)', () => {
  it('el Administrador corrige un campo de una etapa completada sin cambiar el estado', async () => {
    const servicio = facturado();
    await servicios.guardar(servicio);

    const resultado = await casos.corregirCampos(servicio.id, { facturaNumero: 'FE-002' }, admin);

    expect(resultado).toMatchObject({
      estado: 'FACTURADO',
      facturaNumero: 'FE-002',
      syncState: 'pending',
    });
    expect(resultado.camposSucios).toEqual(['facturaNumero']);
    expect(await servicios.obtener(servicio.id)).toEqual(resultado);
  });

  it('también corrige datos de una etapa anterior en un servicio aún abierto', async () => {
    const servicio = servicioBuilder().diagnosticado().construir();
    await servicios.guardar(servicio);

    const resultado = await casos.corregirCampos(
      servicio.id,
      { observacionTecnica: 'Observación corregida por el administrador' },
      admin
    );

    expect(resultado.estado).toBe('DIAGNOSTICADO');
    expect(resultado.observacionTecnica).toBe('Observación corregida por el administrador');
    expect(resultado.camposSucios).toContain('observacionTecnica');
  });

  it.each([['Tecnico'], ['Comercial']] as const)('rechaza a %s y no modifica nada', async (rol) => {
    const servicio = facturado();
    await servicios.guardar(servicio);

    await expect(
      casos.corregirCampos(servicio.id, { facturaNumero: 'FE-999' }, [rol])
    ).rejects.toBeInstanceOf(SinPermisoError);

    expect((await servicios.obtener(servicio.id))?.facturaNumero).toBe('FE-001');
  });

  it('rechaza una fecha de entrega anterior a la recepción', async () => {
    const servicio = facturado();
    await servicios.guardar(servicio);

    const intento = casos.corregirCampos(servicio.id, { fechaEntrega: '2026-09-01' }, admin);

    await expect(intento).rejects.toBeInstanceOf(ValidacionError);
    await expect(intento).rejects.toMatchObject({
      errores: [expect.objectContaining({ campo: 'fechaEntrega' })],
    });
    expect((await servicios.obtener(servicio.id))?.fechaEntrega).toBe(servicio.fechaEntrega);
  });

  it('rechaza una fecha posterior a hoy', async () => {
    const servicio = facturado();
    await servicios.guardar(servicio);

    await expect(
      casos.corregirCampos(servicio.id, { facturaFecha: '2026-12-31' }, admin)
    ).rejects.toBeInstanceOf(ValidacionError);
  });

  it('rechaza una vida útil igual o anterior a la entrega', async () => {
    const servicio = facturado();
    await servicios.guardar(servicio);

    await expect(
      casos.corregirCampos(
        servicio.id,
        { fechaEntrega: '2026-10-15', proyeccionVidaUtil: '2026-10-15' },
        admin
      )
    ).rejects.toBeInstanceOf(ValidacionError);
  });

  it('rechaza mover la recepción a una fecha posterior a etapas ya registradas', async () => {
    const servicio = facturado();
    await servicios.guardar(servicio);

    await expect(
      casos.corregirCampos(servicio.id, { fechaRecepcion: '2026-10-20' }, admin)
    ).rejects.toBeInstanceOf(ValidacionError);
  });

  it('nunca permite cambiar el estado (no se reabre un servicio cerrado)', async () => {
    const servicio = facturado();
    await servicios.guardar(servicio);

    await expect(
      casos.corregirCampos(servicio.id, { estado: 'RECIBIDO' }, admin)
    ).rejects.toBeInstanceOf(CampoNoEditableError);
    expect((await servicios.obtener(servicio.id))?.estado).toBe('FACTURADO');
  });

  it('conserva el estado conflict para no ocultar un conflicto sin resolver', async () => {
    const servicio = { ...facturado(), syncState: 'conflict' as const };
    await servicios.guardar(servicio);

    const resultado = await casos.corregirCampos(servicio.id, { facturaNumero: 'FE-003' }, admin);

    expect(resultado.syncState).toBe('conflict');
  });

  it('lanza NoEncontradoError si el servicio no existe', async () => {
    await expect(
      casos.corregirCampos('no-existe', { facturaNumero: 'FE-1' }, admin)
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
