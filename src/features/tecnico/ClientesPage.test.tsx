import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import '@/shared/i18n';

import { FusionInvalidaError } from '@/application/clientes/fusionarClientes';
import type { Rol } from '@/domain/servicio';
import { useSesionStore } from '@/shared/stores/sesionStore';
import { AppError } from '@/shared/errors';
import { ClientesPage } from './ClientesPage';

interface ClienteLista {
  id: number;
  nombre: string;
  activo: boolean;
}

let clientes: ClienteLista[] = [];
let enLinea = true;
const fusionarClientes = vi.fn();

vi.mock('@/app/containerContext', () => ({
  useContainer: () => ({ casosClientes: { fusionarClientes } }),
}));
vi.mock('@/infrastructure/db/hooks', () => ({ useCatalogo: () => clientes }));
vi.mock('@/shared/hooks/useOnline', () => ({ useOnline: () => enLinea }));
vi.mock('@/shared/ui/Icon', () => ({ Icon: () => null }));

const ORIGEN = 'Cliente que se fusiona (dejará de ofrecerse)';
const DESTINO = 'Cliente que se conserva';

const elegir = (etiqueta: string, texto: string): void => {
  const combo = screen.getByRole('combobox', { name: etiqueta });
  fireEvent.input(combo, { target: { value: texto } });
  fireEvent.keyDown(combo, { key: 'ArrowDown' });
  fireEvent.keyDown(combo, { key: 'Enter' });
};

const montar = (roles: Rol[] = ['Administrador']) => {
  useSesionStore.setState({ roles });
  return render(<ClientesPage />);
};

const botonFusionar = () => screen.getByRole('button', { name: 'Fusionar clientes' });

const prepararFusion = (): void => {
  montar();
  elegir(ORIGEN, 'viejo');
  elegir(DESTINO, 'navar');
};

beforeEach(() => {
  clientes = [
    { id: 1, nombre: 'NAVAR ASOCIADOS', activo: true },
    { id: 2, nombre: 'CLIENTE VIEJO', activo: true },
    { id: 3, nombre: 'CLIENTE C', activo: true },
    { id: -5, nombre: 'SIN SUBIR', activo: true },
  ];
  enLinea = true;
  fusionarClientes.mockReset();
});

describe('ClientesPage · acceso (ES-010-09)', () => {
  it('el Administrador ve los dos campos y la acción de fusionar', () => {
    montar(['Administrador']);

    expect(screen.getByRole('heading', { level: 1, name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: ORIGEN })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: DESTINO })).toBeInTheDocument();
    expect(botonFusionar()).toBeInTheDocument();
  });

  it.each([['Tecnico'], ['Comercial']] as const)('el rol %s no ve la fusión', (rol) => {
    montar([rol]);

    expect(screen.queryByRole('combobox', { name: ORIGEN })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fusionar clientes' })).not.toBeInTheDocument();
    expect(screen.getByText(/administrador/i)).toBeInTheDocument();
  });
});

describe('ClientesPage · elegir los clientes', () => {
  it('la acción está deshabilitada hasta elegir dos clientes', () => {
    montar();
    expect(botonFusionar()).toBeDisabled();

    elegir(ORIGEN, 'viejo');
    expect(botonFusionar()).toBeDisabled();

    elegir(DESTINO, 'navar');
    expect(botonFusionar()).toBeEnabled();
  });

  it('elegir el mismo cliente dos veces avisa y no deja fusionar', () => {
    montar();

    elegir(ORIGEN, 'viejo');
    elegir(DESTINO, 'viejo');

    expect(screen.getByText('Elige dos clientes distintos.')).toBeInTheDocument();
    expect(botonFusionar()).toBeDisabled();
  });

  it('no ofrece los clientes que aún no se subieron a SharePoint (id temporal)', () => {
    montar();
    const combo = screen.getByRole('combobox', { name: ORIGEN });

    fireEvent.input(combo, { target: { value: 'sin subir' } });
    fireEvent.keyDown(combo, { key: 'ArrowDown' });

    expect(screen.queryByRole('option', { name: 'SIN SUBIR' })).not.toBeInTheDocument();
  });

  it('sin clientes avisa que no hay nada que fusionar', () => {
    clientes = [];
    montar();

    expect(screen.getByText('No hay clientes para fusionar.')).toBeInTheDocument();
  });
});

describe('ClientesPage · confirmar y fusionar (ES-010-06)', () => {
  it('pide confirmación con los nombres y no fusiona si se cancela', async () => {
    prepararFusion();

    fireEvent.click(botonFusionar());

    const dialogo = await screen.findByRole('dialog', { name: '¿Fusionar estos clientes?' });
    expect(dialogo).toHaveTextContent('«CLIENTE VIEJO»');
    expect(dialogo).toHaveTextContent('«NAVAR ASOCIADOS»');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(fusionarClientes).not.toHaveBeenCalled();
  });

  it('al confirmar fusiona con los ids elegidos y muestra el resumen', async () => {
    fusionarClientes.mockResolvedValue({
      reasignados: 3,
      destinoId: 1,
      origenNombre: 'CLIENTE VIEJO',
      destinoNombre: 'NAVAR ASOCIADOS',
    });
    prepararFusion();

    fireEvent.click(botonFusionar());
    fireEvent.click(await screen.findByRole('button', { name: 'Fusionar' }));

    await waitFor(() => expect(screen.getByText(/Se reasignaron 3 servicios/)).toBeInTheDocument());
    expect(fusionarClientes).toHaveBeenCalledWith(
      expect.objectContaining({ origenId: 2, destinoId: 1, roles: ['Administrador'] })
    );
  });

  it('con un solo servicio usa el singular', async () => {
    fusionarClientes.mockResolvedValue({
      reasignados: 1,
      destinoId: 1,
      origenNombre: 'CLIENTE VIEJO',
      destinoNombre: 'NAVAR ASOCIADOS',
    });
    prepararFusion();

    fireEvent.click(botonFusionar());
    fireEvent.click(await screen.findByRole('button', { name: 'Fusionar' }));

    expect(await screen.findByText(/Se reasignó 1 servicio\./)).toBeInTheDocument();
  });

  it('muestra el avance mientras reasigna y bloquea los botones', async () => {
    let terminar: (valor: unknown) => void = () => undefined;
    fusionarClientes.mockImplementation(
      (opciones: { onProgreso: (hechos: number, total: number) => void }) =>
        new Promise((resolver) => {
          opciones.onProgreso(1, 3);
          terminar = resolver;
        })
    );
    prepararFusion();

    fireEvent.click(botonFusionar());
    fireEvent.click(await screen.findByRole('button', { name: 'Fusionar' }));

    expect(await screen.findByText('Reasignando servicios: 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    await act(async () => {
      terminar({ reasignados: 3, destinoId: 1, origenNombre: 'A', destinoNombre: 'B' });
    });
  });

  it('si el destino ya estaba fusionado en otro avisa cuál se usó', async () => {
    fusionarClientes.mockResolvedValue({
      reasignados: 2,
      destinoId: 3,
      origenNombre: 'CLIENTE VIEJO',
      destinoNombre: 'CLIENTE C',
    });
    prepararFusion();

    fireEvent.click(botonFusionar());
    fireEvent.click(await screen.findByRole('button', { name: 'Fusionar' }));

    expect(await screen.findByText(/ya fue fusionado/)).toHaveTextContent('«CLIENTE C»');
  });

  it('después de fusionar limpia la selección para poder hacer otra', async () => {
    fusionarClientes.mockResolvedValue({
      reasignados: 0,
      destinoId: 1,
      origenNombre: 'CLIENTE VIEJO',
      destinoNombre: 'NAVAR ASOCIADOS',
    });
    prepararFusion();

    fireEvent.click(botonFusionar());
    fireEvent.click(await screen.findByRole('button', { name: 'Fusionar' }));

    await waitFor(() => expect(botonFusionar()).toBeDisabled());
    expect(screen.getByRole('combobox', { name: ORIGEN })).toHaveValue('');
  });
});

describe('ClientesPage · sin conexión y errores (ES-010-10)', () => {
  it('sin conexión explica que la fusión la necesita y no deja intentarla', () => {
    enLinea = false;
    prepararFusion();

    expect(
      screen.getByText('La fusión necesita conexión. Conéctate e inténtalo de nuevo.')
    ).toBeInTheDocument();
    expect(botonFusionar()).toBeDisabled();
  });

  it('un corte de red durante la fusión se explica y se puede repetir', async () => {
    fusionarClientes.mockRejectedValue(
      new AppError({ codigo: 'RED_SIN_CONEXION', mensaje: 'sin red' })
    );
    prepararFusion();

    fireEvent.click(botonFusionar());
    fireEvent.click(await screen.findByRole('button', { name: 'Fusionar' }));

    expect(
      await screen.findByText('La fusión necesita conexión. Conéctate e inténtalo de nuevo.')
    ).toBeInTheDocument();
    expect(botonFusionar()).toBeEnabled();
  });

  it('un error inesperado muestra el mensaje general sin perder la selección', async () => {
    fusionarClientes.mockRejectedValue(new Error('boom'));
    prepararFusion();

    fireEvent.click(botonFusionar());
    fireEvent.click(await screen.findByRole('button', { name: 'Fusionar' }));

    expect(
      await screen.findByText(
        'No se pudo completar la fusión. Puedes repetirla: continúa donde quedó.'
      )
    ).toBeInTheDocument();
    expect(botonFusionar()).toBeEnabled();
  });

  it('una fusión inválida (p. ej. ciclo) también muestra el mensaje general', async () => {
    fusionarClientes.mockRejectedValue(new FusionInvalidaError('CICLO'));
    prepararFusion();

    fireEvent.click(botonFusionar());
    fireEvent.click(await screen.findByRole('button', { name: 'Fusionar' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
