import type { EstadoCotizacion, Servicio } from '@/domain/servicio';
import type { PasoClave } from '@/shared/ui/LineaTiempoEtapas';

const formatoCOP = (valor: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);

const unir = (partes: readonly (string | undefined | false)[]): string | undefined => {
  const presentes = partes.filter((parte): parte is string => Boolean(parte));
  return presentes.length > 0 ? presentes.join(' · ') : undefined;
};

/**
 * Una línea de resumen por paso de la línea de tiempo del detalle. `etiquetaRespuesta`
 * traduce la respuesta del cliente a la cotización (que cae dentro del paso "orden").
 */
export function resumenEtapas(
  servicio: Servicio,
  etiquetaRespuesta: (estado: EstadoCotizacion) => string
): Partial<Record<PasoClave, string>> {
  const resumen: Partial<Record<PasoClave, string>> = {};
  const cotizada = servicio.cotizacionFechaEnvio !== undefined || servicio.cotizacionEstado;

  if (servicio.fechaRecepcion) resumen.recepcion = servicio.fechaRecepcion;

  const diagnostico = unir([servicio.diagnostico]);
  if (diagnostico) resumen.diagnostico = diagnostico;

  const orden = unir([
    cotizada ? etiquetaRespuesta(servicio.cotizacionEstado ?? 'PENDIENTE') : undefined,
    Boolean(servicio.cotizacionValor) && formatoCOP(servicio.cotizacionValor ?? 0),
    servicio.otCostoReparacion !== undefined && formatoCOP(servicio.otCostoReparacion),
  ]);
  if (orden) resumen.orden = orden;

  const entrega = unir([servicio.fechaEntrega, servicio.proyeccionVidaUtil]);
  if (entrega) resumen.entrega = entrega;

  const facturacion = unir([servicio.facturaNumero, servicio.facturaFecha]);
  if (facturacion) resumen.facturacion = facturacion;

  return resumen;
}
