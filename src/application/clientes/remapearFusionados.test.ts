import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CLAVES_CATALOGO } from '@/application/setup/claves';
import type { Servicio } from '@/domain/servicio';
import { CatalogoRepositoryDexie } from '@/infrastructure/db/catalogoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearRemapearFusionados } from './remapearFusionados';

let db: AppDB;
let catalogos: CatalogoRepositoryDexie;
let servicios: ServicioRepositoryDexie;
let remapear: ReturnType<typeof crearRemapearFusionados>;

const SP = { itemId: '55', eTag: '"1"', modificadoEn: '2026-11-01T00:00:00Z', webUrl: '' };

/** Servicio de un cliente, con el estado de sincronización que se indique. */
const delCliente = (id: string, clienteId: number, extra: Partial<Servicio> = {}): Servicio => ({
  ...servicioBuilder().conId(id).recibido().pendiente().construir(),
  clienteId,
  clienteNombre: `CLIENTE ${clienteId}`,
  camposSucios: [],
  ...extra,
});

beforeEach(async () => {
  db = await crearDbPrueba();
  catalogos = new CatalogoRepositoryDexie(db);
  servicios = new ServicioRepositoryDexie(db);
  await catalogos.guardar(CLAVES_CATALOGO.clientes, [
    { id: 2, nombre: 'ARIS MINING SEGOVIA', activo: true },
    { id: 3, nombre: 'CLIENTE C', activo: true },
  ]);
  await catalogos.guardar(CLAVES_CATALOGO.clientesFusionados, [{ origenId: 1, destinoId: 2 }]);
  remapear = crearRemapearFusionados({ catalogos, servicios, logger: new FakeLogger() });
});

afterEach(async () => {
  await db.delete();
});

describe('remapearFusionados (ES-010-08)', () => {
  it('pasa al cliente vigente un servicio pendiente que aún no está en SharePoint', async () => {
    await servicios.guardar(delCliente('s1', 1));

    const resultado = await remapear();

    expect(resultado.remapeados).toBe(1);
    expect(await servicios.obtener('s1')).toMatchObject({
      clienteId: 2,
      clienteNombre: 'ARIS MINING SEGOVIA',
      syncState: 'pending',
    });
  });

  it('sigue una cadena de fusiones hasta el vigente', async () => {
    await catalogos.guardar(CLAVES_CATALOGO.clientesFusionados, [
      { origenId: 1, destinoId: 2 },
      { origenId: 2, destinoId: 3 },
    ]);
    await servicios.guardar(delCliente('s1', 1));

    await remapear();

    expect(await servicios.obtener('s1')).toMatchObject({
      clienteId: 3,
      clienteNombre: 'CLIENTE C',
    });
  });

  it('un servicio que ya está en SharePoint con el cliente como cambio por enviar también se reasigna', async () => {
    await servicios.guardar(
      delCliente('s1', 1, { sp: SP, camposSucios: ['clienteId', 'marca'], marca: 'EDITADA' })
    );

    await remapear();

    const s = await servicios.obtener('s1');
    expect(s).toMatchObject({ clienteId: 2, marca: 'EDITADA' });
    expect(s?.camposSucios.sort()).toEqual(['clienteId', 'marca']);
  });

  it('no toca un servicio sincronizado: el pull lo actualiza con lo que dejó la fusión', async () => {
    const sincronizado = delCliente('s1', 1, { sp: SP, syncState: 'synced' });
    await servicios.guardar(sincronizado);

    const resultado = await remapear();

    expect(resultado.remapeados).toBe(0);
    expect(await servicios.obtener('s1')).toEqual(sincronizado);
  });

  it('un servicio con cambios pendientes en OTROS campos no se toca (el cliente lo trae el pull)', async () => {
    const conOtroCambio = delCliente('s1', 1, {
      sp: SP,
      camposSucios: ['marca'],
      marca: 'EDITADA',
    });
    await servicios.guardar(conOtroCambio);

    await remapear();

    expect(await servicios.obtener('s1')).toEqual(conOtroCambio);
  });

  it('no pierde ningún dato del servicio al reasignarlo (regla 1)', async () => {
    const original = delCliente('s1', 1, { marca: 'ROQUET', referencia: 'REF-1', serie: 'NV4520' });
    await servicios.guardar(original);

    await remapear();

    expect(await servicios.obtener('s1')).toEqual({
      ...original,
      clienteId: 2,
      clienteNombre: 'ARIS MINING SEGOVIA',
    });
  });

  it('no toca los servicios de clientes que no se fusionaron ni los de clientes temporales', async () => {
    const ajeno = delCliente('s2', 3);
    const temporal = delCliente('s3', -77);
    await servicios.guardar(ajeno);
    await servicios.guardar(temporal);

    const resultado = await remapear();

    expect(resultado.remapeados).toBe(0);
    expect(await servicios.obtener('s2')).toEqual(ajeno);
    expect(await servicios.obtener('s3')).toEqual(temporal);
  });

  it('sin fusiones no hace nada', async () => {
    await catalogos.guardar(CLAVES_CATALOGO.clientesFusionados, []);
    await servicios.guardar(delCliente('s1', 1));

    expect((await remapear()).remapeados).toBe(0);
  });

  it('si el vigente no está en el catálogo cambia el id y conserva el nombre que había', async () => {
    await catalogos.guardar(CLAVES_CATALOGO.clientes, []);
    await servicios.guardar(delCliente('s1', 1));

    await remapear();

    expect(await servicios.obtener('s1')).toMatchObject({
      clienteId: 2,
      clienteNombre: 'CLIENTE 1',
    });
  });

  it('es idempotente: una segunda pasada no vuelve a cambiar nada', async () => {
    await servicios.guardar(delCliente('s1', 1));
    await remapear();

    expect((await remapear()).remapeados).toBe(0);
  });
});
