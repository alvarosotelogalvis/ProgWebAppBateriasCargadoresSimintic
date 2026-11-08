import { describe, it, expect } from 'vitest';
import { sugerirVidaUtil } from './vidaUtil';

describe('T007: sugerirVidaUtil', () => {
  it('debe sugerir entrega + 12 meses', () => {
    expect(sugerirVidaUtil('2026-11-07', 12)).toBe('2027-11-07');
  });

  it('debe manejar fin de mes en febrero (no bisiesto)', () => {
    expect(sugerirVidaUtil('2026-01-31', 1)).toBe('2026-02-28');
  });

  it('debe manejar fin de mes en febrero (año bisiesto)', () => {
    expect(sugerirVidaUtil('2024-01-31', 1)).toBe('2024-02-29');
  });

  it('debe sumar múltiples años', () => {
    expect(sugerirVidaUtil('2026-01-15', 36)).toBe('2029-01-15');
  });

  it('debe pasar el año correctamente', () => {
    expect(sugerirVidaUtil('2026-11-07', 24)).toBe('2028-11-07');
  });
});
