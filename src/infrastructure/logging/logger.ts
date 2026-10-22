import type { LoggerPort } from '@/application/ports/loggerPort'

export class Logger implements LoggerPort {
  private max = 2000
  private eventos: Array<{ nivel: 'info' | 'warn' | 'error'; mensaje: string; timestamp: string; contexto?: Record<string, unknown> }> = []

  error(mensaje: string, contexto?: Record<string, unknown>): void {
    this.agregar('error', mensaje, contexto)
  }

  warn(mensaje: string, contexto?: Record<string, unknown>): void {
    this.agregar('warn', mensaje, contexto)
  }

  infoLog(mensaje: string, contexto?: Record<string, unknown>): void {
    this.agregar('info', mensaje, contexto)
  }

  private agregar(nivel: 'info' | 'warn' | 'error', mensaje: string, contexto?: Record<string, unknown>): void {
    const limpio = contexto ? this.limpiar(contexto) : undefined
    this.eventos.push({ nivel, mensaje, timestamp: new Date().toISOString(), ...(limpio ? { contexto: limpio } : {}) })
    if (this.eventos.length > this.max) {
      this.eventos.shift()
    }
  }

  private limpiar(ctx: Record<string, unknown>): Record<string, unknown> {
    const prohibidas = ['token', 'password', 'secret', 'archivo', 'blob', 'file']
    const res: Record<string, unknown> = {}
    for (const k of Object.keys(ctx)) {
      if (prohibidas.some((p) => k.toLowerCase().includes(p))) continue
      res[k] = ctx[k]
    }
    return res
  }

  obtener(): typeof this.eventos {
    return this.eventos
  }
}
