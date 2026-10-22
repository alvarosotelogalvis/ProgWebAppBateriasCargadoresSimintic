import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { crearDbPrueba } from '../../../tests/fakes/crearDbPrueba';
import { useUiStore } from '@/shared/stores/uiStore';
import type { AppDB } from './dexie';
import { usePendientes } from './hooks';

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
