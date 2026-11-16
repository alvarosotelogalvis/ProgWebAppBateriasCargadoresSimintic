import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUiStore } from '@/shared/stores/uiStore';

import { useAutoguardado } from './useAutoguardado';

const bloqueos = (): number => useUiStore.getState().bloqueosActualizacion.size;

beforeEach(() => {
  vi.useFakeTimers();
  useUiStore.setState({ bloqueosActualizacion: new Set<string>() });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutoguardado y la actualización de la app (ES-001-19)', () => {
  it('con cambios por guardar bloquea la actualización y la libera al guardar', async () => {
    const guardar = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoguardado<string>(guardar));
    expect(bloqueos()).toBe(0);

    act(() => result.current.programar('cambio'));
    expect(result.current.estado).toBe('guardando');
    expect(bloqueos()).toBe(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(guardar).toHaveBeenCalledWith('cambio');
    expect(result.current.estado).toBe('guardado');
    expect(bloqueos()).toBe(0);
  });

  it('si el guardado falla ya no bloquea (el error se muestra al usuario)', async () => {
    const guardar = vi.fn().mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useAutoguardado<string>(guardar));

    act(() => result.current.programar('cambio'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(result.current.estado).toBe('error');
    expect(bloqueos()).toBe(0);
  });

  it('al salir de la pantalla con cambios pendientes se libera el bloqueo', () => {
    const { result, unmount } = renderHook(() => useAutoguardado<string>(vi.fn()));
    act(() => result.current.programar('cambio'));
    expect(bloqueos()).toBe(1);

    unmount();

    expect(bloqueos()).toBe(0);
  });
});
