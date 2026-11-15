import type { Servicio } from '@/domain/servicio';

export interface ServicioRepository {
  obtener(id: string): Promise<Servicio | undefined>;
  guardar(servicio: Servicio): Promise<void>;
  listarPendientes(): Promise<Servicio[]>;
  buscarPorSpItemId(itemId: string): Promise<Servicio | undefined>;
  buscarPorSerie(serie: string): Promise<Servicio[]>;
  eliminarBorrador(id: string): Promise<void>;
  /** Borra un servicio ya sincronizado y sin cambios pendientes (con sus adjuntos). `false` si no cumple. */
  eliminarSincronizado(id: string): Promise<boolean>;
  purgarCerrados(antesDe: string): Promise<number>;
}
