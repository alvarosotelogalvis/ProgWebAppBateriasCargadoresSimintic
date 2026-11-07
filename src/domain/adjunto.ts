import type { EstadoServicio, SyncState, TipoAdjunto } from './servicio';

export interface DatosRemotosAdjunto {
  driveItemId: string;
  webUrl: string;
  eTag: string;
}

export interface SesionSubida {
  url: string;
  expira: string;
  siguienteByte: number;
}

export interface Adjunto {
  id: string;
  servicioId: string;
  tipo: TipoAdjunto;
  nombreArchivo: string;
  mime: string;
  tamanoBytes: number;
  sha256: string;
  capturadoEn: string;
  capturadoPor: string;
  blob: Blob | null;
  miniatura: Blob | null;
  sp?: DatosRemotosAdjunto;
  syncState: SyncState;
  sincronizadoEn?: string;
  eliminarRemoto: boolean;
  uploadSession?: SesionSubida;
}

export const ADJUNTO_POR_ETAPA: Readonly<Record<EstadoServicio, readonly TipoAdjunto[]>> = {
  BORRADOR: [],
  RECIBIDO: ['FOTO_INGRESO'],
  DIAGNOSTICADO: ['FORMATO_DIAGNOSTICO'],
  COTIZADO: ['COTIZACION'],
  EN_REPARACION: [],
  ENTREGADO: ['FOTO_SALIDA'],
  FACTURADO: ['FACTURA'],
  DISPOSICION_FINAL: ['FORMATO_DIAGNOSTICO', 'DISPOSICION_FINAL'],
  ANULADO: [],
  DESCONOCIDO: [],
};
