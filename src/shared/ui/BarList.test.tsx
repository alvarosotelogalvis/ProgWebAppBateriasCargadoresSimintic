import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BarList } from './BarList';

describe('BarList', () => {
  it('expone el valor de cada barra como progressbar accesible', () => {
    render(
      <BarList
        etiqueta="Progreso de sincronización"
        items={[
          { id: 's1', etiqueta: 'CAR-1-NV4520', valor: 42, detalle: 'foto 3/5' },
          { id: 's2', etiqueta: 'BAT-7-X99', valor: 100 },
        ]}
      />
    );

    const barras = screen.getAllByRole('progressbar');
    expect(barras).toHaveLength(2);
    expect(barras[0]).toHaveAttribute('aria-valuenow', '42');
    expect(barras[0]).toHaveAttribute('aria-valuemin', '0');
    expect(barras[0]).toHaveAttribute('aria-valuemax', '100');
    expect(barras[0]).toHaveAccessibleName('CAR-1-NV4520');
    expect(barras[1]).toHaveAttribute('aria-valuenow', '100');

    expect(screen.getByText('CAR-1-NV4520')).toBeInTheDocument();
    expect(screen.getByText('foto 3/5')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('recorta los valores fuera del rango 0-100', () => {
    render(
      <BarList
        items={[
          { id: 'a', etiqueta: 'Excedido', valor: 140 },
          { id: 'b', etiqueta: 'Negativo', valor: -10 },
        ]}
      />
    );

    const barras = screen.getAllByRole('progressbar');
    expect(barras[0]).toHaveAttribute('aria-valuenow', '100');
    expect(barras[1]).toHaveAttribute('aria-valuenow', '0');
  });
});
