import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import type { AppDB } from '../db/dexie';
import { LoggerDexie, instalarManejadoresGlobales } from './logger';

let db: AppDB;

beforeEach(async () => {
  db = await crearDbPrueba();
});

afterEach(async () => {
  await db.delete();
});

describe('LoggerDexie', () => {
  it('persiste entradas con nivel, evento, versión y metadatos de correlación', async () => {
    const logger = new LoggerDexie(db, '1.2.3');
    logger.info(
      'app.iniciada',
      { pantalla: 'servicios' },
      {
        correlationId: 'corr-1',
        clientRequestId: 'req-1',
      }
    );
    await logger.vaciar();

    const entradas = await db.logs.toArray();
    expect(entradas).toHaveLength(1);
    expect(entradas[0]).toMatchObject({
      nivel: 'info',
      evento: 'app.iniciada',
      appVersion: '1.2.3',
      datos: { pantalla: 'servicios' },
      correlationId: 'corr-1',
      clientRequestId: 'req-1',
    });
    expect(entradas[0]?.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('elimina datos sensibles y convierte blobs a marcadores', async () => {
    const logger = new LoggerDexie(db, 'test');
    logger.warn('sync.fallo', {
      token: 'secreto',
      accessToken: 'otro-secreto',
      password: 'clave',
      blob: new Blob(['x']),
      archivo: 'factura.pdf',
      contenido: new Blob(['y']),
      anidado: { authorization: 'Bearer x', seguro: 'visible' },
      lista: [{ secret: 'x' }, 'ok'],
    });
    await logger.vaciar();

    const datos = (await db.logs.toArray())[0]?.datos;
    expect(datos).toEqual({
      contenido: '[blob]',
      anidado: { seguro: 'visible' },
      lista: [{}, 'ok'],
    });
  });

  it('respeta el orden de la cola al vaciar', async () => {
    const logger = new LoggerDexie(db, 'test');
    logger.debug('uno');
    logger.error('dos');
    logger.info('tres');
    await logger.vaciar();

    expect((await db.logs.orderBy('seq').toArray()).map((entrada) => entrada.evento)).toEqual([
      'uno',
      'dos',
      'tres',
    ]);
  });

  it('no registra manejadores globales fuera del navegador o más de una vez', () => {
    const logger = new LoggerDexie(db, 'test');
    expect(() => instalarManejadoresGlobales(logger)).not.toThrow();
    expect(() => instalarManejadoresGlobales(logger)).not.toThrow();
  });
});
