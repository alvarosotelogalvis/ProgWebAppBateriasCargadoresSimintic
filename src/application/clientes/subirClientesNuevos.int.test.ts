import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { idTemporalDeGuid, type ClienteNuevo } from '@/domain/cliente';
import type { Servicio } from '@/domain/servicio';
import { CatalogoRepositoryDexie } from '@/infrastructure/db/catalogoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { MockRemoteGateway } from '@/infrastructure/graph/mockRemoteGateway';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearClientesLocales, type ClientesLocales } from './clientesLocales';
import { crearSubirClientesNuevos } from './subirClientesNuevos';

let db: AppDB;
let catalogos: CatalogoRepositoryDexie;
let servicios: ServicioRepositoryDexie;
let clientesLocales: ClientesLocales;
let remoto: MockRemoteGateway;
let subir: ReturnType<typeof crearSubirClientesNuevos>;

const GUID_A = '00000000-0000-4000-8000-0000000000a1';
const GUID_B = '00000000-0000-4000-8000-0000000000b2';

const nuevoCliente = (guid: string, nombre: string, normalizado = nombre): ClienteNuevo => ({
  id: idTemporalDeGuid(guid),
  guid,
  nombre,
  normalizado,
  creadoEn: '2026-11-16T10:00:00.000Z',
});

/** Servicio que usa un cliente aún temporal. */
const conCliente = (
  id: string,
  cliente: ClienteNuevo,
  extra: Partial<Servicio> = {}
): Servicio => ({
  ...servicioBuilder().conId(id).recibido().pendiente().construir(),
  clienteId: cliente.id,
  clienteNombre: cliente.nombre,
  camposSucios: [],
  ...extra,
});

beforeEach(async () => {
  db = await crearDbPrueba();
  catalogos = new CatalogoRepositoryDexie(db);
  servicios = new ServicioRepositoryDexie(db);
  clientesLocales = crearClientesLocales(catalogos);
  remoto = new MockRemoteGateway();
  await catalogos.guardar(CLAVES_CATALOGO.clientes, [
    { id: 1, nombre: 'Navar Asociados', activo: true },
  ]);
  subir = crearSubirClientesNuevos({
    clientesRemotos: remoto,
    clientesLocales,
    catalogos,
    servicios,
    logger: new FakeLogger(),
  });
});

afterEach(async () => {
  await db.delete();
});

describe('subirClientesNuevos · crear en SharePoint (ES-010-03)', () => {
  it('crea el cliente, lo asocia al servicio y limpia el pendiente', async () => {
    const cliente = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));

    const resultado = await subir();

    expect(resultado.subidos).toBe(1);
    const [creado] = await remoto.buscarPorNormalizado('MINERA LOS ANDES');
    expect(creado).toMatchObject({ guid: GUID_A, activo: true });
    const s = await servicios.obtener('s1');
    expect(s).toMatchObject({ clienteId: creado!.id, clienteNombre: 'MINERA LOS ANDES' });
    expect(await clientesLocales.listar()).toEqual([]);
  });

  it('el cliente queda en el catálogo local sin esperar al siguiente refresco', async () => {
    const cliente = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));

    await subir();

    const catalogo = (await catalogos.obtener<{ id: number; nombre: string }[]>(
      CLAVES_CATALOGO.clientes
    ))!;
    expect(catalogo.map((c) => c.nombre)).toContain('MINERA LOS ANDES');
  });

  it('es idempotente: repetir la subida no crea un segundo cliente', async () => {
    const cliente = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));

    await subir();
    // El dispositivo se cayó antes de limpiar: el pendiente sigue y el servicio sigue apuntando al temporal.
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));
    await subir();

    expect(
      (await remoto.listarClientes()).filter((c) => c.nombre === 'MINERA LOS ANDES')
    ).toHaveLength(1);
  });

  it('un cliente que nadie usa no se crea en SharePoint (no se ensucia la lista con tipeos)', async () => {
    await clientesLocales.agregar(nuevoCliente(GUID_A, 'CLIENTE SIN SERVICIO'));

    const resultado = await subir();

    expect(resultado.subidos).toBe(0);
    expect(await remoto.buscarPorNormalizado('CLIENTE SIN SERVICIO')).toEqual([]);
    expect(await clientesLocales.listar()).toHaveLength(1); // se conserva para usarlo después
  });

  it('con varios servicios del mismo cliente los asocia a todos', async () => {
    const cliente = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));
    await servicios.guardar(conCliente('s2', cliente));

    await subir();

    const [creado] = await remoto.buscarPorNormalizado('MINERA LOS ANDES');
    expect((await servicios.obtener('s1'))?.clienteId).toBe(creado!.id);
    expect((await servicios.obtener('s2'))?.clienteId).toBe(creado!.id);
  });
});

describe('subirClientesNuevos · el cliente ya existía (ES-010-04)', () => {
  it('adopta el cliente de otro dispositivo con el mismo nombre normalizado', async () => {
    const deOtro = await remoto.crearCliente({
      guid: 'guid-de-otro',
      titulo: 'MINERA LOS ANDES',
      normalizado: 'MINERA LOS ANDES',
    });
    const cliente = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));

    await subir();

    expect((await servicios.obtener('s1'))?.clienteId).toBe(deOtro.id);
    expect(
      (await remoto.listarClientes()).filter((c) => c.nombre === 'MINERA LOS ANDES')
    ).toHaveLength(1);
  });

  it('dos dispositivos que crearon el mismo cliente terminan con un solo cliente', async () => {
    const enA = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(enA);
    await servicios.guardar(conCliente('s1', enA));
    await subir();
    // El otro dispositivo sube su propio «MINERA LOS ANDES» (guid distinto) con otro servicio.
    const enB = nuevoCliente(GUID_B, 'MINERA LOS ANDES');
    await clientesLocales.agregar(enB);
    await servicios.guardar(conCliente('s2', enB));

    await subir();

    const [uno] = await remoto.buscarPorNormalizado('MINERA LOS ANDES');
    expect(await remoto.buscarPorNormalizado('MINERA LOS ANDES')).toHaveLength(1);
    expect((await servicios.obtener('s1'))?.clienteId).toBe(uno!.id);
    expect((await servicios.obtener('s2'))?.clienteId).toBe(uno!.id);
  });

  it('si el existente fue fusionado en otro, el servicio queda con el cliente vigente', async () => {
    const viejo = await remoto.crearCliente({
      guid: 'g-viejo',
      titulo: 'MINERA VIEJA',
      normalizado: 'MINERA VIEJA',
    });
    await remoto.desactivarFusionado(viejo.id, 1); // 1 = Navar Asociados
    const cliente = nuevoCliente(GUID_A, 'MINERA VIEJA');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));

    await subir();

    expect(await servicios.obtener('s1')).toMatchObject({
      clienteId: 1,
      clienteNombre: 'Navar Asociados',
    });
  });
});

describe('subirClientesNuevos · no se pierde ningún dato local (regla 1)', () => {
  it('un servicio que ya estaba en SharePoint queda con el cliente nuevo como campo por enviar', async () => {
    const cliente = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(
      conCliente('s1', cliente, {
        sp: { itemId: '55', eTag: '"1"', modificadoEn: '2026-11-01T00:00:00Z', webUrl: '' },
        camposSucios: ['marca'],
        marca: 'EDITADA',
      })
    );

    await subir();

    const s = await servicios.obtener('s1');
    const [creado] = await remoto.buscarPorNormalizado('MINERA LOS ANDES');
    expect(s?.clienteId).toBe(creado!.id);
    expect(s?.camposSucios.sort()).toEqual(['clienteId', 'marca']);
    expect(s?.marca).toBe('EDITADA');
    expect(s?.syncState).toBe('pending');
  });

  it('si SharePoint falla, el cliente y el servicio quedan intactos para reintentar', async () => {
    const cliente = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));
    remoto.crearCliente = async () => {
      throw new Error('sin red');
    };

    await expect(subir()).rejects.toThrow('sin red');

    expect(await clientesLocales.listar()).toEqual([cliente]);
    expect((await servicios.obtener('s1'))?.clienteId).toBe(cliente.id);
  });

  it('no toca los servicios de otros clientes', async () => {
    const cliente = nuevoCliente(GUID_A, 'MINERA LOS ANDES');
    await clientesLocales.agregar(cliente);
    await servicios.guardar(conCliente('s1', cliente));
    const ajeno = {
      ...servicioBuilder().conId('s2').recibido().pendiente().construir(),
      clienteId: 1,
      clienteNombre: 'Navar Asociados',
    };
    await servicios.guardar(ajeno);

    await subir();

    expect(await servicios.obtener('s2')).toEqual(ajeno);
  });
});
