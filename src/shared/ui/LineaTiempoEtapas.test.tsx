import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';
import { LineaTiempoEtapas } from './LineaTiempoEtapas';

vi.mock('./Icon', () => ({ Icon: () => null }));

describe('LineaTiempoEtapas', () => {
  it('muestra las cinco etapas del ciclo', () => {
    render(<LineaTiempoEtapas estado="RECIBIDO" />);

    const pasos = screen.getAllByRole('listitem');
    expect(pasos).toHaveLength(5);
    expect(screen.getByRole('list', { name: 'Linea de tiempo de etapas' })).toBeInTheDocument();
    expect(within(pasos[0]!).getByText('Recepcion')).toBeInTheDocument();
    expect(within(pasos[1]!).getByText('Diagnostico')).toBeInTheDocument();
    expect(within(pasos[4]!).getByText('Facturacion')).toBeInTheDocument();
  });

  it('marca la etapa actual y las completadas', () => {
    render(<LineaTiempoEtapas estado="DIAGNOSTICADO" />);

    const pasos = screen.getAllByRole('listitem');
    expect(pasos[0]).toHaveTextContent('Completada');
    expect(pasos[1]).toHaveTextContent('Completada');
    expect(pasos[2]).toHaveAttribute('aria-current', 'step');
    expect(pasos[2]).toHaveTextContent('Etapa actual');
    expect(pasos[3]).toHaveTextContent('Pendiente');
  });

  it('marca todo el ciclo como completado al facturar', () => {
    render(<LineaTiempoEtapas estado="FACTURADO" />);

    for (const paso of screen.getAllByRole('listitem')) {
      expect(paso).toHaveTextContent('Completada');
      expect(paso).not.toHaveAttribute('aria-current');
    }
  });

  it('no marca ninguna etapa como actual en un servicio anulado', () => {
    render(<LineaTiempoEtapas estado="ANULADO" />);

    expect(screen.queryByRole('listitem', { current: 'step' })).not.toBeInTheDocument();
  });
});
