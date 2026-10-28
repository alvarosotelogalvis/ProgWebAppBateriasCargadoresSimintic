import { AppError, type CodigoError } from '@/shared/errors';
export type { CodigoError } from '@/shared/errors';

export interface RespuestaGraphError {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly innerError?: {
      readonly 'client-request-id'?: string;
      readonly date?: string;
    };
  };
}

export function traducirRespuesta(respuesta: Response): AppError {
  const estado = respuesta.status;
  if (estado === 401) {
    return new AppError({ codigo: 'AUTH_REQUERIDA', mensaje: 'Sesión expirada', reintentable: false, estadoHttp: 401 });
  }
  if (estado === 403) {
    return new AppError({ codigo: 'SP_SIN_PERMISO', mensaje: 'Sin permisos', reintentable: false, estadoHttp: 403 });
  }
  if (estado === 404) {
    return new AppError({ codigo: 'SP_NO_ENCONTRADO', mensaje: 'No encontrado', reintentable: false, estadoHttp: 404 });
  }
  if (estado === 409) {
    return new AppError({ codigo: 'SP_CONFLICTO', mensaje: 'Conflicto', reintentable: false, estadoHttp: 409 });
  }
  if (estado === 412) {
    return new AppError({ codigo: 'CONFLICTO', mensaje: 'Precondición fallida', reintentable: false, estadoHttp: 412 });
  }
  if (estado === 429) {
    return new AppError({ codigo: 'SP_LIMITE', mensaje: 'Límite de solicitudes', reintentable: true, estadoHttp: 429 });
  }
  if (estado >= 500) {
    return new AppError({ codigo: 'SP_SERVIDOR', mensaje: 'Error del servidor', reintentable: true, estadoHttp: estado });
  }
  return new AppError({ codigo: 'DESCONOCIDO', mensaje: 'Error HTTP ' + estado, reintentable: false, estadoHttp: estado });
}

export function esReintentable(codigo: CodigoError): boolean {
  if (codigo === 'SP_LIMITE' || codigo === 'SP_SERVIDOR' || codigo === 'RED_SIN_CONEXION' || codigo === 'SIN_CONEXION') {
    return true;
  }
  return false;
}
