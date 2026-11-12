import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';
import { TransicionInvalidaError } from '@/domain/errores';
import type { Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { EtapaDiagnosticoPage } from './EtapaDiagnosticoPage';

const casosDeUso = {
  actualizarCampos: vi.fn(async () => undefined),
  completarEtapa: vi.fn(async () => undefined),
};
const casosAdjuntos = { agregarPdf: vi.fn(), eliminarAdjunto: vi.fn() };
let servicio: Servicio | undefined;

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosDeUso, casosAdjuntos, db: {} }),
}));

vi.mock('@/infrastructure/db/hooks', () => ({
  useServicio: () => servicio,
  useAdjuntos: () => [],
  useCatalogo: (clave: string) =>
    clave === 'choices:Diagnostico' ? ['Reparable', 'Garantía', 'D. FINAL'] : undefined,
}));

const montar = () =>
  render(
    <MemoryRouter initialEntries={[`/servicios/${servicio?.id}/etapa/diagnostico`]}>
      <Routes>
        <Route path="/servicios/:id/etapa/diagnostico" element={<EtapaDiagnosticoPage />} />
        <Route path="/servicios/:id" element={<p data-testid="detalle" />} />
      </Routes>
    </MemoryRouter>
  );

const elegirDiagnostico = (valor: string) =>
  fireEvent.change(screen.getByLabelText('Diagnóstico'), { target: { value: valor } });

beforeEach(() => {
  vi.clearAllMocks();
  useSesionStore.setState({ roles: ['Tecnico'] });
  servicio = servicioBuilder().recibido().construir();
});

describe('EtapaDiagnosticoPage', () => {
  it('muestra el diagnóstico normal sin la rama de disposición final', () => {
    montar();

    expect(screen.getByRole('heading', { name: 'Diagnóstico del equipo' })).toBeInTheDocument();
    expect(screen.queryByText('Fecha de socialización con el cliente')).not.toBeInTheDocument();
  });

  it('guarda los campos y completa como diagnóstico, luego vuelve al detalle', async () => {
    montar();
    elegirDiagnostico('Reparable');
    fireEvent.change(screen.getByLabelText('Observación técnica'), {
      target: { value: 'Celdas con desbalance' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Completar diagnóstico' }));

    await waitFor(() => expect(screen.getByTestId('detalle')).toBeInTheDocument());
    expect(casosDeUso.actualizarCampos).toHaveBeenCalledWith(
      servicio?.id,
      { diagnostico: 'Reparable', observacionTecnica: 'Celdas con desbalance' },
      ['Tecnico']
    );
    expect(casosDeUso.completarEtapa).toHaveBeenCalledWith(servicio?.id, 'completarDiagnostico', [
      'Tecnico',
    ]);
  });

  it('con el valor de disposición final muestra la rama DF y pide confirmación', async () => {
    montar();
    elegirDiagnostico(CONFIG_DEFECTO.diagnosticoValorDisposicionFinal);

    expect(screen.getByText('Fecha de socialización con el cliente')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Completar disposición final' }));
    expect(casosDeUso.completarEtapa).not.toHaveBeenCalled();
    expect(screen.getByText(/Se cerrará el registro sin pasar por cotización/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, cerrar' }));

    await waitFor(() =>
      expect(casosDeUso.completarEtapa).toHaveBeenCalledWith(
        servicio?.id,
        'registrarDisposicionFinal',
        ['Tecnico']
      )
    );
  });

  it('al cancelar la confirmación de disposición final no completa nada', () => {
    montar();
    elegirDiagnostico(CONFIG_DEFECTO.diagnosticoValorDisposicionFinal);
    fireEvent.click(screen.getByRole('button', { name: 'Completar disposición final' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' }).at(-1)!);

    expect(casosDeUso.completarEtapa).not.toHaveBeenCalled();
  });

  it('lista lo que falta cuando el dominio rechaza la transición y no navega', async () => {
    casosDeUso.completarEtapa.mockRejectedValueOnce(
      new TransicionInvalidaError([
        { campo: 'observacionTecnica', clave: 'errores.servicio.observacionRequerida' },
        { adjunto: 'FORMATO_DIAGNOSTICO', clave: 'errores.adjunto.min' },
      ])
    );
    montar();
    elegirDiagnostico('Reparable');

    fireEvent.click(screen.getByRole('button', { name: 'Completar diagnóstico' }));

    expect(await screen.findByText('Faltan datos para completar:')).toBeInTheDocument();
    expect(screen.getByText('La observación técnica es obligatoria.')).toBeInTheDocument();
    expect(
      screen.getByText('Formato de diagnóstico (PDF)', { selector: 'li' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('detalle')).not.toBeInTheDocument();
  });

  it('sin la fecha de socialización no envía fechaSocializacionDF en un diagnóstico normal', async () => {
    montar();
    elegirDiagnostico('Garantía');

    fireEvent.click(screen.getByRole('button', { name: 'Completar diagnóstico' }));

    await waitFor(() => expect(casosDeUso.completarEtapa).toHaveBeenCalled());
    const [, cambios] = casosDeUso.actualizarCampos.mock.calls[0] as unknown as [string, object];
    expect(cambios).not.toHaveProperty('fechaSocializacionDF');
  });
});
