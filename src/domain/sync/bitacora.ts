/** Límite de la columna `Errores` de `LogSincronizacion` (Modelo de datos §6.4). */
export const MAX_ERRORES_LOG = 4000;

export interface ErrorBitacora {
  readonly servicioId: string;
  readonly codigo: string;
  readonly mensaje: string;
}

/**
 * Serializa los errores de una ejecución como JSON válido de hasta 4000 caracteres.
 * Si no caben todos, conserva los primeros y agrega `{ "omitidos": n }` al final.
 */
export function resumirErroresLog(
  errores: readonly ErrorBitacora[],
  maximo: number = MAX_ERRORES_LOG
): string {
  const completo = JSON.stringify(errores);
  if (completo.length <= maximo) return completo;

  for (let incluidos = errores.length - 1; incluidos >= 0; incluidos -= 1) {
    const texto = JSON.stringify([
      ...errores.slice(0, incluidos),
      { omitidos: errores.length - incluidos },
    ]);
    if (texto.length <= maximo) return texto;
  }
  return '[]';
}
