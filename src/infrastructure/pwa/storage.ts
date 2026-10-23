import type { StoragePort } from '@/application/ports/storagePort';

export class StorageNavegador implements StoragePort {
  async estimar(): Promise<{
    usadoBytes: number;
    cuotaBytes: number;
    disponibleBytes: number;
    porcentajeUsado: number;
  }> {
    if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
      return { usadoBytes: 0, cuotaBytes: 0, disponibleBytes: 0, porcentajeUsado: 0 };
    }
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return {
      usadoBytes: usage,
      cuotaBytes: quota,
      disponibleBytes: Math.max(0, quota - usage),
      porcentajeUsado: quota > 0 ? (usage / quota) * 100 : 0,
    };
  }

  async persistir(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    return navigator.storage.persist();
  }
}
