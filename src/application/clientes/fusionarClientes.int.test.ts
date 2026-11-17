import { describe, expect, it, vi } from 'vitest';

import type { ClientesRemotos } from '@/application/ports/clientesRemotos';
import type { CuentaUsuario } from '@/domain/servicio';
import { MockRemoteGateway } from '@/infrastructure/graph/mockRemoteGateway';
import { AppError } from '@/shared/errors';

import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearFusionarClientes, FusionInvalidaError } from './fusionarClientes';

/** El mock trae los clientes 1 (Navar), 2 (Distribuidora) y 3 (Transportes). */
const cuenta: CuentaUsuario = {
  id: 'u1',
  nombre: 'Admin Demo',
  correo: 'admin@empresa.com',
  roles: ['Administrador'],
};

const crearServicios = async (remoto: MockRemoteGateway, clienteId: number, cantidad: number) => {
  const ids: string[] = [];
  for (let i = 0; i < cantidad; i += 1) {
    const item = await remoto.crearServicio({
      ServicioId: `s-${clienteId}-${i}`,
      ClienteLookupId: clienteId,
    });
    ids.push(item.id);
  }
  return ids;
};

const armar = (
  remoto: ClientesRemotos,
  extra: { refrescarCatalogos?: () => Promise<unknown>; logger?: FakeLogger } = {}
) =>
  crearFusionarClientes({
    clientesRemotos: remoto,
    logger: extra.logger ?? new FakeLogger(),
    cuentaActiva: () => cuenta,
    ...(extra.refrescarCatalogos ? { refrescarCatalogos: extra.refrescarCatalogos } : {}),
  });

const ADMIN = ['Administrador'] as const;

describe('fusionarClientes · reasignar y conservar el origen (ES-010-06)', () => {
  it('pasa todos los servicios del origen al destino y deja el origen inactivo, fusionado y conservado', async () => {
    const remoto = new MockRemoteGateway();
    await crearServicios(remoto, 1, 3);
    const fusionar = armar(remoto);

    const resultado = await fusionar({ origenId: 1, destinoId: 2, roles: ADMIN });

    expect(resultado).toMatchObject({ reasignados: 3, destinoId: 2 });
    expect(await remoto.listarServiciosDeCliente(1)).toEqual([]);
    expect(await remoto.listarServiciosDeCliente(2)).toHaveLength(3);
    const origen = (await remoto.listarClientes()).find((c) => c.id === 1);
    expect(origen).toMatchObject({ activo: false, fusionadoCon: 2 });
  });

  it('no toca los servicios de otros clientes', async () => {
    const remoto = new MockRemoteGateway();
    await crearServicios(remoto, 1, 2);
    await crearServicios(remoto, 3, 2);

    await armar(remoto)({ origenId: 1, destinoId: 2, roles: ADMIN });

    expect(await remoto.listarServiciosDeCliente(3)).toHaveLength(2);
  });

  it('un origen sin servicios también se fusiona (queda inactivo)', async () => {
    const remoto = new MockRemoteGateway();

    const resultado = await armar(remoto)({ origenId: 1, destinoId: 2, roles: ADMIN });

    expect(resultado.reasignados).toBe(0);
    expect((await remoto.listarClientes()).find((c) => c.id === 1)?.activo).toBe(false);
  });

  it('informa el avance y devuelve los nombres para el resumen', async () => {
    const remoto = new MockRemoteGateway();
    await crearServicios(remoto, 1, 4);
    const avances: [number, number][] = [];

    const resultado = await armar(remoto)({
      origenId: 1,
      destinoId: 2,
      roles: ADMIN,
      onProgreso: (hechos, total) => avances.push([hechos, total]),
    });

    expect(avances.at(-1)).toEqual([4, 4]);
    expect(avances.every(([h, t]) => h <= t && t === 4)).toBe(true);
    expect(resultado).toMatchObject({
      origenNombre: 'Navar Asociados',
      destinoNombre: 'Distribuidora Andina',
    });
  });

  it('refresca el catálogo local al terminar', async () => {
    const remoto = new MockRemoteGateway();
    const refrescarCatalogos = vi.fn(async () => true);

    await armar(remoto, { refrescarCatalogos })({ origenId: 1, destinoId: 2, roles: ADMIN });

    expect(refrescarCatalogos).toHaveBeenCalledTimes(1);
  });
});

describe('fusionarClientes · reanudable e idempotente (ES-010-07)', () => {
  /** Un puerto que falla en la N-ésima reasignación, como un corte de conexión. */
  const conCorte = (real: MockRemoteGateway, falloEn: number): ClientesRemotos => {
    let llamadas = 0;
    return {
      listarClientes: () => real.listarClientes(),
      buscarPorGuid: (g) => real.buscarPorGuid(g),
      buscarPorNormalizado: (n) => real.buscarPorNormalizado(n),
      crearCliente: (c) => real.crearCliente(c),
      desactivarFusionado: (o, d) => real.desactivarFusionado(o, d),
      listarServiciosDeCliente: (id) => real.listarServiciosDeCliente(id),
      reasignarServicio: async (item, id) => {
        llamadas += 1;
        if (llamadas === falloEn) throw new Error('se cortó la conexión');
        return real.reasignarServicio(item, id);
      },
      registrarDetalleLog: (e) => real.registrarDetalleLog(e),
    };
  };

  it('un corte a mitad deja el origen activo y repetir la fusión termina lo que faltaba', async () => {
    const real = new MockRemoteGateway();
    await crearServicios(real, 1, 5);

    await expect(
      armar(conCorte(real, 3))({ origenId: 1, destinoId: 2, roles: ADMIN })
    ).rejects.toThrow('se cortó la conexión');

    // El origen sigue activo y quedan servicios por pasar (los ya reasignados no se repiten).
    expect((await real.listarClientes()).find((c) => c.id === 1)?.activo).toBe(true);
    const faltan = (await real.listarServiciosDeCliente(1)).length;
    expect(faltan).toBeGreaterThan(0);
    expect(faltan).toBeLessThan(5);

    const resultado = await armar(real)({ origenId: 1, destinoId: 2, roles: ADMIN });

    expect(resultado.reasignados).toBe(faltan);
    expect(await real.listarServiciosDeCliente(1)).toEqual([]);
    expect(await real.listarServiciosDeCliente(2)).toHaveLength(5);
    expect((await real.listarClientes()).find((c) => c.id === 1)).toMatchObject({
      activo: false,
      fusionadoCon: 2,
    });
  });

  it('si alguien crea un servicio del origen durante la fusión, hace otra pasada y lo incluye', async () => {
    const real = new MockRemoteGateway();
    await crearServicios(real, 1, 1);
    let tardio = false;
    const remoto: ClientesRemotos = {
      ...conCorte(real, -1),
      reasignarServicio: async (item, id) => {
        await real.reasignarServicio(item, id);
        if (!tardio) {
          tardio = true;
          await real.crearServicio({ ServicioId: 'llego-tarde', ClienteLookupId: 1 });
        }
      },
    };

    const resultado = await armar(remoto)({ origenId: 1, destinoId: 2, roles: ADMIN });

    expect(resultado.reasignados).toBe(2);
    expect(await real.listarServiciosDeCliente(1)).toEqual([]);
  });

  it('si siguen quedando servicios tras varias pasadas falla y deja el origen activo', async () => {
    const real = new MockRemoteGateway();
    await crearServicios(real, 1, 1);
    const remoto: ClientesRemotos = {
      ...conCorte(real, -1),
      reasignarServicio: async () => undefined, // nunca se aplica: siempre queda uno
    };

    const error = await armar(remoto)({ origenId: 1, destinoId: 2, roles: ADMIN }).catch(
      (e: unknown) => e
    );

    expect(error).toBeInstanceOf(FusionInvalidaError);
    expect((error as FusionInvalidaError).motivo).toBe('INCOMPLETA');
    expect((await real.listarClientes()).find((c) => c.id === 1)?.activo).toBe(true);
  });
});

describe('fusionarClientes · validaciones', () => {
  it('rechaza fusionar un cliente consigo mismo', async () => {
    const remoto = new MockRemoteGateway();

    const error = await armar(remoto)({ origenId: 1, destinoId: 1, roles: ADMIN }).catch(
      (e: unknown) => e
    );

    expect((error as FusionInvalidaError).motivo).toBe('MISMO');
  });

  it('rechaza un cliente que no existe', async () => {
    const remoto = new MockRemoteGateway();

    const error = await armar(remoto)({ origenId: 1, destinoId: 99, roles: ADMIN }).catch(
      (e: unknown) => e
    );

    expect((error as FusionInvalidaError).motivo).toBe('NO_ENCONTRADO');
  });

  it('un cliente que ya fue fusionado no se vuelve a fusionar', async () => {
    const remoto = new MockRemoteGateway();
    await remoto.desactivarFusionado(1, 2);

    const error = await armar(remoto)({ origenId: 1, destinoId: 3, roles: ADMIN }).catch(
      (e: unknown) => e
    );

    expect((error as FusionInvalidaError).motivo).toBe('ORIGEN_FUSIONADO');
  });

  it('si el destino ya se fusionó en otro, usa el cliente vigente', async () => {
    const remoto = new MockRemoteGateway();
    await crearServicios(remoto, 1, 2);
    await remoto.desactivarFusionado(2, 3); // 2 → 3

    const resultado = await armar(remoto)({ origenId: 1, destinoId: 2, roles: ADMIN });

    expect(resultado).toMatchObject({ destinoId: 3, destinoNombre: 'Transportes del Norte' });
    expect(await remoto.listarServiciosDeCliente(3)).toHaveLength(2);
  });

  it('rechaza un destino que ya se fusionó en el origen (sería un ciclo)', async () => {
    const remoto = new MockRemoteGateway();
    await remoto.desactivarFusionado(2, 1); // 2 → 1

    const error = await armar(remoto)({ origenId: 1, destinoId: 2, roles: ADMIN }).catch(
      (e: unknown) => e
    );

    expect((error as FusionInvalidaError).motivo).toBe('CICLO');
  });
});

describe('fusionarClientes · solo el Administrador, solo con conexión', () => {
  it.each([['Tecnico'], ['Comercial']] as const)(
    'el rol %s no puede fusionar (ES-010-09)',
    async (rol) => {
      const remoto = new MockRemoteGateway();
      const listar = vi.spyOn(remoto, 'listarClientes');

      await expect(armar(remoto)({ origenId: 1, destinoId: 2, roles: [rol] })).rejects.toThrow();

      expect(listar).not.toHaveBeenCalled();
    }
  );

  it('sin conexión falla con el error de red y no cambia nada (ES-010-10)', async () => {
    const real = new MockRemoteGateway();
    await crearServicios(real, 1, 2);
    const reasignar = vi.spyOn(real, 'reasignarServicio');
    const desactivar = vi.spyOn(real, 'desactivarFusionado');
    const sinRed = new AppError({ codigo: 'RED_SIN_CONEXION', mensaje: 'sin red' });
    const remoto: ClientesRemotos = {
      ...real,
      listarClientes: async () => {
        throw sinRed;
      },
      buscarPorGuid: (g) => real.buscarPorGuid(g),
      buscarPorNormalizado: (n) => real.buscarPorNormalizado(n),
      crearCliente: (c) => real.crearCliente(c),
      desactivarFusionado: (o, d) => real.desactivarFusionado(o, d),
      listarServiciosDeCliente: (id) => real.listarServiciosDeCliente(id),
      reasignarServicio: (i, id) => real.reasignarServicio(i, id),
      registrarDetalleLog: (e) => real.registrarDetalleLog(e),
    };

    await expect(armar(remoto)({ origenId: 1, destinoId: 2, roles: ADMIN })).rejects.toBe(sinRed);

    expect(reasignar).not.toHaveBeenCalled();
    expect(desactivar).not.toHaveBeenCalled();
  });
});

describe('fusionarClientes · bitácora (FR-010-10)', () => {
  it('registra quién fusionó qué y cuántos servicios se reasignaron', async () => {
    const remoto = new MockRemoteGateway();
    await crearServicios(remoto, 1, 2);
    const registrar = vi.spyOn(remoto, 'registrarDetalleLog');

    await armar(remoto)({ origenId: 1, destinoId: 2, roles: ADMIN });

    expect(registrar).toHaveBeenCalledTimes(1);
    const entrada = registrar.mock.calls[0]![0];
    expect(entrada.tipo).toBe('Fusión de clientes');
    expect(entrada.detalle).toContain('Navar Asociados');
    expect(entrada.detalle).toContain('Distribuidora Andina');
    expect(entrada.detalle).toContain('2 servicios');
    expect(entrada.detalle).toContain('admin@empresa.com');
  });

  it('si la bitácora falla, la fusión igual termina bien', async () => {
    const remoto = new MockRemoteGateway();
    vi.spyOn(remoto, 'registrarDetalleLog').mockRejectedValue(new Error('log caído'));
    const logger = new FakeLogger();

    const resultado = await armar(remoto, { logger })({
      origenId: 1,
      destinoId: 2,
      roles: ADMIN,
    });

    expect(resultado.destinoId).toBe(2);
    expect(logger.advertencias.length).toBeGreaterThan(0);
  });
});
