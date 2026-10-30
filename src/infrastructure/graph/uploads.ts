import { aAppError } from '@/shared/errors';

import type { GraphClient } from './graphClient';

export interface UploadOptions {
  readonly onProgress?: (bytesEnviados: number, bytesTotales: number) => void;
  readonly signal?: AbortSignal;
}

export interface ItemSubido {
  readonly id?: string;
  readonly '@odata.etag'?: string;
  readonly [clave: string]: unknown;
}

export async function subirArchivo(
  uploadUrl: string,
  archivo: Blob,
  opciones: UploadOptions = {}
): Promise<ItemSubido> {
  if (archivo.size <= 4 * 1024 * 1024) {
    const respuesta = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': archivo.type || 'application/octet-stream' },
      body: archivo,
      ...(opciones.signal ? { signal: opciones.signal } : {}),
    });
    if (!respuesta.ok) {
      throw aAppError(new Error('upload failed'));
    }
    return respuesta.json();
  }

  const fragmentSize = 3200 * 1024;
  const total = archivo.size;
  for (let start = 0; start < total; start += fragmentSize) {
    const end = Math.min(start + fragmentSize, total);
    const chunk = archivo.slice(start, end);
    const respuesta = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': 'bytes ' + start + '-' + (end - 1) + '/' + total,
        'Content-Length': String(chunk.size),
        'Content-Type': archivo.type || 'application/octet-stream',
      },
      body: chunk,
      ...(opciones.signal ? { signal: opciones.signal } : {}),
    });
    if (opciones.onProgress) {
      opciones.onProgress(end, total);
    }
    if (!respuesta.ok && respuesta.status !== 202) {
      throw aAppError(new Error('upload failed'));
    }
    if (respuesta.status === 200 || respuesta.status === 201) {
      return respuesta.json();
    }
  }
  throw aAppError(new Error('upload incomplete'));
}

export async function crearUploadSession(
  driveId: string,
  nombreArchivo: string,
  graphClient: GraphClient
): Promise<{ uploadUrl: string; expirationDateTime: string }> {
  const respuesta = await graphClient.enviar<{ uploadUrl: string; expirationDateTime: string }>({
    metodo: 'POST',
    ruta: `/drives/${driveId}/root:/${encodeURIComponent(nombreArchivo)}:/createUploadSession`,
    cuerpo: {},
  });
  return respuesta.datos;
}
