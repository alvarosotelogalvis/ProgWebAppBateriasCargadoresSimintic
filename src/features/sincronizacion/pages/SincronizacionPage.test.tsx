import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import * as containerContext from '@/app/containerContext';
import type { ResumenPendientes } from '@/application/sync/resumenPendientes';
import type { CuentaUsuario } from '@/domain/servicio';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import { useOnline } from '@/shared/hooks/useOnline';
import { useSesionStore } from '@/shared/stores/sesionStore';

import { SincronizacionPage } from './SincronizacionPage';

vi.mock('@/app/containerContext', () => ({ useContainer: vi.fn() }));
vi.mock('@/shared/hooks/useOnline', () => ({ useOnline: vi.fn(() => true) }));
vi.mock('@/shared/hooks/useBreakpoint', () => ({ useBreakpoint: vi.fn(() => 'compacto') }));

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

function crearContenedor(opciones: { resumen?: ResumenPendientes } = {}) {
  const confirmarIdentidad = vi.fn(async () => ({ ok: true, token: 'token', cuenta: CUENTA }));
  const sincronizar = vi.fn(async () => ({
    subidos: 3,
    archivos: 11,
    errores: 0,
    conflictos: 0,
    resultado: 'OK' as const,
  }));

  const contenedor = {
    auth: { cuentaActiva: () => CUENTA },
    resumenPendientes: vi.fn(async () => opciones.resumen ?? RESUMEN),
    confirmarIdentidad,
    sync: { sincronizar, on: vi.fn(() => () => undefined) },
    eventosSync: { suscribir: vi.fn(() => () => undefined) },
  };

  vi.mocked(containerContext.useContainer).mockReturnValue(contenedor as never);
  return { confirmarIdentidad, sincronizar, contenedor };
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
});
