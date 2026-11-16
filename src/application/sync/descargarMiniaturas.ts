import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { RemoteGatewayPull } from '@/application/ports/RemoteGatewayPull';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { StoragePort } from '@/application/ports/storagePort';
import type { ConfigApp } from '@/domain/config';
import { esFinal } from '@/domain/estados';

export const LIMITE_MINIATURAS_POR_SYNC = 50;
export const CUOTA_MAXIMA_PARA_MINIATURAS = 80;

export type DescargarMiniaturas = (
  servicioIds: readonly string[],
  signal: AbortSignal
) => Promise<number>;

/**
 * Descarga las miniaturas de los adjuntos remotos de servicios abiertos (FR-006-12):
 * hasta 50 por sincronización, solo si la configuración lo permite y el almacenamiento usado
 * está por debajo del 80 %. Un fallo en una miniatura no detiene las demás.
 */
export function crearDescargarMiniaturas(deps: {
  readonly remoto: RemoteGatewayPull;
  readonly servicios: ServicioRepository;
  readonly adjuntos: AdjuntoRepository;
  readonly storage: StoragePort;
  readonly logger: Logger;
  readonly config: () => ConfigApp;
}): DescargarMiniaturas {
  return async (servicioIds, signal) => {
    if (!deps.config().descargarMiniaturasRemotas) return 0;

    const estimacion = await deps.storage.estimar();
    if (estimacion.porcentajeUsado >= CUOTA_MAXIMA_PARA_MINIATURAS) {
      deps.logger.info('miniaturas.omitidas.cuota', { porcentaje: estimacion.porcentajeUsado });
      return 0;
    }

    let descargadas = 0;
    for (const servicioId of servicioIds) {
      const servicio = await deps.servicios.obtener(servicioId);
      if (!servicio || esFinal(servicio.estado)) continue;

      const adjuntos = await deps.adjuntos.listarPorServicio(servicioId);
      for (const adjunto of adjuntos) {
        if (signal.aborted || descargadas >= LIMITE_MINIATURAS_POR_SYNC) return descargadas;
        if (!adjunto.sp || adjunto.miniatura !== null || !adjunto.mime.startsWith('image/')) {
          continue;
        }
        try {
          const miniatura = await deps.remoto.descargarMiniatura(adjunto.sp.driveItemId, signal);
          if (!miniatura) continue;
          await deps.adjuntos.guardar({ ...adjunto, miniatura });
          descargadas += 1;
        } catch (causa) {
          deps.logger.warn('miniaturas.fallo', {
            adjuntoId: adjunto.id,
            mensaje: causa instanceof Error ? causa.message : String(causa),
          });
        }
      }
    }
    return descargadas;
  };
}
