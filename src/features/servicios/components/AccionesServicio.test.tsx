import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Rol } from '@/domain/servicio';
import '@/shared/i18n';
import { servicioBuilder } from '../../../../tests/builders/servicioBuilder';
import AccionesServicio from './AccionesServicio';

const montar = (
  roles: Rol[],
  estado: 'borrador' | 'recibido' | 'facturado',
  onAnular: (motivo: string) => Promise<void> = async () => undefined
) => {
  const onEditar = vi.fn();
  const vista = render(
    <AccionesServicio
      servicio={servicioBuilder()[estado]().construir()}
      roles={roles}
      onAnular={onAnular}
      onEditar={onEditar}
    />
  );
  return { ...vista, onEditar };
};

describe('AccionesServicio (HU-007-8)', () => {
  it('el Administrador ve Editar y Anular en un servicio abierto', () => {
    montar(['Administrador'], 'recibido');

    expect(screen.getByRole('button', { name: 'Editar datos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anular servicio' })).toBeInTheDocument();
  });

  it('en un servicio cerrado el Administrador solo puede corregir, no anular ni reabrir', () => {
    montar(['Administrador'], 'facturado');

    expect(screen.getByRole('button', { name: 'Editar datos' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Anular servicio' })).not.toBeInTheDocument();
  });

  it.each([['Tecnico'], ['Comercial']] as const)('%s no ve ninguna acción', (rol) => {
    const { container } = montar([rol], 'recibido');

    expect(container).toBeEmptyDOMElement();
  });

  it('un borrador no ofrece acciones de administración', () => {
    const { container } = montar(['Administrador'], 'borrador');

    expect(container).toBeEmptyDOMElement();
  });

  it('Editar delega en onEditar', () => {
    const { onEditar } = montar(['Administrador'], 'recibido');

    fireEvent.click(screen.getByRole('button', { name: 'Editar datos' }));

    expect(onEditar).toHaveBeenCalledTimes(1);
  });

  it('exige un motivo de al menos 10 caracteres para confirmar la anulación', async () => {
    const onAnular = vi.fn(async () => undefined);
    montar(['Administrador'], 'recibido', onAnular);
    fireEvent.click(screen.getByRole('button', { name: 'Anular servicio' }));

    const confirmar = await screen.findByRole('button', { name: 'Sí, anular' });
    expect(confirmar).toBeDisabled();

    const motivo = screen.getByLabelText('Motivo de la anulación');
    fireEvent.change(motivo, { target: { value: 'corto' } });
    expect(confirmar).toBeDisabled();

    fireEvent.change(motivo, { target: { value: '  Registro duplicado por error  ' } });
    expect(confirmar).toBeEnabled();
    fireEvent.click(confirmar);

    await waitFor(() => expect(onAnular).toHaveBeenCalledWith('Registro duplicado por error'));
  });

  it('si la anulación falla muestra el error y no cierra el diálogo', async () => {
    montar(['Administrador'], 'recibido', async () => {
      throw new Error('boom');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Anular servicio' }));
    fireEvent.change(await screen.findByLabelText('Motivo de la anulación'), {
      target: { value: 'Registro duplicado por error' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sí, anular' }));

    expect(
      await screen.findByText('No se pudo anular el servicio. Intenta de nuevo.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Motivo de la anulación')).toBeInTheDocument();
  });

  it('cancelar no anula', async () => {
    const onAnular = vi.fn(async () => undefined);
    montar(['Administrador'], 'recibido', onAnular);
    fireEvent.click(screen.getByRole('button', { name: 'Anular servicio' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(onAnular).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByLabelText('Motivo de la anulación')).not.toBeInTheDocument()
    );
  });
});
