import { describe, expect, it, vi } from 'vitest';

import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { renderHook } from '@testing-library/react';

interface EstadoMql {
  matches: boolean;
  listeners: Array<() => void>;
}

function simularMatchMedia(ancho: number) {
  const estados = new Map<string, EstadoMql>();

  const evalua = (consulta: string): boolean => {
    const minimo = /min-width:\s*(\d+)px/.exec(consulta);
    if (!minimo) return false;
    return ancho >= Number(minimo[1]);
  };

  const matchMedia = vi.fn((consulta: string) => {
    const existente = estados.get(consulta);
    if (existente) return existente as unknown as MediaQueryList;

    const estado: EstadoMql = { matches: evalua(consulta), listeners: [] };
    estados.set(consulta, estado);

    return {
      get matches() {
        return estado.matches;
      },
      media: consulta,
      addEventListener: (_: string, fn: () => void) => estado.listeners.push(fn),
      removeEventListener: (_: string, fn: () => void) => {
        estado.listeners = estado.listeners.filter((l) => l !== fn);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    } as unknown as MediaQueryList;
  });

  vi.stubGlobal('matchMedia', matchMedia);
  Object.defineProperty(window, 'innerWidth', { value: ancho, configurable: true, writable: true });
}

describe('useBreakpoint', () => {
  it('devuelve compacto con 599 px', () => {
    simularMatchMedia(599);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('compacto');
  });

  it('devuelve medio con 600 px', () => {
    simularMatchMedia(600);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('medio');
  });

  it('devuelve expandido con 1023 px', () => {
    simularMatchMedia(1023);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('expandido');
  });

  it('devuelve expandido con 1024 px', () => {
    simularMatchMedia(1024);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('expandido');
  });

  it('devuelve amplio con 1440 px', () => {
    simularMatchMedia(1440);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('amplio');
  });

  it('devuelve compacto con 1439 px', () => {
    simularMatchMedia(1439);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe('expandido');
  });
});
