import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useUiStore } from '@/shared/stores/uiStore';

import { useBloqueoActualizacion } from './useBloqueoActualizacion';

const bloqueos = (): number => useUiStore.getState().bloqueosActualizacion.size;

beforeEach(() => {
  useUiStore.setState({ bloqueosActualizacion: new Set<string>() });
});

describe('useBloqueoActualizacion (FR-001-11)', () => {
  it('inactivo no bloquea', () => {
    renderHook(() => useBloqueoActualizacion(false));

    expect(bloqueos()).toBe(0);
  });

  it('activo bloquea y al dejar de estarlo libera', () => {
    const { rerender } = renderHook(({ activo }) => useBloqueoActualizacion(activo), {
      initialProps: { activo: true },
    });
    expect(bloqueos()).toBe(1);

    rerender({ activo: false });

    expect(bloqueos()).toBe(0);
  });

  it('al desmontarse libera el bloqueo', () => {
    const { unmount } = renderHook(() => useBloqueoActualizacion(true));
    expect(bloqueos()).toBe(1);

    unmount();

    expect(bloqueos()).toBe(0);
  });

  it('dos usos a la vez suman bloqueos y se liberan por separado', () => {
    const a = renderHook(() => useBloqueoActualizacion(true));
    const b = renderHook(() => useBloqueoActualizacion(true));
    expect(bloqueos()).toBe(2);

    act(() => a.unmount());

    expect(bloqueos()).toBe(1);
    b.unmount();
    expect(bloqueos()).toBe(0);
  });
});
