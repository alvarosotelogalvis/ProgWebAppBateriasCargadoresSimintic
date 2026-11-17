import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { ClienteCatalogo } from '@/application/ports/remoteGateway';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { esClienteTemporal, resolverVigente, type ClienteFusionado } from '@/domain/cliente';

export interface DepsRemapearFusionados {
  readonly catalogos: CatalogoRepository;
  readonly servicios: ServicioRepository;
  readonly logger: Logger;
}

export interface ResultadoRemapeo {
  readonly remapeados: number;
}

/**
 * Pasa al cliente vigente los servicios **pendientes** de este dispositivo que apuntan a un cliente que se
 * fusionó (ADR-0023). Solo toca los que aún no están en SharePoint o que ya traen el cliente como cambio por
 * enviar: los ya sincronizados se actualizan solos con la descarga. Cambia únicamente el cliente (id y nombre):
 * no pierde ni modifica ningún otro dato local (regla 1 de CLAUDE.md).
 */
export const crearRemapearFusionados =
  (deps: DepsRemapearFusionados) => async (): Promise<ResultadoRemapeo> => {
    const fusionados =
      (await deps.catalogos.obtener<readonly ClienteFusionado[]>(
        CLAVES_CATALOGO.clientesFusionados
      )) ?? [];
    if (fusionados.length === 0) return { remapeados: 0 };

    const catalogo =
      (await deps.catalogos.obtener<readonly ClienteCatalogo[]>(CLAVES_CATALOGO.clientes)) ?? [];
    let remapeados = 0;

    for (const servicio of await deps.servicios.listarTodos()) {
      if (esClienteTemporal(servicio.clienteId)) continue;
      const vigenteId = resolverVigente(servicio.clienteId, fusionados);
      if (vigenteId === servicio.clienteId) continue;
      const llevaElCliente =
        servicio.sp === undefined || servicio.camposSucios.includes('clienteId');
      if (!llevaElCliente) continue;

      const nombre = catalogo.find((cliente) => cliente.id === vigenteId)?.nombre;
      await deps.servicios.guardar({
        ...servicio,
        clienteId: vigenteId,
        clienteNombre: nombre ?? servicio.clienteNombre,
      });
      remapeados += 1;
    }

    if (remapeados > 0)
      deps.logger.info('clientes.fusionados.remapeados', { servicios: remapeados });
    return { remapeados };
  };
