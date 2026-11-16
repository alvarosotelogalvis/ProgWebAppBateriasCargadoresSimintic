import type { BorradoLocalPort } from '@/application/ports/borradoLocalPort';
import type { AppDB } from './dexie';

export class BorradoLocalDexie implements BorradoLocalPort {
  constructor(private readonly db: AppDB) {}

  contarLogs(): Promise<number> {
    return this.db.logs.count();
  }

  async vaciarTodo(): Promise<void> {
    await this.db.transaction('rw', this.db.servicios, this.db.adjuntos, this.db.logs, async () => {
      await this.db.servicios.clear();
      await this.db.adjuntos.clear();
      await this.db.logs.clear();
    });
  }
}
