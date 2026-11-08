import { describe, it, expect, beforeEach } from 'vitest';
import type { Servicio, Adjunto, ConfigApp } from './servicio';
import { servicioBuilder, adjuntoBuilder } from '../../tests/builders';
import { transicionesDisponibles } from './estados';

describe('Transiciones después de RECIBIDO', () => {
  let servicio: Servicio;
  let adjuntos: Adjunto[];
  let config: ConfigApp;

  beforeEach(() => {
    servicio = servicioBuilder().estado('RECIBIDO').build();
    adjuntos = [];
    config = {
      DiagnosticoValorDisposicionFinal: 'D. FINAL',
      MaxTamanoPdfMB: 20,
      MinFotosIngreso: 1,
      MaxFotosIngreso: 5,
      MinFotosSalida: 1,
      MaxFotosSalida: 5,
      ProyeccionVidaUtilMeses: 12,
    };
  });

  describe('RECIBIDO → DIAGNOSTICADO', () => {
    it('debe permitir completarDiagnostico con diagnóstico, observación y PDF', () => {
      servicio = servicioBuilder()
        .estado('RECIBIDO')
        .diagnostico('Reparable')
        .observacionTecnica('El equipo funciona pero falta batería')
        .build();

      adjuntos = [
        adjuntoBuilder()
          .tipoAdjunto('FORMATO_DIAGNOSTICO')
          .blob(new Blob(['pdf'], { type: 'application/pdf' }))
          .build(),
      ];

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'completarDiagnostico')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar sin diagnóstico', () => {
      servicio = servicioBuilder()
        .estado('RECIBIDO')
        .diagnostico(undefined)
        .observacionTecnica('Observación válida')
        .build();

      adjuntos = [adjuntoBuilder().tipoAdjunto('FORMATO_DIAGNOSTICO').build()];

      const transicion = transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config).find(
        (t) => t.accion === 'completarDiagnostico'
      );
      expect(transicion).toBeDefined();

      const errores = transicion?.requisitos(servicio, adjuntos, config) ?? [];
      expect(errores.some((e) => e.campo === 'diagnostico')).toBe(true);
    });

    it('debe rechazar sin observación técnica', () => {
      servicio = servicioBuilder()
        .estado('RECIBIDO')
        .diagnostico('Reparable')
        .observacionTecnica('')
        .build();

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'completarDiagnostico')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores.some((e) => e.campo === 'observacionTecnica')).toBe(true);
    });

    it('debe rechazar sin PDF de formato de diagnóstico', () => {
      servicio = servicioBuilder()
        .estado('RECIBIDO')
        .diagnostico('Reparable')
        .observacionTecnica('Observación válida')
        .build();

      adjuntos = [];

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'completarDiagnostico')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores.some((e) => e.codigo === 'FALTA_ADJUNTO_FORMATO_DIAGNOSTICO')).toBe(true);
    });

    it('debe rechazar si el usuario no es Técnico', () => {
      const transicion = transicionesDisponibles(servicio, ['Comercial'], adjuntos, config).find(
        (t) => t.accion === 'completarDiagnostico'
      );
      expect(transicion).toBeUndefined();
    });
  });

  describe('RECIBIDO → DISPOSICION_FINAL', () => {
    it('debe permitir registrarDisposicionFinal con diagnóstico DF, fecha y PDF', () => {
      servicio = servicioBuilder()
        .estado('RECIBIDO')
        .diagnostico('D. FINAL')
        .observacionTecnica('Equipo irrecuperable')
        .fechaSocializacionDF('2026-11-07')
        .build();

      adjuntos = [
        adjuntoBuilder().tipoAdjunto('FORMATO_DIAGNOSTICO').build(),
        adjuntoBuilder().tipoAdjunto('DISPOSICION_FINAL').build(),
      ];

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'registrarDisposicionFinal')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar si diagnóstico no es DF', () => {
      servicio = servicioBuilder().estado('RECIBIDO').diagnostico('Reparable').build();

      const transicion = transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config).find(
        (t) => t.accion === 'registrarDisposicionFinal'
      );
      expect(transicion).toBeUndefined();
    });
  });

  describe('DIAGNOSTICADO → COTIZADO', () => {
    beforeEach(() => {
      servicio = servicioBuilder().estado('DIAGNOSTICADO').build();
    });

    it('debe permitir registrarCotizacion con fecha de envío', () => {
      servicio.cotizacionFechaEnvio = '2026-11-07';

      const errores =
        transicionesDisponibles(servicio, ['Comercial'], adjuntos, config)
          .find((t) => t.accion === 'registrarCotizacion')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar sin fecha de envío', () => {
      servicio.cotizacionFechaEnvio = undefined;

      const errores =
        transicionesDisponibles(servicio, ['Comercial'], adjuntos, config)
          .find((t) => t.accion === 'registrarCotizacion')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores.some((e) => e.campo === 'cotizacionFechaEnvio')).toBe(true);
    });

    it('debe rechazar si el usuario no es Comercial', () => {
      servicio.cotizacionFechaEnvio = '2026-11-07';

      const transicion = transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config).find(
        (t) => t.accion === 'registrarCotizacion'
      );
      expect(transicion).toBeUndefined();
    });
  });

  describe('COTIZADO + respuesta Aprobada → EN_REPARACION', () => {
    beforeEach(() => {
      servicio = servicioBuilder().estado('COTIZADO').cotizacionEstado('Aprobada').build();
    });

    it('debe permitir generarOT con detalle y costo', () => {
      servicio.otDetalle = 'Cambio de batería y revisión general';
      servicio.otCostoReparacion = 150000;

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'generarOT')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar sin detalle', () => {
      servicio.otDetalle = '';
      servicio.otCostoReparacion = 150000;

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'generarOT')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores.some((e) => e.campo === 'otDetalle')).toBe(true);
    });

    it('debe rechazar si cotización está Pendiente', () => {
      servicio.cotizacionEstado = 'Pendiente';

      const transicion = transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config).find(
        (t) => t.accion === 'generarOT'
      );
      expect(transicion).toBeUndefined();
    });
  });

  describe('COTIZADO + respuesta Rechazada → ENTREGADO (sin OT)', () => {
    beforeEach(() => {
      servicio = servicioBuilder().estado('COTIZADO').cotizacionEstado('Rechazada').build();
    });

    it('debe permitir registrarEntregaSinReparacion sin OT', () => {
      servicio.fechaEntrega = '2026-11-07';

      adjuntos = [
        adjuntoBuilder()
          .tipoAdjunto('FOTO_SALIDA')
          .blob(new Blob(['image'], { type: 'image/jpeg' }))
          .build(),
      ];

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'registrarEntregaSinReparacion')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores).toHaveLength(0);
    });
  });

  describe('EN_REPARACION → ENTREGADO', () => {
    beforeEach(() => {
      servicio = servicioBuilder().estado('EN_REPARACION').build();
    });

    it('debe permitir registrarEntrega con fecha, fotos y vida útil', () => {
      servicio.fechaEntrega = '2026-11-07';
      servicio.proyeccionVidaUtil = '2027-11-07';

      adjuntos = [adjuntoBuilder().tipoAdjunto('FOTO_SALIDA').build()];

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'registrarEntrega')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar sin fotos de salida', () => {
      servicio.fechaEntrega = '2026-11-07';
      servicio.proyeccionVidaUtil = '2027-11-07';
      adjuntos = [];

      const errores =
        transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config)
          .find((t) => t.accion === 'registrarEntrega')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores.some((e) => e.codigo === 'FALTA_FOTOS_SALIDA')).toBe(true);
    });
  });

  describe('ENTREGADO → FACTURADO', () => {
    beforeEach(() => {
      servicio = servicioBuilder().estado('ENTREGADO').build();
    });

    it('debe permitir registrarFacturacion con PDF y fecha', () => {
      servicio.facturaFecha = '2026-11-07';

      adjuntos = [
        adjuntoBuilder()
          .tipoAdjunto('FACTURA')
          .blob(new Blob(['pdf'], { type: 'application/pdf' }))
          .build(),
      ];

      const errores =
        transicionesDisponibles(servicio, ['Comercial'], adjuntos, config)
          .find((t) => t.accion === 'registrarFacturacion')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar si el usuario no es Comercial', () => {
      servicio.facturaFecha = '2026-11-07';
      adjuntos = [adjuntoBuilder().tipoAdjunto('FACTURA').build()];

      const transicion = transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config).find(
        (t) => t.accion === 'registrarFacturacion'
      );
      expect(transicion).toBeUndefined();
    });
  });

  describe('Cualquier estado no final → ANULADO', () => {
    it('debe permitir anularServicio con motivo ≥ 10 caracteres solo si es Admin', () => {
      servicio = servicioBuilder().estado('DIAGNOSTICADO').build();
      servicio.anulacionMotivo = 'Error administrativo importante';

      const errores =
        transicionesDisponibles(servicio, ['Administrador'], adjuntos, config)
          .find((t) => t.accion === 'anular')
          ?.requisitos(servicio, adjuntos, config) ?? [];

      expect(errores).toHaveLength(0);
    });

    it('debe rechazar anulación sin permiso de Admin', () => {
      servicio = servicioBuilder().estado('DIAGNOSTICADO').build();

      const transicion = transicionesDisponibles(servicio, ['Tecnico'], adjuntos, config).find(
        (t) => t.accion === 'anular'
      );
      expect(transicion).toBeUndefined();
    });

    it('debe rechazar anulación desde estado final', () => {
      servicio = servicioBuilder().estado('FACTURADO').build();

      const transicion = transicionesDisponibles(
        servicio,
        ['Administrador'],
        adjuntos,
        config
      ).find((t) => t.accion === 'anular');
      expect(transicion).toBeUndefined();
    });
  });
});
