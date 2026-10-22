import { BorradorNoEliminableError, NoEncontradoError } from '@/domain/errores';
import type { DepsServicios } from './deps';

export const crearDescartarBorrador =
  (deps: DepsServicios) =>
  async (id: string): Promise<void> => {
    await deps.uow.ejecutar(async ({ servicios, adjuntos }) => {
      const servicio = await servicios.obtener(id);
      if (!servicio) throw new NoEncontradoError(id);
      if (servicio.estado !== 'BORRADOR') throw new BorradorNoEliminableError(id);

      await adjuntos.eliminarPorServicio(id);
      await servicios.eliminarBorrador(id);
      deps.logger.info('servicio.borrador.descartado', { servicioId: id });
    });
  };
