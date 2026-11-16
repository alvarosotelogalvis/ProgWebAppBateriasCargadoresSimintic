import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { ImageProcessor } from '@/application/ports/imageProcessor';
import type { StoragePort } from '@/application/ports/storagePort';
import { CONFIG_DEFECTO } from '@/domain/config';
import { NoEncontradoError } from '@/domain/errores';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { crearAgregarPdf } from './agregarPdf';
import type { DepsAdjuntos } from './deps';

const fixture = (nombre: string): File => {
  const bytes = readFileSync(resolve(__dirname, '../../../tests/fixtures/pdf', nombre));
  return new File([new Uint8Array(bytes)], nombre, { type: 'application/pdf' });
};

class StorageFalso implements StoragePort {
  porcentaje = 10;
  async estimar() {
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

const imageProcessor: ImageProcessor = {
  procesar: async () => {
    throw new Error('no se usa con PDFs');
  },
};

const crearDeps = async () => {
  const db = await crearDbPrueba();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const storage = new StorageFalso();
  const deps: DepsAdjuntos = {
    servicios,
    adjuntos,
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
    config: () => CONFIG_DEFECTO,
    appVersion: '0.1.0',
    imageProcessor,
    storage,
  };
  return { deps, adjuntos, servicios, storage };
};

describe('agregarPdf (HU-007-7)', () => {
  it('acepta un PDF válido y lo guarda como pendiente en un servicio recibido', async () => {
    const { deps, adjuntos, servicios } = await crearDeps();
    const servicio = servicioBuilder().recibido().construir();
    await servicios.guardar(servicio);

    const resultado = await crearAgregarPdf(deps)(
      servicio.id,
      fixture('valido-200kb.pdf'),
      'FORMATO_DIAGNOSTICO'
    );

    expect(resultado.ok).toBe(true);
    const guardados = await adjuntos.listarPorServicio(servicio.id);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]).toMatchObject({
      tipo: 'FORMATO_DIAGNOSTICO',
      mime: 'application/pdf',
      syncState: 'pending',
      eliminarRemoto: false,
    });
    expect(guardados[0]?.nombreArchivo).toMatch(/\.pdf$/);
    expect(guardados[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('acepta un PDF con basura antes de la cabecera (firma dentro del primer KB)', async () => {
    const { deps, servicios } = await crearDeps();
    const servicio = servicioBuilder().recibido().construir();
    await servicios.guardar(servicio);

    const resultado = await crearAgregarPdf(deps)(
      servicio.id,
      fixture('cabecera-desplazada.pdf'),
      'FORMATO_DIAGNOSTICO'
    );

    expect(resultado.ok).toBe(true);
  });

  it('rechaza con NO_ES_PDF un archivo sin firma %PDF- y no guarda nada', async () => {
    const { deps, adjuntos, servicios } = await crearDeps();
    const servicio = servicioBuilder().recibido().construir();
    await servicios.guardar(servicio);

    const resultado = await crearAgregarPdf(deps)(
      servicio.id,
      fixture('falso.pdf'),
      'FORMATO_DIAGNOSTICO'
    );

    expect(resultado).toEqual({ ok: false, error: 'NO_ES_PDF' });
    expect(await adjuntos.listarPorServicio(servicio.id)).toHaveLength(0);
  });

  it('rechaza con TAMANO_EXCEDIDO un PDF mayor al máximo configurado', async () => {
    const { deps, adjuntos, servicios } = await crearDeps();
    const servicio = servicioBuilder().recibido().construir();
    await servicios.guardar(servicio);

    const resultado = await crearAgregarPdf(deps)(
      servicio.id,
      fixture('grande-25mb.pdf'),
      'FORMATO_DIAGNOSTICO'
    );

    expect(resultado).toEqual({ ok: false, error: 'TAMANO_EXCEDIDO' });
    expect(await adjuntos.listarPorServicio(servicio.id)).toHaveLength(0);
  });

  it('rechaza con ALMACENAMIENTO_LLENO cuando el uso es del 95 % o más', async () => {
    const { deps, adjuntos, servicios, storage } = await crearDeps();
    storage.porcentaje = 96;
    const servicio = servicioBuilder().recibido().construir();
    await servicios.guardar(servicio);

    const resultado = await crearAgregarPdf(deps)(
      servicio.id,
      fixture('valido-200kb.pdf'),
      'FORMATO_DIAGNOSTICO'
    );

    expect(resultado).toEqual({ ok: false, error: 'ALMACENAMIENTO_LLENO' });
    expect(await adjuntos.listarPorServicio(servicio.id)).toHaveLength(0);
  });

  it('reemplaza el PDF local del mismo tipo sin marcar eliminarRemoto', async () => {
    const { deps, adjuntos, servicios } = await crearDeps();
    const servicio = servicioBuilder().recibido().construir();
    await servicios.guardar(servicio);
    const anterior = adjuntoBuilder({
      id: 'pdf-anterior',
      servicioId: servicio.id,
      tipo: 'FORMATO_DIAGNOSTICO',
      mime: 'application/pdf',
      syncState: 'pending',
    }).construir();
    await adjuntos.guardar(anterior);

    const resultado = await crearAgregarPdf(deps)(
      servicio.id,
      fixture('valido-200kb.pdf'),
      'FORMATO_DIAGNOSTICO'
    );

    expect(resultado.ok && resultado.reemplazado).toBe('pdf-anterior');
    const guardados = await adjuntos.listarPorServicio(servicio.id);
    expect(guardados).toHaveLength(1);
    expect(guardados[0]?.id).not.toBe('pdf-anterior');
  });

  it('marca eliminarRemoto al reemplazar un PDF ya sincronizado (no pierde datos)', async () => {
    const { deps, adjuntos, servicios } = await crearDeps();
    const servicio = servicioBuilder().recibido().construir();
    await servicios.guardar(servicio);
    const sincronizado = adjuntoBuilder({
      id: 'pdf-sync',
      servicioId: servicio.id,
      tipo: 'FORMATO_DIAGNOSTICO',
      mime: 'application/pdf',
      syncState: 'synced',
      sp: { driveItemId: 'item-1', webUrl: 'https://sp/x.pdf', eTag: 'e1' },
    }).construir();
    await adjuntos.guardar(sincronizado);

    const resultado = await crearAgregarPdf(deps)(
      servicio.id,
      fixture('valido-200kb.pdf'),
      'FORMATO_DIAGNOSTICO'
    );

    expect(resultado.ok).toBe(true);
    const guardados = await adjuntos.listarPorServicio(servicio.id);
    const viejo = guardados.find((adjunto) => adjunto.id === 'pdf-sync');
    expect(viejo).toMatchObject({ eliminarRemoto: true, syncState: 'pending' });
    expect(guardados.filter((adjunto) => !adjunto.eliminarRemoto)).toHaveLength(1);
  });

  it('no toca los PDFs de otro tipo', async () => {
    const { deps, adjuntos, servicios } = await crearDeps();
    const servicio = servicioBuilder().recibido().construir();
    await servicios.guardar(servicio);
    await adjuntos.guardar(
      adjuntoBuilder({
        id: 'cotizacion',
        servicioId: servicio.id,
        tipo: 'COTIZACION',
        mime: 'application/pdf',
      }).construir()
    );

    await crearAgregarPdf(deps)(servicio.id, fixture('valido-200kb.pdf'), 'FORMATO_DIAGNOSTICO');

    expect(await adjuntos.listarPorServicio(servicio.id)).toHaveLength(2);
  });

  it('lanza NoEncontradoError si el servicio no existe', async () => {
    const { deps } = await crearDeps();

    await expect(
      crearAgregarPdf(deps)('no-existe', fixture('valido-200kb.pdf'), 'FORMATO_DIAGNOSTICO')
    ).rejects.toBeInstanceOf(NoEncontradoError);
  });
});
