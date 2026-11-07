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
export function crearResolverConflictos(_deps: {
  readonly servicios: ServicioRepository;
  readonly reloj: Clock;
}): (_servicioId: string, _elecciones: readonly Eleccion[]) => Promise<void> {
  return async () => {
    // TODO: Obtener servicio con conflictos
    // TODO: Validar elecciones completas
    // TODO: Aplicar elecciones (LOCAL/REMOTO)
    // TODO: Guardar servicio como 'pending'
    throw new Error('resolverConflictos: not implemented');
  };
}
