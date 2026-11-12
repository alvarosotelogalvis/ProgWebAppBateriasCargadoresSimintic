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
    expect(screen.getByRole('list', { name: 'Línea de tiempo de etapas' })).toBeInTheDocument();
    expect(within(pasos[0]!).getByText('Recepción')).toBeInTheDocument();
    expect(within(pasos[1]!).getByText('Diagnóstico')).toBeInTheDocument();
    expect(within(pasos[4]!).getByText('Facturación')).toBeInTheDocument();
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

  it('muestra el resumen bajo el paso correspondiente', () => {
    render(
      <LineaTiempoEtapas
        estado="DIAGNOSTICADO"
        resumenes={{ recepcion: '2026-10-01', diagnostico: 'Reparable' }}
      />
    );

    const pasos = screen.getAllByRole('listitem');
    expect(within(pasos[0]!).getByText('2026-10-01')).toBeInTheDocument();
    expect(within(pasos[1]!).getByText('Reparable')).toBeInTheDocument();
    expect(within(pasos[2]!).queryByText('Reparable')).not.toBeInTheDocument();
  });

  it('muestra "Pendiente de <rol>" solo en la etapa actual', () => {
    render(<LineaTiempoEtapas estado="DIAGNOSTICADO" pendienteDe="Pendiente de Comercial" />);

    const pasos = screen.getAllByRole('listitem');
    expect(within(pasos[2]!).getByText('Pendiente de Comercial')).toBeInTheDocument();
    expect(screen.getAllByText('Pendiente de Comercial')).toHaveLength(1);
  });

  it('en un servicio cerrado no hay etapa actual y por tanto no muestra el pendiente', () => {
    render(<LineaTiempoEtapas estado="FACTURADO" pendienteDe="Pendiente de Comercial" />);

    expect(screen.queryByText('Pendiente de Comercial')).not.toBeInTheDocument();
  });
});
