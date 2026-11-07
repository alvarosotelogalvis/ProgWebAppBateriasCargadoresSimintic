import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';
import {
  BorradorNoEliminableError,
  CampoNoEditableError,
  NoEncontradoError,
  SinPermisoError,
  TransicionInvalidaError,
} from '@/domain/errores';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { MetaRepositoryDexie } from '@/infrastructure/db/metaRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearCasosDeUso } from './casosDeUso';
import type { DepsServicios } from './deps';

interface Entorno {
  db: AppDB;
  servicios: ServicioRepositoryDexie;
  adjuntos: AdjuntoRepositoryDexie;
  ids: FakeIdGenerator;
  clock: FakeClock;
  auth: FakeAuth;
  logger: FakeLogger;
  deps: DepsServicios;
  casos: ReturnType<typeof crearCasosDeUso>;
}

let entorno: Entorno;

const crearEntorno = async (cuenta: ConstructorParameters<typeof FakeAuth>[0] = undefined) => {
  const db = await crearDbPrueba();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const ids = new FakeIdGenerator();
  ids.predefinir(['disp-1', 'serv-1', 'serv-2', 'serv-3', 'serv-4']);
  const clock = new FakeClock();
  const auth = cuenta === undefined ? new FakeAuth() : new FakeAuth(cuenta);
  const logger = new FakeLogger();
  const meta = new MetaRepositoryDexie(db, ids);
  const uow = new UnidadDeTrabajoDexie(db, servicios, adjuntos);
  const deps: DepsServicios = {
    servicios,
    adjuntos,
    uow,
    ids,
    clock,
    auth,
    logger,
    meta,
    config: () => CONFIG_DEFECTO,
    appVersion: 'test',
  };

  return {
    db,
    servicios,
    adjuntos,
    ids,
    clock,
    auth,
    logger,
    deps,
    casos: crearCasosDeUso(deps),
  };
};

beforeEach(async () => {
  entorno = await crearEntorno();
});

afterEach(async () => {
  await entorno.db.delete();
});

const recibidoValido = () =>
  servicioBuilder()
    .recibido()
    .conCampos({
      tipoEquipo: 'CARGADOR',
      fechaRecepcion: '2026-10-01',
      clienteId: 1,
      clienteNombre: 'NAVAR ASOCIADOS',
      numeroSolicitud: 1,
      marca: 'ROQUET',
      referencia: 'REF-1',
      serie: 'NV4520',
    })
    .construir();

describe('crearBorrador', () => {
  it('crea un borrador local con identidad, fecha y dispositivo', async () => {
    const servicio = await entorno.casos.crearBorrador();

    expect(servicio).toMatchObject({
      id: 'serv-1',
      codigo: 'BAT-0-',
      estado: 'BORRADOR',
      tipoEquipo: 'BATERIA',
      fechaRecepcion: '2026-10-21',
      capturadoPor: 'tecnico.demo@empresa.com',
      capturadoPorNombre: 'Tecnico Demo',
      dispositivoId: 'disp-1',
      appVersion: 'test',
      syncState: 'local',
      camposSucios: [],
    });
    expect(await entorno.servicios.obtener('serv-1')).toEqual(servicio);
    expect(entorno.logger.eventos.map((evento) => evento.evento)).toContain(
      'servicio.borrador.creado'
    );
  });

  it('exige una sesión activa', async () => {
    await entorno.db.delete();
    entorno = await crearEntorno(null);

    await expect(entorno.casos.crearBorrador()).rejects.toBeInstanceOf(SinPermisoError);
  });
});

describe('actualizarCampos', () => {
  it('edita el borrador, normaliza y recalcula el código sin marcarlo sucio', async () => {
    const borrador = servicioBuilder().borrador().construir();
    await entorno.servicios.guardar(borrador);

    const actualizado = await entorno.casos.actualizarCampos(
      borrador.id,
      {
        tipoEquipo: 'CARGADOR',
        numeroSolicitud: 5,
        serie: ' nv 1 ',
        marca: ' roquet ',
        referencia: ' ref/9 ',
      },
      ['Tecnico']
    );

    expect(actualizado).toMatchObject({
      tipoEquipo: 'CARGADOR',
      numeroSolicitud: 5,
      serie: 'NV1',
      marca: 'ROQUET',
      referencia: 'REF/9',
      codigo: 'CAR-5-NV1',
      syncState: 'local',
      camposSucios: [],
    });
    expect(await entorno.servicios.obtener(borrador.id)).toEqual(actualizado);
  });

  it('marca los campos sucios y pendiente de sincronización fuera del borrador', async () => {
    const recibido = recibidoValido();
    await entorno.servicios.guardar(recibido);

    const actualizado = await entorno.casos.actualizarCampos(
      recibido.id,
      { observacionTecnica: 'Se revisa el equipo y se encuentra desgaste interno.' },
      ['Tecnico']
    );

    expect(actualizado.syncState).toBe('pending');
    expect(actualizado.camposSucios).toContain('observacionTecnica');
    expect(actualizado.observacionTecnica).toContain('desgaste');
  });

  it('conserva el estado de conflicto al editar un servicio en conflicto', async () => {
    const recibido = { ...recibidoValido(), syncState: 'conflict' as const };
    await entorno.servicios.guardar(recibido);

    const actualizado = await entorno.casos.actualizarCampos(
      recibido.id,
      { observacionTecnica: 'Observación corregida manualmente por el técnico.' },
      ['Tecnico']
    );
    expect(actualizado.syncState).toBe('conflict');
  });

  it('rechaza campos no editables para el rol y el estado', async () => {
    const entregado = servicioBuilder().entregado().construir();
    await entorno.servicios.guardar(entregado);

    await expect(
      entorno.casos.actualizarCampos(entregado.id, { facturaFecha: '2026-10-16' }, ['Tecnico'])
    ).rejects.toBeInstanceOf(CampoNoEditableError);
  });

  it('rechaza campos que no pertenecen al servicio', async () => {
    const borrador = servicioBuilder().borrador().construir();
    await entorno.servicios.guardar(borrador);

    await expect(
      entorno.casos.actualizarCampos(borrador.id, { inexistente: 'x' } as never, ['Tecnico'])
    ).rejects.toBeInstanceOf(CampoNoEditableError);
  });

  it('lanza NoEncontradoError si el servicio no existe', async () => {
    await expect(
      entorno.casos.actualizarCampos('no-existe', { serie: 'X' }, ['Tecnico'])
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe('completarEtapa', () => {
  const borradorListo = async () => {
    const servicio = recibidoValido();
    const foto = adjuntoBuilder({ id: 'foto-1', servicioId: servicio.id }).construir();
    await entorno.servicios.guardar(servicio);
    await entorno.adjuntos.guardar(foto);
    return { servicio, foto };
  };

  it('completa la recepción, marca todos los campos capturados y los adjuntos pendientes', async () => {
    const { servicio, foto } = await borradorListo();
    const borrador = { ...servicio, estado: 'BORRADOR' as const };
    await entorno.servicios.guardar(borrador);

    const recibido = await entorno.casos.completarEtapa(borrador.id, 'completarRecepcion', [
      'Tecnico',
    ]);

    expect(recibido.estado).toBe('RECIBIDO');
    expect(recibido.syncState).toBe('pending');
    expect(recibido.camposSucios).toEqual(
      expect.arrayContaining(['estado', 'tipoEquipo', 'serie', 'clienteId', 'marca'])
    );
    expect((await entorno.adjuntos.obtener(foto.id))?.syncState).toBe('pending');
  });

  it('no guarda cambios si falta un requisito y la transacción falla', async () => {
    const { servicio } = await borradorListo();
    const borrador = { ...servicio, estado: 'BORRADOR' as const };
    await entorno.adjuntos.eliminarPorServicio(servicio.id);
    await entorno.servicios.guardar(borrador);

    await expect(
      entorno.casos.completarEtapa(borrador.id, 'completarRecepcion', ['Tecnico'])
    ).rejects.toBeInstanceOf(TransicionInvalidaError);
    expect((await entorno.servicios.obtener(borrador.id))?.estado).toBe('BORRADOR');
  });

  it('lanza NoEncontradoError si el servicio no existe', async () => {
    await expect(
      entorno.casos.completarEtapa('no-existe', 'completarRecepcion', ['Tecnico'])
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});

describe('anular', () => {
  it('anula con un administrador y registra la fecha', async () => {
    const recibido = recibidoValido();
    await entorno.servicios.guardar(recibido);

    const anulado = await entorno.casos.anular(recibido.id, 'Registro duplicado por error.', [
      'Administrador',
    ]);

    expect(anulado.estado).toBe('ANULADO');
    expect(anulado.anulacionMotivo).toBe('Registro duplicado por error.');
    expect(anulado.anulacionFecha).toBe('2026-10-21');
    expect(anulado.camposSucios).toEqual(
      expect.arrayContaining(['estado', 'anulacionMotivo', 'anulacionFecha'])
    );
  });

  it('rechaza la anulación de un técnico', async () => {
    const recibido = recibidoValido();
    await entorno.servicios.guardar(recibido);

    await expect(
      entorno.casos.anular(recibido.id, 'Registro duplicado por error.', ['Tecnico'])
    ).rejects.toBeInstanceOf(SinPermisoError);
  });
});

describe('descartarBorrador', () => {
  it('elimina el borrador y sus adjuntos', async () => {
    const borrador = servicioBuilder().borrador().construir();
    const foto = adjuntoBuilder({ id: 'foto-1', servicioId: borrador.id }).construir();
    await entorno.servicios.guardar(borrador);
    await entorno.adjuntos.guardar(foto);

    await entorno.casos.descartarBorrador(borrador.id);

    expect(await entorno.servicios.obtener(borrador.id)).toBeUndefined();
    expect(await entorno.adjuntos.obtener(foto.id)).toBeUndefined();
  });

  it('rechaza descartar un servicio que ya no es borrador', async () => {
    const recibido = recibidoValido();
    await entorno.servicios.guardar(recibido);

    await expect(entorno.casos.descartarBorrador(recibido.id)).rejects.toBeInstanceOf(
      BorradorNoEliminableError
    );
  });

  it('lanza NoEncontradoError si el borrador no existe', async () => {
    await expect(entorno.casos.descartarBorrador('no-existe')).rejects.toBeInstanceOf(
      NoEncontradoError
    );
  });
});
