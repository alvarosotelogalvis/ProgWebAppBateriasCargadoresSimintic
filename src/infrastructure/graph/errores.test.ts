import { describe, expect, it } from 'vitest';

import { clasificarEstado, traducirRespuesta } from './errores';

describe('traducirRespuesta', () => {
  it.each([
    [400, 'VALIDACION', false],
    [401, 'AUTH_REQUERIDA', false],
    [403, 'SP_SIN_PERMISO', false],
    [404, 'SP_NO_ENCONTRADO', false],
    [409, 'SP_CONFLICTO', false],
    [412, 'SP_CONFLICTO', false],
    [413, 'SP_LIMITE', false],
    [429, 'SP_LIMITE', true],
    [500, 'SP_SERVIDOR', true],
    [503, 'SP_SERVIDOR', true],
    [418, 'DESCONOCIDO', false],
  ] as const)('mapea %i a %s (reintentable=%s)', (status, codigo, reintentable) => {
    const error = traducirRespuesta(status, { error: { code: 'X', message: 'detalle' } });
    expect(error.codigo).toBe(codigo);
    expect(error.reintentable).toBe(reintentable);
    expect(error.estadoHttp).toBe(status);
  });

  it('no expone el cuerpo crudo completo', () => {
    const error = traducirRespuesta(500, { error: { code: 'general', message: 'x'.repeat(900) } });
    const resumen = error.detalles?.respuesta as { message: string };
    expect(resumen.message.length).toBeLessThanOrEqual(300);
  });

  it('clasifica 403 como no reintentable', () => {
    expect(clasificarEstado(403).codigo).toBe('SP_SIN_PERMISO');
  });
});
