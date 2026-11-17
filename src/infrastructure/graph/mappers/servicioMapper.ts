import { esPendiente } from '@/domain/sync/numeroSolicitud';
import type { CamposServicio, Servicio } from '@/domain/servicio';

import {
  VALOR_COTIZACION_ESTADO,
  VALOR_ESTADO,
  VALOR_TIPO_EQUIPO,
  codigoAValor,
  cotizacionEstadoDesdeSharePoint,
  estadoDesdeSharePoint,
  tipoEquipoDesdeSharePoint,
} from './choices';

/** Columna interna de SharePoint para cada campo del dominio (Modelo de datos §2). */
export const CAMPO_SP: Readonly<Partial<Record<keyof CamposServicio, string>>> = {
  tipoEquipo: 'TipoEquipo',
  estado: 'Estado',
  fechaRecepcion: 'FechaRecepcion',
  clienteId: 'ClienteLookupId',
  numeroSolicitud: 'NumeroSolicitud',
  marca: 'Marca',
  referencia: 'Referencia',
  serie: 'SerieEquipo',
  diagnostico: 'Diagnostico',
  observacionTecnica: 'ObservacionTecnica',
  fechaSocializacionDF: 'FechaSocializacionDF',
  cotizacionFechaEnvio: 'CotizacionFechaEnvio',
  cotizacionValor: 'CotizacionValor',
  cotizacionEstado: 'CotizacionEstado',
  otDetalle: 'OTDetalle',
  otCostoReparacion: 'OTCostoReparacion',
  fechaEntrega: 'FechaEntrega',
  proyeccionVidaUtil: 'ProyeccionVidaUtil',
  facturaNumero: 'FacturaNumero',
  facturaFecha: 'FacturaFecha',
  anulacionMotivo: 'MotivoAnulacion',
  anulacionFecha: 'FechaAnulacion',
};

const CAMPOS_FECHA = new Set<keyof CamposServicio>([
  'fechaRecepcion',
  'fechaSocializacionDF',
  'cotizacionFechaEnvio',
  'fechaEntrega',
  'proyeccionVidaUtil',
  'facturaFecha',
  'anulacionFecha',
]);

const CAMPOS_NUMERO = new Set<keyof CamposServicio>([
  'clienteId',
  'numeroSolicitud',
  'cotizacionValor',
  'otCostoReparacion',
]);

/** Columnas que escribe Power Automate: la app nunca las envía (SDD §7.4). */
export const COLUMNAS_SOLO_POWER_AUTOMATE = ['OTCorreoEnviado', 'AlertaVidaUtilNivel'] as const;

export function fechaASharePoint(valor: string): string {
  if (valor.includes('T')) return valor;
  return `${valor}T00:00:00Z`;
}

function valorASharePoint(campo: keyof CamposServicio, valor: unknown): unknown {
  if (CAMPOS_FECHA.has(campo) && typeof valor === 'string') return fechaASharePoint(valor);
  if (CAMPOS_NUMERO.has(campo)) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : undefined;
  }
  if (campo === 'estado') {
    return typeof valor === 'string'
      ? codigoAValor(valor as keyof typeof VALOR_ESTADO, VALOR_ESTADO)
      : undefined;
  }
  if (campo === 'tipoEquipo') {
    return typeof valor === 'string'
      ? codigoAValor(valor as keyof typeof VALOR_TIPO_EQUIPO, VALOR_TIPO_EQUIPO)
      : undefined;
  }
  if (campo === 'cotizacionEstado') {
    return typeof valor === 'string'
      ? codigoAValor(valor as keyof typeof VALOR_COTIZACION_ESTADO, VALOR_COTIZACION_ESTADO)
      : undefined;
  }
  return valor;
}

/**
 * Proyecta el dominio a columnas de SharePoint (SDD §7.4).
 * Sin `camposSucios` envía el registro completo (creación); con ellos, solo esos campos.
 * Un campo sucio vacío se envía como `null` para borrarlo en SharePoint.
 * Siempre se envían `AppVersion`, `ActualizadoEnDispositivo` y `DispositivoId`.
 */
export function aCamposSP(
  servicio: Servicio,
  camposSucios?: readonly (keyof CamposServicio)[]
): Record<string, unknown> {
  const campos: Record<string, unknown> = {};

  if (camposSucios === undefined) {
    campos.ServicioId = servicio.id;
    campos.Title = servicio.codigo;
    campos.CapturadoPor = servicio.capturadoPor;
    campos.CapturadoPorNombre = servicio.capturadoPorNombre;
    campos.CapturadoEn = servicio.creadoEn;
    if (servicio.urlCarpetaAdjuntos !== undefined) {
      campos.UrlCarpetaAdjuntos = servicio.urlCarpetaAdjuntos;
    }
  }

  for (const [campo, columna] of Object.entries(CAMPO_SP)) {
    if (columna === undefined) continue;
    const clave = campo as keyof CamposServicio;
    if (camposSucios !== undefined && !camposSucios.includes(clave)) continue;
    const valor = servicio[clave];
    // Pendiente (0): el número lo asigna la subida; nunca se escribe un 0 en SharePoint (ADR-0024).
    if (clave === 'numeroSolicitud' && esPendiente(Number(valor))) continue;
    if (valor === undefined) {
      // Un campo sucio sin valor es un campo que se vació: se envía `null` para limpiar la columna.
      if (camposSucios !== undefined) campos[columna] = null;
      continue;
    }
    const convertido = valorASharePoint(clave, valor);
    if (convertido !== undefined) campos[columna] = convertido;
  }

  campos.AppVersion = servicio.appVersion;
  campos.ActualizadoEnDispositivo = servicio.actualizadoEn;
  campos.DispositivoId = servicio.dispositivoId;

  return campos;
}

function leerNumero(valor: unknown): number | undefined {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : undefined;
}

/**
 * Proyecta los `fields` de SharePoint al dominio.
 * Las fechas de solo fecha se leen como `yyyy-MM-dd`. Un `Estado` desconocido
 * se degrada a `DESCONOCIDO`; un `TipoEquipo` desconocido se omite para conservar el local.
 */
export function deCamposSP(campos: Record<string, unknown>): Partial<CamposServicio> {
  const resultado: Record<string, unknown> = {};

  for (const [campo, columna] of Object.entries(CAMPO_SP)) {
    if (columna === undefined) continue;
    const clave = campo as keyof CamposServicio;
    const valor = campos[columna] ?? (clave === 'clienteId' ? campos.ClienteId : undefined);
    if (valor === undefined || valor === null) continue;

    if (CAMPOS_FECHA.has(clave)) {
      if (typeof valor === 'string' && valor.length >= 10) resultado[clave] = valor.slice(0, 10);
      continue;
    }
    if (CAMPOS_NUMERO.has(clave)) {
      const numero = leerNumero(valor);
      if (numero !== undefined) resultado[clave] = numero;
      continue;
    }
    if (clave === 'estado') {
      resultado.estado = estadoDesdeSharePoint(valor);
      continue;
    }
    if (clave === 'tipoEquipo') {
      const tipo = tipoEquipoDesdeSharePoint(valor);
      if (tipo !== undefined) resultado.tipoEquipo = tipo;
      continue;
    }
    if (clave === 'cotizacionEstado') {
      const estado = cotizacionEstadoDesdeSharePoint(valor);
      if (estado !== undefined) resultado.cotizacionEstado = estado;
      continue;
    }
    if (typeof valor === 'string') resultado[clave] = valor.trim();
  }

  return resultado as Partial<CamposServicio>;
}
