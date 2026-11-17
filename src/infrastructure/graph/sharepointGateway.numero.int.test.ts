// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AppError } from '@/shared/errors';

import { crearEntornoSync, type EntornoSync } from '../../../tests/fixtures/sync/crearEntornoSync';

const servidor = setupServer();
let entornos: EntornoSync[] = [];

const crear = async (): Promise<EntornoSync> => {
  const entorno = await crearEntornoSync({ dormir: async () => undefined });
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

describe('SharePointGateway · número de solicitud', () => {
  it('ultimoNumeroSolicitud devuelve 0 con la lista vacía y luego el mayor', async () => {
    const entorno = await crear();
    expect(await entorno.gateway.ultimoNumeroSolicitud()).toBe(0);

    entorno.emulador.sembrarServicio({ ServicioId: 'a', NumeroSolicitud: 3 });
    entorno.emulador.sembrarServicio({ ServicioId: 'b', NumeroSolicitud: 12 });
    entorno.emulador.sembrarServicio({ ServicioId: 'c' });

    expect(await entorno.gateway.ultimoNumeroSolicitud()).toBe(12);
  });

  it('crearServicio distingue el choque de NumeroSolicitud del de ServicioId', async () => {
    const entorno = await crear();
    await entorno.gateway.crearServicio({ ServicioId: 'a', NumeroSolicitud: 5 });

    const choque = await entorno.gateway
      .crearServicio({ ServicioId: 'otro', NumeroSolicitud: 5 })
      .catch((e: unknown) => e);

    expect(choque).toBeInstanceOf(AppError);
    expect((choque as AppError).codigo).toBe('SP_NUMERO_DUPLICADO');
    expect((choque as AppError).reintentable).toBe(true);
  });

  it('un reintento con el mismo ServicioId devuelve el ítem existente (idempotente)', async () => {
    const entorno = await crear();
    const primero = await entorno.gateway.crearServicio({ ServicioId: 'a', NumeroSolicitud: 5 });

    const otra = await entorno.gateway.crearServicio({ ServicioId: 'a', NumeroSolicitud: 6 });

    expect(otra.id).toBe(primero.id);
    expect(entorno.emulador.itemsDe('Servicios')).toHaveLength(1);
  });

  it('contarPorNumeroSolicitud lista los ítems con ese número', async () => {
    const entorno = await crear();
    entorno.emulador.diferirUnicidadNumero();
    await entorno.gateway.crearServicio({ ServicioId: 'a', NumeroSolicitud: 8 });
    await entorno.gateway.crearServicio({ ServicioId: 'b', NumeroSolicitud: 8 });
    await entorno.gateway.crearServicio({ ServicioId: 'c', NumeroSolicitud: 9 });

    const con8 = await entorno.gateway.contarPorNumeroSolicitud(8);

    expect(con8).toHaveLength(2);
    expect(con8.every((item) => typeof item.itemId === 'string')).toBe(true);
    expect(await entorno.gateway.contarPorNumeroSolicitud(77)).toEqual([]);
  });

  it('renumerarServicio cambia el número y el código del ítem', async () => {
    const entorno = await crear();
    const creado = await entorno.gateway.crearServicio({
      ServicioId: 'a',
      NumeroSolicitud: 1,
      Title: 'CAR-1-X',
    });

    await entorno.gateway.renumerarServicio(creado.id, 4, 'CAR-4-X');

    expect(entorno.emulador.itemsDe('Servicios')[0]?.fields).toMatchObject({
      NumeroSolicitud: 4,
      Title: 'CAR-4-X',
    });
  });

  it('renumerarServicio a un número ya usado falla con SP_NUMERO_DUPLICADO', async () => {
    const entorno = await crear();
    const a = await entorno.gateway.crearServicio({ ServicioId: 'a', NumeroSolicitud: 1 });
    await entorno.gateway.crearServicio({ ServicioId: 'b', NumeroSolicitud: 2 });

    const error = await entorno.gateway.renumerarServicio(a.id, 2, 'X').catch((e: unknown) => e);

    expect((error as AppError).codigo).toBe('SP_NUMERO_DUPLICADO');
  });
});
