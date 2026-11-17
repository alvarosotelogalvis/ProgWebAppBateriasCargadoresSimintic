import type { CamposServicio } from '@/domain/servicio';

export type TipoCampo =
  | 'texto'
  | 'multilinea'
  | 'numero'
  | 'fecha'
  | 'fechaFutura'
  | 'monto'
  | 'diagnostico'
  | 'respuesta'
  | 'tipoEquipo'
  | 'cliente';

export interface DefinicionCampo {
  readonly campo: keyof CamposServicio;
  readonly tipo: TipoCampo;
  /** Clave i18n con namespace (`ns:clave`). */
  readonly etiqueta: string;
}

export interface SeccionCampos {
  readonly id: string;
  readonly titulo: string;
  readonly campos: readonly DefinicionCampo[];
}

/** Campos que el Administrador puede corregir, agrupados por etapa (HU-007-8). */
export const SECCIONES_CORREGIBLES: readonly SeccionCampos[] = [
  {
    id: 'recepcion',
    titulo: 'servicios:detalle.recepcion',
    campos: [
      { campo: 'tipoEquipo', tipo: 'tipoEquipo', etiqueta: 'servicios:recepcion.tipoEquipo' },
      { campo: 'fechaRecepcion', tipo: 'fecha', etiqueta: 'servicios:recepcion.fechaRecepcion' },
      { campo: 'clienteId', tipo: 'cliente', etiqueta: 'servicios:recepcion.cliente' },
      { campo: 'marca', tipo: 'texto', etiqueta: 'servicios:recepcion.marca' },
      { campo: 'referencia', tipo: 'texto', etiqueta: 'servicios:recepcion.referencia' },
      { campo: 'serie', tipo: 'texto', etiqueta: 'servicios:recepcion.serie' },
    ],
  },
  {
    id: 'diagnostico',
    titulo: 'etapas:diagnostico.titulo',
    campos: [
      { campo: 'diagnostico', tipo: 'diagnostico', etiqueta: 'etapas:diagnostico.campo' },
      {
        campo: 'observacionTecnica',
        tipo: 'multilinea',
        etiqueta: 'etapas:diagnostico.observacion',
      },
      {
        campo: 'fechaSocializacionDF',
        tipo: 'fecha',
        etiqueta: 'etapas:disposicionFinal.fechaSocializacion',
      },
    ],
  },
  {
    id: 'cotizacion',
    titulo: 'etapas:cotizacion.titulo',
    campos: [
      { campo: 'cotizacionFechaEnvio', tipo: 'fecha', etiqueta: 'etapas:cotizacion.fechaEnvio' },
      { campo: 'cotizacionValor', tipo: 'monto', etiqueta: 'etapas:cotizacion.valor' },
      { campo: 'cotizacionEstado', tipo: 'respuesta', etiqueta: 'etapas:cotizacion.respuesta' },
    ],
  },
  {
    id: 'ordenTrabajo',
    titulo: 'etapas:ordenTrabajo.titulo',
    campos: [
      { campo: 'otDetalle', tipo: 'multilinea', etiqueta: 'etapas:ordenTrabajo.detalle' },
      { campo: 'otCostoReparacion', tipo: 'monto', etiqueta: 'etapas:ordenTrabajo.costo' },
    ],
  },
  {
    id: 'entrega',
    titulo: 'etapas:entrega.titulo',
    campos: [
      { campo: 'fechaEntrega', tipo: 'fecha', etiqueta: 'etapas:entrega.fecha' },
      { campo: 'proyeccionVidaUtil', tipo: 'fechaFutura', etiqueta: 'etapas:entrega.vidaUtil' },
    ],
  },
  {
    id: 'facturacion',
    titulo: 'etapas:facturacion.titulo',
    campos: [
      { campo: 'facturaFecha', tipo: 'fecha', etiqueta: 'etapas:facturacion.fecha' },
      { campo: 'facturaNumero', tipo: 'texto', etiqueta: 'etapas:facturacion.numero' },
    ],
  },
  {
    id: 'anulacion',
    titulo: 'etapas:anulacion.titulo',
    campos: [{ campo: 'anulacionMotivo', tipo: 'multilinea', etiqueta: 'etapas:anulacion.motivo' }],
  },
];
