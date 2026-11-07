import type { RemoteGateway } from '../ports/RemoteGateway';
import type { ServicioRepository } from '../ports/ServicioRepository';
import type { MetaRepository } from '../ports/MetaRepository';
import type { Logger } from '@/infrastructure/logging/logger';
import type { Clock } from '@/shared/time';
import type { ConfigApp } from '@/domain/config';

/**
 * Resultado del pull de servicios desde SharePoint.
 */
export interface ResultadoPull {
  readonly descargados: number;
  readonly actualizados: number;
  readonly conflictos: number;
}

/**
 * Descarga servicios remotos desde SharePoint (delta con paginación).
 * SDD §9.2: PULL (T-010, T-013)
 */
export function crearPullServicios(deps: {
  readonly remoto: RemoteGateway;
  readonly servicios: ServicioRepository;
  readonly meta: MetaRepository;
  readonly reloj: Clock;
  readonly logger: Logger;
  readonly config: () => ConfigApp;
}): (opts: { signal: AbortSignal; onProgreso: (n: number) => void }) => Promise<ResultadoPull> {
  return async (opts) => {
    let descargados = 0;
    const actualizados = 0;
    const conflictos = 0;

    // Obtener meta guardada (incluye deltaLink previo)
    const metaGuardada = await deps.meta.obtener();
    const deltaLinkAnterior = (metaGuardada as Record<string, unknown>)?.deltaLinkServicios;

    // Obtener cambios (delta o fallback a Modified)
    const { cambios, deltaLink } = await deps.remoto.cambiosServicios(
      deltaLinkAnterior as string | undefined
    );

    // Procesar cambios por página
    for (const _cambio of cambios) {
      opts.signal.throwIfAborted();

      // TODO: aplicarCambioRemoto y guardar
      descargados++;
    }

    // Guardar deltaLink para próxima sync
    if (deltaLink) {
      await deps.meta.actualizar({ deltaLinkServicios: deltaLink });
    }

    return { descargados, actualizados, conflictos };
  };
}
