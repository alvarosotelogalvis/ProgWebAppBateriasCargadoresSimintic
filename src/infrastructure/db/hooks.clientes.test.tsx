import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CLAVES_CATALOGO } from '@/application/setup/claves';

import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import type { AppDB } from './dexie';
import { useClientes } from './hooks';

let db: AppDB;

const guardar = (clave: string, valor: unknown) =>
  db.catalogos.put({ clave, valor, actualizadoEn: '2026-11-16T10:00:00.000Z' });

beforeEach(async () => {
  db = await crearDbPrueba();
});

afterEach(async () => {
  await db.delete();
});

describe('useClientes (ES-010-05)', () => {
  it('une los clientes de SharePoint con los creados sin red, ordenados por nombre', async () => {
    await guardar(CLAVES_CATALOGO.clientes, [
      { id: 2, nombre: 'ZETA MINERA', activo: true },
      { id: 1, nombre: 'ALFA MINERA', activo: true },
    ]);
    await guardar(CLAVES_CATALOGO.clientesNuevos, [
      {
        id: -4,
        guid: 'g-1',
        nombre: 'MEDIO NUEVO',
        normalizado: 'MEDIO NUEVO',
        creadoEn: '2026-11-16T10:00:00.000Z',
      },
    ]);

    const { result } = renderHook(() => useClientes(db));

    await waitFor(() => expect(result.current).toHaveLength(3));
    expect(result.current.map((c) => c.nombre)).toEqual([
      'ALFA MINERA',
      'MEDIO NUEVO',
      'ZETA MINERA',
    ]);
    expect(result.current.find((c) => c.id === -4)).toEqual({
      id: -4,
      nombre: 'MEDIO NUEVO',
      activo: true,
    });
  });

  it('con solo clientes pendientes (dispositivo sin catálogo) también los ofrece', async () => {
    await guardar(CLAVES_CATALOGO.clientesNuevos, [
      { id: -4, guid: 'g', nombre: 'SOLO LOCAL', normalizado: 'SOLO LOCAL', creadoEn: 'x' },
    ]);

    const { result } = renderHook(() => useClientes(db));

    await waitFor(() => expect(result.current.map((c) => c.nombre)).toEqual(['SOLO LOCAL']));
  });

  it('sin ningún cliente devuelve una lista vacía', async () => {
    const { result } = renderHook(() => useClientes(db));

    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('no repite un cliente que ya está en el catálogo con el mismo id', async () => {
    await guardar(CLAVES_CATALOGO.clientes, [{ id: 5, nombre: 'IGUAL', activo: true }]);
    await guardar(CLAVES_CATALOGO.clientesNuevos, [
      { id: 5, guid: 'g', nombre: 'IGUAL', normalizado: 'IGUAL', creadoEn: 'x' },
    ]);

    const { result } = renderHook(() => useClientes(db));

    await waitFor(() => expect(result.current).toHaveLength(1));
  });
});
