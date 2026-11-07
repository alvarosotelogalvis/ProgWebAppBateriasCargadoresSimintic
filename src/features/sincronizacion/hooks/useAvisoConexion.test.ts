import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { INTERVALO_AVISO_CONEXION_MS } from '@/application/sync/avisosSync';

import { useAvisoConexion } from './useAvisoConexion';

function volverConexion() {
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

describe('useAvisoConexion (ES-005-21)', () => {
  it('ofrece sincronizar al volver la conexión con pendientes y sesión vigente', async () => {
    const { result } = renderHook(() =>
      useAvisoConexion({ pendientes: () => 3, sesionVigente: async () => true })
    );
    expect(result.current.pendientes).toBeNull();

    volverConexion();

    await waitFor(() => expect(result.current.pendientes).toBe(3));

    act(() => result.current.descartar());
    expect(result.current.pendientes).toBeNull();
  });

  it('no avisa sin sesión vigente ni sin pendientes', async () => {
    const sesionVigente = vi.fn(async () => false);
    const { result } = renderHook(() => useAvisoConexion({ pendientes: () => 3, sesionVigente }));
    volverConexion();
    await waitFor(() => expect(sesionVigente).toHaveBeenCalled());
    expect(result.current.pendientes).toBeNull();

    const sinPendientes = renderHook(() =>
      useAvisoConexion({ pendientes: () => 0, sesionVigente: async () => true })
    );
    volverConexion();
    await Promise.resolve();
    expect(sinPendientes.result.current.pendientes).toBeNull();
  });

  it('avisa como máximo una vez cada 30 minutos', async () => {
    let ahora = 1_000_000;
    const { result } = renderHook(() =>
      useAvisoConexion({
        pendientes: () => 2,
        sesionVigente: async () => true,
        ahoraMs: () => ahora,
      })
    );

    volverConexion();
    await waitFor(() => expect(result.current.pendientes).toBe(2));
    act(() => result.current.descartar());

    ahora += INTERVALO_AVISO_CONEXION_MS - 1;
    volverConexion();
    await Promise.resolve();
    await Promise.resolve();
    expect(result.current.pendientes).toBeNull();

    ahora += 1;
    volverConexion();
    await waitFor(() => expect(result.current.pendientes).toBe(2));
  });
});
