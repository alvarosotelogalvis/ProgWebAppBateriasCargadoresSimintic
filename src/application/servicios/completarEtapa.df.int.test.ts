import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';
import { TransicionInvalidaError } from '@/domain/errores';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { MetaRepositoryDexie } from '@/infrastructure/db/metaRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { crearCasosDeUso } from './casosDeUso';

let db: AppDB;
let servicios: ServicioRepositoryDexie;
let adjuntos: AdjuntoRepositoryDexie;
let casos: ReturnType<typeof crearCasosDeUso>;

beforeEach(async () => {
  db = await crearDbPrueba();
  servicios = new ServicioRepositoryDexie(db);
  adjuntos = new AdjuntoRepositoryDexie(db);
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

const pdf = (id: string, servicioId: string, tipo: 'FORMATO_DIAGNOSTICO' | 'DISPOSICION_FINAL') =>
  adjuntoBuilder({ id, servicioId, tipo, mime: 'application/pdf', syncState: 'pending' });

const conRamaDF = () =>
  servicioBuilder()
    .recibido()
    .conCampos({
      diagnostico: 'Reparable',
      observacionTecnica: 'Celdas con desbalance leve',
      fechaSocializacionDF: '2026-10-10',
    })
    .construir();

describe('completarEtapa · rama Disposición Final → diagnóstico normal (HU-007-2)', () => {
  it('limpia fechaSocializacionDF y elimina el PDF de disposición final local', async () => {
    const servicio = conRamaDF();
    await servicios.guardar(servicio);
    await adjuntos.guardar(pdf('fd', servicio.id, 'FORMATO_DIAGNOSTICO').construir());
    await adjuntos.guardar(pdf('df', servicio.id, 'DISPOSICION_FINAL').construir());

    const resultado = await casos.completarEtapa(servicio.id, 'completarDiagnostico', ['Tecnico']);

    expect(resultado.estado).toBe('DIAGNOSTICADO');
    expect(resultado.fechaSocializacionDF).toBeUndefined();
    expect(resultado.camposSucios).toContain('fechaSocializacionDF');
    const restantes = await adjuntos.listarPorServicio(servicio.id);
    expect(restantes.map((adjunto) => adjunto.id)).toEqual(['fd']);
  });

  it('marca eliminarRemoto si el PDF de disposición final ya estaba sincronizado', async () => {
    const servicio = conRamaDF();
    await servicios.guardar(servicio);
    await adjuntos.guardar(pdf('fd', servicio.id, 'FORMATO_DIAGNOSTICO').construir());
    await adjuntos.guardar(
      pdf('df', servicio.id, 'DISPOSICION_FINAL')
        .conCampos({
          syncState: 'synced',
          sp: { driveItemId: 'i1', webUrl: 'https://sp/df.pdf', eTag: 'e' },
        })
        .construir()
    );

    await casos.completarEtapa(servicio.id, 'completarDiagnostico', ['Tecnico']);

    const df = (await adjuntos.listarPorServicio(servicio.id)).find((a) => a.id === 'df');
    expect(df).toMatchObject({ eliminarRemoto: true, syncState: 'pending' });
  });

  it('no deja nada a medias si falta el formato de diagnóstico (todo o nada)', async () => {
    const servicio = conRamaDF();
    await servicios.guardar(servicio);
    await adjuntos.guardar(pdf('df', servicio.id, 'DISPOSICION_FINAL').construir());

    await expect(
      casos.completarEtapa(servicio.id, 'completarDiagnostico', ['Tecnico'])
    ).rejects.toBeInstanceOf(TransicionInvalidaError);

    expect((await servicios.obtener(servicio.id))?.fechaSocializacionDF).toBe('2026-10-10');
    expect(await adjuntos.listarPorServicio(servicio.id)).toHaveLength(1);
  });

  it('la ruta Disposición Final conserva su fecha y su PDF', async () => {
    const servicio = servicioBuilder()
      .recibido()
      .conCampos({
        diagnostico: CONFIG_DEFECTO.diagnosticoValorDisposicionFinal,
        observacionTecnica: 'Celdas irrecuperables',
        fechaSocializacionDF: '2026-10-10',
      })
      .construir();
    await servicios.guardar(servicio);
    await adjuntos.guardar(pdf('fd', servicio.id, 'FORMATO_DIAGNOSTICO').construir());
    await adjuntos.guardar(pdf('df', servicio.id, 'DISPOSICION_FINAL').construir());

    const resultado = await casos.completarEtapa(servicio.id, 'registrarDisposicionFinal', [
      'Tecnico',
    ]);

    expect(resultado.estado).toBe('DISPOSICION_FINAL');
    expect(resultado.fechaSocializacionDF).toBe('2026-10-10');
    expect(await adjuntos.listarPorServicio(servicio.id)).toHaveLength(2);
  });
});
