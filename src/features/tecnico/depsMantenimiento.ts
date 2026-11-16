import type { DepsReintentarErrores } from '@/application/mantenimiento/reintentarErrores';
import type { DepsRestablecerApp } from '@/application/mantenimiento/restablecerApp';
import type { DepsPurgas } from '@/application/sync/purgas';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import { BorradoLocalDexie } from '@/infrastructure/db/borradoLocal';
import type { AppDB } from '@/infrastructure/db/dexie';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';

/** Adaptadores Dexie de los casos de uso de mantenimiento del menú técnico. */
export function depsMantenimiento(db: AppDB): {
  purgas: DepsPurgas;
  reintentar: DepsReintentarErrores;
  restablecer: DepsRestablecerApp;
} {
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const uow = new UnidadDeTrabajoDexie(db, servicios, adjuntos);
  return {
    purgas: { servicios, adjuntos, uow },
    reintentar: { uow },
    restablecer: { servicios, adjuntos, borrado: new BorradoLocalDexie(db) },
  };
}
