import { generarCodigo } from '@/domain/codigo';
import { CampoNoEditableError, NoEncontradoError } from '@/domain/errores';
import { camposEditables } from '@/domain/estados';
import { normalizarMarca, normalizarReferencia, normalizarSerie } from '@/domain/normalizacion';
import type { CamposServicio, Rol, Servicio } from '@/domain/servicio';
import { CAMPOS_SERVICIO } from '@/domain/servicio';
import type { DepsServicios } from './deps';

const mismoValor = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if ((a === undefined && b === null) || (a === null && b === undefined)) return true;
  return false;
};

export const crearActualizarCampos =
  (deps: DepsServicios) =>
  async (
    id: string,
    cambios: Partial<CamposServicio>,
    roles: readonly Rol[]
  ): Promise<Servicio> => {
    const servicio = await deps.servicios.obtener(id);
    if (!servicio) throw new NoEncontradoError(id);

    const editables = camposEditables(servicio, roles);
    const normalizados: Partial<CamposServicio> = { ...cambios };

    for (const campo of Object.keys(normalizados) as (keyof CamposServicio)[]) {
      if (!CAMPOS_SERVICIO.includes(campo) || !editables.has(campo)) {
        throw new CampoNoEditableError(campo);
      }
    }

    if (typeof normalizados.marca === 'string') {
      normalizados.marca = normalizarMarca(normalizados.marca);
    }
    if (typeof normalizados.referencia === 'string') {
      normalizados.referencia = normalizarReferencia(normalizados.referencia);
    }
    if (typeof normalizados.serie === 'string') {
      normalizados.serie = normalizarSerie(normalizados.serie);
    }

    const actualizado: Servicio = { ...servicio };
    const cambiados: (keyof CamposServicio)[] = [];

    for (const campo of Object.keys(normalizados) as (keyof CamposServicio)[]) {
      const valor = normalizados[campo];
      if (valor === undefined) continue;
      if (!mismoValor(servicio[campo], valor)) cambiados.push(campo);
      (actualizado as unknown as Record<string, unknown>)[campo] = valor;
    }

    actualizado.actualizadoEn = deps.clock.ahoraIso();

    const recalcular =
      cambiados.includes('tipoEquipo') ||
      cambiados.includes('numeroSolicitud') ||
      cambiados.includes('serie');
    if (recalcular) actualizado.codigo = generarCodigo(actualizado);

    if (servicio.estado !== 'BORRADOR') {
      const sucios = new Set<keyof CamposServicio>(servicio.camposSucios);
      for (const campo of cambiados) sucios.add(campo);
      actualizado.camposSucios = [...sucios];
      actualizado.syncState = servicio.syncState === 'conflict' ? 'conflict' : 'pending';
    }

    await deps.servicios.guardar(actualizado);
    deps.logger.debug('servicio.campos.actualizados', {
      servicioId: id,
      campos: cambiados,
    });
    return actualizado;
  };
