import { describe, expect, it } from 'vitest';

import { compararSemver, esVersionMinimaSuficiente } from './version';

describe('compararSemver', () => {
  it('compara numéricamente cada segmento', () => {
    expect(compararSemver('1.2.3', '1.2.3')).toBe(0);
    expect(compararSemver('1.2.3', '1.2.10')).toBe(-1);
    expect(compararSemver('2.0.0', '1.9.9')).toBe(1);
    expect(compararSemver('1.10.0', '1.9.0')).toBe(1);
  });

  it('considera iguales las versiones con segmentos faltantes', () => {
    expect(compararSemver('1.2', '1.2.0')).toBe(0);
    expect(compararSemver('1', '1.0.0')).toBe(0);
  });

  it('trata segmentos no numéricos como 0', () => {
    expect(compararSemver('1.x.3', '1.0.3')).toBe(0);
  });
});

describe('esVersionMinimaSuficiente', () => {
  it('exige que la versión actual sea mayor o igual a la mínima', () => {
    expect(esVersionMinimaSuficiente('1.4.0', '1.3.0')).toBe(true);
    expect(esVersionMinimaSuficiente('1.3.0', '1.3.0')).toBe(true);
    expect(esVersionMinimaSuficiente('1.2.9', '1.3.0')).toBe(false);
  });
});
