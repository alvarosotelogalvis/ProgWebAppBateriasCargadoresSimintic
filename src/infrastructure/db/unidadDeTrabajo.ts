import type { UnidadDeTrabajo } from '@/application/ports/unidadDeTrabajo'
import type { ServicioRepository } from '@/application/ports/servicioRepository'
import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository'
import { traducirErrorDb } from '@/shared/errors'

export class UnidadDeTrabajoDexie implements UnidadDeTrabajo {
  constructor(
    private db: import('./dexie').AppDB,
    private servicios: ServicioRepository,
    private adjuntos: AdjuntoRepository,
  ) {}

  async ejecutar<T>(
    fn: (repos: { servicios: ServicioRepository; adjuntos: AdjuntoRepository }) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction('rw', this.db.servicios, this.db.adjuntos, async () => {
      try {
        const resultado = await fn({ servicios: this.servicios, adjuntos: this.adjuntos })
        return resultado
      } catch (error) {
        throw traducirErrorDb(error)
      }
    })
  }
}
