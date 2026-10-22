export class AppError extends Error {
  codigo: string
  detalles?: Record<string, unknown>

  constructor(codigo: string, mensaje: string, detalles?: Record<string, unknown>) {
    super(mensaje)
    this.name = 'AppError'
    this.codigo = codigo
    if (detalles) {
      this.detalles = detalles
    }
  }
}

export const traducirErrorDb = (error: unknown): AppError => {
  if (error instanceof AppError) return error
  const mensaje = error instanceof Error ? error.message : String(error)
  if (mensaje.toLowerCase().includes('quota') || mensaje.toLowerCase().includes('full')) {
    return new AppError('ALMACENAMIENTO_LLENO', 'Almacenamiento lleno', { original: mensaje })
  }
  return new AppError('ALMACENAMIENTO_NO_DISPONIBLE', 'Almacenamiento no disponible', { original: mensaje })
}
