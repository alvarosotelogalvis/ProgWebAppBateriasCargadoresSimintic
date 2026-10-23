import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ComboboxField } from './ComboboxField';

const ITEMS = [
  { id: '1', texto: 'Navar Asociados' },
  { id: '2', texto: 'Distribuidora Andina' },
  { id: '3', texto: 'Transportes del Norte' },
];

function Controlado({
  permiteTextoLibre = false,
  conError = false,
}: {
  readonly permiteTextoLibre?: boolean;
  readonly conError?: boolean;
}): React.JSX.Element {
  const [valor, setValor] = useState('');
  return (
    <>
      <ComboboxField
        etiqueta="Cliente"
        valor={valor}
        items={ITEMS}
        permiteTextoLibre={permiteTextoLibre}
        placeholder="Busca un cliente"
        error={conError ? 'Cliente requerido' : undefined}
        onCambio={setValor}
      />
      <output data-testid="valor">{valor}</output>
    </>
  );
}

describe('ComboboxField', () => {
  it('asocia la etiqueta al input', () => {
    render(<Controlado />);
    expect(screen.getByRole('combobox', { name: 'Cliente' })).toBeInTheDocument();
  });

  it('filtra las opciones sin distinguir tildes', async () => {
    render(<Controlado />);
    const input = screen.getByRole('combobox', { name: 'Cliente' });
    fireEvent.input(input, { target: { value: 'distribuidora' } });
    expect(input).toHaveValue('distribuidora');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(await screen.findByTestId('valor')).toHaveTextContent('Distribuidora Andina');
  });

  it('permite texto libre cuando se habilita', () => {
    const onCambio = vi.fn();
    render(
      <ComboboxField
        etiqueta="Marca"
        valor=""
        items={ITEMS}
        permiteTextoLibre
        onCambio={onCambio}
      />
    );
    const input = screen.getByRole('combobox', { name: 'Marca' });
    fireEvent.change(input, { target: { value: 'Marca nueva' } });
    expect(onCambio).toHaveBeenCalledWith('Marca nueva');
  });

  it('describe el error en el input', () => {
    render(<Controlado conError />);
    const input = screen.getByRole('combobox', { name: 'Cliente' });
    expect(input).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('combo-Cliente-error')
    );
    expect(screen.getByText('Cliente requerido')).toBeInTheDocument();
  });
});
