import type { AppDB } from '@/infrastructure/db/dexie';
import type { Logger } from '@/application/ports/loggerPort';
import type { ContextoFinSync } from '@/application/sync/SyncEngine';
import { ejecutarPurgas } from './ejecutarPurgas';

export interface PurgeHookOpciones {
  readonly db: AppDB;
  readonly logger: Logger;
  readonly diasOriginales?: number;
  readonly mesesCerrados?: number;
}

/**
 * Hook de purga para integrar con SyncEngine.
 * Se ejecuta después de cada sincronización exitosa (alFinalizar).
 */
export function crearHookPurgas({
  db,
  logger,
  diasOriginales = 7,
  mesesCerrados = 3,
}: PurgeHookOpciones): (contexto: ContextoFinSync) => Promise<void> {
  return async (contexto: ContextoFinSync) => {
    try {
      const resultado = await ejecutarPurgas(db, diasOriginales, mesesCerrados);

      logger.info('purgas-ejecutadas', {
        serviciosPurgados: resultado.serviciosPurgados.length,
        adjuntosPurgados: resultado.adjuntosPurgados.length,
        espacioLiberado: Math.round(resultado.espacioLiberado / 1024 / 1024),
        correlationId: contexto.correlationId,
      });
    } catch (err) {
      logger.warn('purgas-fallidas', {
        motivo: err instanceof Error ? err.message : String(err),
        correlationId: contexto.correlationId,
      });
      // No relanzar: las purgas fallidas no deben romper la sincronización
    }
  };
}
