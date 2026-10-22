import type { Servicio } from '@/domain/servicio'
import type { Adjunto } from '@/domain/adjunto'

export interface ServicioRepository {
  guardar(servicio: Servicio): Promise<void>
  obtenerPorId(id: string): Promise<Servicio | undefined>
  buscarPorSerie(serie: string): Promise<Servicio | undefined>
  listarPendientes(): Promise<Servicio[]>
  eliminarBorrador(id: string): Promise<void>
  purgarCerrados(fechaLimiteIso: string): Promise<number>
}
