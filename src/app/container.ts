import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { AuthPort } from '@/application/ports/authPort';
import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
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
import { SystemClock } from '@/infrastructure/reloj/systemClock';
import { useSesionStore } from '@/shared/stores/sesionStore';

export interface DependenciasContainer {
  db?: AppDB;
  auth?: AuthPort;
  logger?: Logger;
  config?: ConfigApp;
  appVersion?: string;
}

export interface Container {
  db: AppDB;
  servicios: ServicioRepository;
  adjuntos: AdjuntoRepository;
  catalogos: CatalogoRepository;
  meta: MetaRepository;
  auth: AuthPort;
  logger: Logger;
  config: () => ConfigApp;
  casosDeUso: ReturnType<typeof crearCasosDeUso>;
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

  const casosDeUso = crearCasosDeUso({
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
  });

  return {
    db,
    servicios,
    adjuntos,
    catalogos,
    meta,
    auth,
    logger,
    config: () => config,
    casosDeUso,
  };
};

export type CasosDeUsoServicios = Container['casosDeUso'];
