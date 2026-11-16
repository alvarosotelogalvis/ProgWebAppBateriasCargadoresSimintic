import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';

import type { ImageProcessor } from '@/application/ports/imageProcessor';
import type { StoragePort } from '@/application/ports/storagePort';
import { crearAgregarFoto, crearCasosDeUsoAdjuntos, crearEliminarAdjunto } from './casosDeUso';
import type { DepsAdjuntos } from './deps';
import { CONFIG_DEFECTO, type ConfigApp } from '@/domain/config';
import {
  AdjuntoDuplicadoError,
  AlmacenamientoLlenoError,
  LimiteAdjuntosError,
  NoEncontradoError,
} from '@/domain/errores';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { contenidoArchivo } from '@/infrastructure/media/hash';

class ImageProcessorFalso implements ImageProcessor {
  llamadas = 0;
  async procesar(): Promise<{
    principal: Blob;
    miniatura: Blob;
    mime: string;
    ancho: number;
    alto: number;
  }> {
    this.llamadas += 1;
    return {
      principal: new Blob(['jpeg'], { type: 'image/jpeg' }),
      miniatura: new Blob(['mini'], { type: 'image/jpeg' }),
      mime: 'image/jpeg',
      ancho: 1920,
      alto: 1080,
    };
  }
}

class StorageFalso implements StoragePort {
  porcentaje = 10;
  async estimar(): Promise<{
    usadoBytes: number;
    cuotaBytes: number;
    disponibleBytes: number;
    porcentajeUsado: number;
  }> {
    return {
      usadoBytes: 0,
      cuotaBytes: 100,
      disponibleBytes: 100,
      porcentajeUsado: this.porcentaje,
    };
  }
  async persistir(): Promise<boolean> {
    return true;
  }
}

const crearDeps = async (config: ConfigApp = CONFIG_DEFECTO) => {
  const db = await crearDbPrueba();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const imageProcessor = new ImageProcessorFalso();
  const storage = new StorageFalso();
  const deps: DepsAdjuntos = {
    servicios,
    adjuntos,
    contenido: contenidoArchivo,
    uow: new UnidadDeTrabajoDexie(db, servicios, adjuntos),
    ids: new FakeIdGenerator(),
    clock: new FakeClock(),
    auth: new FakeAuth(),
    logger: new FakeLogger(),
    meta: {
      obtener: async () => undefined,
      guardar: async () => undefined,
      dispositivoId: async () => 'disp-1',
    },
    config: () => config,
    appVersion: '0.1.0',
    imageProcessor,
    storage,
  };
  return { db, deps, adjuntos, servicios, imageProcessor, storage };
};

const archivo = (texto = 'foto') =>
  new Blob([new Uint8Array([...texto].map((caracter) => caracter.charCodeAt(0)))], {
    type: 'image/jpeg',
  });

describe('agregarFoto', () => {
  it('guarda la foto optimizada como local mientras el servicio es borrador', async () => {
    const { db, deps, adjuntos } = await crearDeps();
    const servicio = servicioBuilder().borrador().conId('id-borrador').construir();
    await deps.servicios.guardar(servicio);
    const agregar = crearAgregarFoto(deps);

    const adjunto = await agregar(servicio.id, archivo());
    const guardados = await adjuntos.listarPorServicio(servicio.id);

    expect(adjunto.syncState).toBe('local');
    expect(guardados).toHaveLength(1);
    expect(adjunto.nombreArchivo).toMatch(/\.jpg$/);
    expect(adjunto.miniatura).not.toBeNull();
    await db.close();
  });

  it('registra cuánto tardó el procesado y el peso antes y después (spike S6, CE-003-04)', async () => {
    const { db, deps } = await crearDeps();
    const servicio = servicioBuilder().borrador().conId('id-medida').construir();
    await deps.servicios.guardar(servicio);

    const adjunto = await crearAgregarFoto(deps)(servicio.id, archivo());

    const logger = deps.logger as FakeLogger;
    const evento = logger.eventos.find((e) => e.evento === 'adjunto.agregado');
    expect(evento?.datos).toMatchObject({ bytes: adjunto.tamanoBytes });
    expect(evento?.datos?.procesadoMs).toEqual(expect.any(Number));
    expect(evento?.datos?.procesadoMs as number).toBeGreaterThanOrEqual(0);
    expect(evento?.datos?.origenBytes).toBe(archivo().size);
    // El visor de registros recorta los datos a 100 caracteres: las medidas deben ir primero.
    const texto = JSON.stringify(evento?.datos).slice(0, 100);
    expect(texto).toContain('procesadoMs');
    expect(texto).toContain('origenBytes');
    await db.close();
  });

  it('marca pendiente cuando la recepcion ya se completo', async () => {
    const { db, deps } = await crearDeps();
    const servicio = servicioBuilder().recibido().conId('id-recibido').construir();
    await deps.servicios.guardar(servicio);
    const agregar = crearAgregarFoto(deps);

    const adjunto = await agregar(servicio.id, archivo());
    expect(adjunto.syncState).toBe('pending');
    await db.close();
  });

  it('rechaza duplicados por hash y el exceso de fotos', async () => {
    const { db, deps } = await crearDeps();
    const servicio = servicioBuilder().conId('id-max').construir();
    await deps.servicios.guardar(servicio);
    const agregar = crearAgregarFoto({
      ...deps,
      config: () => ({ ...CONFIG_DEFECTO, maxFotosIngreso: 1 }),
    });

    await agregar(servicio.id, archivo('uno'));
    await expect(agregar(servicio.id, archivo('uno'))).rejects.toBeInstanceOf(
      AdjuntoDuplicadoError
    );
    await expect(agregar(servicio.id, archivo('dos'))).rejects.toBeInstanceOf(LimiteAdjuntosError);
    await db.close();
  });

  it('bloquea al superar el 95 % de almacenamiento', async () => {
    const { db, deps, storage } = await crearDeps();
    storage.porcentaje = 96;
    const servicio = servicioBuilder().conId('id-storage').construir();
    await deps.servicios.guardar(servicio);
    const agregar = crearAgregarFoto(deps);

    await expect(agregar(servicio.id, archivo())).rejects.toBeInstanceOf(AlmacenamientoLlenoError);
    await db.close();
  });
});

describe('eliminarAdjunto', () => {
  it('elimina localmente una foto no sincronizada', async () => {
    const { db, deps, adjuntos } = await crearDeps();
    const servicio = servicioBuilder().borrador().conId('id-del').construir();
    await deps.servicios.guardar(servicio);
    const agregar = crearAgregarFoto(deps);
    const adjunto = await agregar(servicio.id, archivo());

    await crearEliminarAdjunto(deps)(adjunto.id);
    expect(await adjuntos.obtener(adjunto.id)).toBeUndefined();
    await db.close();
  });
});

describe('errores y ramas adicionales', () => {
  it('rechaza servicios inexistentes y respeta el limite de fotos de salida', async () => {
    const { db, deps } = await crearDeps({
      ...CONFIG_DEFECTO,
      maxFotosSalida: 0,
    });
    const agregar = crearAgregarFoto(deps);
    await expect(agregar('no-existe', archivo())).rejects.toBeInstanceOf(NoEncontradoError);

    const servicio = servicioBuilder().recibido().conId('id-salida').construir();
    await deps.servicios.guardar(servicio);
    await expect(agregar(servicio.id, archivo(), 'FOTO_SALIDA')).rejects.toBeInstanceOf(
      LimiteAdjuntosError
    );
    await db.close();
  });

  it('usa el id del servicio cuando no tiene codigo y un capturador local sin sesion', async () => {
    const { db, deps } = await crearDeps();
    await deps.auth.cerrarSesion();
    const servicio = {
      ...servicioBuilder().borrador().conId('id-sin-codigo').construir(),
      codigo: '',
    };
    await deps.servicios.guardar(servicio);
    deps.servicios.obtener = async () => servicio;

    const adjunto = await crearAgregarFoto(deps)(servicio.id, archivo());
    expect(adjunto.capturadoPor).toBe('local');
    expect(adjunto.nombreArchivo).toContain('ID-SIN-CODIGO');
    await db.close();
  });

  it('marca para borrar en remoto un adjunto ya sincronizado', async () => {
    const { db, deps, adjuntos } = await crearDeps();
    const adjunto = adjuntoBuilder().sincronizado().construir();
    await adjuntos.guardar(adjunto);

    await crearEliminarAdjunto(deps)(adjunto.id);
    const actualizado = await adjuntos.obtener(adjunto.id);
    expect(actualizado?.eliminarRemoto).toBe(true);
    expect(actualizado?.syncState).toBe('pending');
    expect(actualizado?.blob).toBeNull();

    await crearEliminarAdjunto(deps)('inexistente');
    await db.close();
  });

  it('expone los casos de uso de adjuntos', async () => {
    const { db, deps } = await crearDeps();
    const casos = crearCasosDeUsoAdjuntos(deps);
    expect(typeof casos.agregarFoto).toBe('function');
    expect(typeof casos.eliminarAdjunto).toBe('function');
    await db.close();
  });
});
