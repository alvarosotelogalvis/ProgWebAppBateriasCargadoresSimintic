import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TransicionInvalidaError } from '@/domain/errores';
import type { Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { EtapaFacturacionPage } from './EtapaFacturacionPage';

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
  useCatalogo: () => undefined,
}));

const montar = (estado: 'entregado' | 'facturado' = 'entregado') => {
  useSesionStore.setState({ roles: ['Comercial'] });
  servicio = servicioBuilder()[estado]().construir();
  return render(
    <MemoryRouter initialEntries={[`/servicios/${servicio.id}/etapa/facturacion`]}>
      <Routes>
        <Route path="/servicios/:id/etapa/facturacion" element={<EtapaFacturacionPage />} />
        <Route path="/servicios/:id" element={<p data-testid="detalle" />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => vi.clearAllMocks());

describe('EtapaFacturacionPage', () => {
  it('guarda fecha y número y registra la facturación', async () => {
    montar();
    fireEvent.change(screen.getByLabelText('Número de factura (opcional)'), {
      target: { value: 'FE-2026-001234' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Completar facturación' }));

    await waitFor(() => expect(screen.getByTestId('detalle')).toBeInTheDocument());
    expect(casosDeUso.actualizarCampos).toHaveBeenCalledWith(
      servicio?.id,
      expect.objectContaining({ facturaNumero: 'FE-2026-001234' }),
      ['Comercial']
    );
    expect(casosDeUso.completarEtapa).toHaveBeenCalledWith(servicio?.id, 'registrarFacturacion', [
      'Comercial',
    ]);
  });

  it('el número es opcional: sin él no se envía facturaNumero', async () => {
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Completar facturación' }));

    await waitFor(() => expect(casosDeUso.completarEtapa).toHaveBeenCalled());
    const [, cambios] = casosDeUso.actualizarCampos.mock.calls[0] as unknown as [string, object];
    expect(cambios).not.toHaveProperty('facturaNumero');
  });

  it('rechaza en línea un número con formato inválido y no permite completar', () => {
    montar();

    fireEvent.change(screen.getByLabelText('Número de factura (opcional)'), {
      target: { value: 'FE 2026/01' },
    });

    expect(screen.getByText(/Formato de número inválido/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completar facturación' })).toBeDisabled();
  });

  it('lista que falta el PDF de la factura si el dominio lo exige', async () => {
    casosDeUso.completarEtapa.mockRejectedValueOnce(
      new TransicionInvalidaError([{ adjunto: 'FACTURA', clave: 'errores.adjunto.min' }])
    );
    montar();

    fireEvent.click(screen.getByRole('button', { name: 'Completar facturación' }));

    expect(await screen.findByText('PDF de la factura', { selector: 'li' })).toBeInTheDocument();
    expect(screen.queryByTestId('detalle')).not.toBeInTheDocument();
  });

  it('un servicio ya facturado se ve en solo lectura', () => {
    montar('facturado');

    expect(screen.queryByRole('button', { name: 'Completar facturación' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Número de factura (opcional)')).not.toBeInTheDocument();
  });
});
