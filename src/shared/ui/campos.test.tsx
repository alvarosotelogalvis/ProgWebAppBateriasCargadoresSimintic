import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './Checkbox';
import { SegmentedControl } from './SegmentedControl';
import { SelectField } from './SelectField';
import { TextField } from './TextField';

const OPCIONES = [
  { id: 'a', texto: 'Batería' },
  { id: 'b', texto: 'Cargador' },
  { id: 'c', texto: 'Otro' },
];

describe('TextField', () => {
  it('asocia la etiqueta al input', () => {
    render(<TextField etiqueta="Serie" />);

    expect(screen.getByLabelText('Serie')).toBeInTheDocument();
  });

  it('con error: marca el campo inválido y lo describe con aria-describedby', () => {
    render(<TextField etiqueta="Serie" error="La serie es obligatoria" />);

    const input = screen.getByLabelText('Serie');
    const mensaje = screen.getByText('La serie es obligatoria');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(mensaje.id);
  });

  it('describe el campo también con su texto de ayuda', () => {
    render(<TextField etiqueta="Serie" ayuda="Está en la etiqueta del equipo" />);

    const input = screen.getByLabelText('Serie');
    const ayuda = screen.getByText('Está en la etiqueta del equipo');
    expect(input.getAttribute('aria-describedby')).toContain(ayuda.id);
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });
});

describe('SelectField', () => {
  it('asocia la etiqueta al selector y muestra el texto vacío', () => {
    render(<SelectField etiqueta="Tipo de equipo" items={OPCIONES} textoVacio="Elige uno" />);

    const selector = screen.getByRole('button', { name: /Tipo de equipo/ });
    expect(selector).toHaveTextContent('Elige uno');
  });

  it('con teclado: Enter abre la lista y las flechas mueven el foco entre opciones', () => {
    render(<SelectField etiqueta="Tipo de equipo" items={OPCIONES} />);
    const selector = screen.getByRole('button', { name: /Tipo de equipo/ });

    fireEvent.keyDown(selector, { key: 'ArrowDown' });
    const lista = screen.getByRole('listbox');
    expect(within(lista).getAllByRole('option')).toHaveLength(3);

    const primera = within(lista).getByRole('option', { name: 'Batería' });
    fireEvent.keyDown(lista, { key: 'ArrowDown' });
    expect(document.activeElement).not.toBe(selector);
    expect(primera).toBeInTheDocument();
  });

  it('elegir una opción llama a onSelectionChange con su id', () => {
    const alCambiar = vi.fn();
    render(
      <SelectField etiqueta="Tipo de equipo" items={OPCIONES} onSelectionChange={alCambiar} />
    );

    fireEvent.keyDown(screen.getByRole('button', { name: /Tipo de equipo/ }), {
      key: 'ArrowDown',
    });
    fireEvent.click(screen.getByRole('option', { name: 'Cargador' }));

    expect(alCambiar).toHaveBeenCalledWith('b');
  });

  it('con error lo muestra', () => {
    render(<SelectField etiqueta="Tipo de equipo" items={OPCIONES} error="Elige un tipo" />);

    expect(screen.getByText('Elige un tipo')).toBeInTheDocument();
  });
});

describe('Checkbox', () => {
  it('asocia la etiqueta y alterna con clic', () => {
    const alCambiar = vi.fn();
    render(<Checkbox etiqueta="Acepto" onChange={alCambiar} />);

    const casilla = screen.getByRole('checkbox', { name: 'Acepto' });
    fireEvent.click(casilla);

    expect(alCambiar).toHaveBeenCalledWith(true);
  });

  it('deshabilitado queda marcado como tal y fuera de la tabulación', () => {
    render(<Checkbox etiqueta="Acepto" isDisabled />);

    const casilla = screen.getByRole('checkbox', { name: 'Acepto' });
    expect(casilla).toBeDisabled();
    expect(casilla.closest('label')).toHaveAttribute('data-disabled', 'true');
  });
});

function Segmentado({ alCambiar }: { readonly alCambiar: (clave: string) => void }) {
  const [seleccion, setSeleccion] = useState('normal');
  return (
    <SegmentedControl
      aria-label="Tamaño de letra"
      selectedKey={seleccion}
      items={[
        { id: 'normal', etiqueta: 'Normal' },
        { id: 'grande', etiqueta: 'Grande' },
        { id: 'muy', etiqueta: 'Muy grande' },
      ]}
      onChange={(clave) => {
        setSeleccion(clave);
        alCambiar(clave);
      }}
    />
  );
}

describe('SegmentedControl', () => {
  it('expone un grupo con nombre y marca la opción activa', () => {
    render(<Segmentado alCambiar={vi.fn()} />);

    expect(screen.getByRole('radiogroup', { name: 'Tamaño de letra' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Grande' })).not.toBeChecked();
  });

  it('con teclado: la flecha derecha mueve el foco y Enter selecciona', () => {
    const alCambiar = vi.fn();
    render(<Segmentado alCambiar={alCambiar} />);
    const normal = screen.getByRole('radio', { name: 'Normal' });
    normal.focus();

    fireEvent.keyDown(normal, { key: 'ArrowRight' });
    const grande = screen.getByRole('radio', { name: 'Grande' });
    expect(document.activeElement).toBe(grande);

    fireEvent.keyDown(grande, { key: 'Enter' });
    fireEvent.keyUp(grande, { key: 'Enter' });
    expect(alCambiar).toHaveBeenCalledWith('grande');
  });

  it('no permite dejar el grupo sin selección: volver a pulsar la activa no la desmarca', () => {
    const alCambiar = vi.fn();
    render(<Segmentado alCambiar={alCambiar} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Normal' }));

    expect(screen.getByRole('radio', { name: 'Normal' })).toBeChecked();
    expect(alCambiar).not.toHaveBeenCalledWith(undefined);
    expect(
      screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')
    ).toHaveLength(1);
  });
});
