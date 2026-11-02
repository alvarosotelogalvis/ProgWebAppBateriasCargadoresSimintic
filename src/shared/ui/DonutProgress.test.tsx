import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DonutProgress } from './DonutProgress';

describe('DonutProgress', () => {
  it('muestra el porcentaje y lo anuncia como imagen accesible', () => {
    render(<DonutProgress valor={42} etiqueta="Sincronizado" />);

    expect(screen.getByRole('img', { name: 'Sincronizado: 42%' })).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('recorta el porcentaje fuera del rango 0-100', () => {
    render(<DonutProgress valor={130} />);

    expect(screen.getByRole('img', { name: 'Sincronizado: 100%' })).toBeInTheDocument();
  });
});
