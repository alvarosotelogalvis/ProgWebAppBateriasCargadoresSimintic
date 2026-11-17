import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { NombreClienteInvalidoError } from '@/application/clientes/agregarCliente';
import { CampoCliente } from './CampoCliente';

interface ClienteLista {
  id: number;
  nombre: string;
  activo: boolean;
}

let clientes: ClienteLista[] = [];
const agregarCliente = vi.fn();

vi.mock('@/infrastructure/db/hooks', () => ({ useClientes: () => clientes }));
vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosClientes: { agregarCliente } }),
}));
vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));

const escribir = (valor: string): void => {
  fireEvent.input(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: valor } });
};

/** Escribe y elige la primera opción con el teclado, como en el resto de pruebas del formulario. */
const elegir = (valor: string): void => {
  const combo = screen.getByRole('combobox', { name: 'Cliente' });
  fireEvent.input(combo, { target: { value: valor } });
  fireEvent.keyDown(combo, { key: 'ArrowDown' });
  fireEvent.keyDown(combo, { key: 'Enter' });
};

const montar = (props: { clienteId?: number; clienteNombre?: string } = {}) => {
  const onCambio = vi.fn();
  render(
    <CampoCliente
      clienteId={props.clienteId ?? 0}
      clienteNombre={props.clienteNombre ?? ''}
      onCambio={onCambio}
    />
  );
  return { onCambio };
};

beforeEach(() => {
  clientes = [
    { id: 1, nombre: 'NAVAR ASOCIADOS', activo: true },
    { id: 2, nombre: 'ARIS MINING SEGOVIA', activo: true },
  ];
  agregarCliente.mockReset();
});

describe('CampoCliente · agregar un cliente nuevo (ES-010-01)', () => {
  it('ofrece agregar el nombre escrito cuando no existe y lo deja seleccionado', async () => {
    agregarCliente.mockResolvedValue({ id: -9, nombre: 'MINERA NUEVA', creado: true });
    const { onCambio } = montar();

    escribir('Minera Nueva');
    fireEvent.click(
      screen.getByRole('button', { name: /Agregar «Minera Nueva» como cliente nuevo/ })
    );

    await waitFor(() => expect(onCambio).toHaveBeenCalledWith(-9, 'MINERA NUEVA'));
    expect(agregarCliente).toHaveBeenCalledWith('Minera Nueva');
  });

  it('no muestra «provisional» ni ningún aviso de cliente pendiente', async () => {
    agregarCliente.mockResolvedValue({ id: -9, nombre: 'MINERA NUEVA', creado: true });
    montar();

    escribir('Minera Nueva');
    fireEvent.click(screen.getByRole('button', { name: /Agregar «Minera Nueva»/ }));

    await waitFor(() => expect(agregarCliente).toHaveBeenCalled());
    expect(screen.queryByText(/provisional/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/pendiente/i)).not.toBeInTheDocument();
  });

  it('no ofrece agregar mientras no se escribe nada', () => {
    montar();

    expect(screen.queryByRole('button', { name: /Agregar «/ })).not.toBeInTheDocument();
  });

  it('un cliente creado sin red aparece en la lista como cualquiera (ES-010-05)', () => {
    clientes = [...clientes, { id: -5, nombre: 'MINERA SIN RED', activo: true }];
    const { onCambio } = montar();

    elegir('sin red');

    expect(onCambio).toHaveBeenCalledWith(-5, 'MINERA SIN RED');
  });

  it('muestra el error del nombre inválido sin cambiar la selección', async () => {
    agregarCliente.mockRejectedValue(new NombreClienteInvalidoError('LARGO'));
    const { onCambio } = montar();

    escribir('A'.repeat(101));
    fireEvent.click(screen.getByRole('button', { name: /Agregar «/ }));

    expect(await screen.findByText(/demasiado largo/i)).toBeInTheDocument();
    expect(onCambio).not.toHaveBeenCalled();
  });
});

describe('CampoCliente · sugiere el existente (ES-010-02)', () => {
  it('si el nombre es el mismo que uno existente (otras tildes, mayúsculas o espacios) propone usar ese', () => {
    const { onCambio } = montar();

    escribir('aris  mining segovía');

    expect(screen.queryByRole('button', { name: /Agregar «/ })).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /Ya existe «ARIS MINING SEGOVIA»\. Usar ese cliente/ })
    );
    expect(onCambio).toHaveBeenCalledWith(2, 'ARIS MINING SEGOVIA');
    expect(agregarCliente).not.toHaveBeenCalled();
  });

  it('si la alta devuelve un cliente que ya existía (carrera), queda seleccionado ese', async () => {
    agregarCliente.mockResolvedValue({ id: 7, nombre: 'MINERA X', creado: false });
    const { onCambio } = montar();

    escribir('Minera X');
    fireEvent.click(screen.getByRole('button', { name: /Agregar «Minera X»/ }));

    await waitFor(() => expect(onCambio).toHaveBeenCalledWith(7, 'MINERA X'));
  });
});

describe('CampoCliente · lo de siempre', () => {
  it('elegir un cliente de la lista lo selecciona', () => {
    const { onCambio } = montar();

    elegir('navar');

    expect(onCambio).toHaveBeenCalledWith(1, 'NAVAR ASOCIADOS');
  });

  it('con el catálogo vacío avisa que no hay clientes descargados', () => {
    clientes = [];
    montar();

    expect(screen.getByText(/No hay clientes disponibles/i)).toBeInTheDocument();
  });

  it('un cliente inactivo ya elegido avisa que está inactivo', () => {
    clientes = [{ id: 3, nombre: 'VIEJO', activo: false }, ...clientes];
    montar({ clienteId: 3, clienteNombre: 'VIEJO' });

    expect(screen.getByText(/inactivo/i)).toBeInTheDocument();
  });
});
