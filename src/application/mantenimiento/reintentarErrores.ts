import type { UpdateSpec } from 'dexie';

import type { Servicio } from '@/domain/servicio';
import type { AppDB } from '@/infrastructure/db/dexie';

/** En `Table.update` de Dexie, un valor `undefined` elimina la propiedad del registro. */
const LIMPIAR_ERROR = {
  ultimoError: undefined,
  proximoIntentoEn: undefined,
} as unknown as UpdateSpec<Servicio>;

export interface ResultadoReintento {
  retintentados: string[];
  sinErrores: string[];
  totalProcesados: number;
}

export async function reintentarErrores(db: AppDB): Promise<ResultadoReintento> {
  // Obtener servicios con error
  const servicios = await db.servicios.toArray();
  const conError = servicios.filter((s) => s.ultimoError);

  const retintentados: string[] = [];
  const sinErrores: string[] = [];

  // Limpiar errores para permitir reintentos
  await db.transaction('rw', db.servicios, async () => {
    for (const svc of conError) {
      if (svc.ultimoError) {
        // Limpiar error y reset proximoIntentoEn para permitir reintentos inmediatos
        await db.servicios.update(svc.id, LIMPIAR_ERROR);

        retintentados.push(svc.id);
      } else {
        sinErrores.push(svc.id);
      }
    }
  });

  return {
    retintentados,
    sinErrores,
    totalProcesados: conError.length,
  };
}
