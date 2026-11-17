import type { AuthPort } from '@/application/ports/authPort';
import type { StoragePort } from '@/application/ports/storagePort';
import type { RemoteGatewayPush } from '@/application/ports/RemoteGatewayPush';
import type { LockSync } from '@/application/ports/syncLock';
import type { Uploader } from '@/application/ports/UploaderPort';
import {
  crearListarAdjuntosRemotos,
  type ListarAdjuntosRemotos,
} from '@/application/adjuntos/listarAdjuntosRemotos';
import {
  crearDescargarMiniaturas,
  type DescargarMiniaturas,
} from '@/application/sync/descargarMiniaturas';
import { crearDespuesDelPush } from '@/application/sync/despuesDelPush';
import { EventBusSync, type EventoSync, type ResumenSync } from '@/application/sync/eventosSync';
import { crearPullServicios, type PullServicios } from '@/application/sync/pullServicios';
import { crearResolutorConflicto412 } from '@/application/sync/resolverConflicto412';
import { MotorSync } from '@/application/sync/SyncEngine';
import { CLAVES_META } from '@/application/setup/claves';
import type { ConfigApp } from '@/domain/config';
import { CONFIG_DEFECTO } from '@/domain/config';
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository';
import { CatalogoRepositoryDexie } from '@/infrastructure/db/catalogoRepository';
import type { AppDB } from '@/infrastructure/db/dexie';
import { MetaRepositoryDexie } from '@/infrastructure/db/metaRepository';
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository';
import { crearGraphClient } from '@/infrastructure/graph/graphClient';
import { VALOR_TIPO_ADJUNTO } from '@/infrastructure/graph/mappers/choices';
import { aCamposSP, deCamposSP } from '@/infrastructure/graph/mappers/servicioMapper';
import { SharePointGateway } from '@/infrastructure/graph/sharepointGateway';
import { crearGraphUploader } from '@/infrastructure/graph/uploads';
import type { Entorno } from '@/shared/env';

import { adjuntoBuilder } from '../../builders/adjuntoBuilder';
import { crearDbPrueba } from '../../fakes/crearDbPrueba';
import { FakeAuth } from '../../fakes/FakeAuth';
import { FakeClock } from '../../fakes/FakeClock';
import { FakeIdGenerator } from '../../fakes/FakeIdGenerator';
import { FakeLogger } from '../../fakes/FakeLogger';
import { EmuladorGraph } from '../graph/emuladorGraph';

export const ENTORNO_GRAPH: Entorno = {
  VITE_APP_ENV: 'dev',
  VITE_AUTH_MODE: 'mock',
  VITE_ENTRA_CLIENT_ID: '11111111-1111-1111-1111-111111111111',
  VITE_ENTRA_TENANT_ID: '22222222-2222-2222-2222-222222222222',
  VITE_SHAREPOINT_SITE_URL: 'https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV',
  VITE_SHAREPOINT_SITE_NAME: 'ServicioTecnicoBC-DEV',
};

export const CONFIG_PRUEBA: ConfigApp = { ...CONFIG_DEFECTO, versionMinimaApp: '0.1.0' };

const lockDirecto: LockSync = async (_clave, fn) => ({ adquirido: true, valor: await fn() });

export interface OpcionesEntornoSync {
  readonly auth?: AuthPort;
  readonly reintentosPorLlamada?: number;
  readonly dormir?: (ms: number) => Promise<void>;
  readonly envolverUploader?: (uploader: Uploader) => Uploader;
  readonly lock?: LockSync;
  readonly config?: ConfigApp;
  readonly appVersion?: string;
  /** Omite la bitácora remota (útil para aislar conteos de fallos inyectados). */
  readonly sinLogRemoto?: boolean;
  /** Activa la descarga (spec 006) y el resolutor de 412 reales dentro del motor. */
  readonly conPull?: boolean;
  /** Emulador compartido: así dos «dispositivos» (entornos) ven la misma lista de SharePoint. */
  readonly emulador?: EmuladorGraph;
}

export interface EntornoSync {
  readonly db: AppDB;
  readonly emulador: EmuladorGraph;
  readonly auth: AuthPort;
  readonly servicios: ServicioRepositoryDexie;
  readonly adjuntos: AdjuntoRepositoryDexie;
  readonly meta: MetaRepositoryDexie;
  readonly logger: FakeLogger;
  readonly clock: FakeClock;
  readonly bus: EventBusSync;
  readonly eventos: EventoSync[];
  readonly gateway: RemoteGatewayPush;
  readonly uploader: Uploader;
  readonly catalogos: CatalogoRepositoryDexie;
  readonly pull: PullServicios;
  readonly listarAdjuntosRemotos: ListarAdjuntosRemotos;
  readonly descargarMiniaturas: DescargarMiniaturas;
  /** Porcentaje de almacenamiento usado que informa el dispositivo simulado. */
  readonly almacenamiento: { porcentajeUsado: number };
  readonly sincronizar: () => Promise<ResumenSync>;
  readonly cerrar: () => Promise<void>;
}

const sinRegistroDeLog = (gateway: RemoteGatewayPush): RemoteGatewayPush => ({
  resolverSitio: () => gateway.resolverSitio(),
  leerCatalogos: () => gateway.leerCatalogos(),
  leerConfiguracion: () => gateway.leerConfiguracion(),
  buscarServicioPorId: (servicioId) => gateway.buscarServicioPorId(servicioId),
  crearServicio: (campos) => gateway.crearServicio(campos),
  ultimoNumeroSolicitud: () => gateway.ultimoNumeroSolicitud(),
  contarPorNumeroSolicitud: (numero) => gateway.contarPorNumeroSolicitud(numero),
  renumerarServicio: (itemId, numero, codigo) => gateway.renumerarServicio(itemId, numero, codigo),
  actualizarServicio: (itemId, campos, etag) => gateway.actualizarServicio(itemId, campos, etag),
  listarAdjuntosDeServicio: (servicioId) => gateway.listarAdjuntosDeServicio(servicioId),
  eliminarArchivo: (itemId) => gateway.eliminarArchivo(itemId),
  actualizarMetadatosArchivo: (itemId, metadatos) =>
    gateway.actualizarMetadatosArchivo(itemId, metadatos),
});

/**
 * Compone el motor de sincronización real (repositorios Dexie, SharePointGateway,
 * uploader y mapper) contra el emulador de Graph en MSW.
 */
export async function crearEntornoSync(opciones: OpcionesEntornoSync = {}): Promise<EntornoSync> {
  const db = await crearDbPrueba();
  const emulador = opciones.emulador ?? new EmuladorGraph();
  const auth = opciones.auth ?? new FakeAuth();
  const logger = new FakeLogger();
  const clock = new FakeClock();
  const ids = new FakeIdGenerator();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const meta = new MetaRepositoryDexie(db, ids);
  const catalogos = new CatalogoRepositoryDexie(db);

  const graph = crearGraphClient({
    auth,
    logger,
    ids,
    ...(opciones.reintentosPorLlamada === undefined
      ? {}
      : { reintentosPorLlamada: opciones.reintentosPorLlamada }),
    ...(opciones.dormir === undefined ? {} : { dormir: opciones.dormir }),
  });

  const gatewayReal = new SharePointGateway({
    graph,
    env: ENTORNO_GRAPH,
    meta,
    logger,
  });
  const gateway = opciones.sinLogRemoto ? sinRegistroDeLog(gatewayReal) : gatewayReal;

  const uploaderReal = crearGraphUploader({
    graph,
    auth,
    driveId: 'drive-1',
  });
  const uploader = opciones.envolverUploader?.(uploaderReal) ?? uploaderReal;

  const config = opciones.config ?? CONFIG_PRUEBA;
  const bus = new EventBusSync();
  const eventos: EventoSync[] = [];
  bus.on((evento) => {
    eventos.push(evento);
  });

  const almacenamiento = { porcentajeUsado: 10 };
  const storage: StoragePort = {
    estimar: async () => ({
      usadoBytes: almacenamiento.porcentajeUsado,
      cuotaBytes: 100,
      disponibleBytes: 100 - almacenamiento.porcentajeUsado,
      porcentajeUsado: almacenamiento.porcentajeUsado,
    }),
    persistir: async () => true,
  };
  const pull = crearPullServicios({
    remoto: gatewayReal,
    servicios,
    meta,
    catalogos,
    reloj: clock,
    logger,
    config: () => config,
  });
  const listarAdjuntosRemotos = crearListarAdjuntosRemotos({
    remoto: gatewayReal,
    servicios,
    adjuntos,
    ids,
    clock,
    logger,
  });
  const descargarMiniaturas = crearDescargarMiniaturas({
    remoto: gatewayReal,
    servicios,
    adjuntos,
    storage,
    logger,
    config: () => config,
  });

  const engine = new MotorSync({
    servicios,
    adjuntos,
    remoto: gateway,
    uploader,
    mapeador: {
      aCamposSP,
      deCamposSP,
      valorTipoAdjunto: (tipo) => VALOR_TIPO_ADJUNTO[tipo],
    },
    meta,
    logger,
    clock,
    config: () => config,
    appVersion: opciones.appVersion ?? '0.1.0',
    lock: opciones.lock ?? lockDirecto,
    bus,
    usuario: () => auth.cuentaActiva()?.correo,
    ...(opciones.conPull
      ? {
          despuesDelPush: crearDespuesDelPush({
            gateway: gatewayReal,
            catalogos,
            pullServicios: pull,
            listarAdjuntosRemotos,
            descargarMiniaturas,
            config: () => config,
            logger,
          }),
          resolutorConflictos: crearResolutorConflicto412({ remoto: gatewayReal, logger }),
        }
      : {}),
  });

  await meta.guardar(CLAVES_META.configuracionInicialCompleta, true);

  let secuencia = 0;
  const sincronizar = (): Promise<ResumenSync> => {
    secuencia += 1;
    return engine.sincronizar({
      correlationId: `corr-${secuencia}`,
      signal: new AbortController().signal,
    });
  };

  return {
    db,
    emulador,
    auth,
    servicios,
    adjuntos,
    meta,
    logger,
    clock,
    bus,
    eventos,
    gateway,
    uploader,
    catalogos,
    pull,
    listarAdjuntosRemotos,
    descargarMiniaturas,
    almacenamiento,
    sincronizar,
    cerrar: async () => {
      await db.delete();
    },
  };
}

/** Crea un adjunto pendiente con contenido propio y el servicio indicado. */
export function adjuntoPendiente(
  servicioId: string,
  id: string,
  opciones: { nombreArchivo?: string; tipo?: 'FOTO_INGRESO' | 'COTIZACION'; blob?: Blob } = {}
) {
  const builder = adjuntoBuilder().enServicio(servicioId).conCampos({
    id,
    syncState: 'pending',
  });

  if (opciones.tipo) builder.deTipo(opciones.tipo);
  if (opciones.nombreArchivo) builder.conCampos({ nombreArchivo: opciones.nombreArchivo });
  if (opciones.blob) builder.conCampos({ blob: opciones.blob, tamanoBytes: opciones.blob.size });

  return builder.construir();
}
