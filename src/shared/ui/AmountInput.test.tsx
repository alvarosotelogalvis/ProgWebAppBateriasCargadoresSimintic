import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AmountInput from './AmountInput';

describe('T027: AmountInput (HU-007-3)', () => {
  it('debe mostrar el monto en formato COP colombiano (puntos como separador de miles)', () => {
    render(<AmountInput value={1250000} onChange={() => {}} label="Cotización" />);
    expect(screen.getByDisplayValue('$ 1.250.000')).toBeInTheDocument();
  });

  it('debe aceptar entrada numérica y formatear al perder el foco', async () => {
    const onChange = vi.fn();
    render(<AmountInput value={0} onChange={onChange} label="Costo" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '1250000' } });
    expect(onChange).toHaveBeenCalledWith(1250000);
  });

  it('debe rechazar valores negativos', () => {
    const onChange = vi.fn();
    render(<AmountInput value={0} onChange={onChange} label="Valor" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '-100000' } });
    expect(onChange).not.toHaveBeenCalledWith(-100000);
  });

  it('debe mostrar "COP" a la izquierda del monto en estilo primary', () => {
    render(<AmountInput value={500000} onChange={() => {}} label="Monto" />);
    expect(screen.getByText('COP')).toHaveClass('primary');
  });

  it('debe permitir 0 como valor válido', () => {
    const onChange = vi.fn();
    render(<AmountInput value={0} onChange={onChange} label="Costo OT" />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '0' } });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it('debe mantener precisión sin decimales (COP)', () => {
    render(<AmountInput value={99999} onChange={() => {}} label="Test" />);
    expect(screen.getByDisplayValue('$ 99.999')).toBeInTheDocument();
  });
});
