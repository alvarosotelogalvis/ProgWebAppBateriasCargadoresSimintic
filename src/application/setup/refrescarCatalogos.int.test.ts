import { describe, expect, it, vi } from 'vitest';

import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { StoragePort } from '@/application/ports/storagePort';
import { AppError } from '@/shared/errors';

import { CLAVES_CATALOGO, CLAVES_META, claveChoice } from './claves';
import { refrescarCatalogos } from './refrescarCatalogos';

const crearMeta = (inicial: Record<string, unknown> = {}) => {
  const datos = new Map<string, unknown>(Object.entries(inicial));
  const meta: MetaRepository = {
    obtener: async <T>(clave: string) => datos.get(clave) as T | undefined,
    guardar: async (clave, valor) => {
      datos.set(clave, valor);
    },
    dispositivoId: async () => 'disp-1',
  };
  return { meta, datos };
};

const crearCatalogos = (inicial: Record<string, unknown> = {}) => {
  const datos = new Map<string, unknown>(Object.entries(inicial));
  const catalogos: CatalogoRepository = {
    obtener: async <T>(clave: string) => datos.get(clave) as T | undefined,
    guardar: async (clave, valor) => {
      datos.set(clave, valor);
    },
  };
  return { catalogos, datos };
};

const crearGateway = (opciones: { errorSitio?: boolean } = {}): RemoteGateway => ({
  resolverSitio: async () => {
    if (opciones.errorSitio) {
      throw new AppError({ codigo: 'SP_SIN_PERMISO', mensaje: 'sin permiso' });
    }
    return {
      siteId: 'site-nuevo',
      webUrl: 'https://empresa.sharepoint.com/sites/nuevo',
      listas: { Servicios: 'l-serv' },
      driveId: 'drive-nuevo',
    };
  },
  leerCatalogos: async () => ({
    clientes: [
      { id: 7, nombre: 'Nuevo Cliente', activo: true },
      { id: 9, nombre: 'Otro Cliente', activo: true },
    ],
    marcas: ['NUEVA MARCA'],
    choices: {
      Diagnostico: ['D. FINAL'],
      Estado: ['Recibido'],
      CotizacionEstado: ['Pendiente'],
      TipoEquipo: ['Bateria'],
      TipoAdjunto: ['Foto ingreso'],
    },
  }),
  leerConfiguracion: async () => ({ MaxFotosIngreso: '4' }),
});

const crearStorage = (): StoragePort => ({
  persistir: async () => true,
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

describe('refrescarCatalogos', () => {
  it('reemplaza catálogos y configuración con los datos actuales de SharePoint', async () => {
    const { meta, datos: metaDatos } = crearMeta();
    const { catalogos, datos: catDatos } = crearCatalogos({
      [CLAVES_CATALOGO.clientes]: [{ id: 1, nombre: 'Viejo Cliente', activo: true }],
      [CLAVES_CATALOGO.config]: { maxFotosIngreso: 1 },
    });

    const resultado = await refrescarCatalogos({
      gateway: crearGateway(),
      meta,
      catalogos,
      storage: crearStorage(),
      logger,
    });

    expect(resultado.completa).toBe(true);
    expect(catDatos.get(CLAVES_CATALOGO.clientes)).toHaveLength(2);
    expect(catDatos.get(CLAVES_CATALOGO.marcas)).toEqual(['NUEVA MARCA']);
    expect(catDatos.get(claveChoice('Estado'))).toEqual(['Recibido']);
    expect(catDatos.get(CLAVES_CATALOGO.config)).toMatchObject({ maxFotosIngreso: 4 });
    expect(metaDatos.get(CLAVES_META.configuracionInicialCompleta)).toBe(true);
  });

  it('no borra metadatos ni datos locales ajenos a la configuración', async () => {
    const { meta, datos: metaDatos } = crearMeta({
      [CLAVES_META.ultimaSyncEn]: '2026-10-20T10:00:00.000Z',
      [CLAVES_META.ultimoLoginInteractivoEn]: '2026-10-20T09:00:00.000Z',
      dispositivoId: 'disp-1',
    });
    const { catalogos, datos: catDatos } = crearCatalogos({
      [CLAVES_CATALOGO.clientes]: [{ id: 1, nombre: 'Viejo Cliente', activo: true }],
      'clave:ajena': 'se conserva',
    });

    await refrescarCatalogos({
      gateway: crearGateway(),
      meta,
      catalogos,
      storage: crearStorage(),
      logger,
    });

    expect(metaDatos.get(CLAVES_META.ultimaSyncEn)).toBe('2026-10-20T10:00:00.000Z');
    expect(metaDatos.get(CLAVES_META.ultimoLoginInteractivoEn)).toBe('2026-10-20T09:00:00.000Z');
    expect(metaDatos.get('dispositivoId')).toBe('disp-1');
    expect(catDatos.get('clave:ajena')).toBe('se conserva');
  });

  it('informa el progreso de cada tarea al asistente', async () => {
    const onEstado = vi.fn();
    const { meta } = crearMeta();

    await refrescarCatalogos(
      {
        gateway: crearGateway(),
        meta,
        catalogos: crearCatalogos().catalogos,
        storage: crearStorage(),
        logger,
      },
      onEstado
    );

    const tareas = onEstado.mock.calls.map(([estado]) => `${estado.tarea}:${estado.estado}`);
    expect(tareas).toEqual([
      'sitio:en-curso',
      'sitio:ok',
      'catalogos:en-curso',
      'catalogos:ok',
      'configuracion:en-curso',
      'configuracion:ok',
      'almacenamiento:en-curso',
      'almacenamiento:ok',
    ]);
  });

  it('si falla el sitio, conserva el catálogo anterior y deja la configuración incompleta', async () => {
    const clientesPrevios = [{ id: 1, nombre: 'Viejo Cliente', activo: true }];
    const { meta, datos: metaDatos } = crearMeta();
    const { catalogos, datos: catDatos } = crearCatalogos({
      [CLAVES_CATALOGO.clientes]: clientesPrevios,
    });

    const resultado = await refrescarCatalogos({
      gateway: crearGateway({ errorSitio: true }),
      meta,
      catalogos,
      storage: crearStorage(),
      logger,
    });

    expect(resultado.completa).toBe(false);
    expect(catDatos.get(CLAVES_CATALOGO.clientes)).toEqual(clientesPrevios);
    expect(metaDatos.get(CLAVES_META.configuracionInicialCompleta)).toBe(false);
  });
});
