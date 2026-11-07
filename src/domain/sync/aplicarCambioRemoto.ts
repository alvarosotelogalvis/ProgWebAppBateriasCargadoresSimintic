import type { RemotoCambio } from './remoto';
import type { Servicio } from '../servicio';

export type DecisionCambio =
  | { readonly tipo: 'INSERTAR'; readonly servicio: Servicio }
  | { readonly tipo: 'SOBRESCRIBIR'; readonly servicio: Servicio }
  | { readonly tipo: 'COMBINAR'; readonly servicio: Servicio; readonly conflictos: unknown[] }
  | { readonly tipo: 'ELIMINAR_LOCAL' }
  | { readonly tipo: 'CONFLICTO_ELIMINACION'; readonly servicio: Servicio }
  | { readonly tipo: 'IGNORAR'; readonly motivo: 'SIN_SERVICIO_ID' | 'FUERA_DE_RETENCION' };

interface ContextoMerge {
  readonly ahora: Date;
  readonly retencionMeses: number;
}

/**
 * Decide qué hacer con un cambio remoto comparándolo con la copia local.
 * Retorna la decisión (insertar, sobrescribir, combinar, etc.).
 * (T-16, T-008)
 */
export function aplicarCambioRemoto(
  _local: Servicio | undefined,
  _cambio: RemotoCambio,
  _ctx: ContextoMerge
): DecisionCambio {
  // TODO: Implementar
  throw new Error('Not implemented');
}
