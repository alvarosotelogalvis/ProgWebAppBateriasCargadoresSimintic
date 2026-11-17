// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

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

const nuevo = (guid: string, titulo: string, normalizado = titulo) => ({
  guid,
  titulo,
  normalizado,
});

describe('SharePointGateway · clientes (T014)', () => {
  it('listarClientes devuelve todos, también los inactivos, con sus datos de fusión', async () => {
    const e = await crear();
    e.emulador.sembrarCliente({
      Title: 'VIEJO',
      Activo: false,
      FusionadoConId: 2,
      ClienteGuid: 'g-v',
      NombreNormalizado: 'VIEJO',
    });

    const todos = await e.clientesRemotos.listarClientes();

    expect(todos.map((c) => c.nombre)).toEqual(
      expect.arrayContaining([
        'Clientes Demo SAS',
        'Transportes Andinos',
        'Cliente Inactivo',
        'VIEJO',
      ])
    );
    expect(todos.find((c) => c.nombre === 'VIEJO')).toMatchObject({
      activo: false,
      fusionadoCon: 2,
      guid: 'g-v',
      normalizado: 'VIEJO',
    });
    expect(todos.find((c) => c.nombre === 'Clientes Demo SAS')).toMatchObject({
      id: 1,
      activo: true,
    });
    expect(todos.every((c) => Number.isInteger(c.id))).toBe(true);
  });

  it('crearCliente crea el ítem con guid, nombre normalizado, Activo y CreadoDesdeApp', async () => {
    const e = await crear();

    const creado = await e.clientesRemotos.crearCliente(nuevo('g-1', 'MINERA LOS ANDES'));

    expect(creado).toMatchObject({
      nombre: 'MINERA LOS ANDES',
      activo: true,
      guid: 'g-1',
      normalizado: 'MINERA LOS ANDES',
    });
    const item = e.emulador.itemsDe('Clientes').find((i) => i.fields.ClienteGuid === 'g-1');
    expect(item?.fields).toMatchObject({
      Title: 'MINERA LOS ANDES',
      NombreNormalizado: 'MINERA LOS ANDES',
      Activo: true,
      CreadoDesdeApp: true,
    });
    expect(String(creado.id)).toBe(item?.id);
  });

  it('es idempotente por guid: repetir devuelve el mismo cliente sin duplicar', async () => {
    const e = await crear();
    const a = await e.clientesRemotos.crearCliente(nuevo('g-1', 'MINERA A'));

    const b = await e.clientesRemotos.crearCliente(nuevo('g-1', 'MINERA A'));

    expect(b.id).toBe(a.id);
    expect(
      e.emulador.itemsDe('Clientes').filter((i) => i.fields.ClienteGuid === 'g-1')
    ).toHaveLength(1);
  });

  it('con el mismo nombre normalizado de otro dispositivo adopta el existente (ES-010-04)', async () => {
    const e = await crear();
    const deOtro = await e.clientesRemotos.crearCliente(nuevo('g-otro', 'MINERA A'));

    const mio = await e.clientesRemotos.crearCliente(nuevo('g-mio', 'Minera A', 'MINERA A'));

    expect(mio.id).toBe(deOtro.id);
    expect(
      e.emulador.itemsDe('Clientes').filter((i) => i.fields.NombreNormalizado === 'MINERA A')
    ).toHaveLength(1);
  });

  it('si el nombre existente es un cliente fusionado (inactivo), lo devuelve para seguir la cadena', async () => {
    const e = await crear();
    e.emulador.sembrarCliente({
      Title: 'MINERA VIEJA',
      Activo: false,
      FusionadoConId: 1,
      NombreNormalizado: 'MINERA VIEJA',
    });

    const r = await e.clientesRemotos.crearCliente(nuevo('g-1', 'MINERA VIEJA'));

    expect(r).toMatchObject({ activo: false, fusionadoCon: 1 });
  });

  it('buscarPorGuid y buscarPorNormalizado encuentran (o no) y ordenan por id', async () => {
    const e = await crear();
    const primero = e.emulador.sembrarCliente({ Title: 'DUP', NombreNormalizado: 'DUP' });
    const segundo = e.emulador.sembrarCliente({ Title: 'DUP2', NombreNormalizado: 'DUP' });
    await e.clientesRemotos.crearCliente(nuevo('g-x', 'X'));

    const duplicados = await e.clientesRemotos.buscarPorNormalizado('DUP');

    expect(duplicados.map((c) => c.id)).toEqual([Number(primero.id), Number(segundo.id)]);
    expect(await e.clientesRemotos.buscarPorNormalizado('NADA')).toEqual([]);
    expect(await e.clientesRemotos.buscarPorGuid('g-x')).toMatchObject({ nombre: 'X' });
    expect(await e.clientesRemotos.buscarPorGuid('g-no')).toBeNull();
  });

  it('un nombre con comilla simple se busca y se crea sin romper el filtro', async () => {
    const e = await crear();

    const a = await e.clientesRemotos.crearCliente(nuevo('g-1', "O'BRIEN"));
    const b = await e.clientesRemotos.crearCliente(nuevo('g-2', "O'BRIEN"));

    expect(b.id).toBe(a.id);
  });

  it('leerCatalogos ofrece solo los activos e informa las fusiones', async () => {
    const e = await crear();
    e.emulador.sembrarCliente({ Title: 'MINERA VIEJA', Activo: false, FusionadoConId: 2 });
    const nuevoCliente = await e.clientesRemotos.crearCliente(nuevo('g-1', 'MINERA NUEVA'));

    const catalogos = await e.gateway.leerCatalogos();

    expect(catalogos.clientes.map((c) => c.nombre)).toEqual(
      expect.arrayContaining(['MINERA NUEVA', 'Clientes Demo SAS'])
    );
    expect(catalogos.clientes.map((c) => c.nombre)).not.toContain('MINERA VIEJA');
    expect(catalogos.clientes.find((c) => c.nombre === 'MINERA NUEVA')?.id).toBe(nuevoCliente.id);
    expect(catalogos.fusionados).toEqual([expect.objectContaining({ destinoId: 2 })]);
  });
});
