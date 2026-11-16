import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { RemoteGatewayPull } from '@/application/ports/RemoteGatewayPull';
import type { Catalogos } from '@/application/ports/remoteGateway';
import type { ConfigApp } from '@/domain/config';

import type { ListarAdjuntosRemotos } from '@/application/adjuntos/listarAdjuntosRemotos';
import { refrescarCatalogosRemotos } from '@/application/setup/refrescarCatalogosSync';

import { LIMITE_MINIATURAS_POR_SYNC, type DescargarMiniaturas } from './descargarMiniaturas';
import type { PullServicios } from './pullServicios';
import type { ContextoFinSync } from './SyncEngine';

export interface DepsDespuesDelPush {
  readonly gateway: RemoteGatewayPull & { leerCatalogos(): Promise<Catalogos> };
  readonly catalogos: CatalogoRepository;
  readonly pullServicios: PullServicios;
  readonly listarAdjuntosRemotos: ListarAdjuntosRemotos;
  readonly descargarMiniaturas: DescargarMiniaturas;
  readonly config: () => ConfigApp;
  readonly logger: Logger;
}

/**
 * Descarga posterior al push (SDD §9.2, spec 006): catálogos → servicios remotos → adjuntos y
 * miniaturas de los servicios que cambiaron. Un fallo se registra y no invalida lo ya subido:
 * la siguiente sincronización repite la descarga.
 */
export function crearDespuesDelPush(
  deps: DepsDespuesDelPush
): (contexto: ContextoFinSync) => Promise<void> {
  return async ({ correlationId, signal }) => {
    const ctx = { correlationId };
    try {
      await refrescarCatalogosRemotos({
        gateway: deps.gateway,
        catalogos: deps.catalogos,
        logger: deps.logger,
      });

      const { servicioIds, ...resumen } = await deps.pullServicios({
        signal,
        onProgreso: (procesados) => {
          deps.logger.debug('pull.progreso', { procesados }, ctx);
        },
      });
      deps.logger.info('pull.completado', resumen, ctx);

      if (deps.config().descargarMiniaturasRemotas) {
        for (const servicioId of servicioIds.slice(0, LIMITE_MINIATURAS_POR_SYNC)) {
          signal.throwIfAborted();
          await deps.listarAdjuntosRemotos(servicioId, signal);
        }
        await deps.descargarMiniaturas(servicioIds, signal);
      }
    } catch (error) {
      deps.logger.error(
        'pull.error',
        { mensaje: error instanceof Error ? error.message : String(error) },
        ctx
      );
    }
  };
}
