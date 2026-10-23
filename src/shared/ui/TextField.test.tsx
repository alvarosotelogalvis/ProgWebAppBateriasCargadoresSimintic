import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { TextField } from './TextField';

function Controlado({ multilinea = false }: { readonly multilinea?: boolean }): React.JSX.Element {
  const [valor, setValor] = useState('');
  return (
    <>
      <TextField
        id="referencia"
        etiqueta="Referencia"
        value={valor}
        multilinea={multilinea}
        onChange={setValor}
      />
      <output data-testid="valor">{valor}</output>
    </>
  );
}

describe('TextField', () => {
  it('asocia la etiqueta al input y propaga los cambios', () => {
    render(<Controlado />);

    const input = screen.getByLabelText('Referencia');
    fireEvent.change(input, { target: { value: 'ABC-1' } });

    expect(screen.getByTestId('valor').textContent).toBe('ABC-1');
  });

  it('asocia la etiqueta al textarea en modo multilinea', () => {
    render(<Controlado multilinea />);

    const area = screen.getByLabelText('Referencia');
    expect(area.tagName).toBe('TEXTAREA');

    fireEvent.change(area, { target: { value: 'observacion' } });
    expect(screen.getByTestId('valor').textContent).toBe('observacion');
  });
});
