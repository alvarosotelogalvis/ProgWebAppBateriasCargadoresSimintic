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

interface DefinicionError {
  readonly codigo: CodigoError;
  readonly mensaje: string;
  readonly reintentable: boolean;
}

const MENSAJE_MAX = 300;

function definicion(estado: number): DefinicionError {
  switch (estado) {
    case 400:
      return { codigo: 'VALIDACION', mensaje: 'Solicitud inválida', reintentable: false };
    case 401:
      return { codigo: 'AUTH_REQUERIDA', mensaje: 'Sesión expirada', reintentable: false };
    case 403:
      return { codigo: 'SP_SIN_PERMISO', mensaje: 'Sin permisos', reintentable: false };
    case 404:
      return { codigo: 'SP_NO_ENCONTRADO', mensaje: 'No encontrado', reintentable: false };
    case 409:
    case 412:
      return { codigo: 'SP_CONFLICTO', mensaje: 'Conflicto', reintentable: false };
    case 413:
      return { codigo: 'SP_LIMITE', mensaje: 'Contenido demasiado grande', reintentable: false };
    case 429:
      return { codigo: 'SP_LIMITE', mensaje: 'Límite de solicitudes', reintentable: true };
    default:
      if (estado >= 500) {
        return { codigo: 'SP_SERVIDOR', mensaje: 'Error del servidor', reintentable: true };
      }
      return { codigo: 'DESCONOCIDO', mensaje: `Error HTTP ${estado}`, reintentable: false };
  }
}

/** Traduce un estado HTTP a un `AppError` con su clasificación. */
export function clasificarEstado(estado: number): AppError {
  const { codigo, mensaje, reintentable } = definicion(estado);
  return new AppError({
    codigo,
    mensaje,
    claveI18n: `errores.codigo.${codigo}`,
    reintentable,
    estadoHttp: estado,
  });
}

function resumirRespuesta(cuerpo: unknown): { code?: string; message: string } | undefined {
  if (typeof cuerpo !== 'object' || cuerpo === null) return undefined;
  const error = (cuerpo as RespuestaGraphError).error;
  if (!error) return undefined;

  const mensaje =
    typeof error.message === 'string' && error.message.length > 0 ? error.message : 'Sin detalle';
  return {
    ...(error.code ? { code: error.code } : {}),
    message: mensaje.slice(0, MENSAJE_MAX),
  };
}

/**
 * Traduce una respuesta de error de Graph. Guarda solo un resumen acotado del
 * cuerpo para no filtrar datos sensibles ni llenar la bitácora.
 */
export function traducirRespuesta(estado: number, cuerpo?: unknown): AppError {
  const base = clasificarEstado(estado);
  const respuesta = resumirRespuesta(cuerpo);
  if (!respuesta) return base;

  return new AppError({
    codigo: base.codigo,
    mensaje: base.message,
    claveI18n: `errores.codigo.${base.codigo}`,
    reintentable: base.reintentable,
    estadoHttp: estado,
    detalles: { respuesta },
  });
}

export function esReintentable(codigo: CodigoError): boolean {
  return (
    codigo === 'SP_LIMITE' ||
    codigo === 'SP_SERVIDOR' ||
    codigo === 'RED_SIN_CONEXION' ||
    codigo === 'SIN_CONEXION'
  );
}
