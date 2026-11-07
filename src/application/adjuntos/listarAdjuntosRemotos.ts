import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { Adjunto } from '@/domain/adjunto';

/**
 * Lista adjuntos remotos de un servicio al abrir detalle con conexión
 * - Obtiene lista de archivos remotos de SharePoint
 * - Hace upsert de adjuntos sin duplicar (por driveItemId)
 * - 404 (sin adjuntos) no genera error
 * - Mapea campos: driveItemId, webUrl, nombre, tamaño, tipo MIME
 * - Establece blob=null (no descargar contenido completo)
 * T-023
 */

export function crearListarAdjuntosRemotos(deps: {
  readonly remoto: RemoteGateway;
  readonly adjuntos: AdjuntoRepository;
  readonly logger: Logger;
}): (servicioId: string, accessToken: string, _signal?: AbortSignal) => Promise<number> {
  return async (servicioId, accessToken) => {
    try {
      // Obtener lista de archivos remotos
      const archivos = await deps.remoto.listarArchivosServicio?.(servicioId, accessToken);

      if (!archivos || archivos.length === 0) {
        deps.logger.debug('listarAdjuntosRemotos', `Sin adjuntos remotos para ${servicioId}`);
        return 0;
      }

      // Mapear a adjuntos locales
      const adjuntosParaUpsert: Partial<Adjunto>[] = archivos.map((item) => ({
        id: `remote-${item.id}`,
        servicioId,
        nombreArchivo: item.name,
        tamanoBytes: item.size,
        sp: {
          driveItemId: item.id,
          webUrl: item.webUrl,
          eTag: '', // Se obtendría del response si necesita
        },
        blob: null, // No descargar el contenido completo aquí
        miniatura: null, // Se descargará después en descargarMiniaturas
        syncState: 'synced' as const,
        mime: determinaMime(item.name),
      }));

      // Upsert sin duplicar (por ID)
      const adjuntosExistentes = await deps.adjuntos.obtenerPorServicio(servicioId);
      const idsExistentes = new Set(adjuntosExistentes.map((a) => a.id));

      const adjuntosNuevos = adjuntosParaUpsert.filter((a) => !idsExistentes.has(a.id!));

      if (adjuntosNuevos.length > 0) {
        await deps.adjuntos.actualizarVarios(adjuntosNuevos as Adjunto[]);
        deps.logger.debug(
          'listarAdjuntosRemotos',
          `${adjuntosNuevos.length} adjuntos remotos añadidos a ${servicioId}`
        );
      }

      return adjuntosNuevos.length;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        // 404 = sin adjuntos, no es error
        deps.logger.debug('listarAdjuntosRemotos', `Servicio ${servicioId} sin adjuntos remotos`);
        return 0;
      }

      deps.logger.error(
        'listarAdjuntosRemotos',
        `Error listando adjuntos de ${servicioId}: ${error instanceof Error ? error.message : 'desconocido'}`
      );
      throw error;
    }
  };
}

/**
 * Determina el tipo MIME basado en extensión
 */
function determinaMime(nombreArchivo: string): string {
  const ext = nombreArchivo.toLowerCase().split('.').pop() || '';

  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };

  return mimeMap[ext] || 'application/octet-stream';
}
