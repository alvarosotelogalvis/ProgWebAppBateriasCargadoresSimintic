import type { Adjunto } from '@/domain/adjunto';
import type { TipoAdjunto } from '@/domain/servicio';

export interface AdjuntoRepository {
  obtener(id: string): Promise<Adjunto | undefined>;
  listarPorServicio(servicioId: string): Promise<Adjunto[]>;
  listarTodos(): Promise<Adjunto[]>;
  buscarPorHash(
    servicioId: string,
    tipo: TipoAdjunto,
    sha256: string
  ): Promise<Adjunto | undefined>;
  guardar(adjunto: Adjunto): Promise<void>;
  eliminarLocal(id: string): Promise<void>;
  eliminarPorServicio(servicioId: string): Promise<number>;
  marcarPendientes(servicioId: string): Promise<number>;
  purgarOriginales(sincronizadosAntesDe: string): Promise<number>;
}
