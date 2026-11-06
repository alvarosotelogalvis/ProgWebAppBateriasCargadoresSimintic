import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { RemoteGateway } from '@/application/ports/remoteGateway';
import {
  CONFIG_DEFECTO,
  combinarConfig,
  type ConfigApp,
  type LoggerAdvertencia,
} from '@/domain/config';

import { CLAVES_CATALOGO } from './claves';

/** Configuración vigente en memoria (`defaults ⊕ remoto válido`, SDD §16.3). */
export class ConfigActual {
  constructor(private actual: ConfigApp) {}

  readonly obtener = (): ConfigApp => this.actual;

  establecer(config: ConfigApp): void {
    this.actual = config;
  }
}

/** Lee la configuración guardada por la configuración inicial o el último sync. */
export async function cargarConfigGuardada(
  catalogos: Pick<CatalogoRepository, 'obtener'>,
  defecto: ConfigApp = CONFIG_DEFECTO
): Promise<ConfigApp> {
  const guardada = await catalogos.obtener<Partial<ConfigApp>>(CLAVES_CATALOGO.config);
  return guardada ? { ...defecto, ...guardada } : defecto;
}

/** Envuelve el repositorio para que guardar la configuración actualice la copia en memoria. */
export function conConfigEnMemoria(
  catalogos: CatalogoRepository,
  actual: ConfigActual,
  defecto: ConfigApp = CONFIG_DEFECTO
): CatalogoRepository {
  return {
    obtener: (clave) => catalogos.obtener(clave),
    guardar: async (clave, valor) => {
      await catalogos.guardar(clave, valor);
      if (clave === CLAVES_CATALOGO.config && valor && typeof valor === 'object') {
        actual.establecer({ ...defecto, ...(valor as Partial<ConfigApp>) });
      }
    },
  };
}

export interface DepsRefrescoConfig {
  readonly gateway: Pick<RemoteGateway, 'leerConfiguracion'>;
  readonly catalogos: CatalogoRepository;
  readonly logger: LoggerAdvertencia;
  readonly defecto?: ConfigApp;
}

/** Relee `ConfiguracionApp` (en cada sync). Si falla, se continúa con la copia en caché. */
export async function refrescarConfigRemota(deps: DepsRefrescoConfig): Promise<void> {
  try {
    const remota = await deps.gateway.leerConfiguracion();
    const config = combinarConfig(remota, deps.defecto ?? CONFIG_DEFECTO, deps.logger);
    await deps.catalogos.guardar(CLAVES_CATALOGO.config, config);
  } catch (causa) {
    deps.logger.warn('config.refresco.fallo', {
      mensaje: causa instanceof Error ? causa.message : String(causa),
    });
  }
}
