import type { IdGenerator } from '@/application/ports/idGenerator';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { AppDB } from './dexie';

export const CLAVE_DISPOSITIVO_ID = 'dispositivoId';

export class MetaRepositoryDexie implements MetaRepository {
  constructor(
    private readonly db: AppDB,
    private readonly ids: IdGenerator
  ) {}

  async obtener<T>(clave: string): Promise<T | undefined> {
    const registro = await this.db.meta.get(clave);
    return registro?.valor as T | undefined;
  }

  async guardar(clave: string, valor: unknown): Promise<void> {
    await this.db.meta.put({ clave, valor });
  }

  async dispositivoId(): Promise<string> {
    return this.db.transaction('rw', this.db.meta, async () => {
      const registro = await this.db.meta.get(CLAVE_DISPOSITIVO_ID);
      if (registro && typeof registro.valor === 'string' && registro.valor.length > 0) {
        return registro.valor;
      }
      const nuevo = this.ids.siguiente();
      await this.db.meta.put({ clave: CLAVE_DISPOSITIVO_ID, valor: nuevo });
      return nuevo;
    });
  }
}
