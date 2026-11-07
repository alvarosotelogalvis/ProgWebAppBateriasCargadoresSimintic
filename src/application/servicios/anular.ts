import { NoEncontradoError } from '@/domain/errores';
import { aplicarTransicion } from '@/domain/estados';
import type { Rol, Servicio } from '@/domain/servicio';
import type { DepsServicios } from './deps';

export const crearAnular =
  (deps: DepsServicios) =>
  async (id: string, motivo: string, roles: readonly Rol[]): Promise<Servicio> => {
    return deps.uow.ejecutar(async ({ servicios, adjuntos }) => {
      const servicio = await servicios.obtener(id);
      if (!servicio) throw new NoEncontradoError(id);

      const conMotivo: Servicio = { ...servicio, anulacionMotivo: motivo };
      const adjuntosServicio = await adjuntos.listarPorServicio(id);
      const anulado = aplicarTransicion(
        conMotivo,
        'anular',
        roles,
        adjuntosServicio,
        deps.config(),
        deps.clock.ahoraIso()
      );

      await servicios.guardar(anulado);
      deps.logger.info('servicio.anulado', { servicioId: id, motivo });
      return anulado;
    });
  };
