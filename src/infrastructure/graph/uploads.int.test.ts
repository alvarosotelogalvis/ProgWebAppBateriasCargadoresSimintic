// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { SesionSubida } from '@/domain/adjunto';
import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { EmuladorGraph } from '../../../tests/fixtures/graph/emuladorGraph';
import { crearGraphClient } from './graphClient';
import { TAMANO_FRAGMENTO, TAMANO_SIMPLE_MAX, crearGraphUploader } from './uploads';

const servidor = setupServer();

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

// jsdom y undici no comparten el mismo `Blob`; se convierte a ArrayBuffer antes
// de entregarlo a fetch para que MSW reciba los bytes reales.
const fetchConBlobs: typeof fetch = async (entrada, opciones) => {
  const cuerpo = opciones?.body;
  if (cuerpo instanceof Blob) {
    return fetch(entrada, { ...opciones, body: await cuerpo.arrayBuffer() });
  }
  return fetch(entrada, opciones);
};

const crearEntorno = () => {
  const emulador = new EmuladorGraph();
  servidor.use(...emulador.handlers());
  const auth = new FakeAuth();
  const logger = new FakeLogger();
  const graph = crearGraphClient({
    auth,
    logger,
    ids: new FakeIdGenerator(),
    dormir: async () => undefined,
  });
  const uploader = crearGraphUploader({
    graph,
    auth,
    driveId: 'drive-1',
    fetchImpl: fetchConBlobs,
  });
  return { emulador, uploader };
};

const archivoDe = (bytes: number): Blob =>
  new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });

describe('crearGraphUploader', () => {
  it('sube con PUT simple los archivos de hasta 4 MB y envía Authorization', async () => {
    const { emulador, uploader } = crearEntorno();
    const archivo = archivoDe(1024);

    const subido = await uploader.subir(archivo, '2026/servicio-1/foto.jpg');

    expect(subido.id).toBeTruthy();
    expect(emulador.archivoPorRuta('2026/servicio-1/foto.jpg')?.tamano).toBe(1024);
    expect(emulador.sesionesActivas()).toBe(0);

    const peticion = emulador
      .peticionesRealizadas()
      .find((actual) => actual.metodo === 'PUT' && actual.url.includes('/content'));
    expect(peticion?.cabeceras.authorization).toBe('Bearer token-fake');
  });

  it('usa una upload session con fragmentos de 3 200 KiB y no envía Authorization a uploadUrl', async () => {
    const { emulador, uploader } = crearEntorno();
    const archivo = archivoDe(TAMANO_SIMPLE_MAX + 1);
    const sesiones: Array<SesionSubida | null> = [];
    const progreso: Array<[number, number]> = [];

    const subido = await uploader.subir(archivo, '2026/servicio-1/video.mp4', {
      onSesion: (sesion) => {
        sesiones.push(sesion);
      },
      onProgreso: (enviados, totales) => {
        progreso.push([enviados, totales]);
      },
    });

    expect(subido.id).toBeTruthy();
    expect(emulador.archivoPorRuta('2026/servicio-1/video.mp4')?.tamano).toBe(archivo.size);
    expect(emulador.rangosDeSubida().map((rango) => rango.desde)).toEqual([0, TAMANO_FRAGMENTO]);
    expect(sesiones[0]).toMatchObject({ siguienteByte: 0 });
    expect(sesiones.at(-1)).toBeNull();
    expect(sesiones.some((sesion) => sesion?.siguienteByte === TAMANO_FRAGMENTO)).toBe(true);
    expect(progreso.at(-1)).toEqual([archivo.size, archivo.size]);

    const fragmentos = emulador
      .peticionesRealizadas()
      .filter((peticion) => peticion.url.includes('/uploadSession/'));
    expect(fragmentos.length).toBeGreaterThan(0);
    for (const fragmento of fragmentos) {
      expect(fragmento.cabeceras.authorization).toBeUndefined();
    }
  });

  it('reanuda desde siguienteByte tras una caída de red a mitad del archivo', async () => {
    const { emulador, uploader } = crearEntorno();
    // Tres fragmentos: el corte ocurre al recibir el segundo, de modo que la
    // reanudación debe continuar exactamente en `siguienteByte`.
    const archivo = archivoDe(TAMANO_SIMPLE_MAX + TAMANO_FRAGMENTO + 1);
    const sesiones: Array<SesionSubida | null> = [];

    emulador.dropConnectionAfter(TAMANO_FRAGMENTO + 10);

    await expect(
      uploader.subir(archivo, '2026/servicio-1/video.mp4', {
        onSesion: (sesion) => {
          sesiones.push(sesion);
        },
      })
    ).rejects.toThrow();

    const persistida = [...sesiones]
      .reverse()
      .find((sesion): sesion is SesionSubida => sesion !== null);
    expect(persistida?.siguienteByte).toBe(TAMANO_FRAGMENTO);
    expect(emulador.sesionesActivas()).toBe(1);
    if (!persistida) throw new Error('La sesión de subida no se persistió.');

    const subido = await uploader.subir(archivo, '2026/servicio-1/video.mp4', {
      sesion: persistida,
    });

    expect(subido.id).toBeTruthy();
    expect(emulador.rangosDeSubida().map((rango) => rango.desde)).toEqual([
      0,
      TAMANO_FRAGMENTO,
      TAMANO_FRAGMENTO * 2,
    ]);
    expect(emulador.sesionesActivas()).toBe(0);
    expect(emulador.archivoPorRuta('2026/servicio-1/video.mp4')?.tamano).toBe(archivo.size);
  });

  it('descarta una sesión expirada y crea una nueva desde cero', async () => {
    const { emulador, uploader } = crearEntorno();
    const archivo = archivoDe(TAMANO_SIMPLE_MAX + 1);
    const sesiones: Array<SesionSubida | null> = [];
    const expirada: SesionSubida = {
      url: 'https://graph.microsoft.com/v1.0/drives/drive-1/uploadSession/inexistente',
      expira: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      siguienteByte: TAMANO_FRAGMENTO,
    };

    const subido = await uploader.subir(archivo, '2026/servicio-1/video.mp4', {
      sesion: expirada,
      onSesion: (sesion) => {
        sesiones.push(sesion);
      },
    });

    expect(subido.id).toBeTruthy();
    expect(sesiones[0]).toBeNull();
    expect(sesiones.some((sesion) => sesion?.siguienteByte === 0)).toBe(true);
    expect(emulador.rangosDeSubida()[0]?.desde).toBe(0);
    expect(emulador.archivoPorRuta('2026/servicio-1/video.mp4')?.tamano).toBe(archivo.size);
  });
});
