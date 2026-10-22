import type { EstadoServicio, Etapa, RolUsuario } from './servicio'

export const ORDEN_ESTADOS: EstadoServicio[] = [
  'BORRADOR',
  'RECIBIDO',
  'DIAGNOSTICADO',
  'COTIZADO',
  'EN_REPARACION',
  'PRUEBAS_OK',
  'PRUEBAS_NO_OK',
  'LISTO_ENTREGA',
  'ENTREGADO',
  'FACTURADO',
  'ANULADO',
  'DISPOSICION_FINAL',
]

export const ESTADOS_FINALES: EstadoServicio[] = ['ENTREGADO', 'FACTURADO', 'ANULADO', 'DISPOSICION_FINAL']

export const esFinal = (estado: EstadoServicio): boolean => ESTADOS_FINALES.includes(estado)

export type RequisitoTransicion = {
  descripcion: string
  clave: string
  tipo: 'campo' | 'adjunto'
}

export type Transicion = {
  desde: EstadoServicio
  hacia: EstadoServicio
  roles: RolUsuario[]
  requisitos: RequisitoTransicion[]
}

export const TRANSICIONES: Transicion[] = [
  {
    desde: 'BORRADOR',
    hacia: 'RECIBIDO',
    roles: ['Tecnico', 'Administrador'],
    requisitos: [
      { descripcion: 'Cliente completo', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
      { descripcion: 'Equipo completo', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
      { descripcion: 'Solicitud', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
    ],
  },
  {
    desde: 'RECIBIDO',
    hacia: 'DIAGNOSTICADO',
    roles: ['Tecnico', 'Administrador'],
    requisitos: [
      { descripcion: 'Diagnóstico completo', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
      { descripcion: 'Adjunto diagnóstico', clave: 'errores.servicio.camposObligatorios', tipo: 'adjunto' },
    ],
  },
  {
    desde: 'RECIBIDO',
    hacia: 'DISPOSICION_FINAL',
    roles: ['Tecnico', 'Administrador'],
    requisitos: [
      { descripcion: 'Diagnóstico con disposición final', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
    ],
  },
  {
    desde: 'DIAGNOSTICADO',
    hacia: 'COTIZADO',
    roles: ['Comercial', 'Administrador'],
    requisitos: [
      { descripcion: 'Cotización completa', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
    ],
  },
  {
    desde: 'COTIZADO',
    hacia: 'EN_REPARACION',
    roles: ['Comercial', 'Administrador'],
    requisitos: [
      { descripcion: 'Cotización aceptada', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
    ],
  },
  {
    desde: 'COTIZADO',
    hacia: 'ENTREGADO',
    roles: ['Comercial', 'Tecnico', 'Administrador'],
    requisitos: [
      { descripcion: 'Entrega con datos', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
      { descripcion: 'Fotos de salida', clave: 'errores.servicio.camposObligatorios', tipo: 'adjunto' },
    ],
  },
  {
    desde: 'EN_REPARACION',
    hacia: 'PRUEBAS_OK',
    roles: ['Tecnico', 'Administrador'],
    requisitos: [],
  },
  {
    desde: 'PRUEBAS_OK',
    hacia: 'LISTO_ENTREGA',
    roles: ['Tecnico', 'Administrador'],
    requisitos: [],
  },
  {
    desde: 'LISTO_ENTREGA',
    hacia: 'ENTREGADO',
    roles: ['Tecnico', 'Comercial', 'Administrador'],
    requisitos: [
      { descripcion: 'Entrega', clave: 'errores.servicio.camposObligatorios', tipo: 'campo' },
    ],
  },
  {
    desde: 'ENTREGADO',
    hacia: 'FACTURADO',
    roles: ['Comercial', 'Administrador'],
    requisitos: [],
  },
]

export const transicionesDisponibles = (
  estado: EstadoServicio,
  rol: RolUsuario,
): Transicion[] => {
  if (esFinal(estado)) return []
  return TRANSICIONES.filter((t) => t.desde === estado && t.roles.includes(rol))
}
