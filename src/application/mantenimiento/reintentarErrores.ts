import type { AppDB } from '@/infrastructure/db/dexie';

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
        await db.servicios.update(svc.id, {
          ultimoError: undefined,
          proximoIntentoEn: undefined,
        } as Record<string, unknown>);

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
