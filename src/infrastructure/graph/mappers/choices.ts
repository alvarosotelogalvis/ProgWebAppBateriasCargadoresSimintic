import type { EstadoCotizacion, EstadoServicio, TipoAdjunto, TipoEquipo } from '@/domain/servicio';

/** Código de dominio ↔ valor visible del Choice en SharePoint (Modelo de datos §4). */
export const VALOR_ESTADO = {
  RECIBIDO: 'Recibido',
  DIAGNOSTICADO: 'Diagnosticado',
  COTIZADO: 'Cotizado',
  EN_REPARACION: 'En reparación',
  ENTREGADO: 'Entregado',
  FACTURADO: 'Facturado',
  DISPOSICION_FINAL: 'Disposición final',
  ANULADO: 'Anulado',
} as const satisfies Partial<Record<EstadoServicio, string>>;

export const VALOR_TIPO_EQUIPO = {
  BATERIA: 'Batería',
  CARGADOR: 'Cargador',
} as const satisfies Record<TipoEquipo, string>;

export const VALOR_COTIZACION_ESTADO = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
} as const satisfies Record<EstadoCotizacion, string>;

export const VALOR_TIPO_ADJUNTO = {
  FOTO_INGRESO: 'Foto ingreso',
  FORMATO_DIAGNOSTICO: 'Formato diagnóstico',
  DISPOSICION_FINAL: 'Disposición final',
  COTIZACION: 'Cotización',
  FOTO_SALIDA: 'Foto salida',
  FACTURA: 'Factura',
} as const satisfies Record<TipoAdjunto, string>;

/** Compara valores de Choice sin distinguir mayúsculas, tildes ni espacios extra. */
export function normalizarChoice(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function codigoAValor<C extends string>(
  codigo: C | undefined,
  mapa: Partial<Record<C, string>>
): string | undefined {
  if (codigo === undefined) return undefined;
  return mapa[codigo];
}

export function valorACodigo<C extends string>(
  valor: unknown,
  mapa: Partial<Record<C, string>>
): C | undefined {
  if (typeof valor !== 'string') return undefined;
  const buscado = normalizarChoice(valor);
  for (const [codigo, visible] of Object.entries(mapa)) {
    if (typeof visible !== 'string') continue;
    if (normalizarChoice(visible) === buscado) return codigo as C;
  }
  return undefined;
}

export function estadoDesdeSharePoint(valor: unknown): EstadoServicio {
  return valorACodigo(valor, VALOR_ESTADO) ?? 'DESCONOCIDO';
}

export function tipoEquipoDesdeSharePoint(valor: unknown): TipoEquipo | undefined {
  return valorACodigo(valor, VALOR_TIPO_EQUIPO);
}

export function cotizacionEstadoDesdeSharePoint(valor: unknown): EstadoCotizacion | undefined {
  return valorACodigo(valor, VALOR_COTIZACION_ESTADO);
}

export function tipoAdjuntoDesdeSharePoint(valor: unknown): TipoAdjunto | undefined {
  return valorACodigo(valor, VALOR_TIPO_ADJUNTO);
}
