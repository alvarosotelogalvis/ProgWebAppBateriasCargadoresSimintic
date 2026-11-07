import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import type { FilaSync } from '../store/useSyncStore';

import { ProgresoSync } from './ProgresoSync';

const FILAS: FilaSync[] = [
  { servicioId: 's1', codigo: 'CAR-1', estado: 'listo', archivos: [] },
  {
    servicioId: 's2',
    codigo: 'BAT-2',
    estado: 'subiendo',
    archivosEsperados: 5,
    archivos: [
      { adjuntoId: 'a1', nombre: 'foto-1.jpg', enviados: 100, totales: 100 },
      { adjuntoId: 'a2', nombre: 'foto-2.jpg', enviados: 100, totales: 100 },
      { adjuntoId: 'a3', nombre: 'foto-3.jpg', enviados: 25, totales: 100 },
    ],
  },
  { servicioId: 's3', codigo: 'BAT-3', estado: 'enCola', archivos: [] },
  { servicioId: 's4', codigo: 'BAT-4', estado: 'error', archivos: [], mensaje: 'x' },
];

describe('ProgresoSync', () => {
  it('muestra cada servicio con su estado y el archivo en curso (ES-005-14)', () => {
    render(<ProgresoSync filas={FILAS} cancelando={false} onCancelar={vi.fn()} />);

    expect(screen.getByRole('progressbar', { name: 'CAR-1' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByText('Archivo 3 de 5')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'foto-3.jpg' })).toHaveAttribute(
      'aria-valuenow',
      '25'
    );
    // Los archivos terminados no ocupan una barra propia.
    expect(screen.queryByRole('progressbar', { name: 'foto-1.jpg' })).not.toBeInTheDocument();
    expect(screen.getByText('En cola')).toBeInTheDocument();
    expect(screen.getByText('Con error')).toBeInTheDocument();
  });

  it('permite cancelar y lo deshabilita mientras se cancela (ES-005-15)', () => {
    const onCancelar = vi.fn();
    const { rerender } = render(
      <ProgresoSync filas={FILAS} cancelando={false} onCancelar={onCancelar} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'CANCELAR' }));
    expect(onCancelar).toHaveBeenCalledTimes(1);

    rerender(<ProgresoSync filas={FILAS} cancelando onCancelar={onCancelar} />);
    expect(screen.getByRole('button', { name: 'Cancelando…' })).toBeDisabled();
  });
});
