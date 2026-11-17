import type {
  AuthPort,
  OpcionesAsegurarToken,
  OpcionesIniciarSesion,
} from '@/application/ports/authPort';
import type { StoragePort } from '@/application/ports/storagePort';
import type { RemoteGatewayPush } from '@/application/ports/RemoteGatewayPush';
import type { LockSync } from '@/application/ports/syncLock';
import { crearListarAdjuntosRemotos } from '@/application/adjuntos/listarAdjuntosRemotos';
import { crearDescargarMiniaturas } from '@/application/sync/descargarMiniaturas';
import { crearDespuesDelPush } from '@/application/sync/despuesDelPush';
import { EventBusSync, type ResumenSync } from '@/application/sync/eventosSync';
import { crearPullServicios } from '@/application/sync/pullServicios';
import { crearResolutorConflicto412 } from '@/application/sync/resolverConflicto412';
import { MotorSync } from '@/application/sync/SyncEngine';
import { CLAVES_META } from '@/application/setup/claves';
import { CONFIG_DEFECTO, type ConfigApp } from '@/domain/config';
import type { CuentaUsuario, Rol } from '@/domain/servicio';
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

import { crearDbPrueba } from '../fakes/crearDbPrueba';
import { FakeClock } from '../fakes/FakeClock';
import { FakeIdGenerator } from '../fakes/FakeIdGenerator';
import { FakeLogger } from '../fakes/FakeLogger';

/**
 * Entorno de «dispositivo» para las pruebas EN VIVO: el motor de sincronización real, con los repositorios
 * Dexie (base en memoria) y el SharePointGateway real, contra un SharePoint REAL. Solo cambia la
 * autenticación: en vez de MSAL (necesita un usuario interactivo) se usa el token de una aplicación.
 */
export class AuthAplicacion implements AuthPort {
  private readonly cuenta: CuentaUsuario;

  constructor(
    private readonly obtenerToken: () => Promise<string>,
    correo = 'prueba-viva@siminticsas.com'
  ) {
    this.cuenta = {
      id: 'prueba-viva',
      nombre: 'Prueba en vivo',
      correo,
      roles: ['Tecnico', 'Comercial', 'Administrador'],
    };
  }

  cuentaActiva(): CuentaUsuario | null {
    return this.cuenta;
  }
  rolesCacheados(): readonly Rol[] {
    return this.cuenta.roles;
  }
  async inicializar(): Promise<void> {}
  sesionVigente(): boolean {
    return true;
  }
  async iniciarSesion(_opciones?: OpcionesIniciarSesion): Promise<void> {}
  async asegurarToken(_opciones: OpcionesAsegurarToken): Promise<string> {
    return this.obtenerToken();
  }
  async cambiarCuenta(): Promise<void> {}
  async cerrarSesion(): Promise<void> {}
}

const lockDirecto: LockSync = async (_clave, fn) => ({ adquirido: true, valor: await fn() });

export interface DispositivoReal {
  readonly nombre: string;
  readonly db: AppDB;
  readonly servicios: ServicioRepositoryDexie;
  readonly adjuntos: AdjuntoRepositoryDexie;
  readonly catalogos: CatalogoRepositoryDexie;
  readonly meta: MetaRepositoryDexie;
  readonly clock: FakeClock;
  readonly logger: FakeLogger;
  readonly gateway: SharePointGateway;
  readonly pull: ReturnType<typeof crearPullServicios>;
  readonly listarAdjuntosRemotos: ReturnType<typeof crearListarAdjuntosRemotos>;
  readonly descargarMiniaturas: ReturnType<typeof crearDescargarMiniaturas>;
  readonly sincronizar: () => Promise<ResumenSync>;
  readonly cerrar: () => Promise<void>;
}

export async function crearDispositivoReal(opciones: {
  readonly nombre: string;
  readonly siteUrl: string;
  readonly obtenerToken: () => Promise<string>;
}): Promise<DispositivoReal> {
  const { hostname, pathname } = new URL(opciones.siteUrl);
  const env: Entorno = {
    VITE_APP_ENV: 'dev',
    VITE_AUTH_MODE: 'mock',
    VITE_ENTRA_CLIENT_ID: '11111111-1111-4111-8111-111111111111',
    VITE_ENTRA_TENANT_ID: '22222222-2222-4222-8222-222222222222',
    VITE_SHAREPOINT_SITE_URL: `https://${hostname}${pathname}`,
    VITE_SHAREPOINT_SITE_NAME: pathname.split('/').pop() ?? '',
  };

  const db = await crearDbPrueba();
  const auth = new AuthAplicacion(opciones.obtenerToken);
  const logger = new FakeLogger();
  const clock = new FakeClock();
  const ids = new FakeIdGenerator();
  const servicios = new ServicioRepositoryDexie(db);
  const adjuntos = new AdjuntoRepositoryDexie(db);
  const meta = new MetaRepositoryDexie(db, ids);
  const catalogos = new CatalogoRepositoryDexie(db);

  const graph = crearGraphClient({ auth, logger, ids });
  const gateway = new SharePointGateway({ graph, env, meta, logger });
  const sitio = await gateway.resolverSitio();
  const uploader = crearGraphUploader({ graph, auth, driveId: sitio.driveId });

  const config: ConfigApp = { ...CONFIG_DEFECTO, versionMinimaApp: '0.1.0' };
  const almacenamiento: StoragePort = {
    estimar: async () => ({
      usadoBytes: 10,
      cuotaBytes: 100,
      disponibleBytes: 90,
      porcentajeUsado: 10,
    }),
    persistir: async () => true,
  };

  const pull = crearPullServicios({
    remoto: gateway,
    servicios,
    meta,
    catalogos,
    reloj: clock,
    logger,
    config: () => config,
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
    storage: almacenamiento,
    logger,
    config: () => config,
  });

  const bus = new EventBusSync();
  const motor = new MotorSync({
    servicios,
    adjuntos,
    remoto: gateway as RemoteGatewayPush,
    uploader,
    mapeador: { aCamposSP, deCamposSP, valorTipoAdjunto: (tipo) => VALOR_TIPO_ADJUNTO[tipo] },
    meta,
    logger,
    clock,
    config: () => config,
    appVersion: '0.1.0',
    lock: lockDirecto,
    bus,
    usuario: () => auth.cuentaActiva()?.correo,
    despuesDelPush: crearDespuesDelPush({
      gateway,
      catalogos,
      pullServicios: pull,
      listarAdjuntosRemotos,
      descargarMiniaturas,
      config: () => config,
      logger,
    }),
    resolutorConflictos: crearResolutorConflicto412({ remoto: gateway, logger }),
  });
  await meta.guardar(CLAVES_META.configuracionInicialCompleta, true);

  let secuencia = 0;
  return {
    nombre: opciones.nombre,
    db,
    servicios,
    adjuntos,
    catalogos,
    meta,
    clock,
    logger,
    gateway,
    pull,
    listarAdjuntosRemotos,
    descargarMiniaturas,
    sincronizar: () => {
      secuencia += 1;
      return motor.sincronizar({
        correlationId: `viva-${opciones.nombre}-${Date.now()}-${secuencia}`,
        signal: new AbortController().signal,
      });
    },
    cerrar: async () => {
      await db.delete();
    },
  };
}
