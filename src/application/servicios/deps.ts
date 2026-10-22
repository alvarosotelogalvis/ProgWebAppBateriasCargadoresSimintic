import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { AuthPort } from '@/application/ports/authPort';
import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/idGenerator';
import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import type { UnidadDeTrabajo } from '@/application/ports/unidadDeTrabajo';
import type { ConfigApp } from '@/domain/config';

export interface DepsServicios {
  servicios: ServicioRepository;
  adjuntos: AdjuntoRepository;
  uow: UnidadDeTrabajo;
  ids: IdGenerator;
  clock: Clock;
  auth: AuthPort;
  logger: Logger;
  meta: MetaRepository;
  config: () => ConfigApp;
  appVersion: string;
}
