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
 * Descarga servicios remotos desde SharePoint (push incremental, delta con paginación).
 * SDD §9.2: PULL (T-010, T-013)
 */
export function crearPullServicios(_deps: {
  readonly remoto: RemoteGateway;
  readonly servicios: ServicioRepository;
  readonly meta: MetaRepository;
  readonly reloj: Clock;
  readonly logger: Logger;
  readonly config: () => ConfigApp;
}): (opts: { signal: AbortSignal; onProgreso: (n: number) => void }) => Promise<ResultadoPull> {
  return async (_opts) => {
    // TODO: Implementar
    throw new Error('Not implemented');
  };
}
