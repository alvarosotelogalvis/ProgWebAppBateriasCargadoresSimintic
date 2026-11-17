// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { Servicio } from '@/domain/servicio';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { EmuladorGraph } from '../../../tests/fixtures/graph/emuladorGraph';
import {
  adjuntoPendiente,
  crearEntornoSync,
  type EntornoSync,
  type OpcionesEntornoSync,
} from '../../../tests/fixtures/sync/crearEntornoSync';

const servidor = setupServer();
let entornos: EntornoSync[] = [];

const crear = async (opciones?: OpcionesEntornoSync): Promise<EntornoSync> => {
  const entorno = await crearEntornoSync({ dormir: async () => undefined, ...opciones });
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

const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';

/** Servicio nuevo, sin número de solicitud (pendiente), tal como lo deja el formulario. */
const sinNumero = (id: string, serie: string, actualizadoEn: string): Servicio => ({
  ...servicioBuilder()
    .conId(id)
    .pendiente()
    .conCampos({ tipoEquipo: 'CARGADOR', serie, numeroSolicitud: 0 })
    .construir(),
  actualizadoEn,
  codigo: `CAR-PEND-${serie}`,
  camposSucios: [],
});

const numerosRemotos = (emulador: EmuladorGraph): number[] =>
  emulador
    .itemsDe('Servicios')
    .map((item) => Number(item.fields.NumeroSolicitud))
    .sort((a, b) => a - b);

describe('MotorSync · número de solicitud automático', () => {
  it('dos pendientes reciben consecutivos en el orden en que se registraron (ES-011-04)', async () => {
    const entorno = await crear();
    // B se registró antes que A aunque su id sea mayor.
    await entorno.servicios.guardar(sinNumero(ID_A, 'SERA', '2026-11-16T10:05:00.000Z'));
    await entorno.servicios.guardar(sinNumero(ID_B, 'SERB', '2026-11-16T10:00:00.000Z'));

    const resumen = await entorno.sincronizar();

    expect(resumen).toMatchObject({ subidos: 2, errores: 0, resultado: 'OK' });
    expect((await entorno.servicios.obtener(ID_B))?.numeroSolicitud).toBe(1);
    expect((await entorno.servicios.obtener(ID_A))?.numeroSolicitud).toBe(2);
  });

  it('el servicio queda con el número, el código definitivo y el ítem remoto coincide', async () => {
    const entorno = await crear();
    await entorno.servicios.guardar(sinNumero(ID_A, 'NV4520', '2026-11-16T10:00:00.000Z'));

    await entorno.sincronizar();

    const local = await entorno.servicios.obtener(ID_A);
    expect(local).toMatchObject({
      numeroSolicitud: 1,
      codigo: 'CAR-1-NV4520',
      syncState: 'synced',
      camposSucios: [],
    });
    expect(local?.base.numeroSolicitud).toBe(1);
    const remoto = entorno.emulador.itemsDe('Servicios')[0];
    expect(remoto?.fields).toMatchObject({ NumeroSolicitud: 1, Title: 'CAR-1-NV4520' });
  });

  it('continúa desde el mayor número existente, que no cambia (ES-011-07)', async () => {
    const emulador = new EmuladorGraph();
    emulador.sembrarServicio({ ServicioId: 'viejo', NumeroSolicitud: 41, Title: 'BAT-41-X' });
    const entorno = await crear({ emulador });
    await entorno.servicios.guardar(sinNumero(ID_A, 'SERA', '2026-11-16T10:00:00.000Z'));

    await entorno.sincronizar();

    expect((await entorno.servicios.obtener(ID_A))?.numeroSolicitud).toBe(42);
    expect(numerosRemotos(emulador)).toEqual([41, 42]);
  });

  it('un corte después de crear el ítem no consume otro número al reintentar (ES-011-06)', async () => {
    let fallar = true;
    const entorno = await crear({
      envolverUploader: (real) => ({
        subir: async (...args) => {
          if (fallar) {
            fallar = false;
            throw new Error('corte de red simulado');
          }
          return real.subir(...args);
        },
      }),
    });
    await entorno.servicios.guardar(sinNumero(ID_A, 'SERA', '2026-11-16T10:00:00.000Z'));
    await entorno.adjuntos.guardar(adjuntoPendiente(ID_A, '11111111-0000-4000-8000-000000000101'));

    const primera = await entorno.sincronizar();
    expect(primera.errores + (primera.subidos === 0 ? 1 : 0)).toBeGreaterThan(0);
    expect(numerosRemotos(entorno.emulador)).toEqual([1]);

    entorno.clock.avanzarMs(10 * 60_000);
    const segunda = await entorno.sincronizar();

    expect(segunda).toMatchObject({ errores: 0, subidos: 1 });
    expect(numerosRemotos(entorno.emulador)).toEqual([1]);
    expect((await entorno.servicios.obtener(ID_A))?.numeroSolicitud).toBe(1);
  });

  it.each([
    ['con la unicidad al instante', false],
    ['con la unicidad tardía de SharePoint real', true],
  ])(
    'dos dispositivos que suben a la vez no repiten número, %s (ES-011-05)',
    async (_titulo, diferida) => {
      const emulador = new EmuladorGraph();
      if (diferida) emulador.diferirUnicidadNumero();
      const a = await crear({ emulador });
      const b = await crear({ emulador });
      await a.servicios.guardar(sinNumero(ID_A, 'SERA', '2026-11-16T10:00:00.000Z'));
      await b.servicios.guardar(sinNumero(ID_B, 'SERB', '2026-11-16T10:00:00.000Z'));

      const [resA, resB] = await Promise.all([a.sincronizar(), b.sincronizar()]);

      expect(resA.errores + resB.errores).toBe(0);
      expect(numerosRemotos(emulador)).toEqual([1, 2]);
      const enA = (await a.servicios.obtener(ID_A))?.numeroSolicitud;
      const enB = (await b.servicios.obtener(ID_B))?.numeroSolicitud;
      expect([enA, enB].sort()).toEqual([1, 2]);
      // El número local coincide con el de SharePoint para cada servicio.
      for (const item of emulador.itemsDe('Servicios')) {
        const local = item.fields.ServicioId === ID_A ? enA : enB;
        expect(item.fields.NumeroSolicitud).toBe(local);
      }
    }
  );
});
