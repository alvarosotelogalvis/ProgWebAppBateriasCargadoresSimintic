export interface DepsPrepararClientes {
  /** Relee el catálogo (clientes y fusiones) de SharePoint; no debe lanzar. */
  readonly refrescarCatalogos: () => Promise<unknown>;
  readonly remapearFusionados: () => Promise<unknown>;
  readonly subirClientesNuevos: () => Promise<unknown>;
}

/**
 * Paso previo a la subida de servicios (spec 010), en este orden:
 * 1. conocer las fusiones más recientes,
 * 2. pasar al cliente vigente los servicios pendientes que apuntaban a uno fusionado,
 * 3. crear en SharePoint los clientes nuevos que esos servicios usan.
 * Así ningún servicio se sube apuntando a un cliente que no existe o que ya se fusionó.
 */
export const crearPrepararClientes = (deps: DepsPrepararClientes) => async (): Promise<void> => {
  await deps.refrescarCatalogos();
  await deps.remapearFusionados();
  await deps.subirClientesNuevos();
};
