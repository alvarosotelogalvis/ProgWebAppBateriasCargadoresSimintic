import type { Etapa, SyncState } from './servicio'

export type TipoAdjunto = 'FOTO' | 'PDF'

export type AdjuntoPorEtapa = Record<Etapa, boolean>

export const ADJUNTO_POR_ETAPA: AdjuntoPorEtapa = {
  RECEPCION: true,
  DIAGNOSTICO: true,
  COTIZACION: true,
  REPARACION: true,
  PRUEBAS: true,
  ENTREGA: true,
  ANULADO: true,
  DISPOSICION_FINAL: true,
}

export type Adjunto = {
  AdjuntoId: string
  ServicioId: string
  tipo: TipoAdjunto
  etapa: Etapa
  nombreArchivo: string
  mimeType: string
  tamanoBytes: number
  hashSha256: string
  blob?: Blob
  miniaturaBlob?: Blob
  rutaRemota?: string
  syncState: SyncState
  subidoPor: string
  subidoEn: string
  camposSucios: string[]
  remotoId?: string
}
