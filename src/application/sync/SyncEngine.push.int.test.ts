// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { Servicio } from '@/domain/servicio';
import { TAMANO_FRAGMENTO, TAMANO_SIMPLE_MAX } from '@/infrastructure/graph/uploads';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import {
  adjuntoPendiente,
  crearEntornoSync,
  type EntornoSync,
  type OpcionesEntornoSync,
} from '../../../tests/fixtures/sync/crearEntornoSync';

const servidor = setupServer();

let entornos: EntornoSync[] = [];

const crear = async (opciones?: OpcionesEntornoSync): Promise<EntornoSync> => {
  const entorno = await crearEntornoSync(opciones);
  entornos.push(entorno);
  servidor.use(...entorno.emulador.handlers());
  return entorno;
};

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  servidor.resetHandlers();
  const abiertos = entornos;
  entornos = [];
  await Promise.all(abiertos.map((entorno) => entorno.cerrar()));
});
afterAll(() => servidor.close());

const servicioPendiente = (id = '00000000-0000-4000-8000-000000000001'): Servicio =>
  servicioBuilder().conId(id).pendiente().construir();

describe('MotorSync · push', () => {
  it('crea el ítem, sube N archivos con metadatos y registra el log', async () => {
    const entorno = await crear();
    const servicio = servicioPendiente();
    const adjuntos = [
      adjuntoPendiente(servicio.id, '11111111-0000-4000-8000-000000000101'),
      adjuntoPendiente(servicio.id, '22222222-0000-4000-8000-000000000102'),
      adjuntoPendiente(servicio.id, '33333333-0000-4000-8000-000000000103'),
    ];

    await entorno.servicios.guardar(servicio);
    for (const adjunto of adjuntos) await entorno.adjuntos.guardar(adjunto);

    const resumen = await entorno.sincronizar();

    expect(resumen).toEqual({
      subidos: 1,
      archivos: 3,
      errores: 0,
      conflictos: 0,
      resultado: 'OK',
    });

    const items = entorno.emulador.itemsDe('Servicios');
    expect(items).toHaveLength(1);
    const item = items[0];
    if (!item) throw new Error('No se creó el ítem remoto');
    expect(item.fields).toMatchObject({
      ServicioId: servicio.id,
      Title: servicio.codigo,
      Estado: 'Recibido',
      TipoEquipo: 'Cargador',
      ClienteLookupId: 1,
      Marca: 'ROQUET',
    });

    const archivos = entorno.emulador.archivosEmulados();
    expect(archivos).toHaveLength(3);
    for (const archivo of archivos) {
      expect(archivo.ruta).toMatch(new RegExp(`^2026/${servicio.id}/`));
      expect(archivo.ruta).toContain(`${servicio.codigo}_FOTO_INGRESO_`);
      expect(archivo.fields).toMatchObject({
        ServicioId: servicio.id,
        TipoAdjunto: 'Foto ingreso',
        CapturadoPor: servicio.capturadoPor,
      });
      expect(adjuntos.map((adjunto) => adjunto.id)).toContain(archivo.fields.AdjuntoId);
    }

    const guardado = await entorno.servicios.obtener(servicio.id);
    expect(guardado).toMatchObject({ syncState: 'synced', camposSucios: [], intentos: 0 });
    expect(guardado?.sp?.itemId).toBe(item.id);
    expect(guardado?.sp?.eTag).toBe(item.eTag);

    const locales = await entorno.adjuntos.listarPorServicio(servicio.id);
    expect(locales).toHaveLength(3);
    for (const adjunto of locales) {
      expect(adjunto).toMatchObject({ syncState: 'synced' });
      expect(adjunto.sp?.driveItemId).toBeTruthy();
      expect(adjunto.sincronizadoEn).toBeTruthy();
      expect(adjunto.uploadSession).toBeUndefined();
    }

    const logs = entorno.emulador.logs();
    expect(logs).toHaveLength(1);
    expect(logs[0]?.fields).toMatchObject({
      Usuario: 'tecnico.demo@empresa.com',
      Resultado: 'OK',
      ServiciosSubidos: 1,
      ArchivosSubidos: 3,
      Conflictos: 0,
      AppVersion: '0.1.0',
    });
  });

  it('reanuda un archivo grande tras una caída de red sin duplicar el ítem', async () => {
    const entorno = await crear();
    const servicio = servicioPendiente();
    const archivo = new Blob([new Uint8Array(TAMANO_SIMPLE_MAX + TAMANO_FRAGMENTO + 1)], {
      type: 'application/pdf',
    });
    const adjunto = adjuntoPendiente(servicio.id, '00000000-0000-4000-8000-000000000201', {
      tipo: 'COTIZACION',
      nombreArchivo: 'cotizacion.pdf',
      blob: archivo,
    });

    await entorno.servicios.guardar(servicio);
    await entorno.adjuntos.guardar(adjunto);

    entorno.emulador.dropConnectionAfter(TAMANO_FRAGMENTO + 10);
    const primero = await entorno.sincronizar();

    expect(primero.resultado).toBe('Error');
    const trasCorte = await entorno.servicios.obtener(servicio.id);
    expect(trasCorte?.syncState).toBe('pending');
    expect(entorno.emulador.itemsDe('Servicios')).toHaveLength(1);

    const enCurso = await entorno.adjuntos.obtener(adjunto.id);
    expect(enCurso?.uploadSession?.siguienteByte).toBe(TAMANO_FRAGMENTO);
    expect(entorno.emulador.sesionesActivas()).toBe(1);

    const segundo = await entorno.sincronizar();

    expect(segundo).toMatchObject({ subidos: 1, archivos: 1, errores: 0, resultado: 'OK' });
    expect(entorno.emulador.itemsDe('Servicios')).toHaveLength(1);
    expect(entorno.emulador.rangosDeSubida().map((rango) => rango.desde)).toEqual([
      0,
      TAMANO_FRAGMENTO,
      TAMANO_FRAGMENTO * 2,
    ]);
    expect(entorno.emulador.archivosEmulados()).toHaveLength(1);
    const subido = entorno.emulador.archivosEmulados()[0];
    expect(subido?.tamano).toBe(archivo.size);
    expect(entorno.emulador.sesionesActivas()).toBe(0);

    const guardado = await entorno.servicios.obtener(servicio.id);
    expect(guardado?.syncState).toBe('synced');
    const adjuntoFinal = await entorno.adjuntos.obtener(adjunto.id);
    expect(adjuntoFinal).toMatchObject({ syncState: 'synced' });
    expect(adjuntoFinal?.uploadSession).toBeUndefined();
  });

  it('resuelve el duplicado de ServicioId (400 «unique constraints» de SharePoint real) buscando el ítem existente', async () => {
    const entorno = await crear();
    const servicio = {
      ...servicioPendiente(),
      observacionTecnica: 'Revisado tras perder la confirmación',
      camposSucios: ['observacionTecnica' as const],
    };
    const remoto = entorno.emulador.sembrarServicio({
      ServicioId: servicio.id,
      Title: servicio.codigo,
      Estado: 'Recibido',
      TipoEquipo: 'Cargador',
    });
    await entorno.servicios.guardar(servicio);

    entorno.emulador.simularCarrera409();
    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, errores: 0 });
    expect(entorno.emulador.itemsDe('Servicios')).toHaveLength(1);
    expect(entorno.emulador.itemsDe('Servicios')[0]?.fields.ObservacionTecnica).toBe(
      'Revisado tras perder la confirmación'
    );

    const guardado = await entorno.servicios.obtener(servicio.id);
    expect(guardado).toMatchObject({ syncState: 'synced', camposSucios: [] });
    expect(guardado?.sp?.itemId).toBe(remoto.id);
  });

  it('resuelve también un 409 de ServicioId único (por si otro tenant lo devuelve así)', async () => {
    const entorno = await crear();
    const servicio = {
      ...servicioPendiente(),
      observacionTecnica: 'Revisado tras perder la confirmación',
      camposSucios: ['observacionTecnica' as const],
    };
    const remoto = entorno.emulador.sembrarServicio({
      ServicioId: servicio.id,
      Title: servicio.codigo,
      Estado: 'Recibido',
      TipoEquipo: 'Cargador',
    });
    await entorno.servicios.guardar(servicio);

    entorno.emulador.duplicadoDevuelve409();
    entorno.emulador.simularCarrera409();
    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, errores: 0 });
    expect(entorno.emulador.itemsDe('Servicios')).toHaveLength(1);
    expect(entorno.emulador.itemsDe('Servicios')[0]?.fields.ObservacionTecnica).toBe(
      'Revisado tras perder la confirmación'
    );

    const guardado = await entorno.servicios.obtener(servicio.id);
    expect(guardado).toMatchObject({ syncState: 'synced', camposSucios: [] });
    expect(guardado?.sp?.itemId).toBe(remoto.id);
  });

  it('entrega el 412 al resolutor y continúa con los demás servicios', async () => {
    const entorno = await crear();
    const primero = entorno.emulador.sembrarServicio({
      ServicioId: '00000000-0000-4000-8000-000000000301',
      Title: 'CAR-1-AAA',
      Estado: 'Recibido',
      TipoEquipo: 'Cargador',
    });
    const segundo = entorno.emulador.sembrarServicio({
      ServicioId: '00000000-0000-4000-8000-000000000302',
      Title: 'CAR-1-BBB',
      Estado: 'Recibido',
      TipoEquipo: 'Cargador',
    });

    const basePrimero = servicioBuilder()
      .conId('00000000-0000-4000-8000-000000000301')
      .conCampos({
        estado: 'DIAGNOSTICADO',
      })
      .construir();
    const conConflicto: Servicio = {
      ...basePrimero,
      codigo: 'CAR-1-AAA',
      actualizadoEn: '2026-10-21T08:00:00.000Z',
      camposSucios: ['estado'],
      base: { estado: 'RECIBIDO' },
      syncState: 'pending',
      sp: {
        itemId: primero.id,
        eTag: primero.eTag,
        modificadoEn: primero.modificadoEn,
        webUrl: primero.webUrl,
      },
    };
    const baseSegundo = servicioBuilder()
      .conId('00000000-0000-4000-8000-000000000302')
      .conCampos({
        estado: 'DIAGNOSTICADO',
      })
      .construir();
    const sinConflicto: Servicio = {
      ...baseSegundo,
      codigo: 'CAR-1-BBB',
      actualizadoEn: '2026-10-21T09:00:00.000Z',
      camposSucios: ['estado'],
      base: { estado: 'RECIBIDO' },
      syncState: 'pending',
      sp: {
        itemId: segundo.id,
        eTag: segundo.eTag,
        modificadoEn: segundo.modificadoEn,
        webUrl: segundo.webUrl,
      },
    };

    await entorno.servicios.guardar(conConflicto);
    await entorno.servicios.guardar(sinConflicto);

    entorno.emulador.etagMismatch();
    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({
      subidos: 1,
      errores: 0,
      conflictos: 1,
      resultado: 'Parcial',
    });

    const enConflicto = await entorno.servicios.obtener(conConflicto.id);
    expect(enConflicto?.syncState).toBe('conflict');
    const continuo = await entorno.servicios.obtener(sinConflicto.id);
    expect(continuo?.syncState).toBe('synced');

    expect(primero.fields.Estado).toBe('Recibido');
    expect(segundo.fields.Estado).toBe('Diagnosticado');

    const conflicto = entorno.eventos.find((evento) => evento.tipo === 'conflicto');
    expect(conflicto).toMatchObject({ servicioId: conConflicto.id });
    expect(entorno.emulador.logs()[0]?.fields).toMatchObject({
      Resultado: 'Parcial',
      Conflictos: 1,
      ServiciosSubidos: 1,
    });
  });

  it('conserva una edición local hecha durante la subida para el siguiente intento', async () => {
    const repositorio: { actual: ServicioRepository | undefined } = { actual: undefined };
    const entorno = await crear({
      envolverUploader: (uploader) => ({
        async subir(archivo, ruta, opciones) {
          const actual = await repositorio.actual?.obtener('00000000-0000-4000-8000-000000000401');
          if (actual && !actual.camposSucios.includes('observacionTecnica')) {
            await repositorio.actual?.guardar({
              ...actual,
              observacionTecnica: 'EDITADO DURANTE LA SUBIDA',
              camposSucios: [...actual.camposSucios, 'observacionTecnica'],
              syncState: 'pending',
            });
          }
          return uploader.subir(archivo, ruta, opciones);
        },
      }),
    });
    repositorio.actual = entorno.servicios;

    const servicio = { ...servicioPendiente(), id: '00000000-0000-4000-8000-000000000401' };
    await entorno.servicios.guardar(servicio);
    await entorno.adjuntos.guardar(
      adjuntoPendiente(servicio.id, '00000000-0000-4000-8000-000000000402')
    );

    const primero = await entorno.sincronizar();

    expect(primero).toMatchObject({ subidos: 1, archivos: 1, resultado: 'OK' });
    const trasPrimero = await entorno.servicios.obtener(servicio.id);
    expect(trasPrimero).toMatchObject({
      syncState: 'pending',
      observacionTecnica: 'EDITADO DURANTE LA SUBIDA',
    });
    expect(trasPrimero?.camposSucios).toContain('observacionTecnica');
    expect(entorno.emulador.itemsDe('Servicios')[0]?.fields.ObservacionTecnica).toBeUndefined();

    const segundo = await entorno.sincronizar();

    expect(segundo).toMatchObject({ subidos: 1, resultado: 'OK' });
    const final = await entorno.servicios.obtener(servicio.id);
    expect(final).toMatchObject({ syncState: 'synced', camposSucios: [] });
    expect(entorno.emulador.itemsDe('Servicios')[0]?.fields.ObservacionTecnica).toBe(
      'EDITADO DURANTE LA SUBIDA'
    );
  });

  it('elimina en SharePoint un adjunto marcado y lo borra localmente', async () => {
    const entorno = await crear();
    const servicio = servicioPendiente();
    const archivo = entorno.emulador.sembrarArchivo(`2026/${servicio.id}/viejo.jpg`);
    const adjunto = {
      ...adjuntoPendiente(servicio.id, '00000000-0000-4000-8000-000000000501'),
      syncState: 'synced' as const,
      eliminarRemoto: true,
      sp: {
        driveItemId: archivo.id,
        webUrl: archivo.webUrl,
        eTag: archivo.eTag,
      },
    };

    await entorno.servicios.guardar(servicio);
    await entorno.adjuntos.guardar(adjunto);

    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, archivos: 0, resultado: 'OK' });
    expect(entorno.emulador.archivoPorRuta(`2026/${servicio.id}/viejo.jpg`)).toBeUndefined();
    expect(await entorno.adjuntos.listarPorServicio(servicio.id)).toHaveLength(0);
    expect((await entorno.servicios.obtener(servicio.id))?.syncState).toBe('synced');
  });
});
