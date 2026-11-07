import { describe, it, expect } from 'vitest';
import { servicioBuilder } from '../../tests/builders';
import { esquemaDiagnostico, esquemaDisposicionFinal, esquemaCotizacion } from './validaciones';

describe('T006: Esquemas por etapa', () => {
  it('esquemaDiagnostico: requiere diagnóstico y observación ≥5 caracteres', () => {
    const valido = servicioBuilder()
      .diagnostico('Reparable')
      .observacionTecnica('El equipo tiene fallas')
      .build();

    const invalido = servicioBuilder().diagnostico(undefined).observacionTecnica('Corto').build();

    expect(() => esquemaDiagnostico.parse(valido)).not.toThrow();
    expect(() => esquemaDiagnostico.parse(invalido)).toThrow();
  });

  it('esquemaDisposicionFinal: requiere fecha y PDF', () => {
    const valido = servicioBuilder()
      .diagnostico('D. FINAL')
      .fechaSocializacionDF('2026-11-07')
      .build();

    expect(() => esquemaDisposicionFinal.parse(valido)).not.toThrow();
  });

  it('esquemaCotizacion: requiere fecha de envío', () => {
    const valido = servicioBuilder().cotizacionFechaEnvio('2026-11-07').build();

    const invalido = servicioBuilder().cotizacionFechaEnvio(undefined).build();

    expect(() => esquemaCotizacion.parse(valido)).not.toThrow();
    expect(() => esquemaCotizacion.parse(invalido)).toThrow();
  });
});
