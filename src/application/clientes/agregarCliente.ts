import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/idGenerator';
import type { Logger } from '@/application/ports/loggerPort';
import type { ClienteCatalogo } from '@/application/ports/remoteGateway';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import {
  idTemporalDeGuid,
  normalizarNombre,
  tituloDeNombre,
  validarNombre,
} from '@/domain/cliente';

import type { ClientesLocales } from './clientesLocales';

/** El nombre del cliente está vacío o es demasiado largo. */
export class NombreClienteInvalidoError extends Error {
  readonly motivo: 'VACIO' | 'LARGO';
  readonly claveI18n: string;

  constructor(motivo: 'VACIO' | 'LARGO') {
    super(`Nombre de cliente inválido: ${motivo}`);
    this.name = 'NombreClienteInvalidoError';
    this.motivo = motivo;
    this.claveI18n =
      motivo === 'VACIO'
        ? 'servicios:recepcion.clienteNombreVacio'
        : 'servicios:recepcion.clienteNombreLargo';
  }
}

export interface ResultadoAgregarCliente {
  readonly id: number;
  /** Nombre visible del cliente elegido (el existente si ya había uno igual). */
  readonly nombre: string;
  /** `false` si ya existía y se devuelve ese en vez de crear otro. */
  readonly creado: boolean;
}

export interface DepsAgregarCliente {
  readonly catalogos: CatalogoRepository;
  readonly clientesLocales: ClientesLocales;
  readonly ids: IdGenerator;
  readonly clock: Clock;
  readonly logger: Logger;
}

/**
 * Alta de un cliente desde el formulario (ADR-0023). Funciona sin red: si el nombre ya existe —en el catálogo
 * o entre los pendientes, ignorando tildes, mayúsculas y espacios— devuelve ese; si no, crea un cliente
 * permanente con id temporal que se sube a SharePoint al sincronizar.
 */
export const crearAgregarCliente =
  (deps: DepsAgregarCliente) =>
  async (nombre: string): Promise<ResultadoAgregarCliente> => {
    const motivo = validarNombre(nombre);
    if (motivo) throw new NombreClienteInvalidoError(motivo);
    const normalizado = normalizarNombre(nombre);

    const remotos =
      (await deps.catalogos.obtener<readonly ClienteCatalogo[]>(CLAVES_CATALOGO.clientes)) ?? [];
    const existente = remotos.find(
      (cliente) => cliente.activo && normalizarNombre(cliente.nombre) === normalizado
    );
    if (existente) return { id: existente.id, nombre: existente.nombre, creado: false };

    const { cliente, creado } = await deps.clientesLocales.obtenerOCrear(normalizado, () => {
      const guid = deps.ids.siguiente();
      return {
        id: idTemporalDeGuid(guid),
        guid,
        nombre: tituloDeNombre(nombre),
        normalizado,
        creadoEn: deps.clock.ahoraIso(),
      };
    });
    if (creado) deps.logger.info('cliente.nuevo.creado', { clienteId: cliente.id });
    return { id: cliente.id, nombre: cliente.nombre, creado };
  };
