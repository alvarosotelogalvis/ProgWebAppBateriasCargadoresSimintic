import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { UnidadDeTrabajo } from '@/application/ports/unidadDeTrabajo';
import { seleccionarPurgables } from '@/domain/purgas';

export interface ResultadoPurga {
  serviciosPurgados: string[];
  adjuntosPurgados: string[];
  espacioLiberado: number;
  timestamp: string;
}

export interface DepsPurgas {
  readonly servicios: ServicioRepository;
  readonly adjuntos: AdjuntoRepository;
  readonly uow: UnidadDeTrabajo;
}

/**
 * Ejecuta purgas de servicios cerrados sincronizados y archivos antiguos.
 * Transaccional: re-verifica el estado antes de borrar para evitar carreras.
 * Nunca toca datos pendientes de sincronizar.
 */
export async function ejecutarPurgas(
  deps: DepsPurgas,
  diasOriginales: number = 7,
  mesesCerrados: number = 3,
  logger?: Logger
): Promise<ResultadoPurga> {
  const ahora = new Date();
  const serviciosPurgados: string[] = [];
  const adjuntosPurgados: string[] = [];
  let espacioLiberado = 0;

  try {
    const servicios = await deps.servicios.listarTodos();
    const adjuntos = await deps.adjuntos.listarTodos();

    const adjuntosMap = new Map<string, typeof adjuntos>();
    for (const adj of adjuntos) {
      if (!adjuntosMap.has(adj.servicioId)) {
        adjuntosMap.set(adj.servicioId, []);
      }
      adjuntosMap.get(adj.servicioId)!.push(adj);
    }

    const purgables = seleccionarPurgables(servicios, adjuntosMap, diasOriginales, mesesCerrados);

    await deps.uow.ejecutar(async (repos) => {
      for (const svc of purgables.servicios) {
        const propios = await repos.adjuntos.listarPorServicio(svc.id);
        // `eliminarSincronizado` re-verifica: servicio sincronizado, sin campos sucios y sin
        // adjuntos pendientes de subir o de eliminar en SharePoint. Si no cumple, no borra nada.
        if (await repos.servicios.eliminarSincronizado(svc.id)) {
          for (const adj of propios) {
            adjuntosPurgados.push(adj.id);
            espacioLiberado += (adj.blob ? adj.tamanoBytes : 0) + (adj.miniatura?.size ?? 0);
          }
          serviciosPurgados.push(svc.id);
        }
      }

      for (const { adjunto } of purgables.archivos) {
        const actual = await repos.adjuntos.obtener(adjunto.id);
        if (actual && actual.blob && actual.syncState === 'synced') {
          // Conservar miniatura, liberar el original
          await repos.adjuntos.guardar({ ...actual, blob: null });
          adjuntosPurgados.push(adjunto.id);
          espacioLiberado += actual.tamanoBytes;
        }
      }
    });

    logger?.info('purga', {
      serviciosPurgados: serviciosPurgados.length,
      adjuntosPurgados: adjuntosPurgados.length,
      espacioLiberadoBytes: espacioLiberado,
    });
  } catch (error) {
    logger?.error('purga.error', {
      mensaje: error instanceof Error ? error.message : 'Error desconocido',
    });
    throw error;
  }

  return {
    serviciosPurgados,
    adjuntosPurgados,
    espacioLiberado,
    timestamp: ahora.toISOString(),
  };
}
