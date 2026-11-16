import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DateChip, DateRangeFilter } from './DateChip';

describe('DateChip', () => {
  it('asocia la etiqueta y limita la fecha maxima', () => {
    render(
      <DateChip
        id="fecha"
        etiqueta="Fecha de recepcion"
        valor="2026-10-22"
        max="2026-10-22"
        onCambio={vi.fn()}
      />
    );

    const campo = screen.getByLabelText('Fecha de recepcion');
    expect(campo).toHaveValue('2026-10-22');
    expect(campo).toHaveAttribute('max', '2026-10-22');
    expect(campo).toHaveAttribute('type', 'date');
  });

  it('sin id propio igual asocia la etiqueta al campo y describe el error', () => {
    render(<DateChip etiqueta="Fecha" valor="" error="Obligatoria" onCambio={vi.fn()} />);

    const campo = screen.getByLabelText('Fecha');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo.getAttribute('aria-describedby')).toBe(screen.getByText('Obligatoria').id);
  });

  it('dos campos sin id propio no comparten el id', () => {
    render(
      <>
        <DateChip etiqueta="Desde" valor="" onCambio={vi.fn()} />
        <DateChip etiqueta="Hasta" valor="" onCambio={vi.fn()} />
      </>
    );

    expect(screen.getByLabelText('Desde').id).not.toBe(screen.getByLabelText('Hasta').id);
  });

  it('notifica el cambio y describe el error', () => {
    const onCambio = vi.fn();
    render(
      <DateChip
        id="fecha"
        etiqueta="Fecha"
        valor="2026-10-22"
        onCambio={onCambio}
        error="La fecha no puede ser futura"
      />
    );

    const campo = screen.getByLabelText('Fecha');
    fireEvent.change(campo, { target: { value: '2026-10-21' } });

    expect(onCambio).toHaveBeenCalledWith('2026-10-21');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('La fecha no puede ser futura');
  });
});

describe('DateRangeFilter', () => {
  it('envia el rango completo al cambiar cada extremo', () => {
    const onCambio = vi.fn();
    render(
      <DateRangeFilter
        desde="2026-09-01"
        hasta="2026-09-30"
        desdeEtiqueta="Desde"
        hastaEtiqueta="Hasta"
        onCambio={onCambio}
      />
    );

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-09-02' } });
    expect(onCambio).toHaveBeenLastCalledWith('2026-09-02', '2026-09-30');

    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-09-29' } });
    expect(onCambio).toHaveBeenLastCalledWith('2026-09-01', '2026-09-29');
  });
});
