// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';
import type { Servicio } from '@/domain/servicio';

import { adjuntoBuilder } from '../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import {
  CONFIG_PRUEBA,
  crearEntornoSync,
  type EntornoSync,
  type OpcionesEntornoSync,
} from '../../../tests/fixtures/sync/crearEntornoSync';
import { LIMITE_MINIATURAS_POR_SYNC } from './descargarMiniaturas';

const servidor = setupServer();
let entornos: EntornoSync[] = [];

const crear = async (opciones?: OpcionesEntornoSync): Promise<EntornoSync> => {
  const entorno = await crearEntornoSync({
    reintentosPorLlamada: 0,
    dormir: async () => undefined,
    ...opciones,
  });
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

const ID = '00000000-0000-4000-8000-00000000000a';
const CARPETA = `2026/${ID}`;

const servicioSubido = (): Servicio => ({
  ...servicioBuilder().conId(ID).diagnosticado().sincronizado().construir(),
  sp: { itemId: '1', eTag: '"e"', modificadoEn: '', webUrl: '' },
});

const archivo = (tipo: string, sufijo: string, ext = 'jpg'): string =>
  `${CARPETA}/CAR-1-NV4520_${tipo}_${sufijo}.${ext}`;

describe('listarAdjuntosRemotos (FR-006-13)', () => {
  it('registra los archivos de SharePoint como adjuntos sin contenido y no duplica los propios', async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(servicioSubido());
    const propio = entorno.emulador.sembrarArchivo(archivo('FOTO_INGRESO', 'aaaaaaaa'));
    const ajeno = entorno.emulador.sembrarArchivo(archivo('FOTO_INGRESO', 'bbbbbbbb'));
    const pdf = entorno.emulador.sembrarArchivo(archivo('FORMATO_DIAGNOSTICO', 'cccccccc', 'pdf'));
    entorno.emulador.sembrarArchivo(`${CARPETA}/subido-a-mano.txt`);
    await entorno.adjuntos.guardar(
      adjuntoBuilder()
        .enServicio(ID)
        .conCampos({
          id: 'local-1',
          syncState: 'synced',
          sp: { driveItemId: propio.id, webUrl: propio.webUrl, eTag: propio.eTag },
        })
        .construir()
    );

    const agregados = await entorno.listarAdjuntosRemotos(ID);

    expect(agregados).toBe(2);
    const adjuntos = await entorno.adjuntos.listarPorServicio(ID);
    expect(adjuntos).toHaveLength(3);
    const remotos = adjuntos.filter((adjunto) => adjunto.id !== 'local-1');
    expect(remotos.map((adjunto) => adjunto.sp?.driveItemId).sort()).toEqual(
      [ajeno.id, pdf.id].sort()
    );
    expect(remotos.find((adjunto) => adjunto.sp?.driveItemId === pdf.id)).toMatchObject({
      tipo: 'FORMATO_DIAGNOSTICO',
      mime: 'application/pdf',
      blob: null,
      miniatura: null,
      syncState: 'synced',
      eliminarRemoto: false,
    });

    // Repetirlo no duplica nada.
    expect(await entorno.listarAdjuntosRemotos(ID)).toBe(0);
    expect(await entorno.adjuntos.listarPorServicio(ID)).toHaveLength(3);
  });

  it('una carpeta inexistente (404) significa «sin adjuntos», no un error', async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(servicioSubido());

    expect(await entorno.listarAdjuntosRemotos(ID)).toBe(0);
    expect(entorno.logger.advertencias).toEqual([]);
  });

  it('un fallo de SharePoint se registra como advertencia y no rompe el detalle', async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(servicioSubido());
    entorno.emulador.failNext(500);

    expect(await entorno.listarAdjuntosRemotos(ID)).toBe(0);
    expect(entorno.logger.advertencias.map((evento) => evento.evento)).toContain(
      'adjuntos.remotos.fallo'
    );
  });

  it('un servicio que nunca se subió no consulta SharePoint', async () => {
    const entorno = await crear();
    const sinSubir = servicioBuilder().conId(ID).recibido().pendiente().construir();
    await entorno.servicios.guardar(sinSubir);

    expect(await entorno.listarAdjuntosRemotos(ID)).toBe(0);
    expect(entorno.emulador.peticionesRealizadas()).toHaveLength(0);
  });
});

describe('descargarMiniaturas (FR-006-12)', () => {
  /** Crea `cantidad` fotos remotas (sin miniatura) del servicio indicado. */
  const sembrarFotos = async (
    entorno: EntornoSync,
    servicioId: string,
    cantidad: number
  ): Promise<void> => {
    for (let n = 0; n < cantidad; n += 1) {
      const remoto = entorno.emulador.sembrarArchivo(
        `2026/${servicioId}/CAR-1-NV4520_FOTO_INGRESO_${String(n).padStart(8, '0')}.jpg`
      );
      await entorno.adjuntos.guardar(
        adjuntoBuilder()
          .enServicio(servicioId)
          .conCampos({
            id: `adj-${servicioId}-${n}`,
            blob: null,
            miniatura: null,
            syncState: 'synced',
            sp: { driveItemId: remoto.id, webUrl: remoto.webUrl, eTag: remoto.eTag },
          })
          .construir()
      );
    }
  };

  const abortador = (): AbortSignal => new AbortController().signal;

  it('guarda la miniatura de cada foto remota y no repite las que ya tiene', async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(servicioSubido());
    await sembrarFotos(entorno, ID, 3);

    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(3);
    const adjuntos = await entorno.adjuntos.listarPorServicio(ID);
    expect(adjuntos.every((adjunto) => adjunto.miniatura instanceof Blob)).toBe(true);
    expect(entorno.emulador.miniaturasServidas).toBe(3);

    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(0);
    expect(entorno.emulador.miniaturasServidas).toBe(3);
  });

  it(`descarga como máximo ${LIMITE_MINIATURAS_POR_SYNC} por sincronización`, async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(servicioSubido());
    await sembrarFotos(entorno, ID, LIMITE_MINIATURAS_POR_SYNC + 5);

    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(LIMITE_MINIATURAS_POR_SYNC);
    // La siguiente sincronización completa las que faltaron.
    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(5);
  });

  it('no descarga con el almacenamiento al 80 % o más', async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(servicioSubido());
    await sembrarFotos(entorno, ID, 2);
    entorno.almacenamiento.porcentajeUsado = 80;

    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(0);
    expect(entorno.emulador.miniaturasServidas).toBe(0);
  });

  it('respeta la configuración que las desactiva', async () => {
    const entorno = await crear({
      config: { ...CONFIG_PRUEBA, descargarMiniaturasRemotas: false },
    });
    await entorno.servicios.guardar(servicioSubido());
    await sembrarFotos(entorno, ID, 2);

    expect(CONFIG_DEFECTO.descargarMiniaturasRemotas).toBe(true);
    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(0);
  });

  it('solo para servicios abiertos', async () => {
    const entorno = await crear();
    const cerrado: Servicio = {
      ...servicioBuilder().conId(ID).facturado().sincronizado().construir(),
      sp: { itemId: '1', eTag: '"e"', modificadoEn: '', webUrl: '' },
    };
    await entorno.servicios.guardar(cerrado);
    await sembrarFotos(entorno, ID, 2);

    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(0);
  });

  it('un archivo sin miniatura en SharePoint no es un error', async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(servicioSubido());
    await sembrarFotos(entorno, ID, 2);
    entorno.emulador.sinMiniaturas();

    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(0);
    expect(entorno.logger.advertencias).toEqual([]);
  });

  it('una miniatura que falla no detiene las demás', async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(servicioSubido());
    await sembrarFotos(entorno, ID, 3);
    entorno.emulador.failNext(500);

    expect(await entorno.descargarMiniaturas([ID], abortador())).toBe(2);
    expect(entorno.logger.advertencias.map((evento) => evento.evento)).toContain(
      'miniaturas.fallo'
    );
  });
});
