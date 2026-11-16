import { NoEncontradoError, SinPermisoError, TransicionInvalidaError } from '@/domain/errores';
import type { EstadoCotizacion, Rol, Servicio } from '@/domain/servicio';
import type { DepsServicios } from './deps';

export const ROLES_RESPUESTA_COTIZACION: readonly Rol[] = ['Comercial', 'Administrador'];

/**
 * La respuesta del cliente a la cotización se puede cambiar (y corregir) mientras el
 * servicio siga en COTIZADO, sin pasar por una transición de estado (HU-007-3).
 */
export const crearCambiarRespuestaCotizacion =
  (deps: DepsServicios) =>
  async (id: string, respuesta: EstadoCotizacion, roles: readonly Rol[]): Promise<Servicio> => {
    const servicio = await deps.servicios.obtener(id);
    if (!servicio) throw new NoEncontradoError(id);
    if (servicio.estado !== 'COTIZADO') throw new TransicionInvalidaError();
    if (!roles.some((rol) => ROLES_RESPUESTA_COTIZACION.includes(rol))) throw new SinPermisoError();
    if (servicio.cotizacionEstado === respuesta) return servicio;

    const actualizado: Servicio = {
      ...servicio,
      cotizacionEstado: respuesta,
      actualizadoEn: deps.clock.ahoraIso(),
      syncState: servicio.syncState === 'conflict' ? 'conflict' : 'pending',
      camposSucios: [...new Set([...servicio.camposSucios, 'cotizacionEstado' as const])],
    };
    await deps.servicios.guardar(actualizado);
    deps.logger.info('servicio.cotizacion.respuesta', { servicioId: id, respuesta });
    return actualizado;
  };
