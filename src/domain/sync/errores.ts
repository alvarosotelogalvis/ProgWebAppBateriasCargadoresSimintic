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

function reclasificar(original: AppError, codigo: CodigoError, reintentable: boolean): AppError {
  return new AppError({
    codigo,
    mensaje: original.message,
    claveI18n: original.claveI18n ?? `errores.codigo.${codigo}`,
    reintentable,
    ...(original.detalles === undefined ? {} : { detalles: original.detalles }),
    ...(original.estadoHttp === undefined ? {} : { estadoHttp: original.estadoHttp }),
    causa: original,
  });
}

export function clasificarError(error: unknown): AppError {
  if (error instanceof AppError) {
    if (error.codigo === 'AUTH_REQUERIDA' || error.codigo === 'SP_SIN_PERMISO') {
      return error;
    }
    if (error.estadoHttp === 429) {
      return reclasificar(error, 'SP_LIMITE', true);
    }
    if (error.estadoHttp !== undefined && error.estadoHttp >= 500) {
      return reclasificar(error, 'SP_SERVIDOR', true);
    }
    if (error.estadoHttp === 404) {
      return reclasificar(error, 'SP_NO_ENCONTRADO', false);
    }
    if (error.estadoHttp === 403) {
      return reclasificar(error, 'SP_SIN_PERMISO', false);
    }
    return error;
  }

  if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
    return new AppError({
      codigo: 'RED_SIN_CONEXION',
      mensaje: 'Sin conexión',
      reintentable: true,
    });
  }

  return new AppError({ codigo: 'DESCONOCIDO', mensaje: String(error), reintentable: true });
}
