import Dexie, { Table } from 'dexie'
import type { Servicio } from '@/domain/servicio'
import type { Adjunto } from '@/domain/adjunto'

export const ESQUEMA_V1 = {
  servicios: 'ServicioId, Estado, syncState, Folio, fechaRecepcion, *camposSucios',
  adjuntos: 'AdjuntoId, ServicioId, tipo, etapa, hashSha256, syncState',
  catalogos: 'clave',
  meta: 'clave',
}

export class AppDB extends Dexie {
  servicios!: Table<Servicio, string>
  adjuntos!: Table<Adjunto, string>
  catalogos!: Table<{ clave: string; valor: unknown }, string>
  meta!: Table<{ clave: string; valor: unknown }, string>

  constructor() {
    super('PWA_BateriasDB')
    this.version(1).stores(ESQUEMA_V1)
  }

  async abrir(): Promise<this> {
    try {
      await this.open()
      return this
    } catch (error) {
      const { traducirErrorDb } = await import('@/shared/errors')
      throw traducirErrorDb(error)
    }
  }
}
