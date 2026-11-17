import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { esClienteTemporal } from '@/domain/cliente';
import { CatalogoRepositoryDexie } from '@/infrastructure/db/catalogoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';

import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { FakeClock } from '../../../tests/fakes/FakeClock';
import { FakeIdGenerator } from '../../../tests/fakes/FakeIdGenerator';
import { FakeLogger } from '../../../tests/fakes/FakeLogger';
import { crearAgregarCliente, NombreClienteInvalidoError } from './agregarCliente';
import { crearClientesLocales, type ClientesLocales } from './clientesLocales';

let db: AppDB;
let catalogos: CatalogoRepositoryDexie;
let clientesLocales: ClientesLocales;
let agregar: ReturnType<typeof crearAgregarCliente>;
const clock = new FakeClock();

beforeEach(async () => {
  db = await crearDbPrueba();
  catalogos = new CatalogoRepositoryDexie(db);
  clientesLocales = crearClientesLocales(catalogos);
  await catalogos.guardar(CLAVES_CATALOGO.clientes, [
    { id: 1, nombre: 'NAVAR ASOCIADOS', activo: true },
    { id: 2, nombre: 'ARIS MINING SEGOVIA', activo: true },
  ]);
  agregar = crearAgregarCliente({
    catalogos,
    clientesLocales,
    ids: new FakeIdGenerator(),
    clock,
    logger: new FakeLogger(),
  });
});

afterEach(async () => {
  await db.delete();
});

describe('agregarCliente · cliente nuevo (ES-010-01)', () => {
  it('crea un cliente permanente en el dispositivo, con id temporal, guid y nombre en mayúsculas', async () => {
    const resultado = await agregar('Minera Los Andes');

    expect(resultado).toMatchObject({ nombre: 'MINERA LOS ANDES', creado: true });
    expect(esClienteTemporal(resultado.id)).toBe(true);
    const [guardado] = await clientesLocales.listar();
    expect(guardado).toMatchObject({
      id: resultado.id,
      nombre: 'MINERA LOS ANDES',
      normalizado: 'MINERA LOS ANDES',
      guid: '00000000-0000-4000-8000-000000000001',
      creadoEn: clock.ahoraIso(),
    });
  });

  it('conserva las tildes en el nombre visible y las quita en la clave de comparación', async () => {
    await agregar('  minería   los ANDES ');

    const [guardado] = await clientesLocales.listar();
    expect(guardado).toMatchObject({
      nombre: 'MINERÍA LOS ANDES',
      normalizado: 'MINERIA LOS ANDES',
    });
  });

  it('no toca el catálogo remoto: sin red, el cliente vive en su propia clave', async () => {
    await agregar('Minera Los Andes');

    expect(await catalogos.obtener(CLAVES_CATALOGO.clientes)).toHaveLength(2);
  });

  it('dos clientes distintos reciben ids temporales distintos', async () => {
    const a = await agregar('Minera A');
    const b = await agregar('Minera B');

    expect(a.id).not.toBe(b.id);
    expect(await clientesLocales.listar()).toHaveLength(2);
  });
});

describe('agregarCliente · sugiere el existente en vez de duplicar (ES-010-02)', () => {
  it('detecta el mismo nombre aunque cambien tildes, mayúsculas o espacios', async () => {
    const resultado = await agregar('aris  mining segovía');

    expect(resultado).toEqual({ id: 2, nombre: 'ARIS MINING SEGOVIA', creado: false });
    expect(await clientesLocales.listar()).toEqual([]);
  });

  it('no duplica entre clientes pendientes del mismo dispositivo', async () => {
    const primero = await agregar('Minera X');
    const segundo = await agregar('  minera   x ');

    expect(segundo).toMatchObject({ id: primero.id, creado: false });
    expect(await clientesLocales.listar()).toHaveLength(1);
  });

  it('dos altas simultáneas del mismo nombre dejan un solo cliente', async () => {
    const [a, b] = await Promise.all([agregar('Minera Z'), agregar('minera z')]);

    expect(a.id).toBe(b.id);
    expect([a.creado, b.creado].sort()).toEqual([false, true]);
    expect(await clientesLocales.listar()).toHaveLength(1);
  });
});

describe('agregarCliente · nombre inválido', () => {
  it('rechaza un nombre vacío o de solo espacios', async () => {
    await expect(agregar('   ')).rejects.toBeInstanceOf(NombreClienteInvalidoError);
    await expect(agregar('')).rejects.toMatchObject({ motivo: 'VACIO' });
    expect(await clientesLocales.listar()).toEqual([]);
  });

  it('rechaza más de 100 caracteres', async () => {
    await expect(agregar('A'.repeat(101))).rejects.toMatchObject({ motivo: 'LARGO' });
    expect(await clientesLocales.listar()).toEqual([]);
  });
});

describe('clientesLocales', () => {
  it('agregar es idempotente por guid y quitar elimina por id', async () => {
    const cliente = {
      id: -5,
      guid: 'g-1',
      nombre: 'X',
      normalizado: 'X',
      creadoEn: clock.ahoraIso(),
    };
    await clientesLocales.agregar(cliente);
    await clientesLocales.agregar(cliente);

    expect(await clientesLocales.listar()).toEqual([cliente]);

    await clientesLocales.quitar(-5);

    expect(await clientesLocales.listar()).toEqual([]);
  });
});
