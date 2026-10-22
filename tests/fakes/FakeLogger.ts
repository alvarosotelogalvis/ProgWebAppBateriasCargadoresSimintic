import type { LoggerPort } from '@/application/ports/loggerPort'

export class FakeLogger implements LoggerPort {
  errores: Array<{ mensaje: string; contexto?: Record<string, unknown> }> = []
  advertencias: Array<{ mensaje: string; contexto?: Record<string, unknown> }> = []
  info: Array<{ mensaje: string; contexto?: Record<string, unknown> }> = []

  error = (mensaje: string, contexto?: Record<string, unknown>): void => {
    this.errores.push({ mensaje, ...(contexto ? { contexto } : {}) })
  }

  warn = (mensaje: string, contexto?: Record<string, unknown>): void => {
    this.advertencias.push({ mensaje, ...(contexto ? { contexto } : {}) })
  }

  infoLog = (mensaje: string, contexto?: Record<string, unknown>): void => {
    this.info.push({ mensaje, ...(contexto ? { contexto } : {}) })
  }

  limpiar = (): void => {
    this.errores = []
    this.advertencias = []
    this.info = []
  }
}
