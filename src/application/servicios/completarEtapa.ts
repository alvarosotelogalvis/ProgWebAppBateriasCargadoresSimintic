import { NoEncontradoError } from '@/domain/errores';
import { aplicarTransicion, TODOS_LOS_CAMPOS } from '@/domain/estados';
import type { AccionEtapa } from '@/domain/estados';
import type { CamposServicio, Rol, Servicio } from '@/domain/servicio';
import type { DepsServicios } from './deps';

export const crearCompletarEtapa =
  (deps: DepsServicios) =>
  async (id: string, accion: AccionEtapa, roles: readonly Rol[]): Promise<Servicio> => {
    return deps.uow.ejecutar(async ({ servicios, adjuntos }) => {
      const servicio = await servicios.obtener(id);
      if (!servicio) throw new NoEncontradoError(id);

      const adjuntosServicio = await adjuntos.listarPorServicio(id);
      const transicionado = aplicarTransicion(
        servicio,
        accion,
        roles,
        adjuntosServicio,
        deps.config(),
        deps.clock.ahoraIso()
      );

      if (servicio.estado === 'BORRADOR') {
        const sucios = new Set<keyof CamposServicio>(['estado']);
        for (const campo of TODOS_LOS_CAMPOS) {
          const valor = transicionado[campo];
          if (valor !== undefined && valor !== null && valor !== '') sucios.add(campo);
        }
        transicionado.camposSucios = [...sucios];
      }

      await servicios.guardar(transicionado);
      await adjuntos.marcarPendientes(id);
      deps.logger.info('servicio.etapa.completada', {
        servicioId: id,
        accion,
        estado: transicionado.estado,
      });
      return transicionado;
    });
  };
