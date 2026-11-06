import { describe, expect, it, vi } from 'vitest';

import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import { CONFIG_DEFECTO, type ConfigApp } from '@/domain/config';

import { CLAVES_CATALOGO } from './claves';
import {
  cargarConfigGuardada,
  ConfigActual,
  conConfigEnMemoria,
  refrescarConfigRemota,
} from './configActual';

const crearCatalogos = (inicial: Record<string, unknown> = {}): CatalogoRepository => {
  const datos = new Map(Object.entries(inicial));
  return {
    obtener: async <T>(clave: string) => datos.get(clave) as T | undefined,
    guardar: async (clave, valor) => {
      datos.set(clave, valor);
    },
  };
};

const logger = { warn: vi.fn() };

describe('configuración vigente', () => {
  it('usa la configuración guardada sobre los valores por defecto', async () => {
    const guardada: Partial<ConfigApp> = { versionMinimaApp: '0.1.0', maxFotosIngreso: 7 };
    const config = await cargarConfigGuardada(
      crearCatalogos({ [CLAVES_CATALOGO.config]: guardada })
    );
    expect(config).toEqual({ ...CONFIG_DEFECTO, ...guardada });
    expect(await cargarConfigGuardada(crearCatalogos())).toEqual(CONFIG_DEFECTO);
  });

  it('actualiza la configuración en memoria al guardar el catálogo de configuración', async () => {
    const actual = new ConfigActual(CONFIG_DEFECTO);
    const catalogos = conConfigEnMemoria(crearCatalogos(), actual);

    await catalogos.guardar(CLAVES_CATALOGO.marcas, ['X']);
    expect(actual.obtener()).toBe(CONFIG_DEFECTO);

    await catalogos.guardar(CLAVES_CATALOGO.config, {
      ...CONFIG_DEFECTO,
      versionMinimaApp: '0.1.0',
    });
    expect(actual.obtener().versionMinimaApp).toBe('0.1.0');
    expect(await catalogos.obtener(CLAVES_CATALOGO.marcas)).toEqual(['X']);
  });

  it('refresca ConfiguracionApp desde SharePoint (SDD §16.3)', async () => {
    const actual = new ConfigActual(CONFIG_DEFECTO);
    const catalogos = conConfigEnMemoria(crearCatalogos(), actual);

    await refrescarConfigRemota({
      gateway: { leerConfiguracion: async () => ({ VersionMinimaApp: '2.0.0' }) },
      catalogos,
      logger,
    });

    expect(actual.obtener().versionMinimaApp).toBe('2.0.0');
    expect(await catalogos.obtener<ConfigApp>(CLAVES_CATALOGO.config)).toMatchObject({
      versionMinimaApp: '2.0.0',
    });
  });

  it('si la lectura remota falla, conserva la configuración en caché', async () => {
    const guardada = { ...CONFIG_DEFECTO, versionMinimaApp: '0.1.0' };
    const actual = new ConfigActual(guardada);
    const catalogos = conConfigEnMemoria(
      crearCatalogos({ [CLAVES_CATALOGO.config]: guardada }),
      actual
    );

    await refrescarConfigRemota({
      gateway: {
        leerConfiguracion: async () => {
          throw new Error('sin red');
        },
      },
      catalogos,
      logger,
    });

    expect(actual.obtener()).toEqual(guardada);
    expect(logger.warn).toHaveBeenCalledWith('config.refresco.fallo', expect.any(Object));
  });
});
