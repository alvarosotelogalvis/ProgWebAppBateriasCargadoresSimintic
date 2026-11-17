import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ValidacionError } from '@/domain/errores';
import type { Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { CorregirServicioPage } from './CorregirServicioPage';

const casosDeUso = { corregirCampos: vi.fn(async () => undefined) };
let servicio: Servicio | undefined;

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosDeUso, casosClientes: { agregarCliente: vi.fn() } }),
}));
vi.mock('@/infrastructure/db/hooks', () => ({
  useClientes: () => [],
  useServicio: () => servicio,
  useCatalogo: () => undefined,
}));

const montar = (estado: 'recibido' | 'facturado' | 'borrador' = 'facturado') => {
  useSesionStore.setState({ roles: ['Administrador'] });
  servicio = servicioBuilder()[estado]().construir();
  return render(
    <MemoryRouter initialEntries={[`/servicios/${servicio.id}/corregir`]}>
      <Routes>
        <Route path="/servicios/:id/corregir" element={<CorregirServicioPage />} />
        <Route path="/servicios/:id" element={<p data-testid="detalle" />} />
      </Routes>
    </MemoryRouter>
  );
};

const escribirNumeroFactura = (valor: string) =>
  fireEvent.change(screen.getByLabelText('Número de factura (opcional)'), {
    target: { value: valor },
  });

beforeEach(() => vi.clearAllMocks());

describe('CorregirServicioPage (HU-007-8)', () => {
  it('agrupa los campos por etapa y permite editar una etapa ya completada', () => {
    montar('facturado');

    expect(screen.getByRole('heading', { name: 'Facturación' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entrega del equipo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Número de factura (opcional)')).toBeInTheDocument();
  });

  it('no permite guardar hasta que haya un cambio', () => {
    montar();

    expect(screen.getByRole('button', { name: 'Guardar correcciones' })).toBeDisabled();
  });

  it('envía solo los campos modificados y vuelve al detalle', async () => {
    montar();
    escribirNumeroFactura('FE-002');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar correcciones' }));

    await waitFor(() => expect(screen.getByTestId('detalle')).toBeInTheDocument());
    expect(casosDeUso.corregirCampos).toHaveBeenCalledWith(
      servicio?.id,
      { facturaNumero: 'FE-002' },
      ['Administrador']
    );
  });

  it('muestra las fechas incoherentes que rechaza el dominio y no navega', async () => {
    casosDeUso.corregirCampos.mockRejectedValueOnce(
      new ValidacionError([{ campo: 'fechaEntrega', clave: 'etapas.entrega.error_fechaAnterior' }])
    );
    montar();
    escribirNumeroFactura('FE-002');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar correcciones' }));

    expect(await screen.findByText('Revisa estos datos:')).toBeInTheDocument();
    expect(screen.getByText('No puede ser anterior a la recepción')).toBeInTheDocument();
    expect(screen.queryByTestId('detalle')).not.toBeInTheDocument();
  });

  it('un error inesperado muestra un mensaje general', async () => {
    casosDeUso.corregirCampos.mockRejectedValueOnce(new Error('boom'));
    montar();
    escribirNumeroFactura('FE-002');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar correcciones' }));

    expect(
      await screen.findByText('No se pudieron guardar las correcciones. Intenta de nuevo.')
    ).toBeInTheDocument();
  });
});
