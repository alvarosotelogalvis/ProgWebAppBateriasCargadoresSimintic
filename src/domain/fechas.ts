import type { ErrorValidacion } from './errores';

export const fechaLocalHoy = (): string => new Date().toISOString().split('T')[0];

export function validacionesCruzadasFechas(
  campos: {
    fechaRecepcion?: string;
    fechaSocializacionDF?: string;
    cotizacionFechaEnvio?: string;
    fechaEntrega?: string;
    facturaFecha?: string;
    proyeccionVidaUtil?: string;
  },
  hoy: string
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];

  const {
    fechaRecepcion,
    fechaSocializacionDF,
    cotizacionFechaEnvio,
    fechaEntrega,
    facturaFecha,
    proyeccionVidaUtil,
  } = campos;

  // fechaSocializacionDF debe ser ≥ recepción y ≤ hoy
  if (fechaSocializacionDF && fechaRecepcion) {
    if (fechaSocializacionDF < fechaRecepcion) {
      errores.push({
        campo: 'fechaSocializacionDF',
        clave: 'etapas.disposicionFinal.error_fechaAnterior',
      });
    }
    if (fechaSocializacionDF > hoy) {
      errores.push({
        campo: 'fechaSocializacionDF',
        clave: 'etapas.disposicionFinal.error_fechaPosterior',
      });
    }
  }

  // cotizacionFechaEnvio debe ser ≥ recepción y ≤ hoy
  if (cotizacionFechaEnvio && fechaRecepcion) {
    if (cotizacionFechaEnvio < fechaRecepcion) {
      errores.push({
        campo: 'cotizacionFechaEnvio',
        clave: 'etapas.cotizacion.error_fechaAnterior',
      });
    }
    if (cotizacionFechaEnvio > hoy) {
      errores.push({
        campo: 'cotizacionFechaEnvio',
        clave: 'etapas.cotizacion.error_fechaPosterior',
      });
    }
  }

  // fechaEntrega debe ser ≥ recepción y ≤ hoy
  if (fechaEntrega && fechaRecepcion) {
    if (fechaEntrega < fechaRecepcion) {
      errores.push({
        campo: 'fechaEntrega',
        clave: 'etapas.entrega.error_fechaAnterior',
      });
    }
    if (fechaEntrega > hoy) {
      errores.push({
        campo: 'fechaEntrega',
        clave: 'etapas.entrega.error_fechaPosterior',
      });
    }
  }

  // facturaFecha debe ser ≥ recepción y ≤ hoy
  if (facturaFecha && fechaRecepcion) {
    if (facturaFecha < fechaRecepcion) {
      errores.push({
        campo: 'facturaFecha',
        clave: 'etapas.facturacion.error_fechaAnterior',
      });
    }
    if (facturaFecha > hoy) {
      errores.push({
        campo: 'facturaFecha',
        clave: 'etapas.facturacion.error_fechaPosterior',
      });
    }
  }

  // proyeccionVidaUtil debe ser > fechaEntrega
  if (proyeccionVidaUtil && fechaEntrega) {
    if (proyeccionVidaUtil <= fechaEntrega) {
      errores.push({
        campo: 'proyeccionVidaUtil',
        clave: 'etapas.entrega.error_vidaUtilAnterior',
      });
    }
  }

  return errores;
}
