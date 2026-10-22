import type { Servicio, TipoEquipo } from './servicio';

const PREFIJO: Readonly<Record<TipoEquipo, string>> = {
  BATERIA: 'BAT',
  CARGADOR: 'CAR',
};

export interface DatosCodigo {
  tipoEquipo: TipoEquipo;
  numeroSolicitud: number;
  serie: string;
}

/** Código legible `{BAT|CAR}-{numeroSolicitud}-{serie}` (modelo de datos §2.1). */
export const generarCodigo = (
  datos: Pick<Servicio, 'tipoEquipo' | 'numeroSolicitud' | 'serie'>
): string => {
  const prefijo = PREFIJO[datos.tipoEquipo];
  const serie = datos.serie.trim().replace(/\s+/g, '').toUpperCase();
  return `${prefijo}-${datos.numeroSolicitud}-${serie}`;
};
