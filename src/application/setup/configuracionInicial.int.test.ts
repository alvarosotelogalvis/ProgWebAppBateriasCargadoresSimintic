import { describe, expect, it } from 'vitest';

import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { StoragePort } from '@/application/ports/storagePort';
import { AppError } from '@/shared/errors';

import { CLAVES_CATALOGO, CLAVES_META } from './claves';
import { ejecutarPreparacion, ejecutarTarea } from './configuracionInicial';

const crearMeta = () => {
  const datos = new Map<string, unknown>();
  const meta: MetaRepository = {
    obtener: async <T>(clave: string) => datos.get(clave) as T | undefined,
    guardar: async (clave, valor) => {
      datos.set(clave, valor);
    },
    dispositivoId: async () => 'disp-1',
  };
  return { meta, datos };
};

const crearCatalogos = () => {
  const datos = new Map<string, unknown>();
  const catalogos: CatalogoRepository = {
    obtener: async <T>(clave: string) => datos.get(clave) as T | undefined,
    guardar: async (clave, valor) => {
      datos.set(clave, valor);
    },
  };
  return { catalogos, datos };
};

const crearGateway = (
  opciones: { clientesVacios?: boolean; errorSitio?: boolean } = {}
): RemoteGateway => ({
  resolverSitio: async () => {
    if (opciones.errorSitio) {
      throw new AppError({ codigo: 'SP_SIN_PERMISO', mensaje: 'sin permiso' });
    }
    return {
      siteId: 'site-1',
      webUrl: 'https://empresa.sharepoint.com/sites/x',
      listas: { Servicios: 'l-serv' },
      driveId: 'drive-1',
    };
  },
  leerCatalogos: async () => ({
    clientes: opciones.clientesVacios
      ? []
      : [
          { id: 1, nombre: 'Alfa', activo: true },
          { id: 2, nombre: 'Zeta', activo: true },
        ],
    marcas: ['ROQUET'],
    choices: {
      Diagnostico: ['D. FINAL'],
      Estado: ['Recibido'],
      CotizacionEstado: ['Pendiente'],
      TipoEquipo: ['Bateria'],
      TipoAdjunto: ['Foto ingreso'],
    },
  }),
  leerConfiguracion: async () => ({ MaxFotosIngreso: '3' }),
});

const crearStorage = (persistente = true): StoragePort => ({
  persistir: async () => persistente,
  estimar: async () => ({
    usadoBytes: 10,
    cuotaBytes: 1000,
    disponibleBytes: 990,
    porcentajeUsado: 1,
  }),
});

const logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

describe('ejecutarPreparacion', () => {
  it('completa catalogs, configuracion y almacenamiento', async () => {
    const { meta, datos: metaDatos } = crearMeta();
    const { catalogos, datos: catDatos } = crearCatalogos();

    const resultado = await ejecutarPreparacion({
      gateway: crearGateway(),
      meta,
      catalogos,
      storage: crearStorage(),
      logger,
    });

    expect(resultado.completa).toBe(true);
    expect(resultado.estados.map((e) => e.estado)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(catDatos.get(CLAVES_CATALOGO.clientes)).toHaveLength(2);
    expect(catDatos.get('config')).toMatchObject({ maxFotosIngreso: 3 });
    expect(metaDatos.get(CLAVES_META.configuracionInicialCompleta)).toBe(true);
    expect(metaDatos.get(CLAVES_META.almacenamientoPersistente)).toBe(true);
  });

  it('se detiene en el primer error y deja el resto pendiente', async () => {
    const { meta, datos } = crearMeta();
    const resultado = await ejecutarPreparacion({
      gateway: crearGateway({ errorSitio: true }),
      meta,
      catalogos: crearCatalogos().catalogos,
      storage: crearStorage(),
      logger,
    });

    expect(resultado.completa).toBe(false);
    expect(resultado.estados.map((e) => e.estado)).toEqual([
      'error',
      'pendiente',
      'pendiente',
      'pendiente',
    ]);
    expect(datos.get(CLAVES_META.configuracionInicialCompleta)).toBe(false);
  });

  it('permite terminar con advertencia si no hay clientes activos', async () => {
    const resultado = await ejecutarPreparacion({
      gateway: crearGateway({ clientesVacios: true }),
      meta: crearMeta().meta,
      catalogos: crearCatalogos().catalogos,
      storage: crearStorage(),
      logger,
    });

    expect(resultado.completa).toBe(true);
    expect(resultado.estados[1]).toMatchObject({ tarea: 'catalogos', estado: 'advertencia' });
  });

  it('informa advertencia si el navegador niega el almacenamiento persistente', async () => {
    const resultado = await ejecutarPreparacion({
      gateway: crearGateway(),
      meta: crearMeta().meta,
      catalogos: crearCatalogos().catalogos,
      storage: crearStorage(false),
      logger,
    });

    expect(resultado.completa).toBe(true);
    expect(resultado.estados[3]).toMatchObject({ tarea: 'almacenamiento', estado: 'advertencia' });
  });
});

describe('ejecutarTarea', () => {
  it('permite reintentar una tarea concreta sin repetir las demas', async () => {
    const { meta } = crearMeta();
    const estados: string[] = [];
    const resultado = await ejecutarTarea('configuracion', {
      gateway: crearGateway(),
      meta,
      catalogos: crearCatalogos().catalogos,
      storage: crearStorage(),
      logger,
    });
    estados.push(resultado.estado);

    expect(estados).toEqual(['ok']);
    expect(resultado.tarea).toBe('configuracion');
  });
});
