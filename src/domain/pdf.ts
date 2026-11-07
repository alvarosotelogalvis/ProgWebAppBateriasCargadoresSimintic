/**
 * Verifica si un conjunto de bytes contiene la firma de un PDF (%PDF-)
 * Busca la firma dentro de los primeros ~1KB, permitiendo basura previa.
 * Esto detecta PDFs válidos y rechaaza archivos que no sean PDFs.
 */
export function esFirmaPdf(bytes: Uint8Array): boolean {
  // Buscar %PDF- dentro de los primeros 1024 bytes
  const slice = bytes.slice(0, 1024);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const texto = decoder.decode(slice);

  return texto.includes('%PDF-');
}

/**
 * Mapeo de tipos de MIME para PDFs
 */
export const MIME_TYPES_PDF = new Set(['application/pdf', 'application/x-pdf']);
