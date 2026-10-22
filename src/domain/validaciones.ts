import { normalizarReferencia, normalizarSerie } from './normalizacion'

const SERIE_REGEX = /^[A-Z0-9-]{3,30}$/
const REFERENCIA_REGEX = /^[A-Z0-9-]{1,40}$/
const SOLICITUD_REGEX = /^[1-9][0-9]{0,9}$/

export type ResultadoValidacion = {
  valido: boolean
  errores: Array<{ campo: string; clave: string }>
}

export const validarSerie = (serie: string): ResultadoValidacion => {
  const normalizada = normalizarSerie(serie)
  if (!normalizada) return { valido: false, errores: [{ campo: 'equipo.serie', clave: 'errores.servicio.serieRequerida' }] }
  if (!SERIE_REGEX.test(normalizada)) {
    return { valido: false, errores: [{ campo: 'equipo.serie', clave: 'errores.servicio.serieFormato' }] }
  }
  return { valido: true, errores: [] }
}

export const validarReferencia = (referencia?: string): ResultadoValidacion => {
  if (!referencia) return { valido: true, errores: [] }
  const normalizada = normalizarReferencia(referencia)
  if (normalizada === '') return { valido: true, errores: [] }
  if (!REFERENCIA_REGEX.test(normalizada)) {
    return { valido: false, errores: [{ campo: 'equipo.referencia', clave: 'errores.servicio.referenciaRequerida' }] }
  }
  return { valido: true, errores: [] }
}

export const validarSolicitud = (solicitud: string): ResultadoValidacion => {
  if (!SOLICITUD_REGEX.test(solicitud)) {
    return { valido: false, errores: [{ campo: 'solicitud', clave: 'errores.servicio.camposObligatorios' }] }
  }
  return { valido: true, errores: [] }
}

export const validarFechasCoherentes = (fechaRecepcion: string, fechaEntrega?: string, vidaUtilProyectada?: string): ResultadoValidacion => {
  const errores: Array<{ campo: string; clave: string }> = []
  const hoy = new Date().toISOString().slice(0, 10)
  if (fechaRecepcion > hoy) {
    errores.push({ campo: 'fechaRecepcion', clave: 'errores.servicio.fechaFutura' })
  }
  if (fechaEntrega) {
    if (fechaEntrega < fechaRecepcion) {
      errores.push({ campo: 'entrega.fecha', clave: 'errores.servicio.entregaAntesRecepcion' })
    }
    if (fechaEntrega > hoy) {
      errores.push({ campo: 'entrega.fecha', clave: 'errores.servicio.fechaFutura' })
    }
    if (vidaUtilProyectada) {
      if (vidaUtilProyectada <= fechaEntrega) {
        errores.push({ campo: 'vidaUtilProyectada', clave: 'errores.servicio.vidaUtilInvalida' })
      }
    }
  }
  return { valido: errores.length === 0, errores }
}

export const validarMotivoAnulacion = (motivo?: string): ResultadoValidacion => {
  if (!motivo || motivo.trim().length < 10) {
    return { valido: false, errores: [{ campo: 'motivoAnulacion', clave: 'errores.servicio.motivoMinimo' }] }
  }
  return { valido: true, errores: [] }
}
