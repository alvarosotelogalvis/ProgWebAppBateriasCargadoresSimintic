import type { TipoAdjunto } from './servicio';

export interface ErrorValidacion {
  campo?: string;
  adjunto?: TipoAdjunto;
  clave: string;
}

export class TransicionInvalidaError extends Error {
  readonly errores: ErrorValidacion[];

  constructor(errores: ErrorValidacion[] = []) {
    super('errores.transicion.noPermitida');
    this.name = 'TransicionInvalidaError';
    this.errores = errores;
  }
}

export class SinPermisoError extends Error {
  constructor(readonly clave = 'errores.transicion.rolNoAutorizado') {
    super(clave);
    this.name = 'SinPermisoError';
  }
}

export class CampoNoEditableError extends Error {
  constructor(readonly campo: string) {
    super('errores.servicio.campoNoEditable');
    this.name = 'CampoNoEditableError';
  }
}

export class EstadoFinalError extends Error {
  constructor() {
    super('errores.transicion.estadoFinal');
    this.name = 'EstadoFinalError';
  }
}

export class BorradorNoEliminableError extends Error {
  constructor(readonly servicioId: string) {
    super('errores.borrador.noEsBorrador');
    this.name = 'BorradorNoEliminableError';
  }
}

export class NoEncontradoError extends Error {
  constructor(readonly servicioId: string) {
    super('errores.servicio.noEncontrado');
    this.name = 'NoEncontradoError';
  }
}

export class AlmacenamientoError extends Error {
  constructor(readonly clave: string) {
    super(clave);
    this.name = 'AlmacenamientoError';
  }
}
