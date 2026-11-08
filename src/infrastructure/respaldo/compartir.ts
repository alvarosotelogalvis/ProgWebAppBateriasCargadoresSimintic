/**
 * Manejo de compartir respaldo vía Web Share API o descarga
 * Referencia: ADR-0022, UX §5
 */

export async function compartirRespaldo(
  blob: Blob,
  nombreArchivo: string
): Promise<'compartido' | 'descargado' | 'cancelado'> {
  const archivo = new File([blob], nombreArchivo, { type: 'application/zip' });

  // Verificar si Web Share API está disponible
  if (typeof navigator === 'undefined' || !navigator.canShare) {
    return descargarRespaldo(blob, nombreArchivo);
  }

  try {
    const puedeCompartir = navigator.canShare({ files: [archivo] });
    if (!puedeCompartir) {
      return descargarRespaldo(blob, nombreArchivo);
    }

    await navigator.share({
      files: [archivo],
      title: 'Respaldo de servicios',
      text: `Respaldo exportado: ${nombreArchivo}`,
    });

    return 'compartido';
  } catch (error) {
    // AbortError = usuario canceló
    if (error instanceof Error && error.name === 'AbortError') {
      return 'cancelado';
    }
    // Fallback a descarga si hay otro error
    return descargarRespaldo(blob, nombreArchivo);
  }
}

export function descargarRespaldo(blob: Blob, nombreArchivo: string): 'descargado' {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);

  return 'descargado';
}
