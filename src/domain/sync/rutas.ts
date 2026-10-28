export function sanitizarNombreArchivo(nombre: string): string {
  return nombre.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

export function rutaCarpeta(anio: number, servicioId: string): string {
  const carpeta = String(anio) + '/' + servicioId;
  return carpeta.replace(/\\/g, '/');
}

export function nombreArchivo(servicioId: string, tipo: string, original: string): string {
  const partes = original.split('.');
  const extension = partes.length > 1 ? partes[partes.length - 1] : '';
  const nombreBase = sanitizarNombreArchivo(tipo.replace(/\s+/g, '-'));
  if (extension) {
    return servicioId + '-' + nombreBase + '.' + extension.toLowerCase();
  }
  return servicioId + '-' + nombreBase;
}
