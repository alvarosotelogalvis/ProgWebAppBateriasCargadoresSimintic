import {
  ejecutarPreparacion,
  type DepsSetup,
  type EstadoTarea,
  type ResultadoPreparacion,
} from './configuracionInicial';

/**
 * Repite la configuracion desde Mas > Configuracion inicial (FR-004-17).
 * Reemplaza sitio, catalogs y configuracion; nunca borra servicios ni adjuntos.
 */
export async function refrescarCatalogos(
  deps: DepsSetup,
  onEstado: (estado: EstadoTarea) => void = () => undefined
): Promise<ResultadoPreparacion> {
  return ejecutarPreparacion(deps, onEstado);
}
