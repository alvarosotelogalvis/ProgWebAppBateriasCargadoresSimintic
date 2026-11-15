import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import * as containerContext from '@/app/containerContext';
import type { ResumenPendientes } from '@/application/sync/resumenPendientes';
import { CONFIG_DEFECTO } from '@/domain/config';
import type { CuentaUsuario } from '@/domain/servicio';
import { buscarActualizacion } from '@/infrastructure/pwa/registerSW';
import { AppError } from '@/shared/errors';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { useOnline } from '@/shared/hooks/useOnline';
import { useSesionStore } from '@/shared/stores/sesionStore';

import type { ResumenSync } from '@/application/sync/eventosSync';
import type { ColaSync } from '@/infrastructure/db/hooks';

import { useSyncStore } from '../store/useSyncStore';

import { SincronizacionPage } from './SincronizacionPage';

const COLA: ColaSync = {
  total: 4,
  sincronizados: 3,
  enCola: [],
  conError: [
    {
      id: 'e1',
      codigo: 'BAT-9',
      descripcion: '',
      syncState: 'error',
      intentos: 8,
      ultimoError: { codigo: 'SP_SIN_PERMISO', mensaje: '403', en: '2026-11-06T10:00:00Z' },
    },
  ],
  conflictos: [],
};

vi.mock('@/infrastructure/pwa/registerSW', () => ({
  buscarActualizacion: vi.fn(async () => undefined),
}));
vi.mock('@/infrastructure/db/hooks', () => ({
  useColaSync: vi.fn(() => COLA),
  useServicios: vi.fn(() => []),
}));

vi.mock('@/app/containerContext', () => ({ useContainer: vi.fn() }));
vi.mock('@/shared/hooks/useOnline', () => ({ useOnline: vi.fn(() => true) }));
vi.mock('@/shared/hooks/useBreakpoint', () => ({ useBreakpoint: vi.fn(() => 'compacto') }));
vi.mock('@/shared/ui/Icon', () => ({
  Icon: () => <svg aria-hidden="true" />,
}));

const CUENTA: CuentaUsuario = {
  id: 'u1',
  nombre: 'Ana Pérez',
  correo: 'ana@empresa.com',
  roles: ['Tecnico'],
  tenantId: 'tenant-1',
};

const RESUMEN: ResumenPendientes = {
  servicios: 3,
  archivos: 11,
  bytes: 6.2 * 1024 * 1024,
  porServicio: [
    { servicioId: 's1', codigo: 'CAR-1-NV4520', archivos: 5, bytes: 3 * 1024 * 1024 },
    { servicioId: 's2', codigo: 'BAT-7-X99', archivos: 4, bytes: 2 * 1024 * 1024 },
    { servicioId: 's3', codigo: 'BAT-8-Y10', archivos: 2, bytes: 1.2 * 1024 * 1024 },
  ],
};

const RESUMEN_OK: ResumenSync = {
  subidos: 3,
  archivos: 11,
  errores: 0,
  conflictos: 0,
  resultado: 'OK',
};

function crearContenedor(
  opciones: {
    resumen?: ResumenPendientes;
    versionMinimaApp?: string;
    sincronizar?: (o: { signal: AbortSignal }) => Promise<ResumenSync>;
  } = {}
) {
  const confirmarIdentidad = vi.fn(async () => ({ ok: true, token: 'token', cuenta: CUENTA }));
  const sincronizar = vi.fn(opciones.sincronizar ?? (async () => RESUMEN_OK));
  const reintentarServicio = vi.fn(async () => true);

  const contenedor = {
    auth: { cuentaActiva: () => CUENTA },
    resumenPendientes: vi.fn(async () => opciones.resumen ?? RESUMEN),
    confirmarIdentidad,
    reintentarServicio,
    appVersion: '0.1.0',
    config: () => ({ ...CONFIG_DEFECTO, versionMinimaApp: opciones.versionMinimaApp ?? '0.1.0' }),
    sync: { sincronizar, on: vi.fn(() => () => undefined) },
    eventosSync: { suscribir: vi.fn(() => () => undefined) },
  };

  vi.mocked(containerContext.useContainer).mockReturnValue(contenedor as never);
  return { confirmarIdentidad, sincronizar, reintentarServicio, contenedor };
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={['/sincronizacion']}>
      <SincronizacionPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useSyncStore.getState().reiniciar();
  vi.mocked(useOnline).mockReturnValue(true);
  vi.mocked(useBreakpoint).mockReturnValue('compacto');
  useSesionStore.setState({
    cuenta: CUENTA,
    roles: CUENTA.roles,
    configuracionInicialCompleta: true,
  });
});

describe('SincronizacionPage', () => {
  it('avisa cuando no hay conexión y deshabilita la confirmación', async () => {
    vi.mocked(useOnline).mockReturnValue(false);
    crearContenedor();
    renderPagina();

    expect(await screen.findByText(/Sin conexión/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar como ana@empresa.com/i })).toBeDisabled();
  });

  it('muestra el resumen de pendientes y la cuenta que sincroniza', async () => {
    const { contenedor } = crearContenedor();
    renderPagina();

    expect(await screen.findByText(/3 registros/i)).toBeInTheDocument();
    expect(screen.getByText(/11 archivos/i)).toBeInTheDocument();
    expect(screen.getByText(/6,2 MB/i)).toBeInTheDocument();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getAllByText('ana@empresa.com').length).toBeGreaterThan(0);
    expect(screen.getByText('ESTE DISPOSITIVO')).toBeInTheDocument();
    expect(screen.getByText('SHAREPOINT')).toBeInTheDocument();
    expect(contenedor.resumenPendientes).toHaveBeenCalled();
  });

  it('confirma la identidad y lanza la sincronización', async () => {
    const { confirmarIdentidad, sincronizar } = crearContenedor();
    renderPagina();

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar como ana@empresa.com/i }));

    await waitFor(() => expect(confirmarIdentidad).toHaveBeenCalledTimes(1));
    expect(confirmarIdentidad).toHaveBeenCalledWith({
      correlationId: expect.any(String),
    });
    await waitFor(() => expect(sincronizar).toHaveBeenCalledTimes(1));
    expect(sincronizar).toHaveBeenCalledWith({
      correlationId: expect.any(String),
      signal: expect.any(AbortSignal),
    });
  });

  it('permite confirmar con otra cuenta', async () => {
    const { confirmarIdentidad, sincronizar } = crearContenedor();
    renderPagina();

    fireEvent.click(await screen.findByText(/usar otra cuenta/i));

    await waitFor(() => expect(confirmarIdentidad).toHaveBeenCalledTimes(1));
    expect(confirmarIdentidad).toHaveBeenCalledWith({ otraCuenta: true });
    expect(sincronizar).not.toHaveBeenCalled();
  });

  it('usa una columna en compacto y dos en expandido', async () => {
    crearContenedor();
    const { unmount } = renderPagina();

    expect(await screen.findByTestId('pantalla-sincronizacion')).toHaveAttribute(
      'data-layout',
      'compacto'
    );
    unmount();

    vi.mocked(useBreakpoint).mockReturnValue('expandido');
    renderPagina();

    expect(await screen.findByTestId('pantalla-sincronizacion')).toHaveAttribute(
      'data-layout',
      'expandido'
    );
  });

  it('muestra el progreso con la cola preparada y permite cancelar (ES-005-14, ES-005-15)', async () => {
    let señal: AbortSignal | undefined;
    let terminar: (r: ResumenSync) => void = () => undefined;
    crearContenedor({
      sincronizar: ({ signal }) => {
        señal = signal;
        useSyncStore
          .getState()
          .aplicar({ tipo: 'inicio', correlationId: 'c', total: RESUMEN.servicios });
        return new Promise<ResumenSync>((resolve) => {
          terminar = resolve;
        });
      },
    });
    renderPagina();

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar como ana@empresa.com/i }));

    expect(await screen.findByRole('progressbar', { name: 'CAR-1-NV4520' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Avance de la sincronización: 0%/ })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'CANCELAR' }));
    expect(señal?.aborted).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancelando…' })).toBeDisabled();

    terminar({ ...RESUMEN_OK, subidos: 1, archivos: 5, resultado: 'Parcial' });
    expect(await screen.findByText('Sincronización parcial')).toBeInTheDocument();
  });

  it('muestra el resumen al terminar y lo cierra (ES-005-19)', async () => {
    crearContenedor();
    renderPagina();

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar como ana@empresa.com/i }));

    expect(await screen.findByText('Sincronización completa')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'CERRAR' }));
    await waitFor(() => expect(useSyncStore.getState().resumen).toBeNull());
  });

  it('reintenta un servicio con error y recalcula los pendientes (ES-005-17)', async () => {
    const { reintentarServicio, contenedor } = crearContenedor();
    renderPagina();

    fireEvent.click(await screen.findByRole('radio', { name: /Con error/ }));
    expect(
      screen.getByText('Tu cuenta no tiene permiso en el sitio de SharePoint.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar BAT-9' }));

    await waitFor(() => expect(reintentarServicio).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(contenedor.resumenPendientes).toHaveBeenCalledTimes(2));
  });

  it('bloquea la sincronización si la versión es menor que la mínima (ES-005-24)', async () => {
    const { sincronizar } = crearContenedor({ versionMinimaApp: '0.2.0' });
    renderPagina();

    expect(await screen.findByText(/Actualiza la app para sincronizar/)).toBeInTheDocument();
    const confirmar = screen.getByRole('button', { name: /Confirmar como ana@empresa.com/i });
    expect(confirmar).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'BUSCAR ACTUALIZACIÓN' }));
    await waitFor(() => expect(buscarActualizacion).toHaveBeenCalled());
    expect(
      await screen.findByText('Si hay una versión nueva, aparecerá el aviso para actualizar.')
    ).toBeInTheDocument();
    expect(sincronizar).not.toHaveBeenCalled();
  });

  it('muestra el bloqueo si el motor detecta la versión obsoleta al refrescar la configuración', async () => {
    crearContenedor({
      sincronizar: async () => {
        throw new AppError({
          codigo: 'VERSION_OBSOLETA',
          mensaje: 'Actualiza la app para sincronizar.',
          reintentable: false,
        });
      },
    });
    renderPagina();

    fireEvent.click(await screen.findByRole('button', { name: /Confirmar como ana@empresa.com/i }));

    expect(await screen.findByText(/Actualiza la app para sincronizar/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirmar como ana@empresa.com/i })).toBeDisabled();
  });

  it('muestra los tamaños pequeños en KB', async () => {
    crearContenedor({
      resumen: { ...RESUMEN, bytes: 2.5 * 1024, archivos: 1, servicios: 1, porServicio: [] },
    });
    renderPagina();
    expect(await screen.findByText(/2,5 KB/)).toBeInTheDocument();
  });
});
