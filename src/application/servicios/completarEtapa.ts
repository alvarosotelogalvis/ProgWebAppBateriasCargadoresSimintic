import type { RepositoriosTransaccion } from '@/application/ports/unidadDeTrabajo';
import type { Adjunto } from '@/domain/adjunto';
import { NoEncontradoError } from '@/domain/errores';
import { aplicarTransicion, TODOS_LOS_CAMPOS } from '@/domain/estados';
import type { AccionEtapa } from '@/domain/estados';
import type { CamposServicio, Rol, Servicio } from '@/domain/servicio';
import type { DepsServicios } from './deps';

/**
 * Diagnóstico normal tras haber llenado la rama Disposición Final (HU-007-2):
 * se descartan la fecha de socialización y el PDF de disposición final.
 */
const limpiarCamposDisposicionFinal = (servicio: Servicio): void => {
  if (servicio.fechaSocializacionDF === undefined) return;
  delete servicio.fechaSocializacionDF;
  servicio.camposSucios = [
    ...new Set<keyof CamposServicio>([...servicio.camposSucios, 'fechaSocializacionDF']),
  ];
};

/** El PDF ya sincronizado no se pierde en silencio: se marca para borrarlo del remoto. */
const descartarPdfDisposicionFinal = async (
  existentes: readonly Adjunto[],
  adjuntos: RepositoriosTransaccion['adjuntos']
): Promise<void> => {
  for (const adjunto of existentes) {
    if (adjunto.tipo !== 'DISPOSICION_FINAL' || adjunto.eliminarRemoto) continue;
    if (adjunto.sp || adjunto.syncState === 'synced') {
      await adjuntos.guardar({
        ...adjunto,
        blob: null,
        miniatura: null,
        eliminarRemoto: true,
        syncState: 'pending',
      });
    } else {
      await adjuntos.eliminarLocal(adjunto.id);
    }
  }
};

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

      const limpiarDF = accion === 'completarDiagnostico';
      if (limpiarDF) limpiarCamposDisposicionFinal(transicionado);

      await servicios.guardar(transicionado);
      await adjuntos.marcarPendientes(id);
      if (limpiarDF) await descartarPdfDisposicionFinal(adjuntosServicio, adjuntos);
      deps.logger.info('servicio.etapa.completada', {
        servicioId: id,
        accion,
        estado: transicionado.estado,
      });
      return transicionado;
    });
  };
