import { crearCasosDeUso } from './casosDeUso'
import { ServicioRepositoryDexie } from '@/infrastructure/db/servicioRepository'
import { AdjuntoRepositoryDexie } from '@/infrastructure/db/adjuntoRepository'
import { UnidadDeTrabajoDexie } from '@/infrastructure/db/unidadDeTrabajo'
import { UuidGenerator } from '@/infrastructure/ids/uuidGenerator'
import { SystemClock } from '@/infrastructure/reloj/systemClock'
import { AppDB } from '@/infrastructure/db/dexie'

export const crearContainer = async (deps?: {
  db?: AppDB
  auth?: any
  logger?: any
}) => {
  const db = deps?.db || new AppDB()
  await db.abrir()
  const servicios = new ServicioRepositoryDexie(db)
  const adjuntos = new AdjuntoRepositoryDexie(db)
  const uow = new UnidadDeTrabajoDexie(db, servicios, adjuntos)
  const ids = new UuidGenerator()
  const clock = new SystemClock()
  const auth = deps?.auth || {
    obtenerCuenta: () => 'tecnico@ejemplo.com',
    estaAutenticado: () => true,
  }
  const logger = deps?.logger || {
    error: () => {},
    warn: () => {},
    infoLog: () => {},
  }
  const dispositivoId = 'disp-local-1'
  return {
    db,
    servicios,
    adjuntos,
    uow,
    ids,
    clock,
    auth,
    logger,
    casosDeUso: crearCasosDeUso({ servicios, adjuntos, uow, ids, clock, auth, logger, dispositivoId }),
  }
}
