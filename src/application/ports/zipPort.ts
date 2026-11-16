export interface ArchivoEnZip {
  ruta: string;
  contenido: Blob | string;
  tipo?: string;
}

/** Empaquetado de respaldos en ZIP. */
export interface ZipPort {
  empaquetar(archivos: ArchivoEnZip[]): Promise<Blob>;
  /** Lanza si el contenido no es un ZIP válido. */
  desempaquetar(blob: Blob): Promise<ArchivoEnZip[]>;
  estimarTamano(archivos: ArchivoEnZip[]): number;
  leerTexto(blob: Blob): Promise<string>;
}
