import { describe, expect, it } from 'vitest';

import {
  esPendiente,
  MAX_INTENTOS_NUMERO,
  NUMERO_PENDIENTE,
  siguienteNumero,
} from './numeroSolicitud';

describe('siguienteNumero (ES-011-02, ES-011-03)', () => {
  it('empieza en 1 si no hay ningún número', () => {
    expect(siguienteNumero(null)).toBe(1);
    expect(siguienteNumero(undefined)).toBe(1);
    expect(siguienteNumero(0)).toBe(1);
  });

  it('da el siguiente al mayor existente', () => {
    expect(siguienteNumero(41)).toBe(42);
    expect(siguienteNumero(1)).toBe(2);
  });

  it('ignora valores no válidos y negativos', () => {
    expect(siguienteNumero(-5)).toBe(1);
    expect(siguienteNumero(Number.NaN)).toBe(1);
  });
});

describe('esPendiente', () => {
  it('el 0 (y cualquier valor no positivo) significa pendiente', () => {
    expect(NUMERO_PENDIENTE).toBe(0);
    expect(esPendiente(0)).toBe(true);
    expect(esPendiente(-1)).toBe(true);
    expect(esPendiente(1)).toBe(false);
    expect(esPendiente(42)).toBe(false);
  });
});

describe('MAX_INTENTOS_NUMERO', () => {
  it('es un límite finito y pequeño', () => {
    expect(MAX_INTENTOS_NUMERO).toBe(5);
  });
});
