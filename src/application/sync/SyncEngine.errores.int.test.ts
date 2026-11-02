// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { OpcionesAsegurarToken } from '@/application/ports/authPort';
import { AppError } from '@/shared/errors';

import { FakeAuth } from '../../../tests/fakes/FakeAuth';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import {
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

const servicioPendiente = (id = '00000000-0000-4000-8000-000000000601') =>
  servicioBuilder().conId(id).pendiente().construir();

class AuthQuePideRedirect extends FakeAuth {
  readonly solicitudes: OpcionesAsegurarToken[] = [];
  redirectSolicitado = false;

  override async asegurarToken(opciones: OpcionesAsegurarToken): Promise<string> {
    this.solicitudes.push(opciones);
    if (opciones.forzarLogin === true) {
      this.redirectSolicitado = true;
      throw new AppError({
        codigo: 'AUTH_REQUERIDA',
        mensaje: 'La sesión expiró; hace falta iniciar sesión.',
        claveI18n: 'errores.codigo.AUTH_REQUERIDA',
        estadoHttp: 401,
      });
    }
    return 'token-fake';
  }
}

describe('MotorSync · errores', () => {
  it('respeta Retry-After en un 429 y reintenta la llamada', async () => {
    const esperas: number[] = [];
    const entorno = await crear({ dormir: async (ms) => void esperas.push(ms) });
    const servicio = servicioPendiente();
    await entorno.servicios.guardar(servicio);

    entorno.emulador.failNext(429, { 'retry-after': '2' });
    const resumen = await entorno.sincronizar();

    expect(esperas).toContain(2000);
    expect(resumen).toMatchObject({ subidos: 1, errores: 0, resultado: 'OK' });
    expect((await entorno.servicios.obtener(servicio.id))?.syncState).toBe('synced');
  });

  it('tras 8 fallos deja el servicio en error manual, sin próximo intento', async () => {
    const entorno = await crear({ reintentosPorLlamada: 0 });
    const servicio = servicioPendiente();
    await entorno.servicios.guardar(servicio);

    for (let intento = 1; intento <= 8; intento += 1) {
      entorno.emulador.failNext(429);
      const resumen = await entorno.sincronizar();
      expect(resumen.errores).toBe(1);

      const actual = await entorno.servicios.obtener(servicio.id);
      expect(actual?.intentos).toBe(intento);
      if (intento < 8) expect(actual?.proximoIntentoEn).toBeTruthy();
      entorno.clock.avanzarDias(1);
    }

    const final = await entorno.servicios.obtener(servicio.id);
    expect(final).toMatchObject({
      syncState: 'error',
      intentos: 8,
      ultimoError: { codigo: 'SP_LIMITE' },
    });
    expect(final?.proximoIntentoEn).toBeUndefined();
    expect(entorno.emulador.itemsDe('Servicios')).toHaveLength(0);
  });

  it('pide un login interactivo cuando el token silencioso falla y aborta el sync', async () => {
    const auth = new AuthQuePideRedirect();
    const entorno = await crear({ auth });
    const primero = servicioPendiente('00000000-0000-4000-8000-000000000611');
    const segundo = servicioPendiente('00000000-0000-4000-8000-000000000612');
    await entorno.servicios.guardar(primero);
    await entorno.servicios.guardar(segundo);

    entorno.emulador.failNext(401);
    const resumen = await entorno.sincronizar();

    expect(resumen.resultado).toBe('Error');
    expect(auth.solicitudes.at(0)).toEqual({ interactivoSiEsNecesario: false });
    expect(auth.solicitudes.at(1)).toEqual({
      interactivoSiEsNecesario: false,
      forzarLogin: true,
    });
    expect(auth.solicitudes.filter((solicitud) => solicitud.forzarLogin === true)).toHaveLength(1);
    expect(auth.redirectSolicitado).toBe(true);

    expect((await entorno.servicios.obtener(primero.id))?.syncState).toBe('pending');
    expect((await entorno.servicios.obtener(segundo.id))?.syncState).toBe('pending');
    expect(entorno.emulador.itemsDe('Servicios')).toHaveLength(0);

    const error = entorno.eventos.find((evento) => evento.tipo === 'servicio:error');
    expect(error).toMatchObject({ clase: 'AUTH' });
  });

  it('marca un 403 como error no reintentable sin esperar un nuevo intento', async () => {
    const entorno = await crear();
    const servicio = servicioPendiente();
    await entorno.servicios.guardar(servicio);

    entorno.emulador.failNext(403);
    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ errores: 1, resultado: 'Error' });
    const guardado = await entorno.servicios.obtener(servicio.id);
    expect(guardado).toMatchObject({
      syncState: 'error',
      intentos: 0,
      ultimoError: { codigo: 'SP_SIN_PERMISO' },
    });
    expect(guardado?.proximoIntentoEn).toBeUndefined();

    const error = entorno.eventos.find((evento) => evento.tipo === 'servicio:error');
    expect(error).toMatchObject({ clase: 'SIN_PERMISO' });
  });

  it('aborta el sync completo con CONFIGURACION cuando falta una lista (404)', async () => {
    const entorno = await crear();
    const primero = servicioPendiente('00000000-0000-4000-8000-000000000621');
    const segundo = servicioPendiente('00000000-0000-4000-8000-000000000622');
    await entorno.servicios.guardar(primero);
    await entorno.servicios.guardar(segundo);

    entorno.emulador.failNext(404);
    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ errores: 1, resultado: 'Error' });
    expect((await entorno.servicios.obtener(primero.id))?.syncState).toBe('pending');
    expect((await entorno.servicios.obtener(segundo.id))?.syncState).toBe('pending');
    expect(entorno.emulador.itemsDe('Servicios')).toHaveLength(0);

    const error = entorno.eventos.find((evento) => evento.tipo === 'servicio:error');
    expect(error).toMatchObject({ clase: 'CONFIGURACION' });
    expect(entorno.emulador.logs()[0]?.fields).toMatchObject({ Resultado: 'Error' });
  });
});
