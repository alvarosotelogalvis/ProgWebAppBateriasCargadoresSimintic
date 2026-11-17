import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Catalogos } from '@/application/ports/remoteGateway';
import { CatalogoRepositoryDexie } from '@/infrastructure/db/catalogoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';

import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { CLAVES_CATALOGO } from './claves';
import { refrescarCatalogosRemotos } from './refrescarCatalogosSync';

let db: AppDB;
let catalogos: CatalogoRepositoryDexie;

const choices = {
  Diagnostico: [],
  Estado: [],
  CotizacionEstado: [],
  TipoEquipo: [],
  TipoAdjunto: [],
} as Catalogos['choices'];

const remoto = (parcial: Partial<Catalogos> = {}): Catalogos => ({
  clientes: [{ id: 1, nombre: 'NAVAR ASOCIADOS', activo: true }],
  marcas: ['ROQUET'],
  choices,
  ...parcial,
});

beforeEach(async () => {
  db = await crearDbPrueba();
  catalogos = new CatalogoRepositoryDexie(db);
});

afterEach(async () => {
  await db.delete();
});

describe('refrescarCatalogosRemotos · clientes (ES-010-05, regla 1)', () => {
  it('conserva los clientes nuevos pendientes: el refresco no los toca', async () => {
    const pendientes = [
      {
        id: -7,
        guid: 'g-1',
        nombre: 'MINERA NUEVA',
        normalizado: 'MINERA NUEVA',
        creadoEn: '2026-11-16T10:00:00.000Z',
      },
    ];
    await catalogos.guardar(CLAVES_CATALOGO.clientesNuevos, pendientes);

    await refrescarCatalogosRemotos({
      gateway: { leerCatalogos: async () => remoto() },
      catalogos,
      logger: new FakeLogger(),
    });

    expect(await catalogos.obtener(CLAVES_CATALOGO.clientesNuevos)).toEqual(pendientes);
    expect(await catalogos.obtener(CLAVES_CATALOGO.clientes)).toEqual([
      { id: 1, nombre: 'NAVAR ASOCIADOS', activo: true },
    ]);
  });

  it('guarda los clientes fusionados que informa SharePoint', async () => {
    await refrescarCatalogosRemotos({
      gateway: {
        leerCatalogos: async () => remoto({ fusionados: [{ origenId: 5, destinoId: 1 }] }),
      },
      catalogos,
      logger: new FakeLogger(),
    });

    expect(await catalogos.obtener(CLAVES_CATALOGO.clientesFusionados)).toEqual([
      { origenId: 5, destinoId: 1 },
    ]);
  });

  it('si SharePoint no informa fusiones, la lista queda vacía', async () => {
    await catalogos.guardar(CLAVES_CATALOGO.clientesFusionados, [{ origenId: 9, destinoId: 1 }]);

    await refrescarCatalogosRemotos({
      gateway: { leerCatalogos: async () => remoto() },
      catalogos,
      logger: new FakeLogger(),
    });

    expect(await catalogos.obtener(CLAVES_CATALOGO.clientesFusionados)).toEqual([]);
  });

  it('si la lectura falla no cambia nada (ni clientes ni pendientes)', async () => {
    await catalogos.guardar(CLAVES_CATALOGO.clientes, [{ id: 2, nombre: 'X', activo: true }]);
    await catalogos.guardar(CLAVES_CATALOGO.clientesNuevos, [{ id: -1 }]);

    const ok = await refrescarCatalogosRemotos({
      gateway: {
        leerCatalogos: async () => {
          throw new Error('sin red');
        },
      },
      catalogos,
      logger: new FakeLogger(),
    });

    expect(ok).toBe(false);
    expect(await catalogos.obtener(CLAVES_CATALOGO.clientes)).toEqual([
      { id: 2, nombre: 'X', activo: true },
    ]);
    expect(await catalogos.obtener(CLAVES_CATALOGO.clientesNuevos)).toEqual([{ id: -1 }]);
  });
});
