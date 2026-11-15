import type { RemotoCambio } from '@/domain/sync/remoto';

export interface CambiosServicios {
  readonly cambios: readonly RemotoCambio[];
  /** Punto de continuación para la próxima descarga incremental. */
  readonly deltaLink?: string;
  /** Cómo se obtuvieron los cambios (se muestra en el menú técnico). */
  readonly metodo: 'delta' | 'completa';
}

export interface ArchivoRemotoServicio {
  readonly id: string;
  readonly nombre: string;
  readonly tamanoBytes: number;
  readonly webUrl: string;
  readonly eTag?: string;
}

/**
 * Operaciones de lectura que necesita el pull (SDD §9.2, spec 006).
 * El adaptador devuelve los datos ya traducidos al dominio.
 */
export interface RemoteGatewayPull {
  /** Cambios de la lista Servicios desde `deltaLink` (o todos si no hay). */
  cambiosServicios(deltaLink?: string, signal?: AbortSignal): Promise<CambiosServicios>;
  /** Lee un servicio por su `ServicioId`; `null` si no existe. */
  leerServicioRemoto(servicioId: string, signal?: AbortSignal): Promise<RemotoCambio | null>;
  /** Archivos de la carpeta de adjuntos (`yyyy/ServicioId`); vacío si la carpeta no existe. */
  listarArchivosServicio(
    carpeta: string,
    signal?: AbortSignal
  ): Promise<readonly ArchivoRemotoServicio[]>;
  /** Miniatura de un archivo; `null` si SharePoint no tiene una. */
  descargarMiniatura(driveItemId: string, signal?: AbortSignal): Promise<Blob | null>;
}
