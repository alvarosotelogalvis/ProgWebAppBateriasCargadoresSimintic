/** Quita espacios (incluidos los internos) y pasa a mayúsculas. */
export const normalizarCodigoAlfanumerico = (valor: string): string => {
  if (!valor) return '';
  return valor.trim().replace(/\s+/g, '').toUpperCase();
};

/** Recorta, colapsa espacios internos y pasa a mayúsculas. */
export const normalizarMarca = (valor: string): string => {
  if (!valor) return '';
  return valor.trim().replace(/\s+/g, ' ').toUpperCase();
};

export const normalizarSerie = (valor: string): string => normalizarCodigoAlfanumerico(valor);

export const normalizarReferencia = (valor: string): string => normalizarCodigoAlfanumerico(valor);

export const normalizarCamposRecepcion = <
  T extends { marca?: string; referencia?: string; serie?: string },
>(
  campos: T
): T => {
  const resultado: T = { ...campos };
  if (typeof campos.marca === 'string') resultado.marca = normalizarMarca(campos.marca);
  if (typeof campos.referencia === 'string')
    resultado.referencia = normalizarReferencia(campos.referencia);
  if (typeof campos.serie === 'string') resultado.serie = normalizarSerie(campos.serie);
  return resultado;
};
