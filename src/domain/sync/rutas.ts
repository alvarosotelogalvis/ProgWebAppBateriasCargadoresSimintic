import { AppError } from '../../shared/errors';
import type { Adjunto } from '../adjunto';
import type { Servicio } from '../servicio';

const CARACTERES_NO_PERMITIDOS = /["*:<>?/\\|#%]/g;

const EXTENSION_POR_MIME: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/** Reemplaza los caracteres no permitidos en nombres de archivo de SharePoint. */
export function sanitizarNombreArchivo(nombre: string): string {
  return nombre.replace(CARACTERES_NO_PERMITIDOS, '-').replace(/\s+/g, ' ').trim();
}

export type ServicioRuta = Pick<Servicio, 'id' | 'codigo' | 'fechaRecepcion'>;
export type AdjuntoRuta = Pick<Adjunto, 'id' | 'tipo' | 'nombreArchivo' | 'mime'>;

/**
 * Carpeta determinista de los adjuntos de un servicio (Modelo de datos §3.2):
 * `{yyyy de fechaRecepcion}/{ServicioId}`.
 */
export function rutaCarpeta(servicio: Pick<Servicio, 'id' | 'fechaRecepcion'>): string {
  const anio = servicio.fechaRecepcion.slice(0, 4);
  if (!/^\d{4}$/.test(anio)) {
    throw new AppError({
      codigo: 'VALIDACION',
      mensaje: `Fecha de recepción inválida: ${servicio.fechaRecepcion}`,
    });
  }
  return `${anio}/${servicio.id}`;
}

function extensionDe(adjunto: Pick<Adjunto, 'nombreArchivo' | 'mime'>): string {
  const desdeNombre = /\.([A-Za-z0-9]+)$/.exec(adjunto.nombreArchivo);
  if (desdeNombre?.[1]) return desdeNombre[1].toLowerCase();
  return EXTENSION_POR_MIME[adjunto.mime] ?? 'bin';
}

/**
 * Nombre determinista del archivo (Modelo de datos §3.2):
 * `{codigo}_{TIPO}_{primeros 8 caracteres de AdjuntoId}.{ext}`.
 */
export function nombreArchivo(
  servicio: Pick<Servicio, 'codigo'>,
  adjunto: Pick<Adjunto, 'id' | 'tipo' | 'nombreArchivo' | 'mime'>
): string {
  const idCorto = adjunto.id.replace(/-/g, '').slice(0, 8) || adjunto.id.slice(0, 8);
  const extension = extensionDe(adjunto);
  return sanitizarNombreArchivo(`${servicio.codigo}_${adjunto.tipo}_${idCorto}.${extension}`);
}
