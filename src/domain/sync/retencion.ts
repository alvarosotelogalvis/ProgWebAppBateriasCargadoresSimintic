import { ESTADOS_FINALES } from '../estados';
import type { CamposServicio } from '../servicio';
import type { RemotoCambio } from './remoto';

/**
 * Determina si un cambio remoto debe descargarse según la retención.
 * Criterios (ES-006-02, T-006):
 * - Servicios abiertos (no finales) siempre se descargan
 * - Servicios cerrados (finales) solo si están dentro de la retención
 * - Sin info de fecha: se descarga (conservador)
 */
export function debeDescargarse(
  cambio: RemotoCambio,
  ahora: Date,
  retencionMeses: number
): boolean {
  const estado = cambio.fields.estado as CamposServicio['estado'] | undefined;

  // Si no es un estado final, es abierto: siempre se descarga
  if (!estado || !ESTADOS_FINALES.includes(estado)) {
    return true;
  }

  // Es un estado final (cerrado). Verificar si está dentro de la retención.
  if (!cambio.modified) {
    return true; // Sin fecha, conservador: se descarga
  }

  const fechaModificacion = new Date(cambio.modified);
  const mesesTranscurridos =
    (ahora.getTime() - fechaModificacion.getTime()) / (1000 * 60 * 60 * 24 * 30);

  return mesesTranscurridos <= retencionMeses;
}
