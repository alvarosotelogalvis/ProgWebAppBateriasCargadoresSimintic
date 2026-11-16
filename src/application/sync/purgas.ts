import type { AppDB } from '@/infrastructure/db/dexie';
import { seleccionarPurgables } from '@/domain/purgas';
import type { Logger } from '@/application/ports/loggerPort';

export interface ResultadoPurga {
  serviciosPurgados: string[];
  adjuntosPurgados: string[];
  espacioLiberado: number;
  timestamp: string;
}

/**
 * Ejecuta purgas de servicios cerrados sincronizados y archivos antiguos.
 * Transaccional: re-verifica syncState antes de borrar para evitar carreras.
 * Nunca toca datos pendientes de sincronizar.
 */
export async function ejecutarPurgas(
  db: AppDB,
  diasOriginales: number = 7,
  mesesCerrados: number = 3,
  logger?: Logger
): Promise<ResultadoPurga> {
  const ahora = new Date();
  const serviciosPurgados: string[] = [];
  const adjuntosPurgados: string[] = [];
  let espacioLiberado = 0;

  try {
    // Cargar datos locales
    const servicios = await db.servicios.toArray();
    const adjuntos = await db.adjuntos.toArray();

    // Mapear adjuntos por servicio
    const adjuntosMap = new Map<string, typeof adjuntos>();
    for (const adj of adjuntos) {
      if (!adjuntosMap.has(adj.servicioId)) {
        adjuntosMap.set(adj.servicioId, []);
      }
      adjuntosMap.get(adj.servicioId)!.push(adj);
    }

    // Seleccionar candidatos a purga
    const purgables = seleccionarPurgables(servicios, adjuntosMap, diasOriginales, mesesCerrados);

    // Ejecutar en transacción con re-verificación
    await db.transaction('rw', db.servicios, db.adjuntos, db.logs, async () => {
      // Purgar servicios cerrados
      for (const svc of purgables.servicios) {
        // Re-verificar antes de borrar
        const actual = await db.servicios.get(svc.id);
        if (actual && actual.syncState === 'synced' && actual.camposSucios.length === 0) {
          const propios = await db.adjuntos.where('servicioId').equals(svc.id).toArray();
          // Un adjunto pendiente de subir o de eliminar en SharePoint impide la purga.
          if (propios.some((adj) => adj.syncState !== 'synced' || adj.eliminarRemoto)) continue;
          for (const adj of propios) {
            adjuntosPurgados.push(adj.id);
            espacioLiberado += (adj.blob ? adj.tamanoBytes : 0) + (adj.miniatura?.size ?? 0);
          }
          await db.adjuntos.where('servicioId').equals(svc.id).delete();
          await db.servicios.delete(svc.id);
          serviciosPurgados.push(svc.id);
        }
      }

      // Purgar archivos originales
      for (const { adjunto } of purgables.archivos) {
        // Re-verificar antes de liberar
        const actual = await db.adjuntos.get(adjunto.id);
        if (actual && actual.blob && actual.syncState === 'synced') {
          // Conservar miniatura, liberar blob
          await db.adjuntos.update(adjunto.id, { blob: null });
          adjuntosPurgados.push(adjunto.id);
          espacioLiberado += actual.tamanoBytes;
        }
      }

      // Registrar en logs
      if (logger) {
        logger.info('purga', {
          serviciosPurgados: serviciosPurgados.length,
          adjuntosPurgados: adjuntosPurgados.length,
          espacioLiberadoBytes: espacioLiberado,
        });
      }
    });
  } catch (error) {
    if (logger) {
      logger.error('purga.error', {
        mensaje: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
    throw error;
  }

  return {
    serviciosPurgados,
    adjuntosPurgados,
    espacioLiberado,
    timestamp: ahora.toISOString(),
  };
}
