export interface ServicioRemoto {
  readonly id?: string;
  readonly fields: Record<string, unknown>;
}

export function aCamposRemotos(servicio: any): Record<string, unknown> {
  const campos: Record<string, unknown> = {};

  if (servicio.ServicioId !== undefined) campos.ServicioId = servicio.ServicioId;
  if (servicio.ClienteId !== undefined) campos.ClienteLookupId = servicio.ClienteId;
  if (servicio.MarcaId !== undefined) campos.MarcaLookupId = servicio.MarcaId;
  if (servicio.TipoEquipo !== undefined) campos.TipoEquipo = servicio.TipoEquipo;
  if (servicio.ModeloEquipo !== undefined) campos.ModeloEquipo = servicio.ModeloEquipo;
  if (servicio.SerieEquipo !== undefined) campos.SerieEquipo = servicio.SerieEquipo;
  if (servicio.DescripcionFalla !== undefined) campos.DescripcionFalla = servicio.DescripcionFalla;
  if (servicio.Estado !== undefined) campos.Estado = servicio.Estado;
  if (servicio.FechaRecepcion !== undefined) campos.FechaRecepcion = servicio.FechaRecepcion;
  if (servicio.Observaciones !== undefined) campos.Observaciones = servicio.Observaciones;
  if (servicio.TecnicoAsignado !== undefined) campos.TecnicoAsignado = servicio.TecnicoAsignado;

  return campos;
}

export function deCamposRemotos(campos: Record<string, unknown>): any {
  return {
    ServicioId: campos.ServicioId,
    ClienteId: campos.ClienteLookupId,
    MarcaId: campos.MarcaLookupId,
    TipoEquipo: campos.TipoEquipo,
    ModeloEquipo: campos.ModeloEquipo,
    SerieEquipo: campos.SerieEquipo,
    DescripcionFalla: campos.DescripcionFalla,
    Estado: campos.Estado,
    FechaRecepcion: campos.FechaRecepcion,
    Observaciones: campos.Observaciones,
    TecnicoAsignado: campos.TecnicoAsignado,
  };
}
