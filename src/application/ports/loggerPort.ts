export interface LoggerPort {
  error(mensaje: string, contexto?: Record<string, unknown>): void
  warn(mensaje: string, contexto?: Record<string, unknown>): void
  infoLog(mensaje: string, contexto?: Record<string, unknown>): void
}
