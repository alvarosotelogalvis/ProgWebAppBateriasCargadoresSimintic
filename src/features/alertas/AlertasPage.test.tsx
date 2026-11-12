import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Servicio } from '@/domain/servicio';
import '@/shared/i18n';
import { servicioBuilder } from '../../../tests/builders/servicioBuilder';
import { AlertasPage } from './AlertasPage';

let servicios: Servicio[] = [];

vi.mock('@/app/containerContext', () => ({ useContainer: () => ({ db: {} }) }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => servicios }));
vi.mock('@/infrastructure/db/hooks', () => ({
  useCatalogo: () => [
    { id: 1, nombre: 'NAVAR ASOCIADOS', activo: true },
    { id: 2, nombre: 'OTRO CLIENTE', activo: true },
  ],
}));

const servicio = (id: string, vidaUtil: string, cliente = 'NAVAR ASOCIADOS'): Servicio => ({
  ...servicioBuilder()
    .entregado()
    .conId(id)
    .conCampos({ proyeccionVidaUtil: vidaUtil })
    .construir(),
  clienteNombre: cliente,
  codigo: `COD-${id}`,
});

const montar = () =>
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<AlertasPage />} />
        <Route path="/servicios/:id" element={<p data-testid="detalle" />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 21, 12, 0, 0)); // 21-oct-2026 mediodía local
  servicios = [];
});

afterEach(() => vi.useRealTimers());

describe('AlertasPage', () => {
  it('muestra las cuatro pestañas con su contador', () => {
    servicios = [
      servicio('v', '2026-10-20'),
      servicio('a', '2026-11-10'),
      servicio('b', '2026-12-10'),
      servicio('c', '2027-01-10'),
    ];
    montar();

    expect(screen.getByRole('button', { name: 'Vencidas (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '≤30 días (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '≤60 días (1)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '≤90 días (1)' })).toBeInTheDocument();
  });

  it('sin alertas muestra el mensaje vacío', () => {
    montar();

    expect(screen.getByText('Sin alertas en este momento')).toBeInTheDocument();
  });

  it('en Vencidas indica hace cuántos días venció, con la fecha sin desfase', () => {
    servicios = [servicio('v', '2026-10-19')];
    montar();

    expect(screen.getByText('COD-v')).toBeInTheDocument();
    expect(screen.getByText('Venció hace 2 días')).toBeInTheDocument();
    expect(screen.getByText(new Date(2026, 9, 19).toLocaleDateString('es-CO'))).toBeInTheDocument();
  });

  it('en ≤30 días indica cuántos días faltan (singular y plural)', () => {
    servicios = [servicio('a', '2026-10-22'), servicio('b', '2026-10-25')];
    montar();

    fireEvent.click(screen.getByRole('button', { name: /≤30 días/ }));

    expect(screen.getByText('Vence en 1 día')).toBeInTheDocument();
    expect(screen.getByText('Vence en 4 días')).toBeInTheDocument();
  });

  it('filtra por cliente', () => {
    servicios = [
      servicio('a', '2026-10-01', 'NAVAR ASOCIADOS'),
      servicio('b', '2026-10-02', 'OTRO CLIENTE'),
    ];
    montar();
    expect(screen.getByText('COD-a')).toBeInTheDocument();
    expect(screen.getByText('COD-b')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filtrar por cliente'), {
      target: { value: 'OTRO CLIENTE' },
    });

    expect(screen.queryByText('COD-a')).not.toBeInTheDocument();
    expect(screen.getByText('COD-b')).toBeInTheDocument();
  });

  it('al pulsar una alerta abre el detalle del servicio', () => {
    servicios = [servicio('v', '2026-10-20')];
    montar();

    fireEvent.click(screen.getByRole('button', { name: /COD-v/ }));

    expect(screen.getByTestId('detalle')).toBeInTheDocument();
  });
});
