import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Rol, Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { EtapaAnulacionPage } from './EtapaAnulacionPage';

const casosDeUso = { anular: vi.fn(async () => undefined) };
let servicio: Servicio | undefined;

vi.mock('@/app/containerContext', () => ({ useContainer: () => ({ casosDeUso }) }));
vi.mock('@/infrastructure/db/hooks', () => ({ useServicio: () => servicio }));

const montar = (roles: Rol[], estado: 'recibido' | 'facturado' = 'recibido') => {
  useSesionStore.setState({ roles });
  servicio = servicioBuilder()[estado]().construir();
  return render(
    <MemoryRouter initialEntries={[`/servicios/${servicio.id}/etapa/anulacion`]}>
      <Routes>
        <Route path="/servicios/:id/etapa/anulacion" element={<EtapaAnulacionPage />} />
        <Route path="/servicios/:id" element={<p data-testid="detalle" />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => vi.clearAllMocks());

describe('EtapaAnulacionPage', () => {
  it('anula por el caso de uso con el motivo y vuelve al detalle', async () => {
    montar(['Administrador']);
    fireEvent.click(screen.getByRole('button', { name: 'Anular servicio' }));
    fireEvent.change(await screen.findByLabelText('Motivo de la anulación'), {
      target: { value: 'Registro duplicado por error' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sí, anular' }));

    await waitFor(() => expect(screen.getByTestId('detalle')).toBeInTheDocument());
    expect(casosDeUso.anular).toHaveBeenCalledWith(servicio?.id, 'Registro duplicado por error', [
      'Administrador',
    ]);
  });

  it('si falla no navega y muestra el error', async () => {
    casosDeUso.anular.mockRejectedValueOnce(new Error('boom'));
    montar(['Administrador']);
    fireEvent.click(screen.getByRole('button', { name: 'Anular servicio' }));
    fireEvent.change(await screen.findByLabelText('Motivo de la anulación'), {
      target: { value: 'Registro duplicado por error' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sí, anular' }));

    expect(await screen.findByText(/No se pudo anular el servicio/)).toBeInTheDocument();
    expect(screen.queryByTestId('detalle')).not.toBeInTheDocument();
  });

  it('un Técnico solo ve el aviso de permisos', () => {
    montar(['Tecnico']);

    expect(screen.getByText('Solo administradores pueden anular servicios')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anular servicio' })).not.toBeInTheDocument();
  });

  it('un servicio ya cerrado no se puede anular ni siquiera por el Administrador', () => {
    montar(['Administrador'], 'facturado');

    expect(screen.queryByRole('button', { name: 'Anular servicio' })).not.toBeInTheDocument();
  });
});
