import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransicionInvalidaError } from '@/domain/errores';
import type { Rol, Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { EtapaCotizacionPage } from './EtapaCotizacionPage';

const casosDeUso = {
  actualizarCampos: vi.fn(async () => undefined),
  completarEtapa: vi.fn(async () => undefined),
  cambiarRespuestaCotizacion: vi.fn(async () => undefined),
};
const casosAdjuntos = { agregarPdf: vi.fn(), eliminarAdjunto: vi.fn() };
let servicio: Servicio | undefined;

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosDeUso, casosAdjuntos, db: {} }),
}));

vi.mock('@/infrastructure/db/hooks', () => ({
  useServicio: () => servicio,
  useAdjuntos: () => [],
  useCatalogo: () => undefined,
}));

const montar = (roles: Rol[], estado: 'diagnosticado' | 'cotizado') => {
  useSesionStore.setState({ roles });
  servicio = servicioBuilder()[estado]().construir();
  return render(
    <MemoryRouter initialEntries={[`/servicios/${servicio.id}/etapa/cotizacion`]}>
      <Routes>
        <Route path="/servicios/:id/etapa/cotizacion" element={<EtapaCotizacionPage />} />
        <Route path="/servicios/:id" element={<p data-testid="detalle" />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EtapaCotizacionPage · registrar la cotización (DIAGNOSTICADO)', () => {
  it('guarda fecha y valor y completa como cotización, luego vuelve al detalle', async () => {
    montar(['Comercial'], 'diagnosticado');
    fireEvent.change(screen.getByLabelText('Valor de la cotización'), {
      target: { value: '1500000' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Registrar cotización' }));

    await waitFor(() => expect(screen.getByTestId('detalle')).toBeInTheDocument());
    expect(casosDeUso.actualizarCampos).toHaveBeenCalledWith(
      servicio?.id,
      expect.objectContaining({ cotizacionValor: 1500000 }),
      ['Comercial']
    );
    expect(casosDeUso.completarEtapa).toHaveBeenCalledWith(servicio?.id, 'registrarCotizacion', [
      'Comercial',
    ]);
  });

  it('propone la fecha de hoy como fecha de envío', async () => {
    montar(['Comercial'], 'diagnosticado');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar cotización' }));

    await waitFor(() => expect(casosDeUso.actualizarCampos).toHaveBeenCalled());
    const [, cambios] = casosDeUso.actualizarCampos.mock.calls[0] as unknown as [
      string,
      { cotizacionFechaEnvio: string },
    ];
    expect(cambios.cotizacionFechaEnvio).toBe(new Date().toLocaleDateString('en-CA'));
  });

  it('lista lo que falta cuando el dominio rechaza y no navega', async () => {
    casosDeUso.completarEtapa.mockRejectedValueOnce(
      new TransicionInvalidaError([
        { campo: 'cotizacionFechaEnvio', clave: 'errores.servicio.cotizacionFechaRequerida' },
      ])
    );
    montar(['Comercial'], 'diagnosticado');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar cotización' }));

    expect(await screen.findByText('Faltan datos para completar:')).toBeInTheDocument();
    expect(
      screen.getByText('La fecha de envío de la cotización es obligatoria.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('detalle')).not.toBeInTheDocument();
  });

  it('no muestra el selector de respuesta hasta que la cotización esté registrada', () => {
    montar(['Comercial'], 'diagnosticado');

    expect(screen.queryByText('Respuesta del cliente')).not.toBeInTheDocument();
  });
});

describe('EtapaCotizacionPage · respuesta del cliente (COTIZADO)', () => {
  it('el Comercial cambia la respuesta y no ve el botón de registrar', async () => {
    montar(['Comercial'], 'cotizado');

    expect(screen.queryByRole('button', { name: 'Registrar cotización' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Aprobada' }));

    await waitFor(() =>
      expect(casosDeUso.cambiarRespuestaCotizacion).toHaveBeenCalledWith(servicio?.id, 'APROBADA', [
        'Comercial',
      ])
    );
  });

  it('el Técnico ve la respuesta pero no puede cambiarla', () => {
    montar(['Tecnico'], 'cotizado');

    expect(screen.getByRole('radio', { name: 'Aprobada' })).toBeDisabled();
  });

  it('muestra los datos registrados en solo lectura (sin campos editables)', () => {
    montar(['Comercial'], 'cotizado');

    expect(screen.getByText('2026-10-10')).toBeInTheDocument();
    expect(screen.queryByLabelText('Valor de la cotización')).not.toBeInTheDocument();
  });

  it('avisa si el cambio de respuesta falla', async () => {
    casosDeUso.cambiarRespuestaCotizacion.mockRejectedValueOnce(new Error('boom'));
    montar(['Comercial'], 'cotizado');

    fireEvent.click(screen.getByRole('radio', { name: 'Rechazada' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
