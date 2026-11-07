import type { Servicio } from '@/domain/servicio';

import type { ConflictoError } from './ConflictoError';

export interface ContextoResolucion {
  readonly servicio: Servicio;
  readonly error: ConflictoError;
}

export type ResultadoResolucion =
  | { readonly estado: 'conflict'; readonly servicio: Servicio }
  | { readonly estado: 'resuelto'; readonly servicio: Servicio };

/**
 * Punto de extensión que la spec 006 reemplaza por el merge a tres vías.
 * El resolutor por defecto deja el servicio disponible para esa pantalla.
 */
export interface ResolutorConflictos {
  resolver(contexto: ContextoResolucion): Promise<ResultadoResolucion>;
}

export function crearResolutorPorDefecto(): ResolutorConflictos {
  return {
    async resolver({ servicio }) {
      const enConflicto: Servicio = { ...servicio, syncState: 'conflict' };
      delete enConflicto.proximoIntentoEn;

      return {
        estado: 'conflict',
        servicio: enConflicto,
      };
    },
  };
}
