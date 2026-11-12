export interface ArchivoEnZip {
  ruta: string;
  contenido: Blob | string;
  tipo?: string;
}

export async function empaquetar(archivos: ArchivoEnZip[]): Promise<Blob> {
  // Nota: Este es un stub. Implementación real requiere librería de ZIP
  // como 'jszip' o 'fflate'. Para esta sesión, creamos una estructura JSON comprimida.

  const manifiesto = {
    version: '1.0.0',
    fecha: new Date().toISOString(),
    archivos: archivos.map((a) => ({
      ruta: a.ruta,
      tipo: a.tipo || 'application/octet-stream',
    })),
  };

  // Crear un contenedor JSON simple (será reemplazado por ZIP real)
  const contenedor = {
    _manifiesto: manifiesto,
    _archivos: {} as Record<string, string>,
  };

  for (const archivo of archivos) {
    if (typeof archivo.contenido === 'string') {
      contenedor._archivos[archivo.ruta] = archivo.contenido;
    } else {
      // Para blobs, convertir a base64
      const reader = new FileReader();
      contenedor._archivos[archivo.ruta] = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(archivo.contenido as Blob);
      });
    }
  }

  const json = JSON.stringify(contenedor);
  return new Blob([json], { type: 'application/json' });
}

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

export async function desempaquetar(blob: Blob): Promise<ArchivoEnZip[]> {
  const texto = await leerTexto(blob);
  const contenedor = JSON.parse(texto);

  const archivos: ArchivoEnZip[] = [];

  if (!contenedor._manifiesto || !contenedor._archivos) {
    throw new Error('Formato de respaldo no válido');
  }

  for (const archivo of contenedor._manifiesto.archivos) {
    const contenido = contenedor._archivos[archivo.ruta];
    if (!contenido) continue;

    archivos.push({
      ruta: archivo.ruta,
      contenido,
      tipo: archivo.tipo,
    });
  }

  return archivos;
}

export function estimarTamano(archivos: ArchivoEnZip[]): number {
  let bytes = 0;

  for (const archivo of archivos) {
    if (typeof archivo.contenido === 'string') {
      bytes += new Blob([archivo.contenido]).size;
    } else {
      bytes += archivo.contenido.size;
    }
  }

  // Agregar ~10% por overhead de compresión y metadatos
  return Math.ceil((bytes * 110) / 100);
}
