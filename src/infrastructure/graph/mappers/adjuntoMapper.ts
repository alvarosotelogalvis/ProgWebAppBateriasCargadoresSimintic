import { v4 as uuid } from 'uuid';

import type { Adjunto, TipoAdjunto } from '@/domain/adjunto';

interface DriveItem {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly webUrl: string;
  readonly thumbnails?: Array<{
    readonly small?: { readonly url: string };
    readonly medium?: { readonly url: string };
  }>;
}

const MIME_TYPES: Record<TipoAdjunto, string> = {
  FOTO_INGRESO: 'image/jpeg',
  FOTO_SALIDA: 'image/jpeg',
  FORMATO_DIAGNOSTICO: 'application/pdf',
  DISPOSICION_FINAL: 'application/pdf',
  COTIZACION: 'application/pdf',
  FACTURA: 'application/pdf',
};

/**
 * Mapea un drive item (archivo remoto) a un adjunto local.
 * Crea un adjunto sin blob (remoto, para descarga posterior).
 * (T-007, T-009)
 */
export function adjuntoMapper(
  driveItem: DriveItem,
  servicioId: string,
  tipo: TipoAdjunto
): Adjunto {
  return {
    id: uuid(),
    servicioId,
    tipo,
    nombreArchivo: driveItem.name,
    mime: MIME_TYPES[tipo],
    tamanoBytes: driveItem.size,
    sha256: '', // No disponible en el lado remoto
    capturadoEn: new Date().toISOString(),
    capturadoPor: '', // No disponible
    blob: null, // Es remoto, no local
    miniatura: null, // Se descargará después
    sp: {
      driveItemId: driveItem.id,
      webUrl: driveItem.webUrl,
      eTag: '', // Se obtendría en la descarga
    },
    syncState: 'synced',
    eliminarRemoto: false,
  };
}
