import { describe, expect, it } from 'vitest';

import { SECCIONES_CORREGIBLES } from './camposCorregibles';

describe('SECCIONES_CORREGIBLES · número de solicitud (ES-011-08)', () => {
  it('no ofrece corregir el número de solicitud: lo asigna el sistema', () => {
    const campos = SECCIONES_CORREGIBLES.flatMap((seccion) => seccion.campos.map((c) => c.campo));

    expect(campos).not.toContain('numeroSolicitud');
    expect(campos).toContain('serie');
  });
});
