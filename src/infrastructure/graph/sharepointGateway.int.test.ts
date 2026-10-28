import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { MetaRepository } from '@/application/ports/metaRepository';
import type { Logger } from '@/application/ports/loggerPort';
import { CLAVES_META } from '@/application/setup/claves';
import type { Entorno } from '@/shared/env';

import { crearGraphClient } from './graphClient';
import { SharePointGateway } from './sharepointGateway';

const BASE = 'https://graph.microsoft.com/v1.0';
const servidor = setupServer();

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

const entorno: Entorno = {
  VITE_APP_ENV: 'dev',
  VITE_AUTH_MODE: 'mock',
  VITE_ENTRA_CLIENT_ID: '11111111-1111-1111-1111-111111111111',
  VITE_ENTRA_TENANT_ID: '22222222-2222-2222-2222-222222222222',
  VITE_SHAREPOINT_SITE_URL: 'https://empresa.sharepoint.com/sites/ServicioTecnicoBC-DEV',
  VITE_SHAREPOINT_SITE_NAME: 'ServicioTecnicoBC-DEV',
};

const crearMeta = (): MetaRepository & { datos: Map<string, unknown> } => {
  const datos = new Map<string, unknown>();
  return {
    datos,
    obtener: async <T>(clave: string) => datos.get(clave) as T | undefined,
    guardar: async (clave, valor) => {
      datos.set(clave, valor);
    },
    dispositivoId: async () => 'dispositivo-1',
  };
};

const logger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const crearCliente = () =>
  crearGraphClient({
    auth: {
      inicializar: async () => undefined,
      cuentaActiva: () => null,
      rolesCacheados: () => [],
      sesionVigente: () => true,
      iniciarSesion: async () => undefined,
      asegurarToken: async () => 'token',
      cambiarCuenta: async () => undefined,
      cerrarSesion: async () => undefined,
    },
    logger,
    ids: { siguiente: () => 'id-1' },
    dormir: async () => undefined,
  });

const registrarSitio = (listas: Array<{ id: string; name: string }>) => {
  servidor.use(
    http.get(`${BASE}/sites/empresa.sharepoint.com\\:/sites/ServicioTecnicoBC-DEV`, () =>
      HttpResponse.json({ id: 'site-1', webUrl: 'https://empresa.sharepoint.com/sites/x' })
    ),
    http.get(`${BASE}/sites/site-1/lists`, () =>
      HttpResponse.json({
        value: listas.map((l) => ({ ...l, displayName: l.name })),
      })
    ),
    http.get(`${BASE}/sites/site-1/lists/l-adj/drive`, () => HttpResponse.json({ id: 'drive-1' }))
  );
};

describe('SharePointGateway', () => {
  it('resuelve el sitio, las listas y el drive, y guarda los ids', async () => {
    registrarSitio([
      { id: 'l-serv', name: 'Servicios' },
      { id: 'l-cli', name: 'Clientes' },
      { id: 'l-mar', name: 'Marcas' },
      { id: 'l-conf', name: 'ConfiguracionApp' },
      { id: 'l-adj', name: 'ServiciosAdjuntos' },
    ]);
    const meta = crearMeta();
    const gateway = new SharePointGateway({
      graph: crearCliente(),
      env: entorno,
      meta,
      logger,
    });

    const sitio = await gateway.resolverSitio();
    expect(sitio).toMatchObject({ siteId: 'site-1', driveId: 'drive-1' });
    expect(meta.datos.get(CLAVES_META.siteId)).toBe('site-1');
    expect(meta.datos.get(CLAVES_META.listIds)).toMatchObject({ Clientes: 'l-cli' });
  });

  it('falla con SP_NO_ENCONTRADO si falta una lista requerida', async () => {
    registrarSitio([{ id: 'l-serv', name: 'Servicios' }]);
    const gateway = new SharePointGateway({
      graph: crearCliente(),
      env: entorno,
      meta: crearMeta(),
      logger,
    });

    await expect(gateway.resolverSitio()).rejects.toMatchObject({ codigo: 'SP_NO_ENCONTRADO' });
  });

  it('lee solo clientes activos, marcas y choices', async () => {
    registrarSitio([
      { id: 'l-serv', name: 'Servicios' },
      { id: 'l-cli', name: 'Clientes' },
      { id: 'l-mar', name: 'Marcas' },
      { id: 'l-conf', name: 'ConfiguracionApp' },
      { id: 'l-adj', name: 'ServiciosAdjuntos' },
    ]);
    servidor.use(
      http.get(`${BASE}/sites/site-1/lists/l-cli/items`, () =>
        HttpResponse.json({
          value: [
            { id: '1', fields: { ID: 1, Title: 'Zeta', Activo: true } },
            { id: '2', fields: { ID: 2, Title: 'Alfa', Activo: true } },
            { id: '3', fields: { ID: 3, Title: 'Inactivo', Activo: false } },
          ],
        })
      ),
      http.get(`${BASE}/sites/site-1/lists/l-mar/items`, () =>
        HttpResponse.json({
          value: [
            { id: '1', fields: { Title: 'ROQUET' } },
            { id: '2', fields: { Title: 'TROJAN' } },
          ],
        })
      ),
      http.get(`${BASE}/sites/site-1/lists/l-serv/columns`, () =>
        HttpResponse.json({
          value: [
            { name: 'Diagnostico', choice: { choices: ['D. FINAL', 'Reparar'] } },
            { name: 'Estado', choice: { choices: ['Recibido'] } },
            { name: 'CotizacionEstado', choice: { choices: ['Aprobada'] } },
            { name: 'TipoEquipo', choice: { choices: ['Bateria', 'Cargador'] } },
          ],
        })
      ),
      http.get(`${BASE}/sites/site-1/lists/l-adj/columns`, () =>
        HttpResponse.json({
          value: [{ name: 'TipoAdjunto', choice: { choices: ['Foto ingreso'] } }],
        })
      )
    );

    const gateway = new SharePointGateway({
      graph: crearCliente(),
      env: entorno,
      meta: crearMeta(),
      logger,
    });

    const catalogos = await gateway.leerCatalogos();
    expect(catalogos.clientes.map((c) => c.nombre)).toEqual(['Alfa', 'Zeta']);
    expect(catalogos.marcas).toEqual(['ROQUET', 'TROJAN']);
    expect(catalogos.choices.Diagnostico).toEqual(['D. FINAL', 'Reparar']);
    expect(catalogos.choices.TipoAdjunto).toEqual(['Foto ingreso']);
  });

  it('lee la configuracion clave/valor', async () => {
    registrarSitio([
      { id: 'l-serv', name: 'Servicios' },
      { id: 'l-cli', name: 'Clientes' },
      { id: 'l-mar', name: 'Marcas' },
      { id: 'l-conf', name: 'ConfiguracionApp' },
      { id: 'l-adj', name: 'ServiciosAdjuntos' },
    ]);
    servidor.use(
      http.get(`${BASE}/sites/site-1/lists/l-conf/items`, () =>
        HttpResponse.json({
          value: [
            { id: '1', fields: { Title: 'VersionMinimaApp', Valor: '1.0.0' } },
            { id: '2', fields: { Title: 'MaxFotosIngreso', Valor: '5' } },
          ],
        })
      )
    );

    const gateway = new SharePointGateway({
      graph: crearCliente(),
      env: entorno,
      meta: crearMeta(),
      logger,
    });

    await expect(gateway.leerConfiguracion()).resolves.toEqual({
      VersionMinimaApp: '1.0.0',
      MaxFotosIngreso: '5',
    });
  });
});
