import type { Servicio } from './servicio'

export const generarCodigo = (servicio: Pick<Servicio, 'equipo' | 'solicitud'>): string => {
  const tipo = servicio.equipo.tipo === 'CARGADOR' ? 'CAR' : servicio.equipo.tipo === 'BATERIA' ? 'BAT' : 'OTR'
  const solicitud = servicio.solicitud
  const serie = servicio.equipo.serie.replace(/\s+/g, '').toUpperCase()
  return `${tipo}-${solicitud}-${serie}`
}
