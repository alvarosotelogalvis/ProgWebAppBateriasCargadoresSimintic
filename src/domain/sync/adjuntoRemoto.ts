import type { Adjunto } from '../adjunto';
import type { TipoAdjunto } from '../servicio';

export interface ArchivoRemoto {
  readonly id: string;
  readonly nombre: string;
  readonly tamanoBytes: number;
  readonly webUrl: string;
  readonly eTag?: string;
}

const TIPOS: readonly TipoAdjunto[] = [
  'FOTO_INGRESO',
  'FORMATO_DIAGNOSTICO',
  'DISPOSICION_FINAL',
  'COTIZACION',
  'FOTO_SALIDA',
  'FACTURA',
];

const MIME_POR_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

/**
 * Deduce el tipo del nombre determinista `{codigo}_{TIPO}_{id8}.{ext}` (Modelo de datos §3.2).
 * `undefined` si el archivo no sigue esa convención (p. ej. subido a mano).
 */
export function tipoDesdeNombreArchivo(nombre: string): TipoAdjunto | undefined {
  return TIPOS.find((tipo) => new RegExp(`_${tipo}_[A-Za-z0-9]+\\.[A-Za-z0-9]+$`).test(nombre));
}

export function mimeDesdeNombreArchivo(nombre: string): string {
  const extension = /\.([A-Za-z0-9]+)$/.exec(nombre)?.[1]?.toLowerCase() ?? '';
  return MIME_POR_EXTENSION[extension] ?? 'application/octet-stream';
}

/**
 * Adjunto local que representa un archivo que solo existe en SharePoint: sin `blob` y sin
 * miniatura hasta que se descargue (FR-006-12, FR-006-13).
 */
export function adjuntoDesdeArchivoRemoto(
  archivo: ArchivoRemoto,
  datos: { readonly id: string; readonly servicioId: string; readonly ahoraIso: string }
): Adjunto | undefined {
  const tipo = tipoDesdeNombreArchivo(archivo.nombre);
  if (tipo === undefined) return undefined;
  return {
    id: datos.id,
    servicioId: datos.servicioId,
    tipo,
    nombreArchivo: archivo.nombre,
    mime: mimeDesdeNombreArchivo(archivo.nombre),
    tamanoBytes: archivo.tamanoBytes,
    sha256: '',
    capturadoEn: datos.ahoraIso,
    capturadoPor: '',
    blob: null,
    miniatura: null,
    sp: {
      driveItemId: archivo.id,
      webUrl: archivo.webUrl,
      eTag: archivo.eTag ?? '',
    },
    syncState: 'synced',
    sincronizadoEn: datos.ahoraIso,
    eliminarRemoto: false,
  };
}
