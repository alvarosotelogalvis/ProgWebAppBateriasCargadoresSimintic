export interface OpcionesLock {
  /** No espera el lock: si otra ventana lo tiene, devuelve `adquirido: false`. */
  readonly ifAvailable?: boolean;
}

export type ResultadoLock<T> =
  { readonly adquirido: true; readonly valor: T } | { readonly adquirido: false };

/**
 * Exclusión mutua entre pestañas/ventanas (Web Locks, SDD §9.1).
 * Se inyecta desde infraestructura para que la aplicación siga siendo pura.
 */
export type LockSync = <T>(
  clave: string,
  fn: () => Promise<T>,
  opciones?: OpcionesLock
) => Promise<ResultadoLock<T>>;
