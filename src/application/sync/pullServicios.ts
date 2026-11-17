import { resolverVigente, type ClienteFusionado } from '@/domain/cliente';
import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Clock } from '@/application/ports/clock';
import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { ClienteCatalogo } from '@/application/ports/remoteGateway';
import type { RemoteGatewayPull } from '@/application/ports/RemoteGatewayPull';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import { CLAVES_CATALOGO, CLAVES_META } from '@/application/setup/claves';
import type { ConfigApp } from '@/domain/config';
import { aplicarCambioRemoto } from '@/domain/sync/aplicarCambioRemoto';
import type { RemotoCambio } from '@/domain/sync/remoto';

export interface ResultadoPull {
  readonly descargados: number;
  readonly actualizados: number;
  readonly conflictos: number;
  readonly eliminados: number;
  /** Servicios insertados o modificados (para descargar sus miniaturas). */
  readonly servicioIds: readonly string[];
}

export interface DepsPullServicios {
  readonly remoto: RemoteGatewayPull;
  readonly servicios: ServicioRepository;
  readonly meta: MetaRepository;
  readonly catalogos: CatalogoRepository;
  readonly reloj: Clock;
  readonly logger: Logger;
  readonly config: () => ConfigApp;
}

export interface OpcionesPull {
  readonly signal: AbortSignal;
  readonly onProgreso?: (procesados: number) => void;
}

export type PullServicios = (opciones: OpcionesPull) => Promise<ResultadoPull>;

/**
 * Descarga los servicios creados o modificados en SharePoint desde la última sincronización
 * (SDD §9.2, FR-006-01 a FR-006-06, FR-006-10).
 *
 * El `deltaLink` se guarda solo cuando todos los cambios quedaron aplicados: si la descarga se
 * corta a la mitad, la siguiente repite los cambios y el resultado es el mismo (idempotente).
 */
export function crearPullServicios(deps: DepsPullServicios): PullServicios {
  return async ({ signal, onProgreso }) => {
    const deltaLinkAnterior = await deps.meta.obtener<string>(CLAVES_META.deltaLinkServicios);
    const { cambios, deltaLink, metodo } = await deps.remoto.cambiosServicios(
      deltaLinkAnterior,
      signal
    );

    const clientes =
      (await deps.catalogos.obtener<readonly ClienteCatalogo[]>(CLAVES_CATALOGO.clientes)) ?? [];
    const nombrePorCliente = new Map(clientes.map((cliente) => [cliente.id, cliente.nombre]));
    // Un servicio que aún apunta a un cliente fusionado muestra el nombre del cliente vigente (spec 010).
    const fusionados =
      (await deps.catalogos.obtener<readonly ClienteFusionado[]>(
        CLAVES_CATALOGO.clientesFusionados
      )) ?? [];
    for (const { origenId, destinoId } of fusionados) {
      const nombreVigente = nombrePorCliente.get(resolverVigente(destinoId, fusionados));
      if (nombreVigente !== undefined && !nombrePorCliente.has(origenId)) {
        nombrePorCliente.set(origenId, nombreVigente);
      }
    }
    const ctx = {
      ahora: new Date(deps.reloj.ahoraIso()),
      retencionMeses: deps.config().retencionCerradosMeses,
    };

    let descargados = 0;
    let actualizados = 0;
    let conflictos = 0;
    let eliminados = 0;
    const servicioIds = new Set<string>();
    let procesados = 0;

    for (const cambioRemoto of cambios) {
      signal.throwIfAborted();
      procesados += 1;

      // Las entradas eliminadas de un delta no traen `ServicioId`: se buscan por ítem.
      let local = cambioRemoto.servicioId
        ? await deps.servicios.obtener(cambioRemoto.servicioId)
        : undefined;
      if (!local && cambioRemoto.deleted && cambioRemoto.itemId) {
        local = await deps.servicios.buscarPorSpItemId(cambioRemoto.itemId);
      }

      const cambio = completarCliente(
        cambioRemoto.deleted && local ? { ...cambioRemoto, servicioId: local.id } : cambioRemoto,
        nombrePorCliente
      );
      const decision = aplicarCambioRemoto(local, cambio, ctx);

      switch (decision.tipo) {
        case 'INSERTAR':
          await deps.servicios.guardar(decision.servicio);
          descargados += 1;
          servicioIds.add(decision.servicio.id);
          break;
        case 'SOBRESCRIBIR':
          await deps.servicios.guardar(decision.servicio);
          actualizados += 1;
          servicioIds.add(decision.servicio.id);
          break;
        case 'COMBINAR':
          await deps.servicios.guardar(decision.servicio);
          actualizados += 1;
          servicioIds.add(decision.servicio.id);
          if (decision.servicio.syncState === 'conflict') conflictos += 1;
          break;
        case 'CONFLICTO_ELIMINACION':
          await deps.servicios.guardar(decision.servicio);
          conflictos += 1;
          break;
        case 'ELIMINAR_LOCAL':
          if (local && (await deps.servicios.eliminarSincronizado(local.id))) {
            eliminados += 1;
          }
          break;
        case 'IGNORAR':
          deps.logger.debug('pull.ignorado', {
            servicioId: cambio.servicioId,
            motivo: decision.motivo,
          });
          break;
      }
      onProgreso?.(procesados);
    }

    if (deltaLink) {
      await deps.meta.guardar(CLAVES_META.deltaLinkServicios, deltaLink);
    }
    await deps.meta.guardar(CLAVES_META.metodoPull, metodo);

    return { descargados, actualizados, conflictos, eliminados, servicioIds: [...servicioIds] };
  };
}

/** SharePoint solo devuelve el id del cliente: el nombre sale del catálogo local. */
function completarCliente(
  cambio: RemotoCambio,
  nombrePorCliente: ReadonlyMap<number, string>
): RemotoCambio {
  const clienteId = cambio.fields.clienteId;
  if (clienteId === undefined) return cambio;
  const nombre = nombrePorCliente.get(clienteId);
  return nombre === undefined
    ? cambio
    : { ...cambio, fields: { ...cambio.fields, clienteNombre: nombre } };
}
