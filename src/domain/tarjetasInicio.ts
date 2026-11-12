import type { EstadoCotizacion, EstadoServicio, Rol, Servicio } from './servicio';

export type ClaveTarjeta =
  | 'borradores'
  | 'recibidos'
  | 'porOT'
  | 'porEntregar'
  | 'porCotizar'
  | 'cotizadosPendientes'
  | 'porFacturar';

/** Qué servicios cuenta una tarjeta: un estado y, si aplica, la respuesta de la cotización. */
export interface CriterioTarjeta {
  readonly estado: EstadoServicio;
  readonly cotizacionEstado?: EstadoCotizacion;
}

export interface TarjetaInicio {
  readonly clave: ClaveTarjeta;
  readonly criterio: CriterioTarjeta;
}

const TARJETAS_TECNICO: readonly TarjetaInicio[] = [
  { clave: 'borradores', criterio: { estado: 'BORRADOR' } },
  { clave: 'recibidos', criterio: { estado: 'RECIBIDO' } },
  { clave: 'porOT', criterio: { estado: 'COTIZADO', cotizacionEstado: 'APROBADA' } },
  { clave: 'porEntregar', criterio: { estado: 'EN_REPARACION' } },
];

const TARJETAS_COMERCIAL: readonly TarjetaInicio[] = [
  { clave: 'porCotizar', criterio: { estado: 'DIAGNOSTICADO' } },
  { clave: 'cotizadosPendientes', criterio: { estado: 'COTIZADO', cotizacionEstado: 'PENDIENTE' } },
  { clave: 'porFacturar', criterio: { estado: 'ENTREGADO' } },
];

const TODAS: readonly TarjetaInicio[] = [...TARJETAS_TECNICO, ...TARJETAS_COMERCIAL];

/**
 * Tarjetas de trabajo que ve un usuario según sus roles (HU-007-9): la unión de las de cada
 * rol sin duplicados. El Administrador puede avanzar cualquier etapa, así que ve todas.
 */
export function tarjetasPorRol(roles: readonly Rol[]): TarjetaInicio[] {
  const esAdmin = roles.includes('Administrador');
  const tarjetas: TarjetaInicio[] = [];
  if (esAdmin || roles.includes('Tecnico')) tarjetas.push(...TARJETAS_TECNICO);
  if (esAdmin || roles.includes('Comercial')) tarjetas.push(...TARJETAS_COMERCIAL);
  return tarjetas;
}

export const tarjetaPorClave = (clave: string): TarjetaInicio | undefined =>
  TODAS.find((tarjeta) => tarjeta.clave === clave);

/** Un cotizado sin respuesta registrada se considera pendiente de respuesta. */
export const cumpleTarjeta = (
  servicio: Pick<Servicio, 'estado' | 'cotizacionEstado'>,
  tarjeta: TarjetaInicio
): boolean => {
  const { estado, cotizacionEstado } = tarjeta.criterio;
  if (servicio.estado !== estado) return false;
  if (cotizacionEstado === undefined) return true;
  return (servicio.cotizacionEstado ?? 'PENDIENTE') === cotizacionEstado;
};

export const contarTarjetas = (
  servicios: readonly Pick<Servicio, 'estado' | 'cotizacionEstado'>[],
  tarjetas: readonly TarjetaInicio[]
): Record<ClaveTarjeta, number> => {
  const conteo = Object.fromEntries(TODAS.map((tarjeta) => [tarjeta.clave, 0])) as Record<
    ClaveTarjeta,
    number
  >;
  for (const tarjeta of tarjetas) {
    conteo[tarjeta.clave] = servicios.filter((servicio) => cumpleTarjeta(servicio, tarjeta)).length;
  }
  return conteo;
};
