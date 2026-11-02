import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { AuthPort } from '@/application/ports/authPort';
import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { MapeadorServicio } from '@/application/ports/mapeadorServicio';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { RemoteGatewayPush } from '@/application/ports/RemoteGatewayPush';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { StoragePort } from '@/application/ports/storagePort';
import type { Uploader } from '@/application/ports/UploaderPort';
import type { CasosDeUsoAdjuntos } from '@/application/adjuntos/casosDeUso';
import { crearCasosDeUsoAdjuntos } from '@/application/adjuntos/casosDeUso';
import { crearCasosDeUso } from '@/application/servicios/casosDeUso';
import { CLAVES_META } from '@/application/setup/claves';
import { eventosSync, type EventBusSync } from '@/application/sync/eventosSync';
import { MotorSync, type SyncEngine } from '@/application/sync/SyncEngine';
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
import { crearGraphClient, type GraphClient } from '@/infrastructure/graph/graphClient';
import { MockRemoteGateway, crearMockUploader } from '@/infrastructure/graph/mockRemoteGateway';
import { SharePointGateway } from '@/infrastructure/graph/sharepointGateway';
import { crearGraphUploader } from '@/infrastructure/graph/uploads';
import { VALOR_TIPO_ADJUNTO } from '@/infrastructure/graph/mappers/choices';
import { aCamposSP, deCamposSP } from '@/infrastructure/graph/mappers/servicioMapper';
import { conLockSync } from '@/infrastructure/sync/webLocks';
import { obtenerEnv, type Entorno } from '@/shared/env';
import { useSesionStore } from '@/shared/stores/sesionStore';

export interface DependenciasContainer {
  db?: AppDB;
  auth?: AuthPort;
  gateway?: RemoteGatewayPush;
  logger?: Logger;
  config?: ConfigApp;
  appVersion?: string;
  storage?: StoragePort;
  env?: Entorno;
  uploader?: Uploader;
}

export interface Container {
  db: AppDB;
  servicios: ServicioRepository;
  adjuntos: AdjuntoRepository;
  catalogos: CatalogoRepository;
  meta: MetaRepository;
  auth: AuthPort;
  gateway: RemoteGatewayPush;
  uploader: Uploader;
  logger: Logger;
  storage: StoragePort;
  eventosSync: EventBusSync;
  sync: SyncEngine;
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
  const esMock = env.VITE_AUTH_MODE === 'mock';
  const graph = crearGraphClient({ auth, logger, ids });
  const gateway =
    deps.gateway ??
    (esMock
      ? new MockRemoteGateway()
      : new SharePointGateway({
          graph,
          env,
          meta,
          logger,
        }));
  const uploader =
    deps.uploader ?? (esMock ? crearMockUploader() : crearUploaderGraph(gateway, graph, auth));
  const mapeador: MapeadorServicio = {
    aCamposSP,
    deCamposSP,
    valorTipoAdjunto: (tipo) => VALOR_TIPO_ADJUNTO[tipo],
  };

  await auth.inicializar();
  const cuenta = auth.cuentaActiva();
  const configuracionCompleta =
    (await meta.obtener<boolean>(CLAVES_META.configuracionInicialCompleta)) === true;
  useSesionStore.getState().setCuenta(cuenta);
  useSesionStore.getState().setConfiguracionInicialCompleta(configuracionCompleta);

  const appVersion =
    deps.appVersion ?? (typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0');
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
    appVersion,
  };

  const casosDeUso = crearCasosDeUso(depsServicios);
  const casosAdjuntos = crearCasosDeUsoAdjuntos({
    ...depsServicios,
    imageProcessor: new ImageProcessorCanvas(),
    storage,
  });

  const sync = new MotorSync({
    servicios,
    adjuntos,
    remoto: gateway,
    uploader,
    mapeador,
    meta,
    logger,
    clock,
    config: () => config,
    appVersion,
    lock: conLockSync,
    bus: eventosSync,
    usuario: () => auth.cuentaActiva()?.correo,
  });

  return {
    db,
    servicios,
    adjuntos,
    catalogos,
    meta,
    auth,
    gateway,
    uploader,
    logger,
    storage,
    eventosSync,
    sync,
    config: () => config,
    casosDeUso,
    casosAdjuntos,
  };
};

function crearUploaderGraph(
  gateway: RemoteGatewayPush,
  graph: GraphClient,
  auth: AuthPort
): Uploader {
  let actual: Uploader | undefined;

  return {
    async subir(archivo, ruta, opciones) {
      if (!actual) {
        const sitio = await gateway.resolverSitio();
        actual = crearGraphUploader({ graph, auth, driveId: sitio.driveId });
      }
      return actual.subir(archivo, ruta, opciones);
    },
  };
}

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
