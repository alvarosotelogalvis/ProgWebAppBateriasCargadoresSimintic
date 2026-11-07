import type { RemotoCambio } from './remoto';

/**
 * Determina si un cambio remoto debe descargarse según la retención.
 * Criterios (T-006):
 * - Servicios abiertos (no finales) siempre se descargan
 * - Servicios cerrados (finales) solo si están dentro de la retención
 * (T-006, T-008)
 */
export function debeDescargarse(
  _cambio: RemotoCambio,
  _ahora: Date,
  _retencionMeses: number
): boolean {
  // TODO: Implementar
  throw new Error('Not implemented');
}
