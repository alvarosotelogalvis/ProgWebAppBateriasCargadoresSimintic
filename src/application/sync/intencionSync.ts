import type { IntencionSyncPort } from '@/application/ports/IntencionSyncPort';

/**
 * Una intención de sincronización pendiente caduca a los 10 minutos (plan 005 §3.3).
 * Si la app se cierra durante el redirect del login, al volver ya no se reanuda sola.
 */
export const VIGENCIA_INTENCION_MS = 10 * 60 * 1000;

const MARGEN_RELOJ_MS = 60 * 1000;

/** Lee la intención guardada y la descarta si venció o es inválida. */
export function leerIntencionVigente(
  intencion: IntencionSyncPort,
  ahoraMs: number,
  vigenciaMs: number = VIGENCIA_INTENCION_MS
): ReturnType<IntencionSyncPort['leer']> {
  const guardada = intencion.leer();
  if (!guardada) return null;

  const antiguedad = ahoraMs - guardada.timestamp;
  const esFutura = antiguedad < -MARGEN_RELOJ_MS;
  if (!Number.isFinite(antiguedad) || esFutura || antiguedad > vigenciaMs) {
    intencion.limpiar();
    return null;
  }

  return guardada;
}
