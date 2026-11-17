import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { ClienteRemoto, ClientesRemotos } from '@/application/ports/clientesRemotos';
import type { Logger } from '@/application/ports/loggerPort';
import type { ClienteCatalogo } from '@/application/ports/remoteGateway';
import type { ServicioRepository } from '@/application/ports/servicioRepository';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import { resolverVigente, type ClienteNuevo } from '@/domain/cliente';

import type { ClientesLocales } from './clientesLocales';

export interface DepsSubirClientes {
  readonly clientesRemotos: ClientesRemotos;
  readonly clientesLocales: ClientesLocales;
  readonly catalogos: CatalogoRepository;
  readonly servicios: ServicioRepository;
  readonly logger: Logger;
}

export interface ResultadoSubirClientes {
  /** Clientes pendientes que quedaron resueltos contra SharePoint (creados o adoptados). */
  readonly subidos: number;
}

/**
 * Sube los clientes creados sin red, **antes** de los servicios que los usan (ADR-0023). Solo se suben los que
 * algún servicio usa: un cliente tipeado y no usado no ensucia la lista de SharePoint y se conserva para después.
 * Si el guid o el nombre ya existen, SharePoint devuelve ese cliente (valor único) y se adopta; si estaba
 * fusionado, se sigue hasta el vigente. Luego los servicios locales pasan del id temporal al real.
 *
 * Cualquier fallo se propaga sin cambiar nada: el cliente y sus servicios quedan intactos para reintentar.
 */
export const crearSubirClientesNuevos =
  (deps: DepsSubirClientes) => async (): Promise<ResultadoSubirClientes> => {
    const pendientes = await deps.clientesLocales.listar();
    if (pendientes.length === 0) return { subidos: 0 };

    let subidos = 0;
    for (const pendiente of pendientes) {
      const usuarios = (await deps.servicios.listarTodos()).filter(
        (servicio) => servicio.clienteId === pendiente.id
      );
      if (usuarios.length === 0) continue;

      const vigente = await resolverContraSharePoint(deps, pendiente);
      for (const servicio of usuarios) {
        const actual = (await deps.servicios.obtener(servicio.id)) ?? servicio;
        if (actual.clienteId !== pendiente.id) continue;
        const sucios = new Set(actual.camposSucios);
        // Un servicio que ya está en SharePoint debe enviar el cambio de cliente; uno nuevo lo envía al crearse.
        if (actual.sp !== undefined) sucios.add('clienteId');
        await deps.servicios.guardar({
          ...actual,
          clienteId: vigente.id,
          clienteNombre: vigente.nombre,
          camposSucios: [...sucios],
          syncState:
            actual.sp !== undefined && actual.syncState === 'synced' ? 'pending' : actual.syncState,
        });
      }

      await agregarAlCatalogo(deps.catalogos, vigente);
      await deps.clientesLocales.quitar(pendiente.id);
      deps.logger.info('cliente.nuevo.subido', {
        clienteLocal: pendiente.id,
        clienteId: vigente.id,
        servicios: usuarios.length,
      });
      subidos += 1;
    }
    return { subidos };
  };

/** Crea (o adopta) el cliente en SharePoint y devuelve el cliente vigente tras seguir las fusiones. */
async function resolverContraSharePoint(
  deps: DepsSubirClientes,
  pendiente: ClienteNuevo
): Promise<ClienteRemoto> {
  const creado = await deps.clientesRemotos.crearCliente({
    guid: pendiente.guid,
    titulo: pendiente.nombre,
    normalizado: pendiente.normalizado,
  });
  if (creado.activo && creado.fusionadoCon === undefined) return creado;

  const todos = await deps.clientesRemotos.listarClientes();
  const fusionados = todos.flatMap((cliente) =>
    !cliente.activo && cliente.fusionadoCon !== undefined
      ? [{ origenId: cliente.id, destinoId: cliente.fusionadoCon }]
      : []
  );
  const vigenteId = resolverVigente(creado.id, fusionados);
  return todos.find((cliente) => cliente.id === vigenteId) ?? creado;
}

async function agregarAlCatalogo(
  catalogos: CatalogoRepository,
  cliente: ClienteRemoto
): Promise<void> {
  if (!cliente.activo) return;
  const actuales =
    (await catalogos.obtener<readonly ClienteCatalogo[]>(CLAVES_CATALOGO.clientes)) ?? [];
  if (actuales.some((existente) => existente.id === cliente.id)) return;
  const ampliado = [...actuales, { id: cliente.id, nombre: cliente.nombre, activo: true }].sort(
    (a, b) => a.nombre.localeCompare(b.nombre, 'es')
  );
  await catalogos.guardar(CLAVES_CATALOGO.clientes, ampliado);
}
