import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CampoMoneda from './CampoMoneda';

describe('T027: CampoMoneda (HU-007-3)', () => {
  it('debe renderizar con label y AmountInput interno', () => {
    render(
      <CampoMoneda label="Valor de cotización" valor={0} onChange={() => {}} requerido={false} />
    );
    expect(screen.getByText('Valor de cotización')).toBeInTheDocument();
  });

  it('debe rechazar valores negativos', () => {
    const onChange = vi.fn();
    render(<CampoMoneda label="Costo" valor={0} onChange={onChange} requerido={false} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '-50000' } });
    expect(onChange).not.toHaveBeenCalledWith(-50000);
  });

  it('debe mostrar formato con puntos (1.250.000)', () => {
    render(
      <CampoMoneda label="Cotización" valor={1250000} onChange={() => {}} requerido={false} />
    );
    expect(screen.getByDisplayValue('$ 1.250.000')).toBeInTheDocument();
  });

  it('debe permitir entrada con comas y normalizar a puntos', () => {
    const onChange = vi.fn();
    render(<CampoMoneda label="Valor" valor={0} onChange={onChange} requerido={false} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '1,250,000' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(1250000);
  });

  it('debe tener aria-required cuando requerido=true', () => {
    render(<CampoMoneda label="Obligatorio" valor={0} onChange={() => {}} requerido={true} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'true');
  });

  it('debe ser opcional cuando requerido=false', () => {
    render(<CampoMoneda label="Opcional" valor={0} onChange={() => {}} requerido={false} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-required', 'false');
  });
});
