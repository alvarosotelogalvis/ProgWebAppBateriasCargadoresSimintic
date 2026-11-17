import { describe, expect, it } from 'vitest';

import { generarCodigo } from './codigo';

describe('generarCodigo', () => {
  it('genera BAT para baterías y CAR para cargadores', () => {
    expect(generarCodigo({ tipoEquipo: 'BATERIA', numeroSolicitud: 1, serie: 'NV4520' })).toBe(
      'BAT-1-NV4520'
    );
    expect(generarCodigo({ tipoEquipo: 'CARGADOR', numeroSolicitud: 12, serie: 'ABC-9' })).toBe(
      'CAR-12-ABC-9'
    );
  });

  it('usa PEND mientras el número de solicitud no se ha asignado (0)', () => {
    expect(generarCodigo({ tipoEquipo: 'BATERIA', numeroSolicitud: 0, serie: 'NV4520' })).toBe(
      'BAT-PEND-NV4520'
    );
    expect(generarCodigo({ tipoEquipo: 'CARGADOR', numeroSolicitud: 0, serie: ' nv 4520 ' })).toBe(
      'CAR-PEND-NV4520'
    );
  });

  it('normaliza espacios y mayúsculas de la serie', () => {
    expect(generarCodigo({ tipoEquipo: 'CARGADOR', numeroSolicitud: 3, serie: ' nv 4520 ' })).toBe(
      'CAR-3-NV4520'
    );
  });
});
