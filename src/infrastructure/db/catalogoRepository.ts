import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { AppDB } from './dexie';

export class CatalogoRepositoryDexie implements CatalogoRepository {
  constructor(private readonly db: AppDB) {}

  async obtener<T>(clave: string): Promise<T | undefined> {
    const registro = await this.db.catalogos.get(clave);
    return registro?.valor as T | undefined;
  }

  async guardar(clave: string, valor: unknown): Promise<void> {
    await this.db.catalogos.put({
      clave,
      valor,
      actualizadoEn: new Date().toISOString(),
    });
  }
}
