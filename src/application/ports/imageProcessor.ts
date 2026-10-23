export interface ImagenProcesada {
  readonly principal: Blob;
  readonly miniatura: Blob;
  readonly mime: string;
  readonly ancho: number;
  readonly alto: number;
}

export interface OpcionesProcesamiento {
  readonly maxLadoPx: number;
  readonly calidad: number;
  readonly ladoMiniaturaPx: number;
}

export interface ImageProcessor {
  procesar(archivo: Blob, opciones: OpcionesProcesamiento): Promise<ImagenProcesada>;
}
