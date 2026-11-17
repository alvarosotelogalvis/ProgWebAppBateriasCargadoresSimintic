// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { idTemporalDeGuid, type ClienteNuevo } from '@/domain/cliente';
import type { Servicio } from '@/domain/servicio';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { EmuladorGraph } from '../../../tests/fixtures/graph/emuladorGraph';
import {
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

const GUID_A = '00000000-0000-4000-8000-0000000000a1';
const GUID_B = '00000000-0000-4000-8000-0000000000b2';
const ID_A = '00000000-0000-4000-8000-00000000000a';
const ID_B = '00000000-0000-4000-8000-00000000000b';

const clienteNuevo = (guid: string, nombre: string): ClienteNuevo => ({
  id: idTemporalDeGuid(guid),
  guid,
  nombre,
  normalizado: nombre,
  creadoEn: '2026-11-16T10:00:00.000Z',
});

/** Servicio nuevo cuyo cliente se creó sin red (id temporal). */
const conClienteTemporal = (id: string, cliente: ClienteNuevo, serie: string): Servicio => ({
  ...servicioBuilder().conId(id).recibido().pendiente().construir(),
  serie,
  numeroSolicitud: 0,
  clienteId: cliente.id,
  clienteNombre: cliente.nombre,
  camposSucios: [],
});

const clientesCreadosPorLaApp = (emulador: EmuladorGraph) =>
  emulador.itemsDe('Clientes').filter((item) => item.fields.CreadoDesdeApp === true);

describe('MotorSync · clientes nuevos (spec 010)', () => {
  it('crea el cliente en SharePoint y sube el servicio ya asociado a él (ES-010-03)', async () => {
    const e = await crear();
    const cliente = clienteNuevo(GUID_A, 'MINERA LOS ANDES');
    await e.clientesLocales.agregar(cliente);
    await e.servicios.guardar(conClienteTemporal(ID_A, cliente, 'SERA'));

    const resumen = await e.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, errores: 0, resultado: 'OK' });
    const [creado] = clientesCreadosPorLaApp(e.emulador);
    expect(creado?.fields).toMatchObject({ Title: 'MINERA LOS ANDES', ClienteGuid: GUID_A });
    const servicio = e.emulador.itemsDe('Servicios')[0];
    expect(servicio?.fields.ClienteLookupId).toBe(Number(creado?.id));
    expect(await e.servicios.obtener(ID_A)).toMatchObject({
      clienteId: Number(creado?.id),
      syncState: 'synced',
    });
    expect(await e.clientesLocales.listar()).toEqual([]);
  });

  it('el cliente se crea ANTES de subir el servicio', async () => {
    const e = await crear();
    const cliente = clienteNuevo(GUID_A, 'MINERA LOS ANDES');
    await e.clientesLocales.agregar(cliente);
    await e.servicios.guardar(conClienteTemporal(ID_A, cliente, 'SERA'));

    await e.sincronizar();

    const [creado] = clientesCreadosPorLaApp(e.emulador);
    const servicio = e.emulador.itemsDe('Servicios')[0];
    expect(creado!.version).toBeLessThan(servicio!.version);
  });

  it('un servicio cuyo cliente sigue temporal no se sube y queda pendiente, sin error', async () => {
    const e = await crear();
    const huerfano = clienteNuevo(GUID_A, 'SIN REGISTRO'); // no está en clientesNuevos
    await e.servicios.guardar(conClienteTemporal(ID_A, huerfano, 'SERA'));

    const resumen = await e.sincronizar();

    expect(resumen).toMatchObject({ subidos: 0, errores: 0 });
    expect(e.emulador.itemsDe('Servicios')).toHaveLength(0);
    expect((await e.servicios.obtener(ID_A))?.syncState).toBe('pending');
  });

  it('si el alta del cliente falla, el servicio queda pendiente y se reintenta en la siguiente sincronización', async () => {
    let fallos = 1;
    const e = await crear({
      envolverClientesRemotos: (real) => ({
        listarClientes: () => real.listarClientes(),
        buscarPorGuid: (guid) => real.buscarPorGuid(guid),
        buscarPorNormalizado: (normalizado) => real.buscarPorNormalizado(normalizado),
        crearCliente: async (cliente) => {
          if (fallos > 0) {
            fallos -= 1;
            throw new Error('SharePoint no responde');
          }
          return real.crearCliente(cliente);
        },
        desactivarFusionado: (o, d) => real.desactivarFusionado(o, d),
        listarServiciosDeCliente: (id) => real.listarServiciosDeCliente(id),
        reasignarServicio: (item, id) => real.reasignarServicio(item, id),
        registrarDetalleLog: (entrada) => real.registrarDetalleLog(entrada),
      }),
    });
    const cliente = clienteNuevo(GUID_A, 'MINERA LOS ANDES');
    await e.clientesLocales.agregar(cliente);
    await e.servicios.guardar(conClienteTemporal(ID_A, cliente, 'SERA'));

    const primera = await e.sincronizar();

    expect(primera.subidos).toBe(0);
    expect(e.emulador.itemsDe('Servicios')).toHaveLength(0);
    expect(await e.clientesLocales.listar()).toEqual([cliente]);

    e.clock.avanzarMs(10 * 60_000);
    const segunda = await e.sincronizar();

    expect(segunda).toMatchObject({ subidos: 1, errores: 0 });
    expect(clientesCreadosPorLaApp(e.emulador)).toHaveLength(1);
  });

  it('sincronizar de nuevo no crea otro cliente', async () => {
    const e = await crear();
    const cliente = clienteNuevo(GUID_A, 'MINERA LOS ANDES');
    await e.clientesLocales.agregar(cliente);
    await e.servicios.guardar(conClienteTemporal(ID_A, cliente, 'SERA'));

    await e.sincronizar();
    await e.sincronizar();

    expect(clientesCreadosPorLaApp(e.emulador)).toHaveLength(1);
  });

  it('dos dispositivos que crearon el mismo cliente sin red terminan con un solo cliente (ES-010-04)', async () => {
    const emulador = new EmuladorGraph();
    const a = await crear({ emulador });
    const b = await crear({ emulador });
    const enA = clienteNuevo(GUID_A, 'MINERA LOS ANDES');
    const enB = clienteNuevo(GUID_B, 'MINERA LOS ANDES');
    await a.clientesLocales.agregar(enA);
    await b.clientesLocales.agregar(enB);
    await a.servicios.guardar(conClienteTemporal(ID_A, enA, 'SERA'));
    await b.servicios.guardar(conClienteTemporal(ID_B, enB, 'SERB'));

    const [resA, resB] = await Promise.all([a.sincronizar(), b.sincronizar()]);

    expect(resA.errores + resB.errores).toBe(0);
    const clientes = clientesCreadosPorLaApp(emulador);
    expect(clientes).toHaveLength(1);
    const idCliente = Number(clientes[0]!.id);
    const servicios = emulador.itemsDe('Servicios');
    expect(servicios).toHaveLength(2);
    expect(servicios.map((s) => s.fields.ClienteLookupId)).toEqual([idCliente, idCliente]);
  });
});

describe('MotorSync · cliente fusionado (ES-010-08)', () => {
  it('un servicio pendiente cuyo cliente se fusionó mientras tanto se sube con el cliente vigente', async () => {
    const e = await crear({ conFusion: true });
    // El administrador fusionó el cliente 77 en el 1 (el origen queda inactivo y apunta al destino).
    const origen = e.emulador.sembrarCliente({
      Title: 'CLIENTE VIEJO',
      Activo: false,
      FusionadoConId: 1,
    });
    const servicio: Servicio = {
      ...servicioBuilder().conId(ID_A).recibido().pendiente().construir(),
      numeroSolicitud: 0,
      clienteId: Number(origen.id),
      clienteNombre: 'CLIENTE VIEJO',
      camposSucios: [],
    };
    await e.servicios.guardar(servicio);

    const resumen = await e.sincronizar();

    expect(resumen).toMatchObject({ subidos: 1, errores: 0, conflictos: 0 });
    expect(e.emulador.itemsDe('Servicios')[0]?.fields.ClienteLookupId).toBe(1);
    expect(await e.servicios.obtener(ID_A)).toMatchObject({ clienteId: 1, syncState: 'synced' });
  });

  it('un servicio de un cliente que no se fusionó no cambia', async () => {
    const e = await crear({ conFusion: true });
    const servicio: Servicio = {
      ...servicioBuilder().conId(ID_A).recibido().pendiente().construir(),
      numeroSolicitud: 0,
      clienteId: 2,
      clienteNombre: 'Transportes Andinos',
      camposSucios: [],
    };
    await e.servicios.guardar(servicio);

    await e.sincronizar();

    expect(e.emulador.itemsDe('Servicios')[0]?.fields.ClienteLookupId).toBe(2);
  });
});
