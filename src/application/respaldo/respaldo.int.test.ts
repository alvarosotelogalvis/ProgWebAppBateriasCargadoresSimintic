// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Debe cargarse primero: instala fake-indexeddb antes de que se cree la base global de la app.
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';

import type { Servicio } from '@/domain/servicio';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { empaquetar } from '@/infrastructure/respaldo/zip';

import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import {
  exportarRespaldo,
  importarRespaldo,
  RespaldoInvalidoError,
  type DepsExportar,
  type DepsImportar,
} from './respaldo';

interface Dispositivo {
  readonly db: AppDB;
  readonly servicios: ServicioRepositoryDexie;
  readonly adjuntos: AdjuntoRepositoryDexie;
  readonly exportar: DepsExportar;
  readonly importar: DepsImportar;
}

const crearDispositivo = async (id: string): Promise<Dispositivo> => {
  const db = await crearDbPrueba();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  return {
    db,
    servicios,
    adjuntos,
    exportar: { servicios, adjuntos, appVersion: '0.1.0', dispositivoId: async () => id },
    importar: { servicios, uow: new UnidadDeTrabajoDexie(db, servicios, adjuntos) },
  };
};

let a: Dispositivo;
let b: Dispositivo;

beforeEach(async () => {
  a = await crearDispositivo('dispositivo-a');
  b = await crearDispositivo('dispositivo-b');
});

afterEach(async () => {
  await Promise.all([a.db.delete(), b.db.delete()]);
});

const pendiente = (id: string): Servicio => ({
  ...servicioBuilder().conId(id).diagnosticado().pendiente().construir(),
  camposSucios: ['diagnostico'],
});

const sincronizado = (id: string): Servicio =>
  servicioBuilder().conId(id).facturado().sincronizado().construir();

const foto = (servicioId: string, id: string, contenido: string) =>
  adjuntoBuilder()
    .enServicio(servicioId)
    .conCampos({
      id,
      syncState: 'pending',
      blob: new Blob([contenido], { type: 'image/jpeg' }),
      miniatura: new Blob(['mini'], { type: 'image/jpeg' }),
    })
    .construir();

describe('respaldo: exportar e importar (HU-009-1)', () => {
  it('lleva los servicios completos y sus archivos de A a B', async () => {
    const servicio = pendiente('s-1');
    await a.servicios.guardar(servicio);
    await a.adjuntos.guardar(foto('s-1', 'adj-1', 'contenido de la foto'));

    const exportado = await exportarRespaldo(a.exportar, 'solo-pendientes');
    expect(exportado).toMatchObject({ serviciosIncluidos: 1, adjuntosIncluidos: 1 });
    expect(exportado.nombreArchivo).toMatch(/^respaldo-solo-pendientes-\d{4}-\d{2}-\d{2}\.zip$/);

    const resultado = await importarRespaldo(b.importar, exportado.blob);

    expect(resultado).toEqual({ importados: 1, omitidos: 0, adjuntosImportados: 1 });
    // Todos los datos del servicio, no solo un resumen.
    expect(await b.servicios.obtener('s-1')).toEqual(servicio);
    const [adjunto] = await b.adjuntos.listarPorServicio('s-1');
    expect(adjunto).toMatchObject({ id: 'adj-1', syncState: 'pending', mime: 'image/jpeg' });
    expect(await new Response(adjunto?.blob).text()).toBe('contenido de la foto');
    expect(await new Response(adjunto?.miniatura).text()).toBe('mini');
  });

  it('«solo pendientes» incluye borradores, con error y en conflicto, pero no lo sincronizado', async () => {
    await a.servicios.guardar(sincronizado('ok'));
    await a.servicios.guardar(servicioBuilder().conId('borrador').borrador().construir());
    await a.servicios.guardar({ ...pendiente('error'), syncState: 'error' });
    await a.servicios.guardar({ ...pendiente('conflicto'), syncState: 'conflict' });

    const exportado = await exportarRespaldo(a.exportar, 'solo-pendientes');
    await importarRespaldo(b.importar, exportado.blob);

    expect((await b.servicios.listarTodos()).map((s) => s.id).sort()).toEqual([
      'borrador',
      'conflicto',
      'error',
    ]);
  });

  it('«todos» incluye también lo sincronizado', async () => {
    await a.servicios.guardar(sincronizado('ok'));
    await a.servicios.guardar(pendiente('p'));

    const exportado = await exportarRespaldo(a.exportar, 'todos');

    expect(exportado.serviciosIncluidos).toBe(2);
  });

  it('no respalda los adjuntos que solo existen en SharePoint', async () => {
    await a.servicios.guardar(pendiente('s-1'));
    await a.adjuntos.guardar(
      adjuntoBuilder()
        .enServicio('s-1')
        .conCampos({ id: 'remoto', blob: null, miniatura: null, syncState: 'synced' })
        .construir()
    );
    await a.adjuntos.guardar(foto('s-1', 'propio', 'x'));

    const exportado = await exportarRespaldo(a.exportar, 'solo-pendientes');

    expect(exportado.adjuntosIncluidos).toBe(1);
  });

  it('conserva la eliminación pendiente de un adjunto que ya no tiene archivo', async () => {
    await a.servicios.guardar(pendiente('s-1'));
    await a.adjuntos.guardar(
      adjuntoBuilder()
        .enServicio('s-1')
        .conCampos({
          id: 'a-borrar',
          blob: null,
          miniatura: null,
          eliminarRemoto: true,
          syncState: 'pending',
          sp: { driveItemId: 'd1', webUrl: '', eTag: '' },
        })
        .construir()
    );

    const exportado = await exportarRespaldo(a.exportar, 'solo-pendientes');
    await importarRespaldo(b.importar, exportado.blob);

    expect((await b.adjuntos.obtener('a-borrar'))?.eliminarRemoto).toBe(true);
  });

  it('importar dos veces no duplica ni sobrescribe lo que ya existe (idempotente)', async () => {
    await a.servicios.guardar(pendiente('s-1'));
    const { blob } = await exportarRespaldo(a.exportar, 'todos');
    await importarRespaldo(b.importar, blob);
    // En B el servicio avanzó después de la primera importación.
    const local = await b.servicios.obtener('s-1');
    await b.servicios.guardar({ ...(local as Servicio), marca: 'EDITADA EN B' });

    const segunda = await importarRespaldo(b.importar, blob);

    expect(segunda).toEqual({ importados: 0, omitidos: 1, adjuntosImportados: 0 });
    expect(await b.servicios.listarTodos()).toHaveLength(1);
    expect((await b.servicios.obtener('s-1'))?.marca).toBe('EDITADA EN B');
  });

  it('un envío interrumpido llega como pendiente', async () => {
    await a.servicios.guardar({ ...pendiente('s-1'), syncState: 'syncing' });

    const { blob } = await exportarRespaldo(a.exportar, 'todos');
    await importarRespaldo(b.importar, blob);

    expect((await b.servicios.obtener('s-1'))?.syncState).toBe('pending');
  });

  describe('un respaldo inválido no toca la base de datos', () => {
    const intentar = async (blob: Blob): Promise<unknown> => {
      await b.servicios.guardar(pendiente('existente'));
      const error = await importarRespaldo(b.importar, blob).catch((causa: unknown) => causa);
      expect(await b.servicios.listarTodos()).toHaveLength(1);
      return error;
    };

    const manifiesto = { version: '1.0.0', esquemaDb: 1, servicios_pendientes: 0 };

    it('un archivo que no es ZIP', async () => {
      expect(await intentar(new Blob(['no soy un zip']))).toBeInstanceOf(Error);
    });

    it('un ZIP sin manifiesto', async () => {
      const blob = await empaquetar([{ ruta: 'servicios.json', contenido: '[]' }]);
      expect(await intentar(blob)).toBeInstanceOf(RespaldoInvalidoError);
    });

    it('un esquema de una versión futura', async () => {
      const blob = await empaquetar([
        { ruta: 'manifiesto.json', contenido: JSON.stringify({ ...manifiesto, esquemaDb: 99 }) },
        { ruta: 'servicios.json', contenido: '[]' },
        { ruta: 'adjuntos.json', contenido: '[]' },
      ]);
      expect(await intentar(blob)).toBeInstanceOf(RespaldoInvalidoError);
    });

    it('servicios con un formato inesperado', async () => {
      const blob = await empaquetar([
        { ruta: 'manifiesto.json', contenido: JSON.stringify(manifiesto) },
        { ruta: 'servicios.json', contenido: '[{"sin":"id"}]' },
        { ruta: 'adjuntos.json', contenido: '[]' },
      ]);
      expect(await intentar(blob)).toBeInstanceOf(RespaldoInvalidoError);
    });

    it('un adjunto sin su archivo: no se importa nada, ni siquiera sus servicios', async () => {
      const servicio = pendiente('nuevo');
      const blob = await empaquetar([
        { ruta: 'manifiesto.json', contenido: JSON.stringify(manifiesto) },
        { ruta: 'servicios.json', contenido: JSON.stringify([servicio]) },
        {
          ruta: 'adjuntos.json',
          contenido: JSON.stringify([
            {
              id: 'x',
              servicioId: 'nuevo',
              tieneArchivo: true,
              tieneMiniatura: false,
              mime: 'image/jpeg',
            },
          ]),
        },
      ]);
      expect(await intentar(blob)).toBeInstanceOf(RespaldoInvalidoError);
      expect(await b.servicios.obtener('nuevo')).toBeUndefined();
    });
  });
});
