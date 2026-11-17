// @vitest-environment node
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { aCamposSP } from '@/infrastructure/graph/mappers/servicioMapper';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
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

const ID = '00000000-0000-4000-8000-0000000000c1';

/** Servicio remoto que apunta a un cliente concreto. */
const remotoConCliente = (clienteId: number) => ({
  ...aCamposSP({
    ...servicioBuilder().conId(ID).recibido().construir(),
    clienteId,
    clienteNombre: '',
    numeroSolicitud: 5,
  }),
});

describe('pullServicios · nombre del cliente (spec 010)', () => {
  it('un servicio de un cliente activo trae el nombre del catálogo', async () => {
    const e = await crear();
    await e.catalogos.guardar(CLAVES_CATALOGO.clientes, [
      { id: 2, nombre: 'ARIS MINING SEGOVIA', activo: true },
    ]);
    e.emulador.sembrarServicio(remotoConCliente(2));

    await e.pull({ signal: new AbortController().signal });

    expect((await e.servicios.obtener(ID))?.clienteNombre).toBe('ARIS MINING SEGOVIA');
  });

  it('un servicio que aún apunta a un cliente fusionado muestra el nombre del cliente vigente', async () => {
    const e = await crear();
    await e.catalogos.guardar(CLAVES_CATALOGO.clientes, [
      { id: 2, nombre: 'ARIS MINING SEGOVIA', activo: true },
    ]);
    await e.catalogos.guardar(CLAVES_CATALOGO.clientesFusionados, [{ origenId: 9, destinoId: 2 }]);
    e.emulador.sembrarServicio(remotoConCliente(9));

    await e.pull({ signal: new AbortController().signal });

    expect((await e.servicios.obtener(ID))?.clienteNombre).toBe('ARIS MINING SEGOVIA');
  });

  it('sigue una cadena de fusiones A → B → C hasta el nombre del vigente', async () => {
    const e = await crear();
    await e.catalogos.guardar(CLAVES_CATALOGO.clientes, [
      { id: 3, nombre: 'CLIENTE C', activo: true },
    ]);
    await e.catalogos.guardar(CLAVES_CATALOGO.clientesFusionados, [
      { origenId: 1, destinoId: 2 },
      { origenId: 2, destinoId: 3 },
    ]);
    e.emulador.sembrarServicio(remotoConCliente(1));

    await e.pull({ signal: new AbortController().signal });

    expect((await e.servicios.obtener(ID))?.clienteNombre).toBe('CLIENTE C');
  });
});
