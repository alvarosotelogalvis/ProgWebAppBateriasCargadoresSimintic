const ESPERA_BASE_MS = 1000;
const ESPERA_MAX_MS = 30_000;
const JITTER_MAX_MS = 500;

export interface OpcionesBackoff {
  /** Inyectable en pruebas; por defecto un jitter aleatorio de 0 a 500 ms. */
  readonly jitterMs?: () => number;
}

/**
 * Convierte el encabezado `Retry-After` (segundos o fecha HTTP) a milisegundos.
 * Devuelve `undefined` cuando el valor no es utilizable.
 */
export function esperaDesdeRetryAfter(valor: string | null | undefined): number | undefined {
  if (!valor) return undefined;

  const segundos = Number(valor);
  if (Number.isFinite(segundos)) {
    return Math.max(0, Math.round(segundos * 1000));
  }

  const fecha = Date.parse(valor);
  if (Number.isNaN(fecha)) return undefined;
  return Math.max(0, fecha - Date.now());
}

/**
 * Espera exponencial con tope de 30 s y jitter de 0 a 500 ms.
 * Si se recibe un `Retry-After` válido, se respeta sin jitter.
 */
export function calcularEspera(
  intentos: number,
  retryAfter?: string | number,
  opciones: OpcionesBackoff = {}
): number {
  const desdeRetryAfter =
    typeof retryAfter === 'number' ? retryAfter : esperaDesdeRetryAfter(retryAfter);
  if (desdeRetryAfter !== undefined) return desdeRetryAfter;

  const exponencial = Math.min(
    ESPERA_BASE_MS * Math.pow(2, Math.max(0, intentos - 1)),
    ESPERA_MAX_MS
  );
  const jitter = Math.min(
    Math.max(0, opciones.jitterMs?.() ?? Math.random() * JITTER_MAX_MS),
    JITTER_MAX_MS
  );
  return exponencial + jitter;
}

/** Compatibilidad con el contrato de sincronización de la spec 005. */
export function retrasoEnEjecucion(
  intentos: number,
  baseMs = ESPERA_BASE_MS,
  jitterFactor = 0.1
): number {
  const exponencial = Math.min(baseMs * Math.pow(2, Math.max(0, intentos - 1)), ESPERA_MAX_MS);
  const jitter = exponencial * jitterFactor * (Math.random() - 0.5);
  return Math.max(0, Math.round(exponencial + jitter));
}

export const MAX_INTENTOS_AUTOMATICOS = 8;

export function proximoIntento(intentosRealizados: number): Date {
  const ms = retrasoEnEjecucion(intentosRealizados + 1);
  return new Date(Date.now() + ms);
}
