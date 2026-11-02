import type { AdjuntoRepository } from '@/application/ports/adjuntoRepository';
import type { ServicioRepository } from '@/application/ports/servicioRepository';

export interface ResumenServicioPendiente {
  readonly servicioId: string;
  readonly codigo: string;
  readonly archivos: number;
  readonly bytes: number;
}

export interface ResumenPendientes {
  readonly servicios: number;
  readonly archivos: number;
  readonly bytes: number;
  readonly porServicio: readonly ResumenServicioPendiente[];
}

export interface DepsResumenPendientes {
  readonly servicios: ServicioRepository;
  readonly adjuntos: AdjuntoRepository;
}

/**
 * Cuenta lo que subirá la próxima sincronización: servicios no borrador con
 * cambios pendientes y sus archivos por subir o eliminar (ES-005-01).
 */
export async function calcularResumenPendientes(
  deps: DepsResumenPendientes
): Promise<ResumenPendientes> {
  const servicios = await deps.servicios.listarPendientes();
  const porServicio: ResumenServicioPendiente[] = [];

  for (const servicio of servicios) {
    const adjuntos = await deps.adjuntos.listarPorServicio(servicio.id);
    const accionables = adjuntos.filter(
      (adjunto) =>
        adjunto.eliminarRemoto || adjunto.syncState === 'pending' || adjunto.syncState === 'error'
    );

    porServicio.push({
      servicioId: servicio.id,
      codigo: servicio.codigo,
      archivos: accionables.length,
      bytes: accionables.reduce(
        (total, adjunto) => (adjunto.eliminarRemoto ? total : total + adjunto.tamanoBytes),
        0
      ),
    });
  }

  return {
    servicios: porServicio.length,
    archivos: porServicio.reduce((total, item) => total + item.archivos, 0),
    bytes: porServicio.reduce((total, item) => total + item.bytes, 0),
    porServicio,
  };
}
