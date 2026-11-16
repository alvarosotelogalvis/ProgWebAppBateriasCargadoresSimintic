/**
 * Clasificación de errores de sincronización según la tabla de SDD §9.6.
 * Es una función pura del dominio: no conoce HTTP ni Graph, solo la forma del fallo.
 */
export type ClaseError =
  | 'RED'
  | 'AUTH'
  | 'SIN_PERMISO'
  | 'CONFIGURACION'
  | 'IDEMPOTENCIA'
  | 'CONFLICTO'
  | 'NO_REINTENTABLE'
  | 'REINTENTABLE'
  | 'SESION_SUBIDA_EXPIRADA';

export interface EntradaClasificacionError {
  readonly status?: number;
  readonly esTimeout?: boolean;
  /** `fetch` falló o `navigator.onLine` es false. */
  readonly esRed?: boolean;
  /** El 404 provino de la `uploadUrl` de una sesión de subida. */
  readonly esSesionSubida?: boolean;
  /**
   * El fallo es una violación de valor único (el ítem ya existe). SharePoint real la responde como
   * 400 `invalidRequest`, no como 409 (comprobado en un tenant); se reconoce por el mensaje.
   */
  readonly esValorUnico?: boolean;
}

/** ¿El mensaje de error de Graph/SharePoint indica un valor único duplicado? */
export function esMensajeDeValorUnico(mensaje: string | undefined): boolean {
  return mensaje !== undefined && /unique constraint/i.test(mensaje);
}

/**
 * Traduce un fallo a la clase de error que decide la acción del motor de sync.
 * Precedencia: red → sesión de subida expirada → timeout → estado HTTP.
 */
export function clasificarError(entrada: EntradaClasificacionError): ClaseError {
  if (entrada.esRed === true) return 'RED';
  if (entrada.status === 404 && entrada.esSesionSubida === true) return 'SESION_SUBIDA_EXPIRADA';
  if (entrada.esTimeout === true || entrada.status === 408) return 'REINTENTABLE';

  // 400 + mensaje de valor único = el ítem ya existe: mismo tratamiento que un 409 (idempotencia).
  if (entrada.status === 400 && entrada.esValorUnico === true) return 'IDEMPOTENCIA';

  switch (entrada.status) {
    case 401:
      return 'AUTH';
    case 403:
      return 'SIN_PERMISO';
    case 404:
      return 'CONFIGURACION';
    case 409:
      return 'IDEMPOTENCIA';
    case 412:
      return 'CONFLICTO';
    case 413:
      return 'NO_REINTENTABLE';
    case 429:
    case 503:
    case 504:
      return 'REINTENTABLE';
    default:
      if (entrada.status !== undefined && entrada.status >= 500) return 'REINTENTABLE';
      if (entrada.status !== undefined && entrada.status >= 400) return 'NO_REINTENTABLE';
      return 'REINTENTABLE';
  }
}

/** Un error reintentable se puede volver a intentar automáticamente dentro de la ejecución. */
export function esReintentable(clase: ClaseError): boolean {
  return clase === 'REINTENTABLE' || clase === 'SESION_SUBIDA_EXPIRADA';
}

/** Un error de estas clases detiene la ejecución completa del sync. */
export function debeAbortarSync(clase: ClaseError): boolean {
  return clase === 'RED' || clase === 'AUTH' || clase === 'CONFIGURACION';
}
