export async function conLockSync<T>(clave: string, fn: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(clave, async () => {
      return fn();
    });
  }
  // Fallback
  return fn();
}
