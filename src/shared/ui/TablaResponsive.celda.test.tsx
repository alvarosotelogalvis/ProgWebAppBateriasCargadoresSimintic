import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TablaResponsive } from './TablaResponsive';

const datos = [{ id: '1', nombre: 'Marca', accion: '' }];
const columnas = [
  { clave: 'nombre' as const, etiqueta: 'Campo' },
  {
    clave: 'accion' as const,
    etiqueta: 'Elección',
    celda: (fila: (typeof datos)[number]) => <button type="button">Elegir {fila.nombre}</button>,
  },
];

describe('TablaResponsive · celdas con contenido propio', () => {
  it('en expandido pinta el contenido de la celda dentro de la fila', () => {
    render(<TablaResponsive datos={datos} columnas={columnas} etiqueta="Conflictos" />);

    const fila = screen.getAllByRole('row')[1] as HTMLElement;
    expect(within(fila).getByRole('button', { name: 'Elegir Marca' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Conflictos' })).toBeInTheDocument();
  });

  it('en compacto pinta el contenido de la celda bajo su etiqueta', () => {
    render(<TablaResponsive datos={datos} columnas={columnas} breakpoint="compact" />);

    const tarjeta = screen.getByTestId('tabla-tarjeta');
    expect(within(tarjeta).getByText('Elección')).toBeInTheDocument();
    expect(within(tarjeta).getByRole('button', { name: 'Elegir Marca' })).toBeInTheDocument();
  });
});
