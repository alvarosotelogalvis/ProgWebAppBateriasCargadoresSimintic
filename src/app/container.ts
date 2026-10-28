import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { AuthPort } from '@/application/ports/authPort';
import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { StoragePort } from '@/application/ports/storagePort';
import type { CasosDeUsoAdjuntos } from '@/application/adjuntos/casosDeUso';
import { crearCasosDeUsoAdjuntos } from '@/application/adjuntos/casosDeUso';
import { crearCasosDeUso } from '@/application/servicios/casosDeUso';
import { CLAVES_META } from '@/application/setup/claves';
import type { ConfigApp } from '@/domain/config';
import { CONFIG_DEFECTO } from '@/domain/config';
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
import { MsalAuthAdapter } from '@/infrastructure/auth/msalAuthAdapter';
import { obtenerMsalInstance } from '@/infrastructure/auth/msalInstance';
import { MockAuthAdapter } from '@/infrastructure/auth/mockAuthAdapter';
import { crearGraphClient } from '@/infrastructure/graph/graphClient';
import { MockRemoteGateway } from '@/infrastructure/graph/mockRemoteGateway';
import { SharePointGateway } from '@/infrastructure/graph/sharepointGateway';
import { obtenerEnv, type Entorno } from '@/shared/env';
import { useSesionStore } from '@/shared/stores/sesionStore';

export interface DependenciasContainer {
  db?: AppDB;
  auth?: AuthPort;
  gateway?: RemoteGateway;
  logger?: Logger;
  config?: ConfigApp;
  appVersion?: string;
  storage?: StoragePort;
  env?: Entorno;
}

export interface Container {
  db: AppDB;
  servicios: ServicioRepository;
  adjuntos: AdjuntoRepository;
  catalogos: CatalogoRepository;
  meta: MetaRepository;
  auth: AuthPort;
  gateway: RemoteGateway;
  logger: Logger;
  storage: StoragePort;
  config: () => ConfigApp;
  casosDeUso: ReturnType<typeof crearCasosDeUso>;
  casosAdjuntos: CasosDeUsoAdjuntos;
}

export const crearContainer = async (deps: DependenciasContainer = {}): Promise<Container> => {
  const db = deps.db ?? new AppDB();
  if (!db.isOpen()) await db.abrir();

  const env = deps.env ?? leerEntorno();
  const ids = new UuidGenerator();
  const clock = new SystemClock();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const catalogos = new CatalogoRepositoryDexie(db);
  const meta = new MetaRepositoryDexie(db, ids);
  const uow = new UnidadDeTrabajoDexie(db, servicios, adjuntos);
  const logger = deps.logger ?? new LoggerDexie(db);
  const auth = deps.auth ?? crearAuth(env, meta, logger);
  const config = deps.config ?? CONFIG_DEFECTO;
  const storage = deps.storage ?? new StorageNavegador();
  const gateway =
    deps.gateway ??
    (env.VITE_AUTH_MODE === 'mock'
      ? new MockRemoteGateway()
      : new SharePointGateway({
          graph: crearGraphClient({ auth, logger, ids }),
          env,
          meta,
          logger,
        }));

  await auth.inicializar();
  const cuenta = auth.cuentaActiva();
  const configuracionCompleta =
    (await meta.obtener<boolean>(CLAVES_META.configuracionInicialCompleta)) === true;
  useSesionStore.getState().setCuenta(cuenta);
  useSesionStore.getState().setConfiguracionInicialCompleta(configuracionCompleta);

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

  return {
    db,
    servicios,
    adjuntos,
    catalogos,
    meta,
    auth,
    gateway,
    logger,
    storage,
    config: () => config,
    casosDeUso,
    casosAdjuntos,
  };
};

function leerEntorno(): Entorno {
  const resultado = obtenerEnv();
  if (!resultado.ok) {
    throw new Error(`Configuracion invalida: ${resultado.error}`);
  }
  return resultado.env;
}

function crearAuth(env: Entorno, meta: MetaRepository, logger: Logger): AuthPort {
  if (env.VITE_AUTH_MODE === 'mock') return new MockAuthAdapter();
  return new MsalAuthAdapter({ cliente: obtenerMsalInstance(), meta, logger });
}

export type CasosDeUsoServicios = Container['casosDeUso'];
