import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransicionInvalidaError } from '@/domain/errores';
import type { CamposServicio, Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { EtapaOrdenTrabajoPage } from './EtapaOrdenTrabajoPage';

const casosDeUso = {
  actualizarCampos: vi.fn(async () => undefined),
  completarEtapa: vi.fn(async () => undefined),
};
let servicio: Servicio | undefined;

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosDeUso, db: {} }),
}));
vi.mock('@/infrastructure/db/hooks', () => ({ useServicio: () => servicio }));

const montar = (campos: Partial<CamposServicio> = {}) => {
  useSesionStore.setState({ roles: ['Tecnico'] });
  servicio = servicioBuilder().cotizado().conCampos(campos).construir();
  return render(
    <MemoryRouter initialEntries={[`/servicios/${servicio.id}/etapa/orden-trabajo`]}>
      <Routes>
        <Route path="/servicios/:id/etapa/orden-trabajo" element={<EtapaOrdenTrabajoPage />} />
        <Route path="/servicios/:id" element={<p data-testid="detalle" />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => vi.clearAllMocks());

describe('EtapaOrdenTrabajoPage', () => {
  it('con la cotización pendiente avisa que se espera la respuesta y no ofrece crear la orden', () => {
    montar({ cotizacionEstado: 'PENDIENTE' });

    expect(
      screen.getByText('Esperando la respuesta del cliente sobre la cotización.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Crear orden de trabajo' })
    ).not.toBeInTheDocument();
  });

  it('con la cotización rechazada explica que debe estar aprobada', () => {
    montar({ cotizacionEstado: 'RECHAZADA' });

    expect(
      screen.getByText('La cotización debe estar aprobada para crear la orden.')
    ).toBeInTheDocument();
  });

  it('con la cotización aprobada guarda detalle y costo y genera la orden', async () => {
    montar({ cotizacionEstado: 'APROBADA' });
    fireEvent.change(screen.getByLabelText('Detalle de la reparación'), {
      target: { value: 'Cambio de celdas y prueba de carga' },
    });
    fireEvent.change(screen.getByLabelText('Costo de la reparación interna'), {
      target: { value: '350000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Crear orden de trabajo' }));

    await waitFor(() => expect(screen.getByTestId('detalle')).toBeInTheDocument());
    expect(casosDeUso.actualizarCampos).toHaveBeenCalledWith(
      servicio?.id,
      { otDetalle: 'Cambio de celdas y prueba de carga', otCostoReparacion: 350000 },
      ['Tecnico']
    );
    expect(casosDeUso.completarEtapa).toHaveBeenCalledWith(servicio?.id, 'generarOT', ['Tecnico']);
  });

  it('lista lo que falta cuando el dominio rechaza (detalle corto) y no navega', async () => {
    casosDeUso.completarEtapa.mockRejectedValueOnce(
      new TransicionInvalidaError([
        { campo: 'otDetalle', clave: 'errores.servicio.otDetalleRequerido' },
      ])
    );
    montar({ cotizacionEstado: 'APROBADA' });

    fireEvent.click(screen.getByRole('button', { name: 'Crear orden de trabajo' }));

    expect(await screen.findByText('Faltan datos para completar:')).toBeInTheDocument();
    expect(screen.queryByTestId('detalle')).not.toBeInTheDocument();
  });

  it('una vez generada la orden se muestra en solo lectura', () => {
    montar({
      estado: 'EN_REPARACION',
      cotizacionEstado: 'APROBADA',
      otDetalle: 'Cambio de celdas',
      otCostoReparacion: 350000,
    });

    expect(screen.getByText('Cambio de celdas')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Crear orden de trabajo' })
    ).not.toBeInTheDocument();
  });
});
