const JITTER_MAX = 0.1;

export function calcularEspera(intentos: number, baseMs = 1000): number {
  const exponencial = Math.min(baseMs * Math.pow(2, Math.max(0, intentos - 1)), 30000);
  const jitter = exponencial * (Math.random() * JITTER_MAX);
  return Math.round(exponencial + jitter);
}

export function retrasoEnEjecucion(intentos: number, baseMs = 1000, jitterFactor = 0.1): number {
  const exponencial = Math.min(baseMs * Math.pow(2, Math.max(0, intentos - 1)), 30000);
  const jitter = exponencial * jitterFactor * (Math.random() - 0.5);
  return Math.max(0, Math.round(exponencial + jitter));
}

export const MAX_INTENTOS_AUTOMATICOS = 8;

export function proximoIntento(intentosRealizados: number): Date {
  const ms = retrasoEnEjecucion(intentosRealizados + 1);
  return new Date(Date.now() + ms);
}
