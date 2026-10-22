import type { ServicioRepository } from '@/application/ports/servicioRepository'
import type { Servicio } from '@/domain/servicio'
import type { AppDB } from './dexie'
import { BorradorNoEliminableError } from '@/domain/errores'

export class ServicioRepositoryDexie implements ServicioRepository {
  constructor(private db: AppDB) {}

  async guardar(servicio: Servicio): Promise<void> {
    await this.db.servicios.put(servicio)
  }

  async obtenerPorId(id: string): Promise<Servicio | undefined> {
    return this.db.servicios.get(id)
  }

  async buscarPorSerie(serie: string): Promise<Servicio | undefined> {
    // búsqueda simple por equipo.serie normalizada no aplicada aquí
    const servicios = await this.db.servicios.toArray()
    const serieNorm = serie.replace(/\s+/g, '').toUpperCase()
    return servicios.find((s) => s.equipo.serie.replace(/\s+/g, '').toUpperCase() === serieNorm)
  }

  async listarPendientes(): Promise<Servicio[]> {
    const todos = await this.db.servicios.toArray()
    return todos.filter((s) => s.syncState === 'pending' && s.Estado !== 'BORRADOR')
  }

  async eliminarBorrador(id: string): Promise<void> {
    const servicio = await this.db.servicios.get(id)
    if (!servicio) return
    if (servicio.Estado !== 'BORRADOR') {
      throw new BorradorNoEliminableError({ ServicioId: id })
    }
    await this.db.servicios.delete(id)
  }

  async purgarCerrados(fechaLimiteIso: string): Promise<number> {
    const todos = await this.db.servicios.toArray()
    const aEliminar = todos.filter((s) => {
      if (s.syncState !== 'synced') return false
      if (s.Estado === 'BORRADOR') return false
      const estadoFinal = ['ENTREGADO', 'FACTURADO', 'ANULADO', 'DISPOSICION_FINAL'].includes(s.Estado)
      if (!estadoFinal) return false
      const actualizado = s.actualizadoEn || s.sincronizadoEn || s.creadoEn
      return actualizado < fechaLimiteIso
    })
    await this.db.servicios.bulkDelete(aEliminar.map((s) => s.ServicioId))
    return aEliminar.length
  }
}
