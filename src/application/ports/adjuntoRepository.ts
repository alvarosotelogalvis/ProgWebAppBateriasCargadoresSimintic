import type { Adjunto } from '@/domain/adjunto'

export interface AdjuntoRepository {
  guardar(adjunto: Adjunto): Promise<void>
  obtenerPorServicio(servicioId: string): Promise<Adjunto[]>
  buscarPorHash(hash: string): Promise<Adjunto | undefined>
  marcarPendientes(servicioId: string): Promise<void>
  purgarOriginales(fechaLimiteIso: string): Promise<number>
  eliminarPorServicio(servicioId: string): Promise<number>
}
