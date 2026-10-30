import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import type { AuthPort } from '@/application/ports/authPort';
import type { CatalogoRepository } from '@/application/ports/catalogoRepository';
import type { Logger } from '@/application/ports/loggerPort';
import type { MetaRepository } from '@/application/ports/metaRepository';
import type { RemoteGateway } from '@/application/ports/remoteGateway';
import type { StoragePort } from '@/application/ports/storagePort';
import * as containerContext from '@/app/containerContext';
import { useSesionStore } from '@/shared/stores/sesionStore';

import { ConfiguracionInicialPage } from './ConfiguracionInicialPage';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));

vi.mock('@/app/containerContext', () => ({
  useContainer: vi.fn(),
}));

const logger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const crearMeta = () => {
  const datos = new Map<string, unknown>();
  const meta = {
    obtener: vi.fn(async (clave: string) => datos.get(clave)),
    guardar: vi.fn(async (clave: string, valor: unknown) => {
      datos.set(clave, valor);
    }),
    dispositivoId: vi.fn(async () => 'disp-1'),
  } as MetaRepository;
  return { meta, datos };
};

const crearCatalogos = (): CatalogoRepository => {
  const datos = new Map<string, unknown>();
  return {
    obtener: vi.fn(async (clave: string) => datos.get(clave)),
    guardar: vi.fn(async (clave: string, valor: unknown) => {
      datos.set(clave, valor);
    }),
  } as CatalogoRepository;
};

const crearGateway = (fallarSitio = false): RemoteGateway => ({
  resolverSitio: vi.fn(async () => {
    if (fallarSitio) throw new Error('sin permiso');
    return {
      siteId: 'site-1',
      webUrl: 'https://empresa.sharepoint.com/sites/x',
      listas: { Servicios: 'l-serv' },
      driveId: 'drive-1',
    };
  }),
  leerCatalogos: vi.fn(async () => ({
    clientes: [
      { id: 1, nombre: 'Alfa', activo: true },
      { id: 2, nombre: 'Zeta', activo: true },
    ],
    marcas: ['ROQUET'],
    choices: {
      Diagnostico: ['D. FINAL'],
      Estado: ['RECIBIDO'],
      CotizacionEstado: ['PENDIENTE'],
      TipoEquipo: ['BATERIA'],
      TipoAdjunto: ['Foto ingreso'],
    },
  })),
  leerConfiguracion: vi.fn(async () => ({ MaxFotosIngreso: '3' })),
});

const crearAuth = (cuenta: ReturnType<AuthPort['cuentaActiva']>): AuthPort => ({
  inicializar: vi.fn(async () => undefined),
  cuentaActiva: vi.fn(() => cuenta),
  rolesCacheados: vi.fn(() => cuenta?.roles ?? []),
  sesionVigente: vi.fn(() => cuenta !== null),
  iniciarSesion: vi.fn(async () => undefined),
  asegurarToken: vi.fn(async () => 'token'),
  cambiarCuenta: vi.fn(async () => undefined),
  cerrarSesion: vi.fn(async () => undefined),
});

const crearStorage = (persistente = true): StoragePort => ({
  persistir: vi.fn(async () => persistente),
  estimar: vi.fn(async () => ({
    usadoBytes: 10,
    cuotaBytes: 1000,
    disponibleBytes: 990,
    porcentajeUsado: 1,
  })),
});

function renderAsistente(opciones: {
  cuenta?: ReturnType<AuthPort['cuentaActiva']>;
  fallarSitio?: boolean;
  persistente?: boolean;
}) {
  const { meta } = crearMeta();
  const auth = crearAuth(opciones.cuenta ?? null);
  const gateway = crearGateway(opciones.fallarSitio);
  const container = {
    auth,
    gateway,
    meta,
    catalogos: crearCatalogos(),
    storage: crearStorage(opciones.persistente),
    logger,
  };

  vi.mocked(containerContext.useContainer).mockReturnValue(container as never);

  useSesionStore.setState({
    cuenta: opciones.cuenta ?? null,
    roles: opciones.cuenta?.roles ?? [],
    configuracionInicialCompleta: false,
  });

  return {
    ...render(
      <MemoryRouter initialEntries={['/configuracion-inicial']}>
        <Routes>
          <Route path="/configuracion-inicial" element={<ConfiguracionInicialPage />} />
          <Route path="/" element={<div />} />
        </Routes>
      </MemoryRouter>
    ),
    auth,
    meta,
    gateway,
  };
}

describe('ConfiguracionInicialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSesionStore.setState({
      cuenta: null,
      roles: [],
      configuracionInicialCompleta: false,
    });
  });

  it('muestra bienvenida e inicia sesión para continuar', async () => {
    const cuenta = {
      id: 'u1',
      nombre: 'Ana Técnico',
      correo: 'ana@empresa.com',
      roles: ['Tecnico'],
    } as const;
    renderAsistente({ cuenta });

    expect(screen.getByRole('heading', { name: /SERVICIO TÉCNICO/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /EMPEZAR/i }));

    expect(await screen.findByRole('heading', { name: /Inicia sesión/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /CONTINUAR/i }));

    expect(await screen.findByRole('heading', { name: /Preparar datos/i })).toBeInTheDocument();
  });

  it('ejecuta las tareas y permite reintentar al fallar', async () => {
    const cuenta = {
      id: 'u1',
      nombre: 'Ana Técnico',
      correo: 'ana@empresa.com',
      roles: ['Tecnico'],
    } as const;
    let gateway: ReturnType<typeof crearGateway>;
    (() => {
      const m = crearMeta();
      const a = crearAuth(cuenta);
      gateway = crearGateway(true);
      const cont = {
        auth: a,
        gateway,
        meta: m.meta,
        catalogos: crearCatalogos(),
        storage: crearStorage(true),
        logger,
      };
      vi.mocked(containerContext.useContainer).mockReturnValue(cont as never);
      useSesionStore.setState({
        cuenta,
        roles: cuenta.roles,
        configuracionInicialCompleta: false,
      });
      render(
        <MemoryRouter initialEntries={['/configuracion-inicial?modo=repetir']}>
          <Routes>
            <Route path="/configuracion-inicial" element={<ConfiguracionInicialPage />} />
            <Route path="/" element={<div />} />
          </Routes>
        </MemoryRouter>
      );
    })();

    expect(await screen.findByRole('heading', { name: /Preparar datos/i })).toBeInTheDocument();
    expect(await screen.findByText(/Error/i)).toBeInTheDocument();

    (gateway.resolverSitio as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      siteId: 'site-1',
      webUrl: 'https://empresa.sharepoint.com/sites/x',
      listas: { Servicios: 'l-serv' },
      driveId: 'drive-1',
    });

    fireEvent.click(screen.getByRole('button', { name: /REINTENTAR/i }));
    await waitFor(() => expect(screen.getAllByText(/Listo/i).length).toBeGreaterThan(0));
  });

  it('completa el asistente y marca la configuración inicial', async () => {
    const cuenta = {
      id: 'u1',
      nombre: 'Ana Técnico',
      correo: 'ana@empresa.com',
      roles: ['Tecnico'],
    } as const;
    (() => {
      const { meta } = crearMeta();
      const auth = crearAuth(cuenta);
      const gateway = crearGateway(false);
      const cont = {
        auth,
        gateway,
        meta,
        catalogos: crearCatalogos(),
        storage: crearStorage(true),
        logger,
      };
      vi.mocked(containerContext.useContainer).mockReturnValue(cont as never);
      useSesionStore.setState({
        cuenta,
        roles: cuenta.roles,
        configuracionInicialCompleta: false,
      });
      return render(
        <MemoryRouter initialEntries={['/configuracion-inicial?modo=repetir']}>
          <Routes>
            <Route path="/configuracion-inicial" element={<ConfiguracionInicialPage />} />
            <Route path="/" element={<div />} />
          </Routes>
        </MemoryRouter>
      );
    })();

    expect(await screen.findByRole('heading', { name: /Preparar datos/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /CONTINUAR/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /CONTINUAR/i }));
    expect(await screen.findByRole('heading', { name: /Todo listo/i })).toBeInTheDocument();
    expect(useSesionStore.getState().configuracionInicialCompleta).toBe(true);
  });

  it('muestra advertencia si el almacenamiento persistente es denegado', async () => {
    const cuenta = {
      id: 'u1',
      nombre: 'Ana Técnico',
      correo: 'ana@empresa.com',
      roles: ['Tecnico'],
    } as const;
    const { meta } = crearMeta();
    const auth = crearAuth(cuenta);
    const gateway = crearGateway(false);
    const cont = {
      auth,
      gateway,
      meta,
      catalogos: crearCatalogos(),
      storage: crearStorage(false),
      logger,
    };
    vi.mocked(containerContext.useContainer).mockReturnValue(cont as never);
    useSesionStore.setState({
      cuenta,
      roles: cuenta.roles,
      configuracionInicialCompleta: false,
    });
    render(
      <MemoryRouter initialEntries={['/configuracion-inicial?modo=repetir']}>
        <Routes>
          <Route path="/configuracion-inicial" element={<ConfiguracionInicialPage />} />
          <Route path="/" element={<div />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Preparar datos/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/Almacenamiento persistente: No/i)).toBeInTheDocument()
    );
  });
});
