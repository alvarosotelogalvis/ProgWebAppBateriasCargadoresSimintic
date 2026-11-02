import type { LockSync, OpcionesLock, ResultadoLock } from '@/application/ports/syncLock';

interface LockManagerParcial {
  request<T>(
    nombre: string,
    opciones: { ifAvailable?: boolean },
    callback: (lock: unknown) => Promise<T>
  ): Promise<T>;
}

const obtenerLocks = (): LockManagerParcial | undefined => {
  if (typeof navigator === 'undefined') return undefined;
  const locks = (navigator as Navigator & { locks?: LockManagerParcial }).locks;
  return locks && typeof locks.request === 'function' ? locks : undefined;
};

/**
 * `navigator.locks` con la opción `ifAvailable` (SDD §9.1 / ADR-0010).
 * Si el navegador no soporta Web Locks, la ejecución sigue en serie dentro de
 * la pestaña; el peor caso es un push concurrente entre ventanas, ya idempotente.
 */
export const conLockSync: LockSync = async <T>(
  clave: string,
  fn: () => Promise<T>,
  opciones: OpcionesLock = {}
): Promise<ResultadoLock<T>> => {
  const locks = obtenerLocks();
  if (!locks) {
    return { adquirido: true, valor: await fn() };
  }

  if (opciones.ifAvailable === true) {
    return locks.request<ResultadoLock<T>>(clave, { ifAvailable: true }, async (lock) => {
      if (lock === null) return { adquirido: false };
      return { adquirido: true, valor: await fn() };
    });
  }

  return locks.request<ResultadoLock<T>>(clave, {}, async () => ({
    adquirido: true,
    valor: await fn(),
  }));
};
