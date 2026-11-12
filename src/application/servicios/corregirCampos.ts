import {
  CampoNoEditableError,
  NoEncontradoError,
  SinPermisoError,
  ValidacionError,
} from '@/domain/errores';
import { validacionesCruzadasFechas } from '@/domain/fechas';
import type { CamposServicio, Rol, Servicio } from '@/domain/servicio';
import { crearActualizarCampos } from './actualizarCampos';
import type { DepsServicios } from './deps';

/**
 * Corrección de datos de etapas ya completadas, solo para el Administrador (HU-007-8).
 * No cambia el estado (un servicio cerrado no se reabre) y deja los campos pendientes de
 * sincronizar. Se rechazan las fechas incoherentes que la corrección introduce; una
 * incoherencia previa no bloquea la corrección de otro campo.
 */
export const crearCorregirCampos =
  (deps: DepsServicios) =>
  async (
    id: string,
    cambios: Partial<CamposServicio>,
    roles: readonly Rol[]
  ): Promise<Servicio> => {
    if (!roles.includes('Administrador')) throw new SinPermisoError();
    const servicio = await deps.servicios.obtener(id);
    if (!servicio) throw new NoEncontradoError(id);
    if ('estado' in cambios) throw new CampoNoEditableError('estado');

    const hoy = deps.clock.fechaHoyIso();
    const antes = validacionesCruzadasFechas(servicio, hoy);
    const nuevos = validacionesCruzadasFechas({ ...servicio, ...cambios }, hoy).filter(
      (error) =>
        !antes.some((previo) => previo.campo === error.campo && previo.clave === error.clave)
    );
    if (nuevos.length > 0) throw new ValidacionError(nuevos);

    return crearActualizarCampos(deps)(id, cambios, roles);
  };
