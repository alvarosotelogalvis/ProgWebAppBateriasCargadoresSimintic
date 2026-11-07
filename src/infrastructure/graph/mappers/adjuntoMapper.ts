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

/**
 * Mapea un drive item (archivo remoto) a un adjunto local.
 * Crea un adjunto sin blob (remoto) con miniatura si está disponible.
 * (T-007, T-009)
 */
export function adjuntoMapper(
  _driveItem: DriveItem,
  _servicioId: string,
  _tipo: TipoAdjunto
): Adjunto {
  // TODO: Implementar
  throw new Error('Not implemented');
}
