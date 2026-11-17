import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import { CLAVES_CATALOGO } from '@/application/setup/claves';
import type { ClienteNuevo } from '@/domain/cliente';

/**
 * Clientes creados en el dispositivo que aún no tienen id de SharePoint (ADR-0023). Viven en su propia clave
 * del catálogo para que el refresco de `clientes` —que se sobrescribe en cada sincronización— no los pierda.
 *
 * Las operaciones se encadenan en una cola: dos altas simultáneas (o un alta mientras la subida quita un
 * cliente) no se pisan al leer y reescribir la misma clave.
 */
export interface ClientesLocales {
  listar(): Promise<readonly ClienteNuevo[]>;
  /** Idempotente por `guid`. */
  agregar(cliente: ClienteNuevo): Promise<void>;
  /** Agrega varios (restauración de un respaldo); omite los que ya existen por `guid`. */
  agregarVarios(clientes: readonly ClienteNuevo[]): Promise<void>;
  /**
   * Devuelve el cliente pendiente con ese nombre normalizado o lo crea con `fabricar`, todo de forma
   * atómica: así dos altas del mismo nombre dejan un solo cliente.
   */
  obtenerOCrear(
    normalizado: string,
    fabricar: () => ClienteNuevo
  ): Promise<{ readonly cliente: ClienteNuevo; readonly creado: boolean }>;
  quitar(id: number): Promise<void>;
}

export const crearClientesLocales = (catalogos: CatalogoRepository): ClientesLocales => {
  let cola: Promise<unknown> = Promise.resolve();
  const enSerie = <T>(operacion: () => Promise<T>): Promise<T> => {
    const resultado = cola.then(operacion, operacion);
    cola = resultado.catch(() => undefined);
    return resultado;
  };
  const leer = async (): Promise<ClienteNuevo[]> =>
    (await catalogos.obtener<ClienteNuevo[]>(CLAVES_CATALOGO.clientesNuevos)) ?? [];
  const guardar = (clientes: readonly ClienteNuevo[]): Promise<void> =>
    catalogos.guardar(CLAVES_CATALOGO.clientesNuevos, clientes);

  return {
    listar: () => enSerie(leer),
    agregar: (cliente) =>
      enSerie(async () => {
        const actuales = await leer();
        if (actuales.some((existente) => existente.guid === cliente.guid)) return;
        await guardar([...actuales, cliente]);
      }),
    agregarVarios: (clientes) =>
      enSerie(async () => {
        const actuales = await leer();
        const nuevos = clientes.filter(
          (cliente) => !actuales.some((existente) => existente.guid === cliente.guid)
        );
        if (nuevos.length > 0) await guardar([...actuales, ...nuevos]);
      }),
    obtenerOCrear: (normalizado, fabricar) =>
      enSerie(async () => {
        const actuales = await leer();
        const existente = actuales.find((cliente) => cliente.normalizado === normalizado);
        if (existente) return { cliente: existente, creado: false };
        const cliente = fabricar();
        await guardar([...actuales, cliente]);
        return { cliente, creado: true };
      }),
    quitar: (id) =>
      enSerie(async () => {
        const actuales = await leer();
        if (actuales.some((cliente) => cliente.id === id)) {
          await guardar(actuales.filter((cliente) => cliente.id !== id));
        }
      }),
  };
};
