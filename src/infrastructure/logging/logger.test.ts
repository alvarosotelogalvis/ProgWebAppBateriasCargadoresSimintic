import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import type { AppDB } from '../db/dexie';
import { LoggerDexie, instalarManejadoresGlobales, sanitizar } from './logger';

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

describe('sanitizar', () => {
  it('preserva valores primitivos seguros', () => {
    expect(sanitizar(42)).toBe(42);
    expect(sanitizar('hola')).toBe('hola');
    expect(sanitizar(true)).toBe(true);
  });

  it('elimina claves sensibles: token, authorization, password, blob, miniatura, archivo', () => {
    const obj = {
      nombre: 'usuario',
      token: 'secret-123',
      authorization: 'Bearer token',
      password: 'pass123',
      blob: new Blob(['data']),
      miniatura: new Blob(['thumb']),
      archivo: 'documento.pdf',
      accessToken: 'access-123',
      uploadUrl: 'https://example.com/upload?token=secret',
      email: 'test@example.com',
    };

    const resultado = sanitizar(obj) as Record<string, unknown>;

    expect(resultado.nombre).toBe('usuario');
    expect(resultado.email).toBe('test@example.com');
    expect(resultado.token).toBeUndefined();
    expect(resultado.authorization).toBeUndefined();
    expect(resultado.password).toBeUndefined();
    expect(resultado.blob).toBeUndefined();
    expect(resultado.miniatura).toBeUndefined();
    expect(resultado.archivo).toBeUndefined();
    expect(resultado.accessToken).toBeUndefined();
  });

  it('reemplaza Blob con "[blob]"', () => {
    const obj = {
      datos: 'información',
      contenido: new Blob(['contenido']),
    };

    const resultado = sanitizar(obj) as Record<string, unknown>;
    expect(resultado.contenido).toBe('[blob]');
    expect(resultado.datos).toBe('información');
  });

  it('procesa arrays recursivamente y elimina claves sensibles', () => {
    const arr = [
      { token: 'secret', nombre: 'item1' },
      { token: 'otra-secret', nombre: 'item2' },
    ];

    const resultado = sanitizar(arr) as Array<Record<string, unknown>>;
    expect(resultado).toHaveLength(2);
    expect(resultado[0]?.token).toBeUndefined();
    expect(resultado[0]?.nombre).toBe('item1');
    expect(resultado[1]?.token).toBeUndefined();
    expect(resultado[1]?.nombre).toBe('item2');
  });

  it('es case-insensitive para claves sensibles (TOKEN, Authorization, etc.)', () => {
    const obj = {
      TOKEN: 'secret1',
      Authorization: 'Bearer x',
      Password: 'pass',
      idtoken: 'id123',
      refreshtoken: 'refresh123',
    };

    const resultado = sanitizar(obj) as Record<string, unknown>;
    expect(resultado.TOKEN).toBeUndefined();
    expect(resultado.Authorization).toBeUndefined();
    expect(resultado.Password).toBeUndefined();
    expect(resultado.idtoken).toBeUndefined();
    expect(resultado.refreshtoken).toBeUndefined();
  });

  it('limita la profundidad de recursión a 4 niveles', () => {
    const obj = {
      nivel1: {
        nivel2: {
          nivel3: {
            nivel4: {
              nivel5: {
                datos: 'muy profundo',
              },
            },
          },
        },
      },
    };

    const resultado = sanitizar(obj) as Record<string, unknown>;
    const nivel1 = resultado.nivel1 as Record<string, unknown>;
    const nivel2 = nivel1.nivel2 as Record<string, unknown>;
    const nivel3 = nivel2.nivel3 as Record<string, unknown>;
    const nivel4 = nivel3.nivel4 as Record<string, unknown>;
    const nivel5 = nivel4.nivel5;

    expect(nivel5).toBe('[profundidad-maxima]');
  });
});
