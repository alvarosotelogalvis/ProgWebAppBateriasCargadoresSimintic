import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { AuthPort } from '@/application/ports/authPort';
import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { IntencionSyncPort } from '@/application/ports/IntencionSyncPort';
import type { Logger } from '@/application/ports/loggerPort';
import type { MapeadorServicio } from '@/application/ports/mapeadorServicio';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { RemoteGatewayPull } from '@/application/ports/RemoteGatewayPull';
import type { RemoteGatewayPush } from '@/application/ports/RemoteGatewayPush';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { StoragePort } from '@/application/ports/storagePort';
import type { Uploader } from '@/application/ports/UploaderPort';
import type { CasosDeUsoAdjuntos } from '@/application/adjuntos/casosDeUso';
import { crearCasosDeUsoAdjuntos } from '@/application/adjuntos/casosDeUso';
import {
  crearListarAdjuntosRemotos,
  type ListarAdjuntosRemotos,
} from '@/application/adjuntos/listarAdjuntosRemotos';
import { crearCasosDeUso } from '@/application/servicios/casosDeUso';
import { CLAVES_META } from '@/application/setup/claves';
import {
  crearConfirmarIdentidad,
  type ConfirmarIdentidad,
} from '@/application/sync/confirmarIdentidad';
import { eventosSync, type EventBusSync } from '@/application/sync/eventosSync';
import {
  calcularResumenPendientes,
  type ResumenPendientes,
} from '@/application/sync/resumenPendientes';
import {
  cargarConfigGuardada,
  ConfigActual,
  conConfigEnMemoria,
  refrescarConfigRemota,
} from '@/application/setup/configActual';
import { sesionSyncVigente } from '@/application/sync/avisosSync';
import { reintentarServicio } from '@/application/sync/reintentarServicio';
import { crearDescargarMiniaturas } from '@/application/sync/descargarMiniaturas';
import { crearDespuesDelPush } from '@/application/sync/despuesDelPush';
import { crearPullServicios } from '@/application/sync/pullServicios';
import { crearResolutorConflicto412 } from '@/application/sync/resolverConflicto412';
import { MotorSync, type SyncEngine } from '@/application/sync/SyncEngine';
import { ejecutarPurgas } from '@/application/sync/purgas';
import type { ConfigApp } from '@/domain/config';
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
import { prepararAutenticacion } from '@/infrastructure/auth/arranque';
import { obtenerMsalInstance } from '@/infrastructure/auth/msalInstance';
import { MockAuthAdapter } from '@/infrastructure/auth/mockAuthAdapter';
import { crearGraphClient, type GraphClient } from '@/infrastructure/graph/graphClient';
import { MockRemoteGateway, crearMockUploader } from '@/infrastructure/graph/mockRemoteGateway';
import { SharePointGateway } from '@/infrastructure/graph/sharepointGateway';
import { crearGraphUploader } from '@/infrastructure/graph/uploads';
import { VALOR_TIPO_ADJUNTO } from '@/infrastructure/graph/mappers/choices';
import { aCamposSP, deCamposSP } from '@/infrastructure/graph/mappers/servicioMapper';
import { conLockSync } from '@/infrastructure/sync/webLocks';
import { IntencionSyncSessionStorage } from '@/infrastructure/sync/intencionSync';
import { obtenerEnv, type Entorno } from '@/shared/env';
import { useSesionStore } from '@/shared/stores/sesionStore';

/** El gateway de SharePoint sirve a la subida (spec 005) y a la descarga (spec 006). */
export type GatewayRemoto = RemoteGatewayPush & RemoteGatewayPull;

export interface DependenciasContainer {
  db?: AppDB;
  auth?: AuthPort;
  gateway?: GatewayRemoto;
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
  gateway: GatewayRemoto;
  uploader: Uploader;
  logger: Logger;
  storage: StoragePort;
  eventosSync: EventBusSync;
  sync: SyncEngine;
  intencionSync: IntencionSyncPort;
  confirmarIdentidad: ConfirmarIdentidad;
  resumenPendientes: () => Promise<ResumenPendientes>;
  reintentarServicio: (servicioId: string) => Promise<boolean>;
  sesionSyncVigente: () => Promise<boolean>;
  appVersion: string;
  config: () => ConfigApp;
  casosDeUso: ReturnType<typeof crearCasosDeUso>;
  casosAdjuntos: CasosDeUsoAdjuntos;
  listarAdjuntosRemotos: ListarAdjuntosRemotos;
}

export const crearContainer = async (deps: DependenciasContainer = {}): Promise<Container> => {
  const db = deps.db ?? new AppDB();
  if (!db.isOpen()) await db.abrir();

  const env = deps.env ?? leerEntorno();
  const ids = new UuidGenerator();
  const clock = new SystemClock();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const catalogosDexie = new CatalogoRepositoryDexie(db);
  const meta = new MetaRepositoryDexie(db, ids);
  const uow = new UnidadDeTrabajoDexie(db, servicios, adjuntos);
  const logger = deps.logger ?? new LoggerDexie(db);
  const auth = deps.auth ?? (await crearAuth(env, meta, logger));
  // Configuración vigente: la guardada por la configuración inicial o el último sync (SDD §16.3).
  const configActual = new ConfigActual(
    deps.config ?? (await cargarConfigGuardada(catalogosDexie))
  );
  const catalogos = deps.config ? catalogosDexie : conConfigEnMemoria(catalogosDexie, configActual);
  const config = configActual.obtener;
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

  const intencionSync = new IntencionSyncSessionStorage();
  const confirmarIdentidad = crearConfirmarIdentidad({
    auth,
    meta,
    clock,
    config,
    intencion: intencionSync,
    // En modo mock la cuenta simulada no pertenece al tenant real de Entra ID.
    ...(esMock ? {} : { tenantId: env.VITE_ENTRA_TENANT_ID }),
  });

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
    config,
    appVersion,
  };

  const casosDeUso = crearCasosDeUso(depsServicios);
  const casosAdjuntos = crearCasosDeUsoAdjuntos({
    ...depsServicios,
    imageProcessor: new ImageProcessorCanvas(),
    storage,
  });

  // Descarga (spec 006): catálogos → servicios remotos → adjuntos y miniaturas de los cambiados.
  const pullServicios = crearPullServicios({
    remoto: gateway,
    servicios,
    meta,
    catalogos,
    reloj: clock,
    logger,
    config,
  });
  const listarAdjuntosRemotos = crearListarAdjuntosRemotos({
    remoto: gateway,
    servicios,
    adjuntos,
    ids,
    clock,
    logger,
  });
  const descargarMiniaturas = crearDescargarMiniaturas({
    remoto: gateway,
    servicios,
    adjuntos,
    storage,
    logger,
    config,
  });

  const despuesDelPush = crearDespuesDelPush({
    gateway,
    catalogos,
    pullServicios,
    listarAdjuntosRemotos,
    descargarMiniaturas,
    config,
    logger,
  });

  const resolutorConflictos = crearResolutorConflicto412({ remoto: gateway, logger });

  const sync = new MotorSync({
    servicios,
    adjuntos,
    remoto: gateway,
    uploader,
    mapeador,
    meta,
    logger,
    clock,
    config,
    appVersion,
    lock: conLockSync,
    bus: eventosSync,
    despuesDelPush,
    resolutorConflictos,
    ...(deps.config
      ? {}
      : { refrescarConfig: () => refrescarConfigRemota({ gateway, catalogos, logger }) }),
    usuario: () => auth.cuentaActiva()?.correo,
    alFinalizar: async (contexto) => {
      // Ejecutar purgas solo si sincronización fue exitosa
      if (contexto.resumen.resultado === 'OK') {
        try {
          const cfg = config();
          await ejecutarPurgas(
            db,
            cfg.retencionOriginalesDias ?? 7,
            cfg.retencionCerradosMeses ?? 3,
            logger
          );
        } catch (error) {
          logger.error('purga.falloEnSyncEngine', {
            error: error instanceof Error ? error.message : 'Error desconocido',
          });
        }
      }
    },
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
    intencionSync,
    confirmarIdentidad,
    resumenPendientes: () => calcularResumenPendientes({ servicios, adjuntos }),
    reintentarServicio: (servicioId) => reintentarServicio(servicios, servicioId),
    sesionSyncVigente: () => sesionSyncVigente({ auth, meta, clock, config }),
    appVersion,
    config,
    casosDeUso,
    casosAdjuntos,
    listarAdjuntosRemotos,
  };
};

function crearUploaderGraph(gateway: GatewayRemoto, graph: GraphClient, auth: AuthPort): Uploader {
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

async function crearAuth(env: Entorno, meta: MetaRepository, logger: Logger): Promise<AuthPort> {
  if (env.VITE_AUTH_MODE === 'mock') return new MockAuthAdapter();
  // `obtenerMsalInstance` descarga MSAL aquí, bajo demanda. Antes se completa un redirect pendiente (idempotente).
  await prepararAutenticacion();
  return new MsalAuthAdapter({ cliente: await obtenerMsalInstance(), meta, logger });
}

export type CasosDeUsoServicios = Container['casosDeUso'];
