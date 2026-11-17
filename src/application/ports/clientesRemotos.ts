/**
 * Operaciones de la lista `Clientes` (y de los servicios por cliente) que necesita la spec 010
 * (ADR-0023): alta idempotente de clientes nuevos y fusión de clientes. Todo el acceso a Graph vive
 * en `infrastructure/graph/` (ADR-0004); la aplicación solo conoce este puerto.
 */

export interface ClienteRemoto {
  /** Id numérico del ítem de SharePoint. */
  readonly id: number;
  /** `Title`: el nombre visible en MAYÚSCULAS. */
  readonly nombre: string;
  readonly activo: boolean;
  /** UUID generado en el dispositivo que lo creó (los clientes anteriores no lo tienen). */
  readonly guid?: string;
  /** Clave de comparación (mayúsculas, sin tildes). */
  readonly normalizado?: string;
  /** Si el cliente se fusionó en otro, el id del destino. */
  readonly fusionadoCon?: number;
}

export interface NuevoClienteRemoto {
  readonly guid: string;
  /** `Title`. */
  readonly titulo: string;
  readonly normalizado: string;
}

export interface ServicioDeCliente {
  /** Id del ítem de `Servicios` en SharePoint. */
  readonly itemId: string;
}

export interface DetalleLogRemoto {
  /** Qué ocurrió, p. ej. «Fusión de clientes». */
  readonly tipo: string;
  readonly detalle: string;
}

export interface ClientesRemotos {
  /** Todos los clientes, **incluidos los inactivos** (para seguir las fusiones). */
  listarClientes(): Promise<readonly ClienteRemoto[]>;
  buscarPorGuid(guid: string): Promise<ClienteRemoto | null>;
  /** Todos los que comparten ese nombre normalizado, por id ascendente. */
  buscarPorNormalizado(normalizado: string): Promise<readonly ClienteRemoto[]>;
  /**
   * Crea el cliente. **Idempotente**: si el guid o el nombre normalizado ya existen (valor único),
   * devuelve ese cliente en vez de duplicarlo; puede ser un cliente inactivo ya fusionado.
   */
  crearCliente(cliente: NuevoClienteRemoto): Promise<ClienteRemoto>;
  /** Deja el origen `Activo = No` con `FusionadoConId = destino` (no lo borra). */
  desactivarFusionado(origenId: number, destinoId: number): Promise<void>;
  /** Servicios que apuntan al cliente (se vuelve a consultar: lo ya reasignado no aparece). */
  listarServiciosDeCliente(clienteId: number): Promise<readonly ServicioDeCliente[]>;
  reasignarServicio(itemId: string, clienteId: number): Promise<void>;
  registrarDetalleLog(entrada: DetalleLogRemoto): Promise<void>;
}
