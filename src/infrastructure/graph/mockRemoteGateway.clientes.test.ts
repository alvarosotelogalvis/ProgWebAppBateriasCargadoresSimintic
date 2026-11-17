import { describe, expect, it } from 'vitest';

import { MockRemoteGateway } from './mockRemoteGateway';

/** Adaptador simulado (VITE_AUTH_MODE=mock) de los clientes y su fusión (spec 010, T009). */
const nuevo = (guid: string, titulo: string, normalizado: string) => ({
  guid,
  titulo,
  normalizado,
});

describe('MockRemoteGateway · clientes', () => {
  it('lista los clientes de demostración', async () => {
    const mock = new MockRemoteGateway();

    const clientes = await mock.listarClientes();

    expect(clientes.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(clientes.every((c) => c.activo)).toBe(true);
  });

  it('crea un cliente con el siguiente id y lo encuentra por guid y por nombre normalizado', async () => {
    const mock = new MockRemoteGateway();

    const creado = await mock.crearCliente(nuevo('g-1', 'MINERA LOS ANDES', 'MINERA LOS ANDES'));

    expect(creado).toMatchObject({ id: 4, nombre: 'MINERA LOS ANDES', activo: true, guid: 'g-1' });
    expect(await mock.buscarPorGuid('g-1')).toEqual(creado);
    expect(await mock.buscarPorNormalizado('MINERA LOS ANDES')).toEqual([creado]);
    expect(await mock.buscarPorGuid('otro')).toBeNull();
    expect(await mock.buscarPorNormalizado('NADA')).toEqual([]);
  });

  it('es idempotente: repetir el guid o el nombre devuelve el mismo cliente', async () => {
    const mock = new MockRemoteGateway();
    const a = await mock.crearCliente(nuevo('g-1', 'MINERA X', 'MINERA X'));

    const mismoGuid = await mock.crearCliente(nuevo('g-1', 'MINERA X', 'MINERA X'));
    const mismoNombre = await mock.crearCliente(nuevo('g-2', 'Minera X', 'MINERA X'));

    expect(mismoGuid.id).toBe(a.id);
    expect(mismoNombre.id).toBe(a.id);
    expect((await mock.listarClientes()).filter((c) => c.nombre.includes('MINERA X'))).toHaveLength(
      1
    );
  });

  it('desactivar un fusionado lo deja inactivo con su destino y sigue en la lista completa', async () => {
    const mock = new MockRemoteGateway();

    await mock.desactivarFusionado(1, 2);

    const origen = (await mock.listarClientes()).find((c) => c.id === 1);
    expect(origen).toMatchObject({ activo: false, fusionadoCon: 2 });
  });

  it('el catálogo no ofrece el fusionado e informa de la fusión', async () => {
    const mock = new MockRemoteGateway();
    await mock.desactivarFusionado(1, 2);

    const catalogos = await mock.leerCatalogos();

    expect(catalogos.clientes.map((c) => c.id)).toEqual([2, 3]);
    expect(catalogos.fusionados).toEqual([{ origenId: 1, destinoId: 2 }]);
  });

  it('lista y reasigna los servicios de un cliente', async () => {
    const mock = new MockRemoteGateway();
    const s1 = await mock.crearServicio({ ServicioId: 's1', ClienteLookupId: 1 });
    await mock.crearServicio({ ServicioId: 's2', ClienteLookupId: 1 });
    await mock.crearServicio({ ServicioId: 's3', ClienteLookupId: 3 });

    expect(await mock.listarServiciosDeCliente(1)).toHaveLength(2);

    await mock.reasignarServicio(s1.id, 2);

    expect(await mock.listarServiciosDeCliente(1)).toHaveLength(1);
    expect(await mock.listarServiciosDeCliente(2)).toEqual([{ itemId: s1.id }]);
  });

  it('registrar el detalle de una fusión no falla', async () => {
    const mock = new MockRemoteGateway();

    await expect(
      mock.registrarDetalleLog({ tipo: 'Fusión de clientes', detalle: 'A → B: 2 servicios' })
    ).resolves.toBeUndefined();
  });
});
