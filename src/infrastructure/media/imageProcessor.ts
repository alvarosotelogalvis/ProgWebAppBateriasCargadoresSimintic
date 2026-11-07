import type {
  ImageProcessor,
  ImagenProcesada,
  OpcionesProcesamiento,
} from '@/application/ports/imageProcessor';
import { FormatoImagenError } from '@/domain/errores';

const MIMES_SOPORTADOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const PESO_OBJETIVO = 1024 * 1024;

interface ImagenCargada {
  readonly imagen: ImageBitmap | HTMLImageElement;
  readonly liberar?: () => void;
}

const cargarImagen = async (archivo: Blob): Promise<ImagenCargada> => {
  if (typeof createImageBitmap === 'function') {
    try {
      return {
        imagen: await createImageBitmap(archivo, { imageOrientation: 'from-image' }),
      };
    } catch {
      // Algunos navegadores no aceptan la opcion; se reintenta sin ella.
    }
    try {
      return { imagen: await createImageBitmap(archivo) };
    } catch {
      // Sin createImageBitmap disponible para este formato; se usa el elemento img.
    }
  }

  const url = URL.createObjectURL(archivo);
  const imagen = new Image();
  imagen.src = url;
  try {
    await imagen.decode();
    return { imagen, liberar: () => URL.revokeObjectURL(url) };
  } catch (causa) {
    URL.revokeObjectURL(url);
    throw causa;
  }
};

const dimensiones = (imagen: ImageBitmap | HTMLImageElement): { ancho: number; alto: number } =>
  imagen instanceof HTMLImageElement
    ? { ancho: imagen.naturalWidth, alto: imagen.naturalHeight }
    : { ancho: imagen.width, alto: imagen.height };

const dibujar = (imagen: ImageBitmap | HTMLImageElement, maxLadoPx: number): HTMLCanvasElement => {
  const { ancho, alto } = dimensiones(imagen);
  const factor = Math.min(1, maxLadoPx / Math.max(ancho, alto));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(ancho * factor));
  canvas.height = Math.max(1, Math.round(alto * factor));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new FormatoImagenError('canvas-no-disponible');
  ctx.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const aBlob = (canvas: HTMLCanvasElement, calidad: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new FormatoImagenError('codificacion'));
      },
      'image/jpeg',
      calidad
    );
  });

/** Convierte a JPEG, limita el lado mayor y reduce la calidad hasta acercarse a 1 MB. */
export class ImageProcessorCanvas implements ImageProcessor {
  async procesar(archivo: Blob, opciones: OpcionesProcesamiento): Promise<ImagenProcesada> {
    if (!MIMES_SOPORTADOS.has(archivo.type.toLowerCase())) {
      throw new FormatoImagenError(archivo.type || 'desconocido');
    }

    const cargada = await cargarImagen(archivo);
    const { imagen } = cargada;
    try {
      const canvas = dibujar(imagen, opciones.maxLadoPx);
      let calidad = opciones.calidad;
      let principal = await aBlob(canvas, calidad);
      while (principal.size > PESO_OBJETIVO && calidad > 0.4) {
        calidad = Math.max(0.4, calidad - 0.1);
        principal = await aBlob(canvas, calidad);
      }

      const miniatura = await aBlob(dibujar(imagen, opciones.ladoMiniaturaPx), 0.7);
      return {
        principal,
        miniatura,
        mime: 'image/jpeg',
        ancho: canvas.width,
        alto: canvas.height,
      };
    } finally {
      if ('close' in imagen && typeof imagen.close === 'function') imagen.close();
      cargada.liberar?.();
    }
  }
}
