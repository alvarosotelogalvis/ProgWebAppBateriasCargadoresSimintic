import type { RemoteGatewayPush } from '@/application/ports/RemoteGatewayPush';
import { AppError } from '@/shared/errors';

/** Forma mínima del servicio que consume el push mientras se completa la 005. */
export interface ServicioPush {
  readonly ServicioId: string;
  readonly sincronizar?: boolean;
  readonly camposModificados?: Record<string, unknown>;
}

/** Forma mínima del adjunto que consume el push mientras se completa la 005. */
export interface AdjuntoPush {
  readonly remotoId?: string;
  readonly syncState?: string;
  readonly eliminar?: boolean;
  readonly archivo?: Blob;
}

export interface PushServicioDeps {
  readonly remoto: RemoteGatewayPush;
  readonly driveId?: string;
  readonly uploader?: unknown;
}

export async function pushServicio(
  servicio: ServicioPush,
  adjuntos: readonly AdjuntoPush[] = [],
  deps: PushServicioDeps
): Promise<void> {
  let remoto = await deps.remoto.buscarServicioPorId(servicio.ServicioId);
  if (!remoto) {
    const campos: Record<string, unknown> = { ServicioId: servicio.ServicioId };
    if (servicio.sincronizar !== undefined) campos.sincronizar = servicio.sincronizar;
    if (servicio.camposModificados !== undefined)
      campos.camposModificados = servicio.camposModificados;
    remoto = await deps.remoto.crearServicio(campos);
  } else if (servicio.sincronizar && servicio.camposModificados) {
    if (!remoto.id) {
      throw new AppError({
        codigo: 'SP_NO_ENCONTRADO',
        mensaje: 'El servicio remoto no tiene identificador.',
        reintentable: false,
      });
    }
    await deps.remoto.actualizarServicio(remoto.id, servicio.camposModificados);
  }

  const marcarEliminar = adjuntos.filter((adjunto) => adjunto.eliminar === true);
  for (const adjunto of marcarEliminar) {
    if (adjunto.remotoId) {
      await deps.remoto.eliminarArchivo(adjunto.remotoId);
    }
  }

  const pendientes = adjuntos.filter(
    (adjunto) => adjunto.syncState === 'pending' && !adjunto.eliminar && adjunto.archivo
  );
  for (const _adjunto of pendientes) {
    // La subida de adjuntos se completa en T017 con UploaderPort.
  }
}
