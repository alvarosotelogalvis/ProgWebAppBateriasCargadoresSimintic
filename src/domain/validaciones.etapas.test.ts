import { describe, expect, it } from 'vitest';

import {
  esquemaAnulacion,
  esquemaCotizacion,
  esquemaDiagnostico,
  esquemaDisposicionFinal,
  esquemaEntrega,
  esquemaFacturacion,
  esquemaOrdenTrabajo,
} from './validaciones';

const HOY = '2026-10-21';
const RECEPCION = '2026-10-01';

const ok = (esquema: { safeParse: (v: unknown) => { success: boolean } }, datos: unknown) =>
  esquema.safeParse(datos).success;

describe('esquemas de validación por etapa (T006)', () => {
  describe('diagnóstico', () => {
    const base = { diagnostico: 'Reparable', observacionTecnica: 'Celdas con desbalance leve' };

    it('exige diagnóstico y observación de al menos 5 caracteres', () => {
      expect(ok(esquemaDiagnostico(), base)).toBe(true);
      expect(ok(esquemaDiagnostico(), { ...base, observacionTecnica: 'Corto' })).toBe(true);
      expect(ok(esquemaDiagnostico(), { ...base, observacionTecnica: 'Cort' })).toBe(false);
      expect(ok(esquemaDiagnostico(), { ...base, diagnostico: '   ' })).toBe(false);
      expect(ok(esquemaDiagnostico(), { observacionTecnica: base.observacionTecnica })).toBe(false);
    });

    it('limita la observación a 4000 caracteres', () => {
      expect(ok(esquemaDiagnostico(), { ...base, observacionTecnica: 'x'.repeat(4000) })).toBe(
        true
      );
      expect(ok(esquemaDiagnostico(), { ...base, observacionTecnica: 'x'.repeat(4001) })).toBe(
        false
      );
    });
  });

  describe('disposición final', () => {
    const base = {
      diagnostico: 'D. FINAL',
      observacionTecnica: 'Celdas irrecuperables',
      fechaSocializacionDF: '2026-10-10',
    };
    const esquema = () => esquemaDisposicionFinal(HOY, RECEPCION);

    it('la fecha de socialización debe estar entre la recepción y hoy', () => {
      expect(ok(esquema(), base)).toBe(true);
      expect(ok(esquema(), { ...base, fechaSocializacionDF: RECEPCION })).toBe(true);
      expect(ok(esquema(), { ...base, fechaSocializacionDF: HOY })).toBe(true);
      expect(ok(esquema(), { ...base, fechaSocializacionDF: '2026-09-30' })).toBe(false);
      expect(ok(esquema(), { ...base, fechaSocializacionDF: '2026-10-22' })).toBe(false);
    });

    it('la fecha es obligatoria y con formato yyyy-MM-dd', () => {
      expect(ok(esquema(), { ...base, fechaSocializacionDF: undefined })).toBe(false);
      expect(ok(esquema(), { ...base, fechaSocializacionDF: '10/10/2026' })).toBe(false);
    });
  });

  describe('cotización', () => {
    const base = { cotizacionFechaEnvio: '2026-10-10' };
    const esquema = () => esquemaCotizacion(HOY, RECEPCION);

    it('la fecha de envío es obligatoria y va entre la recepción y hoy', () => {
      expect(ok(esquema(), base)).toBe(true);
      expect(ok(esquema(), {})).toBe(false);
      expect(ok(esquema(), { cotizacionFechaEnvio: '2026-09-30' })).toBe(false);
      expect(ok(esquema(), { cotizacionFechaEnvio: '2026-10-22' })).toBe(false);
    });

    it('el valor es opcional pero no puede ser negativo ni no numérico', () => {
      expect(ok(esquema(), { ...base, cotizacionValor: 0 })).toBe(true);
      expect(ok(esquema(), { ...base, cotizacionValor: 1_500_000 })).toBe(true);
      expect(ok(esquema(), { ...base, cotizacionValor: -1 })).toBe(false);
      expect(ok(esquema(), { ...base, cotizacionValor: 'mucho' })).toBe(false);
    });

    it('la respuesta, si viene, debe ser Pendiente, Aprobada o Rechazada', () => {
      for (const estado of ['PENDIENTE', 'APROBADA', 'RECHAZADA']) {
        expect(ok(esquema(), { ...base, cotizacionEstado: estado })).toBe(true);
      }
      expect(ok(esquema(), { ...base, cotizacionEstado: 'TAL_VEZ' })).toBe(false);
    });
  });

  describe('orden de trabajo', () => {
    const base = { otDetalle: 'Cambio de celdas y prueba', otCostoReparacion: 350_000 };

    it('exige detalle de al menos 5 caracteres y costo no negativo', () => {
      expect(ok(esquemaOrdenTrabajo(), base)).toBe(true);
      expect(ok(esquemaOrdenTrabajo(), { ...base, otCostoReparacion: 0 })).toBe(true);
      expect(ok(esquemaOrdenTrabajo(), { ...base, otDetalle: 'abc' })).toBe(false);
      expect(ok(esquemaOrdenTrabajo(), { ...base, otCostoReparacion: -5 })).toBe(false);
      expect(ok(esquemaOrdenTrabajo(), { otDetalle: base.otDetalle })).toBe(false);
    });
  });

  describe('entrega', () => {
    const base = { fechaEntrega: '2026-10-15', proyeccionVidaUtil: '2027-10-15' };

    it('con reparación la vida útil es obligatoria', () => {
      expect(ok(esquemaEntrega(HOY, RECEPCION, true), base)).toBe(true);
      expect(ok(esquemaEntrega(HOY, RECEPCION, true), { fechaEntrega: base.fechaEntrega })).toBe(
        false
      );
    });

    it('sin reparación la vida útil es opcional', () => {
      expect(ok(esquemaEntrega(HOY, RECEPCION, false), { fechaEntrega: base.fechaEntrega })).toBe(
        true
      );
    });

    it('la vida útil debe ser posterior a la entrega', () => {
      const esquema = esquemaEntrega(HOY, RECEPCION, true);

      expect(ok(esquema, { ...base, proyeccionVidaUtil: '2026-10-15' })).toBe(false);
      expect(ok(esquema, { ...base, proyeccionVidaUtil: '2026-10-14' })).toBe(false);
      expect(ok(esquema, { ...base, proyeccionVidaUtil: '2026-10-16' })).toBe(true);
    });

    it('la fecha de entrega va entre la recepción y hoy', () => {
      const esquema = esquemaEntrega(HOY, RECEPCION, false);

      expect(ok(esquema, { fechaEntrega: '2026-09-30' })).toBe(false);
      expect(ok(esquema, { fechaEntrega: '2026-10-22' })).toBe(false);
      expect(ok(esquema, { fechaEntrega: HOY })).toBe(true);
    });
  });

  describe('facturación', () => {
    const base = { facturaFecha: '2026-10-16', facturaNumero: 'FE-2026-001234' };
    const esquema = () => esquemaFacturacion(HOY, RECEPCION);

    it('la fecha es obligatoria y va entre la recepción y hoy', () => {
      expect(ok(esquema(), base)).toBe(true);
      expect(ok(esquema(), { facturaNumero: base.facturaNumero })).toBe(false);
      expect(ok(esquema(), { ...base, facturaFecha: '2026-09-30' })).toBe(false);
      expect(ok(esquema(), { ...base, facturaFecha: '2026-10-22' })).toBe(false);
    });

    it('el número es opcional (vacío cuenta como ausente) y solo admite letras, números y guiones', () => {
      expect(ok(esquema(), { facturaFecha: base.facturaFecha })).toBe(true);
      expect(ok(esquema(), { ...base, facturaNumero: '' })).toBe(true);
      expect(ok(esquema(), { ...base, facturaNumero: 'FE 2026' })).toBe(false);
      expect(ok(esquema(), { ...base, facturaNumero: 'FE/2026' })).toBe(false);
      expect(ok(esquema(), { ...base, facturaNumero: 'A'.repeat(30) })).toBe(true);
      expect(ok(esquema(), { ...base, facturaNumero: 'A'.repeat(31) })).toBe(false);
    });
  });

  describe('anulación', () => {
    it('el motivo exige al menos 10 caracteres', () => {
      expect(ok(esquemaAnulacion(), { anulacionMotivo: 'Registro duplicado' })).toBe(true);
      expect(ok(esquemaAnulacion(), { anulacionMotivo: '123456789' })).toBe(false);
      expect(ok(esquemaAnulacion(), { anulacionMotivo: '          ' })).toBe(false);
      expect(ok(esquemaAnulacion(), {})).toBe(false);
    });
  });
});
