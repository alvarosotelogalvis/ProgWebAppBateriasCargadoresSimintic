import { aAppError } from '@/shared/errors';

export interface UploadOptions {
  readonly onProgress?: (bytesEnviados: number, bytesTotales: number) => void;
  readonly signal?: AbortSignal;
}

export async function subirArchivo(
  uploadUrl: string,
  archivo: Blob,
  opciones: UploadOptions = {}
): Promise<any> {
  if (archivo.size <= 4 * 1024 * 1024) {
    const respuesta = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': archivo.type || 'application/octet-stream' },
      body: archivo,
      signal: opciones.signal,
    });
    if (!respuesta.ok) {
      throw aAppError(new Error('upload failed'));
    }
    return respuesta.json();
  }

  const fragmentSize = 3 * 200 * 1024;
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
      signal: opciones.signal,
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
  graphClient: any
): Promise<{ uploadUrl: string; expirationDateTime: string }> {
  const respuesta = await graphClient.post(
    '/drives/' + driveId + '/root:/' + encodeURIComponent(nombreArchivo) + ':/createUploadSession',
    {}
  );
  return respuesta;
}
