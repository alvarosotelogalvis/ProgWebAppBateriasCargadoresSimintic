export interface UnidadDeTrabajo {
  ejecutar<T>(fn: (repos: {
    servicios: import('./servicioRepository').ServicioRepository
    adjuntos: import('./adjuntoRepository').AdjuntoRepository
  }) => Promise<T>): Promise<T>
}
