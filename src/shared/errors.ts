export type CodigoError =
  | 'CONFIG_INVALIDA'
  | 'SIN_CONEXION'
  | 'RED_SIN_CONEXION'
  | 'AUTH_REQUERIDA'
  | 'AUTH_SIN_ROL'
  | 'AUTH_TENANT_INVALIDO'
  | 'SP_SIN_PERMISO'
  | 'SP_NO_ENCONTRADO'
  | 'SP_CONFLICTO'
  | 'SP_LIMITE'
  | 'SP_SERVIDOR'
  | 'VALIDACION'
  | 'VERSION_OBSOLETA'
  | 'NO_AUTORIZADO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'CONFLICTO'
  | 'LIMITE_ALCANZADO'
  | 'ARCHIVO_INVALIDO'
  | 'FALLA_GRAFICO'
  | 'ALMACENAMIENTO_LLENO'
  | 'ALMACENAMIENTO_NO_DISPONIBLE'
  | 'DESCONOCIDO';

export interface DetalleError {
  readonly codigo: CodigoError;
  readonly mensaje: string;
  readonly claveI18n?: string;
  readonly detalles?: Record<string, unknown>;
  readonly causa?: unknown;
  readonly reintentable?: boolean;
  readonly estadoHttp?: number;
}

export class AppError extends Error {
  readonly codigo: CodigoError;
  readonly claveI18n: string | undefined;
  readonly detalles: Record<string, unknown> | undefined;
  readonly reintentable: boolean;
  readonly estadoHttp: number | undefined;

  constructor(detalle: DetalleError) {
    super(detalle.mensaje, { cause: detalle.causa });
    this.name = 'AppError';
    this.codigo = detalle.codigo;
    this.claveI18n = detalle.claveI18n;
    this.detalles = detalle.detalles;
    this.reintentable = detalle.reintentable ?? false;
    this.estadoHttp = detalle.estadoHttp;
  }

  static esAppError(valor: unknown): valor is AppError {
    return valor instanceof AppError;
  }
}

export function aAppError(valor: unknown): AppError {
  if (AppError.esAppError(valor)) {
    return valor;
  }
  if (valor instanceof Error) {
    return new AppError({
      codigo: 'DESCONOCIDO',
      mensaje: valor.message,
      causa: valor,
    });
  }
  return new AppError({ codigo: 'DESCONOCIDO', mensaje: String(valor) });
}

export function traducirErrorDb(error: unknown): AppError {
  if (AppError.esAppError(error)) {
    return error;
  }
  const mensaje = error instanceof Error ? error.message : String(error);
  const codigo: CodigoError =
    mensaje.toLowerCase().includes('quota') || mensaje.toLowerCase().includes('full')
      ? 'ALMACENAMIENTO_LLENO'
      : 'ALMACENAMIENTO_NO_DISPONIBLE';
  return new AppError({
    codigo,
    mensaje,
    claveI18n: `errores.codigo.${codigo}`,
    detalles: { original: mensaje },
    causa: error,
  });
}
