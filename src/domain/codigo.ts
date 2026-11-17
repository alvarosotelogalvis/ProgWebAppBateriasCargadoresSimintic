import type { Servicio, TipoEquipo } from './servicio';
import { esPendiente } from './sync/numeroSolicitud';

const PREFIJO: Readonly<Record<TipoEquipo, string>> = {
  BATERIA: 'BAT',
  CARGADOR: 'CAR',
};

export interface DatosCodigo {
  tipoEquipo: TipoEquipo;
  numeroSolicitud: number;
  serie: string;
}

/**
 * Código legible `{BAT|CAR}-{numeroSolicitud}-{serie}` (modelo de datos §2.1).
 * Mientras el número no se ha asignado (0) usa `PEND`: `BAT-PEND-{serie}` (ADR-0024).
 */
export const generarCodigo = (
  datos: Pick<Servicio, 'tipoEquipo' | 'numeroSolicitud' | 'serie'>
): string => {
  const prefijo = PREFIJO[datos.tipoEquipo];
  const serie = datos.serie.trim().replace(/\s+/g, '').toUpperCase();
  const numero = esPendiente(datos.numeroSolicitud) ? 'PEND' : String(datos.numeroSolicitud);
  return `${prefijo}-${numero}-${serie}`;
};
