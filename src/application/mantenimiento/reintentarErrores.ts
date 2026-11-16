import type { Servicio } from '@/domain/servicio';
import type { AppDB } from '@/infrastructure/db/dexie';

export interface ResultadoReintento {
  reintentados: string[];
}

/**
 * "Reintentar errores" (ES-009-16): devuelve a la cola todos los servicios en error,
 * reiniciando intentos y espera. No sincroniza: la subida ocurre en la siguiente
 * sincronización. No toca conflictos (requieren decisión del usuario).
 */
export async function reintentarErrores(db: AppDB): Promise<ResultadoReintento> {
  const reintentados: string[] = [];

  await db.transaction('rw', db.servicios, async () => {
    const enError = await db.servicios.where('syncState').equals('error').toArray();
    for (const actual of enError) {
      const guardado: Servicio = { ...actual, syncState: 'pending', intentos: 0 };
      delete guardado.proximoIntentoEn;
      delete guardado.ultimoError;
      await db.servicios.put(guardado);
      reintentados.push(actual.id);
    }
  });

  return { reintentados };
}
