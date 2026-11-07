import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { Clock } from '@/application/ports/clock';
import type { CamposServicio } from '@/domain/servicio';

/**
 * Elección del usuario para un campo en conflicto
 */
export interface Eleccion {
  readonly campo: keyof CamposServicio;
  readonly usar: 'LOCAL' | 'REMOTO';
}

/**
 * Aplica las elecciones del usuario para resolver conflictos.
 * - Valida que todas las elecciones estén presentes
 * - Aplica LOCAL: deja el campo sucio para reintentar en próxima sync
 * - Aplica REMOTO: limpia el campo (toma del base que tiene el valor remoto)
 * - Marca como pendiente para reintento
 * T-019
 */
export function crearResolverConflictos(deps: {
  readonly servicios: ServicioRepository;
  readonly reloj: Clock;
}): (servicioId: string, elecciones: readonly Eleccion[]) => Promise<void> {
  return async (servicioId, elecciones) => {
    // Obtener servicio con conflictos
    const servicio = await deps.servicios.obtener(servicioId);
    if (!servicio) {
      throw new Error(`Servicio ${servicioId} no encontrado`);
    }

    // Validar que todas las elecciones estén presentes
    if (elecciones.length !== servicio.conflictos.length) {
      throw new Error('Elecciones incompleta: faltan campos');
    }

    for (const conflicto of servicio.conflictos) {
      const eleccion = elecciones.find((e) => e.campo === conflicto.campo);
      if (!eleccion) {
        throw new Error(`Falta elección para campo ${conflicto.campo}`);
      }
    }

    // Aplicar elecciones
    const camposSucios = new Set<keyof typeof servicio>(servicio.camposSucios);

    for (const eleccion of elecciones) {
      if (eleccion.usar === 'LOCAL') {
        // LOCAL: deja el campo sucio para reintentar en próxima sync
        camposSucios.add(eleccion.campo);
      } else {
        // REMOTO: limpia el campo (toma del base que tiene el valor remoto)
        camposSucios.delete(eleccion.campo);
        // Restaurar valor del base (que tiene el remoto)
        const valorBase = (servicio.base as Record<string, unknown>)[eleccion.campo];
        (servicio as Record<string, unknown>)[eleccion.campo] = valorBase;
      }
    }

    // Guardar servicio resuelto
    const actualizado = {
      ...servicio,
      camposSucios: Array.from(camposSucios),
      conflictos: [], // Conflictos resueltos
      syncState: camposSucios.size > 0 ? ('pending' as const) : ('synced' as const),
      actualizadoEn: deps.reloj.ahoraIso(),
    };

    await deps.servicios.guardar(actualizado);
  };
}
