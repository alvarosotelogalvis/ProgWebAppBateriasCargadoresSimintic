import Dexie from 'dexie';

import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { RepositoriosTransaccion, UnidadDeTrabajo } from '@/application/ports/unidadDeTrabajo';
import { traducirErrorDb } from '@/shared/errors';
import type { AppDB } from './dexie';

export class UnidadDeTrabajoDexie implements UnidadDeTrabajo {
  constructor(
    private readonly db: AppDB,
    private readonly servicios: ServicioRepository,
    private readonly adjuntos: AdjuntoRepository
  ) {}

  async ejecutar<T>(fn: (repos: RepositoriosTransaccion) => Promise<T>): Promise<T> {
    try {
      return await this.db.transaction('rw', this.db.servicios, this.db.adjuntos, () =>
        fn({ servicios: this.servicios, adjuntos: this.adjuntos })
      );
    } catch (error) {
      if (error instanceof Dexie.DexieError) {
        throw traducirErrorDb(error);
      }
      throw error;
    }
  }
}
