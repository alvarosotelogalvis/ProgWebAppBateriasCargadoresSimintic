import type { Logger } from '@/application/ports/loggerPort';
import type { RemoteGatewayPull } from '@/application/ports/RemoteGatewayPull';
import { mergeTresVias } from '@/domain/merge';
import type { Servicio } from '@/domain/servicio';

import type { ResolutorConflictos } from './resolutorConflictos';

/**
 * Resolutor de los 412 del push (FR-006-07, SDD §9.5): lee el ítem remoto, combina por campo y
 * devuelve `resuelto` si no hay choque (el motor reintenta la subida con el eTag nuevo) o
 * `conflict` si ambos lados cambiaron el mismo campo con valores distintos.
 */
export function crearResolutorConflicto412(deps: {
  readonly remoto: RemoteGatewayPull;
  readonly logger: Logger;
}): ResolutorConflictos {
  return {
    async resolver({ servicio }) {
      const remoto = await deps.remoto.leerServicioRemoto(servicio.id);

      if (!remoto || remoto.deleted) {
        // Sin copia remota que combinar: se deja en conflicto para que lo revise el usuario.
        deps.logger.warn('sync.conflicto.sin_remoto', { servicioId: servicio.id });
        return { estado: 'conflict', servicio: { ...servicio, syncState: 'conflict' } };
      }

      const { servicio: combinado, conflictos } = mergeTresVias(servicio, {
        ...remoto.fields,
        ...(remoto.eTag !== undefined ? { eTag: remoto.eTag } : {}),
      });

      const conSp: Servicio = {
        ...combinado,
        sp: {
          itemId: remoto.itemId ?? combinado.sp?.itemId ?? '',
          eTag: remoto.eTag ?? combinado.sp?.eTag ?? '',
          modificadoEn: remoto.modified ?? combinado.sp?.modificadoEn ?? '',
          webUrl: remoto.webUrl ?? combinado.sp?.webUrl ?? '',
          ...(combinado.sp?.urlCarpeta !== undefined
            ? { urlCarpeta: combinado.sp.urlCarpeta }
            : {}),
        },
      };

      return conflictos.length > 0
        ? { estado: 'conflict', servicio: conSp }
        : { estado: 'resuelto', servicio: conSp };
    },
  };
}
