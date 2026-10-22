import { describe, expect, it } from 'vitest';

import { servicioBuilder } from '../../tests/builders/servicioBuilder';
import {
  esquemaAnulacion,
  esquemaCotizacion,
  esquemaDiagnostico,
  esquemaDisposicionFinal,
  esquemaEntrega,
  esquemaFacturacion,
  esquemaOrdenTrabajo,
  esquemaRecepcion,
} from './validaciones';

const HOY = '2026-10-21';

const recepcionValida = () =>
  servicioBuilder()
    .conCampos({
      estado: 'BORRADOR',
      tipoEquipo: 'CARGADOR',
      fechaRecepcion: '2026-10-01',
      clienteId: 1,
      clienteNombre: 'NAVAR ASOCIADOS',
      numeroSolicitud: 1,
      marca: 'roquet',
      referencia: 'ref-1',
      serie: ' nv-4520 ',
    })
    .construir();

const claves = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  resultado.success ? [] : (resultado.error?.issues.map((issue) => issue.message) ?? []);

describe('esquemaRecepcion', () => {
  it('acepta y normaliza los datos válidos', () => {
    const resultado = esquemaRecepcion(HOY).safeParse(recepcionValida());
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.serie).toBe('NV-4520');
      expect(resultado.data.marca).toBe('ROQUET');
      expect(resultado.data.referencia).toBe('REF-1');
    }
  });

  it('rechaza solicitud 0 y solicitudes no numéricas', () => {
    const cero = { ...recepcionValida(), numeroSolicitud: 0 };
    const texto = { ...recepcionValida(), numeroSolicitud: 'ABC' };
    expect(esquemaRecepcion(HOY).safeParse(cero).success).toBe(false);
    expect(esquemaRecepcion(HOY).safeParse(texto).success).toBe(false);
  });

  it('rechaza serie con espacios internos o símbolos no permitidos', () => {
    const espacios = { ...recepcionValida(), serie: 'NV 4520' };
    const simbolos = { ...recepcionValida(), serie: 'NV#4520' };
    expect(claves(esquemaRecepcion(HOY).safeParse(espacios))).toContain(
      'errores.servicio.serieEspacios'
    );
    expect(claves(esquemaRecepcion(HOY).safeParse(simbolos))).toContain(
      'errores.servicio.serieFormato'
    );
  });

  it('rechaza una fecha de recepción futura', () => {
    const futuro = { ...recepcionValida(), fechaRecepcion: '2026-10-22' };
    expect(claves(esquemaRecepcion(HOY).safeParse(futuro))).toContain(
      'errores.servicio.fechaFutura'
    );
  });

  it('rechaza cliente ausente, serie vacía y marca vacía', () => {
    const invalido = { ...recepcionValida(), clienteId: 0, serie: '', marca: '' };
    const errores = claves(esquemaRecepcion(HOY).safeParse(invalido));
    expect(errores).toContain('errores.servicio.clienteRequerido');
    expect(errores).toContain('errores.servicio.serieRequerida');
    expect(errores).toContain('errores.servicio.marcaRequerida');
  });

  it('rechaza tipo de equipo distinto de batería o cargador', () => {
    const invalido = { ...recepcionValida(), tipoEquipo: 'OTRO' };
    expect(esquemaRecepcion(HOY).safeParse(invalido).success).toBe(false);
  });
});

describe('esquemaDiagnostico y esquemaDisposicionFinal', () => {
  it('exige observación de al menos 5 caracteres', () => {
    const base = servicioBuilder()
      .conCampos({ diagnostico: 'BATERIA DESGASTADA', observacionTecnica: 'ab' })
      .construir();
    expect(claves(esquemaDiagnostico().safeParse(base))).toContain(
      'errores.servicio.observacionFormato'
    );
  });

  it('exige fecha de socialización no anterior a la recepción ni futura', () => {
    const base = servicioBuilder()
      .conCampos({ diagnostico: 'D. FINAL', observacionTecnica: 'Equipo sin reparación.' })
      .construir();
    const antes = { ...base, fechaSocializacionDF: '2026-09-30' };
    const futuro = { ...base, fechaSocializacionDF: '2026-10-22' };

    expect(claves(esquemaDisposicionFinal(HOY, '2026-10-01').safeParse(antes))).toContain(
      'errores.servicio.fechaSocializacionInvalida'
    );
    expect(claves(esquemaDisposicionFinal(HOY, '2026-10-01').safeParse(futuro))).toContain(
      'errores.servicio.fechaFutura'
    );
  });
});

describe('esquemaCotizacion', () => {
  const base = servicioBuilder()
    .conCampos({ estado: 'DIAGNOSTICADO', cotizacionFechaEnvio: '2026-10-10' })
    .construir();

  it('acepta fecha de envío válida y estado por defecto', () => {
    expect(esquemaCotizacion(HOY, '2026-10-01').safeParse(base).success).toBe(true);
  });

  it('rechaza fecha anterior a la recepción y valor negativo', () => {
    const errores = claves(
      esquemaCotizacion(HOY, '2026-10-01').safeParse({
        ...base,
        cotizacionFechaEnvio: '2026-09-01',
        cotizacionValor: -1,
      })
    );
    expect(errores).toContain('errores.servicio.entregaAntesRecepcion');
    expect(errores).toContain('errores.servicio.cotizacionValorInvalido');
  });
});

describe('esquemaOrdenTrabajo', () => {
  it('exige detalle suficiente y costo no negativo', () => {
    const errores = claves(
      esquemaOrdenTrabajo().safeParse({ otDetalle: 'abc', otCostoReparacion: -5 })
    );
    expect(errores).toContain('errores.servicio.otDetalleFormato');
    expect(errores).toContain('errores.servicio.otCostoInvalido');
  });
});

describe('esquemaEntrega', () => {
  const base = servicioBuilder()
    .conCampos({ estado: 'EN_REPARACION', fechaEntrega: '2026-10-15' })
    .construir();

  it('rechaza entrega anterior a la recepción', () => {
    expect(
      claves(
        esquemaEntrega(HOY, '2026-10-01', true).safeParse({
          ...base,
          fechaEntrega: '2026-09-01',
        })
      )
    ).toContain('errores.servicio.entregaAntesRecepcion');
  });

  it('exige proyección posterior a la entrega cuando es obligatoria', () => {
    expect(claves(esquemaEntrega(HOY, '2026-10-01', true).safeParse(base))).toContain(
      'errores.servicio.vidaUtilRequerida'
    );
    expect(
      claves(
        esquemaEntrega(HOY, '2026-10-01', true).safeParse({
          ...base,
          proyeccionVidaUtil: '2026-10-15',
        })
      )
    ).toContain('errores.servicio.vidaUtilInvalida');
  });

  it('permite omitir la proyección en la entrega sin reparación', () => {
    expect(esquemaEntrega(HOY, '2026-10-01', false).safeParse(base).success).toBe(true);
  });
});

describe('esquemaFacturacion y esquemaAnulacion', () => {
  it('valida fecha y formato del número de factura', () => {
    const base = servicioBuilder()
      .conCampos({ estado: 'ENTREGADO', facturaFecha: '2026-10-16' })
      .construir();
    expect(esquemaFacturacion(HOY, '2026-10-01').safeParse(base).success).toBe(true);
    expect(
      claves(
        esquemaFacturacion(HOY, '2026-10-01').safeParse({
          ...base,
          facturaNumero: 'F#1',
        })
      )
    ).toContain('errores.servicio.facturaNumeroFormato');
  });

  it('exige un motivo de anulación de al menos 10 caracteres', () => {
    expect(claves(esquemaAnulacion().safeParse({ anulacionMotivo: 'corto' }))).toContain(
      'errores.servicio.motivoMinimo'
    );
    expect(esquemaAnulacion().safeParse({ anulacionMotivo: 'Registro duplicado' }).success).toBe(
      true
    );
  });
});
