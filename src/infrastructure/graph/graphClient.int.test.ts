import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AuthPort } from '@/application/ports/authPort';
import type { Logger } from '@/application/ports/loggerPort';
import { AppError } from '@/shared/errors';

import { crearGraphClient } from './graphClient';

const BASE = 'https://graph.microsoft.com/v1.0';

const servidor = setupServer();

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const crearAuth = (tokens: string[] = ['token-1']): AuthPort => {
  let indice = 0;
  return {
    inicializar: async () => undefined,
    cuentaActiva: () => null,
    rolesCacheados: () => [],
    sesionVigente: () => true,
    iniciarSesion: async () => undefined,
    asegurarToken: async () => tokens[Math.min(indice++, tokens.length - 1)]!,
    cambiarCuenta: async () => undefined,
    cerrarSesion: async () => undefined,
  };
};

const crearLogger = (): Logger => {
  const eventos: string[] = [];
  return {
    debug: (evento) => eventos.push(evento),
    info: (evento) => eventos.push(evento),
    warn: (evento) => eventos.push(evento),
    error: (evento) => eventos.push(evento),
  };
};

const crearIds = () => {
  let n = 0;
  return { siguiente: () => `id-${++n}` };
};

const dormir = async () => undefined;

describe('graphClient', () => {
  it('envia Authorization, client-request-id y Accept', async () => {
    let cabeceras: Headers | undefined;
    servidor.use(
      http.get(`${BASE}/prueba`, ({ request }) => {
        cabeceras = request.headers;
        return HttpResponse.json({ ok: true });
      })
    );

    const cliente = crearGraphClient({
      auth: crearAuth(),
      logger: crearLogger(),
      ids: crearIds(),
      dormir,
    });
    await cliente.enviar({ metodo: 'GET', ruta: '/prueba' });

    expect(cabeceras?.get('authorization')).toBe('Bearer token-1');
    expect(cabeceras?.get('client-request-id')).toBe('id-1');
    expect(cabeceras?.get('accept')).toBe('application/json');
  });

  it('respeta 429 con Retry-After y reintenta', async () => {
    let intentos = 0;
    servidor.use(
      http.get(`${BASE}/limite`, () => {
        intentos += 1;
        if (intentos === 1) {
          return HttpResponse.json({ error: { code: 'throttled' } }, {
            status: 429,
            headers: { 'Retry-After': '0' },
          });
        }
        return HttpResponse.json({ value: 42 });
      })
    );

    const cliente = crearGraphClient({
      auth: crearAuth(),
      logger: crearLogger(),
      ids: crearIds(),
      dormir,
    });
    const respuesta = await cliente.enviar<{ value: number }>({ metodo: 'GET', ruta: '/limite' });
    expect(respuesta.datos.value).toBe(42);
    expect(intentos).toBe(2);
  });

  it('reintenta 5xx hasta 4 veces y luego falla con SP_SERVIDOR', async () => {
    let intentos = 0;
    servidor.use(
      http.get(`${BASE}/caido`, () => {
        intentos += 1;
        return HttpResponse.json({ error: { code: 'general' } }, { status: 500 });
      })
    );

    const cliente = crearGraphClient({
      auth: crearAuth(),
      logger: crearLogger(),
      ids: crearIds(),
      dormir,
    });

    await expect(cliente.enviar({ metodo: 'GET', ruta: '/caido' })).rejects.toMatchObject({
      codigo: 'SP_SERVIDOR',
    });
    expect(intentos).toBe(5);
  });

  it('ante 401 refresca el token una vez y reintenta', async () => {
    let intentos = 0;
    servidor.use(
      http.get(`${BASE}/auth`, ({ request }) => {
        intentos += 1;
        if (request.headers.get('authorization') === 'Bearer token-2') {
          return HttpResponse.json({ ok: true });
        }
        return HttpResponse.json({ error: { code: 'InvalidAuthenticationToken' } }, { status: 401 });
      })
    );

    const cliente = crearGraphClient({
      auth: crearAuth(['token-1', 'token-2']),
      logger: crearLogger(),
      ids: crearIds(),
      dormir,
    });
    const respuesta = await cliente.enviar<{ ok: boolean }>({ metodo: 'GET', ruta: '/auth' });
    expect(respuesta.datos.ok).toBe(true);
    expect(intentos).toBe(2);
  });

  it('ante 401 doble falla con AUTH_REQUERIDA', async () => {
    servidor.use(
      http.get(`${BASE}/auth-doble`, () =>
        HttpResponse.json({ error: { code: 'InvalidAuthenticationToken' } }, { status: 401 })
      )
    );

    const cliente = crearGraphClient({
      auth: crearAuth(['token-1', 'token-2']),
      logger: crearLogger(),
      ids: crearIds(),
      dormir,
    });

    await expect(cliente.enviar({ metodo: 'GET', ruta: '/auth-doble' })).rejects.toMatchObject({
      codigo: 'AUTH_REQUERIDA',
    });
  });

  it('traduce una red caida a RED_SIN_CONEXION', async () => {
    const cliente = crearGraphClient({
      auth: crearAuth(),
      logger: crearLogger(),
      ids: crearIds(),
      dormir,
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
      reintentosPorLlamada: 0,
    });

    await expect(cliente.enviar({ metodo: 'GET', ruta: '/red' })).rejects.toMatchObject({
      codigo: 'RED_SIN_CONEXION',
    });
  });

  it('traduce un timeout a SP_SERVIDOR reintentable', async () => {
    const cliente = crearGraphClient({
      auth: crearAuth(),
      logger: crearLogger(),
      ids: crearIds(),
      dormir,
      reintentosPorLlamada: 0,
      fetchImpl: (_url, init) =>
        new Promise((_resolver, rechazar) => {
          init?.signal?.addEventListener('abort', () => {
            rechazar(new DOMException('Abortado', 'AbortError'));
          });
        }),
    });

    await expect(
      cliente.enviar({ metodo: 'GET', ruta: '/timeout', timeoutMs: 5 })
    ).rejects.toMatchObject({ codigo: 'SP_SERVIDOR' });
  });

  it('pagina siguiendo @odata.nextLink', async () => {
    servidor.use(
      http.get(`${BASE}/items`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('pagina') === '2') {
          return HttpResponse.json({ value: [{ id: 3 }] });
        }
        return HttpResponse.json({
          value: [{ id: 1 }, { id: 2 }],
          '@odata.nextLink': `${BASE}/items?pagina=2`,
        });
      })
    );

    const cliente = crearGraphClient({
      auth: crearAuth(),
      logger: crearLogger(),
      ids: crearIds(),
      dormir,
    });
    const ids: number[] = [];
    for await (const item of cliente.paginar<{ id: number }>('/items')) ids.push(item.id);
    expect(ids).toEqual([1, 2, 3]);
  });

  it('registra el error de Graph con la ruta sin query', async () => {
    const logger = crearLogger();
    const espia = vi.spyOn(logger, 'info');
    servidor.use(
      http.get(`${BASE}/registro`, () =>
        HttpResponse.json({ error: { code: 'general' } }, { status: 403 })
      )
    );

    const cliente = crearGraphClient({
      auth: crearAuth(),
      logger,
      ids: crearIds(),
      dormir,
    });

    await expect(cliente.enviar({ metodo: 'GET', ruta: '/registro?x=1' })).rejects.toBeInstanceOf(
      AppError
    );
    expect(espia).toHaveBeenCalledWith(
      'graph.request',
      expect.objectContaining({ ruta: `${BASE}/registro`, estado: 403 }),
      expect.objectContaining({ clientRequestId: 'id-1' })
    );
  });
});
