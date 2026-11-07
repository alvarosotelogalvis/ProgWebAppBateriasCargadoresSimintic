import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { Clock } from '@/application/ports/clock';
import type { Servicio } from '@/domain/servicio';
/**
 * Resultado de resolver un conflicto 412 (ETag) en el push.
 * SDD §9.5: Conflicto 412
 */
export type ResultadoConflicto412 =
  | { readonly tipo: 'reintentar'; readonly nuevoETag: string; readonly servicio: Servicio }
  | { readonly tipo: 'conflicto'; readonly servicio: Servicio };

/**
 * Resuelve un conflicto 412 (ETag) cuando SharePoint devuelve 412 en el PATCH.
 * - Obtiene el ítem remoto actual
 * - Aplica merge a 3 vías
 * - Si no hay choque: retorna "reintentar" con nuevo eTag
 * - Si hay choque: marca como conflicto
 * T-018
 */
export function crearResolutorConflicto412(_deps: {
  readonly remoto: RemoteGateway;
  readonly servicios: ServicioRepository;
  readonly logger: Logger;
  readonly reloj: Clock;
}): (_local: Servicio) => Promise<ResultadoConflicto412> {
  return async () => {
    // TODO: Obtener cambios remotos para el servicioId
    // TODO: Aplicar mergeTresVias
    // TODO: Decidir: reintentar o conflicto
    throw new Error('resolverConflicto412: not implemented');
  };
}

/**
 * Alias para consistencia con otros resolvedores
 */
export const resolverConflicto412 = crearResolutorConflicto412;
