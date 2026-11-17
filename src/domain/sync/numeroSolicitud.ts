/**
 * Número de solicitud consecutivo (ADR-0024, spec 011).
 * El técnico no lo digita: SharePoint lo asigna al sincronizar. Mientras tanto vale 0 («pendiente»).
 */
export const NUMERO_PENDIENTE = 0;

/** Intentos máximos al asignar o renumerar si dos dispositivos chocan por el mismo número. */
export const MAX_INTENTOS_NUMERO = 5;

/** `true` mientras el servicio no ha recibido su número. */
export const esPendiente = (numero: number): boolean => !(numero > NUMERO_PENDIENTE);

/** Siguiente número a asignar: el mayor existente + 1, o 1 si no hay ninguno. */
export const siguienteNumero = (maximo: number | null | undefined): number =>
  typeof maximo === 'number' && Number.isFinite(maximo) && maximo > 0 ? Math.floor(maximo) + 1 : 1;
