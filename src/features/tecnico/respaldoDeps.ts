import { crearClientesLocales } from '@/application/clientes/clientesLocales';
import type { DepsExportar, DepsImportar } from '@/application/respaldo/respaldo';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import { CatalogoRepositoryDexie } from '@/infrastructure/db/catalogoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { MetaRepositoryDexie } from '@/infrastructure/db/metaRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { UuidGenerator } from '@/infrastructure/ids/uuidGenerator';
import { zipFflate } from '@/infrastructure/respaldo/zip';

const versionApp = (): string => (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0');

/** Repositorios Dexie para exportar e importar respaldos desde el menú técnico. */
export function depsRespaldo(db: AppDB): { exportar: DepsExportar; importar: DepsImportar } {
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const meta = new MetaRepositoryDexie(db, new UuidGenerator());
  const clientesNuevos = crearClientesLocales(new CatalogoRepositoryDexie(db));
  return {
    exportar: {
      servicios,
      adjuntos,
      zip: zipFflate,
      appVersion: versionApp(),
      dispositivoId: () => meta.dispositivoId(),
      clientesNuevos: () => clientesNuevos.listar(),
    },
    importar: {
      servicios,
      uow: new UnidadDeTrabajoDexie(db, servicios, adjuntos),
      zip: zipFflate,
      clientesNuevos,
    },
  };
}
