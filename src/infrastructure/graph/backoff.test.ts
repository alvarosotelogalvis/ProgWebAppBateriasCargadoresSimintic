import { describe, expect, it } from 'vitest';

import { calcularEspera, esperaDesdeRetryAfter } from './backoff';

describe('calcularEspera', () => {
  it('crece de forma exponencial con tope de 30 s', () => {
    const sinJitter = { jitterMs: () => 0 };
    expect(calcularEspera(1, undefined, sinJitter)).toBe(1000);
    expect(calcularEspera(2, undefined, sinJitter)).toBe(2000);
    expect(calcularEspera(3, undefined, sinJitter)).toBe(4000);
    expect(calcularEspera(10, undefined, sinJitter)).toBe(30_000);
  });

  it('agrega jitter de 0 a 500 ms', () => {
    expect(calcularEspera(1, undefined, { jitterMs: () => 250 })).toBe(1250);
    expect(calcularEspera(1, undefined, { jitterMs: () => 900 })).toBe(1500);
  });

  it('respeta Retry-After en segundos y en fecha', () => {
    expect(calcularEspera(1, '3')).toBe(3000);
    expect(esperaDesdeRetryAfter('3')).toBe(3000);

    const fecha = new Date(Date.now() + 5000).toUTCString();
    const espera = esperaDesdeRetryAfter(fecha);
    expect(espera).toBeGreaterThan(3000);
    expect(espera).toBeLessThanOrEqual(5000);
  });

  it('ignora un Retry-After invalido y usa el backoff', () => {
    expect(calcularEspera(2, 'no-es-fecha', { jitterMs: () => 0 })).toBe(2000);
  });
});
