import type { UnidadDeTrabajo } from '@/application/ports/unidadDeTrabajo';
import type { Servicio } from '@/domain/servicio';

export interface ResultadoReintento {
  reintentados: string[];
}

export interface DepsReintentarErrores {
  readonly uow: UnidadDeTrabajo;
}

/**
 * "Reintentar errores" (ES-009-16): devuelve a la cola todos los servicios en error,
 * reiniciando intentos y espera. No sincroniza: la subida ocurre en la siguiente
 * sincronización. No toca conflictos (requieren decisión del usuario).
 */
export async function reintentarErrores(deps: DepsReintentarErrores): Promise<ResultadoReintento> {
  return deps.uow.ejecutar(async ({ servicios }) => {
    const reintentados: string[] = [];
    for (const actual of await servicios.listarTodos()) {
      if (actual.syncState !== 'error') continue;
      const guardado: Servicio = { ...actual, syncState: 'pending', intentos: 0 };
      delete guardado.proximoIntentoEn;
      delete guardado.ultimoError;
      await servicios.guardar(guardado);
      reintentados.push(actual.id);
    }
    return { reintentados };
  });
}
