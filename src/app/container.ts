import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { AuthPort } from '@/application/ports/authPort';
import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { StoragePort } from '@/application/ports/storagePort';
import type { CasosDeUsoAdjuntos } from '@/application/adjuntos/casosDeUso';
import { crearCasosDeUsoAdjuntos } from '@/application/adjuntos/casosDeUso';
import { crearCasosDeUso } from '@/application/servicios/casosDeUso';
import type { ConfigApp } from '@/domain/config';
import { CONFIG_DEFECTO } from '@/domain/config';
import type { CuentaUsuario, Rol } from '@/domain/servicio';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import { CatalogoRepositoryDexie } from '@/infrastructure/db/catalogoRepository';
import { AppDB } from '@/infrastructure/db/dexie';
import { MetaRepositoryDexie } from '@/infrastructure/db/metaRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo';
import { UuidGenerator } from '@/infrastructure/ids/uuidGenerator';
import { LoggerDexie } from '@/infrastructure/logging/logger';
import { ImageProcessorCanvas } from '@/infrastructure/media/imageProcessor';
import { StorageNavegador } from '@/infrastructure/pwa/storage';
import { SystemClock } from '@/infrastructure/reloj/systemClock';
import { useSesionStore } from '@/shared/stores/sesionStore';

export interface DependenciasContainer {
  db?: AppDB;
  auth?: AuthPort;
  logger?: Logger;
  config?: ConfigApp;
  appVersion?: string;
  storage?: StoragePort;
}

export interface Container {
  db: AppDB;
  servicios: ServicioRepository;
  adjuntos: AdjuntoRepository;
  catalogos: CatalogoRepository;
  meta: MetaRepository;
  auth: AuthPort;
  logger: Logger;
  storage: StoragePort;
  config: () => ConfigApp;
  casosDeUso: ReturnType<typeof crearCasosDeUso>;
  casosAdjuntos: CasosDeUsoAdjuntos;
}

const crearAuthMock = (): AuthPort => {
  const cuenta = (): CuentaUsuario | null => useSesionStore.getState().cuenta;
  const roles = (): readonly Rol[] => useSesionStore.getState().roles;
  return {
    cuentaActiva: cuenta,
    rolesCacheados: roles,
    asegurarToken: async () => 'token-mock',
    cambiarCuenta: async () => undefined,
    cerrarSesion: async () => useSesionStore.getState().setCuenta(null),
  };
};

export const crearContainer = async (deps: DependenciasContainer = {}): Promise<Container> => {
  const db = deps.db ?? new AppDB();
  if (!db.isOpen()) await db.abrir();

  const ids = new UuidGenerator();
  const clock = new SystemClock();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const catalogos = new CatalogoRepositoryDexie(db);
  const meta = new MetaRepositoryDexie(db, ids);
  const uow = new UnidadDeTrabajoDexie(db, servicios, adjuntos);
  const logger = deps.logger ?? new LoggerDexie(db);
  const auth = deps.auth ?? crearAuthMock();
  const config = deps.config ?? CONFIG_DEFECTO;
  const storage = deps.storage ?? new StorageNavegador();

  const depsServicios = {
    servicios,
    adjuntos,
    uow,
    ids,
    clock,
    auth,
    logger,
    meta,
    config: () => config,
    appVersion:
      deps.appVersion ?? (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0'),
  };

  const casosDeUso = crearCasosDeUso(depsServicios);
  const casosAdjuntos = crearCasosDeUsoAdjuntos({
    ...depsServicios,
    imageProcessor: new ImageProcessorCanvas(),
    storage,
  });

  await sembrarCatalogosDemo(catalogos);

  return {
    db,
    servicios,
    adjuntos,
    catalogos,
    meta,
    auth,
    logger,
    storage,
    config: () => config,
    casosDeUso,
    casosAdjuntos,
  };
};

const CLIENTES_DEMO = [
  { id: 1, nombre: 'Navar Asociados', activo: true },
  { id: 2, nombre: 'Distribuidora Andina', activo: true },
  { id: 3, nombre: 'Transportes del Norte', activo: true },
];

const MARCAS_DEMO = ['ROQUET', 'TROJAN', 'BOSCH', 'DELTA', 'EXIDE'];

const sembrarCatalogosDemo = async (catalogos: CatalogoRepository): Promise<void> => {
  const esDemo = typeof import.meta !== 'undefined' && import.meta.env?.VITE_AUTH_MODE === 'mock';
  if (!esDemo) return;
  if (!(await catalogos.obtener('clientes'))) await catalogos.guardar('clientes', CLIENTES_DEMO);
  if (!(await catalogos.obtener('marcas'))) await catalogos.guardar('marcas', MARCAS_DEMO);
};

export type CasosDeUsoServicios = Container['casosDeUso'];
