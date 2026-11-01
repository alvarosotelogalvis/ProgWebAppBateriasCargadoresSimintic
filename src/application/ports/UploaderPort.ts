import type { SesionSubida } from '@/domain/adjunto';

export interface ItemSubido {
  readonly id: string;
  readonly eTag?: string;
  readonly webUrl?: string;
  readonly nombre?: string;
}

export interface OpcionesSubida {
  /** Progreso acumulado del archivo completo (no solo del fragmento). */
  readonly onProgreso?: (bytesEnviados: number, bytesTotales: number) => void;
  readonly signal?: AbortSignal;
  /** Sesión persistida de una subida anterior para reanudar. */
  readonly sesion?: SesionSubida;
  /**
   * Persiste el avance después de cada fragmento confirmado. Se llama con
   * `null` cuando la subida termina o la sesión deja de ser válida.
   */
  readonly onSesion?: (sesion: SesionSubida | null) => void | Promise<void>;
}

/** Sube un archivo a la biblioteca con nombre determinista y reemplazo idempotente. */
export interface Uploader {
  subir(archivo: Blob, ruta: string, opciones?: OpcionesSubida): Promise<ItemSubido>;
}
