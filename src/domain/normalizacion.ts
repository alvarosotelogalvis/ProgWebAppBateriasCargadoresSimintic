export const normalizarSerie = (serie: string): string => {
  if (!serie) return ''
  // quitar espacios
  let s = serie.trim()
  // eliminar espacios internos múltiples
  s = s.replace(/\s+/g, '')
  return s.toUpperCase()
}

export const normalizarReferencia = (referencia: string): string => {
  if (!referencia) return ''
  return referencia.trim().toUpperCase()
}

export const normalizarMarca = (marca: string): string => {
  if (!marca) return ''
  return marca.trim()
}
