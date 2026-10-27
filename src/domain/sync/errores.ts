import { AppError, type CodigoError } from '../../shared/errors';

const NO_REINTENTABLES: Set<CodigoError> = new Set([
  'AUTH_REQUERIDA',
  'AUTH_SIN_ROL',
  'AUTH_TENANT_INVALIDO',
  'SP_SIN_PERMISO',
  'SP_NO_ENCONTRADO',
  'VALIDACION',
  'VERSION_OBSOLETA',
  'NO_AUTORIZADO',
]);

export function esNoReintentable(codigo: CodigoError): boolean {
  return NO_REINTENTABLES.has(codigo);
}

export function clasificarError(error: unknown): AppError {
  const appError = error instanceof AppError ? error : undefined;
  if (appError) {
    if (appError.codigo === 'AUTH_REQUERIDA') {
      return appError;
    }
    if (appError.codigo === 'SP_SIN_PERMISO') {
      return appError;
    }
    if (appError.estadoHttp === 429) {
      return new AppError({ ...appError, codigo: 'SP_LIMITE', reintentable: true });
    }
    if (appError.estadoHttp && appError.estadoHttp >= 500) {
      return new AppError({ ...appError, codigo: 'SP_SERVIDOR', reintentable: true });
    }
    if (appError.estadoHttp === 404) {
      return new AppError({ ...appError, codigo: 'SP_NO_ENCONTRADO', reintentable: false });
    }
    if (appError.estadoHttp === 403) {
      return new AppError({ ...appError, codigo: 'SP_SIN_PERMISO', reintentable: false });
    }
  }

  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return new AppError({ codigo: 'RED_SIN_CONEXION', mensaje: 'Sin conexión', reintentable: true });
  }

  if (error instanceof AppError) return error;
  return new AppError({ codigo: 'DESCONOCIDO', mensaje: String(error), reintentable: true });
}
