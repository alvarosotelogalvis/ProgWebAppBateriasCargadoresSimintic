export type SyncState = 'local' | 'pending' | 'synced' | 'error'

export type RolUsuario = 'Tecnico' | 'Comercial' | 'Administrador'

export type TipoEquipo = 'BATERIA' | 'CARGADOR' | 'OTRO'

export type Etapa =
  | 'RECEPCION'
  | 'DIAGNOSTICO'
  | 'COTIZACION'
  | 'REPARACION'
  | 'PRUEBAS'
  | 'ENTREGA'
  | 'ANULADO'
  | 'DISPOSICION_FINAL'

export type EstadoServicio =
  | 'BORRADOR'
  | 'RECIBIDO'
  | 'DIAGNOSTICADO'
  | 'COTIZADO'
  | 'EN_REPARACION'
  | 'PRUEBAS_OK'
  | 'PRUEBAS_NO_OK'
  | 'LISTO_ENTREGA'
  | 'ENTREGADO'
  | 'FACTURADO'
  | 'ANULADO'
  | 'DISPOSICION_FINAL'

export type Diagnostico = {
  fecha: string
  tecnico: string
  hallazgos: string
  causaFallo: string
  solucionPropuesta: string
  repuestos: string[]
}

export type Cotizacion = {
  fecha: string
  comercial: string
  valorManoObra: number
  valorRepuestos: number
  iva: number
  total: number
  moneda: string
  aceptaCliente: boolean | null
  fechaRespuesta?: string
}

export type Reparacion = {
  fechaInicio: string
  fechaFin?: string
  tecnico: string
  descripcion: string
  repuestosUsados: string[]
}

export type Pruebas = {
  fecha: string
  tecnico: string
  aprobado: boolean
  observaciones?: string
}

export type Entrega = {
  fecha: string
  entregadoPor: string
  recibidoPor: string
  identificacionRecibe: string
  formaEntrega: string
  observaciones?: string
}

export type DisposicionFinal = {
  fecha: string
  registradoPor: string
  tipo: string
  motivo: string
}

export type Anulacion = {
  fecha: string
  usuario: string
  motivo: string
}

export type Cliente = {
  nombre: string
  identificacion?: string
  telefono?: string
  correo?: string
}

export type Equipo = {
  tipo: TipoEquipo
  marca: string
  modelo: string
  serie: string
  referencia?: string
  cliente?: string
}

export type Servicio = {
  ServicioId: string
  Folio: string
  Estado: EstadoServicio
  syncState: SyncState
  capturadoPor: string
  dispositivoId: string
  fechaRecepcion: string
  cliente: Cliente
  equipo: Equipo
  solicitud: string
  diagnostico?: Diagnostico
  cotizacion?: Cotizacion
  reparacion?: Reparacion
  pruebas?: Pruebas
  entrega?: Entrega
  disposicionFinal?: DisposicionFinal
  anulacion?: Anulacion
  camposSucios: string[]
  codigo?: string
  fechaLimiteReparacion?: string
  creadoEn: string
  actualizadoEn: string
  version?: number
  sincronizadoEn?: string
  conflicto?: boolean
  motivoAnulacion?: string
}
