import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@/shared/i18n';
import CampoVidaUtil from './CampoVidaUtil';

describe('T032: CampoVidaUtil (HU-007-5)', () => {
  it('debe mostrar sugerencia de +12 meses desde fechaEntrega', () => {
    render(<CampoVidaUtil fechaEntrega="2026-09-20" valor="2027-09-20" onChange={() => {}} />);
    expect(screen.getByText('+12 meses')).toBeInTheDocument();
  });

  it('debe mostrar chips para +6, +12, +18, +24 meses', () => {
    render(<CampoVidaUtil fechaEntrega="2026-09-20" valor="2027-09-20" onChange={() => {}} />);
    expect(screen.getByText('+6 meses')).toBeInTheDocument();
    expect(screen.getByText('+12 meses')).toBeInTheDocument();
    expect(screen.getByText('+18 meses')).toBeInTheDocument();
    expect(screen.getByText('+24 meses')).toBeInTheDocument();
  });

  it('debe rechazar fecha igual o anterior a fechaEntrega', () => {
    render(<CampoVidaUtil fechaEntrega="2026-09-20" valor="2026-09-20" onChange={() => {}} />);
    expect(screen.getByText(/Debe ser posterior a la entrega/)).toBeInTheDocument();
  });

  it('debe permitir fechas posteriores a entrega', () => {
    const onChange = vi.fn();
    render(<CampoVidaUtil fechaEntrega="2026-09-20" valor="2027-09-21" onChange={onChange} />);
    expect(screen.queryByText(/Debe ser posterior a la entrega/)).not.toBeInTheDocument();
  });

  it('debe calcular correctamente +12 meses con febrero', () => {
    render(<CampoVidaUtil fechaEntrega="2026-01-31" valor="2027-01-31" onChange={() => {}} />);
    expect(screen.getByDisplayValue('2027-01-31')).toBeInTheDocument();
  });

  it('al pulsar un chip entrega la fecha sugerida (+12 meses)', () => {
    const onChange = vi.fn();
    render(<CampoVidaUtil fechaEntrega="2026-09-20" valor="" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '+12 meses' }));

    expect(onChange).toHaveBeenCalledWith('2027-09-20');
  });

  it('marca como activo el chip cuyo valor coincide', () => {
    render(<CampoVidaUtil fechaEntrega="2026-09-20" valor="2027-09-20" onChange={() => {}} />);

    expect(screen.getByRole('button', { name: '+12 meses' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: '+6 meses' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('usa la etiqueta de opcional en la entrega sin reparación', () => {
    render(<CampoVidaUtil fechaEntrega="2026-09-20" onChange={() => {}} opcional />);

    expect(
      screen.getByLabelText('Vida útil (opcional)', { selector: 'input' })
    ).toBeInTheDocument();
  });
});
