import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import type { Servicio } from '@/domain/servicio';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';

import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { ResolverConflictoPage } from './ResolverConflictoPage';

const resolverConflictos = vi.fn();
let servicio: Servicio | undefined;

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosDeUso: { resolverConflictos } }),
}));
vi.mock('@/infrastructure/db/hooks', () => ({ useServicio: () => servicio }));
vi.mock('@/shared/hooks/useBreakpoint', () => ({ useBreakpoint: vi.fn(() => 'compacto') }));
vi.mock('@/shared/ui/Icon', () => ({ Icon: () => <svg aria-hidden="true" /> }));

const enConflicto = (): Servicio => ({
  ...servicioBuilder().diagnosticado().construir(),
  syncState: 'conflict',
  camposSucios: ['observacionTecnica', 'marca'],
  conflictos: [
    { campo: 'observacionTecnica', local: 'Mi observación', remoto: 'Observación remota' },
    { campo: 'marca', local: 'ROQUET', remoto: undefined },
  ],
});

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/sincronizacion/conflicto/s1']}>
      <Routes>
        <Route path="/sincronizacion/conflicto/:id" element={<ResolverConflictoPage />} />
        <Route path="/sincronizacion" element={<i data-testid="pantalla-sincronizacion" />} />
      </Routes>
    </MemoryRouter>
  );

const botonAplicar = () => screen.getByRole('button', { name: 'APLICAR Y SINCRONIZAR' });

beforeEach(() => {
  resolverConflictos.mockReset();
  resolverConflictos.mockResolvedValue(undefined);
  vi.mocked(useBreakpoint).mockReturnValue('compacto');
  servicio = enConflicto();
});

describe('ResolverConflictoPage (ES-006-08, ES-006-09)', () => {
  it('muestra cada campo con «Mi valor» y el valor de SharePoint, con el nombre que ve el usuario', () => {
    abrir();

    expect(screen.getByText('Mi observación')).toBeInTheDocument();
    expect(screen.getByText('Observación remota')).toBeInTheDocument();
    expect(screen.getByText('Sin valor')).toBeInTheDocument();
    expect(screen.queryByText('observacionTecnica')).not.toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: /marca/i })).toBeInTheDocument();
  });

  it('el botón queda deshabilitado hasta elegir un valor en todos los campos', () => {
    abrir();
    expect(botonAplicar()).toBeDisabled();
    expect(screen.getByText('Elige un valor para todos los conflictos')).toBeInTheDocument();

    const [primero, segundo] = screen.getAllByRole('radiogroup');
    fireEvent.click(within(primero as HTMLElement).getByRole('radio', { name: 'Mi valor' }));
    expect(botonAplicar()).toBeDisabled();

    fireEvent.click(within(segundo as HTMLElement).getByRole('radio', { name: 'SharePoint' }));
    expect(botonAplicar()).toBeEnabled();
  });

  it('aplica las elecciones y vuelve a Sincronización', async () => {
    abrir();
    const [primero, segundo] = screen.getAllByRole('radiogroup');
    fireEvent.click(within(primero as HTMLElement).getByRole('radio', { name: 'Mi valor' }));
    fireEvent.click(within(segundo as HTMLElement).getByRole('radio', { name: 'SharePoint' }));

    fireEvent.click(botonAplicar());

    await waitFor(() => {
      expect(resolverConflictos).toHaveBeenCalledWith(servicio?.id, [
        { campo: 'observacionTecnica', usar: 'LOCAL' },
        { campo: 'marca', usar: 'REMOTO' },
      ]);
    });
    expect(await screen.findByTestId('pantalla-sincronizacion')).toBeInTheDocument();
  });

  it('si no se pueden aplicar las elecciones, avisa y permite reintentar', async () => {
    resolverConflictos.mockRejectedValue(new Error('falló'));
    abrir();
    for (const grupo of screen.getAllByRole('radiogroup')) {
      fireEvent.click(within(grupo).getByRole('radio', { name: 'Mi valor' }));
    }

    fireEvent.click(botonAplicar());

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron aplicar');
    expect(botonAplicar()).toBeEnabled();
  });

  it('en compacto muestra una tarjeta por campo y en expandido una tabla con encabezados', () => {
    const { container, unmount } = abrir();
    expect(container.querySelectorAll('[data-testid="tabla-tarjeta"]')).toHaveLength(2);
    expect(container.querySelector('table')).toBeNull();
    unmount();

    vi.mocked(useBreakpoint).mockReturnValue('expandido');
    const expandido = abrir();
    expect(expandido.container.querySelector('table')).not.toBeNull();
    expect(expandido.container.querySelectorAll('th[scope="col"]')).toHaveLength(4);
    expect(screen.getByRole('columnheader', { name: 'Campo' })).toBeInTheDocument();
  });

  it('avisa cuando el servicio fue eliminado en SharePoint', () => {
    servicio = {
      ...enConflicto(),
      conflictos: [{ campo: 'estado', local: 'DIAGNOSTICADO', remoto: undefined }],
    };
    abrir();
    expect(screen.getByText(/fue eliminado en SharePoint/)).toBeInTheDocument();
  });

  it('sin conflictos muestra un estado vacío', () => {
    servicio = { ...enConflicto(), conflictos: [], syncState: 'synced' };
    abrir();
    expect(screen.getByText('Sin conflictos por resolver')).toBeInTheDocument();
  });
});
