import type { RemoteGatewayPush } from '@/application/ports/RemoteGatewayPush';

export interface PushServicioDeps {
  readonly remoto: RemoteGatewayPush;
  readonly driveId?: string;
  readonly uploader?: any;
}

export async function pushServicio(servicio: any, adjuntos: any[] = [], deps: PushServicioDeps): Promise<void> {
  let remoto = await deps.remoto.buscarServicioPorId(servicio.ServicioId);
  if (!remoto) {
    remoto = await deps.remoto.crearServicio(Object.assign({ ServicioId: servicio.ServicioId }, servicio));
  } else if (servicio.sincronizar && servicio.camposModificados) {
    await deps.remoto.actualizarServicio(remoto.id, servicio.camposModificados);
  }

  const marcarEliminar = (adjuntos || []).filter(function(a: any) { return a.eliminar; });
  for (let i = 0; i < marcarEliminar.length; i++) {
    const adj = marcarEliminar[i];
    if (adj.remotoId) {
      await deps.remoto.eliminarArchivo(adj.remotoId);
    }
  }

  const pendientes = (adjuntos || []).filter(function(a: any) { return a.syncState === 'pending' && !a.eliminar && a.archivo; });
  for (let i = 0; i < pendientes.length; i++) {
    // subida pendiente de implementar
  }
}
