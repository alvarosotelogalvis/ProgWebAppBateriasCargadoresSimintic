import { generarCodigo } from '@/domain/codigo';
import { SinPermisoError } from '@/domain/errores';
import type { Servicio } from '@/domain/servicio';
import type { DepsServicios } from './deps';

export const crearCrearBorrador = (deps: DepsServicios) => async (): Promise<Servicio> => {
  const cuenta = deps.auth.cuentaActiva();
  if (!cuenta) throw new SinPermisoError('errores.auth.requerida');

  const ahora = deps.clock.ahoraIso();
  const dispositivoId = await deps.meta.dispositivoId();
  const base = {
    tipoEquipo: 'BATERIA' as const,
    numeroSolicitud: 0,
    serie: '',
  };

  const servicio: Servicio = {
    id: deps.ids.siguiente(),
    codigo: generarCodigo(base),
    estado: 'BORRADOR',
    capturadoPor: cuenta.correo,
    capturadoPorNombre: cuenta.nombre,
    creadoEn: ahora,
    actualizadoEn: ahora,
    dispositivoId,
    appVersion: deps.appVersion,
    tipoEquipo: base.tipoEquipo,
    fechaRecepcion: deps.clock.fechaHoyIso(),
    clienteId: 0,
    clienteNombre: '',
    numeroSolicitud: base.numeroSolicitud,
    marca: '',
    referencia: '',
    serie: base.serie,
    syncState: 'local',
    camposSucios: [],
    base: {},
    conflictos: [],
    intentos: 0,
    origen: 'local',
  };

  await deps.servicios.guardar(servicio);
  deps.logger.info('servicio.borrador.creado', { servicioId: servicio.id });
  return servicio;
};
