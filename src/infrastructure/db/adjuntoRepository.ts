import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository'
import type { Adjunto } from '@/domain/adjunto'
import type { AppDB } from './dexie'

export class AdjuntoRepositoryDexie implements AdjuntoRepository {
  constructor(private db: AppDB) {}

  async guardar(adjunto: Adjunto): Promise<void> {
    await this.db.adjuntos.put(adjunto)
  }

  async obtenerPorServicio(servicioId: string): Promise<Adjunto[]> {
    return this.db.adjuntos.where('ServicioId').equals(servicioId).toArray()
  }

  async buscarPorHash(hash: string): Promise<Adjunto | undefined> {
    return this.db.adjuntos.where('hashSha256').equals(hash).first()
  }

  async marcarPendientes(servicioId: string): Promise<void> {
    const adjuntos = await this.obtenerPorServicio(servicioId)
    await this.db.adjuntos.bulkPut(
      adjuntos.map((a) => ({ ...a, syncState: 'pending', camposSucios: [...(a.camposSucios || []), 'blob'] })),
    )
  }

  async purgarOriginales(fechaLimiteIso: string): Promise<number> {
    const todos = await this.db.adjuntos.toArray()
    const aPurgar = todos.filter((a) => {
      if (a.syncState !== 'synced') return false
      const fecha = a.subidoEn
      if (fecha >= fechaLimiteIso) return false
      return true
    })
    // mantener miniatura según regla
    let count = 0
    for (const adj of aPurgar) {
      if (adj.blob) {
        await this.db.adjuntos.put({ ...adj, blob: undefined })
        count += 1
      }
    }
    return count
  }

  async eliminarPorServicio(servicioId: string): Promise<number> {
    const adjuntos = await this.obtenerPorServicio(servicioId)
    await this.db.adjuntos.bulkDelete(adjuntos.map((a) => a.AdjuntoId))
    return adjuntos.length
  }
}
