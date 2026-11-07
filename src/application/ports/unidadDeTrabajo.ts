import type { AdjuntoRepository } from './adjuntoRepository';
import type { ServicioRepository } from './servicioRepository';

export interface RepositoriosTransaccion {
  servicios: ServicioRepository;
  adjuntos: AdjuntoRepository;
}

export interface UnidadDeTrabajo {
  ejecutar<T>(fn: (repos: RepositoriosTransaccion) => Promise<T>): Promise<T>;
}
