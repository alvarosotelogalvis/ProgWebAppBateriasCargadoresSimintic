import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import { ListaServiciosPage } from './ListaServiciosPage';

vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));

const servicios: Servicio[] = [
  servicioBuilder().recibido().conId('a').conCampos({ serie: 'SERIE-RECIBIDO' }).construir(),
  servicioBuilder()
    .diagnosticado()
    .conId('b')
    .conCampos({ serie: 'SERIE-DIAGNOSTICADO' })
    .construir(),
  servicioBuilder()
    .cotizado()
    .conId('c')
    .conCampos({ serie: 'SERIE-APROBADA', cotizacionEstado: 'APROBADA' })
    .construir(),
  servicioBuilder()
    .cotizado()
    .conId('d')
    .conCampos({ serie: 'SERIE-PENDIENTE', cotizacionEstado: 'PENDIENTE' })
    .construir(),
];

vi.mock('@/features/servicios/useConsultasServicios', () => ({
  useConsultasServicios: () => ({ servicios, hoy: '2026-10-21' }),
}));

const montar = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <ListaServiciosPage />
    </MemoryRouter>
  );

describe('ListaServiciosPage · filtro por tarjeta de Inicio', () => {
  it('sin tarjeta muestra todos los servicios', () => {
    montar('/servicios');

    expect(screen.getAllByText(/SERIE-/)).toHaveLength(4);
    expect(screen.queryByText(/Mostrando:/)).not.toBeInTheDocument();
  });

  it('con ?tarjeta=recibidos solo muestra los recibidos y avisa del filtro', () => {
    montar('/servicios?tarjeta=recibidos');

    expect(screen.getByText(/SERIE-RECIBIDO/)).toBeInTheDocument();
    expect(screen.queryByText(/SERIE-DIAGNOSTICADO/)).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando: Por diagnosticar')).toBeInTheDocument();
  });

  it('separa los cotizados aprobados (por OT) de los pendientes de respuesta', () => {
    montar('/servicios?tarjeta=porOT');

    expect(screen.getByText(/SERIE-APROBADA/)).toBeInTheDocument();
    expect(screen.queryByText(/SERIE-PENDIENTE/)).not.toBeInTheDocument();
  });

  it('"Quitar filtro" vuelve a mostrar todos', () => {
    montar('/servicios?tarjeta=recibidos');

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro' }));

    expect(screen.getAllByText(/SERIE-/)).toHaveLength(4);
    expect(screen.queryByText(/Mostrando:/)).not.toBeInTheDocument();
  });

  it('una tarjeta desconocida en la URL se ignora', () => {
    montar('/servicios?tarjeta=inventada');

    expect(screen.getAllByText(/SERIE-/)).toHaveLength(4);
  });
});
