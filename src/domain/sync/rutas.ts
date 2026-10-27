export function sanitizarNombreArchivo(nombre: string): string {
  return nombre.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
}

export function rutaCarpeta(anio: number, servicioId: string): string {
  const carpeta = ${anio}/;
  return carpeta.replace(/\\/g, '/');
}

export function nombreArchivo(servicioId: string, tipo: string, original: string): string {
  const extension = original.includes('.') ? original.split('.').pop() : '';
  const nombreBase = sanitizarNombreArchivo(tipo.replace(/\s+/g, '-'));
  if (extension) {
    return ${servicioId}-.;
  }
  return ${servicioId}-;
}
