export type TipoEquipo = 'BATERIA' | 'CARGADOR';

export type EstadoServicio =
  | 'BORRADOR'
  | 'RECIBIDO'
  | 'DIAGNOSTICADO'
  | 'COTIZADO'
  | 'EN_REPARACION'
  | 'ENTREGADO'
  | 'FACTURADO'
  | 'DISPOSICION_FINAL'
  | 'ANULADO'
  | 'DESCONOCIDO';

export type EstadoCotizacion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export type TipoAdjunto =
  | 'FOTO_INGRESO'
  | 'FORMATO_DIAGNOSTICO'
  | 'DISPOSICION_FINAL'
  | 'COTIZACION'
  | 'FOTO_SALIDA'
  | 'FACTURA';

export type SyncState = 'local' | 'pending' | 'syncing' | 'synced' | 'error' | 'conflict';

export type Rol = 'Tecnico' | 'Comercial' | 'Administrador';

export interface CuentaUsuario {
  readonly id: string;
  readonly nombre: string;
  readonly correo: string;
  readonly roles: readonly Rol[];
  readonly tenantId?: string;
  readonly homeId?: string;
  readonly ultimoLoginInteractivoEn?: string;
}

export interface CamposServicio {
  tipoEquipo: TipoEquipo;
  estado: EstadoServicio;
  fechaRecepcion: string;
  clienteId: number;
  clienteNombre: string;
  numeroSolicitud: number;
  marca: string;
  referencia: string;
  serie: string;
  diagnostico?: string;
  observacionTecnica?: string;
  fechaSocializacionDF?: string;
  cotizacionFechaEnvio?: string;
  cotizacionValor?: number;
  cotizacionEstado?: EstadoCotizacion;
  otDetalle?: string;
  otCostoReparacion?: number;
  fechaEntrega?: string;
  proyeccionVidaUtil?: string;
  facturaNumero?: string;
  facturaFecha?: string;
  anulacionMotivo?: string;
  anulacionFecha?: string;
}

export interface ConflictoCampo {
  campo: keyof CamposServicio;
  local: unknown;
  remoto: unknown;
}

export interface DatosRemotosServicio {
  itemId: string;
  eTag: string;
  modificadoEn: string;
  webUrl: string;
  urlCarpeta?: string;
}

export interface ErrorRemoto {
  codigo: string;
  mensaje: string;
  en: string;
}

export interface Servicio extends CamposServicio {
  id: string;
  codigo: string;
  capturadoPor: string;
  capturadoPorNombre: string;
  creadoEn: string;
  actualizadoEn: string;
  dispositivoId: string;
  appVersion: string;
  urlCarpetaAdjuntos?: string;
  syncState: SyncState;
  camposSucios: (keyof CamposServicio)[];
  base: Partial<CamposServicio>;
  conflictos: ConflictoCampo[];
  sp?: DatosRemotosServicio;
  intentos: number;
  proximoIntentoEn?: string;
  ultimoError?: ErrorRemoto;
  origen: 'local' | 'remoto';
}

export const CAMPOS_SERVICIO: readonly (keyof CamposServicio)[] = [
  'tipoEquipo',
  'estado',
  'fechaRecepcion',
  'clienteId',
  'clienteNombre',
  'numeroSolicitud',
  'marca',
  'referencia',
  'serie',
  'diagnostico',
  'observacionTecnica',
  'fechaSocializacionDF',
  'cotizacionFechaEnvio',
  'cotizacionValor',
  'cotizacionEstado',
  'otDetalle',
  'otCostoReparacion',
  'fechaEntrega',
  'proyeccionVidaUtil',
  'facturaNumero',
  'facturaFecha',
  'anulacionMotivo',
  'anulacionFecha',
];
