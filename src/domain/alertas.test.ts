import { describe, expect, it } from 'vitest';

import { diasRestantes, nivelAlerta } from './alertas';

describe('diasRestantes', () => {
  it('calcula días completos entre hoy y la fecha objetivo', () => {
    expect(diasRestantes('2026-12-31', '2026-10-21')).toBe(71);
    expect(diasRestantes('2026-10-21', '2026-10-21')).toBe(0);
    expect(diasRestantes('2026-10-20', '2026-10-21')).toBe(-1);
  });

  it('devuelve NaN para fechas inválidas', () => {
    expect(Number.isNaN(diasRestantes('no-es-fecha', '2026-10-21'))).toBe(true);
  });
});

describe('nivelAlerta', () => {
  it('aplica los umbrales por defecto', () => {
    expect(nivelAlerta(120)).toBeNull();
    expect(nivelAlerta(91)).toBeNull();
    expect(nivelAlerta(90)).toBe('90');
    expect(nivelAlerta(89)).toBe('90');
    expect(nivelAlerta(60)).toBe('60');
    expect(nivelAlerta(30)).toBe('30');
    expect(nivelAlerta(0)).toBe('30');
  });

  it('marca como vencida una fecha pasada', () => {
    expect(nivelAlerta(-1)).toBe('VENCIDA');
  });

  it('admite umbrales personalizados desordenados', () => {
    expect(nivelAlerta(59, [30, 90, 60])).toBe('60');
    expect(nivelAlerta(100, [30, 90, 60])).toBeNull();
  });

  it('devuelve null para valores no finitos', () => {
    expect(nivelAlerta(Number.NaN)).toBeNull();
    expect(nivelAlerta(Number.POSITIVE_INFINITY)).toBeNull();
  });
});
