export const MAX_INTENTOS_AUTOMATICOS = 8;

export const ESPERA_BASE_MS = 1_000;
export const RETRASO_MAXIMO_MS = 30_000;
export const JITTER_MAXIMO_MS = 500;
export const ESPERA_ENTRE_EJECUCIONES_MIN_MS = 60_000;
export const ESPERA_ENTRE_EJECUCIONES_MAX_MS = 3_600_000;

/**
 * Espera dentro de una misma ejecución (SDD §9.6):
 * `min(30 s, 1 s × 2^n) + jitter(0–500 ms)`.
 * `n` es el número de reintento (0 = primer reintento).
 */
export function retrasoEnEjecucion(n: number, aleatorio: () => number = Math.random): number {
  const intento = Math.max(0, Math.floor(n));
  const base = Math.min(RETRASO_MAXIMO_MS, ESPERA_BASE_MS * 2 ** intento);
  const jitter = Math.floor(Math.max(0, Math.min(1, aleatorio())) * JITTER_MAXIMO_MS);
  return base + jitter;
}

/**
 * Próximo intento entre ejecuciones (SDD §9.6):
 * `ahora + min(1 h, 1 min × 2^intentos)`.
 */
export function proximoIntento(intentos: number, ahora: Date): Date {
  const intento = Math.max(0, Math.floor(intentos));
  const exponente = Math.min(intento, 6);
  const esperaMs = Math.min(
    ESPERA_ENTRE_EJECUCIONES_MAX_MS,
    ESPERA_ENTRE_EJECUCIONES_MIN_MS * 2 ** exponente
  );
  return new Date(ahora.getTime() + esperaMs);
}

/** Tras 8 intentos automáticos, el usuario debe pulsar "Reintentar" manualmente. */
export function puedeReintentarAutomaticamente(intentos: number): boolean {
  return intentos < MAX_INTENTOS_AUTOMATICOS;
}
