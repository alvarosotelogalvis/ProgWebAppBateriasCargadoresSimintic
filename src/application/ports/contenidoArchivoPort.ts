/** Lectura de archivos (`Blob`) que necesita la aplicación: huella y bytes. */
export interface ContenidoArchivoPort {
  /** Huella SHA-256 en hexadecimal. */
  sha256(blob: Blob): Promise<string>;
  /** Bytes del archivo (p. ej. para comprobar la firma de un PDF). */
  leerBytes(blob: Blob): Promise<ArrayBuffer>;
}
