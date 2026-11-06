import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { useUiStore } from '@/shared/stores/uiStore';
import type { AppDB } from './dexie';
import { calcularColaSync, usePendientes } from './hooks';

let db: AppDB;

beforeEach(async () => {
  db = await crearDbPrueba();
  useUiStore.getState().setPendientes(0);
});

afterEach(async () => {
  await db.delete();
  useUiStore.getState().setPendientes(0);
});

describe('usePendientes', () => {
  it('cuenta servicios pendientes, excluye borradores y actualiza el store de UI', async () => {
    const { result } = renderHook(() => usePendientes(db));
    expect(result.current).toBe(0);

    const pendiente = {
      ...servicioBuilder().recibido().construir(),
      syncState: 'pending' as const,
    };
    await act(async () => {
      await db.servicios.put(pendiente);
    });

    await waitFor(() => expect(result.current).toBe(1));
    expect(useUiStore.getState().pendientes).toBe(1);

    const borrador = {
      ...servicioBuilder().borrador().construir(),
      id: 'borrador-pendiente',
      syncState: 'pending' as const,
    };
    await act(async () => {
      await db.servicios.put(borrador);
    });

    await waitFor(() => expect(result.current).toBe(1));

    await act(async () => {
      await db.servicios.put({ ...pendiente, syncState: 'synced' });
    });

    await waitFor(() => expect(result.current).toBe(0));
    expect(useUiStore.getState().pendientes).toBe(0);
  });
});

describe('calcularColaSync', () => {
  it('agrupa por estado de sync, excluye borradores y cuenta los sincronizados', async () => {
    const guardar = (id: string, syncState: 'pending' | 'error' | 'conflict' | 'synced') =>
      db.servicios.put({
        ...servicioBuilder().conId(id).recibido().construir(),
        syncState,
      });
    await guardar('p', 'pending');
    await guardar('e', 'error');
    await guardar('c', 'conflict');
    await guardar('s', 'synced');
    await db.servicios.put({
      ...servicioBuilder().conId('b').borrador().construir(),
      syncState: 'pending',
    });

    const cola = await calcularColaSync(db);

    expect(cola.total).toBe(4);
    expect(cola.sincronizados).toBe(1);
    expect(cola.enCola.map((i) => i.id)).toEqual(['p']);
    expect(cola.conError.map((i) => i.id)).toEqual(['e']);
    expect(cola.conflictos.map((i) => i.id)).toEqual(['c']);
  });
});
