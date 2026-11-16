import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { Catalogos } from '@/application/ports/remoteGateway';

import { CLAVES_CATALOGO, COLUMNAS_CHOICE, claveChoice } from './claves';

/**
 * Relee clientes, marcas y opciones de SharePoint en cada sincronización (FR-006-11).
 * Si falla, se sigue con lo guardado y solo se registra una advertencia.
 */
export async function refrescarCatalogosRemotos(deps: {
  readonly gateway: { leerCatalogos(): Promise<Catalogos> };
  readonly catalogos: CatalogoRepository;
  readonly logger: Logger;
}): Promise<boolean> {
  try {
    const remotos = await deps.gateway.leerCatalogos();
    await deps.catalogos.guardar(CLAVES_CATALOGO.clientes, remotos.clientes);
    await deps.catalogos.guardar(CLAVES_CATALOGO.marcas, remotos.marcas);
    for (const columna of COLUMNAS_CHOICE) {
      await deps.catalogos.guardar(claveChoice(columna), remotos.choices[columna]);
    }
    return true;
  } catch (causa) {
    deps.logger.warn('catalogos.refresco.fallo', {
      mensaje: causa instanceof Error ? causa.message : String(causa),
    });
    return false;
  }
}
