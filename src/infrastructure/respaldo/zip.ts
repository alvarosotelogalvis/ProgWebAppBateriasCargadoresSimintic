import { unzipSync, zipSync, type Zippable } from 'fflate';

import type { ArchivoEnZip, ZipPort } from '@/application/ports/zipPort';

export type { ArchivoEnZip };

/** `Blob.text()` con alternativa para entornos sin esa API (p. ej. jsdom, navegadores antiguos). */
export const leerTexto = (blob: Blob): Promise<string> => {
  if (typeof blob.text === 'function') return blob.text();
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error);
    lector.readAsText(blob);
  });
};

/** `Blob.arrayBuffer()` con la misma alternativa. */
const leerBytes = async (blob: Blob): Promise<Uint8Array> => {
  if (typeof blob.arrayBuffer === 'function') return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(new Uint8Array(lector.result as ArrayBuffer));
    lector.onerror = () => reject(lector.error);
    lector.readAsArrayBuffer(blob);
  });
};

const TIPOS: Readonly<Record<string, string>> = {
  json: 'application/json',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  txt: 'text/plain',
};

const tipoDeRuta = (ruta: string): string => {
  const extension = /\.([A-Za-z0-9]+)$/.exec(ruta)?.[1]?.toLowerCase() ?? '';
  return TIPOS[extension] ?? 'application/octet-stream';
};

const codificador = new TextEncoder();

/**
 * Crea un ZIP real. Las fotos y los PDF ya vienen comprimidos, por eso solo se comprime
 * (nivel 6) el texto; el resto se almacena tal cual.
 */
export async function empaquetar(archivos: ArchivoEnZip[]): Promise<Blob> {
  const entradas: Zippable = {};
  for (const archivo of archivos) {
    const esTexto = typeof archivo.contenido === 'string';
    const bytes = esTexto
      ? codificador.encode(archivo.contenido as string)
      : await leerBytes(archivo.contenido as Blob);
    entradas[archivo.ruta] = [bytes, { level: esTexto ? 6 : 0 }];
  }
  const zip = zipSync(entradas);
  return new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}

/**
 * Lee un ZIP. Cada archivo vuelve como `Blob` con el tipo deducido de su extensión.
 * Lanza si el contenido no es un ZIP válido.
 */
export async function desempaquetar(blob: Blob): Promise<ArchivoEnZip[]> {
  let contenido: Record<string, Uint8Array>;
  try {
    contenido = unzipSync(await leerBytes(blob));
  } catch (causa) {
    throw new Error('El archivo no es un respaldo válido', { cause: causa });
  }
  return Object.entries(contenido)
    .filter(([ruta]) => !ruta.endsWith('/'))
    .map(([ruta, bytes]) => {
      const tipo = tipoDeRuta(ruta);
      return {
        ruta,
        contenido: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: tipo }),
        tipo,
      };
    });
}

export function estimarTamano(archivos: ArchivoEnZip[]): number {
  let bytes = 0;
  for (const archivo of archivos) {
    bytes +=
      typeof archivo.contenido === 'string'
        ? codificador.encode(archivo.contenido).byteLength
        : archivo.contenido.size;
  }
  return bytes;
}

/** Adaptador del puerto `ZipPort` con fflate. */
export const zipFflate: ZipPort = { empaquetar, desempaquetar, estimarTamano, leerTexto };
