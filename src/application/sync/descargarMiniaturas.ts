import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { Servicio } from '@/domain/servicio';
import type { Logger } from '@/application/ports/loggerPort';
import type { StoragePort } from '@/application/ports/storagePort';

/**
 * Descarga miniaturas de adjuntos remotos después del pull
 * - Máximo 50 miniaturas por sincronización
 * - Solo servicios abiertos (no cerrados)
 * - Solo adjuntos sin miniatura local (miniatura === null)
 * - Solo adjuntos con sp (remoto)
 * - Salto si cuota ≥ 80%
 * - Configurable (DescargarMiniaturasRemotas)
 * T-023
 */

export function crearDescargarMiniaturas(deps: {
  readonly remoto: RemoteGateway;
  readonly adjuntos: AdjuntoRepository;
  readonly storage: StoragePort;
  readonly logger: Logger;
  readonly config: () => { DescargarMiniaturasRemotas: boolean };
}): (servicios: readonly Servicio[], signal: AbortSignal) => Promise<number> {
  return async (servicios, signal) => {
    const config = deps.config();

    if (!config.DescargarMiniaturasRemotas) {
      deps.logger.debug('descargarMiniaturas', 'Descarga de miniaturas desactivada en config');
      return 0;
    }

    // Verificar cuota de almacenamiento
    const cuota = await deps.storage.obtenerCuota?.();
    if (cuota) {
      const porcentajeUsado = (cuota.usado / cuota.total) * 100;
      if (porcentajeUsado >= 80) {
        deps.logger.debug(
          'descargarMiniaturas',
          `Cuota ${porcentajeUsado.toFixed(1)}% - no se descargan miniaturas`
        );
        return 0;
      }
    }

    let descargadas = 0;
    const limite = 50;

    // Filtrar servicios abiertos
    const serviciosAbiertos = servicios.filter(
      (s) =>
        s.estado !== 'FACTURADO' &&
        s.estado !== 'ENTREGADO' &&
        s.estado !== 'DISPOSICION_FINAL' &&
        s.estado !== 'ANULADO'
    );

    for (const servicio of serviciosAbiertos) {
      if (signal.aborted) break;
      if (descargadas >= limite) break;

      try {
        // Obtener adjuntos sin miniatura local
        const adjuntos = await deps.adjuntos.obtenerPorServicio(servicio.id);
        const sinMiniatura = adjuntos.filter((a) => a.miniatura === null && a.sp !== undefined);

        for (const adjunto of sinMiniatura) {
          if (signal.aborted || descargadas >= limite) break;

          try {
            // Descargar miniatura
            const miniatura = await deps.remoto.descargarMiniatura?.(
              adjunto.sp!.driveItemId,
              signal
            );

            if (miniatura) {
              // Actualizar adjunto con miniatura
              await deps.adjuntos.actualizar(adjunto.id, { miniatura });
              descargadas++;
            }
          } catch (error) {
            deps.logger.warn(
              'descargarMiniaturas',
              `Error descargando miniatura ${adjunto.id}: ${error instanceof Error ? error.message : 'desconocido'}`
            );
          }
        }
      } catch (error) {
        deps.logger.warn(
          'descargarMiniaturas',
          `Error procesando adjuntos de ${servicio.id}: ${error instanceof Error ? error.message : 'desconocido'}`
        );
      }
    }

    deps.logger.debug('descargarMiniaturas', `Descargadas ${descargadas} miniaturas`);
    return descargadas;
  };
}
