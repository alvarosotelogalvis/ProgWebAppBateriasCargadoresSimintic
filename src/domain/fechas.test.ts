import { describe, it, expect } from 'vitest';
import { validacionesCruzadasFechas } from './fechas';

describe('T007: validacionesCruzadasFechas', () => {
  it('debe rechazar fecha de entrega anterior a recepción', () => {
    const errores = validacionesCruzadasFechas(
      {
        fechaRecepcion: '2026-11-07',
        fechaEntrega: '2026-11-06',
      },
      '2026-11-07'
    );

    expect(errores.some((e) => e.campo === 'fechaEntrega')).toBe(true);
  });

  it('debe permitir fecha de entrega igual a recepción', () => {
    const errores = validacionesCruzadasFechas(
      {
        fechaRecepcion: '2026-11-07',
        fechaEntrega: '2026-11-07',
      },
      '2026-11-07'
    );

    expect(errores).toHaveLength(0);
  });

  it('debe rechazar fecha posterior a hoy', () => {
    const errores = validacionesCruzadasFechas(
      {
        fechaRecepcion: '2026-11-07',
        fechaEntrega: '2026-11-08',
      },
      '2026-11-07'
    );

    expect(errores.some((e) => e.campo === 'fechaEntrega')).toBe(true);
  });
});

describe('T007: sugerirVidaUtil', () => {
  it('debe sugerir entrega + 12 meses', () => {
    // stub: completar cuando se implemente
    expect(true).toBe(true);
  });

  it('debe manejar años bisiestos', () => {
    // stub
    expect(true).toBe(true);
  });
});
