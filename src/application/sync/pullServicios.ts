import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { Clock } from '@/application/ports/clock';
import type { ConfigApp } from '@/domain/config';
import { CLAVES_META } from '@/application/setup/claves';
import { aplicarCambioRemoto } from '@/domain/sync/aplicarCambioRemoto';
import type { RemotoCambio } from '@/domain/sync/remoto';

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
}): (opts: {
  readonly signal: AbortSignal;
  readonly onProgreso: (n: number) => void;
}) => Promise<ResultadoPull> {
  return async (opts) => {
    let descargados = 0;
    let actualizados = 0;
    let conflictos = 0;

    // Obtener meta guardada (incluye deltaLink previo)
    const deltaLinkAnterior = await deps.meta.obtener<string>(CLAVES_META.deltaLinkServicios);

    // Obtener cambios (delta o fallback a Modified)
    const { cambios, deltaLink } = await deps.remoto.cambiosServicios(
      deltaLinkAnterior as string | undefined,
      opts.signal
    );

    const config = deps.config();
    const ahora = new Date(deps.reloj.ahoraIso());

    // Procesar cambios
    for (const cambioAPI of cambios) {
      opts.signal.throwIfAborted();

      // Convertir CambioServicio a RemotoCambio
      const cambio: RemotoCambio = {
        id: cambioAPI.id,
        servicioId: cambioAPI.servicioId,
        fields: cambioAPI.fields,
        ...(cambioAPI.itemId ? { itemId: cambioAPI.itemId } : {}),
        ...(cambioAPI.deleted ? { deleted: cambioAPI.deleted } : {}),
        ...(cambioAPI.modified ? { modified: cambioAPI.modified } : {}),
        ...(cambioAPI.editor ? { editor: cambioAPI.editor } : {}),
        ...(cambioAPI.editorNombre ? { editorNombre: cambioAPI.editorNombre } : {}),
      };

      // Obtener servicio local
      const local = await deps.servicios.obtener(cambio.servicioId);

      // Aplicar decisión de merge
      const decision = aplicarCambioRemoto(local, cambio, {
        ahora,
        retencionMeses: config.retencionCerradosMeses,
      });

      // Guardar según decisión
      switch (decision.tipo) {
        case 'INSERTAR':
        case 'SOBRESCRIBIR':
        case 'COMBINAR':
          await deps.servicios.guardar(decision.servicio);
          if (decision.tipo === 'INSERTAR') {
            descargados++;
          } else {
            actualizados++;
          }
          if (decision.tipo === 'COMBINAR') {
            conflictos++;
          }
          break;

        case 'ELIMINAR_LOCAL':
          // TODO: Implementar eliminación en la sesión siguiente
          // Por ahora se registra pero no se elimina
          deps.logger.info('pull.eliminacion_remota', {
            servicioId: cambio.servicioId,
          });
          break;

        case 'CONFLICTO_ELIMINACION':
          await deps.servicios.guardar(decision.servicio);
          conflictos++;
          break;

        case 'IGNORAR':
          deps.logger.debug('pull.ignorado', {
            servicioId: cambio.servicioId,
            motivo: decision.motivo,
          });
          break;
      }
    }

    // Guardar deltaLink para próxima sync
    if (deltaLink) {
      await deps.meta.guardar(CLAVES_META.deltaLinkServicios, deltaLink);
    }

    return { descargados, actualizados, conflictos };
  };
}
