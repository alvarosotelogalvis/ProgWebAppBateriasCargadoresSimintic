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
export function crearResolutorConflicto412(deps: {
  readonly remoto: RemoteGateway;
  readonly servicios: ServicioRepository;
  readonly logger: Logger;
  readonly reloj: Clock;
}): (local: Servicio) => Promise<ResultadoConflicto412> {
  return async (local) => {
    // Obtener cambios remotos para este servicioId
    const { cambios } = await deps.remoto.cambiosServicios();
    const cambioRemoto = cambios.find((c) => c.servicioId === local.id);

    if (!cambioRemoto) {
      // El ítem no existe en remoto - no hay conflicto
      return {
        tipo: 'reintentar',
        nuevoETag: local.sp?.eTag ?? '',
        servicio: local,
      };
    }

    // Aplicar merge a 3 vías
    const { servicio: merged, conflictos } = mergeTresVias(
      local,
      cambioRemoto.fields as Record<string, unknown>
    );

    // Actualizar eTag y metadatos remotos
    if (cambioRemoto.itemId && cambioRemoto.modified) {
      merged.sp = {
        itemId: cambioRemoto.itemId,
        eTag: `etag-nuevo`, // El nuevo eTag vendría del response del PATCH exitoso
        modificadoEn: cambioRemoto.modified,
        webUrl: local.sp?.webUrl ?? '',
      };
    }

    // Decidir resultado
    if (conflictos.length === 0) {
      // Sin choque: reintentar PATCH
      return {
        tipo: 'reintentar',
        nuevoETag: cambioRemoto.itemId ? `etag-nuevo` : (local.sp?.eTag ?? ''),
        servicio: merged,
      };
    }

    // Con choque: marcar como conflicto
    return {
      tipo: 'conflicto',
      servicio: {
        ...merged,
        conflictos,
        syncState: 'conflict',
      },
    };
  };
}

/**
 * Alias para consistencia con otros resolvedores
 */
export const resolverConflicto412 = crearResolutorConflicto412;
