import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/idGenerator';
import type { Logger } from '@/application/ports/loggerPort';
import type { RemoteGatewayPull } from '@/application/ports/RemoteGatewayPull';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import { adjuntoDesdeArchivoRemoto } from '@/domain/sync/adjuntoRemoto';
import { rutaCarpeta } from '@/domain/sync/rutas';

export type ListarAdjuntosRemotos = (servicioId: string, signal?: AbortSignal) => Promise<number>;

/**
 * Registra como adjuntos sin contenido los archivos que un servicio tiene en SharePoint y no están
 * en el dispositivo (FR-006-13). Hace upsert por `driveItemId`: los archivos que el propio
 * dispositivo subió ya tienen ese id y no se duplican. Devuelve cuántos agregó.
 * Un fallo de red o de SharePoint no es grave: el detalle sigue mostrando lo local.
 */
export function crearListarAdjuntosRemotos(deps: {
  readonly remoto: RemoteGatewayPull;
  readonly servicios: ServicioRepository;
  readonly adjuntos: AdjuntoRepository;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly logger: Logger;
}): ListarAdjuntosRemotos {
  return async (servicioId, signal) => {
    const servicio = await deps.servicios.obtener(servicioId);
    if (!servicio?.sp) return 0; // Nunca se subió: no hay nada remoto.

    let archivos;
    try {
      archivos = await deps.remoto.listarArchivosServicio(rutaCarpeta(servicio), signal);
    } catch (causa) {
      deps.logger.warn('adjuntos.remotos.fallo', {
        servicioId,
        mensaje: causa instanceof Error ? causa.message : String(causa),
      });
      return 0;
    }

    const existentes = await deps.adjuntos.listarPorServicio(servicioId);
    const conocidos = new Set(
      existentes.flatMap((adjunto) => (adjunto.sp ? [adjunto.sp.driveItemId] : []))
    );

    let agregados = 0;
    for (const archivo of archivos) {
      if (conocidos.has(archivo.id)) continue;
      const adjunto = adjuntoDesdeArchivoRemoto(archivo, {
        id: deps.ids.siguiente(),
        servicioId,
        ahoraIso: deps.clock.ahoraIso(),
      });
      if (!adjunto) {
        deps.logger.debug('adjuntos.remotos.omitido', { servicioId, nombre: archivo.nombre });
        continue;
      }
      await deps.adjuntos.guardar(adjunto);
      agregados += 1;
    }
    return agregados;
  };
}
