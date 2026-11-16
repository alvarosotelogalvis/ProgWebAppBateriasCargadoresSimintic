import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CONFIG_DEFECTO } from '@/domain/config';
import { TransicionInvalidaError } from '@/domain/errores';
import type { CamposServicio, Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { EtapaEntregaPage } from './EtapaEntregaPage';

const casosDeUso = {
  actualizarCampos: vi.fn(async () => undefined),
  completarEtapa: vi.fn(async () => undefined),
};
const casosAdjuntos = { agregarFoto: vi.fn(), eliminarAdjunto: vi.fn() };
let servicio: Servicio | undefined;

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosDeUso, casosAdjuntos, db: {}, config: () => CONFIG_DEFECTO }),
}));
vi.mock('@/infrastructure/db/hooks', () => ({
  useServicio: () => servicio,
  useAdjuntos: () => [],
}));
vi.mock('@/features/adjuntos/components/AdjuntosEtapa', () => ({
  AdjuntosEtapa: () => <div data-testid="fotos-salida" />,
}));

const montar = (base: 'enReparacion' | 'cotizado', campos: Partial<CamposServicio> = {}) => {
  useSesionStore.setState({ roles: ['Tecnico'] });
  servicio = servicioBuilder()[base]().conCampos(campos).construir();
  return render(
    <MemoryRouter initialEntries={[`/servicios/${servicio.id}/etapa/entrega`]}>
      <Routes>
        <Route path="/servicios/:id/etapa/entrega" element={<EtapaEntregaPage />} />
        <Route path="/servicios/:id" element={<p data-testid="detalle" />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => vi.clearAllMocks());

describe('EtapaEntregaPage · con reparación (EN_REPARACION)', () => {
  it('pide la vida útil como obligatoria y muestra las fotos de salida', () => {
    montar('enReparacion');

    expect(
      screen.getByLabelText('Proyección de vida útil', { selector: 'input' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('fotos-salida')).toBeInTheDocument();
  });

  it('guarda fecha y vida útil (chip +12 meses) y registra la entrega', async () => {
    montar('enReparacion');
    fireEvent.change(screen.getByLabelText('Fecha de entrega'), {
      target: { value: '2026-10-20' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+12 meses' }));

    fireEvent.click(screen.getByRole('button', { name: 'Completar entrega' }));

    await waitFor(() => expect(screen.getByTestId('detalle')).toBeInTheDocument());
    expect(casosDeUso.actualizarCampos).toHaveBeenCalledWith(
      servicio?.id,
      { fechaEntrega: '2026-10-20', proyeccionVidaUtil: '2027-10-20' },
      ['Tecnico']
    );
    expect(casosDeUso.completarEtapa).toHaveBeenCalledWith(servicio?.id, 'registrarEntrega', [
      'Tecnico',
    ]);
  });

  it('lista las fotos de salida y la vida útil si el dominio los exige', async () => {
    casosDeUso.completarEtapa.mockRejectedValueOnce(
      new TransicionInvalidaError([
        { adjunto: 'FOTO_SALIDA', clave: 'errores.adjunto.min' },
        { campo: 'proyeccionVidaUtil', clave: 'errores.servicio.vidaUtilRequerida' },
      ])
    );
    montar('enReparacion');

    fireEvent.click(screen.getByRole('button', { name: 'Completar entrega' }));

    expect(await screen.findByText('Al menos 1 foto de salida')).toBeInTheDocument();
    expect(screen.queryByTestId('detalle')).not.toBeInTheDocument();
  });
});

describe('EtapaEntregaPage · sin reparación (COTIZADO rechazada)', () => {
  it('usa la variante sin reparación con vida útil opcional y no la envía si está vacía', async () => {
    montar('cotizado', { cotizacionEstado: 'RECHAZADA' });

    expect(screen.getByRole('heading', { name: 'Entrega sin reparación' })).toBeInTheDocument();
    expect(
      screen.getByLabelText('Vida útil (opcional)', { selector: 'input' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Completar entrega' }));

    await waitFor(() =>
      expect(casosDeUso.completarEtapa).toHaveBeenCalledWith(
        servicio?.id,
        'registrarEntregaSinReparacion',
        ['Tecnico']
      )
    );
    const [, cambios] = casosDeUso.actualizarCampos.mock.calls[0] as unknown as [string, object];
    expect(cambios).not.toHaveProperty('proyeccionVidaUtil');
  });

  it('con la cotización aprobada indica que primero va la orden de trabajo', () => {
    montar('cotizado', { cotizacionEstado: 'APROBADA' });

    expect(
      screen.getByText('El equipo debe pasar primero por la orden de trabajo.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Completar entrega' })).not.toBeInTheDocument();
  });

  it('con la cotización pendiente indica que solo aplica si fue rechazada', () => {
    montar('cotizado', { cotizacionEstado: 'PENDIENTE' });

    expect(
      screen.getByText(/solo aplica cuando el cliente rechazó la cotización/)
    ).toBeInTheDocument();
  });
});
