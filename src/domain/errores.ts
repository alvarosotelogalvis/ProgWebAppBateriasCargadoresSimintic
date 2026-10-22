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

export class ValidacionError extends AppError {
  campos: string[]

  constructor(campos: string[], detalles?: Record<string, unknown>) {
    super('VALIDACION_FALLIDA', 'Validación fallida', detalles)
    this.name = 'ValidacionError'
    this.campos = campos
  }
}

export class TransicionNoPermitidaError extends AppError {
  constructor(detalles?: Record<string, unknown>) {
    super('TRANSICION_NO_PERMITIDA', 'Transición no permitida', detalles)
    this.name = 'TransicionNoPermitidaError'
  }
}

export class CampoNoEditableError extends AppError {
  constructor(campo: string, detalles?: Record<string, unknown>) {
    super('CAMPO_NO_EDITABLE', `Campo no editable: ${campo}`, { campo, ...(detalles ?? {}) })
    this.name = 'CampoNoEditableError'
  }
}

export class EstadoFinalError extends AppError {
  constructor(detalles?: Record<string, unknown>) {
    super('ESTADO_FINAL', 'No se permiten transiciones desde estado final', detalles)
    this.name = 'EstadoFinalError'
  }
}

export class SinPermisoError extends AppError {
  constructor(detalles?: Record<string, unknown>) {
    super('SIN_PERMISO', 'Sin permiso', detalles)
    this.name = 'SinPermisoError'
  }
}

export class BorradorNoEliminableError extends AppError {
  constructor(detalles?: Record<string, unknown>) {
    super('BORRADOR_NO_ELIMINABLE', 'Solo se pueden descartar borradores', detalles)
    this.name = 'BorradorNoEliminableError'
  }
}
