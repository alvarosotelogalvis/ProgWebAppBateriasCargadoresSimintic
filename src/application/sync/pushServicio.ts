import type { RemoteGatewayPush } from '@/application/ports/RemoteGatewayPush';

export interface PushServicioDeps {
  readonly remoto: RemoteGatewayPush;
  readonly driveId?: string;
  readonly uploader?: any;
}

export async function pushServicio(servicio: any, adjuntos: any[] = [], deps: PushServicioDeps): Promise<void> {
  // Asegurar item
  let remoto = await deps.remoto.buscarServicioPorId(servicio.ServicioId);
  if (!remoto) {
    remoto = await deps.remoto.crearServicio({ ServicioId: servicio.ServicioId, ...servicio });
  } else if (servicio.sincronizar && servicio.camposModificados) {
    await deps.remoto.actualizarServicio(remoto.id, servicio.camposModificados);
  }

  // Eliminar adjuntos marcados para eliminar
  const marcarEliminar = (adjuntos || []).filter((a) => a.eliminar);
  for (const adj of marcarEliminar) {
    if (adj.remotoId) {
      await deps.remoto.eliminarArchivo(adj.remotoId);
    }
  }

  // Subir adjuntos pendientes
  const pendientes = (adjuntos || []).filter((a) => a.syncState === 'pending' && !a.eliminar && a.archivo);
  for (const adj of pendientes) {
    if (deps.uploader && deps.driveId) {
      // Subida simplificada
      const url = ${adj.nombreArchivo};
      // En implementación real usar createUploadSession + subirArchivo
    }
  }
}
