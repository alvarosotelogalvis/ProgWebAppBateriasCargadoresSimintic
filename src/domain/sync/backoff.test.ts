import { describe, expect, it } from 'vitest';

import {
  MAX_INTENTOS_AUTOMATICOS,
  proximoIntento,
  puedeReintentarAutomaticamente,
  retrasoEnEjecucion,
} from './backoff';

describe('retrasoEnEjecucion', () => {
  it('crece exponencialmente desde 1 s con jitter inyectado', () => {
    expect(retrasoEnEjecucion(0, () => 0)).toBe(1_000);
    expect(retrasoEnEjecucion(1, () => 0)).toBe(2_000);
    expect(retrasoEnEjecucion(2, () => 0)).toBe(4_000);
    expect(retrasoEnEjecucion(3, () => 0)).toBe(8_000);
  });

  it('agrega hasta 500 ms de jitter', () => {
    expect(retrasoEnEjecucion(0, () => 0.5)).toBe(1_250);
    expect(retrasoEnEjecucion(0, () => 0.999)).toBe(1_499);
    expect(retrasoEnEjecucion(0, () => 1)).toBe(1_500);
  });

  it('limita el jitter al rango 0–500 ms aunque el generador devuelva valores extremos', () => {
    expect(retrasoEnEjecucion(0, () => -1)).toBe(1_000);
    expect(retrasoEnEjecucion(0, () => 2)).toBe(1_500);
  });

  it('nunca supera los 30 s de espera base', () => {
    expect(retrasoEnEjecucion(5, () => 0)).toBe(30_000);
    expect(retrasoEnEjecucion(10, () => 0)).toBe(30_000);
  });

  it('trata intentos negativos como el primer reintento', () => {
    expect(retrasoEnEjecucion(-3, () => 0)).toBe(1_000);
  });
});

describe('proximoIntento', () => {
  const ahora = new Date('2026-10-31T12:00:00.000Z');
  const minutos = (fecha: Date): number => (fecha.getTime() - ahora.getTime()) / 60_000;

  it('espera 1 min × 2^intentos', () => {
    expect(minutos(proximoIntento(0, ahora))).toBe(1);
    expect(minutos(proximoIntento(1, ahora))).toBe(2);
    expect(minutos(proximoIntento(3, ahora))).toBe(8);
  });

  it('se limita a 1 hora', () => {
    expect(minutos(proximoIntento(6, ahora))).toBe(60);
    expect(minutos(proximoIntento(8, ahora))).toBe(60);
    expect(minutos(proximoIntento(100, ahora))).toBe(60);
  });
});

describe('MAX_INTENTOS_AUTOMATICOS', () => {
  it('deja de reintentar solo al llegar a 8 intentos', () => {
    expect(MAX_INTENTOS_AUTOMATICOS).toBe(8);
    expect(puedeReintentarAutomaticamente(0)).toBe(true);
    expect(puedeReintentarAutomaticamente(7)).toBe(true);
    expect(puedeReintentarAutomaticamente(8)).toBe(false);
  });
});
