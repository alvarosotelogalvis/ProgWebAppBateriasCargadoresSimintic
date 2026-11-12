import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Adjunto } from '@/domain/adjunto';
import type { Rol, Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { adjuntoBuilder } from '../../../../tests/builders/adjuntoBuilder';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { DetalleServicioPage } from './DetalleServicioPage';

let servicio: Servicio | undefined;
let adjuntos: Adjunto[] = [];

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosDeUso: { anular: vi.fn(), descartarBorrador: vi.fn() } }),
}));
vi.mock('@/infrastructure/db/hooks', () => ({
  useServicio: () => servicio,
  useAdjuntos: () => adjuntos,
}));
vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));
vi.mock('@/shared/ui/PhotoGallery', () => ({
  PhotoGallery: ({ adjuntos: lista }: { adjuntos: Adjunto[] }) => (
    <div data-testid="galeria">{`${lista.length} fotos`}</div>
  ),
}));

type Base = 'borrador' | 'recibido' | 'diagnosticado' | 'cotizado' | 'enReparacion' | 'facturado';

const montar = (base: Base, roles: Rol[], extra: Adjunto[] = []) => {
  useSesionStore.setState({ roles });
  servicio = servicioBuilder()[base]().construir();
  adjuntos = extra;
  return render(
    <MemoryRouter initialEntries={[`/servicios/${servicio.id}`]}>
      <Routes>
        <Route path="/servicios/:id" element={<DetalleServicioPage />} />
        <Route path="/servicios/:id/etapa/:etapa" element={<p data-testid="etapa" />} />
        <Route path="/servicios/:id/corregir" element={<p data-testid="corregir" />} />
      </Routes>
    </MemoryRouter>
  );
};

beforeEach(() => {
  adjuntos = [];
});

describe('DetalleServicioPage (HU-007)', () => {
  it('ofrece la siguiente etapa del rol y navega a ella', () => {
    montar('recibido', ['Tecnico']);

    fireEvent.click(screen.getByRole('button', { name: 'Registrar diagnóstico' }));

    expect(screen.getByTestId('etapa')).toBeInTheDocument();
  });

  it('el Comercial registra la respuesta del cliente en un servicio cotizado', () => {
    montar('cotizado', ['Comercial']);

    expect(
      screen.getByRole('button', { name: 'Registrar respuesta del cliente' })
    ).toBeInTheDocument();
  });

  it('cuando el rol no puede avanzar, la línea de tiempo dice quién debe hacerlo', () => {
    montar('diagnosticado', ['Tecnico']);

    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Pendiente de Comercial/)).toHaveLength(1);
  });

  it('muestra el resumen de lo ya registrado bajo cada etapa', () => {
    montar('enReparacion', ['Tecnico']);

    expect(screen.getByText('2026-10-01', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(/Aprobada/)).toBeInTheDocument();
  });

  it('un servicio cerrado no ofrece etapas y lo indica', () => {
    montar('facturado', ['Comercial']);

    expect(screen.getByText('Este servicio ya está cerrado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Registrar/ })).not.toBeInTheDocument();
  });

  it('muestra las fotos de salida solo cuando existen', () => {
    montar(
      'facturado',
      ['Comercial'],
      [
        adjuntoBuilder({ id: 's1', tipo: 'FOTO_SALIDA' }).construir(),
        adjuntoBuilder({ id: 's2', tipo: 'FOTO_SALIDA' }).construir(),
      ]
    );

    expect(screen.getByRole('heading', { name: 'Fotos de salida' })).toBeInTheDocument();
    expect(screen.getByText('2 fotos')).toBeInTheDocument();
  });

  it('sin fotos de salida no aparece esa sección', () => {
    montar('recibido', ['Tecnico']);

    expect(screen.queryByRole('heading', { name: 'Fotos de salida' })).not.toBeInTheDocument();
  });

  it('el Administrador ve Editar datos y puede ir a corregir', () => {
    montar('recibido', ['Administrador']);

    fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }));

    expect(screen.getByTestId('corregir')).toBeInTheDocument();
  });

  it('un borrador ofrece completar la recepción o descartarlo', () => {
    montar('borrador', ['Tecnico']);

    expect(screen.getByRole('button', { name: /Completar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descartar/i })).toBeInTheDocument();
  });
});
